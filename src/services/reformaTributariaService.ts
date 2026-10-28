import { httpClient, unwrapArray } from '@/services/fiscalShared';

// Reforma tributária (IBS/CBS — LC 214/2025): tabela oficial de cClassTrib,
// alíquotas por ano da empresa e cClassTrib padrão por CFOP.
const BASE = '/api/fiscal/reforma';

export interface ClassificacaoIBSCBS {
  cclass_trib: string;
  cst: string;
  cst_descricao: string;
  descricao: string;
  exige_tributacao: boolean;
  reducao_aliquota: boolean;
  diferimento: boolean;
  perc_reducao_ibs: number;
  perc_reducao_cbs: number;
  tributacao_regular: boolean;
  aceita_nfe: boolean;
  vigencia_inicio: string;
  vigencia_fim?: string;
  url_legislacao?: string;
  versao_tabela: string;
  vigente_hoje: boolean;
  /** A emissão monta o grupo deste CST (os demais exigem grupos ainda não suportados). */
  suportado_emissao: boolean;
}

/** AUTOMATICO: modelo atual + grupo IBS/CBS; SOMENTE_ATUAL: só o modelo atual. */
export type ModoReforma = 'AUTOMATICO' | 'SOMENTE_ATUAL';
export interface ModoReformaInfo { modo: ModoReforma; motivo?: string; updated_at?: string; }

export async function obterModo(): Promise<ModoReformaInfo> {
  const { data } = await httpClient.get(`${BASE}/modo`);
  return data as ModoReformaInfo;
}
export async function salvarModo(modo: ModoReforma, motivo?: string): Promise<void> {
  await httpClient.put(`${BASE}/modo`, { modo, motivo: motivo || null });
}

/** EMPRESA: cadastro da empresa; LEI: padrão da LC 214; PENDENTE: falta alíquota. */
export type FonteAliquota = 'EMPRESA' | 'LEI' | 'PENDENTE';

export interface AliquotasIBSCBS {
  ano: number;
  ibs_uf: number | null;
  ibs_mun: number | null;
  cbs: number | null;
  fonte: FonteAliquota;
  fundamento: string;
  pendencia?: string;
  updated_at?: string;
}

export interface SalvarAliquotasDTO {
  ibs_uf: number;
  ibs_mun: number;
  cbs: number;
  fundamento: string;
}

export interface CFOPClassTrib {
  cfop: string;
  cclass_trib: string;
  descricao: string;
  observacao?: string;
  updated_at: string;
}

export async function listarClassificacoes(filtro: { cst?: string; busca?: string; somenteNFe?: boolean } = {}): Promise<ClassificacaoIBSCBS[]> {
  const params: Record<string, string> = {};
  if (filtro.cst) params.cst = filtro.cst;
  if (filtro.busca) params.busca = filtro.busca;
  if (filtro.somenteNFe === false) params.somente_nfe = 'false';
  const { data } = await httpClient.get(`${BASE}/classificacoes`, { params });
  return unwrapArray(data) as ClassificacaoIBSCBS[];
}

export async function listarAliquotas(): Promise<AliquotasIBSCBS[]> {
  const { data } = await httpClient.get(`${BASE}/aliquotas`);
  return unwrapArray(data) as AliquotasIBSCBS[];
}

export async function salvarAliquotas(ano: number, dto: SalvarAliquotasDTO): Promise<void> {
  await httpClient.put(`${BASE}/aliquotas/${ano}`, dto);
}

export async function excluirAliquotas(ano: number): Promise<void> {
  await httpClient.delete(`${BASE}/aliquotas/${ano}`);
}

export async function listarCFOP(): Promise<CFOPClassTrib[]> {
  const { data } = await httpClient.get(`${BASE}/cfop`);
  return unwrapArray(data) as CFOPClassTrib[];
}

export async function salvarCFOP(cfop: string, cclassTrib: string, observacao?: string): Promise<void> {
  await httpClient.put(`${BASE}/cfop/${encodeURIComponent(cfop)}`, { cclass_trib: cclassTrib, observacao: observacao || null });
}

export async function excluirCFOP(cfop: string): Promise<void> {
  await httpClient.delete(`${BASE}/cfop/${encodeURIComponent(cfop)}`);
}

/** cClassTrib próprio de uma linha de NF-e em rascunho; vazio volta ao padrão. */
export async function definirClassTribDaLinha(notaId: number, linhaId: number, cclassTrib: string | null): Promise<void> {
  await httpClient.put(`/api/fiscal/exits/${notaId}/itens/${linhaId}/cclass-trib`, { cclass_trib: cclassTrib || null });
}
