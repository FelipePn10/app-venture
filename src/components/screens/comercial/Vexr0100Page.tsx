import { useRef, useState } from "react";
import { type RescheduleDTO, type DeliveryReschedulePlanningItemDTO, createDeliveryRescheduleBatch, listReschedulesByOrder, previewDeliveryReschedule } from "@/services/deliveryRescheduleService";
import { getSalesOrder, type SalesOrderDTO } from "@/services/salesOrderService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadSalesOrders, loadItems } from "@/services/lookups";
import { EntityName } from "@/components/ui/EntityName";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
type OrderItemPlan = { item: DeliveryReschedulePlanningItemDTO; selected: boolean; newDate: string; reason: string };
const dateOnly = (value?: string) => value?.slice(0, 10) ?? "";
const idempotencyKey = () => globalThis.crypto?.randomUUID?.() ?? `vexr-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function Vexr0100Page(): JSX.Element {
  const [order, setOrder] = useState<number | undefined>(undefined);
  const [list, setList] = useState<RescheduleDTO[]>([]);
  const [orderDetail, setOrderDetail] = useState<SalesOrderDTO | null>(null);
  const [itemPlans, setItemPlans] = useState<OrderItemPlan[]>([]);
  const [bulkDate, setBulkDate] = useState(today());
  const [bulkReason, setBulkReason] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const pendingBatch = useRef<{ signature: string; key: string } | null>(null);

  async function carregarPedido(code?: number) {
    if (!code) { setOrder(undefined); setOrderDetail(null); setItemPlans([]); return; }
    setOrder(code);
    setBusy(true); setFeedback(null);
    try {
      const [detail, history, items] = await Promise.all([getSalesOrder(code), listReschedulesByOrder(code), previewDeliveryReschedule(code)]);
      setOrderDetail(detail); setList(history);
      setItemPlans(items.map((item) => ({
        item,
        selected: false,
        newDate: dateOnly(item.suggested_date),
        reason: item.justification,
      })));
      if (items.length === 0) setFeedback({ type: "info", message: "O pedido não possui itens disponíveis para reprogramação." });
    }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function consultar() { await carregarPedido(order); }

  function aplicarEmSelecionados() {
    setItemPlans((current) => current.map((plan) => plan.selected ? { ...plan, newDate: bulkDate, reason: bulkReason } : plan));
  }

  async function registrarSelecionados() {
    const selected = itemPlans.filter((plan) => plan.selected);
    if (!orderDetail?.code || selected.length === 0) { setFeedback({ type: "error", message: "Selecione ao menos um item do pedido." }); return; }
    const invalid = selected.find((plan) => !plan.item.current_date || !plan.newDate || plan.newDate <= dateOnly(plan.item.current_date));
    if (invalid) { setFeedback({ type: "error", message: `A nova data do item ${invalid.item.item_code} deve ser posterior à data atual.` }); return; }
    setBusy(true); setFeedback(null);
    try {
      const items = selected.map((plan) => ({ sales_order_item_code: plan.item.sales_order_item_code, item_code: plan.item.item_code, old_date: dateOnly(plan.item.current_date), new_date: plan.newDate, reason: plan.reason.trim() || undefined }));
      const signature = JSON.stringify({ sales_order_code: orderDetail.code, items });
      if (pendingBatch.current?.signature !== signature) pendingBatch.current = { signature, key: idempotencyKey() };
      const result = await createDeliveryRescheduleBatch({
        sales_order_code: orderDetail.code,
        idempotency_key: pendingBatch.current.key,
        items,
      });
      pendingBatch.current = null;
      setFeedback({ type: "success", message: result.replayed ? "Esta reprogramação já havia sido processada e foi confirmada sem duplicação." : `${result.codes.length} item(ns) reprogramado(s) em uma única operação.` });
      await carregarPedido(orderDetail.code);
    } catch (error) { setFeedback({ type: "error", message: errMessage(error) }); }
    finally { setBusy(false); }
  }
  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Reprogramação de Entrega</span>
          <span className="erp-crumb-code">VEXR0100</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Data original × nova × motivo, por pedido</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Pedido</span>
          <div style={{ width: 240 }}><LookupField value={order} loader={loadSalesOrders} entityLabel="pedido" placeholder="Selecionar pedido" onChange={(code) => void carregarPedido(typeof code === "number" ? code : Number(code) || undefined)} /></div>
          <button className="erp-btn erp-btn-dark" onClick={() => void consultar()} disabled={busy}>{busy && <span className="erp-spin" />}Consultar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VEXR0100 — Reprogramação de Entrega" filename="vexr0100" build={() => ({
          columns: ["Item", "Solicitado", "Saldo", "Data atual", "Nova data", "Sugestão", "Planejamento"],
          rows: itemPlans.map((plan) => [String(plan.item.item_code), String(plan.item.requested_qty), String(plan.item.open_qty), dateOnly(plan.item.current_date) || "Não definida", plan.newDate, plan.item.suggestion_source || "—", plan.item.justification || "—"]),
          subtitle: order ? `Pedido #${order}` : "Reprogramações",
        })} /></div>
      </div>

      <div className="erp-content">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

      <div className="erp-main">
        <aside className="erp-list-panel">
          <div className="erp-panel-head">
            <span className="erp-panel-title">Histórico {order ? `· pedido #${order}` : ""}</span>
            <span className="erp-count">{list.length}</span>
          </div>
          <div className="erp-list">
            {list.length === 0 && <div className="erp-list-empty">Selecione um pedido e clique em <strong>Consultar</strong> para ver as reprogramações.</div>}
            {list.map((r, i) => (
              <div key={i} className="erp-list-row" style={{ cursor: "default" }}>
                <span className="erp-list-code">Item {r.item_code}</span>
                <span className="erp-list-sub">{r.reason || "—"}</span>
                <div className="erp-list-meta">
                  <span className="erp-badge draft">{r.old_date?.slice(0, 10)}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--v-text-muted)" }}><path d="M2 7h9M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="erp-badge ok">{r.new_date?.slice(0, 10)}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="erp-detail-panel">
          <div className="erp-tabs"><span className="erp-tab active">Prévia integrada do pedido ({itemPlans.length})</span></div>
          <div className="erp-detail-body">
                {!orderDetail ? <div className="erp-detail-empty"><div className="erp-detail-empty-title">Selecione um pedido</div><div className="erp-detail-empty-sub">Os itens, saldos e datas de entrega serão carregados automaticamente.</div></div> : <>
                  <div className="erp-fieldset"><div className="erp-fieldset-head">Aplicar aos itens selecionados</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label">Nova data</label><input className="erp-input" type="date" value={bulkDate} onChange={(event) => setBulkDate(event.target.value)} /></div>
                    <div className="erp-field erp-c7"><label className="erp-label">Motivo comum</label><input className="erp-input" value={bulkReason} onChange={(event) => setBulkReason(event.target.value)} placeholder="Ex.: ajuste de capacidade confirmado pelo planejamento" /></div>
                    <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={aplicarEmSelecionados} disabled={busy}>Aplicar</button></div>
                  </div></div>
                  <div className="erp-grid-wrap"><table className="erp-grid"><thead><tr><th style={{ width: 42 }}><input type="checkbox" aria-label="Selecionar todos os itens permitidos" checked={itemPlans.some((plan) => plan.item.can_reschedule) && itemPlans.filter((plan) => plan.item.can_reschedule).every((plan) => plan.selected)} onChange={(event) => setItemPlans((current) => current.map((plan) => plan.item.can_reschedule ? { ...plan, selected: event.target.checked } : plan))} /></th><th>Item</th><th className="num">Solicitado</th><th className="num">Saldo</th><th>Data atual</th><th>Nova data</th><th>Planejamento e motivo</th></tr></thead><tbody>
                    {itemPlans.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum item encontrado na prévia de planejamento.</td></tr>}
                    {itemPlans.map((plan, index) => <tr key={plan.item.sales_order_item_code}><td><input type="checkbox" checked={plan.selected} disabled={!plan.item.can_reschedule} title={plan.item.can_reschedule ? "Selecionar linha" : plan.item.justification} onChange={(event) => setItemPlans((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, selected: event.target.checked } : row))} /></td><td><EntityName code={plan.item.item_code} loader={loadItems} prefix="Item" /><div className="erp-field-hint">Linha {plan.item.sequence} · {plan.item.can_reschedule ? "Pode reprogramar" : "Bloqueado"}</div></td><td className="num">{plan.item.requested_qty.toLocaleString("pt-BR")}</td><td className="num">{plan.item.open_qty.toLocaleString("pt-BR")}</td><td>{dateOnly(plan.item.current_date) || "Não definida"}</td><td><input className="erp-input" type="date" value={plan.newDate} min={dateOnly(plan.item.current_date)} disabled={!plan.selected || !plan.item.can_reschedule} onChange={(event) => setItemPlans((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, newDate: event.target.value } : row))} /><div className="erp-field-hint">{plan.item.suggestion_source ? `Sugestão: ${plan.item.suggestion_source}` : "Sem sugestão automática"}</div></td><td><textarea className="erp-input" rows={2} value={plan.reason} disabled={!plan.selected} onChange={(event) => setItemPlans((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, reason: event.target.value } : row))} placeholder="Motivo opcional" /><div className="erp-field-hint">{plan.item.justification}</div><div className="erp-field-hint">Reserva {plan.item.reserved_qty.toLocaleString("pt-BR")} · Demanda {plan.item.independent_demand_qty.toLocaleString("pt-BR")} · OF {plan.item.planned_order_count + plan.item.firm_order_count} · OC {plan.item.purchase_order_count} · Expedição {plan.item.shipment_count} · Faturado {plan.item.invoiced_qty.toLocaleString("pt-BR")}{plan.item.crp_overloaded ? " · CRP sobrecarregado" : ""}{plan.item.aps_date ? ` · APS ${dateOnly(plan.item.aps_date)}` : ""}</div></td></tr>)}
                  </tbody></table></div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}><button className="erp-btn erp-btn-primary" onClick={() => void registrarSelecionados()} disabled={busy || !itemPlans.some((plan) => plan.selected)}>{busy && <span className="erp-spin" />}Reprogramar itens selecionados</button></div>
                  <div className="erp-note" style={{ marginTop: 12 }}>A prévia consolida saldo, reservas, demanda, MRP, CRP, APS, compras, expedição e faturamento. Somente as linhas marcadas serão enviadas; o lote é processado por inteiro ou desfeito por inteiro se alguma linha falhar.</div>
                </>}
          </div>
        </section>
      </div>

      </div>
      <footer className="erp-statusbar">
        <div className="erp-status-item">Reprogramações: <strong>{list.length}</strong></div>
        {order ? <div className="erp-status-item">Pedido: <strong>#{order}</strong></div> : null}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
