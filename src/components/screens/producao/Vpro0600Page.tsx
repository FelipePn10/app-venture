import { useState } from "react";
import { type HistoryPoint, type ForecastResult, statisticalForecast } from "@/services/forecastService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const num = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const SEED: HistoryPoint[] = [
  { period: "2026-01", quantity: 120 }, { period: "2026-02", quantity: 135 },
  { period: "2026-03", quantity: 118 }, { period: "2026-04", quantity: 142 }, { period: "2026-05", quantity: 130 },
];

export function Vpro0600Page(): JSX.Element {
  const [itemCode, setItemCode] = useState("1001");
  const [periodsAhead, setPeriodsAhead] = useState("3");
  const [history, setHistory] = useState<HistoryPoint[]>(SEED);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  function setH(i: number, patch: Partial<HistoryPoint>) { setHistory((p) => p.map((h, idx) => (idx === i ? { ...h, ...patch } : h))); }
  function addRow() { setHistory((p) => [...p, { period: "", quantity: 0 }]); }
  function removeRow(i: number) { setHistory((p) => p.filter((_, idx) => idx !== i)); }

  async function calcular() {
    const c = Number(itemCode); const pa = Number(periodsAhead);
    if (!c) { setFeedback({ type: "error", message: "Informe o código do item." }); return; }
    const hist = history.filter((h) => h.period.trim());
    if (hist.length < 2) { setFeedback({ type: "error", message: "Informe ao menos 2 períodos de histórico." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const r = await statisticalForecast({ item_code: c, history: hist, periods_ahead: pa || 1 });
      setResult(r); setFeedback({ type: "success", message: `Modelo selecionado: ${r.model_used} (MAPE ${num(r.mape)}%).` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Produção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Previsão Estatística</span><span className="erp-crumb-code">VPRO0600</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Item</span>
          <input className="erp-input" style={{ width: 90, height: 32 }} type="number" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
          <span className="erp-tgroup-label">Períodos à frente</span>
          <input className="erp-input" style={{ width: 60, height: 32 }} type="number" value={periodsAhead} onChange={(e) => setPeriodsAhead(e.target.value)} />
          <button className="erp-btn erp-btn-primary" onClick={() => void calcular()} disabled={busy}>{busy ? "..." : "Prever"}</button></div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VPRO0600 — Previsão Estatística" filename="vpro0600" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Previsão Estatística</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Histórico <button className="erp-btn" onClick={addRow}>+ Período</button></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Período (YYYY-MM)</th><th>Quantidade</th><th style={{ width: 60 }}></th></tr></thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td><input className="erp-input" style={{ height: 30, width: 130 }} value={h.period} placeholder="2026-01" onChange={(e) => setH(i, { period: e.target.value })} /></td>
                  <td><input className="erp-input num" style={{ height: 30, width: 120 }} type="number" value={h.quantity} onChange={(e) => setH(i, { quantity: Number(e.target.value) })} /></td>
                  <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => removeRow(i)} disabled={history.length <= 2}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>

        {result && (
          <>
            <div className="erp-metrics">
              <div className="erp-metric"><div className="erp-metric-label">Modelo</div><div className="erp-metric-value" style={{ fontSize: 15 }}>{result.model_used}</div></div>
              <div className="erp-metric"><div className="erp-metric-label">MAPE</div><div className="erp-metric-value">{num(result.mape)}%</div></div>
              <div className="erp-metric"><div className="erp-metric-label">Item</div><div className="erp-metric-value">{result.item_code}</div></div>
            </div>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Previsão — <span style={{fontWeight:400,opacity:0.65}}>{result.forecasts.length} período(s)</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Período</th><th>Quantidade prevista</th></tr></thead>
                <tbody>
                  {result.forecasts.map((f, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{f.period}</td><td>{num(f.quantity)}</td></tr>)}
                </tbody>
              </table>
            </div></div></div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Histórico: <strong>{history.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
