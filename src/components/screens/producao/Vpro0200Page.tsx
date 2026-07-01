import { useState } from "react";
import { type CrpEntry, type CrpSummary, calculateCrp, listCrpPlan, listCrpOverload, getWorkCenterCapacity } from "@/services/crpService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "todos" | "overload" | "centro";
const num = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function Vpro0200Page(): JSX.Element {
  const [planCode, setPlanCode] = useState("");
  const [tab, setTab] = useState<Tab>("todos");
  const [summary, setSummary] = useState<CrpSummary | null>(null);
  const [rows, setRows] = useState<CrpEntry[]>([]);
  const [wcId, setWcId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  async function calcular() {
    const p = Number(planCode);
    if (!p) { setFeedback({ type: "error", message: "Informe o código do plano MRP." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const s = await calculateCrp(p); setSummary(s);
      setFeedback({ type: "success", message: `CRP calculado: ${s.total_entries} registros, ${s.overload_count} sobrecarga(s).` });
      setTab("todos");
      try { setRows(await listCrpPlan(p)); } catch { setRows([]); }
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function ver(t: Tab) {
    const p = Number(planCode);
    if ((t === "todos" || t === "overload") && !p) { setFeedback({ type: "error", message: "Informe o plano." }); return; }
    setBusy(true); setFeedback(null); setTab(t);
    try {
      if (t === "todos") setRows(await listCrpPlan(p));
      else if (t === "overload") setRows(await listCrpOverload(p));
      else {
        if (!wcId || !from || !to) { setFeedback({ type: "error", message: "Informe centro, de e até." }); setBusy(false); return; }
        setRows(await getWorkCenterCapacity(Number(wcId), from, to));
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
        <span className="fsc-screen-title">VPRO0200 — CRP (Capacity Requirements Planning)</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Plano MRP</span>
          <input className="fsc-input" style={{ width: 100, height: 32 }} type="number" value={planCode} onChange={(e) => setPlanCode(e.target.value)} />
          <button className="fsc-btn fsc-btn-primary" onClick={() => void calcular()} disabled={busy}>{busy ? "..." : "Calcular CRP"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VPRO0200 — CRP (Capacity Requirements Planning)" filename="vpro0200" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        {summary && (
          <div className="fsc-metrics">
            <div className="fsc-metric"><div className="fsc-metric-label">Plano</div><div className="fsc-metric-value">{summary.plan_code}</div></div>
            <div className="fsc-metric"><div className="fsc-metric-label">Registros</div><div className="fsc-metric-value">{summary.total_entries}</div></div>
            <div className="fsc-metric"><div className="fsc-metric-label">Sobrecargas</div><div className="fsc-metric-value" style={{ color: summary.overload_count ? "#b91c1c" : "#1e6030" }}>{summary.overload_count}</div></div>
          </div>
        )}
        <div className="fsc-card">
          <div className="fsc-tabs">
            <button className={`fsc-tab ${tab === "todos" ? "active" : ""}`} onClick={() => void ver("todos")}>Todos</button>
            <button className={`fsc-tab ${tab === "overload" ? "active" : ""}`} onClick={() => void ver("overload")}>Sobrecarga</button>
            <button className={`fsc-tab ${tab === "centro" ? "active" : ""}`} onClick={() => setTab("centro")}>Por centro</button>
          </div>
          {tab === "centro" && (
            <div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Centro (ID)</label><input className="fsc-input fsc-input-right" type="number" value={wcId} onChange={(e) => setWcId(e.target.value)} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">De</label><input className="fsc-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Até</label><input className="fsc-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
                <div className="fsc-field fsc-col-3" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void ver("centro")} disabled={busy}>Consultar</button></div>
              </div>
            </div>
          )}
          <div className="fsc-results-wrap">
            <table className="fsc-table">
              <thead><tr><th>Centro</th><th>Data</th><th className="fsc-num">Necessário (h)</th><th className="fsc-num">Disponível (h)</th><th className="fsc-num">Carga %</th><th>Status</th></tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhum registro. Calcule um plano.</td></tr>}
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.work_center_id}</td><td>{r.req_date?.slice(0, 10)}</td>
                    <td className="fsc-num">{num(r.required_hours)}</td><td className="fsc-num">{num(r.available_hours)}</td>
                    <td className="fsc-num" style={{ fontWeight: 600, color: r.is_overloaded ? "#b91c1c" : "#1e6030" }}>{num(r.load_pct)}</td>
                    <td>{r.is_overloaded ? <span className="fsc-pill fsc-pill-red">Sobrecarga</span> : <span className="fsc-pill fsc-pill-green">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Registros: <strong>{rows.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
