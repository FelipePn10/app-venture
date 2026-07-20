import { useState } from "react";
import { type ReportData, type ReportRow, getReport } from "@/services/financialReportsService";
import { errMessage } from "@/services/fiscalShared";
import { getCustomerNames, getSupplierNames } from "@/services/lookupNames";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type ParamKind = "range" | "none" | "item" | "entity";

interface ReportDef { key: string; label: string; base: string; kind: ParamKind; entityLabel?: string; }

const REPORTS: ReportDef[] = [
  { key: "R01", label: "R01 — Livro de Entradas", base: "livro-entradas", kind: "range" },
  { key: "R02", label: "R02 — Livro de Saídas", base: "livro-saidas", kind: "range" },
  { key: "R03", label: "R03 — Impostos das Saídas", base: "impostos-saidas", kind: "range" },
  { key: "R04", label: "R04 — Impostos das Entradas", base: "impostos-entradas", kind: "range" },
  { key: "R05", label: "R05 — DRE", base: "dre", kind: "range" },
  { key: "R09", label: "R09 — Aging Receber Detalhado", base: "aging-receber", kind: "none" },
  { key: "R10", label: "R10 — Aging Pagar Detalhado", base: "aging-pagar", kind: "none" },
  { key: "R11", label: "R11 — Extrato por Fornecedor", base: "extrato-fornecedor", kind: "entity", entityLabel: "ID Fornecedor" },
  { key: "R12", label: "R12 — Extrato por Cliente", base: "extrato-cliente", kind: "entity", entityLabel: "ID Cliente" },
  { key: "R13", label: "R13 — Produtos Vendidos", base: "produtos-vendidos", kind: "range" },
  { key: "R14", label: "R14 — Produtos Produzidos", base: "produtos-produzidos", kind: "range" },
  { key: "R15", label: "R15 — Histórico de Custos", base: "historico-custos", kind: "range" },
  { key: "R16", label: "R16 — Ficha Técnica com Custo", base: "ficha-tecnica", kind: "item", entityLabel: "Código do Item" },
  { key: "R17", label: "R17 — Curva ABC de Clientes", base: "curva-abc-clientes", kind: "range" },
  { key: "R18", label: "R18 — Curva ABC de Produtos", base: "curva-abc-produtos", kind: "range" },
  { key: "R19", label: "R19 — Compras no Período", base: "compras-periodo", kind: "range" },
];

function firstDayOfYear() { return `${new Date().getFullYear()}-01-01`; }
function todayIso() { return new Date().toISOString().slice(0, 10); }
const prettify = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "number") return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}T/.test(s) ? s.slice(0, 10) : s;
}

/**
 * Substitui `cliente_id`/`fornecedor_id` pelo NOME correspondente (mantendo a
 * posição da coluna). Usado nos relatórios de aging detalhado (R09/R10), que o
 * backend devolve apenas com o ID.
 */
async function enrichEntityNames(rows: ReportRow[]): Promise<ReportRow[]> {
  const hasCustomer = rows.some((r) => "cliente_id" in r);
  const hasSupplier = rows.some((r) => "fornecedor_id" in r);
  if (!hasCustomer && !hasSupplier) return rows;

  const [customers, suppliers] = await Promise.all([
    hasCustomer ? getCustomerNames() : Promise.resolve(new Map<number, string>()),
    hasSupplier ? getSupplierNames() : Promise.resolve(new Map<number, string>()),
  ]);

  return rows.map((row) => {
    const out: ReportRow = {};
    for (const [k, v] of Object.entries(row)) {
      if (k === "cliente_id") out["cliente"] = customers.get(Number(v)) ?? `#${v}`;
      else if (k === "fornecedor_id") out["fornecedor"] = suppliers.get(Number(v)) ?? `#${v}`;
      else out[k] = v;
    }
    return out;
  });
}

export function Vfin0500Page(): JSX.Element {
  const [reportKey, setReportKey] = useState(REPORTS[0].key);
  const [start, setStart] = useState(firstDayOfYear());
  const [end, setEnd] = useState(todayIso());
  const [entity, setEntity] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const def = REPORTS.find((r) => r.key === reportKey)!;

  async function consultar() {
    if ((def.kind === "entity" || def.kind === "item") && !entity.trim()) {
      setFeedback({ type: "error", message: `Informe ${def.entityLabel}.` }); return;
    }
    let endpoint = def.base;
    let params: Record<string, string> | undefined;
    if (def.kind === "entity") { endpoint = `${def.base}/${encodeURIComponent(entity.trim())}`; params = { start, end }; }
    else if (def.kind === "item") { endpoint = `${def.base}/${encodeURIComponent(entity.trim())}`; }
    else if (def.kind === "range") { params = { start, end }; }

    setBusy(true); setFeedback(null); setData(null);
    try {
      const res = await getReport(endpoint, params);
      const rows = res.single ? res.rows : await enrichEntityNames(res.rows);
      setData({ ...res, rows });
      if (res.rows.length === 0) setFeedback({ type: "info", message: "Relatório sem dados no período." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao gerar o relatório.") }); }
    finally { setBusy(false); }
  }

  const columns: string[] = data && !data.single && data.rows.length
    ? Array.from(data.rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set; }, new Set<string>()))
    : [];

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Relatórios Fiscais &amp; Financeiros</span><span className="erp-crumb-code">VFIN0500</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <select className="erp-input" style={{ width: 280, height: 32 }} value={reportKey}
            onChange={(e) => { setReportKey(e.target.value); setData(null); setFeedback(null); }}>
            {REPORTS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        {def.kind === "range" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Período</span>
            <input className="erp-input" style={{ width: 140, height: 32 }} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <input className="erp-input" style={{ width: 140, height: 32 }} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        )}
        {def.kind === "entity" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">{def.entityLabel}</span>
            <input className="erp-input" style={{ width: 120, height: 32 }} value={entity} onChange={(e) => setEntity(e.target.value)} />
            <span className="erp-tgroup-label">Período</span>
            <input className="erp-input" style={{ width: 140, height: 32 }} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <input className="erp-input" style={{ width: 140, height: 32 }} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        )}
        {def.kind === "item" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">{def.entityLabel}</span>
            <input className="erp-input" style={{ width: 120, height: 32 }} value={entity} onChange={(e) => setEntity(e.target.value)} />
          </div>
        )}
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void consultar()} disabled={busy}>{busy ? "Gerando..." : "Gerar"}</button>
          <ExportButton
            title={def.label}
            filename={def.base}
            disabled={busy || !data || data.rows.length === 0}
            build={() => {
              if (!data) return null;
              const subtitle = def.kind === "range" || def.kind === "entity"
                ? `Período: ${start} a ${end}` : undefined;
              const meta: Record<string, string> = { relatorio: def.label };
              if (subtitle) meta.periodo = `${start} a ${end}`;
              if ((def.kind === "entity" || def.kind === "item") && entity) meta.filtro = `${def.entityLabel}: ${entity}`;
              if (data.single) {
                return {
                  columns: ["Indicador", "Valor"],
                  rows: Object.entries(data.rows[0] ?? {}).map(([k, v]) => [prettify(k), fmt(v)]),
                  subtitle, meta,
                };
              }
              return {
                columns: columns.map(prettify),
                rows: data.rows.map((row) => columns.map((c) => fmt(row[c]))),
                subtitle, meta,
              };
            }}
          />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Relatórios Fiscais &amp; F</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}


        {!data ? (
          <div className="erp-fieldset"><div className="erp-grid-empty">Escolha um relatório e clique em Gerar.</div></div>
        ) : data.single ? (
          <div className="erp-fieldset"><div className="erp-fieldset-head">{def.label}   — <span style={{fontWeight:400,opacity:0.65}}>{data ? (data.single ? "Resumo" : `${data.rows.length} linha(s)`) : "Selecione e gere"}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
            <table className="erp-grid">
              <thead><tr><th>Indicador</th><th>Valor</th></tr></thead>
              <tbody>
                {Object.entries(data.rows[0] ?? {}).map(([k, v]) => (
                  <tr key={k}><td style={{ fontWeight: 600 }}>{prettify(k)}</td><td>{fmt(v)}</td></tr>
                ))}
              </tbody>
            </table>
          </div></div></div>
        ) : (
          <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
            <table className="erp-grid">
              <thead><tr>{columns.map((c) => <th key={c} className={typeof (data.rows[0] as ReportRow)?.[c] === "number" ? "" : undefined}>{prettify(c)}</th>)}</tr></thead>
              <tbody>
                {data.rows.length === 0 && <tr><td colSpan={Math.max(1, columns.length)} className="erp-grid-empty">Sem dados.</td></tr>}
                {data.rows.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => <td key={c} className={typeof row[c] === "number" ? "" : undefined}>{fmt(row[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div></div>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Relatório: <strong>{def.key}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
