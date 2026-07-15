import { useState, useCallback, useMemo } from "react";
import {
  type SalesForecastDTO,
  listForecasts,
} from "@/services/salesForecastService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

/**
 * VPRE0301 — Previsto × Realizado. A API `/api/sales-forecast` expõe apenas o
 * previsto (`/list/{year}`). O realizado (pedidos/faturamento) não tem endpoint
 * nesse módulo, então a coluna fica sinalizada como pendente de integração.
 */
export function Vpre0301Page(): JSX.Element {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(String(thisYear));
  const [raw, setRaw] = useState<SalesForecastDTO[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const consultar = () => run(async () => {
    const data = await listForecasts(Number(year));
    setRaw(data);
    setFeedback({ type: "info", message: `${data.length} registro(s) de previsão em ${year}.` });
  });

  // consolida por item (soma das semanas)
  const consolidated = useMemo(() => {
    const map = new Map<string, { item_code: number; mask: string; qty: number; weeks: number }>();
    for (const f of raw) {
      const key = `${f.item_code}|${f.mask ?? ""}`;
      const cur = map.get(key) ?? { item_code: f.item_code, mask: f.mask ?? "", qty: 0, weeks: 0 };
      cur.qty += f.quantity; cur.weeks += 1;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty);
  }, [raw]);

  const totalPrev = useMemo(() => consolidated.reduce((s, r) => s + r.qty, 0), [consolidated]);

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
          <button className="erp-btn erp-btn-primary" onClick={consultar} disabled={busy}>{busy && <span className="erp-spin" />}Consultar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPRE0301 — Previsto x Realizado" filename="vpre0301" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-feedback info">O realizado (pedidos/faturamento) não é exposto por <code>/api/sales-forecast</code>; a coluna fica marcada como pendente de integração de endpoint.</div>

        <div className="erp-grid-wrap">
          <table className="erp-grid">
            <thead><tr><th className="num">Item</th><th>Máscara</th><th className="num">Semanas</th><th className="num">Previsto (ano)</th><th className="num">Realizado</th></tr></thead>
            <tbody>
              {consolidated.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Sem previsões. Informe o ano e clique em <strong>Consultar</strong>.</td></tr>}
              {consolidated.map((r, i) => (
                <tr key={i}><td className="num">{r.item_code}</td><td>{r.mask || "—"}</td><td className="num">{r.weeks}</td><td className="num">{r.qty}</td><td className="num" style={{ color: "var(--v-text-3)" }}>n/d</td></tr>
              ))}
            </tbody>
            {consolidated.length > 0 && <tfoot><tr><td colSpan={3} className="num">Total previsto</td><td className="num">{totalPrev}</td><td></td></tr></tfoot>}
          </table>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Itens: <strong>{consolidated.length}</strong> · Total previsto: <strong>{totalPrev}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
