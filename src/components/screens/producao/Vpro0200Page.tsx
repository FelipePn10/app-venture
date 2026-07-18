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
        if (!p || !wcId) { setFeedback({ type: "error", message: "Informe o plano e o centro." }); setBusy(false); return; }
        setRows(await getWorkCenterCapacity(p, Number(wcId), from, to));
      }
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Produção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">CRP (Capacity Requirements Planning)</span><span className="erp-crumb-code">VPRO0200</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Plano MRP</span>
          <input className="erp-input" style={{ width: 100, height: 32 }} type="number" value={planCode} onChange={(e) => setPlanCode(e.target.value)} />
          <button className="erp-btn erp-btn-primary" onClick={() => void calcular()} disabled={busy}>{busy ? "..." : "Calcular CRP"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VPRO0200 — CRP (Capacity Requirements Planning)" filename="vpro0200" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">CRP</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        {summary && (
          <div className="erp-metrics">
            <div className="erp-metric"><div className="erp-metric-label">Plano</div><div className="erp-metric-value">{summary.plan_code}</div></div>
            <div className="erp-metric"><div className="erp-metric-label">Registros</div><div className="erp-metric-value">{summary.total_entries}</div></div>
            <div className="erp-metric"><div className="erp-metric-label">Sobrecargas</div><div className="erp-metric-value" style={{ color: summary.overload_count ? "#b91c1c" : "#1e6030" }}>{summary.overload_count}</div></div>
          </div>
        )}
        <div className="erp-fieldset">
          <div className="erp-tabs">
            <button className={`erp-tab ${tab === "todos" ? "active" : ""}`} onClick={() => void ver("todos")}>Todos</button>
            <button className={`erp-tab ${tab === "overload" ? "active" : ""}`} onClick={() => void ver("overload")}>Sobrecarga</button>
            <button className={`erp-tab ${tab === "centro" ? "active" : ""}`} onClick={() => setTab("centro")}>Por centro</button>
          </div>
          {tab === "centro" && (
            <div className="erp-fieldset-body">
              
                <div className="erp-field erp-c3"><label className="erp-label">Centro (ID)</label><input className="erp-input num" type="number" value={wcId} onChange={(e) => setWcId(e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">De</label><input className="erp-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Até</label><input className="erp-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
                <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void ver("centro")} disabled={busy}>Consultar</button></div>
              
            </div>
          )}
          <div className="erp-fieldset-body">
            <table className="erp-grid">
              <thead><tr><th>Centro</th><th>Data</th><th>Necessário (h)</th><th>Disponível (h)</th><th>Carga %</th><th>Status</th></tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum registro. Calcule um plano.</td></tr>}
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.work_center_id}</td><td>{r.req_date?.slice(0, 10)}</td>
                    <td>{num(r.required_hours)}</td><td>{num(r.available_hours)}</td>
                    <td style={{ fontWeight: 600, color: r.is_overloaded ? "#b91c1c" : "#1e6030" }}>{num(r.load_pct)}</td>
                    <td>{r.is_overloaded ? <span className="erp-badge err">Sobrecarga</span> : <span className="erp-badge ok">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Registros: <strong>{rows.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
