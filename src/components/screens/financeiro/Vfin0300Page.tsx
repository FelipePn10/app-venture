import { useState, useCallback, useEffect } from "react";
import {
  type FluxoCaixaItem, type FluxoProjetadoItem, type SaldoConta,
  getFluxoCaixa, getFluxoProjetado, getSaldoContas,
} from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "realizado" | "projetado" | "saldos";
type Grouping = "dia" | "semana" | "mes";
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type ChartPoint = { label: string; entradas: number; saidas: number; saldo: number };
function dateKey(raw: string, grouping: Grouping): string {
  const date = new Date(`${raw.slice(0, 10)}T12:00:00`);
  if (grouping === "mes") return raw.slice(0, 7);
  if (grouping === "semana") { const day = (date.getDay() + 6) % 7; date.setDate(date.getDate() - day); return date.toISOString().slice(0, 10); }
  return raw.slice(0, 10);
}
function chartData(items: Array<{ date: string; type: string; value: number }>, grouping: Grouping): ChartPoint[] {
  const groups = new Map<string, { entradas: number; saidas: number }>();
  items.forEach((item) => { const key = dateKey(item.date, grouping); const current = groups.get(key) ?? { entradas: 0, saidas: 0 }; const cents = Math.round(item.value * 100); if (item.type.toUpperCase().includes("ENTRADA") || item.type.toUpperCase().includes("RECEBER")) current.entradas += cents; else current.saidas += cents; groups.set(key, current); });
  let balance = 0;
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, amounts]) => { balance += amounts.entradas - amounts.saidas; return { label, entradas: amounts.entradas / 100, saidas: amounts.saidas / 100, saldo: balance / 100 }; });
}
function CashChart({ points }: { points: ChartPoint[] }): JSX.Element {
  const maximum = Math.max(1, ...points.flatMap((point) => [point.entradas, point.saidas, Math.abs(point.saldo)]));
  if (!points.length) return <div className="erp-grid-empty">Sem dados para montar o gráfico no período.</div>;
  return <div className="erp-cash-chart" role="img" aria-label="Gráfico de entradas, saídas e saldo acumulado">{points.map((point) => <div className="erp-cash-column" key={point.label} title={`${point.label}: entradas ${money(point.entradas)}, saídas ${money(point.saidas)}, saldo ${money(point.saldo)}`}><div className="erp-cash-bars"><span className="erp-cash-bar in" style={{ height: `${Math.max(3, point.entradas / maximum * 100)}%` }}/><span className="erp-cash-bar out" style={{ height: `${Math.max(3, point.saidas / maximum * 100)}%` }}/></div><strong>{point.label.slice(5)}</strong><small>Saldo {money(point.saldo)}</small></div>)}</div>;
}

function firstDayOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function lastDayOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); }

function tipoPill(t: string): JSX.Element {
  const isIn = t.toUpperCase().includes("ENTRADA");
  return <span className={`erp-badge ${isIn ? "erp-badge-green" : "erp-badge-red"}`}>{t}</span>;
}

export function Vfin0300Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("realizado");
  const [start, setStart] = useState(firstDayOfMonth());
  const [end, setEnd] = useState(lastDayOfMonth());
  const [realizado, setRealizado] = useState<FluxoCaixaItem[]>([]);
  const [projetado, setProjetado] = useState<FluxoProjetadoItem[]>([]);
  const [saldos, setSaldos] = useState<SaldoConta[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [grouping, setGrouping] = useState<Grouping>("dia");

  const reload = useCallback(async () => {
    setBusy(true); setFeedback(null);
    try {
      if (tab === "realizado") setRealizado(await getFluxoCaixa(start, end));
      else if (tab === "projetado") setProjetado(await getFluxoProjetado(start));
      else setSaldos(await getSaldoContas());
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar o fluxo de caixa.") }); }
    finally { setBusy(false); }
  }, [tab, start, end]);

  useEffect(() => { void reload(); }, [reload]);

  const entradas = realizado.filter((r) => r.tipo.toUpperCase().includes("ENTRADA")).reduce((s, r) => s + r.valor, 0);
  const saidas = realizado.filter((r) => !r.tipo.toUpperCase().includes("ENTRADA")).reduce((s, r) => s + r.valor, 0);
  const totalSaldos = saldos.reduce((s, c) => s + c.saldo_atual, 0);
  const points = chartData(tab === "realizado"
    ? realizado.map((item) => ({ date: item.data, type: item.tipo, value: item.valor }))
    : projetado.map((item) => ({ date: item.data_vencimento, type: item.tipo, value: item.valor })), grouping);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Fluxo de Caixa &amp; Saldos</span><span className="erp-crumb-code">VFIN0300</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        {(tab !== "saldos") && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Início</span>
            <input className="erp-input" style={{ width: 150, height: 32 }} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            {tab === "realizado" && <>
              <span className="erp-tgroup-label">Fim</span>
              <input className="erp-input" style={{ width: 150, height: 32 }} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </>}
          </div>
        )}
        {tab !== "saldos" && <div className="erp-tgroup"><span className="erp-tgroup-label">Agrupar gráfico</span><select className="erp-input" style={{ width: 120, height: 32 }} value={grouping} onChange={(e) => setGrouping(e.target.value as Grouping)}><option value="dia">Dia</option><option value="semana">Semana</option><option value="mes">Mês</option></select></div>}
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void reload()} disabled={busy}>{busy ? "Carregando..." : "Consultar"}</button>
          <ExportButton title="VFIN0300 — Fluxo de Caixa & Saldos" filename="fluxo-de-caixa" disabled={busy}
            subtitle={tab === "saldos" ? "Saldos das contas" : `Período: ${start} a ${end}`}
            meta={{ aba: tab }} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Fluxo de Caixa &amp; Saldo</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="erp-fieldset">
          <div className="erp-tabs">
            <button className={`erp-tab ${tab === "realizado" ? "active" : ""}`} onClick={() => setTab("realizado")}>Realizado</button>
            <button className={`erp-tab ${tab === "projetado" ? "active" : ""}`} onClick={() => setTab("projetado")}>Projetado</button>
            <button className={`erp-tab ${tab === "saldos" ? "active" : ""}`} onClick={() => setTab("saldos")}>Saldos das Contas</button>
          </div>

          {tab === "realizado" && (
            <>
              <div className="erp-fieldset-body"><CashChart points={points}/><div className="erp-chart-legend"><span><i className="in"/>Entradas</span><span><i className="out"/>Saídas</span><span>Saldo acumulado nos rótulos</span></div></div>
              <div className="erp-fieldset-body" style={{ paddingBottom: 0 }}>
                <div className="erp-metrics">
                  <div className="erp-metric"><div className="erp-metric-label">Entradas</div><div className="erp-metric-value" style={{ color: "#1e6030" }}>{money(entradas)}</div></div>
                  <div className="erp-metric"><div className="erp-metric-label">Saídas</div><div className="erp-metric-value" style={{ color: "#b91c1c" }}>{money(saidas)}</div></div>
                  <div className="erp-metric"><div className="erp-metric-label">Saldo do período</div><div className="erp-metric-value">{money(entradas - saidas)}</div></div>
                </div>
              </div>
              <div className="erp-fieldset-body">
                <table className="erp-grid">
                  <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Conciliado</th><th>Valor</th></tr></thead>
                  <tbody>
                    {realizado.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum lançamento no período.</td></tr>}
                    {realizado.map((r, i) => (
                      <tr key={i}><td>{r.data?.slice(0, 10)}</td><td>{tipoPill(r.tipo)}</td><td>{r.descricao}</td>
                        <td>{r.conciliado ? <span className="erp-badge ok">Sim</span> : <span className="erp-badge erp-badge-gray">Não</span>}</td>
                        <td>{money(r.valor)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "projetado" && (
            <div className="erp-fieldset-body"><CashChart points={points}/><div className="erp-chart-legend"><span><i className="in"/>Entradas previstas</span><span><i className="out"/>Saídas previstas</span><span>Saldo projetado acumulado</span></div>
              <table className="erp-grid">
                <thead><tr><th>Vencimento</th><th>Tipo</th><th>Descrição</th><th>Valor</th></tr></thead>
                <tbody>
                  {projetado.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma projeção a partir da data.</td></tr>}
                  {projetado.map((r, i) => (
                    <tr key={i}><td>{r.data_vencimento?.slice(0, 10)}</td><td>{tipoPill(r.tipo)}</td><td>{r.descricao}</td><td>{money(r.valor)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "saldos" && (
            <>
              <div className="erp-fieldset-body" style={{ paddingBottom: 0 }}>
                <div className="erp-metrics">
                  <div className="erp-metric"><div className="erp-metric-label">Contas</div><div className="erp-metric-value">{saldos.length}</div></div>
                  <div className="erp-metric"><div className="erp-metric-label">Saldo Total</div><div className="erp-metric-value">{money(totalSaldos)}</div></div>
                </div>
              </div>
              <div className="erp-fieldset-body">
                <table className="erp-grid">
                  <thead><tr><th>Banco</th><th>Descrição</th><th>Saldo Atual</th></tr></thead>
                  <tbody>
                    {saldos.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhuma conta.</td></tr>}
                    {saldos.map((c) => <tr key={c.id}><td style={{ fontWeight: 600 }}>{c.banco}</td><td>{c.descricao}</td><td>{money(c.saldo_atual)}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Visão: <strong>{tab}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
