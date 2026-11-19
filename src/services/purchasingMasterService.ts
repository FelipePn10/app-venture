import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj, parseBool } from '@/services/fiscalShared';
import { downloadResponse } from '@/services/fileDownload';

/**
 * Cadastros mestres de Compras:
 *  §11 Conversão de UM por Item — em `unitConversionService`
 *  §12 Tabela de Preço de Compra (`/api/purchase-price-tables`)
 *  §14 Fornecedor Preferencial por Item (`/api/item-suppliers`)
 */

// §11 Conversão de UM: ver unitConversionService (VSUP0110).

// ── §12 Tabela de Preço de Compra ──
export interface PriceTableDTO {
  id?: number;
  code?: number;
  description: string;
  currency: string;
  valid_from: string;
  valid_to?: string;
}
/** Desconto ou acréscimo aplicado em cadeia sobre o preço da tabela. */
export interface PriceAdjustmentDTO {
  sequence: number;
  /** `DISCOUNT` (desconto) ou `SURCHARGE` (acréscimo). */
  kind: string;
  /** `PERCENT` (% sobre o preço corrente) ou `FIXED` (valor absoluto). */
  calculation_type: string;
  value: number;
}

export const PRICE_ADJUSTMENT_KINDS = ['DISCOUNT', 'SURCHARGE'] as const;
export const PRICE_CALCULATION_TYPES = ['PERCENT', 'FIXED'] as const;

export interface PriceTableItemDTO {
  id?: number;
  table_code?: number;
  item_code: string;
  price: number;
  uom: string;
  min_qty: number;
  supplier_code?: number;
  /**
   * Leva o preço negociado para o valor de reposição do item. É o que faz a
   * nova tabela refletir no custo de reposição usado pelo planejamento — sem
   * marcar, a tabela vale só para o pedido.
   */
  update_replacement_value?: boolean;
  adjustments?: PriceAdjustmentDTO[];
}
function parseTable(raw: unknown): PriceTableDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    code: parseNum(o, 'code', 'Code') || undefined,
    description: parseStr(o, 'description', 'Description'),
    currency: parseStr(o, 'currency', 'Currency') || 'BRL',
    valid_from: parseStr(o, 'valid_from', 'ValidFrom'),
    valid_to: parseStr(o, 'valid_to', 'ValidTo') || undefined,
  };
}
function parseTableItem(raw: unknown): PriceTableItemDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    table_code: parseNum(o, 'table_code', 'TableCode') || undefined,
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    price: parseNum(o, 'price', 'Price'),
    uom: parseStr(o, 'uom', 'Uom'),
    min_qty: parseNum(o, 'min_qty', 'MinQty'),
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode') || undefined,
    update_replacement_value: parseBool(o, 'update_replacement_value', 'UpdateReplacementValue') ?? undefined,
    adjustments: unwrapArray(o['adjustments'] ?? o['Adjustments']).map((a) => {
      const ao = unwrapObject(a);
      return {
        sequence: parseNum(ao, 'sequence', 'Sequence'),
        kind: parseStr(ao, 'kind', 'Kind'),
        calculation_type: parseStr(ao, 'calculation_type', 'CalculationType'),
        value: parseNum(ao, 'value', 'Value'),
      };
    }),
  };
}
export async function listPriceTables(): Promise<PriceTableDTO[]> {
  const { data } = await httpClient.get('/api/purchase-price-tables');
  return unwrapArray(data).map(parseTable);
}
export async function createPriceTable(dto: PriceTableDTO): Promise<PriceTableDTO> {
  const { data } = await httpClient.post('/api/purchase-price-tables', dto);
  return parseTable(data);
}
export async function listPriceTableItems(code: number): Promise<PriceTableItemDTO[]> {
  const { data } = await httpClient.get(`/api/purchase-price-tables/${code}/items`);
  return unwrapArray(data).map(parseTableItem);
}
export async function upsertPriceTableItem(dto: PriceTableItemDTO): Promise<PriceTableItemDTO> {
  // Fornecedor vazio/0 é preço genérico: não manda 0 (a busca de preço ignorava a linha).
  const body = { ...dto, supplier_code: dto.supplier_code && dto.supplier_code > 0 ? dto.supplier_code : undefined };
  const { data } = await httpClient.post('/api/purchase-price-tables/items', body);
  return parseTableItem(data);
}
export async function deletePriceTableItem(id: number): Promise<void> {
  await httpClient.delete(`/api/purchase-price-tables/items/${id}`);
}

// ── §14 Fornecedor Preferencial por Item (fonte de suprimento) ──
export type ItemSupplierSituacao = 'VIGENTE' | 'BLOQUEADO' | 'VENCIDO' | 'FUTURO';
export interface ItemSupplierDTO {
  id?: number;
  item_code: string;
  supplier_code: number;
  mask?: string;
  ranking: number;
  /**
   * Código e descrição do item no fornecedor: a entrada de NF-e aprende sozinha
   * ao ligar a nota ao item. Só leitura na tela (limpar = clearLearnedItemSupplier).
   */
  supplier_item_code?: string;
  supplier_item_desc?: string;
  /** Prazo de entrega DESTE fornecedor (dias). Vazio = vale o prazo de compra do item. */
  lead_time_days?: number;
  /** Política de compra deste fornecedor, na unidade de estoque. */
  min_order_qty?: number;
  order_multiple?: number;
  /** Cota da compra do item para este fornecedor (%). Vazio = fora da divisão. */
  quota_percent?: number;
  valid_from?: string;
  valid_until?: string;
  blocked?: boolean;
  blocked_reason?: string;
  blocked_at?: string;
  situacao?: ItemSupplierSituacao;

  /** Mantidos como estão gravados (não editados nesta tela). */
  supplier_uom?: string;
  xml_uom?: string;
  conversion_factor?: number;
  package_quantity?: number;
  barcode?: string;
  is_preferred?: boolean;
  classification_id?: number;
  classification_date?: string;
  classification_grade?: number;
  direct_billing?: boolean;
  third_party_order?: boolean;
  ignore_avg_cost_addition?: boolean;
  ecommerce?: boolean;
  notes?: string;
}
const dia = (v: string): string | undefined => (v ? v.slice(0, 10) : undefined);
function parseItemSupplier(raw: unknown): ItemSupplierDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode'),
    ranking: parseNum(o, 'ranking', 'Ranking'),
    supplier_item_code: parseStr(o, 'supplier_item_code', 'SupplierItemCode') || undefined,
    supplier_item_desc: parseStr(o, 'supplier_description', 'SupplierDescription') || undefined,
    supplier_uom: parseStr(o, 'uom', 'UOM') || undefined,
    lead_time_days: parseNum(o, 'lead_time_days', 'LeadTimeDays') || undefined,
    min_order_qty: parseNum(o, 'min_order_qty', 'MinOrderQty') || undefined,
    order_multiple: parseNum(o, 'order_multiple', 'OrderMultiple') || undefined,
    quota_percent: parseNum(o, 'quota_percent', 'QuotaPercent') || undefined,
    valid_from: dia(parseStr(o, 'valid_from', 'ValidFrom')),
    valid_until: dia(parseStr(o, 'valid_until', 'ValidUntil')),
    blocked: parseBool(o, 'blocked', 'Blocked'),
    blocked_reason: parseStr(o, 'blocked_reason', 'BlockedReason') || undefined,
    blocked_at: parseStr(o, 'blocked_at', 'BlockedAt') || undefined,
    situacao: (parseStr(o, 'situacao', 'Situacao') || 'VIGENTE') as ItemSupplierSituacao,
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    xml_uom: parseStr(o, 'xml_uom', 'XMLUOM') || undefined,
    conversion_factor: parseNum(o, 'conversion_factor', 'ConversionFactor') || undefined,
    package_quantity: parseNum(o, 'package_quantity', 'PackageQuantity') || undefined,
    barcode: parseStr(o, 'barcode', 'Barcode') || undefined,
    is_preferred: parseBool(o, 'is_preferred', 'IsPreferred'),
    classification_id: parseNum(o, 'classification_id', 'ClassificationID') || undefined,
    classification_date: dia(parseStr(o, 'classification_date', 'ClassificationDate')),
    classification_grade: parseNum(o, 'classification_grade', 'ClassificationGrade') || undefined,
    direct_billing: parseBool(o, 'direct_billing', 'DirectBilling'),
    third_party_order: parseBool(o, 'third_party_order', 'ThirdPartyOrder'),
    ignore_avg_cost_addition: parseBool(o, 'ignore_avg_cost_addition', 'IgnoreAvgCostAddition'),
    ecommerce: parseBool(o, 'ecommerce', 'Ecommerce'),
    notes: parseStr(o, 'notes', 'Notes') || undefined,
  };
}
export async function listItemSuppliers(itemCode: string): Promise<ItemSupplierDTO[]> {
  const { data } = await httpClient.get(`/api/item-suppliers/item/${encodeURIComponent(itemCode)}`);
  return unwrapArray(data).map(parseItemSupplier);
}
/**
 * Grava o vínculo com os nomes de campo do backend. Código e descrição no
 * fornecedor não vão: o backend mantém o que a NF-e aprendeu.
 */
export async function upsertItemSupplier(dto: ItemSupplierDTO): Promise<ItemSupplierDTO> {
  const body = {
    item_code: dto.item_code,
    supplier_code: dto.supplier_code,
    mask: dto.mask ?? '',
    ranking: dto.ranking,
    is_preferred: !!dto.is_preferred,
    lead_time_days: dto.lead_time_days ?? 0,
    min_order_qty: dto.min_order_qty ?? 0,
    order_multiple: dto.order_multiple ?? 0,
    quota_percent: dto.quota_percent || undefined,
    valid_from: dto.valid_from || undefined,
    valid_until: dto.valid_until || undefined,
    uom: dto.supplier_uom || undefined,
    xml_uom: dto.xml_uom || undefined,
    conversion_factor: dto.conversion_factor || undefined,
    package_quantity: dto.package_quantity ?? 0,
    barcode: dto.barcode || undefined,
    classification_id: dto.classification_id || undefined,
    classification_date: dto.classification_date || undefined,
    classification_grade: dto.classification_grade || undefined,
    direct_billing: !!dto.direct_billing,
    third_party_order: !!dto.third_party_order,
    ignore_avg_cost_addition: !!dto.ignore_avg_cost_addition,
    ecommerce: !!dto.ecommerce,
    notes: dto.notes || undefined,
  };
  const { data } = await httpClient.post('/api/item-suppliers', body);
  return parseItemSupplier(data);
}
export async function blockItemSupplier(id: number, reason: string): Promise<ItemSupplierDTO> {
  const { data } = await httpClient.post(`/api/item-suppliers/${id}/block`, { reason });
  return parseItemSupplier(data);
}
export async function unblockItemSupplier(id: number, reason: string): Promise<ItemSupplierDTO> {
  const { data } = await httpClient.post(`/api/item-suppliers/${id}/unblock`, { reason });
  return parseItemSupplier(data);
}
export async function clearLearnedItemSupplier(id: number): Promise<ItemSupplierDTO> {
  const { data } = await httpClient.post(`/api/item-suppliers/${id}/clear-learned`, {});
  return parseItemSupplier(data);
}
export interface ItemSupplierBlockEvent {
  id: number;
  action: 'BLOQUEIO' | 'DESBLOQUEIO';
  reason: string;
  actor_id: string;
  created_at: string;
}
export async function listItemSupplierBlockHistory(id: number): Promise<ItemSupplierBlockEvent[]> {
  const { data } = await httpClient.get(`/api/item-suppliers/${id}/block-history`);
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      id: parseNum(o, 'id', 'ID'),
      action: parseStr(o, 'action', 'Action') as ItemSupplierBlockEvent['action'],
      reason: parseStr(o, 'reason', 'Reason'),
      actor_id: parseStr(o, 'actor_id', 'ActorID'),
      created_at: parseStr(o, 'created_at', 'CreatedAt'),
    };
  });
}
export async function deleteItemSupplier(id: number): Promise<void> {
  await httpClient.delete(`/api/item-suppliers/${id}`);
}

export async function searchItemSuppliers(supplierCode: number, term: string): Promise<ItemSupplierDTO[]> {
  const { data } = await httpClient.get('/api/item-suppliers/search', { params: { supplier_code: supplierCode, term } });
  return unwrapArray(data).map(parseItemSupplier);
}

export type QualityReportStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'EXPIRADO';
export interface ItemSupplierQualityReport {
  id: number;
  item_supplier_id: number;
  registered_on: string;
  status: QualityReportStatus;
  file_name?: string;
  content_type?: string;
  has_attachment: boolean;
  notes?: string;
  created_at: string;
  created_by: string;
}
export async function createItemSupplierQualityReport(id: number, dto: { registered_on: string; status: QualityReportStatus; file_name?: string; content_type?: string; content?: string; notes?: string }): Promise<ItemSupplierQualityReport> {
  const { data } = await httpClient.post(`/api/item-suppliers/${id}/quality-reports`, dto);
  return unwrapObject(data) as unknown as ItemSupplierQualityReport;
}
export async function listItemSupplierQualityReports(id: number): Promise<ItemSupplierQualityReport[]> {
  const { data } = await httpClient.get(`/api/item-suppliers/${id}/quality-reports`);
  return unwrapArray(data) as unknown as ItemSupplierQualityReport[];
}
export async function downloadItemSupplierQualityReport(reportId: number, fallbackName = `laudo-${reportId}`): Promise<string> {
  const response = await httpClient.get(`/api/item-suppliers/quality-reports/${reportId}/download`, { responseType: 'blob' });
  return downloadResponse(response.data as Blob, response.headers as Record<string, unknown>, fallbackName);
}
export async function linkInspectionQualityReport(inspectionOrderId: number, qualityReportId: number): Promise<Obj> {
  const { data } = await httpClient.post(`/api/procurement/receiving-inspection-orders/${inspectionOrderId}/quality-reports`, { quality_report_id: qualityReportId });
  return unwrapObject(data);
}
export async function listInspectionQualityReports(inspectionOrderId: number): Promise<Obj[]> {
  const { data } = await httpClient.get(`/api/procurement/receiving-inspection-orders/${inspectionOrderId}/quality-reports`);
  return unwrapArray(data).map(unwrapObject);
}
export async function unlinkInspectionQualityReport(inspectionOrderId: number, qualityReportId: number): Promise<void> {
  await httpClient.delete(`/api/procurement/receiving-inspection-orders/${inspectionOrderId}/quality-reports/${qualityReportId}`);
}

// ── Preços das compras para a tabela (VSUP0120) ──
export async function listPurchasePriceSources(params: { start: string; end: string; supplier_code?: number; table_code?: number; source?: string }): Promise<Obj[]> {
  const { data } = await httpClient.get('/api/purchase-price-tables/sources', { params });
  return unwrapArray(data).map(unwrapObject);
}
export async function applyPurchasePriceSources(tableCode: number, overwrite: boolean, selections: { source_type: string; source_id: number }[]): Promise<number> {
  const { data } = await httpClient.post('/api/purchase-price-tables/sources/apply', { table_code: tableCode, overwrite, selections });
  return Number(unwrapObject(data).applied ?? 0);
}
export async function copyPriceAdjustments(sourceItemId: number, targetItemId: number, mode: 'REPLACE' | 'ADD'): Promise<void> {
  await httpClient.post('/api/purchase-price-tables/items/copy-adjustments', { source_item_id: sourceItemId, target_item_id: targetItemId, mode });
}
