import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/sales-order';

/**
 * Pedido de Venda — `/api/sales-order` (Vendas e Expedição §1).
 *
 * Status da capa: `R` (rascunho) → `P` (pedido/confirmado) → `F` (faturado);
 * `CANCELLED`. Estado **bloqueado** (`is_blocked`) é ortogonal (crédito/manual).
 *
 * Automações do backend disparadas ao confirmar (`status → P`):
 *  - checagem de limite de crédito → estoura/cliente bloqueado ⇒ pedido bloqueado;
 *  - reserva de estoque (ATP) por linha;
 *  - geração de demanda independente idempotente por item.
 * A autorização da NF-e de saída posta `OUT`, consome reservas e marca o pedido `F`.
 *
 * ⚠️ Quirks do backend confirmados na demo (localhost:5072):
 *  - `POST /create` e `PUT /{code}` **ignoram** `emission_date`/`delivery_date`
 *    (voltam `0001-01-01`); idem `delivery_date` no item create. Mantemos os campos
 *    no DTO porque a leitura os traz e a correção é no backend.
 *  - `create` não valida obrigatórios (corpo vazio cria rascunho com enterprise 0).
 */
export interface SalesOrderItemDTO {
  code?: number;
  sales_order_code?: number;
  sequence?: number;
  item_code: number;
  mask?: string;
  sales_uom?: string;
  warehouse_code?: number;
  requested_qty: number;
  unit_price: number;
  attended_qty?: number;
  cancelled_qty?: number;
  balance?: number;
  delivery_date?: string;
  delivery_date_firm?: boolean;
  discount_pct?: number;
  ipi_pct?: number;
  icms_pct?: number;
  total_gross?: number;
  total_net?: number;
  status?: string;
}

export interface SalesOrderDTO {
  code?: number;
  order_number?: number;
  enterprise_code: number;
  status?: string;
  origin?: string;
  emission_date?: string;
  delivery_date?: string;
  delivery_date_firm?: boolean;
  digit_date?: string;
  customer_code: number;
  currency_code?: string;
  payment_term_code?: number;
  commission_pct?: number;
  additional_days?: number;
  total_gross?: number;
  total_net?: number;
  total_with_ipi_with_st?: number;
  freight_value?: number;
  insurance_value?: number;
  discount_value?: number;
  surcharge_value?: number;
  is_blocked?: boolean;
  is_firm?: boolean;
  is_active?: boolean;
  is_nfce?: boolean;
  items?: SalesOrderItemDTO[];
}

function parseItem(raw: unknown): SalesOrderItemDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    sales_order_code: parseNum(o, 'sales_order_code', 'SalesOrderCode'),
    sequence: parseNum(o, 'sequence', 'Sequence'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask'),
    sales_uom: parseStr(o, 'sales_uom', 'SalesUom'),
    warehouse_code: parseNum(o, 'warehouse_code', 'WarehouseCode'),
    requested_qty: parseNum(o, 'requested_qty', 'RequestedQty'),
    unit_price: parseNum(o, 'unit_price', 'UnitPrice'),
    attended_qty: parseNum(o, 'attended_qty', 'AttendedQty'),
    cancelled_qty: parseNum(o, 'cancelled_qty', 'CancelledQty'),
    balance: parseNum(o, 'balance', 'Balance'),
    delivery_date: parseStr(o, 'delivery_date', 'DeliveryDate') || undefined,
    delivery_date_firm: parseBool(o, 'delivery_date_firm', 'DeliveryDateFirm'),
    discount_pct: parseNum(o, 'discount_pct', 'DiscountPct'),
    ipi_pct: parseNum(o, 'ipi_pct', 'IpiPct'),
    icms_pct: parseNum(o, 'icms_pct', 'IcmsPct'),
    total_gross: parseNum(o, 'total_gross', 'TotalGross'),
    total_net: parseNum(o, 'total_net', 'TotalNet'),
    status: parseStr(o, 'status', 'Status'),
  };
}

function parseOrder(raw: unknown): SalesOrderDTO {
  const o = unwrapObject(raw);
  const rawItems = o['items'] ?? o['Items'];
  return {
    code: parseNum(o, 'code', 'Code'),
    order_number: parseNum(o, 'order_number', 'OrderNumber'),
    enterprise_code: parseNum(o, 'enterprise_code', 'EnterpriseCode'),
    status: parseStr(o, 'status', 'Status'),
    origin: parseStr(o, 'origin', 'Origin'),
    emission_date: parseStr(o, 'emission_date', 'EmissionDate') || undefined,
    delivery_date: parseStr(o, 'delivery_date', 'DeliveryDate') || undefined,
    delivery_date_firm: parseBool(o, 'delivery_date_firm', 'DeliveryDateFirm'),
    digit_date: parseStr(o, 'digit_date', 'DigitDate') || undefined,
    customer_code: parseNum(o, 'customer_code', 'CustomerCode'),
    currency_code: parseStr(o, 'currency_code', 'CurrencyCode'),
    payment_term_code: parseNum(o, 'payment_term_code', 'PaymentTermCode'),
    commission_pct: parseNum(o, 'commission_pct', 'CommissionPct'),
    additional_days: parseNum(o, 'additional_days', 'AdditionalDays'),
    total_gross: parseNum(o, 'total_gross', 'TotalGross'),
    total_net: parseNum(o, 'total_net', 'TotalNet'),
    total_with_ipi_with_st: parseNum(o, 'total_with_ipi_with_st', 'TotalWithIpiWithSt'),
    freight_value: parseNum(o, 'freight_value', 'FreightValue'),
    insurance_value: parseNum(o, 'insurance_value', 'InsuranceValue'),
    discount_value: parseNum(o, 'discount_value', 'DiscountValue'),
    surcharge_value: parseNum(o, 'surcharge_value', 'SurchargeValue'),
    is_blocked: parseBool(o, 'is_blocked', 'IsBlocked'),
    is_firm: parseBool(o, 'is_firm', 'IsFirm'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
    is_nfce: parseBool(o, 'is_nfce', 'IsNfce'),
    items: Array.isArray(rawItems) ? rawItems.map(parseItem) : undefined,
  };
}

// ─── Capa ────────────────────────────────────────────────────────────────────

export async function listSalesOrders(): Promise<SalesOrderDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list`);
  return unwrapArray(data).map(parseOrder);
}
export async function getSalesOrder(code: number): Promise<SalesOrderDTO> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parseOrder(data);
}
export async function listSalesOrdersByCustomer(customerCode: number): Promise<SalesOrderDTO[]> {
  const { data } = await httpClient.get(`${BASE}/customer/${customerCode}`);
  return unwrapArray(data).map(parseOrder);
}
export async function listSalesOrdersByStatus(status: string): Promise<SalesOrderDTO[]> {
  const { data } = await httpClient.get(`${BASE}/status/${status}`);
  return unwrapArray(data).map(parseOrder);
}
export async function createSalesOrder(dto: SalesOrderDTO): Promise<SalesOrderDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseOrder(data);
}
export async function updateSalesOrder(code: number, dto: SalesOrderDTO): Promise<SalesOrderDTO> {
  const { data } = await httpClient.put(`${BASE}/${code}`, dto);
  return parseOrder(data);
}
export async function cancelSalesOrder(code: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}/cancel`);
}
export async function blockSalesOrder(code: number, reason?: string): Promise<Obj> {
  const { data } = await httpClient.patch(`${BASE}/${code}/block`, reason ? { reason } : {});
  return unwrapObject(data);
}
export async function unblockSalesOrder(code: number): Promise<Obj> {
  const { data } = await httpClient.patch(`${BASE}/${code}/unblock`, {});
  return unwrapObject(data);
}
export async function changeSalesOrderStatus(code: number, status: string): Promise<Obj> {
  const { data } = await httpClient.patch(`${BASE}/${code}/status`, { status });
  return unwrapObject(data);
}

// ─── Itens ───────────────────────────────────────────────────────────────────

export async function listSalesOrderItems(code: number): Promise<SalesOrderItemDTO[]> {
  const { data } = await httpClient.get(`${BASE}/items/${code}`);
  return unwrapArray(data).map(parseItem);
}
export async function createSalesOrderItem(item: SalesOrderItemDTO): Promise<SalesOrderItemDTO> {
  const { data } = await httpClient.post(`${BASE}/items/create`, item);
  return parseItem(data);
}
export async function updateSalesOrderItem(itemCode: number, item: SalesOrderItemDTO): Promise<SalesOrderItemDTO> {
  const { data } = await httpClient.put(`${BASE}/items/${itemCode}`, item);
  return parseItem(data);
}
export async function cancelSalesOrderItem(itemCode: number): Promise<void> {
  await httpClient.delete(`${BASE}/items/${itemCode}/cancel`);
}
