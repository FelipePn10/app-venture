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
  /** Número que a ordem planejada recebe ao firmar a sugestão. */
  order_number?: number;
  /** Ordem planejada gerada ao firmar; vazio enquanto a sugestão está pendente. */
  planned_order_code?: number;
  machine_code?: number;
  production_time?: number;
  estimated_end_at?: string;
  capacity_late?: boolean;
  plan_code?: number;
  item_code: string;
  quantity: number;
  need_date?: string;
  start_date?: string;
  order_type?: string;
  demand_type?: string;
  parent_item_code?: string | null;
  llc?: number;
  notes?: string | null;
}

export interface MrpProfileRow {
  item_code?: string;
  date?: string;
  demand?: number;
  planned_orders?: number;
  firm_orders?: number;
  projected_stock?: number;
}

export interface ConfiguredRule {
  id?: number;
  item_code: string;
  table_type: string;   // PLANNING_DATA | PLANNER_DATA
  field_name: string;
  rule_type: RuleType;
  rule_value: string;
  sequence?: number;
  /** Vazia: a regra vale para todas as máscaras do item. Preenchida: a regra (igual, diferente, faixa "a-b") compara a máscara com ela. */
  condicao_mascara?: string;
}

export interface MrpException {
  code?: number;
  item_code: string;
  message_type: string;
  description: string;
  /** Data em que o cálculo precisa do suprimento (destino de "Reprogramar"). */
  suggested_date?: string;
  source_type?: string;
  /** Código interno da ordem planejada de origem (para o rastreamento). */
  source_code?: number;
  /** Pedidos/demandas de origem que dependem da ordem da exceção. */
  affected_demands?: string[];
  source_order_number?: number;
  source_need_date?: string;
  /** REPROGRAMADA, CANCELADA ou TRATADA; vazio = pendente. */
  handling_action?: string;
  handling_note?: string;
  handled_at?: string;
  handled_by_name?: string;
}
/** Ação do planejador sobre a exceção. */
export type MrpExceptionAction = 'REPROGRAMAR' | 'CANCELAR' | 'TRATAR';

export interface PlannedOrder {
  code?: number;
  planned_code?: number;
  order_number?: number;
  item_code: string;
  quantity: number;
  order_type?: string;
  demand_type?: string;
  need_date?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  is_firm?: boolean;
  plan_code?: number;
  machine_code?: number;
  /** Minutos de máquina reservados pelo MRP. */
  production_time?: number;
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
    order_number: parseNum(o, 'order_number', 'OrderNumber') || undefined,
    planned_order_code: parseNum(o, 'planned_order_code', 'PlannedOrderCode') || undefined,
    machine_code: parseNum(o, 'machine_code') || undefined,
    production_time: parseNum(o, 'production_time') || undefined,
    estimated_end_at: parseStr(o, 'estimated_end_at') || undefined,
    capacity_late: parseBool(o, 'capacity_late'),
    plan_code: parseNum(o, 'plan_code', 'PlanCode') || undefined,
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    need_date: parseStr(o, 'need_date', 'NeedDate') || undefined,
    start_date: parseStr(o, 'start_date', 'StartDate') || undefined,
    order_type: parseStr(o, 'order_type', 'OrderType') || undefined,
    demand_type: parseStr(o, 'demand_type', 'DemandType') || undefined,
    parent_item_code: parseStr(o, 'parent_item_code', 'ParentItemCode') || null,
    llc: parseNum(o, 'llc', 'Llc', 'LLC'),
    notes: parseStr(o, 'notes', 'Notes') || null,
  };
}
function parseProfile(raw: unknown): MrpProfileRow {
  const o = unwrapObject(raw);
  return {
    item_code: parseStr(o, 'item_code', 'ItemCode') || undefined,
    // O backend devolve a data do balde como `need_date`; `date`/`period` ficaram
    // por compatibilidade. Lendo só os antigos, a coluna Data saía sempre "—".
    date: parseStr(o, 'need_date', 'NeedDate', 'date', 'Date', 'period') || undefined,
    demand: parseNum(o, 'demand', 'Demand'),
    planned_orders: parseNum(o, 'orders_planned', 'OrdersPlanned'),
    firm_orders: parseNum(o, 'orders_firm', 'OrdersFirm'),
    projected_stock: parseNum(o, 'stock_projected', 'StockProjected'),
  };
}
function parseRule(raw: unknown): ConfiguredRule {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    table_type: parseStr(o, 'table_type', 'TableType'),
    field_name: parseStr(o, 'field_name', 'FieldName'),
    rule_type: (parseStr(o, 'rule_type', 'RuleType') || 'EQUAL') as RuleType,
    rule_value: parseStr(o, 'rule_value', 'RuleValue'),
    sequence: parseNum(o, 'sequence', 'Sequence') || undefined,
    condicao_mascara: parseStr(o, 'condicao_mascara') || undefined,
  };
}
function parseException(raw: unknown): MrpException {
  const o = unwrapObject(raw);
  return {
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    message_type: parseStr(o, 'message_type', 'MessageType'),
    description: parseStr(o, 'description', 'Description'),
    code: parseNum(o, 'code', 'Code') || undefined,
    suggested_date: parseStr(o, 'suggested_date') || undefined,
    source_type: parseStr(o, 'source_type') || undefined,
    source_code: parseNum(o, 'source_code') || undefined,
    affected_demands: unwrapArray(o['affected_demands']).map((x) => String(x)).filter(Boolean),
    source_order_number: parseNum(o, 'source_order_number') || undefined,
    source_need_date: parseStr(o, 'source_need_date') || undefined,
    handling_action: parseStr(o, 'handling_action') || undefined,
    handling_note: parseStr(o, 'handling_note') || undefined,
    handled_at: parseStr(o, 'handled_at') || undefined,
    handled_by_name: parseStr(o, 'handled_by_name') || undefined,
  };
}
function parsePlanned(raw: unknown): PlannedOrder {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code') || undefined,
    planned_code: parseNum(o, 'planned_code', 'PlannedCode') || undefined,
    order_number: parseNum(o, 'order_number', 'OrderNumber') || undefined,
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    order_type: parseStr(o, 'order_type', 'OrderType') || undefined,
    demand_type: parseStr(o, 'demand_type', 'DemandType') || undefined,
    need_date: parseStr(o, 'need_date', 'NeedDate') || undefined,
    start_date: parseStr(o, 'start_date', 'StartDate') || undefined,
    end_date: parseStr(o, 'end_date', 'EndDate') || undefined,
    status: parseStr(o, 'status', 'Status') || undefined,
    is_firm: parseBool(o, 'is_firm', 'IsFirm'),
    plan_code: parseNum(o, 'plan_code', 'PlanCode') || undefined,
    machine_code: parseNum(o, 'machine_code', 'MachineCode') || undefined,
    production_time: parseNum(o, 'production_time', 'ProductionTime') || undefined,
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
export async function getMrpProfile(itemCode: string, planCode: number): Promise<MrpProfileRow[]> {
  const { data } = await httpClient.get(`/api/mrp-calculation/profile/${itemCode}/${planCode}`);
  return unwrapArray(data).map(parseProfile);
}
/** Perfil operacional filtrável: `position` CALCULATION (foto do MRP) | CURRENT (+ saldo atual). */
export async function getMrpProfileOperational(itemCode: string, planCode: number, opts: { position?: 'CALCULATION' | 'CURRENT'; from?: string; to?: string } = {}): Promise<Obj> {
  const { data } = await httpClient.get(`/api/mrp-calculation/profile/${itemCode}/${planCode}/operational`, { params: opts });
  return unwrapObject(data);
}
export async function getExceptions(planCode: number): Promise<MrpException[]> {
  const { data } = await httpClient.get(`/api/mrp-calculation/exceptions/${planCode}`);
  return unwrapArray(data).map(parseException);
}

/**
 * Trata a exceção direto da mensagem: REPROGRAMAR leva a ordem planejada à data
 * sugerida (ou a `newDate`), CANCELAR cancela a ordem sem demanda e TRATAR só
 * registra o que foi feito (exige `note`).
 */
export async function handleException(code: number, action: MrpExceptionAction, opts: { newDate?: string; note?: string } = {}): Promise<MrpException> {
  const body: Obj = { action };
  if (opts.newDate) body.new_date = opts.newDate;
  if (opts.note?.trim()) body.note = opts.note.trim();
  const { data } = await httpClient.post(`/api/mrp-calculation/exceptions/${code}/handle`, body);
  return parseException(data);
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
export async function listConfiguredRules(itemCode: string): Promise<ConfiguredRule[]> {
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

// ── Pegging (rastreamento da necessidade) ──
/** Ponta do vínculo: a necessidade (pedido, demanda, ordem do pai…) ou o suprimento (estoque, ordem firme, sugestão, falta). */
export interface PeggingEnd {
  kind: string;
  code?: number;
  label: string;
  order_number?: number;
  order_type?: string;
  date?: string;
}
export interface PeggingNode {
  item_code: string;
  item_description: string;
  uom?: string;
  need_date: string;
  quantity: number;
  demand: PeggingEnd;
  supply: PeggingEnd;
  /** O suprimento deste elo termina depois da necessidade (ou já devia ter começado). */
  late: boolean;
  late_reason?: string;
  children: PeggingNode[];
}
export interface PeggingRoot {
  item_code: string;
  item_description: string;
  uom?: string;
  need_date: string;
  quantity: number;
  demand: PeggingEnd;
  from_stock: number;
  from_firm: number;
  from_suggestions: number;
  shortage: number;
  chain_shortage: boolean;
  /** Algum elo da cadeia chega atrasado; late_reason diz qual. */
  chain_late: boolean;
  late_reason?: string;
  latest_supply?: string;
}
function parseEnd(raw: unknown): PeggingEnd {
  const o = unwrapObject(raw);
  return {
    kind: parseStr(o, 'kind'), code: parseNum(o, 'code') || undefined, label: parseStr(o, 'label'),
    order_number: parseNum(o, 'order_number') || undefined, order_type: parseStr(o, 'order_type') || undefined,
    date: parseStr(o, 'date') || undefined,
  };
}
function parseNode(raw: unknown): PeggingNode {
  const o = unwrapObject(raw);
  return {
    item_code: parseStr(o, 'item_code'), item_description: parseStr(o, 'item_description'), uom: parseStr(o, 'uom') || undefined,
    need_date: parseStr(o, 'need_date'), quantity: parseNum(o, 'quantity'),
    demand: parseEnd(o['demand']), supply: parseEnd(o['supply']), late: o['late'] === true,
    late_reason: parseStr(o, 'late_reason') || undefined,
    children: unwrapArray(o['children']).map(parseNode),
  };
}
/** Necessidades de origem do plano (pedidos, demandas, previsões…) com o resumo da cadeia. */
export async function getPeggingRoots(planCode: number): Promise<PeggingRoot[]> {
  const { data } = await httpClient.get(`/api/mrp-calculation/pegging/${planCode}/roots`);
  return unwrapArray(data).map(parseRoot);
}
function parseRoot(raw: unknown): PeggingRoot {
  const o = unwrapObject(raw);
  return {
    item_code: parseStr(o, 'item_code'), item_description: parseStr(o, 'item_description'), uom: parseStr(o, 'uom') || undefined,
    need_date: parseStr(o, 'need_date'), quantity: parseNum(o, 'quantity'), demand: parseEnd(o['demand']),
    from_stock: parseNum(o, 'from_stock'), from_firm: parseNum(o, 'from_firm'), from_suggestions: parseNum(o, 'from_suggestions'),
    shortage: parseNum(o, 'shortage'), chain_shortage: o['chain_shortage'] === true,
    chain_late: o['chain_late'] === true, late_reason: parseStr(o, 'late_reason') || undefined,
    latest_supply: parseStr(o, 'latest_supply') || undefined,
  };
}
/** Cadeia de uma necessidade de origem até as compras dos componentes. */
export async function getPeggingDown(planCode: number, root: { kind: string; code?: number; item_code?: string; need_date?: string }): Promise<PeggingNode[]> {
  const params: Obj = { demand_kind: root.kind };
  if (root.code) params.demand_code = root.code;
  if (root.item_code) params.item_code = root.item_code;
  if (root.need_date) params.need_date = root.need_date.slice(0, 10);
  const { data } = await httpClient.get(`/api/mrp-calculation/pegging/${planCode}/down`, { params });
  return unwrapArray(data).map(parseNode);
}
/** De uma ordem (sugestão ou ordem firme) até os pedidos/demandas que dependem dela. */
export async function getPeggingUp(planCode: number, supplyKind: 'SUGESTAO' | 'ORDEM_FIRME', supplyCode: number): Promise<PeggingNode[]> {
  const { data } = await httpClient.get(`/api/mrp-calculation/pegging/${planCode}/up`, { params: { supply_kind: supplyKind, supply_code: supplyCode } });
  return unwrapArray(data).map(parseNode);
}
/** Atendimento de um pedido de venda num plano: as linhas do pedido e a cadeia de cada uma. */
export interface SalesOrderChain {
  plan_code: number;
  plan_name: string;
  calculated_at?: string;
  roots: PeggingRoot[];
  /** trees[i] é a cadeia de roots[i]. */
  trees: PeggingNode[][];
}
/** Como cada plano ativo atende o pedido de venda, segundo o último cálculo do MRP. */
export async function getSalesOrderPegging(orderCode: number): Promise<SalesOrderChain[]> {
  const { data } = await httpClient.get(`/api/mrp-calculation/pegging/sales-order/${orderCode}`);
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      plan_code: parseNum(o, 'plan_code'), plan_name: parseStr(o, 'plan_name'), calculated_at: parseStr(o, 'calculated_at') || undefined,
      roots: unwrapArray(o['roots']).map(parseRoot),
      trees: unwrapArray(o['trees']).map((t) => unwrapArray(t).map(parseNode)),
    };
  });
}
