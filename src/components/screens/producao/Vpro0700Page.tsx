import { useState } from "react";
import { type MrpAlertResult, notifyMrpExceptions } from "@/services/mrpAlertsService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

function typePill(t: string): JSX.Element {
  const cls = t.includes("LATE") || t.includes("OVERDUE") || t.includes("OVERLOAD") ? "erp-badge-red"
    : t.includes("EXCESS") ? "erp-badge-amber" : "erp-badge-gray";
  return <span className={`erp-badge ${cls}`}>{t || "—"}</span>;
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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Produção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Alertas de Exceções MRP</span><span className="erp-crumb-code">VPRO0700</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Plano MRP</span>
          <input className="erp-input" style={{ width: 100, height: 32 }} type="number" value={planCode} onChange={(e) => setPlanCode(e.target.value)} />
          <button className="erp-btn erp-btn-primary" onClick={() => void notificar()} disabled={busy}>{busy ? "..." : "Notificar exceções"}</button></div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VPRO0700 — Alertas de Exceções MRP" filename="vpro0700" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Alertas de Exceções MRP</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Canais de notificação  — <span style={{fontWeight:400,opacity:0.65}}>webhook e/ou e-mail (SMTP via .env). Vazios = só consolida.</span></div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c6"><label className="erp-label">Webhook URL</label><input className="erp-input" value={webhook} placeholder="https://chat.empresa.com/mrp-alerts" onChange={(e) => setWebhook(e.target.value)} /></div>
            <div className="erp-field erp-c6"><label className="erp-label">E-mails (separados por vírgula)</label><input className="erp-input" value={emails} placeholder="pcp@empresa.com, gerencia@empresa.com" onChange={(e) => setEmails(e.target.value)} /></div>
          
        </div></div>

        {result && (
          <>
            <div className="erp-metrics">
              <div className="erp-metric"><div className="erp-metric-label">Plano</div><div className="erp-metric-value">{result.plan_code}</div></div>
              <div className="erp-metric"><div className="erp-metric-label">Total</div><div className="erp-metric-value">{result.total}</div></div>
              {Object.entries(result.by_type).map(([k, v]) => (
                <div className="erp-metric" key={k}><div className="erp-metric-label">{k}</div><div className="erp-metric-value">{v}</div></div>
              ))}
            </div>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Exceções — <span style={{fontWeight:400,opacity:0.65}}>gerado {result.generated_at?.slice(0, 16).replace("T", " ")}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Item</th><th>Tipo</th><th>Descrição</th></tr></thead>
                <tbody>
                  {result.exceptions.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhuma exceção.</td></tr>}
                  {result.exceptions.map((ex, i) => (
                    <tr key={i}><td style={{ fontWeight: 600 }}>{ex.item_code}</td><td>{typePill(ex.message_type)}</td><td>{ex.description}</td></tr>
                  ))}
                </tbody>
              </table>
            </div></div></div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Exceções: <strong>{result?.total ?? 0}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
