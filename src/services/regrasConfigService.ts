import { httpClient } from '@/services/httpClient';

const BASE = '/api/regras-config';

export interface RegraEquivalenciaDTO {
  item_pai: string;
  um: string;
  item_filho: string;
  seq: number;
  config_pai_caracteristica: string;
  config_pai_operador: string;
  config_filho_caracteristica: string;
  config_filho_operador: string;
}

export interface RegraEquivalenciaResponse {
  codigo: number;
  item_pai: string;
  um: string;
  item_filho: string;
  seq: number;
  config_pai_caracteristica: string;
  config_pai_operador: string;
  config_filho_caracteristica: string;
  config_filho_operador: string;
}

// ─── Defensive parser ─────────────────────────────────────────────────────────

type Obj = Record<string, unknown>;

function pick<T>(obj: Obj, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

function parseStr(obj: Obj, ...keys: string[]): string {
  const v = pick<unknown>(obj, ...keys);
  return v != null ? String(v) : '';
}

function parseNum(obj: Obj, ...keys: string[]): number | undefined {
  const v = pick<unknown>(obj, ...keys);
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function parseRegra(raw: unknown): RegraEquivalenciaResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;

  return {
    codigo: parseNum(obj, 'codigo', 'Codigo', 'CODIGO') ?? 0,
    item_pai: parseStr(obj, 'item_pai', 'itemPai', 'ItemPai', 'ITEM_PAI'),
    um: parseStr(obj, 'um', 'UM', 'Um'),
    item_filho: parseStr(obj, 'item_filho', 'itemFilho', 'ItemFilho', 'ITEM_FILHO'),
    seq: parseNum(obj, 'seq', 'Seq', 'SEQ') ?? 0,
    config_pai_caracteristica: parseStr(obj, 'config_pai_caracteristica', 'configPaiCaracteristica', 'CONFIG_PAI_CARACTERISTICA'),
    config_pai_operador: parseStr(obj, 'config_pai_operador', 'configPaiOperador', 'CONFIG_PAI_OPERADOR'),
    config_filho_caracteristica: parseStr(obj, 'config_filho_caracteristica', 'configFilhoCaracteristica', 'CONFIG_FILHO_CARACTERISTICA'),
    config_filho_operador: parseStr(obj, 'config_filho_operador', 'configFilhoOperador', 'CONFIG_FILHO_OPERADOR'),
  };
}

function unwrapArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Obj;
    for (const key of ['data', 'items', 'regras', 'results', 'list']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    const msg = pick<string>(obj, 'message', 'error', 'msg');
    if (msg) throw new Error(msg);
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function criarRegraEquivalencia(dto: RegraEquivalenciaDTO): Promise<RegraEquivalenciaResponse> {
  const response = await httpClient.post<RegraEquivalenciaResponse>(`${BASE}/create`, dto);
  return response.data;
}

export async function listarRegrasEquivalencia(filters?: { item_pai?: string; item_filho?: string }): Promise<RegraEquivalenciaResponse[]> {
  const params = new URLSearchParams();
  if (filters?.item_pai) params.set('item_pai', filters.item_pai);
  if (filters?.item_filho) params.set('item_filho', filters.item_filho);
  const qs = params.toString();
  const response = await httpClient.get<unknown>(`${BASE}/list${qs ? `?${qs}` : ''}`);

  const arr = unwrapArray(response.data);
  if (!arr) return [];

  const result: RegraEquivalenciaResponse[] = [];
  for (const item of arr) {
    const r = parseRegra(item);
    if (r) result.push(r);
  }
  return result;
}

export async function atualizarRegraEquivalencia(codigo: number, dto: RegraEquivalenciaDTO): Promise<RegraEquivalenciaResponse> {
  const response = await httpClient.put<RegraEquivalenciaResponse>(`${BASE}/${codigo}`, dto);
  return response.data;
}

export async function excluirRegraEquivalencia(codigo: number): Promise<void> {
  await httpClient.delete(`${BASE}/${codigo}`);
}
