import { httpClient, parseStr, parseNum, parseBool, currentUserId, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Máscaras de Lote/Série (`/api/lot-masks`) — define como o número de lote/série é
 * composto por **partes** (caractere fixo, data, sequencial numérico/caractere) e gera
 * o próximo lote. `application` (ex.: por cliente/item/classificação).
 */
const BASE = '/api/lot-masks';
export const PART_TYPES = ['CARACTER', 'DATA', 'SEQ_NUMERICA', 'SEQ_CARACTER'] as const;
/** Aplicações aceitas pelo backend (lot_mask_uc): fora delas o cadastro é recusado. */
export const APPLICATIONS = ['SUPRIMENTOS', 'PRODUCAO', 'VENDAS', 'EXPEDICAO', 'GERAL'] as const;

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
  item_code?: string;
  classification_type?: string;
  classification_code?: number;
  zero_on_year_change?: boolean;
  is_active?: boolean;
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
    item_code: parseStr(o, 'item_code', 'ItemCode') || undefined,
    classification_type: parseStr(o, 'classification_type', 'ClassificationType') || undefined,
    classification_code: parseNum(o, 'classification_code', 'ClassificationCode') || undefined,
    zero_on_year_change: parseBool(o, 'zero_on_year_change', 'ZeroOnYearChange'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
    description: parseStr(o, 'description', 'Description'),
    parts: Array.isArray(parts) ? parts.map(parsePart) : [],
  };
}
/** Lista as máscaras; desativada não gera lote e só aparece quando pedida. */
export async function listLotMasks(onlyActive = true): Promise<LotMask[]> {
  const { data } = await httpClient.get(`${BASE}/`, { params: onlyActive ? { only_active: 'true' } : {} });
  return unwrapArray(data).map(parseMask);
}
export async function getLotMask(id: number): Promise<LotMask> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return parseMask(data);
}
export async function createLotMask(dto: LotMask): Promise<LotMask> {
  const { data } = await httpClient.post(`${BASE}/`, { ...maskBody(dto), created_by: currentUserId() });
  return parseMask(data);
}
function maskBody(dto: LotMask): Obj {
  return {
    application: dto.application, description: dto.description,
    customer_code: dto.customer_code || null, item_code: dto.item_code || null,
    classification_type: dto.classification_type || '', classification_code: dto.classification_code || null,
    zero_on_year_change: !!dto.zero_on_year_change,
  };
}
export async function updateLotMask(id: number, dto: LotMask): Promise<LotMask> {
  const { data } = await httpClient.put(`${BASE}/${id}`, maskBody(dto));
  return parseMask(data);
}
export async function deleteLotMask(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/${id}`);
}
export async function addLotMaskPart(maskId: number, part: LotMaskPart): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${maskId}/parts`, partBody(part));
  return unwrapObject(data);
}
function partBody(part: LotMaskPart): Obj {
  return {
    sequence: part.sequence, part_type: part.part_type, value: part.value, size: part.size,
    date_format: part.date_format || '', zero_on_year_change: !!part.zero_on_year_change,
  };
}
export async function updateLotMaskPart(partId: number, part: LotMaskPart): Promise<Obj> {
  const { data } = await httpClient.put(`${BASE}/parts/${partId}`, partBody(part));
  return unwrapObject(data);
}
/** Desativa a parte (o backend mantém o histórico; ela deixa de compor o lote). */
export async function deleteLotMaskPart(partId: number): Promise<void> {
  await httpClient.delete(`${BASE}/parts/${partId}`);
}
/**
 * Gera o próximo número de lote/série a partir da máscara.
 *
 * O DTO chama o campo de `lot_mask_id`. Enviado como `mask_id`, o Go descartava
 * em silêncio e o lote saía sem seguir a máscara escolhida.
 */
export interface GeneratedLot { lot_mask_id: number; code: string }
function parseGenerated(raw: unknown): GeneratedLot {
  const o = unwrapObject(raw);
  return { lot_mask_id: parseNum(o, 'lot_mask_id', 'LotMaskID'), code: parseStr(o, 'code', 'Code') };
}
export async function generateLot(maskId: number): Promise<GeneratedLot> {
  const { data } = await httpClient.post(`${BASE}/generate`, { lot_mask_id: maskId });
  return parseGenerated(data);
}
/**
 * Gera pelo contexto, como o recebimento e a produção fazem: o backend escolhe a
 * máscara mais específica da aplicação (item, depois cliente, depois a geral).
 */
export async function generateLotByContext(application: string, itemCode?: string, customerCode?: number): Promise<GeneratedLot> {
  const { data } = await httpClient.post(`${BASE}/generate`, {
    application, item_code: itemCode || null, customer_code: customerCode || null,
  });
  return parseGenerated(data);
}
