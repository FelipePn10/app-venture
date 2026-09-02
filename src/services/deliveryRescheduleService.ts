import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/delivery-reschedule';

/** Reprogramação de entrega — histórico de remarcações vinculado ao pedido. */
export interface RescheduleDTO {
  code?: number;
  sales_order_code: number;
  item_code: number;
  old_date: string;
  new_date: string;
  reason?: string;
}

export interface DeliveryReschedulePlanningItemDTO {
  sales_order_item_code: number;
  item_code: number;
  sequence: number;
  requested_qty: number;
  attended_qty: number;
  cancelled_qty: number;
  open_qty: number;
  current_date?: string;
  firm_date: boolean;
  reserved_qty: number;
  independent_demand_qty: number;
  planned_order_count: number;
  firm_order_count: number;
  purchase_order_count: number;
  shipment_count: number;
  shipment_status?: string;
  crp_overloaded: boolean;
  aps_date?: string;
  invoiced_qty: number;
  can_reschedule: boolean;
  severity: string;
  suggestion_source: string;
  suggested_date?: string;
  justification: string;
}

export interface DeliveryRescheduleBatchItemDTO {
  sales_order_item_code: number;
  item_code: number;
  old_date: string;
  new_date: string;
  reason?: string;
}

export interface DeliveryRescheduleBatchDTO {
  sales_order_code: number;
  idempotency_key: string;
  items: DeliveryRescheduleBatchItemDTO[];
}

export interface DeliveryRescheduleBatchResultDTO {
  codes: number[];
  replayed: boolean;
}

function parseReschedule(raw: unknown): RescheduleDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    sales_order_code: parseNum(o, 'sales_order_code', 'SalesOrderCode'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    old_date: parseStr(o, 'old_date', 'OldDate'),
    new_date: parseStr(o, 'new_date', 'NewDate'),
    reason: parseStr(o, 'reason', 'Reason'),
  };
}

/** Converte "YYYY-MM-DD" (input date) para RFC3339, exigido pelo backend. */
function toRfc3339(d: string): string {
  if (!d) return d;
  return /T/.test(d) ? d : `${d}T00:00:00Z`;
}

export async function createReschedule(dto: RescheduleDTO): Promise<RescheduleDTO> {
  const payload = { ...dto, item_code: Number(dto.item_code), old_date: toRfc3339(dto.old_date), new_date: toRfc3339(dto.new_date) };
  const { data } = await httpClient.post(`${BASE}/create`, payload);
  return parseReschedule(data);
}
export async function listReschedulesByOrder(salesOrderCode: number): Promise<RescheduleDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list/${salesOrderCode}`);
  return unwrapArray(data).map(parseReschedule);
}

function parsePlanningItem(raw: unknown): DeliveryReschedulePlanningItemDTO {
  const o = unwrapObject(raw);
  return {
    sales_order_item_code: parseNum(o, 'sales_order_item_code', 'SalesOrderItemCode'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    sequence: parseNum(o, 'sequence', 'Sequence'),
    requested_qty: parseNum(o, 'requested_qty', 'RequestedQty'),
    attended_qty: parseNum(o, 'attended_qty', 'AttendedQty'),
    cancelled_qty: parseNum(o, 'cancelled_qty', 'CancelledQty'),
    open_qty: parseNum(o, 'open_qty', 'OpenQty'),
    current_date: parseStr(o, 'current_date', 'CurrentDate') || undefined,
    firm_date: parseBool(o, 'firm_date', 'FirmDate'),
    reserved_qty: parseNum(o, 'reserved_qty', 'ReservedQty'),
    independent_demand_qty: parseNum(o, 'independent_demand_qty', 'IndependentDemandQty'),
    planned_order_count: parseNum(o, 'planned_order_count', 'PlannedOrderCount'),
    firm_order_count: parseNum(o, 'firm_order_count', 'FirmOrderCount'),
    purchase_order_count: parseNum(o, 'purchase_order_count', 'PurchaseOrderCount'),
    shipment_count: parseNum(o, 'shipment_count', 'ShipmentCount'),
    shipment_status: parseStr(o, 'shipment_status', 'ShipmentStatus') || undefined,
    crp_overloaded: parseBool(o, 'crp_overloaded', 'CRPOverloaded'),
    aps_date: parseStr(o, 'aps_date', 'APSDate') || undefined,
    invoiced_qty: parseNum(o, 'invoiced_qty', 'InvoicedQty'),
    can_reschedule: parseBool(o, 'can_reschedule', 'CanReschedule'),
    severity: parseStr(o, 'severity', 'Severity'),
    suggestion_source: parseStr(o, 'suggestion_source', 'SuggestionSource'),
    suggested_date: parseStr(o, 'suggested_date', 'SuggestedDate') || undefined,
    justification: parseStr(o, 'justification', 'Justification'),
  };
}

export async function previewDeliveryReschedule(salesOrderCode: number): Promise<DeliveryReschedulePlanningItemDTO[]> {
  const { data } = await httpClient.get(`${BASE}/preview/${salesOrderCode}`);
  return unwrapArray(data).map(parsePlanningItem);
}

export async function createDeliveryRescheduleBatch(dto: DeliveryRescheduleBatchDTO): Promise<DeliveryRescheduleBatchResultDTO> {
  const payload = {
    ...dto,
    items: dto.items.map((item) => ({ ...item, item_code: Number(item.item_code), old_date: toRfc3339(item.old_date), new_date: toRfc3339(item.new_date) })),
  };
  const { data } = await httpClient.post(`${BASE}/batch`, payload);
  const o = unwrapObject(data);
  return { codes: unwrapArray(o.codes).map((code) => Number(code)), replayed: Boolean(o.replayed ?? o.Replayed) };
}
