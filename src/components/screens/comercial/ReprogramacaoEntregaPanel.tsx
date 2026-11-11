import { useCallback, useEffect, useRef, useState } from "react";
import { type RescheduleDTO, type DeliveryReschedulePlanningItemDTO, createDeliveryRescheduleBatch, listReschedulesByOrder, previewDeliveryReschedule } from "@/services/deliveryRescheduleService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { loadItems } from "@/services/lookups";
import { EntityName } from "@/components/ui/EntityName";
import { hojeLocal } from "@/utils/dataLocal";

/*
 * Reprogramação de entrega do pedido aberto (aba Entrega da VVND0200).
 *
 * Era a VEXR0100, uma tela separada em que o vendedor saía do pedido e digitava
 * o número dele de novo para mexer na data. Agora é uma ação do pedido: a
 * prévia integrada (saldo, reservas, MRP, CRP, APS, compras, expedição e
 * faturamento), a reprogramação em lote e o histórico de remarcações.
 * A reprogramação de vários pedidos de uma vez continua na VDPR0100.
 */

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type OrderItemPlan = { item: DeliveryReschedulePlanningItemDTO; selected: boolean; newDate: string; reason: string };
const dateOnly = (value?: string) => value?.slice(0, 10) ?? "";
const idempotencyKey = () => globalThis.crypto?.randomUUID?.() ?? `vexr-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function ReprogramacaoEntregaPanel({ orderCode, aoReprogramar }: { orderCode: number; aoReprogramar?: () => void }): JSX.Element {
  const [list, setList] = useState<RescheduleDTO[]>([]);
  const [itemPlans, setItemPlans] = useState<OrderItemPlan[]>([]);
  const [bulkDate, setBulkDate] = useState(hojeLocal());
  const [bulkReason, setBulkReason] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const pendingBatch = useRef<{ signature: string; key: string } | null>(null);

  const carregar = useCallback(async () => {
    setBusy(true); setFeedback(null);
    try {
      const [history, items] = await Promise.all([listReschedulesByOrder(orderCode), previewDeliveryReschedule(orderCode)]);
      setList(history);
      setItemPlans(items.map((item) => ({ item, selected: false, newDate: dateOnly(item.suggested_date), reason: item.justification })));
      if (items.length === 0) setFeedback({ type: "info", message: "O pedido não possui itens disponíveis para reprogramação." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, [orderCode]);
  useEffect(() => { void carregar(); }, [carregar]);

  function aplicarEmSelecionados() {
    setItemPlans((current) => current.map((plan) => plan.selected ? { ...plan, newDate: bulkDate, reason: bulkReason } : plan));
  }

  async function registrarSelecionados() {
    const selected = itemPlans.filter((plan) => plan.selected);
    if (selected.length === 0) { setFeedback({ type: "error", message: "Selecione ao menos um item do pedido." }); return; }
    const invalid = selected.find((plan) => !plan.item.current_date || !plan.newDate || plan.newDate <= dateOnly(plan.item.current_date));
    if (invalid) { setFeedback({ type: "error", message: `A nova data do item ${invalid.item.item_code} deve ser posterior à data atual.` }); return; }
    setBusy(true); setFeedback(null);
    try {
      const items = selected.map((plan) => ({ sales_order_item_code: plan.item.sales_order_item_code, item_code: plan.item.item_code, old_date: dateOnly(plan.item.current_date), new_date: plan.newDate, reason: plan.reason.trim() || undefined }));
      const signature = JSON.stringify({ sales_order_code: orderCode, items });
      if (pendingBatch.current?.signature !== signature) pendingBatch.current = { signature, key: idempotencyKey() };
      const result = await createDeliveryRescheduleBatch({ sales_order_code: orderCode, idempotency_key: pendingBatch.current.key, items });
      pendingBatch.current = null;
      setFeedback({ type: "success", message: result.replayed ? "Esta reprogramação já havia sido processada e foi confirmada sem duplicação." : `${result.codes.length} item(ns) reprogramado(s) em uma única operação.` });
      setBusy(false);
      await carregar();
      aoReprogramar?.();
    } catch (error) { setFeedback({ type: "error", message: errMessage(error) }); setBusy(false); }
  }

  const todosPermitidos = itemPlans.filter((plan) => plan.item.can_reschedule);
  return (
    <>
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">
          Reprogramar a entrega
          <span style={{ marginLeft: "auto" }}><ExportButton title={`Reprogramação de entrega — pedido #${orderCode}`} filename={`reprogramacao-${orderCode}`} build={() => ({
            columns: ["Item", "Solicitado", "Saldo", "Data atual", "Nova data", "Sugestão", "Planejamento"],
            rows: itemPlans.map((plan) => [String(plan.item.item_code), String(plan.item.requested_qty), String(plan.item.open_qty), dateOnly(plan.item.current_date) || "Não definida", plan.newDate, plan.item.suggestion_source || "—", plan.item.justification || "—"]),
            subtitle: `Pedido #${orderCode}`,
          })} /></span>
        </div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c3"><label className="erp-label">Nova data</label><input className="erp-input" type="date" value={bulkDate} onChange={(event) => setBulkDate(event.target.value)} /></div>
          <div className="erp-field erp-c7"><label className="erp-label">Motivo comum</label><input className="erp-input" value={bulkReason} onChange={(event) => setBulkReason(event.target.value)} placeholder="Ex.: ajuste de capacidade confirmado pelo planejamento" /></div>
          <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={aplicarEmSelecionados} disabled={busy}>Aplicar aos marcados</button></div>
          <div className="erp-field erp-c12"><div className="erp-grid-wrap"><table className="erp-grid"><thead><tr>
            <th style={{ width: 42 }}><input type="checkbox" aria-label="Selecionar todos os itens permitidos" checked={todosPermitidos.length > 0 && todosPermitidos.every((plan) => plan.selected)} onChange={(event) => setItemPlans((current) => current.map((plan) => plan.item.can_reschedule ? { ...plan, selected: event.target.checked } : plan))} /></th>
            <th>Item</th><th className="num">Solicitado</th><th className="num">Saldo</th><th>Data atual</th><th>Nova data</th><th>Planejamento e motivo</th>
          </tr></thead><tbody>
            {itemPlans.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">{busy ? "Carregando a prévia do pedido…" : "Nenhum item encontrado na prévia de planejamento."}</td></tr>}
            {itemPlans.map((plan, index) => (
              <tr key={plan.item.sales_order_item_code}>
                <td><input type="checkbox" checked={plan.selected} disabled={!plan.item.can_reschedule} title={plan.item.can_reschedule ? "Selecionar linha" : plan.item.justification} onChange={(event) => setItemPlans((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, selected: event.target.checked } : row))} /></td>
                <td><EntityName code={plan.item.item_code} loader={loadItems} prefix="Item" /><div className="erp-field-hint">Linha {plan.item.sequence} · {plan.item.can_reschedule ? "Pode reprogramar" : "Bloqueado"}</div></td>
                <td className="num">{plan.item.requested_qty.toLocaleString("pt-BR")}</td>
                <td className="num">{plan.item.open_qty.toLocaleString("pt-BR")}</td>
                <td>{dateOnly(plan.item.current_date) || "Não definida"}</td>
                <td><input className="erp-input" type="date" value={plan.newDate} min={dateOnly(plan.item.current_date)} disabled={!plan.selected || !plan.item.can_reschedule} onChange={(event) => setItemPlans((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, newDate: event.target.value } : row))} /><div className="erp-field-hint">{plan.item.suggestion_source ? `Sugestão: ${plan.item.suggestion_source}` : "Sem sugestão automática"}</div></td>
                <td><textarea className="erp-input" rows={2} value={plan.reason} disabled={!plan.selected} onChange={(event) => setItemPlans((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, reason: event.target.value } : row))} placeholder="Motivo opcional" /><div className="erp-field-hint">{plan.item.justification}</div><div className="erp-field-hint">Reserva {plan.item.reserved_qty.toLocaleString("pt-BR")} · Demanda {plan.item.independent_demand_qty.toLocaleString("pt-BR")} · OF {plan.item.planned_order_count + plan.item.firm_order_count} · OC {plan.item.purchase_order_count} · Expedição {plan.item.shipment_count} · Faturado {plan.item.invoiced_qty.toLocaleString("pt-BR")}{plan.item.crp_overloaded ? " · CRP sobrecarregado" : ""}{plan.item.aps_date ? ` · APS ${dateOnly(plan.item.aps_date)}` : ""}</div></td>
              </tr>
            ))}
          </tbody></table></div></div>
          <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void registrarSelecionados()} disabled={busy || !itemPlans.some((plan) => plan.selected)}>{busy && <span className="erp-spin" />}Reprogramar itens marcados</button></div>
          <div className="erp-field erp-c12"><span className="erp-field-hint">Só as linhas marcadas são enviadas; o lote é gravado por inteiro ou desfeito por inteiro se alguma linha falhar. Para vários pedidos de uma vez, use a VDPR0100.</span></div>
        </div>
      </div>

      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Histórico de reprogramações <span className="erp-count">{list.length}</span></div>
        <div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Item</th><th>Data anterior</th><th>Nova data</th><th>Motivo</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">A entrega deste pedido nunca foi reprogramada.</td></tr>}
              {list.map((r, i) => <tr key={r.code ?? i}><td>{r.item_code}</td><td>{dateOnly(r.old_date)}</td><td>{dateOnly(r.new_date)}</td><td>{r.reason || "—"}</td></tr>)}
            </tbody>
          </table>
        </div></div>
      </div>
    </>
  );
}
