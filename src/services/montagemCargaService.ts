import { httpClient } from '@/services/httpClient';

const BASE = '/api/montagem-carga';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface MontagemCargaDTO {
  tp_frete: string;
  pedidos: string[];
}

export interface PedidoCargaResponse {
  pedido: string;
  cliente: string;
  cliente_nome: string;
  valor: number;
  peso: number;
  volumes: number;
}

export interface MontagemCargaResponse {
  carga: string;
  tp_frete: string;
  pedidos: PedidoCargaResponse[];
  total_pedidos: number;
  total_valor: number;
  total_peso: number;
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

function parseNum(obj: Obj, ...keys: string[]): number {
  const v = pick<unknown>(obj, ...keys);
  if (v === undefined || v === null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function parsePedidoCarga(raw: unknown): PedidoCargaResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;
  const pedido = parseStr(obj, 'pedido', 'Pedido', 'NUM_PEDIDO');
  if (!pedido) return null;
  return {
    pedido,
    cliente: parseStr(obj, 'cliente', 'Cliente', 'COD_CLIENTE'),
    cliente_nome: parseStr(obj, 'cliente_nome', 'clienteNome', 'ClienteNome', 'NOM_CLIENTE'),
    valor: parseNum(obj, 'valor', 'Valor', 'VALOR'),
    peso: parseNum(obj, 'peso', 'Peso', 'PESO'),
    volumes: parseNum(obj, 'volumes', 'Volumes', 'VOLUMES'),
  };
}

function parseMontagemCarga(raw: unknown): MontagemCargaResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;
  const carga = parseStr(obj, 'carga', 'Carga', 'CARGA', 'id');
  if (!carga) return null;
  const pedidosRaw = pick<unknown[]>(obj, 'pedidos', 'Pedidos', 'PEDIDOS');
  const pedidos: PedidoCargaResponse[] = [];
  if (Array.isArray(pedidosRaw)) {
    for (const p of pedidosRaw) {
      const parsed = parsePedidoCarga(p);
      if (parsed) pedidos.push(parsed);
    }
  }
  return {
    carga,
    tp_frete: parseStr(obj, 'tp_frete', 'TpFrete', 'TP_FRETE'),
    pedidos,
    total_pedidos: parseNum(obj, 'total_pedidos', 'totalPedidos', 'TotalPedidos', 'TOTAL_PEDIDOS') || pedidos.length,
    total_valor: parseNum(obj, 'total_valor', 'totalValor', 'TotalValor', 'TOTAL_VALOR'),
    total_peso: parseNum(obj, 'total_peso', 'totalPeso', 'TotalPeso', 'TOTAL_PESO'),
  };
}

function unwrapArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Obj;
    for (const key of ['data', 'items', 'results', 'list', 'cargas']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    const msg = pick<string>(obj, 'message', 'error', 'msg');
    if (msg) throw new Error(msg);
  }
  return null;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function executarMontagemCarga(dto: MontagemCargaDTO): Promise<MontagemCargaResponse> {
  const response = await httpClient.post<MontagemCargaResponse>(`${BASE}/executar`, dto);
  return response.data;
}

export async function listMontagemCarga(filters?: Record<string, string>): Promise<MontagemCargaResponse[]> {
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
  const result: MontagemCargaResponse[] = [];
  for (const item of arr) {
    const parsed = parseMontagemCarga(item);
    if (parsed) result.push(parsed);
  }
  return result;
}

export async function getMontagemCarga(id: string): Promise<MontagemCargaResponse | null> {
  const response = await httpClient.get<unknown>(`${BASE}/${id}`);
  const direct = parseMontagemCarga(response.data);
  if (direct) return direct;
  if (response.data && typeof response.data === 'object') {
    const obj = response.data as Obj;
    for (const key of ['data', 'carga', 'result', 'item']) {
      const inner = parseMontagemCarga(obj[key]);
      if (inner) return inner;
    }
  }
  return null;
}

export async function deleteMontagemCarga(id: string): Promise<void> {
  await httpClient.delete(`${BASE}/${id}`);
}
