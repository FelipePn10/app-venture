import { useState } from "react";
import { type ItemConversionDTO, listItemConversions, upsertItemConversion, deleteItemConversion, convertItem } from "@/services/purchasingMasterService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: ItemConversionDTO = { item_code: 0, from_uom: "", to_uom: "", factor: 1 };

export function Vsup0110Page(): JSX.Element {
  const [itemCode, setItemCode] = useState("");
  const [list, setList] = useState<ItemConversionDTO[]>([]);
  const [form, setForm] = useState<ItemConversionDTO>(EMPTY);
  const [conv, setConv] = useState({ from: "", to: "", qty: "1", result: "" });
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  async function carregar() {
    const c = Number(itemCode); if (!c) { setFeedback({ type: "error", message: "Informe o item." }); return; }
    setBusy(true); setFeedback(null);
    try { setList(await listItemConversions(c)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const setF = <K extends keyof ItemConversionDTO>(k: K, v: ItemConversionDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  async function salvar() {
    const c = Number(itemCode);
    if (!c || !form.from_uom.trim() || !form.to_uom.trim() || !form.factor) { setFeedback({ type: "error", message: "Item, UMs e fator são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await upsertItemConversion({ ...form, item_code: c }); setForm(EMPTY); setFeedback({ type: "success", message: "Conversão salva." }); await carregar(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function remover(id: number) {
    setBusy(true); setFeedback(null);
    try { await deleteItemConversion(id); await carregar(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function converter() {
    const c = Number(itemCode);
    if (!c || !conv.from || !conv.to) { setFeedback({ type: "error", message: "Informe item, de e para." }); return; }
    setBusy(true); setFeedback(null);
    try { const r = await convertItem(c, conv.from, conv.to, Number(conv.qty) || 1); setConv((p) => ({ ...p, result: JSON.stringify(r) })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VSUP0110 — Conversão de UM por Item</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Item</span>
          <input className="fsc-input" style={{ width: 110, height: 32 }} type="number" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
          <button className="fsc-btn fsc-btn-primary" onClick={() => void carregar()} disabled={busy}>Carregar</button></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VSUP0110 — Conversão de UM por Item" filename="vsup0110" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Nova conversão</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">1 {form.from_uom || "UM"} = {form.factor} {form.to_uom || "UM"}</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">De (UM)</label><input className="fsc-input" value={form.from_uom} placeholder="CX" onChange={(e) => setF("from_uom", e.target.value.toUpperCase())} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Para (UM)</label><input className="fsc-input" value={form.to_uom} placeholder="UN" onChange={(e) => setF("to_uom", e.target.value.toUpperCase())} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Fator</label><input className="fsc-input fsc-input-right" type="number" step="0.0001" value={form.factor} onChange={(e) => setF("factor", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void salvar()} disabled={busy}>Salvar</button></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Conversões do item</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>De</th><th>Para</th><th className="fsc-num">Fator</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={4} className="fsc-empty">Nenhuma conversão. Carregue um item.</td></tr>}
              {list.map((c) => (
                <tr key={c.id}><td style={{ fontWeight: 600 }}>{c.from_uom}</td><td>{c.to_uom}</td><td className="fsc-num">{c.factor}</td>
                  <td><button className="fsc-action-btn fsc-delete-btn" onClick={() => c.id && void remover(c.id)}>Excluir</button></td></tr>
              ))}
            </tbody>
          </table>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Resolver conversão</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label">De</label><input className="fsc-input" value={conv.from} onChange={(e) => setConv((p) => ({ ...p, from: e.target.value.toUpperCase() }))} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Para</label><input className="fsc-input" value={conv.to} onChange={(e) => setConv((p) => ({ ...p, to: e.target.value.toUpperCase() }))} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Qtde</label><input className="fsc-input fsc-input-right" type="number" value={conv.qty} onChange={(e) => setConv((p) => ({ ...p, qty: e.target.value }))} /></div>
            <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-ghost" style={{ width: "100%" }} onClick={() => void converter()} disabled={busy}>Converter</button></div>
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Resultado</label><input className="fsc-input" readOnly value={conv.result} /></div>
          </div>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Conversões: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
