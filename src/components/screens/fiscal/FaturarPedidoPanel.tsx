import { useState } from "react";
import { type PedidoParaFaturar, previaFaturamentoPedido, faturarPedido } from "@/services/faturamentoPedidoService";
import { type FiscalExit } from "@/services/nfeService";
import { errMessage } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadSalesOrders } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const today = () => new Date().toISOString().slice(0, 10);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtd = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const round2 = (n: number) => Math.round(n * 100) / 100;

const ROTULO_STATUS_PEDIDO: Record<string, string> = {
  R: "Rascunho", P: "Pedido", A: "Em análise", OA: "Orçamento em análise", OF: "Orçamento", F: "Faturado", CANCELLED: "Cancelado",
};
const ROTULO_STATUS_NF: Record<string, string> = {
  DRAFT: "Rascunho", AGUARDANDO_AUTORIZACAO: "Aguardando autorização", AUTHORIZED: "Autorizada", CANCELLED: "Cancelada", REJECTED: "Rejeitada",
};

interface Props {
  onCriada: (nf: FiscalExit) => void;
  onFeedback: (f: FeedbackState) => void;
}

/**
 * Faturar pedido de venda: escolhido o pedido, a tela mostra o que vai para a
 * nota — cliente e endereço, representante e comissão, condição de pagamento e
 * as linhas com o que falta faturar. O usuário pode faturar tudo ou só parte
 * (desmarcando linhas ou reduzindo quantidades); o resto continua pendente
 * para a próxima nota.
 */
export function FaturarPedidoPanel({ onCriada, onFeedback }: Props): JSX.Element {
  const [pedidoCode, setPedidoCode] = useState<number | undefined>();
  const [previa, setPrevia] = useState<PedidoParaFaturar | null>(null);
  const [qtds, setQtds] = useState<Record<number, number>>({});
  const [emissao, setEmissao] = useState(today());
  const [saida, setSaida] = useState(today());
  const [serie, setSerie] = useState("1");
  const [cfop, setCfop] = useState("");
  const [natureza, setNatureza] = useState("");
  const [frete, setFrete] = useState<string>("");
  const [seguro, setSeguro] = useState<string>("");
  const [desconto, setDesconto] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function carregar(code?: number) {
    setPedidoCode(code); setPrevia(null);
    if (!code) return;
    setBusy(true); onFeedback(null);
    try {
      const p = await previaFaturamentoPedido(code);
      setPrevia(p);
      setQtds(Object.fromEntries(p.itens.map((i) => [i.sales_order_item_code, i.quantidade_pendente])));
      setCfop(p.cfop_sugerido); setNatureza(p.natureza_sugerida);
      setFrete(""); setSeguro(""); setDesconto("");
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  const produtos = previa ? round2(previa.itens.reduce((s, i) => s + (qtds[i.sales_order_item_code] ?? 0) * i.preco_unitario, 0)) : 0;
  const totalPedidoPendente = previa?.valor_pendente ?? 0;
  const parcial = previa ? previa.itens.some((i) => (qtds[i.sales_order_item_code] ?? 0) < i.quantidade_pendente) : false;
  const totalPedido = previa ? previa.itens.reduce((s, i) => s + i.quantidade_pedida * i.preco_unitario, 0) : 0;
  const proporcao = totalPedido > 0 ? Math.min(1, produtos / totalPedido) : 1;
  const estimado = (v: number) => round2(v * proporcao);

  async function gerar() {
    if (!previa) return;
    const itens = previa.itens
      .filter((i) => (qtds[i.sales_order_item_code] ?? 0) > 0)
      .map((i) => ({ sales_order_item_code: i.sales_order_item_code, quantidade: qtds[i.sales_order_item_code] }));
    if (!itens.length) { onFeedback({ type: "error", message: "Informe a quantidade de ao menos uma linha." }); return; }
    const excedida = previa.itens.find((i) => (qtds[i.sales_order_item_code] ?? 0) > i.quantidade_pendente);
    if (excedida) { onFeedback({ type: "error", message: `Item ${excedida.item_code}: só faltam ${qtd(excedida.quantidade_pendente)} para faturar.` }); return; }
    if (!/^[567]\d{3}$/.test(cfop.trim())) { onFeedback({ type: "error", message: "Informe um CFOP de saída válido." }); return; }
    setBusy(true); onFeedback(null);
    try {
      const nf = await faturarPedido({
        sales_order_code: previa.sales_order_code, data_emissao: emissao, data_saida: saida || undefined, serie,
        cfop: cfop.trim(), natureza_operacao: natureza,
        valor_frete: frete === "" ? undefined : Number(frete),
        valor_seguro: seguro === "" ? undefined : Number(seguro),
        valor_desconto: desconto === "" ? undefined : Number(desconto),
        itens: parcial ? itens : undefined,
      });
      onCriada(nf);
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Pedido de venda</div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c6"><label className="erp-label erp-req">Pedido</label>
            <LookupField value={pedidoCode} loader={loadSalesOrders} entityLabel="pedido de venda" onChange={(c) => void carregar(c ? Number(c) : undefined)} /></div>
          {previa && <div className="erp-field erp-c6" style={{ alignSelf: "end" }}>
            <span className="erp-badge erp-badge-gray">{ROTULO_STATUS_PEDIDO[previa.status] ?? previa.status}</span>{" "}
            Pedido {previa.order_number || previa.sales_order_code} de {previa.emission_date?.slice(0, 10).split("-").reverse().join("/")}
          </div>}
        </div>
      </div>

      {busy && !previa && <div className="erp-feedback info">Carregando pedido…</div>}

      {previa && (
        <>
          {previa.impedimentos.length > 0 && (
            <div className="erp-feedback error">
              <strong>O pedido não pode ser faturado agora:</strong>
              <ul style={{ margin: "4px 0 0 18px" }}>{previa.impedimentos.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}

          <div className="erp-metrics">
            <div className="erp-metric"><div className="erp-metric-label">Cliente</div><div className="erp-metric-value" style={{ fontSize: 14 }}>{previa.customer_name || "—"}</div>
              <small>{previa.customer_document} {previa.customer_city ? `· ${previa.customer_city}/${previa.customer_uf}` : ""} {previa.endereco_completo ? "" : "· endereço incompleto"}</small></div>
            <div className="erp-metric"><div className="erp-metric-label">Representante / comissão</div>
              <div className="erp-metric-value" style={{ fontSize: 14 }}>{previa.comissoes.length
                ? previa.comissoes.map((c) => `${c.representative_name || c.representative_code} ${c.commission_pct}%`).join(" · ")
                : previa.representative_code ? `${previa.representative_name || previa.representative_code} ${previa.commission_pct}%` : "—"}</div>
              <small>A comissão é lançada pela nota autorizada, no regime configurado.</small></div>
            <div className="erp-metric"><div className="erp-metric-label">Condição de pagamento</div><div className="erp-metric-value" style={{ fontSize: 14 }}>{previa.payment_term_descricao || (previa.payment_term_code ? `#${previa.payment_term_code}` : "à vista / cadastro do cliente")}</div></div>
            <div className="erp-metric"><div className="erp-metric-label">Pendente de faturar</div><div className="erp-metric-value">R$ {money(totalPedidoPendente)}</div></div>
            <div className="erp-metric"><div className="erp-metric-label">Nesta nota (produtos)</div><div className="erp-metric-value">R$ {money(produtos)}</div><small>{parcial ? "faturamento parcial" : "tudo o que falta"}</small></div>
          </div>

          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Itens do pedido</div>
            <div className="erp-fieldset-body"><div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
              <table className="erp-grid">
                <thead><tr>
                  <th>Seq</th><th>Item</th><th>NCM</th><th>UN</th><th style={{ textAlign: "right" }}>Pedida</th><th style={{ textAlign: "right" }}>Faturada</th>
                  <th style={{ textAlign: "right" }}>Em nota</th><th style={{ textAlign: "right" }}>Pendente</th><th style={{ textAlign: "right" }}>Preço líq.</th>
                  <th style={{ width: 120 }}>Faturar agora</th><th style={{ textAlign: "right" }}>Valor</th>
                </tr></thead>
                <tbody>
                  {previa.itens.map((i) => {
                    const q = qtds[i.sales_order_item_code] ?? 0;
                    return (
                      <tr key={i.sales_order_item_code} style={i.quantidade_pendente <= 0 ? { opacity: 0.55 } : undefined}>
                        <td>{i.sequence}</td>
                        <td>{i.item_code} — {i.item_name}</td>
                        <td style={!i.ncm ? { color: "#b91c1c" } : undefined}>{i.ncm || "sem NCM"}</td>
                        <td>{i.uom}</td>
                        <td style={{ textAlign: "right" }}>{qtd(i.quantidade_pedida)}</td>
                        <td style={{ textAlign: "right" }}>{qtd(i.quantidade_faturada)}</td>
                        <td style={{ textAlign: "right" }}>{qtd(i.quantidade_em_nota)}</td>
                        <td style={{ textAlign: "right" }}>{qtd(i.quantidade_pendente)}</td>
                        <td style={{ textAlign: "right" }}>{money(i.preco_unitario)}{i.desconto_pct ? <small style={{ display: "block" }}>-{i.desconto_pct}%</small> : null}</td>
                        <td><input className="erp-input num" type="number" min={0} max={i.quantidade_pendente} step="any" style={{ height: 30, width: 100 }}
                          disabled={i.quantidade_pendente <= 0} value={q}
                          onChange={(e) => setQtds((x) => ({ ...x, [i.sales_order_item_code]: Number(e.target.value) }))} /></td>
                        <td style={{ textAlign: "right" }}>{money(q * i.preco_unitario)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div></div>
          </div>

          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Dados da nota</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label">Emissão</label><input className="erp-input" type="date" value={emissao} onChange={(e) => setEmissao(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Saída</label><input className="erp-input" type="date" value={saida} onChange={(e) => setSaida(e.target.value)} /></div>
              <div className="erp-field erp-c1"><label className="erp-label">Série</label><input className="erp-input" value={serie} onChange={(e) => setSerie(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">CFOP</label>
                <input className="erp-input" list="cfops-venda" value={cfop} maxLength={4} onChange={(e) => setCfop(e.target.value.replace(/\D/g, ""))} />
                <datalist id="cfops-venda">
                  <option value="5101">Venda de produção — dentro do estado</option>
                  <option value="6101">Venda de produção — fora do estado</option>
                  <option value="5102">Revenda — dentro do estado</option>
                  <option value="6102">Revenda — fora do estado</option>
                  <option value="5405">Revenda com ST — dentro do estado</option>
                </datalist></div>
              <div className="erp-field erp-c5"><label className="erp-label erp-req">Natureza da operação</label><input className="erp-input" value={natureza} onChange={(e) => setNatureza(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Frete</label><input className="erp-input num" type="number" step="0.01" value={frete} placeholder={money(estimado(previa.freight_value))} onChange={(e) => setFrete(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Seguro</label><input className="erp-input num" type="number" step="0.01" value={seguro} placeholder={money(estimado(previa.insurance_value))} onChange={(e) => setSeguro(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Desconto</label><input className="erp-input num" type="number" step="0.01" value={desconto} placeholder={money(estimado(previa.discount_value))} onChange={(e) => setDesconto(e.target.value)} /></div>
              <div className="erp-field erp-c6"><span className="erp-field-hint">Em branco, frete, seguro e desconto do pedido entram na proporção do que está sendo faturado. Os impostos são calculados na criação da nota e conferidos na prévia antes da transmissão.</span></div>
              <div className="erp-field erp-c12" style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="erp-btn erp-btn-primary" onClick={() => void gerar()} disabled={busy || !previa.pode_faturar || produtos <= 0}>
                  {busy ? "Gerando..." : "Gerar NF-e (rascunho)"}
                </button>
              </div>
            </div>
          </div>

          {previa.notas_do_pedido.length > 0 && (
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Notas já emitidas para este pedido</div>
              <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>NF</th><th>Situação</th><th style={{ textAlign: "right" }}>Total</th></tr></thead>
                  <tbody>{previa.notas_do_pedido.map((n) => (
                    <tr key={n.id}><td>{n.numero_nf}</td><td>{ROTULO_STATUS_NF[n.status] ?? n.status}</td><td style={{ textAlign: "right" }}>{money(n.valor_total)}</td></tr>
                  ))}</tbody>
                </table>
              </div></div>
            </div>
          )}
        </>
      )}
    </>
  );
}
