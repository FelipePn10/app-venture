import { httpClient } from '@/services/httpClient';

const BASE = '/api/cliente/frete';

export interface FreteClienteDTO {
  cliente: string;
  estabelecimento: string;
  valorInicial: number;
  valorFinal: number;
  percentualFrete: number;
}

export interface FreteClienteResponse {
  id: number;
  cliente: string;
  clienteNome: string;
  estabelecimento: string;
  estabNome: string;
  valorInicial: number;
  valorFinal: number;
  percentualFrete: number;
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

function parseFrete(raw: unknown): FreteClienteResponse {
  return {
    id: parseNum(raw, 'id', 'Id', 'COD_FRETE_CLI'),
    cliente: parseStr(raw, 'cliente', 'Cliente', 'COD_CLIENTE'),
    clienteNome: parseStr(raw, 'clienteNome', 'nome', 'NOM_CLIENTE'),
    estabelecimento: parseStr(raw, 'estabelecimento', 'Estabelecimento', 'COD_ESTAB'),
    estabNome: parseStr(raw, 'estabNome', 'estabNome', 'NOM_ESTAB'),
    valorInicial: parseNum(raw, 'valorInicial', 'ValorInicial', 'VLR_INICIAL'),
    valorFinal: parseNum(raw, 'valorFinal', 'ValorFinal', 'VLR_FINAL'),
    percentualFrete: parseNum(raw, 'percentualFrete', 'PercentualFrete', 'PER_FRETE'),
  };
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

export async function criarFreteCliente(dto: FreteClienteDTO): Promise<FreteClienteResponse> {
  const { data } = await httpClient.post(BASE, dto);
  return parseFrete(data);
}

export async function atualizarFreteCliente(id: number, dto: Partial<FreteClienteDTO>): Promise<FreteClienteResponse> {
  const { data } = await httpClient.put(`${BASE}/${id}`, dto);
  return parseFrete(data);
}

export async function listarFretesCliente(cliente?: string): Promise<FreteClienteResponse[]> {
  const { data } = await httpClient.get(BASE, { params: cliente ? { cliente } : {} });
  return unwrapArray(data).map(parseFrete);
}

export async function excluirFreteCliente(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/${id}`);
}
