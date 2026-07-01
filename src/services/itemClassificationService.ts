import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/items/classifications';

// ─── Máscaras ───────────────────────────────────────────────────────────────

export interface ClassificationMaskDTO {
  code?: number;
  description: string;
  mask?: string;
  is_active?: boolean;
}

function parseMask(raw: unknown): ClassificationMaskDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code', 'id', 'ID'),
    description: parseStr(o, 'description', 'Description'),
    mask: parseStr(o, 'mask', 'Mask'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

export async function listMasks(includeInactive = false): Promise<ClassificationMaskDTO[]> {
  const { data } = await httpClient.get(`${BASE}/masks/`, includeInactive ? { params: { only_active: 'false' } } : undefined);
  return unwrapArray(data).map(parseMask);
}
export async function createMask(dto: ClassificationMaskDTO): Promise<ClassificationMaskDTO> {
  const { data } = await httpClient.post(`${BASE}/masks/`, dto);
  return parseMask(data);
}
export async function updateMask(dto: ClassificationMaskDTO): Promise<ClassificationMaskDTO> {
  const { data } = await httpClient.put(`${BASE}/masks/`, dto);
  return parseMask(data);
}
export async function listMaskClassifications(maskId: number): Promise<ClassificationDTO[]> {
  const { data } = await httpClient.get(`${BASE}/masks/${maskId}/items`);
  return unwrapArray(data).map(parseClassification);
}

// ─── Classificações ─────────────────────────────────────────────────────────

export interface ClassificationDTO {
  code: string;
  mask_code: number;
  description: string;
  parent_code?: string;
  level?: number;
}

function parseClassification(raw: unknown): ClassificationDTO {
  const o = unwrapObject(raw);
  return {
    code: parseStr(o, 'code', 'Code'),
    mask_code: parseNum(o, 'mask_code', 'MaskCode'),
    description: parseStr(o, 'description', 'Description'),
    parent_code: parseStr(o, 'parent_code', 'ParentCode'),
    level: parseNum(o, 'level', 'Level'),
  };
}

export async function createClassification(dto: ClassificationDTO): Promise<ClassificationDTO> {
  const { data } = await httpClient.post(`${BASE}/`, dto);
  return parseClassification(data);
}
export async function updateClassification(dto: ClassificationDTO): Promise<ClassificationDTO> {
  const { data } = await httpClient.put(`${BASE}/`, dto);
  return parseClassification(data);
}
export async function getClassification(maskCode: number, code: string): Promise<ClassificationDTO> {
  const { data } = await httpClient.get(`${BASE}/${maskCode}/${encodeURIComponent(code)}`);
  return parseClassification(data);
}
export async function listClassificationChildren(parentId: string): Promise<ClassificationDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${encodeURIComponent(parentId)}/children`);
  return unwrapArray(data).map(parseClassification);
}
