import { httpClient, parseStr, parseNum, parseBool, currentUserId, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Máscaras de Lote/Série (`/api/lot-masks`) — define como o número de lote/série é
 * composto por **partes** (caractere fixo, data, sequencial numérico/caractere) e gera
 * o próximo lote. `application` (ex.: por cliente/item/classificação).
 */
const BASE = '/api/lot-masks';
export const PART_TYPES = ['CARACTER', 'DATA', 'SEQ_NUMERICA', 'SEQ_CARACTER'] as const;

export interface LotMaskPart {
  id?: number;
  sequence: number;
  part_type: string;
  value: string;
  size: number;
  date_format?: string;
  zero_on_year_change?: boolean;
}
export interface LotMask {
  id?: number;
  application: string;
  customer_code?: number;
  item_code?: number;
  classification_type?: string;
  classification_code?: number;
  zero_on_year_change?: boolean;
  description: string;
  parts?: LotMaskPart[];
}
function parsePart(raw: unknown): LotMaskPart {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    sequence: parseNum(o, 'sequence', 'Sequence'),
    part_type: parseStr(o, 'part_type', 'PartType'),
    value: parseStr(o, 'value', 'Value'),
    size: parseNum(o, 'size', 'Size'),
    date_format: parseStr(o, 'date_format', 'DateFormat') || undefined,
    zero_on_year_change: parseBool(o, 'zero_on_year_change', 'ZeroOnYearChange'),
  };
}
function parseMask(raw: unknown): LotMask {
  const o = unwrapObject(raw);
  const parts = o['parts'] ?? o['Parts'];
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    application: parseStr(o, 'application', 'Application'),
    customer_code: parseNum(o, 'customer_code', 'CustomerCode') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode') || undefined,
    classification_type: parseStr(o, 'classification_type', 'ClassificationType') || undefined,
    classification_code: parseNum(o, 'classification_code', 'ClassificationCode') || undefined,
    zero_on_year_change: parseBool(o, 'zero_on_year_change', 'ZeroOnYearChange'),
    description: parseStr(o, 'description', 'Description'),
    parts: Array.isArray(parts) ? parts.map(parsePart) : [],
  };
}
export async function listLotMasks(): Promise<LotMask[]> {
  const { data } = await httpClient.get(`${BASE}/`);
  return unwrapArray(data).map(parseMask);
}
export async function getLotMask(id: number): Promise<LotMask> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return parseMask(data);
}
export async function createLotMask(dto: LotMask): Promise<LotMask> {
  const { data } = await httpClient.post(`${BASE}/`, {
    application: dto.application, description: dto.description,
    customer_code: dto.customer_code || null, item_code: dto.item_code || null,
    classification_type: dto.classification_type || '', classification_code: dto.classification_code || null,
    zero_on_year_change: !!dto.zero_on_year_change, created_by: currentUserId(),
  });
  return parseMask(data);
}
export async function deleteLotMask(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/${id}`);
}
export async function addLotMaskPart(maskId: number, part: LotMaskPart): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${maskId}/parts`, {
    sequence: part.sequence, part_type: part.part_type, value: part.value, size: part.size,
    date_format: part.date_format || '', zero_on_year_change: !!part.zero_on_year_change,
  });
  return unwrapObject(data);
}
/** Gera o próximo número de lote/série a partir da máscara. */
export async function generateLot(maskId: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/generate`, { mask_id: maskId });
  return unwrapObject(data);
}
