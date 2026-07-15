import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/crp';

/** CRP — Capacity Requirements Planning (§2). */
export interface CrpEntry {
  work_center_id: number;
  req_date: string;
  required_hours: number;
  available_hours: number;
  load_pct: number;
  is_overloaded: boolean;
}

export interface CrpSummary {
  plan_code: number;
  total_entries: number;
  overload_count: number;
}

function parseEntry(raw: unknown): CrpEntry {
  const o = unwrapObject(raw);
  return {
    work_center_id: parseNum(o, 'work_center_id', 'WorkCenterID'),
    req_date: parseStr(o, 'req_date', 'ReqDate'),
    required_hours: parseNum(o, 'required_hours', 'RequiredHours'),
    available_hours: parseNum(o, 'available_hours', 'AvailableHours'),
    load_pct: parseNum(o, 'load_pct', 'LoadPct'),
    is_overloaded: parseBool(o, 'is_overloaded', 'IsOverloaded'),
  };
}

export async function calculateCrp(planCode: number): Promise<CrpSummary> {
  const { data } = await httpClient.post(`${BASE}/calculate`, { plan_code: planCode });
  const o = unwrapObject(data);
  return {
    plan_code: parseNum(o, 'plan_code', 'PlanCode'),
    total_entries: parseNum(o, 'total_entries', 'TotalEntries'),
    overload_count: parseNum(o, 'overload_count', 'OverloadCount'),
  };
}
export async function listCrpPlan(planCode: number): Promise<CrpEntry[]> {
  const { data } = await httpClient.get(`${BASE}/${planCode}`);
  return unwrapArray(data).map(parseEntry);
}
export async function listCrpOverload(planCode: number): Promise<CrpEntry[]> {
  const { data } = await httpClient.get(`${BASE}/${planCode}/overloaded`);
  return unwrapArray(data).map(parseEntry);
}
/**
 * Capacidade de um centro num período. O backend **não** expõe rota dedicada
 * (`/crp/work-centers/{id}` não existe) — filtramos as entradas do plano por centro
 * e intervalo de datas no cliente.
 */
export async function getWorkCenterCapacity(planCode: number, workCenterId: number, from: string, to: string): Promise<CrpEntry[]> {
  const all = await listCrpPlan(planCode);
  return all.filter((e) => e.work_center_id === workCenterId && (!from || e.req_date >= from) && (!to || e.req_date <= to));
}
