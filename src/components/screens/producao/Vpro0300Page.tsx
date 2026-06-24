import { useState, useCallback, useEffect } from "react";
import { type StandardCost, calculateStandardCost, getStandardCost, listStandardCosts } from "@/services/standardCostService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Vpro0300Page(): JSX.Element {
  const [itemCode, setItemCode] = useState("");
  const [current, setCurrent] = useState<StandardCost | null>(null);
  const [list, setList] = useState<StandardCost[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listStandardCosts()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar custos padrão.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function calcular() {
    const c = Number(itemCode);
    if (!c) { setFeedback({ type: "error", message: "Informe o código do item." }); return; }
    setBusy(true); setFeedback(null);
    try { setCurrent(await calculateStandardCost(c)); setFeedback({ type: "success", message: `Custo padrão do item ${c} calculado.` }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function consultar() {
    const c = Number(itemCode);
    if (!c) { setFeedback({ type: "error", message: "Informe o código do item." }); return; }
    setBusy(true); setFeedback(null);
    try { setCurrent(await getStandardCost(c)); setFeedback({ type: "info", message: `Custo padrão do item ${c} carregado.` }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Custo não encontrado.") }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VPRO0300 — Custo Padrão</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Item</span>
          <input className="fsc-input" style={{ width: 110, height: 32 }} type="number" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void consultar()} disabled={busy}>Consultar</button>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void calcular()} disabled={busy}>{busy ? "..." : "Calcular"}</button></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VPRO0300 — Custo Padrão" filename="vpro0300" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        {current && (
          <div className="fsc-metrics">
            <div className="fsc-metric"><div className="fsc-metric-label">Material</div><div className="fsc-metric-value">{money(current.material_cost)}</div></div>
            <div className="fsc-metric"><div className="fsc-metric-label">Operação</div><div className="fsc-metric-value">{money(current.operation_cost)}</div></div>
            <div className="fsc-metric"><div className="fsc-metric-label">Overhead</div><div className="fsc-metric-value">{money(current.overhead_cost)}</div></div>
            <div className="fsc-metric"><div className="fsc-metric-label">Total (item {current.item_code})</div><div className="fsc-metric-value" style={{ color: "#1e6030" }}>{money(current.total_cost)}</div></div>
          </div>
        )}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Custos padrão salvos</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>Item</th><th className="fsc-num">Material</th><th className="fsc-num">Operação</th><th className="fsc-num">Overhead</th><th className="fsc-num">Total</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhum custo padrão salvo.</td></tr>}
              {list.map((c) => (
                <tr key={c.item_code}>
                  <td style={{ fontWeight: 600 }}>{c.item_code}</td><td className="fsc-num">{money(c.material_cost)}</td>
                  <td className="fsc-num">{money(c.operation_cost)}</td><td className="fsc-num">{money(c.overhead_cost)}</td>
                  <td className="fsc-num" style={{ fontWeight: 600 }}>{money(c.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Itens: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
