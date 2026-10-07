import { useEffect, useState } from "react";
import { getPriceHistory, type HistoricoPreco } from "@/services/purchaseOrderService";
import { errMessage } from "@/services/fiscalShared";

const brl = (v?: number, casas = 2) =>
  v === undefined ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: casas, maximumFractionDigits: casas });
const num = (v?: number) => (v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const dataBR = (s?: string) => (s ? s.split("-").reverse().join("/") : "—");

/**
 * Histórico de preço do item, para o comprador conferir antes de fechar o
 * preço: a última compra (pela nota de entrada), o custo médio dos últimos 12
 * meses por unidade de estoque — a medida que compara fornecedores que vendem
 * em caixa com os que vendem em unidade — e o preço do último pedido.
 */
export function HistoricoPrecoPanel({ itemCode, precoAtual }: { itemCode?: string; precoAtual?: number }): JSX.Element | null {
  const [hist, setHist] = useState<HistoricoPreco | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    setHist(null);
    setErro("");
    if (!itemCode) return;
    let vivo = true;
    setCarregando(true);
    getPriceHistory(itemCode)
      .then((h) => { if (vivo) setHist(h); })
      .catch((e) => { if (vivo) setErro(errMessage(e)); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [itemCode]);

  if (!itemCode) return null;
  if (carregando) return <div className="pdc-hist" data-testid="historico-preco"><span className="erp-spin" /> Buscando o histórico de preço…</div>;
  if (erro) return <div className="pdc-hist pdc-falta" data-testid="historico-preco">Histórico de preço indisponível: {erro}</div>;
  if (!hist) return null;

  const semCompras = hist.qtd_compras_12m === 0;
  const variacao = precoAtual && hist.ultima?.preco_nota
    ? ((precoAtual - hist.ultima.preco_nota) / hist.ultima.preco_nota) * 100 : undefined;

  return (
    <div className="pdc-hist" data-testid="historico-preco">
      <div className="pdc-hist-linha">
        <strong>Histórico de preço</strong>
        {semCompras
          ? <span>Nenhuma compra deste item com nota nos últimos 12 meses.</span>
          : <>
              <span>Última compra: <b>{brl(hist.ultima?.preco_nota, 4)}</b>{hist.ultima?.unidade ? `/${hist.ultima.unidade}` : ""} · NF {hist.ultima?.numero_nf} de {dataBR(hist.ultima?.data_entrada)} · {hist.ultima?.supplier_name}</span>
              <span>Custo médio 12 meses: <b>{brl(hist.custo_medio_12m, 4)}</b> por unidade de estoque (mín. {brl(hist.custo_minimo_12m, 4)} · máx. {brl(hist.custo_maximo_12m, 4)} · {hist.qtd_compras_12m} compra{hist.qtd_compras_12m === 1 ? "" : "s"})</span>
            </>}
        {hist.ultimo_pedido && (
          <span>Último pedido: nº {hist.ultimo_pedido.order_number} de {dataBR(hist.ultimo_pedido.emission_date)} a <b>{brl(hist.ultimo_pedido.unit_price, 4)}</b> ({hist.ultimo_pedido.supplier_name})</span>
        )}
        {variacao !== undefined && Math.abs(variacao) >= 0.01 && (
          <span className={variacao > 0 ? "pdc-falta" : "pdc-quitado"}>
            Preço informado {variacao > 0 ? "acima" : "abaixo"} da última compra em {Math.abs(variacao).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          </span>
        )}
        {!semCompras && (
          <button type="button" className="erp-btn erp-btn-sm" onClick={() => setAberto((a) => !a)}>
            {aberto ? "Ocultar compras" : "Ver compras"}
          </button>
        )}
      </div>
      {aberto && (
        <table className="erp-grid" style={{ marginTop: 6 }}>
          <thead><tr><th>Entrada</th><th>NF</th><th>Fornecedor</th><th className="num">Qtde</th><th className="num">Preço na nota</th><th className="num">Custo/un. estoque</th></tr></thead>
          <tbody>
            {hist.compras.map((c) => (
              <tr key={`${c.fiscal_entry_id}-${c.numero_nf}-${c.quantidade}`}>
                <td>{dataBR(c.data_entrada)}</td><td>{c.numero_nf}</td><td>{c.supplier_name}</td>
                <td className="num">{num(c.quantidade)} {c.unidade ?? ""}</td>
                <td className="num">{brl(c.preco_nota, 4)}</td><td className="num">{brl(c.custo_estoque, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
