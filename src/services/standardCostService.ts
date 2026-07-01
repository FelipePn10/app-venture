import { httpClient, parseStr, parseNum, currentUserId, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/standard-cost';

/**
 * Custo Padrão (Custos §1): rollup pela estrutura (material + transformação +
 * overhead, respeitando o LLC) + custos de centro de trabalho e de compra.
 *
 * Endpoints reais confirmados na demo: `POST /rollup` (exige `calculated_by`),
 * `GET /items/{itemCode}`, `POST|GET /work-center-costs`, `POST /purchase-costs`
 * + `GET /purchase-costs/{itemCode}`. **Não há list-all** (`GET /` → 404).
 * O backend retorna `labor_cost`; a tela usa `operation_cost` (mapeado no parser).
 */
export interface StandardCost {
  item_code: number;
  mask?: string;
  material_cost: number;
  operation_cost: number;
  overhead_cost: number;
  total_cost: number;
  currency?: string;
  calculated_at?: string;
}

export interface WorkCenterCost {
  id?: number;
  work_center_id: number;
  cost_per_hour: number;
  currency?: string;
}

export interface PurchaseCost {
  item_code: number;
  cost: number;
  currency?: string;
}

function parseCost(raw: unknown): StandardCost {
  const o = unwrapObject(raw);
  return {
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    material_cost: parseNum(o, 'material_cost', 'MaterialCost'),
    operation_cost: parseNum(o, 'operation_cost', 'OperationCost', 'labor_cost', 'LaborCost'),
    overhead_cost: parseNum(o, 'overhead_cost', 'OverheadCost'),
    total_cost: parseNum(o, 'total_cost', 'TotalCost'),
    currency: parseStr(o, 'currency', 'Currency') || undefined,
    calculated_at: parseStr(o, 'calculated_at', 'CalculatedAt') || undefined,
  };
}
function parseWcc(raw: unknown): WorkCenterCost {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    work_center_id: parseNum(o, 'work_center_id', 'WorkCenterID'),
    cost_per_hour: parseNum(o, 'cost_per_hour', 'CostPerHour'),
    currency: parseStr(o, 'currency', 'Currency') || undefined,
  };
}
function parsePurchaseCost(raw: unknown): PurchaseCost {
  const o = unwrapObject(raw);
  return {
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    cost: parseNum(o, 'cost', 'Cost', 'unit_cost', 'UnitCost', 'purchase_cost', 'PurchaseCost'),
    currency: parseStr(o, 'currency', 'Currency') || undefined,
  };
}

// ── Custo padrão do item ──
export async function calculateStandardCost(itemCode: number, mask?: string): Promise<StandardCost> {
  const { data } = await httpClient.post(`${BASE}/rollup`, { item_code: itemCode, mask: mask ?? '', calculated_by: currentUserId() });
  return parseCost(data);
}
export async function getStandardCost(itemCode: number): Promise<StandardCost> {
  const { data } = await httpClient.get(`${BASE}/items/${itemCode}`);
  return parseCost(data);
}
/** O backend não expõe list-all de custo padrão (`GET /` → 404); retorna []. */
export async function listStandardCosts(): Promise<StandardCost[]> {
  return [];
}

// ── Custo/hora por centro de trabalho ──
export async function listWorkCenterCosts(): Promise<WorkCenterCost[]> {
  const { data } = await httpClient.get(`${BASE}/work-center-costs`);
  return unwrapArray(data).map(parseWcc);
}
export async function upsertWorkCenterCost(workCenterId: number, costPerHour: number): Promise<WorkCenterCost> {
  const { data } = await httpClient.post(`${BASE}/work-center-costs`, { work_center_id: workCenterId, cost_per_hour: costPerHour, updated_by: currentUserId() });
  return parseWcc(data);
}

// ── Custo de compra por item ──
export async function getPurchaseCost(itemCode: number): Promise<PurchaseCost> {
  const { data } = await httpClient.get(`${BASE}/purchase-costs/${itemCode}`);
  return parsePurchaseCost(data);
}
export async function upsertPurchaseCost(itemCode: number, cost: number): Promise<PurchaseCost> {
  const { data } = await httpClient.post(`${BASE}/purchase-costs`, { item_code: itemCode, cost, updated_by: currentUserId() });
  return parsePurchaseCost(data);
}
