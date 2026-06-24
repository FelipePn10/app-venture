import { useState } from "react";
import { type ItemSupplierDTO, listItemSuppliers, upsertItemSupplier, deleteItemSupplier } from "@/services/purchasingMasterService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: ItemSupplierDTO = { item_code: 0, supplier_code: 0, ranking: 1, supplier_item_code: "", supplier_item_desc: "", supplier_uom: "", lead_time_days: undefined };

export function Vsup0130Page(): JSX.Element {
  const [itemCode, setItemCode] = useState("");
  const [list, setList] = useState<ItemSupplierDTO[]>([]);
  const [form, setForm] = useState<ItemSupplierDTO>(EMPTY);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  async function carregar() {
    const c = Number(itemCode); if (!c) { setFeedback({ type: "error", message: "Informe o item." }); return; }
    setBusy(true); setFeedback(null);
    try { setList(await listItemSuppliers(c)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const setF = <K extends keyof ItemSupplierDTO>(k: K, v: ItemSupplierDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  async function salvar() {
    const c = Number(itemCode);
    if (!c || !form.supplier_code) { setFeedback({ type: "error", message: "Item e fornecedor são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await upsertItemSupplier({ ...form, item_code: c }); setForm(EMPTY); setFeedback({ type: "success", message: "Vínculo salvo." }); await carregar(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function remover(id: number) {
    setBusy(true); setFeedback(null);
    try { await deleteItemSupplier(id); await carregar(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VSUP0130 — Fornecedor Preferencial por Item</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Item</span>
          <input className="fsc-input" style={{ width: 110, height: 32 }} type="number" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
          <button className="fsc-btn fsc-btn-primary" onClick={() => void carregar()} disabled={busy}>Carregar</button></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VSUP0130 — Fornecedor Preferencial por Item" filename="vsup0130" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Vincular fornecedor</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">menor ranking = preferencial</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Fornecedor</label><input className="fsc-input fsc-input-right" type="number" value={form.supplier_code || ""} onChange={(e) => setF("supplier_code", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-1"><label className="fsc-label">Ranking</label><input className="fsc-input fsc-input-right" type="number" value={form.ranking} onChange={(e) => setF("ranking", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Cód. no forn.</label><input className="fsc-input" value={form.supplier_item_code ?? ""} onChange={(e) => setF("supplier_item_code", e.target.value)} /></div>
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Descrição no forn.</label><input className="fsc-input" value={form.supplier_item_desc ?? ""} onChange={(e) => setF("supplier_item_desc", e.target.value)} /></div>
            <div className="fsc-field fsc-col-1"><label className="fsc-label">UM</label><input className="fsc-input" value={form.supplier_uom ?? ""} onChange={(e) => setF("supplier_uom", e.target.value.toUpperCase())} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Lead time (dias)</label><input className="fsc-input fsc-input-right" type="number" value={form.lead_time_days ?? ""} onChange={(e) => setF("lead_time_days", e.target.value ? Number(e.target.value) : undefined)} /></div>
          </div>
          <button className="fsc-btn fsc-btn-primary" style={{ marginTop: 10 }} onClick={() => void salvar()} disabled={busy}>Salvar vínculo</button>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Fornecedores do item</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Ranking</th><th>Fornecedor</th><th>Cód. forn.</th><th>Descrição forn.</th><th>UM</th><th className="fsc-num">Lead time</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="fsc-empty">Nenhum fornecedor. Carregue um item.</td></tr>}
              {[...list].sort((a, b) => a.ranking - b.ranking).map((s) => (
                <tr key={s.id}><td className="fsc-num" style={{ fontWeight: 600 }}>{s.ranking}</td><td>{s.supplier_code}</td><td>{s.supplier_item_code || "—"}</td>
                  <td>{s.supplier_item_desc || "—"}</td><td>{s.supplier_uom || "—"}</td><td className="fsc-num">{s.lead_time_days ?? "—"}</td>
                  <td><button className="fsc-action-btn fsc-delete-btn" onClick={() => s.id && void remover(s.id)}>Excluir</button></td></tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Fornecedores: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
