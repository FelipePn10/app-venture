import { httpClient, parseStr, parseNum, parseBool, currentUserId, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/sales-quotation';

/**
 * Orçamentos — `/api/sales-quotation` (Vendas e Expedição §3, backend v1.1.0).
 *
 * Etapa comercial ANTERIOR ao pedido: guarda a intenção de venda (validade,
 * probabilidade, condições, frete, retenções) e só vira pedido quando aprovado.
 * A conversão (`convert-to-order`) copia o SALDO ABERTO dos itens ativos e grava
 * o vínculo em `converted_sales_order_code` — desde a v1.1.0 pedido, itens,
 * vínculo e evento são gravados na MESMA transação (tudo ou nada).
 *
 * Ciclo de vida (status): `R` rascunho · `P`/`A`/`OA`/`F`/`OF`/`V`/`OV` estágios
 * de análise/confirmação (`OV` é o padrão de novos orçamentos) · `CANCELLED` ·
 * `ATTENDED` · `EXPIRED`. Status do item: `OPEN`, `PARTIAL`, `DELIVERED`,
 * `CANCELLED`.
 *
 * Regras impostas pelo backend:
 * - cancelamento/descancelamento/cancelamento de item exigem `reason_code` de um
 *   motivo cadastrado; motivos com "exige complemento" recusam complemento vazio
 *   e só motivos com "permite descancelar" liberam o `uncancel`;
 * - condição de pagamento diferente da do cliente exige divisão de vendas com
 *   `allow_free_payment_terms`;
 * - `delivery_with_receipt` força NFC-e e zera o IPI de novos itens;
 * - depois do DAV/Pré-Venda só o relatório DAV fica liberado (flags `can_*`);
 * - `freight_type` é validado contra a lista {@link FREIGHT_TYPES}; tipos FOB /
 *   cortesia / retira / sem frete / terceiros zeram frete e seguro, e tipos CIF
 *   aplicam o frete CIF mínimo dos parâmetros quando "conferir frete" está ligado;
 * - status e liberação NÃO podem ser alterados pelo PUT da capa — use
 *   `changeSalesQuotationStatus` / `changeSalesQuotationRelease`.
 *
 * `is_nfce` é atributo comercial/fiscal copiado para o pedido — não emite NFC-e.
 */

// ─── Domínio ─────────────────────────────────────────────────────────────────

/** Status aceitos pelo backend (`validStatus`). */
export const QUOTATION_STATUS: { value: string; label: string; cls: string }[] = [
  { value: 'R', label: 'Rascunho', cls: 'draft' },
  { value: 'P', label: 'Pedido web/externo', cls: 'info' },
  { value: 'A', label: 'Pedido em análise', cls: 'warn' },
  { value: 'OA', label: 'Orçam. em análise', cls: 'warn' },
  { value: 'F', label: 'Pedido confirmado ERP', cls: 'ok' },
  { value: 'OF', label: 'Orçam. confirmado ERP', cls: 'info' },
  { value: 'V', label: 'Pedido VentureERP', cls: 'ok' },
  { value: 'OV', label: 'Orçam. VentureERP', cls: 'info' },
  { value: 'ATTENDED', label: 'Atendido', cls: 'ok' },
  { value: 'EXPIRED', label: 'Expirado', cls: 'err' },
  { value: 'CANCELLED', label: 'Cancelado', cls: 'err' },
];

/**
 * Transições manuais permitidas pelo `PATCH /{code}/status`. Cancelar, atender e
 * expirar têm endpoints próprios e são recusados aqui pelo backend.
 */
export const QUOTATION_STATUS_TRANSITIONS: Record<string, string[]> = {
  R: ['A', 'OA', 'V', 'OV'],
  A: ['R', 'V', 'OV'],
  OA: ['R', 'V', 'OV'],
  F: ['A', 'OA'],
  OF: ['A', 'OA'],
  V: ['A', 'OA'],
  OV: ['A', 'OA'],
};

/** Tipos de orçamento aceitos pelo backend (`validType`). */
export const QUOTATION_TYPES = ['VENDA', 'NEGOCIACAO', 'CONSULTA', 'API_TERCEIROS', 'FOCCOPORTAL', 'IMPORTADO'];

/** Situação de liberação comercial (`validReleaseStatus`). */
export const RELEASE_STATUS: { value: string; label: string; cls: string }[] = [
  { value: 'RELEASED', label: 'Liberado', cls: 'ok' },
  { value: 'MANUAL_RELEASED', label: 'Liberado manualmente', cls: 'warn' },
  { value: 'BLOCKED', label: 'Bloqueado', cls: 'err' },
];

/** Tipos de frete reconhecidos por `applyQuotationRules` no backend. */
export const FREIGHT_TYPES: { value: string; label: string }[] = [
  { value: 'CIF CONTRAT.', label: 'CIF contratado' },
  { value: 'CIF PROPRIO', label: 'CIF próprio' },
  { value: 'FOB CONTRAT.', label: 'FOB contratado' },
  { value: 'FOB PROPRIO', label: 'FOB próprio' },
  { value: 'DAF', label: 'DAF' },
  { value: 'CONVENIO', label: 'Convênio' },
  { value: 'CORTESIA', label: 'Cortesia' },
  { value: 'RETIRA', label: 'Cliente retira' },
  { value: 'SEM FRETE', label: 'Sem frete' },
  { value: 'TERCEIROS', label: 'Terceiros' },
];
/** Tipos que zeram frete e seguro no backend. */
export const FREIGHT_TYPES_WITHOUT_CHARGE = ['FOB CONTRAT.', 'FOB PROPRIO', 'CORTESIA', 'RETIRA', 'SEM FRETE', 'TERCEIROS'];

/**
 * Tipos de evento do histórico — lista fechada pelo CHECK
 * `sales_quotation_events_type_chk` (migration 000241).
 */
export const EVENT_TYPE_LABEL: Record<string, string> = {
  CANCEL: 'Cancelamento',
  UNCANCEL: 'Descancelamento',
  ATTEND: 'Atendimento',
  CONVERT: 'Conversão em pedido',
  BLOCK: 'Bloqueio comercial',
  UNBLOCK: 'Desbloqueio comercial',
  RELEASE: 'Liberação',
  MANUAL_RELEASE: 'Liberação manual',
};

export const ITEM_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Aberto',
  PARTIAL: 'Parcial',
  DELIVERED: 'Atendido',
  CANCELLED: 'Cancelado',
};

/** Limite de anexo aceito pelo backend (`MaxAttachmentSize`). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface SalesQuotationItemDTO {
  code?: number;
  sales_quotation_code?: number;
  sequence?: number;
  item_code: number;
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
  st_pct?: number;
  total_gross?: number;
  total_net?: number;
  total_net_with_ipi?: number;
  status?: string;
  notes?: string;
  is_active?: boolean;
}

export interface SalesQuotationDTO {
  code?: number;
  quotation_number?: number;
  enterprise_code: number;
  status?: string;
  quotation_type?: string;
  emission_date?: string;
  digit_date?: string;
  valid_until?: string;
  delivery_date?: string;
  delivery_date_firm?: boolean;
  purchase_order_number?: string;
  customer_code?: number;
  billing_address_code?: number;
  shipping_address_code?: number;
  representative_code?: number;
  sales_division_code?: number;
  price_table_code?: number;
  payment_term_code?: number;
  currency_code?: string;
  probability_pct?: number;
  commission_pct?: number;
  is_nfce?: boolean;
  delivery_with_receipt?: boolean;
  street?: string;
  street_number?: string;
  foreign_document?: string;
  // liberação comercial
  release_status?: string;
  commercial_blocked?: boolean;
  commercial_block_reason?: string;
  // transporte
  carrier_code?: number;
  freight_type?: string;
  verify_freight?: boolean;
  freight_value?: number;
  redelivery_freight_value?: number;
  insurance_value?: number;
  // valores comerciais
  discount_value?: number;
  surcharge_value?: number;
  retained_tax_value?: number;
  total_gross?: number;
  total_net?: number;
  // textos
  delivery_authorization?: string;
  notes?: string;
  obs_customer?: string;
  // rastreabilidade
  cancel_reason?: string;
  cancel_complement?: string;
  attended_reason?: string;
  attended_at?: string;
  converted_sales_order_code?: number;
  converted_at?: string;
  dav_generated_at?: string;
  dav_report_key?: string;
  consumer_address?: string;
  is_active?: boolean;
  // permissões de documento (bloqueadas após o DAV)
  can_print_fiscal_receipt?: boolean;
  can_print_sales_order?: boolean;
  can_send_email?: boolean;
  can_print_dav_report?: boolean;
  items?: SalesQuotationItemDTO[];
}

export interface SalesQuotationReportDTO {
  total_quotations?: number;
  total_gross?: number;
  total_net?: number;
  open_count?: number;
  approved_count?: number;
  converted_count?: number;
  cancelled_count?: number;
  expired_count?: number;
  weighted_net?: number;
  retained_tax?: number;
}

export interface SalesQuotationListFilters {
  quotation_number?: number;
  customer_code?: number;
  status?: string;
  sales_division_code?: number;
  quotation_type?: string;
  from?: string;
  to?: string;
  purchase_order_number?: string;
  freight_type?: string;
  /** Máximo 500 no backend; padrão 100. */
  limit?: number;
  offset?: number;
}

/** Parâmetros do orçamento por empresa (`/parameters`). */
export interface SalesQuotationParametersDTO {
  enterprise_code?: number;
  purchase_order_prompt: string;
  delivery_authorization_prompt: string;
  final_consumer_customer_code?: number;
  allow_service_items_nfce?: boolean;
  default_nfce?: boolean;
  minimum_cif_freight?: number;
  add_redelivery_to_freight?: boolean;
}

/**
 * Padrão de comissão: `invoice_pct + payment_pct` deve igualar `commission_pct`.
 * `code = 0` faz o backend gerar o próximo código da empresa.
 */
export interface CommissionPatternDTO {
  id?: number;
  code: number;
  description: string;
  commission_pct: number;
  invoice_pct: number;
  payment_pct: number;
  is_active?: boolean;
}

/** Motivo de cancelamento (indicadores D = permite descancelar, C = exige complemento). */
export interface CancellationReasonDTO {
  id?: number;
  code: number;
  description: string;
  allow_uncancel?: boolean;
  require_complement?: boolean;
  is_active?: boolean;
}

/** Evento do histórico do orçamento (mais recente primeiro). */
export interface QuotationEventDTO {
  id?: number;
  sales_quotation_code?: number;
  sales_quotation_item_code?: number;
  event_type?: string;
  reason?: string;
  complement?: string;
  event_date?: string;
  created_at?: string;
}

export interface QuotationAttachmentDTO {
  id: number;
  sales_quotation_code?: number;
  file_name: string;
  content_type?: string;
  file_size?: number;
  storage_key?: string;
  uploaded_at?: string;
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

const optNum = (o: Obj, ...keys: string[]): number | undefined => {
  const n = parseNum(o, ...keys);
  return n || undefined;
};
const optStr = (o: Obj, ...keys: string[]): string | undefined => parseStr(o, ...keys) || undefined;
/** Corta o RFC3339 devolvido pelo Go para `YYYY-MM-DD` (formato aceito nos requests). */
const optDate = (o: Obj, ...keys: string[]): string | undefined => parseStr(o, ...keys).slice(0, 10) || undefined;

function parseItem(raw: unknown): SalesQuotationItemDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    sales_quotation_code: parseNum(o, 'sales_quotation_code', 'SalesQuotationCode'),
    sequence: parseNum(o, 'sequence', 'Sequence'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask'),
    sales_uom: optStr(o, 'sales_uom', 'SalesUOM', 'SalesUom'),
    warehouse_code: optNum(o, 'warehouse_code', 'WarehouseCode'),
    price_table_code: optNum(o, 'price_table_code', 'PriceTableCode'),
    requested_qty: parseNum(o, 'requested_qty', 'RequestedQty'),
    unit_price: parseNum(o, 'unit_price', 'UnitPrice'),
    attended_qty: parseNum(o, 'attended_qty', 'AttendedQty'),
    cancelled_qty: parseNum(o, 'cancelled_qty', 'CancelledQty'),
    balance: parseNum(o, 'balance', 'Balance'),
    delivery_date: optDate(o, 'delivery_date', 'DeliveryDate'),
    delivery_date_firm: parseBool(o, 'delivery_date_firm', 'DeliveryDateFirm'),
    discount_pct: parseNum(o, 'discount_pct', 'DiscountPct'),
    ipi_pct: parseNum(o, 'ipi_pct', 'IPIPct', 'IpiPct'),
    st_pct: parseNum(o, 'st_pct', 'STPct', 'StPct'),
    total_gross: parseNum(o, 'total_gross', 'TotalGross'),
    total_net: parseNum(o, 'total_net', 'TotalNet'),
    total_net_with_ipi: parseNum(o, 'total_net_with_ipi', 'TotalNetWithIPI'),
    status: parseStr(o, 'status', 'Status'),
    notes: optStr(o, 'notes', 'Notes'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
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
    emission_date: optDate(o, 'emission_date', 'EmissionDate'),
    digit_date: optDate(o, 'digit_date', 'DigitDate'),
    valid_until: optDate(o, 'valid_until', 'ValidUntil'),
    delivery_date: optDate(o, 'delivery_date', 'DeliveryDate'),
    delivery_date_firm: parseBool(o, 'delivery_date_firm', 'DeliveryDateFirm'),
    purchase_order_number: optStr(o, 'purchase_order_number', 'PurchaseOrderNumber'),
    customer_code: optNum(o, 'customer_code', 'CustomerCode'),
    billing_address_code: optNum(o, 'billing_address_code', 'BillingAddressCode'),
    shipping_address_code: optNum(o, 'shipping_address_code', 'ShippingAddressCode'),
    representative_code: optNum(o, 'representative_code', 'RepresentativeCode'),
    sales_division_code: optNum(o, 'sales_division_code', 'SalesDivisionCode'),
    price_table_code: optNum(o, 'price_table_code', 'PriceTableCode'),
    payment_term_code: optNum(o, 'payment_term_code', 'PaymentTermCode'),
    currency_code: parseStr(o, 'currency_code', 'CurrencyCode'),
    probability_pct: parseNum(o, 'probability_pct', 'ProbabilityPct'),
    commission_pct: parseNum(o, 'commission_pct', 'CommissionPct'),
    is_nfce: parseBool(o, 'is_nfce', 'IsNFCe', 'IsNfce'),
    delivery_with_receipt: parseBool(o, 'delivery_with_receipt', 'DeliveryWithReceipt'),
    street: optStr(o, 'street', 'Street'),
    street_number: optStr(o, 'street_number', 'StreetNumber'),
    foreign_document: optStr(o, 'foreign_document', 'ForeignDocument'),
    release_status: parseStr(o, 'release_status', 'ReleaseStatus'),
    commercial_blocked: parseBool(o, 'commercial_blocked', 'CommercialBlocked'),
    commercial_block_reason: optStr(o, 'commercial_block_reason', 'CommercialBlockReason'),
    carrier_code: optNum(o, 'carrier_code', 'CarrierCode'),
    freight_type: optStr(o, 'freight_type', 'FreightType'),
    verify_freight: parseBool(o, 'verify_freight', 'VerifyFreight'),
    freight_value: parseNum(o, 'freight_value', 'FreightValue'),
    redelivery_freight_value: parseNum(o, 'redelivery_freight_value', 'RedeliveryFreightValue'),
    insurance_value: parseNum(o, 'insurance_value', 'InsuranceValue'),
    discount_value: parseNum(o, 'discount_value', 'DiscountValue'),
    surcharge_value: parseNum(o, 'surcharge_value', 'SurchargeValue'),
    retained_tax_value: parseNum(o, 'retained_tax_value', 'RetainedTaxValue'),
    total_gross: parseNum(o, 'total_gross', 'TotalGross'),
    total_net: parseNum(o, 'total_net', 'TotalNet'),
    delivery_authorization: optStr(o, 'delivery_authorization', 'DeliveryAuthorization'),
    notes: optStr(o, 'notes', 'Notes'),
    obs_customer: optStr(o, 'obs_customer', 'ObsCustomer'),
    cancel_reason: optStr(o, 'cancel_reason', 'CancelReason'),
    cancel_complement: optStr(o, 'cancel_complement', 'CancelComplement'),
    attended_reason: optStr(o, 'attended_reason', 'AttendedReason'),
    attended_at: optStr(o, 'attended_at', 'AttendedAt'),
    converted_sales_order_code: optNum(o, 'converted_sales_order_code', 'ConvertedSalesOrderCode'),
    converted_at: optStr(o, 'converted_at', 'ConvertedAt'),
    dav_generated_at: optStr(o, 'dav_generated_at', 'DAVGeneratedAt'),
    dav_report_key: optStr(o, 'dav_report_key', 'DAVReportKey'),
    consumer_address: optStr(o, 'consumer_address', 'ConsumerAddress'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
    can_print_fiscal_receipt: parseBool(o, 'can_print_fiscal_receipt', 'CanPrintFiscalReceipt'),
    can_print_sales_order: parseBool(o, 'can_print_sales_order', 'CanPrintSalesOrder'),
    can_send_email: parseBool(o, 'can_send_email', 'CanSendEmail'),
    can_print_dav_report: parseBool(o, 'can_print_dav_report', 'CanPrintDAVReport'),
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
    approved_count: parseNum(o, 'approved_count', 'ApprovedCount'),
    converted_count: parseNum(o, 'converted_count', 'ConvertedCount'),
    cancelled_count: parseNum(o, 'cancelled_count', 'CancelledCount'),
    expired_count: parseNum(o, 'expired_count', 'ExpiredCount'),
    weighted_net: parseNum(o, 'weighted_net', 'WeightedNet'),
    retained_tax: parseNum(o, 'retained_tax', 'RetainedTax'),
  };
}

function parseParameters(raw: unknown): SalesQuotationParametersDTO {
  const o = unwrapObject(raw);
  return {
    enterprise_code: parseNum(o, 'enterprise_code', 'EnterpriseCode'),
    purchase_order_prompt: parseStr(o, 'purchase_order_prompt', 'PurchaseOrderPrompt'),
    delivery_authorization_prompt: parseStr(o, 'delivery_authorization_prompt', 'DeliveryAuthorizationPrompt'),
    final_consumer_customer_code: optNum(o, 'final_consumer_customer_code', 'FinalConsumerCustomerCode'),
    allow_service_items_nfce: parseBool(o, 'allow_service_items_nfce', 'AllowServiceItemsNFCe'),
    default_nfce: parseBool(o, 'default_nfce', 'DefaultNFCe'),
    minimum_cif_freight: parseNum(o, 'minimum_cif_freight', 'MinimumCIFFreight'),
    add_redelivery_to_freight: parseBool(o, 'add_redelivery_to_freight', 'AddRedeliveryToFreight'),
  };
}

function parseCommissionPattern(raw: unknown): CommissionPatternDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    commission_pct: parseNum(o, 'commission_pct', 'CommissionPct'),
    invoice_pct: parseNum(o, 'invoice_pct', 'InvoicePct'),
    payment_pct: parseNum(o, 'payment_pct', 'PaymentPct'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

function parseCancellationReason(raw: unknown): CancellationReasonDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    allow_uncancel: parseBool(o, 'allow_uncancel', 'AllowUncancel'),
    require_complement: parseBool(o, 'require_complement', 'RequireComplement'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

function parseEvent(raw: unknown): QuotationEventDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    sales_quotation_code: parseNum(o, 'sales_quotation_code', 'SalesQuotationCode'),
    sales_quotation_item_code: optNum(o, 'sales_quotation_item_code', 'SalesQuotationItemCode'),
    event_type: parseStr(o, 'event_type', 'EventType'),
    reason: parseStr(o, 'reason', 'Reason'),
    complement: optStr(o, 'complement', 'Complement'),
    event_date: optStr(o, 'event_date', 'EventDate'),
    created_at: optStr(o, 'created_at', 'CreatedAt'),
  };
}

function parseAttachment(raw: unknown): QuotationAttachmentDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    sales_quotation_code: parseNum(o, 'sales_quotation_code', 'SalesQuotationCode'),
    file_name: parseStr(o, 'file_name', 'FileName'),
    content_type: optStr(o, 'content_type', 'ContentType'),
    file_size: parseNum(o, 'file_size', 'FileSize'),
    storage_key: optStr(o, 'storage_key', 'StorageKey'),
    uploaded_at: optStr(o, 'uploaded_at', 'UploadedAt'),
  };
}

/**
 * Resolve o motivo de cancelamento a partir do texto gravado em `cancel_reason`.
 * O backend grava a **descrição** do motivo e depois exige o **código** original
 * no descancelamento, então essa ponte é obrigatória. Devolve `undefined` quando
 * a descrição não bate com nenhum motivo ativo (motivo desativado) ou quando há
 * mais de um motivo com a mesma descrição — nesses casos a tela pede escolha.
 */
export function findReasonByDescription(reasons: CancellationReasonDTO[], description?: string): CancellationReasonDTO | undefined {
  if (!description) return undefined;
  const target = description.trim().toLowerCase();
  const matches = reasons.filter((r) => r.description.trim().toLowerCase() === target);
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * `sales_quotation_items` tem UNIQUE (orçamento, sequência) e itens cancelados
 * somem da listagem sem liberar a sequência — então a próxima sequência "óbvia"
 * pode colidir com uma linha invisível. Detecta essa colisão para a tela poder
 * tentar o próximo número.
 */
export function isDuplicateSequenceError(e: unknown): boolean {
  const err = e as { response?: { status?: number; data?: unknown } } | undefined;
  if (!err?.response) return false;
  const data = err.response.data;
  const text = typeof data === 'string' ? data : JSON.stringify(data ?? '');
  return /sequence_unique|23505|duplicate key/i.test(text);
}

function filterParams(filters: SalesQuotationListFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.quotation_number) params.quotation_number = String(filters.quotation_number);
  if (filters.customer_code) params.customer_code = String(filters.customer_code);
  if (filters.status) params.status = filters.status;
  if (filters.sales_division_code) params.sales_division_code = String(filters.sales_division_code);
  if (filters.quotation_type) params.quotation_type = filters.quotation_type;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.purchase_order_number) params.purchase_order_number = filters.purchase_order_number;
  if (filters.freight_type) params.freight_type = filters.freight_type;
  if (filters.limit) params.limit = String(filters.limit);
  if (filters.offset) params.offset = String(filters.offset);
  return params;
}

// ─── Capa ────────────────────────────────────────────────────────────────────

export async function listSalesQuotations(filters: SalesQuotationListFilters = {}): Promise<SalesQuotationDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list`, { params: filterParams(filters) });
  return unwrapArray(data).map(parseQuotation);
}
export async function getSalesQuotation(code: number): Promise<SalesQuotationDTO> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parseQuotation(data);
}
export async function getSalesQuotationReport(filters: SalesQuotationListFilters = {}): Promise<SalesQuotationReportDTO> {
  const { data } = await httpClient.get(`${BASE}/report`, { params: filterParams(filters) });
  return parseReport(data);
}
export async function createSalesQuotation(dto: SalesQuotationDTO): Promise<SalesQuotationDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, { ...dto, created_by: currentUserId() });
  return parseQuotation(data);
}
/**
 * Atualiza a capa. O backend recusa mudança de `status`/`release_status` por aqui
 * e sobrescreve TODOS os campos — sempre envie o registro completo.
 */
export async function updateSalesQuotation(code: number, dto: SalesQuotationDTO): Promise<SalesQuotationDTO> {
  const { data } = await httpClient.put(`${BASE}/${code}`, dto);
  return parseQuotation(data);
}

// ─── Situação e histórico ────────────────────────────────────────────────────

/** Cancela exigindo motivo cadastrado; `complement` é obrigatório em motivos "C". */
export async function cancelSalesQuotation(code: number, reasonCode: number, complement?: string): Promise<void> {
  await httpClient.delete(`${BASE}/${code}/cancel`, { data: { reason_code: reasonCode, complement: complement || undefined } });
}
/**
 * Descancela. O backend exige que `reasonCode` seja **o mesmo motivo usado no
 * cancelamento** (`WHERE ... AND cancellation_reason_code=$3`) e que esse motivo
 * tenha "permite descancelar". Como a resposta do orçamento só devolve o texto
 * (`cancel_reason`), a tela resolve o código pela descrição — ver
 * {@link findReasonByDescription}.
 */
export async function uncancelSalesQuotation(code: number, reasonCode: number, complement?: string): Promise<void> {
  await httpClient.post(`${BASE}/${code}/uncancel`, { reason_code: reasonCode, complement: complement || undefined, created_by: currentUserId() });
}
/** Encerra a proposta sem gerar pedido (motivo livre + data do evento). */
export async function attendSalesQuotation(code: number, reason: string, eventDate?: string, complement?: string): Promise<void> {
  await httpClient.post(`${BASE}/${code}/attend`, { reason, complement: complement || undefined, event_date: eventDate, created_by: currentUserId() });
}
export async function changeSalesQuotationStatus(code: number, status: string): Promise<void> {
  await httpClient.patch(`${BASE}/${code}/status`, { status });
}
/** Bloqueia/libera comercialmente; motivo é obrigatório. */
export async function changeSalesQuotationRelease(code: number, releaseStatus: string, reason: string): Promise<void> {
  await httpClient.patch(`${BASE}/${code}/release`, { release_status: releaseStatus, reason });
}
/** Histórico do orçamento, do evento mais recente ao mais antigo. */
export async function listSalesQuotationEvents(code: number): Promise<QuotationEventDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${code}/events`);
  return unwrapArray(data).map(parseEvent);
}
/** Converte o saldo aberto em pedido de venda (transação atômica no backend). */
export async function convertSalesQuotationToOrder(code: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/convert-to-order`, { created_by: currentUserId() });
  return unwrapObject(data);
}
/**
 * Registra a geração do DAV/Pré-Venda (idempotente). Depois dela o orçamento
 * libera apenas o relatório DAV — cupom fiscal, impressão de pedido e e-mail
 * ficam indisponíveis (flags `can_*`).
 */
export async function generateSalesQuotationDAV(code: number): Promise<SalesQuotationDTO> {
  const { data } = await httpClient.post(`${BASE}/${code}/dav`, {});
  return parseQuotation(data);
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
/** Cancela o item exigindo motivo cadastrado (mesmas regras D/C da capa). */
export async function cancelSalesQuotationItem(itemCode: number, reasonCode: number, complement?: string): Promise<void> {
  await httpClient.delete(`${BASE}/items/${itemCode}/cancel`, { data: { reason_code: reasonCode, complement: complement || undefined } });
}

// ─── Anexos ──────────────────────────────────────────────────────────────────

export async function listSalesQuotationAttachments(code: number): Promise<QuotationAttachmentDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${code}/attachments`);
  return unwrapArray(data).map(parseAttachment);
}
/** Upload multipart no campo `file`; o backend recusa acima de 10 MB. */
export async function uploadSalesQuotationAttachment(code: number, file: File): Promise<QuotationAttachmentDTO> {
  const body = new FormData();
  body.append('file', file);
  const { data } = await httpClient.post(`${BASE}/${code}/attachments`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
  return parseAttachment(data);
}
export async function downloadSalesQuotationAttachment(code: number, attachmentID: number): Promise<Blob> {
  const { data } = await httpClient.get(`${BASE}/${code}/attachments/${attachmentID}`, { responseType: 'blob' });
  return data as Blob;
}
export async function deleteSalesQuotationAttachment(code: number, attachmentID: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}/attachments/${attachmentID}`);
}

// ─── Parâmetros, comissões e motivos ─────────────────────────────────────────

export async function getSalesQuotationParameters(): Promise<SalesQuotationParametersDTO> {
  const { data } = await httpClient.get(`${BASE}/parameters`);
  return parseParameters(data);
}
/** Gravação restrita a ADMIN no backend. */
export async function saveSalesQuotationParameters(dto: SalesQuotationParametersDTO): Promise<SalesQuotationParametersDTO> {
  const { data } = await httpClient.put(`${BASE}/parameters`, dto);
  return parseParameters(data);
}
export async function listCommissionPatterns(): Promise<CommissionPatternDTO[]> {
  const { data } = await httpClient.get(`${BASE}/commission-patterns`);
  return unwrapArray(data).map(parseCommissionPattern);
}
/** Grava (upsert por `code`); ADMIN. `invoice_pct + payment_pct` deve bater com `commission_pct`. */
export async function saveCommissionPattern(dto: CommissionPatternDTO): Promise<CommissionPatternDTO> {
  const { data } = await httpClient.post(`${BASE}/commission-patterns`, dto);
  return parseCommissionPattern(data);
}
export async function listCancellationReasons(): Promise<CancellationReasonDTO[]> {
  const { data } = await httpClient.get(`${BASE}/cancellation-reasons`);
  return unwrapArray(data).map(parseCancellationReason);
}
/** Grava (upsert por `code`); ADMIN. */
export async function saveCancellationReason(dto: CancellationReasonDTO): Promise<CancellationReasonDTO> {
  const { data } = await httpClient.post(`${BASE}/cancellation-reasons`, dto);
  return parseCancellationReason(data);
}
