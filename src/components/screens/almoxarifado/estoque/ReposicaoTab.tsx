import { useState } from "react";
import { gerarRequisicaoDeCompra, getReposicao, type ReposicaoDTO } from "@/services/stockService";
import { qtd, useAcao } from "./comum";
import { FeedbackBox } from "./ui";

/**
 * Reposição por ponto de pedido / estoque mínimo — para o que não passa pelo
 * MRP (consumíveis, manutenção, escritório). A projeção já desconta o que está
 * em pedido de compra e em requisição de compra aberta, para não pedir duas
 * vezes. As linhas escolhidas viram uma requisição de compra (VSUP0300).
 */
export function ReposicaoTab() {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lista, setLista] = useState<ReposicaoDTO[] | null>(null);
  const [marcados, setMarcados] = useState<Record<number, string>>({});

  const consultar = () => run(async () => {
    const r = await getReposicao();
    setLista(r);
    setMarcados(Object.fromEntries(r.map((s) => [s.item_code, String(s.suggested_qty)])));
  });
  const gerar = () => run(async () => {
    const itens = Object.entries(marcados).map(([k, v]) => ({ item_code: Number(k), quantity: Number(v.replace(",", ".")) })).filter((i) => i.quantity > 0);
    if (itens.length === 0) { setFeedback({ type: "error", message: "Marque ao menos um item com quantidade." }); return; }
    const r = await gerarRequisicaoDeCompra(itens);
    setFeedback({ type: "success", message: `Requisição de compra ${r["code"] ?? ""} gerada com ${itens.length} item(ns). Siga em VSUP0300/VSUP0400.` });
    await consultar();
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Itens a repor</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <button className="erp-btn erp-btn-primary" onClick={consultar} disabled={busy}>Calcular reposição</button>
        {lista && lista.length > 0 && <button className="erp-btn" onClick={gerar} disabled={busy}>Gerar requisição de compra com os marcados</button>}
        <span className="erp-hint">Ponto de pedido = TR × CM / CR + ES do cadastro do item (aba Planejamento); sem consumo cadastrado usa o consumo médio apurado; sem fórmula, o estoque mínimo.</span>
      </div>
      {lista && (
        <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
          <table className="erp-grid">
            <thead><tr><th></th><th>Item</th><th>Descrição</th><th className="num">Disponível</th><th className="num">Reservado</th><th className="num">Em pedido</th><th className="num">Projetado</th><th className="num">Ponto de pedido</th><th className="num">Segurança</th><th className="num">Consumo/mês</th><th className="num">Comprar</th><th>Base</th></tr></thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={12} className="erp-grid-empty">Nenhum item abaixo do ponto de pedido.</td></tr>}
              {lista.map((s) => {
                const marcado = marcados[s.item_code] !== undefined;
                return (
                  <tr key={s.item_code}>
                    <td><input type="checkbox" checked={marcado} onChange={(e) => setMarcados((p) => {
                      const n = { ...p };
                      if (e.target.checked) n[s.item_code] = String(s.suggested_qty); else delete n[s.item_code];
                      return n;
                    })} /></td>
                    <td><strong>{s.business_code}</strong></td><td>{s.name}</td>
                    <td className="num">{qtd(s.on_hand)}</td><td className="num">{qtd(s.reserved)}</td><td className="num">{qtd(s.on_order)}</td>
                    <td className="num" style={{ color: s.projected < 0 ? "var(--v-err)" : undefined }}><strong>{qtd(s.projected)}</strong></td>
                    <td className="num">{qtd(s.reorder_point)}</td><td className="num">{qtd(s.safety_stock)}</td><td className="num">{qtd(s.avg_monthly_consumption)}</td>
                    <td className="num">{marcado
                      ? <input className="erp-input num" style={{ maxWidth: 110 }} value={marcados[s.item_code]} onChange={(e) => setMarcados((p) => ({ ...p, [s.item_code]: e.target.value }))} />
                      : qtd(s.suggested_qty)} {s.uom}</td>
                    <td><small>{s.reason}{s.minimum_lot ? ` · lote mín. ${qtd(s.minimum_lot)}` : ""}{s.multiple_lot ? ` · múltiplo ${qtd(s.multiple_lot)}` : ""}</small></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div></div>
  </>);
}
