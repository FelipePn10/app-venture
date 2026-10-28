import { httpClient } from '@/services/fiscalShared';

// Motor de aprovação: solicitações (os aprovadores decidem nível a nível) e as
// políticas de alçada da empresa (administrador).
const BASE = '/api/aprovacoes';

export type StatusAprovacao = 'PENDENTE' | 'APROVADA' | 'REPROVADA' | 'CANCELADA';

export interface EventoAprovacao {
  evento: string; nivel?: number; ator: string; ator_nome: string; justificativa?: string; created_at: string;
}

export interface SolicitacaoAprovacao {
  id: number;
  tipo: string;
  tipo_nome: string;
  documento_codigo: number;
  valor: number | string;
  descricao: string;
  solicitante: string;
  solicitante_nome: string;
  status: StatusAprovacao;
  niveis_exigidos: number;
  nivel_atual: number;
  posso_aprovar: boolean;
  motivo_bloqueio?: string;
  created_at: string;
  concluida_at?: string;
  eventos?: EventoAprovacao[];
}

export interface NivelAprovacao { ordem?: number; valor_ate: number | string | null; perfil_id?: number | null; user_id?: string | null; }

export interface PoliticaAprovacao {
  tipo: string; nome: string; existe: boolean; descricao?: string; ativa: boolean; segregacao: boolean;
  niveis: NivelAprovacao[]; updated_at?: string;
}

export async function listarSolicitacoes(status = ''): Promise<SolicitacaoAprovacao[]> {
  const { data } = await httpClient.get(`${BASE}/solicitacoes`, { params: status ? { status } : undefined });
  return data as SolicitacaoAprovacao[];
}
export async function obterSolicitacao(id: number): Promise<SolicitacaoAprovacao> {
  const { data } = await httpClient.get(`${BASE}/solicitacoes/${id}`);
  return data as SolicitacaoAprovacao;
}
export async function aprovarSolicitacao(id: number, justificativa: string): Promise<SolicitacaoAprovacao> {
  const { data } = await httpClient.post(`${BASE}/solicitacoes/${id}/aprovar`, { justificativa });
  return data as SolicitacaoAprovacao;
}
export async function reprovarSolicitacao(id: number, justificativa: string): Promise<SolicitacaoAprovacao> {
  const { data } = await httpClient.post(`${BASE}/solicitacoes/${id}/reprovar`, { justificativa });
  return data as SolicitacaoAprovacao;
}
export async function listarPoliticasAprovacao(): Promise<PoliticaAprovacao[]> {
  const { data } = await httpClient.get(`${BASE}/politicas`);
  return data as PoliticaAprovacao[];
}
export async function salvarPoliticaAprovacao(tipo: string, p: { descricao?: string; ativa: boolean; segregacao: boolean; niveis: NivelAprovacao[] }): Promise<void> {
  await httpClient.put(`${BASE}/politicas/${tipo}`, p);
}
