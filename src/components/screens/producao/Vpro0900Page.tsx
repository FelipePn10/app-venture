import { useState, useCallback } from "react";
import {
  type ProductionOrderDTO,
  type AppointmentDTO,
  type ConsumptionDTO,
  type CostDTO,
  listProductionOrders,
  getProductionOrder,
  createProductionOrder,
  startProductionOrder,
  completeProductionOrder,
  closeProductionOrder,
  cancelProductionOrder,
  appointProduction,
  addConsumption,
  listAppointments,
  listConsumptions,
  explodeOperations,
  listOperations,
  settleCost,
  getCost,
  scrapReturn,
  type OperationDTO,
  type MaterialDTO,
  listMaterials,
  addMaterial,
  allocateLots,
  addScrapDestination,
} from "@/services/productionOrderService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberta", IN_PROGRESS: "Em produção", COMPLETED: "Concluída", CLOSED: "Encerrada", CANCELLED: "Cancelada",
};
const statusLabel = (s?: string) => (s ? STATUS_LABEL[s] ?? s : "—");
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const EMPTY_OF: ProductionOrderDTO = { item_code: 0, planned_qty: 1, priority: "NORMAL" };
const EMPTY_APP: AppointmentDTO = { production_order_id: 0, produced_qty: 0, scrapped_qty: 0 };
const EMPTY_CONS: ConsumptionDTO = { production_order_id: 0, item_code: 0, consumed_qty: 0, warehouse_id: 0 };

export function Vpro0900Page(): JSX.Element {
  const [orders, setOrders] = useState<ProductionOrderDTO[]>([]);
  const [selected, setSelected] = useState<ProductionOrderDTO | null>(null);
  const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
  const [consumptions, setConsumptions] = useState<ConsumptionDTO[]>([]);
  const [operations, setOperations] = useState<OperationDTO[]>([]);
  const [cost, setCost] = useState<CostDTO | null>(null);
  const [materials, setMaterials] = useState<MaterialDTO[]>([]);
  const [matForm, setMatForm] = useState({ item_code: "", quantity: "", warehouse_id: "", automatic_issue: true });
  const [newOf, setNewOf] = useState<ProductionOrderDTO>(EMPTY_OF);
  const [app, setApp] = useState<AppointmentDTO>(EMPTY_APP);
  const [cons, setCons] = useState<ConsumptionDTO>(EMPTY_CONS);
  const [completeWh, setCompleteWh] = useState("2");
  const [completeLot, setCompleteLot] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const loadDetails = useCallback(async (id: number) => {
    const [of, ap, co, ops] = await Promise.all([
      getProductionOrder(id), listAppointments(id), listConsumptions(id), listOperations(id),
    ]);
    setSelected(of); setAppointments(ap); setConsumptions(co); setOperations(ops);
    setApp({ ...EMPTY_APP, production_order_id: id }); setCons({ ...EMPTY_CONS, production_order_id: id });
    try { setCost(await getCost(id)); } catch { setCost(null); }
    try { setMaterials(await listMaterials(id)); } catch { setMaterials([]); }
  }, []);

  const listar = () => run(async () => { setOrders(await listProductionOrders()); });
  const abrir = (id?: number) => { if (id) void run(async () => { await loadDetails(id); }); };

  const criar = () => run(async () => {
    if (!newOf.item_code) { setFeedback({ type: "error", message: "Item é obrigatório." }); return; }
    if (!newOf.planned_qty) { setFeedback({ type: "error", message: "Quantidade planejada é obrigatória." }); return; }
    const of = await createProductionOrder(newOf);
    setNewOf(EMPTY_OF);
    setFeedback({ type: "success", message: `OF ${of.id} criada (${statusLabel(of.status)}).` });
    setOrders(await listProductionOrders());
    if (of.id) await loadDetails(of.id);
  });

  const transicao = (label: string, fn: (id: number) => Promise<unknown>) => {
    const id = selected?.id; if (!id) return;
    void run(async () => { await fn(id); await loadDetails(id); setOrders(await listProductionOrders()); setFeedback({ type: "success", message: `${label} — OF ${id}.` }); });
  };

  const apontar = () => { const id = selected?.id; if (!id) return; void run(async () => {
    if (!app.produced_qty && !app.scrapped_qty) { setFeedback({ type: "error", message: "Informe qtd produzida e/ou refugada." }); return; }
    await appointProduction({ ...app, production_order_id: id });
    await loadDetails(id); setFeedback({ type: "success", message: "Apontamento registrado." });
  }); };

  const consumir = () => { const id = selected?.id; if (!id) return; void run(async () => {
    if (!cons.item_code || !cons.consumed_qty) { setFeedback({ type: "error", message: "Item e quantidade consumida são obrigatórios." }); return; }
    await addConsumption({ ...cons, production_order_id: id });
    await loadDetails(id); setFeedback({ type: "success", message: "Consumo registrado (OUT no estoque)." });
  }); };

  const concluir = () => { const id = selected?.id; if (!id) return; void run(async () => {
    await completeProductionOrder(id, Number(completeWh) || undefined, completeLot || undefined);
    setCompleteLot(""); await loadDetails(id); setOrders(await listProductionOrders());
    setFeedback({ type: "success", message: `OF ${id} concluída (IN do acabado${completeLot ? ` · lote ${completeLot}` : ""}).` });
  }); };

  const explodir = () => { const id = selected?.id; if (!id) return; void run(async () => {
    const ops = await explodeOperations(id); setOperations(ops);
    setFeedback({ type: ops.length ? "success" : "info", message: ops.length ? `${ops.length} operação(ões) explodida(s).` : "Nenhuma operação — item sem roteiro definido." });
  }); };

  const apurarCusto = () => { const id = selected?.id; if (!id) return; void run(async () => {
    setCost(await settleCost(id)); setFeedback({ type: "success", message: "Custo real apurado." });
  }); };

  const retornarSucata = () => { const id = selected?.id; if (!id) return; void run(async () => {
    if (!cons.item_code || !cons.consumed_qty) { setFeedback({ type: "error", message: "Use Item/Qtd do bloco de consumo para a sucata." }); return; }
    await scrapReturn(id, { scrap_item_code: cons.item_code, warehouse_id: cons.warehouse_id || 2, quantity: cons.consumed_qty, unit_value: 0, notes: "Retorno de sucata" });
    setFeedback({ type: "success", message: "Sucata retornada como subproduto (IN valorizado)." });
  }); };

  const incluirMaterial = () => { const id = selected?.id; if (!id) return; void run(async () => {
    if (!matForm.item_code || !matForm.quantity) { setFeedback({ type: "error", message: "Item e quantidade do material são obrigatórios." }); return; }
    await addMaterial({ production_order_id: id, kind: "DEMAND", item_code: Number(matForm.item_code), quantity: matForm.quantity, warehouse_id: matForm.warehouse_id ? Number(matForm.warehouse_id) : undefined, automatic_issue: matForm.automatic_issue });
    setMatForm({ item_code: "", quantity: "", warehouse_id: "", automatic_issue: true });
    setMaterials(await listMaterials(id)); setFeedback({ type: "success", message: "Material incluído na OF." });
  }); };
  const alocarLotes = (m: MaterialDTO) => { const id = selected?.id; if (!id || !m.id) return; void run(async () => {
    await allocateLots(m.id!, "REQUISITION", []); // [] = seleção automática por data/código do lote
    setMaterials(await listMaterials(id)); setFeedback({ type: "success", message: `Lotes alocados automaticamente ao material ${m.id}.` });
  }); };
  const destinarSucata = (m: MaterialDTO) => { const id = selected?.id; if (!id) return; void run(async () => {
    await addScrapDestination({ production_order_id: id, destination_kind: "DEMAND", production_order_material_id: m.id, scrap_item_code: m.item_code, warehouse_id: m.warehouse_id || 2, scrap_quantity: 1, destination_date: new Date().toISOString().slice(0, 10) });
    setFeedback({ type: "success", message: "Destino de sucata registrado." });
  }); };

  const st = selected?.status;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Produção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Ordem de Produção</span><span className="erp-crumb-code">VPRO0900</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Ordens</span>
          <button className="erp-btn" onClick={listar} disabled={busy}>Listar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VPRO0900 — Ordem de Produção" filename="vpro0900" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Ordem de Produção</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* Nova OF */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Nova ordem (OPEN)</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={newOf.item_code || ""} onChange={(e) => setNewOf((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Qtd planejada</label><input className="erp-input num" type="number" value={newOf.planned_qty || ""} onChange={(e) => setNewOf((p) => ({ ...p, planned_qty: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Máquina</label><input className="erp-input num" type="number" value={newOf.machine_id || ""} onChange={(e) => setNewOf((p) => ({ ...p, machine_id: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Centro custo</label><input className="erp-input num" type="number" value={newOf.cost_center_id || ""} onChange={(e) => setNewOf((p) => ({ ...p, cost_center_id: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Prioridade</label><input className="erp-input" value={newOf.priority ?? ""} onChange={(e) => setNewOf((p) => ({ ...p, priority: e.target.value }))} /></div>
          <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>Criar OF</button></div>
        </div></div>

        {/* Lista */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Ordens ({orders.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>OF</th><th>Item</th><th>Planej.</th><th>Produz.</th><th>Refugo</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma ordem. Clique em Listar.</td></tr>}
              {orders.map((o) => (
                <tr key={o.id} className={selected?.id === o.id ? "erp-row-sel" : ""}>
                  <td>{o.id}</td><td>{o.item_code}</td>
                  <td>{o.planned_qty}</td><td>{o.produced_qty}</td><td>{o.scrapped_qty}</td>
                  <td>{statusLabel(o.status)}</td>
                  <td><button className="erp-btn" onClick={() => abrir(o.id)} disabled={busy}>Abrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
        </div>

        {selected && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">OF {selected.id} — {statusLabel(selected.status)} · item {selected.item_code}</div><div className="erp-fieldset-body">
              <div className="erp-tgroup" style={{ flexWrap: "wrap", gap: 8 }}>
                <button className="erp-btn erp-btn-primary" onClick={() => transicao("Iniciada", startProductionOrder)} disabled={busy || st !== "OPEN"}>Iniciar (→ Em produção)</button>
                <button className="erp-btn" onClick={explodir} disabled={busy}>Explodir roteiro</button>
                <button className="erp-btn" onClick={apurarCusto} disabled={busy}>Apurar custo</button>
                <button className="erp-btn" onClick={() => transicao("Encerrada", closeProductionOrder)} disabled={busy || st !== "COMPLETED"}>Encerrar</button>
                <button className="erp-btn erp-btn-danger" onClick={() => transicao("Cancelada", cancelProductionOrder)} disabled={busy || st === "CLOSED" || st === "CANCELLED"}>Cancelar</button>
              </div>
            </div></div>

            {/* Apontamento + Consumo */}
            <div className="erp-fieldset-body" style={{ gap: 0 }}>
              <div className="erp-c6">
                <div className="erp-fieldset"><div className="erp-fieldset-head">Apontamento</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c6"><label className="erp-label erp-req">Qtd produzida</label><input className="erp-input num" type="number" value={app.produced_qty || ""} onChange={(e) => setApp((p) => ({ ...p, produced_qty: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label">Qtd refugada</label><input className="erp-input num" type="number" value={app.scrapped_qty || ""} onChange={(e) => setApp((p) => ({ ...p, scrapped_qty: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label">Backflush depósito</label><input className="erp-input num" type="number" value={app.backflush_warehouse_id || ""} onChange={(e) => setApp((p) => ({ ...p, backflush_warehouse_id: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={apontar} disabled={busy || st !== "IN_PROGRESS"}>Apontar</button></div>
                </div></div>
              </div>
              <div className="erp-c6">
                <div className="erp-fieldset"><div className="erp-fieldset-head">Consumo de insumo</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c6"><label className="erp-label erp-req">Item insumo</label><input className="erp-input num" type="number" value={cons.item_code || ""} onChange={(e) => setCons((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label erp-req">Qtd consumida</label><input className="erp-input num" type="number" value={cons.consumed_qty || ""} onChange={(e) => setCons((p) => ({ ...p, consumed_qty: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label">Depósito</label><input className="erp-input num" type="number" value={cons.warehouse_id || ""} onChange={(e) => setCons((p) => ({ ...p, warehouse_id: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                    <button className="erp-btn erp-btn-primary" onClick={consumir} disabled={busy || st !== "IN_PROGRESS"}>Consumir (OUT)</button>
                    <button className="erp-btn" onClick={retornarSucata} disabled={busy}>Retornar sucata (IN)</button>
                  </div>
                </div></div>
              </div>
            </div>

            {/* Conclusão */}
            <div className="erp-fieldset"><div className="erp-fieldset-head">Conclusão (IN do acabado + lote)</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">Depósito acabado</label><input className="erp-input num" type="number" value={completeWh} onChange={(e) => setCompleteWh(e.target.value)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Lote (rastreabilidade)</label><input className="erp-input" value={completeLot} onChange={(e) => setCompleteLot(e.target.value)} /></div>
              <div className="erp-field erp-c6" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={concluir} disabled={busy || st !== "IN_PROGRESS"}>Concluir (→ Concluída)</button></div>
            </div></div>

            {/* Custo */}
            {cost && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Custo real × padrão</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label">Material real</label><input className="erp-input num" value={money(cost.material_cost_real)} readOnly /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Total real</label><input className="erp-input num" value={money(cost.total_cost_real)} readOnly /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Unit. real</label><input className="erp-input num" value={money(cost.unit_cost_real)} readOnly /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Variância total</label><input className="erp-input num" value={money(cost.total_variance)} readOnly /></div>
                </div></div>
              </>
            )}

            {/* Operações / Apontamentos / Consumos */}
            <div className="erp-fieldset"><div className="erp-fieldset-head">Operações ({operations.length}) · Apontamentos ({appointments.length}) · Consumos ({consumptions.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Seq</th><th>Operação</th><th>Status</th></tr></thead>
                <tbody>
                  {operations.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Sem operações (explodir roteiro).</td></tr>}
                  {operations.map((op) => <tr key={op.id}><td>{op.sequence}</td><td>{op.description || op.operation_code || "—"}</td><td>{op.status || "—"}</td></tr>)}
                </tbody>
              </table>
            </div></div>
            </div>
            <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Consumo</th><th>Item</th><th>Qtd</th><th>Depósito</th></tr></thead>
                <tbody>
                  {consumptions.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Sem consumos.</td></tr>}
                  {consumptions.map((c) => <tr key={c.id}><td>{c.id}</td><td>{c.item_code}</td><td>{c.consumed_qty}</td><td>{c.warehouse_id ?? "—"}</td></tr>)}
                </tbody>
              </table>
            </div></div>
            </div>

            {/* Materiais da OF (MRP): demanda, alocação de lotes, destino de sucata */}
            <div className="erp-fieldset"><div className="erp-fieldset-head">Materiais da OF ({materials.length})</div><div className="erp-fieldset-body">
              
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={matForm.item_code} onChange={(e) => setMatForm((m) => ({ ...m, item_code: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Quantidade</label><input className="erp-input num" type="number" value={matForm.quantity} onChange={(e) => setMatForm((m) => ({ ...m, quantity: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Depósito</label><input className="erp-input num" type="number" value={matForm.warehouse_id} onChange={(e) => setMatForm((m) => ({ ...m, warehouse_id: e.target.value }))} /></div>
                <div className="erp-field erp-c3" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><input type="checkbox" checked={matForm.automatic_issue} onChange={(e) => setMatForm((m) => ({ ...m, automatic_issue: e.target.checked }))} />baixa auto</label>
                  <button className="erp-btn erp-btn-primary" onClick={incluirMaterial} disabled={busy}>Incluir</button>
                </div>
              
            </div></div>
            <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>ID</th><th>Item</th><th>Qtd</th><th>Alocado</th><th>Depósito</th><th style={{ width: 220 }}>Ações</th></tr></thead>
                <tbody>
                  {materials.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Sem materiais.</td></tr>}
                  {materials.map((m) => (
                    <tr key={m.id}>
                      <td>{m.id}</td><td>{m.item_code}</td><td>{String(m.quantity)}</td><td>{m.allocated_qty ?? 0}</td><td>{m.warehouse_id ?? "—"}</td>
                      <td><button className="erp-btn" onClick={() => alocarLotes(m)} disabled={busy}>Alocar lotes</button> <button className="erp-btn" onClick={() => destinarSucata(m)} disabled={busy}>Sucata</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
            </div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Ordens: <strong>{orders.length}</strong></div>{selected && <div className="erp-status-item">OF: <strong>{selected.id}</strong></div>}</div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
