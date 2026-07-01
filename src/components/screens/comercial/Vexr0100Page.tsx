import { useState } from "react";
import { type RescheduleDTO, createReschedule, listReschedulesByOrder } from "@/services/deliveryRescheduleService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: RescheduleDTO = { sales_order_code: 0, item_code: 0, old_date: today(), new_date: today(), reason: "" };

export function Vexr0100Page(): JSX.Element {
  const [orderCode, setOrderCode] = useState("");
  const [list, setList] = useState<RescheduleDTO[]>([]);
  const [form, setForm] = useState<RescheduleDTO>(EMPTY);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  async function consultar() {
    const c = Number(orderCode);
    if (!c) { setFeedback({ type: "error", message: "Informe o código do pedido." }); return; }
    setBusy(true); setFeedback(null);
    try { setList(await listReschedulesByOrder(c)); setForm((p) => ({ ...p, sales_order_code: c })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function registrar() {
    if (!form.sales_order_code || !form.item_code) { setFeedback({ type: "error", message: "Pedido e item são obrigatórios." }); return; }
    if (!form.reason?.trim()) { setFeedback({ type: "error", message: "Motivo da reprogramação é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    try { await createReschedule(form); setFeedback({ type: "success", message: "Reprogramação registrada." }); setForm((p) => ({ ...EMPTY, sales_order_code: p.sales_order_code })); await listReschedulesByOrder(form.sales_order_code).then(setList); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VEXR0100 — Reprogramação de Entrega</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Pedido</span>
          <input className="fsc-input fsc-input-right" style={{ width: 110, height: 32 }} type="number" value={orderCode} placeholder="código" onChange={(e) => setOrderCode(e.target.value)} />
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void consultar()} disabled={busy}>Consultar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VEXR0100 — Reprogramação de Entrega" filename="vexr0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Nova reprogramação</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Pedido</label><input className="fsc-input fsc-input-right" type="number" value={form.sales_order_code || ""} onChange={(e) => setForm((p) => ({ ...p, sales_order_code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={form.item_code || ""} onChange={(e) => setForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Data original</label><input className="fsc-input" type="date" value={form.old_date} onChange={(e) => setForm((p) => ({ ...p, old_date: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Nova data</label><input className="fsc-input" type="date" value={form.new_date} onChange={(e) => setForm((p) => ({ ...p, new_date: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-4"><label className="fsc-label fsc-label-req">Motivo</label><input className="fsc-input" value={form.reason ?? ""} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={() => void registrar()} disabled={busy}>Registrar reprogramação</button></div>
        </div></div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Histórico do pedido {form.sales_order_code || "—"}</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Item</th><th>Data original</th><th>Nova data</th><th>Motivo</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={4} className="fsc-empty">Nenhuma reprogramação para este pedido.</td></tr>}
              {list.map((r, i) => <tr key={i}><td className="fsc-num">{r.item_code}</td><td>{r.old_date?.slice(0, 10)}</td><td>{r.new_date?.slice(0, 10)}</td><td>{r.reason || "—"}</td></tr>)}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Reprogramações: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
