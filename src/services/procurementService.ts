import { httpClient, parseStr, parseNum, parseBool, currentUserId, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Camada operacional de Suprimentos (`/api/procurement`). Este módulo cobre o
 * **fechamento de recebimento (FAVR)**: Aviso de Recebimento (agenda de doca +
 * conferência antes da NF) e Divergências (falta, sobra, avaria, item errado, preço,
 * documento, atraso), que alimentam o IQF do fornecedor.
 *
 * Contratos de fornecedor ficam em `supplierContractService`. Demais sub-módulos
 * (inspeção, scorecards, homologação, EDI, importação, alçada, parâmetros) serão
 * adicionados conforme as telas forem religadas.
 */
const NOTICES = '/api/procurement/receiving-notices';
const DIVERGENCES = '/api/procurement/receiving-divergences';

export type NoticeStatus = 'SCHEDULED' | 'ARRIVED' | 'IN_CONFERENCE' | 'RELEASED' | 'BLOCKED' | 'CANCELLED';
export const NOTICE_STATUSES: NoticeStatus[] = ['SCHEDULED', 'ARRIVED', 'IN_CONFERENCE', 'RELEASED', 'BLOCKED', 'CANCELLED'];
export type DivergenceType = 'SHORTAGE' | 'EXCESS' | 'DAMAGE' | 'WRONG_ITEM' | 'PRICE' | 'DOCUMENT' | 'LATE' | 'OTHER';
export const DIVERGENCE_TYPES: DivergenceType[] = ['SHORTAGE', 'EXCESS', 'DAMAGE', 'WRONG_ITEM', 'PRICE', 'DOCUMENT', 'LATE', 'OTHER'];
export type DivergenceResolution = 'PENDING' | 'ACCEPTED' | 'PARTIAL_RETURN' | 'FULL_RETURN' | 'WAIVED' | 'SUPPLIER_DEBIT';
export const DIVERGENCE_RESOLUTIONS: DivergenceResolution[] = ['PENDING', 'ACCEPTED', 'PARTIAL_RETURN', 'FULL_RETURN', 'WAIVED', 'SUPPLIER_DEBIT'];

export interface NoticeItem {
  id?: number;
  purchase_order_item_code?: number;
  item_code: number;
  mask?: string;
  expected_qty: number;
  received_qty?: number;
  unit?: string;
  notes?: string;
}
export interface ReceivingNotice {
  id?: number;
  enterprise_code: number;
  notice_number?: number;
  supplier_code?: number;
  purchase_order_code?: number;
  carrier_code?: number;
  status?: NoticeStatus;
  dock?: string;
  scheduled_at?: string;
  arrived_at?: string;
  invoice_number?: string;
  blocked?: boolean;
  notes?: string;
  items?: NoticeItem[];
}
export interface ReceivingDivergence {
  id?: number;
  notice_id?: number;
  purchase_order_code?: number;
  purchase_order_item_code?: number;
  supplier_code?: number;
  item_code?: number;
  mask?: string;
  divergence_type: DivergenceType;
  expected_qty: number;
  actual_qty: number;
  expected_price?: number;
  actual_price?: number;
  resolution?: DivergenceResolution;
  affects_supplier_score?: boolean;
  notes?: string;
}

function parseNoticeItem(raw: unknown): NoticeItem {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    purchase_order_item_code: parseNum(o, 'purchase_order_item_code', 'PurchaseOrderItemCode') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    expected_qty: parseNum(o, 'expected_qty', 'ExpectedQty'),
    received_qty: parseNum(o, 'received_qty', 'ReceivedQty'),
    unit: parseStr(o, 'unit', 'Unit') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || undefined,
  };
}
function parseNotice(raw: unknown): ReceivingNotice {
  const o = unwrapObject(raw);
  const items = o['items'] ?? o['Items'];
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    enterprise_code: parseNum(o, 'enterprise_code', 'EnterpriseCode'),
    notice_number: parseNum(o, 'notice_number', 'NoticeNumber') || undefined,
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode') || undefined,
    purchase_order_code: parseNum(o, 'purchase_order_code', 'PurchaseOrderCode') || undefined,
    carrier_code: parseNum(o, 'carrier_code', 'CarrierCode') || undefined,
    status: (parseStr(o, 'status', 'Status') || 'SCHEDULED') as NoticeStatus,
    dock: parseStr(o, 'dock', 'Dock') || undefined,
    scheduled_at: parseStr(o, 'scheduled_at', 'ScheduledAt') || undefined,
    arrived_at: parseStr(o, 'arrived_at', 'ArrivedAt') || undefined,
    invoice_number: parseStr(o, 'invoice_number', 'InvoiceNumber') || undefined,
    blocked: parseBool(o, 'blocked', 'Blocked'),
    notes: parseStr(o, 'notes', 'Notes') || undefined,
    items: Array.isArray(items) ? items.map(parseNoticeItem) : [],
  };
}
function parseDivergence(raw: unknown): ReceivingDivergence {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    notice_id: parseNum(o, 'notice_id', 'NoticeID') || undefined,
    purchase_order_code: parseNum(o, 'purchase_order_code', 'PurchaseOrderCode') || undefined,
    purchase_order_item_code: parseNum(o, 'purchase_order_item_code', 'PurchaseOrderItemCode') || undefined,
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode') || undefined,
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    divergence_type: (parseStr(o, 'divergence_type', 'DivergenceType') || 'OTHER') as DivergenceType,
    expected_qty: parseNum(o, 'expected_qty', 'ExpectedQty'),
    actual_qty: parseNum(o, 'actual_qty', 'ActualQty'),
    expected_price: parseNum(o, 'expected_price', 'ExpectedPrice') || undefined,
    actual_price: parseNum(o, 'actual_price', 'ActualPrice') || undefined,
    resolution: (parseStr(o, 'resolution', 'Resolution') || 'PENDING') as DivergenceResolution,
    affects_supplier_score: parseBool(o, 'affects_supplier_score', 'AffectsSupplierScore'),
    notes: parseStr(o, 'notes', 'Notes') || undefined,
  };
}

// ── Avisos de Recebimento ──
export async function listReceivingNotices(params?: Obj): Promise<ReceivingNotice[]> {
  const { data } = await httpClient.get(NOTICES, { params });
  return unwrapArray(data).map(parseNotice);
}
export async function getReceivingNotice(id: number): Promise<ReceivingNotice> {
  const { data } = await httpClient.get(`${NOTICES}/${id}`);
  return parseNotice(data);
}
export async function createReceivingNotice(dto: ReceivingNotice): Promise<ReceivingNotice> {
  const body = {
    enterprise_code: dto.enterprise_code,
    supplier_code: dto.supplier_code ?? null,
    purchase_order_code: dto.purchase_order_code ?? null,
    carrier_code: dto.carrier_code ?? null,
    dock: dto.dock ?? null,
    scheduled_at: dto.scheduled_at ?? null,
    invoice_number: dto.invoice_number ?? null,
    notes: dto.notes ?? null,
    items: (dto.items ?? []).map((i) => ({
      purchase_order_item_code: i.purchase_order_item_code ?? null,
      item_code: i.item_code,
      mask: i.mask ?? '',
      expected_qty: i.expected_qty,
      unit: i.unit ?? null,
      notes: i.notes ?? null,
    })),
    created_by: currentUserId(),
  };
  const { data } = await httpClient.post(NOTICES, body);
  return parseNotice(data);
}
/** Avança a conferência do aviso: SCHEDULED→ARRIVED→IN_CONFERENCE→RELEASED/BLOCKED/CANCELLED. */
export async function updateNoticeStatus(id: number, status: NoticeStatus, blocked = false): Promise<ReceivingNotice> {
  const { data } = await httpClient.patch(`${NOTICES}/${id}/status`, { status, blocked });
  return parseNotice(data);
}

// ── Divergências de Recebimento ──
export async function listReceivingDivergences(params?: Obj): Promise<ReceivingDivergence[]> {
  const { data } = await httpClient.get(DIVERGENCES, { params });
  return unwrapArray(data).map(parseDivergence);
}
export async function createReceivingDivergence(dto: ReceivingDivergence): Promise<ReceivingDivergence> {
  const { data } = await httpClient.post(DIVERGENCES, { ...dto, mask: dto.mask ?? '', created_by: currentUserId() });
  return parseDivergence(data);
}
/** Registra a resolução de uma divergência (ACCEPTED/PARTIAL_RETURN/FULL_RETURN/WAIVED/SUPPLIER_DEBIT). */
export async function resolveDivergence(id: number, resolution: DivergenceResolution): Promise<ReceivingDivergence> {
  const { data } = await httpClient.patch(`${DIVERGENCES}/${id}/resolution`, { resolution });
  return parseDivergence(data);
}
