import { useCallback, useEffect, useState } from "react";
import {
  downloadOrderPdf, listRecipients, listShipments, sendOrder,
  type Destinatario, type EnvioPedido,
} from "@/services/purchaseOrderService";
import { errMessage } from "@/services/fiscalShared";
import { downloadBlob } from "@/services/fileDownload";

type Feedback = { type: "success" | "error" | "info"; message: string };

const ORIGEM: Record<string, string> = {
  CONTATO_PEDIDO: "contato de pedido de compra", CONTATO: "contato", FORNECEDOR: "e-mail do fornecedor",
};
const dataHora = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

/**
 * Envio do pedido ao fornecedor: o PDF (o mesmo para baixar e para anexar),
 * os e-mails do cadastro do fornecedor — o contato marcado como "de pedido de
 * compra" vem sugerido — e o histórico do que foi enviado, inclusive o que
 * falhou e por quê.
 */
export function PedidoEnvioPanel({ code, numero, situacao, onFeedback }: {
  code: number; numero?: number; situacao: string; onFeedback: (f: Feedback) => void;
}): JSX.Element {
  const [dest, setDest] = useState<Destinatario[]>([]);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [outros, setOutros] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [envios, setEnvios] = useState<EnvioPedido[]>([]);
  const [busy, setBusy] = useState(false);
  const aprovado = situacao === "APPROVED" || situacao === "PARTIAL";

  const carregar = useCallback(async () => {
    try {
      const [d, e] = await Promise.all([listRecipients(code), listShipments(code)]);
      setDest(d);
      setMarcados(new Set(d.filter((x) => x.sugerido).map((x) => x.email)));
      setEnvios(e);
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
  }, [code, onFeedback]);
  useEffect(() => { void carregar(); }, [carregar]);

  async function baixar() {
    setBusy(true);
    try { downloadBlob(await downloadOrderPdf(code), `pedido-compra-${numero ?? code}.pdf`); }
    catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  async function enviar() {
    const para = [...marcados, ...outros.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean)];
    if (para.length === 0) { onFeedback({ type: "error", message: "Escolha ou digite ao menos um e-mail do fornecedor." }); return; }
    setBusy(true);
    try {
      const e = await sendOrder(code, para, mensagem);
      onFeedback({ type: "success", message: `Pedido enviado para ${e.destinatarios}.` });
      setOutros("");
    } catch (e) {
      onFeedback({ type: "error", message: errMessage(e) });
    } finally {
      setBusy(false);
      try { setEnvios(await listShipments(code)); } catch { /* o histórico recarrega na próxima abertura */ }
    }
  }

  const alternar = (email: string) => setMarcados((s) => {
    const n = new Set(s);
    if (n.has(email)) n.delete(email); else n.add(email);
    return n;
  });

  return (
    <>
      <div className="erp-fieldset" data-testid="envio-pedido">
        <div className="erp-fieldset-head">Enviar ao fornecedor</div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c12">
            <div className="pdc-inline" style={{ padding: 0 }}>
              <button className="erp-btn" onClick={() => void baixar()} disabled={busy}>Baixar PDF do pedido</button>
              {!aprovado && <span className="pdc-hint">Rascunho: o PDF sai marcado como "ainda não aprovado". O envio por e-mail só libera depois da aprovação.</span>}
            </div>
          </div>
          <div className="erp-field erp-c6">
            <label className="erp-label">E-mails do cadastro do fornecedor</label>
            {dest.length === 0 && <span className="pdc-hint">O fornecedor não tem e-mail no cadastro (VSUP0500). Digite ao lado.</span>}
            {dest.map((d) => (
              <label key={d.email} className="erp-check">
                <input type="checkbox" checked={marcados.has(d.email)} onChange={() => alternar(d.email)} disabled={!aprovado} />
                <span>{d.email}{d.nome ? ` — ${d.nome}` : ""} <small className="pdc-hint">({ORIGEM[d.origem] ?? d.origem})</small></span>
              </label>
            ))}
          </div>
          <div className="erp-field erp-c6">
            <label className="erp-label">Outros e-mails</label>
            <input className="erp-input" value={outros} disabled={!aprovado} placeholder="separe por vírgula"
              onChange={(e) => setOutros(e.target.value)} />
            <label className="erp-label" style={{ marginTop: 8 }}>Mensagem</label>
            <textarea className="erp-input" rows={4} value={mensagem} disabled={!aprovado}
              placeholder="Em branco: texto padrão pedindo a confirmação do pedido e da data de entrega."
              onChange={(e) => setMensagem(e.target.value)} />
          </div>
          <div className="erp-field erp-c12">
            <button className="erp-btn erp-btn-primary" onClick={() => void enviar()} disabled={busy || !aprovado}
              title={aprovado ? undefined : "Aprove o pedido antes de enviar"}>Enviar pedido por e-mail</button>
          </div>
        </div>
      </div>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Envios ({envios.length})</div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
            <table className="erp-grid">
              <thead><tr><th>Quando</th><th>Por</th><th>Para</th><th>Situação</th></tr></thead>
              <tbody>
                {envios.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">O pedido ainda não foi enviado.</td></tr>}
                {envios.map((e) => (
                  <tr key={e.id}>
                    <td>{dataHora(e.enviado_em)}</td><td>{e.enviado_por ?? "—"}</td><td>{e.destinatarios}</td>
                    <td>
                      <span className={`erp-badge ${e.situacao === "ENVIADO" ? "erp-badge-green" : "erp-badge-red"}`}>{e.situacao === "ENVIADO" ? "Enviado" : "Falhou"}</span>
                      {e.erro && <><br /><small className="pdc-falta">{e.erro}</small></>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
