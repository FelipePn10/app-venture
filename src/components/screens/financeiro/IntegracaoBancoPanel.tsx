import { useEffect, useState } from "react";
import { registrarWebhookInter, statusIntegracoes, type StatusIntegracoes } from "@/services/gestaoService";
import { useAuthStore } from "@/store/authStore";
import { errMessage } from "@/services/fiscalShared";
import { Selo } from "../planejamento/planUi";

/**
 * Integrações da empresa (VFIN0100): o que está ligado no servidor e o cadastro
 * do webhook do Banco Inter (o aviso de pagamento que baixa o título sozinho).
 * As credenciais ficam no ambiente da API, nunca na tela.
 */
export function IntegracaoBancoPanel(): JSX.Element {
  const admin = (useAuthStore((s) => s.user?.role) ?? "").toUpperCase() === "ADMIN";
  const [st, setSt] = useState<StatusIntegracoes | null>(null);
  const [base, setBase] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void statusIntegracoes().then(setSt).catch(() => setSt(null)); }, []);

  const registrar = async () => {
    setBusy(true); setMsg(null);
    try { const r = await registrarWebhookInter(base.trim()); setMsg({ ok: true, texto: `Webhook cadastrado no Inter: ${r}` }); }
    catch (e) { setMsg({ ok: false, texto: errMessage(e) }); }
    finally { setBusy(false); }
  };
  const selo = (on?: boolean) => <Selo tom={on ? "ok" : "muted"}>{on ? "Ligado" : "Desligado"}</Selo>;

  return (
    <div className="erp-fieldset"><div className="erp-fieldset-head">Integrações {st?.training && <Selo tom="warn">treino: integrações externas sempre desligadas</Selo>}</div>
      <div className="erp-fieldset-body">
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Integração</th><th>Para quê</th><th>Situação</th></tr></thead>
            <tbody>
              <tr><td>Banco Inter (API Cobrança)</td><td>Boleto com PIX na VFIN0210 (Cobrar) e baixa automática pelo aviso do banco</td><td>{selo(st?.bank)} {st?.bank && !st.bank_webhook_ready && <Selo tom="warn">sem segredo do webhook</Selo>}</td></tr>
              <tr><td>WhatsApp (Cloud API da Meta)</td><td>Aviso de cobrança e resumo do pedido de compra</td><td>{selo(st?.whatsapp)}</td></tr>
              <tr><td>Frete Rápido</td><td>Cotação de frete e rastreio pela NF-e (VEXP0100, Por pedido)</td><td>{selo(st?.freight)}</td></tr>
              <tr><td>Portal do cliente</td><td>Endereço do link que o cliente recebe (VCLI0500, Portal do cliente)</td><td>{st?.portal ? <Selo tom="ok">Endereço configurado</Selo> : <Selo tom="muted">Sem endereço (o link usa o deste computador)</Selo>}</td></tr>
            </tbody>
          </table>
          <span className="erp-hint">As credenciais ficam no ambiente do servidor (INTER_*, WHATSAPP_*, FRETERAPIDO_*, PORTAL_BASE_URL) — veja docs/dev/integracoes-provedores.md.</span>
        </div>
        {admin && st?.bank && (<>
          <div className="erp-field erp-c8"><label className="erp-label" htmlFor="inter-base">Endereço público da API (HTTPS)</label>
            <input id="inter-base" className="erp-input" placeholder="https://api.suaempresa.com.br" value={base} onChange={(e) => setBase(e.target.value)} />
            <span className="erp-hint">O Inter passa a avisar cada pagamento neste endereço; o ERP consulta a cobrança e baixa o título.</span></div>
          <div className="erp-field erp-c4" style={{ justifyContent: "flex-end" }}>
            <button className="erp-btn erp-btn-primary" onClick={() => void registrar()} disabled={busy || !base.trim() || !st.bank_webhook_ready}>Cadastrar webhook no Inter</button></div>
          {msg && <div className="erp-field erp-c12"><div className={`erp-feedback ${msg.ok ? "success" : "error"}`}>{msg.texto}</div></div>}
        </>)}
      </div>
    </div>
  );
}
