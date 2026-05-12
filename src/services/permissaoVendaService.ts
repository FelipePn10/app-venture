import { httpClient } from '@/services/httpClient';

const BASE = '/api/permissao-venda';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface PermissaoVendaDTO {
  cliente: string;
  estab_faturamento: string;
  representante: string;
}

export interface PermissaoVendaResponse {
  cliente: string;
  estab_faturamento: string;
  representante: string;
  cliente_nome: string;
  estab_faturamento_nome: string;
  representante_nome: string;
}

export interface ItemPermissaoDTO {
  item: string;
  permissao: 'Permissão' | 'Restrição';
}

export interface ItemPermissaoResponse {
  item: string;
  item_nome: string;
  permissao: 'Permissão' | 'Restrição';
}

export interface ClassificacaoPermissaoDTO {
  classificacao: string;
  permissao: 'Permissão' | 'Restrição';
}

export interface ClassificacaoPermissaoResponse {
  classificacao: string;
  classificacao_nome: string;
  permissao: 'Permissão' | 'Restrição';
}

// ─── Defensive parsers ────────────────────────────────────────────────────────

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

function parsePermissao(raw: string): 'Permissão' | 'Restrição' {
  const normalized = raw?.trim().toLowerCase();
  return normalized === 'restrição' || normalized === 'restricao' ? 'Restrição' : 'Permissão';
}

function parsePermissaoVenda(raw: unknown): PermissaoVendaResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;
  const cliente = parseStr(obj, 'cliente', 'Cliente', 'COD_CLIENTE');
  if (!cliente) return null;
  return {
    cliente,
    estab_faturamento: parseStr(obj, 'estab_faturamento', 'EstabFaturamento', 'ESTAB_FATURAMENTO'),
    representante: parseStr(obj, 'representante', 'Representante', 'REPRESENTANTE'),
    cliente_nome: parseStr(obj, 'cliente_nome', 'clienteNome', 'ClienteNome', 'NOM_CLIENTE'),
    estab_faturamento_nome: parseStr(obj, 'estab_faturamento_nome', 'estabFaturamentoNome', 'EstabFaturamentoNome', 'NOM_ESTAB_FAT'),
    representante_nome: parseStr(obj, 'representante_nome', 'representanteNome', 'RepresentanteNome', 'NOM_REPRESENTANTE'),
  };
}

function parseItemPermissao(raw: unknown): ItemPermissaoResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;
  const item = parseStr(obj, 'item', 'Item', 'COD_ITEM');
  if (!item) return null;
  return {
    item,
    item_nome: parseStr(obj, 'item_nome', 'itemNome', 'ItemNome', 'NOM_ITEM'),
    permissao: parsePermissao(parseStr(obj, 'permissao', 'Permissao', 'PERMISSAO')),
  };
}

function parseClassificacaoPermissao(raw: unknown): ClassificacaoPermissaoResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;
  const classificacao = parseStr(obj, 'classificacao', 'Classificacao', 'CLASSIFICACAO');
  if (!classificacao) return null;
  return {
    classificacao,
    classificacao_nome: parseStr(obj, 'classificacao_nome', 'classificacaoNome', 'ClassificacaoNome', 'NOM_CLASSIFICACAO'),
    permissao: parsePermissao(parseStr(obj, 'permissao', 'Permissao', 'PERMISSAO')),
  };
}

function unwrapArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Obj;
    for (const key of ['data', 'items', 'results', 'list', 'permissoes']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    const msg = pick<string>(obj, 'message', 'error', 'msg');
    if (msg) throw new Error(msg);
  }
  return null;
}

// ─── CRUD: Cabeçalho ──────────────────────────────────────────────────────────

export async function createPermissaoVenda(dto: PermissaoVendaDTO): Promise<PermissaoVendaResponse> {
  const response = await httpClient.post<PermissaoVendaResponse>(`${BASE}/create`, dto);
  return response.data;
}

export async function updatePermissaoVenda(id: string, dto: PermissaoVendaDTO): Promise<PermissaoVendaResponse> {
  const response = await httpClient.put<PermissaoVendaResponse>(`${BASE}/${id}`, dto);
  return response.data;
}

export async function listPermissaoVenda(filters?: Record<string, string>): Promise<PermissaoVendaResponse[]> {
  const params = new URLSearchParams();
  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.set(k, v);
    }
  }
  const qs = params.toString();
  const response = await httpClient.get<unknown>(`${BASE}/list${qs ? `?${qs}` : ''}`);
  const arr = unwrapArray(response.data);
  if (!arr) return [];
  const result: PermissaoVendaResponse[] = [];
  for (const item of arr) {
    const parsed = parsePermissaoVenda(item);
    if (parsed) result.push(parsed);
  }
  return result;
}

export async function getPermissaoVenda(id: string): Promise<PermissaoVendaResponse | null> {
  const response = await httpClient.get<unknown>(`${BASE}/${id}`);
  const direct = parsePermissaoVenda(response.data);
  if (direct) return direct;
  if (response.data && typeof response.data === 'object') {
    const obj = response.data as Obj;
    for (const key of ['data', 'permissao', 'result', 'item']) {
      const inner = parsePermissaoVenda(obj[key]);
      if (inner) return inner;
    }
  }
  return null;
}

export async function deletePermissaoVenda(id: string): Promise<void> {
  await httpClient.delete(`${BASE}/${id}`);
}

// ─── CRUD: Itens ──────────────────────────────────────────────────────────────

export async function listItensPermissao(permissaoId: string): Promise<ItemPermissaoResponse[]> {
  const response = await httpClient.get<unknown>(`${BASE}/${permissaoId}/itens`);
  const arr = unwrapArray(response.data);
  if (!arr) return [];
  const result: ItemPermissaoResponse[] = [];
  for (const raw of arr) {
    const parsed = parseItemPermissao(raw);
    if (parsed) result.push(parsed);
  }
  return result;
}

export async function saveItensPermissao(permissaoId: string, dto: ItemPermissaoDTO[]): Promise<ItemPermissaoResponse[]> {
  const response = await httpClient.post<ItemPermissaoResponse[]>(`${BASE}/${permissaoId}/itens`, dto);
  return response.data;
}

// ─── CRUD: Classificações ─────────────────────────────────────────────────────

export async function listClassificacoesPermissao(permissaoId: string): Promise<ClassificacaoPermissaoResponse[]> {
  const response = await httpClient.get<unknown>(`${BASE}/${permissaoId}/classificacoes`);
  const arr = unwrapArray(response.data);
  if (!arr) return [];
  const result: ClassificacaoPermissaoResponse[] = [];
  for (const raw of arr) {
    const parsed = parseClassificacaoPermissao(raw);
    if (parsed) result.push(parsed);
  }
  return result;
}

export async function saveClassificacoesPermissao(permissaoId: string, dto: ClassificacaoPermissaoDTO[]): Promise<ClassificacaoPermissaoResponse[]> {
  const response = await httpClient.post<ClassificacaoPermissaoResponse[]>(`${BASE}/${permissaoId}/classificacoes`, dto);
  return response.data;
}
