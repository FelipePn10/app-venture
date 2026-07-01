import { useState, useCallback } from "react";
import {
  type SalesOrderDTO,
  type SalesOrderItemDTO,
  listSalesOrders,
  listSalesOrdersByCustomer,
  listSalesOrdersByStatus,
  getSalesOrder,
  createSalesOrder,
  cancelSalesOrder,
  blockSalesOrder,
  unblockSalesOrder,
  changeSalesOrderStatus,
  createSalesOrderItem,
  cancelSalesOrderItem,
} from "@/services/salesOrderService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_LABEL: Record<string, string> = {
  R: "Rascunho", P: "Confirmado", F: "Faturado", CANCELLED: "Cancelado",
};
const statusLabel = (s?: string) => (s ? STATUS_LABEL[s] ?? s : "—");

const EMPTY_ORDER: SalesOrderDTO = {
  enterprise_code: 1, customer_code: 0, currency_code: "BRL", payment_term_code: 0,
  emission_date: today(), delivery_date: today(), commission_pct: 0, additional_days: 0,
};
const EMPTY_ITEM: SalesOrderItemDTO = {
  item_code: 0, requested_qty: 1, unit_price: 0, warehouse_code: 0, sales_uom: "UN", discount_pct: 0,
};

export function Vvnd0200Page(): JSX.Element {
  const [orders, setOrders] = useState<SalesOrderDTO[]>([]);
  const [selected, setSelected] = useState<SalesOrderDTO | null>(null);
  const [newOrder, setNewOrder] = useState<SalesOrderDTO>(EMPTY_ORDER);
  const [newItem, setNewItem] = useState<SalesOrderItemDTO>(EMPTY_ITEM);
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const setO = useCallback(<K extends keyof SalesOrderDTO>(k: K, v: SalesOrderDTO[K]) => setNewOrder((p) => ({ ...p, [k]: v })), []);
  const setI = useCallback(<K extends keyof SalesOrderItemDTO>(k: K, v: SalesOrderItemDTO[K]) => setNewItem((p) => ({ ...p, [k]: v })), []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const refreshSelected = useCallback(async (code: number) => { setSelected(await getSalesOrder(code)); }, []);

  const listarTodos = () => run(async () => { setOrders(await listSalesOrders()); });
  const listarPorCliente = () => run(async () => {
    const c = Number(filterCustomer);
    if (!c) { setFeedback({ type: "error", message: "Informe o código do cliente." }); return; }
    setOrders(await listSalesOrdersByCustomer(c));
  });
  const listarPorStatus = () => run(async () => {
    if (!filterStatus) { setFeedback({ type: "error", message: "Selecione um status." }); return; }
    setOrders(await listSalesOrdersByStatus(filterStatus));
  });

  const abrir = (code?: number) => { if (code) void run(async () => { await refreshSelected(code); }); };

  const criarPedido = () => run(async () => {
    if (!newOrder.customer_code) { setFeedback({ type: "error", message: "Cliente é obrigatório." }); return; }
    if (!newOrder.enterprise_code) { setFeedback({ type: "error", message: "Empresa é obrigatória." }); return; }
    const created = await createSalesOrder(newOrder);
    setFeedback({ type: "success", message: `Pedido ${created.code} criado (rascunho).` });
    setNewOrder(EMPTY_ORDER);
    if (created.code) await refreshSelected(created.code);
    setOrders(await listSalesOrders());
  });

  const confirmar = (code?: number) => { if (code) void run(async () => {
    await changeSalesOrderStatus(code, "P");
    await refreshSelected(code);
    setFeedback({ type: "info", message: "Status alterado para P. O backend roda crédito/reserva/demanda — verifique se o pedido ficou bloqueado." });
  }); };
  const cancelar = (code?: number) => { if (code) void run(async () => {
    await cancelSalesOrder(code); await refreshSelected(code);
    setFeedback({ type: "success", message: `Pedido ${code} cancelado.` });
  }); };
  const bloquear = (code?: number) => { if (code) void run(async () => {
    await blockSalesOrder(code); await refreshSelected(code);
    setFeedback({ type: "success", message: `Pedido ${code} bloqueado.` });
  }); };
  const desbloquear = (code?: number) => { if (code) void run(async () => {
    await unblockSalesOrder(code); await refreshSelected(code);
    setFeedback({ type: "success", message: `Pedido ${code} desbloqueado.` });
  }); };

  const adicionarItem = () => { const code = selected?.code; if (!code) return; void run(async () => {
    if (!newItem.item_code) { setFeedback({ type: "error", message: "Item é obrigatório." }); return; }
    await createSalesOrderItem({ ...newItem, sales_order_code: code });
    setNewItem(EMPTY_ITEM);
    await refreshSelected(code);
    setFeedback({ type: "success", message: "Item adicionado." });
  }); };
  const cancelarItem = (itemCode?: number) => { const code = selected?.code; if (!code || !itemCode) return; void run(async () => {
    await cancelSalesOrderItem(itemCode); await refreshSelected(code);
    setFeedback({ type: "success", message: `Item ${itemCode} cancelado.` });
  }); };

  const items = selected?.items ?? [];

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VVND0200 — Pedido de Venda</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Pedidos</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={listarTodos} disabled={busy}>Listar todos</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Cliente</span>
          <input className="fsc-input fsc-input-right" style={{ width: 90, height: 32 }} type="number" value={filterCustomer} placeholder="cód." onChange={(e) => setFilterCustomer(e.target.value)} />
          <button className="fsc-btn fsc-btn-ghost" onClick={listarPorCliente} disabled={busy}>Filtrar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Status</span>
          <select className="fsc-input" style={{ width: 130, height: 32 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">—</option><option value="R">Rascunho</option><option value="P">Confirmado</option><option value="F">Faturado</option><option value="CANCELLED">Cancelado</option>
          </select>
          <button className="fsc-btn fsc-btn-ghost" onClick={listarPorStatus} disabled={busy}>Filtrar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VVND0200 — Pedido de Venda" filename="vvnd0200" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* ── Novo pedido ───────────────────────────────────────────────── */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Novo pedido (rascunho)</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Empresa</label><input className="fsc-input fsc-input-right" type="number" value={newOrder.enterprise_code || ""} onChange={(e) => setO("enterprise_code", Number(e.target.value))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Cliente</label><input className="fsc-input fsc-input-right" type="number" value={newOrder.customer_code || ""} onChange={(e) => setO("customer_code", Number(e.target.value))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Moeda</label><input className="fsc-input" value={newOrder.currency_code ?? ""} onChange={(e) => setO("currency_code", e.target.value)} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Cond. pagto</label><input className="fsc-input fsc-input-right" type="number" value={newOrder.payment_term_code || ""} onChange={(e) => setO("payment_term_code", Number(e.target.value))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Comissão %</label><input className="fsc-input fsc-input-right" type="number" value={newOrder.commission_pct || ""} onChange={(e) => setO("commission_pct", Number(e.target.value))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Dias adic.</label><input className="fsc-input fsc-input-right" type="number" value={newOrder.additional_days || ""} onChange={(e) => setO("additional_days", Number(e.target.value))} /></div>
          <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={criarPedido} disabled={busy}>Criar pedido</button></div>
        </div></div></div>

        {/* ── Lista de pedidos ──────────────────────────────────────────── */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Pedidos ({orders.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Código</th><th className="fsc-num">Cliente</th><th>Status</th><th>Bloqueado</th><th className="fsc-num">Total líq.</th><th>Emissão</th><th>Entrega</th><th></th></tr></thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={8} className="fsc-empty">Nenhum pedido carregado. Use os filtros acima.</td></tr>}
              {orders.map((o) => (
                <tr key={o.code} className={selected?.code === o.code ? "fsc-row-selected" : ""}>
                  <td className="fsc-num">{o.code}</td>
                  <td className="fsc-num">{o.customer_code}</td>
                  <td>{statusLabel(o.status)}</td>
                  <td>{o.is_blocked ? "🔒 Sim" : "Não"}</td>
                  <td className="fsc-num">{(o.total_net ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td>{o.emission_date?.slice(0, 10) ?? "—"}</td>
                  <td>{o.delivery_date?.slice(0, 10) ?? "—"}</td>
                  <td><button className="fsc-btn fsc-btn-ghost" onClick={() => abrir(o.code)} disabled={busy}>Abrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {/* ── Pedido selecionado ────────────────────────────────────────── */}
        {selected && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Pedido {selected.code} — {statusLabel(selected.status)}{selected.is_blocked ? " · 🔒 BLOQUEADO" : ""}</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Cliente</label><input className="fsc-input fsc-input-right" value={selected.customer_code ?? ""} readOnly /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Empresa</label><input className="fsc-input fsc-input-right" value={selected.enterprise_code ?? ""} readOnly /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Cond. pagto</label><input className="fsc-input fsc-input-right" value={selected.payment_term_code ?? ""} readOnly /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Total c/ IPI+ST</label><input className="fsc-input fsc-input-right" value={(selected.total_with_ipi_with_st ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} readOnly /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Total líquido</label><input className="fsc-input fsc-input-right" value={(selected.total_net ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} readOnly /></div>
              </div>
              <div className="fsc-action-group" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
                <button className="fsc-btn fsc-btn-primary" onClick={() => confirmar(selected.code)} disabled={busy || selected.status !== "R"}>Confirmar (→P)</button>
                {selected.is_blocked
                  ? <button className="fsc-btn fsc-btn-ghost" onClick={() => desbloquear(selected.code)} disabled={busy}>Desbloquear</button>
                  : <button className="fsc-btn fsc-btn-ghost" onClick={() => bloquear(selected.code)} disabled={busy}>Bloquear</button>}
                <button className="fsc-btn fsc-btn-danger" onClick={() => cancelar(selected.code)} disabled={busy || selected.status === "CANCELLED"}>Cancelar pedido</button>
              </div>
            </div></div>

            {/* Itens */}
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Itens ({items.length})</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
              <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={newItem.item_code || ""} onChange={(e) => setI("item_code", Number(e.target.value))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Depósito</label><input className="fsc-input fsc-input-right" type="number" value={newItem.warehouse_code || ""} onChange={(e) => setI("warehouse_code", Number(e.target.value))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Qtd</label><input className="fsc-input fsc-input-right" type="number" value={newItem.requested_qty || ""} onChange={(e) => setI("requested_qty", Number(e.target.value))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Preço unit.</label><input className="fsc-input fsc-input-right" type="number" value={newItem.unit_price || ""} onChange={(e) => setI("unit_price", Number(e.target.value))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Desc. %</label><input className="fsc-input fsc-input-right" type="number" value={newItem.discount_pct || ""} onChange={(e) => setI("discount_pct", Number(e.target.value))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">UM</label><input className="fsc-input" value={newItem.sales_uom ?? ""} onChange={(e) => setI("sales_uom", e.target.value)} /></div>
              <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={adicionarItem} disabled={busy || selected.status !== "R"}>Adicionar item</button></div>
            </div></div></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th className="fsc-num">Seq</th><th className="fsc-num">Cód.</th><th className="fsc-num">Item</th><th className="fsc-num">Qtd</th><th className="fsc-num">Preço</th><th className="fsc-num">Total líq.</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {items.length === 0 && <tr><td colSpan={8} className="fsc-empty">Sem itens.</td></tr>}
                  {items.map((it) => (
                    <tr key={it.code}>
                      <td className="fsc-num">{it.sequence}</td>
                      <td className="fsc-num">{it.code}</td>
                      <td className="fsc-num">{it.item_code}</td>
                      <td className="fsc-num">{it.requested_qty}</td>
                      <td className="fsc-num">{(it.unit_price ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="fsc-num">{(it.total_net ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td>{it.status ?? "—"}</td>
                      <td><button className="fsc-btn fsc-btn-ghost" onClick={() => cancelarItem(it.code)} disabled={busy || selected.status !== "R"}>Cancelar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Pedidos: <strong>{orders.length}</strong></div>{selected && <div className="fsc-footer-stat">Selecionado: <strong>{selected.code}</strong></div>}</div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
