import { useCallback, useEffect, useState } from "react";
import {
  type EventoSerie, type Serie, type SituacaoSerie, ROTULO_EVENTO, ROTULO_SITUACAO,
  type Garantia, ROTULO_ORIGEM_GARANTIA,
  baixarSerie, cadastrarSeries, consultarGarantia, estenderGarantia, instalarSerie, lerSeries, listarSeries, obterSerie, transferirSerie,
} from "@/services/posVendaService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers, loadItems, loadWarehouses } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const dataBR = (s?: string) => (s ? new Date(s.length === 10 ? `${s}T12:00:00` : s.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR") : "—");
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const COR: Record<SituacaoSerie, string> = {
  EM_ESTOQUE: "erp-badge-blue", NO_CLIENTE: "erp-badge-green", EM_ASSISTENCIA: "erp-badge-amber", BAIXADO: "erp-badge-gray",
};
const CADASTRO_VAZIO = { item: undefined as string | undefined, situacao: "NO_CLIENTE" as "EM_ESTOQUE" | "NO_CLIENTE", origem: "CADASTRO",
  almox: undefined as number | undefined, cliente: undefined as number | undefined, venda: "", instalacao: "", local: "", lote: "", series: "" };

/**
 * VATC0100 — Base Instalada. Cada equipamento pelo número de série: onde está
 * (estoque, cliente, assistência), em que nota foi vendido, quando foi
 * instalado, e tudo o que aconteceu com ele. É o equivalente da Base de
 * Atendimento do TOTVS e do equipamento/número de série do SAP — o ponto de
 * partida da garantia e da assistência técnica.
 */
export function Vatc0100Page(): JSX.Element {
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [filtro, setFiltro] = useState({ item: undefined as string | undefined, cliente: undefined as number | undefined, situacao: "", busca: "" });
  const [lista, setLista] = useState<Serie[]>([]);
  const [aberta, setAberta] = useState<(Serie & { historico: EventoSerie[] }) | null>(null);
  const [inst, setInst] = useState({ data: hojeISO(), local: "" });
  const [transf, setTransf] = useState({ cliente: undefined as number | undefined, motivo: "" });
  const [motivoBaixa, setMotivoBaixa] = useState("");
  const [garantia, setGarantia] = useState<Garantia | null>(null);
  const [estendida, setEstendida] = useState({ ate: "", motivo: "" });
  const lerGarantia = (s: Serie) => {
    setGarantia(null);
    consultarGarantia({ item: s.item_codigo || String(s.item_code), serie: s.numero_serie }).then(setGarantia).catch(() => setGarantia(null));
  };
  const [cad, setCad] = useState({ ...CADASTRO_VAZIO });

  const recarregar = useCallback(async () => {
    setBusy(true);
    try { setLista(await listarSeries({ item: filtro.item, cliente: filtro.cliente, situacao: filtro.situacao, busca: filtro.busca.trim() })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao consultar a base instalada.") }); }
    finally { setBusy(false); }
  }, [filtro]);
  useEffect(() => { void recarregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function abrir(id: number) {
    setBusy(true);
    try { const s = await obterSerie(id); setAberta(s); lerGarantia(s); setTransf({ cliente: undefined, motivo: "" }); setMotivoBaixa(""); setEstendida({ ate: "", motivo: "" }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function acao(fn: () => Promise<Serie & { historico: EventoSerie[] }>, ok: string) {
    setBusy(true); setFeedback(null);
    try { const s = await fn(); setAberta(s); lerGarantia(s); await recarregar(); setFeedback({ type: "success", message: ok }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function cadastrar() {
    const series = lerSeries(cad.series);
    if (!cad.item) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    if (series.length === 0) { setFeedback({ type: "error", message: "Informe ao menos uma série (uma por linha)." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const r = await cadastrarSeries({
        item_code: cad.item, series, situacao: cad.situacao, origem: cad.origem,
        warehouse_id: cad.situacao === "EM_ESTOQUE" ? cad.almox : undefined, customer_code: cad.situacao === "NO_CLIENTE" ? cad.cliente : undefined,
        data_venda: cad.venda || undefined, data_instalacao: cad.instalacao || undefined, local_instalacao: cad.local || undefined, lote: cad.lote || undefined,
      });
      setCad({ ...CADASTRO_VAZIO, item: cad.item, situacao: cad.situacao, cliente: cad.cliente, almox: cad.almox });
      await recarregar();
      setFeedback({ type: "success", message: `${r.length} série(s) cadastrada(s).` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const qtdSeries = lerSeries(cad.series).length;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Assistência</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Base Instalada</span><span className="erp-crumb-code">VATC0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Consulta</span><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VATC0100 — Base Instalada" filename="vatc0100" /></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Equipamentos — <span style={{ fontWeight: 400, opacity: 0.65 }}>{lista.length}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">Cliente</label>
                <LookupField value={filtro.cliente} loader={loadCustomers} entityLabel="cliente" placeholder="Todos" onChange={(c) => setFiltro((f) => ({ ...f, cliente: c ?? undefined }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Item</label>
                <LookupField<string> value={filtro.item} loader={loadItems} entityLabel="item" placeholder="Todos" onChange={(c) => setFiltro((f) => ({ ...f, item: c ?? undefined }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
                <select className="erp-input" value={filtro.situacao} onChange={(e) => setFiltro((f) => ({ ...f, situacao: e.target.value }))}>
                  <option value="">Todas</option>{(Object.keys(ROTULO_SITUACAO) as SituacaoSerie[]).map((s) => <option key={s} value={s}>{ROTULO_SITUACAO[s]}</option>)}
                </select></div>
              <div className="erp-field erp-c3"><label className="erp-label">Série, item ou cliente</label>
                <input className="erp-input" value={filtro.busca} onChange={(e) => setFiltro((f) => ({ ...f, busca: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") void recarregar(); }} /></div>
              <div className="erp-field erp-c1"><label className="erp-label">&nbsp;</label><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Consultar</button></div>
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid">
                  <thead><tr><th>Série</th><th>Item</th><th>Situação</th><th>Cliente</th><th>NF</th><th>Venda</th><th>Instalação</th><th>Local</th><th style={{ width: 80 }} /></tr></thead>
                  <tbody>
                    {lista.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhum equipamento com esse filtro.</td></tr>}
                    {lista.map((s) => (
                      <tr key={s.id}><td style={{ fontWeight: 600 }}>{s.numero_serie}</td><td>{s.item_codigo || s.item_code} · {s.item_nome}</td>
                        <td><span className={`erp-badge ${COR[s.situacao]}`}>{ROTULO_SITUACAO[s.situacao]}</span></td>
                        <td>{s.cliente_nome || (s.customer_code ? `Cliente ${s.customer_code}` : "—")}</td><td>{s.numero_nf ?? "—"}</td>
                        <td>{dataBR(s.data_venda)}</td><td>{dataBR(s.data_instalacao)}</td><td>{s.local_instalacao ?? "—"}</td>
                        <td><button className="erp-btn erp-btn-sm" onClick={() => void abrir(s.id)}>Abrir</button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div></div>

            {aberta && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Série {aberta.numero_serie} — {aberta.item_codigo || aberta.item_code} · {aberta.item_nome}</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c12" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <span><span className={`erp-badge ${COR[aberta.situacao]}`}>{ROTULO_SITUACAO[aberta.situacao]}</span></span>
                  <span>Origem: <strong>{aberta.origem === "PRODUCAO" ? `produção${aberta.production_order_id ? ` (OF ${aberta.production_order_id})` : ""}` : aberta.origem === "COMPRA" ? "compra" : "cadastro"}</strong></span>
                  <span>Cliente: <strong>{aberta.cliente_nome || "—"}</strong></span>
                  <span>NF: <strong>{aberta.numero_nf ?? "—"}</strong> · venda {dataBR(aberta.data_venda)}</span>
                  <span>Instalação: <strong>{dataBR(aberta.data_instalacao)}</strong>{aberta.local_instalacao ? ` · ${aberta.local_instalacao}` : ""}</span>
                  {aberta.lote && <span>Lote: <strong>{aberta.lote}</strong></span>}
                </div>
                {garantia && (
                  <div className="erp-field erp-c12">
                    <div className={`erp-feedback ${garantia.em_garantia ? "success" : "info"}`}>
                      <strong>{garantia.em_garantia ? "Em garantia" : garantia.ate ? "Garantia vencida" : "Sem garantia"}</strong>
                      {garantia.ate ? ` até ${dataBR(garantia.ate)}` : ""}{garantia.origem ? ` · ${ROTULO_ORIGEM_GARANTIA[garantia.origem] ?? garantia.origem}` : ""}
                      {garantia.em_garantia && ` · cobre ${[garantia.cobre_pecas && "peças", garantia.cobre_mao_obra && "mão de obra", garantia.cobre_deslocamento && "deslocamento"].filter(Boolean).join(", ") || "—"}`}
                      {garantia.estendida && " · garantia estendida"}
                      {!garantia.ate && ` — ${garantia.motivo}`}
                      {(garantia.avisos ?? []).map((a) => <div key={a}>⚠ {a}</div>)}
                    </div>
                  </div>
                )}
                {aberta.situacao !== "BAIXADO" && (<>
                  <div className="erp-field erp-c2"><label className="erp-label">Garantia estendida até</label><input className="erp-input" type="date" value={estendida.ate} onChange={(e) => setEstendida((x) => ({ ...x, ate: e.target.value }))} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label">Motivo</label><input className="erp-input" value={estendida.motivo} onChange={(e) => setEstendida((x) => ({ ...x, motivo: e.target.value }))} placeholder="Ex.: contrato de manutenção, cortesia comercial" /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn" disabled={busy || !estendida.ate || !estendida.motivo.trim()} onClick={() => void acao(() => estenderGarantia(aberta.id, estendida), "Garantia estendida registrada.")}>Estender garantia</button></div>
                  <div className="erp-field erp-c2" />
                </>)}
                {aberta.situacao === "NO_CLIENTE" && (<>
                  <div className="erp-field erp-c2"><label className="erp-label">Data da instalação</label><input className="erp-input" type="date" value={inst.data} onChange={(e) => setInst((x) => ({ ...x, data: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Local da instalação</label><input className="erp-input" value={inst.local} onChange={(e) => setInst((x) => ({ ...x, local: e.target.value }))} placeholder="Ex.: pátio de pesagem, linha 2" /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn" disabled={busy || !inst.data} onClick={() => void acao(() => instalarSerie(aberta.id, { data: inst.data, local: inst.local || undefined }), "Instalação registrada.")}>Registrar instalação</button></div>
                  <div className="erp-field erp-c4" />
                  <div className="erp-field erp-c3"><label className="erp-label">Transferir para o cliente</label>
                    <LookupField value={transf.cliente} loader={loadCustomers} entityLabel="cliente" placeholder="Selecionar" onChange={(c) => setTransf((x) => ({ ...x, cliente: c ?? undefined }))} /></div>
                  <div className="erp-field erp-c5"><label className="erp-label">Motivo</label><input className="erp-input" value={transf.motivo} onChange={(e) => setTransf((x) => ({ ...x, motivo: e.target.value }))} placeholder="Ex.: equipamento revendido" /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn" disabled={busy || !transf.cliente || !transf.motivo.trim()} onClick={() => void acao(() => transferirSerie(aberta.id, { customer_code: transf.cliente!, motivo: transf.motivo }), "Equipamento transferido de cliente.")}>Transferir</button></div>
                </>)}
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid">
                    <thead><tr><th>Quando</th><th>Evento</th><th>De → Para</th><th>Cliente</th><th>Referência</th><th>Motivo</th></tr></thead>
                    <tbody>
                      {aberta.historico.map((h) => (
                        <tr key={h.id}><td>{new Date(h.ocorrido_em).toLocaleString("pt-BR")}</td><td>{ROTULO_EVENTO[h.evento] ?? h.evento}</td>
                          <td>{h.situacao_antes ? `${ROTULO_SITUACAO[h.situacao_antes as SituacaoSerie] ?? h.situacao_antes} → ` : ""}{ROTULO_SITUACAO[h.situacao_depois as SituacaoSerie] ?? h.situacao_depois}</td>
                          <td>{h.customer_code ?? "—"}</td>
                          <td>{h.referencia_tipo === "FISCAL_EXIT" ? `NF (id ${h.referencia_id})` : h.referencia_tipo === "PRODUCTION_ORDER" ? `OF ${h.referencia_id}` : h.referencia_tipo === "ASSISTENCIA_OS" ? `OS (id ${h.referencia_id})` : "—"}</td>
                          <td>{h.motivo ?? "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {aberta.situacao !== "BAIXADO" && (
                  <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                    <input className="erp-input" placeholder="motivo da baixa (sucateado, devolvido sem reposição…)" value={motivoBaixa} onChange={(e) => setMotivoBaixa(e.target.value)} />
                    <button className="erp-btn erp-btn-danger" disabled={busy || !motivoBaixa.trim()} onClick={() => void acao(() => baixarSerie(aberta.id, motivoBaixa), "Série baixada.")}>Baixar</button>
                  </div>
                )}
              </div></div>
            )}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Cadastrar séries — <span style={{ fontWeight: 400, opacity: 0.65 }}>equipamentos vendidos antes do sistema, ou estoque comprado</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label>
                <LookupField<string> value={cad.item} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => setCad((x) => ({ ...x, item: c ?? undefined }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Onde está</label>
                <select className="erp-input" value={cad.situacao} onChange={(e) => setCad((x) => ({ ...x, situacao: e.target.value as "EM_ESTOQUE" | "NO_CLIENTE" }))}>
                  <option value="NO_CLIENTE">No cliente</option><option value="EM_ESTOQUE">Em estoque</option></select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Origem</label>
                <select className="erp-input" value={cad.origem} onChange={(e) => setCad((x) => ({ ...x, origem: e.target.value }))}>
                  <option value="CADASTRO">Cadastro (base legada)</option><option value="COMPRA">Compra</option></select></div>
              {cad.situacao === "NO_CLIENTE" ? (<>
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Cliente</label>
                  <LookupField value={cad.cliente} loader={loadCustomers} entityLabel="cliente" placeholder="Selecionar" onChange={(c) => setCad((x) => ({ ...x, cliente: c ?? undefined }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Data da venda</label><input className="erp-input" type="date" value={cad.venda} onChange={(e) => setCad((x) => ({ ...x, venda: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Data da instalação</label><input className="erp-input" type="date" value={cad.instalacao} onChange={(e) => setCad((x) => ({ ...x, instalacao: e.target.value }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Local da instalação</label><input className="erp-input" value={cad.local} onChange={(e) => setCad((x) => ({ ...x, local: e.target.value }))} /></div>
              </>) : (
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Almoxarifado</label>
                  <LookupField value={cad.almox} loader={loadWarehouses} entityLabel="almoxarifado" placeholder="Selecionar" onChange={(c) => setCad((x) => ({ ...x, almox: c ?? undefined }))} /></div>
              )}
              <div className="erp-field erp-c2"><label className="erp-label">Lote</label><input className="erp-input" value={cad.lote} onChange={(e) => setCad((x) => ({ ...x, lote: e.target.value }))} /></div>
              <div className="erp-field erp-c12"><label className="erp-label erp-req">Séries — uma por linha ({qtdSeries})</label>
                <textarea className="erp-input" rows={4} value={cad.series} onChange={(e) => setCad((x) => ({ ...x, series: e.target.value }))} placeholder={"BAL-2019-0001\nBAL-2019-0002"} /></div>
              <div className="erp-field erp-c12" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="erp-btn erp-btn-primary" onClick={() => void cadastrar()} disabled={busy || !cad.item || qtdSeries === 0}>Cadastrar {qtdSeries || ""} série(s)</button>
                <small>O item precisa controlar número de série (VATC0110). Série nova de produção nasce sozinha na entrega da OF.</small>
              </div>
            </div></div>
          </div>
        </section>
      </div>
    </div>
  );
}
