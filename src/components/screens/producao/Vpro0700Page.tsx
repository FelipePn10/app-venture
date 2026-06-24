import { useState } from "react";
import { type MrpAlertResult, notifyMrpExceptions } from "@/services/mrpAlertsService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

function typePill(t: string): JSX.Element {
  const cls = t.includes("LATE") || t.includes("OVERDUE") || t.includes("OVERLOAD") ? "fsc-pill-red"
    : t.includes("EXCESS") ? "fsc-pill-amber" : "fsc-pill-gray";
  return <span className={`fsc-pill ${cls}`}>{t || "—"}</span>;
}

export function Vpro0700Page(): JSX.Element {
  const [planCode, setPlanCode] = useState("");
  const [webhook, setWebhook] = useState("");
  const [emails, setEmails] = useState("");
  const [result, setResult] = useState<MrpAlertResult | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  async function notificar() {
    const p = Number(planCode);
    if (!p) { setFeedback({ type: "error", message: "Informe o código do plano MRP." }); return; }
    const email_to = emails.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    setBusy(true); setFeedback(null);
    try {
      const r = await notifyMrpExceptions({ plan_code: p, webhook_url: webhook.trim() || undefined, email_to: email_to.length ? email_to : undefined });
      setResult(r);
      setFeedback({ type: "success", message: `${r.total} exceção(ões) consolidada(s) e notificada(s).` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VPRO0700 — Alertas de Exceções MRP</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Plano MRP</span>
          <input className="fsc-input" style={{ width: 100, height: 32 }} type="number" value={planCode} onChange={(e) => setPlanCode(e.target.value)} />
          <button className="fsc-btn fsc-btn-primary" onClick={() => void notificar()} disabled={busy}>{busy ? "..." : "Notificar exceções"}</button></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VPRO0700 — Alertas de Exceções MRP" filename="vpro0700" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Canais de notificação</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">webhook e/ou e-mail (SMTP via .env). Vazios = só consolida.</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-6"><label className="fsc-label">Webhook URL</label><input className="fsc-input" value={webhook} placeholder="https://chat.empresa.com/mrp-alerts" onChange={(e) => setWebhook(e.target.value)} /></div>
            <div className="fsc-field fsc-col-6"><label className="fsc-label">E-mails (separados por vírgula)</label><input className="fsc-input" value={emails} placeholder="pcp@empresa.com, gerencia@empresa.com" onChange={(e) => setEmails(e.target.value)} /></div>
          </div>
        </div></div>

        {result && (
          <>
            <div className="fsc-metrics">
              <div className="fsc-metric"><div className="fsc-metric-label">Plano</div><div className="fsc-metric-value">{result.plan_code}</div></div>
              <div className="fsc-metric"><div className="fsc-metric-label">Total</div><div className="fsc-metric-value">{result.total}</div></div>
              {Object.entries(result.by_type).map(([k, v]) => (
                <div className="fsc-metric" key={k}><div className="fsc-metric-label">{k}</div><div className="fsc-metric-value">{v}</div></div>
              ))}
            </div>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Exceções</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">gerado {result.generated_at?.slice(0, 16).replace("T", " ")}</span></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th>Item</th><th>Tipo</th><th>Descrição</th></tr></thead>
                <tbody>
                  {result.exceptions.length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhuma exceção.</td></tr>}
                  {result.exceptions.map((ex, i) => (
                    <tr key={i}><td style={{ fontWeight: 600 }}>{ex.item_code}</td><td>{typePill(ex.message_type)}</td><td>{ex.description}</td></tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Exceções: <strong>{result?.total ?? 0}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
