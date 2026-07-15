import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/purchase-order';

/**
 * Pedido de Compra (§13) + Sugestões de Compra do MRP.
 * Ao criar com `supplier_code` e sem `payment_term_code`, o backend puxa a
 * condição de pagamento dos defaults do fornecedor. Ao adicionar item, resolve
 * preço (Tabela de Preço), UM interna (Conversões) e %IPI (Classificação Fiscal).
 */
export interface PurchaseOrderDTO {
  code?: number;
  order_number?: number;
  enterprise_code?: number;
  supplier_code?: number;
  status?: string;
  origin?: string;
  currency_code?: string;
  payment_term_code?: number;
  freight_type?: string;
  price_table_code?: number;
  total_gross?: number;
  total_net?: number;
  notes?: string;
  created_by?: string;
  items?: PurchaseOrderItemDTO[];
}

export interface PurchaseOrderItemDTO {
  id?: number;
  item_code: number;
  requested_qty: number;
  unit_price: number;
  discount_pct?: number;
  ipi_pct?: number;
  icms_pct?: number;
  internal_qty?: number;
  internal_price?: number;
  total_gross?: number;
  total_net?: number;
}

export interface SuggestionDTO {
  code: number;
  item_code: number;
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
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    requested_qty: parseNum(o, 'requested_qty', 'RequestedQty'),
    unit_price: parseNum(o, 'unit_price', 'UnitPrice'),
    discount_pct: parseNum(o, 'discount_pct', 'DiscountPct'),
    ipi_pct: parseNum(o, 'ipi_pct', 'IpiPct'),
    icms_pct: parseNum(o, 'icms_pct', 'IcmsPct'),
    internal_qty: parseNum(o, 'internal_qty', 'InternalQty') || undefined,
    internal_price: parseNum(o, 'internal_price', 'InternalPrice') || undefined,
    total_gross: parseNum(o, 'total_gross', 'TotalGross'),
    total_net: parseNum(o, 'total_net', 'TotalNet'),
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
    freight_type: parseStr(o, 'freight_type', 'FreightType') || undefined,
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
    item_code: parseNum(o, 'item_code', 'ItemCode'),
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
