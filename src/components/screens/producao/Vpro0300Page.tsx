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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Produção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Custo Padrão</span><span className="erp-crumb-code">VPRO0300</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Item</span>
          <input className="erp-input" style={{ width: 110, height: 32 }} type="number" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
          <button className="erp-btn" onClick={() => void consultar()} disabled={busy}>Consultar</button>
          <button className="erp-btn erp-btn-primary" onClick={() => void calcular()} disabled={busy}>{busy ? "..." : "Calcular"}</button></div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VPRO0300 — Custo Padrão" filename="vpro0300" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Custo Padrão</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        {current && (
          <div className="erp-metrics">
            <div className="erp-metric"><div className="erp-metric-label">Material</div><div className="erp-metric-value">{money(current.material_cost)}</div></div>
            <div className="erp-metric"><div className="erp-metric-label">Operação</div><div className="erp-metric-value">{money(current.operation_cost)}</div></div>
            <div className="erp-metric"><div className="erp-metric-label">Overhead</div><div className="erp-metric-value">{money(current.overhead_cost)}</div></div>
            <div className="erp-metric"><div className="erp-metric-label">Total (item {current.item_code})</div><div className="erp-metric-value" style={{ color: "#1e6030" }}>{money(current.total_cost)}</div></div>
          </div>
        )}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Custos padrão salvos — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Item</th><th>Material</th><th>Operação</th><th>Overhead</th><th>Total</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum custo padrão salvo.</td></tr>}
              {list.map((c) => (
                <tr key={c.item_code}>
                  <td style={{ fontWeight: 600 }}>{c.item_code}</td><td>{money(c.material_cost)}</td>
                  <td>{money(c.operation_cost)}</td><td>{money(c.overhead_cost)}</td>
                  <td style={{ fontWeight: 600 }}>{money(c.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Itens: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
