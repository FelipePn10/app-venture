import { useState, useCallback, useEffect } from "react";
import {
  type PurchaseOrderDTO, type PurchaseOrderItemDTO, type SuggestionDTO,
  listOrders, getOrder, createOrder, cancelOrder, addOrderItem,
  listSuggestions, approveSuggestion, rejectSuggestion,
} from "@/services/purchaseOrderService";
import { errMessage, type Obj, parseNum } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "pedidos" | "sugestoes";
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_HEAD: PurchaseOrderDTO = { enterprise_code: 1, supplier_code: undefined, currency_code: "BRL", freight_type: "CIF", notes: "" };
const EMPTY_ITEM: PurchaseOrderItemDTO = { item_code: 0, requested_qty: 1, unit_price: 0, discount_pct: 0, ipi_pct: 0, icms_pct: 0 };

function statusPill(s?: string): JSX.Element {
  const x = (s ?? "").toUpperCase();
  const cls = x === "APPROVED" || x === "RELEASED" ? "fsc-pill-green" : x === "CANCELLED" ? "fsc-pill-red" : x === "DRAFT" ? "fsc-pill-gray" : "fsc-pill-amber";
  return <span className={`fsc-pill ${cls}`}>{s || "—"}</span>;
}

export function Vsup0200Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("pedidos");
  const [list, setList] = useState<PurchaseOrderDTO[]>([]);
  const [head, setHead] = useState<PurchaseOrderDTO>(EMPTY_HEAD);
  const [detail, setDetail] = useState<Obj | null>(null);
  const [selCode, setSelCode] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState<PurchaseOrderItemDTO>(EMPTY_ITEM);
  const [suggestions, setSuggestions] = useState<SuggestionDTO[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      if (tab === "pedidos") setList(await listOrders());
      else setSuggestions(await listSuggestions());
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, [tab]);
  useEffect(() => { void reload(); }, [reload]);

  const setH = <K extends keyof PurchaseOrderDTO>(k: K, v: PurchaseOrderDTO[K]) => { setHead((p) => ({ ...p, [k]: v })); setFeedback(null); };
  const setI = <K extends keyof PurchaseOrderItemDTO>(k: K, v: PurchaseOrderItemDTO[K]) => setItemForm((p) => ({ ...p, [k]: v }));

  async function criar() {
    setBusy(true); setFeedback(null);
    try { const o = await createOrder({ ...head, created_by: "00000000-0000-0000-0000-000000000000" }); setHead(EMPTY_HEAD); setFeedback({ type: "success", message: `Pedido ${o?.code} criado (${o?.status}).` }); await reload(); if (o?.code) await abrir(o.code); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const abrir = useCallback(async (code: number) => {
    setBusy(true);
    try { setSelCode(code); setDetail(await getOrder(code)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
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
    try { await cancelOrder(code); if (selCode === code) { setSelCode(null); setDetail(null); } setFeedback({ type: "success", message: "Pedido cancelado." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function aprovarSugestao(s: SuggestionDTO) {
    const sup = window.prompt("Código do fornecedor:"); if (sup === null) return;
    const price = window.prompt("Preço unitário:", "0"); if (price === null) return;
    setBusy(true); setFeedback(null);
    try { const o = await approveSuggestion(s.code, { enterprise_code: 1, supplier_code: Number(sup), unit_price: Number(price), created_by: "00000000-0000-0000-0000-000000000000" }); setFeedback({ type: "success", message: `Sugestão aprovada → pedido ${parseNum(o, "code", "Code") ?? ""}.` }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function rejeitarSugestao(code: number) {
    setBusy(true); setFeedback(null);
    try { await rejectSuggestion(code); setFeedback({ type: "success", message: "Sugestão rejeitada." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const items = detail ? ((detail.items ?? detail.Items) as Obj[] | undefined) ?? [] : [];

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VSUP0200 — Pedido de Compra</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Visão</span>
          <button className={`fsc-btn ${tab === "pedidos" ? "fsc-btn-primary" : "fsc-btn-ghost"}`} onClick={() => setTab("pedidos")}>Pedidos</button>
          <button className={`fsc-btn ${tab === "sugestoes" ? "fsc-btn-primary" : "fsc-btn-ghost"}`} onClick={() => setTab("sugestoes")}>Sugestões (MRP)</button></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VSUP0200 — Pedido de Compra" filename="vsup0200" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {tab === "pedidos" && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Nova capa</span><div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">com fornecedor, defaults (cond. pagto, frete, tabela preço) são puxados</span></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Empresa</label><input className="fsc-input fsc-input-right" type="number" value={head.enterprise_code ?? ""} onChange={(e) => setH("enterprise_code", e.target.value ? Number(e.target.value) : undefined)} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Fornecedor</label><input className="fsc-input fsc-input-right" type="number" value={head.supplier_code ?? ""} onChange={(e) => setH("supplier_code", e.target.value ? Number(e.target.value) : undefined)} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Moeda</label><input className="fsc-input" value={head.currency_code ?? ""} onChange={(e) => setH("currency_code", e.target.value.toUpperCase())} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo frete</label><input className="fsc-input" value={head.freight_type ?? ""} onChange={(e) => setH("freight_type", e.target.value.toUpperCase())} /></div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void criar()} disabled={busy}>+ Criar pedido</button></div>
                <div className="fsc-field fsc-col-12"><label className="fsc-label">Observação</label><input className="fsc-input" value={head.notes ?? ""} onChange={(e) => setH("notes", e.target.value)} /></div>
              </div>
            </div></div>

            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Pedidos</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th>#</th><th>Nº</th><th>Fornecedor</th><th>Status</th><th className="fsc-num">Total</th><th style={{ width: 140 }}>Ações</th></tr></thead>
                <tbody>
                  {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhum pedido.</td></tr>}
                  {list.map((o) => (
                    <tr key={o.code}><td style={{ fontWeight: 600 }}>{o.code}</td><td>{o.order_number}</td><td>{o.supplier_code ?? "—"}</td><td>{statusPill(o.status)}</td>
                      <td className="fsc-num">{money(o.total_net ?? o.total_gross)}</td>
                      <td>
                        <button className="fsc-action-btn fsc-edit-btn" onClick={() => o.code && void abrir(o.code)}>Abrir</button>
                        {(o.status ?? "").toUpperCase() !== "CANCELLED" && <button className="fsc-action-btn fsc-delete-btn" onClick={() => o.code && void cancelar(o.code)}>Cancelar</button>}
                      </td></tr>
                  ))}
                </tbody>
              </table>
            </div></div>

            {detail && selCode && (
              <>
                <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Itens do pedido {selCode}</span><div className="fsc-section-banner-line" />
                  <button className="fsc-btn fsc-btn-ghost" onClick={() => { setSelCode(null); setDetail(null); }}>Fechar</button></div>
                <div className="fsc-card"><div className="fsc-card-body">
                  <div className="fsc-grid">
                    <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.item_code || ""} onChange={(e) => setI("item_code", Number(e.target.value))} /></div>
                    <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Qtde</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.requested_qty} onChange={(e) => setI("requested_qty", Number(e.target.value))} /></div>
                    <div className="fsc-field fsc-col-2"><label className="fsc-label">Preço unit.</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={itemForm.unit_price ?? 0} onChange={(e) => setI("unit_price", Number(e.target.value))} /></div>
                    <div className="fsc-field fsc-col-2"><label className="fsc-label">Desc. %</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={itemForm.discount_pct ?? 0} onChange={(e) => setI("discount_pct", Number(e.target.value))} /></div>
                    <div className="fsc-field fsc-col-2"><label className="fsc-label">% ICMS</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={itemForm.icms_pct ?? 0} onChange={(e) => setI("icms_pct", Number(e.target.value))} /></div>
                    <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void addItem()} disabled={busy}>+ Item</button></div>
                  </div>
                  <span className="fsc-field-hint">Se preço/IPI vazios e houver tabela/classificação, o backend resolve automaticamente.</span>
                </div>
                  <div className="fsc-results-wrap">
                    <table className="fsc-table">
                      <thead><tr><th>Seq</th><th>Item</th><th className="fsc-num">Qtde</th><th className="fsc-num">Unit.</th><th className="fsc-num">% IPI</th><th className="fsc-num">Total</th></tr></thead>
                      <tbody>
                        {items.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhum item.</td></tr>}
                        {items.map((it, i) => (
                          <tr key={i}><td>{parseNum(it, "sequence", "Sequence") ?? i + 1}</td><td style={{ fontWeight: 600 }}>{parseNum(it, "item_code", "ItemCode")}</td>
                            <td className="fsc-num">{parseNum(it, "requested_qty", "RequestedQty") ?? 0}</td><td className="fsc-num">{money(parseNum(it, "unit_price", "UnitPrice"))}</td>
                            <td className="fsc-num">{parseNum(it, "ipi_pct", "IPIPct") ?? 0}</td><td className="fsc-num">{money(parseNum(it, "total_price", "TotalPrice"))}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === "sugestoes" && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Sugestões de compra (MRP)</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{suggestions.length}</span></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th>#</th><th>Item</th><th className="fsc-num">Qtde</th><th>Necessidade</th><th>Status</th><th style={{ width: 160 }}>Ações</th></tr></thead>
                <tbody>
                  {suggestions.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhuma sugestão aberta.</td></tr>}
                  {suggestions.map((s) => (
                    <tr key={s.code}><td style={{ fontWeight: 600 }}>{s.code}</td><td>{s.item_code ?? "—"}</td><td className="fsc-num">{s.quantity ?? "—"}</td>
                      <td>{(s.need_date ?? "").slice(0, 10) || "—"}</td><td>{statusPill(s.status)}</td>
                      <td>
                        <button className="fsc-action-btn fsc-edit-btn" onClick={() => void aprovarSugestao(s)}>Aprovar</button>
                        <button className="fsc-action-btn fsc-delete-btn" onClick={() => void rejeitarSugestao(s.code)}>Rejeitar</button>
                      </td></tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">{tab === "pedidos" ? "Pedidos" : "Sugestões"}: <strong>{tab === "pedidos" ? list.length : suggestions.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
