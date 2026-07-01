import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/production-order';

/**
 * Ordem de Produção (OF) — `/api/production-order` (Produção §1-5).
 *
 * Status: `OPEN` → `IN_PROGRESS` → `COMPLETED` → `CLOSED` (`CANCELLED`).
 * Automações de estoque: consumo → `OUT` do insumo; conclusão → `IN` do acabado
 * (com `lot` habilita genealogia); fechar a OF apura o custo real.
 *
 * Notas: leitura vem snake_case, mutação PascalCase (parsers toleram ambos). Consumo
 * usa **`consumed_qty`** (não `quantity`). Datas (`start`/`complete`/consumo/apontamento)
 * aceitam `YYYY-MM-DD`/ISO; omitidas assumem agora. `create` exige `item_code` e
 * `planned_qty > 0`. `operations/advance` usa `{operation_id,status,actual_hours}`.
 */
export interface ProductionOrderDTO {
  id?: number;
  order_number?: number;
  planned_order_id?: number | null;
  item_code: number;
  mask?: string;
  planned_qty: number;
  produced_qty?: number;
  scrapped_qty?: number;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  machine_id?: number | null;
  cost_center_id?: number | null;
  employee_id?: number | null;
  priority?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface AppointmentDTO {
  id?: number;
  production_order_id: number;
  produced_qty: number;
  scrapped_qty?: number;
  scrap_reason?: string;
  machine_id?: number;
  employee_id?: number;
  /** Baixa automática da BOM proporcional à qtd produzida (backflush §18). */
  backflush_warehouse_id?: number;
  notes?: string;
}

export interface ConsumptionDTO {
  id?: number;
  production_order_id: number;
  item_code: number;
  /** Campo correto no backend é `consumed_qty`. */
  consumed_qty: number;
  warehouse_id?: number;
  lot?: string;
  notes?: string;
}

export interface OperationDTO {
  id?: number;
  production_order_id?: number;
  sequence?: number;
  operation_code?: number;
  description?: string;
  status?: string;
  work_center_id?: number;
}

export interface CostDTO {
  production_order_id?: number;
  produced_qty?: number;
  material_cost_real?: number;
  labor_cost_real?: number;
  overhead_cost_real?: number;
  total_cost_real?: number;
  unit_cost_real?: number;
  material_cost_std?: number;
  labor_cost_std?: number;
  overhead_cost_std?: number;
  total_cost_std?: number;
  total_variance?: number;
}

export interface ScrapReturnDTO {
  scrap_item_code: number;
  warehouse_id: number;
  quantity: number;
  unit_value: number;
  lot?: string;
  notes?: string;
}

function parseOrder(raw: unknown): ProductionOrderDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    order_number: parseNum(o, 'order_number', 'OrderNumber'),
    planned_order_id: parseNum(o, 'planned_order_id', 'PlannedOrderID') || null,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask'),
    planned_qty: parseNum(o, 'planned_qty', 'PlannedQty'),
    produced_qty: parseNum(o, 'produced_qty', 'ProducedQty'),
    scrapped_qty: parseNum(o, 'scrapped_qty', 'ScrappedQty'),
    status: parseStr(o, 'status', 'Status'),
    start_date: parseStr(o, 'start_date', 'StartDate') || null,
    end_date: parseStr(o, 'end_date', 'EndDate') || null,
    machine_id: parseNum(o, 'machine_id', 'MachineID') || null,
    cost_center_id: parseNum(o, 'cost_center_id', 'CostCenterID') || null,
    employee_id: parseNum(o, 'employee_id', 'EmployeeID') || null,
    priority: parseStr(o, 'priority', 'Priority') || null,
    notes: parseStr(o, 'notes', 'Notes') || null,
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

function parseAppointment(raw: unknown): AppointmentDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    production_order_id: parseNum(o, 'production_order_id', 'ProductionOrderID'),
    produced_qty: parseNum(o, 'produced_qty', 'ProducedQty'),
    scrapped_qty: parseNum(o, 'scrapped_qty', 'ScrappedQty'),
    scrap_reason: parseStr(o, 'scrap_reason', 'ScrapReason') || undefined,
  };
}

function parseConsumption(raw: unknown): ConsumptionDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    production_order_id: parseNum(o, 'production_order_id', 'ProductionOrderID'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    consumed_qty: parseNum(o, 'consumed_qty', 'ConsumedQty'),
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID') || undefined,
    lot: parseStr(o, 'lot', 'Lot') || undefined,
  };
}

function parseOperation(raw: unknown): OperationDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    production_order_id: parseNum(o, 'production_order_id', 'ProductionOrderID'),
    sequence: parseNum(o, 'sequence', 'Sequence'),
    operation_code: parseNum(o, 'operation_code', 'OperationCode'),
    description: parseStr(o, 'description', 'Description'),
    status: parseStr(o, 'status', 'Status'),
    work_center_id: parseNum(o, 'work_center_id', 'WorkCenterID') || undefined,
  };
}

function parseCost(raw: unknown): CostDTO {
  const o = unwrapObject(raw);
  return {
    production_order_id: parseNum(o, 'production_order_id', 'ProductionOrderID'),
    produced_qty: parseNum(o, 'produced_qty', 'ProducedQty'),
    material_cost_real: parseNum(o, 'material_cost_real', 'MaterialCostReal'),
    labor_cost_real: parseNum(o, 'labor_cost_real', 'LaborCostReal'),
    overhead_cost_real: parseNum(o, 'overhead_cost_real', 'OverheadCostReal'),
    total_cost_real: parseNum(o, 'total_cost_real', 'TotalCostReal'),
    unit_cost_real: parseNum(o, 'unit_cost_real', 'UnitCostReal'),
    material_cost_std: parseNum(o, 'material_cost_std', 'MaterialCostStd'),
    labor_cost_std: parseNum(o, 'labor_cost_std', 'LaborCostStd'),
    overhead_cost_std: parseNum(o, 'overhead_cost_std', 'OverheadCostStd'),
    total_cost_std: parseNum(o, 'total_cost_std', 'TotalCostStd'),
    total_variance: parseNum(o, 'total_variance', 'TotalVariance'),
  };
}

// ─── OF: capa e ciclo de vida ─────────────────────────────────────────────────

export async function listProductionOrders(): Promise<ProductionOrderDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list`);
  return unwrapArray(data).map(parseOrder);
}
export async function getProductionOrder(id: number): Promise<ProductionOrderDTO> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return parseOrder(data);
}
export async function createProductionOrder(dto: ProductionOrderDTO): Promise<ProductionOrderDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseOrder(data);
}
export async function startProductionOrder(id: number): Promise<ProductionOrderDTO> {
  const { data } = await httpClient.post(`${BASE}/${id}/start`, {});
  return parseOrder(data);
}
export async function completeProductionOrder(id: number, warehouseId?: number, lot?: string): Promise<ProductionOrderDTO> {
  const body: Obj = {};
  if (warehouseId !== undefined) body.warehouse_id = warehouseId;
  if (lot) body.lot = lot;
  const { data } = await httpClient.post(`${BASE}/${id}/complete`, body);
  return parseOrder(data);
}
export async function closeProductionOrder(id: number): Promise<ProductionOrderDTO> {
  const { data } = await httpClient.post(`${BASE}/${id}/close`, {});
  return parseOrder(data);
}
export async function cancelProductionOrder(id: number): Promise<ProductionOrderDTO> {
  const { data } = await httpClient.post(`${BASE}/${id}/cancel`, {});
  return parseOrder(data);
}

// ─── Apontamentos e consumos ─────────────────────────────────────────────────

export async function appointProduction(dto: AppointmentDTO): Promise<AppointmentDTO> {
  const { data } = await httpClient.post(`${BASE}/appointment`, dto);
  return parseAppointment(data);
}
export async function addConsumption(dto: ConsumptionDTO): Promise<ConsumptionDTO> {
  const { data } = await httpClient.post(`${BASE}/consumption`, dto);
  return parseConsumption(data);
}
export async function listAppointments(id: number): Promise<AppointmentDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${id}/appointments`);
  return unwrapArray(data).map(parseAppointment);
}
export async function listConsumptions(id: number): Promise<ConsumptionDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${id}/consumptions`);
  return unwrapArray(data).map(parseConsumption);
}

// ─── Operações da OF (§2) ────────────────────────────────────────────────────

export async function explodeOperations(id: number): Promise<OperationDTO[]> {
  const { data } = await httpClient.post(`${BASE}/operations/explode`, { production_order_id: id });
  return unwrapArray(data).map(parseOperation);
}
export async function listOperations(id: number): Promise<OperationDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${id}/operations`);
  return unwrapArray(data).map(parseOperation);
}
/**
 * Avança uma operação da OF. Corpo: `{operation_id, status, actual_hours}`.
 * `status` ∈ PENDING · IN_PROGRESS · DONE · SKIPPED (IN_PROGRESS carimba started_at;
 * DONE/SKIPPED carimbam completed_at).
 */
export async function advanceOperation(operationId: number, status = 'IN_PROGRESS', actualHours = 0): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/operations/advance`, { operation_id: operationId, status, actual_hours: actualHours });
  return unwrapObject(data);
}

// ─── Custo (§3) e Sucata (§4) ────────────────────────────────────────────────

export async function settleCost(id: number): Promise<CostDTO> {
  const { data } = await httpClient.post(`${BASE}/${id}/settle-cost`, {});
  return parseCost(data);
}
export async function getCost(id: number): Promise<CostDTO> {
  const { data } = await httpClient.get(`${BASE}/${id}/cost`);
  return parseCost(data);
}
export async function scrapReturn(id: number, dto: ScrapReturnDTO): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${id}/scrap-return`, dto);
  return unwrapObject(data);
}
