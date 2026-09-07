import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type QuotationMap, type QuotationItemView,
  getQuotationMap, addQuotationPrice, selectQuotationPrice, generateQuotationOrders,
} from "@/services/purchaseQuotationService";
import { errMessage } from "@/services/fiscalShared";

/**
 * Mapa da cotação — a matriz item × fornecedor.
 *
 * FoccoERP (FCOT0200/FCOT0201) e SAP pedem o preço numa lista e a comparação
 * num relatório à parte. Aqui os dois momentos são o mesmo: digita-se o preço
 * na célula do fornecedor e a comparação já está formada ao lado.
 *
 * Duas leituras que os concorrentes não dão na tela:
 *
 * - **o melhor preço por linha** fica marcado sozinho, e a economia contra o
 *   segundo colocado aparece em reais;
 * - **o total por fornecedor** mostra quanto custaria fechar tudo com cada um —
 *   que quase nunca é a soma dos melhores preços, e é o número que decide entre
 *   pulverizar a compra ou concentrar num fornecedor só.
 */
type Props = { quotationCode: number; onClose: () => void; aviso: (t: "success" | "error", m: string) => void };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Preço de um fornecedor numa linha, ou nulo quando ele não respondeu. */
function precoDe(item: QuotationItemView, fornecedor: number) {
  return item.prices.find((p) => p.supplier_code === fornecedor) ?? null;
}

export function MapaCotacaoPanel({ quotationCode, onClose, aviso }: Props): JSX.Element {
  const [mapa, setMapa] = useState<QuotationMap | null>(null);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try { setMapa(await getQuotationMap(quotationCode)); }
    catch (e) { aviso("error", errMessage(e)); }
    finally { setCarregando(false); }
  }, [quotationCode, aviso]);
  useEffect(() => { void carregar(); }, [carregar]);

  const executar = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  };

  /** Melhor preço de cada linha e a diferença para o segundo colocado. */
  const melhores = useMemo(() => {
    const out: Record<number, { fornecedor: number; preco: number; economia: number }> = {};
    for (const item of mapa?.items ?? []) {
      const ordenados = [...item.prices].filter((p) => p.unit_price > 0).sort((a, b) => a.unit_price - b.unit_price);
      if (ordenados.length === 0) continue;
      const [primeiro, segundo] = ordenados;
      out[item.id] = {
        fornecedor: primeiro.supplier_code,
        preco: primeiro.unit_price,
        // Economia sobre o segundo colocado, no volume da linha. Sem segundo
        // colocado não há comparação — a economia é zero, não infinita.
        economia: segundo ? (segundo.unit_price - primeiro.unit_price) * item.quantity : 0,
      };
    }
    return out;
  }, [mapa]);

  /** Quanto custaria fechar a cotação inteira com cada fornecedor. */
  const totaisPorFornecedor = useMemo(() => {
    const out: Record<number, { total: number; cobertos: number; prazo: number }> = {};
    for (const f of mapa?.suppliers ?? []) {
      let total = 0, cobertos = 0, prazo = 0;
      for (const item of mapa?.items ?? []) {
        const p = precoDe(item, f);
        if (!p || p.unit_price <= 0) continue;
        total += p.unit_price * item.quantity;
        cobertos += 1;
        prazo = Math.max(prazo, p.lead_time_days);
      }
      out[f] = { total, cobertos, prazo };
    }
    return out;
  }, [mapa]);

  const totalMelhorPreco = useMemo(
    () => (mapa?.items ?? []).reduce((acc, i) => acc + (melhores[i.id]?.preco ?? 0) * i.quantity, 0),
    [mapa, melhores],
  );

  const economiaTotal = useMemo(
    () => Object.values(melhores).reduce((acc, m) => acc + m.economia, 0),
    [melhores],
  );

  function gravarPreco(item: QuotationItemView, fornecedor: number) {
    const chave = `${item.id}:${fornecedor}`;
    const valor = Number(rascunho[chave]);
    if (!(valor > 0)) { aviso("error", "Informe um preço maior que zero."); return; }
    void executar(async () => {
      await addQuotationPrice({ quotation_item_id: item.id, supplier_code: fornecedor, price: valor });
      setRascunho((r) => { const c = { ...r }; delete c[chave]; return c; });
      await carregar();
    });
  }

  const selecionados = (mapa?.items ?? []).filter((i) => i.prices.some((p) => p.is_selected)).length;
  const totalItens = mapa?.items.length ?? 0;

  return (
    <div className="cot-backdrop" role="dialog" aria-modal="true" aria-label="Mapa da cotação">
      <div className="cot-modal">
        <header className="cot-head">
          <div>
            <div className="cot-head-title">Mapa da cotação {quotationCode}</div>
            <div className="cot-head-sub">
              {selecionados} de {totalItens} item(ns) com fornecedor escolhido
            </div>
          </div>
          <div className="cot-head-actions">
            <button className="erp-btn erp-btn-primary erp-btn-sm" disabled={busy || selecionados === 0}
              onClick={() => void executar(async () => {
                await generateQuotationOrders(quotationCode);
                aviso("success", "Pedidos de compra gerados a partir dos fornecedores escolhidos.");
                await carregar();
              })}>Gerar pedidos</button>
            <button className="erp-btn erp-btn-sm" onClick={onClose}>Fechar</button>
          </div>
        </header>

        <div className="cot-body">
          {carregando && <div className="erp-grid-empty">Carregando o mapa…</div>}

          {mapa && mapa.suppliers.length === 0 && (
            <div className="erp-feedback info">
              Esta cotação ainda não tem fornecedores convidados. Convide ao menos dois — com um só
              não há comparação, e é a comparação que justifica o preço na auditoria.
            </div>
          )}

          {mapa && mapa.suppliers.length > 0 && (
            <>
              <div className="cot-scroll">
                <table className="erp-grid cot-tabela">
                  <thead>
                    <tr>
                      <th className="cot-fixo">Item</th>
                      <th className="num">Qtde</th>
                      {mapa.suppliers.map((f) => <th key={f} className="num">Fornecedor {f}</th>)}
                      <th className="num">Melhor</th>
                      <th className="num">Economia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapa.items.map((item) => {
                      const melhor = melhores[item.id];
                      return (
                        <tr key={item.id}>
                          <td className="cot-fixo">
                            <strong>{item.item_code}</strong>
                            {item.delivery_date && <span className="cot-sub">entrega {item.delivery_date.slice(0, 10)}</span>}
                          </td>
                          <td className="num">{item.quantity.toLocaleString("pt-BR")} {item.uom ?? ""}</td>
                          {mapa.suppliers.map((f) => {
                            const p = precoDe(item, f);
                            const ehMelhor = melhor?.fornecedor === f;
                            const chave = `${item.id}:${f}`;
                            return (
                              <td key={f} className={`num cot-celula${ehMelhor ? " melhor" : ""}${p?.is_selected ? " escolhido" : ""}`}>
                                {p ? (
                                  <>
                                    <div className="cot-preco">{brl(p.unit_price)}</div>
                                    <div className="cot-sub">
                                      {p.lead_time_days > 0 ? `${p.lead_time_days} dia(s)` : "prazo não informado"}
                                    </div>
                                    <button className="erp-btn erp-btn-sm" disabled={busy || p.is_selected}
                                      onClick={() => void executar(async () => {
                                        await selectQuotationPrice(p.id);
                                        aviso("success", `Fornecedor ${f} escolhido para ${item.item_code}.`);
                                        await carregar();
                                      })}>
                                      {p.is_selected ? "escolhido" : "escolher"}
                                    </button>
                                  </>
                                ) : (
                                  <div className="cot-vazio">
                                    <input className="erp-input num erp-input-sm" type="number" step="0.0001"
                                      placeholder="preço" value={rascunho[chave] ?? ""}
                                      onChange={(e) => setRascunho((r) => ({ ...r, [chave]: e.target.value }))}
                                      onKeyDown={(e) => { if (e.key === "Enter") gravarPreco(item, f); }} />
                                    <button className="erp-btn erp-btn-sm" disabled={busy || !rascunho[chave]}
                                      onClick={() => gravarPreco(item, f)}>gravar</button>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="num">{melhor ? brl(melhor.preco) : "—"}</td>
                          <td className="num cot-economia">{melhor && melhor.economia > 0 ? brl(melhor.economia) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th className="cot-fixo" style={{ textAlign: "left" }}>Fechar tudo com…</th>
                      <th />
                      {mapa.suppliers.map((f) => {
                        const t = totaisPorFornecedor[f];
                        const completo = t.cobertos === mapa.items.length;
                        return (
                          <th key={f} className="num">
                            <div>{brl(t.total)}</div>
                            <div className={`cot-sub${completo ? "" : " parcial"}`}>
                              {completo ? `prazo ${t.prazo} dia(s)` : `cotou ${t.cobertos}/${mapa.items.length}`}
                            </div>
                          </th>
                        );
                      })}
                      <th className="num">{brl(totalMelhorPreco)}</th>
                      <th className="num cot-economia">{economiaTotal > 0 ? brl(economiaTotal) : "—"}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="cot-resumo">
                <div>
                  <b>Pulverizar a compra</b> — cada item com quem cotou mais barato:
                  <strong> {brl(totalMelhorPreco)}</strong>
                </div>
                <div>
                  <b>Concentrar num fornecedor</b> — o mais barato entre os que cotaram tudo:
                  <strong> {(() => {
                    const completos = mapa.suppliers.filter((f) => totaisPorFornecedor[f].cobertos === mapa.items.length);
                    if (completos.length === 0) return " nenhum cotou todos os itens";
                    const melhorTotal = Math.min(...completos.map((f) => totaisPorFornecedor[f].total));
                    const quem = completos.find((f) => totaisPorFornecedor[f].total === melhorTotal);
                    return ` fornecedor ${quem} · ${brl(melhorTotal)}`;
                  })()}</strong>
                </div>
                <span className="cot-nota">
                  A diferença entre os dois números é o que se paga (ou se economiza) por concentrar a
                  compra. Frete e condição de pagamento não entram aqui: confira antes de decidir.
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{COT_STYLES}</style>
    </div>
  );
}

const COT_STYLES = `
.cot-backdrop { position: fixed; inset: 0; z-index: 70; background: rgba(12,22,16,.5); display: flex; align-items: center; justify-content: center; padding: 20px; }
.cot-modal { width: min(1300px, 98vw); max-height: 92vh; display: flex; flex-direction: column; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 18px 48px rgba(0,0,0,.28); }
.cot-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 13px 18px; background: #16281d; color: #dff0e2; }
.cot-head-title { font-size: 14px; font-weight: 700; }
.cot-head-sub { font-size: 11.5px; opacity: .75; }
.cot-head-actions { display: flex; gap: 8px; }
.cot-body { padding: 14px 18px; overflow: auto; display: flex; flex-direction: column; gap: 14px; }
.cot-scroll { overflow-x: auto; }
.cot-tabela { min-width: 100%; font-size: 12px; }
.cot-tabela th, .cot-tabela td { vertical-align: top; }
.cot-fixo { position: sticky; left: 0; background: #fff; z-index: 1; }
.cot-tabela thead .cot-fixo, .cot-tabela tfoot .cot-fixo { background: #fafcf9; }
.cot-celula { min-width: 128px; }
.cot-celula.melhor { background: #f0faf2; }
.cot-celula.escolhido { background: #e7f4e9; box-shadow: inset 0 0 0 1.5px #2f7d47; }
.cot-preco { font-weight: 700; color: #1e6030; }
.cot-sub { display: block; font-size: 10px; color: #7a9a84; }
.cot-sub.parcial { color: #b5761a; }
.cot-vazio { display: flex; flex-direction: column; gap: 3px; align-items: flex-end; }
.cot-vazio .erp-input { width: 92px; }
.cot-economia { color: #1e6030; font-weight: 600; }
.cot-resumo { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; background: #fafcf9; border: 1px solid #dbe8d5; border-radius: 9px; font-size: 12.5px; }
.cot-nota { font-size: 11px; color: #6b7d71; }
.erp-input-sm { height: 26px; font-size: 11.5px; padding: 0 6px; }
`;
