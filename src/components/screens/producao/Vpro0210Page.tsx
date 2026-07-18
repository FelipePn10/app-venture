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
  const cls = x.includes("done") || x.includes("conclu") ? "erp-badge-green" : x.includes("progress") ? "erp-badge-blue" : "erp-badge-amber";
  return <span className={`erp-badge ${cls}`}>{s || "—"}</span>;
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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Produção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">APS (Sequenciamento / Gantt)</span><span className="erp-crumb-code">VPRO0210</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Planejamento</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void sequenciar()} disabled={busy}>{busy ? "..." : "Sequenciar ordens"}</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Gantt</span>
          <button className={`erp-btn ${mode === "order" ? "erp-btn-primary" : "erp-btn-ghost"}`} onClick={() => setMode("order")}>Por ordem</button>
          <button className={`erp-btn ${mode === "centro" ? "erp-btn-primary" : "erp-btn-ghost"}`} onClick={() => setMode("centro")}>Por centro</button>
          <button className={`erp-btn ${mode === "mes" ? "erp-btn-primary" : "erp-btn-ghost"}`} onClick={() => setMode("mes")}>Quadro do mês</button></div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VPRO0210 — APS (Sequenciamento / Gantt)" filename="vpro0210" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">APS</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode !== "mes" && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body">
              
                {mode === "order" ? (
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Ordem de Produção (ID)</label>
                    <input className="erp-input num" type="number" value={orderId} onChange={(e) => setOrderId(e.target.value)} /></div>
                ) : (
                  <>
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Centro (ID)</label><input className="erp-input num" type="number" value={wcId} onChange={(e) => setWcId(e.target.value)} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">De</label><input className="erp-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Até</label><input className="erp-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
                  </>
                )}
                <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void verGantt()} disabled={busy}>Ver Gantt</button></div>
              
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Gantt — <span style={{fontWeight:400,opacity:0.65}}>{rows.length} operação(ões)</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Ordem</th><th>Pos.</th><th>Centro</th><th>Início</th><th>Fim</th><th>Horas</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Sem agendamento. Sequencie e consulte.</td></tr>}
                  {rows.map((r) => (
                    <tr key={r.sequence_id}>
                      <td style={{ fontWeight: 600 }}>{r.production_order_id}</td><td>{r.sequence_position}</td><td>{r.work_center_id}</td>
                      <td>{dt(r.scheduled_start)}</td><td>{dt(r.scheduled_end)}</td><td>{r.duration_hours}</td><td>{statusPill(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
            </div>
          </>
        )}

        {mode === "mes" && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body">
              
                <div className="erp-field erp-c2"><label className="erp-label">Ano</label><input className="erp-input num" type="number" value={year} onChange={(e) => setYear(e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Mês</label><input className="erp-input num" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Agrupar por</label>
                  <select className="erp-input" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GanttGroupBy)}><option value="work_center">Centro de trabalho</option><option value="order">Ordem de produção</option></select></div>
                <div className="erp-field erp-c5" style={{ alignSelf: "end", display: "flex", gap: 8 }}>
                  <button className="erp-btn erp-btn-primary" onClick={() => void verQuadro()} disabled={busy}>Ver quadro</button>
                  <button className="erp-btn" onClick={() => void baixarExport("svg")} disabled={busy}>Export SVG</button>
                  <button className="erp-btn" onClick={() => void baixarExport("pdf")} disabled={busy}>Export PDF</button>
                </div>
              
            </div></div>

            {board && (
              <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label">Linhas ({groupBy === "order" ? "OFs" : "centros"})</label><input className="erp-input num" value={board.rows.length} readOnly /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Dias sobrecarregados</label><input className="erp-input num" value={board.overloaded_days} readOnly /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Barras atrasadas</label><input className="erp-input num" value={board.late_bars} readOnly /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Dependências</label><input className="erp-input num" value={board.dependencies.length} readOnly /></div>
              </div></div>
            )}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Barras do quadro — <span style={{fontWeight:400,opacity:0.65}}>{boardBars.length} barra(s)</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Linha</th><th>Rótulo</th><th>Seq.</th><th>Centro</th><th>Início</th><th>Fim</th><th>% concl.</th><th>Atrasada</th></tr></thead>
                <tbody>
                  {boardBars.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Sem barras. Sequencie (APS) e clique em Ver quadro.</td></tr>}
                  {boardBars.map((b, i) => (
                    <tr key={i} style={b.color_hex ? { borderLeft: `3px solid ${b.color_hex}` } : undefined}>
                      <td>{b.rowLabel}</td><td style={{ fontWeight: 600 }}>{b.label}</td><td>{b.sequence_id ?? "—"}</td><td>{b.work_center_id ?? "—"}</td>
                      <td>{dt(b.start)}</td><td>{dt(b.end)}</td><td>{b.percent_done != null ? `${Math.round(b.percent_done)}%` : "—"}</td>
                      <td>{b.is_late ? <span className="erp-badge warn">Atrasada</span> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
            </div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Remanejar (arraste manual) — <span style={{fontWeight:400,opacity:0.65}}>move a sequência + cascata finish-start</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Sequência (ID)</label><input className="erp-input num" type="number" value={resForm.sequenceId} onChange={(e) => setResForm((s) => ({ ...s, sequenceId: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Novo início</label><input className="erp-input" type="datetime-local" value={resForm.newStart} onChange={(e) => setResForm((s) => ({ ...s, newStart: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Novo centro (ID)</label><input className="erp-input num" type="number" value={resForm.newWc} onChange={(e) => setResForm((s) => ({ ...s, newWc: e.target.value }))} /></div>
              <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><label className="erp-label" style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={resForm.cascade} onChange={(e) => setResForm((s) => ({ ...s, cascade: e.target.checked }))} />Cascata</label></div>
              <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={() => void remanejar()} disabled={busy}>Remanejar</button></div>
            </div></div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Operações: <strong>{rows.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
