import { useState, useCallback, useEffect } from "react";
import {
  type QuotationDTO, type QuotationPriceDTO,
  listQuotations, getQuotation, createQuotation, addQuotationSuppliers, addQuotationPrice, selectQuotationPrice, generateQuotationOrders,
} from "@/services/purchaseQuotationService";
import { errMessage, type Obj, parseStr, parseNum, parseBool } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const csv = (s: string) => s.split(/[,;\s]+/).map((x) => Number(x.trim())).filter((n) => n > 0);

const EMPTY_PRICE: QuotationPriceDTO = { quotation_item_id: 0, supplier_code: 0, price: 0, lead_time_days: undefined, payment_condition_code: undefined };

export function Vsup0400Page(): JSX.Element {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [list, setList] = useState<QuotationDTO[]>([]);
  const [form, setForm] = useState({ enterprise_code: "1", requisition_item_ids: "", planned_order_codes: "", supplier_codes: "" });
  const [detail, setDetail] = useState<Obj | null>(null);
  const [selCode, setSelCode] = useState<number | null>(null);
  const [supText, setSupText] = useState("");
  const [priceForm, setPriceForm] = useState<QuotationPriceDTO>(EMPTY_PRICE);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listQuotations(onlyOpen)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, [onlyOpen]);
  useEffect(() => { void reload(); }, [reload]);

  async function criar() {
    const ec = Number(form.enterprise_code); if (!ec) { setFeedback({ type: "error", message: "Empresa é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createQuotation({ enterprise_code: ec, requisition_item_ids: csv(form.requisition_item_ids), planned_order_codes: csv(form.planned_order_codes), supplier_codes: csv(form.supplier_codes) });
      setForm({ enterprise_code: "1", requisition_item_ids: "", planned_order_codes: "", supplier_codes: "" });
      setFeedback({ type: "success", message: "Cotação liberada." }); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const abrir = useCallback(async (code: number) => {
    setBusy(true); setSelCode(code);
    try { setDetail(await getQuotation(code)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  async function addSuppliers() {
    if (!selCode) return;
    const codes = csv(supText); if (codes.length === 0) { setFeedback({ type: "error", message: "Informe códigos de fornecedor." }); return; }
    setBusy(true); setFeedback(null);
    try { await addQuotationSuppliers(selCode, codes); setSupText(""); await abrir(selCode); setFeedback({ type: "success", message: "Fornecedores convidados." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function addPrice() {
    if (!selCode) return;
    if (!priceForm.quotation_item_id || !priceForm.supplier_code) { setFeedback({ type: "error", message: "Item da cotação e fornecedor obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await addQuotationPrice(priceForm); setPriceForm(EMPTY_PRICE); await abrir(selCode); setFeedback({ type: "success", message: "Preço registrado." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function selecionar(priceId: number) {
    if (!selCode) return;
    setBusy(true); setFeedback(null);
    try { await selectQuotationPrice(priceId); await abrir(selCode); setFeedback({ type: "success", message: "Preço selecionado como vencedor." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function gerar() {
    if (!selCode) return;
    setBusy(true); setFeedback(null);
    try { const r = await generateQuotationOrders(selCode); setFeedback({ type: "success", message: `Pedidos gerados. ${JSON.stringify(r).slice(0, 200)}` }); await reload(); setDetail(null); setSelCode(null); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const items = detail ? ((detail.items ?? detail.Items) as Obj[] | undefined) ?? [] : [];
  const suppliers = detail ? ((detail.suppliers ?? detail.Suppliers) as Obj[] | undefined) ?? [] : [];
  const prices = detail ? ((detail.prices ?? detail.Prices) as Obj[] | undefined) ?? [] : [];

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VSUP0400 — Cotação de Compra</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Visão</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void reload()} disabled={busy}>Atualizar</button>
          <span className="fsc-action-label">Só abertas</span>
          <label className="fsc-toggle"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VSUP0400 — Cotação de Compra" filename="vsup0400" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Liberar cotação</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">a partir de itens de solicitação e/ou ordens planejadas</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Empresa</label><input className="fsc-input fsc-input-right" type="number" value={form.enterprise_code} onChange={(e) => setForm((p) => ({ ...p, enterprise_code: e.target.value }))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">IDs item solicitação (vírgula)</label><input className="fsc-input" value={form.requisition_item_ids} onChange={(e) => setForm((p) => ({ ...p, requisition_item_ids: e.target.value }))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Códigos ordem planejada</label><input className="fsc-input" value={form.planned_order_codes} onChange={(e) => setForm((p) => ({ ...p, planned_order_codes: e.target.value }))} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Fornecedores convidados</label><input className="fsc-input" value={form.supplier_codes} onChange={(e) => setForm((p) => ({ ...p, supplier_codes: e.target.value }))} /></div>
            <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void criar()} disabled={busy}>Liberar</button></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Cotações</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>#</th><th>Empresa</th><th>Emissão</th><th>Status</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhuma cotação.</td></tr>}
              {list.map((q) => (
                <tr key={q.code}><td style={{ fontWeight: 600 }}>{q.code}</td><td>{q.enterprise_code}</td><td>{(q.emission_date ?? "").slice(0, 10)}</td>
                  <td><span className="fsc-pill fsc-pill-gray">{q.status}</span></td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => q.code && void abrir(q.code)}>Abrir</button></td></tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {detail && selCode && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Cotação {selCode}</span><div className="fsc-section-banner-line" />
              <button className="fsc-btn fsc-btn-primary" onClick={() => void gerar()} disabled={busy}>Gerar pedidos</button>
              <button className="fsc-btn fsc-btn-ghost" onClick={() => { setSelCode(null); setDetail(null); }}>Fechar</button></div>

            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-6"><label className="fsc-label">Convidar fornecedores (vírgula)</label><input className="fsc-input" value={supText} onChange={(e) => setSupText(e.target.value)} /></div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-ghost" style={{ width: "100%" }} onClick={() => void addSuppliers()} disabled={busy}>+ Fornecedores</button></div>
              </div>
              <div className="fsc-grid" style={{ marginTop: 8 }}>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Item cotação (ID)</label><input className="fsc-input fsc-input-right" type="number" value={priceForm.quotation_item_id || ""} onChange={(e) => setPriceForm((p) => ({ ...p, quotation_item_id: Number(e.target.value) }))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Fornecedor</label><input className="fsc-input fsc-input-right" type="number" value={priceForm.supplier_code || ""} onChange={(e) => setPriceForm((p) => ({ ...p, supplier_code: Number(e.target.value) }))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Preço</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={priceForm.price} onChange={(e) => setPriceForm((p) => ({ ...p, price: Number(e.target.value) }))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Lead time (d)</label><input className="fsc-input fsc-input-right" type="number" value={priceForm.lead_time_days ?? ""} onChange={(e) => setPriceForm((p) => ({ ...p, lead_time_days: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void addPrice()} disabled={busy}>+ Preço</button></div>
              </div>
            </div></div>

            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th colSpan={4}>Itens / Fornecedores / Preços</th></tr></thead>
                <tbody>
                  <tr><td style={{ fontWeight: 600 }} colSpan={4}>Itens ({items.length})</td></tr>
                  {items.map((it, i) => <tr key={`i${i}`}><td>ID {parseNum(it, "id", "ID")}</td><td>item {parseNum(it, "item_code", "ItemCode")}</td><td>orig {parseStr(it, "origin", "Origin")}</td><td>{parseStr(it, "status", "Status")}</td></tr>)}
                  <tr><td style={{ fontWeight: 600 }} colSpan={4}>Fornecedores ({suppliers.length})</td></tr>
                  {suppliers.map((s, i) => <tr key={`s${i}`}><td colSpan={4}>forn {parseNum(s, "supplier_code", "SupplierCode")}</td></tr>)}
                  <tr><td style={{ fontWeight: 600 }} colSpan={4}>Preços ({prices.length})</td></tr>
                  {prices.map((p, i) => {
                    const id = parseNum(p, "id", "ID") ?? 0;
                    const sel = parseBool(p, "selected", "Selected", "is_winner", "IsWinner");
                    return (
                      <tr key={`p${i}`}>
                        <td>item {parseNum(p, "quotation_item_id", "QuotationItemID")}</td><td>forn {parseNum(p, "supplier_code", "SupplierCode")}</td>
                        <td className="fsc-num">{money(parseNum(p, "price", "Price", "unit_price", "UnitPrice"))} {sel && <span className="fsc-pill fsc-pill-green">vencedor</span>}</td>
                        <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => id && void selecionar(id)} disabled={!id}>Selecionar</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Cotações: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
