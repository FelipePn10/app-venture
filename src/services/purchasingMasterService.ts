import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Cadastros mestres de Compras:
 *  §11 Conversão de UM por Item (`/api/item-conversions`)
 *  §12 Tabela de Preço de Compra (`/api/purchase-price-tables`)
 *  §14 Fornecedor Preferencial por Item (`/api/item-suppliers`)
 */

// ── §11 Conversão de UM ──
export interface ItemConversionDTO {
  id?: number;
  item_code: number;
  from_uom: string;
  to_uom: string;
  factor: number;
}
function parseConv(raw: unknown): ItemConversionDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    from_uom: parseStr(o, 'from_uom', 'FromUom'),
    to_uom: parseStr(o, 'to_uom', 'ToUom'),
    factor: parseNum(o, 'factor', 'Factor'),
  };
}
export async function listItemConversions(itemCode: number): Promise<ItemConversionDTO[]> {
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
export async function convertItem(itemCode: number, from: string, to: string, qty: number): Promise<Obj> {
  const { data } = await httpClient.get('/api/item-conversions/convert', { params: { item: itemCode, from, to, qty } });
  return unwrapObject(data);
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
export interface PriceTableItemDTO {
  id?: number;
  table_code?: number;
  item_code: number;
  price: number;
  uom: string;
  min_qty: number;
  supplier_code?: number;
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
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    price: parseNum(o, 'price', 'Price'),
    uom: parseStr(o, 'uom', 'Uom'),
    min_qty: parseNum(o, 'min_qty', 'MinQty'),
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode') || undefined,
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
  item_code: number;
  supplier_code: number;
  ranking: number;
  supplier_item_code?: string;
  supplier_item_desc?: string;
  supplier_uom?: string;
  lead_time_days?: number;
}
function parseItemSupplier(raw: unknown): ItemSupplierDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode'),
    ranking: parseNum(o, 'ranking', 'Ranking'),
    supplier_item_code: parseStr(o, 'supplier_item_code', 'SupplierItemCode') || undefined,
    supplier_item_desc: parseStr(o, 'supplier_item_desc', 'SupplierItemDesc') || undefined,
    supplier_uom: parseStr(o, 'supplier_uom', 'SupplierUom') || undefined,
    lead_time_days: parseNum(o, 'lead_time_days', 'LeadTimeDays') || undefined,
  };
}
export async function listItemSuppliers(itemCode: number): Promise<ItemSupplierDTO[]> {
  const { data } = await httpClient.get(`/api/item-suppliers/item/${itemCode}`);
  return unwrapArray(data).map(parseItemSupplier);
}
export async function upsertItemSupplier(dto: ItemSupplierDTO): Promise<ItemSupplierDTO> {
  const { data } = await httpClient.post('/api/item-suppliers', dto);
  return parseItemSupplier(data);
}
export async function deleteItemSupplier(id: number): Promise<void> {
  await httpClient.delete(`/api/item-suppliers/${id}`);
}
