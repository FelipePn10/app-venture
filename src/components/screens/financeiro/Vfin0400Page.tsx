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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Apuração de Impostos</span><span className="erp-crumb-code">VFIN0400</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Competência</span>
          <input className="erp-input" style={{ width: 120, height: 32 }} value={competencia} placeholder="2024-05"
            onChange={(e) => { setCompetencia(e.target.value); setFeedback(null); }} />
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn" onClick={() => void consultar()} disabled={busy}>Consultar</button>
          <button className="erp-btn erp-btn-primary" onClick={() => void apurar()} disabled={busy}>{busy ? "Apurando..." : "Apurar"}</button>
          <ExportButton title="VFIN0400 — Apuração de Impostos" filename="apuracao-impostos" disabled={busy || !result}
            subtitle={`Competência: ${competencia}`} meta={{ competencia }} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Apuração de Impostos</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {!result ? (
          <div className="erp-fieldset"><div className="erp-grid-empty">Informe uma competência (YYYY-MM) e clique em Apurar ou Consultar.</div></div>
        ) : (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Competência {result.competencia}   — <span style={{fontWeight:400,opacity:0.65}}>Status: {result.status || "—"}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Imposto</th><th>Saídas (débito)</th><th>Entradas (crédito)</th><th>Saldo a recolher</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.imposto}>
                      <td style={{ fontWeight: 600 }}>{r.imposto}</td>
                      <td>{money(r.saidas)}</td>
                      <td>{money(r.entradas)}</td>
                      <td style={{ fontWeight: 600, color: r.saldo > 0 ? "#b91c1c" : "#1e6030" }}>{money(r.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div></div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Competência: <strong>{competencia}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
