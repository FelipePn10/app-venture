import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type PurchaseOrderDTO, type PurchaseOrderItemDTO,
  FREIGHT_TYPES, FREIGHT_VALUE_TYPES, FREIGHT_VALUE_MODES, UTILIZATION_TYPES, DEMAND_TYPES,
  listOrders, getOrder, createOrder, updateOrder, cancelOrder, addOrderItem,
  approveOrder, authorizeOrder,
} from "@/services/purchaseOrderService";
import { errMessage, parseNum, unwrapArray, unwrapObject } from "@/services/fiscalShared";
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
type Aba = "capa" | "itens" | "transporte";

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
const PODE_APROVAR = new Set(["", "DRAFT", "PENDING", "BLOCKED"]);

export function Vpdc0200Page(): JSX.Element {
  const [aba, setAba] = useState<Aba>("capa");
  const [pedidos, setPedidos] = useState<PurchaseOrderDTO[]>([]);
  const [capa, setCapa] = useState<PurchaseOrderDTO>({ ...CAPA_INICIAL });
  const [itens, setItens] = useState<PurchaseOrderItemDTO[]>([]);
  const [itemForm, setItemForm] = useState({ ...ITEM_INICIAL });
  const [itensDaRequisicao, setItensDaRequisicao] = useState<RequisitionItemDTO[]>([]);
  const [aberto, setAberto] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

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

  const abrir = useCallback((code: number) => executar(async () => {
    const bruto = await getOrder(code);
    const o = unwrapObject(bruto);
    const dados = unwrapObject(o["data"] ?? o);
    setCapa({
      code: parseNum(dados, "code", "Code"),
      supplier_code: parseNum(dados, "supplier_code", "SupplierCode") || undefined,
      status: String(dados["status"] ?? dados["Status"] ?? ""),
      currency_code: String(dados["currency_code"] ?? dados["CurrencyCode"] ?? "BRL"),
      emission_date: String(dados["emission_date"] ?? dados["EmissionDate"] ?? "").slice(0, 10),
      delivery_date: String(dados["delivery_date"] ?? dados["DeliveryDate"] ?? "").slice(0, 10) || undefined,
      payment_term_code: parseNum(dados, "payment_term_code", "PaymentTermCode") || undefined,
      freight_type: String(dados["freight_type"] ?? dados["FreightType"] ?? "CIF"),
      freight_value: parseNum(dados, "freight_value", "FreightValue"),
      carrier_code: parseNum(dados, "carrier_code", "CarrierCode") || undefined,
      total_gross: parseNum(dados, "total_gross", "TotalGross"),
      total_net: parseNum(dados, "total_net", "TotalNet"),
      notes: String(dados["notes"] ?? dados["Notes"] ?? "") || undefined,
      alcada_status: String(dados["alcada_status"] ?? dados["AlcadaStatus"] ?? "") || undefined,
    });
    setItens(unwrapArray(dados["items"] ?? dados["Items"]).map((raw) => {
      const i = unwrapObject(raw);
      return {
        code: parseNum(i, "code", "Code") || undefined,
        sequence: parseNum(i, "sequence", "Sequence") || undefined,
        item_code: String(i["item_code"] ?? i["ItemCode"] ?? ""),
        requested_qty: parseNum(i, "requested_qty", "RequestedQty"),
        received_qty: parseNum(i, "received_qty", "ReceivedQty"),
        cancelled_qty: parseNum(i, "cancelled_qty", "CancelledQty"),
        unit_price: parseNum(i, "unit_price", "UnitPrice"),
        discount_pct: parseNum(i, "discount_pct", "DiscountPct"),
        ipi_pct: parseNum(i, "ipi_pct", "IpiPct"),
        icms_pct: parseNum(i, "icms_pct", "IcmsPct"),
        tolerance_pct: parseNum(i, "tolerance_pct", "TolerancePct"),
        purchase_uom: String(i["purchase_uom"] ?? i["PurchaseUOM"] ?? "") || undefined,
        delivery_date: String(i["delivery_date"] ?? i["DeliveryDate"] ?? "").slice(0, 10) || undefined,
        total_price: parseNum(i, "total_price", "TotalPrice"),
        status: String(i["status"] ?? i["Status"] ?? "") || undefined,
      } as PurchaseOrderItemDTO;
    }));
    setAberto(code);
    setAba("itens");
    setFeedback({ type: "success", message: `Pedido ${code} aberto.` });
  }), [executar]);

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
        setAberto(code || null);
        setCapa((c) => ({ ...c, code }));
        setAba("itens");
        setFeedback({ type: "success", message: `Pedido ${code} criado. Inclua os itens.` });
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
    if (!itemForm.warehouse_id) { setFeedback({ type: "error", message: "Informe o almoxarifado de entrada do material." }); return; }
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
      setFeedback({ type: "success", message: "Item incluído." });
      await abrir(aberto);
    });
  }

  const totais = useMemo(() => itens.reduce((acc, i) => {
    const bruto = (i.total_price ?? i.requested_qty * i.unit_price);
    const desconto = bruto * ((i.discount_pct ?? 0) / 100);
    const ipi = (bruto - desconto) * ((i.ipi_pct ?? 0) / 100);
    return {
      bruto: acc.bruto + bruto,
      desconto: acc.desconto + desconto,
      ipi: acc.ipi + ipi,
      liquido: acc.liquido + bruto - desconto + ipi,
      pendente: acc.pendente + Math.max(0, i.requested_qty - (i.received_qty ?? 0) - (i.cancelled_qty ?? 0)),
    };
  }, { bruto: 0, desconto: 0, ipi: 0, liquido: 0, pendente: 0 }), [itens]);

  const totalComFrete = totais.liquido + (capa.freight_value ?? 0);

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
            ? `pedido ${aberto} · ${SITUACAO_ROTULO[capa.status ?? ""] ?? capa.status ?? "—"}${
                capa.alcada_status && capa.alcada_status !== "N" ? ` · alçada ${ALCADA_ROTULO[capa.alcada_status] ?? capa.alcada_status}` : ""}`
            : "novo pedido"}
        </span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Pedido</span>
          <button className="erp-btn erp-btn-primary" onClick={gravarCapa} disabled={busy}>
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

        {capa.alcada_status === "R" && (
          <div className="erp-feedback error">
            Este pedido está acima do teto absoluto da política de alçada — nem a autorização
            superior o libera. Reduza o valor, divida o pedido ou revise a política em Suprimentos.
          </div>
        )}
        {capa.alcada_status === "B" && (
          <div className="erp-feedback info">
            Valor acima da alçada do comprador. O pedido só segue ao fornecedor depois de
            <b> Autorizar alçada</b>, que exige perfil de administrador.
          </div>
        )}

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
                  <span className="erp-list-code">#{p.code}</span>
                  <span className="erp-list-sub">
                    Fornecedor {p.supplier_code ?? "—"} · {SITUACAO_ROTULO[p.status ?? ""] ?? p.status ?? "—"}
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
                        <label className="erp-label erp-req">Almoxarifado</label>
                        <LookupField value={Number(itemForm.warehouse_id) || undefined}
                          onChange={(c) => setItemForm((f) => ({ ...f, warehouse_id: c ? String(c) : "" }))}
                          loader={loadWarehouses} entityLabel="almoxarifado" placeholder="Onde o material entra" />
                        <span className="pdc-hint">Define onde o recebimento vai lançar o estoque.</span>
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
                          onClick={incluirItem} disabled={busy || !aberto}>+ Item</button>
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
                      <div className="erp-field erp-c12">
                        <table className="erp-grid">
                          <thead>
                            <tr>
                              <th>Seq.</th><th>Item</th><th className="num">Pedido</th><th className="num">Recebido</th>
                              <th className="num">Cancelado</th><th className="num">Saldo</th>
                              <th className="num">Preço</th><th className="num">Desc.</th><th className="num">IPI</th>
                              <th>Entrega</th><th className="num">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itens.length === 0 && (
                              <tr><td colSpan={11} className="erp-grid-empty">
                                {aberto ? "Pedido sem itens. Inclua o primeiro acima." : "Grave a capa para incluir itens."}
                              </td></tr>
                            )}
                            {itens.map((i) => {
                              const saldo = Math.max(0, i.requested_qty - (i.received_qty ?? 0) - (i.cancelled_qty ?? 0));
                              return (
                                <tr key={i.code ?? i.sequence}>
                                  <td>{i.sequence ?? "—"}</td>
                                  <td style={{ fontWeight: 600 }}>{i.item_code}</td>
                                  <td className="num">{num(i.requested_qty)}</td>
                                  <td className="num">{num(i.received_qty)}</td>
                                  <td className="num">{num(i.cancelled_qty)}</td>
                                  <td className={`num${saldo === 0 ? " pdc-quitado" : ""}`}>{num(saldo)}</td>
                                  <td className="num">{brl(i.unit_price)}</td>
                                  <td className="num">{(i.discount_pct ?? 0)}%</td>
                                  <td className="num">{(i.ipi_pct ?? 0)}%</td>
                                  <td>{i.delivery_date?.slice(0, 10) ?? "—"}</td>
                                  <td className="num">{brl(i.total_price ?? i.requested_qty * i.unit_price)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {itens.length > 0 && (
                            <tfoot>
                              <tr>
                                <th colSpan={5} style={{ textAlign: "left" }}>Total do pedido</th>
                                <th className="num">{num(totais.pendente)}</th>
                                <th colSpan={4} style={{ textAlign: "right" }}>
                                  bruto {brl(totais.bruto)} · desconto {brl(totais.desconto)} · IPI {brl(totais.ipi)}
                                  {capa.freight_value ? ` · frete ${brl(capa.freight_value)}` : ""}
                                </th>
                                <th className="num">{brl(totalComFrete)}</th>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                      {totais.pendente === 0 && itens.length > 0 && (
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
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Itens: <strong>{itens.length}</strong></div>
        <div className="erp-status-item">Saldo pendente: <strong>{num(totais.pendente)}</strong></div>
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
`;
