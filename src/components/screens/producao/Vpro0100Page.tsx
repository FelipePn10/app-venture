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
  const cls = o === "INTERNA" ? "erp-badge-green" : o === "EXTERNA" ? "erp-badge-amber" : "erp-badge-blue";
  return <span className={`erp-badge ${cls}`}>{o}</span>;
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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Produção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Roteiro de Fabricação</span><span className="erp-crumb-code">VPRO0100</span></nav>
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
            <input className="erp-input" style={{ width: 110, height: 32 }} type="number" value={itemCode} placeholder="cód. item" onChange={(e) => setItemCode(e.target.value)} />
            <button className="erp-btn erp-btn-primary" onClick={() => void carregarRoteiros()} disabled={busy}>Carregar</button>
          </div>
        )}
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VPRO0100 — Roteiro de Fabricação" filename="vpro0100" />
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
              
                <div className="erp-field erp-c6"><label className="erp-label erp-req">Nome</label>
                  <input className="erp-input" value={opForm.name} placeholder="Corte a laser" onChange={(e) => setOpF("name", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Origem</label>
                  <select className="erp-input" value={opForm.origin} onChange={(e) => setOpF("origin", e.target.value as OpOrigin)}>
                    {OP_ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                <div className="erp-field erp-c3"><label className="erp-label">Tempo padrão (h)</label>
                  <input className="erp-input num" type="number" step="0.01" value={opForm.standard_time} onChange={(e) => setOpF("standard_time", Number(e.target.value))} /></div>
              
              <span className="erp-field-hint">Origem define o tipo de ordem do MRP: INTERNA → OF · EXTERNA/TERCEIROS → OS.</span>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Biblioteca — <span style={{fontWeight:400,opacity:0.65}}>{ops.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th style={{ width: 60 }}>#</th><th>Nome</th><th>Origem</th><th>Tempo (h)</th><th style={{ width: 140 }}>Ações</th></tr></thead>
                <tbody>
                  {ops.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma operação cadastrada.</td></tr>}
                  {ops.map((o) => (
                    <tr key={o.id}>
                      <td>{o.id}</td><td style={{ fontWeight: 600 }}>{o.name}</td><td>{originPill(o.origin)}</td><td>{o.standard_time}</td>
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
                <div className="erp-fieldset-head" style={{display:"flex",alignItems:"center",gap:8}}><span>Operações do roteiro {detail.route.id}</span><span style={{flex:1}} /> <button className="erp-btn" onClick={() => void calcularLeadTime()} disabled={busy}>Calcular Lead Time (CPM)</button> {leadTime !== null && <span className="erp-status-item" style={{ fontWeight: 700 }}>Lead time: {leadTime} h</span>} <button className="erp-btn" onClick={() => setDetail(null)}>Fechar</button></div>
                <div className="erp-fieldset"><div className="erp-fieldset-body">
                  
                    <div className="erp-field erp-c4"><label className="erp-label erp-req">Operação</label>
                      <select className="erp-input" value={roForm.operation_id} onChange={(e) => setRoF("operation_id", Number(e.target.value))}>
                        <option value={0}>— selecione —</option>
                        {ops.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.origin})</option>)}</select></div>
                    <div className="erp-field erp-c1"><label className="erp-label">Seq</label>
                      <input className="erp-input num" type="number" value={roForm.sequence} onChange={(e) => setRoF("sequence", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Centro (ID)</label>
                      <input className="erp-input num" type="number" value={roForm.work_center_id ?? ""} onChange={(e) => setRoF("work_center_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Tempo (h)</label>
                      <input className="erp-input num" type="number" step="0.01" value={roForm.standard_time ?? ""} onChange={(e) => setRoF("standard_time", e.target.value ? Number(e.target.value) : undefined)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Setup (h)</label>
                      <input className="erp-input num" type="number" step="0.01" value={roForm.setup_time ?? ""} onChange={(e) => setRoF("setup_time", e.target.value ? Number(e.target.value) : undefined)} /></div>
                    <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addRO()} disabled={busy}>+ Op</button></div>
                  
                </div>
                  <div className="erp-fieldset-body">
                    <table className="erp-grid">
                      <thead><tr><th style={{ width: 50 }}>Seq</th><th>Operação</th><th>Centro</th><th>Tempo (h)</th><th>Setup (h)</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                      <tbody>
                        {detail.operations.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma operação no roteiro.</td></tr>}
                        {[...detail.operations].sort((a, b) => a.sequence - b.sequence).map((ro) => (
                          <tr key={ro.id ?? `${ro.sequence}-${ro.operation_id}`}>
                            <td style={{ fontWeight: 600 }}>{ro.sequence}</td><td>{opName(ro.operation_id)}</td>
                            <td>{ro.work_center_id ?? "—"}</td><td>{ro.standard_time ?? "—"}</td><td>{ro.setup_time ?? "—"}</td>
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
                      
                        <div className="erp-field erp-c3"><label className="erp-label erp-req">Centro (recurso alt.)</label><input className="erp-input num" type="number" value={resForm.work_center_id} onChange={(e) => setResForm((r) => ({ ...r, work_center_id: e.target.value }))} /></div>
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
                        <div className="erp-field erp-c3"><label className="erp-label">Ferramenta (ID)</label><input className="erp-input num" type="number" value={toolIdInput} onChange={(e) => setToolIdInput(e.target.value)} /></div>
                        <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={addTool} disabled={busy}>+ Ferramenta</button></div>
                      </div>
                      <div className="erp-fieldset-body">
                        <table className="erp-grid">
                          <thead><tr><th>Vínculo</th><th>Ferramenta</th><th>Descrição</th><th style={{ width: 90 }}>Ações</th></tr></thead>
                          <tbody>
                            {opTools.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma ferramenta vinculada.</td></tr>}
                            {opTools.map((t, i) => { const lid = Number(t.id ?? t.ID ?? 0); return (
                              <tr key={i}><td>{lid || "—"}</td><td>{String(t.tool_id ?? t.ToolID ?? "—")}</td><td>{String(t.tool_name ?? t.name ?? "—")}</td>
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
