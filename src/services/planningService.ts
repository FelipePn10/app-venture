import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Pipeline de Planejamento (`/api/planning/run-pipeline`) e Parâmetros de Planejamento
 * (`/api/planning-params`). O pipeline encadeia MRP → CRP → APS num disparo e devolve um
 * parecer de viabilidade consolidado.
 */

export interface PipelineResult {
  viable?: boolean;
  /** Pareceres do pipeline, um por linha. */
  notes: string[];
  mrp_status?: string;
  mrp_items: number;
  mrp_orders: number;
  crp_entries: number;
  crp_overload: number;
  aps_orders: number;
  aps_operations: number;
  raw: Obj;
}
/**
 * Executa MRP→CRP→APS num disparo. Requer escopo `planning:run`. O backend
 * exige `start_from`: sem ele (campo vazio na tela) a chamada voltava 422 —
 * vazio agora quer dizer "a partir de agora".
 */
export async function runPipeline(planCode: number, initialOrderNumber = 10000, generateLlc = true, startFrom?: string): Promise<PipelineResult> {
  const body: Obj = { plan_code: planCode, initial_order_number: initialOrderNumber, generate_llc: generateLlc, start_from: startFrom || new Date().toISOString() };
  // A API exige Idempotency-Key aqui (uma rodada não pode disparar duas vezes);
  // sem ele a chamada voltava 422 e o pipeline não rodava pela tela.
  const { data } = await httpClient.post('/api/planning/run-pipeline', body, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
  const o = unwrapObject(data);
  // `notes` é uma lista; ler como texto deixava o parecer em branco.
  const brutas = o['notes'] ?? o['Notes'];
  const notes = Array.isArray(brutas) ? brutas.map((n) => String(n)) : brutas ? [String(brutas)] : [];
  return {
    viable: o['viable'] as boolean, notes,
    mrp_status: parseStr(o, 'mrp_status', 'MrpStatus') || undefined,
    mrp_items: parseNum(o, 'mrp_items', 'MrpItems'), mrp_orders: parseNum(o, 'mrp_orders', 'MrpOrders'),
    crp_entries: parseNum(o, 'crp_entries', 'CrpEntries'), crp_overload: parseNum(o, 'crp_overload', 'CrpOverload'),
    aps_orders: parseNum(o, 'aps_orders', 'ApsOrders'), aps_operations: parseNum(o, 'aps_operations', 'ApsOperations'),
    raw: o,
  };
}

export interface PlanningParam {
  param_number: number;
  param_key?: string;
  value: string;
  description?: string;
  updated_at?: string;
}
function parseParam(raw: unknown): PlanningParam {
  const o = unwrapObject(raw);
  return {
    param_number: parseNum(o, 'param_number', 'ParamNumber', 'number', 'Number'),
    param_key: parseStr(o, 'param_key', 'ParamKey', 'key') || undefined,
    value: parseStr(o, 'value', 'Value'),
    description: parseStr(o, 'description', 'Description') || undefined,
    updated_at: parseStr(o, 'updated_at', 'UpdatedAt') || undefined,
  };
}
export async function listPlanningParams(): Promise<PlanningParam[]> {
  const { data } = await httpClient.get('/api/planning-params/list');
  return unwrapArray(data).map(parseParam);
}
export async function getPlanningParam(num: number): Promise<PlanningParam> {
  const { data } = await httpClient.get(`/api/planning-params/${num}`);
  return parseParam(data);
}
export async function updatePlanningParam(paramNumber: number, value: string): Promise<PlanningParam> {
  const { data } = await httpClient.put('/api/planning-params/update', { param_number: paramNumber, value });
  return parseParam(data);
}

/**
 * Execução automática do planejamento (`/api/planning/auto-run`): a janela
 * noturna em que o MRP → CRP → APS roda sozinho, na hora da empresa. Quem salva
 * a parametrização vira o responsável — a rodada noturna grava as ordens em
 * nome dele.
 */
export interface AutoRunSettings {
  is_enabled: boolean;
  run_hour: number;
  run_minute: number;
  plan_code?: number;
  initial_order_number: number;
  generate_llc: boolean;
  last_snapshot_at?: string;
  last_run_at?: string;
  last_run_status?: string;
}
function parseAutoRun(raw: unknown): AutoRunSettings {
  const o = unwrapObject(raw);
  const plano = parseNum(o, 'plan_code');
  return {
    is_enabled: o['is_enabled'] === true,
    run_hour: parseNum(o, 'run_hour'),
    run_minute: parseNum(o, 'run_minute'),
    plan_code: plano > 0 ? plano : undefined,
    initial_order_number: parseNum(o, 'initial_order_number') || 1,
    generate_llc: o['generate_llc'] !== false,
    last_snapshot_at: parseStr(o, 'last_snapshot_at') || undefined,
    last_run_at: parseStr(o, 'last_run_at') || undefined,
    last_run_status: parseStr(o, 'last_run_status') || undefined,
  };
}
export async function getAutoRunSettings(): Promise<AutoRunSettings> {
  const { data } = await httpClient.get('/api/planning/auto-run');
  return parseAutoRun(data);
}
export async function updateAutoRunSettings(s: Omit<AutoRunSettings, 'last_snapshot_at' | 'last_run_at' | 'last_run_status'>): Promise<AutoRunSettings> {
  const body: Obj = {
    is_enabled: s.is_enabled, run_hour: s.run_hour, run_minute: s.run_minute,
    plan_code: s.plan_code ?? 0, initial_order_number: s.initial_order_number, generate_llc: s.generate_llc,
  };
  const { data } = await httpClient.put('/api/planning/auto-run', body);
  return parseAutoRun(data);
}

export interface PlanningRun {
  id: number;
  plan_code: number;
  /** AUTOMATICO (janela noturna) ou MANUAL. */
  trigger: string;
  triggered_by_name?: string;
  snapshot_at?: string;
  started_at?: string;
  finished_at?: string;
  /** RUNNING, SUCCESS, FAILED ou SKIPPED. */
  status: string;
  changed_items: number;
  mrp_orders: number;
  crp_overload: number;
  viable?: boolean;
  notes?: string;
}
function parseRun(raw: unknown): PlanningRun {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id'), plan_code: parseNum(o, 'plan_code'),
    trigger: parseStr(o, 'trigger'), triggered_by_name: parseStr(o, 'triggered_by_name') || undefined,
    snapshot_at: parseStr(o, 'snapshot_at') || undefined, started_at: parseStr(o, 'started_at') || undefined,
    finished_at: parseStr(o, 'finished_at') || undefined, status: parseStr(o, 'status'),
    changed_items: parseNum(o, 'changed_items'), mrp_orders: parseNum(o, 'mrp_orders'), crp_overload: parseNum(o, 'crp_overload'),
    viable: typeof o['viable'] === 'boolean' ? (o['viable'] as boolean) : undefined,
    notes: parseStr(o, 'notes') || undefined,
  };
}
export async function listPlanningRuns(limit = 50): Promise<PlanningRun[]> {
  const { data } = await httpClient.get('/api/planning/runs', { params: { limit } });
  return unwrapArray(data).map(parseRun);
}
/** Roda agora com a parametrização salva; entra no mesmo histórico da noturna. */
export async function runAutoRunNow(): Promise<PlanningRun> {
  const { data } = await httpClient.post('/api/planning/auto-run/run-now', {});
  return parseRun(data);
}

// ── Cenários de simulação (what-if) ──
/**
 * Cenário de simulação sobre um plano: ajustes de demanda, estoque, prazo e
 * capacidade calculados (MRP + CRP) num plano oculto e comparados com o plano
 * real. Só a demanda pode ser aplicada ao plano real.
 */
export interface PlanningScenario {
  id: number;
  name: string;
  description?: string;
  base_plan_code: number;
  base_plan_name: string;
  scenario_plan_code: number;
  /** RASCUNHO (ajustes mudaram depois do cálculo) ou CALCULADO. */
  status: string;
  calculated_at?: string;
  calculation_notes?: string;
  promoted_at?: string;
  promoted_by_name?: string;
  created_by_name?: string;
  created_at?: string;
  changes_count: number;
}
export type ScenarioChangeKind = 'DEMANDA' | 'ESTOQUE' | 'LEAD_TIME' | 'CAPACIDADE';
export interface ScenarioChange {
  id: number;
  kind: ScenarioChangeKind;
  item_code?: string;
  item_description?: string;
  demand_ref_kind?: string;
  demand_ref_code?: number;
  demand_ref_label?: string;
  quantity?: number;
  need_date?: string;
  lead_time_days?: number;
  machine_id?: number;
  machine_name?: string;
  hours_per_day?: number;
  stop_from?: string;
  stop_to?: string;
  notes?: string;
}
export interface ScenarioDetail extends PlanningScenario { changes: ScenarioChange[] }
export interface BaseDemand { ref_kind: string; ref_code: number; label: string; item_code: string; item_description: string; need_date: string; quantity: number }
const optNum = (o: Obj, k: string) => (o[k] === undefined || o[k] === null || o[k] === '' ? undefined : Number(o[k]));
function parseScenario(raw: unknown): PlanningScenario {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id'), name: parseStr(o, 'name'), description: parseStr(o, 'description') || undefined,
    base_plan_code: parseNum(o, 'base_plan_code'), base_plan_name: parseStr(o, 'base_plan_name'),
    scenario_plan_code: parseNum(o, 'scenario_plan_code'), status: parseStr(o, 'status'),
    calculated_at: parseStr(o, 'calculated_at') || undefined, calculation_notes: parseStr(o, 'calculation_notes') || undefined,
    promoted_at: parseStr(o, 'promoted_at') || undefined, promoted_by_name: parseStr(o, 'promoted_by_name') || undefined,
    created_by_name: parseStr(o, 'created_by_name') || undefined, created_at: parseStr(o, 'created_at') || undefined,
    changes_count: parseNum(o, 'changes_count'),
  };
}
function parseChange(raw: unknown): ScenarioChange {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id'), kind: parseStr(o, 'kind') as ScenarioChangeKind,
    item_code: parseStr(o, 'item_code') || undefined, item_description: parseStr(o, 'item_description') || undefined,
    demand_ref_kind: parseStr(o, 'demand_ref_kind') || undefined, demand_ref_code: optNum(o, 'demand_ref_code'),
    demand_ref_label: parseStr(o, 'demand_ref_label') || undefined, quantity: optNum(o, 'quantity'),
    need_date: parseStr(o, 'need_date') || undefined, lead_time_days: optNum(o, 'lead_time_days'),
    machine_id: optNum(o, 'machine_id'), machine_name: parseStr(o, 'machine_name') || undefined,
    hours_per_day: optNum(o, 'hours_per_day'), stop_from: parseStr(o, 'stop_from') || undefined,
    stop_to: parseStr(o, 'stop_to') || undefined, notes: parseStr(o, 'notes') || undefined,
  };
}
function parseDetail(raw: unknown): ScenarioDetail {
  const o = unwrapObject(raw);
  return { ...parseScenario(o), changes: unwrapArray(o['changes']).map(parseChange) };
}
export async function listScenarios(): Promise<PlanningScenario[]> {
  const { data } = await httpClient.get('/api/planning/scenarios');
  return unwrapArray(data).map(parseScenario);
}
export async function getScenario(id: number): Promise<ScenarioDetail> {
  const { data } = await httpClient.get(`/api/planning/scenarios/${id}`);
  return parseDetail(data);
}
export async function createScenario(name: string, basePlanCode: number, description = ''): Promise<ScenarioDetail> {
  const { data } = await httpClient.post('/api/planning/scenarios', { name, base_plan_code: basePlanCode, description });
  return parseDetail(data);
}
export async function updateScenario(id: number, name: string, description = ''): Promise<ScenarioDetail> {
  const { data } = await httpClient.put(`/api/planning/scenarios/${id}`, { name, description });
  return parseDetail(data);
}
export async function deleteScenario(id: number): Promise<void> {
  await httpClient.delete(`/api/planning/scenarios/${id}`);
}
export async function listBaseDemands(id: number): Promise<BaseDemand[]> {
  const { data } = await httpClient.get(`/api/planning/scenarios/${id}/base-demands`);
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return { ref_kind: parseStr(o, 'ref_kind'), ref_code: parseNum(o, 'ref_code'), label: parseStr(o, 'label'), item_code: parseStr(o, 'item_code'),
      item_description: parseStr(o, 'item_description'), need_date: parseStr(o, 'need_date'), quantity: parseNum(o, 'quantity') };
  });
}
/** Corpo do ajuste: só os campos do tipo; datas em ano-mês-dia; quantidades como texto decimal. */
export interface ScenarioChangeInput {
  kind: ScenarioChangeKind;
  item_code?: string;
  demand_ref_kind?: 'NOVA' | 'DEMANDA_INDEPENDENTE' | 'PEDIDO_VENDA';
  demand_ref_code?: number;
  quantity?: string;
  need_date?: string;
  lead_time_days?: number;
  machine_id?: number;
  hours_per_day?: string;
  stop_from?: string;
  stop_to?: string;
  notes?: string;
}
export async function addScenarioChange(id: number, c: ScenarioChangeInput): Promise<ScenarioChange> {
  const body: Obj = {};
  for (const [k, v] of Object.entries(c)) if (v !== undefined && v !== '') body[k] = v;
  const { data } = await httpClient.post(`/api/planning/scenarios/${id}/changes`, body);
  return parseChange(data);
}
export async function deleteScenarioChange(id: number, changeId: number): Promise<void> {
  await httpClient.delete(`/api/planning/scenarios/${id}/changes/${changeId}`);
}
export interface ScenarioRunResult { mrp_status: string; mrp_items: number; mrp_orders: number; crp_overload: number; notes: string[] }
export async function calculateScenario(id: number): Promise<ScenarioRunResult> {
  const { data } = await httpClient.post(`/api/planning/scenarios/${id}/calculate`, {});
  const o = unwrapObject(data);
  return { mrp_status: parseStr(o, 'mrp_status'), mrp_items: parseNum(o, 'mrp_items'), mrp_orders: parseNum(o, 'mrp_orders'),
    crp_overload: parseNum(o, 'crp_overload'), notes: Array.isArray(o['notes']) ? (o['notes'] as unknown[]).map(String) : [] };
}
export interface PlanSummary {
  plan_code: number; calculated_at?: string; suggestions: number; production_qty: number; purchase_qty: number;
  coverage_critical: number; coverage_warning: number; coverage_ok: number; exceptions: number;
  overload_days: number; max_load_pct: number; roots: number; roots_with_shortage: number;
  /** Pedidos/demandas cuja cadeia tem alguma ordem atrasada. */
  roots_late: number;
}
export interface ScenarioItemDiff {
  item_code: string; description: string; base_planned: number; scenario_planned: number; base_status: string; scenario_status: string;
  base_shortage: number; scenario_shortage: number; base_shortage_date?: string; scenario_shortage_date?: string;
}
export interface ScenarioWorkCenterDiff {
  work_center_id: number; name: string; base_hours: number; scenario_hours: number;
  base_overload_days: number; scenario_overload_days: number; base_max_load_pct: number; scenario_max_load_pct: number;
}
export interface ScenarioComparison { base: PlanSummary; scenario: PlanSummary; items: ScenarioItemDiff[]; work_centers: ScenarioWorkCenterDiff[]; base_stale: boolean; notes: string[] }
function parseSummary(raw: unknown): PlanSummary {
  const o = unwrapObject(raw);
  const n = (k: string) => parseNum(o, k);
  return { plan_code: n('plan_code'), calculated_at: parseStr(o, 'calculated_at') || undefined, suggestions: n('suggestions'), production_qty: n('production_qty'),
    purchase_qty: n('purchase_qty'), coverage_critical: n('coverage_critical'), coverage_warning: n('coverage_warning'), coverage_ok: n('coverage_ok'),
    exceptions: n('exceptions'), overload_days: n('overload_days'), max_load_pct: n('max_load_pct'), roots: n('roots'), roots_with_shortage: n('roots_with_shortage'), roots_late: n('roots_late') };
}
export async function compareScenario(id: number): Promise<ScenarioComparison> {
  const { data } = await httpClient.get(`/api/planning/scenarios/${id}/compare`);
  const o = unwrapObject(data);
  return {
    base: parseSummary(o['base']), scenario: parseSummary(o['scenario']), base_stale: o['base_stale'] === true,
    notes: Array.isArray(o['notes']) ? (o['notes'] as unknown[]).map(String) : [],
    items: unwrapArray(o['items']).map((raw) => {
      const i = unwrapObject(raw);
      return { item_code: parseStr(i, 'item_code'), description: parseStr(i, 'description'), base_planned: parseNum(i, 'base_planned'),
        scenario_planned: parseNum(i, 'scenario_planned'), base_status: parseStr(i, 'base_status'), scenario_status: parseStr(i, 'scenario_status'),
        base_shortage: parseNum(i, 'base_shortage'), scenario_shortage: parseNum(i, 'scenario_shortage'),
        base_shortage_date: parseStr(i, 'base_shortage_date') || undefined, scenario_shortage_date: parseStr(i, 'scenario_shortage_date') || undefined };
    }),
    work_centers: unwrapArray(o['work_centers']).map((raw) => {
      const w = unwrapObject(raw);
      return { work_center_id: parseNum(w, 'work_center_id'), name: parseStr(w, 'name'), base_hours: parseNum(w, 'base_hours'),
        scenario_hours: parseNum(w, 'scenario_hours'), base_overload_days: parseNum(w, 'base_overload_days'),
        scenario_overload_days: parseNum(w, 'scenario_overload_days'), base_max_load_pct: parseNum(w, 'base_max_load_pct'),
        scenario_max_load_pct: parseNum(w, 'scenario_max_load_pct') };
    }),
  };
}
export interface PromoteResult { created: number; updated: number; removed: number; skipped: number }
export async function promoteScenario(id: number): Promise<PromoteResult> {
  const { data } = await httpClient.post(`/api/planning/scenarios/${id}/promote`, {});
  const o = unwrapObject(data);
  return { created: parseNum(o, 'created'), updated: parseNum(o, 'updated'), removed: parseNum(o, 'removed'), skipped: parseNum(o, 'skipped') };
}
