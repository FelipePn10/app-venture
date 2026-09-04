import { useState, useCallback, useMemo } from "react";
import {
  type ActualDemandDTO,
  type ActualSource,
  type SalesForecastDTO,
  listActuals,
  listForecasts,
} from "@/services/salesForecastService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

/**
 * VPRE0301 — Previsto × Realizado do ano, consolidado por item.
 *
 * O previsto vem de `/api/sales-forecast/list/{year}` e o realizado de
 * `/api/sales-forecast/actuals`, que soma pedidos e/ou faturamento conforme a
 * fonte escolhida. A tela cruza os dois e mostra a diferença e o percentual de
 * atendimento da previsão.
 */
export function Vpre0301Page(): JSX.Element {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(String(thisYear));
  const [raw, setRaw] = useState<SalesForecastDTO[]>([]);
  const [actuals, setActuals] = useState<ActualDemandDTO[]>([]);
  const [source, setSource] = useState<ActualSource>("BOTH");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const consultar = () => run(async () => {
    // Previsto e realizado são lidos juntos: a comparação só faz sentido com os
    // dois lados do mesmo ano e da mesma fonte.
    const [previsto, realizado] = await Promise.all([
      listForecasts(Number(year)),
      listActuals(Number(year), source),
    ]);
    setRaw(previsto);
    setActuals(realizado);
    setFeedback({
      type: "info",
      message: `${previsto.length} registro(s) de previsão e ${realizado.length} de realizado em ${year}.`,
    });
  });

  // Consolida previsto e realizado por item + máscara. Um item pode aparecer só
  // no realizado (venda sem previsão) — ele também entra na lista.
  type Row = { item_code: string; mask: string; qty: number; weeks: number; actual: number };
  const consolidated = useMemo(() => {
    const map = new Map<string, Row>();
    const at = (itemCode: string, mask: string): Row => {
      const key = `${itemCode}|${mask}`;
      const cur = map.get(key) ?? { item_code: itemCode, mask, qty: 0, weeks: 0, actual: 0 };
      map.set(key, cur);
      return cur;
    };
    for (const f of raw) {
      const cur = at(f.item_code, f.mask ?? "");
      cur.qty += f.quantity; cur.weeks += 1;
    }
    for (const a of actuals) {
      at(a.item_code, a.mask).actual += a.quantity;
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty || b.actual - a.actual);
  }, [raw, actuals]);

  const totalPrev = useMemo(() => consolidated.reduce((s, r) => s + r.qty, 0), [consolidated]);
  const totalReal = useMemo(() => consolidated.reduce((s, r) => s + r.actual, 0), [consolidated]);

  /** Formata a aderência do realizado à previsão. */
  const aderencia = (previsto: number, realizado: number): string =>
    previsto > 0 ? `${((realizado / previsto) * 100).toFixed(1)}%` : "—";

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Vendas Previsto × Realizado</span>
          <span className="erp-crumb-code">VPRE0301</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Previsão consolidada do ano por item</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ano</span>
          <input className="erp-tinput num" style={{ width: 90 }} type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          <span className="erp-tgroup-label">Realizado por</span>
          <select className="erp-tinput" style={{ width: 190 }} value={source} onChange={(e) => setSource(e.target.value as ActualSource)}>
            <option value="BOTH">Pedidos e faturamento</option>
            <option value="ORDERS">Pedidos de venda</option>
            <option value="INVOICING">Faturamento</option>
          </select>
          <button className="erp-btn erp-btn-primary" onClick={consultar} disabled={busy}>{busy && <span className="erp-spin" />}Consultar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPRE0301 — Previsto x Realizado" filename="vpre0301" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        <div className="erp-grid-wrap">
          <table className="erp-grid">
            <thead><tr><th className="num">Item</th><th>Máscara</th><th className="num">Semanas</th><th className="num">Previsto (ano)</th><th className="num">Realizado</th><th className="num">Diferença</th><th className="num">Aderência</th></tr></thead>
            <tbody>
              {consolidated.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Sem previsões. Informe o ano e clique em <strong>Consultar</strong>.</td></tr>}
              {consolidated.map((r, i) => {
                const diff = r.actual - r.qty;
                return (
                  <tr key={i}>
                    <td className="num">{r.item_code}</td>
                    <td>{r.mask || "—"}</td>
                    <td className="num">{r.weeks || "—"}</td>
                    <td className="num">{r.qty}</td>
                    <td className="num">{r.actual}</td>
                    <td className="num">{diff > 0 ? `+${diff}` : diff}</td>
                    <td className="num">{aderencia(r.qty, r.actual)}</td>
                  </tr>
                );
              })}
            </tbody>
            {consolidated.length > 0 && (
              <tfoot><tr>
                <td colSpan={3} className="num">Totais do ano</td>
                <td className="num">{totalPrev}</td>
                <td className="num">{totalReal}</td>
                <td className="num">{totalReal - totalPrev > 0 ? `+${totalReal - totalPrev}` : totalReal - totalPrev}</td>
                <td className="num">{aderencia(totalPrev, totalReal)}</td>
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Itens: <strong>{consolidated.length}</strong> · Previsto: <strong>{totalPrev}</strong> · Realizado: <strong>{totalReal}</strong> · Aderência: <strong>{aderencia(totalPrev, totalReal)}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
