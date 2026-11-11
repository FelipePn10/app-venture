import { useState } from "react";
import { errMessage, parseNum, parseStr } from "@/services/fiscalShared";
import { listPurchaseMovements } from "@/services/procurementService";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadItems, loadSuppliers } from "@/services/lookups";
import { enumLabel } from "@/utils/enumLabels";

/*
 * Histórico de compras por fornecedor e item (visão da VPDC0200): cada linha de
 * pedido com o pedido, recebido, cancelado e o que está em aberto, e o preço.
 * Era a rotina genérica VSUP0650.
 */

interface Linha { pedido: number; numero: number; emissao: string; entrega: string; fornecedor: number; item: string; mascara: string; pedida: number; recebida: number; cancelada: number; aberta: number; preco: number; situacao: string }
const n = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const data = (s: string) => (s ? s.slice(0, 10).split("-").reverse().join("/") : "—");

export function HistoricoComprasPanel({ onAbrirPedido }: { onAbrirPedido: (code: number) => void }): JSX.Element {
  const [fornecedor, setFornecedor] = useState<number | undefined>();
  const [item, setItem] = useState<string | undefined>();
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  const consultar = async () => {
    setBusy(true); setErro("");
    try {
      setLinhas((await listPurchaseMovements({ supplier_code: fornecedor, item_code: item, limit: 500 })).map((o) => ({
        pedido: parseNum(o, "purchase_order_code"), numero: parseNum(o, "order_number"), emissao: parseStr(o, "emission_date"), entrega: parseStr(o, "delivery_date"),
        fornecedor: parseNum(o, "supplier_code"), item: parseStr(o, "item_code"), mascara: parseStr(o, "mask"), pedida: parseNum(o, "requested_qty"),
        recebida: parseNum(o, "received_qty"), cancelada: parseNum(o, "cancelled_qty"), aberta: parseNum(o, "open_qty"), preco: parseNum(o, "unit_price"), situacao: parseStr(o, "status"),
      })));
    } catch (e) { setErro(errMessage(e)); } finally { setBusy(false); }
  };

  return (
    <div className="erp-fieldset"><div className="erp-fieldset-head">Histórico de compras por fornecedor e item</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c4"><label className="erp-label">Fornecedor</label><LookupField value={fornecedor} loader={loadSuppliers} entityLabel="fornecedor" clearable onChange={(c) => setFornecedor(c ? Number(c) : undefined)} /></div>
      <div className="erp-field erp-c4"><label className="erp-label">Item</label><LookupField value={item} loader={loadItems} entityLabel="item" clearable onChange={(c) => setItem(c ? String(c) : undefined)} /></div>
      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-dark" onClick={() => void consultar()} disabled={busy}>{busy && <span className="erp-spin" />}Consultar</button></div>
      {erro && <div className="erp-field erp-c12 erp-feedback error">{erro}</div>}
      <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
        {linhas === null ? <div className="erp-list-empty">Escolha o fornecedor, o item ou os dois e clique em Consultar.</div> : (
          <table className="erp-grid">
            <thead><tr><th>Pedido</th><th>Emissão</th><th>Entrega</th><th>Fornecedor</th><th>Item</th><th className="num">Pedido</th><th className="num">Recebido</th><th className="num">Cancelado</th><th className="num">Em aberto</th><th className="num">Preço</th><th>Situação</th></tr></thead>
            <tbody>
              {linhas.length === 0 && <tr><td colSpan={11} className="erp-grid-empty">Nenhuma compra encontrada.</td></tr>}
              {linhas.map((l, i) => (
                <tr key={`${l.pedido}-${l.item}-${i}`} style={{ cursor: "pointer" }} onClick={() => onAbrirPedido(l.pedido)} title="Abrir o pedido">
                  <td style={{ fontWeight: 600 }}>{l.numero || l.pedido}</td><td>{data(l.emissao)}</td><td>{data(l.entrega)}</td>
                  <td><EntityName code={l.fornecedor} loader={loadSuppliers} showCode={false} /></td>
                  <td><EntityName code={l.item} loader={loadItems} />{l.mascara ? ` (${l.mascara})` : ""}</td>
                  <td className="num">{n(l.pedida)}</td><td className="num">{n(l.recebida)}</td><td className="num">{n(l.cancelada)}</td><td className="num">{n(l.aberta)}</td>
                  <td className="num">{l.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td>{enumLabel(l.situacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div></div>
  );
}
