import { httpClient } from '@/services/httpClient';

const BASE = '/api/cost-center';

export type TypeCC =
  | 'AUXILIARY'
  | 'PRODUCTIVE'
  | 'ADMINISTRATIVE'
  | 'COMMERCIAL';

export interface CreateCostCenterDTO {
  code: number;
  description: string;
  parent_code?: number;
  type: TypeCC;
  is_ratio: boolean;
  start_date: string;
  end_date?: string;
  created_by: string;
}

export interface UpdateCostCenterDTO {
  code: number;
  description: string;
  parent_code?: number;
  type: string;
  is_ratio: boolean;
  start_date: string;
  end_date?: string;
}

export interface CostCenterResponse {
  code: number;
  description: string;
  parent_code?: number | null;
  type: string;
  is_ratio: boolean;
  start_date: string;
  end_date?: string | null;
}

export interface ListFilters {
  reference_date?: string;
  company?: string;
}

// ─── Defensive parser ─────────────────────────────────────────────────────────
// The Go backend may return any of these field-name conventions:
//   snake_case  → code, description, parent_code, is_ratio, start_date, end_date
//   camelCase   → code, description, parentCode,  isRatio,  startDate,  endDate
//   PascalCase  → Code, Description, ParentCode,  IsRatio,  StartDate,  EndDate

type Obj = Record<string, unknown>;

function pick<T>(obj: Obj, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

function parseNum(obj: Obj, ...keys: string[]): number | undefined {
  const v = pick<unknown>(obj, ...keys);
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function parseStr(obj: Obj, ...keys: string[]): string {
  const v = pick<unknown>(obj, ...keys);
  return v != null ? String(v) : '';
}

function parseBool(obj: Obj, ...keys: string[]): boolean {
  const v = pick<unknown>(obj, ...keys);
  if (v === undefined) return false;
  return v !== false && v !== 0 && v !== 'false' && v !== '';
}

function parseCostCenter(raw: unknown): CostCenterResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;

  const code = parseNum(obj, 'code', 'Code');
  if (code === undefined) return null; // not a CC object

  return {
    code,
    description: parseStr(obj, 'description', 'Description', 'desc'),
    parent_code: parseNum(obj, 'parent_code', 'parentCode', 'ParentCode') ?? null,
    type:        parseStr(obj, 'type',        'Type',        'cc_type', 'ccType'),
    is_ratio:    parseBool(obj, 'is_ratio',   'isRatio',     'IsRatio'),
    start_date:  parseStr(obj, 'start_date',  'startDate',   'StartDate'),
    end_date:    parseStr(obj, 'end_date',    'endDate',     'EndDate') || null,
  };
}

function unwrapArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Obj;
    for (const key of ['data', 'items', 'cost_centers', 'results', 'list']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    const msg = pick<string>(obj, 'message', 'error', 'msg');
    if (msg) throw new Error(msg);
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function createCostCenter(dto: CreateCostCenterDTO): Promise<CostCenterResponse> {
  const response = await httpClient.post<CostCenterResponse>(`${BASE}/create`, dto);
  return response.data;
}

export async function listCostCenters(filters?: ListFilters): Promise<CostCenterResponse[]> {
  const params = new URLSearchParams();
  if (filters?.reference_date) params.set('reference_date', filters.reference_date);
  if (filters?.company) params.set('company', filters.company);
  const qs = params.toString();
  const response = await httpClient.get<unknown>(`${BASE}/list${qs ? `?${qs}` : ''}`);

  console.debug('[costCenter] listCostCenters raw:', response.data);

  const arr = unwrapArray(response.data);
  if (!arr) return [];

  const result: CostCenterResponse[] = [];
  for (const item of arr) {
    const cc = parseCostCenter(item);
    if (cc) {
      result.push(cc);
    } else {
      console.debug('[costCenter] could not parse item:', item);
    }
  }

  console.debug('[costCenter] parsed list:', result);
  return result;
}

export async function getCostCenter(code: number): Promise<CostCenterResponse | null> {
  const response = await httpClient.get<unknown>(`${BASE}/${code}`);

  console.debug('[costCenter] getCostCenter raw:', response.data);

  // Try direct parse first
  const direct = parseCostCenter(response.data);
  if (direct) return direct;

  // Try unwrapping one level
  if (response.data && typeof response.data === 'object') {
    const obj = response.data as Obj;
    for (const key of ['data', 'cost_center', 'result', 'item']) {
      const inner = parseCostCenter(obj[key]);
      if (inner) return inner;
    }
  }

  console.debug('[costCenter] getCostCenter: could not parse response');
  return null;
}
