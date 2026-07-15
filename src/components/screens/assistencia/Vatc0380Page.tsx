import { useState, useCallback, useMemo } from "react";
import { reportCalls } from "@/services/technicalAssistanceService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const cell = (v: unknown): string => {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};
const humanize = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function Vatc0380Page(): JSX.Element {
  const [rows, setRows] = useState<Obj[]>([]);
  const [filter, setFilter] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const gerar = () => run(async () => {
    const data = await reportCalls();
    setRows(data); setLoaded(true);
    setFeedback({ type: "info", message: `${data.length} linha(s) no relatório.` });
  });

  const columns = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);
  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const f = filter.toLowerCase();
    return rows.filter((r) => Object.values(r).some((v) => cell(v).toLowerCase().includes(f)));
  }, [rows, filter]);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Relatório de Chamados</span>
          <span className="erp-crumb-code">VATC0380</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Indicadores de chamados de assistência técnica</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className="erp-btn erp-btn-primary" onClick={gerar} disabled={busy}>{busy && <span className="erp-spin" />}Gerar relatório</button>
          <input className="erp-tinput" style={{ width: 200 }} placeholder="Filtrar em todas as colunas" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VATC0380 — Relatório de Chamados" filename="vatc0380" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        <div className="erp-grid-wrap">
          <table className="erp-grid">
            <thead><tr>{columns.length === 0 ? <th>Relatório</th> : columns.map((c) => <th key={c} className={typeof rows[0]?.[c] === "number" ? "num" : ""}>{humanize(c)}</th>)}</tr></thead>
            <tbody>
              {!loaded && <tr><td className="erp-grid-empty">Clique em <strong>Gerar relatório</strong>.</td></tr>}
              {loaded && filtered.length === 0 && <tr><td colSpan={Math.max(1, columns.length)} className="erp-grid-empty">Nenhuma linha.</td></tr>}
              {filtered.map((r, i) => (
                <tr key={i}>{columns.map((c) => <td key={c} className={typeof r[c] === "number" ? "num" : ""}>{cell(r[c])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Linhas: <strong>{filtered.length}</strong>{rows.length !== filtered.length && <> de {rows.length}</>}</div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
