import { useEffect, useMemo, useState } from "react";
import {
  type OperationDTO, type RouteOperationDTO, type RouteOpResourceDTO, type OperationDocumentDTO, type RouteInspectionDTO,
  type DocumentKind, type TimeUnit, type TimeBasis,
  DOCUMENT_KINDS, TIME_UNITS, TIME_BASES, THIRD_PARTY_REMITTANCES,
  addRouteOperation, updateRouteOperation,
  listRouteOpResources, addRouteOpResource, setRouteOpResourcePrimary, removeRouteOpResource, updateRouteOpResource,
  listRouteOpTools, addRouteOpTool, removeRouteOpTool,
  addOperationDocument, removeOperationDocument,
  addRouteInspection, removeRouteInspection,
} from "@/services/manufacturingRoutingService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { enumLabel } from "@/utils/enumLabels";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadItems, loadWorkCenters, loadSuppliers, loadTools } from "@/services/lookups";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { payloadDaEtapa, herdado, ehTerceiro, rotuloUnidade, num, SITUACOES_ETAPA } from "./roteiroUtils";

type Aba = "etapa" | "centros" | "ferramentas" | "documentos" | "inspecao";

type Props = {
  routeId: number;
  /** Etapa em edição; ausente = nova etapa. */
  etapa?: RouteOperationDTO;
  proximaSequencia: number;
  ops: OperationDTO[];
  documentos: OperationDocumentDTO[];
  inspecoes: RouteInspectionDTO[];
  /** Roteiro-modelo não tem item: inspeção (plano é do item) fica de fora. */
  ehModelo: boolean;
  onClose: () => void;
  /** Recarrega o roteiro; `id` = etapa recém-criada (o painel continua nela). */
  onSaved: (mensagem: string, id?: number) => Promise<void>;
};

const numOuVazio = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v));

/**
 * Tudo sobre UMA etapa num lugar só. Antes eram três lugares: o formulário de
 * inclusão (que nem editava), a aba "Recursos e ferramentas" (que dependia do
 * botão Detalhar) e a grade. Aqui cada campo mostra o que vem da biblioteca —
 * em branco herda — e a etapa grava só o que é diferente neste item.
 */
export function EtapaEditor({ routeId, etapa, proximaSequencia, ops, documentos, inspecoes, ehModelo, onClose, onSaved }: Props): JSX.Element {
  useEscapeToClose(onClose);
  const nova = !etapa?.id;
  const [aba, setAba] = useState<Aba>("etapa");
  const [form, setForm] = useState<RouteOperationDTO>(
    etapa ?? { operation_id: 0, sequence: proximaSequencia, inspection_required: false, situation: "APROVADA" },
  );
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const lib = ops.find((o) => o.id === form.operation_id);
  const terceiro = ehTerceiro(lib?.origin ?? form.origin);
  const unidade: TimeUnit = (form.time_unit ?? lib?.time_unit ?? "HORA") as TimeUnit;
  const baseEfetiva: TimeBasis = (form.time_basis ?? lib?.time_basis ?? "PECA") as TimeBasis;

  const set = <K extends keyof RouteOperationDTO>(k: K, v: RouteOperationDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setErro(""); };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErro("");
    try { await fn(); } catch (e) { setErro(errMessage(e)); } finally { setBusy(false); }
  };

  /**
   * Mudança feita numa aba de detalhe (centros, documentos, inspeção): grava
   * no servidor, recarrega a etapa e traz para o formulário o que mudou nela.
   * Sem isto a aba Etapa ficava com o valor antigo — trocar o principal e
   * depois salvar a etapa desfazia a troca.
   */
  const aposMudanca = async (mensagem: string, patch?: Partial<RouteOperationDTO>) => {
    if (patch) setForm((p) => ({ ...p, ...patch }));
    await onSaved(mensagem, etapa?.id);
  };

  const salvar = () => run(async () => {
    if (!form.operation_id) { setErro("Escolha a operação da biblioteca."); return; }
    if (!form.sequence || form.sequence <= 0) { setErro("Informe a sequência (10, 20, 30…)."); return; }
    if (form.time_basis === "ATRIBUTO" && !form.time_basis_attribute?.trim()) { setErro("Informe o atributo do item que mede o tempo."); return; }
    if (nova) {
      const criada = await addRouteOperation(routeId, { ...form, ...payloadDaEtapa(form), sequence: form.sequence, operation_id: form.operation_id });
      await onSaved(`Etapa ${form.sequence} incluída.`, criada.id);
      setForm((p) => ({ ...p, id: criada.id }));
      return;
    }
    await updateRouteOperation(routeId, etapa!.id!, payloadDaEtapa(form));
    await onSaved(`Etapa ${form.sequence} atualizada.`, etapa!.id);
  });

  const abas: { id: Aba; label: string; so?: boolean }[] = [
    { id: "etapa", label: "Etapa" },
    { id: "centros", label: "Centros", so: !terceiro },
    { id: "ferramentas", label: "Ferramentas", so: !terceiro },
    { id: "documentos", label: "Documentos" },
    { id: "inspecao", label: "Inspeção", so: !ehModelo },
  ];

  return (
    <div className="erp-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="erp-modal erp-modal-lg" role="dialog" aria-modal="true" aria-label={nova ? "Nova etapa" : `Etapa ${form.sequence}`}>
        <div className="erp-modal-head">
          <strong>{nova ? "Nova etapa" : `Etapa ${form.sequence} · ${form.operation_name || lib?.name || ""}`}</strong>
          <button className="erp-btn erp-btn-sm" onClick={onClose} aria-label="Fechar">Fechar</button>
        </div>
        <div className="erp-tabs">
          {abas.filter((a) => a.so !== false).map((a) => (
            <button key={a.id} className={`erp-tab ${aba === a.id ? "active" : ""}`} disabled={a.id !== "etapa" && nova}
              title={a.id !== "etapa" && nova ? "Salve a etapa primeiro" : undefined} onClick={() => setAba(a.id)}>{a.label}</button>
          ))}
        </div>
        <div className="erp-modal-body">
          {erro && <div className="erp-feedback error">{erro}</div>}

          {aba === "etapa" && (
            <>
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">O quê, onde e em que ordem</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label htmlFor="et-seq" className="erp-label erp-req">Sequência</label>
                    <input id="et-seq" className="erp-input num" type="number" min={1} value={form.sequence} disabled={!nova}
                      onChange={(e) => set("sequence", Number(e.target.value))} />
                    <span className="erp-field-hint">{nova ? "De 10 em 10 deixa espaço." : "Fixa depois de criada."}</span></div>
                  <div className="erp-field erp-c5"><label htmlFor="et-op" className="erp-label erp-req">Operação</label>
                    <select id="et-op" className="erp-input" value={form.operation_id} disabled={!nova}
                      onChange={(e) => set("operation_id", Number(e.target.value))}>
                      <option value={0}>— escolha na biblioteca —</option>
                      {ops.filter((o) => o.is_active !== false || o.id === form.operation_id).map((o) => (
                        <option key={o.id} value={o.id}>{o.name} ({enumLabel(o.origin)})</option>
                      ))}
                    </select></div>
                  {!terceiro ? (
                    <div className="erp-field erp-c5"><label className="erp-label">Centro de trabalho (principal)</label>
                      <LookupField value={form.work_center_id ?? undefined}
                        onChange={(c) => set("work_center_id", c ? Number(c) : undefined)}
                        loader={loadWorkCenters} allowManualCode={false} entityLabel="centro de trabalho" clearable
                        placeholder={lib?.default_work_center_id ? "Herda o centro da operação" : "Escolha o centro"} />
                      <span className="erp-field-hint">
                        {!form.work_center_id && lib?.default_work_center_id
                          ? <>Herda: <EntityName code={lib.default_work_center_id} loader={loadWorkCenters} showCode={false} /></>
                          : "É o centro que custo, CRP e prazo usam. Alternativos na aba Centros."}
                      </span></div>
                  ) : <div className="erp-field erp-c5"><span className="erp-field-hint">Etapa fora da fábrica: não ocupa centro nosso.</span></div>}
                  <div className="erp-field erp-c4"><label className="erp-label">Situação</label>
                    <select className="erp-input" value={form.situation ?? "APROVADA"} onChange={(e) => set("situation", e.target.value)}>
                      {SITUACOES_ETAPA.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <span className="erp-field-hint">{SITUACOES_ETAPA.find((s) => s.value === (form.situation ?? "APROVADA"))?.hint}</span></div>
                  <div className="erp-field erp-c8"><label className="erp-label">Observação para o operador</label>
                    <input className="erp-input" value={form.notes ?? ""} placeholder="O que esta etapa tem de particular neste item"
                      onChange={(e) => set("notes", e.target.value || undefined)} /></div>
                </div>
              </div>

              {!terceiro && (
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Tempo — <span style={{ fontWeight: 400, opacity: .65 }}>em branco herda da biblioteca ({rotuloUnidade(lib?.time_unit)})</span></div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label">Unidade desta etapa</label>
                      <select className="erp-input" value={form.time_unit ?? ""} onChange={(e) => set("time_unit", (e.target.value || undefined) as TimeUnit | undefined)}>
                        <option value="">Herda ({rotuloUnidade(lib?.time_unit)})</option>
                        {TIME_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                      <span className="erp-field-hint">Vale para todos os tempos sobrepostos aqui.</span></div>
                    <div className="erp-field erp-c3"><label className="erp-label">O tempo é contado</label>
                      <select className="erp-input" value={form.time_basis ?? ""} onChange={(e) => set("time_basis", (e.target.value || undefined) as TimeBasis | undefined)}>
                        <option value="">Herda ({TIME_BASES.find((b) => b.value === (lib?.time_basis ?? "PECA"))?.label.toLowerCase()})</option>
                        {TIME_BASES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                      </select></div>
                    {baseEfetiva === "ATRIBUTO" ? (
                      <div className="erp-field erp-c3"><label className="erp-label">Atributo do item</label>
                        <input className="erp-input" value={form.time_basis_attribute ?? ""} placeholder={lib?.time_basis_attribute ?? "FUROS"}
                          onChange={(e) => set("time_basis_attribute", e.target.value.toUpperCase() || undefined)} /></div>
                    ) : <div className="erp-field erp-c3" />}
                    <div className="erp-field erp-c3">
                      {etapa?.missing_measure
                        ? <span className="erp-field-hint" style={{ color: "var(--v-err)" }}>O item não informa a medida desta base: complete o cadastro do item.</span>
                        : baseEfetiva !== "PECA" && etapa?.units_per_piece
                          ? <span className="erp-field-hint">Cada peça deste item: <strong>{num(etapa.units_per_piece)} {TIME_BASES.find((b) => b.value === baseEfetiva)?.unit}</strong>.</span>
                          : null}
                    </div>

                    <div className="erp-field erp-c3"><label className="erp-label">Preparação</label>
                      <input className="erp-input num" type="number" min={0} step="any" value={form.setup_time ?? ""} placeholder={herdado(lib, "setup_time")}
                        onChange={(e) => set("setup_time", numOuVazio(e.target.value))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Tempo de máquina</label>
                      <input id="et-run" className="erp-input num" type="number" min={0} step="any" value={form.run_time ?? ""} placeholder={herdado(lib, "run_time")}
                        onChange={(e) => set("run_time", numOuVazio(e.target.value))} />
                      {form.run_time === undefined && (form.standard_time ?? 0) > 0 ? (
                        <span className="erp-field-hint" style={{ color: "var(--v-warn)" }}>
                          Há {num(form.standard_time)} gravado no campo antigo, que o planejamento ignora.{" "}
                          <button type="button" className="erp-btn erp-btn-sm" onClick={() => set("run_time", form.standard_time)}>Usar como tempo de máquina</button>
                        </span>
                      ) : <span className="erp-field-hint">Por ciclo, em {rotuloUnidade(unidade)}.</span>}</div>
                    <div className="erp-field erp-c3"><label className="erp-label">Ciclo produz</label>
                      <input className="erp-input num" type="number" min={0.0001} step="any" value={form.run_base_qty ?? ""} placeholder={herdado(lib, "run_base_qty")}
                        onChange={(e) => set("run_base_qty", numOuVazio(e.target.value))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Mão de obra</label>
                      <input className="erp-input num" type="number" min={0} step="any" value={form.labor_time ?? ""} placeholder={herdado(lib, "labor_time")}
                        onChange={(e) => set("labor_time", numOuVazio(e.target.value))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Operadores</label>
                      <input className="erp-input num" type="number" min={1} step="1" value={form.crew_size ?? ""} placeholder={herdado(lib, "crew_size")}
                        onChange={(e) => set("crew_size", numOuVazio(e.target.value))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Fila</label>
                      <input className="erp-input num" type="number" min={0} step="any" value={form.queue_time ?? ""} placeholder={herdado(lib, "queue_time")}
                        onChange={(e) => set("queue_time", numOuVazio(e.target.value))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Espera</label>
                      <input className="erp-input num" type="number" min={0} step="any" value={form.wait_time ?? ""} placeholder={herdado(lib, "wait_time")}
                        onChange={(e) => set("wait_time", numOuVazio(e.target.value))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Movimentação</label>
                      <input className="erp-input num" type="number" min={0} step="any" value={form.move_time ?? ""} placeholder={herdado(lib, "move_time")}
                        onChange={(e) => set("move_time", numOuVazio(e.target.value))} /></div>
                  </div>
                </div>
              )}

              {terceiro && (
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Terceiro — <span style={{ fontWeight: 400, opacity: .65 }}>em branco herda da biblioteca</span></div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c4"><label className="erp-label">Fornecedor</label>
                      <LookupField value={form.supplier_id ?? undefined} onChange={(c) => set("supplier_id", c ? Number(c) : undefined)}
                        loader={loadSuppliers} entityLabel="fornecedor" clearable
                        placeholder={lib?.supplier_id ? "Herda o da operação" : "Quem executa"} /></div>
                    <div className="erp-field erp-c4"><label className="erp-label">Item de serviço</label>
                      <LookupField value={form.service_item_code ?? undefined} onChange={(c) => set("service_item_code", c ? String(c) : undefined)}
                        loader={loadItems} entityLabel="item" clearable placeholder={lib?.service_item_code ? "Herda o da operação" : "Serviço comprado"} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Prazo (dias)</label>
                      <input id="et-prazo" className="erp-input num" type="number" min={0} step="1" value={form.lead_time_days ?? ""} placeholder={herdado(lib, "lead_time_days")}
                        onChange={(e) => set("lead_time_days", numOuVazio(e.target.value))} />
                      <span className="erp-field-hint">Dias corridos.</span></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Custo por peça</label>
                      <input className="erp-input num" type="number" min={0} step="0.0001" value={form.cost_per_unit ?? ""} placeholder={herdado(lib, "cost_per_unit")}
                        onChange={(e) => set("cost_per_unit", numOuVazio(e.target.value))} />
                      <span className="erp-field-hint">Usado se a VTPS0100 não tiver preço.</span></div>
                    <div className="erp-field erp-c4"><label className="erp-label">O que remeter</label>
                      <select className="erp-input" value={form.third_party_remittance ?? ""} onChange={(e) => set("third_party_remittance", e.target.value || undefined)}>
                        <option value="">Herda ({enumLabel(lib?.third_party_remittance ?? "DEMAND_ITEMS")})</option>
                        {THIRD_PARTY_REMITTANCES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
                      </select></div>
                  </div>
                </div>
              )}

              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Qualidade</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label htmlFor="et-refugo" className="erp-label">Refugo desta etapa (%)</label>
                    <input id="et-refugo" className="erp-input num" type="number" min={0} max={99.9} step="0.1" value={form.scrap_pct ?? ""} placeholder={herdado(lib, "scrap_pct")}
                      onChange={(e) => set("scrap_pct", numOuVazio(e.target.value))} /></div>
                  <div className="erp-field erp-c5"><label className="erp-label">Ponto de inspeção</label>
                    <div className="erp-toggle-row">
                      <label className="erp-toggle">
                        <input type="checkbox" checked={!!form.inspection_required} onChange={(e) => set("inspection_required", e.target.checked)} />
                        <div className="erp-toggle-track" /><div className="erp-toggle-thumb" />
                      </label>
                      <span className="erp-toggle-label">{form.inspection_required ? "A peça para para ser conferida" : "Segue direto"}</span>
                    </div>
                    {!ehModelo && <span className="erp-field-hint">O que conferir vai na aba Inspeção.</span>}</div>
                </div>
              </div>
            </>
          )}

          {aba === "centros" && etapa?.id && <CentrosDaEtapa routeId={routeId} etapa={etapa} onChanged={aposMudanca} />}
          {aba === "ferramentas" && etapa?.id && <FerramentasDaEtapa routeId={routeId} etapaId={etapa.id} />}
          {aba === "documentos" && etapa?.id && <DocumentosDaEtapa etapaId={etapa.id} documentos={documentos} onChanged={aposMudanca} />}
          {aba === "inspecao" && etapa?.id && (
            <InspecaoDaEtapa routeId={routeId} etapa={etapa} inspecoes={inspecoes} onChanged={aposMudanca} />
          )}
        </div>
        {aba === "etapa" && (
          <div className="erp-modal-actions">
            <button className="erp-btn" onClick={onClose} disabled={busy}>Cancelar</button>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>
              {busy && <span className="erp-spin" />}{nova ? "Incluir etapa" : "Salvar etapa"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Centros alternativos. O PRINCIPAL é o centro da própria etapa — antes ele
 * aparecia duas vezes (campo da etapa e marca "principal" aqui) e as duas
 * informações podiam divergir. Agora só os alternativos são cadastrados aqui;
 * "tornar principal" troca o centro da etapa.
 */
function CentrosDaEtapa({ routeId, etapa, onChanged }: { routeId: number; etapa: RouteOperationDTO; onChanged: (m: string, patch?: Partial<RouteOperationDTO>) => Promise<void> }): JSX.Element {
  const [lista, setLista] = useState<RouteOpResourceDTO[]>([]);
  const [form, setForm] = useState({ work_center_id: 0, priority: "2", time_factor: "1" });
  const [erro, setErro] = useState("");
  const carregar = async () => setLista(await listRouteOpResources(routeId, etapa.id!));
  useEffect(() => { void carregar().catch((e) => setErro(errMessage(e))); }, [routeId, etapa.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const principal = etapa.effective_work_center_id ?? etapa.work_center_id;
  const alternativos = useMemo(() => lista.filter((r) => r.work_center_id !== principal), [lista, principal]);
  const run = async (fn: () => Promise<void>) => { setErro(""); try { await fn(); } catch (e) { setErro(errMessage(e)); } };

  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Onde mais esta etapa pode rodar quando o centro principal está cheio</div>
      <div className="erp-fieldset-body">
        {erro && <div className="erp-field erp-c12"><div className="erp-feedback error">{erro}</div></div>}
        <div className="erp-field erp-c12">
          <div className="fsc-rot-cascata">
            <span>Principal</span>
            <strong>{principal ? <EntityName code={principal} loader={loadWorkCenters} showCode={false} /> : "sem centro"}</strong>
            <span className="erp-field-hint">— troque na aba Etapa. É o que custo, CRP e prazo usam.</span>
          </div>
        </div>
        <div className="erp-field erp-c5"><label className="erp-label erp-req">Centro alternativo</label>
          <LookupField value={form.work_center_id || undefined} onChange={(c) => setForm((f) => ({ ...f, work_center_id: c ? Number(c) : 0 }))}
            loader={loadWorkCenters} allowManualCode={false} entityLabel="centro de trabalho" clearable placeholder="Escolher centro…" /></div>
        <div className="erp-field erp-c2"><label className="erp-label">Prioridade</label>
          <input className="erp-input num" type="number" min={1} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
          <span className="erp-field-hint">2 = segunda opção.</span></div>
        <div className="erp-field erp-c3"><label className="erp-label">Fator de tempo</label>
          <input className="erp-input num" type="number" min={0.1} step="0.05" value={form.time_factor} onChange={(e) => setForm((f) => ({ ...f, time_factor: e.target.value }))} />
          <span className="erp-field-hint">1,2 = 20% mais lento lá.</span></div>
        <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
          <button className="erp-btn erp-btn-primary" onClick={() => void run(async () => {
            if (!form.work_center_id) { setErro("Escolha o centro."); return; }
            if (form.work_center_id === principal) { setErro("Esse já é o centro principal da etapa."); return; }
            if (alternativos.some((r) => r.work_center_id === form.work_center_id)) { setErro("Esse centro já está na lista de alternativos."); return; }
            await addRouteOpResource(routeId, etapa.id!, { work_center_id: form.work_center_id, priority: Number(form.priority) || 2, time_factor: Number(form.time_factor) || 1, is_primary: false });
            setForm({ work_center_id: 0, priority: "2", time_factor: "1" });
            await carregar();
          })}>+ Alternativo</button></div>
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Centro</th><th className="num">Prioridade</th><th className="num">Fator</th><th style={{ width: 230 }} /></tr></thead>
            <tbody>
              {alternativos.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Sem alternativos: a etapa só roda no centro principal.</td></tr>}
              {alternativos.map((r) => (
                <tr key={r.id}>
                  <td>{r.work_center_name || <EntityName code={r.work_center_id} loader={loadWorkCenters} showCode={false} />}</td>
                  <td className="num">
                    <input className="erp-input num" style={{ width: 70 }} type="number" min={1} defaultValue={r.priority}
                      onBlur={(e) => void run(async () => { await updateRouteOpResource(routeId, etapa.id!, r.id!, { priority: Number(e.target.value) || 1, time_factor: r.time_factor ?? 1 }); await carregar(); })} /></td>
                  <td className="num">
                    <input className="erp-input num" style={{ width: 80 }} type="number" min={0.1} step="0.05" defaultValue={r.time_factor ?? 1}
                      onBlur={(e) => void run(async () => { await updateRouteOpResource(routeId, etapa.id!, r.id!, { priority: r.priority, time_factor: Number(e.target.value) || 1 }); await carregar(); })} /></td>
                  <td>
                    <div className="rot-acoes">
                    <button className="erp-btn erp-btn-sm" onClick={() => void run(async () => {
                      await setRouteOpResourcePrimary(routeId, etapa.id!, r.id!);
                      await onChanged(`${r.work_center_name || "O centro"} passa a ser o principal da etapa ${etapa.sequence}; o anterior ficou como alternativo.`, { work_center_id: r.work_center_id });
                      await carregar();
                    })}>Tornar principal</button>
                    <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => void run(async () => { await removeRouteOpResource(routeId, etapa.id!, r.id!); await carregar(); })}>Remover</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FerramentasDaEtapa({ routeId, etapaId }: { routeId: number; etapaId: number }): JSX.Element {
  const [lista, setLista] = useState<Obj[]>([]);
  const [tool, setTool] = useState(0);
  const [qtd, setQtd] = useState("1");
  const [erro, setErro] = useState("");
  const carregar = async () => setLista(await listRouteOpTools(routeId, etapaId));
  useEffect(() => { void carregar().catch((e) => setErro(errMessage(e))); }, [routeId, etapaId]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (fn: () => Promise<void>) => { setErro(""); try { await fn(); } catch (e) { setErro(errMessage(e)); } };
  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Ferramentas — <span style={{ fontWeight: 400, opacity: .65 }}>a vida útil é consumida quando a etapa é concluída</span></div>
      <div className="erp-fieldset-body">
        {erro && <div className="erp-field erp-c12"><div className="erp-feedback error">{erro}</div></div>}
        <div className="erp-field erp-c6"><label className="erp-label erp-req">Ferramenta</label>
          <LookupField value={tool || undefined} onChange={(c) => setTool(c ? Number(c) : 0)} loader={loadTools} entityLabel="ferramenta" clearable placeholder="Escolher ferramenta…" /></div>
        <div className="erp-field erp-c2"><label className="erp-label">Quantidade</label>
          <input className="erp-input num" type="number" min={1} step="1" value={qtd} onChange={(e) => setQtd(e.target.value)} />
          <span className="erp-field-hint">Jogo de 4 insertos = 4.</span></div>
        <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
          <button className="erp-btn erp-btn-primary" onClick={() => void run(async () => {
            if (!tool) { setErro("Escolha a ferramenta."); return; }
            await addRouteOpTool(routeId, etapaId, tool, Number(qtd) || 1); setTool(0); setQtd("1"); await carregar();
          })}>+ Ferramenta</button></div>
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Ferramenta</th><th className="num">Qtd</th><th style={{ width: 90 }} /></tr></thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhuma ferramenta vinculada.</td></tr>}
              {lista.map((t, i) => {
                const link = Number(t.id ?? t.ID ?? 0);
                const toolId = Number(t.tool_id ?? t.ToolID ?? 0);
                return (
                  <tr key={link || i}>
                    <td>{String(t.tool_name ?? "") || <EntityName code={toolId} loader={loadTools} />}</td>
                    <td className="num">{String(t.qty_required ?? t.QtyRequired ?? 1)}</td>
                    <td>{link ? <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => void run(async () => { await removeRouteOpTool(routeId, etapaId, link); await carregar(); })}>Remover</button> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const DOC_VAZIO = { kind: "DESENHO" as DocumentKind, title: "", reference: "", revision: "" };
function DocumentosDaEtapa({ etapaId, documentos, onChanged }: { etapaId: number; documentos: OperationDocumentDTO[]; onChanged: (m: string, patch?: Partial<RouteOperationDTO>) => Promise<void> }): JSX.Element {
  const [form, setForm] = useState(DOC_VAZIO);
  const [erro, setErro] = useState("");
  const daEtapa = documentos.filter((d) => d.route_operation_id === etapaId);
  const run = async (fn: () => Promise<void>) => { setErro(""); try { await fn(); } catch (e) { setErro(errMessage(e)); } };
  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Documentos — <span style={{ fontWeight: 400, opacity: .65 }}>o desenho é do item; a instrução genérica vem da operação</span></div>
      <div className="erp-fieldset-body">
        {erro && <div className="erp-field erp-c12"><div className="erp-feedback error">{erro}</div></div>}
        <div className="erp-field erp-c3"><label className="erp-label">Tipo</label>
          <select className="erp-input" value={form.kind} onChange={(e) => setForm((d) => ({ ...d, kind: e.target.value as DocumentKind }))}>
            {DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select></div>
        <div className="erp-field erp-c4"><label className="erp-label erp-req">Título</label>
          <input className="erp-input" value={form.title} placeholder="Desenho da bucha Ø50" onChange={(e) => setForm((d) => ({ ...d, title: e.target.value }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Referência</label>
          <input className="erp-input" value={form.reference} placeholder="DES-BU-050 ou caminho/URL" onChange={(e) => setForm((d) => ({ ...d, reference: e.target.value }))} /></div>
        <div className="erp-field erp-c1"><label className="erp-label">Rev.</label>
          <input className="erp-input" value={form.revision} onChange={(e) => setForm((d) => ({ ...d, revision: e.target.value }))} /></div>
        <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}>
          <button className="erp-btn erp-btn-primary" title="Anexar" onClick={() => void run(async () => {
            if (!form.title.trim()) { setErro("Informe o título do documento."); return; }
            await addOperationDocument({ route_operation_id: etapaId, ...form }); setForm(DOC_VAZIO); await onChanged("Documento vinculado à etapa.");
          })}>+</button></div>
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Tipo</th><th>Título</th><th>Referência</th><th>Rev.</th><th>Origem</th><th style={{ width: 110 }} /></tr></thead>
            <tbody>
              {daEtapa.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum documento nesta etapa.</td></tr>}
              {daEtapa.map((d) => (
                <tr key={d.id}>
                  <td>{DOCUMENT_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind}</td>
                  <td style={{ fontWeight: 600 }}>{d.title}</td><td>{d.reference || "—"}</td><td>{d.revision || "—"}</td>
                  <td>{d.is_step_level ? <span className="erp-badge erp-badge-green">Desta etapa</span> : <span className="erp-badge erp-badge-gray">Da operação</span>}</td>
                  <td>{d.is_step_level
                    ? <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => d.id && void run(async () => { await removeOperationDocument(d.id!); await onChanged("Documento removido."); })}>Remover</button>
                    : <span className="erp-field-hint">na biblioteca</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Inspeção da etapa. "Onde" (recebimento/expedição) saiu: numa etapa de
 * fabricação a inspeção é sempre do processo — recebimento é da compra e
 * expedição é da venda, e oferecer as duas aqui só produzia plano mal
 * classificado.
 */
function InspecaoDaEtapa({ routeId, etapa, inspecoes, onChanged }: { routeId: number; etapa: RouteOperationDTO; inspecoes: RouteInspectionDTO[]; onChanged: (m: string, patch?: Partial<RouteOperationDTO>) => Promise<void> }): JSX.Element {
  const [form, setForm] = useState({ description: "", sample_size: "1", acceptance_level: "0" });
  const [erro, setErro] = useState("");
  const daEtapa = inspecoes.filter((i) => i.route_operation_id === etapa.id);
  const run = async (fn: () => Promise<void>) => { setErro(""); try { await fn(); } catch (e) { setErro(errMessage(e)); } };
  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">O que conferir nesta etapa</div>
      <div className="erp-fieldset-body">
        {erro && <div className="erp-field erp-c12"><div className="erp-feedback error">{erro}</div></div>}
        {!etapa.inspection_required && (
          <div className="erp-field erp-c12"><span className="erp-field-hint" style={{ color: "var(--v-warn)" }}>
            A etapa não está marcada como ponto de inspeção (aba Etapa). Ao incluir um plano ela passa a ser.
          </span></div>
        )}
        <div className="erp-field erp-c6"><label htmlFor="insp-desc" className="erp-label erp-req">O que inspecionar</label>
          <input id="insp-desc" className="erp-input" value={form.description} placeholder="Dureza superficial após cementação"
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label">Amostra</label>
          <input className="erp-input num" type="number" min={1} step="1" value={form.sample_size} onChange={(e) => setForm((f) => ({ ...f, sample_size: e.target.value }))} />
          <span className="erp-field-hint">Peças por lote.</span></div>
        <div className="erp-field erp-c2"><label className="erp-label">Aceitação (%)</label>
          <input className="erp-input num" type="number" min={0} max={100} step="0.1" value={form.acceptance_level} onChange={(e) => setForm((f) => ({ ...f, acceptance_level: e.target.value }))} />
          <span className="erp-field-hint">Defeituosas toleradas.</span></div>
        <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
          <button className="erp-btn erp-btn-primary" onClick={() => void run(async () => {
            if (!form.description.trim()) { setErro("Descreva o que será inspecionado."); return; }
            await addRouteInspection(routeId, etapa.id!, {
              point_type: "PROCESSO", description: form.description,
              sample_size: Number(form.sample_size) || 1, acceptance_level: Number(form.acceptance_level) || 0,
            });
            if (!etapa.inspection_required) await updateRouteOperation(routeId, etapa.id!, { ...payloadDaEtapa(etapa), inspection_required: true });
            setForm({ description: "", sample_size: "1", acceptance_level: "0" });
            await onChanged("Plano de inspeção criado. A ordem de produção abrirá o registro ao chegar nesta etapa.", { inspection_required: true });
          })}>+ Plano</button></div>
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>O que inspecionar</th><th className="num">Amostra</th><th className="num">Aceitação</th><th className="num">Características</th><th style={{ width: 90 }} /></tr></thead>
            <tbody>
              {daEtapa.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum plano. Sem plano a ordem não abre registro de inspeção.</td></tr>}
              {daEtapa.map((i) => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 600 }}>{i.description}</td>
                  <td className="num">{i.sample_size}</td><td className="num">{i.acceptance_level}%</td><td className="num">{i.characteristic_count ?? 0}</td>
                  <td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => i.id && void run(async () => { await removeRouteInspection(routeId, etapa.id!, i.id!); await onChanged("Plano removido."); })}>Remover</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
