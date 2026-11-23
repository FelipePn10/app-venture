import { useEffect, useState } from "react";
import { saldoContaReceber, type ContaReceber } from "@/services/financialService";
import { enviarAvisoCobranca, gerarCobranca, statusIntegracoes, type CanalAviso, type CobrancaGerada, type StatusIntegracoes } from "@/services/gestaoService";
import { Aviso } from "../planejamento/planUi";
import { data } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";
import { reais } from "../gestao/gestaoFmt";

function Copiar({ texto, rotulo }: { texto: string; rotulo: string }): JSX.Element {
  const [ok, setOk] = useState(false);
  return (
    <div className="erp-field erp-c12">
      <label className="erp-label">{rotulo}</label>
      <div style={{ display: "flex", gap: 6 }}>
        <input className="erp-input" readOnly value={texto} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }} onFocus={(e) => e.target.select()} />
        <button className="erp-btn erp-btn-sm" onClick={() => { void navigator.clipboard?.writeText(texto).then(() => { setOk(true); window.setTimeout(() => setOk(false), 1500); }); }}>{ok ? "Copiado" : "Copiar"}</button>
      </div>
    </div>
  );
}

/**
 * Cobrança do título (VFIN0210): emite o boleto com PIX no banco (Banco Inter)
 * e manda o aviso ao cliente por e-mail ou WhatsApp. O pagamento baixa sozinho
 * pelo aviso do banco.
 */
export function CobrancaDoTitulo({ titulo, onFechar }: { titulo: ContaReceber; onFechar: () => void }): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [cobranca, setCobranca] = useState<CobrancaGerada | null>(null);
  const [canal, setCanal] = useState<CanalAviso>("EMAIL");
  const [para, setPara] = useState("");
  const [lig, setLig] = useState<StatusIntegracoes | null>(null);
  useEffect(() => { void statusIntegracoes().then(setLig).catch(() => setLig(null)); }, []);

  const emitir = () => void run(async () => {
    const c = await gerarCobranca(titulo.id); setCobranca(c);
    setFeedback({ type: "success", message: c.pending ? "Cobrança registrada no banco; os códigos chegam em instantes (emita de novo para consultar)." : "Cobrança emitida: boleto com PIX." });
  });
  const avisar = () => void run(async () => {
    const destinos = para.split(/[;,\s]+/).map((s) => s.trim()).filter(Boolean);
    const r = await enviarAvisoCobranca(titulo.id, canal, destinos);
    setFeedback({ type: "success", message: `Aviso enviado por ${r.channel === "WHATSAPP" ? "WhatsApp" : "e-mail"} para ${r.to.join(", ") || "o contato do cliente"}.` });
  });

  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: 1 }}>Cobrar o título {titulo.numero_documento} <span style={{ fontWeight: 400, opacity: 0.65 }}>— vence {data(titulo.data_vencimento)} · saldo {reais(saldoContaReceber(titulo))}</span></span>
        <button className="erp-btn erp-btn-sm" onClick={onFechar}>Fechar</button>
      </div>
      <div className="erp-fieldset-body">
        <div className="erp-field erp-c12"><Aviso feedback={feedback} busy={busy} /></div>
        <div className="erp-field erp-c12" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <button className="erp-btn erp-btn-primary" onClick={emitir} disabled={busy || lig?.bank === false}>Emitir boleto + PIX</button>
          <span className="erp-hint">{lig?.bank === false
            ? "Banco Inter desligado neste servidor (veja Integrações na VFIN0100): só o aviso por e-mail funciona."
            : "No Banco Inter. Emitir de novo consulta a mesma cobrança; título vencido sai com vencimento hoje; valor mínimo R$ 2,50."}</span>
        </div>
        {cobranca?.pending && <div className="erp-field erp-c12"><span className="erp-note">O banco ainda está processando a emissão (código {cobranca.external_id}).</span></div>}
        {cobranca?.pix_copy_paste && <Copiar rotulo="PIX copia e cola" texto={cobranca.pix_copy_paste} />}
        {cobranca?.digitable_line && <Copiar rotulo="Linha digitável do boleto" texto={cobranca.digitable_line} />}
        <div className="erp-field erp-c3"><label className="erp-label" htmlFor="cob-canal">Avisar por</label>
          <select id="cob-canal" className="erp-input" value={canal} onChange={(e) => setCanal(e.target.value as CanalAviso)}>
            <option value="EMAIL">E-mail</option><option value="WHATSAPP" disabled={lig?.whatsapp === false}>WhatsApp{lig?.whatsapp === false ? " (desligado)" : ""}</option>
          </select></div>
        <div className="erp-field erp-c7"><label className="erp-label" htmlFor="cob-para">Para</label>
          <input id="cob-para" className="erp-input" placeholder={canal === "EMAIL" ? "vazio = e-mail de cobrança do cliente" : "vazio = celular do cliente (DDD + número)"} value={para} onChange={(e) => setPara(e.target.value)} />
          <span className="erp-hint">Separe vários destinos por vírgula.</span></div>
        <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={avisar} disabled={busy}>Enviar aviso</button></div>
      </div>
    </div>
  );
}
