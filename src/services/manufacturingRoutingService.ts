import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, currentUserId, type Obj } from '@/services/fiscalShared';

const BASE = '/api/routing';

/** Roteiro de Fabricação (§1) — operações, roteiros, rede de dependências, CPM. */
export type OpOrigin = 'INTERNA' | 'EXTERNA' | 'TERCEIROS';
export const OP_ORIGINS: OpOrigin[] = ['INTERNA', 'EXTERNA', 'TERCEIROS'];

/** Unidade em que os tempos da operação foram cadastrados. */
export type TimeUnit = 'MIN' | 'HORA' | 'DIA';
export const TIME_UNITS: { value: TimeUnit; label: string }[] = [
  { value: 'MIN', label: 'Minutos' },
  { value: 'HORA', label: 'Horas' },
  { value: 'DIA', label: 'Dias' },
];

/**
 * O que é remetido ao terceiro quando a operação sai da fábrica: os itens da
 * demanda, o próprio item da ordem, um item genérico de serviço, ou nada.
 */
export const THIRD_PARTY_REMITTANCES = ['DEMAND_ITEMS', 'ORDER_ITEM', 'GENERIC', 'NONE'] as const;

export interface OperationDTO {
  id?: number;
  code?: number;
  name: string;
  description?: string;
  origin: OpOrigin;
  situation?: string;
  default_work_center_id?: number;
  /** Tempo achatado legado; quando zero, o cálculo usa `run_time`. */
  standard_time: number;
  setup_time?: number;

  /**
   * Modelo de tempo completo, no padrão que SAP e TOTVS usam:
   * a preparação é por lote, o tempo de máquina e o de mão de obra são por
   * `run_base_qty` peças, e fila/espera/movimentação são fixos por lote.
   * Sem separar isso, o tempo de um lote de 1 peça e o de 500 saem iguais.
   */
  run_time?: number;
  labor_time?: number;
  run_base_qty?: number;
  queue_time?: number;
  wait_time?: number;
  move_time?: number;
  crew_size?: number;
  time_unit?: TimeUnit;

  /** Terceirização — vale para origem EXTERNA/TERCEIROS. */
  supplier_id?: number;
  service_item_code?: string;
  cost_per_unit?: number;
  lead_time_days?: number;
  third_party_remittance?: string;

  is_active?: boolean;
}

export interface RouteDTO {
  id?: number;
  code?: number;
  item_code: string;
  mask?: string;
  alternative: number;
  description?: string;
  situation?: string;
  is_standard: boolean;
  /** Vigência do roteiro: fora dela o MRP não deve usá-lo. */
  valid_from?: string;
  valid_to?: string;
  is_active?: boolean;
}

/** Tempos já resolvidos pelo backend, em horas. */
export interface OperationTimeBreakdown {
  setup_hours: number;
  run_hours: number;
  labor_hours: number;
  run_base_qty: number;
  queue_hours: number;
  wait_hours: number;
  move_hours: number;
  crew_size: number;
}

export interface RouteOperationDTO {
  id?: number;
  route_id?: number;
  sequence: number;
  operation_id: number;
  operation_name?: string;
  work_center_id?: number;
  work_center_name?: string;
  standard_time?: number;
  setup_time?: number;
  effective_std_time?: number;
  effective_setup?: number;
  /** Tempos resolvidos: o que a operação realmente consome. */
  eff_time?: OperationTimeBreakdown;
  /** Sobreposições do modelo de tempo — vazio herda da operação. */
  run_time?: number;
  labor_time?: number;
  run_base_qty?: number;
  queue_time?: number;
  wait_time?: number;
  move_time?: number;
  crew_size?: number;
  time_unit?: TimeUnit;
  /** Terceirização — vazio herda da operação. */
  supplier_id?: number;
  service_item_code?: string;
  cost_per_unit?: number;
  lead_time_days?: number;
  third_party_remittance?: string;
  situation?: string;
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
    default_work_center_id: parseNum(o, 'default_work_center_id', 'DefaultWorkCenterID') || undefined,
    standard_time: parseNum(o, 'standard_time', 'StandardTime'),
    setup_time: parseNum(o, 'setup_time', 'SetupTime'),
    run_time: parseNum(o, 'run_time', 'RunTime'),
    labor_time: parseNum(o, 'labor_time', 'LaborTime'),
    run_base_qty: parseNum(o, 'run_base_qty', 'RunBaseQty') || 1,
    queue_time: parseNum(o, 'queue_time', 'QueueTime'),
    wait_time: parseNum(o, 'wait_time', 'WaitTime'),
    move_time: parseNum(o, 'move_time', 'MoveTime'),
    crew_size: parseNum(o, 'crew_size', 'CrewSize') || 1,
    time_unit: (parseStr(o, 'time_unit', 'TimeUnit') || 'HORA') as TimeUnit,
    supplier_id: parseNum(o, 'supplier_id', 'SupplierID') || undefined,
    service_item_code: parseStr(o, 'service_item_code', 'ServiceItemCode') || undefined,
    cost_per_unit: parseNum(o, 'cost_per_unit', 'CostPerUnit') || undefined,
    lead_time_days: parseNum(o, 'lead_time_days', 'LeadTimeDays') || undefined,
    third_party_remittance: parseStr(o, 'third_party_remittance', 'ThirdPartyRemittance') || undefined,
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}
function parseRoute(raw: unknown): RouteDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseNum(o, 'code', 'Code') || undefined,
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    alternative: parseNum(o, 'alternative', 'Alternative') || 1,
    description: parseStr(o, 'description', 'Description') || undefined,
    situation: parseStr(o, 'situation', 'Situation') || undefined,
    is_standard: parseBool(o, 'is_standard', 'IsStandard'),
    valid_from: parseStr(o, 'valid_from', 'ValidFrom') || undefined,
    valid_to: parseStr(o, 'valid_to', 'ValidTo') || undefined,
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
    operation_name: parseStr(o, 'operation_name', 'OperationName') || undefined,
    work_center_name: parseStr(o, 'work_center_name', 'WorkCenterName') || undefined,
    standard_time: parseNum(o, 'standard_time', 'StandardTime') || undefined,
    setup_time: parseNum(o, 'setup_time', 'SetupTime') || undefined,
    effective_std_time: parseNum(o, 'effective_std_time', 'EffectiveStdTime') || undefined,
    effective_setup: parseNum(o, 'effective_setup', 'EffectiveSetup') || undefined,
    eff_time: parseBreakdown(o['eff_time'] ?? o['EffTime']),
    run_time: parseNum(o, 'run_time', 'RunTime') || undefined,
    labor_time: parseNum(o, 'labor_time', 'LaborTime') || undefined,
    run_base_qty: parseNum(o, 'run_base_qty', 'RunBaseQty') || undefined,
    queue_time: parseNum(o, 'queue_time', 'QueueTime') || undefined,
    wait_time: parseNum(o, 'wait_time', 'WaitTime') || undefined,
    move_time: parseNum(o, 'move_time', 'MoveTime') || undefined,
    crew_size: parseNum(o, 'crew_size', 'CrewSize') || undefined,
    time_unit: (parseStr(o, 'time_unit', 'TimeUnit') || undefined) as TimeUnit | undefined,
    supplier_id: parseNum(o, 'supplier_id', 'SupplierID') || undefined,
    service_item_code: parseStr(o, 'service_item_code', 'ServiceItemCode') || undefined,
    cost_per_unit: parseNum(o, 'cost_per_unit', 'CostPerUnit') || undefined,
    lead_time_days: parseNum(o, 'lead_time_days', 'LeadTimeDays') || undefined,
    third_party_remittance: parseStr(o, 'third_party_remittance', 'ThirdPartyRemittance') || undefined,
    situation: parseStr(o, 'situation', 'Situation') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || undefined,
  };
}

function parseBreakdown(raw: unknown): OperationTimeBreakdown | undefined {
  if (!raw) return undefined;
  const o = unwrapObject(raw);
  return {
    setup_hours: parseNum(o, 'setup_hours', 'Setup'),
    run_hours: parseNum(o, 'run_hours', 'Run'),
    labor_hours: parseNum(o, 'labor_hours', 'Labor'),
    run_base_qty: parseNum(o, 'run_base_qty', 'RunBaseQty') || 1,
    queue_hours: parseNum(o, 'queue_hours', 'Queue'),
    wait_hours: parseNum(o, 'wait_hours', 'Wait'),
    move_hours: parseNum(o, 'move_hours', 'Move'),
    crew_size: parseNum(o, 'crew_size', 'CrewSize') || 1,
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
export async function getOperation(id: number): Promise<OperationDTO> {
  const { data } = await httpClient.get(`${BASE}/operations/${id}`);
  return parseOperation(data);
}
export async function createOperation(dto: OperationDTO): Promise<OperationDTO> {
  const { data } = await httpClient.post(`${BASE}/operations`, { ...dto, created_by: currentUserId() });
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
export async function listRoutes(itemCode: string): Promise<RouteDTO[]> {
  const { data } = await httpClient.get(`${BASE}/routes`, { params: { item_code: itemCode } });
  return unwrapArray(data).map(parseRoute);
}
export async function createRoute(dto: RouteDTO): Promise<RouteDTO> {
  const { data } = await httpClient.post(`${BASE}/routes`, { ...dto, created_by: currentUserId() });
  return parseRoute(data);
}
export async function updateRoute(id: number, dto: Partial<RouteDTO> & { situation?: string }): Promise<RouteDTO> {
  const { data } = await httpClient.put(`${BASE}/routes/${id}`, { id, ...dto });
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
  const { data } = await httpClient.post(`${BASE}/route-operations/${routeId}`, { route_id: routeId, situation: 'APROVADA', ...dto });
  return parseRouteOp(data);
}
export async function updateRouteOperation(routeId: number, opId: number, dto: Partial<RouteOperationDTO> & { situation?: string }): Promise<RouteOperationDTO> {
  const { data } = await httpClient.put(`${BASE}/route-operations/${routeId}/${opId}`, { id: opId, ...dto });
  return parseRouteOp(data);
}
export async function removeRouteOperation(routeId: number, opId: number): Promise<void> {
  await httpClient.delete(`${BASE}/route-operations/${routeId}/${opId}`);
}

// ── Recursos alternativos por operação (R5) ──
export interface RouteOpResourceDTO {
  id?: number;
  route_operation_id?: number;
  work_center_id: number;
  priority: number;
  /** Escala o tempo da operação (1.0 = base). */
  time_factor?: number;
  is_primary?: boolean;
}
function parseResource(raw: unknown): RouteOpResourceDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    route_operation_id: parseNum(o, 'route_operation_id', 'RouteOperationID') || undefined,
    work_center_id: parseNum(o, 'work_center_id', 'WorkCenterID'),
    priority: parseNum(o, 'priority', 'Priority'),
    time_factor: parseNum(o, 'time_factor', 'TimeFactor'),
    is_primary: parseBool(o, 'is_primary', 'IsPrimary'),
  };
}
export async function listRouteOpResources(routeId: number, opId: number): Promise<RouteOpResourceDTO[]> {
  const { data } = await httpClient.get(`${BASE}/route-operations/${routeId}/${opId}/resources`);
  return unwrapArray(data).map(parseResource);
}
export async function addRouteOpResource(routeId: number, opId: number, dto: RouteOpResourceDTO): Promise<RouteOpResourceDTO> {
  const { data } = await httpClient.post(`${BASE}/route-operations/${routeId}/${opId}/resources`, { route_operation_id: opId, time_factor: 1, ...dto });
  return parseResource(data);
}
export async function updateRouteOpResource(routeId: number, opId: number, resourceId: number, dto: { priority: number; time_factor: number }): Promise<RouteOpResourceDTO> {
  const { data } = await httpClient.put(`${BASE}/route-operations/${routeId}/${opId}/resources/${resourceId}`, { id: resourceId, ...dto });
  return parseResource(data);
}
export async function setRouteOpResourcePrimary(routeId: number, opId: number, resourceId: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/route-operations/${routeId}/${opId}/resources/${resourceId}/primary`, {});
  return unwrapObject(data);
}
export async function removeRouteOpResource(routeId: number, opId: number, resourceId: number): Promise<void> {
  await httpClient.delete(`${BASE}/route-operations/${routeId}/${opId}/resources/${resourceId}`);
}

// ── Ferramentas por operação (R3) ──
export async function listRouteOpTools(routeId: number, opId: number): Promise<Obj[]> {
  const { data } = await httpClient.get(`${BASE}/route-operations/${routeId}/${opId}/tools`);
  return unwrapArray(data).map(unwrapObject);
}
/**
 * Vincula a ferramenta à operação. A quantidade vai como `qty_required` — que é
 * o nome que o DTO aceita; enviada como `quantity`, era descartada em silêncio e
 * toda ferramenta ficava como se fosse uma só, mesmo quando a operação precisa
 * de um jogo de quatro insertos.
 */
export async function addRouteOpTool(routeId: number, opId: number, toolId: number, qtyRequired = 1): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/route-operations/${routeId}/${opId}/tools`, { route_operation_id: opId, tool_id: toolId, qty_required: qtyRequired });
  return unwrapObject(data);
}
export async function removeRouteOpTool(routeId: number, opId: number, toolLinkId: number): Promise<void> {
  await httpClient.delete(`${BASE}/route-operations/${routeId}/${opId}/tools/${toolLinkId}`);
}

// ── Rede de dependências (predecessor → sucessor, com overlap%) ──
export async function getNetworkEdges(routeId: number): Promise<EdgeDTO[]> {
  const { data } = await httpClient.get(`${BASE}/routes/${routeId}/edges`);
  return unwrapArray(data).map(parseEdge);
}
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
