import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/quality';

/**
 * Qualidade (§5): pontos de inspeção + laudos.
 * ⚠️ Não montado na build demo atual (404) — segue o contrato da doc.
 */
export type InspectionType = 'RECEIVING' | 'IN_PROCESS' | 'FINAL';
export const INSPECTION_TYPES: InspectionType[] = ['RECEIVING', 'IN_PROCESS', 'FINAL'];

export type InspectionVerdict = 'APROVADO' | 'REPROVADO' | 'CONDICIONAL';
export const VERDICTS: InspectionVerdict[] = ['APROVADO', 'REPROVADO', 'CONDICIONAL'];

export interface InspectionPointDTO {
  id?: number;
  name: string;
  type: InspectionType;
  item_code?: number;
  operation_id?: number;
  description?: string;
}

export interface InspectionResultDTO {
  id?: number;
  inspection_point_id?: number;
  verdict: InspectionVerdict;
  quantity_inspected: number;
  quantity_approved: number;
  quantity_rejected: number;
  observation?: string;
}

function parsePoint(raw: unknown): InspectionPointDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    name: parseStr(o, 'name', 'Name'),
    type: (parseStr(o, 'type', 'Type') || 'IN_PROCESS') as InspectionType,
    item_code: parseNum(o, 'item_code', 'ItemCode') || undefined,
    description: parseStr(o, 'description', 'Description') || undefined,
  };
}
function parseResult(raw: unknown): InspectionResultDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    inspection_point_id: parseNum(o, 'inspection_point_id', 'InspectionPointID') || undefined,
    verdict: (parseStr(o, 'verdict', 'Verdict') || 'APROVADO') as InspectionVerdict,
    quantity_inspected: parseNum(o, 'quantity_inspected', 'QuantityInspected'),
    quantity_approved: parseNum(o, 'quantity_approved', 'QuantityApproved'),
    quantity_rejected: parseNum(o, 'quantity_rejected', 'QuantityRejected'),
    observation: parseStr(o, 'observation', 'Observation') || undefined,
  };
}

export async function listInspectionPoints(): Promise<InspectionPointDTO[]> {
  const { data } = await httpClient.get(`${BASE}/inspection-points`);
  return unwrapArray(data).map(parsePoint);
}
export async function createInspectionPoint(dto: InspectionPointDTO): Promise<InspectionPointDTO> {
  const { data } = await httpClient.post(`${BASE}/inspection-points`, dto);
  return parsePoint(data);
}
export async function addInspectionResult(pointId: number, dto: InspectionResultDTO): Promise<InspectionResultDTO> {
  const { data } = await httpClient.post(`${BASE}/inspection-points/${pointId}/results`, dto);
  return parseResult(data);
}
/** Retorna os laudos crus (a tela parseia inline com parseStr/parseNum). */
export async function listInspectionResults(pointId: number): Promise<Obj[]> {
  const { data } = await httpClient.get(`${BASE}/inspection-points/${pointId}/results`);
  return unwrapArray(data).map(unwrapObject);
}
