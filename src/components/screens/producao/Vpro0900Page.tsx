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

  const st = selected?.status;

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VPRO0900 — Ordem de Produção</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Ordens</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={listar} disabled={busy}>Listar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VPRO0900 — Ordem de Produção" filename="vpro0900" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* Nova OF */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Nova ordem (OPEN)</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={newOf.item_code || ""} onChange={(e) => setNewOf((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Qtd planejada</label><input className="fsc-input fsc-input-right" type="number" value={newOf.planned_qty || ""} onChange={(e) => setNewOf((p) => ({ ...p, planned_qty: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Máquina</label><input className="fsc-input fsc-input-right" type="number" value={newOf.machine_id || ""} onChange={(e) => setNewOf((p) => ({ ...p, machine_id: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Centro custo</label><input className="fsc-input fsc-input-right" type="number" value={newOf.cost_center_id || ""} onChange={(e) => setNewOf((p) => ({ ...p, cost_center_id: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Prioridade</label><input className="fsc-input" value={newOf.priority ?? ""} onChange={(e) => setNewOf((p) => ({ ...p, priority: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={criar} disabled={busy}>Criar OF</button></div>
        </div></div></div>

        {/* Lista */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Ordens ({orders.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">OF</th><th className="fsc-num">Item</th><th className="fsc-num">Planej.</th><th className="fsc-num">Produz.</th><th className="fsc-num">Refugo</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={7} className="fsc-empty">Nenhuma ordem. Clique em Listar.</td></tr>}
              {orders.map((o) => (
                <tr key={o.id} className={selected?.id === o.id ? "fsc-row-selected" : ""}>
                  <td className="fsc-num">{o.id}</td><td className="fsc-num">{o.item_code}</td>
                  <td className="fsc-num">{o.planned_qty}</td><td className="fsc-num">{o.produced_qty}</td><td className="fsc-num">{o.scrapped_qty}</td>
                  <td>{statusLabel(o.status)}</td>
                  <td><button className="fsc-btn fsc-btn-ghost" onClick={() => abrir(o.id)} disabled={busy}>Abrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {selected && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">OF {selected.id} — {statusLabel(selected.status)} · item {selected.item_code}</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-action-group" style={{ flexWrap: "wrap", gap: 8 }}>
                <button className="fsc-btn fsc-btn-primary" onClick={() => transicao("Iniciada", startProductionOrder)} disabled={busy || st !== "OPEN"}>Iniciar (→ Em produção)</button>
                <button className="fsc-btn fsc-btn-ghost" onClick={explodir} disabled={busy}>Explodir roteiro</button>
                <button className="fsc-btn fsc-btn-ghost" onClick={apurarCusto} disabled={busy}>Apurar custo</button>
                <button className="fsc-btn fsc-btn-ghost" onClick={() => transicao("Encerrada", closeProductionOrder)} disabled={busy || st !== "COMPLETED"}>Encerrar</button>
                <button className="fsc-btn fsc-btn-danger" onClick={() => transicao("Cancelada", cancelProductionOrder)} disabled={busy || st === "CLOSED" || st === "CANCELLED"}>Cancelar</button>
              </div>
            </div></div>

            {/* Apontamento + Consumo */}
            <div className="fsc-grid" style={{ gap: 0 }}>
              <div className="fsc-col-6">
                <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Apontamento</span><div className="fsc-section-banner-line" /></div>
                <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
                  <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Qtd produzida</label><input className="fsc-input fsc-input-right" type="number" value={app.produced_qty || ""} onChange={(e) => setApp((p) => ({ ...p, produced_qty: Number(e.target.value) }))} /></div>
                  <div className="fsc-field fsc-col-6"><label className="fsc-label">Qtd refugada</label><input className="fsc-input fsc-input-right" type="number" value={app.scrapped_qty || ""} onChange={(e) => setApp((p) => ({ ...p, scrapped_qty: Number(e.target.value) }))} /></div>
                  <div className="fsc-field fsc-col-6"><label className="fsc-label">Backflush depósito</label><input className="fsc-input fsc-input-right" type="number" value={app.backflush_warehouse_id || ""} onChange={(e) => setApp((p) => ({ ...p, backflush_warehouse_id: Number(e.target.value) }))} /></div>
                  <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={apontar} disabled={busy || st !== "IN_PROGRESS"}>Apontar</button></div>
                </div></div></div>
              </div>
              <div className="fsc-col-6">
                <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Consumo de insumo</span><div className="fsc-section-banner-line" /></div>
                <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
                  <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Item insumo</label><input className="fsc-input fsc-input-right" type="number" value={cons.item_code || ""} onChange={(e) => setCons((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
                  <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Qtd consumida</label><input className="fsc-input fsc-input-right" type="number" value={cons.consumed_qty || ""} onChange={(e) => setCons((p) => ({ ...p, consumed_qty: Number(e.target.value) }))} /></div>
                  <div className="fsc-field fsc-col-6"><label className="fsc-label">Depósito</label><input className="fsc-input fsc-input-right" type="number" value={cons.warehouse_id || ""} onChange={(e) => setCons((p) => ({ ...p, warehouse_id: Number(e.target.value) }))} /></div>
                  <div className="fsc-field fsc-col-12" style={{ display: "flex", gap: 8 }}>
                    <button className="fsc-btn fsc-btn-primary" onClick={consumir} disabled={busy || st !== "IN_PROGRESS"}>Consumir (OUT)</button>
                    <button className="fsc-btn fsc-btn-ghost" onClick={retornarSucata} disabled={busy}>Retornar sucata (IN)</button>
                  </div>
                </div></div></div>
              </div>
            </div>

            {/* Conclusão */}
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Conclusão (IN do acabado + lote)</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Depósito acabado</label><input className="fsc-input fsc-input-right" type="number" value={completeWh} onChange={(e) => setCompleteWh(e.target.value)} /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Lote (rastreabilidade)</label><input className="fsc-input" value={completeLot} onChange={(e) => setCompleteLot(e.target.value)} /></div>
              <div className="fsc-field fsc-col-6" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={concluir} disabled={busy || st !== "IN_PROGRESS"}>Concluir (→ Concluída)</button></div>
            </div></div></div>

            {/* Custo */}
            {cost && (
              <>
                <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Custo real × padrão</span><div className="fsc-section-banner-line" /></div>
                <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Material real</label><input className="fsc-input fsc-input-right" value={money(cost.material_cost_real)} readOnly /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Total real</label><input className="fsc-input fsc-input-right" value={money(cost.total_cost_real)} readOnly /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Unit. real</label><input className="fsc-input fsc-input-right" value={money(cost.unit_cost_real)} readOnly /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Variância total</label><input className="fsc-input fsc-input-right" value={money(cost.total_variance)} readOnly /></div>
                </div></div></div>
              </>
            )}

            {/* Operações / Apontamentos / Consumos */}
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Operações ({operations.length}) · Apontamentos ({appointments.length}) · Consumos ({consumptions.length})</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th className="fsc-num">Seq</th><th>Operação</th><th>Status</th></tr></thead>
                <tbody>
                  {operations.length === 0 && <tr><td colSpan={3} className="fsc-empty">Sem operações (explodir roteiro).</td></tr>}
                  {operations.map((op) => <tr key={op.id}><td className="fsc-num">{op.sequence}</td><td>{op.description || op.operation_code || "—"}</td><td>{op.status || "—"}</td></tr>)}
                </tbody>
              </table>
            </div></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th className="fsc-num">Consumo</th><th className="fsc-num">Item</th><th className="fsc-num">Qtd</th><th className="fsc-num">Depósito</th></tr></thead>
                <tbody>
                  {consumptions.length === 0 && <tr><td colSpan={4} className="fsc-empty">Sem consumos.</td></tr>}
                  {consumptions.map((c) => <tr key={c.id}><td className="fsc-num">{c.id}</td><td className="fsc-num">{c.item_code}</td><td className="fsc-num">{c.consumed_qty}</td><td className="fsc-num">{c.warehouse_id ?? "—"}</td></tr>)}
                </tbody>
              </table>
            </div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Ordens: <strong>{orders.length}</strong></div>{selected && <div className="fsc-footer-stat">OF: <strong>{selected.id}</strong></div>}</div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
