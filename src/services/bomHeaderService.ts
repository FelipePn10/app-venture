import { httpClient, parseStr, parseNum, currentUserId, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/**
 * Cabeçalhos de Estrutura (BOM Headers, `/api/bom-headers`) — versão + status + tipo por
 * item/máscara. As **linhas** da estrutura vivem em `item_structures` (VENT0210); aqui é o
 * cabeçalho: versão auto-incrementada, `bom_type` EBOM|MBOM, `status` DRAFT→APPROVED→OBSOLETE.
 */
const BASE = '/api/bom-headers';

export interface BomHeader {
  id?: number;
  item_code: number;
  mask?: string;
  bom_type: string;
  version?: number;
  status?: string;
  valid_from?: string;
}
function parse(raw: unknown): BomHeader {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    bom_type: parseStr(o, 'bom_type', 'BomType') || 'MBOM',
    version: parseNum(o, 'version', 'Version') || undefined,
    status: parseStr(o, 'status', 'Status') || 'DRAFT',
    valid_from: parseStr(o, 'valid_from', 'ValidFrom') || undefined,
  };
}
export async function listBomHeaders(itemCode: number): Promise<BomHeader[]> {
  const { data } = await httpClient.get(`${BASE}/item/${itemCode}`);
  return unwrapArray(data).map(parse);
}
export async function getBomHeader(id: number): Promise<BomHeader> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return parse(data);
}
export async function createBomHeader(dto: BomHeader): Promise<BomHeader> {
  const { data } = await httpClient.post(`${BASE}/`, {
    item_code: dto.item_code, mask: dto.mask || null, bom_type: dto.bom_type,
    valid_from: dto.valid_from || null, created_by: currentUserId(),
  });
  return parse(data);
}
/** Aprova/obsoleta o cabeçalho (DRAFT | APPROVED | OBSOLETE). */
export async function updateBomHeaderStatus(id: number, status: string): Promise<BomHeader> {
  const { data } = await httpClient.put(`${BASE}/${id}/status`, { id, status });
  return parse(data);
}
