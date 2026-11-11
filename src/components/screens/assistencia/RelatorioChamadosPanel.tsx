import { textoLegivel } from "@/utils/textoLegivel";
import { useState, useCallback, useMemo } from "react";
import { reportCalls } from "@/services/technicalAssistanceService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const cell = (v: unknown): string => {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  if (typeof v === "object") return textoLegivel(v);
  return String(v);
};
const humanize = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Relatório de chamados (era a VATC0380): visão "Relatório" da VATC0280. */
export function RelatorioChamadosPanel(): JSX.Element {
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
    <>
      <div className="erp-tgroup" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button className="erp-btn erp-btn-primary" onClick={gerar} disabled={busy}>{busy && <span className="erp-spin" />}Gerar relatório</button>
        <input className="erp-tinput" style={{ width: 220 }} placeholder="Filtrar em todas as colunas" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <ExportButton title="VATC0280 — Relatório de Chamados" filename="vatc0280-relatorio" />
      </div>
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
    </>
  );
}
