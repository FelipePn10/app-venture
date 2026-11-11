import { useCallback, useEffect, useState } from "react";
import {
  type DeliveryInstructionDTO, type DispatchBoxDTO, type LoadAction, type LoadDTO, type LoadStatus, type ShipmentDTO,
  LOAD_STATUS_LABEL,
  addFiscalNoteToLoad, addShipmentToLoad, advanceLoad, assignBoxToLoad, createDeliveryInstruction, createDispatchBox, createLoad,
  getLoad, listDispatchBoxes, listLoads, listShipments, removeShipmentFromLoad, shipmentsInLoads,
} from "@/services/shipmentsService";
import { errMessage } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { confirmar } from "@/components/ui/dialogos";
import { loadCarriers, loadCustomersById, loadFiscalExits } from "@/services/lookups";
import { hojeLocal } from "@/utils/dataLocal";
import { FaturamentoDaCargaPanel } from "./FaturamentoDaCargaPanel";

/*
 * Aba Cargas da VEXP0100. O fluxo é uma linha reta: romaneio conferido → entra
 * na carga → liberar → carregar → faturar → despachar. Reúne as antigas
 * VEXP0110/VPLC0200 (cargas), VEXP0120/VPLC0211 (instruções e caixas) e a
 * VFIS0640 (faturar a carga) — antes em três pastas e pedindo o número de cada
 * romaneio de memória.
 */

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const NOVA: Partial<LoadDTO> = { description: "", vehicle_plate: "", driver_name: "", driver_document: "", route_code: "", origin: "", destination: "", dispatch_box_code: "", planned_ship_date: hojeLocal(), estimated_delivery: "" };

/** Ações possíveis em cada situação, na ordem do fluxo. */
const PROXIMA: Partial<Record<LoadStatus, { acao: LoadAction; rotulo: string }>> = {
  PLANNED: { acao: "release", rotulo: "Liberar carga" },
  RELEASED: { acao: "start-loading", rotulo: "Iniciar carregamento" },
  LOADING: { acao: "finish-loading", rotulo: "Concluir carregamento" },
  LOADED: { acao: "ship", rotulo: "Despachar" },
};
const editavel = (s?: LoadStatus) => s === "PLANNED" || s === "RELEASED";

export function CargasPanel(): JSX.Element {
  const [filtro, setFiltro] = useState("");
  const [cargas, setCargas] = useState<LoadDTO[]>([]);
  const [sel, setSel] = useState<LoadDTO | null>(null);
  const [nova, setNova] = useState<Partial<LoadDTO> | null>(null);
  const [livres, setLivres] = useState<ShipmentDTO[]>([]);
  const [caixas, setCaixas] = useState<DispatchBoxDTO[]>([]);
  const [novaCaixa, setNovaCaixa] = useState({ code: "", description: "", zone: "" });
  const [instrucao, setInstrucao] = useState<DeliveryInstructionDTO>({ title: "", instruction: "", priority: 1 });
  const [nota, setNota] = useState<number | undefined>();
  const [faturar, setFaturar] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const listar = useCallback(async () => { setCargas(await listLoads(filtro || undefined)); }, [filtro]);
  const carregarApoio = useCallback(async () => {
    const [romaneios, emCarga, cx] = await Promise.all([listShipments(), shipmentsInLoads(), listDispatchBoxes()]);
    // Entra na carga o romaneio separado ou conferido que ainda não está em outra.
    setLivres(romaneios.filter((r) => (r.status === "SEPARATED" || r.status === "CONFERRED") && r.code && !emCarga.has(r.code)));
    setCaixas(cx);
  }, []);
  useEffect(() => { void run(async () => { await Promise.all([listar(), carregarApoio()]); }); }, [run, listar, carregarApoio]);

  const abrir = (code: number) => run(async () => { setSel(await getLoad(code)); setNova(null); setFaturar(false); });
  const recarregar = async (code: number) => { setSel(await getLoad(code)); await Promise.all([listar(), carregarApoio()]); };

  const criar = () => run(async () => {
    if (!nova) return;
    const c = await createLoad(nova);
    setNova(null); await recarregar(c.code);
    setFeedback({ type: "success", message: `Carga ${c.code} criada. Adicione os romaneios.` });
  });
  const incluirRomaneio = (codigo: number) => run(async () => {
    if (!sel) return;
    await addShipmentToLoad(sel.code, codigo, sel.shipments.length + 1);
    await recarregar(sel.code);
  });
  const tirarRomaneio = (codigo: number) => run(async () => { if (!sel) return; await removeShipmentFromLoad(sel.code, codigo); await recarregar(sel.code); });
  const avancar = async (acao: LoadAction, rotulo: string) => {
    if (!sel) return;
    if (acao === "cancel" && !(await confirmar({ titulo: "Cancelar carga", mensagem: "Os romaneios voltam a ficar livres para outra carga.", assunto: `Carga ${sel.code}${sel.description ? ` — ${sel.description}` : ""}`, rotulo: "Cancelar carga", tom: "perigo" }))) return;
    void run(async () => { await advanceLoad(sel.code, acao); await recarregar(sel.code); setFeedback({ type: "success", message: `Carga ${sel.code}: ${rotulo.toLowerCase()} feito.` }); });
  };
  const vincularCaixa = (box: string) => run(async () => { if (!sel || !box) return; await assignBoxToLoad(sel.code, box); await recarregar(sel.code); });
  const incluirNota = () => run(async () => {
    if (!sel || !nota) return;
    await addFiscalNoteToLoad(sel.code, nota, sel.fiscal_notes.length + 1);
    setNota(undefined); await recarregar(sel.code);
  });
  const incluirInstrucao = () => run(async () => {
    if (!sel) return;
    if (!instrucao.title.trim() || !instrucao.instruction.trim()) { setFeedback({ type: "error", message: "Informe o título e a orientação ao motorista." }); return; }
    await createDeliveryInstruction({ ...instrucao, load_code: sel.code });
    setInstrucao({ title: "", instruction: "", priority: 1 }); await recarregar(sel.code);
  });
  const gravarCaixa = () => run(async () => {
    if (!novaCaixa.code.trim()) { setFeedback({ type: "error", message: "Informe o código da caixa (ex.: DOCA-1)." }); return; }
    await createDispatchBox(novaCaixa); setNovaCaixa({ code: "", description: "", zone: "" }); setCaixas(await listDispatchBoxes());
    setFeedback({ type: "success", message: "Caixa de despacho gravada." });
  });

  const setN = <K extends keyof LoadDTO>(k: K, v: LoadDTO[K]) => setNova((p) => ({ ...p, [k]: v }));
  const proxima = sel ? PROXIMA[sel.status] : undefined;

  return (
    <>
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
      <div className="erp-main">
        <aside className="erp-list-panel">
          <div className="erp-panel-head">
            <span className="erp-panel-title">Cargas</span><span className="erp-count">{cargas.length}</span>
            <select className="erp-input" style={{ width: 120, height: 28, marginLeft: "auto" }} value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Situação da carga">
              <option value="">Todas</option>{Object.entries(LOAD_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="erp-btn erp-btn-sm" onClick={() => { setSel(null); setNova({ ...NOVA }); }} disabled={busy}>+ Nova</button>
          </div>
          <div className="erp-list">
            {cargas.length === 0 && <div className="erp-list-empty">Nenhuma carga. Use <strong>+ Nova</strong>.</div>}
            {cargas.map((c) => (
              <div key={c.code} className={`erp-list-row${sel?.code === c.code ? " erp-row-sel" : ""}`} onClick={() => void abrir(c.code)}>
                <span className="erp-list-code">Carga {c.code}</span>
                <span className="erp-list-sub">{c.description || c.destination || "—"} · {c.total_shipments} romaneio(s)</span>
                <div className="erp-list-meta"><span className="erp-badge">{LOAD_STATUS_LABEL[c.status] ?? c.status}</span></div>
              </div>
            ))}
          </div>
        </aside>

        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {nova && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Nova carga</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c4"><label className="erp-label">Descrição</label><input className="erp-input" placeholder="Ex.: Rota Sul — terça" value={nova.description ?? ""} onChange={(e) => setN("description", e.target.value)} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Transportadora</label><LookupField value={nova.carrier_code} loader={loadCarriers} entityLabel="transportadora" clearable onChange={(c) => setN("carrier_code", c ? Number(c) : undefined)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Saída prevista</label><input className="erp-input" type="date" value={nova.planned_ship_date ?? ""} onChange={(e) => setN("planned_ship_date", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Entrega prevista</label><input className="erp-input" type="date" value={nova.estimated_delivery ?? ""} onChange={(e) => setN("estimated_delivery", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Placa</label><input className="erp-input" value={nova.vehicle_plate ?? ""} onChange={(e) => setN("vehicle_plate", e.target.value.toUpperCase())} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Motorista</label><input className="erp-input" value={nova.driver_name ?? ""} onChange={(e) => setN("driver_name", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Documento do motorista</label><input className="erp-input" value={nova.driver_document ?? ""} onChange={(e) => setN("driver_document", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Rota</label><input className="erp-input" value={nova.route_code ?? ""} onChange={(e) => setN("route_code", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Caixa de despacho</label>
                  <select className="erp-input" value={nova.dispatch_box_code ?? ""} onChange={(e) => setN("dispatch_box_code", e.target.value)}>
                    <option value="">—</option>{caixas.filter((b) => !b.current_load).map((b) => <option key={b.code} value={b.code}>{b.code}{b.description ? ` · ${b.description}` : ""}</option>)}
                  </select></div>
                <div className="erp-field erp-c3"><label className="erp-label">Origem</label><input className="erp-input" value={nova.origin ?? ""} onChange={(e) => setN("origin", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Destino</label><input className="erp-input" value={nova.destination ?? ""} onChange={(e) => setN("destination", e.target.value)} /></div>
                <div className="erp-field erp-c6"><label className="erp-label">Observação</label><input className="erp-input" value={nova.notes ?? ""} onChange={(e) => setN("notes", e.target.value)} /></div>
                <div className="erp-field erp-c12" style={{ justifyContent: "flex-end", flexDirection: "row", gap: 8 }}>
                  <button className="erp-btn" onClick={() => setNova(null)} disabled={busy}>Cancelar</button>
                  <button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy}>Criar carga</button>
                </div>
              </div></div>
            )}

            {!nova && !sel && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Caixas de despacho (docas e posições da expedição)</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Código</label><input className="erp-input" placeholder="DOCA-1" value={novaCaixa.code} onChange={(e) => setNovaCaixa((c) => ({ ...c, code: e.target.value.toUpperCase() }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Descrição</label><input className="erp-input" value={novaCaixa.description} onChange={(e) => setNovaCaixa((c) => ({ ...c, description: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Zona</label><input className="erp-input" value={novaCaixa.zone} onChange={(e) => setNovaCaixa((c) => ({ ...c, zone: e.target.value }))} /></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={() => void gravarCaixa()} disabled={busy}>Gravar caixa</button></div>
                <div className="erp-field erp-c12"><table className="erp-grid">
                  <thead><tr><th>Caixa</th><th>Descrição</th><th>Zona</th><th>Ocupada por</th></tr></thead>
                  <tbody>
                    {caixas.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma caixa cadastrada.</td></tr>}
                    {caixas.map((b) => <tr key={b.code}><td style={{ fontWeight: 600 }}>{b.code}</td><td>{b.description || "—"}</td><td>{b.zone || "—"}</td><td>{b.current_load ? `Carga ${b.current_load}` : "Livre"}</td></tr>)}
                  </tbody>
                </table></div>
                <div className="erp-field erp-c12"><span className="erp-field-hint">Escolha uma carga na lista para montar, carregar, faturar e despachar.</span></div>
              </div></div>
            )}

            {sel && !nova && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">
                  Carga {sel.code}{sel.description ? ` — ${sel.description}` : ""} <span className="erp-badge" style={{ marginLeft: 8 }}>{LOAD_STATUS_LABEL[sel.status]}</span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    {proxima && <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy || (proxima.acao === "release" && sel.shipments.length === 0)} onClick={() => void avancar(proxima.acao, proxima.rotulo)}>{proxima.rotulo}</button>}
                    {(sel.status === "LOADING" || sel.status === "LOADED") && <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => setFaturar((f) => !f)}>{faturar ? "Fechar faturamento" : "Faturar carga"}</button>}
                    {sel.status !== "SHIPPED" && sel.status !== "CANCELLED" && <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={() => void avancar("cancel", "Cancelamento")}>Cancelar</button>}
                  </span>
                </div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c12"><dl className="erp-dados">
                    <dt>Transportadora</dt><dd>{sel.carrier_code ? <EntityName code={sel.carrier_code} loader={loadCarriers} showCode={false} /> : "—"}</dd>
                    <dt>Veículo</dt><dd>{[sel.vehicle_plate, sel.driver_name].filter(Boolean).join(" · ") || "—"}</dd>
                    <dt>Rota</dt><dd>{[sel.route_code, sel.origin && sel.destination ? `${sel.origin} → ${sel.destination}` : sel.destination].filter(Boolean).join(" · ") || "—"}</dd>
                    <dt>Saída / entrega</dt><dd>{sel.planned_ship_date || "—"} / {sel.estimated_delivery || "—"}</dd>
                    <dt>Volumes / peso bruto</dt><dd>{sel.total_volumes} / {sel.total_gross_weight.toLocaleString("pt-BR")} kg</dd>
                  </dl></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Caixa de despacho</label>
                    <select className="erp-input" value={sel.dispatch_box_code ?? ""} disabled={busy || !editavel(sel.status)} onChange={(e) => void vincularCaixa(e.target.value)}>
                      <option value="">—</option>{caixas.filter((b) => !b.current_load || b.current_load === sel.code || b.code === sel.dispatch_box_code).map((b) => <option key={b.code} value={b.code}>{b.code}{b.description ? ` · ${b.description}` : ""}</option>)}
                    </select></div>
                </div></div>

                {faturar && <FaturamentoDaCargaPanel cargaFixa={sel.code} aoCriar={() => void recarregar(sel.code)} />}

                <div className="erp-fieldset"><div className="erp-fieldset-head">Romaneios da carga <span className="erp-count">{sel.shipments.length}</span></div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c12"><table className="erp-grid">
                    <thead><tr><th>Seq.</th><th>Romaneio</th><th style={{ width: 90 }} /></tr></thead>
                    <tbody>
                      {sel.shipments.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhum romaneio. Inclua abaixo os que estão prontos.</td></tr>}
                      {sel.shipments.map((r) => <tr key={r.shipment_code}><td>{r.sequence}</td><td style={{ fontWeight: 600 }}>{r.shipment_code}</td><td>{editavel(sel.status) && <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={() => void tirarRomaneio(r.shipment_code)}>Tirar</button>}</td></tr>)}
                    </tbody>
                  </table></div>
                  {editavel(sel.status) && (
                    <div className="erp-field erp-c12"><label className="erp-label">Romaneios prontos (separados ou conferidos, fora de outra carga)</label>
                      <table className="erp-grid">
                        <thead><tr><th>Romaneio</th><th>Pedido</th><th>Situação</th><th className="num">Volumes</th><th className="num">Peso bruto</th><th style={{ width: 90 }} /></tr></thead>
                        <tbody>
                          {livres.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum romaneio pronto fora de carga.</td></tr>}
                          {livres.map((r) => <tr key={r.code}><td style={{ fontWeight: 600 }}>{r.code}</td><td>{r.sales_order_code || r.purchase_order_code || r.production_order_code || "—"}</td><td>{r.status === "CONFERRED" ? "Conferido" : "Separado"}</td><td className="num">{r.total_volumes ?? "—"}</td><td className="num">{r.total_gross_weight ?? "—"}</td><td><button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy} onClick={() => void incluirRomaneio(r.code!)}>Incluir</button></td></tr>)}
                        </tbody>
                      </table></div>
                  )}
                </div></div>

                <div className="erp-fieldset"><div className="erp-fieldset-head">Notas fiscais da carga <span className="erp-count">{sel.fiscal_notes.length}</span></div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c12"><table className="erp-grid">
                    <thead><tr><th>NF-e</th><th>Número</th><th>Romaneio</th></tr></thead>
                    <tbody>
                      {sel.fiscal_notes.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhuma nota. Use Faturar carga ou vincule uma nota já emitida.</td></tr>}
                      {sel.fiscal_notes.map((n) => <tr key={n.fiscal_exit_id}><td>{n.fiscal_exit_id}</td><td>{n.nfe_number ?? "—"}</td><td>{n.shipment_code ?? "—"}</td></tr>)}
                    </tbody>
                  </table></div>
                  {sel.status !== "SHIPPED" && sel.status !== "CANCELLED" && <>
                    <div className="erp-field erp-c6"><label className="erp-label">Vincular nota já emitida</label><LookupField value={nota} loader={loadFiscalExits} entityLabel="NF-e" clearable allowManualCode={false} onChange={(c) => setNota(c ? Number(c) : undefined)} /></div>
                    <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" disabled={busy || !nota} onClick={() => void incluirNota()}>Vincular</button></div>
                  </>}
                </div></div>

                <div className="erp-fieldset"><div className="erp-fieldset-head">Orientações de entrega <span className="erp-count">{sel.instructions.length}</span></div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c12"><table className="erp-grid">
                    <thead><tr><th>Prioridade</th><th>Cliente</th><th>Título</th><th>Orientação ao motorista</th></tr></thead>
                    <tbody>
                      {sel.instructions.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma orientação.</td></tr>}
                      {sel.instructions.map((i) => <tr key={i.id}><td>{i.priority}</td><td>{i.customer_id ? <EntityName code={i.customer_id} loader={loadCustomersById} showCode={false} /> : "Todos"}</td><td>{i.title}</td><td>{i.instruction}</td></tr>)}
                    </tbody>
                  </table></div>
                  {sel.status !== "SHIPPED" && sel.status !== "CANCELLED" && <>
                    <div className="erp-field erp-c3"><label className="erp-label">Cliente (opcional)</label><LookupField value={instrucao.customer_id} loader={loadCustomersById} entityLabel="cliente" clearable allowManualCode={false} onChange={(c) => setInstrucao((p) => ({ ...p, customer_id: c ? Number(c) : undefined }))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Título</label><input className="erp-input" placeholder="Agendamento obrigatório" value={instrucao.title} onChange={(e) => setInstrucao((p) => ({ ...p, title: e.target.value }))} /></div>
                    <div className="erp-field erp-c4"><label className="erp-label erp-req">Orientação</label><input className="erp-input" value={instrucao.instruction} onChange={(e) => setInstrucao((p) => ({ ...p, instruction: e.target.value }))} /></div>
                    <div className="erp-field erp-c1"><label className="erp-label">Prior.</label><input className="erp-input num" type="number" min={0} value={instrucao.priority} onChange={(e) => setInstrucao((p) => ({ ...p, priority: Number(e.target.value) }))} /></div>
                    <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}><button className="erp-btn" disabled={busy} onClick={() => void incluirInstrucao()}>+</button></div>
                  </>}
                </div></div>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
