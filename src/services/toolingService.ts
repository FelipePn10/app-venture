import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Ferramental — Cadastro de Ferramentas/Séries (`/api/routing/tools`) e
 * Ficha de Produção da Ferramenta (`/api/tool-production-sheet`) — Produção §1/§4.1.
 *
 * A ferramenta mestre controla vida útil (`life_type`: GOLPES/HORAS/PECAS) contra
 * `life_limit`; cada cópia física é uma **série**. A Ficha de Produção vincula a
 * série que roda em cada operação da OF (ordens tipo OFC são excluídas da LOV);
 * ao concluir a operação o desgaste é debitado na série exata. `Substituir` troca
 * a série e guarda o histórico (série antiga → nova + motivo).
 */

export type ToolLifeType = 'GOLPES' | 'HORAS' | 'PECAS';
export const TOOL_LIFE_TYPES: ToolLifeType[] = ['GOLPES', 'HORAS', 'PECAS'];
export type ToolStatus = 'ATIVA' | 'MANUTENCAO' | 'INATIVA';
export const TOOL_STATUSES: ToolStatus[] = ['ATIVA', 'MANUTENCAO', 'INATIVA'];

export interface ToolDTO {
  id?: number;
  code?: string;
  name: string;
  tool_type?: string;
  life_type?: ToolLifeType;
  life_limit?: number;
  life_used?: number;
  cost?: number;
  status?: ToolStatus;
}

export interface ToolSerialDTO {
  id?: number;
  tool_id?: number;
  serial_number: string;
  status?: ToolStatus;
  location?: string;
  notes?: string;
  life_used?: number;
}

export interface ToolSheetOrderDTO {
  order_id?: number;
  order_number?: number;
  order_type?: string;
  item_code?: number;
  mask?: string;
  planned_qty?: number;
  start_date?: string;
  end_date?: string;
}

export interface ToolSheetOperationDTO {
  operation_id?: number;
  sequence?: number;
  description?: string;
  resource_code?: number;
  resource_name?: string;
  tool_id?: number;
  tool_name?: string;
  serial_id?: number;
  serial_number?: string;
}

export interface ToolSheetDTO {
  order?: ToolSheetOrderDTO;
  operations?: ToolSheetOperationDTO[];
}

function parseTool(raw: unknown): ToolDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID', 'Id'),
    code: parseStr(o, 'code', 'Code') || undefined,
    name: parseStr(o, 'name', 'Name'),
    tool_type: parseStr(o, 'tool_type', 'ToolType') || undefined,
    life_type: (parseStr(o, 'life_type', 'LifeType') || undefined) as ToolLifeType | undefined,
    life_limit: parseNum(o, 'life_limit', 'LifeLimit'),
    life_used: parseNum(o, 'life_used', 'LifeUsed'),
    cost: parseNum(o, 'cost', 'Cost'),
    status: (parseStr(o, 'status', 'Status') || undefined) as ToolStatus | undefined,
  };
}

function parseSerial(raw: unknown): ToolSerialDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID', 'Id'),
    tool_id: parseNum(o, 'tool_id', 'ToolID', 'ToolId'),
    serial_number: parseStr(o, 'serial_number', 'SerialNumber'),
    status: (parseStr(o, 'status', 'Status') || undefined) as ToolStatus | undefined,
    location: parseStr(o, 'location', 'Location') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || undefined,
    life_used: parseNum(o, 'life_used', 'LifeUsed'),
  };
}

function parseSheetOrder(raw: unknown): ToolSheetOrderDTO {
  const o = unwrapObject(raw);
  return {
    order_id: parseNum(o, 'order_id', 'OrderID', 'id', 'ID'),
    order_number: parseNum(o, 'order_number', 'OrderNumber'),
    order_type: parseStr(o, 'order_type', 'OrderType') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    planned_qty: parseNum(o, 'planned_qty', 'PlannedQty'),
    start_date: parseStr(o, 'start_date', 'StartDate') || undefined,
    end_date: parseStr(o, 'end_date', 'EndDate') || undefined,
  };
}

function parseSheetOperation(raw: unknown): ToolSheetOperationDTO {
  const o = unwrapObject(raw);
  return {
    operation_id: parseNum(o, 'operation_id', 'OperationID', 'id', 'ID'),
    sequence: parseNum(o, 'sequence', 'Sequence'),
    description: parseStr(o, 'description', 'Description') || undefined,
    resource_code: parseNum(o, 'resource_code', 'ResourceCode'),
    resource_name: parseStr(o, 'resource_name', 'ResourceName') || undefined,
    tool_id: parseNum(o, 'tool_id', 'ToolID', 'ToolId'),
    tool_name: parseStr(o, 'tool_name', 'ToolName') || undefined,
    serial_id: parseNum(o, 'serial_id', 'SerialID', 'SerialId'),
    serial_number: parseStr(o, 'serial_number', 'SerialNumber') || undefined,
  };
}

// ─── Cadastro de Ferramentas (mestre) ──────────────────────────────────────────

const TOOLS = '/api/routing/tools';

export async function listTools(): Promise<ToolDTO[]> {
  const { data } = await httpClient.get(TOOLS);
  return unwrapArray(data).map(parseTool);
}
export async function listToolsNeedingReplacement(): Promise<ToolDTO[]> {
  const { data } = await httpClient.get(`${TOOLS}/replacement`);
  return unwrapArray(data).map(parseTool);
}
export async function getTool(id: number): Promise<ToolDTO> {
  const { data } = await httpClient.get(`${TOOLS}/${id}`);
  return parseTool(data);
}
export async function createTool(dto: ToolDTO): Promise<ToolDTO> {
  const { data } = await httpClient.post(TOOLS, dto);
  return parseTool(data);
}
export async function updateTool(id: number, dto: ToolDTO): Promise<ToolDTO> {
  const { data } = await httpClient.put(`${TOOLS}/${id}`, dto);
  return parseTool(data);
}
export async function deactivateTool(id: number): Promise<void> {
  await httpClient.delete(`${TOOLS}/${id}`);
}
export async function resetToolLife(id: number): Promise<Obj> {
  const { data } = await httpClient.post(`${TOOLS}/${id}/reset-life`, {});
  return unwrapObject(data);
}

// ─── Séries (cópias físicas) ────────────────────────────────────────────────────

export async function listSerials(toolId: number): Promise<ToolSerialDTO[]> {
  const { data } = await httpClient.get(`${TOOLS}/${toolId}/serials`);
  return unwrapArray(data).map(parseSerial);
}
export async function getSerial(serialId: number): Promise<ToolSerialDTO> {
  const { data } = await httpClient.get(`${TOOLS}/serials/${serialId}`);
  return parseSerial(data);
}
export async function createSerial(toolId: number, dto: ToolSerialDTO): Promise<ToolSerialDTO> {
  const { data } = await httpClient.post(`${TOOLS}/${toolId}/serials`, dto);
  return parseSerial(data);
}
export async function updateSerial(serialId: number, dto: ToolSerialDTO): Promise<ToolSerialDTO> {
  const { data } = await httpClient.put(`${TOOLS}/serials/${serialId}`, dto);
  return parseSerial(data);
}
export async function deactivateSerial(serialId: number): Promise<void> {
  await httpClient.delete(`${TOOLS}/serials/${serialId}`);
}

// ─── Ficha de Produção da Ferramenta ───────────────────────────────────────────

const SHEET = '/api/tool-production-sheet';

export async function listSheetOrders(q?: string): Promise<ToolSheetOrderDTO[]> {
  const { data } = await httpClient.get(`${SHEET}/orders`, { params: q ? { q } : undefined });
  return unwrapArray(data).map(parseSheetOrder);
}
export async function getSheet(orderId: number): Promise<ToolSheetDTO> {
  const { data } = await httpClient.get(`${SHEET}/${orderId}`);
  const o = unwrapObject(data);
  const rawOrder = o['order'] ?? o['Order'] ?? o;
  const rawOps = o['operations'] ?? o['Operations'] ?? [];
  return {
    order: parseSheetOrder(rawOrder),
    operations: Array.isArray(rawOps) ? rawOps.map(parseSheetOperation) : [],
  };
}
export async function assignSerial(operationId: number, toolId: number, serialId: number): Promise<Obj> {
  const { data } = await httpClient.post(`${SHEET}/assign`, { operation_id: operationId, tool_id: toolId, serial_id: serialId });
  return unwrapObject(data);
}
export async function substituteSerial(operationId: number, toolId: number, newSerialId: number, reason?: string): Promise<Obj> {
  const { data } = await httpClient.post(`${SHEET}/substitute`, {
    operation_id: operationId, tool_id: toolId, new_serial_id: newSerialId, reason: reason || undefined,
  });
  return unwrapObject(data);
}
export async function listSubstitutions(operationId: number, toolId?: number): Promise<Obj[]> {
  const params: Obj = { operation_id: operationId };
  if (toolId) params['tool_id'] = toolId;
  const { data } = await httpClient.get(`${SHEET}/substitutions`, { params });
  return unwrapArray(data).map(unwrapObject);
}
