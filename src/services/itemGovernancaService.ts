import { httpClient } from '@/services/fiscalShared';

// Governança do cadastro de item (Fase 4): status do cadastro, liberação por
// visão (área), campos obrigatórios, histórico, uso e duplicidade. O item vai
// pelo código de negócio.
const BASE = '/api/items/governanca';

export type StatusCadastro = 'EM_CADASTRO' | 'LIBERADO' | 'BLOQUEADO' | 'DESCONTINUADO';
export type Visao = 'ENGENHARIA' | 'FISCAL' | 'SUPRIMENTOS' | 'PLANEJAMENTO' | 'COMERCIAL' | 'CUSTOS';
export const VISOES: Visao[] = ['ENGENHARIA', 'FISCAL', 'SUPRIMENTOS', 'PLANEJAMENTO', 'COMERCIAL', 'CUSTOS'];
export const ROTULO_STATUS: Record<StatusCadastro, string> = { EM_CADASTRO: 'Em cadastro', LIBERADO: 'Liberado', BLOQUEADO: 'Bloqueado', DESCONTINUADO: 'Descontinuado' };
export const ROTULO_VISAO: Record<Visao, string> = {
  ENGENHARIA: 'Engenharia', FISCAL: 'Fiscal', SUPRIMENTOS: 'Suprimentos', PLANEJAMENTO: 'Planejamento', COMERCIAL: 'Comercial', CUSTOS: 'Custos',
};

export interface Marca { por?: string; nome?: string; em: string }
export interface Pendencia { visao: Visao; campo: string; rotulo: string }
export interface VisaoDoItem { visao: Visao; exigida: boolean; liberada?: Marca; pendencias: Pendencia[] }
export interface PainelItem {
  item_code: string; codigo: string; nome: string; tipo: number; tipo_nome: string; status: StatusCadastro; motivo?: string;
  substituto?: string; alterado_em?: string; liberadas: Record<string, Marca>; exige_liberacao: boolean; visoes: VisaoDoItem[]; completo: boolean;
}
export interface EventoItem { id: number; evento: string; campo?: string; antes?: unknown; depois?: unknown; motivo?: string; nome?: string; ocorrido_em: string }
export interface UsoItem { saldo: string; pedidos_venda_abertos: number; pedidos_compra_abertos: number; ordens_fabricacao_abertas: number; estruturas_pai: string[] }
export interface Candidato { item_code: string; codigo: string; nome: string; ncm?: string; status: StatusCadastro; semelhanca: number; motivo: string }
export interface ParametrosGov { exige_liberacao: boolean; visoes: Visao[] }
export interface RegraCampo { campo: string; rotulo: string; visao: Visao; tipos?: number[]; padrao: boolean; obrigatorio: boolean; ajustado: boolean }
export interface Pendente { item_code: string; codigo: string; nome: string; tipo: number; status: StatusCadastro; alterado_em?: string; liberadas: Record<string, Marca>; faltam: Visao[] }

const item = (codigo: string) => `${BASE}/itens/${encodeURIComponent(codigo)}`;

export async function painelItem(codigo: string): Promise<PainelItem> {
  const { data } = await httpClient.get(item(codigo));
  return data as PainelItem;
}
export async function liberarVisao(codigo: string, visao: Visao): Promise<PainelItem> {
  const { data } = await httpClient.post(`${item(codigo)}/liberacoes`, { visao });
  return data as PainelItem;
}
export async function estornarVisao(codigo: string, visao: Visao, motivo: string): Promise<PainelItem> {
  const { data } = await httpClient.post(`${item(codigo)}/estorno`, { visao, motivo });
  return data as PainelItem;
}
export async function mudarStatusItem(codigo: string, dto: { status: StatusCadastro; de: StatusCadastro; motivo: string; substituto?: string }): Promise<PainelItem> {
  const { data } = await httpClient.post(`${item(codigo)}/status`, dto);
  return data as PainelItem;
}
export async function historicoItem(codigo: string): Promise<EventoItem[]> {
  const { data } = await httpClient.get(`${item(codigo)}/historico`);
  return (data ?? []) as EventoItem[];
}
export async function usoItem(codigo: string): Promise<UsoItem> {
  const { data } = await httpClient.get(`${item(codigo)}/uso`);
  return data as UsoItem;
}
export async function itensParecidos(nome: string, ncm?: string, excluir?: string): Promise<Candidato[]> {
  const params: Record<string, string> = { nome };
  if (ncm) params.ncm = ncm;
  if (excluir) params.excluir = excluir;
  const { data } = await httpClient.get(`${BASE}/duplicados`, { params });
  return (data ?? []) as Candidato[];
}
export async function pendentesDeCadastro(): Promise<Pendente[]> {
  const { data } = await httpClient.get(`${BASE}/pendentes`);
  return (data ?? []) as Pendente[];
}
export async function parametrosGovernanca(): Promise<ParametrosGov> {
  const { data } = await httpClient.get(`${BASE}/parametros`);
  return data as ParametrosGov;
}
export async function salvarParametrosGovernanca(p: ParametrosGov): Promise<ParametrosGov> {
  const { data } = await httpClient.put(`${BASE}/parametros`, p);
  return data as ParametrosGov;
}
export async function regrasDeCampo(): Promise<RegraCampo[]> {
  const { data } = await httpClient.get(`${BASE}/regras`);
  return (data ?? []) as RegraCampo[];
}
/** obrigatorio null volta ao padrão do sistema. */
export async function salvarRegraDeCampo(campo: string, obrigatorio: boolean | null): Promise<RegraCampo[]> {
  const { data } = await httpClient.put(`${BASE}/regras/${encodeURIComponent(campo)}`, { obrigatorio });
  return (data ?? []) as RegraCampo[];
}
