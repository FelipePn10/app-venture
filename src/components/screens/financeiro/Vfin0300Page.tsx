import { useState, useCallback, useEffect } from "react";
import {
  type FluxoCaixaItem, type FluxoProjetadoItem, type SaldoConta,
  getFluxoCaixa, getFluxoProjetado, getSaldoContas,
} from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "realizado" | "projetado" | "saldos";
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
            <div className="erp-fieldset-body">
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
