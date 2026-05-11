import { httpClient } from "@/services/httpClient";

const BASE = "/api/independent-demand";

// ─── Request types (match backend DTO exactly) ────────────────────────────────

export interface DemandaCreateRequest {
  code_demand: number;        // int64 — 0 means "use next available"
  item_code: number;          // int64
  mask?: string;              // optional configuration mask
  cost_center_code?: number;  // optional int64
  quantity: number;           // float64
  demand_date: string;        // "YYYY-MM-DD"
  created_by: string;         // uuid.UUID as string
}

export interface DemandaUpdateRequest {
  code_demand: number;
  item_code: number;
  mask?: string;
  cost_center_code?: number;
  quantity: number;
  demand_date: string;
}

// ─── Response type ────────────────────────────────────────────────────────────

export interface DemandaResponse {
  code_demand: number;
  item_code: number;
  mask?: string;
  cost_center_code?: number;
  quantity: number;
  demand_date: string;
}

// ─── Defensive parser (handles PascalCase Go default + snake_case json tags) ──

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
  return v !== undefined && v !== null ? String(v) : "";
}

function parseDemanda(raw: unknown): DemandaResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Obj;
  const code_demand = parseNum(o, "code_demand", "CodeDemand", "codeDemand");
  if (code_demand == null) return null;
  return {
    code_demand,
    item_code:        parseNum(o, "item_code", "ItemCode", "itemCode") ?? 0,
    mask:             parseStr(o, "mask", "Mask") || undefined,
    cost_center_code: parseNum(o, "cost_center_code", "CostCenterCode", "costCenterCode"),
    quantity:         parseNum(o, "quantity", "Quantity") ?? 0,
    demand_date:      parseStr(o, "demand_date", "DemandDate", "demandDate"),
  };
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const o = raw as Obj;
    for (const key of ["data", "items", "demands", "result"]) {
      if (Array.isArray(o[key])) return o[key] as unknown[];
    }
  }
  return [];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function createDemanda(payload: DemandaCreateRequest): Promise<DemandaResponse> {
  const { data } = await httpClient.post<unknown>(`${BASE}/create`, payload);
  const parsed = parseDemanda(data);
  if (!parsed) throw new Error("Resposta inválida do servidor.");
  return parsed;
}

export async function updateDemanda(code: number, payload: DemandaUpdateRequest): Promise<DemandaResponse> {
  const { data } = await httpClient.put<unknown>(`${BASE}/update/${code}`, payload);
  const parsed = parseDemanda(data);
  if (!parsed) throw new Error("Resposta inválida do servidor.");
  return parsed;
}

export async function deleteDemanda(code: number): Promise<void> {
  await httpClient.delete(`${BASE}/delete/${code}`);
}

export async function getDemanda(code: number): Promise<DemandaResponse | null> {
  try {
    const { data } = await httpClient.get<unknown>(`${BASE}/get-by-code/${code}`);
    return parseDemanda(data);
  } catch {
    return null;
  }
}

export async function listDemandas(): Promise<DemandaResponse[]> {
  const { data } = await httpClient.get<unknown>(`${BASE}/list`);
  return unwrapArray(data).map(parseDemanda).filter((d): d is DemandaResponse => d !== null);
}

export async function listDemandaByItem(itemCode: number): Promise<DemandaResponse[]> {
  const { data } = await httpClient.get<unknown>(`${BASE}/list-by-item/${itemCode}`);
  return unwrapArray(data).map(parseDemanda).filter((d): d is DemandaResponse => d !== null);
}

export async function listDemandaFromDate(date: string): Promise<DemandaResponse[]> {
  const { data } = await httpClient.get<unknown>(`${BASE}/list-from-date/${date}`);
  return unwrapArray(data).map(parseDemanda).filter((d): d is DemandaResponse => d !== null);
}
