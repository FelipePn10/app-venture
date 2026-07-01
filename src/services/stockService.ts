import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Estoque e Almoxarifado — movimentos, saldos, reservas, inventário, tipos de
 * movimento, ATP, genealogia de lote e consumo médio (ROP).
 * Bases: `/api/stock/*` e `/api/estoque/tipos-movimento`.
 */

export const MOVEMENT_TYPES = ['IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUST'] as const;

export interface MovementDTO {
  id?: number;
  item_code: number;
  mask?: string;
  warehouse_id: number;
  movement_type: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  reference_type?: string;
  reference_code?: number;
  lot?: string;
  created_at?: string;
}

export interface BalanceDTO {
  id?: number;
  item_code: number;
  mask?: string;
  warehouse_id: number;
  quantity: number;
  reserved_qty: number;
  available_qty: number;
  minimum_stock?: number;
  maximum_stock?: number;
  safety_stock?: number;
  avg_cost?: number;
  last_cost?: number;
  total_cost?: number;
}

export interface AtpDTO {
  item_code: number;
  mask?: string;
  total_on_hand: number;
  total_reserved: number;
  total_available: number;
  warehouses: Obj[];
}

export interface ReservationDTO {
  id?: number;
  item_code: number;
  warehouse_id: number;
  quantity: number;
  reference_type?: string;
  reference_code?: number;
  status?: string;
}

export interface InventoryDTO {
  id?: number;
  code?: number;
  warehouse_id: number;
  description?: string;
  status?: string;
  total_items?: number;
  counted_items?: number;
}

export interface MovementTypeDTO {
  id?: number;
  sigla: string;
  description: string;
  tipo?: string;
}

export interface LotBalanceDTO {
  id?: number;
  item_code: number;
  warehouse_id?: number;
  lot: string;
  quantity: number;
  last_cost?: number;
}

export interface ConsumptionAvgDTO {
  item_code: number;
  avg_monthly_consumption: number;
  total_consumed: number;
  window_months: number;
  calculated_at?: string;
}

function parseMovement(raw: unknown): MovementDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID'),
    movement_type: parseStr(o, 'movement_type', 'MovementType'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    unit_price: parseNum(o, 'unit_price', 'UnitPrice'),
    total_price: parseNum(o, 'total_price', 'TotalPrice'),
    reference_type: parseStr(o, 'reference_type', 'ReferenceType') || undefined,
    reference_code: parseNum(o, 'reference_code', 'ReferenceCode') || undefined,
    lot: parseStr(o, 'lot', 'Lot') || undefined,
    created_at: parseStr(o, 'created_at', 'CreatedAt') || undefined,
  };
}
function parseBalance(raw: unknown): BalanceDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    reserved_qty: parseNum(o, 'reserved_qty', 'ReservedQty'),
    available_qty: parseNum(o, 'available_qty', 'AvailableQty'),
    minimum_stock: parseNum(o, 'minimum_stock', 'MinimumStock'),
    maximum_stock: parseNum(o, 'maximum_stock', 'MaximumStock'),
    safety_stock: parseNum(o, 'safety_stock', 'SafetyStock'),
    avg_cost: parseNum(o, 'avg_cost', 'AvgCost'),
    last_cost: parseNum(o, 'last_cost', 'LastCost'),
    total_cost: parseNum(o, 'total_cost', 'TotalCost'),
  };
}
function parseReservation(raw: unknown): ReservationDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    reference_type: parseStr(o, 'reference_type', 'ReferenceType') || undefined,
    reference_code: parseNum(o, 'reference_code', 'ReferenceCode') || undefined,
    status: parseStr(o, 'status', 'Status') || undefined,
  };
}
function parseInventory(raw: unknown): InventoryDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseNum(o, 'code', 'Code') || undefined,
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID'),
    description: parseStr(o, 'description', 'Description') || undefined,
    status: parseStr(o, 'status', 'Status') || undefined,
    total_items: parseNum(o, 'total_items', 'TotalItems'),
    counted_items: parseNum(o, 'counted_items', 'CountedItems'),
  };
}
function parseMovType(raw: unknown): MovementTypeDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    sigla: parseStr(o, 'sigla', 'Sigla', 'abbreviation'),
    description: parseStr(o, 'description', 'descricao', 'Description'),
    tipo: parseStr(o, 'tipo', 'Tipo', 'type') || undefined,
  };
}
function parseLot(raw: unknown): LotBalanceDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID') || undefined,
    lot: parseStr(o, 'lot', 'Lot'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    last_cost: parseNum(o, 'last_cost', 'LastCost') || undefined,
  };
}
function parseConsumption(raw: unknown): ConsumptionAvgDTO {
  const o = unwrapObject(raw);
  return {
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    avg_monthly_consumption: parseNum(o, 'avg_monthly_consumption', 'AvgMonthlyConsumption'),
    total_consumed: parseNum(o, 'total_consumed', 'TotalConsumed'),
    window_months: parseNum(o, 'window_months', 'WindowMonths'),
    calculated_at: parseStr(o, 'calculated_at', 'CalculatedAt') || undefined,
  };
}

// ── §1 Movimentos ──
export async function listMovements(): Promise<MovementDTO[]> {
  const { data } = await httpClient.get('/api/stock/movements/list');
  return unwrapArray(data).map(parseMovement);
}
export async function listMovementsByItem(itemCode: number): Promise<MovementDTO[]> {
  const { data } = await httpClient.get(`/api/stock/movements/item/${itemCode}`);
  return unwrapArray(data).map(parseMovement);
}
export async function createMovement(dto: MovementDTO): Promise<MovementDTO> {
  const { data } = await httpClient.post('/api/stock/movements/create', dto);
  return parseMovement(data);
}

// ── §2 Saldos ──
export async function listBalances(): Promise<BalanceDTO[]> {
  const { data } = await httpClient.get('/api/stock/balances/list');
  return unwrapArray(data).map(parseBalance);
}
export async function listBalancesByItem(itemCode: number): Promise<BalanceDTO[]> {
  const { data } = await httpClient.get(`/api/stock/balances/item/${itemCode}`);
  return unwrapArray(data).map(parseBalance);
}
export async function getAtp(itemCode: number, mask?: string): Promise<AtpDTO> {
  const { data } = await httpClient.get(`/api/stock/balances/atp/${itemCode}`, { params: mask ? { mask } : undefined });
  const o = unwrapObject(data);
  return {
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    total_on_hand: parseNum(o, 'total_on_hand', 'TotalOnHand'),
    total_reserved: parseNum(o, 'total_reserved', 'TotalReserved'),
    total_available: parseNum(o, 'total_available', 'TotalAvailable'),
    warehouses: unwrapArray(o['warehouses'] ?? o['Warehouses']).map(unwrapObject),
  };
}

// ── §3 Reservas ──
export async function createReservation(dto: ReservationDTO): Promise<ReservationDTO> {
  const { data } = await httpClient.post('/api/stock/reservations/create', dto);
  return parseReservation(data);
}
export async function releaseReservation(id: number): Promise<void> {
  await httpClient.patch(`/api/stock/reservations/${id}/release`, {});
}
export async function consumeReservation(id: number): Promise<void> {
  await httpClient.patch(`/api/stock/reservations/${id}/consume`, {});
}

// ── §4 Inventário ──
export async function listInventories(): Promise<InventoryDTO[]> {
  const { data } = await httpClient.get('/api/stock/inventories/list');
  return unwrapArray(data).map(parseInventory);
}
export async function getInventory(id: number): Promise<InventoryDTO> {
  const { data } = await httpClient.get(`/api/stock/inventories/${id}`);
  return parseInventory(data);
}
export async function createInventory(dto: InventoryDTO): Promise<InventoryDTO> {
  const { data } = await httpClient.post('/api/stock/inventories/create', dto);
  return parseInventory(data);
}
export async function closeInventory(id: number): Promise<void> {
  await httpClient.post(`/api/stock/inventories/${id}/close`, {});
}
export async function countInventoryItem(dto: { inventory_id: number; item_code: number; warehouse_id: number; counted_qty: number }): Promise<Obj> {
  const { data } = await httpClient.post('/api/stock/inventories/count', dto);
  return unwrapObject(data);
}
export async function adjustInventoryItem(dto: { inventory_id: number; item_code: number; warehouse_id: number }): Promise<Obj> {
  const { data } = await httpClient.post('/api/stock/inventories/adjust', dto);
  return unwrapObject(data);
}
export async function listInventoryItems(id: number): Promise<Obj[]> {
  const { data } = await httpClient.get(`/api/stock/inventories/${id}/items`);
  return unwrapArray(data).map(unwrapObject);
}

// ── §5 Tipos de movimento ──
export async function listMovementTypes(): Promise<MovementTypeDTO[]> {
  const { data } = await httpClient.get('/api/estoque/tipos-movimento/');
  return unwrapArray(data).map(parseMovType);
}
export async function getMovementTypeBySigla(sigla: string): Promise<MovementTypeDTO> {
  const { data } = await httpClient.get(`/api/estoque/tipos-movimento/sigla/${sigla}`);
  return parseMovType(data);
}
export async function createMovementType(dto: MovementTypeDTO): Promise<MovementTypeDTO> {
  const { data } = await httpClient.post('/api/estoque/tipos-movimento/', dto);
  return parseMovType(data);
}

// ── §7 Lotes / genealogia ──
export async function registerLot(dto: { item_code: number; lot: string; heat_number?: string; certificate?: string; supplier_code?: number }): Promise<Obj> {
  const { data } = await httpClient.post('/api/stock/lots/register', dto);
  return unwrapObject(data);
}
export async function listLotsByItem(itemCode: number): Promise<LotBalanceDTO[]> {
  const { data } = await httpClient.get(`/api/stock/lots/item/${itemCode}`);
  return unwrapArray(data).map(parseLot);
}
export async function getLotGenealogy(itemCode: number, lot: string): Promise<Obj> {
  const { data } = await httpClient.get(`/api/stock/lots/genealogy/${itemCode}/${encodeURIComponent(lot)}`);
  return unwrapObject(data);
}

// ── §8 Consumo médio (ROP) ──
export async function recalcConsumptionAverage(itemCode?: number): Promise<Obj> {
  const { data } = await httpClient.post('/api/stock/consumption-average/recalc', itemCode ? { item_code: itemCode } : {});
  return unwrapObject(data);
}
export async function getConsumptionAverage(itemCode: number): Promise<ConsumptionAvgDTO> {
  const { data } = await httpClient.get(`/api/stock/consumption-average/${itemCode}`);
  return parseConsumption(data);
}
