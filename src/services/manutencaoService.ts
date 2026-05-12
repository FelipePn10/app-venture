import { httpClient } from '@/services/httpClient';

const BASE = '/api/manutencao';

export interface OrdemServicoFilter {
  plano?: string;
  ordemInicio?: string;
  ordemFim?: string;
  dtSolicitacaoInicio?: string;
  dtSolicitacaoFim?: string;
  dtFechamentoInicio?: string;
  dtFechamentoFim?: string;
  solicitante?: string;
  servico?: string;
  executor?: string;
  grRecurso?: string;
  recurso?: string;
  tipo?: string;
  planejadas?: boolean;
  liberadas?: boolean;
  firmes?: boolean;
  encerradas?: boolean;
}

export interface OrdemServicoResponse {
  emp: string;
  numOrdem: string;
  tipo: string;
  recurso: string;
  recursoDesc: string;
  emissao: string;
  fechamento: string;
  solicitante: string;
  situacao: string;
  status: string;
  urgente: boolean;
  prevista: string;
  tipoProblema: string;
  manutencao: string;
}

export interface ApontamentoDTO {
  ordem: string;
  servico: string;
  executor: string;
  dataInicio: string;
  horaInicio: string;
  dataFim: string;
  horaFim: string;
  tempoHoras: number;
  diagnostico: string;
  efeito: string;
  causa: string;
  consumos: ConsumoDTO[];
  gastosTerceiros: GastoDTO[];
}

export interface ConsumoDTO {
  item: string;
  mascaraId: string;
  almox: string;
  quantidadeTotal: number;
  dataDemanda: string;
}

export interface GastoDTO {
  data: string;
  fornecedor: string;
  nfEntrada: string;
  valorTotal: number;
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


function parseBool(raw: unknown, ...keys: string[]): boolean {
  if (raw === null || raw === undefined) return false;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw === 'true' || raw === 'S' || raw === '1';
  if (typeof raw === 'number') return raw === 1;
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) { const v = r[k]; if (typeof v === 'boolean') return v; if (typeof v === 'string') return v === 'true' || v === 'S' || v === '1'; if (typeof v === 'number') return v === 1; }
  }
  return false;
}

function parseOrdem(raw: unknown): OrdemServicoResponse {
  return {
    emp: parseStr(raw, 'emp', 'Emp', 'COD_EMPRESA'),
    numOrdem: parseStr(raw, 'numOrdem', 'NumOrdem', 'NUM_ORDEM'),
    tipo: parseStr(raw, 'tipo', 'Tipo', 'TIPO'),
    recurso: parseStr(raw, 'recurso', 'Recurso', 'COD_RECURSO'),
    recursoDesc: parseStr(raw, 'recursoDesc', 'descricao', 'NOM_RECURSO'),
    emissao: parseStr(raw, 'emissao', 'Emissao', 'DAT_EMISSAO'),
    fechamento: parseStr(raw, 'fechamento', 'Fechamento', 'DAT_FECHAMENTO'),
    solicitante: parseStr(raw, 'solicitante', 'Solicitante', 'NOM_SOLICITANTE'),
    situacao: parseStr(raw, 'situacao', 'Situacao', 'SITUACAO'),
    status: parseStr(raw, 'status', 'Status', 'STATUS'),
    urgente: parseBool(raw, 'urgente', 'Urgente', 'FLG_URGENTE'),
    prevista: parseStr(raw, 'prevista', 'Prevista', 'DAT_PREVISTA'),
    tipoProblema: parseStr(raw, 'tipoProblema', 'TipoProblema', 'TIPO_PROBLEMA'),
    manutencao: parseStr(raw, 'manutencao', 'Manutencao', 'TIPO_MANUT'),
  };
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

export async function listarOrdens(filters: OrdemServicoFilter): Promise<OrdemServicoResponse[]> {
  const { data } = await httpClient.get(`${BASE}/ordens`, { params: filters });
  return unwrapArray(data).map(parseOrdem);
}

export async function apontarOrdem(dto: ApontamentoDTO): Promise<void> {
  await httpClient.post(`${BASE}/apontamento`, dto);
}

export async function buscarOrdem(ordem: string): Promise<OrdemServicoResponse | null> {
  try {
    const { data } = await httpClient.get(`${BASE}/ordens/${ordem}`);
    return parseOrdem(data);
  } catch { return null; }
}
