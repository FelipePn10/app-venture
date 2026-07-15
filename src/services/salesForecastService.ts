import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/sales-forecast';

/**
 * Previsão de Vendas — `/api/sales-forecast` (Vendas e Expedição §7).
 *
 * Registra demanda futura por item e máscara. A entrada operacional é mensal
 * (`create-monthly`) e o backend distribui a quantidade em semanas ISO conforme
 * os dias úteis do calendário industrial; `create` grava direto uma semana ISO.
 * `generate` calcula a média do histórico (pedidos/faturamento) e projeta.
 * A previsão entra no MRP/MPS como demanda independente do tipo previsão.
 *
 * Regras relevantes: `week` entre 1 e 53, `year` > 2000, `quantity` > 0. Antes de
 * gravar, o backend verifica se a segunda-feira da semana ISO cai em período
 * bloqueado (`/blocks`). Não há rota de update/delete exposta — manutenção é feita
 * regravando (`create` com a mesma chave) ou via `update_existing` no mensal/geração.
 */
export interface SalesForecastDTO {
  id?: number;
  item_code: number;
  mask?: string;
  week: number;
  year: number;
  quantity: number;
}

export interface MonthlySalesForecastDTO {
  item_code: number;
  mask?: string;
  year: number;
  month: number;
  quantity: number;
  accepts_fraction?: boolean;
  update_existing?: boolean;
}

export interface ForecastBlockDTO {
  id?: number;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface AppropriationTableDTO {
  id?: number;
  description: string;
  monday_pct: number;
  tuesday_pct: number;
  wednesday_pct: number;
  thursday_pct: number;
  friday_pct: number;
  saturday_pct: number;
  sunday_pct: number;
  is_default?: boolean;
}

export interface ForecastDataPoint {
  period: string | number;
  quantity: number;
}

/**
 * Geração por histórico (`/generate`). Com `history_source` (`ORDERS`, `INVOICING`
 * ou `BOTH`) o backend usa o histórico do ERP entre `history_from`/`history_to`;
 * sem ela, usa a série `history` enviada. `projection_pct` aplica crescimento/redução.
 */
export interface GenerateForecastDTO {
  item_code?: number;
  mask?: string;
  start_week: number;
  start_year: number;
  history?: ForecastDataPoint[];
  periods?: number;
  model?: string;
  ma_window?: number;
  alpha?: number;
  beta?: number;
  gamma?: number;
  season_len?: number;
  update_existing?: boolean;
  history_source?: 'ORDERS' | 'INVOICING' | 'BOTH';
  history_from?: string;
  history_to?: string;
  target_end_week?: number;
  target_end_year?: number;
  projection_pct?: number;
  accepts_fraction?: boolean;
  item_codes?: number[];
}

function parseForecast(raw: unknown): SalesForecastDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID', 'Id'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    week: parseNum(o, 'week', 'Week'),
    year: parseNum(o, 'year', 'Year'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
  };
}

function parseBlock(raw: unknown): ForecastBlockDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID', 'Id'),
    start_date: parseStr(o, 'start_date', 'StartDate'),
    end_date: parseStr(o, 'end_date', 'EndDate'),
    reason: parseStr(o, 'reason', 'Reason') || undefined,
  };
}

function parseAppropriation(raw: unknown): AppropriationTableDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID', 'Id'),
    description: parseStr(o, 'description', 'Description'),
    monday_pct: parseNum(o, 'monday_pct', 'MondayPct'),
    tuesday_pct: parseNum(o, 'tuesday_pct', 'TuesdayPct'),
    wednesday_pct: parseNum(o, 'wednesday_pct', 'WednesdayPct'),
    thursday_pct: parseNum(o, 'thursday_pct', 'ThursdayPct'),
    friday_pct: parseNum(o, 'friday_pct', 'FridayPct'),
    saturday_pct: parseNum(o, 'saturday_pct', 'SaturdayPct'),
    sunday_pct: parseNum(o, 'sunday_pct', 'SundayPct'),
    is_default: parseBool(o, 'is_default', 'IsDefault'),
  };
}

// ─── Previsões ─────────────────────────────────────────────────────────────────

export async function createForecast(dto: SalesForecastDTO): Promise<SalesForecastDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseForecast(data);
}
export async function createMonthlyForecast(dto: MonthlySalesForecastDTO): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/create-monthly`, dto);
  return unwrapObject(data);
}
export async function generateForecast(dto: GenerateForecastDTO): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/generate`, dto);
  return unwrapObject(data);
}
export async function listForecasts(year: number): Promise<SalesForecastDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list/${year}`);
  return unwrapArray(data).map(parseForecast);
}
export async function getForecastByItem(itemCode: number): Promise<SalesForecastDTO[]> {
  const { data } = await httpClient.get(`${BASE}/item/${itemCode}`);
  return unwrapArray(data).map(parseForecast);
}

// ─── Bloqueios de período ──────────────────────────────────────────────────────

export async function createBlock(dto: ForecastBlockDTO): Promise<ForecastBlockDTO> {
  const { data } = await httpClient.post(`${BASE}/blocks/create`, dto);
  return parseBlock(data);
}
export async function listBlocks(): Promise<ForecastBlockDTO[]> {
  const { data } = await httpClient.get(`${BASE}/blocks/list`);
  return unwrapArray(data).map(parseBlock);
}

// ─── Tabelas de apropriação diária ─────────────────────────────────────────────

export async function createAppropriation(dto: AppropriationTableDTO): Promise<AppropriationTableDTO> {
  const { data } = await httpClient.post(`${BASE}/appropriation/create`, dto);
  return parseAppropriation(data);
}
export async function listAppropriations(): Promise<AppropriationTableDTO[]> {
  const { data } = await httpClient.get(`${BASE}/appropriation/list`);
  return unwrapArray(data).map(parseAppropriation);
}
export async function setDefaultAppropriation(id: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/appropriation/set-default`, { id });
  return unwrapObject(data);
}
