import { useState } from "react";
import { type GanttEntry, sequenceAps, ganttByOrder, ganttByWorkCenter } from "@/services/apsService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Mode = "order" | "centro";
const dt = (s?: string) => (s ? s.replace("T", " ").slice(0, 16) : "—");

function statusPill(s: string): JSX.Element {
  const x = s.toLowerCase();
  const cls = x.includes("done") || x.includes("conclu") ? "fsc-pill-green" : x.includes("progress") ? "fsc-pill-blue" : "fsc-pill-amber";
  return <span className={`fsc-pill ${cls}`}>{s || "—"}</span>;
}

export function Vpro0210Page(): JSX.Element {
  const [mode, setMode] = useState<Mode>("order");
  const [orderId, setOrderId] = useState("");
  const [wcId, setWcId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<GanttEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  async function sequenciar() {
    setBusy(true); setFeedback(null);
    try { await sequenceAps(); setFeedback({ type: "success", message: "Sequenciamento das ordens abertas gerado (EDD)." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function verGantt() {
    setBusy(true); setFeedback(null);
    try {
      if (mode === "order") {
        if (!orderId) { setFeedback({ type: "error", message: "Informe a ordem." }); setBusy(false); return; }
        setRows(await ganttByOrder(Number(orderId)));
      } else {
        if (!wcId || !from || !to) { setFeedback({ type: "error", message: "Informe centro, de e até." }); setBusy(false); return; }
        setRows(await ganttByWorkCenter(Number(wcId), from, to));
      }
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VPRO0210 — APS (Sequenciamento / Gantt)</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Planejamento</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void sequenciar()} disabled={busy}>{busy ? "..." : "Sequenciar ordens"}</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Gantt</span>
          <button className={`fsc-btn ${mode === "order" ? "fsc-btn-primary" : "fsc-btn-ghost"}`} onClick={() => setMode("order")}>Por ordem</button>
          <button className={`fsc-btn ${mode === "centro" ? "fsc-btn-primary" : "fsc-btn-ghost"}`} onClick={() => setMode("centro")}>Por centro</button></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VPRO0210 — APS (Sequenciamento / Gantt)" filename="vpro0210" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            {mode === "order" ? (
              <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Ordem de Produção (ID)</label>
                <input className="fsc-input fsc-input-right" type="number" value={orderId} onChange={(e) => setOrderId(e.target.value)} /></div>
            ) : (
              <>
                <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Centro (ID)</label><input className="fsc-input fsc-input-right" type="number" value={wcId} onChange={(e) => setWcId(e.target.value)} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">De</label><input className="fsc-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Até</label><input className="fsc-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
              </>
            )}
            <div className="fsc-field fsc-col-3" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void verGantt()} disabled={busy}>Ver Gantt</button></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Gantt</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{rows.length} operação(ões)</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>Ordem</th><th className="fsc-num">Pos.</th><th>Centro</th><th>Início</th><th>Fim</th><th className="fsc-num">Horas</th><th>Status</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="fsc-empty">Sem agendamento. Sequencie e consulte.</td></tr>}
              {rows.map((r) => (
                <tr key={r.sequence_id}>
                  <td style={{ fontWeight: 600 }}>{r.production_order_id}</td><td className="fsc-num">{r.sequence_position}</td><td>{r.work_center_id}</td>
                  <td>{dt(r.scheduled_start)}</td><td>{dt(r.scheduled_end)}</td><td className="fsc-num">{r.duration_hours}</td><td>{statusPill(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Operações: <strong>{rows.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
