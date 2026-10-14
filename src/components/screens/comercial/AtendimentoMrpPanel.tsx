import { Fragment, useCallback, useEffect, useState } from "react";
import { type SalesOrderChain, getSalesOrderPegging } from "@/services/mrpService";
import { errMessage } from "@/services/fiscalShared";
import { Painel, Vazio } from "../planejamento/planUi";
import { data, num } from "../planejamento/planFormat";
import { Arvore, SeloCadeia } from "../planejamento/mrp/RastreamentoTab";

/**
 * Como o MRP atende o pedido de venda: para cada plano ativo que considerou o
 * pedido no último cálculo, de onde vem cada linha (estoque, ordens, compras),
 * o que falta e o que vai chegar atrasado. Só leitura — a ação é no MRP.
 */
export function AtendimentoMrpPanel({ orderCode }: { orderCode: number }): JSX.Element {
  const [planos, setPlanos] = useState<SalesOrderChain[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setPlanos(null); setErro(null); setAberta(null);
    try { setPlanos(await getSalesOrderPegging(orderCode)); }
    catch (e) { setErro(errMessage(e)); setPlanos([]); }
  }, [orderCode]);
  useEffect(() => { void carregar(); }, [carregar]);

  if (erro) return <Painel titulo="Atendimento (MRP)"><Vazio titulo="Não foi possível carregar o atendimento do pedido" texto={erro} acao={<button className="erp-btn" onClick={() => void carregar()}>Tentar de novo</button>} /></Painel>;
  if (planos === null) return <Painel titulo="Atendimento (MRP)"><Vazio titulo="Carregando…" /></Painel>;
  if (planos.length === 0) {
    return (
      <Painel titulo="Atendimento (MRP)">
        <Vazio titulo="Nenhum cálculo do MRP considerou este pedido"
          texto="O pedido entra no MRP depois de confirmado, quando um plano de produção ativo é calculado. Peça ao PCP para rodar o MRP do plano." />
      </Painel>
    );
  }
  return (
    <>
      {planos.map((p) => (
        <Painel key={p.plan_code} titulo={`Plano ${p.plan_name || p.plan_code}`}
          sub={p.calculated_at ? `último cálculo em ${data(p.calculated_at)} · clique numa linha para ver a cadeia` : "clique numa linha para ver a cadeia"}
          acoes={<button className="erp-btn erp-btn-sm erp-btn-ghost" onClick={() => void carregar()}>Atualizar</button>} flush>
          <div className="vpl-grid-scroll">
            <table className="erp-grid">
              <thead><tr><th>Item</th><th>Necessidade</th><th className="num">Quantidade</th><th className="num">Estoque</th><th className="num">Ordens firmes</th><th className="num">Sugestões</th><th className="num">Falta</th><th>Situação</th><th>Pronto em</th></tr></thead>
              <tbody>
                {p.roots.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhuma linha do pedido neste plano.</td></tr>}
                {p.roots.map((r, i) => {
                  const chave = `${p.plan_code}-${i}`;
                  return (
                    <Fragment key={chave}>
                      <tr className={`vpl-click${aberta === chave ? " erp-row-sel" : ""}`} onClick={() => setAberta((a) => (a === chave ? null : chave))}>
                        <td className="vpl-strong">{r.item_code}<span className="vpl-sub">{r.item_description}</span></td>
                        <td>{data(r.need_date)}</td>
                        <td className="num">{num(r.quantity)} {r.uom ?? ""}</td>
                        <td className="num">{r.from_stock ? num(r.from_stock) : "—"}</td>
                        <td className="num">{r.from_firm ? num(r.from_firm) : "—"}</td>
                        <td className="num">{r.from_suggestions ? num(r.from_suggestions) : "—"}</td>
                        <td className="num">{r.shortage ? num(r.shortage) : "—"}</td>
                        <td><SeloCadeia r={r} /></td>
                        <td>{r.latest_supply ? data(r.latest_supply) : "—"}</td>
                      </tr>
                      {aberta === chave && (
                        <tr className="vpl-inline-edit"><td colSpan={9} style={{ padding: 0 }}><Arvore nos={p.trees[i] ?? []} modo="baixo" /></td></tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Painel>
      ))}
      <p className="erp-note">É o retrato do último cálculo do MRP: o que mudou depois (estoque, ordens firmadas, compras recebidas) aparece no próximo cálculo. "Atrasada" quer dizer que alguma ordem da cadeia termina depois da necessidade.</p>
    </>
  );
}
