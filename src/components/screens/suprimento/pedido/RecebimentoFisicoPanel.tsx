import { useMemo, useState } from "react";
import { receiveOrder, type PurchaseOrderItemDTO, type PurchaseReceiptItemDTO } from "@/services/purchaseOrderService";
import { errMessage, unwrapArray, unwrapObject } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadWarehouses } from "@/services/lookups";

/*
 * Recebimento físico do pedido aberto (aba Notas e recebimentos da VPDC0200):
 * o material chegou antes da nota. Gera a entrada no estoque por linha (com
 * lote, validade, corrida e certificado) e abre o lote de inspeção quando o
 * item tem roteiro. A NF-e de entrada depois não lança de novo o que já entrou.
 * Era a operação "Registrar recebimento" da VPDC0210, em JSON cru.
 */

type Linha = { qtd: string; almox?: number; lote: string; validade: string; corrida: string; certificado: string; checklist: boolean };
const num = (v?: number) => (v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const saldoDe = (i: PurchaseOrderItemDTO) => Math.max(0, (i.requested_qty ?? 0) - (i.received_qty ?? 0) - (i.cancelled_qty ?? 0));

export function RecebimentoFisicoPanel({ code, itens, nomeItem, aoReceber }: {
  code: number; itens: PurchaseOrderItemDTO[]; nomeItem: Record<string, string>; aoReceber: () => void;
}): JSX.Element | null {
  const abertas = useMemo(() => itens.filter((i) => i.code && i.status !== "CANCELLED" && saldoDe(i) > 0), [itens]);
  const [linhas, setLinhas] = useState<Record<number, Linha>>({});
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  if (abertas.length === 0) return null;
  const linha = (i: PurchaseOrderItemDTO): Linha => linhas[i.code!] ?? { qtd: "", almox: i.warehouse_id, lote: "", validade: "", corrida: "", certificado: "", checklist: false };
  const setL = (i: PurchaseOrderItemDTO, patch: Partial<Linha>) => setLinhas((p) => ({ ...p, [i.code!]: { ...linha(i), ...patch } }));

  async function receber() {
    const itensRecebidos: PurchaseReceiptItemDTO[] = [];
    for (const i of abertas) {
      const l = linha(i);
      const q = Number(l.qtd.replace(",", "."));
      if (!l.qtd.trim()) continue;
      if (!(q > 0)) { setFeedback({ type: "error", message: `Quantidade inválida na linha ${i.code}.` }); return; }
      if (!l.almox) { setFeedback({ type: "error", message: `Escolha o almoxarifado da linha ${i.code}.` }); return; }
      itensRecebidos.push({
        purchase_order_item_code: i.code!, quantity: q, warehouse_id: l.almox, lot: l.lote.trim() || undefined,
        expiration_date: l.validade || undefined, heat_number: l.corrida.trim() || undefined, certificate: l.certificado.trim() || undefined,
        checklist_confirmed: l.checklist || undefined,
      });
    }
    if (itensRecebidos.length === 0) { setFeedback({ type: "error", message: "Informe a quantidade recebida em pelo menos uma linha." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const r = await receiveOrder(code, itensRecebidos, obs.trim() || undefined);
      const avisos = unwrapArray(unwrapObject(r)["warnings"]).map(String);
      setLinhas({}); setObs("");
      setFeedback({ type: avisos.length ? "info" : "success", message: `Recebimento registrado: ${itensRecebidos.length} linha(s) entraram no estoque.${avisos.length ? ` Atenção: ${avisos.join(" · ")}` : ""}` });
      aoReceber();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Receber material (chegou antes da nota)</div>
      <div className="erp-fieldset-body">
        {feedback && <div className={`erp-field erp-c12 erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
          <table className="erp-grid">
            <thead><tr><th>Linha</th><th>Item</th><th className="num">Saldo</th><th style={{ width: 110 }}>Recebido</th><th style={{ width: 200 }}>Almoxarifado</th><th>Lote</th><th>Validade</th><th>Corrida</th><th>Certificado</th><th>Check list</th></tr></thead>
            <tbody>
              {abertas.map((i) => {
                const l = linha(i);
                return (
                  <tr key={i.code}>
                    <td>{i.code}</td>
                    <td>{nomeItem[i.item_code] ?? i.item_code}{i.mask ? ` (${i.mask})` : ""}</td>
                    <td className="num">{num(saldoDe(i))} {i.purchase_uom ?? ""}</td>
                    <td><input className="erp-input num" inputMode="decimal" value={l.qtd} placeholder="0" onChange={(e) => setL(i, { qtd: e.target.value })} /></td>
                    <td><LookupField value={l.almox} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(c) => setL(i, { almox: c ? Number(c) : undefined })} /></td>
                    <td><input className="erp-input" value={l.lote} onChange={(e) => setL(i, { lote: e.target.value })} /></td>
                    <td><input className="erp-input" type="date" value={l.validade} onChange={(e) => setL(i, { validade: e.target.value })} /></td>
                    <td><input className="erp-input" value={l.corrida} onChange={(e) => setL(i, { corrida: e.target.value })} /></td>
                    <td><input className="erp-input" value={l.certificado} onChange={(e) => setL(i, { certificado: e.target.value })} /></td>
                    <td style={{ textAlign: "center" }}><input type="checkbox" checked={l.checklist} onChange={(e) => setL(i, { checklist: e.target.checked })} aria-label={`Check list da linha ${i.code}`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="erp-field erp-c9"><label className="erp-label">Observação do recebimento</label><input className="erp-input" value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void receber()} disabled={busy}>{busy && <span className="erp-spin" />}Registrar recebimento</button></div>
        <div className="erp-field erp-c12"><span className="erp-field-hint">Só as linhas com quantidade são recebidas. Item com roteiro de inspeção entra no almoxarifado de inspeção e abre o lote (VINS0300). Lote, validade, corrida e certificado ficam obrigatórios quando o cadastro do item exige.</span></div>
      </div>
    </div>
  );
}
