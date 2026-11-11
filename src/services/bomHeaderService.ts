import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/**
 * Versões da estrutura (`/api/bom-headers`): cabeçalho da BOM com tipo (MBOM de
 * fabricação / EBOM de engenharia), versão automática e situação. Aprovar grava a
 * foto das linhas e torna obsoleta a aprovada anterior; a MBOM aprovada é a que
 * libera o item para produzir.
 */
const BASE = '/api/bom-headers';

export type BomStatus = 'DRAFT' | 'APPROVED' | 'OBSOLETE';
export interface BomVersion {
  id: number; mask?: string; bom_type: 'MBOM' | 'EBOM'; version: number; status: BomStatus;
  valid_from?: string; approved_at?: string; obsoleted_at?: string; created_at?: string;
}
export interface BomChange { kind: 'INCLUIDO' | 'REMOVIDO' | 'ALTERADO'; child_code: string; child_name: string; sequence: number; detail: string }

function parse(raw: unknown): BomVersion {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id'), mask: parseStr(o, 'mask') || undefined, bom_type: (parseStr(o, 'bom_type') || 'MBOM') as BomVersion['bom_type'],
    version: parseNum(o, 'version'), status: (parseStr(o, 'status') || 'DRAFT') as BomStatus,
    valid_from: parseStr(o, 'valid_from') || undefined, approved_at: parseStr(o, 'approved_at') || undefined,
    obsoleted_at: parseStr(o, 'obsoleted_at') || undefined, created_at: parseStr(o, 'created_at') || undefined,
  };
}
export async function listBomVersions(itemCode: string): Promise<BomVersion[]> {
  const { data } = await httpClient.get(`${BASE}/item/${encodeURIComponent(itemCode)}`);
  return unwrapArray(data).map(parse);
}
export async function createBomVersion(itemCode: string, bomType: 'MBOM' | 'EBOM', mask?: string, validFrom?: string): Promise<BomVersion> {
  const { data } = await httpClient.post(`${BASE}/`, { item_code: itemCode, mask: mask || null, bom_type: bomType, valid_from: validFrom || null });
  return parse(data);
}
export async function setBomVersionStatus(id: number, status: BomStatus): Promise<BomVersion> {
  const { data } = await httpClient.put(`${BASE}/${id}/status`, { id, status });
  return parse(data);
}
export async function bomVersionChanges(id: number): Promise<BomChange[]> {
  const { data } = await httpClient.get(`${BASE}/${id}/changes`);
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return { kind: parseStr(o, 'kind') as BomChange['kind'], child_code: parseStr(o, 'child_code') || String(parseNum(o, 'legacy_child_code')), child_name: parseStr(o, 'child_name'), sequence: parseNum(o, 'sequence'), detail: parseStr(o, 'detail') };
  });
}
