import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/sales-quotation';

/**
 * Orçamentos — `/api/sales-quotation` (Vendas e Expedição §3).
 *
 * Etapa comercial ANTERIOR ao pedido: guarda a intenção de venda (validade,
 * probabilidade, condições, frete, retenções) e só vira pedido quando aprovado.
 * A conversão (`convert-to-order`) copia o SALDO ABERTO dos itens ativos e
 * grava o vínculo em `converted_sales_order_code`.
 *
 * Ciclo de vida (status): `R` rascunho · `P`/`A`/`OA`/`F`/`OF` estágios de
 * análise/confirmação · `CANCELLED` · `ATTENDED` · `EXPIRED`.
 * Status do item: `OPEN`, `PARTIAL`, `DELIVERED`, `CANCELLED`.
 *
 * Regras de conversão bloqueadas pelo backend: orçamento cancelado, expirado,
 * atendido, do tipo `CONSULTA`, bloqueado comercialmente ou já convertido.
 * `is_nfce` é atributo comercial/fiscal copiado para o pedido — não emite NFC-e.
 */
export interface SalesQuotationItemDTO {
  code?: number;
  sales_quotation_code?: number;
  sequence?: number;
  item_code: number;
  mask?: string;
  sales_uom?: string;
  requested_qty: number;
  attended_qty?: number;
  cancelled_qty?: number;
  balance?: number;
  unit_price: number;
  discount_pct?: number;
  ipi_pct?: number;
  icms_pct?: number;
  delivery_date?: string;
  total_gross?: number;
  total_net?: number;
  status?: string;
}

export interface SalesQuotationDTO {
  code?: number;
  quotation_number?: number;
  enterprise_code: number;
  status?: string;
  quotation_type?: string;
  customer_code: number;
  representative_code?: number;
  sales_division_code?: number;
  sales_table_code?: number;
  payment_term_code?: number;
  currency_code?: string;
  purchase_order_number?: string;
  emission_date?: string;
  digit_date?: string;
  valid_until?: string;
  commission_pct?: number;
  probability_pct?: number;
  release_status?: string;
  is_nfce?: boolean;
  // transporte
  carrier_code?: number;
  freight_type?: string;
  freight_check?: boolean;
  freight_value?: number;
  redispatch?: string;
  insurance_value?: number;
  // valores comerciais
  discount_value?: number;
  surcharge_value?: number;
  retention_value?: number;
  total_gross?: number;
  total_net?: number;
  weighted_value?: number;
  // rastreabilidade
  converted_sales_order_code?: number;
  observations?: string;
  items?: SalesQuotationItemDTO[];
}

export interface SalesQuotationReportDTO {
  total_quotations?: number;
  total_gross?: number;
  total_net?: number;
  open_count?: number;
  attended_count?: number;
  cancelled_count?: number;
  expired_count?: number;
  retention_value?: number;
  weighted_value?: number;
}

export interface SalesQuotationListFilters {
  customer_code?: number;
  status?: string;
  from?: string;
  to?: string;
  purchase_order_number?: string;
  freight_type?: string;
}

function parseItem(raw: unknown): SalesQuotationItemDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    sales_quotation_code: parseNum(o, 'sales_quotation_code', 'SalesQuotationCode'),
    sequence: parseNum(o, 'sequence', 'Sequence'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask'),
    sales_uom: parseStr(o, 'sales_uom', 'SalesUom'),
    requested_qty: parseNum(o, 'requested_qty', 'RequestedQty'),
    attended_qty: parseNum(o, 'attended_qty', 'AttendedQty'),
    cancelled_qty: parseNum(o, 'cancelled_qty', 'CancelledQty'),
    balance: parseNum(o, 'balance', 'Balance'),
    unit_price: parseNum(o, 'unit_price', 'UnitPrice'),
    discount_pct: parseNum(o, 'discount_pct', 'DiscountPct'),
    ipi_pct: parseNum(o, 'ipi_pct', 'IpiPct'),
    icms_pct: parseNum(o, 'icms_pct', 'IcmsPct'),
    delivery_date: parseStr(o, 'delivery_date', 'DeliveryDate') || undefined,
    total_gross: parseNum(o, 'total_gross', 'TotalGross'),
    total_net: parseNum(o, 'total_net', 'TotalNet'),
    status: parseStr(o, 'status', 'Status'),
  };
}

function parseQuotation(raw: unknown): SalesQuotationDTO {
  const o = unwrapObject(raw);
  const rawItems = o['items'] ?? o['Items'];
  return {
    code: parseNum(o, 'code', 'Code'),
    quotation_number: parseNum(o, 'quotation_number', 'QuotationNumber'),
    enterprise_code: parseNum(o, 'enterprise_code', 'EnterpriseCode'),
    status: parseStr(o, 'status', 'Status'),
    quotation_type: parseStr(o, 'quotation_type', 'QuotationType'),
    customer_code: parseNum(o, 'customer_code', 'CustomerCode'),
    representative_code: parseNum(o, 'representative_code', 'RepresentativeCode'),
    sales_division_code: parseNum(o, 'sales_division_code', 'SalesDivisionCode'),
    sales_table_code: parseNum(o, 'sales_table_code', 'SalesTableCode'),
    payment_term_code: parseNum(o, 'payment_term_code', 'PaymentTermCode'),
    currency_code: parseStr(o, 'currency_code', 'CurrencyCode'),
    purchase_order_number: parseStr(o, 'purchase_order_number', 'PurchaseOrderNumber'),
    emission_date: parseStr(o, 'emission_date', 'EmissionDate') || undefined,
    digit_date: parseStr(o, 'digit_date', 'DigitDate') || undefined,
    valid_until: parseStr(o, 'valid_until', 'ValidUntil') || undefined,
    commission_pct: parseNum(o, 'commission_pct', 'CommissionPct'),
    probability_pct: parseNum(o, 'probability_pct', 'ProbabilityPct'),
    release_status: parseStr(o, 'release_status', 'ReleaseStatus'),
    is_nfce: parseBool(o, 'is_nfce', 'IsNfce'),
    carrier_code: parseNum(o, 'carrier_code', 'CarrierCode'),
    freight_type: parseStr(o, 'freight_type', 'FreightType'),
    freight_check: parseBool(o, 'freight_check', 'FreightCheck'),
    freight_value: parseNum(o, 'freight_value', 'FreightValue'),
    redispatch: parseStr(o, 'redispatch', 'Redispatch'),
    insurance_value: parseNum(o, 'insurance_value', 'InsuranceValue'),
    discount_value: parseNum(o, 'discount_value', 'DiscountValue'),
    surcharge_value: parseNum(o, 'surcharge_value', 'SurchargeValue'),
    retention_value: parseNum(o, 'retention_value', 'RetentionValue'),
    total_gross: parseNum(o, 'total_gross', 'TotalGross'),
    total_net: parseNum(o, 'total_net', 'TotalNet'),
    weighted_value: parseNum(o, 'weighted_value', 'WeightedValue'),
    converted_sales_order_code: parseNum(o, 'converted_sales_order_code', 'ConvertedSalesOrderCode'),
    observations: parseStr(o, 'observations', 'Observations'),
    items: Array.isArray(rawItems) ? rawItems.map(parseItem) : undefined,
  };
}

function parseReport(raw: unknown): SalesQuotationReportDTO {
  const o = unwrapObject(raw);
  return {
    total_quotations: parseNum(o, 'total_quotations', 'TotalQuotations'),
    total_gross: parseNum(o, 'total_gross', 'TotalGross'),
    total_net: parseNum(o, 'total_net', 'TotalNet'),
    open_count: parseNum(o, 'open_count', 'OpenCount'),
    attended_count: parseNum(o, 'attended_count', 'AttendedCount'),
    cancelled_count: parseNum(o, 'cancelled_count', 'CancelledCount'),
    expired_count: parseNum(o, 'expired_count', 'ExpiredCount'),
    retention_value: parseNum(o, 'retention_value', 'RetentionValue'),
    weighted_value: parseNum(o, 'weighted_value', 'WeightedValue'),
  };
}

// ─── Capa ────────────────────────────────────────────────────────────────────

export async function listSalesQuotations(filters: SalesQuotationListFilters = {}): Promise<SalesQuotationDTO[]> {
  const params: Record<string, string> = {};
  if (filters.customer_code) params.customer_code = String(filters.customer_code);
  if (filters.status) params.status = filters.status;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.purchase_order_number) params.purchase_order_number = filters.purchase_order_number;
  if (filters.freight_type) params.freight_type = filters.freight_type;
  const { data } = await httpClient.get(`${BASE}/list`, { params });
  return unwrapArray(data).map(parseQuotation);
}
export async function getSalesQuotation(code: number): Promise<SalesQuotationDTO> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parseQuotation(data);
}
export async function getSalesQuotationReport(filters: SalesQuotationListFilters = {}): Promise<SalesQuotationReportDTO> {
  const params: Record<string, string> = {};
  if (filters.customer_code) params.customer_code = String(filters.customer_code);
  if (filters.status) params.status = filters.status;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  const { data } = await httpClient.get(`${BASE}/report`, { params });
  return parseReport(data);
}
export async function createSalesQuotation(dto: SalesQuotationDTO): Promise<SalesQuotationDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseQuotation(data);
}
export async function updateSalesQuotation(code: number, dto: SalesQuotationDTO): Promise<SalesQuotationDTO> {
  const { data } = await httpClient.put(`${BASE}/${code}`, dto);
  return parseQuotation(data);
}
export async function cancelSalesQuotation(code: number, reason: string, complement?: string): Promise<void> {
  await httpClient.delete(`${BASE}/${code}/cancel`, { data: { reason, complement } });
}
export async function uncancelSalesQuotation(code: number, reason?: string): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/uncancel`, reason ? { reason } : {});
  return unwrapObject(data);
}
export async function attendSalesQuotation(code: number, reason?: string, date?: string): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/attend`, { reason, date });
  return unwrapObject(data);
}
export async function changeSalesQuotationStatus(code: number, status: string): Promise<Obj> {
  const { data } = await httpClient.patch(`${BASE}/${code}/status`, { status });
  return unwrapObject(data);
}
export async function convertSalesQuotationToOrder(code: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/convert-to-order`, {});
  return unwrapObject(data);
}

// ─── Itens ───────────────────────────────────────────────────────────────────

export async function listSalesQuotationItems(code: number): Promise<SalesQuotationItemDTO[]> {
  const { data } = await httpClient.get(`${BASE}/items/${code}`);
  return unwrapArray(data).map(parseItem);
}
export async function createSalesQuotationItem(item: SalesQuotationItemDTO): Promise<SalesQuotationItemDTO> {
  const { data } = await httpClient.post(`${BASE}/items/create`, item);
  return parseItem(data);
}
export async function updateSalesQuotationItem(itemCode: number, item: SalesQuotationItemDTO): Promise<SalesQuotationItemDTO> {
  const { data } = await httpClient.put(`${BASE}/items/${itemCode}`, item);
  return parseItem(data);
}
export async function cancelSalesQuotationItem(itemCode: number): Promise<void> {
  await httpClient.delete(`${BASE}/items/${itemCode}/cancel`);
}
