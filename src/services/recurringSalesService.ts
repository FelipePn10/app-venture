import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/recurring-sales';

/**
 * Vendas Recorrentes — `/api/recurring-sales` (Vendas §12).
 *
 * Produtos/serviços com cobrança mensal por cliente/estabelecimento. Console de
 * recorrências, datas de reajuste, geração rastreada de pedido, cancelamento,
 * reajuste por movimento, receita recorrente mensal e comissões futuras.
 *
 * Movimentos: SALE, UPGRADE, DOWNGRADE, ADJUSTMENT, RECALCULATION, CANCELLATION.
 * Só SALE e UPGRADE entram por cadastro direto. Vigência: INDEFINITE (exige
 * next_adjustment_date) ou FIXED (exige months_quantity/payments_quantity/payment_value).
 * Escritas exigem `created_by` (uuid) — injetado via currentUserId().
 */
export interface RecurringSaleRepresentativeDTO {
  representative_code: number;
  is_primary: boolean;
  commission_percent: number;
  commission_base: 'ORIGINAL' | 'ADJUSTED';
  is_lifetime: boolean;
  commission_installments?: number;
}

export interface RecurringSaleDTO {
  code?: number;
  enterprise_code: number;
  customer_code: number;
  establishment_code?: number;
  item_code: string;
  item_mask?: string;
  sales_plan_code?: number;
  movement_type: 'SALE' | 'UPGRADE' | 'DOWNGRADE' | 'ADJUSTMENT' | 'RECALCULATION' | 'CANCELLATION';
  term_type: 'INDEFINITE' | 'FIXED';
  sale_date?: string;
  next_adjustment_date?: string;
  months_quantity?: number;
  payments_quantity?: number;
  grace_months?: number;
  payment_value?: number;
  quantity: number;
  unit_value: number;
  order_code?: number;
  source_recurring_sale_code?: number;
  lifecycle_status?: string;
  effective_from?: string;
  effective_until?: string;
  cancellation_effective_date?: string;
  future_orders_policy?: string;
  frequency?: string;
  price_table_code?: number;
  currency_code?: string;
  adjustment_index?: string;
  adjustment_period_months?: number;
  adjustment_floor_pct?: number;
  adjustment_cap_pct?: number;
  billing_policy?: Obj;
  delivery_policy?: Obj;
  tax_policy?: Obj;
  cost_center_code?: number;
  renewal_policy?: string;
  missing_preconditions?: string[];
  can_generate_order?: boolean;
  can_cancel?: boolean;
  can_adjust?: boolean;
  allowed_actions?: string[];
  is_active?: boolean;
  representatives?: RecurringSaleRepresentativeDTO[];
}

export interface RecurringListFilters {
  customer_code?: number;
  movement_type?: string;
  active?: boolean;
}

function parseRep(raw: unknown): RecurringSaleRepresentativeDTO {
  const o = unwrapObject(raw);
  return {
    representative_code: parseNum(o, 'representative_code', 'RepresentativeCode'),
    is_primary: parseBool(o, 'is_primary', 'IsPrimary'),
    commission_percent: parseNum(o, 'commission_percent', 'CommissionPercent'),
    commission_base: (parseStr(o, 'commission_base', 'CommissionBase') || 'ORIGINAL') as RecurringSaleRepresentativeDTO['commission_base'],
    is_lifetime: parseBool(o, 'is_lifetime', 'IsLifetime'),
    commission_installments: parseNum(o, 'commission_installments', 'CommissionInstallments'),
  };
}

function parseSale(raw: unknown): RecurringSaleDTO {
  const o = unwrapObject(raw);
  const reps = o['representatives'] ?? o['Representatives'];
  return {
    code: parseNum(o, 'code', 'Code'),
    enterprise_code: parseNum(o, 'enterprise_code', 'EnterpriseCode'),
    customer_code: parseNum(o, 'customer_code', 'CustomerCode'),
    establishment_code: parseNum(o, 'establishment_code', 'EstablishmentCode'),
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    item_mask: parseStr(o, 'item_mask', 'ItemMask'),
    sales_plan_code: parseNum(o, 'sales_plan_code', 'SalesPlanCode'),
    movement_type: (parseStr(o, 'movement_type', 'MovementType') || 'SALE') as RecurringSaleDTO['movement_type'],
    term_type: (parseStr(o, 'term_type', 'TermType') || 'INDEFINITE') as RecurringSaleDTO['term_type'],
    sale_date: parseStr(o, 'sale_date', 'SaleDate') || undefined,
    next_adjustment_date: parseStr(o, 'next_adjustment_date', 'NextAdjustmentDate') || undefined,
    months_quantity: parseNum(o, 'months_quantity', 'MonthsQuantity'),
    payments_quantity: parseNum(o, 'payments_quantity', 'PaymentsQuantity'),
    grace_months: parseNum(o, 'grace_months', 'GraceMonths'),
    payment_value: parseNum(o, 'payment_value', 'PaymentValue'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    unit_value: parseNum(o, 'unit_value', 'UnitValue'),
    order_code: parseNum(o, 'generated_order_code', 'GeneratedOrderCode', 'order_code', 'OrderCode'),
    source_recurring_sale_code: parseNum(o, 'source_recurring_sale_code', 'SourceRecurringSaleCode') || undefined,
    lifecycle_status: parseStr(o, 'lifecycle_status', 'LifecycleStatus') || undefined,
    effective_from: parseStr(o, 'effective_from', 'EffectiveFrom') || undefined,
    effective_until: parseStr(o, 'effective_until', 'EffectiveUntil') || undefined,
    cancellation_effective_date: parseStr(o, 'cancellation_effective_date', 'CancellationEffectiveDate') || undefined,
    future_orders_policy: parseStr(o, 'future_orders_policy', 'FutureOrdersPolicy') || undefined,
    frequency: parseStr(o, 'frequency', 'Frequency') || undefined,
    price_table_code: parseNum(o, 'price_table_code', 'PriceTableCode') || undefined,
    currency_code: parseStr(o, 'currency_code', 'CurrencyCode') || undefined,
    adjustment_index: parseStr(o, 'adjustment_index', 'AdjustmentIndex') || undefined,
    adjustment_period_months: parseNum(o, 'adjustment_period_months', 'AdjustmentPeriodMonths') || undefined,
    adjustment_floor_pct: parseNum(o, 'adjustment_floor_pct', 'AdjustmentFloorPct'),
    adjustment_cap_pct: parseNum(o, 'adjustment_cap_pct', 'AdjustmentCapPct'),
    billing_policy: unwrapObject(o.billing_policy ?? o.BillingPolicy),
    delivery_policy: unwrapObject(o.delivery_policy ?? o.DeliveryPolicy),
    tax_policy: unwrapObject(o.tax_policy ?? o.TaxPolicy),
    cost_center_code: parseNum(o, 'cost_center_code', 'CostCenterCode') || undefined,
    renewal_policy: parseStr(o, 'renewal_policy', 'RenewalPolicy') || undefined,
    is_active: parseBool(o, 'is_active', 'IsActive'),
    missing_preconditions: unwrapArray(o.missing_preconditions ?? o.MissingPreconditions).map(String),
    can_generate_order: parseBool(o, 'can_generate_order', 'CanGenerateOrder'),
    can_cancel: parseBool(o, 'can_cancel', 'CanCancel'),
    can_adjust: parseBool(o, 'can_adjust', 'CanAdjust'),
    allowed_actions: unwrapArray(o.allowed_actions ?? o.AllowedActions).map(String),
    representatives: Array.isArray(reps) ? reps.map(parseRep) : undefined,
  };
}

// ─── Console / cadastro ───────────────────────────────────────────────────────
export async function listRecurringSales(filters: RecurringListFilters = {}): Promise<RecurringSaleDTO[]> {
  const params: Record<string, string> = {};
  if (filters.customer_code) params.customer_code = String(filters.customer_code);
  if (filters.movement_type) params.movement_type = filters.movement_type;
  if (filters.active !== undefined) params.active = String(filters.active);
  const { data } = await httpClient.get(`${BASE}/list`, { params });
  return unwrapArray(data).map(parseSale);
}
export async function getRecurringSale(code: number): Promise<RecurringSaleDTO> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parseSale(data);
}
export async function createRecurringSale(dto: RecurringSaleDTO): Promise<RecurringSaleDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseSale(data);
}
export async function updateRecurringSale(code: number, dto: RecurringSaleDTO): Promise<RecurringSaleDTO> {
  const { data } = await httpClient.put(`${BASE}/${code}`, dto);
  return parseSale(data);
}
export async function addRecurringRepresentative(code: number, payload: RecurringSaleRepresentativeDTO): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/representatives`, { recurring_sale_code: code, ...payload });
  return unwrapObject(data);
}
export async function generateRecurringOrder(code: number, payload: Obj = {}): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/generate-order`, payload, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
  return unwrapObject(data);
}
export async function removeGeneratedOrder(code: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}/generated-order`);
}
export async function cancelRecurringSale(code: number, payload: { reason: string; effective_date: string; future_orders_policy: string; correlation_id?: string }): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/cancel`, payload);
  return unwrapObject(data);
}

// ─── Parâmetros ───────────────────────────────────────────────────────────────
export async function getRecurringParameters(enterpriseCode: number): Promise<Obj> {
  const { data } = await httpClient.get(`${BASE}/parameters/${enterpriseCode}`);
  return unwrapObject(data);
}
export async function upsertRecurringParameters(payload: Obj): Promise<Obj> {
  const { data } = await httpClient.put(`${BASE}/parameters`, payload);
  return unwrapObject(data);
}

// ─── Reajustes ────────────────────────────────────────────────────────────────
export async function listAdjustmentDates(filters: { customer_code?: number } = {}): Promise<Obj[]> {
  const params: Record<string, string> = {};
  if (filters.customer_code) params.customer_code = String(filters.customer_code);
  const { data } = await httpClient.get(`${BASE}/adjustment-dates`, { params });
  return unwrapArray(data).map(unwrapObject);
}
export async function createAdjustmentDate(payload: Obj): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/adjustment-dates`, payload);
  return unwrapObject(data);
}
export async function calculateAdjustment(payload: Obj): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/adjustments/calculate`, payload, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
  return unwrapObject(data);
}

// ─── Consultas gerenciais ─────────────────────────────────────────────────────
export async function getMonthlyRevenue(filters: { from: string; to: string; customer_code?: number; item_code?: string; adjustment_percent?: number }): Promise<Obj[]> {
  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.customer_code) params.customer_code = String(filters.customer_code);
  if (filters.item_code) params.item_code = String(filters.item_code);
  if (filters.adjustment_percent) params.adjustment_percent = String(filters.adjustment_percent);
  const { data } = await httpClient.get(`${BASE}/monthly-revenue`, { params });
  return unwrapArray(data).map(unwrapObject);
}
export async function getFutureCommissions(filters: { from: string; to: string; representative_code?: number; adjustment_percent?: number }): Promise<Obj[]> {
  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.representative_code) params.representative_code = String(filters.representative_code);
  if (filters.adjustment_percent) params.adjustment_percent = String(filters.adjustment_percent);
  const { data } = await httpClient.get(`${BASE}/future-commissions`, { params });
  return unwrapArray(data).map(unwrapObject);
}
