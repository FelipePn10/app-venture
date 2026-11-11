import { useState } from "react";
import { notifyMrpExceptions } from "@/services/mrpAlertsService";
import { errMessage } from "@/services/fiscalShared";

/*
 * Enviar as exceções do plano por webhook e/ou e-mail (era a VPRO0700). Fica na
 * aba Exceções da VMRP0100, onde as exceções já são tratadas.
 */
export function NotificarExcecoesPanel({ plano }: { plano?: number }): JSX.Element {
  const [aberto, setAberto] = useState(false);
  const [webhook, setWebhook] = useState("");
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const enviar = async () => {
    if (!plano) { setFeedback({ type: "error", message: "Escolha o plano." }); return; }
    const email_to = emails.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const invalido = email_to.find((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (invalido) { setFeedback({ type: "error", message: `E-mail inválido: ${invalido}` }); return; }
    if (webhook.trim() && !/^https?:\/\//i.test(webhook.trim())) { setFeedback({ type: "error", message: "O webhook precisa começar com http:// ou https://." }); return; }
    if (!webhook.trim() && email_to.length === 0) { setFeedback({ type: "error", message: "Informe o webhook ou ao menos um e-mail." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const r = await notifyMrpExceptions({ plan_code: plano, webhook_url: webhook.trim() || undefined, email_to: email_to.length ? email_to : undefined });
      const canais = [webhook.trim() && "webhook", email_to.length && `${email_to.length} e-mail(s)`].filter(Boolean).join(" e ");
      setFeedback({ type: "success", message: `${r.total} exceção(ões) enviada(s) por ${canais}.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  };

  if (!aberto) return <div style={{ margin: "8px 0" }}><button className="erp-btn erp-btn-sm" onClick={() => setAberto(true)} disabled={!plano}>Enviar as exceções por webhook ou e-mail</button></div>;
  return (
    <div className="erp-fieldset"><div className="erp-fieldset-head">Enviar as exceções do plano</div><div className="erp-fieldset-body">
      {feedback && <div className={`erp-field erp-c12 erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-field erp-c6"><label className="erp-label" htmlFor="mrp-webhook">Webhook</label><input id="mrp-webhook" className="erp-input" placeholder="https://chat.empresa.com/alertas-mrp" value={webhook} onChange={(e) => setWebhook(e.target.value)} /></div>
      <div className="erp-field erp-c6"><label className="erp-label" htmlFor="mrp-emails">E-mails</label><input id="mrp-emails" className="erp-input" placeholder="pcp@empresa.com, compras@empresa.com" value={emails} onChange={(e) => setEmails(e.target.value)} /></div>
      <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
        <button className="erp-btn" onClick={() => setAberto(false)} disabled={busy}>Fechar</button>
        <button className="erp-btn erp-btn-primary" onClick={() => void enviar()} disabled={busy}>Enviar</button>
      </div>
    </div></div>
  );
}
