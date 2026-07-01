import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/routing';

/** Roteiro de Fabricação (§1) — operações, roteiros, rede de dependências, CPM. */
export type OpOrigin = 'INTERNA' | 'EXTERNA' | 'TERCEIROS';
export const OP_ORIGINS: OpOrigin[] = ['INTERNA', 'EXTERNA', 'TERCEIROS'];

export interface OperationDTO {
  id?: number;
  code?: number;
  name: string;
  description?: string;
  origin: OpOrigin;
  situation?: string;
  standard_time: number;
  setup_time?: number;
  is_active?: boolean;
}

export interface RouteDTO {
  id?: number;
  code?: number;
  item_code: number;
  mask?: string;
  alternative: number;
  description?: string;
  situation?: string;
  is_standard: boolean;
  is_active?: boolean;
}

export interface RouteOperationDTO {
  id?: number;
  route_id?: number;
  sequence: number;
  operation_id: number;
  work_center_id?: number;
  standard_time?: number;
  setup_time?: number;
  notes?: string;
}

export interface EdgeDTO {
  id?: number;
  predecessor_id: number;
  successor_id: number;
  overlap_pct: number;
}

export interface RouteDetail {
  route: RouteDTO;
  operations: RouteOperationDTO[];
  edges: EdgeDTO[];
}

export interface LeadTimeResult {
  lead_time_hours: number;
  critical_path: number[];
}

function parseOperation(raw: unknown): OperationDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseNum(o, 'code', 'Code') || undefined,
    name: parseStr(o, 'name', 'Name'),
    description: parseStr(o, 'description', 'Description') || undefined,
    origin: (parseStr(o, 'origin', 'Origin') || 'INTERNA') as OpOrigin,
    situation: parseStr(o, 'situation', 'Situation') || undefined,
    standard_time: parseNum(o, 'standard_time', 'StandardTime'),
    setup_time: parseNum(o, 'setup_time', 'SetupTime'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}
function parseRoute(raw: unknown): RouteDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseNum(o, 'code', 'Code') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    alternative: parseNum(o, 'alternative', 'Alternative') || 1,
    description: parseStr(o, 'description', 'Description') || undefined,
    situation: parseStr(o, 'situation', 'Situation') || undefined,
    is_standard: parseBool(o, 'is_standard', 'IsStandard'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}
function parseRouteOp(raw: unknown): RouteOperationDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    route_id: parseNum(o, 'route_id', 'RouteID') || undefined,
    sequence: parseNum(o, 'sequence', 'Sequence'),
    operation_id: parseNum(o, 'operation_id', 'OperationID'),
    work_center_id: parseNum(o, 'work_center_id', 'WorkCenterID') || undefined,
    standard_time: parseNum(o, 'standard_time', 'StandardTime') || undefined,
    setup_time: parseNum(o, 'setup_time', 'SetupTime') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || undefined,
  };
}
function parseEdge(raw: unknown): EdgeDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    predecessor_id: parseNum(o, 'predecessor_id', 'PredecessorID'),
    successor_id: parseNum(o, 'successor_id', 'SuccessorID'),
    overlap_pct: parseNum(o, 'overlap_pct', 'OverlapPct'),
  };
}

// ── Operações (biblioteca) ──
export async function listOperations(): Promise<OperationDTO[]> {
  const { data } = await httpClient.get(`${BASE}/operations`);
  return unwrapArray(data).map(parseOperation);
}
export async function createOperation(dto: OperationDTO): Promise<OperationDTO> {
  const { data } = await httpClient.post(`${BASE}/operations`, dto);
  return parseOperation(data);
}
export async function updateOperation(id: number, dto: OperationDTO): Promise<OperationDTO> {
  const { data } = await httpClient.put(`${BASE}/operations/${id}`, dto);
  return parseOperation(data);
}
export async function deleteOperation(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/operations/${id}`);
}

// ── Roteiros ──
export async function listRoutes(itemCode: number): Promise<RouteDTO[]> {
  const { data } = await httpClient.get(`${BASE}/routes`, { params: { item_code: itemCode } });
  return unwrapArray(data).map(parseRoute);
}
export async function createRoute(dto: RouteDTO): Promise<RouteDTO> {
  const { data } = await httpClient.post(`${BASE}/routes`, dto);
  return parseRoute(data);
}
export async function deleteRoute(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/routes/${id}`);
}
export async function getRouteDetail(id: number): Promise<RouteDetail> {
  const { data } = await httpClient.get(`${BASE}/routes/${id}`);
  const o = unwrapObject(data);
  return {
    route: parseRoute(o['route'] ?? o['Route'] ?? o),
    operations: unwrapArray(o['operations'] ?? o['Operations']).map(parseRouteOp),
    edges: unwrapArray(o['network'] ?? o['Network'] ?? o['edges'] ?? o['Edges']).map(parseEdge),
  };
}

// ── Operações do roteiro ──
export async function addRouteOperation(routeId: number, dto: RouteOperationDTO): Promise<RouteOperationDTO> {
  const { data } = await httpClient.post(`${BASE}/route-operations/${routeId}`, dto);
  return parseRouteOp(data);
}
export async function removeRouteOperation(routeId: number, opId: number): Promise<void> {
  await httpClient.delete(`${BASE}/route-operations/${routeId}/${opId}`);
}

// ── Rede de dependências ──
export async function createEdge(routeId: number, dto: EdgeDTO): Promise<EdgeDTO> {
  const { data } = await httpClient.post(`${BASE}/routes/${routeId}/edges`, dto);
  return parseEdge(data);
}
export async function deleteEdge(routeId: number, edge: { predecessor_id: number; successor_id: number }): Promise<void> {
  await httpClient.delete(`${BASE}/routes/${routeId}/edges`, { data: edge });
}

// ── Lead time (CPM) ──
export async function getLeadTime(routeId: number): Promise<LeadTimeResult> {
  const { data } = await httpClient.get(`${BASE}/routes/${routeId}/lead-time`);
  const o = unwrapObject(data);
  const cp = o['critical_path'] ?? o['CriticalPath'];
  return {
    lead_time_hours: parseNum(o, 'lead_time_hours', 'total_hours', 'TotalHours', 'LeadTimeHours'),
    critical_path: Array.isArray(cp) ? (cp as number[]) : [],
  };
}
