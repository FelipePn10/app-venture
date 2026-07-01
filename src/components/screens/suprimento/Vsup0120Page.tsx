import { useState, useCallback, useEffect } from "react";
import {
  type PriceTableDTO, type PriceTableItemDTO,
  listPriceTables, createPriceTable, listPriceTableItems, upsertPriceTableItem, deletePriceTableItem,
} from "@/services/purchasingMasterService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_TABLE: PriceTableDTO = { description: "", currency: "BRL", valid_from: today(), valid_to: "" };
const EMPTY_ITEM: PriceTableItemDTO = { item_code: 0, price: 0, uom: "UN", min_qty: 0, supplier_code: undefined };

export function Vsup0120Page(): JSX.Element {
  const [tables, setTables] = useState<PriceTableDTO[]>([]);
  const [form, setForm] = useState<PriceTableDTO>(EMPTY_TABLE);
  const [selected, setSelected] = useState<PriceTableDTO | null>(null);
  const [items, setItems] = useState<PriceTableItemDTO[]>([]);
  const [itemForm, setItemForm] = useState<PriceTableItemDTO>(EMPTY_ITEM);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setTables(await listPriceTables()); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof PriceTableDTO>(k: K, v: PriceTableDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  const setIF = <K extends keyof PriceTableItemDTO>(k: K, v: PriceTableItemDTO[K]) => setItemForm((p) => ({ ...p, [k]: v }));

  async function salvarTabela() {
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try { await createPriceTable(form); setForm(EMPTY_TABLE); setFeedback({ type: "success", message: "Tabela criada." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const codeOf = (t: PriceTableDTO) => t.code ?? t.id ?? 0;
  async function abrir(t: PriceTableDTO) {
    setSelected(t); setItemForm(EMPTY_ITEM); setBusy(true); setFeedback(null);
    try { setItems(await listPriceTableItems(codeOf(t))); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function addItem() {
    if (!selected) return;
    if (!itemForm.item_code || !itemForm.price) { setFeedback({ type: "error", message: "Item e preço são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await upsertPriceTableItem({ ...itemForm, table_code: codeOf(selected) }); setItemForm(EMPTY_ITEM); setItems(await listPriceTableItems(codeOf(selected))); setFeedback({ type: "success", message: "Preço salvo." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function removeItem(id: number) {
    if (!selected) return;
    setBusy(true); setFeedback(null);
    try { await deletePriceTableItem(id); setItems(await listPriceTableItems(codeOf(selected))); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VSUP0120 — Tabela de Preço de Compra</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={() => { setForm(EMPTY_TABLE); setFeedback(null); }} disabled={busy}>+ Nova</button>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvarTabela()} disabled={busy}>{busy ? "..." : "Salvar"}</button></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VSUP0120 — Tabela de Preço de Compra" filename="vsup0120" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Nova tabela</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-5"><label className="fsc-label fsc-label-req">Descrição</label><input className="fsc-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Moeda</label><input className="fsc-input" value={form.currency ?? ""} onChange={(e) => setF("currency", e.target.value.toUpperCase())} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Vigência início</label><input className="fsc-input" type="date" value={(form.valid_from ?? "").slice(0, 10)} onChange={(e) => setF("valid_from", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Vigência fim</label><input className="fsc-input" type="date" value={(form.valid_to ?? "").slice(0, 10)} onChange={(e) => setF("valid_to", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Tabelas</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{tables.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>#</th><th>Descrição</th><th>Moeda</th><th>Vigência</th><th style={{ width: 90 }}>Ações</th></tr></thead>
            <tbody>
              {tables.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhuma tabela.</td></tr>}
              {tables.map((t) => (
                <tr key={codeOf(t)}><td>{codeOf(t)}</td><td style={{ fontWeight: 600 }}>{t.description}</td><td>{t.currency || "—"}</td>
                  <td>{(t.valid_from ?? "").slice(0, 10) || "—"} → {(t.valid_to ?? "").slice(0, 10) || "—"}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => void abrir(t)}>Itens</button></td></tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {selected && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Preços — tabela {codeOf(selected)}</span><div className="fsc-section-banner-line" />
              <button className="fsc-btn fsc-btn-ghost" onClick={() => setSelected(null)}>Fechar</button></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.item_code || ""} onChange={(e) => setIF("item_code", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Preço</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={itemForm.price} onChange={(e) => setIF("price", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">UM</label><input className="fsc-input" value={itemForm.uom ?? ""} onChange={(e) => setIF("uom", e.target.value.toUpperCase())} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Qtd mín.</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.min_qty ?? 0} onChange={(e) => setIF("min_qty", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Fornecedor</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.supplier_code ?? ""} onChange={(e) => setIF("supplier_code", e.target.value ? Number(e.target.value) : undefined)} /></div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void addItem()} disabled={busy}>+ Preço</button></div>
              </div>
            </div>
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead><tr><th>Item</th><th className="fsc-num">Preço</th><th>UM</th><th className="fsc-num">Qtd mín.</th><th>Fornecedor</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                  <tbody>
                    {items.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhum preço.</td></tr>}
                    {items.map((it) => (
                      <tr key={it.id}><td style={{ fontWeight: 600 }}>{it.item_code}</td><td className="fsc-num">{money(it.price)}</td><td>{it.uom || "—"}</td>
                        <td className="fsc-num">{it.min_qty ?? 0}</td><td>{it.supplier_code ?? "genérico"}</td>
                        <td><button className="fsc-action-btn fsc-delete-btn" onClick={() => it.id && void removeItem(it.id)}>Excluir</button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Tabelas: <strong>{tables.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
