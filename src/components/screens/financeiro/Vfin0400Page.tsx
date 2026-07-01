import { useState } from "react";
import { type ApuracaoImpostos, apurarImpostos, getApuracao } from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currentCompetencia = () => new Date().toISOString().slice(0, 7);

export function Vfin0400Page(): JSX.Element {
  const [competencia, setCompetencia] = useState(currentCompetencia());
  const [result, setResult] = useState<ApuracaoImpostos | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  function validCompetencia() { return /^\d{4}-\d{2}$/.test(competencia); }

  async function apurar() {
    if (!validCompetencia()) { setFeedback({ type: "error", message: "Competência deve estar no formato YYYY-MM." }); return; }
    setBusy(true); setFeedback(null);
    try { setResult(await apurarImpostos(competencia)); setFeedback({ type: "success", message: `Apuração de ${competencia} realizada.` }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function consultar() {
    if (!validCompetencia()) { setFeedback({ type: "error", message: "Competência deve estar no formato YYYY-MM." }); return; }
    setBusy(true); setFeedback(null);
    try { setResult(await getApuracao(competencia)); setFeedback({ type: "info", message: `Apuração de ${competencia} carregada.` }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Apuração não encontrada para a competência.") }); } finally { setBusy(false); }
  }

  const rows: { imposto: string; saidas: number; entradas: number; saldo: number }[] = result ? [
    { imposto: "ICMS", saidas: result.valor_icms_saidas, entradas: result.valor_icms_entradas, saldo: result.saldo_icms },
    { imposto: "IPI", saidas: result.valor_ipi_saidas, entradas: result.valor_ipi_entradas, saldo: result.saldo_ipi },
    { imposto: "PIS", saidas: result.valor_pis_saidas, entradas: result.valor_pis_entradas, saldo: result.saldo_pis },
    { imposto: "COFINS", saidas: result.valor_cofins_saidas, entradas: result.valor_cofins_entradas, saldo: result.saldo_cofins },
  ] : [];

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
          <span className="fsc-screen-title">VFIN0400 — Apuração de Impostos</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Competência</span>
          <input className="fsc-input" style={{ width: 120, height: 32 }} value={competencia} placeholder="2024-05"
            onChange={(e) => { setCompetencia(e.target.value); setFeedback(null); }} />
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void consultar()} disabled={busy}>Consultar</button>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void apurar()} disabled={busy}>{busy ? "Apurando..." : "Apurar"}</button>
          <ExportButton title="VFIN0400 — Apuração de Impostos" filename="apuracao-impostos" disabled={busy || !result}
            subtitle={`Competência: ${competencia}`} meta={{ competencia }} />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {!result ? (
          <div className="fsc-card"><div className="fsc-empty">Informe uma competência (YYYY-MM) e clique em Apurar ou Consultar.</div></div>
        ) : (
          <>
            <div className="fsc-section-banner">
              <span className="fsc-section-banner-pill">Competência {result.competencia}</span>
              <div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">Status: {result.status || "—"}</span>
            </div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th>Imposto</th><th className="fsc-num">Saídas (débito)</th><th className="fsc-num">Entradas (crédito)</th><th className="fsc-num">Saldo a recolher</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.imposto}>
                      <td style={{ fontWeight: 600 }}>{r.imposto}</td>
                      <td className="fsc-num">{money(r.saidas)}</td>
                      <td className="fsc-num">{money(r.entradas)}</td>
                      <td className="fsc-num" style={{ fontWeight: 600, color: r.saldo > 0 ? "#b91c1c" : "#1e6030" }}>{money(r.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Competência: <strong>{competencia}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
