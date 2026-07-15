import { useState, useCallback, useEffect } from "react";
import {
  type PurchaseOrderDTO, type PurchaseOrderItemDTO, type SuggestionDTO,
  listOrders, getOrder, createOrder, cancelOrder, addOrderItem,
  listSuggestions, approveSuggestion, rejectSuggestion,
} from "@/services/purchaseOrderService";
import { currentUserId, errMessage, type Obj, parseNum } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadSuppliers, loadEstablishments } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type View = "pedidos" | "sugestoes";
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_HEAD: PurchaseOrderDTO = { enterprise_code: 1, supplier_code: undefined, currency_code: "BRL", freight_type: "CIF", notes: "" };
const EMPTY_ITEM: PurchaseOrderItemDTO = { item_code: 0, requested_qty: 1, unit_price: 0, discount_pct: 0, ipi_pct: 0, icms_pct: 0 };

function statusBadge(s?: string): JSX.Element {
  const x = (s ?? "").toUpperCase();
  const cls = x === "APPROVED" || x === "RELEASED" ? "ok" : x === "CANCELLED" ? "err" : x === "DRAFT" ? "draft" : "warn";
  return <span className={`erp-badge ${cls}`}>{s || "—"}</span>;
}

export function Vsup0200Page(): JSX.Element {
  const [view, setView] = useState<View>("pedidos");
  const [list, setList] = useState<PurchaseOrderDTO[]>([]);
  const [head, setHead] = useState<PurchaseOrderDTO>(EMPTY_HEAD);
  const [detail, setDetail] = useState<Obj | null>(null);
  const [selCode, setSelCode] = useState<number | null>(null);
  const [creating, setCreating] = useState(true);
  const [itemForm, setItemForm] = useState<PurchaseOrderItemDTO>(EMPTY_ITEM);
  const [suggestions, setSuggestions] = useState<SuggestionDTO[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      if (view === "pedidos") setList(await listOrders());
      else setSuggestions(await listSuggestions());
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, [view]);
  useEffect(() => { void reload(); }, [reload]);

  const setH = <K extends keyof PurchaseOrderDTO>(k: K, v: PurchaseOrderDTO[K]) => { setHead((p) => ({ ...p, [k]: v })); setFeedback(null); };
  const setI = <K extends keyof PurchaseOrderItemDTO>(k: K, v: PurchaseOrderItemDTO[K]) => setItemForm((p) => ({ ...p, [k]: v }));

  const abrir = useCallback(async (code: number) => {
    setBusy(true); setCreating(false);
    try { setSelCode(code); setDetail(await getOrder(code)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  function novo() { setCreating(true); setSelCode(null); setDetail(null); setHead(EMPTY_HEAD); setFeedback(null); }

  async function criar() {
    setBusy(true); setFeedback(null);
    try { const o = await createOrder({ ...head, created_by: currentUserId() }); setHead(EMPTY_HEAD); setFeedback({ type: "success", message: `Pedido ${o?.code} criado (${o?.status}).` }); await reload(); if (o?.code) await abrir(o.code); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function addItem() {
    if (!selCode) return;
    if (!itemForm.item_code || !itemForm.requested_qty) { setFeedback({ type: "error", message: "Item e quantidade obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await addOrderItem(selCode, itemForm); setItemForm(EMPTY_ITEM); await abrir(selCode); setFeedback({ type: "success", message: "Item adicionado (preço/IPI/UM resolvidos pelo backend)." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function cancelar(code: number) {
    if (!window.confirm(`Cancelar o pedido ${code}?`)) return;
    setBusy(true); setFeedback(null);
    try { await cancelOrder(code); if (selCode === code) { setSelCode(null); setDetail(null); setCreating(true); } setFeedback({ type: "success", message: "Pedido cancelado." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function aprovarSugestao(s: SuggestionDTO) {
    const sup = window.prompt("Código do fornecedor:"); if (sup === null) return;
    const price = window.prompt("Preço unitário:", "0"); if (price === null) return;
    setBusy(true); setFeedback(null);
    try { const o = await approveSuggestion(s.code, { enterprise_code: 1, supplier_code: Number(sup), unit_price: Number(price), created_by: currentUserId() }); setFeedback({ type: "success", message: `Sugestão aprovada → pedido ${parseNum(o, "code", "Code") ?? ""}.` }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function rejeitarSugestao(code: number) {
    setBusy(true); setFeedback(null);
    try { await rejectSuggestion(code); setFeedback({ type: "success", message: "Sugestão rejeitada." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const items = detail ? ((detail.items ?? detail.Items) as Obj[] | undefined) ?? [] : [];

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimento</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Pedido de Compra</span>
          <span className="erp-crumb-code">VSUP0200</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Compras + sugestões de MRP</span>
      </header>

      <div className="erp-toolbar">
        {view === "pedidos" && (
          <div className="erp-tgroup">
            <button className="erp-btn erp-btn-primary" onClick={novo} disabled={busy}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Novo pedido
            </button>
          </div>
        )}
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Visão</span>
          <button className={`erp-btn${view === "pedidos" ? " erp-btn-dark" : ""}`} onClick={() => setView("pedidos")}>Pedidos</button>
          <button className={`erp-btn${view === "sugestoes" ? " erp-btn-dark" : ""}`} onClick={() => setView("sugestoes")}>Sugestões (MRP)</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VSUP0200 — Pedido de Compra" filename="vsup0200" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        {view === "pedidos" ? (
          <div className="erp-main">
            <aside className="erp-list-panel">
              <div className="erp-panel-head"><span className="erp-panel-title">Pedidos de compra</span><span className="erp-count">{list.length}</span></div>
              <div className="erp-list">
                {list.length === 0 && <div className="erp-list-empty">Nenhum pedido de compra.</div>}
                {list.map((o) => (
                  <div key={o.code} className={`erp-list-row${!creating && selCode === o.code ? " sel" : ""}`} onClick={() => o.code && void abrir(o.code)}>
                    <span className="erp-list-code">#{o.code}</span>
                    <span className="erp-list-sub">Fornecedor {o.supplier_code ?? "—"}</span>
                    <span className="erp-list-money">R$ {money(o.total_net ?? o.total_gross)}</span>
                    <div className="erp-list-meta">
                      {statusBadge(o.status)}
                      {(o.status ?? "").toUpperCase() !== "CANCELLED" && <button className="erp-btn erp-btn-danger erp-btn-sm" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); o.code && void cancelar(o.code); }}>Cancelar</button>}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <section className="erp-detail-panel">
              {creating ? (
                <>
                  <div className="erp-tabs"><button className="erp-tab active">Novo pedido</button></div>
                  <div className="erp-detail-body">
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Capa do pedido</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c4"><label className="erp-label">Estabelecimento</label><LookupField value={head.enterprise_code} loader={loadEstablishments} entityLabel="estabelecimento" placeholder="Selecionar" onChange={(c) => setH("enterprise_code", c)} /></div>
                        <div className="erp-field erp-c5"><label className="erp-label erp-req">Fornecedor</label><LookupField value={head.supplier_code} loader={loadSuppliers} entityLabel="fornecedor" placeholder="Selecionar fornecedor" onChange={(c) => setH("supplier_code", c)} /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Moeda</label><input className="erp-input" value={head.currency_code ?? ""} onChange={(e) => setH("currency_code", e.target.value.toUpperCase())} /></div>
                        <div className="erp-field erp-c1"><label className="erp-label">Frete</label><input className="erp-input" value={head.freight_type ?? ""} onChange={(e) => setH("freight_type", e.target.value.toUpperCase())} /></div>
                        <div className="erp-field erp-c12"><label className="erp-label">Observação</label><input className="erp-input" value={head.notes ?? ""} onChange={(e) => setH("notes", e.target.value)} /></div>
                        <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy}>{busy && <span className="erp-spin" />}Criar pedido</button></div>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--v-text-3)" }}>Ao informar o fornecedor, os defaults (cond. pagamento, frete, tabela de preço) são puxados pelo backend.</p>
                  </div>
                </>
              ) : detail && selCode ? (
                <>
                  <div className="erp-tabs"><button className="erp-tab active">Itens · pedido #{selCode}</button></div>
                  <div className="erp-detail-body">
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Adicionar item</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label><LookupField value={itemForm.item_code} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => setI("item_code", c ?? 0)} /></div>
                        <div className="erp-field erp-c2"><label className="erp-label erp-req">Qtde</label><input className="erp-input num" type="number" value={itemForm.requested_qty} onChange={(e) => setI("requested_qty", Number(e.target.value))} /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Preço unit.</label><input className="erp-input num" type="number" step="0.01" value={itemForm.unit_price ?? 0} onChange={(e) => setI("unit_price", Number(e.target.value))} /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Desc. %</label><input className="erp-input num" type="number" step="0.01" value={itemForm.discount_pct ?? 0} onChange={(e) => setI("discount_pct", Number(e.target.value))} /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">% ICMS</label><input className="erp-input num" type="number" step="0.01" value={itemForm.icms_pct ?? 0} onChange={(e) => setI("icms_pct", Number(e.target.value))} /></div>
                        <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={() => void addItem()} disabled={busy}>{busy && <span className="erp-spin" />}Adicionar item</button></div>
                      </div>
                    </div>
                    <div className="erp-grid-wrap">
                      <table className="erp-grid">
                        <thead><tr><th className="num">Seq</th><th className="num">Item</th><th className="num">Qtde</th><th className="num">Unit.</th><th className="num">% IPI</th><th className="num">Total</th></tr></thead>
                        <tbody>
                          {items.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum item.</td></tr>}
                          {items.map((it, i) => (
                            <tr key={i}>
                              <td className="num">{parseNum(it, "sequence", "Sequence") ?? i + 1}</td>
                              <td className="num" style={{ fontWeight: 600 }}>{parseNum(it, "item_code", "ItemCode")}</td>
                              <td className="num">{parseNum(it, "requested_qty", "RequestedQty") ?? 0}</td>
                              <td className="num">{money(parseNum(it, "unit_price", "UnitPrice"))}</td>
                              <td className="num">{parseNum(it, "ipi_pct", "IPIPct") ?? 0}</td>
                              <td className="num">{money(parseNum(it, "total_price", "TotalPrice"))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="erp-detail-empty">
                  <div className="erp-detail-empty-title">Nenhum pedido selecionado</div>
                  <div className="erp-detail-empty-sub">Selecione um pedido à esquerda ou clique em <strong>Novo pedido</strong>.</div>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="erp-detail-body">
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Sugestões de compra (MRP) — {suggestions.length}</div>
              <div style={{ padding: 0 }}>
                <table className="erp-grid" style={{ border: "none", borderRadius: 0, boxShadow: "none" }}>
                  <thead><tr><th className="num">#</th><th className="num">Item</th><th className="num">Qtde</th><th>Necessidade</th><th>Status</th><th style={{ width: 180 }}>Ações</th></tr></thead>
                  <tbody>
                    {suggestions.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma sugestão aberta.</td></tr>}
                    {suggestions.map((s) => (
                      <tr key={s.code}>
                        <td className="num" style={{ fontWeight: 600 }}>{s.code}</td>
                        <td className="num">{s.item_code ?? "—"}</td>
                        <td className="num">{s.quantity ?? "—"}</td>
                        <td>{(s.need_date ?? "").slice(0, 10) || "—"}</td>
                        <td>{statusBadge(s.status)}</td>
                        <td>
                          <button className="erp-btn erp-btn-primary erp-btn-sm" onClick={() => void aprovarSugestao(s)}>Aprovar</button>{" "}
                          <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => void rejeitarSugestao(s.code)}>Rejeitar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">{view === "pedidos" ? "Pedidos" : "Sugestões"}: <strong>{view === "pedidos" ? list.length : suggestions.length}</strong></div>
        {view === "pedidos" && !creating && selCode ? <div className="erp-status-item">Pedido: <strong>#{selCode}</strong></div> : null}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
