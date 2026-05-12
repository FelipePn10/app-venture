import { httpClient } from '@/services/httpClient';

const BASE = '/api/orientacao-entrega';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface OrientacaoEntregaDTO {
  responsavel: string;
  cliente: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  rota: string;
  orientacao: string;
}

export interface OrientacaoEntregaResponse {
  responsavel: string;
  responsavel_nome: string;
  cliente: string;
  cliente_nome: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  rota: string;
  rota_nome: string;
  orientacao: string;
  data: string;
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

function parseOrientacaoEntrega(raw: unknown): OrientacaoEntregaResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;
  const cliente = parseStr(obj, 'cliente', 'Cliente', 'COD_CLIENTE');
  if (!cliente) return null;
  return {
    responsavel: parseStr(obj, 'responsavel', 'Responsavel', 'RESPONSAVEL'),
    responsavel_nome: parseStr(obj, 'responsavel_nome', 'responsavelNome', 'ResponsavelNome', 'NOM_RESPONSAVEL'),
    cliente,
    cliente_nome: parseStr(obj, 'cliente_nome', 'clienteNome', 'ClienteNome', 'NOM_CLIENTE'),
    cep: parseStr(obj, 'cep', 'Cep', 'CEP'),
    endereco: parseStr(obj, 'endereco', 'Endereco', 'ENDERECO'),
    bairro: parseStr(obj, 'bairro', 'Bairro', 'BAIRRO'),
    cidade: parseStr(obj, 'cidade', 'Cidade', 'CIDADE'),
    uf: parseStr(obj, 'uf', 'Uf', 'UF'),
    rota: parseStr(obj, 'rota', 'Rota', 'ROTA'),
    rota_nome: parseStr(obj, 'rota_nome', 'rotaNome', 'RotaNome', 'NOM_ROTA'),
    orientacao: parseStr(obj, 'orientacao', 'Orientacao', 'ORIENTACAO'),
    data: parseStr(obj, 'data', 'Data', 'DATA'),
  };
}

function unwrapArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Obj;
    for (const key of ['data', 'items', 'results', 'list', 'orientacoes']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    const msg = pick<string>(obj, 'message', 'error', 'msg');
    if (msg) throw new Error(msg);
  }
  return null;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createOrientacaoEntrega(dto: OrientacaoEntregaDTO): Promise<OrientacaoEntregaResponse> {
  const response = await httpClient.post<OrientacaoEntregaResponse>(`${BASE}/create`, dto);
  return response.data;
}

export async function updateOrientacaoEntrega(id: string, dto: OrientacaoEntregaDTO): Promise<OrientacaoEntregaResponse> {
  const response = await httpClient.put<OrientacaoEntregaResponse>(`${BASE}/${id}`, dto);
  return response.data;
}

export async function listOrientacaoEntrega(filters?: Record<string, string>): Promise<OrientacaoEntregaResponse[]> {
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
  const result: OrientacaoEntregaResponse[] = [];
  for (const item of arr) {
    const parsed = parseOrientacaoEntrega(item);
    if (parsed) result.push(parsed);
  }
  return result;
}

export async function getOrientacaoEntrega(id: string): Promise<OrientacaoEntregaResponse | null> {
  const response = await httpClient.get<unknown>(`${BASE}/${id}`);
  const direct = parseOrientacaoEntrega(response.data);
  if (direct) return direct;
  if (response.data && typeof response.data === 'object') {
    const obj = response.data as Obj;
    for (const key of ['data', 'orientacao', 'result', 'item']) {
      const inner = parseOrientacaoEntrega(obj[key]);
      if (inner) return inner;
    }
  }
  return null;
}

export async function deleteOrientacaoEntrega(id: string): Promise<void> {
  await httpClient.delete(`${BASE}/${id}`);
}

export async function buscarEnderecoPorCep(cep: string): Promise<OrientacaoEntregaResponse | null> {
  const response = await httpClient.get<unknown>(`${BASE}/cep/${cep}`);
  return parseOrientacaoEntrega(response.data);
}
