import { httpClient } from '@/services/fiscalShared';

// CAPA / 8D: tratamento da não conformidade até a causa raiz e a eficácia.
const BASE = '/api/quality/capas';

export type MetodoCapa = '8D' | 'SIMPLES';
export type OrigemCapa = 'NC' | 'RECLAMACAO_CLIENTE' | 'FORNECEDOR' | 'AUDITORIA' | 'INTERNA';

export interface Problema { o_que: string; onde: string; quando: string; quem: string; quanto: string; como: string; por_que_detectou: string; }
export interface Membro { user_id: string; nome?: string; papel: 'LIDER' | 'MEMBRO' | 'PATROCINADOR'; }
export interface AcaoCapa {
  id: number; tipo: 'CONTENCAO' | 'CORRETIVA' | 'PREVENTIVA'; descricao: string; responsavel: string; prazo: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'; evidencia?: string; concluida_em?: string; ciclo: number;
}
export interface EventoCapa { id: number; evento: string; de?: string; para?: string; detalhe?: string; ator?: string; created_at: string; }

export interface Capa {
  id: number; numero: number; metodo: MetodoCapa; tipo: string; origem: OrigemCapa; titulo: string;
  item_code?: number; supplier_code?: number; customer_code?: number; referencia?: string;
  responsavel: string; prazo?: string; etapa: string; status: 'ABERTA' | 'ENCERRADA' | 'CANCELADA';
  problema: Problema; contencao_dispensada?: string; metodo_causa?: '5PORQUES' | 'ISHIKAWA';
  cinco_porques: string[]; ishikawa: Record<string, string[]>; causa_raiz?: string; ponto_de_escape?: string;
  prevencao?: string; eficaz?: boolean; verificacao?: string; licoes?: string; ciclo: number;
  created_at: string; closed_at?: string; ncs: number[]; equipe: Membro[]; acoes: AcaoCapa[]; eventos?: EventoCapa[];
  nome_etapa?: string; pendencias?: string[];
}

export interface NCResumo {
  id: number; code: number; item_code: number; lot?: string; lot_id?: number; lote_numero?: number; supplier_code?: number;
  production_order_id?: number; nonconform_qty: string; description: string; severity: string; disposition?: string;
  is_open: boolean; created_at: string; capas: number[]; capa_numeros: number[];
}

export interface AcaoPendente extends AcaoCapa { capa_id: number; capa_numero: number; capa_titulo: string; atrasada: boolean; }
export interface Usuario { user_id: string; nome: string; }

export const ETAPAS_8D = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'];
export const ETAPAS_SIMPLES = ['ANALISE', 'ACAO', 'VERIFICACAO'];
export const CATEGORIAS_ISHIKAWA: [string, string][] = [
  ['MAO_DE_OBRA', 'Mão de obra'], ['METODO', 'Método'], ['MATERIAL', 'Material'],
  ['MAQUINA', 'Máquina'], ['MEDICAO', 'Medição'], ['MEIO_AMBIENTE', 'Meio ambiente'],
];

export async function listarCapas(f: { status?: string; minhas?: boolean; atrasadas?: boolean } = {}): Promise<Capa[]> {
  const params: Record<string, string> = {};
  if (f.status) params.status = f.status;
  if (f.minhas) params.minhas = 'true';
  if (f.atrasadas) params.atrasadas = 'true';
  const { data } = await httpClient.get(BASE, { params });
  return (data ?? []) as Capa[];
}
export async function obterCapa(id: number): Promise<Capa> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return data as Capa;
}
export async function abrirCapa(dto: {
  metodo: MetodoCapa; origem: OrigemCapa; titulo: string; tipo?: string; ncs?: number[]; item_code?: number;
  supplier_code?: number; customer_code?: number; referencia?: string; responsavel?: string; prazo?: string; equipe?: Membro[];
}): Promise<Capa> {
  const { data } = await httpClient.post(BASE, dto);
  return data as Capa;
}
export async function analisarCapa(id: number, dto: Partial<{
  titulo: string; responsavel: string; prazo: string; problema: Problema; contencao_dispensada: string; metodo_causa: string;
  cinco_porques: string[]; ishikawa: Record<string, string[]>; causa_raiz: string; ponto_de_escape: string; prevencao: string; equipe: Membro[];
}>): Promise<Capa> {
  const { data } = await httpClient.put(`${BASE}/${id}/analise`, dto);
  return data as Capa;
}
export async function avancarCapa(id: number): Promise<Capa> {
  const { data } = await httpClient.post(`${BASE}/${id}/avancar`, {});
  return data as Capa;
}
export async function encerrarCapa(id: number, eficaz: boolean, verificacao: string, licoes?: string): Promise<Capa> {
  const { data } = await httpClient.post(`${BASE}/${id}/encerrar`, { eficaz, verificacao, licoes });
  return data as Capa;
}
export async function cancelarCapa(id: number, motivo: string): Promise<Capa> {
  const { data } = await httpClient.post(`${BASE}/${id}/cancelar`, { motivo });
  return data as Capa;
}
export async function adicionarAcao(id: number, dto: { tipo: string; descricao: string; responsavel: string; prazo: string }): Promise<Capa> {
  const { data } = await httpClient.post(`${BASE}/${id}/acoes`, dto);
  return data as Capa;
}
export async function atualizarAcao(id: number, acao: number, dto: { status?: string; evidencia?: string; prazo?: string; responsavel?: string }): Promise<Capa> {
  const { data } = await httpClient.put(`${BASE}/${id}/acoes/${acao}`, dto);
  return data as Capa;
}
export async function vincularNC(id: number, ncId: number): Promise<Capa> {
  const { data } = await httpClient.post(`${BASE}/${id}/ncs`, { nc_id: ncId });
  return data as Capa;
}
export async function acoesPendentes(todas = false): Promise<AcaoPendente[]> {
  const { data } = await httpClient.get(`${BASE}/acoes-pendentes`, { params: todas ? { todas: 'true' } : undefined });
  return (data ?? []) as AcaoPendente[];
}
export async function usuariosDaEmpresa(): Promise<Usuario[]> {
  const { data } = await httpClient.get(`${BASE}/usuarios`);
  return ((data ?? []) as { user_id: string; nome: string }[]).map((u) => ({ user_id: u.user_id, nome: u.nome }));
}
export async function listarNCs(f: { abertas?: boolean; semCapa?: boolean; item?: number } = {}): Promise<NCResumo[]> {
  const params: Record<string, string> = {};
  if (f.abertas) params.abertas = 'true';
  if (f.semCapa) params.sem_capa = 'true';
  if (f.item) params.item = String(f.item);
  const { data } = await httpClient.get('/api/quality/ncs', { params });
  return (data ?? []) as NCResumo[];
}
