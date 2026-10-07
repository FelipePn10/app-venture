import { useEffect, useState } from "react";
import { listOrderInvoices, type NotaDaLinha, type PurchaseOrderItemDTO } from "@/services/purchaseOrderService";
import { errMessage } from "@/services/fiscalShared";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v?: number) => (v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const dataBR = (s?: string) => (s ? s.split("-").reverse().join("/") : "—");

const SITUACAO_NOTA: Record<string, string> = {
  PENDING: "Pendente", CONFERRED: "Conferida", APPROVED: "Aprovada", WRITTEN_OFF: "Baixada", CANCELLED: "Cancelada",
};

/**
 * Quais notas de entrada atenderam cada linha do pedido. É o que responde
 * "isso já chegou?" e "em que nota?" sem sair do pedido.
 */
export function PedidoNotasPanel({ code, itens, nomeItem }: { code: number; itens: PurchaseOrderItemDTO[]; nomeItem: Record<string, string> }): JSX.Element {
  const [notas, setNotas] = useState<NotaDaLinha[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    listOrderInvoices(code)
      .then((n) => { if (vivo) { setNotas(n); setErro(""); } })
      .catch((e) => { if (vivo) setErro(errMessage(e)); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [code]);

  if (carregando) return <div className="erp-grid-empty"><span className="erp-spin" /> Carregando notas…</div>;
  if (erro) return <div className="erp-feedback error">{erro}</div>;

  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Notas de entrada por linha</div>
      <div className="erp-fieldset-body">
        <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
          <table className="erp-grid">
            <thead>
              <tr><th>Seq.</th><th>Item</th><th className="num">Pedido</th><th className="num">Recebido</th><th className="num">Faturado</th><th>Notas</th></tr>
            </thead>
            <tbody>
              {itens.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Pedido sem itens.</td></tr>}
              {itens.map((i) => {
                const daLinha = notas.filter((n) => n.line_code === i.code);
                return (
                  <tr key={i.code ?? i.sequence}>
                    <td>{i.sequence}</td>
                    <td><strong>{i.item_code}</strong>{nomeItem[i.item_code] && <><br /><small>{nomeItem[i.item_code]}</small></>}</td>
                    <td className="num">{num(i.requested_qty)}</td>
                    <td className="num">{num(i.received_qty)}</td>
                    <td className="num">{num(i.invoiced_qty)}</td>
                    <td>
                      {daLinha.length === 0 && <span className="pdc-hint">Nenhuma nota ainda.</span>}
                      {daLinha.map((n) => (
                        <div key={`${n.fiscal_entry_id}-${n.quantidade}`} className={n.status === "CANCELLED" ? "pdc-cancelada" : undefined}>
                          NF <b>{n.numero_nf}</b>/{n.serie} · entrada {dataBR(n.data_entrada)} · {num(n.quantidade)} {n.unidade ?? ""} · {brl(n.valor_total)} ·{" "}
                          <span className={`erp-badge ${n.status === "APPROVED" || n.status === "WRITTEN_OFF" ? "erp-badge-green" : n.status === "CANCELLED" ? "erp-badge-red" : "erp-badge-amber"}`}>
                            {SITUACAO_NOTA[n.status] ?? n.status}
                          </span>
                        </div>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="erp-field erp-c12">
          <span className="pdc-hint">Recebido conta também o recebimento físico sem nota; faturado é o que chegou com nota e já virou título a pagar.</span>
        </div>
      </div>
    </div>
  );
}
