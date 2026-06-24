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
  return <span className={`fsc-pill ${isIn ? "fsc-pill-green" : "fsc-pill-red"}`}>{t}</span>;
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
    <div className="fsc-root">
      <header className="fsc-topbar">
        <div className="fsc-topbar-left">
          <div className="fsc-logo">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
              <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>
          <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
          <span className="fsc-screen-title">VFIN0300 — Fluxo de Caixa &amp; Saldos</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        {(tab !== "saldos") && (
          <div className="fsc-action-group">
            <span className="fsc-action-label">Início</span>
            <input className="fsc-input" style={{ width: 150, height: 32 }} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            {tab === "realizado" && <>
              <span className="fsc-action-label">Fim</span>
              <input className="fsc-input" style={{ width: 150, height: 32 }} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </>}
          </div>
        )}
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void reload()} disabled={busy}>{busy ? "Carregando..." : "Consultar"}</button>
          <ExportButton title="VFIN0300 — Fluxo de Caixa & Saldos" filename="fluxo-de-caixa" disabled={busy}
            subtitle={tab === "saldos" ? "Saldos das contas" : `Período: ${start} a ${end}`}
            meta={{ aba: tab }} />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-card">
          <div className="fsc-tabs">
            <button className={`fsc-tab ${tab === "realizado" ? "active" : ""}`} onClick={() => setTab("realizado")}>Realizado</button>
            <button className={`fsc-tab ${tab === "projetado" ? "active" : ""}`} onClick={() => setTab("projetado")}>Projetado</button>
            <button className={`fsc-tab ${tab === "saldos" ? "active" : ""}`} onClick={() => setTab("saldos")}>Saldos das Contas</button>
          </div>

          {tab === "realizado" && (
            <>
              <div className="fsc-card-body" style={{ paddingBottom: 0 }}>
                <div className="fsc-metrics">
                  <div className="fsc-metric"><div className="fsc-metric-label">Entradas</div><div className="fsc-metric-value" style={{ color: "#1e6030" }}>{money(entradas)}</div></div>
                  <div className="fsc-metric"><div className="fsc-metric-label">Saídas</div><div className="fsc-metric-value" style={{ color: "#b91c1c" }}>{money(saidas)}</div></div>
                  <div className="fsc-metric"><div className="fsc-metric-label">Saldo do período</div><div className="fsc-metric-value">{money(entradas - saidas)}</div></div>
                </div>
              </div>
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Conciliado</th><th className="fsc-num">Valor</th></tr></thead>
                  <tbody>
                    {realizado.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhum lançamento no período.</td></tr>}
                    {realizado.map((r, i) => (
                      <tr key={i}><td>{r.data?.slice(0, 10)}</td><td>{tipoPill(r.tipo)}</td><td>{r.descricao}</td>
                        <td>{r.conciliado ? <span className="fsc-pill fsc-pill-green">Sim</span> : <span className="fsc-pill fsc-pill-gray">Não</span>}</td>
                        <td className="fsc-num">{money(r.valor)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "projetado" && (
            <div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th>Vencimento</th><th>Tipo</th><th>Descrição</th><th className="fsc-num">Valor</th></tr></thead>
                <tbody>
                  {projetado.length === 0 && <tr><td colSpan={4} className="fsc-empty">Nenhuma projeção a partir da data.</td></tr>}
                  {projetado.map((r, i) => (
                    <tr key={i}><td>{r.data_vencimento?.slice(0, 10)}</td><td>{tipoPill(r.tipo)}</td><td>{r.descricao}</td><td className="fsc-num">{money(r.valor)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "saldos" && (
            <>
              <div className="fsc-card-body" style={{ paddingBottom: 0 }}>
                <div className="fsc-metrics">
                  <div className="fsc-metric"><div className="fsc-metric-label">Contas</div><div className="fsc-metric-value">{saldos.length}</div></div>
                  <div className="fsc-metric"><div className="fsc-metric-label">Saldo Total</div><div className="fsc-metric-value">{money(totalSaldos)}</div></div>
                </div>
              </div>
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead><tr><th>Banco</th><th>Descrição</th><th className="fsc-num">Saldo Atual</th></tr></thead>
                  <tbody>
                    {saldos.length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhuma conta.</td></tr>}
                    {saldos.map((c) => <tr key={c.id}><td style={{ fontWeight: 600 }}>{c.banco}</td><td>{c.descricao}</td><td className="fsc-num">{money(c.saldo_atual)}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Visão: <strong>{tab}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
