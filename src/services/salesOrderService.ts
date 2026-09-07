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
 * Datas (`emission_date`/`delivery_date`) aceitam `YYYY-MM-DD` ou ISO; `emission_date`
 * omitido assume hoje. `enterprise_code` é obrigatório no create (422). A coluna
 * `status` comporta `CANCELLED` (migration 000170) — cancelamento operante.
 */
export interface SalesOrderItemDTO {
  code?: number;
  sales_order_code?: number;
  sequence?: number;
  item_code: string;
  mask?: string;
  sales_uom?: string;
  warehouse_code?: number;
  price_table_code?: number;
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

  /** Tipo de nota da linha, quando difere do padrão do pedido. */
  nf_type?: string;
  /** Entrega combinada com o cliente e o cupom de entrega, no varejo. */
  customer_delivery?: string;
  coupon_delivery?: string;
  paid_at_cashier?: boolean;
  lot?: string;
  pis_pct?: number;
  cofins_pct?: number;
  st_pct?: number;
  /** Peso por unidade — alimenta o romaneio sem depender do cadastro do item. */
  unit_weight_net?: number;
  unit_weight_gross?: number;
  notes?: string;
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
  price_table_code?: number;
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

  /**
   * Dados que a nota fiscal e a expedição exigem e que o backend já aceitava.
   * Sem eles, o pedido chegava ao faturamento incompleto: a NF-e precisa do
   * indicador de presença e do tipo de nota, e o romaneio precisa do peso e do
   * volume.
   */
  presence_indicator?: string;
  sales_channel?: string;
  default_nf_type?: string;
  nf_type_description?: string;
  bearer_code?: number;
  collection_establishment_code?: number;
  representative_order_number?: number;
  carrier_code?: number;
  freight_type?: string;
  volume_quantity?: number;
  volume_type?: string;
  net_weight?: number;
  gross_weight?: number;
  project_code?: string;
  project_name?: string;

  items?: SalesOrderItemDTO[];
}

/**
 * Indicador de presença do comprador — campo obrigatório da NF-e (tag indPres).
 * Errar isso é rejeição na SEFAZ.
 */
export const PRESENCE_INDICATORS = [
  { value: '0', label: 'Não se aplica' },
  { value: '1', label: 'Presencial' },
  { value: '2', label: 'Internet' },
  { value: '3', label: 'Teleatendimento' },
  { value: '4', label: 'NFC-e em entrega a domicílio' },
  { value: '5', label: 'Presencial fora do estabelecimento' },
  { value: '9', label: 'Outros não presenciais' },
] as const;

function parseItem(raw: unknown): SalesOrderItemDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    sales_order_code: parseNum(o, 'sales_order_code', 'SalesOrderCode'),
    sequence: parseNum(o, 'sequence', 'Sequence'),
    item_code: parseStr(o, 'item_code', 'ItemCode'),
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
    nf_type: parseStr(o, 'nf_type', 'NFType') || undefined,
    customer_delivery: parseStr(o, 'customer_delivery', 'CustomerDelivery') || undefined,
    coupon_delivery: parseStr(o, 'coupon_delivery', 'CouponDelivery') || undefined,
    paid_at_cashier: parseBool(o, 'paid_at_cashier', 'PaidAtCashier'),
    lot: parseStr(o, 'lot', 'Lot') || undefined,
    pis_pct: parseNum(o, 'pis_pct', 'PISPct'),
    cofins_pct: parseNum(o, 'cofins_pct', 'COFINSPct'),
    st_pct: parseNum(o, 'st_pct', 'STPct'),
    unit_weight_net: parseNum(o, 'unit_weight_net', 'UnitWeightNet'),
    unit_weight_gross: parseNum(o, 'unit_weight_gross', 'UnitWeightGross'),
    notes: parseStr(o, 'notes', 'Notes') || undefined,
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
    price_table_code: parseNum(o, 'price_table_code', 'PriceTableCode'),
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
    presence_indicator: parseStr(o, 'presence_indicator', 'PresenceIndicator') || undefined,
    sales_channel: parseStr(o, 'sales_channel', 'SalesChannel') || undefined,
    default_nf_type: parseStr(o, 'default_nf_type', 'DefaultNFType') || undefined,
    nf_type_description: parseStr(o, 'nf_type_description', 'NFTypeDescription') || undefined,
    bearer_code: parseNum(o, 'bearer_code', 'BearerCode') || undefined,
    collection_establishment_code: parseNum(o, 'collection_establishment_code', 'CollectionEstablishmentCode') || undefined,
    representative_order_number: parseNum(o, 'representative_order_number', 'RepresentativeOrderNumber') || undefined,
    carrier_code: parseNum(o, 'carrier_code', 'CarrierCode') || undefined,
    freight_type: parseStr(o, 'freight_type', 'FreightType') || undefined,
    volume_quantity: parseNum(o, 'volume_quantity', 'VolumeQuantity'),
    volume_type: parseStr(o, 'volume_type', 'VolumeType') || undefined,
    net_weight: parseNum(o, 'net_weight', 'NetWeight'),
    gross_weight: parseNum(o, 'gross_weight', 'GrossWeight'),
    project_code: parseStr(o, 'project_code', 'ProjectCode') || undefined,
    project_name: parseStr(o, 'project_name', 'ProjectName') || undefined,
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
  const payload = { ...dto, payment_term_code: dto.payment_term_code || undefined };
  const { data } = await httpClient.post(`${BASE}/create`, payload);
  return parseOrder(data);
}
export async function updateSalesOrder(code: number, dto: SalesOrderDTO): Promise<SalesOrderDTO> {
  const { data } = await httpClient.put(`${BASE}/${code}`, dto);
  return parseOrder(data);
}
export async function cancelSalesOrder(code: number, reason: string, complement?: string): Promise<void> {
  await httpClient.delete(`${BASE}/${code}/cancel`, { data: { reason, complement: complement || undefined } });
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
export async function updateSalesOrderItem(itemCode: string, item: SalesOrderItemDTO): Promise<SalesOrderItemDTO> {
  const { data } = await httpClient.put(`${BASE}/items/${itemCode}`, item);
  return parseItem(data);
}
export async function cancelSalesOrderItem(itemCode: number): Promise<void> {
  await httpClient.delete(`${BASE}/items/${itemCode}/cancel`);
}
