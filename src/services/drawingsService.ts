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
  item_code?: string;
  description: string;
  uom?: string;
  weight?: number;
  material_spec?: string;
  creation_date?: string;
  is_active?: boolean;
}
export interface DrawingDistribution { id?: number; recipient: string; distributed_at?: string; notes?: string }
export interface DrawingCharacteristicLink { id?: number; characteristic_id: number; operator: string; variable_id?: number }
/** Condições aceitas pelo banco (CHECK de drawing_characteristics), com o rótulo de tela. */
export const OPERADORES_CARACTERISTICA: { value: string; label: string }[] = [
  { value: 'EQUAL', label: 'Igual a' }, { value: 'DIFFERENT', label: 'Diferente de' },
  { value: 'GREATER', label: 'Maior que' }, { value: 'LESS', label: 'Menor que' },
  { value: 'BELONGS', label: 'Pertence a' }, { value: 'NOT_BELONGS', label: 'Não pertence a' },
];
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
  composite_code?: string;
  distributions?: DrawingDistribution[];
}
function parseDrawing(raw: unknown): Drawing {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined, code: parseStr(o, 'code', 'Code'), digit: parseStr(o, 'digit', 'Digit') || undefined,
    format: parseStr(o, 'format', 'Format') || undefined, model: parseStr(o, 'model', 'Model') || undefined,
    item_code: parseStr(o, 'item_code', 'ItemCode') || undefined, description: parseStr(o, 'description', 'Description'),
    uom: parseStr(o, 'uom', 'UOM') || undefined, weight: parseNum(o, 'weight', 'Weight') || undefined, material_spec: parseStr(o, 'material_spec', 'MaterialSpec') || undefined,
    creation_date: parseStr(o, 'creation_date', 'CreationDate').slice(0, 10) || undefined,
    is_active: o['is_active'] === undefined && o['IsActive'] === undefined ? true : parseBool(o, 'is_active', 'IsActive'),
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
    composite_code: parseStr(o, 'composite_code', 'CompositeCode') || undefined,
    distributions: unwrapArray(o['distributions'] ?? o['Distributions']).map((d) => {
      const x = unwrapObject(d);
      return {
        id: parseNum(x, 'id', 'ID') || undefined, recipient: parseStr(x, 'recipient', 'Recipient'),
        distributed_at: parseStr(x, 'distributed_at', 'DistributedAt').slice(0, 10) || undefined, notes: parseStr(x, 'notes', 'Notes') || undefined,
      };
    }),
  };
}
export async function listDrawings(params?: Obj): Promise<Drawing[]> { const { data } = await httpClient.get(`${BASE}/`, { params }); return unwrapArray(data).map(parseDrawing); }
export async function getDrawing(id: number): Promise<Drawing> { const { data } = await httpClient.get(`${BASE}/${id}`); return parseDrawing(data); }
function drawingBody(dto: Drawing) {
  const item = Number(dto.item_code);
  return {
    code: dto.code.trim(), digit: dto.digit ?? '', format: dto.format ?? '', model: dto.model ?? '', item_code: item > 0 ? item : null,
    description: dto.description.trim(), uom: dto.uom ?? '', weight: dto.weight ?? null, material_spec: dto.material_spec ?? '',
    creation_date: dto.creation_date ?? '',
  };
}
export async function createDrawing(dto: Drawing): Promise<Drawing> {
  const { data } = await httpClient.post(`${BASE}/`, { ...drawingBody(dto), created_by: currentUserId() });
  return parseDrawing(data);
}
/** O PUT substitui o desenho inteiro: a tela manda todos os campos do formulário. */
export async function updateDrawing(id: number, dto: Drawing): Promise<Drawing> {
  const { data } = await httpClient.put(`${BASE}/${id}`, { id, ...drawingBody(dto) });
  return parseDrawing(data);
}
export async function deleteDrawing(id: number): Promise<void> { await httpClient.delete(`${BASE}/${id}`); }
export async function listRevisions(drawingId: number): Promise<DrawingRevision[]> { const { data } = await httpClient.get(`${BASE}/${drawingId}/revisions`); return unwrapArray(data).map(parseRev); }
function revisionBody(dto: DrawingRevision) {
  return {
    revision: dto.revision.trim(), start_date: dto.start_date ?? '', end_date: dto.end_date ?? '', material_spec: dto.material_spec ?? '', reason: dto.reason ?? '',
    approved_by: dto.approved_by ?? '', approval_date: dto.approval_date ?? '', is_current: !!dto.is_current,
  };
}
export async function addRevision(drawingId: number, dto: DrawingRevision): Promise<DrawingRevision> {
  const { data } = await httpClient.post(`${BASE}/${drawingId}/revisions`, revisionBody(dto));
  return parseRev(data);
}
export async function updateRevision(revisionId: number, dto: DrawingRevision): Promise<DrawingRevision> {
  const { data } = await httpClient.put(`${BASE}/revisions/${revisionId}`, { id: revisionId, ...revisionBody(dto) });
  return parseRev(data);
}
export async function deleteRevision(revisionId: number): Promise<void> { await httpClient.delete(`${BASE}/revisions/${revisionId}`); }
export async function addDistribution(revisionId: number, dto: DrawingDistribution): Promise<void> {
  await httpClient.post(`${BASE}/revisions/${revisionId}/distributions`, { recipient: dto.recipient.trim(), distributed_at: dto.distributed_at ?? '', notes: dto.notes ?? '' });
}
export async function deleteDistribution(distributionId: number): Promise<void> { await httpClient.delete(`${BASE}/distributions/${distributionId}`); }
export async function listDrawingCharacteristics(drawingId: number): Promise<DrawingCharacteristicLink[]> {
  const { data } = await httpClient.get(`${BASE}/${drawingId}/characteristics`);
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return {
      id: parseNum(o, 'id', 'ID') || undefined, characteristic_id: parseNum(o, 'characteristic_id', 'CharacteristicID'),
      operator: parseStr(o, 'operator', 'Operator') || 'EQUAL', variable_id: parseNum(o, 'variable_id', 'VariableID') || undefined,
    };
  });
}
export async function addDrawingCharacteristic(drawingId: number, dto: DrawingCharacteristicLink): Promise<void> {
  await httpClient.post(`${BASE}/${drawingId}/characteristics`, { characteristic_id: dto.characteristic_id, operator: dto.operator, variable_id: dto.variable_id ?? null });
}
export async function deleteDrawingCharacteristic(linkId: number): Promise<void> { await httpClient.delete(`${BASE}/characteristics/${linkId}`); }

/** Código de desenho do item (por máscara, quando o item é configurado). Sem cadastro: `null`. */
export async function getItemDrawingCode(itemCode: string, mask = ''): Promise<string | null> {
  try {
    const { data } = await httpClient.get(`${BASE}/item-code/${encodeURIComponent(itemCode)}`, { params: mask ? { mask } : undefined });
    return parseStr(unwrapObject(data), 'drawing_code', 'DrawingCode') || null;
  } catch (e) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) return null;
    throw e;
  }
}
export async function saveItemDrawingCode(itemCode: string, mask: string, drawingCode: string): Promise<void> {
  await httpClient.put(`${BASE}/item-code`, { item_code: Number(itemCode), mask, drawing_code: drawingCode.trim() });
}
/** Parâmetro 8 da engenharia: a nova revisão do desenho replica para as estruturas e roteiros do item. */
export async function getDrawingParameters(): Promise<{ replicate_drawing_revision: boolean }> {
  const { data } = await httpClient.get(`${BASE}/manufacturing-parameters`);
  const o = unwrapObject(data);
  return { replicate_drawing_revision: parseBool(o, 'parameter_8_replicate_drawing_revision', 'replicate_drawing_revision') };
}
export async function saveDrawingParameters(replicate: boolean): Promise<void> {
  await httpClient.put(`${BASE}/manufacturing-parameters`, { replicate_drawing_revision: replicate });
}
