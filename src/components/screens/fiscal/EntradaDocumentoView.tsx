import { Fragment, useEffect, useMemo, useState } from "react";
import {
  type EntradaDocumento, type SugestaoItem, type ConciliacaoPayload, type LinhaPedidoCompra,
  salvarConciliacao, aprovarEntrada, cancelarEntrada, sugerirItens, listarPedidosDoItem, baixarXmlEntrada,
  cadastrarFornecedorDaNota, cadastrarItemDaNota, unidadeDoCadastro, tipoUsoPeloCfop, UNIDADES_ITEM, type TipoUsoItem,
  ROTULO_ESTRATEGIA, ROTULO_ESTOQUE, ROTULO_STATUS_ENTRADA,
} from "@/services/nfeEntradaService";
import { errMessage } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import {
  loadItems, loadChartOfAccounts, loadFinancialCostCenters, loadEntryOperations, loadWarehouses, resetLookups, type LookupOption,
} from "@/services/lookups";
import {
  chaveConta, lerChave, planoFinanceiro, chavesOrdenadas, distribuirProporcional, parcelasIguais,
  conferirMatriz, paraCentavos, deCentavos,
} from "./entradaRateio";
import { DevolucaoCompraPanel } from "./DevolucaoCompraPanel";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "itens" | "financeiro" | "divergencias" | "nota";

interface ItemEdit {
  id: number;
  item_code?: number;
  plano?: number;
  cc?: number;
  lembrar: boolean;
  fator?: number;
  /** Operação de entrada do item (TES). */
  op?: number;
  almox?: number;
  /** Linha do pedido de compra; 0 = desfazer o vínculo. */
  linha?: number;
  linhaRotulo?: string;
  cfop?: string;
  cfopManual: boolean;
}

interface ParcelaEdit {
  numero: number;
  documento?: string;
  vencimento: string;
  valorCent: number;
  forma?: string;
  dist: Map<string, number>;
}

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyCent = (c: number) => money(deCentavos(c));
const qtd = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const dataBR = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const addDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

function itensDoDoc(doc: EntradaDocumento): ItemEdit[] {
  return doc.itens.map((it) => ({
    id: it.id, item_code: it.item_code, plano: it.plano_contas_id, cc: it.centro_custo_id,
    lembrar: false, fator: it.fator_conversao && it.fator_conversao !== 1 ? it.fator_conversao : undefined,
    op: it.entry_operation_code, almox: it.warehouse_id, linha: it.purchase_order_item_code,
    cfop: it.cfop_entrada, cfopManual: false,
  }));
}

function parcelasDoDoc(doc: EntradaDocumento): ParcelaEdit[] {
  return doc.parcelas.map((p) => ({
    numero: p.numero, documento: p.documento, vencimento: p.data_vencimento, valorCent: paraCentavos(p.valor), forma: p.forma_pagamento,
    dist: new Map(p.distribuicao.map((a) => [chaveConta(a.plano_contas_id, a.centro_custo_id), paraCentavos(a.valor)])),
  }));
}

interface Props {
  doc: EntradaDocumento;
  onChange: (d: EntradaDocumento) => void;
  onFeedback: (f: FeedbackState) => void;
  onFechar: () => void;
}

export function EntradaDocumentoView({ doc, onChange, onFeedback, onFechar }: Props): JSX.Element {
  const [aba, setAba] = useState<Aba>("itens");
  const [itens, setItens] = useState<ItemEdit[]>(() => itensDoDoc(doc));
  const [opNota, setOpNota] = useState<number | undefined>(doc.entry_operation_code);
  const [parcelas, setParcelas] = useState<ParcelaEdit[]>(() => parcelasDoDoc(doc));
  const [distManual, setDistManual] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [planos, setPlanos] = useState<Map<number, string>>(new Map());
  const [centros, setCentros] = useState<Map<number, string>>(new Map());
  const [sug, setSug] = useState<{ itemId: number; q: string; lista: SugestaoItem[]; carregando: boolean } | null>(null);
  const [ped, setPed] = useState<{ itemId: number; lista: LinhaPedidoCompra[]; carregando: boolean } | null>(null);
  const [planoEmLote, setPlanoEmLote] = useState<number | undefined>();
  const [qtdParcelas, setQtdParcelas] = useState(3);
  const [intervalo, setIntervalo] = useState(30);
  const [cancelando, setCancelando] = useState<{ motivo: string } | null>(null);
  const [devolvendo, setDevolvendo] = useState(false);
  // Item da nota que não existe no cadastro: cadastro direto da linha.
  const [novoItem, setNovoItem] = useState<{ idx: number; itemId: number; nome: string; unidade: string; almox?: number; tipoUso: TipoUsoItem } | null>(null);

  useEffect(() => {
    setItens(itensDoDoc(doc)); setParcelas(parcelasDoDoc(doc)); setOpNota(doc.entry_operation_code);
    setDirty(false); setDistManual(false); setCancelando(null); setPed(null);
  }, [doc]);

  useEffect(() => {
    const mapa = (os: LookupOption[]) => new Map(os.map((o) => [Number(o.code), o.label]));
    loadChartOfAccounts().then((os) => setPlanos(mapa(os))).catch(() => undefined);
    loadFinancialCostCenters().then((os) => setCentros(mapa(os))).catch(() => undefined);
  }, []);

  const status = (doc.status || "").toUpperCase();
  const parcelasTravadas = doc.parcelas.some((p) => p.conta_pagar_id);
  const editavel = (status === "PENDING" || status === "CONFERRED") && !parcelasTravadas;
  const cancelavel = status === "PENDING" || status === "CONFERRED" || status === "APPROVED";
  const retencoesCent = paraCentavos(doc.total_retencoes);

  // O que a nota deve ao fornecedor e quanto disso cabe a cada plano, a partir
  // da classificação ATUAL da tela (mesma conta da aprovação no backend).
  const financeiro = useMemo(() => planoFinanceiro(doc.itens.map((it, i) => ({
    plano: itens[i]?.plano, cc: itens[i]?.cc, valorContabil: it.valor_contabil, geraFinanceiro: it.gera_financeiro,
  })), retencoesCent), [doc.itens, itens, retencoesCent]);
  const alvos = financeiro.alvos;
  const aPagarCent = financeiro.aPagarCent;
  const contas = useMemo(() => chavesOrdenadas(alvos), [alvos]);
  const assinaturaAlvos = useMemo(() => contas.map((k) => `${k}=${alvos.get(k)}`).join("|"), [contas, alvos]);
  // A classificação como está gravada. Enquanto a tela não muda a
  // classificação, vale a distribuição gravada — inclusive a manual (ex.:
  // parcela 1 toda em EPI); refazer a proporção ao abrir a nota a apagaria.
  const assinaturaGravada = useMemo(() => {
    const t = planoFinanceiro(doc.itens.map((it) => ({
      plano: it.plano_contas_id, cc: it.centro_custo_id, valorContabil: it.valor_contabil, geraFinanceiro: it.gera_financeiro,
    })), retencoesCent).alvos;
    return chavesOrdenadas(t).map((k) => `${k}=${t.get(k)}`).join("|");
  }, [doc.itens, retencoesCent]);

  // Classificação mudou e o usuário não mexeu na distribuição: refaz a proporção.
  useEffect(() => {
    if (!editavel || distManual || assinaturaAlvos === assinaturaGravada) return;
    setParcelas((ps) => {
      const dist = distribuirProporcional(ps.map((p) => p.valorCent), alvos);
      return ps.map((p, i) => ({ ...p, dist: dist[i] }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinaturaAlvos, assinaturaGravada, editavel, distManual]);

  const divergenciasMatriz = useMemo(() => conferirMatriz(
    parcelas.map((p) => ({ numero: p.numero, valorCent: p.valorCent, dist: p.dist })),
    alvos, aPagarCent, moneyCent,
  ), [parcelas, alvos, aPagarCent]);

  const nomeConta = (k: string) => {
    const { plano, cc } = lerChave(k);
    const p = planos.get(plano) ?? `Plano ${plano}`;
    return cc ? `${p} · ${centros.get(cc) ?? `CC ${cc}`}` : p;
  };

  const naoConciliados = itens.filter((i) => !i.item_code).length;
  const semPlano = itens.filter((i) => !i.plano).length;
  const divImpede = doc.divergencias.filter((d) => d.nivel === "IMPEDE").length;

  function setItem(idx: number, patch: Partial<ItemEdit>) {
    setItens((xs) => xs.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
    setDirty(true);
  }

  function escolherItem(idx: number, code?: number) {
    const original = doc.itens[idx];
    const mudou = code !== original.item_code;
    setItem(idx, {
      item_code: code,
      // O vínculo se memoriza quando o usuário decide (e o fornecedor existe):
      // a próxima nota do mesmo fornecedor já vem conciliada.
      lembrar: Boolean(code && mudou && doc.supplier_code && original.supplier_item_code),
      // Trocar o item desfaz a linha do pedido, que era de outro item.
      ...(mudou && itens[idx]?.linha ? { linha: 0, linhaRotulo: undefined } : {}),
    });
  }

  function aplicarPlanoEmLote() {
    if (!planoEmLote) return;
    setItens((xs) => xs.map((x) => (x.plano ? x : { ...x, plano: planoEmLote })));
    setDirty(true);
  }

  async function abrirSugestoes(itemId: number, q = "") {
    setSug({ itemId, q, lista: [], carregando: true });
    try {
      const lista = await sugerirItens(doc.id, itemId, q);
      setSug({ itemId, q, lista, carregando: false });
    } catch (e) {
      setSug(null);
      onFeedback({ type: "error", message: errMessage(e) });
    }
  }

  function abrirNovoItem(idx: number) {
    const it = doc.itens[idx];
    setNovoItem({ idx, itemId: it.id, nome: (it.description ?? "").trim(), unidade: unidadeDoCadastro(it.uom),
      almox: itens[idx]?.almox, tipoUso: tipoUsoPeloCfop(itens[idx]?.cfop || it.cfop_entrada || it.cfop) });
  }

  async function confirmarNovoItem() {
    if (!novoItem) return;
    if (!novoItem.nome.trim()) { onFeedback({ type: "error", message: "Informe o nome do item." }); return; }
    if (!novoItem.unidade) { onFeedback({ type: "error", message: "Escolha a unidade de estoque do item." }); return; }
    if (!novoItem.almox) { onFeedback({ type: "error", message: "Escolha o almoxarifado padrão do item." }); return; }
    setBusy(true);
    try {
      const criado = await cadastrarItemDaNota(doc.id, novoItem.itemId, { nome: novoItem.nome.trim(), unidade: novoItem.unidade,
        warehouse_id: novoItem.almox, tipo_uso: novoItem.tipoUso });
      resetLookups();
      escolherItem(novoItem.idx, criado.item_code);
      if (!itens[novoItem.idx]?.almox) setItem(novoItem.idx, { almox: novoItem.almox });
      setNovoItem(null); setSug(null);
      onFeedback({ type: "success", message: `Item ${criado.item_code} — ${criado.nome} cadastrado e conciliado (grave a conferência). ${criado.aviso}` });
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function cadastrarFornecedor() {
    setBusy(true);
    try {
      const d = await cadastrarFornecedorDaNota(doc.id);
      resetLookups();
      onChange(d);
      onFeedback({ type: "success", message: `Fornecedor ${d.supplier_code ?? ""} cadastrado com os dados do XML (CNPJ, IE e endereço) e ligado à nota. Complete tipo e condição de pagamento em VSUP0500 se precisar.` });
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function abrirPedidos(idx: number) {
    const it = doc.itens[idx];
    const codigo = itens[idx]?.item_code;
    if (!codigo) { onFeedback({ type: "info", message: "Concilie o item com o cadastro antes de escolher o pedido." }); return; }
    if (!doc.supplier_code) { onFeedback({ type: "info", message: "Sem fornecedor no cadastro não há pedido de compra para ligar." }); return; }
    setPed({ itemId: it.id, lista: [], carregando: true });
    try {
      setPed({ itemId: it.id, lista: await listarPedidosDoItem(doc.id, it.id, codigo), carregando: false });
    } catch (e) {
      setPed(null);
      onFeedback({ type: "error", message: errMessage(e) });
    }
  }

  function escolherLinha(idx: number, l: LinhaPedidoCompra | null) {
    setItem(idx, l
      ? { linha: l.code, linhaRotulo: `Pedido ${l.order_number} / item ${l.sequence}`, almox: itens[idx]?.almox ?? l.warehouse_id, fator: l.fator_estoque !== 1 ? l.fator_estoque : itens[idx]?.fator }
      : { linha: 0, linhaRotulo: undefined });
    setPed(null);
  }

  function setParcela(i: number, patch: Partial<ParcelaEdit>) {
    setParcelas((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
    setDirty(true);
  }

  function setValorDist(i: number, k: string, reais: number) {
    setParcelas((ps) => ps.map((p, j) => {
      if (j !== i) return p;
      const dist = new Map(p.dist);
      dist.set(k, paraCentavos(reais));
      return { ...p, dist };
    }));
    setDistManual(true); setDirty(true);
  }

  /** Completa a última conta da parcela com o que falta para fechar o valor. */
  function completarParcela(i: number) {
    setParcelas((ps) => ps.map((p, j) => {
      if (j !== i || !contas.length) return p;
      const dist = new Map(p.dist);
      const ultima = contas[contas.length - 1];
      const outros = contas.slice(0, -1).reduce((s, k) => s + (dist.get(k) ?? 0), 0);
      dist.set(ultima, Math.max(0, p.valorCent - outros));
      return { ...p, dist };
    }));
    setDistManual(true); setDirty(true);
  }

  function redistribuir() {
    setParcelas((ps) => {
      const dist = distribuirProporcional(ps.map((p) => p.valorCent), alvos);
      return ps.map((p, i) => ({ ...p, dist: dist[i] }));
    });
    setDistManual(false); setDirty(true);
  }

  function gerarParcelasIguais() {
    const n = Math.max(1, Math.min(60, qtdParcelas));
    // Parcelas pelo valor a pagar: com retenção, o fornecedor recebe o líquido.
    const valores = parcelasIguais(aPagarCent, n);
    const base = doc.data_emissao || new Date().toISOString().slice(0, 10);
    const dist = distribuirProporcional(valores, alvos);
    setParcelas(valores.map((v, i) => ({
      numero: i + 1, vencimento: addDias(base, intervalo * (i + 1)), valorCent: v, forma: "BOLETO", dist: dist[i],
    })));
    setDistManual(false); setDirty(true);
  }

  function adicionarParcela() {
    const usado = parcelas.reduce((s, p) => s + p.valorCent, 0);
    const resto = Math.max(0, aPagarCent - usado);
    const ultima = parcelas[parcelas.length - 1];
    setParcelas((ps) => [...ps, {
      numero: (ultima?.numero ?? 0) + 1, vencimento: ultima ? addDias(ultima.vencimento, 30) : doc.data_emissao,
      valorCent: resto, forma: ultima?.forma ?? "BOLETO", dist: new Map(),
    }]);
    setDirty(true);
  }

  function removerParcela(i: number) {
    setParcelas((ps) => ps.filter((_, j) => j !== i).map((p, j) => ({ ...p, numero: j + 1 })));
    setDirty(true);
  }

  function montarPayload(): ConciliacaoPayload {
    return {
      entry_operation_code: opNota,
      itens: itens.map((x) => ({
        id: x.id, item_code: x.item_code, plano_contas_id: x.plano, centro_custo_id: x.cc,
        lembrar_vinculo: x.lembrar || undefined, fator_conversao: x.fator && x.fator > 0 ? x.fator : undefined,
        entry_operation_code: x.op, warehouse_id: x.almox, purchase_order_item_code: x.linha,
        cfop_entrada: x.cfopManual && x.cfop ? x.cfop : undefined,
      })),
      parcelas: parcelas.map((p) => ({
        numero: p.numero, documento: p.documento, data_vencimento: p.vencimento, valor: deCentavos(p.valorCent), forma_pagamento: p.forma,
        distribuicao: contas
          .map((k) => ({ ...lerChave(k), v: p.dist.get(k) ?? 0 }))
          .filter((a) => a.v > 0)
          .map((a) => ({ plano_contas_id: a.plano, centro_custo_id: a.cc, valor: deCentavos(a.v) })),
      })),
    };
  }

  async function salvar(): Promise<EntradaDocumento | null> {
    setBusy(true); onFeedback(null);
    try {
      const d = await salvarConciliacao(doc.id, montarPayload());
      onChange(d);
      onFeedback({
        type: d.pode_aprovar ? "success" : "info",
        message: d.pode_aprovar ? "Conferência gravada: a nota está pronta para aprovar." : "Conferência gravada. Ainda há pendências antes da aprovação.",
      });
      return d;
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); return null; }
    finally { setBusy(false); }
  }

  async function aprovar() {
    let atual: EntradaDocumento | null = doc;
    if (dirty) atual = await salvar();
    if (!atual) return;
    if (!atual.pode_aprovar) {
      const motivos = [
        ...atual.pendencias.filter((p) => p.nivel === "IMPEDE").map((p) => p.mensagem),
        ...atual.divergencias.filter((d) => d.nivel === "IMPEDE").map((d) => d.mensagem),
      ];
      onFeedback({ type: "error", message: `A nota ainda não pode ser aprovada: ${motivos.join("; ")}` });
      return;
    }
    const movimenta = atual.itens.filter((it) => it.movimenta_estoque).length;
    const ok = window.confirm(
      `Aprovar a NF-e ${atual.numero_nf}/${atual.serie} de ${atual.razao_social_emitente} no valor de R$ ${money(atual.valor_total)}?\n\n`
      + `• ${atual.parcelas.length} título(s) no contas a pagar (R$ ${money(atual.valor_a_pagar)}), com o rateio por plano de contas`
      + (atual.retencoes.length ? `\n• ${atual.retencoes.length} título(s) de imposto retido a recolher (R$ ${money(atual.total_retencoes)})` : "")
      + (movimenta ? `\n• entrada no estoque de ${movimenta} item(ns) (o que já foi recebido pelo pedido não entra de novo)` : "")
      + `\n• créditos fiscais e, se configurado, os lançamentos contábeis`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const d = await aprovarEntrada(atual.id);
      onChange(d);
      onFeedback({
        type: d.warnings.length ? "info" : "success",
        message: `Nota aprovada: ${d.parcelas.length} título(s) no contas a pagar.${d.warnings.length ? ` Atenção: ${d.warnings.join(" ")}` : ""}`,
      });
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  async function confirmarCancelamento() {
    if (!cancelando) return;
    const motivo = cancelando.motivo.trim();
    if (motivo.length < 10) { onFeedback({ type: "error", message: "Descreva o motivo do cancelamento (pelo menos 10 caracteres)." }); return; }
    setBusy(true); onFeedback(null);
    try {
      const d = await cancelarEntrada(doc.id, motivo);
      onChange(d);
      onFeedback({ type: "success", message: status === "APPROVED" ? "Nota cancelada: títulos, estoque, pedido, créditos e contabilidade estornados." : "Nota cancelada." });
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  const impede = doc.pendencias.filter((p) => p.nivel === "IMPEDE");
  const atencao = [...doc.pendencias.filter((p) => p.nivel === "ATENCAO").map((p) => p.mensagem), ...doc.warnings];
  const situacao = status === "APPROVED" ? "Aprovada" : status === "CANCELLED" ? "Cancelada" : doc.pode_aprovar && !dirty ? "Pronta para aprovar" : "Em conferência";

  return (
    <>
      <div className="erp-toolbar" style={{ marginBottom: 8 }}>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Nota {doc.numero_nf}/{doc.serie}</span>
          {editavel && <button className="erp-btn" onClick={() => void salvar()} disabled={busy || !dirty}>{busy ? "Gravando..." : "Gravar conferência"}</button>}
          {editavel && <button className="erp-btn erp-btn-primary" onClick={() => void aprovar()} disabled={busy}>Aprovar e gerar contas a pagar</button>}
          {doc.chave_acesso && <button className="erp-btn" onClick={() => void baixarXmlEntrada(doc.id, doc.numero_nf).catch((e) => onFeedback({ type: "error", message: errMessage(e) }))}>Baixar XML</button>}
          {status === "APPROVED" && !devolvendo && <button className="erp-btn" onClick={() => { setDevolvendo(true); setCancelando(null); }} disabled={busy}
            title="NF-e de devolução (CFOP 5201/5202, 6201/6202...), total ou parcial">Devolver ao fornecedor</button>}
          {cancelavel && !cancelando && <button className="erp-btn erp-btn-danger" onClick={() => setCancelando({ motivo: "" })} disabled={busy}>Cancelar nota</button>}
          <button className="erp-btn" onClick={onFechar}>Voltar à lista</button>
        </div>
      </div>

      {devolvendo && (
        <DevolucaoCompraPanel entradaId={doc.id} onFeedback={onFeedback} onFechar={() => setDevolvendo(false)} />
      )}

      {cancelando && (
        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Cancelar a NF {doc.numero_nf}/{doc.serie}</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c12"><div className="erp-feedback info">
              {status === "APPROVED"
                ? "A nota aprovada é estornada numa operação só: títulos do contas a pagar cancelados (recusado se algum já foi pago ou abatido por adiantamento), estoque devolvido (recusado se o material já foi consumido), pedido de compra reaberto, créditos fiscais e lançamentos contábeis estornados."
                : "A nota ainda não gerou títulos nem estoque: só deixa de valer."}
            </div></div>
            <div className="erp-field erp-c9"><label className="erp-label erp-req">Motivo</label>
              <input className="erp-input" value={cancelando.motivo} maxLength={500} placeholder="Ex.: nota lançada em duplicidade / mercadoria devolvida integralmente"
                onChange={(e) => setCancelando({ motivo: e.target.value })} /></div>
            <div className="erp-field erp-c3" style={{ alignSelf: "end", display: "flex", gap: 6 }}>
              <button className="erp-btn erp-btn-danger" onClick={() => void confirmarCancelamento()} disabled={busy}>Confirmar cancelamento</button>
              <button className="erp-btn" onClick={() => setCancelando(null)} disabled={busy}>Desistir</button>
            </div>
          </div>
        </div>
      )}

      <div className="erp-metrics">
        <div className="erp-metric"><div className="erp-metric-label">Emitente</div><div className="erp-metric-value" style={{ fontSize: 14 }}>{doc.razao_social_emitente}</div><small>{doc.cnpj_emitente} · {doc.uf_emitente || "—"}</small></div>
        <div className="erp-metric"><div className="erp-metric-label">Fornecedor no cadastro</div><div className="erp-metric-value" style={{ fontSize: 14 }}>{doc.supplier_code ? `${doc.supplier_code} — ${doc.supplier_name ?? ""}` : <span style={{ color: "#b45309" }}>não cadastrado</span>}</div>
          {!doc.supplier_code && (status === "PENDING" || status === "CONFERRED") && <button className="erp-btn erp-btn-sm erp-btn-primary" style={{ marginTop: 4 }} onClick={() => void cadastrarFornecedor()} disabled={busy}
            title="Cria o fornecedor com o CNPJ, a IE e o endereço do XML e liga a nota a ele">Cadastrar da nota</button>}</div>
        <div className="erp-metric"><div className="erp-metric-label">Total da nota</div><div className="erp-metric-value">R$ {money(doc.valor_total)}</div>
          {doc.total_retencoes > 0 && <small>retenções R$ {money(doc.total_retencoes)} · a pagar R$ {moneyCent(aPagarCent)}</small>}</div>
        <div className="erp-metric"><div className="erp-metric-label">Conciliados</div><div className="erp-metric-value">{itens.length - naoConciliados}/{itens.length}</div></div>
        <div className="erp-metric"><div className="erp-metric-label">Com plano de contas</div><div className="erp-metric-value">{itens.length - semPlano}/{itens.length}</div></div>
        <div className="erp-metric"><div className="erp-metric-label">Situação</div><div className="erp-metric-value" style={{ fontSize: 14 }}>{situacao}</div>
          {doc.stock_status && <small>{ROTULO_ESTOQUE[doc.stock_status] ?? doc.stock_status}</small>}</div>
      </div>

      {status === "CANCELLED" && doc.cancel_reason && (
        <div className="erp-feedback info">Cancelada em {dataBR(doc.cancelled_at)}: {doc.cancel_reason}</div>
      )}

      {(impede.length > 0 || atencao.length > 0) && (
        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Pendências {dirty && <span style={{ fontWeight: 400, opacity: 0.65 }}>— gravadas por último; grave para atualizar</span>}</div>
          <div className="erp-fieldset-body"><div className="erp-field erp-c12">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {impede.map((p, i) => <li key={`i${i}`} style={{ color: "#b91c1c" }}>{p.mensagem}</li>)}
              {atencao.map((m, i) => <li key={`a${i}`} style={{ color: "#b45309" }}>{m}</li>)}
            </ul>
          </div></div>
        </div>
      )}

      <div className="erp-tabs">
        <button className={`erp-tab ${aba === "itens" ? "active" : ""}`} onClick={() => setAba("itens")}>Itens e conciliação</button>
        <button className={`erp-tab ${aba === "financeiro" ? "active" : ""}`} onClick={() => setAba("financeiro")}>Parcelas e plano de contas {divergenciasMatriz.length > 0 && editavel ? "⚠" : ""}</button>
        <button className={`erp-tab ${aba === "divergencias" ? "active" : ""}`} onClick={() => setAba("divergencias")}>
          Conferência fiscal e pedido {doc.divergencias.length > 0 ? `(${doc.divergencias.length}${divImpede ? ` · ${divImpede} bloqueia` : ""})` : ""}
        </button>
        <button className={`erp-tab ${aba === "nota" ? "active" : ""}`} onClick={() => setAba("nota")}>Dados da nota</button>
      </div>

      {aba === "itens" && (
        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Itens da nota × cadastro</div>
          <div className="erp-fieldset-body">
            {editavel && (
              <>
                <div className="erp-field erp-c4"><label className="erp-label">Operação de entrada da nota (padrão dos itens)</label>
                  <LookupField value={opNota} loader={loadEntryOperations} entityLabel="operação de entrada" allowManualCode={false}
                    onChange={(c) => { setOpNota(c ? Number(c) : undefined); setDirty(true); }} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Plano de contas para os itens sem plano</label>
                  <LookupField value={planoEmLote} loader={loadChartOfAccounts} entityLabel="plano de contas" allowManualCode={false}
                    onChange={(c) => setPlanoEmLote(c ? Number(c) : undefined)} /></div>
                <div className="erp-field erp-c2" style={{ alignSelf: "end" }}>
                  <button className="erp-btn" onClick={aplicarPlanoEmLote} disabled={!planoEmLote}>Aplicar</button></div>
              </>
            )}
            <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
              <table className="erp-grid">
                <thead><tr>
                  <th>#</th><th>Produto na nota (fornecedor)</th><th style={{ textAlign: "right" }}>Qtd</th><th style={{ textAlign: "right" }}>Valor contábil</th>
                  <th style={{ minWidth: 260 }}>Item do cadastro</th><th style={{ width: 80 }}>Fator UN</th>
                  <th style={{ minWidth: 220 }}>Plano de contas</th><th style={{ minWidth: 180 }}>Centro de custo</th>
                </tr></thead>
                <tbody>
                  {doc.itens.map((it, idx) => {
                    const e = itens[idx];
                    if (!e) return null;
                    const est = e.item_code === it.item_code ? it.resolution_strategy : (e.item_code ? "MANUAL" : "NAO_RESOLVIDO");
                    const aberta = sug?.itemId === it.id;
                    const pedAberto = ped?.itemId === it.id;
                    const pedidoGravado = it.purchase_order_number
                      ? `Pedido ${it.purchase_order_number}${it.purchase_order_sequence ? ` / item ${it.purchase_order_sequence}` : ""}`
                      : `linha ${it.purchase_order_item_code}`;
                    const linhaTexto = e.linha === 0 ? "sem pedido" : e.linhaRotulo
                      ?? (e.linha ? (e.linha === it.purchase_order_item_code ? pedidoGravado : `linha ${e.linha}`) : "sem pedido");
                    return (
                      <Fragment key={it.id}>
                        <tr style={!e.item_code ? { background: "rgba(245, 158, 11, 0.08)" } : undefined}>
                          <td>{it.sequence}</td>
                          <td>
                            <strong>{it.description || "—"}</strong><br />
                            <small style={{ color: "var(--v-text-muted)" }}>
                              Cód. {it.supplier_item_code || "—"} · NCM {it.ncm || "—"}{it.item_ncm && it.item_ncm.replace(/\D/g, "") !== (it.ncm || "").replace(/\D/g, "") ? ` (cadastro ${it.item_ncm})` : ""} · CFOP {it.cfop}{it.ean ? ` · EAN ${it.ean}` : ""}{it.pedido_compra_xml ? ` · Ped. ${it.pedido_compra_xml}` : ""}
                            </small><br />
                            <small style={{ color: "var(--v-text-muted)" }}>
                              ICMS {money(it.valor_icms)} · IPI {money(it.valor_ipi)}{it.valor_icms_st ? ` · ST ${money(it.valor_icms_st)}` : ""}{it.valor_frete ? ` · Frete ${money(it.valor_frete)}` : ""}
                              {it.valor_ibs || it.valor_cbs ? ` · IBS ${money(it.valor_ibs)} · CBS ${money(it.valor_cbs)}` : ""}{it.valor_is ? ` · IS ${money(it.valor_is)}` : ""}
                            </small>
                          </td>
                          <td style={{ textAlign: "right" }}>{qtd(it.quantity)} {it.uom}<br /><small>× {money(it.unit_price)}</small></td>
                          <td style={{ textAlign: "right" }}>{money(it.valor_contabil)}{!it.gera_financeiro && <><br /><small style={{ color: "#b45309" }}>sem financeiro</small></>}</td>
                          <td>
                            {editavel ? (
                              <>
                                <LookupField value={e.item_code} loader={loadItems} entityLabel="item" allowManualCode={false}
                                  onChange={(c) => escolherItem(idx, c ? Number(c) : undefined)} />
                                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                                  <span className={`erp-badge ${e.item_code ? "erp-badge-green" : "erp-badge-amber"}`}>{ROTULO_ESTRATEGIA[est ?? ""] ?? est ?? "—"}</span>
                                  <button className="erp-btn erp-btn-sm" onClick={() => (aberta ? setSug(null) : void abrirSugestoes(it.id))}>{aberta ? "Fechar sugestões" : "Sugestões"}</button>
                                  {doc.supplier_code && it.supplier_item_code && e.item_code && (
                                    <label style={{ fontSize: 12 }}><input type="checkbox" checked={e.lembrar} onChange={(ev) => setItem(idx, { lembrar: ev.target.checked })} /> Lembrar vínculo</label>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>{it.item_code ? `${it.item_code} — ${it.item_name ?? ""}` : "—"}<br /><small>{ROTULO_ESTRATEGIA[it.resolution_strategy ?? ""] ?? ""}</small></>
                            )}
                          </td>
                          <td>{editavel
                            ? <input className="erp-input num" style={{ height: 30, width: 70 }} type="number" step="0.0001" min="0" value={e.fator ?? ""} placeholder="1"
                                title="Quantas unidades do cadastro há em 1 unidade da nota (ex.: CX com 12 → 12)"
                                onChange={(ev) => setItem(idx, { fator: ev.target.value ? Number(ev.target.value) : undefined })} />
                            : (it.fator_conversao ?? 1)}
                            {it.item_uom && <small style={{ display: "block" }}>= {qtd(it.quantity * (e.fator || 1))} {it.item_uom}</small>}
                          </td>
                          <td>{editavel
                            ? <LookupField value={e.plano} loader={loadChartOfAccounts} entityLabel="plano de contas" allowManualCode={false}
                                onChange={(c) => setItem(idx, { plano: c ? Number(c) : undefined })} />
                            : (it.plano_contas_codigo ? `${it.plano_contas_codigo} — ${it.plano_contas_nome ?? ""}` : "—")}</td>
                          <td>{editavel
                            ? <LookupField value={e.cc} loader={loadFinancialCostCenters} entityLabel="centro de custo" allowManualCode={false}
                                onChange={(c) => setItem(idx, { cc: c ? Number(c) : undefined })} />
                            : (it.centro_custo_nome ?? "—")}</td>
                        </tr>
                        <tr style={!e.item_code ? { background: "rgba(245, 158, 11, 0.08)" } : undefined}>
                          <td />
                          <td colSpan={7}>
                            {editavel ? (
                              <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 2fr) minmax(200px, 2fr) minmax(220px, 2fr) 110px", gap: 8, alignItems: "end" }}>
                                <div><label className="erp-label">Operação de entrada {!e.op && opNota ? "(a da nota)" : ""}</label>
                                  <LookupField value={e.op} loader={loadEntryOperations} entityLabel="operação de entrada" allowManualCode={false}
                                    onChange={(c) => setItem(idx, { op: c ? Number(c) : undefined })} /></div>
                                <div><label className={`erp-label ${it.movimenta_estoque ? "erp-req" : ""}`}>Almoxarifado {it.movimenta_estoque ? "" : "(não movimenta)"}</label>
                                  <LookupField value={e.almox} loader={loadWarehouses} entityLabel="almoxarifado" allowManualCode={false}
                                    onChange={(c) => setItem(idx, { almox: c ? Number(c) : undefined })} /></div>
                                <div><label className="erp-label">Pedido de compra</label>
                                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    <span style={{ fontSize: 13 }}>{linhaTexto}</span>
                                    <button className="erp-btn erp-btn-sm" onClick={() => (pedAberto ? setPed(null) : void abrirPedidos(idx))}>{pedAberto ? "Fechar" : "Escolher"}</button>
                                    {!!e.linha && <button className="erp-btn erp-btn-sm" onClick={() => escolherLinha(idx, null)} title="Desfazer o vínculo com o pedido">✕</button>}
                                  </div></div>
                                <div><label className="erp-label">CFOP entrada</label>
                                  <input className="erp-input" style={{ height: 30 }} maxLength={4} value={e.cfop ?? ""} placeholder="auto"
                                    title="Calculado pela operação de entrada e pelas UFs; informe só para corrigir"
                                    onChange={(ev) => setItem(idx, { cfop: ev.target.value.replace(/\D/g, ""), cfopManual: true })} /></div>
                              </div>
                            ) : (
                              <small style={{ color: "var(--v-text-muted)" }}>
                                Operação {it.entry_operation_name ?? (it.entry_operation_code ? `#${it.entry_operation_code}` : "—")} · CFOP entrada {it.cfop_entrada || "—"}
                                {" "}· Almox. {it.warehouse_name ?? (it.warehouse_id ? `#${it.warehouse_id}` : "—")}
                                {it.purchase_order_item_code ? ` · Pedido ${it.purchase_order_number ?? it.purchase_order_code ?? "—"}${it.purchase_order_sequence ? ` / item ${it.purchase_order_sequence}` : ""}` : ""}
                                {" "}· Custo de aquisição {money(it.custo_aquisicao)}
                                {it.stock_movement_id ? ` · estoque mov. #${it.stock_movement_id}` : it.movimenta_estoque ? "" : " · não movimenta estoque"}
                                {it.qtd_recebida_antes ? ` · ${qtd(it.qtd_recebida_antes)} já recebido(s) pelo pedido` : ""}
                                {" "}· Créditos: {[it.gera_credito_icms && "ICMS", it.gera_credito_ipi && "IPI", it.gera_credito_pis && "PIS", it.gera_credito_cofins && "COFINS", it.gera_credito_ibscbs && "IBS/CBS"].filter(Boolean).join(", ") || "nenhum"}
                              </small>
                            )}
                          </td>
                        </tr>
                        {pedAberto && ped && (
                          <tr>
                            <td />
                            <td colSpan={7}>
                              {ped.carregando ? <em>Buscando pedidos…</em> : ped.lista.length === 0 ? <em>Nenhum pedido de compra em aberto deste fornecedor para o item.</em> : (
                                <table className="erp-grid">
                                  <thead><tr><th>Pedido</th><th>Linha</th><th style={{ textAlign: "right" }}>Pedido</th><th style={{ textAlign: "right" }}>Recebido</th><th style={{ textAlign: "right" }}>Faturado</th><th style={{ textAlign: "right" }}>Saldo a faturar</th><th style={{ textAlign: "right" }}>Preço</th><th /></tr></thead>
                                  <tbody>
                                    {ped.lista.map((l) => (
                                      <tr key={l.code}>
                                        <td>{l.order_number}</td><td>{l.sequence}</td>
                                        <td style={{ textAlign: "right" }}>{qtd(l.requested_qty)}</td><td style={{ textAlign: "right" }}>{qtd(l.received_qty)}</td>
                                        <td style={{ textAlign: "right" }}>{qtd(l.invoiced_qty)}</td><td style={{ textAlign: "right" }}>{qtd(l.saldo_a_faturar)}</td>
                                        <td style={{ textAlign: "right" }}>{money(l.unit_price)}</td>
                                        <td><button className="erp-btn erp-btn-sm erp-btn-primary" onClick={() => escolherLinha(idx, l)}>Usar</button></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                        {aberta && sug && (
                          <tr>
                            <td />
                            <td colSpan={7}>
                              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                                <input className="erp-input" style={{ maxWidth: 360 }} placeholder="Buscar no cadastro (nome ou código)" value={sug.q}
                                  onChange={(ev) => setSug({ ...sug, q: ev.target.value })}
                                  onKeyDown={(ev) => { if (ev.key === "Enter") void abrirSugestoes(it.id, sug.q); }} />
                                <button className="erp-btn erp-btn-sm" onClick={() => void abrirSugestoes(it.id, sug.q)}>Buscar</button>
                              </div>
                              <div style={{ marginBottom: 6 }}>
                                <button className="erp-btn erp-btn-sm" onClick={() => abrirNovoItem(idx)} disabled={busy}>Cadastrar este item a partir da nota</button>
                              </div>
                              {novoItem && novoItem.itemId === it.id && (
                                <div className="erp-fieldset" style={{ marginBottom: 8 }}>
                                  <div className="erp-fieldset-head">Novo item do cadastro — com os dados da nota</div>
                                  <div className="erp-fieldset-body">
                                    <div className="erp-field erp-c5"><label className="erp-label erp-req">Nome</label>
                                      <input className="erp-input" value={novoItem.nome} maxLength={200} onChange={(ev) => setNovoItem({ ...novoItem, nome: ev.target.value })} /></div>
                                    <div className="erp-field erp-c2"><label className="erp-label erp-req">Unidade de estoque</label>
                                      <select className="erp-input" value={novoItem.unidade} onChange={(ev) => setNovoItem({ ...novoItem, unidade: ev.target.value })}>
                                        <option value="">— escolha —</option>
                                        {UNIDADES_ITEM.map((u) => <option key={u} value={u}>{u}</option>)}
                                      </select>
                                      <span className="erp-hint">Na nota: {it.uom || "—"}</span></div>
                                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Almoxarifado</label>
                                      <LookupField value={novoItem.almox} loader={loadWarehouses} entityLabel="almoxarifado" allowManualCode={false}
                                        onChange={(c) => setNovoItem({ ...novoItem, almox: c ? Number(c) : undefined })} /></div>
                                    <div className="erp-field erp-c2"><label className="erp-label">Uso</label>
                                      <select className="erp-input" value={novoItem.tipoUso} onChange={(ev) => setNovoItem({ ...novoItem, tipoUso: ev.target.value as TipoUsoItem })}>
                                        <option value="INDUSTRIALIZACAO">Industrialização</option><option value="CONSUMO">Uso e consumo</option><option value="IMOBILIZADO">Imobilizado</option>
                                      </select></div>
                                    <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                                      <small style={{ opacity: 0.75 }}>Origem, CEST e unidade de compra vêm da nota. Grupo PDM, classificação fiscal (NCM {it.ncm || "—"}) e engenharia se completam em VENT0200.</small>
                                      <span style={{ flex: 1 }} />
                                      <button className="erp-btn erp-btn-sm erp-btn-primary" onClick={() => void confirmarNovoItem()} disabled={busy}>Cadastrar e conciliar</button>
                                      <button className="erp-btn erp-btn-sm" onClick={() => setNovoItem(null)} disabled={busy}>Desistir</button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {sug.carregando ? <em>Buscando…</em> : sug.lista.length === 0 ? <em>Nenhum item parecido no cadastro. Busque pelo nome ou cadastre o item a partir da nota.</em> : (
                                <table className="erp-grid">
                                  <thead><tr><th>Item</th><th>UN</th><th>NCM</th><th>Aderência</th><th>Por quê</th><th /></tr></thead>
                                  <tbody>
                                    {sug.lista.map((s) => (
                                      <tr key={s.item_code}>
                                        <td>{s.item_code} — {s.name}{!s.is_active && <small style={{ color: "#b91c1c" }}> (inativo)</small>}</td>
                                        <td>{s.uom}</td><td>{s.ncm}</td>
                                        <td>{Math.round(s.score * 100)}%</td>
                                        <td><small>{s.motivo}</small></td>
                                        <td><button className="erp-btn erp-btn-sm erp-btn-primary" disabled={!s.is_active}
                                          onClick={() => { escolherItem(idx, s.item_code); setSug(null); }}>Usar</button></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {contas.length > 0 && (
              <div className="erp-field erp-c12">
                <table className="erp-grid" style={{ maxWidth: 760 }}>
                  <thead><tr><th>Plano de contas</th><th style={{ textAlign: "right" }}>Itens</th><th style={{ textAlign: "right" }}>A pagar ao fornecedor</th><th style={{ textAlign: "right" }}>%</th></tr></thead>
                  <tbody>
                    {contas.map((k) => (
                      <tr key={k}><td>{nomeConta(k)}</td>
                        <td style={{ textAlign: "right" }}>{moneyCent(financeiro.totais.get(k) ?? 0)}</td>
                        <td style={{ textAlign: "right" }}>{moneyCent(alvos.get(k) ?? 0)}</td>
                        <td style={{ textAlign: "right" }}>{aPagarCent ? (((alvos.get(k) ?? 0) * 100) / aPagarCent).toFixed(2) : "0"}%</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {aba === "financeiro" && (
        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Parcelas × plano de contas — <span style={{ fontWeight: 400, opacity: 0.65 }}>cada parcela vira um título no contas a pagar, com esta distribuição</span></div>
          <div className="erp-fieldset-body">
            {doc.sem_pagamento && <div className="erp-field erp-c12"><div className="erp-feedback info">A nota declara que não há pagamento (bonificação/remessa): sem parcelas, nada vai ao contas a pagar.</div></div>}
            {doc.total_retencoes > 0 && (
              <div className="erp-field erp-c12"><div className="erp-feedback info">
                Retenções de R$ {money(doc.total_retencoes)}: as parcelas somam o líquido (R$ {moneyCent(aPagarCent)}) e cada imposto retido vira um título próprio a recolher —
                {" "}{doc.retencoes.map((r) => `${r.tipo} R$ ${money(r.valor)} vence ${dataBR(r.vencimento)}`).join("; ")}.
              </div></div>
            )}
            {editavel && (
              <>
                <div className="erp-field erp-c2"><label className="erp-label">Nº de parcelas</label>
                  <input className="erp-input num" type="number" min={1} max={60} value={qtdParcelas} onChange={(e) => setQtdParcelas(Number(e.target.value))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Intervalo (dias)</label>
                  <input className="erp-input num" type="number" min={0} value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))} /></div>
                <div className="erp-field erp-c8" style={{ alignSelf: "end", display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="erp-btn" onClick={gerarParcelasIguais}>Gerar parcelas iguais</button>
                  <button className="erp-btn" onClick={adicionarParcela}>+ Parcela</button>
                  <button className="erp-btn" onClick={redistribuir} disabled={!contas.length}>Distribuir proporcionalmente</button>
                </div>
              </>
            )}
            {contas.length === 0 && <div className="erp-field erp-c12"><div className="erp-feedback info">Informe o plano de contas dos itens (aba Itens) para distribuir as parcelas.</div></div>}
            <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
              <table className="erp-grid">
                <thead><tr>
                  <th>Nº</th><th>Documento</th><th>Vencimento</th><th style={{ textAlign: "right" }}>Valor</th>
                  {contas.map((k) => <th key={k} style={{ textAlign: "right", minWidth: 130 }}>{nomeConta(k)}</th>)}
                  <th style={{ textAlign: "right" }}>Distribuído</th>
                  {editavel && <th />}
                </tr></thead>
                <tbody>
                  {parcelas.length === 0 && <tr><td colSpan={6 + contas.length} className="erp-grid-empty">Sem parcelas.</td></tr>}
                  {parcelas.map((p, i) => {
                    const dist = contas.reduce((s, k) => s + (p.dist.get(k) ?? 0), 0);
                    const fecha = !contas.length || dist === p.valorCent;
                    const titulo = doc.parcelas.find((x) => x.numero === p.numero)?.conta_pagar_id;
                    return (
                      <tr key={i}>
                        <td>{p.numero}</td>
                        <td>{editavel ? <input className="erp-input" style={{ height: 30, width: 90 }} value={p.documento ?? ""} onChange={(e) => setParcela(i, { documento: e.target.value })} /> : (p.documento || "—")}</td>
                        <td>{editavel ? <input className="erp-input" type="date" style={{ height: 30 }} value={p.vencimento} onChange={(e) => setParcela(i, { vencimento: e.target.value })} /> : dataBR(p.vencimento)}</td>
                        <td style={{ textAlign: "right" }}>{editavel
                          ? <input className="erp-input num" type="number" step="0.01" style={{ height: 30, width: 120 }} value={deCentavos(p.valorCent)}
                              onChange={(e) => setParcela(i, { valorCent: paraCentavos(Number(e.target.value)) })} />
                          : moneyCent(p.valorCent)}</td>
                        {contas.map((k) => (
                          <td key={k} style={{ textAlign: "right" }}>{editavel
                            ? <input className="erp-input num" type="number" step="0.01" style={{ height: 30, width: 120 }} value={deCentavos(p.dist.get(k) ?? 0)}
                                onChange={(e) => setValorDist(i, k, Number(e.target.value))} />
                            : moneyCent(p.dist.get(k) ?? 0)}</td>
                        ))}
                        <td style={{ textAlign: "right", color: fecha ? undefined : "#b91c1c", fontWeight: fecha ? 400 : 600 }}>{moneyCent(dist)}</td>
                        {editavel && <td style={{ whiteSpace: "nowrap" }}>
                          {!fecha && contas.length > 0 && semPlano === 0 && <button className="erp-btn erp-btn-sm" onClick={() => completarParcela(i)} title="Completa a última conta com o que falta">Fechar</button>}
                          <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => removerParcela(i)}>✕</button>
                        </td>}
                        {!editavel && titulo && <td><small>Título #{titulo}</small></td>}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}><strong>Itens / parcelas</strong></td>
                    <td style={{ textAlign: "right" }}><strong>{moneyCent(parcelas.reduce((s, p) => s + p.valorCent, 0))}</strong><br /><small>a pagar {moneyCent(aPagarCent)}</small></td>
                    {contas.map((k) => {
                      const col = parcelas.reduce((s, p) => s + (p.dist.get(k) ?? 0), 0);
                      const ok = col === (alvos.get(k) ?? 0);
                      return <td key={k} style={{ textAlign: "right", color: ok ? undefined : "#b91c1c" }}><strong>{moneyCent(col)}</strong><br /><small>plano {moneyCent(alvos.get(k) ?? 0)}</small></td>;
                    })}
                    <td />{editavel && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
            {editavel && divergenciasMatriz.length > 0 && (
              <div className="erp-field erp-c12">
                <div className="erp-feedback error">
                  {divergenciasMatriz.map((d, i) => <div key={i}>{d.mensagem}</div>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {aba === "divergencias" && (
        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Conferência da nota — <span style={{ fontWeight: 400, opacity: 0.65 }}>cálculo dos impostos, alíquotas, NCM, pedido de compra (preço, quantidade) e totais</span></div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
              {doc.divergencias.length === 0 ? <div className="erp-feedback success">Nenhuma divergência: impostos, NCM, pedido e totais conferem.</div> : (
                <table className="erp-grid">
                  <thead><tr><th>Nível</th><th>Item</th><th>Tipo</th><th>Divergência</th><th>Esperado</th><th>Na nota</th></tr></thead>
                  <tbody>
                    {doc.divergencias.map((d, i) => (
                      <tr key={i} style={{ color: d.nivel === "IMPEDE" ? "#b91c1c" : undefined }}>
                        <td><span className={`erp-badge ${d.nivel === "IMPEDE" ? "erp-badge-red" : "erp-badge-amber"}`}>{d.nivel === "IMPEDE" ? "Bloqueia" : "Atenção"}</span></td>
                        <td>{d.item ?? "—"}</td><td><small>{d.tipo}</small></td><td>{d.mensagem}</td><td>{d.esperado ?? "—"}</td><td>{d.informado ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="erp-field erp-c12"><small style={{ color: "var(--v-text-muted)" }}>
              Preço e quantidade acima do pedido seguem a tolerância de compras do fornecedor: quando a regra é bloquear, a divergência impede a aprovação. Grave a conferência para recalcular.
            </small></div>
          </div>
        </div>
      )}

      {aba === "nota" && (
        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Dados lidos da nota</div>
          <div className="erp-fieldset-body">
            {[
              ["Chave de acesso", doc.chave_acesso || "—"], ["Protocolo", doc.protocolo || "—"],
              ["Natureza da operação", doc.natureza_operacao || "—"], ["Modelo / série", `${doc.modelo} / ${doc.serie}`],
              ["Emissão", dataBR(doc.data_emissao)], ["Entrada", dataBR(doc.data_entrada)],
              ["IE emitente", doc.ie_emitente || "—"], ["Destinatário (CNPJ)", doc.cnpj_destinatario || "—"],
              ["Produtos", money(doc.valor_produtos)], ["Frete", money(doc.valor_frete)], ["Seguro", money(doc.valor_seguro)],
              ["Outras despesas", money(doc.valor_outras)], ["Desconto", money(doc.valor_desconto)], ["IPI", money(doc.valor_ipi)],
              ["ICMS", money(doc.valor_icms)], ["ICMS-ST", money(doc.valor_icms_st)], ["PIS", money(doc.valor_pis)], ["COFINS", money(doc.valor_cofins)],
              ["IBS", money(doc.valor_ibs)], ["CBS", money(doc.valor_cbs)], ["Imposto seletivo", money(doc.valor_is)],
              ["Total da nota", money(doc.valor_total)], ["Retenções", money(doc.total_retencoes)], ["A pagar ao fornecedor", money(doc.valor_a_pagar)],
              ["Modalidade do frete", doc.modalidade_frete ?? "—"],
              ["Pedido de compra", doc.purchase_order_code ? String(doc.purchase_order_code) : "—"],
              ["Situação", ROTULO_STATUS_ENTRADA[status] ?? status], ["Estoque", doc.stock_status ? ROTULO_ESTOQUE[doc.stock_status] ?? doc.stock_status : "—"],
            ].map(([l, v]) => (
              <div key={l} className="erp-field erp-c3"><label className="erp-label">{l}</label><div className="erp-input" style={{ background: "transparent" }}>{v}</div></div>
            ))}
            {doc.retencoes.length > 0 && (
              <div className="erp-field erp-c12">
                <label className="erp-label">Retenções na fonte (títulos a recolher)</label>
                <table className="erp-grid" style={{ maxWidth: 640 }}>
                  <thead><tr><th>Imposto</th><th style={{ textAlign: "right" }}>Valor</th><th>Vencimento</th></tr></thead>
                  <tbody>{doc.retencoes.map((r) => <tr key={r.tipo}><td>{r.descricao}</td><td style={{ textAlign: "right" }}>{money(r.valor)}</td><td>{dataBR(r.vencimento)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
            {doc.informacoes_complementares && <div className="erp-field erp-c12"><label className="erp-label">Informações complementares</label><div>{doc.informacoes_complementares}</div></div>}
          </div>
        </div>
      )}
    </>
  );
}
