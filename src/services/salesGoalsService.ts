import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/sales-goals';

/**
 * Metas de Vendas — `/api/sales-goals` (Vendas e Expedição §6).
 *
 * Objetivos comerciais por período, representante, grupo comercial e cliente.
 * Base `SALES` calcula o realizado por pedidos de venda no período; `INVOICING`
 * fica registrada para fechar por faturamento conforme a integração fiscal evoluir.
 *
 * Regras: período não invertido; percentuais não negativos; cada item de meta
 * aponta EXATAMENTE UM alvo (item OU classificação OU grupo).
 */
export interface SalesGoalPeriodDTO {
  code?: number;
  description?: string;
  period_type: 'MONTH' | 'WEEK' | 'CUSTOM';
  start_date: string;
  end_date: string;
}

export interface SalesGoalDTO {
  code?: number;
  representative_code: number;
  period_code: number;
  analysis_base: 'SALES' | 'INVOICING';
  award_pct?: number;
  items?: SalesGoalItemDTO[];
}

export interface SalesGoalItemDTO {
  code?: number;
  goal_code?: number;
  target_type?: 'ITEM' | 'CLASSIFICATION' | 'GROUP';
  item_code?: number;
  item_classification_code?: number;
  item_group_code?: number;
  sales_uom?: string;
  target_quantity?: number;
  target_value?: number;
  bonus_pct?: number;
  is_active?: boolean;
}

export interface SalesGoalReportFilters {
  representative_code?: number;
  customer_code?: number;
  region_code?: number;
  microregion_code?: number;
  period_code?: number;
  from?: string;
  to?: string;
  analysis_base?: 'SALES' | 'INVOICING';
  break_by?: string;
  include_missed_items?: boolean;
}

function parsePeriod(raw: unknown): SalesGoalPeriodDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    period_type: (parseStr(o, 'period_type', 'PeriodType') || 'MONTH') as SalesGoalPeriodDTO['period_type'],
    start_date: parseStr(o, 'start_date', 'StartDate'),
    end_date: parseStr(o, 'end_date', 'EndDate'),
  };
}

function parseItem(raw: unknown): SalesGoalItemDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    goal_code: parseNum(o, 'goal_code', 'GoalCode'),
    target_type: (parseStr(o, 'target_type', 'TargetType') || undefined) as SalesGoalItemDTO['target_type'],
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    item_classification_code: parseNum(o, 'item_classification_code', 'ItemClassificationCode'),
    item_group_code: parseNum(o, 'item_group_code', 'ItemGroupCode'),
    sales_uom: parseStr(o, 'sales_uom', 'SalesUom'),
    target_quantity: parseNum(o, 'target_quantity', 'TargetQuantity'),
    target_value: parseNum(o, 'target_value', 'TargetValue'),
    bonus_pct: parseNum(o, 'bonus_pct', 'BonusPct'),
  };
}

function parseGoal(raw: unknown): SalesGoalDTO {
  const o = unwrapObject(raw);
  const rawItems = o['items'] ?? o['Items'];
  return {
    code: parseNum(o, 'code', 'Code'),
    representative_code: parseNum(o, 'representative_code', 'RepresentativeCode'),
    period_code: parseNum(o, 'period_code', 'PeriodCode'),
    analysis_base: (parseStr(o, 'analysis_base', 'AnalysisBase') || 'SALES') as SalesGoalDTO['analysis_base'],
    award_pct: parseNum(o, 'award_pct', 'AwardPct'),
    items: Array.isArray(rawItems) ? rawItems.map(parseItem) : undefined,
  };
}

// ─── Períodos ────────────────────────────────────────────────────────────────

export async function listSalesGoalPeriods(): Promise<SalesGoalPeriodDTO[]> {
  const { data } = await httpClient.get(`${BASE}/periods/`);
  return unwrapArray(data).map(parsePeriod);
}
export async function createSalesGoalPeriod(dto: SalesGoalPeriodDTO): Promise<SalesGoalPeriodDTO> {
  const { data } = await httpClient.post(`${BASE}/periods/`, dto);
  return parsePeriod(data);
}

// ─── Metas ───────────────────────────────────────────────────────────────────

export async function listSalesGoals(): Promise<SalesGoalDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list`);
  return unwrapArray(data).map(parseGoal);
}
export async function getSalesGoal(code: number): Promise<SalesGoalDTO> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parseGoal(data);
}
export async function createSalesGoal(dto: SalesGoalDTO): Promise<SalesGoalDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseGoal(data);
}
export async function updateSalesGoal(code: number, dto: SalesGoalDTO): Promise<SalesGoalDTO> {
  const { data } = await httpClient.put(`${BASE}/${code}`, dto);
  return parseGoal(data);
}
export async function addSalesGoalItem(item: SalesGoalItemDTO): Promise<SalesGoalItemDTO> {
  const { data } = await httpClient.post(`${BASE}/items`, item);
  return parseItem(data);
}

// ─── Metas por grupo comercial ───────────────────────────────────────────────

export async function upsertGroupTarget(payload: Obj): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/group-targets`, payload);
  return unwrapObject(data);
}
export async function addGroupCustomer(payload: Obj): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/group-customers`, payload);
  return unwrapObject(data);
}
export async function upsertGoalBalance(payload: Obj): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/balances`, payload);
  return unwrapObject(data);
}

// ─── Relatório ───────────────────────────────────────────────────────────────

export async function getSalesGoalsReport(filters: SalesGoalReportFilters = {}): Promise<Obj[]> {
  const params: Record<string, string> = {};
  if (filters.representative_code) params.representative_code = String(filters.representative_code);
  if (filters.customer_code) params.customer_code = String(filters.customer_code);
  if (filters.region_code) params.region_code = String(filters.region_code);
  if (filters.microregion_code) params.microregion_code = String(filters.microregion_code);
  if (filters.period_code) params.period_code = String(filters.period_code);
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.analysis_base) params.analysis_base = filters.analysis_base;
  if (filters.break_by) params.break_by = filters.break_by;
  if (filters.include_missed_items) params.include_missed_items = 'true';
  const { data } = await httpClient.get(`${BASE}/report`, { params });
  return unwrapArray(data).map(unwrapObject);
}
