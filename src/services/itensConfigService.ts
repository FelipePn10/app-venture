import { httpClient } from '@/services/httpClient';

const BASE = '/api/itens-config';

export interface RegraItemConfigDTO {
  item: string;
  tabela: string;
  campo: string;
  conteudo: string;
  descricao: string;
  situacao: 'Ativo' | 'Inativo';
  caracteristicas: RegraCaracteristicaDTO[];
}

export interface RegraCaracteristicaDTO {
  caracteristica: string;
  operador: string;
  variavel: string;
}

export interface ReplicacaoParamsDTO {
  itens: string;
  configurado: string;
  classificacao: string;
  pastas: string[];
}

export interface RegraItemConfigResponse {
  codigo: number;
  item: string;
  tabela: string;
  campo: string;
  conteudo: string;
  descricao: string;
  situacao: 'Ativo' | 'Inativo';
  caracteristicas: RegraCaracteristicaDTO[];
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

function parseCaracteristica(raw: unknown): RegraCaracteristicaDTO {
  if (!raw || typeof raw !== 'object') return { caracteristica: '', operador: '', variavel: '' };
  const obj = raw as Obj;
  return {
    caracteristica: parseStr(obj, 'caracteristica', 'Caracteristica', 'CARACTERISTICA'),
    operador: parseStr(obj, 'operador', 'Operador', 'OPERADOR'),
    variavel: parseStr(obj, 'variavel', 'Variavel', 'VARIAVEL'),
  };
}

function parseRegraItem(raw: unknown): RegraItemConfigResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;

  const sit = parseStr(obj, 'situacao', 'Situacao', 'SITUACAO');
  const situacao: 'Ativo' | 'Inativo' = sit.toLowerCase() === 'inativo' ? 'Inativo' : 'Ativo';

  const arrCarac = pick<unknown[]>(obj, 'caracteristicas', 'Caracteristicas', 'CARACTERISTICAS');
  const caracteristicas: RegraCaracteristicaDTO[] = Array.isArray(arrCarac)
    ? arrCarac.map(parseCaracteristica)
    : [];

  return {
    codigo: parseNum(obj, 'codigo', 'Codigo', 'CODIGO') ?? 0,
    item: parseStr(obj, 'item', 'Item', 'ITEM'),
    tabela: parseStr(obj, 'tabela', 'Tabela', 'TABELA'),
    campo: parseStr(obj, 'campo', 'Campo', 'CAMPO'),
    conteudo: parseStr(obj, 'conteudo', 'Conteudo', 'CONTEUDO'),
    descricao: parseStr(obj, 'descricao', 'Descricao', 'DESCRICAO'),
    situacao,
    caracteristicas,
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

export async function criarRegraItemConfig(dto: RegraItemConfigDTO): Promise<RegraItemConfigResponse> {
  const response = await httpClient.post<RegraItemConfigResponse>(`${BASE}/create`, dto);
  return response.data;
}

export async function listarRegrasItemConfig(filters?: { item?: string }): Promise<RegraItemConfigResponse[]> {
  const params = new URLSearchParams();
  if (filters?.item) params.set('item', filters.item);
  const qs = params.toString();
  const response = await httpClient.get<unknown>(`${BASE}/list${qs ? `?${qs}` : ''}`);

  const arr = unwrapArray(response.data);
  if (!arr) return [];

  const result: RegraItemConfigResponse[] = [];
  for (const item of arr) {
    const r = parseRegraItem(item);
    if (r) result.push(r);
  }
  return result;
}

export async function buscarRegraItemConfig(codigo: number): Promise<RegraItemConfigResponse | null> {
  try {
    const response = await httpClient.get<unknown>(`${BASE}/${codigo}`);
    return parseRegraItem(response.data);
  } catch {
    return null;
  }
}

export async function atualizarRegraItemConfig(codigo: number, dto: RegraItemConfigDTO): Promise<RegraItemConfigResponse> {
  const response = await httpClient.put<RegraItemConfigResponse>(`${BASE}/${codigo}`, dto);
  return response.data;
}

export async function replicarParametros(dto: ReplicacaoParamsDTO): Promise<{ message: string }> {
  const response = await httpClient.post<{ message: string }>(`${BASE}/replicar`, dto);
  return response.data;
}

export async function excluirRegraItemConfig(codigo: number): Promise<void> {
  await httpClient.delete(`${BASE}/${codigo}`);
}
