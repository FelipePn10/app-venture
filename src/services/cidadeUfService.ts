import { httpClient } from '@/services/httpClient';

const BASE = '/api/cidades';

// ─── Types ────────────────────────────────────────────────────────────────────

type Obj = Record<string, unknown>;

// ─── Defensive parsers ────────────────────────────────────────────────────────

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

function parseBool(obj: Obj, ...keys: string[]): boolean {
  const v = pick<unknown>(obj, ...keys);
  if (v === undefined) return false;
  return v !== false && v !== 0 && v !== 'false' && v !== '';
}

function unwrapArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Obj;
    for (const key of ['data', 'items', 'results', 'list', 'cidades']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    const msg = pick<string>(obj, 'message', 'error', 'msg');
    if (msg) throw new Error(msg);
  }
  return null;
}

// ─── Cidade ───────────────────────────────────────────────────────────────────

export type TipoCidade = 'Capital' | 'Interior';

export interface CidadeDTO {
  codigo: string;
  cidade: string;
  ddd: string;
  tipo: TipoCidade;
  zf: boolean;
  gmb: string;
  ibge: string;
  cod_tom: string;
}

export interface CidadeResponse {
  codigo: string;
  cidade: string;
  ddd: string;
  tipo: string;
  zf: boolean;
  gmb: string;
  ibge: string;
  cod_tom: string;
}

function parseCidade(raw: unknown): CidadeResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;
  const codigo = parseStr(obj, 'codigo', 'Codigo');
  if (!codigo) return null;
  return {
    codigo,
    cidade: parseStr(obj, 'cidade', 'Cidade'),
    ddd: parseStr(obj, 'ddd', 'DDD'),
    tipo: parseStr(obj, 'tipo', 'Tipo'),
    zf: parseBool(obj, 'zf', 'ZF'),
    gmb: parseStr(obj, 'gmb', 'GMB'),
    ibge: parseStr(obj, 'ibge', 'IBGE'),
    cod_tom: parseStr(obj, 'cod_tom', 'CodTOM', 'codTOM'),
  };
}

export async function createCidade(dto: CidadeDTO): Promise<CidadeResponse> {
  const response = await httpClient.post<CidadeResponse>(`${BASE}/create`, dto);
  return response.data;
}

export async function listCidades(filters?: Record<string, string>): Promise<CidadeResponse[]> {
  const params = new URLSearchParams(filters);
  const qs = params.toString();
  const response = await httpClient.get<unknown>(`${BASE}/list${qs ? `?${qs}` : ''}`);
  const arr = unwrapArray(response.data);
  if (!arr) return [];
  const result: CidadeResponse[] = [];
  for (const item of arr) {
    const c = parseCidade(item);
    if (c) result.push(c);
  }
  return result;
}

export async function getCidade(codigo: string): Promise<CidadeResponse | null> {
  const response = await httpClient.get<unknown>(`${BASE}/${codigo}`);
  const direct = parseCidade(response.data);
  if (direct) return direct;
  if (response.data && typeof response.data === 'object') {
    const obj = response.data as Obj;
    for (const key of ['data', 'cidade', 'result', 'item']) {
      const inner = parseCidade(obj[key]);
      if (inner) return inner;
    }
  }
  return null;
}

export async function updateCidade(codigo: string, dto: CidadeDTO): Promise<CidadeResponse> {
  const response = await httpClient.put<CidadeResponse>(`${BASE}/${codigo}`, dto);
  return response.data;
}

export async function deleteCidade(codigo: string): Promise<void> {
  await httpClient.delete(`${BASE}/${codigo}`);
}
