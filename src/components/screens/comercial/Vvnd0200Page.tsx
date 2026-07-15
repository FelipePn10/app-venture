import { useState, useCallback, useMemo } from "react";
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
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers, loadEstablishments, loadItems, loadWarehouses } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type DetailTab = "dados" | "itens";
const today = () => new Date().toISOString().slice(0, 10);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Status da capa → rótulo + classe de badge. */
const STATUS_META: Record<string, { label: string; cls: string }> = {
  R: { label: "Rascunho", cls: "draft" },
  P: { label: "Confirmado", cls: "info" },
  F: { label: "Faturado", cls: "ok" },
  CANCELLED: { label: "Cancelado", cls: "err" },
};
const statusMeta = (s?: string) => (s && STATUS_META[s]) || { label: s ?? "—", cls: "draft" };

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
  const [listSearch, setListSearch] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<DetailTab>("dados");
  /** modo criação (form em branco) vs. visualização de um pedido existente */
  const [creating, setCreating] = useState(true);

  const setO = useCallback(<K extends keyof SalesOrderDTO>(k: K, v: SalesOrderDTO[K]) => setNewOrder((p) => ({ ...p, [k]: v })), []);
  const setI = useCallback(<K extends keyof SalesOrderItemDTO>(k: K, v: SalesOrderItemDTO[K]) => setNewItem((p) => ({ ...p, [k]: v })), []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const refreshSelected = useCallback(async (code: number) => { setSelected(await getSalesOrder(code)); }, []);

  const listarTodos = () => run(async () => { setOrders(await listSalesOrders()); });
  const aplicarFiltro = () => run(async () => {
    if (filterCustomer) { setOrders(await listSalesOrdersByCustomer(Number(filterCustomer))); return; }
    if (filterStatus) { setOrders(await listSalesOrdersByStatus(filterStatus)); return; }
    setOrders(await listSalesOrders());
  });

  const novoPedido = () => { setCreating(true); setSelected(null); setNewOrder(EMPTY_ORDER); setTab("dados"); setFeedback(null); };
  const abrir = (code?: number) => { if (!code) return; setCreating(false); setTab("dados"); void run(async () => { await refreshSelected(code); }); };

  const criarPedido = () => run(async () => {
    if (!newOrder.customer_code) { setFeedback({ type: "error", message: "Cliente é obrigatório." }); return; }
    if (!newOrder.enterprise_code) { setFeedback({ type: "error", message: "Estabelecimento é obrigatório." }); return; }
    const created = await createSalesOrder(newOrder);
    setNewOrder(EMPTY_ORDER);
    setOrders(await listSalesOrders());
    if (created.code) { setCreating(false); await refreshSelected(created.code); }
    setFeedback({ type: "success", message: `Pedido ${created.code} criado como rascunho.` });
  });

  const confirmar = (code?: number) => { if (code) void run(async () => {
    await changeSalesOrderStatus(code, "P"); await refreshSelected(code);
    setFeedback({ type: "info", message: "Confirmado (→P). O backend rodou crédito/reserva/demanda — verifique se o pedido ficou bloqueado." });
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
    if (!newItem.item_code) { setFeedback({ type: "error", message: "Informe o código do item." }); return; }
    await createSalesOrderItem({ ...newItem, sales_order_code: code });
    setNewItem(EMPTY_ITEM); await refreshSelected(code);
    setFeedback({ type: "success", message: "Item adicionado ao pedido." });
  }); };
  const cancelarItem = (itemCode?: number) => { const code = selected?.code; if (!code || !itemCode) return; void run(async () => {
    await cancelSalesOrderItem(itemCode); await refreshSelected(code);
    setFeedback({ type: "success", message: `Item ${itemCode} cancelado.` });
  }); };

  const items = useMemo(() => selected?.items ?? [], [selected?.items]);
  const itemsTotal = useMemo(() => items.reduce((s, it) => s + (it.total_net ?? 0), 0), [items]);
  const isDraft = selected?.status === "R";

  const visibleOrders = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => String(o.code ?? "").includes(q) || String(o.customer_code ?? "").includes(q));
  }, [orders, listSearch]);

  const sm = statusMeta(selected?.status);

  return (
    <div className="erp-screen">
      {/* ── TITLE BAR ─────────────────────────────────────────────────── */}
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Pedido de Venda</span>
          <span className="erp-crumb-code">VVND0200</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Fluxo: Rascunho → Confirmado → Faturado</span>
      </header>

      {/* ── TOOLBAR ───────────────────────────────────────────────────── */}
      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className="erp-btn erp-btn-primary" onClick={novoPedido} disabled={busy}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Novo pedido
          </button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Pedido</span>
          <button className="erp-btn erp-btn-dark" onClick={() => confirmar(selected?.code)} disabled={busy || !isDraft}>Confirmar</button>
          {selected?.is_blocked
            ? <button className="erp-btn" onClick={() => desbloquear(selected?.code)} disabled={busy}>Desbloquear</button>
            : <button className="erp-btn" onClick={() => bloquear(selected?.code)} disabled={busy || !selected}>Bloquear</button>}
          <button className="erp-btn erp-btn-danger" onClick={() => cancelar(selected?.code)} disabled={busy || !selected || selected?.status === "CANCELLED"}>Cancelar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Filtrar</span>
          <input className="erp-tinput num" style={{ width: 96 }} type="number" placeholder="Cliente" value={filterCustomer} onChange={(e) => { setFilterCustomer(e.target.value); setFilterStatus(""); }} />
          <select className="erp-tselect" style={{ width: 130 }} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setFilterCustomer(""); }}>
            <option value="">Todos status</option>
            <option value="R">Rascunho</option><option value="P">Confirmado</option><option value="F">Faturado</option><option value="CANCELLED">Cancelado</option>
          </select>
          <button className="erp-btn" onClick={aplicarFiltro} disabled={busy}>Aplicar</button>
          <button className="erp-btn" onClick={listarTodos} disabled={busy}>Listar todos</button>
        </div>
        <div className="erp-tgroup">
          <ExportButton title="VVND0200 — Pedido de Venda" filename="vvnd0200" />
        </div>
      </div>

      <div className="erp-content">
      {feedback && (
        <div className={`erp-feedback ${feedback.type}`}>
          {busy && <span className="erp-spin" />}{feedback.message}
        </div>
      )}

      {/* ── MASTER-DETAIL ─────────────────────────────────────────────── */}
      <div className="erp-main">
        {/* LIST */}
        <aside className="erp-list-panel">
          <div className="erp-panel-head">
            <span className="erp-panel-title">Pedidos</span>
            <span className="erp-count">{visibleOrders.length}</span>
            <div className="erp-panel-head-spacer" />
            <input className="erp-search" placeholder="Buscar…" value={listSearch} onChange={(e) => setListSearch(e.target.value)} />
          </div>
          <div className="erp-list">
            {visibleOrders.length === 0 && (
              <div className="erp-list-empty">Nenhum pedido carregado.<br />Use <strong>Aplicar</strong> ou <strong>Listar todos</strong> na barra acima.</div>
            )}
            {visibleOrders.map((o) => {
              const m = statusMeta(o.status);
              return (
                <div key={o.code} className={`erp-list-row${selected?.code === o.code ? " sel" : ""}`} onClick={() => abrir(o.code)}>
                  <span className="erp-list-code">#{o.code}</span>
                  <span className="erp-list-sub">Cliente {o.customer_code}</span>
                  <span className="erp-list-money">R$ {money(o.total_net)}</span>
                  <div className="erp-list-meta">
                    <span className={`erp-badge ${m.cls}`}>{m.label}</span>
                    {o.is_blocked && <span className="erp-badge warn">Bloqueado</span>}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--v-text-3)" }}>{o.emission_date?.slice(0, 10)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* DETAIL */}
        <section className="erp-detail-panel">
          {creating ? (
            <>
              <div className="erp-tabs"><button className="erp-tab active">Novo pedido</button></div>
              <div className="erp-detail-body">
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Identificação</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Nº do pedido</label>
                      <input className="erp-input" value="(gerado automaticamente)" readOnly />
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label erp-req">Estabelecimento</label>
                      <LookupField value={newOrder.enterprise_code} loader={loadEstablishments} entityLabel="estabelecimento" placeholder="Selecionar estabelecimento" clearable={false} onChange={(code) => setO("enterprise_code", code ?? 0)} />
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label erp-req">Cliente</label>
                      <LookupField value={newOrder.customer_code} loader={loadCustomers} entityLabel="cliente" placeholder="Selecionar cliente" onChange={(code) => setO("customer_code", code ?? 0)} />
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Moeda</label>
                      <input className="erp-input" value={newOrder.currency_code ?? ""} onChange={(e) => setO("currency_code", e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Condições comerciais</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label">Cond. pagamento</label><input className="erp-input num" type="number" value={newOrder.payment_term_code || ""} onChange={(e) => setO("payment_term_code", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Comissão %</label><input className="erp-input num" type="number" value={newOrder.commission_pct || ""} onChange={(e) => setO("commission_pct", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Emissão</label><input className="erp-input" type="date" value={newOrder.emission_date ?? ""} onChange={(e) => setO("emission_date", e.target.value)} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Entrega</label><input className="erp-input" type="date" value={newOrder.delivery_date ?? ""} onChange={(e) => setO("delivery_date", e.target.value)} /></div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="erp-btn erp-btn-primary" onClick={criarPedido} disabled={busy}>
                    {busy && <span className="erp-spin" />}Criar pedido
                  </button>
                  <button className="erp-btn" onClick={() => setNewOrder(EMPTY_ORDER)} disabled={busy}>Limpar</button>
                </div>
              </div>
            </>
          ) : selected ? (
            <>
              <div className="erp-tabs">
                <button className={`erp-tab${tab === "dados" ? " active" : ""}`} onClick={() => setTab("dados")}>Dados gerais</button>
                <button className={`erp-tab${tab === "itens" ? " active" : ""}`} onClick={() => setTab("itens")}>Itens ({items.length})</button>
              </div>
              <div className="erp-detail-body">
                {tab === "dados" ? (
                  <>
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">
                        Pedido #{selected.code}
                        <span className={`erp-badge ${sm.cls}`} style={{ marginLeft: 4 }}>{sm.label}</span>
                        {selected.is_blocked && <span className="erp-badge warn">Bloqueado</span>}
                      </div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c3"><label className="erp-label">Nº do pedido</label><input className="erp-input strong" value={selected.order_number ?? selected.code ?? ""} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Estabelecimento</label><input className="erp-input num" value={selected.enterprise_code ?? ""} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Cliente</label><input className="erp-input num" value={selected.customer_code ?? ""} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Cond. pagamento</label><input className="erp-input num" value={selected.payment_term_code ?? ""} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Emissão</label><input className="erp-input" value={selected.emission_date?.slice(0, 10) ?? "—"} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Entrega</label><input className="erp-input" value={selected.delivery_date?.slice(0, 10) ?? "—"} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Comissão %</label><input className="erp-input num" value={selected.commission_pct ?? 0} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Moeda</label><input className="erp-input" value={selected.currency_code ?? "—"} readOnly /></div>
                      </div>
                    </div>
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Totais</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c3"><label className="erp-label">Total bruto</label><input className="erp-input num" value={money(selected.total_gross)} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Total c/ IPI+ST</label><input className="erp-input num" value={money(selected.total_with_ipi_with_st)} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Frete</label><input className="erp-input num" value={money(selected.freight_value)} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Total líquido</label><input className="erp-input strong num" value={money(selected.total_net)} readOnly /></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {isDraft && (
                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">Adicionar item</div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label><LookupField value={newItem.item_code} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(code) => setI("item_code", code ?? 0)} /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Depósito</label><LookupField value={newItem.warehouse_code} loader={loadWarehouses} entityLabel="depósito" placeholder="Selecionar depósito" onChange={(code) => setI("warehouse_code", code ?? 0)} /></div>
                          <div className="erp-field erp-c1"><label className="erp-label erp-req">Qtd</label><input className="erp-input num" type="number" value={newItem.requested_qty || ""} onChange={(e) => setI("requested_qty", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c1"><label className="erp-label">UM</label><input className="erp-input" value={newItem.sales_uom ?? ""} onChange={(e) => setI("sales_uom", e.target.value)} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label erp-req">Preço unit.</label><input className="erp-input num" type="number" value={newItem.unit_price || ""} onChange={(e) => setI("unit_price", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c1"><label className="erp-label">Desc.%</label><input className="erp-input num" type="number" value={newItem.discount_pct || ""} onChange={(e) => setI("discount_pct", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn erp-btn-primary" onClick={adicionarItem} disabled={busy}>{busy && <span className="erp-spin" />}Adicionar item ao pedido</button></div>
                        </div>
                      </div>
                    )}
                    <div className="erp-grid-wrap">
                      <table className="erp-grid">
                        <thead>
                          <tr>
                            <th className="num">Seq</th><th className="num">Item</th><th className="num">Depósito</th>
                            <th className="num">Qtd</th><th>UM</th><th className="num">Preço unit.</th><th className="num">Desc. %</th>
                            <th className="num">Total líq.</th><th>Status</th><th style={{ width: 90 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 && (
                            <tr><td colSpan={10} className="erp-grid-empty">Nenhum item neste pedido{isDraft ? " — use a barra acima para adicionar" : ""}.</td></tr>
                          )}
                          {items.map((it) => (
                            <tr key={it.code}>
                              <td className="num">{it.sequence}</td>
                              <td className="num">{it.item_code}</td>
                              <td className="num">{it.warehouse_code ?? "—"}</td>
                              <td className="num">{it.requested_qty}</td>
                              <td>{it.sales_uom ?? "—"}</td>
                              <td className="num">{money(it.unit_price)}</td>
                              <td className="num">{it.discount_pct ?? 0}</td>
                              <td className="num">{money(it.total_net)}</td>
                              <td>{it.status ?? "—"}</td>
                              <td>{isDraft && <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => cancelarItem(it.code)} disabled={busy}>Cancelar</button>}</td>
                            </tr>
                          ))}
                        </tbody>
                        {items.length > 0 && (
                          <tfoot>
                            <tr><td colSpan={7} className="num">Total líquido dos itens</td><td className="num">{money(itemsTotal)}</td><td colSpan={2}></td></tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                    {!isDraft && <p style={{ fontSize: 12, color: "var(--v-text-3)" }}>Itens só podem ser adicionados/cancelados enquanto o pedido está em <strong>Rascunho</strong>.</p>}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="erp-detail-empty">
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M3 9h18M8 4v16" stroke="currentColor" strokeWidth="1.4"/></svg>
              <div className="erp-detail-empty-title">Nenhum pedido selecionado</div>
              <div className="erp-detail-empty-sub">Selecione um pedido na lista à esquerda para ver seus dados e itens, ou clique em <strong>Novo pedido</strong> para começar.</div>
            </div>
          )}
        </section>
      </div>

      {/* ── STATUS BAR ────────────────────────────────────────────────── */}
      </div>
      <footer className="erp-statusbar">
        <div className="erp-status-item">Pedidos na lista: <strong>{visibleOrders.length}</strong></div>
        {selected && <div className="erp-status-item">Selecionado: <strong>#{selected.code}</strong></div>}
        {selected && <div className="erp-status-item">Situação: <strong>{sm.label}</strong></div>}
        {selected && <div className="erp-status-item">Itens: <strong>{items.length}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
