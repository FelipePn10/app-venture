import { httpClient } from '@/services/fiscalShared';

// Metrologia: instrumentos, calibrações e impacto da calibração reprovada.
const BASE = '/api/quality/instrumentos';

export interface Instrumento {
  id: number; codigo: string; descricao: string; grupo: string; fabricante?: string; numero_serie?: string; faixa?: string;
  resolucao?: number; ema?: number; unidade?: string; localizacao?: string; frequencia_dias: number;
  status: 'ATIVO' | 'BLOQUEADO' | 'BAIXADO'; motivo_status?: string; ultima_calibracao?: string; proxima_calibracao?: string;
}
export interface Calibracao {
  id: number; data: string; executor: 'INTERNO' | 'EXTERNO'; laboratorio?: string; certificado?: string; erro_encontrado?: number;
  incerteza?: number; ema?: number; resultado: 'APROVADO' | 'REPROVADO'; ajustado: boolean; proxima?: string; observacoes?: string;
}
export interface Impacto { lote_id: number; lote_numero: number; item_code: number; status: string; decisao?: string; medicoes: number; ultima_medicao: string; }
export interface InstrumentoDTO {
  codigo: string; descricao: string; grupo: string; fabricante?: string; numero_serie?: string; faixa?: string;
  resolucao?: string; ema?: string; unidade?: string; localizacao?: string; frequencia_dias: number;
}
export interface CalibracaoDTO {
  data: string; executor: string; laboratorio?: string; certificado?: string; erro_encontrado?: string; incerteza?: string;
  resultado?: string; ajustado: boolean; observacoes?: string;
}

export async function listarInstrumentos(f: { grupo?: string; situacao?: string; dias?: number; baixados?: boolean } = {}): Promise<Instrumento[]> {
  const params: Record<string, string> = {};
  if (f.grupo) params.grupo = f.grupo;
  if (f.situacao) params.situacao = f.situacao;
  if (f.dias) params.dias = String(f.dias);
  if (f.baixados) params.baixados = 'true';
  const { data } = await httpClient.get(BASE, { params });
  return (data ?? []) as Instrumento[];
}
export async function obterInstrumento(id: number): Promise<Instrumento & { calibracoes: Calibracao[] }> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return data as Instrumento & { calibracoes: Calibracao[] };
}
export async function salvarInstrumento(id: number | null, dto: InstrumentoDTO): Promise<Instrumento> {
  const { data } = id ? await httpClient.put(`${BASE}/${id}`, dto) : await httpClient.post(BASE, dto);
  return data as Instrumento;
}
export async function registrarCalibracao(id: number, dto: CalibracaoDTO): Promise<{ calibracao: Calibracao; instrumento: Instrumento; impacto?: Impacto[]; impacto_desde?: string }> {
  const { data } = await httpClient.post(`${BASE}/${id}/calibracoes`, dto);
  return data;
}
/** Lotes medidos com o instrumento (desde = AAAA-MM-DD; vazio = desde o início). */
export async function impactoDoInstrumento(id: number, desde = ''): Promise<Impacto[]> {
  const { data } = await httpClient.get(`${BASE}/${id}/impacto`, { params: desde ? { desde } : {} });
  return (data ?? []) as Impacto[];
}
export async function baixarInstrumento(id: number, motivo: string): Promise<Instrumento> {
  const { data } = await httpClient.post(`${BASE}/${id}/baixar`, { motivo });
  return data as Instrumento;
}

/** Grupo normalizado como no backend: maiúsculas, sem acento. */
export function normalizarGrupo(s?: string): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().split(/\s+/).filter(Boolean).join(' ');
}
