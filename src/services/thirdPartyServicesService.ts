import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Serviços de Terceiros (`/api/third-party-services`).
 *
 * É o outro lado da operação de terceiro do roteiro: o roteiro diz que a peça
 * sai da fábrica, e aqui se acompanha por quanto, com quem, o que foi remetido
 * e o que voltou. Sem a remessa e o retorno a peça "some" — está fora, mas o
 * estoque não sabe dizer quanto está fora nem desde quando.
 */
const BASE = '/api/third-party-services';

// ─── preços de serviço ────────────────────────────────────────────────────────

export interface ServicePrice {
  id?: number;
  item_code: string;
  item_description?: string;
  mask?: string;
  supplier_code: number;
  supplier_name?: string;
  operation_id: number;
  operation_name?: string;
  uom?: string;
  reference_date?: string;
  preferred?: boolean;
  unit_price: string | number;
  /** Quantos `uom` tem 1 unidade de estoque do item; vazio = mesma unidade. */
  conversion_factor?: string;
  freight_type?: string;
  freight_value?: string;
  tax_percent?: string;
  formula?: string;
  is_active?: boolean;
}

export const FREIGHT_TYPES: { value: string; label: string }[] = [
  { value: 'FIXED', label: 'Valor fixo por peça' },
  { value: 'PERCENT', label: '% sobre o preço' },
];

function parsePrice(raw: unknown): ServicePrice {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    item_description: parseStr(o, 'item_description', 'ItemDescription') || undefined,
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode'),
    supplier_name: parseStr(o, 'supplier_name', 'SupplierName') || undefined,
    operation_id: parseNum(o, 'operation_id', 'OperationID'),
    operation_name: parseStr(o, 'operation_name', 'OperationName') || undefined,
    uom: parseStr(o, 'uom', 'UOM') || undefined,
    reference_date: parseStr(o, 'reference_date', 'ReferenceDate') || undefined,
    preferred: parseBool(o, 'preferred', 'Preferred'),
    unit_price: parseStr(o, 'unit_price', 'UnitPrice') || '0',
    conversion_factor: parseStr(o, 'conversion_factor', 'ConversionFactor') || undefined,
    freight_type: parseStr(o, 'freight_type', 'FreightType') || 'FIXED',
    freight_value: parseStr(o, 'freight_value', 'FreightValue') || '0',
    tax_percent: parseStr(o, 'tax_percent', 'TaxPercent') || '0',
    formula: parseStr(o, 'formula', 'Formula') || undefined,
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

/** Corpo comum de criação e alteração: PUT substitui o registro inteiro. */
function corpoDoPreco(dto: ServicePrice): Obj {
  return {
    item_code: dto.item_code,
    mask: dto.mask ?? '',
    supplier_code: dto.supplier_code,
    operation_id: dto.operation_id,
    uom: dto.uom ?? '',
    reference_date: dto.reference_date ? new Date(dto.reference_date).toISOString() : new Date().toISOString(),
    preferred: !!dto.preferred,
    unit_price: String(dto.unit_price),
    conversion_factor: dto.conversion_factor ? String(dto.conversion_factor) : undefined,
    freight_type: dto.freight_type ?? 'FIXED',
    freight_value: String(dto.freight_value ?? '0'),
    tax_percent: String(dto.tax_percent ?? '0'),
    formula: dto.formula ?? '',
  };
}

export async function listServicePrices(params?: Obj): Promise<ServicePrice[]> {
  const { data } = await httpClient.get(`${BASE}/prices`, { params });
  return unwrapArray(data).map(parsePrice);
}
export async function createServicePrice(dto: ServicePrice): Promise<ServicePrice> {
  const { data } = await httpClient.post(`${BASE}/prices`, corpoDoPreco(dto));
  return parsePrice(data);
}
export async function updateServicePrice(id: number, dto: ServicePrice): Promise<ServicePrice> {
  const { data } = await httpClient.put(`${BASE}/prices/${id}`, corpoDoPreco(dto));
  return parsePrice(data);
}
export async function deleteServicePrice(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/prices/${id}`);
}

export interface PriceHistoryEntry {
  id: number;
  action: string;
  reason: string;
  changed_by: string;
  changed_at: string;
}
export async function servicePriceHistory(id: number): Promise<PriceHistoryEntry[]> {
  const { data } = await httpClient.get(`${BASE}/prices/${id}/history`);
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      id: parseNum(o, 'id', 'ID'),
      action: parseStr(o, 'action', 'Action'),
      reason: parseStr(o, 'reason', 'Reason'),
      changed_by: parseStr(o, 'changed_by', 'ChangedBy'),
      changed_at: parseStr(o, 'changed_at', 'ChangedAt'),
    };
  });
}

/** Resolve o preço vigente para item/fornecedor/operação numa data. */
export async function resolveServicePrice(params: Obj): Promise<Obj> {
  const { data } = await httpClient.get(`${BASE}/prices/resolve`, { params });
  return unwrapObject(data);
}

/** Custo unitário já com frete e imposto — o número que entra no custo da peça. */
export interface ServiceCost {
  mode: string;
  gross_unit_cost: string;
  freight: string;
  /** Imposto RECUPERÁVEL: volta para a empresa, então abate do custo. */
  recoverable_taxes: string;
  conversion_factor: string;
  /** O custo que de fato entra na peça, já com frete e abatido o recuperável. */
  effective_unit_cost: string;
}
export async function resolveServiceCost(params: Obj): Promise<ServiceCost> {
  const { data } = await httpClient.get(`${BASE}/cost`, { params });
  const o = unwrapObject(data);
  return {
    mode: parseStr(o, 'mode', 'Mode'),
    gross_unit_cost: parseStr(o, 'gross_unit_cost', 'GrossUnitCost'),
    freight: parseStr(o, 'freight', 'Freight'),
    recoverable_taxes: parseStr(o, 'recoverable_taxes', 'RecoverableTaxes'),
    conversion_factor: parseStr(o, 'conversion_factor', 'ConversionFactor'),
    effective_unit_cost: parseStr(o, 'effective_unit_cost', 'EffectiveUnitCost'),
  };
}

export async function readjustServicePrices(ids: number[], percent: string, reason = ''): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/prices/readjust`, {
    ids, percent, reference_date: new Date().toISOString(), reason,
  });
  return unwrapObject(data);
}

/** Copia (ou move) preços para outro fornecedor/operação — troca de terceirizado. */
export async function copyMoveServicePrices(
  ids: number[], supplierCode: number, operationId: number, move: boolean, reason = '',
): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/prices/copy-move`, {
    ids, supplier_code: supplierCode, operation_id: operationId, move,
    reference_date: new Date().toISOString(), reason,
  });
  return unwrapObject(data);
}

// ─── ordens de serviço ────────────────────────────────────────────────────────

export interface ServiceOrder {
  id: number;
  code: number;
  production_order_id: number;
  item_code: number;
  item_description: string;
  supplier_code?: number;
  supplier_name: string;
  operation_name: string;
  uom: string;
  quantity: string;
  fulfilled_quantity: string;
  /** O que ainda está no terceiro. É o número que o PCP procura. */
  pending_quantity: string;
  start_date: string;
  due_date: string;
  status: string;
  remittance_type: string;
  purchase_requisition_code?: number;
  purchase_order_code?: number;
  notes?: string;
}

/**
 * Situações da ordem de serviço de terceiro, exatamente como o backend aceita
 * (`UpdateOrderStatus`) e como a CHECK da tabela permite. A lista anterior
 * oferecia OPEN/IN_PROGRESS/DONE, que o banco recusa: o filtro nunca casava e a
 * troca de situação voltava "situação de ordem de serviço inválida".
 */
export const ORDER_STATUSES: { value: string; label: string }[] = [
  { value: 'PLANNED', label: 'Planejada' },
  { value: 'FIRM', label: 'Firme' },
  { value: 'RELEASED_WITH_PO', label: 'Liberada com pedido de compra' },
  { value: 'RELEASED_WITHOUT_PO', label: 'Liberada sem pedido de compra' },
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

/**
 * Transições que o backend aceita a partir de cada situação. A tela oferece só
 * essas: escolher um destino inválido só devolvia erro depois do clique.
 */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ['FIRM', 'CANCELLED'],
  FIRM: ['RELEASED_WITH_PO', 'RELEASED_WITHOUT_PO', 'CANCELLED'],
  RELEASED_WITH_PO: ['COMPLETED', 'CANCELLED'],
  RELEASED_WITHOUT_PO: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function orderStatusLabel(value?: string): string {
  return ORDER_STATUSES.find((s) => s.value === value)?.label ?? (value || '—');
}

function parseOrder(raw: unknown): ServiceOrder {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseNum(o, 'code', 'Code'),
    production_order_id: parseNum(o, 'production_order_id', 'ProductionOrderID'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    item_description: parseStr(o, 'item_description', 'ItemDescription'),
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode') || undefined,
    supplier_name: parseStr(o, 'supplier_name', 'SupplierName'),
    operation_name: parseStr(o, 'operation_name', 'OperationName'),
    uom: parseStr(o, 'uom', 'UOM'),
    quantity: parseStr(o, 'quantity', 'Quantity') || '0',
    fulfilled_quantity: parseStr(o, 'fulfilled_quantity', 'FulfilledQuantity') || '0',
    pending_quantity: parseStr(o, 'pending_quantity', 'PendingQuantity') || '0',
    start_date: parseStr(o, 'start_date', 'StartDate'),
    due_date: parseStr(o, 'due_date', 'DueDate'),
    status: parseStr(o, 'status', 'Status'),
    remittance_type: parseStr(o, 'remittance_type', 'RemittanceType'),
    purchase_requisition_code: parseNum(o, 'purchase_requisition_code', 'PurchaseRequisitionCode') || undefined,
    purchase_order_code: parseNum(o, 'purchase_order_code', 'PurchaseOrderCode') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || undefined,
  };
}

export async function listServiceOrders(params?: Obj): Promise<ServiceOrder[]> {
  const { data } = await httpClient.get(`${BASE}/orders`, { params });
  return unwrapArray(data).map(parseOrder);
}
export async function getServiceOrder(id: number): Promise<ServiceOrder> {
  const { data } = await httpClient.get(`${BASE}/orders/${id}`);
  return parseOrder(data);
}
export async function updateServiceOrderStatus(id: number, status: string, extra: Obj = {}): Promise<ServiceOrder> {
  const { data } = await httpClient.patch(`${BASE}/orders/${id}/status`, { status, ...extra });
  return parseOrder(data);
}
export async function serviceOrderHistory(id: number): Promise<Obj[]> {
  const { data } = await httpClient.get(`${BASE}/orders/${id}/history`);
  return unwrapArray(data).map((r) => unwrapObject(r));
}

// ─── remessa e retorno ────────────────────────────────────────────────────────

/**
 * O que fisicamente saiu e voltou. REMESSA tira da fábrica, RETORNO e
 * RECEBIMENTO trazem de volta, AJUSTE corrige divergência de contagem.
 */
export const MOVEMENT_TYPES: { value: string; label: string; entrada: boolean }[] = [
  { value: 'REMITTANCE', label: 'Remessa ao terceiro', entrada: false },
  { value: 'RETURN', label: 'Retorno do terceiro', entrada: true },
  { value: 'RECEIPT', label: 'Recebimento', entrada: true },
  { value: 'ADJUSTMENT', label: 'Ajuste de quantidade', entrada: true },
];

export interface ServiceMovement {
  id: number;
  service_order_id: number;
  movement_type: string;
  quantity: string;
  occurred_at: string;
  reference_type?: string;
  reference_code?: string;
  notes?: string;
  lot?: string;
}

function parseMovement(raw: unknown): ServiceMovement {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    service_order_id: parseNum(o, 'service_order_id', 'ServiceOrderID'),
    movement_type: parseStr(o, 'movement_type', 'MovementType'),
    quantity: parseStr(o, 'quantity', 'Quantity') || '0',
    occurred_at: parseStr(o, 'occurred_at', 'OccurredAt'),
    reference_type: parseStr(o, 'reference_type', 'ReferenceType') || undefined,
    reference_code: parseStr(o, 'reference_code', 'ReferenceCode') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || undefined,
    lot: parseStr(o, 'lot', 'Lot') || undefined,
  };
}

export async function getServiceOrderMovements(id: number): Promise<ServiceMovement[]> {
  const { data } = await httpClient.get(`${BASE}/orders/${id}/movements`);
  return unwrapArray(data).map(parseMovement);
}

export async function addServiceOrderMovement(id: number, body: Obj): Promise<ServiceMovement> {
  const { data } = await httpClient.post(`${BASE}/orders/${id}/movements`, {
    occurred_at: new Date().toISOString(),
    // A chave de idempotência impede que um duplo clique (ou um retry de rede)
    // registre a mesma remessa duas vezes e o saldo em poder do terceiro fique
    // errado sem ninguém perceber.
    idempotency_key: `ui-${id}-${Date.now()}`,
    ...body,
  });
  return parseMovement(data);
}

/** Gera ordens de serviço a partir de uma OF (operações externas do roteiro). */
export async function generateOrdersFromProduction(productionOrderId: number, body: Obj = {}): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/production-orders/${productionOrderId}/orders`, body);
  return unwrapObject(data);
}

// ─── conversões globais ───────────────────────────────────────────────────────

export interface GlobalConversion { id?: number; from_uom: string; to_uom: string; factor: string }

export async function listGlobalConversions(): Promise<GlobalConversion[]> {
  const { data } = await httpClient.get(`${BASE}/global-conversions`);
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      id: parseNum(o, 'id', 'ID') || undefined,
      from_uom: parseStr(o, 'from_uom', 'FromUOM'),
      to_uom: parseStr(o, 'to_uom', 'ToUOM'),
      factor: parseStr(o, 'factor', 'Factor') || '1',
    };
  });
}
export async function upsertGlobalConversion(dto: GlobalConversion): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/global-conversions`, dto);
  return unwrapObject(data);
}
export async function deleteGlobalConversion(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/global-conversions/${id}`);
}
