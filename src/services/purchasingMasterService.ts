import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj, parseBool } from '@/services/fiscalShared';
import { downloadResponse } from '@/services/fileDownload';

/**
 * Cadastros mestres de Compras:
 *  §11 Conversão de UM por Item (`/api/item-conversions`)
 *  §12 Tabela de Preço de Compra (`/api/purchase-price-tables`)
 *  §14 Fornecedor Preferencial por Item (`/api/item-suppliers`)
 */

// ── §11 Conversão de UM ──
export interface ItemConversionDTO {
  id?: number;
  item_code: string;
  from_uom: string;
  to_uom: string;
  factor: number;
  /**
   * Política de arredondamento para item que não aceita fração. A conversão
   * arredonda para o inteiro mais próximo e só aceita se a sobra couber em
   * `rounding_percent` (% da quantidade) mais a tolerância. Tudo em zero recusa
   * qualquer conversão que não dê inteiro exato — que era o comportamento até
   * aqui, porque a tela nunca enviava esses três campos.
   */
  rounding_percent?: number;
  tolerance_value?: number;
  /** `PERCENT` (% da quantidade) ou `FIXED` (valor absoluto). */
  tolerance_type?: string;
}

/** Como a tolerância de conversão é interpretada. */
export const CONVERSION_TOLERANCE_TYPES = ['PERCENT', 'FIXED'] as const;
function parseConv(raw: unknown): ItemConversionDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    from_uom: parseStr(o, 'from_uom', 'FromUom'),
    to_uom: parseStr(o, 'to_uom', 'ToUom'),
    factor: parseNum(o, 'factor', 'Factor'),
    rounding_percent: parseNum(o, 'rounding_percent', 'RoundingPercent'),
    tolerance_value: parseNum(o, 'tolerance_value', 'ToleranceValue'),
    tolerance_type: parseStr(o, 'tolerance_type', 'ToleranceType') || undefined,
  };
}
export async function listItemConversions(itemCode: string): Promise<ItemConversionDTO[]> {
  const { data } = await httpClient.get(`/api/item-conversions/item/${itemCode}`);
  return unwrapArray(data).map(parseConv);
}
export async function upsertItemConversion(dto: ItemConversionDTO): Promise<ItemConversionDTO> {
  const { data } = await httpClient.post('/api/item-conversions', dto);
  return parseConv(data);
}
export async function deleteItemConversion(id: number): Promise<void> {
  await httpClient.delete(`/api/item-conversions/${id}`);
}
/** Resultado legível da conversão — a tela mostra isso, não o JSON cru. */
export interface ConversionResult {
  from_uom: string;
  to_uom: string;
  factor: number;
  quantity: number;
  converted_qty: number;
}

export async function convertItem(itemCode: string, from: string, to: string, qty: number): Promise<ConversionResult> {
  const { data } = await httpClient.get('/api/item-conversions/convert', { params: { item: itemCode, from, to, qty } });
  const o = unwrapObject(data);
  return {
    from_uom: parseStr(o, 'from_uom', 'FromUom'),
    to_uom: parseStr(o, 'to_uom', 'ToUom'),
    factor: parseNum(o, 'factor', 'Factor'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    converted_qty: parseNum(o, 'converted_qty', 'ConvertedQty'),
  };
}

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
  const { data } = await httpClient.post('/api/purchase-price-tables/items', dto);
  return parseTableItem(data);
}
export async function deletePriceTableItem(id: number): Promise<void> {
  await httpClient.delete(`/api/purchase-price-tables/items/${id}`);
}

// ── §14 Fornecedor Preferencial por Item ──
export interface ItemSupplierDTO {
  id?: number;
  item_code: string;
  supplier_code: number;
  mask?: string;
  ranking: number;
  supplier_item_code?: string;
  supplier_item_desc?: string;
  supplier_uom?: string;
  lead_time_days?: number;

  /**
   * O que muda de fato entre comprar do fornecedor A ou do B: a unidade em que
   * ele fatura, quanto vem por embalagem e o fator de conversão para a unidade
   * interna. Sem isso, um pedido de 10 caixas vira 10 unidades no estoque.
   */
  xml_uom?: string;
  conversion_factor?: number;
  package_quantity?: number;
  barcode?: string;
  is_preferred?: boolean;
  /** Homologação do fornecedor para este item. */
  classification_id?: number;
  classification_date?: string;
  classification_grade?: number;
  /** Faturamento direto ao cliente, sem passar pelo estoque. */
  direct_billing?: boolean;
  third_party_order?: boolean;
  ignore_avg_cost_addition?: boolean;
  ecommerce?: boolean;
  valid_until?: string;
  notes?: string;
}
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
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    xml_uom: parseStr(o, 'xml_uom', 'XMLUOM') || undefined,
    conversion_factor: parseNum(o, 'conversion_factor', 'ConversionFactor') || undefined,
    package_quantity: parseNum(o, 'package_quantity', 'PackageQuantity') || undefined,
    barcode: parseStr(o, 'barcode', 'Barcode') || undefined,
    is_preferred: parseBool(o, 'is_preferred', 'IsPreferred'),
    classification_id: parseNum(o, 'classification_id', 'ClassificationID') || undefined,
    classification_date: parseStr(o, 'classification_date', 'ClassificationDate') || undefined,
    classification_grade: parseNum(o, 'classification_grade', 'ClassificationGrade') || undefined,
    direct_billing: parseBool(o, 'direct_billing', 'DirectBilling'),
    third_party_order: parseBool(o, 'third_party_order', 'ThirdPartyOrder'),
    ignore_avg_cost_addition: parseBool(o, 'ignore_avg_cost_addition', 'IgnoreAvgCostAddition'),
    ecommerce: parseBool(o, 'ecommerce', 'Ecommerce'),
    valid_until: parseStr(o, 'valid_until', 'ValidUntil') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || undefined,
  };
}
export async function listItemSuppliers(itemCode: string): Promise<ItemSupplierDTO[]> {
  const { data } = await httpClient.get(`/api/item-suppliers/item/${encodeURIComponent(itemCode)}`);
  return unwrapArray(data).map(parseItemSupplier);
}
export async function upsertItemSupplier(dto: ItemSupplierDTO): Promise<ItemSupplierDTO> {
  const { data } = await httpClient.post('/api/item-suppliers', dto);
  return parseItemSupplier(data);
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
