import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/purchase-order';

/**
 * Pedido de Compra (§13) + Sugestões de Compra do MRP.
 * Ao criar com `supplier_code` e sem `payment_term_code`, o backend puxa a
 * condição de pagamento dos defaults do fornecedor. Ao adicionar item, resolve
 * preço (Tabela de Preço), UM interna (Conversões) e %IPI (Classificação Fiscal).
 */
/** Quem paga o frete — o mesmo vocabulário da nota fiscal. */
export const FREIGHT_TYPES = ['CIF', 'DAF', 'FOB', 'SEM_FRETE', 'CONVENIO', 'RETIRA', 'CORTESIA', 'TERCEIROS'] as const;

/** O frete é um valor fechado ou um percentual sobre a mercadoria. */
export const FREIGHT_VALUE_TYPES = ['VALOR', 'PERCENTUAL'] as const;
/** E vale por peça ou pelo pedido inteiro. */
export const FREIGHT_VALUE_MODES = ['UNITARIO', 'TOTAL'] as const;
/** Destino do material comprado — decide o crédito de imposto. */
export const UTILIZATION_TYPES = ['INDUSTRIALIZACAO', 'CONSUMO', 'IMOBILIZADO'] as const;

/**
 * Natureza da demanda que originou a linha (`demand_type_enum` no backend). É a
 * mesma classificação que o MRP usa para explicar de onde veio a necessidade.
 */
export const DEMAND_TYPES = ['SALES_ORDER', 'FORECAST', 'INDEPENDENT', 'SAFETY_STOCK', 'REPLENISHMENT'] as const;

export interface PurchaseOrderDTO {
  code?: number;
  order_number?: number;
  enterprise_code?: number;
  supplier_code?: number;
  status?: string;
  origin?: string;
  emission_date?: string;
  delivery_date?: string;
  currency_code?: string;
  currency_date?: string;
  payment_term_code?: number;
  price_table_code?: number;
  invoice_type_code?: number;
  request_type_code?: number;
  financial_account?: string;
  shipping_address_code?: number;
  /** Transporte */
  freight_type?: string;
  freight_value_type?: string;
  freight_value_mode?: string;
  freight_value?: number;
  carrier_code?: number;
  redispatch_carrier_code?: number;
  redispatch_freight_type?: string;
  redispatch_freight_value?: number;
  talao_number?: string;
  /** Adiantamento e importação */
  advance_date?: string;
  advance_value?: number;
  incoterm_code?: string;
  shipment_date?: string;
  is_firm?: boolean;
  /**
   * Situação na alçada de valores: A liberado · B aguardando autorização
   * superior · R acima do teto, não pode ser autorizado · N ainda não avaliado.
   */
  alcada_status?: string;
  total_gross?: number;
  total_net?: number;
  total_discount?: number;
  notes?: string;
  created_by?: string;
  items?: PurchaseOrderItemDTO[];
}

export interface PurchaseOrderItemDTO {
  id?: number;
  code?: number;
  sequence?: number;
  item_code: string;
  mask?: string;
  requested_qty: number;
  /** Quanto já chegou e quanto foi cancelado — o saldo é a diferença. */
  received_qty?: number;
  cancelled_qty?: number;
  /** Quanto já chegou com nota fiscal (e virou título a pagar). */
  invoiced_qty?: number;
  unit_price: number;
  discount_pct?: number;
  ipi_pct?: number;
  icms_pct?: number;
  icms_st_pct?: number;
  /**
   * Tolerância de recebimento em %: o fornecedor pode entregar um pouco a mais
   * ou a menos sem que o pedido fique pendente para sempre.
   */
  tolerance_pct?: number;
  purchase_uom?: string;
  internal_uom?: string;
  internal_qty?: number;
  internal_price?: number;
  warehouse_id?: number;
  delivery_date?: string;
  promised_date?: string;
  cost_center_code?: number;
  accounting_account?: string;
  operation_type_code?: number;
  fiscal_classification_code?: number;
  utilization_type?: string;
  /**
   * Origem da linha. Um item de pedido de compra quase nunca nasce do nada: ele
   * atende uma requisição, fecha uma cotação, consome um contrato de
   * fornecimento ou firma uma ordem planejada do MRP. Guardar o vínculo é o que
   * permite responder depois por que aquilo foi comprado — e é o que o
   * recebimento usa para dar baixa na origem certa.
   */
  contract_code?: number;
  quotation_code?: number;
  planned_order_code?: number;
  purchase_requisition_code?: number;
  purchase_requisition_item_id?: number;
  sales_order_code?: number;
  production_order_id?: number;
  demand_type?: string;
  demand_code?: number;
  requester_employee_code?: number;
  invoice_type_code?: number;
  status?: string;
  total_price?: number;
  total_gross?: number;
  total_net?: number;
  notes?: string;
}

export interface SuggestionDTO {
  code: number;
  item_code: string;
  quantity: number;
  need_date?: string;
  status?: string;
  order_type?: string;
}

export interface PurchaseOrderConsultationFilter {
  order_from?: number; order_to?: number; supplier_from?: number; supplier_to?: number;
  request_type?: string; item_from?: number; item_to?: number; buyer?: string;
  import_from?: string; import_to?: string; base_date?: string; emission_from?: string;
  emission_to?: string; delivery_from?: string; delivery_to?: string; all_items?: boolean;
  convert?: boolean; only_kanban?: boolean; position?: string; target_currency?: string;
  type?: string; limit?: number; offset?: number;
}

export interface PurchaseReceiptItemDTO {
  purchase_order_item_code: number;
  quantity: number;
  warehouse_id: number;
  lot?: string;
  serial_number?: string;
  batch?: string;
  expiration_date?: string;
  notes?: string;
}

function parseItem(raw: unknown): PurchaseOrderItemDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    code: parseNum(o, 'code', 'Code') || undefined,
    sequence: parseNum(o, 'sequence', 'Sequence') || undefined,
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    requested_qty: parseNum(o, 'requested_qty', 'RequestedQty'),
    received_qty: parseNum(o, 'received_qty', 'ReceivedQty'),
    cancelled_qty: parseNum(o, 'cancelled_qty', 'CancelledQty'),
    invoiced_qty: parseNum(o, 'invoiced_qty', 'InvoicedQty'),
    unit_price: parseNum(o, 'unit_price', 'UnitPrice'),
    discount_pct: parseNum(o, 'discount_pct', 'DiscountPct'),
    ipi_pct: parseNum(o, 'ipi_pct', 'IpiPct'),
    icms_pct: parseNum(o, 'icms_pct', 'IcmsPct'),
    icms_st_pct: parseNum(o, 'icms_st_pct', 'IcmsStPct'),
    tolerance_pct: parseNum(o, 'tolerance_pct', 'TolerancePct'),
    purchase_uom: parseStr(o, 'purchase_uom', 'PurchaseUOM') || undefined,
    internal_uom: parseStr(o, 'internal_uom', 'InternalUOM') || undefined,
    internal_qty: parseNum(o, 'internal_qty', 'InternalQty') || undefined,
    internal_price: parseNum(o, 'internal_price', 'InternalPrice') || undefined,
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID') || undefined,
    delivery_date: parseStr(o, 'delivery_date', 'DeliveryDate') || undefined,
    promised_date: parseStr(o, 'promised_date', 'PromisedDate') || undefined,
    cost_center_code: parseNum(o, 'cost_center_code', 'CostCenterCode') || undefined,
    accounting_account: parseStr(o, 'accounting_account', 'AccountingAccount') || undefined,
    operation_type_code: parseNum(o, 'operation_type_code', 'OperationTypeCode') || undefined,
    fiscal_classification_code: parseNum(o, 'fiscal_classification_code', 'FiscalClassificationCode') || undefined,
    utilization_type: parseStr(o, 'utilization_type', 'UtilizationType') || undefined,
    contract_code: parseNum(o, 'contract_code', 'ContractCode') || undefined,
    quotation_code: parseNum(o, 'quotation_code', 'QuotationCode') || undefined,
    planned_order_code: parseNum(o, 'planned_order_code', 'PlannedOrderCode') || undefined,
    purchase_requisition_code: parseNum(o, 'purchase_requisition_code', 'PurchaseRequisitionCode') || undefined,
    purchase_requisition_item_id: parseNum(o, 'purchase_requisition_item_id', 'PurchaseRequisitionItemID') || undefined,
    sales_order_code: parseNum(o, 'sales_order_code', 'SalesOrderCode') || undefined,
    production_order_id: parseNum(o, 'production_order_id', 'ProductionOrderID') || undefined,
    demand_type: parseStr(o, 'demand_type', 'DemandType') || undefined,
    demand_code: parseNum(o, 'demand_code', 'DemandCode') || undefined,
    requester_employee_code: parseNum(o, 'requester_employee_code', 'RequesterEmployeeCode') || undefined,
    invoice_type_code: parseNum(o, 'invoice_type_code', 'InvoiceTypeCode') || undefined,
    status: parseStr(o, 'status', 'Status') || undefined,
    total_price: parseNum(o, 'total_price', 'TotalPrice'),
    total_gross: parseNum(o, 'total_gross', 'TotalGross'),
    total_net: parseNum(o, 'total_net', 'TotalNet'),
    notes: parseStr(o, 'notes', 'Notes') || undefined,
  };
}
function parseOrder(raw: unknown): PurchaseOrderDTO {
  const o = unwrapObject(raw);
  const items = o['items'] ?? o['Items'];
  return {
    code: parseNum(o, 'code', 'Code'),
    order_number: parseNum(o, 'order_number', 'OrderNumber'),
    enterprise_code: parseNum(o, 'enterprise_code', 'EnterpriseCode') || undefined,
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode') || undefined,
    status: parseStr(o, 'status', 'Status') || undefined,
    origin: parseStr(o, 'origin', 'Origin') || undefined,
    currency_code: parseStr(o, 'currency_code', 'CurrencyCode') || undefined,
    payment_term_code: parseNum(o, 'payment_term_code', 'PaymentTermCode') || undefined,
    emission_date: parseStr(o, 'emission_date', 'EmissionDate') || undefined,
    delivery_date: parseStr(o, 'delivery_date', 'DeliveryDate') || undefined,
    currency_date: parseStr(o, 'currency_date', 'CurrencyDate') || undefined,
    price_table_code: parseNum(o, 'price_table_code', 'PriceTableCode') || undefined,
    invoice_type_code: parseNum(o, 'invoice_type_code', 'InvoiceTypeCode') || undefined,
    request_type_code: parseNum(o, 'request_type_code', 'RequestTypeCode') || undefined,
    financial_account: parseStr(o, 'financial_account', 'FinancialAccount') || undefined,
    freight_type: parseStr(o, 'freight_type', 'FreightType') || undefined,
    freight_value_type: parseStr(o, 'freight_value_type', 'FreightValueType') || undefined,
    freight_value_mode: parseStr(o, 'freight_value_mode', 'FreightValueMode') || undefined,
    freight_value: parseNum(o, 'freight_value', 'FreightValue'),
    carrier_code: parseNum(o, 'carrier_code', 'CarrierCode') || undefined,
    redispatch_carrier_code: parseNum(o, 'redispatch_carrier_code', 'RedispatchCarrierCode') || undefined,
    redispatch_freight_type: parseStr(o, 'redispatch_freight_type', 'RedispatchFreightType') || undefined,
    redispatch_freight_value: parseNum(o, 'redispatch_freight_value', 'RedispatchFreightValue'),
    talao_number: parseStr(o, 'talao_number', 'TalaoNumber') || undefined,
    advance_date: parseStr(o, 'advance_date', 'AdvanceDate') || undefined,
    advance_value: parseNum(o, 'advance_value', 'AdvanceValue'),
    incoterm_code: parseStr(o, 'incoterm_code', 'IncotermCode') || undefined,
    shipment_date: parseStr(o, 'shipment_date', 'ShipmentDate') || undefined,
    total_discount: parseNum(o, 'total_discount', 'TotalDiscount'),
    alcada_status: parseStr(o, 'alcada_status', 'AlcadaStatus') || undefined,
    total_gross: parseNum(o, 'total_gross', 'TotalGross'),
    total_net: parseNum(o, 'total_net', 'TotalNet'),
    notes: parseStr(o, 'notes', 'Notes') || undefined,
    items: Array.isArray(items) ? items.map(parseItem) : undefined,
  };
}
function parseSuggestion(raw: unknown): SuggestionDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    need_date: parseStr(o, 'need_date', 'NeedDate') || undefined,
    status: parseStr(o, 'status', 'Status') || undefined,
    order_type: parseStr(o, 'order_type', 'OrderType') || undefined,
  };
}

export async function listOrders(): Promise<PurchaseOrderDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list`);
  return unwrapArray(data).map(parseOrder);
}
/** Detalhe cru (a tela lê `.items` inline como Obj). */
export async function getOrder(code: number): Promise<Obj> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return unwrapObject(data);
}
/** Detalhe já interpretado: capa completa e linhas. */
export async function getOrderDetail(code: number): Promise<PurchaseOrderDTO> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parseOrder(data);
}
export async function createOrder(dto: PurchaseOrderDTO): Promise<PurchaseOrderDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseOrder(data);
}
export async function updateOrder(code: number, dto: PurchaseOrderDTO): Promise<PurchaseOrderDTO> {
  const { data } = await httpClient.put(`${BASE}/${code}`, dto);
  return parseOrder(data);
}
export async function cancelOrder(code: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}/cancel`);
}
export async function addOrderItem(code: number, item: PurchaseOrderItemDTO): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/items`, item);
  return unwrapObject(data);
}
/** Campos alteráveis de uma linha de pedido ainda não aprovado. */
export interface PurchaseOrderItemPatch {
  requested_qty?: number;
  unit_price?: number;
  discount_pct?: number;
  ipi_pct?: number;
  icms_pct?: number;
  tolerance_pct?: number;
  warehouse_id?: number;
  cost_center_code?: number;
  delivery_date?: string;
  notes?: string;
}
/** Altera a linha (pedido em rascunho ou parado na alçada); devolve o pedido inteiro, com os totais refeitos. */
export async function updateOrderItem(code: number, lineCode: number, patch: PurchaseOrderItemPatch): Promise<PurchaseOrderDTO> {
  const { data } = await httpClient.put(`${BASE}/${code}/items/${lineCode}`, patch);
  return parseOrder(data);
}
/**
 * Pedido não aprovado: remove a linha. Pedido aprovado: elimina o saldo que
 * falta receber (o motivo é obrigatório e fica na linha).
 */
export async function cancelOrderItem(code: number, lineCode: number, motivo?: string): Promise<PurchaseOrderDTO> {
  const { data } = await httpClient.post(`${BASE}/${code}/items/${lineCode}/cancel`, { motivo: motivo ?? '' });
  return parseOrder(data);
}
export async function listOrdersBySupplier(supplierCode: number): Promise<PurchaseOrderDTO[]> {
  const { data } = await httpClient.get(`${BASE}/supplier/${supplierCode}`);
  return unwrapArray(data).map(parseOrder);
}
export async function listOrdersByStatus(status: string): Promise<PurchaseOrderDTO[]> {
  const { data } = await httpClient.get(`${BASE}/status/${encodeURIComponent(status)}`);
  return unwrapArray(data).map(parseOrder);
}
export async function downloadOrderAttachment(code: number, attachmentID: number): Promise<Blob> {
  const { data } = await httpClient.get(`${BASE}/${code}/attachments/${attachmentID}/download`, { responseType: 'blob' });
  return data as Blob;
}

export async function consultOrders(filter: PurchaseOrderConsultationFilter = {}): Promise<Obj[]> {
  const { data } = await httpClient.get(`${BASE}/consultation`, { params: filter });
  return unwrapArray(data).map((row) => unwrapObject(row));
}
export async function approveOrder(code: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/approve`);
  return unwrapObject(data);
}
export async function authorizeOrder(code: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/authorize`);
  return unwrapObject(data);
}
export async function receiveOrder(code: number, items: PurchaseReceiptItemDTO[], notes?: string): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/receipts`, { items, notes });
  return unwrapObject(data);
}

// ── Sugestões de compra (MRP) ──
export async function listSuggestions(): Promise<SuggestionDTO[]> {
  const { data } = await httpClient.get(`${BASE}/suggestions`);
  return unwrapArray(data).map(parseSuggestion);
}
/** Gera o pedido da sugestão; ele passa pela alçada como qualquer pedido. */
export async function approveSuggestion(code: number, body: { supplier_code: number; unit_price: number; notes?: string }): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/suggestions/${code}/approve`, body);
  return unwrapObject(data);
}
export async function rejectSuggestion(code: number): Promise<void> {
  await httpClient.post(`${BASE}/suggestions/${code}/reject`, {});
}

// ── Documento do pedido: PDF e envio ao fornecedor ──

/** PDF do pedido (o mesmo que vai anexado ao e-mail). */
export async function downloadOrderPdf(code: number): Promise<Blob> {
  const { data } = await httpClient.get(`${BASE}/${code}/pdf`, { responseType: 'blob' });
  return data as Blob;
}

export interface Destinatario { email: string; nome?: string; origem: 'CONTATO_PEDIDO' | 'CONTATO' | 'FORNECEDOR' | string; sugerido: boolean }
export async function listRecipients(code: number): Promise<Destinatario[]> {
  const { data } = await httpClient.get(`${BASE}/${code}/destinatarios`);
  return unwrapArray(data).map(unwrapObject).map((o) => ({
    email: parseStr(o, 'email'), nome: parseStr(o, 'nome') || undefined, origem: parseStr(o, 'origem'), sugerido: o['sugerido'] === true,
  }));
}

export interface EnvioPedido { id: number; enviado_em: string; enviado_por?: string; destinatarios: string; assunto: string; situacao: 'ENVIADO' | 'FALHOU' | string; erro?: string }
function parseEnvio(o: Obj): EnvioPedido {
  return {
    id: parseNum(o, 'id'), enviado_em: parseStr(o, 'enviado_em'), enviado_por: parseStr(o, 'enviado_por') || undefined,
    destinatarios: parseStr(o, 'destinatarios'), assunto: parseStr(o, 'assunto'), situacao: parseStr(o, 'situacao'), erro: parseStr(o, 'erro') || undefined,
  };
}
export async function listShipments(code: number): Promise<EnvioPedido[]> {
  const { data } = await httpClient.get(`${BASE}/${code}/envios`);
  return unwrapArray(data).map(unwrapObject).map(parseEnvio);
}
/** Envia o PDF por e-mail. Falha de envio volta como erro, mas fica registrada no histórico. */
export async function sendOrder(code: number, para: string[], mensagem?: string): Promise<EnvioPedido> {
  const { data } = await httpClient.post(`${BASE}/${code}/enviar`, { para, mensagem: mensagem ?? '' });
  return parseEnvio(unwrapObject(data));
}

// ── Acompanhamento de entregas ──

export type SituacaoAcompanhamento = 'ATRASADAS' | 'PROXIMOS_7' | 'SEM_PROMESSA' | 'TODAS';
export interface Followup { id: number; data_prometida?: string; contato?: string; observacao?: string; registrado_em: string; registrado_por?: string }
function parseFollowup(o: Obj): Followup {
  return {
    id: parseNum(o, 'id'), data_prometida: parseStr(o, 'data_prometida').slice(0, 10) || undefined, contato: parseStr(o, 'contato') || undefined,
    observacao: parseStr(o, 'observacao') || undefined, registrado_em: parseStr(o, 'registrado_em'), registrado_por: parseStr(o, 'registrado_por') || undefined,
  };
}
export interface LinhaEmAberto {
  purchase_order_code: number; order_number: number; line_code: number; sequence: number;
  /** Código comercial do item. */
  item_code: string; item_name: string; supplier_code: number; supplier_name: string;
  requested_qty: number; received_qty: number; saldo: number;
  delivery_date?: string; promised_date?: string; data_prevista?: string; dias_atraso: number; ultimo_contato?: Followup;
}
export async function listFollowUp(situacao: SituacaoAcompanhamento, supplierCode?: number): Promise<LinhaEmAberto[]> {
  const { data } = await httpClient.get(`${BASE}/acompanhamento`, { params: { situacao, ...(supplierCode ? { supplier_code: supplierCode } : {}) } });
  return unwrapArray(data).map(unwrapObject).map((o) => {
    const uc = o['ultimo_contato'];
    return {
      purchase_order_code: parseNum(o, 'purchase_order_code'), order_number: parseNum(o, 'order_number'), line_code: parseNum(o, 'line_code'),
      sequence: parseNum(o, 'sequence'), item_code: parseStr(o, 'item_code'), item_name: parseStr(o, 'item_name'),
      supplier_code: parseNum(o, 'supplier_code'), supplier_name: parseStr(o, 'supplier_name'),
      requested_qty: parseNum(o, 'requested_qty'), received_qty: parseNum(o, 'received_qty'), saldo: parseNum(o, 'saldo'),
      delivery_date: parseStr(o, 'delivery_date').slice(0, 10) || undefined, promised_date: parseStr(o, 'promised_date').slice(0, 10) || undefined,
      data_prevista: parseStr(o, 'data_prevista').slice(0, 10) || undefined, dias_atraso: parseNum(o, 'dias_atraso'),
      ultimo_contato: uc && typeof uc === 'object' ? parseFollowup(uc as Obj) : undefined,
    };
  });
}
export async function listLineFollowups(code: number, lineCode: number): Promise<Followup[]> {
  const { data } = await httpClient.get(`${BASE}/${code}/items/${lineCode}/followups`);
  return unwrapArray(data).map(unwrapObject).map(parseFollowup);
}
/** Registra o contato com o fornecedor; com data, ela vira a data prometida da linha. */
export async function addLineFollowup(code: number, lineCode: number, f: { data_prometida?: string; contato?: string; observacao?: string }): Promise<Followup> {
  const { data } = await httpClient.post(`${BASE}/${code}/items/${lineCode}/followups`, {
    data_prometida: f.data_prometida ?? '', contato: f.contato ?? '', observacao: f.observacao ?? '',
  });
  return parseFollowup(unwrapObject(data));
}

// ── Histórico de preço do item ──

export interface CompraDoItem {
  fiscal_entry_id: number; numero_nf: number; data_entrada: string; supplier_name: string;
  quantidade: number; unidade?: string; preco_nota: number; custo_estoque: number; qtd_estoque: number;
}
export interface HistoricoPreco {
  ultima?: CompraDoItem; compras: CompraDoItem[]; qtd_compras_12m: number;
  custo_medio_12m?: number; custo_minimo_12m?: number; custo_maximo_12m?: number;
  ultimo_pedido?: { order_number: number; emission_date: string; supplier_name: string; unit_price: number; purchase_uom?: string };
}
function parseCompra(o: Obj): CompraDoItem {
  return {
    fiscal_entry_id: parseNum(o, 'fiscal_entry_id'), numero_nf: parseNum(o, 'numero_nf'), data_entrada: parseStr(o, 'data_entrada').slice(0, 10),
    supplier_name: parseStr(o, 'supplier_name'), quantidade: parseNum(o, 'quantidade'), unidade: parseStr(o, 'unidade') || undefined,
    preco_nota: parseNum(o, 'preco_nota'), custo_estoque: parseNum(o, 'custo_estoque'), qtd_estoque: parseNum(o, 'qtd_estoque'),
  };
}
const optN = (o: Obj, k: string): number | undefined => (o[k] === undefined || o[k] === null ? undefined : parseNum(o, k));
/** itemCode é o código comercial — o backend traduz. */
export async function getPriceHistory(itemCode: string): Promise<HistoricoPreco> {
  const { data } = await httpClient.get(`${BASE}/historico-preco`, { params: { item_code: itemCode } });
  const o = unwrapObject(data);
  const ult = o['ultima'];
  const ped = o['ultimo_pedido'];
  return {
    ultima: ult && typeof ult === 'object' ? parseCompra(ult as Obj) : undefined,
    compras: unwrapArray(o['compras']).map(unwrapObject).map(parseCompra),
    qtd_compras_12m: parseNum(o, 'qtd_compras_12m'),
    custo_medio_12m: optN(o, 'custo_medio_12m'), custo_minimo_12m: optN(o, 'custo_minimo_12m'), custo_maximo_12m: optN(o, 'custo_maximo_12m'),
    ultimo_pedido: ped && typeof ped === 'object' ? (() => { const p = ped as Obj; return {
      order_number: parseNum(p, 'order_number'), emission_date: parseStr(p, 'emission_date').slice(0, 10), supplier_name: parseStr(p, 'supplier_name'),
      unit_price: parseNum(p, 'unit_price'), purchase_uom: parseStr(p, 'purchase_uom') || undefined }; })() : undefined,
  };
}

// ── Notas que atenderam o pedido ──

export interface NotaDaLinha {
  line_code: number; fiscal_entry_id: number; numero_nf: number; serie: string; data_emissao: string; data_entrada: string;
  status: string; quantidade: number; unidade?: string; valor_unitario: number; valor_total: number; supplier_name?: string;
}
export async function listOrderInvoices(code: number): Promise<NotaDaLinha[]> {
  const { data } = await httpClient.get(`${BASE}/${code}/notas`);
  return unwrapArray(data).map(unwrapObject).map((o) => ({
    line_code: parseNum(o, 'line_code'), fiscal_entry_id: parseNum(o, 'fiscal_entry_id'), numero_nf: parseNum(o, 'numero_nf'),
    serie: parseStr(o, 'serie'), data_emissao: parseStr(o, 'data_emissao').slice(0, 10), data_entrada: parseStr(o, 'data_entrada').slice(0, 10),
    status: parseStr(o, 'status'), quantidade: parseNum(o, 'quantidade'), unidade: parseStr(o, 'unidade') || undefined,
    valor_unitario: parseNum(o, 'valor_unitario'), valor_total: parseNum(o, 'valor_total'), supplier_name: parseStr(o, 'supplier_name') || undefined,
  }));
}

// ── Previsão de pagamentos ──

export interface ParcelaPrevista {
  purchase_order_code: number; order_number: number; supplier_code?: number; numero: number;
  vencimento: string; valor: number; estimada: boolean; condicao: string; descricao?: string; entrega_prevista: string;
}
export interface PrevisaoPagamentos { parcelas: ParcelaPrevista[]; total: number; avisos: string[] }
function parsePrevisao(raw: unknown): PrevisaoPagamentos {
  const o = unwrapObject(raw);
  return {
    total: parseNum(o, 'total'),
    avisos: unwrapArray(o['avisos']).map((a) => String(a)),
    parcelas: unwrapArray(o['parcelas']).map(unwrapObject).map((p) => ({
      purchase_order_code: parseNum(p, 'purchase_order_code'), order_number: parseNum(p, 'order_number'),
      supplier_code: optN(p, 'supplier_code'), numero: parseNum(p, 'numero'), vencimento: parseStr(p, 'vencimento').slice(0, 10),
      valor: parseNum(p, 'valor'), estimada: p['estimada'] === true, condicao: parseStr(p, 'condicao'),
      descricao: parseStr(p, 'descricao') || undefined, entrega_prevista: parseStr(p, 'entrega_prevista').slice(0, 10),
    })),
  };
}
export async function getOrderPaymentForecast(code: number): Promise<PrevisaoPagamentos> {
  const { data } = await httpClient.get(`${BASE}/${code}/previsao-pagamentos`);
  return parsePrevisao(data);
}
/** Pagamentos previstos dos pedidos aprovados (ainda não faturados) com vencimento no período. */
export async function getPaymentForecast(de: string, ate: string): Promise<PrevisaoPagamentos> {
  const { data } = await httpClient.get(`${BASE}/previsao-pagamentos`, { params: { de, ate } });
  return parsePrevisao(data);
}

/**
 * Resume o resultado de "gerar pedidos" (requisição ou cotação). Os pedidos
 * gerados passam pela alçada: podem sair aprovados, aguardando autorização ou
 * em rascunho (linha sem almoxarifado) — e a mensagem precisa dizer qual.
 */
export function resumoPedidosGerados(r: Obj): { type: 'success' | 'info'; message: string } {
  const pedidos = unwrapArray(r['orders'] ?? r['Orders']).map(unwrapObject);
  const avisos = unwrapArray(r['skipped'] ?? r['Skipped']).map((a) => String(a));
  const numero = (o: Obj) => parseNum(o, 'order_number', 'OrderNumber') || parseNum(o, 'code', 'Code');
  const por = (s: string) => pedidos.filter((o) => parseStr(o, 'status', 'Status') === s).map(numero);
  const aprovados = por('APPROVED');
  const alcada = por('REQUESTED');
  const rascunho = por('DRAFT');
  const partes: string[] = [];
  if (pedidos.length === 0) partes.push('Nenhum pedido gerado.');
  if (aprovados.length) partes.push(`Aprovado(s): nº ${aprovados.join(', ')}.`);
  if (alcada.length) partes.push(`Aguardando autorização de alçada: nº ${alcada.join(', ')}.`);
  if (rascunho.length) partes.push(`Em rascunho (complete e aprove em VPDC0200): nº ${rascunho.join(', ')}.`);
  if (avisos.length) partes.push(`Atenção: ${avisos.join(' · ')}`);
  return { type: alcada.length || rascunho.length || avisos.length || pedidos.length === 0 ? 'info' : 'success', message: partes.join(' ') };
}
