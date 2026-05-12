import { httpClient } from '@/services/httpClient';

const BASE = '/api/custo/precificacao';

export interface PrecificacaoDTO {
  codigo?: string;
  descricao: string;
  empresa: string;
}

export interface RevisaoDTO {
  codigo: string;
  descricao: string;
  dataValidade: string;
  situacao: 'Aberta' | 'Fechada';
  observacoes: string;
}

export interface PrecificacaoResponse {
  codigo: string;
  descricao: string;
  empresa: string;
  revisoes: number;
  dataCadastro: string;
  revisoesList: RevisaoResponse[];
}

export interface RevisaoResponse {
  codigo: string;
  descricao: string;
  dataCadastro: string;
  dataValidade: string;
  ultimaAlteracao: string;
  ultimoCalculo: string;
  situacao: string;
  observacoes: string;
}

export interface ItemPrecificacaoDTO {
  linha: number;
  codigo: string;
  mascaraId: string;
  quantidade: number;
  precoVenda: number;
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

function parseRevisao(raw: unknown): RevisaoResponse {
  return {
    codigo: parseStr(raw, 'codigo', 'Codigo', 'COD_REVISAO'),
    descricao: parseStr(raw, 'descricao', 'Descricao', 'DES_REVISAO'),
    dataCadastro: parseStr(raw, 'dataCadastro', 'DataCadastro', 'DAT_CADASTRO'),
    dataValidade: parseStr(raw, 'dataValidade', 'DataValidade', 'DAT_VALIDADE'),
    ultimaAlteracao: parseStr(raw, 'ultimaAlteracao', 'UltimaAlteracao', 'DAT_ULT_ALT'),
    ultimoCalculo: parseStr(raw, 'ultimoCalculo', 'UltimoCalculo', 'DAT_ULT_CALC'),
    situacao: parseStr(raw, 'situacao', 'Situacao', 'SITUACAO'),
    observacoes: parseStr(raw, 'observacoes', 'Observacoes', 'OBS'),
  };
}

function parsePrecificacao(raw: unknown): PrecificacaoResponse {
  return {
    codigo: parseStr(raw, 'codigo', 'Codigo', 'COD_PRECIF'),
    descricao: parseStr(raw, 'descricao', 'Descricao', 'DES_PRECIF'),
    empresa: parseStr(raw, 'empresa', 'Empresa', 'COD_EMPRESA'),
    revisoes: parseNum(raw, 'revisoes', 'Revisoes', 'QTD_REVISOES'),
    dataCadastro: parseStr(raw, 'dataCadastro', 'DataCadastro', 'DAT_CADASTRO'),
    revisoesList: Array.isArray((raw as any)?.revisoesList ?? (raw as any)?.RevisoesList)
      ? ((raw as any)?.revisoesList ?? (raw as any)?.RevisoesList).map(parseRevisao)
      : [],
  };
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

export async function criarPrecificacao(dto: PrecificacaoDTO): Promise<PrecificacaoResponse> {
  const { data } = await httpClient.post(BASE, dto);
  return parsePrecificacao(data);
}

export async function listarPrecificacoes(): Promise<PrecificacaoResponse[]> {
  const { data } = await httpClient.get(BASE);
  return unwrapArray(data).map(parsePrecificacao);
}

export async function buscarPrecificacao(codigo: string): Promise<PrecificacaoResponse | null> {
  try {
    const { data } = await httpClient.get(`${BASE}/${codigo}`);
    return parsePrecificacao(data);
  } catch { return null; }
}

export async function excluirPrecificacao(codigo: string): Promise<void> {
  await httpClient.delete(`${BASE}/${codigo}`);
}

export async function calcularPrecificacao(codigo: string, revisao: string): Promise<void> {
  await httpClient.post(`${BASE}/${codigo}/revisao/${revisao}/calcular`);
}

export async function gerarPedidoFromPrecificacao(codigo: string, revisao: string, itens: string[]): Promise<string> {
  const { data } = await httpClient.post(`${BASE}/${codigo}/revisao/${revisao}/gerar-pedido`, { itens });
  return parseStr(data, 'pedido', 'Pedido', 'NUM_PEDIDO');
}

export async function gerarTabelaFromPrecificacao(codigo: string, revisao: string, itens: string[]): Promise<void> {
  await httpClient.post(`${BASE}/${codigo}/revisao/${revisao}/gerar-tabela`, { itens });
}
