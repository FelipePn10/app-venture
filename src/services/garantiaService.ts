import { httpClient } from '@/services/httpClient';

const BASE = '/api/garantia/devolucao';

export interface DevolucaoFilter {
  cliente?: string;
  pedido?: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface DevolucaoResponse {
  cliente: string;
  clienteNome: string;
  pedido: string;
  vlrLiqIpi: number;
}

function parseStr(raw: unknown, ...keys: string[]): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') return String(raw);
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) { const v = r[k]; if (typeof v === 'string') return v; if (typeof v === 'number') return String(v); }
  }
  return '';
}

function parseNum(raw: unknown, ...keys: string[]): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') { const n = Number(raw); return isNaN(n) ? 0 : n; }
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) { const v = r[k]; if (typeof v === 'number') return v; if (typeof v === 'string') { const n = Number(v); return isNaN(n) ? 0 : n; } }
  }
  return 0;
}

function parseDevolucao(raw: unknown): DevolucaoResponse {
  return {
    cliente: parseStr(raw, 'cliente', 'Cliente', 'COD_CLIENTE'),
    clienteNome: parseStr(raw, 'clienteNome', 'nome', 'Nome', 'NOM_CLIENTE'),
    pedido: parseStr(raw, 'pedido', 'Pedido', 'NUM_PEDIDO'),
    vlrLiqIpi: parseNum(raw, 'vlrLiqIpi', 'VlrLiqIpi', 'VLR_LIQ_IPI'),
  };
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

export async function gerarPedidosDevolucao(filters: DevolucaoFilter): Promise<DevolucaoResponse[]> {
  const { data } = await httpClient.post(`${BASE}/gerar`, filters);
  return unwrapArray(data).map(parseDevolucao);
}

export async function listarDevolucoes(filters: DevolucaoFilter): Promise<DevolucaoResponse[]> {
  const { data } = await httpClient.get(BASE, { params: filters });
  return unwrapArray(data).map(parseDevolucao);
}
