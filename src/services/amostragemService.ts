import { httpClient } from '@/services/fiscalShared';

// Amostragem por atributos da NBR 5426 (= ISO 2859-1): procedimentos da
// empresa, calculadora e estado de severidade por item × fornecedor/operação.
const BASE = '/api/quality/amostragem';

export type Severidade = 'NORMAL' | 'APERTADA' | 'ATENUADA';
export type TipoProcedimento = 'NORMA' | 'FIXO' | 'CEM';

export interface PlanoAmostragem {
  letra: string;
  letra_da_tabela: string;
  severidade: Severidade;
  nqa: string;
  n: number;
  ac: number;
  re: number;
  cem_por_cento: boolean;
}

export interface TabelasAmostragem { nqas: string[]; niveis: string[]; severidades: Severidade[]; }

export interface ProcedimentoAmostragem {
  id: number;
  codigo: string;
  descricao: string;
  tipo: TipoProcedimento;
  nivel?: string;
  nqa?: string;
  permite_atenuada: boolean;
  amostra_fixa?: number;
  ac_fixo?: number;
  re_fixo?: number;
  skip_lot: { apos_aceitos: number; frequencia: number };
  ativo: boolean;
  updated_at: string;
}

export interface ProcedimentoAmostragemDTO {
  codigo: string;
  descricao: string;
  tipo: TipoProcedimento;
  nivel?: string;
  nqa?: string;
  permite_atenuada: boolean;
  amostra_fixa?: number;
  ac_fixo?: number;
  re_fixo?: number;
  skip_apos?: number;
  skip_frequencia?: number;
  ativo: boolean;
}

export interface EstadoAmostragem {
  severidade: Severidade;
  pontuacao: number;
  ultimos: boolean[] | null;
  recusas_em_apertada: number;
  suspensa: boolean;
  aceitos_seguidos: number;
  lotes_desde_inspecao: number;
}

export interface EstadoDoItem {
  procedure_id: number;
  procedure_codigo: string;
  item_code: number;
  chave: string;
  estado: EstadoAmostragem;
  updated_at: string;
}

export interface EventoAmostragem {
  id: number;
  procedure_id: number;
  item_code: number;
  chave: string;
  de: Severidade;
  para: Severidade;
  evento: 'TROCA' | 'SUSPENSAO' | 'LIBERACAO';
  motivo: string;
  referencia?: string;
  created_at: string;
}

export async function tabelasAmostragem(): Promise<TabelasAmostragem> {
  const { data } = await httpClient.get(`${BASE}/tabelas`);
  return data as TabelasAmostragem;
}

export interface PlanoDoLote { plano: PlanoAmostragem; inspecionar: boolean; suspensa: boolean; estado: EstadoAmostragem; }

/** Plano do próximo lote do item pela severidade corrente — só consulta, não registra nada. */
export async function planoDoLote(procedimento: number, item: number, chave: string, quantidade: string): Promise<PlanoDoLote> {
  const { data } = await httpClient.get(`${BASE}/plano-do-lote`, { params: { procedimento, item, chave, quantidade } });
  return data as PlanoDoLote;
}

export async function calcularAmostragem(lote: number, nivel: string, nqa: string, severidade: Severidade): Promise<PlanoAmostragem> {
  const { data } = await httpClient.get(`${BASE}/calcular`, { params: { lote, nivel, nqa, severidade } });
  return data as PlanoAmostragem;
}

export async function listarProcedimentosAmostragem(): Promise<ProcedimentoAmostragem[]> {
  const { data } = await httpClient.get(`${BASE}/procedimentos`);
  return (data ?? []) as ProcedimentoAmostragem[];
}

export async function salvarProcedimentoAmostragem(id: number | null, dto: ProcedimentoAmostragemDTO): Promise<ProcedimentoAmostragem> {
  const { data } = id
    ? await httpClient.put(`${BASE}/procedimentos/${id}`, dto)
    : await httpClient.post(`${BASE}/procedimentos`, dto);
  return data as ProcedimentoAmostragem;
}

export async function estadosAmostragem(item = 0): Promise<EstadoDoItem[]> {
  const { data } = await httpClient.get(`${BASE}/estados`, { params: item ? { item } : undefined });
  return (data ?? []) as EstadoDoItem[];
}

export async function eventosAmostragem(item = 0): Promise<EventoAmostragem[]> {
  const { data } = await httpClient.get(`${BASE}/eventos`, { params: item ? { item } : undefined });
  return (data ?? []) as EventoAmostragem[];
}

export async function liberarSuspensaoAmostragem(procedureId: number, itemCode: number, chave: string, motivo: string): Promise<EstadoAmostragem> {
  const { data } = await httpClient.post(`${BASE}/estados/liberar`, { procedure_id: procedureId, item_code: itemCode, chave, motivo });
  return data as EstadoAmostragem;
}

/** "F:12" → "Fornecedor 12"; "O:5" → "Operação 5"; "-" → "Geral". */
export function rotuloDaChave(chave: string): string {
  if (chave.startsWith('F:')) return `Fornecedor ${chave.slice(2)}`;
  if (chave.startsWith('O:')) return `Operação ${chave.slice(2)}`;
  return 'Geral';
}
