import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  type PurchaseOrderDTO, type PurchaseOrderItemDTO,
  FREIGHT_TYPES, FREIGHT_VALUE_TYPES, FREIGHT_VALUE_MODES, UTILIZATION_TYPES, DEMAND_TYPES,
  listOrders, getOrderDetail, createOrder, updateOrder, cancelOrder, addOrderItem,
  approveOrder, authorizeOrder, updateOrderItem, cancelOrderItem,
} from "@/services/purchaseOrderService";
import { errMessage, unwrapObject } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { enumLabel } from "@/utils/enumLabels";
import {
  loadItems, loadSuppliers, loadWarehouses, loadCarriers,
  loadPaymentConditions, loadCostCenters, loadItemClassifications,
  loadInvoiceTypes, loadEmployees, loadSalesOrders,
  loadPurchaseRequisitions, loadPurchaseQuotations, loadSupplierContracts,
  loadPlannedOrders, loadProductionOrders,
} from "@/services/lookups";
import { getRequisition, type RequisitionItemDTO } from "@/services/purchaseRequisitionService";
import { HistoricoPrecoPanel } from "./pedido/HistoricoPrecoPanel";
import { PedidoNotasPanel } from "./pedido/PedidoNotasPanel";
import { PrevisaoPagamentosPanel } from "./pedido/PrevisaoPagamentosPanel";
import { PedidoEnvioPanel } from "./pedido/PedidoEnvioPanel";
import { FollowupLinha } from "./pedido/FollowupLinha";
import { AcompanhamentoEntregas } from "./pedido/AcompanhamentoEntregas";
import { SugestoesMRP } from "./pedido/SugestoesMRP";

/**
 * VPDC0200 — Pedido de Compra.
 *
 * É a formalização da compra: o documento que sai para o fornecedor e que o
 * recebimento vai conferir depois. Até aqui a tela pedia o corpo da requisição
 * em JSON — o que, na prática, tirava a compra das mãos de quem compra.
 *
 * A capa segue a divisão que o mercado usa (FoccoERP FPDC0200, SAP ME21N):
 * fornecedor e condição comercial, transporte, e o rodapé de totais. Os itens
 * ficam numa grade com saldo — pedido, recebido, cancelado — porque um pedido
 * de compra vive de entregas parciais.
 */
type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "capa" | "itens" | "transporte" | "notas" | "pagamentos" | "envio";
/** Visões da tela: os pedidos e as rotinas de compras que cruzam pedidos. */
export type VisaoCompras = "pedidos" | "sugestoes" | "acompanhamento" | "previsao";

const CAPA_INICIAL: PurchaseOrderDTO = {
  currency_code: "BRL",
  emission_date: new Date().toISOString().slice(0, 10),
  freight_type: "CIF",
  is_firm: false,
};

/** Saldo ainda em aberto de uma linha de requisição (pedido − atendido − cancelado). */
function saldoDaRequisicao(i: RequisitionItemDTO): number {
  return Math.max(0, i.quantity - (i.attended_qty ?? 0) - (i.cancelled_qty ?? 0));
}

const ITEM_INICIAL = {
  item_code: "", requested_qty: "1", unit_price: "", purchase_uom: "",
  discount_pct: "0", ipi_pct: "", icms_pct: "0", tolerance_pct: "0",
  warehouse_id: "", delivery_date: "", cost_center_code: "", notes: "",
  utilization_type: "", fiscal_classification_code: "", invoice_type_code: "",
  requester_employee_code: "",
  // Origem: de onde veio a necessidade desta linha.
  purchase_requisition_code: "", purchase_requisition_item_id: "",
  quotation_code: "", contract_code: "", planned_order_code: "",
  demand_type: "", demand_code: "", sales_order_code: "", production_order_id: "",
};

const brl = (v?: number) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v?: number) => (v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });

/** Situações do pedido, na ordem em que acontecem. */
const SITUACAO_ROTULO: Record<string, string> = {
  DRAFT: "Rascunho", PENDING: "Pendente", BLOCKED: "Bloqueado por alçada",
  APPROVED: "Aprovado", PARTIAL: "Atendido em parte", RECEIVED: "Recebido",
  CANCELLED: "Cancelado", CLOSED: "Encerrado",
};

/** Situação na alçada de valores, como o comprador lê. */
const ALCADA_ROTULO: Record<string, string> = {
  A: "liberada",
  B: "aguardando autorização",
  R: "acima do teto — não pode ser autorizada",
  N: "ainda não avaliada",
};

/**
 * Só faz sentido aprovar um pedido que ainda não foi aprovado. Deixar o botão
 * ligado e devolver 422 depois do clique é jogar o erro na cara de quem só
 * queria seguir o fluxo.
 */
const PODE_APROVAR = new Set(["", "DRAFT", "REQUESTED"]);

/** Capa e linhas só mudam antes da aprovação; depois, só se elimina saldo. */
const EDITAVEL = new Set(["", "DRAFT", "REQUESTED"]);
const PODE_ELIMINAR_SALDO = new Set(["APPROVED", "PARTIAL"]);

const SITUACAO_LINHA: Record<string, string> = {
  OPEN: "Aberta", PARTIAL: "Em parte", RECEIVED: "Atendida", CANCELLED: "Cancelada",
};

type EdicaoLinha = { code: number; qtd: string; preco: string; desc: string; ipi: string; entrega: string; almox: string };

export function Vpdc0200Page({ visaoInicial = "pedidos" }: { visaoInicial?: VisaoCompras } = {}): JSX.Element {
  const [visao, setVisao] = useState<VisaoCompras>(visaoInicial);
  const [aba, setAba] = useState<Aba>("capa");
  const [acompanhando, setAcompanhando] = useState<number | null>(null);
  const [pedidos, setPedidos] = useState<PurchaseOrderDTO[]>([]);
  const [capa, setCapa] = useState<PurchaseOrderDTO>({ ...CAPA_INICIAL });
  const [itens, setItens] = useState<PurchaseOrderItemDTO[]>([]);
  const [itemForm, setItemForm] = useState({ ...ITEM_INICIAL });
  const [itensDaRequisicao, setItensDaRequisicao] = useState<RequisitionItemDTO[]>([]);
  const [aberto, setAberto] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [edicao, setEdicao] = useState<EdicaoLinha | null>(null);
  const [eliminando, setEliminando] = useState<{ code: number; motivo: string } | null>(null);
  // Nomes para a grade e a lista (o pedido guarda só os códigos).
  const [nomeItem, setNomeItem] = useState<Record<string, string>>({});
  const [nomeAlmox, setNomeAlmox] = useState<Record<string, string>>({});
  const [nomeFornecedor, setNomeFornecedor] = useState<Record<string, string>>({});
  useEffect(() => {
    const mapa = (opts: Array<{ code: string | number; label: string }>) =>
      Object.fromEntries(opts.map((o) => [String(o.code), o.label]));
    void loadItems().then((o) => setNomeItem(mapa(o))).catch(() => undefined);
    void loadWarehouses().then((o) => setNomeAlmox(mapa(o))).catch(() => undefined);
    void loadSuppliers().then((o) => setNomeFornecedor(mapa(o))).catch(() => undefined);
  }, []);

  const situacao = (capa.status ?? "").toUpperCase();
  const editavel = !aberto || EDITAVEL.has(situacao);

  const setC = <K extends keyof PurchaseOrderDTO>(k: K, v: PurchaseOrderDTO[K]) =>
    setCapa((c) => ({ ...c, [k]: v }));

  const executar = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregarLista = useCallback(() => executar(async () => {
    setPedidos(await listOrders());
  }), [executar]);
  useEffect(() => { carregarLista(); }, [carregarLista]);

  function novo() {
    setCapa({ ...CAPA_INICIAL });
    setItens([]);
    setItemForm({ ...ITEM_INICIAL });
    setAberto(null);
    setAba("capa");
    setFeedback(null);
  }

  const abrir = useCallback((code: number, aviso?: Feedback) => executar(async () => {
    const { items, ...dados } = await getOrderDetail(code);
    setCapa({
      ...dados,
      emission_date: (dados.emission_date ?? "").slice(0, 10),
      delivery_date: dados.delivery_date?.slice(0, 10) || undefined,
      advance_date: dados.advance_date?.slice(0, 10) || undefined,
      shipment_date: dados.shipment_date?.slice(0, 10) || undefined,
      currency_date: dados.currency_date?.slice(0, 10) || undefined,
    });
    setItens(items ?? []);
    setEdicao(null);
    setEliminando(null);
    setAberto(code);
    setAcompanhando(null);
    setVisao("pedidos");
    setAba("itens");
    setFeedback(aviso ?? { type: "success", message: `Pedido nº ${dados.order_number || code} aberto.` });
  }), [executar]);

  /** Depois de mexer numa linha o backend devolve o pedido inteiro, com totais. */
  function aplicarPedido(p: PurchaseOrderDTO) {
    const { items, ...dados } = p;
    setCapa((c) => ({ ...c, status: dados.status, alcada_status: dados.alcada_status,
      total_gross: dados.total_gross, total_discount: dados.total_discount, total_net: dados.total_net }));
    setItens(items ?? []);
  }

  function editarLinha(i: PurchaseOrderItemDTO) {
    setEliminando(null);
    setEdicao({
      code: i.code ?? 0, qtd: String(i.requested_qty), preco: String(i.unit_price),
      desc: String(i.discount_pct ?? 0), ipi: String(i.ipi_pct ?? 0),
      entrega: i.delivery_date?.slice(0, 10) ?? "", almox: i.warehouse_id ? String(i.warehouse_id) : "",
    });
  }

  function gravarLinha() {
    if (!aberto || !edicao) return;
    const qtd = Number(edicao.qtd);
    if (!(qtd > 0)) { setFeedback({ type: "error", message: "A quantidade deve ser maior que zero." }); return; }
    void executar(async () => {
      const p = await updateOrderItem(aberto, edicao.code, {
        requested_qty: qtd,
        unit_price: Number(edicao.preco) || 0,
        discount_pct: Number(edicao.desc) || 0,
        ipi_pct: Number(edicao.ipi) || 0,
        delivery_date: edicao.entrega,
        warehouse_id: edicao.almox ? Number(edicao.almox) : undefined,
      });
      aplicarPedido(p);
      setEdicao(null);
      await carregarLista();
      setFeedback({ type: "success", message: p.status === "DRAFT" && capa.status === "REQUESTED"
        ? "Linha alterada. O valor mudou: o pedido voltou para rascunho e precisa ser aprovado de novo."
        : "Linha alterada." });
    });
  }

  function removerLinha(i: PurchaseOrderItemDTO) {
    if (!aberto || !i.code) return;
    if (!window.confirm(`Remover a linha ${i.sequence} (item ${i.item_code}) do pedido?`)) return;
    void executar(async () => {
      aplicarPedido(await cancelOrderItem(aberto, i.code!));
      await carregarLista();
      setFeedback({ type: "success", message: `Linha ${i.sequence} removida.` });
    });
  }

  function eliminarSaldo() {
    if (!aberto || !eliminando) return;
    if (!eliminando.motivo.trim()) { setFeedback({ type: "error", message: "Informe o motivo da eliminação do saldo." }); return; }
    void executar(async () => {
      const p = await cancelOrderItem(aberto, eliminando.code, eliminando.motivo.trim());
      aplicarPedido(p);
      setEliminando(null);
      setFeedback({ type: "success", message: p.status === "RECEIVED"
        ? "Saldo eliminado. Nada mais a receber: o pedido foi encerrado como recebido."
        : p.status === "CANCELLED" ? "Saldo eliminado. Nada foi recebido: o pedido foi encerrado como cancelado." : "Saldo eliminado." });
      await carregarLista();
    });
  }

  function gravarCapa() {
    if (!capa.supplier_code) { setFeedback({ type: "error", message: "Escolha o fornecedor." }); return; }
    if (!capa.emission_date) { setFeedback({ type: "error", message: "Informe a data de emissão." }); return; }
    void executar(async () => {
      if (aberto) {
        await updateOrder(aberto, capa);
        setFeedback({ type: "success", message: `Pedido ${aberto} alterado.` });
      } else {
        const criado = await createOrder(capa);
        const code = criado.code ?? 0;
        // Recarrega do backend: número, situação e os padrões do fornecedor
        // (condição, frete) que a criação preencheu.
        if (code) await abrir(code);
        setFeedback({ type: "success", message: `Pedido nº ${criado.order_number || code} criado. Inclua os itens.` });
      }
      await carregarLista();
    });
  }

  /**
   * Ao escolher a requisição carregamos as linhas dela para o usuário dizer
   * *qual* linha este item atende — sem isso a requisição fica atendida "no
   * todo" e o saldo por linha nunca fecha.
   */
  async function escolherRequisicao(code: number | undefined) {
    setItemForm((f) => ({
      ...f,
      purchase_requisition_code: code ? String(code) : "",
      purchase_requisition_item_id: "",
    }));
    if (!code) { setItensDaRequisicao([]); return; }
    try {
      const req = await getRequisition(code);
      setItensDaRequisicao((req.items ?? []).filter((i) => i.id !== undefined));
    } catch {
      setItensDaRequisicao([]);
      setFeedback({ type: "error", message: "Não foi possível carregar as linhas da requisição." });
    }
  }

  /**
   * O preço, a UM interna e o %IPI são resolvidos pelo backend quando não vêm
   * preenchidos — tabela de preço, conversões do item e classificação fiscal.
   * Por isso os campos podem ficar em branco de propósito.
   */
  function incluirItem() {
    if (!aberto) { setFeedback({ type: "error", message: "Grave a capa antes de incluir itens." }); return; }
    if (!itemForm.item_code) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    const qtd = Number(itemForm.requested_qty);
    if (!(qtd > 0)) { setFeedback({ type: "error", message: "A quantidade deve ser maior que zero." }); return; }
    void executar(async () => {
      const opcional = (v: string) => (v.trim() === "" ? undefined : Number(v));
      await addOrderItem(aberto, {
        item_code: itemForm.item_code,
        requested_qty: qtd,
        unit_price: Number(itemForm.unit_price) || 0,
        purchase_uom: itemForm.purchase_uom || undefined,
        discount_pct: Number(itemForm.discount_pct) || 0,
        ipi_pct: opcional(itemForm.ipi_pct),
        icms_pct: Number(itemForm.icms_pct) || 0,
        tolerance_pct: Number(itemForm.tolerance_pct) || 0,
        warehouse_id: opcional(itemForm.warehouse_id),
        cost_center_code: opcional(itemForm.cost_center_code),
        delivery_date: itemForm.delivery_date || undefined,
        utilization_type: itemForm.utilization_type || undefined,
        fiscal_classification_code: opcional(itemForm.fiscal_classification_code),
        invoice_type_code: opcional(itemForm.invoice_type_code),
        requester_employee_code: opcional(itemForm.requester_employee_code),
        purchase_requisition_code: opcional(itemForm.purchase_requisition_code),
        purchase_requisition_item_id: opcional(itemForm.purchase_requisition_item_id),
        quotation_code: opcional(itemForm.quotation_code),
        contract_code: opcional(itemForm.contract_code),
        planned_order_code: opcional(itemForm.planned_order_code),
        demand_type: itemForm.demand_type || undefined,
        demand_code: opcional(itemForm.demand_code),
        sales_order_code: opcional(itemForm.sales_order_code),
        production_order_id: opcional(itemForm.production_order_id),
        notes: itemForm.notes.trim() || undefined,
      } as PurchaseOrderItemDTO);
      setItemForm({ ...ITEM_INICIAL });
      setItensDaRequisicao([]);
      await abrir(aberto, { type: "success", message: "Item incluído." });
      await carregarLista();
    });
  }

  // Valores do backend (mesma regra da alçada): líquido = mercadoria com
  // desconto + IPI + frete quando a empresa paga (FOB).
  const pendente = useMemo(() => itens.reduce((acc, i) =>
    acc + (i.status === "CANCELLED" ? 0 : Math.max(0, i.requested_qty - (i.received_qty ?? 0) - (i.cancelled_qty ?? 0))), 0), [itens]);
  const totalComFrete = capa.total_net ?? 0;

  return (
    <div className="erp-screen">
      <style>{PDC_STYLES}</style>

      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimentos</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Pedido de Compra</span><span className="erp-crumb-code">VPDC0200</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">
          {aberto
            ? `pedido nº ${capa.order_number ?? aberto} · ${SITUACAO_ROTULO[capa.status ?? ""] ?? capa.status ?? "—"}${
                capa.alcada_status && capa.alcada_status !== "N" ? ` · alçada ${ALCADA_ROTULO[capa.alcada_status] ?? capa.alcada_status}` : ""}`
            : "novo pedido"}
        </span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Visão</span>
          <button className={`erp-btn${visao === "pedidos" ? " erp-btn-dark" : ""}`} onClick={() => setVisao("pedidos")}>Pedidos</button>
          <button className={`erp-btn${visao === "sugestoes" ? " erp-btn-dark" : ""}`} onClick={() => setVisao("sugestoes")}>Sugestões do MRP</button>
          <button className={`erp-btn${visao === "acompanhamento" ? " erp-btn-dark" : ""}`} onClick={() => setVisao("acompanhamento")}>Acompanhamento de entregas</button>
          <button className={`erp-btn${visao === "previsao" ? " erp-btn-dark" : ""}`} onClick={() => setVisao("previsao")}>Previsão de pagamentos</button>
        </div>
        {visao === "pedidos" && (<>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Pedido</span>
          <button className="erp-btn erp-btn-primary" onClick={gravarCapa} disabled={busy || !editavel}
            title={editavel ? undefined : "Pedido aprovado não se altera; elimine o saldo das linhas que não virão"}>
            {aberto ? "Gravar alterações" : "Criar pedido"}
          </button>
          <button className="erp-btn" onClick={novo} disabled={busy}>Novo</button>
        </div>
        {aberto && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Fluxo</span>
            <button className="erp-btn"
              disabled={busy || !PODE_APROVAR.has((capa.status ?? "").toUpperCase())}
              title={PODE_APROVAR.has((capa.status ?? "").toUpperCase())
                ? "Avalia o valor contra a alçada do comprador"
                : `Pedido já está em ${SITUACAO_ROTULO[capa.status ?? ""] ?? capa.status}`}
              onClick={() => void executar(async () => {
                const r = unwrapObject(await approveOrder(aberto));
                const alcada = String(r["alcada_status"] ?? r["AlcadaStatus"] ?? "").toUpperCase();
                await abrir(aberto);
                await carregarLista();
                // Depois de recarregar, porque `abrir` emite o próprio aviso.
                setFeedback(
                  alcada === "B"
                    ? { type: "info", message: "Pedido acima da alçada do comprador — bloqueado até a autorização superior." }
                    : alcada === "R"
                      ? { type: "error", message: "Valor acima do teto absoluto da alçada: nem a autorização superior libera." }
                      : { type: "success", message: "Pedido aprovado." },
                );
              })}>Aprovar</button>
            <button className="erp-btn erp-btn-dark"
              disabled={busy || capa.alcada_status !== "B"}
              title={capa.alcada_status === "B" ? "Libera o pedido bloqueado pela alçada" : "Só vale para pedido bloqueado por alçada"}
              onClick={() => void executar(async () => {
                await authorizeOrder(aberto);
                await abrir(aberto);
                setFeedback({ type: "success", message: "Alçada autorizada — o pedido pode seguir ao fornecedor." });
              })}>Autorizar alçada</button>
            <button className="erp-btn erp-btn-danger" disabled={busy}
              onClick={() => { if (window.confirm(`Cancelar o pedido ${aberto}?`)) void executar(async () => {
                await cancelOrder(aberto); setFeedback({ type: "success", message: "Pedido cancelado." });
                novo(); await carregarLista();
              }); }}>Cancelar pedido</button>
          </div>
        )}
        </>)}
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPDC0200 — Pedido de Compra" filename="vpdc0200" /></div>
      </div>

      <div className="erp-content">
        {feedback && (
          <div className={`erp-feedback ${feedback.type}`}>
            {feedback.message}
            <button className="erp-btn erp-btn-sm" style={{ marginLeft: "auto" }} onClick={() => setFeedback(null)}>Fechar</button>
          </div>
        )}

        {visao === "sugestoes" && <SugestoesMRP onFeedback={setFeedback} onPedidoGerado={(c, aviso) => { void carregarLista(); void abrir(c, aviso); }} />}
        {visao === "acompanhamento" && <AcompanhamentoEntregas onAbrirPedido={(c) => void abrir(c)} />}
        {visao === "previsao" && <div className="erp-detail-body"><PrevisaoPagamentosPanel onAbrirPedido={(c) => void abrir(c)} /></div>}

        {visao === "pedidos" && aberto && !editavel && (
          <div className="erp-feedback info">
            Pedido {SITUACAO_ROTULO[situacao]?.toLowerCase() ?? situacao}: capa e linhas não mudam mais.
            {PODE_ELIMINAR_SALDO.has(situacao) && <> Para deixar de esperar o que falta, use <b>Eliminar saldo</b> na linha.</>}
          </div>
        )}
        {visao === "pedidos" && capa.alcada_status === "R" && (
          <div className="erp-feedback error">
            Este pedido está acima do teto absoluto da política de alçada — nem a autorização
            superior o libera. Reduza o valor, divida o pedido ou revise a política em Suprimentos.
          </div>
        )}
        {visao === "pedidos" && capa.alcada_status === "B" && (
          <div className="erp-feedback info">
            Valor acima da alçada do comprador. O pedido só segue ao fornecedor depois de
            <b> Autorizar alçada</b>, que exige perfil de administrador.
          </div>
        )}

        {visao === "pedidos" && (
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Pedidos</span>
              <span className="erp-count">{pedidos.length}</span>
            </div>
            <div className="pdc-inline">
              <button className="erp-btn erp-btn-sm" onClick={carregarLista} disabled={busy}>Recarregar</button>
            </div>
            <div className="erp-list">
              {pedidos.length === 0 && <div className="erp-grid-empty">Nenhum pedido.</div>}
              {pedidos.map((p) => (
                <div key={p.code} className={`erp-list-row${aberto === p.code ? " erp-row-sel" : ""}`}
                  onClick={() => p.code && void abrir(p.code)}>
                  <span className="erp-list-code">Nº {p.order_number || p.code}</span>
                  <span className="erp-list-sub">
                    {nomeFornecedor[String(p.supplier_code)] ?? `Fornecedor ${p.supplier_code ?? "—"}`} · {SITUACAO_ROTULO[p.status ?? ""] ?? p.status ?? "—"}
                  </span>
                  <div className="erp-list-meta">{brl(p.total_net)}</div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-tabs">
              <button className={`erp-tab${aba === "capa" ? " active" : ""}`} onClick={() => setAba("capa")}>Capa</button>
              <button className={`erp-tab${aba === "itens" ? " active" : ""}`} onClick={() => setAba("itens")}>
                Itens {itens.length > 0 && <span className="erp-count">{itens.length}</span>}
              </button>
              <button className={`erp-tab${aba === "transporte" ? " active" : ""}`} onClick={() => setAba("transporte")}>Transporte e pagamento</button>
              {aberto && <>
                <button className={`erp-tab${aba === "notas" ? " active" : ""}`} onClick={() => setAba("notas")}>Notas e recebimentos</button>
                <button className={`erp-tab${aba === "pagamentos" ? " active" : ""}`} onClick={() => setAba("pagamentos")}>Pagamentos previstos</button>
                <button className={`erp-tab${aba === "envio" ? " active" : ""}`} onClick={() => setAba("envio")}>Enviar ao fornecedor</button>
              </>}
            </div>

            <div className="erp-detail-body">
              {aba === "capa" && (
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Fornecedor e condição</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c4">
                      <label className="erp-label erp-req">Fornecedor</label>
                      <LookupField value={capa.supplier_code} onChange={(c) => setC("supplier_code", c ? Number(c) : undefined)}
                        loader={loadSuppliers} entityLabel="fornecedor" placeholder="Quem vende…" />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label erp-req">Emissão</label>
                      <input className="erp-input" type="date" value={capa.emission_date ?? ""}
                        onChange={(e) => setC("emission_date", e.target.value)} />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Entrega prevista</label>
                      <input className="erp-input" type="date" value={capa.delivery_date ?? ""}
                        onChange={(e) => setC("delivery_date", e.target.value || undefined)} />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Moeda</label>
                      <input className="erp-input" value={capa.currency_code ?? "BRL"}
                        onChange={(e) => setC("currency_code", e.target.value.toUpperCase())} />
                    </div>
                    <div className="erp-field erp-c2" style={{ alignSelf: "flex-end" }}>
                      <label className="erp-check">
                        <input type="checkbox" checked={!!capa.is_firm} onChange={(e) => setC("is_firm", e.target.checked)} />
                        Pedido firme
                      </label>
                    </div>
                    <div className="erp-field erp-c12">
                      <label className="erp-label">Observações</label>
                      <input className="erp-input" value={capa.notes ?? ""}
                        placeholder="Instruções ao fornecedor"
                        onChange={(e) => setC("notes", e.target.value || undefined)} />
                    </div>
                    <div className="erp-field erp-c12">
                      <span className="pdc-hint">
                        Deixando a condição de pagamento em branco, o pedido assume a do cadastro do fornecedor.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {aba === "transporte" && (
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Transporte, pagamento e adiantamento</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Condição de pagamento</label>
                      <LookupField value={capa.payment_term_code} onChange={(c) => setC("payment_term_code", c ? Number(c) : undefined)}
                        loader={loadPaymentConditions} entityLabel="condição de pagamento" placeholder="Do fornecedor" clearable />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Frete</label>
                      <select className="erp-input" value={capa.freight_type ?? "CIF"}
                        onChange={(e) => setC("freight_type", e.target.value)}>
                        {FREIGHT_TYPES.map((f) => <option key={f} value={f}>{enumLabel(f)}</option>)}
                      </select>
                      <span className="pdc-hint">CIF: o fornecedor paga. FOB: você paga.</span>
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Valor do frete</label>
                      <input className="erp-input num" type="number" step="0.01" value={capa.freight_value ?? ""}
                        onChange={(e) => setC("freight_value", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Frete em</label>
                      <select className="erp-input" value={capa.freight_value_type ?? "VALOR"}
                        onChange={(e) => setC("freight_value_type", e.target.value)}>
                        {FREIGHT_VALUE_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
                      </select>
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Aplicado por</label>
                      <select className="erp-input" value={capa.freight_value_mode ?? "TOTAL"}
                        onChange={(e) => setC("freight_value_mode", e.target.value)}>
                        {FREIGHT_VALUE_MODES.map((m) => <option key={m} value={m}>{enumLabel(m)}</option>)}
                      </select>
                      <span className="pdc-hint">Unitário rateia por peça; total, pelo pedido.</span>
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Transportadora</label>
                      <LookupField value={capa.carrier_code} onChange={(c) => setC("carrier_code", c ? Number(c) : undefined)}
                        loader={loadCarriers} entityLabel="transportadora" placeholder="Opcional" clearable />
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Redespacho — transportadora</label>
                      <LookupField value={capa.redispatch_carrier_code} onChange={(c) => setC("redispatch_carrier_code", c ? Number(c) : undefined)}
                        loader={loadCarriers} entityLabel="transportadora" placeholder="Quando há segundo trecho" clearable />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Redespacho — frete</label>
                      <select className="erp-input" value={capa.redispatch_freight_type ?? ""}
                        onChange={(e) => setC("redispatch_freight_type", e.target.value || undefined)}>
                        <option value="">Não há redespacho</option>
                        {FREIGHT_TYPES.map((f) => <option key={f} value={f}>{enumLabel(f)}</option>)}
                      </select>
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Redespacho — valor</label>
                      <input className="erp-input num" type="number" step="0.01" value={capa.redispatch_freight_value ?? ""}
                        onChange={(e) => setC("redispatch_freight_value", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Talão</label>
                      <input className="erp-input" value={capa.talao_number ?? ""} placeholder="Número do talão"
                        onChange={(e) => setC("talao_number", e.target.value || undefined)} />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Adiantamento</label>
                      <input className="erp-input num" type="number" step="0.01" value={capa.advance_value ?? ""}
                        onChange={(e) => setC("advance_value", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Data do adiantamento</label>
                      <input className="erp-input" type="date" value={capa.advance_date ?? ""}
                        onChange={(e) => setC("advance_date", e.target.value || undefined)} />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Incoterm</label>
                      <input className="erp-input" value={capa.incoterm_code ?? ""} placeholder="FOB, CIF, EXW…"
                        onChange={(e) => setC("incoterm_code", e.target.value.toUpperCase() || undefined)} />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Embarque</label>
                      <input className="erp-input" type="date" value={capa.shipment_date ?? ""}
                        onChange={(e) => setC("shipment_date", e.target.value || undefined)} />
                    </div>
                  </div>
                </div>
              )}

              {aba === "notas" && aberto && <PedidoNotasPanel code={aberto} itens={itens} nomeItem={nomeItem} />}
              {aba === "pagamentos" && aberto && <PrevisaoPagamentosPanel code={aberto} />}
              {aba === "envio" && aberto && (
                <PedidoEnvioPanel code={aberto} numero={capa.order_number} situacao={situacao} onFeedback={setFeedback} />
              )}

              {aba === "itens" && (
                <>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Incluir item</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c3">
                        <label className="erp-label erp-req">Item</label>
                        <LookupField value={itemForm.item_code || undefined}
                          onChange={(c) => setItemForm((f) => ({ ...f, item_code: c ? String(c) : "" }))}
                          loader={loadItems} entityLabel="item" placeholder="O que comprar…" />
                      </div>
                      <div className="erp-field erp-c2">
                        <label className="erp-label erp-req">Quantidade</label>
                        <input className="erp-input num" type="number" step="0.001" value={itemForm.requested_qty}
                          onChange={(e) => setItemForm((f) => ({ ...f, requested_qty: e.target.value }))} />
                      </div>
                      <div className="erp-field erp-c2">
                        <label className="erp-label">Preço unitário</label>
                        <input className="erp-input num" type="number" step="0.0001" value={itemForm.unit_price}
                          placeholder="da tabela"
                          onChange={(e) => setItemForm((f) => ({ ...f, unit_price: e.target.value }))} />
                        <span className="pdc-hint">Em branco usa a tabela de preço.</span>
                      </div>
                      <div className="erp-field erp-c2">
                        <label className="erp-label">Entrega</label>
                        <input className="erp-input" type="date" value={itemForm.delivery_date}
                          onChange={(e) => setItemForm((f) => ({ ...f, delivery_date: e.target.value }))} />
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Almoxarifado</label>
                        <LookupField value={Number(itemForm.warehouse_id) || undefined}
                          onChange={(c) => setItemForm((f) => ({ ...f, warehouse_id: c ? String(c) : "" }))}
                          loader={loadWarehouses} entityLabel="almoxarifado" placeholder="Do cadastro do item" clearable />
                        <span className="pdc-hint">Onde o recebimento lança o estoque. Em branco usa o almoxarifado de suprimentos do item.</span>
                      </div>

                      <div className="erp-field erp-c2">
                        <label className="erp-label">Desconto (%)</label>
                        <input className="erp-input num" type="number" step="0.01" value={itemForm.discount_pct}
                          onChange={(e) => setItemForm((f) => ({ ...f, discount_pct: e.target.value }))} />
                      </div>
                      <div className="erp-field erp-c2">
                        <label className="erp-label">IPI (%)</label>
                        <input className="erp-input num" type="number" step="0.01" value={itemForm.ipi_pct}
                          placeholder="da classificação"
                          onChange={(e) => setItemForm((f) => ({ ...f, ipi_pct: e.target.value }))} />
                      </div>
                      <div className="erp-field erp-c2">
                        <label className="erp-label">ICMS (%)</label>
                        <input className="erp-input num" type="number" step="0.01" value={itemForm.icms_pct}
                          onChange={(e) => setItemForm((f) => ({ ...f, icms_pct: e.target.value }))} />
                      </div>
                      <div className="erp-field erp-c2">
                        <label className="erp-label">Tolerância (%)</label>
                        <input className="erp-input num" type="number" step="0.01" value={itemForm.tolerance_pct}
                          onChange={(e) => setItemForm((f) => ({ ...f, tolerance_pct: e.target.value }))} />
                        <span className="pdc-hint">Quanto a mais ou a menos encerra o saldo.</span>
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Centro de custo</label>
                        <LookupField value={Number(itemForm.cost_center_code) || undefined}
                          onChange={(c) => setItemForm((f) => ({ ...f, cost_center_code: c ? String(c) : "" }))}
                          loader={loadCostCenters} entityLabel="centro de custo" placeholder="Opcional" clearable />
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Utilização</label>
                        <select className="erp-input" value={itemForm.utilization_type}
                          onChange={(e) => setItemForm((f) => ({ ...f, utilization_type: e.target.value }))}>
                          <option value="">Do cadastro do item</option>
                          {UTILIZATION_TYPES.map((u) => <option key={u} value={u}>{enumLabel(u)}</option>)}
                        </select>
                        <span className="pdc-hint">Decide o crédito de imposto na entrada.</span>
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Classificação fiscal</label>
                        <LookupField value={Number(itemForm.fiscal_classification_code) || undefined}
                          onChange={(c) => setItemForm((f) => ({ ...f, fiscal_classification_code: c ? String(c) : "" }))}
                          loader={loadItemClassifications} entityLabel="classificação" placeholder="Do cadastro do item" clearable />
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Tipo de nota</label>
                        <LookupField value={Number(itemForm.invoice_type_code) || undefined}
                          onChange={(c) => setItemForm((f) => ({ ...f, invoice_type_code: c ? String(c) : "" }))}
                          loader={loadInvoiceTypes} entityLabel="tipo de nota" placeholder="Do fornecedor" clearable />
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Solicitante</label>
                        <LookupField value={Number(itemForm.requester_employee_code) || undefined}
                          onChange={(c) => setItemForm((f) => ({ ...f, requester_employee_code: c ? String(c) : "" }))}
                          loader={loadEmployees} entityLabel="funcionário" placeholder="Quem pediu" clearable />
                      </div>
                      <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}>
                        <button className="erp-btn erp-btn-primary" style={{ width: "100%" }}
                          onClick={incluirItem} disabled={busy || !aberto || !editavel}>+ Item</button>
                      </div>
                      <div className="erp-field erp-c12">
                        <HistoricoPrecoPanel itemCode={itemForm.item_code || undefined}
                          precoAtual={itemForm.unit_price.trim() ? Number(itemForm.unit_price) : undefined} />
                      </div>
                    </div>
                  </div>

                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      Origem da linha <span className="erp-hint">(opcional — informe antes de clicar em “+ Item”)</span>
                    </div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c12">
                        <p className="erp-note">
                          Um pedido de compra raramente nasce sozinho: ele atende uma requisição,
                          fecha uma cotação, consome um contrato ou firma uma ordem planejada do MRP.
                          Guardar esse vínculo é o que responde depois <em>por que compramos isso</em> —
                          e é por ele que o recebimento dá baixa na origem certa.
                        </p>
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Requisição</label>
                        <LookupField value={Number(itemForm.purchase_requisition_code) || undefined}
                          onChange={(c) => { void escolherRequisicao(c ? Number(c) : undefined); }}
                          loader={loadPurchaseRequisitions} entityLabel="requisição" placeholder="Nenhuma" clearable />
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Item da requisição</label>
                        <select className="erp-input" value={itemForm.purchase_requisition_item_id}
                          disabled={itensDaRequisicao.length === 0}
                          onChange={(e) => setItemForm((f) => ({ ...f, purchase_requisition_item_id: e.target.value }))}>
                          <option value="">
                            {itemForm.purchase_requisition_code ? "Escolha a linha atendida" : "Escolha a requisição primeiro"}
                          </option>
                          {itensDaRequisicao.map((i) => (
                            <option key={i.id} value={String(i.id)}>
                              {`Item ${i.item_code} · saldo ${saldoDaRequisicao(i).toLocaleString("pt-BR")} ${i.uom ?? ""}`.trim()}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Cotação</label>
                        <LookupField value={Number(itemForm.quotation_code) || undefined}
                          onChange={(c) => setItemForm((f) => ({ ...f, quotation_code: c ? String(c) : "" }))}
                          loader={loadPurchaseQuotations} entityLabel="cotação" placeholder="Nenhuma" clearable />
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Contrato de fornecimento</label>
                        <LookupField value={Number(itemForm.contract_code) || undefined}
                          onChange={(c) => setItemForm((f) => ({ ...f, contract_code: c ? String(c) : "" }))}
                          loader={loadSupplierContracts} entityLabel="contrato" placeholder="Nenhum" clearable />
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Ordem planejada (MRP)</label>
                        <LookupField value={Number(itemForm.planned_order_code) || undefined}
                          onChange={(c) => setItemForm((f) => ({ ...f, planned_order_code: c ? String(c) : "" }))}
                          loader={loadPlannedOrders} entityLabel="ordem planejada" placeholder="Nenhuma" clearable />
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Natureza da demanda</label>
                        <select className="erp-input" value={itemForm.demand_type}
                          onChange={(e) => setItemForm((f) => ({ ...f, demand_type: e.target.value, demand_code: "" }))}>
                          <option value="">Não informada</option>
                          {DEMAND_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
                        </select>
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Pedido de venda</label>
                        <LookupField value={Number(itemForm.sales_order_code) || undefined}
                          onChange={(c) => setItemForm((f) => ({
                            ...f,
                            sales_order_code: c ? String(c) : "",
                            // O pedido de venda é a própria demanda: a natureza e o
                            // código seguem juntos para o backend não ficar com meia
                            // informação de origem.
                            demand_type: c ? "SALES_ORDER" : f.demand_type,
                            demand_code: c ? String(c) : f.demand_code,
                          }))}
                          loader={loadSalesOrders} entityLabel="pedido de venda" placeholder="Nenhum" clearable />
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label">Ordem de produção</label>
                        <LookupField value={Number(itemForm.production_order_id) || undefined}
                          onChange={(c) => setItemForm((f) => ({ ...f, production_order_id: c ? String(c) : "" }))}
                          loader={loadProductionOrders} entityLabel="ordem de produção" placeholder="Nenhuma" clearable />
                      </div>
                    </div>
                  </div>

                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Itens do pedido ({itens.length})</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                        <table className="erp-grid">
                          <thead>
                            <tr>
                              <th>Seq.</th><th>Item</th><th>Almoxarifado</th><th className="num">Pedido</th><th className="num">Recebido</th>
                              <th className="num">Cancelado</th><th className="num">Saldo</th>
                              <th className="num">Preço</th><th className="num">Desc.</th><th className="num">IPI</th>
                              <th>Entrega</th><th>Prometida</th><th className="num">Total</th><th>Situação</th><th />
                            </tr>
                          </thead>
                          <tbody>
                            {itens.length === 0 && (
                              <tr><td colSpan={15} className="erp-grid-empty">
                                {aberto ? "Pedido sem itens. Inclua o primeiro acima." : "Grave a capa para incluir itens."}
                              </td></tr>
                            )}
                            {itens.map((i) => {
                              const saldo = i.status === "CANCELLED" ? 0 : Math.max(0, i.requested_qty - (i.received_qty ?? 0) - (i.cancelled_qty ?? 0));
                              const le = edicao && edicao.code === i.code ? edicao : null;
                              const emEdicao = le !== null;
                              const ed = (k: keyof EdicaoLinha, v: string) => setEdicao((e) => (e ? { ...e, [k]: v } : e));
                              const podeEditar = editavel && !(i.received_qty ?? 0) && i.status !== "CANCELLED";
                              const podeEliminar = PODE_ELIMINAR_SALDO.has(situacao) && saldo > 0;
                              return (
                                <Fragment key={i.code ?? i.sequence}>
                                <tr className={emEdicao ? "erp-row-sel" : undefined}>
                                  <td>{i.sequence ?? "—"}</td>
                                  <td>
                                    <strong>{i.item_code}</strong>
                                    {nomeItem[i.item_code] && <><br /><small>{nomeItem[i.item_code]}</small></>}
                                    {i.notes && <><br /><small className="pdc-hint">{i.notes}</small></>}
                                  </td>
                                  <td>{emEdicao
                                    ? <LookupField value={Number(le!.almox) || undefined} loader={loadWarehouses} entityLabel="almoxarifado"
                                        onChange={(c) => ed("almox", c ? String(c) : "")} />
                                    : (i.warehouse_id ? nomeAlmox[String(i.warehouse_id)] ?? `#${i.warehouse_id}` : <span className="pdc-falta">sem almoxarifado</span>)}</td>
                                  <td className="num">{emEdicao
                                    ? <input className="erp-input num pdc-mini" type="number" step="0.001" value={le!.qtd} onChange={(e) => ed("qtd", e.target.value)} />
                                    : num(i.requested_qty)}</td>
                                  <td className="num">{num(i.received_qty)}</td>
                                  <td className="num">{num(i.cancelled_qty)}</td>
                                  <td className={`num${saldo === 0 ? " pdc-quitado" : ""}`}>{num(saldo)}</td>
                                  <td className="num">{emEdicao
                                    ? <input className="erp-input num pdc-mini" type="number" step="0.0001" value={le!.preco} onChange={(e) => ed("preco", e.target.value)} />
                                    : brl(i.unit_price)}</td>
                                  <td className="num">{emEdicao
                                    ? <input className="erp-input num pdc-mini" type="number" step="0.01" value={le!.desc} onChange={(e) => ed("desc", e.target.value)} />
                                    : `${i.discount_pct ?? 0}%`}</td>
                                  <td className="num">{emEdicao
                                    ? <input className="erp-input num pdc-mini" type="number" step="0.01" value={le!.ipi} onChange={(e) => ed("ipi", e.target.value)} />
                                    : `${i.ipi_pct ?? 0}%`}</td>
                                  <td>{emEdicao
                                    ? <input className="erp-input" type="date" value={le!.entrega} onChange={(e) => ed("entrega", e.target.value)} />
                                    : (i.delivery_date ? i.delivery_date.slice(0, 10).split("-").reverse().join("/") : "—")}</td>
                                  <td>{i.promised_date ? i.promised_date.slice(0, 10).split("-").reverse().join("/") : "—"}</td>
                                  <td className="num">{brl(i.total_price ?? i.requested_qty * i.unit_price)}</td>
                                  <td><span className={`erp-badge ${i.status === "CANCELLED" ? "erp-badge-red" : i.status === "RECEIVED" ? "erp-badge-green" : "erp-badge-amber"}`}>
                                    {SITUACAO_LINHA[i.status ?? ""] ?? i.status ?? "—"}</span></td>
                                  <td style={{ whiteSpace: "nowrap" }}>
                                    {emEdicao ? (
                                      <>
                                        <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy} onClick={gravarLinha}>Gravar</button>{" "}
                                        <button className="erp-btn erp-btn-sm" onClick={() => setEdicao(null)}>Desistir</button>
                                      </>
                                    ) : (
                                      <>
                                        {podeEditar && <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => editarLinha(i)}>Editar</button>}{" "}
                                        {podeEditar && <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={() => removerLinha(i)}>Remover</button>}
                                        {podeEliminar && (
                                          <button className="erp-btn erp-btn-sm" disabled={busy}
                                            title="Registrar o contato com o fornecedor e a data prometida"
                                            onClick={() => { setEliminando(null); setAcompanhando(acompanhando === i.code ? null : i.code ?? null); }}>
                                            {acompanhando === i.code ? "Fechar" : "Acompanhar"}</button>
                                        )}{" "}
                                        {podeEliminar && (
                                          <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy}
                                            title="Deixa de esperar o que falta: o recebido fica, o saldo é cancelado"
                                            onClick={() => { setEdicao(null); setEliminando({ code: i.code ?? 0, motivo: "" }); }}>Eliminar saldo</button>
                                        )}
                                      </>
                                    )}
                                  </td>
                                </tr>
                                {acompanhando !== null && acompanhando === i.code && aberto && (
                                  <tr><td colSpan={15}>
                                    <FollowupLinha code={aberto} lineCode={i.code ?? 0} promessaAtual={i.promised_date}
                                      onFechar={() => setAcompanhando(null)}
                                      onSalvo={(f) => {
                                        void abrir(aberto, { type: "success", message: `Contato registrado${f.data_prometida ? `; entrega prometida para ${f.data_prometida.split("-").reverse().join("/")}` : ""}.` });
                                      }} />
                                  </td></tr>
                                )}
                                {eliminando && eliminando.code === i.code && (
                                  <tr>
                                    <td colSpan={15}>
                                      <div className="pdc-inline" style={{ alignItems: "center" }}>
                                        <span>Eliminar o saldo de <strong>{num(saldo)}</strong> da linha {i.sequence}. Motivo:</span>
                                        <input className="erp-input" style={{ flex: 1 }} value={eliminando.motivo} autoFocus
                                          placeholder="Ex.: fornecedor não tem mais o item; comprado de outro fornecedor"
                                          onChange={(e) => setEliminando({ code: eliminando.code, motivo: e.target.value })} />
                                        <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={eliminarSaldo}>Confirmar</button>
                                        <button className="erp-btn erp-btn-sm" onClick={() => setEliminando(null)}>Desistir</button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                          {itens.length > 0 && (
                            <tfoot>
                              <tr>
                                <th colSpan={6} style={{ textAlign: "left" }}>Total do pedido</th>
                                <th className="num">{num(pendente)}</th>
                                <th colSpan={6} style={{ textAlign: "right" }}>
                                  mercadoria {brl(capa.total_gross)} · desconto {brl(capa.total_discount)}
                                  {capa.freight_type === "FOB" && capa.freight_value ? " · com frete FOB" : ""}
                                </th>
                                <th className="num" colSpan={2}>{brl(totalComFrete)}</th>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                      <div className="erp-field erp-c12">
                        <span className="pdc-hint">
                          O total é o que a empresa vai pagar: mercadoria com desconto, mais IPI, mais o frete quando é FOB.
                          É esse valor que a alçada avalia na aprovação.
                        </span>
                      </div>
                      {pendente === 0 && itens.length > 0 && situacao !== "CANCELLED" && (
                        <div className="erp-field erp-c12">
                          <div className="erp-feedback success">
                            Todos os itens estão atendidos — o pedido não tem mais saldo pendente.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
        )}
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Itens: <strong>{itens.length}</strong></div>
        <div className="erp-status-item">Saldo pendente: <strong>{num(pendente)}</strong></div>
        <div className="erp-status-item">Total: <strong>{brl(totalComFrete)}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

const PDC_STYLES = `
.pdc-inline { display: flex; gap: 6px; padding: 8px; }
.pdc-hint { display: block; font-size: 10.5px; color: #7a9a84; line-height: 1.4; margin-top: 3px; }
.erp-grid .num { text-align: right; }
.pdc-quitado { color: #2f7d47; font-weight: 700; }
.pdc-mini { width: 86px; height: 28px; }
.pdc-falta { color: #b45309; font-weight: 600; }
.pdc-hist { border: 1px solid #d8e6dc; background: #f6faf7; border-radius: 6px; padding: 8px 10px; font-size: 12px; }
.pdc-hist-linha { display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center; }
.pdc-followup { border: 1px solid #d8e6dc; background: #fbfdfb; border-radius: 6px; }
.pdc-cancelada { text-decoration: line-through; color: #9aa59d; }
`;
