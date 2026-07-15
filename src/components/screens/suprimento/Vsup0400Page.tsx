import { useState, useCallback, useEffect } from "react";
import {
  type QuotationDTO, type QuotationPriceDTO,
  listQuotations, getQuotation, createQuotation, addQuotationSuppliers, addQuotationPrice, selectQuotationPrice, generateQuotationOrders,
} from "@/services/purchaseQuotationService";
import { errMessage, type Obj, parseNum, parseBool } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadEstablishments, loadSuppliers } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const csv = (s: string) => s.split(/[,;\s]+/).map((x) => Number(x.trim())).filter((n) => n > 0);
const EMPTY_PRICE: QuotationPriceDTO = { quotation_item_id: 0, supplier_code: 0, price: 0, lead_time_days: undefined, payment_condition_code: undefined };

export function Vsup0400Page(): JSX.Element {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [list, setList] = useState<QuotationDTO[]>([]);
  const [form, setForm] = useState<{ enterprise_code?: number; requisition_item_ids: string; planned_order_codes: string; supplier_codes: string }>({ enterprise_code: 1, requisition_item_ids: "", planned_order_codes: "", supplier_codes: "" });
  const [detail, setDetail] = useState<Obj | null>(null);
  const [selCode, setSelCode] = useState<number | null>(null);
  const [creating, setCreating] = useState(true);
  const [supText, setSupText] = useState("");
  const [priceForm, setPriceForm] = useState<QuotationPriceDTO>(EMPTY_PRICE);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listQuotations(onlyOpen)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, [onlyOpen]);
  useEffect(() => { void reload(); }, [reload]);

  function nova() { setCreating(true); setSelCode(null); setDetail(null); setForm({ enterprise_code: 1, requisition_item_ids: "", planned_order_codes: "", supplier_codes: "" }); setFeedback(null); }
  async function criar() {
    if (!form.enterprise_code) { setFeedback({ type: "error", message: "Estabelecimento é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createQuotation({ enterprise_code: form.enterprise_code, requisition_item_ids: csv(form.requisition_item_ids), planned_order_codes: csv(form.planned_order_codes), supplier_codes: csv(form.supplier_codes) });
      nova(); setFeedback({ type: "success", message: "Cotação liberada." }); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const abrir = useCallback(async (code: number) => {
    setBusy(true); setSelCode(code); setCreating(false);
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
    try { const r = await generateQuotationOrders(selCode); setFeedback({ type: "success", message: `Pedidos gerados. ${JSON.stringify(r).slice(0, 160)}` }); await reload(); setDetail(null); setSelCode(null); setCreating(true); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const items = detail ? ((detail.items ?? detail.Items) as Obj[] | undefined) ?? [] : [];
  const suppliers = detail ? ((detail.suppliers ?? detail.Suppliers) as Obj[] | undefined) ?? [] : [];
  const prices = detail ? ((detail.prices ?? detail.Prices) as Obj[] | undefined) ?? [] : [];

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimento</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Cotação de Compra</span>
          <span className="erp-crumb-code">VSUP0400</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Concorrência entre fornecedores → pedidos</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className="erp-btn erp-btn-primary" onClick={nova} disabled={busy}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Nova cotação
          </button>
        </div>
        <div className="erp-tgroup">
          <label className="erp-check"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /><span>Só abertas</span></label>
          <button className="erp-btn" onClick={() => void reload()} disabled={busy}>Atualizar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VSUP0400 — Cotação de Compra" filename="vsup0400" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Cotações</span><span className="erp-count">{list.length}</span></div>
            <div className="erp-list">
              {list.length === 0 && <div className="erp-list-empty">Nenhuma cotação.</div>}
              {list.map((q) => (
                <div key={q.code} className={`erp-list-row${!creating && selCode === q.code ? " sel" : ""}`} onClick={() => q.code && void abrir(q.code)}>
                  <span className="erp-list-code">#{q.code}</span>
                  <span className="erp-list-sub">Estab. {q.enterprise_code} · {(q.emission_date ?? "").slice(0, 10)}</span>
                  <div className="erp-list-meta"><span className="erp-badge draft">{q.status}</span></div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            {creating ? (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Liberar cotação</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Nova cotação — a partir de solicitações / ordens planejadas</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label erp-req">Estabelecimento</label><LookupField value={form.enterprise_code} loader={loadEstablishments} entityLabel="estabelecimento" placeholder="Selecionar" onChange={(c) => setForm((p) => ({ ...p, enterprise_code: c }))} /></div>
                      <div className="erp-field erp-c4"><label className="erp-label">IDs item solicitação</label><input className="erp-input" placeholder="ex.: 10, 11, 12" value={form.requisition_item_ids} onChange={(e) => setForm((p) => ({ ...p, requisition_item_ids: e.target.value }))} /></div>
                      <div className="erp-field erp-c4"><label className="erp-label">Códigos ordem planejada</label><input className="erp-input" value={form.planned_order_codes} onChange={(e) => setForm((p) => ({ ...p, planned_order_codes: e.target.value }))} /></div>
                      <div className="erp-field erp-c8"><label className="erp-label">Fornecedores convidados (códigos)</label><input className="erp-input" placeholder="ex.: 100, 200" value={form.supplier_codes} onChange={(e) => setForm((p) => ({ ...p, supplier_codes: e.target.value }))} /></div>
                      <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy}>{busy && <span className="erp-spin" />}Liberar cotação</button></div>
                    </div>
                  </div>
                </div>
              </>
            ) : detail && selCode ? (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Cotação #{selCode}</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Convidar fornecedores</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c9"><label className="erp-label">Códigos de fornecedor (separados por vírgula)</label><input className="erp-input" value={supText} onChange={(e) => setSupText(e.target.value)} /></div>
                      <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={() => void addSuppliers()} disabled={busy}>+ Fornecedores</button></div>
                    </div>
                  </div>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Registrar preço</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c2"><label className="erp-label erp-req">Item cotação (ID)</label><input className="erp-input num" type="number" value={priceForm.quotation_item_id || ""} onChange={(e) => setPriceForm((p) => ({ ...p, quotation_item_id: Number(e.target.value) }))} /></div>
                      <div className="erp-field erp-c4"><label className="erp-label erp-req">Fornecedor</label><LookupField value={priceForm.supplier_code || undefined} loader={loadSuppliers} entityLabel="fornecedor" placeholder="Selecionar fornecedor" onChange={(c) => setPriceForm((p) => ({ ...p, supplier_code: c ?? 0 }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Preço</label><input className="erp-input num" type="number" step="0.01" value={priceForm.price} onChange={(e) => setPriceForm((p) => ({ ...p, price: Number(e.target.value) }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Lead (d)</label><input className="erp-input num" type="number" value={priceForm.lead_time_days ?? ""} onChange={(e) => setPriceForm((p) => ({ ...p, lead_time_days: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void addPrice()} disabled={busy}>+ Preço</button></div>
                    </div>
                  </div>
                  <div className="erp-grid-wrap">
                    <table className="erp-grid">
                      <thead><tr><th className="num">Item</th><th className="num">Fornecedor</th><th className="num">Preço</th><th>Vencedor</th><th style={{ width: 110 }}></th></tr></thead>
                      <tbody>
                        {prices.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum preço registrado. Itens: {items.length} · Fornecedores: {suppliers.length}</td></tr>}
                        {prices.map((p, i) => {
                          const id = parseNum(p, "id", "ID") ?? 0;
                          const sel = parseBool(p, "selected", "Selected", "is_winner", "IsWinner");
                          return (
                            <tr key={`p${i}`}>
                              <td className="num">{parseNum(p, "quotation_item_id", "QuotationItemID")}</td>
                              <td className="num">{parseNum(p, "supplier_code", "SupplierCode")}</td>
                              <td className="num" style={{ fontWeight: 600 }}>{money(parseNum(p, "price", "Price", "unit_price", "UnitPrice"))}</td>
                              <td>{sel ? <span className="erp-badge ok">vencedor</span> : "—"}</td>
                              <td><button className="erp-btn erp-btn-sm" onClick={() => id && void selecionar(id)} disabled={!id || busy}>Selecionar</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div><button className="erp-btn erp-btn-primary" onClick={() => void gerar()} disabled={busy}>{busy && <span className="erp-spin" />}Gerar pedidos de compra</button></div>
                </div>
              </>
            ) : (
              <div className="erp-detail-empty">
                <div className="erp-detail-empty-title">Nenhuma cotação selecionada</div>
                <div className="erp-detail-empty-sub">Selecione uma cotação à esquerda ou clique em <strong>Nova cotação</strong>.</div>
              </div>
            )}
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Cotações: <strong>{list.length}</strong></div>
        {!creating && selCode ? <div className="erp-status-item">Cotação: <strong>#{selCode}</strong> · {prices.length} preço(s)</div> : null}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
