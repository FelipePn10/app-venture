import { httpClient, parseStr, parseNum, parseBool, currentUserId, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Desenhos (`/api/drawings`) — cadastro de desenhos técnicos com código/dígito/formato,
 * item vinculado, revisões (vigência, aprovação, distribuições) e características.
 */
const BASE = '/api/drawings';

export interface Drawing {
  id?: number;
  code: string;
  digit?: string;
  format?: string;
  model?: string;
  item_code?: number;
  description: string;
  uom?: string;
  weight?: number;
  material_spec?: string;
}
export interface DrawingRevision {
  id?: number;
  revision: string;
  start_date?: string;
  end_date?: string;
  material_spec?: string;
  reason?: string;
  approved_by?: string;
  approval_date?: string;
  is_current?: boolean;
}
function parseDrawing(raw: unknown): Drawing {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined, code: parseStr(o, 'code', 'Code'), digit: parseStr(o, 'digit', 'Digit') || undefined,
    format: parseStr(o, 'format', 'Format') || undefined, model: parseStr(o, 'model', 'Model') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode') || undefined, description: parseStr(o, 'description', 'Description'),
    uom: parseStr(o, 'uom', 'UOM') || undefined, weight: parseNum(o, 'weight', 'Weight') || undefined, material_spec: parseStr(o, 'material_spec', 'MaterialSpec') || undefined,
  };
}
function parseRev(raw: unknown): DrawingRevision {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined, revision: parseStr(o, 'revision', 'Revision'),
    start_date: parseStr(o, 'start_date', 'StartDate') || undefined, end_date: parseStr(o, 'end_date', 'EndDate') || undefined,
    material_spec: parseStr(o, 'material_spec', 'MaterialSpec') || undefined, reason: parseStr(o, 'reason', 'Reason') || undefined,
    approved_by: parseStr(o, 'approved_by', 'ApprovedBy') || undefined, approval_date: parseStr(o, 'approval_date', 'ApprovalDate') || undefined,
    is_current: parseBool(o, 'is_current', 'IsCurrent'),
  };
}
export async function listDrawings(params?: Obj): Promise<Drawing[]> { const { data } = await httpClient.get(`${BASE}/`, { params }); return unwrapArray(data).map(parseDrawing); }
export async function getDrawing(id: number): Promise<Drawing> { const { data } = await httpClient.get(`${BASE}/${id}`); return parseDrawing(data); }
export async function createDrawing(dto: Drawing): Promise<Drawing> {
  const { data } = await httpClient.post(`${BASE}/`, {
    code: dto.code, digit: dto.digit ?? '', format: dto.format ?? '', model: dto.model ?? '', item_code: dto.item_code ?? null,
    description: dto.description, uom: dto.uom ?? '', weight: dto.weight ?? null, material_spec: dto.material_spec ?? '', created_by: currentUserId(),
  });
  return parseDrawing(data);
}
export async function deleteDrawing(id: number): Promise<void> { await httpClient.delete(`${BASE}/${id}`); }
export async function listRevisions(drawingId: number): Promise<DrawingRevision[]> { const { data } = await httpClient.get(`${BASE}/${drawingId}/revisions`); return unwrapArray(data).map(parseRev); }
export async function addRevision(drawingId: number, dto: DrawingRevision): Promise<DrawingRevision> {
  const { data } = await httpClient.post(`${BASE}/${drawingId}/revisions`, {
    revision: dto.revision, start_date: dto.start_date ?? null, material_spec: dto.material_spec ?? '', reason: dto.reason ?? '',
    approved_by: dto.approved_by ?? '', approval_date: dto.approval_date ?? null, is_current: !!dto.is_current, updated_by: currentUserId(),
  });
  return parseRev(data);
}
export async function listDrawingCharacteristics(drawingId: number): Promise<Obj[]> { const { data } = await httpClient.get(`${BASE}/${drawingId}/characteristics`); return unwrapArray(data).map((r) => unwrapObject(r)); }
