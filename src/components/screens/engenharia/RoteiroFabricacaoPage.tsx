import { useState, useCallback, useEffect } from "react";
import {
  type OperationDTO, type OpOrigin, type RouteDTO, type RouteOperationDTO, type EdgeDTO, type RouteDetail,
  OP_ORIGINS,
  listOperations, createOperation, updateOperation, deleteOperation,
  listRoutes, createRoute, deleteRoute,
  getRouteDetail, addRouteOperation, removeRouteOperation,
  createEdge, deleteEdge, getLeadTime,
  type RouteOpResourceDTO, type TimeUnit,
  TIME_UNITS, THIRD_PARTY_REMITTANCES,
  listRouteOpResources, addRouteOpResource, setRouteOpResourcePrimary, removeRouteOpResource,
  listRouteOpTools, addRouteOpTool, removeRouteOpTool,
} from "@/services/manufacturingRoutingService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { enumLabel } from "@/utils/enumLabels";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadWorkCenters, loadSuppliers, loadTools } from "@/services/lookups";
import { RoteiroCustoPanel } from "./roteiro/RoteiroCustoPanel";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "operacoes" | "roteiros";

const EMPTY_OP: OperationDTO = {
  name: "", origin: "INTERNA", standard_time: 0, setup_time: 0,
  run_time: 0, labor_time: 0, run_base_qty: 1, queue_time: 0, wait_time: 0, move_time: 0,
  crew_size: 1, time_unit: "HORA", third_party_remittance: "DEMAND_ITEMS",
};
const EMPTY_ROUTE: RouteDTO = { item_code: "", description: "", alternative: 1, is_standard: true };
const EMPTY_RO: RouteOperationDTO = { operation_id: 0, sequence: 10, work_center_id: undefined, standard_time: undefined, setup_time: undefined, notes: "" };
const EMPTY_EDGE: EdgeDTO = { predecessor_id: 0, successor_id: 0, overlap_pct: 0 };

function originPill(o: string): JSX.Element {
  const cls = o === "INTERNA" ? "erp-badge-green" : o === "EXTERNA" ? "erp-badge-amber" : "erp-badge-blue";
  return <span className={`erp-badge ${cls}`}>{enumLabel(o)}</span>;
}

/**
 * Roteiro de fabricação — operações, roteiros, precedências, recursos,
 * ferramentas e lead time.
 *
 * É a implementação única do roteiro: antes existia também na VPRO0100, que
 * chamava os mesmos endpoints de `/api/routing`. A rotina foi centralizada nas
 * telas de engenharia — VENT0115 (modelos padrão) e VENT0202 (roteiro efetivo
 * do item) —, que é onde o roteiro conversa com a OF, o CRP e o APS.
 */
export function RoteiroFabricacaoPage({ code = "VENT0202" }: { code?: "VENT0115" | "VENT0202" }): JSX.Element {
  const titulo = code === "VENT0115" ? "Roteiros Padrão" : "Roteiro de Fabricação por Item";
  const [tab, setTab] = useState<Tab>("operacoes");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  // Operações
  const [ops, setOps] = useState<OperationDTO[]>([]);
  const [opForm, setOpForm] = useState<OperationDTO>(EMPTY_OP);
  const [opEditId, setOpEditId] = useState<number | null>(null);

  // Roteiros
  const [itemCode, setItemCode] = useState("");
  const [routes, setRoutes] = useState<RouteDTO[]>([]);
  const [routeForm, setRouteForm] = useState<RouteDTO>(EMPTY_ROUTE);
  const [custoAberto, setCustoAberto] = useState(false);
  const [itemDestino, setItemDestino] = useState("");
  const [detail, setDetail] = useState<RouteDetail | null>(null);
  const [roForm, setRoForm] = useState<RouteOperationDTO>(EMPTY_RO);
  const [edgeForm, setEdgeForm] = useState<EdgeDTO>(EMPTY_EDGE);
  // R5 recursos alternativos + R3 ferramentas por operação
  const [selOpId, setSelOpId] = useState<number | null>(null);
  const [resources, setResources] = useState<RouteOpResourceDTO[]>([]);
  const [resForm, setResForm] = useState({ work_center_id: "", priority: "1", time_factor: "1", is_primary: false });
  const [opTools, setOpTools] = useState<Obj[]>([]);
  const [toolIdInput, setToolIdInput] = useState("");
  /** Quantas peças daquela ferramenta a operação consome (jogo de insertos, por ex.). */
  const [toolQtyInput, setToolQtyInput] = useState("1");
  const [leadTime, setLeadTime] = useState<number | null>(null);

  const opName = useCallback((id: number) => ops.find((o) => o.id === id)?.name ?? `Op ${id}`, [ops]);

  const loadOps = useCallback(async () => {
    setBusy(true);
    try { setOps(await listOperations()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar operações.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void loadOps(); }, [loadOps]);

  // ── Operações ──────────────────────────────────────────────────────────────
  const setOpF = <K extends keyof OperationDTO>(k: K, v: OperationDTO[K]) => { setOpForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novaOp() { setOpForm(EMPTY_OP); setOpEditId(null); setFeedback(null); }
  function editOp(o: OperationDTO) { setOpForm({ ...o }); setOpEditId(o.id ?? null); setFeedback(null); }

  async function salvarOp() {
    if (!opForm.name.trim()) { setFeedback({ type: "error", message: "Nome da operação é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (opEditId !== null) { await updateOperation(opEditId, opForm); setFeedback({ type: "success", message: `Operação "${opForm.name}" atualizada.` }); }
      else { await createOperation(opForm); setFeedback({ type: "success", message: `Operação "${opForm.name}" criada.` }); }
      novaOp(); await loadOps();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function removerOp(id: number) {
    if (!window.confirm("Desativar esta operação da biblioteca?")) return;
    setBusy(true); setFeedback(null);
    try { await deleteOperation(id); setFeedback({ type: "success", message: "Operação desativada." }); await loadOps(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  // ── Roteiros ───────────────────────────────────────────────────────────────
  const setRF = <K extends keyof RouteDTO>(k: K, v: RouteDTO[K]) => { setRouteForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  async function carregarRoteiros(codigo?: string) {
    const code = (codigo ?? itemCode).trim();
    if (!code) { setFeedback({ type: "error", message: "Informe o código do item." }); return; }
    setBusy(true); setFeedback(null); setDetail(null); setLeadTime(null);
    try { setRoutes(await listRoutes(code)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar roteiros.") }); }
    finally { setBusy(false); }
  }

  async function salvarRoteiro() {
    const code = itemCode.trim();
    if (!code) { setFeedback({ type: "error", message: "Informe o código do item antes de criar o roteiro." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createRoute({ ...routeForm, item_code: code });
      setFeedback({ type: "success", message: "Roteiro criado." });
      setRouteForm(EMPTY_ROUTE); await carregarRoteiros();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function removerRoteiro(id: number) {
    if (!window.confirm("Desativar este roteiro?")) return;
    setBusy(true); setFeedback(null);
    try { await deleteRoute(id); if (detail?.route?.id === id) setDetail(null); setFeedback({ type: "success", message: "Roteiro desativado." }); await carregarRoteiros(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const reloadDetail = useCallback(async (routeId: number) => {
    setBusy(true);
    try { setDetail(await getRouteDetail(routeId)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }, []);

  async function abrirRoteiro(r: RouteDTO) {
    if (!r.id) return;
    setRoForm(EMPTY_RO); setEdgeForm(EMPTY_EDGE); setLeadTime(null); setFeedback(null);
    await reloadDetail(r.id);
  }

  // route-operations
  const setRoF = <K extends keyof RouteOperationDTO>(k: K, v: RouteOperationDTO[K]) => setRoForm((p) => ({ ...p, [k]: v }));
  async function addRO() {
    const rid = detail?.route?.id; if (!rid) return;
    if (!roForm.operation_id) { setFeedback({ type: "error", message: "Selecione a operação." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await addRouteOperation(rid, roForm);
      setRoForm((p) => ({ ...EMPTY_RO, sequence: p.sequence + 10 }));
      await reloadDetail(rid); setFeedback({ type: "success", message: "Operação adicionada ao roteiro." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function removeRO(opId: number) {
    const rid = detail?.route?.id; if (!rid) return;
    setBusy(true); setFeedback(null);
    try { await removeRouteOperation(rid, opId); await reloadDetail(rid); setFeedback({ type: "success", message: "Operação removida." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  // R5 recursos alternativos + R3 ferramentas por operação do roteiro
  const wrap = async (fn: () => Promise<void>) => { setBusy(true); setFeedback(null); try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); } };
  const abrirRecursos = (opId?: number) => { const rid = detail?.route?.id; if (!rid || !opId) return; setSelOpId(opId); void wrap(async () => {
    const [rs, ts] = await Promise.all([listRouteOpResources(rid, opId), listRouteOpTools(rid, opId)]);
    setResources(rs); setOpTools(ts);
  }); };
  const addResource = () => { const rid = detail?.route?.id; if (!rid || !selOpId) return; void wrap(async () => {
    if (!resForm.work_center_id) { setFeedback({ type: "error", message: "Informe o centro de trabalho." }); return; }
    await addRouteOpResource(rid, selOpId, { work_center_id: Number(resForm.work_center_id), priority: Number(resForm.priority) || 1, time_factor: Number(resForm.time_factor) || 1, is_primary: resForm.is_primary });
    setResForm({ work_center_id: "", priority: "1", time_factor: "1", is_primary: false });
    setResources(await listRouteOpResources(rid, selOpId)); setFeedback({ type: "success", message: "Recurso alternativo adicionado." });
  }); };
  const tornarPrimario = (r: RouteOpResourceDTO) => { const rid = detail?.route?.id; if (!rid || !selOpId || !r.id) return; void wrap(async () => {
    await setRouteOpResourcePrimary(rid, selOpId, r.id!); setResources(await listRouteOpResources(rid, selOpId));
    setFeedback({ type: "success", message: `Centro ${r.work_center_id} definido como primário (usado por custo/CRP/lead-time).` });
  }); };
  const removeResource = (r: RouteOpResourceDTO) => { const rid = detail?.route?.id; if (!rid || !selOpId || !r.id) return; void wrap(async () => {
    await removeRouteOpResource(rid, selOpId, r.id!); setResources(await listRouteOpResources(rid, selOpId));
  }); };
  const addTool = () => { const rid = detail?.route?.id; if (!rid || !selOpId) return; void wrap(async () => {
    if (!toolIdInput) { setFeedback({ type: "error", message: "Informe o ID da ferramenta." }); return; }
    await addRouteOpTool(rid, selOpId, Number(toolIdInput), Number(toolQtyInput) || 1);
    setToolIdInput(""); setToolQtyInput("1");
    setOpTools(await listRouteOpTools(rid, selOpId)); setFeedback({ type: "success", message: "Ferramenta vinculada à operação." });
  }); };
  const removeTool = (linkId: number) => { const rid = detail?.route?.id; if (!rid || !selOpId) return; void wrap(async () => {
    await removeRouteOpTool(rid, selOpId, linkId); setOpTools(await listRouteOpTools(rid, selOpId));
  }); };

  // edges
  const setEF = <K extends keyof EdgeDTO>(k: K, v: EdgeDTO[K]) => setEdgeForm((p) => ({ ...p, [k]: v }));
  async function addEdgeFn() {
    const rid = detail?.route?.id; if (!rid) return;
    if (!edgeForm.predecessor_id || !edgeForm.successor_id) { setFeedback({ type: "error", message: "Selecione predecessora e sucessora." }); return; }
    if (edgeForm.predecessor_id === edgeForm.successor_id) { setFeedback({ type: "error", message: "Predecessora e sucessora devem ser diferentes." }); return; }
    setBusy(true); setFeedback(null);
    try { await createEdge(rid, edgeForm); setEdgeForm(EMPTY_EDGE); await reloadDetail(rid); setFeedback({ type: "success", message: "Dependência criada." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function removeEdgeFn(ed: EdgeDTO) {
    const rid = detail?.route?.id; if (!rid) return;
    setBusy(true); setFeedback(null);
    try { await deleteEdge(rid, { predecessor_id: ed.predecessor_id, successor_id: ed.successor_id }); await reloadDetail(rid); setFeedback({ type: "success", message: "Dependência removida." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function calcularLeadTime() {
    const rid = detail?.route?.id; if (!rid) return;
    setBusy(true); setFeedback(null);
    try {
      const r = await getLeadTime(rid);
      setLeadTime(r.lead_time_hours);
      const cp = r.critical_path.map((id) => { const ro = detail?.operations.find((o) => o.id === id); return ro ? `seq ${ro.sequence}` : `#${id}`; }).join(" → ");
      setFeedback({ type: "info", message: `Lead time (CPM): ${r.lead_time_hours} h${cp ? ` · caminho crítico: ${cp}` : ""}.` });
    }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  /**
   * Copia o roteiro aberto para outro item.
   *
   * É o que faz um roteiro padrão valer a pena: em vez de redigitar quinze
   * operações para cada peça parecida, copia-se o modelo e ajusta-se o que é
   * diferente. Vão junto as operações — com os tempos que sobrescrevem a
   * biblioteca — e a rede de dependências, que é o que define o caminho crítico.
   */
  async function copiarRoteiro() {
    const atual = detail;
    const origem = atual?.route;
    if (!atual || !origem?.id) return;
    const destino = itemDestino.trim();
    if (!destino) { setFeedback({ type: "error", message: "Escolha o item de destino." }); return; }
    if (destino === origem.item_code) { setFeedback({ type: "error", message: "O destino é o mesmo item de origem." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const novo = await createRoute({
        item_code: destino,
        alternative: origem.alternative,
        description: `${origem.description ?? "Roteiro"} (cópia de ${origem.item_code})`,
        is_standard: false,
        valid_from: origem.valid_from,
        valid_to: origem.valid_to,
      });
      if (!novo.id) throw new Error("o roteiro de destino não foi criado");

      // As operações precisam ser recriadas antes das dependências: a rede
      // aponta para os ids novos, não para os do roteiro de origem.
      const equivalencia = new Map<number, number>();
      for (const ro of [...atual.operations].sort((a, b) => a.sequence - b.sequence)) {
        const criada = await addRouteOperation(novo.id, {
          sequence: ro.sequence,
          operation_id: ro.operation_id,
          work_center_id: ro.work_center_id,
          standard_time: ro.standard_time,
          setup_time: ro.setup_time,
          run_time: ro.run_time,
          labor_time: ro.labor_time,
          run_base_qty: ro.run_base_qty,
          queue_time: ro.queue_time,
          wait_time: ro.wait_time,
          move_time: ro.move_time,
          crew_size: ro.crew_size,
          time_unit: ro.time_unit,
          supplier_id: ro.supplier_id,
          service_item_code: ro.service_item_code,
          cost_per_unit: ro.cost_per_unit,
          lead_time_days: ro.lead_time_days,
          third_party_remittance: ro.third_party_remittance,
          notes: ro.notes,
        });
        if (ro.id && criada.id) equivalencia.set(ro.id, criada.id);
      }
      let redeCopiada = 0;
      for (const ed of atual.edges) {
        const p = equivalencia.get(ed.predecessor_id);
        const su = equivalencia.get(ed.successor_id);
        if (!p || !su) continue;
        await createEdge(novo.id, { predecessor_id: p, successor_id: su, overlap_pct: ed.overlap_pct });
        redeCopiada += 1;
      }
      setItemDestino("");
      setFeedback({
        type: "success",
        message: `Roteiro copiado para o item ${destino}: ${equivalencia.size} operação(ões) e ${redeCopiada} dependência(s).`,
      });
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e) });
    } finally { setBusy(false); }
  }

  // helper p/ rótulo de operação do roteiro nos selects de dependência
  const roLabel = (ro: RouteOperationDTO) => `seq ${ro.sequence} · ${opName(ro.operation_id)}`;

  return (
    <div className="erp-screen">
      <style>{`
        .rot-sec { font-size: 10.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #2f7d47; border-bottom: 1px solid #dbe8d5; padding-bottom: 4px; margin-top: 4px; }
        .erp-grid .num { text-align: right; }
      `}</style>
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">{titulo}</span><span className="erp-crumb-code">{code}</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Visão</span>
          <button className={`erp-btn ${tab === "operacoes" ? "erp-btn-primary" : "erp-btn-ghost"}`} onClick={() => setTab("operacoes")}>Operações</button>
          <button className={`erp-btn ${tab === "roteiros" ? "erp-btn-primary" : "erp-btn-ghost"}`} onClick={() => setTab("roteiros")}>Roteiros</button>
        </div>
        {tab === "operacoes" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-new" onClick={novaOp} disabled={busy}>+ Nova Operação</button>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvarOp()} disabled={busy}>{busy ? "..." : opEditId !== null ? "Atualizar" : "Salvar"}</button>
          </div>
        )}
        {tab === "roteiros" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Item</span>
            <div style={{ width: 220 }}><LookupField value={itemCode || undefined} onChange={(code) => { setItemCode(String(code ?? "")); if (code) void carregarRoteiros(String(code)); }} loader={loadItems} entityLabel="item" placeholder="Buscar item" /></div>
            <button className="erp-btn erp-btn-primary" onClick={() => void carregarRoteiros()} disabled={busy}>Carregar</button>
          </div>
        )}
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title={`${code} — ${titulo}`} filename={code.toLowerCase()} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Roteiro de Fabricação</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {tab === "operacoes" && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Operação  — <span style={{fontWeight:400,opacity:0.65}}>{opEditId !== null ? `Editando #${opEditId}` : "Biblioteca reutilizável"}</span></div><div className="erp-fieldset-body">
              
                <div className="erp-field erp-c5"><label className="erp-label erp-req">Nome</label>
                  <input className="erp-input" value={opForm.name} placeholder="Corte a laser" onChange={(e) => setOpF("name", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Origem</label>
                  <select className="erp-input" value={opForm.origin} onChange={(e) => setOpF("origin", e.target.value as OpOrigin)}>
                    {OP_ORIGINS.map((o) => <option key={o} value={o}>{enumLabel(o)}</option>)}</select>
                  <span className="erp-field-hint">Define o tipo de ordem no MRP: interna → OF · externa/terceiros → OS.</span></div>
                <div className="erp-field erp-c2"><label className="erp-label">Unidade dos tempos</label>
                  <select className="erp-input" value={opForm.time_unit ?? "HORA"} onChange={(e) => setOpF("time_unit", e.target.value as TimeUnit)}>
                    {TIME_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select></div>
                <div className="erp-field erp-c2"><label className="erp-label">Centro padrão</label>
                  <LookupField value={opForm.default_work_center_id ?? undefined}
                    onChange={(c) => setOpF("default_work_center_id", c ? Number(c) : undefined)}
                    loader={loadWorkCenters} entityLabel="centro de trabalho" placeholder="Opcional" clearable /></div>

                <div className="erp-field erp-c12"><div className="rot-sec">Modelo de tempo</div></div>
                <div className="erp-field erp-c2"><label className="erp-label">Preparação (por lote)</label>
                  <input className="erp-input num" type="number" step="0.001" value={opForm.setup_time ?? 0}
                    onChange={(e) => setOpF("setup_time", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Máquina</label>
                  <input className="erp-input num" type="number" step="0.001" value={opForm.run_time ?? 0}
                    onChange={(e) => setOpF("run_time", Number(e.target.value))} />
                  <span className="erp-field-hint">Por lote-base.</span></div>
                <div className="erp-field erp-c2"><label className="erp-label">Mão de obra</label>
                  <input className="erp-input num" type="number" step="0.001" value={opForm.labor_time ?? 0}
                    onChange={(e) => setOpF("labor_time", Number(e.target.value))} />
                  <span className="erp-field-hint">Zero = igual à máquina.</span></div>
                <div className="erp-field erp-c2"><label className="erp-label">Peças por ciclo</label>
                  <input className="erp-input num" type="number" min={1} step="1" value={opForm.run_base_qty ?? 1}
                    onChange={(e) => setOpF("run_base_qty", Number(e.target.value) || 1)} />
                  <span className="erp-field-hint">Quantas peças saem no tempo acima.</span></div>
                <div className="erp-field erp-c2"><label className="erp-label">Operadores</label>
                  <input className="erp-input num" type="number" min={1} step="1" value={opForm.crew_size ?? 1}
                    onChange={(e) => setOpF("crew_size", Number(e.target.value) || 1)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Tempo padrão (legado)</label>
                  <input className="erp-input num" type="number" step="0.001" value={opForm.standard_time}
                    onChange={(e) => setOpF("standard_time", Number(e.target.value))} />
                  <span className="erp-field-hint">Usado só quando máquina é zero.</span></div>

                <div className="erp-field erp-c2"><label className="erp-label">Fila</label>
                  <input className="erp-input num" type="number" step="0.001" value={opForm.queue_time ?? 0}
                    onChange={(e) => setOpF("queue_time", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Espera</label>
                  <input className="erp-input num" type="number" step="0.001" value={opForm.wait_time ?? 0}
                    onChange={(e) => setOpF("wait_time", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Movimentação</label>
                  <input className="erp-input num" type="number" step="0.001" value={opForm.move_time ?? 0}
                    onChange={(e) => setOpF("move_time", Number(e.target.value))} /></div>
                <div className="erp-field erp-c6"><span className="erp-field-hint">
                  Fila, espera e movimentação são fixos por lote: entram no prazo (lead time) mas não ocupam a máquina.
                </span></div>

                {opForm.origin !== "INTERNA" && (
                  <>
                    <div className="erp-field erp-c12"><div className="rot-sec">Terceirização</div></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Fornecedor</label>
                      <LookupField value={opForm.supplier_id ?? undefined}
                        onChange={(c) => setOpF("supplier_id", c ? Number(c) : undefined)}
                        loader={loadSuppliers} entityLabel="fornecedor" placeholder="Quem executa" clearable /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Item de serviço</label>
                      <LookupField value={opForm.service_item_code ?? undefined}
                        onChange={(c) => setOpF("service_item_code", c ? String(c) : undefined)}
                        loader={loadItems} entityLabel="item" placeholder="Serviço comprado" clearable /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Custo por peça</label>
                      <input className="erp-input num" type="number" step="0.0001" value={opForm.cost_per_unit ?? ""}
                        onChange={(e) => setOpF("cost_per_unit", e.target.value ? Number(e.target.value) : undefined)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Prazo (dias)</label>
                      <input className="erp-input num" type="number" min={0} step="1" value={opForm.lead_time_days ?? ""}
                        onChange={(e) => setOpF("lead_time_days", e.target.value ? Number(e.target.value) : undefined)} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">O que remeter</label>
                      <select className="erp-input" value={opForm.third_party_remittance ?? "DEMAND_ITEMS"}
                        onChange={(e) => setOpF("third_party_remittance", e.target.value)}>
                        {THIRD_PARTY_REMITTANCES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
                  </>
                )}
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Biblioteca — <span style={{fontWeight:400,opacity:0.65}}>{ops.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th style={{ width: 60 }}>#</th><th>Nome</th><th>Origem</th><th className="num">Prep.</th><th className="num">Máquina</th><th className="num">Peças/ciclo</th><th className="num">Equipe</th><th>Un.</th><th style={{ width: 140 }}>Ações</th></tr></thead>
                <tbody>
                  {ops.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhuma operação cadastrada.</td></tr>}
                  {ops.map((o) => (
                    <tr key={o.id}>
                      <td>{o.id}</td><td style={{ fontWeight: 600 }}>{o.name}</td><td>{originPill(o.origin)}</td>
                      <td className="num">{o.setup_time ?? 0}</td>
                      <td className="num">{o.run_time || o.standard_time}</td>
                      <td className="num">{o.run_base_qty ?? 1}</td>
                      <td className="num">{o.crew_size ?? 1}</td>
                      <td>{enumLabel(o.time_unit ?? "HORA")}</td>
                      <td>
                        <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => editOp(o)}>Editar</button>
                        <button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => o.id && void removerOp(o.id)}>Desativar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
            </div>
          </>
        )}

        {tab === "roteiros" && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Novo roteiro  — <span style={{fontWeight:400,opacity:0.65}}>{itemCode ? `Item ${itemCode}` : "Informe o item na barra acima"}</span></div><div className="erp-fieldset-body">
              
                <div className="erp-field erp-c6"><label className="erp-label">Descrição</label>
                  <input className="erp-input" value={routeForm.description ?? ""} placeholder="Roteiro Padrão – Produto X" onChange={(e) => setRF("description", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Alternativa</label>
                  <input className="erp-input num" type="number" value={routeForm.alternative} onChange={(e) => setRF("alternative", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Máscara</label>
                  <input className="erp-input" value={routeForm.mask ?? ""} onChange={(e) => setRF("mask", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Início da vigência</label>
                  <input className="erp-input" type="date" value={(routeForm.valid_from ?? "").slice(0, 10)}
                    onChange={(e) => setRF("valid_from", e.target.value || undefined)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Fim da vigência</label>
                  <input className="erp-input" type="date" value={(routeForm.valid_to ?? "").slice(0, 10)}
                    onChange={(e) => setRF("valid_to", e.target.value || undefined)} />
                  <span className="erp-field-hint">Em branco = sem prazo.</span></div>
                <div className="erp-field erp-c2"><label className="erp-label">Padrão (MRP/CRP)</label>
                  <div className="erp-toggle-row">
                    <label className="erp-toggle"><input type="checkbox" checked={routeForm.is_standard} onChange={(e) => setRF("is_standard", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label>
                    <span className="erp-toggle-label">{routeForm.is_standard ? "Sim" : "Não"}</span></div></div>
              </div>
              <button className="erp-btn erp-btn-new" style={{ marginTop: 10 }} onClick={() => void salvarRoteiro()} disabled={busy}>+ Criar roteiro</button>
            </div>

            <div className="erp-fieldset-head">Roteiros do item — <span style={{fontWeight:400,opacity:0.65}}>{routes.length}</span></div>
            <div className="erp-fieldset"><div className="erp-fieldset-body">
              <table className="erp-grid">
                <thead><tr><th style={{ width: 60 }}>#</th><th>Descrição</th><th>Alt.</th><th>Padrão</th><th style={{ width: 170 }}>Ações</th></tr></thead>
                <tbody>
                  {routes.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum roteiro. Carregue um item.</td></tr>}
                  {routes.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td><td style={{ fontWeight: 600 }}>{r.description || "—"}</td><td>{r.alternative}</td>
                      <td>{r.is_standard ? <span className="erp-badge ok">Sim</span> : <span className="erp-badge erp-badge-gray">Não</span>}</td>
                      <td>
                        <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void abrirRoteiro(r)}>Abrir</button>
                        <button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => r.id && void removerRoteiro(r.id)}>Desativar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>

            {detail?.route && (
              <>
                <div className="erp-fieldset-head" style={{display:"flex",alignItems:"center",gap:8}}><span>Operações do roteiro {detail.route.id}</span><span style={{flex:1}} /> <button className="erp-btn" onClick={() => void calcularLeadTime()} disabled={busy}>Calcular Lead Time (CPM)</button> <button className="erp-btn erp-btn-primary" onClick={() => setCustoAberto(true)} disabled={detail.operations.length === 0}>Tempo e custo do lote</button> {leadTime !== null && <span className="erp-status-item" style={{ fontWeight: 700 }}>Lead time: {leadTime} h</span>} <button className="erp-btn" onClick={() => setDetail(null)}>Fechar</button></div>
                <div className="erp-fieldset"><div className="erp-fieldset-body">
                    <div className="erp-field erp-c4"><label className="erp-label">Copiar este roteiro para</label>
                      <LookupField value={itemDestino || undefined}
                        onChange={(c) => setItemDestino(c ? String(c) : "")}
                        loader={loadItems} entityLabel="item" placeholder="Item de destino…" clearable /></div>
                    <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn" onClick={() => void copiarRoteiro()} disabled={busy || !itemDestino}>
                        Copiar roteiro
                      </button></div>
                    <div className="erp-field erp-c5"><span className="erp-field-hint">
                      Leva as operações com seus tempos e a rede de dependências. É assim que um roteiro padrão
                      vira o ponto de partida de uma peça nova.
                    </span></div>
                    <div className="erp-field erp-c12"><div className="rot-sec">Incluir operação</div></div>
                    <div className="erp-field erp-c4"><label className="erp-label erp-req">Operação</label>
                      <select className="erp-input" value={roForm.operation_id} onChange={(e) => setRoF("operation_id", Number(e.target.value))}>
                        <option value={0}>— selecione —</option>
                        {ops.map((o) => <option key={o.id} value={o.id}>{o.name} ({enumLabel(o.origin)})</option>)}</select></div>
                    <div className="erp-field erp-c1"><label className="erp-label">Seq</label>
                      <input className="erp-input num" type="number" value={roForm.sequence} onChange={(e) => setRoF("sequence", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Centro de trabalho</label>
                      <LookupField value={roForm.work_center_id ?? undefined}
                        onChange={(c) => setRoF("work_center_id", c ? Number(c) : undefined)}
                        loader={loadWorkCenters} entityLabel="centro de trabalho" placeholder="Herda da operação" clearable /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Máquina</label>
                      <input className="erp-input num" type="number" step="0.001" value={roForm.standard_time ?? ""} placeholder="herda"
                        onChange={(e) => setRoF("standard_time", e.target.value ? Number(e.target.value) : undefined)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Preparação</label>
                      <input className="erp-input num" type="number" step="0.001" value={roForm.setup_time ?? ""} placeholder="herda"
                        onChange={(e) => setRoF("setup_time", e.target.value ? Number(e.target.value) : undefined)} /></div>
                    <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addRO()} disabled={busy}>+ Op</button></div>
                    <div className="erp-field erp-c12"><span className="erp-field-hint">
                      Campos em branco herdam o que está na operação da biblioteca — preencha só o que é diferente neste roteiro.
                    </span></div>
                  
                </div>
                  <div className="erp-fieldset-body">
                    <table className="erp-grid">
                      <thead><tr><th style={{ width: 50 }}>Seq</th><th>Operação</th><th>Centro</th><th className="num">Preparação</th><th className="num">Máquina</th><th className="num">Mão de obra</th><th className="num">Peças/ciclo</th><th style={{ width: 150 }}>Ações</th></tr></thead>
                      <tbody>
                        {detail.operations.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhuma operação no roteiro.</td></tr>}
                        {[...detail.operations].sort((a, b) => a.sequence - b.sequence).map((ro) => (
                          <tr key={ro.id ?? `${ro.sequence}-${ro.operation_id}`}>
                            <td style={{ fontWeight: 600 }}>{ro.sequence}</td>
                            <td>{ro.operation_name || opName(ro.operation_id)}</td>
                            <td>{ro.work_center_name || ro.work_center_id || "—"}</td>
                            <td className="num">{ro.eff_time?.setup_hours ?? ro.effective_setup ?? ro.setup_time ?? "—"}</td>
                            <td className="num">{ro.eff_time?.run_hours ?? ro.effective_std_time ?? ro.standard_time ?? "—"}</td>
                            <td className="num">{ro.eff_time?.labor_hours || "—"}</td>
                            <td className="num">{ro.eff_time?.run_base_qty ?? ro.run_base_qty ?? 1}</td>
                            <td><button className="erp-btn erp-btn-sm" onClick={() => abrirRecursos(ro.id)} disabled={!ro.id}>Rec/Ferr</button> <button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => ro.id && void removeRO(ro.id)} disabled={!ro.id}>Remover</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selOpId && (
                  <>
                    <div className="erp-fieldset-head" style={{display:"flex",alignItems:"center",gap:8}}><span>Recursos &amp; Ferramentas — operação {selOpId}</span><span style={{flex:1}} /> <button className="erp-btn" onClick={() => setSelOpId(null)}>Fechar</button></div>
                    <div className="erp-fieldset"><div className="erp-fieldset-body">
                      
                        <div className="erp-field erp-c3"><label className="erp-label erp-req">Centro (recurso alternativo)</label>
                          <LookupField value={Number(resForm.work_center_id) || undefined}
                            onChange={(c) => setResForm((r) => ({ ...r, work_center_id: c ? String(c) : "" }))}
                            loader={loadWorkCenters} entityLabel="centro de trabalho" placeholder="Escolher centro…" clearable /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Prioridade</label><input className="erp-input num" type="number" value={resForm.priority} onChange={(e) => setResForm((r) => ({ ...r, priority: e.target.value }))} /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Fator tempo</label><input className="erp-input num" type="number" step="0.1" value={resForm.time_factor} onChange={(e) => setResForm((r) => ({ ...r, time_factor: e.target.value }))} /></div>
                        <div className="erp-field erp-c3" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}><label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><input type="checkbox" checked={resForm.is_primary} onChange={(e) => setResForm((r) => ({ ...r, is_primary: e.target.checked }))} />primário</label><button className="erp-btn erp-btn-primary" onClick={addResource} disabled={busy}>+ Recurso</button></div>
                      
                      <div className="erp-fieldset-body">
                        <table className="erp-grid">
                          <thead><tr><th>Centro</th><th>Prioridade</th><th>Fator</th><th>Primário</th><th style={{ width: 150 }}>Ações</th></tr></thead>
                          <tbody>
                            {resources.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Sem recursos alternativos (usa o centro da operação).</td></tr>}
                            {resources.map((r) => (
                              <tr key={r.id}><td>{r.work_center_id}</td><td>{r.priority}</td><td>{r.time_factor ?? 1}</td><td>{r.is_primary ? "✓" : ""}</td>
                                <td>{!r.is_primary && <button className="erp-btn erp-btn-sm" onClick={() => tornarPrimario(r)}>Primário</button>} <button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => removeResource(r)}>Remover</button></td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="erp-fieldset-body" style={{ marginTop: 10 }}>
                        <div className="erp-field erp-c4"><label className="erp-label">Ferramenta</label>
                          <LookupField value={Number(toolIdInput) || undefined}
                            onChange={(c) => setToolIdInput(c ? String(c) : "")}
                            loader={loadTools} entityLabel="ferramenta" placeholder="Escolher ferramenta…" clearable /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Qtd necessária</label>
                          <input className="erp-input num" type="number" min="1" step="1" value={toolQtyInput}
                            onChange={(e) => setToolQtyInput(e.target.value)} /></div>
                        <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={addTool} disabled={busy}>+ Ferramenta</button></div>
                      </div>
                      <div className="erp-fieldset-body">
                        <table className="erp-grid">
                          <thead><tr><th>Vínculo</th><th>Ferramenta</th><th>Descrição</th><th className="num">Qtd</th><th style={{ width: 90 }}>Ações</th></tr></thead>
                          <tbody>
                            {opTools.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma ferramenta vinculada.</td></tr>}
                            {opTools.map((t, i) => { const lid = Number(t.id ?? t.ID ?? 0); return (
                              <tr key={i}><td>{lid || "—"}</td><td>{String(t.tool_id ?? t.ToolID ?? "—")}</td><td>{String(t.tool_name ?? t.name ?? "—")}</td>
                                <td className="num">{String(t.qty_required ?? t.QtyRequired ?? 1)}</td>
                                <td>{lid ? <button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => removeTool(lid)}>Remover</button> : "—"}</td></tr>
                            ); })}
                          </tbody>
                        </table>
                      </div>
                    </div></div>
                  </>
                )}

                <div className="erp-fieldset-head">Rede de dependências — <span style={{fontWeight:400,opacity:0.65}}>overlap só vale em centro automático (requires_operator=false)</span></div>
                <div className="erp-fieldset"><div className="erp-fieldset-body">
                  
                    <div className="erp-field erp-c4"><label className="erp-label erp-req">Predecessora</label>
                      <select className="erp-input" value={edgeForm.predecessor_id} onChange={(e) => setEF("predecessor_id", Number(e.target.value))}>
                        <option value={0}>— selecione —</option>
                        {detail.operations.map((ro) => <option key={ro.id} value={ro.id}>{roLabel(ro)}</option>)}</select></div>
                    <div className="erp-field erp-c4"><label className="erp-label erp-req">Sucessora</label>
                      <select className="erp-input" value={edgeForm.successor_id} onChange={(e) => setEF("successor_id", Number(e.target.value))}>
                        <option value={0}>— selecione —</option>
                        {detail.operations.map((ro) => <option key={ro.id} value={ro.id}>{roLabel(ro)}</option>)}</select></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Overlap (%)</label>
                      <input className="erp-input num" type="number" min={0} max={100} value={edgeForm.overlap_pct} onChange={(e) => setEF("overlap_pct", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addEdgeFn()} disabled={busy}>+</button></div>
                  
                </div>
                  <div className="erp-fieldset-body">
                    <table className="erp-grid">
                      <thead><tr><th>Predecessora</th><th>Sucessora</th><th>Overlap %</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                      <tbody>
                        {detail.edges.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma dependência (sequência livre / paralela).</td></tr>}
                        {detail.edges.map((ed, i) => {
                          const p = detail.operations.find((o) => o.id === ed.predecessor_id);
                          const s = detail.operations.find((o) => o.id === ed.successor_id);
                          return (
                            <tr key={ed.id ?? i}>
                              <td>{p ? roLabel(p) : ed.predecessor_id}</td><td>{s ? roLabel(s) : ed.successor_id}</td>
                              <td>{ed.overlap_pct}</td>
                              <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => void removeEdgeFn(ed)}>Remover</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div></section></div>

      {custoAberto && detail && (
        <RoteiroCustoPanel
          operacoes={detail.operations}
          nomeDaOperacao={opName}
          onClose={() => setCustoAberto(false)} />
      )}

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}>
          <div className="erp-status-item">Operações: <strong>{ops.length}</strong></div>
          {tab === "roteiros" && <div className="erp-status-item">Roteiros: <strong>{routes.length}</strong></div>}
        </div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
