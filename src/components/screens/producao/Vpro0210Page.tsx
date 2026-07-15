import { useState } from "react";
import {
  type GanttEntry, type GanttBoard, type GanttBar, type GanttGroupBy,
  sequenceAps, ganttByOrder, ganttByWorkCenter,
  ganttMonth, rescheduleGantt, exportGanttMonth,
} from "@/services/apsService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Mode = "order" | "centro" | "mes";
const dt = (s?: string) => (s ? s.replace("T", " ").slice(0, 16) : "—");
const now = new Date();

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
  // Quadro mensal (§3.1)
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [groupBy, setGroupBy] = useState<GanttGroupBy>("work_center");
  const [board, setBoard] = useState<GanttBoard | null>(null);
  // Reschedule (drag-drop manual)
  const [resForm, setResForm] = useState({ sequenceId: "", newStart: "", newWc: "", cascade: true });

  async function verQuadro() {
    setBusy(true); setFeedback(null);
    try {
      const b = await ganttMonth(Number(year), Number(month), groupBy);
      setBoard(b);
      setFeedback({ type: "info", message: `Quadro ${month}/${year}: ${b.rows.length} linha(s), ${b.overloaded_days} dia(s) sobrecarregado(s), ${b.late_bars} barra(s) atrasada(s).` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function baixarExport(format: "svg" | "pdf") {
    setBusy(true); setFeedback(null);
    try {
      const blob = await exportGanttMonth(Number(year), Number(month), format, groupBy);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `aps-gantt-${year}-${month}.${format}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setFeedback({ type: "success", message: `Quadro exportado (${format.toUpperCase()}).` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function remanejar() {
    const sid = Number(resForm.sequenceId);
    if (!sid || !resForm.newStart) { setFeedback({ type: "error", message: "Informe a sequência e o novo início." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const r = await rescheduleGantt(sid, new Date(resForm.newStart).toISOString(), { newWorkCenterId: Number(resForm.newWc) || undefined, cascade: resForm.cascade });
      const warn = r.warnings.length ? ` ⚠️ ${r.warnings.length} aviso(s) de capacidade.` : "";
      setFeedback({ type: r.warnings.length ? "info" : "success", message: `Sequência ${sid} remanejada — ${r.shifted.length} operação(ões) movida(s).${warn}` });
      await verQuadro();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const boardBars: (GanttBar & { rowLabel: string })[] = board ? board.rows.flatMap((row) => row.bars.map((b) => ({ ...b, rowLabel: row.label }))) : [];

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
          <button className={`fsc-btn ${mode === "centro" ? "fsc-btn-primary" : "fsc-btn-ghost"}`} onClick={() => setMode("centro")}>Por centro</button>
          <button className={`fsc-btn ${mode === "mes" ? "fsc-btn-primary" : "fsc-btn-ghost"}`} onClick={() => setMode("mes")}>Quadro do mês</button></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VPRO0210 — APS (Sequenciamento / Gantt)" filename="vpro0210" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode !== "mes" && (
          <>
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
          </>
        )}

        {mode === "mes" && (
          <>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Ano</label><input className="fsc-input fsc-input-right" type="number" value={year} onChange={(e) => setYear(e.target.value)} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Mês</label><input className="fsc-input fsc-input-right" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(e.target.value)} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Agrupar por</label>
                  <select className="fsc-input" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GanttGroupBy)}><option value="work_center">Centro de trabalho</option><option value="order">Ordem de produção</option></select></div>
                <div className="fsc-field fsc-col-5" style={{ alignSelf: "end", display: "flex", gap: 8 }}>
                  <button className="fsc-btn fsc-btn-primary" onClick={() => void verQuadro()} disabled={busy}>Ver quadro</button>
                  <button className="fsc-btn fsc-btn-ghost" onClick={() => void baixarExport("svg")} disabled={busy}>Export SVG</button>
                  <button className="fsc-btn fsc-btn-ghost" onClick={() => void baixarExport("pdf")} disabled={busy}>Export PDF</button>
                </div>
              </div>
            </div></div>

            {board && (
              <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Linhas ({groupBy === "order" ? "OFs" : "centros"})</label><input className="fsc-input fsc-input-right" value={board.rows.length} readOnly /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Dias sobrecarregados</label><input className="fsc-input fsc-input-right" value={board.overloaded_days} readOnly /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Barras atrasadas</label><input className="fsc-input fsc-input-right" value={board.late_bars} readOnly /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Dependências</label><input className="fsc-input fsc-input-right" value={board.dependencies.length} readOnly /></div>
              </div></div></div>
            )}

            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Barras do quadro</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{boardBars.length} barra(s)</span></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th>Linha</th><th>Rótulo</th><th className="fsc-num">Seq.</th><th>Centro</th><th>Início</th><th>Fim</th><th className="fsc-num">% concl.</th><th>Atrasada</th></tr></thead>
                <tbody>
                  {boardBars.length === 0 && <tr><td colSpan={8} className="fsc-empty">Sem barras. Sequencie (APS) e clique em Ver quadro.</td></tr>}
                  {boardBars.map((b, i) => (
                    <tr key={i} style={b.color_hex ? { borderLeft: `3px solid ${b.color_hex}` } : undefined}>
                      <td>{b.rowLabel}</td><td style={{ fontWeight: 600 }}>{b.label}</td><td className="fsc-num">{b.sequence_id ?? "—"}</td><td>{b.work_center_id ?? "—"}</td>
                      <td>{dt(b.start)}</td><td>{dt(b.end)}</td><td className="fsc-num">{b.percent_done != null ? `${Math.round(b.percent_done)}%` : "—"}</td>
                      <td>{b.is_late ? <span className="fsc-pill fsc-pill-amber">Atrasada</span> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>

            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Remanejar (arraste manual)</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">move a sequência + cascata finish-start</span></div>
            <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
              <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Sequência (ID)</label><input className="fsc-input fsc-input-right" type="number" value={resForm.sequenceId} onChange={(e) => setResForm((s) => ({ ...s, sequenceId: e.target.value }))} /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Novo início</label><input className="fsc-input" type="datetime-local" value={resForm.newStart} onChange={(e) => setResForm((s) => ({ ...s, newStart: e.target.value }))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Novo centro (ID)</label><input className="fsc-input fsc-input-right" type="number" value={resForm.newWc} onChange={(e) => setResForm((s) => ({ ...s, newWc: e.target.value }))} /></div>
              <div className="fsc-field fsc-col-2" style={{ alignSelf: "end" }}><label className="fsc-label" style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={resForm.cascade} onChange={(e) => setResForm((s) => ({ ...s, cascade: e.target.checked }))} />Cascata</label></div>
              <div className="fsc-field fsc-col-3" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={() => void remanejar()} disabled={busy}>Remanejar</button></div>
            </div></div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Operações: <strong>{rows.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
