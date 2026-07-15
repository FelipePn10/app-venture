import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/**
 * Motivos de Restrição (`/api/restriction-reason`) — tabela de apoio das Restrições
 * (ver configurador/VPRO0800). `situation` ATIVO/INATIVO.
 */
const BASE = '/api/restriction-reason';

export interface RestrictionReason {
  code?: number;
  description: string;
  situation: string;
}
function parse(raw: unknown): RestrictionReason {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code') || undefined,
    description: parseStr(o, 'description', 'Description'),
    situation: parseStr(o, 'situation', 'Situation') || 'ATIVO',
  };
}
export async function listRestrictionReasons(): Promise<RestrictionReason[]> {
  const { data } = await httpClient.get(`${BASE}/list`);
  return unwrapArray(data).map(parse);
}
export async function getRestrictionReason(code: number): Promise<RestrictionReason> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parse(data);
}
export async function createRestrictionReason(dto: RestrictionReason): Promise<RestrictionReason> {
  const { data } = await httpClient.post(`${BASE}/create`, { description: dto.description, situation: dto.situation });
  return parse(data);
}
export async function updateRestrictionReason(code: number, dto: RestrictionReason): Promise<RestrictionReason> {
  const { data } = await httpClient.put(`${BASE}/${code}`, { code, description: dto.description, situation: dto.situation });
  return parse(data);
}
export async function deleteRestrictionReason(code: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}`);
}
