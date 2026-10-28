import { httpClient } from '@/services/httpClient';

// Centro de custo único (VCTB0102): cadastro com a gestão (código da empresa,
// responsável, aprovador, conta padrão), orçamento mensal × realizado, árvore
// consolidada e aprovação das requisições de compra pelo aprovador do centro.
const BASE = '/api/cost-center';

export type TipoCentro = 'AUXILIARY' | 'PRODUCTIVE' | 'ADMINISTRATIVE' | 'COMMERCIAL';

export interface CentroDeCusto {
  id: number;
  code: number;
  codigo: string;
  descricao: string;
  parent_code?: number | null;
  tipo: TipoCentro;
  is_ratio: boolean;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  responsavel_id?: string | null;
  responsavel?: string;
  aprovador_id?: string | null;
  aprovador?: string;
  aprova_requisicoes: boolean;
  conta_padrao_id?: number | null;
}

export interface GestaoDTO {
  codigo: string;
  responsavel_id?: string | null;
  aprovador_id?: string | null;
  aprova_requisicoes: boolean;
  conta_padrao_id?: number | null;
}

export interface UsuarioDaEmpresa { id: string; nome: string; }

/** Valores de dinheiro chegam como texto decimal ("1234.50"). */
export interface OrcamentoCentro {
  cost_center_id: number;
  code: number;
  codigo: string;
  descricao: string;
  orcado: string[];
  realizado: string[];
}

export interface NoCentro {
  id: number;
  code: number;
  codigo: string;
  descricao: string;
  tipo: TipoCentro;
  is_active: boolean;
  responsavel?: string;
  orcado: string;
  realizado: string;
  orcado_consolidado: string;
  realizado_consolidado: string;
  estourado: boolean;
  filhos: NoCentro[];
}

export interface AprovacaoRequisicao {
  id: number;
  requisition_code: number;
  cost_center_id: number;
  centro_codigo: string;
  centro_descricao: string;
  status: 'PENDENTE' | 'APROVADA' | 'REPROVADA';
  decidido_em?: string;
  justificativa?: string;
  criado_em: string;
  pode_decidir: boolean;
}

const lista = <T,>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);
const texto = (v: unknown) => (v == null ? '0' : String(v));

export async function listarCentros(): Promise<CentroDeCusto[]> {
  const { data } = await httpClient.get(`${BASE}/gestao`);
  return lista<CentroDeCusto>(data);
}

export async function listarUsuarios(): Promise<UsuarioDaEmpresa[]> {
  const { data } = await httpClient.get(`${BASE}/usuarios`);
  return lista<UsuarioDaEmpresa>(data);
}

export async function salvarGestao(code: number, dto: GestaoDTO): Promise<CentroDeCusto> {
  const { data } = await httpClient.put(`${BASE}/${code}/gestao`, dto);
  return data as CentroDeCusto;
}

export async function orcamento(ano: number): Promise<OrcamentoCentro[]> {
  const { data } = await httpClient.get(`${BASE}/orcamento`, { params: { ano } });
  return lista<OrcamentoCentro>(data).map((o) => ({ ...o, orcado: (o.orcado ?? []).map(texto), realizado: (o.realizado ?? []).map(texto) }));
}

/** Grava os meses informados; valor em texto decimal com ponto ("1500.00"). */
export async function salvarOrcamento(ano: number, linhas: Array<{ cost_center_id: number; mes: number; valor: string }>): Promise<OrcamentoCentro[]> {
  const { data } = await httpClient.put(`${BASE}/orcamento`, { ano, linhas });
  return lista<OrcamentoCentro>(data).map((o) => ({ ...o, orcado: (o.orcado ?? []).map(texto), realizado: (o.realizado ?? []).map(texto) }));
}

/** mes 0 = o ano todo. */
export async function arvore(ano: number, mes: number): Promise<NoCentro[]> {
  const { data } = await httpClient.get(`${BASE}/arvore`, { params: { ano, mes } });
  return lista<NoCentro>(data);
}

export async function aprovacoes(f: { status?: string; minhas?: boolean; requisicao?: number } = {}): Promise<AprovacaoRequisicao[]> {
  const params: Record<string, string> = {};
  if (f.status) params.status = f.status;
  if (f.minhas) params.minhas = 'true';
  if (f.requisicao) params.requisicao = String(f.requisicao);
  const { data } = await httpClient.get(`${BASE}/aprovacoes`, { params });
  return lista<AprovacaoRequisicao>(data);
}

export async function decidirAprovacao(id: number, aprovar: boolean, justificativa = ''): Promise<void> {
  await httpClient.post(`${BASE}/aprovacoes/${id}/${aprovar ? 'aprovar' : 'reprovar'}`, { justificativa });
}
