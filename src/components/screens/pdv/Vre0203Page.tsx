import { useState, useCallback, useMemo } from "react";
import { getFutureCommissions } from "@/services/recurringSalesService";
import { errMessage, parseNum, parseStr, unwrapObject, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadRepresentatives } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const plusMonths = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Vre0203Page(): JSX.Element {
  const [rows, setRows] = useState<Obj[]>([]);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(plusMonths(12));
  const [representative, setRepresentative] = useState<number | undefined>(undefined);
  const [adjustment, setAdjustment] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const consultar = () => run(async () => {
    const r = await getFutureCommissions({ from, to, representative_code: representative, adjustment_percent: adjustment ? Number(adjustment) : undefined });
    setRows(r);
    setFeedback({ type: r.length ? "success" : "info", message: `${r.length} projeção(ões) de comissão no período.` });
  });

  const total = useMemo(() => rows.reduce((s, o) => s + (parseNum(unwrapObject(o), "commission_value", "CommissionValue") || 0), 0), [rows]);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Consulta de Comissões Futuras</span>
          <span className="erp-crumb-code">VRE0203</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Projeção de comissões de vendas recorrentes</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Período</span>
          <input className="erp-tinput" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span style={{ color: "var(--v-text-3)" }}>→</span>
          <input className="erp-tinput" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Representante</span>
          <div style={{ width: 220 }}><LookupField value={representative} loader={loadRepresentatives} entityLabel="representante" placeholder="Todos" onChange={(c) => setRepresentative(c)} /></div>
          <span className="erp-tgroup-label">Reajuste %</span>
          <input className="erp-tinput num" style={{ width: 80 }} type="number" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} />
          <button className="erp-btn erp-btn-dark" onClick={consultar} disabled={busy}>{busy && <span className="erp-spin" />}Consultar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VRE0203 — Comissões Futuras" filename="vre0203" /></div>
      </div>

      <div className="erp-content">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

      <div className="erp-grid-wrap">
        <table className="erp-grid">
          <thead>
            <tr><th>Mês</th><th className="num">Representante</th><th className="num">Cliente</th><th>Base</th><th className="num">Valor base</th><th className="num">Comissão %</th><th className="num">Comissão</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma projeção. Defina o período e clique em <strong>Consultar</strong>.</td></tr>}
            {rows.map((raw, i) => { const o = unwrapObject(raw); return (
              <tr key={i}>
                <td>{parseStr(o, "month", "Month") || parseStr(o, "period", "reference_month") || "—"}</td>
                <td className="num">{parseNum(o, "representative_code", "RepresentativeCode") || "—"}</td>
                <td className="num">{parseNum(o, "customer_code", "CustomerCode") || "—"}</td>
                <td>{parseStr(o, "commission_base", "CommissionBase") || "—"}</td>
                <td className="num">{money(parseNum(o, "base_value", "BaseValue"))}</td>
                <td className="num">{parseNum(o, "commission_percent", "CommissionPercent") || 0}</td>
                <td className="num">{money(parseNum(o, "commission_value", "CommissionValue"))}</td>
              </tr>
            ); })}
          </tbody>
          {rows.length > 0 && <tfoot><tr><td colSpan={6} className="num">Total de comissão projetada</td><td className="num">{money(total)}</td></tr></tfoot>}
        </table>
      </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Linhas: <strong>{rows.length}</strong></div>
        <div className="erp-status-item">Comissão projetada: <strong>R$ {money(total)}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
