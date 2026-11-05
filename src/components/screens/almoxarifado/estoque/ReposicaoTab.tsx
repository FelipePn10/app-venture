import { useState } from "react";
import { gerarReposicao, getReposicao, type LinhaReposicaoDTO, type OrigemReposicao, type ReposicaoDTO } from "@/services/stockService";
import { EntityName } from "@/components/ui/EntityName";
import { loadWarehouses } from "@/services/lookups";
import { qtd, useAcao } from "./comum";
import { KanbanSecao } from "./KanbanSecao";
import { PoliticasReposicao } from "./PoliticasReposicao";
import { FeedbackBox } from "./ui";

const ORIGEM: Record<OrigemReposicao, string> = { COMPRA: "Comprar", TRANSFERENCIA: "Transferir", PRODUCAO: "Produzir" };
const chave = (s: ReposicaoDTO) => `${s.item_code}:${s.mask}:${s.warehouse_id ?? 0}`;

/**
 * Reposição por mínimo e máximo. Com política, cada almoxarifado é calculado
 * sozinho e diz de onde vem o material; sem política, vale o cadastro do item
 * sobre o saldo somado. A projeção desconta reserva, lote retido e requisição
 * aberta, e soma o que já está a caminho, para não pedir duas vezes.
 */
export function ReposicaoTab() {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lista, setLista] = useState<ReposicaoDTO[] | null>(null);
  const [marcados, setMarcados] = useState<Record<string, string>>({});

  const consultar = () => run(async () => {
    const r = await getReposicao();
    setLista(r);
    setMarcados(Object.fromEntries(r.filter((s) => s.suggested_qty > 0).map((s) => [chave(s), String(s.suggested_qty)])));
  });
  const gerar = () => run(async () => {
    const linhas: LinhaReposicaoDTO[] = (lista ?? []).flatMap((s) => {
      const q = marcados[chave(s)]?.replace(",", ".");
      if (!q || !(Number(q) > 0)) return [];
      return [{ item_code: s.item_code, mask: s.mask || undefined, warehouse_id: s.warehouse_id, source_type: s.source_type, source_warehouse_id: s.source_warehouse_id, quantity: q }];
    });
    if (linhas.length === 0) { setFeedback({ type: "error", message: "Marque ao menos um item com quantidade." }); return; }
    const r = await gerarReposicao(linhas);
    const partes = [
      r.purchase_requisition_code ? `requisição de compra ${r.purchase_requisition_code} (siga em VSUP0300)` : "",
      r.transfer_requisition_codes.length ? `ordem de reposição ${r.transfer_requisition_codes.join(", ")} (atenda na aba Requisições)` : "",
      r.planned_order_codes.length ? `ordem planejada ${r.planned_order_codes.join(", ")} (firme no planejamento)` : "",
    ].filter(Boolean);
    setLista(await getReposicao());
    setMarcados({});
    setFeedback({ type: "success", message: `Gerado: ${partes.join("; ")}.` });
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Itens a repor</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <button className="erp-btn erp-btn-primary" onClick={consultar} disabled={busy}>Calcular reposição</button>
        {lista && lista.length > 0 && <button className="erp-btn" onClick={gerar} disabled={busy}>Gerar documentos dos marcados</button>}
        <span className="erp-hint">No ponto de pedido, repõe até o máximo; sem máximo, até o próprio ponto, que já contém o estoque de segurança.</span>
      </div>
      {lista && (
        <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
          <table className="erp-grid">
            <thead><tr><th></th><th>Item</th><th>Descrição</th><th>Almoxarifado</th><th>Origem</th><th className="num">Saldo</th><th className="num">Comprometido</th><th className="num">A caminho</th><th className="num">Projetado</th><th className="num">Ponto</th><th className="num">Máximo</th><th className="num">Consumo/mês</th><th className="num">Repor</th><th>Base</th></tr></thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={14} className="erp-grid-empty">Nenhum item abaixo do ponto de pedido.</td></tr>}
              {lista.map((s) => {
                const k = chave(s);
                const marcado = marcados[k] !== undefined;
                return (
                  <tr key={k}>
                    <td><input type="checkbox" aria-label={`Repor ${s.business_code}`} checked={marcado} disabled={s.suggested_qty <= 0} onChange={(e) => setMarcados((p) => {
                      const n = { ...p };
                      if (e.target.checked) n[k] = String(s.suggested_qty); else delete n[k];
                      return n;
                    })} /></td>
                    <td><strong>{s.business_code}</strong></td><td>{s.name}</td>
                    <td>{s.warehouse_id ? <EntityName code={s.warehouse_id} loader={loadWarehouses} prefix="Almox." /> : "Todos"}{s.mask ? ` · ${s.mask}` : ""}</td>
                    <td>{ORIGEM[s.source_type]}{s.source_warehouse_id ? <> de <EntityName code={s.source_warehouse_id} loader={loadWarehouses} prefix="Almox." /></> : null}</td>
                    <td className="num">{qtd(s.on_hand)}</td><td className="num">{qtd(s.reserved + s.retained + s.requested)}</td><td className="num">{qtd(s.on_order)}</td>
                    <td className="num" style={{ color: s.projected < 0 ? "var(--v-err)" : undefined }}><strong>{qtd(s.projected)}</strong></td>
                    <td className="num">{qtd(s.reorder_point)}</td><td className="num">{s.maximum > 0 ? qtd(s.maximum) : "—"}</td><td className="num">{qtd(s.avg_monthly_consumption)}</td>
                    <td className="num">{marcado
                      ? <input className="erp-input num" style={{ maxWidth: 110 }} aria-label={`Quantidade de ${s.business_code}`} value={marcados[k]} onChange={(e) => setMarcados((p) => ({ ...p, [k]: e.target.value }))} />
                      : qtd(s.suggested_qty)} {s.uom}</td>
                    <td><small>{s.reason}{s.minimum_lot ? ` · lote mín. ${qtd(s.minimum_lot)}` : ""}{s.multiple_lot ? ` · múltiplo ${qtd(s.multiple_lot)}` : ""}{s.warning ? <><br /><span style={{ color: "var(--v-err)" }}>{s.warning}</span></> : null}</small></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div></div>
    <PoliticasReposicao />
    <KanbanSecao />
  </>);
}
