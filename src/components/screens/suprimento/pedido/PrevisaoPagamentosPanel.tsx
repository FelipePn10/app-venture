import { useCallback, useEffect, useMemo, useState } from "react";
import { getOrderPaymentForecast, getPaymentForecast, type PrevisaoPagamentos } from "@/services/purchaseOrderService";
import { errMessage } from "@/services/fiscalShared";
import { loadSuppliers } from "@/services/lookups";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (s?: string) => (s ? s.split("-").reverse().join("/") : "—");
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Previsão de pagamentos dos pedidos de compra: o que os pedidos aprovados
 * ainda vão custar, pela condição de pagamento de cada um e pela data em que
 * o material deve chegar. Some do previsto o que já chegou com nota — esse
 * valor passa a existir como título em contas a pagar.
 *
 * Com `code`, mostra só aquele pedido; sem, todos os aprovados no período.
 */
export function PrevisaoPagamentosPanel({ code, onAbrirPedido }: { code?: number; onAbrirPedido?: (code: number) => void }): JSX.Element {
  const hoje = new Date();
  const [de, setDe] = useState(iso(hoje));
  const [ate, setAte] = useState(iso(new Date(hoje.getFullYear(), hoje.getMonth() + 3, hoje.getDate())));
  const [prev, setPrev] = useState<PrevisaoPagamentos | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [fornecedores, setFornecedores] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadSuppliers().then((o) => setFornecedores(Object.fromEntries(o.map((x) => [String(x.code), x.label])))).catch(() => undefined);
  }, []);

  const carregar = useCallback(async () => {
    if (!code && de > ate) { setErro("A data final é anterior à inicial."); return; }
    setCarregando(true);
    setErro("");
    try { setPrev(code ? await getOrderPaymentForecast(code) : await getPaymentForecast(de, ate)); }
    catch (e) { setErro(errMessage(e)); setPrev(null); }
    finally { setCarregando(false); }
  }, [code, de, ate]);
  useEffect(() => { void carregar(); }, [carregar]);

  const porMes = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of prev?.parcelas ?? []) {
      const k = p.vencimento.slice(0, 7);
      m.set(k, (m.get(k) ?? 0) + p.valor);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [prev]);
  const hojeIso = iso(hoje);

  return (
    <div className="erp-fieldset" data-testid="previsao-pagamentos">
      <div className="erp-fieldset-head">{code ? "Pagamentos previstos deste pedido" : "Pagamentos previstos — pedidos de compra aprovados"}</div>
      <div className="erp-fieldset-body">
        {!code && (
          <>
            <div className="erp-field erp-c3"><label className="erp-label">Vencimento de</label>
              <input className="erp-input" type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">até</label>
              <input className="erp-input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
            <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
              <button className="erp-btn erp-btn-primary" onClick={() => void carregar()} disabled={carregando}>Consultar</button></div>
          </>
        )}
        {erro && <div className="erp-field erp-c12"><div className="erp-feedback error">{erro}</div></div>}
        {carregando && <div className="erp-field erp-c12"><span className="erp-spin" /> Calculando…</div>}
        {prev && !carregando && (
          <>
            <div className="erp-field erp-c12">
              <div className="pdc-inline" style={{ flexWrap: "wrap", gap: 16 }}>
                <span>Total previsto: <strong>{brl(prev.total)}</strong></span>
                {porMes.map(([mes, v]) => (
                  <span key={mes}>{MESES[Number(mes.slice(5, 7)) - 1]}/{mes.slice(2, 4)}: <strong>{brl(v)}</strong></span>
                ))}
              </div>
            </div>
            <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
              <table className="erp-grid">
                <thead>
                  <tr>
                    <th>Vencimento</th>{!code && <th>Pedido</th>}{!code && <th>Fornecedor</th>}
                    <th>Parcela</th><th>Condição</th><th>Chegada prevista</th><th className="num">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {prev.parcelas.length === 0 && (
                    <tr><td colSpan={code ? 5 : 7} className="erp-grid-empty">
                      {code ? "Nada a pagar: o pedido já foi todo faturado, cancelado ou ainda não tem itens." : "Nenhum pagamento previsto no período."}
                    </td></tr>
                  )}
                  {prev.parcelas.map((p) => (
                    <tr key={`${p.purchase_order_code}-${p.numero}`}>
                      <td className={p.vencimento < hojeIso ? "pdc-falta" : undefined}>{dataBR(p.vencimento)}{p.vencimento < hojeIso ? " (vencida)" : ""}</td>
                      {!code && <td>{onAbrirPedido
                        ? <button className="erp-btn erp-btn-sm" onClick={() => onAbrirPedido(p.purchase_order_code)}>Nº {p.order_number}</button>
                        : `Nº ${p.order_number}`}</td>}
                      {!code && <td>{p.supplier_code ? fornecedores[String(p.supplier_code)] ?? `Fornecedor ${p.supplier_code}` : "—"}</td>}
                      <td>{p.numero}{p.descricao ? ` · ${p.descricao}` : ""}</td>
                      <td>{p.condicao}</td>
                      <td>{dataBR(p.entrega_prevista)}{p.estimada ? <small className="pdc-hint"> estimada (sem data de entrega)</small> : null}</td>
                      <td className="num">{brl(p.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {prev.avisos.length > 0 && (
              <div className="erp-field erp-c12">
                <div className="erp-feedback info">{prev.avisos.map((a) => <div key={a}>{a}</div>)}</div>
              </div>
            )}
            <div className="erp-field erp-c12">
              <span className="pdc-hint">
                Calculado pelo saldo ainda não faturado de cada linha, pela condição de pagamento do pedido e pela data prometida
                (ou pedida) de entrega. Quando a nota chega, o valor sai daqui e aparece como título em contas a pagar.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
