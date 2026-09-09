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
export async function approveSuggestion(code: number, body: { enterprise_code: number; supplier_code: number; unit_price: number; notes?: string; created_by: string }): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/suggestions/${code}/approve`, body);
  return unwrapObject(data);
}
export async function rejectSuggestion(code: number): Promise<void> {
  await httpClient.post(`${BASE}/suggestions/${code}/reject`, {});
}
