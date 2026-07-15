import { useState, useCallback, useEffect } from "react";
import {
  type OperationDTO, type OpOrigin, type RouteDTO, type RouteOperationDTO, type EdgeDTO, type RouteDetail,
  OP_ORIGINS,
  listOperations, createOperation, updateOperation, deleteOperation,
  listRoutes, createRoute, deleteRoute,
  getRouteDetail, addRouteOperation, removeRouteOperation,
  createEdge, deleteEdge, getLeadTime,
  type RouteOpResourceDTO,
  listRouteOpResources, addRouteOpResource, setRouteOpResourcePrimary, removeRouteOpResource,
  listRouteOpTools, addRouteOpTool, removeRouteOpTool,
} from "@/services/manufacturingRoutingService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "operacoes" | "roteiros";

const EMPTY_OP: OperationDTO = { name: "", origin: "INTERNA", standard_time: 0 };
const EMPTY_ROUTE: RouteDTO = { item_code: 0, description: "", alternative: 1, is_standard: true };
const EMPTY_RO: RouteOperationDTO = { operation_id: 0, sequence: 10, work_center_id: undefined, standard_time: undefined, setup_time: undefined, notes: "" };
const EMPTY_EDGE: EdgeDTO = { predecessor_id: 0, successor_id: 0, overlap_pct: 0 };

function originPill(o: string): JSX.Element {
  const cls = o === "INTERNA" ? "fsc-pill-green" : o === "EXTERNA" ? "fsc-pill-amber" : "fsc-pill-blue";
  return <span className={`fsc-pill ${cls}`}>{o}</span>;
}

export function Vpro0100Page(): JSX.Element {
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
  const [detail, setDetail] = useState<RouteDetail | null>(null);
  const [roForm, setRoForm] = useState<RouteOperationDTO>(EMPTY_RO);
  const [edgeForm, setEdgeForm] = useState<EdgeDTO>(EMPTY_EDGE);
  // R5 recursos alternativos + R3 ferramentas por operação
  const [selOpId, setSelOpId] = useState<number | null>(null);
  const [resources, setResources] = useState<RouteOpResourceDTO[]>([]);
  const [resForm, setResForm] = useState({ work_center_id: "", priority: "1", time_factor: "1", is_primary: false });
  const [opTools, setOpTools] = useState<Obj[]>([]);
  const [toolIdInput, setToolIdInput] = useState("");
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

  async function carregarRoteiros() {
    const code = Number(itemCode);
    if (!code) { setFeedback({ type: "error", message: "Informe o código do item." }); return; }
    setBusy(true); setFeedback(null); setDetail(null); setLeadTime(null);
    try { setRoutes(await listRoutes(code)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar roteiros.") }); }
    finally { setBusy(false); }
  }

  async function salvarRoteiro() {
    const code = Number(itemCode);
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
    await addRouteOpTool(rid, selOpId, Number(toolIdInput)); setToolIdInput("");
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

  // helper p/ rótulo de operação do roteiro nos selects de dependência
  const roLabel = (ro: RouteOperationDTO) => `seq ${ro.sequence} · ${opName(ro.operation_id)}`;

  return (
    <div className="fsc-root">
      <header className="fsc-topbar">
        <div className="fsc-topbar-left">
          <div className="fsc-logo">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
              <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>
          <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
          <span className="fsc-screen-title">VPRO0100 — Roteiro de Fabricação</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Visão</span>
          <button className={`fsc-btn ${tab === "operacoes" ? "fsc-btn-primary" : "fsc-btn-ghost"}`} onClick={() => setTab("operacoes")}>Operações</button>
          <button className={`fsc-btn ${tab === "roteiros" ? "fsc-btn-primary" : "fsc-btn-ghost"}`} onClick={() => setTab("roteiros")}>Roteiros</button>
        </div>
        {tab === "operacoes" && (
          <div className="fsc-action-group">
            <span className="fsc-action-label">Ações</span>
            <button className="fsc-btn fsc-btn-new" onClick={novaOp} disabled={busy}>+ Nova Operação</button>
            <button className="fsc-btn fsc-btn-primary" onClick={() => void salvarOp()} disabled={busy}>{busy ? "..." : opEditId !== null ? "Atualizar" : "Salvar"}</button>
          </div>
        )}
        {tab === "roteiros" && (
          <div className="fsc-action-group">
            <span className="fsc-action-label">Item</span>
            <input className="fsc-input" style={{ width: 110, height: 32 }} type="number" value={itemCode} placeholder="cód. item" onChange={(e) => setItemCode(e.target.value)} />
            <button className="fsc-btn fsc-btn-primary" onClick={() => void carregarRoteiros()} disabled={busy}>Carregar</button>
          </div>
        )}
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VPRO0100 — Roteiro de Fabricação" filename="vpro0100" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {tab === "operacoes" && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Operação</span><div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">{opEditId !== null ? `Editando #${opEditId}` : "Biblioteca reutilizável"}</span></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Nome</label>
                  <input className="fsc-input" value={opForm.name} placeholder="Corte a laser" onChange={(e) => setOpF("name", e.target.value)} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Origem</label>
                  <select className="fsc-select" value={opForm.origin} onChange={(e) => setOpF("origin", e.target.value as OpOrigin)}>
                    {OP_ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Tempo padrão (h)</label>
                  <input className="fsc-input fsc-input-right" type="number" step="0.01" value={opForm.standard_time} onChange={(e) => setOpF("standard_time", Number(e.target.value))} /></div>
              </div>
              <span className="fsc-field-hint">Origem define o tipo de ordem do MRP: INTERNA → OF · EXTERNA/TERCEIROS → OS.</span>
            </div></div>

            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Biblioteca</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{ops.length}</span></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th style={{ width: 60 }}>#</th><th>Nome</th><th>Origem</th><th className="fsc-num">Tempo (h)</th><th style={{ width: 140 }}>Ações</th></tr></thead>
                <tbody>
                  {ops.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhuma operação cadastrada.</td></tr>}
                  {ops.map((o) => (
                    <tr key={o.id}>
                      <td>{o.id}</td><td style={{ fontWeight: 600 }}>{o.name}</td><td>{originPill(o.origin)}</td><td className="fsc-num">{o.standard_time}</td>
                      <td>
                        <button className="fsc-action-btn fsc-edit-btn" onClick={() => editOp(o)}>Editar</button>
                        <button className="fsc-action-btn fsc-delete-btn" onClick={() => o.id && void removerOp(o.id)}>Desativar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          </>
        )}

        {tab === "roteiros" && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Novo roteiro</span><div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">{itemCode ? `Item ${itemCode}` : "Informe o item na barra acima"}</span></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-6"><label className="fsc-label">Descrição</label>
                  <input className="fsc-input" value={routeForm.description ?? ""} placeholder="Roteiro Padrão – Produto X" onChange={(e) => setRF("description", e.target.value)} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Alternativa</label>
                  <input className="fsc-input fsc-input-right" type="number" value={routeForm.alternative} onChange={(e) => setRF("alternative", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Máscara</label>
                  <input className="fsc-input" value={routeForm.mask ?? ""} onChange={(e) => setRF("mask", e.target.value)} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Padrão (MRP/CRP)</label>
                  <div className="fsc-toggle-row">
                    <label className="fsc-toggle"><input type="checkbox" checked={routeForm.is_standard} onChange={(e) => setRF("is_standard", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label>
                    <span className="fsc-toggle-label">{routeForm.is_standard ? "Sim" : "Não"}</span></div></div>
              </div>
              <button className="fsc-btn fsc-btn-new" style={{ marginTop: 10 }} onClick={() => void salvarRoteiro()} disabled={busy}>+ Criar roteiro</button>
            </div></div>

            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Roteiros do item</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{routes.length}</span></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th style={{ width: 60 }}>#</th><th>Descrição</th><th className="fsc-num">Alt.</th><th>Padrão</th><th style={{ width: 170 }}>Ações</th></tr></thead>
                <tbody>
                  {routes.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhum roteiro. Carregue um item.</td></tr>}
                  {routes.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td><td style={{ fontWeight: 600 }}>{r.description || "—"}</td><td className="fsc-num">{r.alternative}</td>
                      <td>{r.is_standard ? <span className="fsc-pill fsc-pill-green">Sim</span> : <span className="fsc-pill fsc-pill-gray">Não</span>}</td>
                      <td>
                        <button className="fsc-action-btn fsc-edit-btn" onClick={() => void abrirRoteiro(r)}>Abrir</button>
                        <button className="fsc-action-btn fsc-delete-btn" onClick={() => r.id && void removerRoteiro(r.id)}>Desativar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>

            {detail?.route && (
              <>
                <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Operações do roteiro {detail.route.id}</span><div className="fsc-section-banner-line" />
                  <button className="fsc-btn fsc-btn-ghost" onClick={() => void calcularLeadTime()} disabled={busy}>Calcular Lead Time (CPM)</button>
                  {leadTime !== null && <span className="fsc-section-banner-hint" style={{ fontWeight: 700 }}>Lead time: {leadTime} h</span>}
                  <button className="fsc-btn fsc-btn-ghost" onClick={() => setDetail(null)}>Fechar</button></div>
                <div className="fsc-card"><div className="fsc-card-body">
                  <div className="fsc-grid">
                    <div className="fsc-field fsc-col-4"><label className="fsc-label fsc-label-req">Operação</label>
                      <select className="fsc-select" value={roForm.operation_id} onChange={(e) => setRoF("operation_id", Number(e.target.value))}>
                        <option value={0}>— selecione —</option>
                        {ops.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.origin})</option>)}</select></div>
                    <div className="fsc-field fsc-col-1"><label className="fsc-label">Seq</label>
                      <input className="fsc-input fsc-input-right" type="number" value={roForm.sequence} onChange={(e) => setRoF("sequence", Number(e.target.value))} /></div>
                    <div className="fsc-field fsc-col-2"><label className="fsc-label">Centro (ID)</label>
                      <input className="fsc-input fsc-input-right" type="number" value={roForm.work_center_id ?? ""} onChange={(e) => setRoF("work_center_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
                    <div className="fsc-field fsc-col-2"><label className="fsc-label">Tempo (h)</label>
                      <input className="fsc-input fsc-input-right" type="number" step="0.01" value={roForm.standard_time ?? ""} onChange={(e) => setRoF("standard_time", e.target.value ? Number(e.target.value) : undefined)} /></div>
                    <div className="fsc-field fsc-col-2"><label className="fsc-label">Setup (h)</label>
                      <input className="fsc-input fsc-input-right" type="number" step="0.01" value={roForm.setup_time ?? ""} onChange={(e) => setRoF("setup_time", e.target.value ? Number(e.target.value) : undefined)} /></div>
                    <div className="fsc-field fsc-col-1" style={{ justifyContent: "flex-end" }}>
                      <button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void addRO()} disabled={busy}>+ Op</button></div>
                  </div>
                </div>
                  <div className="fsc-results-wrap">
                    <table className="fsc-table">
                      <thead><tr><th style={{ width: 50 }}>Seq</th><th>Operação</th><th className="fsc-num">Centro</th><th className="fsc-num">Tempo (h)</th><th className="fsc-num">Setup (h)</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                      <tbody>
                        {detail.operations.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhuma operação no roteiro.</td></tr>}
                        {[...detail.operations].sort((a, b) => a.sequence - b.sequence).map((ro) => (
                          <tr key={ro.id ?? `${ro.sequence}-${ro.operation_id}`}>
                            <td style={{ fontWeight: 600 }}>{ro.sequence}</td><td>{opName(ro.operation_id)}</td>
                            <td className="fsc-num">{ro.work_center_id ?? "—"}</td><td className="fsc-num">{ro.standard_time ?? "—"}</td><td className="fsc-num">{ro.setup_time ?? "—"}</td>
                            <td><button className="fsc-action-btn" onClick={() => abrirRecursos(ro.id)} disabled={!ro.id}>Rec/Ferr</button> <button className="fsc-action-btn fsc-delete-btn" onClick={() => ro.id && void removeRO(ro.id)} disabled={!ro.id}>Remover</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selOpId && (
                  <>
                    <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Recursos &amp; Ferramentas — operação {selOpId}</span><div className="fsc-section-banner-line" />
                      <button className="fsc-btn fsc-btn-ghost" onClick={() => setSelOpId(null)}>Fechar</button></div>
                    <div className="fsc-card"><div className="fsc-card-body">
                      <div className="fsc-grid">
                        <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Centro (recurso alt.)</label><input className="fsc-input fsc-input-right" type="number" value={resForm.work_center_id} onChange={(e) => setResForm((r) => ({ ...r, work_center_id: e.target.value }))} /></div>
                        <div className="fsc-field fsc-col-2"><label className="fsc-label">Prioridade</label><input className="fsc-input fsc-input-right" type="number" value={resForm.priority} onChange={(e) => setResForm((r) => ({ ...r, priority: e.target.value }))} /></div>
                        <div className="fsc-field fsc-col-2"><label className="fsc-label">Fator tempo</label><input className="fsc-input fsc-input-right" type="number" step="0.1" value={resForm.time_factor} onChange={(e) => setResForm((r) => ({ ...r, time_factor: e.target.value }))} /></div>
                        <div className="fsc-field fsc-col-3" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}><label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><input type="checkbox" checked={resForm.is_primary} onChange={(e) => setResForm((r) => ({ ...r, is_primary: e.target.checked }))} />primário</label><button className="fsc-btn fsc-btn-primary" onClick={addResource} disabled={busy}>+ Recurso</button></div>
                      </div>
                      <div className="fsc-results-wrap">
                        <table className="fsc-table">
                          <thead><tr><th className="fsc-num">Centro</th><th className="fsc-num">Prioridade</th><th className="fsc-num">Fator</th><th>Primário</th><th style={{ width: 150 }}>Ações</th></tr></thead>
                          <tbody>
                            {resources.length === 0 && <tr><td colSpan={5} className="fsc-empty">Sem recursos alternativos (usa o centro da operação).</td></tr>}
                            {resources.map((r) => (
                              <tr key={r.id}><td className="fsc-num">{r.work_center_id}</td><td className="fsc-num">{r.priority}</td><td className="fsc-num">{r.time_factor ?? 1}</td><td>{r.is_primary ? "✓" : ""}</td>
                                <td>{!r.is_primary && <button className="fsc-action-btn" onClick={() => tornarPrimario(r)}>Primário</button>} <button className="fsc-action-btn fsc-delete-btn" onClick={() => removeResource(r)}>Remover</button></td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="fsc-grid" style={{ marginTop: 10 }}>
                        <div className="fsc-field fsc-col-3"><label className="fsc-label">Ferramenta (ID)</label><input className="fsc-input fsc-input-right" type="number" value={toolIdInput} onChange={(e) => setToolIdInput(e.target.value)} /></div>
                        <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={addTool} disabled={busy}>+ Ferramenta</button></div>
                      </div>
                      <div className="fsc-results-wrap">
                        <table className="fsc-table">
                          <thead><tr><th className="fsc-num">Vínculo</th><th className="fsc-num">Ferramenta</th><th>Descrição</th><th style={{ width: 90 }}>Ações</th></tr></thead>
                          <tbody>
                            {opTools.length === 0 && <tr><td colSpan={4} className="fsc-empty">Nenhuma ferramenta vinculada.</td></tr>}
                            {opTools.map((t, i) => { const lid = Number(t.id ?? t.ID ?? 0); return (
                              <tr key={i}><td className="fsc-num">{lid || "—"}</td><td className="fsc-num">{String(t.tool_id ?? t.ToolID ?? "—")}</td><td>{String(t.tool_name ?? t.name ?? "—")}</td>
                                <td>{lid ? <button className="fsc-action-btn fsc-delete-btn" onClick={() => removeTool(lid)}>Remover</button> : "—"}</td></tr>
                            ); })}
                          </tbody>
                        </table>
                      </div>
                    </div></div>
                  </>
                )}

                <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Rede de dependências</span><div className="fsc-section-banner-line" />
                  <span className="fsc-section-banner-hint">overlap só vale em centro automático (requires_operator=false)</span></div>
                <div className="fsc-card"><div className="fsc-card-body">
                  <div className="fsc-grid">
                    <div className="fsc-field fsc-col-4"><label className="fsc-label fsc-label-req">Predecessora</label>
                      <select className="fsc-select" value={edgeForm.predecessor_id} onChange={(e) => setEF("predecessor_id", Number(e.target.value))}>
                        <option value={0}>— selecione —</option>
                        {detail.operations.map((ro) => <option key={ro.id} value={ro.id}>{roLabel(ro)}</option>)}</select></div>
                    <div className="fsc-field fsc-col-4"><label className="fsc-label fsc-label-req">Sucessora</label>
                      <select className="fsc-select" value={edgeForm.successor_id} onChange={(e) => setEF("successor_id", Number(e.target.value))}>
                        <option value={0}>— selecione —</option>
                        {detail.operations.map((ro) => <option key={ro.id} value={ro.id}>{roLabel(ro)}</option>)}</select></div>
                    <div className="fsc-field fsc-col-3"><label className="fsc-label">Overlap (%)</label>
                      <input className="fsc-input fsc-input-right" type="number" min={0} max={100} value={edgeForm.overlap_pct} onChange={(e) => setEF("overlap_pct", Number(e.target.value))} /></div>
                    <div className="fsc-field fsc-col-1" style={{ justifyContent: "flex-end" }}>
                      <button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void addEdgeFn()} disabled={busy}>+</button></div>
                  </div>
                </div>
                  <div className="fsc-results-wrap">
                    <table className="fsc-table">
                      <thead><tr><th>Predecessora</th><th>Sucessora</th><th className="fsc-num">Overlap %</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                      <tbody>
                        {detail.edges.length === 0 && <tr><td colSpan={4} className="fsc-empty">Nenhuma dependência (sequência livre / paralela).</td></tr>}
                        {detail.edges.map((ed, i) => {
                          const p = detail.operations.find((o) => o.id === ed.predecessor_id);
                          const s = detail.operations.find((o) => o.id === ed.successor_id);
                          return (
                            <tr key={ed.id ?? i}>
                              <td>{p ? roLabel(p) : ed.predecessor_id}</td><td>{s ? roLabel(s) : ed.successor_id}</td>
                              <td className="fsc-num">{ed.overlap_pct}</td>
                              <td><button className="fsc-action-btn fsc-delete-btn" onClick={() => void removeEdgeFn(ed)}>Remover</button></td>
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
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left">
          <div className="fsc-footer-stat">Operações: <strong>{ops.length}</strong></div>
          {tab === "roteiros" && <div className="fsc-footer-stat">Roteiros: <strong>{routes.length}</strong></div>}
        </div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
