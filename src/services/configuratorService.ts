import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/restriction';

export type RestrictionOperator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'NOT_IN';
export const OPERATORS: RestrictionOperator[] = ['==', '!=', '>', '<', '>=', '<=', 'IN', 'NOT_IN'];

export interface RestrictionDTO {
  id?: number;
  name: string;
  attribute: string;
  operator: RestrictionOperator;
  value: string;
}

function parseRestriction(raw: unknown): RestrictionDTO {
  const o = unwrapObject(raw);
  const op = parseStr(o, 'operator', 'Operator') || '==';
  return {
    id: parseNum(o, 'id', 'ID', 'code', 'Code'),
    name: parseStr(o, 'name', 'Name'),
    attribute: parseStr(o, 'attribute', 'Attribute', 'characteristic', 'Characteristic'),
    operator: op as RestrictionOperator,
    value: parseStr(o, 'value', 'Value'),
  };
}

export async function listRestrictions(): Promise<RestrictionDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list`);
  return unwrapArray(data).map(parseRestriction);
}
export async function createRestriction(dto: RestrictionDTO): Promise<RestrictionDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseRestriction(data);
}
export async function deleteRestriction(id: number): Promise<void> {
  await httpClient.patch(`${BASE}/${id}/deactivate`, {});
}
export async function evaluateRestriction(id: number, attributes: Record<string, unknown>): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/evaluate`, { restriction_code: id, attributes });
  return unwrapObject(data);
}
