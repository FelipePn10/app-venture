import { httpClient } from '@/services/httpClient';

const BASE = '/api/chamados';

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface ChamadoDTO {
  chamado?: number;
  data_emissao: string;
  consumidor: string;
  tipo_chamado: string;
  ligacao: string;
  garantia: boolean;
  motivo: string;
  responsavel: string;
  posicao: string;
  situacao: string;
  data_solicitacao?: string;
  data_retirada?: string;
}

export interface ChamadoResponse {
  chamado: number;
  data_emissao: string;
  consumidor: string;
  consumidorNome: string;
  tipo_chamado: string;
  ligacao: string;
  garantia: boolean;
  motivo: string;
  responsavel: string;
  responsavelNome: string;
  posicao: string;
  situacao: string;
  data_solicitacao: string;
  data_retirada: string;
}

export interface ChamadoFilter {
  chamados?: string;
  tipo_chamado?: string;
  data_abertura_inicio?: string;
  data_abertura_fim?: string;
  grupo?: string;
  data_retorno_inicio?: string;
  data_retorno_fim?: string;
  motivo?: string;
  consumidor?: string;
  posicao?: string;
  responsavel?: string;
  situacao?: string;
  estado_vistoria?: string;
}

// ─── Defensive parsers ────────────────────────────────────────────────────────

function parseStr(raw: unknown, ...keys: string[]): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') return String(raw);
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) {
      const v = r[k];
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return String(v);
    }
  }
  return '';
}

function parseNum(raw: unknown, ...keys: string[]): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') { const n = Number(raw); return isNaN(n) ? 0 : n; }
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) {
      const v = r[k];
      if (typeof v === 'number') return v;
      if (typeof v === 'string') { const n = Number(v); return isNaN(n) ? 0 : n; }
    }
  }
  return 0;
}

function parseBool(raw: unknown, ...keys: string[]): boolean {
  if (raw === null || raw === undefined) return false;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw === 'true' || raw === 'S' || raw === '1';
  if (typeof raw === 'number') return raw === 1;
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) {
      const v = r[k];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') return v === 'true' || v === 'S' || v === '1';
      if (typeof v === 'number') return v === 1;
    }
  }
  return false;
}

function parseChamado(raw: unknown): ChamadoResponse {
  return {
    chamado: parseNum(raw, 'chamado', 'Chamado', 'NUM_CHAMADO'),
    data_emissao: parseStr(raw, 'data_emissao', 'DataEmissao', 'DAT_EMISSAO'),
    consumidor: parseStr(raw, 'consumidor', 'Consumidor', 'COD_CONSUMIDOR'),
    consumidorNome: parseStr(raw, 'consumidorNome', 'ConsumidorNome', 'NOM_CONSUMIDOR'),
    tipo_chamado: parseStr(raw, 'tipo_chamado', 'TipoChamado', 'TIPO_CHAMADO'),
    ligacao: parseStr(raw, 'ligacao', 'Ligacao', 'LIGACAO'),
    garantia: parseBool(raw, 'garantia', 'Garantia', 'FLG_GARANTIA'),
    motivo: parseStr(raw, 'motivo', 'Motivo', 'MOTIVO'),
    responsavel: parseStr(raw, 'responsavel', 'Responsavel', 'COD_RESPONSAVEL'),
    responsavelNome: parseStr(raw, 'responsavelNome', 'ResponsavelNome', 'NOM_RESPONSAVEL'),
    posicao: parseStr(raw, 'posicao', 'Posicao', 'POSICAO'),
    situacao: parseStr(raw, 'situacao', 'Situacao', 'SITUACAO'),
    data_solicitacao: parseStr(raw, 'data_solicitacao', 'DataSolicitacao', 'DAT_SOLICITACAO'),
    data_retirada: parseStr(raw, 'data_retirada', 'DataRetirada', 'DAT_RETIRADA'),
  };
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) return (raw as any).data;
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).items)) return (raw as any).items;
  return [];
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function criarChamado(dto: ChamadoDTO): Promise<ChamadoResponse> {
  const { data } = await httpClient.post(BASE, dto);
  return parseChamado(data);
}

export async function atualizarChamado(chamado: number, dto: Partial<ChamadoDTO>): Promise<ChamadoResponse> {
  const { data } = await httpClient.put(`${BASE}/${chamado}`, dto);
  return parseChamado(data);
}

export async function buscarChamado(chamado: number): Promise<ChamadoResponse | null> {
  try {
    const { data } = await httpClient.get(`${BASE}/${chamado}`);
    return parseChamado(data);
  } catch {
    return null;
  }
}

export async function listarChamados(filters: ChamadoFilter): Promise<ChamadoResponse[]> {
  const { data } = await httpClient.get(BASE, { params: filters });
  return unwrapArray(data).map(parseChamado);
}

export async function excluirChamado(chamado: number): Promise<void> {
  await httpClient.delete(`${BASE}/${chamado}`);
}
