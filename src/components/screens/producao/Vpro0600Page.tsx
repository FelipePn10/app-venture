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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VPRO0600 — Previsão Estatística</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Item</span>
          <input className="fsc-input" style={{ width: 90, height: 32 }} type="number" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
          <span className="fsc-action-label">Períodos à frente</span>
          <input className="fsc-input" style={{ width: 60, height: 32 }} type="number" value={periodsAhead} onChange={(e) => setPeriodsAhead(e.target.value)} />
          <button className="fsc-btn fsc-btn-primary" onClick={() => void calcular()} disabled={busy}>{busy ? "..." : "Prever"}</button></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VPRO0600 — Previsão Estatística" filename="vpro0600" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Histórico</span><div className="fsc-section-banner-line" />
          <button className="fsc-btn fsc-btn-ghost" onClick={addRow}>+ Período</button></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>Período (YYYY-MM)</th><th className="fsc-num">Quantidade</th><th style={{ width: 60 }}></th></tr></thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td><input className="fsc-input" style={{ height: 30, width: 130 }} value={h.period} placeholder="2026-01" onChange={(e) => setH(i, { period: e.target.value })} /></td>
                  <td><input className="fsc-input fsc-input-right" style={{ height: 30, width: 120 }} type="number" value={h.quantity} onChange={(e) => setH(i, { quantity: Number(e.target.value) })} /></td>
                  <td><button className="fsc-action-btn fsc-delete-btn" onClick={() => removeRow(i)} disabled={history.length <= 2}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {result && (
          <>
            <div className="fsc-metrics">
              <div className="fsc-metric"><div className="fsc-metric-label">Modelo</div><div className="fsc-metric-value" style={{ fontSize: 15 }}>{result.model_used}</div></div>
              <div className="fsc-metric"><div className="fsc-metric-label">MAPE</div><div className="fsc-metric-value">{num(result.mape)}%</div></div>
              <div className="fsc-metric"><div className="fsc-metric-label">Item</div><div className="fsc-metric-value">{result.item_code}</div></div>
            </div>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Previsão</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{result.forecasts.length} período(s)</span></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th>Período</th><th className="fsc-num">Quantidade prevista</th></tr></thead>
                <tbody>
                  {result.forecasts.map((f, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{f.period}</td><td className="fsc-num">{num(f.quantity)}</td></tr>)}
                </tbody>
              </table>
            </div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Histórico: <strong>{history.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
