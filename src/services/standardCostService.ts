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
  item_code: string;
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
  /** Separar máquina de mão de obra é o que permite custear um roteiro em que
   *  a máquina roda sozinha, ou em que dois operadores atendem um equipamento. */
  machine_cost_per_hour?: number;
  labor_cost_per_hour?: number;
  currency?: string;
}

export interface PurchaseCost {
  item_code: string;
  cost: number;
  currency?: string;
}

function parseCost(raw: unknown): StandardCost {
  const o = unwrapObject(raw);
  return {
    item_code: parseStr(o, 'item_code', 'ItemCode'),
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
    machine_cost_per_hour: parseNum(o, 'machine_cost_per_hour', 'MachineCostPerHour') || undefined,
    labor_cost_per_hour: parseNum(o, 'labor_cost_per_hour', 'LaborCostPerHour') || undefined,
    currency: parseStr(o, 'currency', 'Currency') || undefined,
  };
}
function parsePurchaseCost(raw: unknown): PurchaseCost {
  const o = unwrapObject(raw);
  return {
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    cost: parseNum(o, 'cost', 'Cost', 'unit_cost', 'UnitCost', 'purchase_cost', 'PurchaseCost'),
    currency: parseStr(o, 'currency', 'Currency') || undefined,
  };
}

// ── Custo padrão do item ──
/**
 * `lotSize` é o lote de referência sobre o qual o setup das operações é diluído
 * (setup ÷ lote). Com lote 1 o setup inteiro cai em cada peça e o custo padrão
 * sai muito acima do que a fábrica pratica; com o lote real de produção o
 * número fecha com o chão de fábrica. Vazio = 1, que é o default do backend.
 */
export async function calculateStandardCost(itemCode: string, mask?: string, lotSize?: number): Promise<StandardCost> {
  const { data } = await httpClient.post(`${BASE}/rollup`, {
    item_code: itemCode,
    mask: mask ?? '',
    lot_size: lotSize && lotSize > 0 ? lotSize : 1,
    calculated_by: currentUserId(),
  });
  return parseCost(data);
}
export async function getStandardCost(itemCode: string): Promise<StandardCost> {
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
/**
 * Grava a tarifa do centro de trabalho. `updated_by` sai do JWT no backend —
 * mandar o autor pelo corpo permitiria assinar a alteração como outra pessoa.
 */
export async function upsertWorkCenterCost(
  workCenterId: number,
  costPerHour: number,
  split?: { machine?: number; labor?: number },
): Promise<WorkCenterCost> {
  const { data } = await httpClient.post(`${BASE}/work-center-costs`, {
    work_center_id: workCenterId,
    cost_per_hour: costPerHour,
    machine_cost_per_hour: split?.machine ?? 0,
    labor_cost_per_hour: split?.labor ?? 0,
  });
  return parseWcc(data);
}

// ── Custo de compra por item ──
export async function getPurchaseCost(itemCode: string): Promise<PurchaseCost> {
  const { data } = await httpClient.get(`${BASE}/purchase-costs/${itemCode}`);
  return parsePurchaseCost(data);
}
export async function upsertPurchaseCost(itemCode: string, cost: number): Promise<PurchaseCost> {
  const { data } = await httpClient.post(`${BASE}/purchase-costs`, { item_code: itemCode, cost, updated_by: currentUserId() });
  return parsePurchaseCost(data);
}
