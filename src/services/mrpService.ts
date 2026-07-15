import { httpClient, parseStr, parseNum, parseBool, currentUserId, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * MRP Calculation — Planejamento das Necessidades de Materiais.
 * Roda o cálculo por plano (BFS + LLC + netting time-phased), gera sugestões de
 * ordens, perfil por item, exceções e a ponte sugestão → Ordem Planejada (firmar).
 * Bases: `/api/mrp-calculation/*` e `/api/planned-order/*`.
 *
 * Notas do backend (doc MRP 2026-07):
 *  - `POST /run` exige `plan_code` de um plano existente (FK `mrp_calculation_logs_plan_code_fkey`)
 *    — crie o plano em `/api/production-plan/create` antes. `initial_order_number` é
 *    **obrigatório** e positivo; `generate_llc=true` persiste o LLC em `items.planning_llc`.
 *    Só um cálculo pode ficar `RUNNING` (índice único) — 2ª chamada retorna 409.
 *  - `POST /api/planned-order/create`: `demand_type` **omitido assume `INDEPENDENT`**
 *    (bug corrigido). Caminho recomendado continua sendo firmar uma sugestão do MRP.
 */
export type OrderType = 'PRODUCTION' | 'PURCHASE' | 'OUTSOURCING';
export type DemandType = 'SALES_ORDER' | 'FORECAST' | 'INDEPENDENT' | 'SAFETY_STOCK' | 'REPLENISHMENT';
export type PlannedTarget = 'PLANNED' | 'RELEASED' | 'FIRM';
export type RuleType = 'EQUAL' | 'DIFFERENT' | 'RANGE';
export const RULE_TYPES: RuleType[] = ['EQUAL', 'DIFFERENT', 'RANGE'];

export interface MrpSuggestion {
  code: number;
  plan_code?: number;
  item_code: number;
  quantity: number;
  need_date?: string;
  start_date?: string;
  order_type?: string;
  demand_type?: string;
  parent_item_code?: number | null;
  llc?: number;
  notes?: string | null;
}

export interface MrpProfileRow {
  item_code?: number;
  date?: string;
  demand?: number;
  planned_orders?: number;
  firm_orders?: number;
  projected_stock?: number;
}

export interface ConfiguredRule {
  id?: number;
  item_code: number;
  table_type: string;   // PLANNING_DATA | PLANNER_DATA
  field_name: string;
  rule_type: RuleType;
  rule_value: string;
  sequence?: number;
}

export interface MrpException {
  item_code: number;
  message_type: string;
  description: string;
}

export interface PlannedOrder {
  code?: number;
  planned_code?: number;
  order_number?: number;
  item_code: number;
  quantity: number;
  order_type?: string;
  demand_type?: string;
  need_date?: string;
  start_date?: string;
  status?: string;
  is_firm?: boolean;
  plan_code?: number;
}

export interface MrpRunResult {
  plan_code?: number;
  status?: string;
  items_processed?: number;
  orders_generated?: number;
  started_at?: string;
  finished_at?: string;
}

function parseSuggestion(raw: unknown): MrpSuggestion {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    plan_code: parseNum(o, 'plan_code', 'PlanCode') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    need_date: parseStr(o, 'need_date', 'NeedDate') || undefined,
    start_date: parseStr(o, 'start_date', 'StartDate') || undefined,
    order_type: parseStr(o, 'order_type', 'OrderType') || undefined,
    demand_type: parseStr(o, 'demand_type', 'DemandType') || undefined,
    parent_item_code: parseNum(o, 'parent_item_code', 'ParentItemCode') || null,
    llc: parseNum(o, 'llc', 'Llc', 'LLC'),
    notes: parseStr(o, 'notes', 'Notes') || null,
  };
}
function parseProfile(raw: unknown): MrpProfileRow {
  const o = unwrapObject(raw);
  return {
    item_code: parseNum(o, 'item_code', 'ItemCode') || undefined,
    date: parseStr(o, 'date', 'Date', 'period') || undefined,
    demand: parseNum(o, 'demand', 'Demand'),
    planned_orders: parseNum(o, 'planned_orders', 'PlannedOrders'),
    firm_orders: parseNum(o, 'firm_orders', 'FirmOrders'),
    projected_stock: parseNum(o, 'projected_stock', 'ProjectedStock'),
  };
}
function parseRule(raw: unknown): ConfiguredRule {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    table_type: parseStr(o, 'table_type', 'TableType'),
    field_name: parseStr(o, 'field_name', 'FieldName'),
    rule_type: (parseStr(o, 'rule_type', 'RuleType') || 'EQUAL') as RuleType,
    rule_value: parseStr(o, 'rule_value', 'RuleValue'),
    sequence: parseNum(o, 'sequence', 'Sequence') || undefined,
  };
}
function parseException(raw: unknown): MrpException {
  const o = unwrapObject(raw);
  return {
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    message_type: parseStr(o, 'message_type', 'MessageType'),
    description: parseStr(o, 'description', 'Description'),
  };
}
function parsePlanned(raw: unknown): PlannedOrder {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code') || undefined,
    planned_code: parseNum(o, 'planned_code', 'PlannedCode') || undefined,
    order_number: parseNum(o, 'order_number', 'OrderNumber') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    order_type: parseStr(o, 'order_type', 'OrderType') || undefined,
    demand_type: parseStr(o, 'demand_type', 'DemandType') || undefined,
    need_date: parseStr(o, 'need_date', 'NeedDate') || undefined,
    start_date: parseStr(o, 'start_date', 'StartDate') || undefined,
    status: parseStr(o, 'status', 'Status') || undefined,
    is_firm: parseBool(o, 'is_firm', 'IsFirm'),
    plan_code: parseNum(o, 'plan_code', 'PlanCode') || undefined,
  };
}

// ── Execução ──
export async function runMrp(planCode: number, initialOrderNumber = 10000, generateLlc = true): Promise<MrpRunResult> {
  const { data } = await httpClient.post('/api/mrp-calculation/run', { plan_code: planCode, initial_order_number: initialOrderNumber, generate_llc: generateLlc });
  const o = unwrapObject(data);
  return {
    plan_code: parseNum(o, 'plan_code', 'PlanCode'),
    status: parseStr(o, 'status', 'Status') || undefined,
    items_processed: parseNum(o, 'items_processed', 'ItemsProcessed', 'total_items'),
    orders_generated: parseNum(o, 'orders_generated', 'OrdersGenerated', 'total_orders'),
    started_at: parseStr(o, 'started_at', 'StartedAt') || undefined,
    finished_at: parseStr(o, 'finished_at', 'FinishedAt') || undefined,
  };
}
export async function getMrpProfile(itemCode: number, planCode: number): Promise<MrpProfileRow[]> {
  const { data } = await httpClient.get(`/api/mrp-calculation/profile/${itemCode}/${planCode}`);
  return unwrapArray(data).map(parseProfile);
}
/** Perfil operacional filtrável: `position` CALCULATION (foto do MRP) | CURRENT (+ saldo atual). */
export async function getMrpProfileOperational(itemCode: number, planCode: number, opts: { position?: 'CALCULATION' | 'CURRENT'; from?: string; to?: string } = {}): Promise<Obj> {
  const { data } = await httpClient.get(`/api/mrp-calculation/profile/${itemCode}/${planCode}/operational`, { params: opts });
  return unwrapObject(data);
}
export async function getExceptions(planCode: number): Promise<MrpException[]> {
  const { data } = await httpClient.get(`/api/mrp-calculation/exceptions/${planCode}`);
  return unwrapArray(data).map(parseException);
}

// ── Sugestões / ponte para ordens ──
export async function listSuggestions(planCode: number): Promise<MrpSuggestion[]> {
  const { data } = await httpClient.get(`/api/mrp-calculation/suggestions/${planCode}`);
  return unwrapArray(data).map(parseSuggestion);
}
export async function firmSuggestion(code: number): Promise<PlannedOrder> {
  const { data } = await httpClient.post(`/api/mrp-calculation/suggestions/${code}/firm`, {});
  return parsePlanned(data);
}

// ── Regras configuradas ──
export async function listConfiguredRules(itemCode: number): Promise<ConfiguredRule[]> {
  const { data } = await httpClient.get(`/api/mrp-calculation/configured-rules/${itemCode}`);
  return unwrapArray(data).map(parseRule);
}
export async function createConfiguredRule(dto: ConfiguredRule): Promise<ConfiguredRule> {
  const { data } = await httpClient.post('/api/mrp-calculation/configured-rules', dto);
  return parseRule(data);
}

// ── Ordens planejadas ──
export async function listPlannedOrders(): Promise<PlannedOrder[]> {
  const { data } = await httpClient.get('/api/planned-order/list');
  return unwrapArray(data).map(parsePlanned);
}
export async function createPlannedOrder(dto: PlannedOrder): Promise<PlannedOrder> {
  const { data } = await httpClient.post('/api/planned-order/create', { ...dto, created_by: currentUserId() });
  return parsePlanned(data);
}
/** Firma uma Ordem Planejada existente (GET por contrato do backend). */
export async function firmPlannedOrder(code: number): Promise<Obj> {
  const { data } = await httpClient.get(`/api/planned-order/${code}/firm`);
  return unwrapObject(data);
}
/**
 * Transiciona uma ou várias ordens planejadas. `target` RELEASED mantém is_firm=false;
 * FIRM grava status=RELEASED,is_firm=true e **não** aceita datas. Liberada só volta a
 * PLANNED sem apontamentos/consumos. O lote é validado antes da 1ª alteração.
 */
export async function transitionPlannedOrders(orderCodes: number[], target: PlannedTarget, startDate?: string, endDate?: string): Promise<Obj> {
  const body: Obj = { order_codes: orderCodes, target };
  if (target !== 'FIRM') { if (startDate) body.start_date = startDate; if (endDate) body.end_date = endDate; }
  const { data } = await httpClient.post('/api/planned-order/transition', body);
  return unwrapObject(data);
}
