import { httpClient, parseStr, parseNum, parseBool, currentUserId, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * MRP Calculation — Planejamento das Necessidades de Materiais.
 * Roda o cálculo por plano (BFS + LLC + netting time-phased), gera sugestões de
 * ordens, perfil por item, exceções e a ponte sugestão → Ordem Planejada (firmar).
 * Bases: `/api/mrp-calculation/*` e `/api/planned-order/*`.
 *
 * ⚠️ Quirks/bugs confirmados na demo (localhost:5072):
 *  - `POST /run` exige `plan_code` que referencie um plano existente (FK
 *    `mrp_calculation_logs_plan_code_fkey`); a demo não tem planos semeados → 500.
 *  - **BUG: `POST /api/planned-order/create`** não lê `demand_type` do corpo (sempre
 *    vazio → `invalid input value for enum demand_type_enum`). Criação manual de ordem
 *    planejada quebrada; o caminho correto é firmar uma sugestão do MRP.
 */
export type OrderType = 'PRODUCTION' | 'PURCHASE';
export type DemandType = 'INDEPENDENT' | 'DEPENDENT';
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
export async function runMrp(planCode: number): Promise<MrpRunResult> {
  const { data } = await httpClient.post('/api/mrp-calculation/run', { plan_code: planCode });
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
