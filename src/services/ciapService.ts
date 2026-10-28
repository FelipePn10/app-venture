import { httpClient } from '@/services/httpClient';

// CIAP — Controle de Crédito do ICMS do Ativo Permanente (VFIS0345). O ICMS do
// bem do ativo é apropriado em parcelas mensais (48), multiplicadas pelo índice
// das saídas tributadas e de exportação no total de saídas do mês. Valores de
// dinheiro chegam e vão como texto decimal.
const BASE = '/api/fiscal/ciap';

export interface ParametrosCIAP { codigo_ajuste: string; conta_ativo_id?: number | null; numero_parcelas: number; }

export interface BemCIAP {
  id: number;
  codigo: string;
  descricao: string;
  funcao?: string;
  vida_util_meses?: number;
  conta_ativo_id?: number | null;
  conta?: string;
  cost_center_id?: number | null;
  centro?: string;
  origem: 'NF_ENTRADA' | 'MANUAL';
  documento?: string;
  data_entrada: string;
  icms_op: string;
  icms_st: string;
  icms_frete: string;
  icms_difal: string;
  total: string;
  valor_parcela: string;
  numero_parcelas: number;
  parcelas_usadas: number;
  situacao: 'ATIVO' | 'BAIXADO' | 'ENCERRADO';
  data_baixa?: string;
  tipo_baixa?: string;
}

export interface BemCIAPDTO {
  codigo: string;
  descricao: string;
  funcao?: string;
  vida_util_meses?: number;
  conta_ativo_id?: number | null;
  cost_center_id?: number | null;
  data_entrada?: string;
  icms_op?: string;
  icms_st?: string;
  icms_frete?: string;
  icms_difal?: string;
  numero_parcelas?: number;
}

export interface MovimentoCIAP {
  bem_id: number;
  codigo: string;
  descricao: string;
  tipo_mov: 'SI' | 'IM' | 'BA' | 'AT' | 'PE' | 'OT';
  data: string;
  numero_parcela?: number;
  valor_parcela: string;
}

export interface ApuracaoCIAP {
  ano: number;
  mes: number;
  saldo_inicial: string;
  soma_parcelas: string;
  saidas_trib_exp: string;
  saidas_total: string;
  indice: string;
  icms_apropriado: string;
  saidas_informadas: boolean;
  gravada: boolean;
  fechada: boolean;
  apurado_em?: string;
  movimentos?: MovimentoCIAP[];
  sugerido_trib_exp: string;
  sugerido_total: string;
}

const lista = <T,>(d: unknown): T[] => (Array.isArray(d) ? (d as T[]) : []);
const texto = (v: unknown) => (v == null ? '0' : String(v));
const normBem = (b: BemCIAP): BemCIAP => ({ ...b, icms_op: texto(b.icms_op), icms_st: texto(b.icms_st), icms_frete: texto(b.icms_frete),
  icms_difal: texto(b.icms_difal), total: texto(b.total), valor_parcela: texto(b.valor_parcela) });
const normApuracao = (a: ApuracaoCIAP): ApuracaoCIAP => ({ ...a, saldo_inicial: texto(a.saldo_inicial), soma_parcelas: texto(a.soma_parcelas),
  saidas_trib_exp: texto(a.saidas_trib_exp), saidas_total: texto(a.saidas_total), indice: texto(a.indice), icms_apropriado: texto(a.icms_apropriado),
  sugerido_trib_exp: texto(a.sugerido_trib_exp), sugerido_total: texto(a.sugerido_total),
  movimentos: (a.movimentos ?? []).map((m) => ({ ...m, valor_parcela: texto(m.valor_parcela) })) });

export async function parametrosCIAP(): Promise<ParametrosCIAP> {
  const { data } = await httpClient.get(`${BASE}/parametros`);
  return data as ParametrosCIAP;
}
export async function salvarParametrosCIAP(p: ParametrosCIAP): Promise<ParametrosCIAP> {
  const { data } = await httpClient.put(`${BASE}/parametros`, p);
  return data as ParametrosCIAP;
}
export async function bensCIAP(): Promise<BemCIAP[]> {
  const { data } = await httpClient.get(`${BASE}/bens`);
  return lista<BemCIAP>(data).map(normBem);
}
export async function criarBemCIAP(dto: BemCIAPDTO): Promise<BemCIAP> {
  const { data } = await httpClient.post(`${BASE}/bens`, dto);
  return normBem(data as BemCIAP);
}
export async function atualizarBemCIAP(id: number, dto: BemCIAPDTO): Promise<BemCIAP> {
  const { data } = await httpClient.put(`${BASE}/bens/${id}`, dto);
  return normBem(data as BemCIAP);
}
export async function baixarBemCIAP(id: number, tipo: string, dataBaixa: string, motivo: string): Promise<void> {
  await httpClient.post(`${BASE}/bens/${id}/baixa`, { tipo, data: dataBaixa, motivo });
}
export async function excluirBemCIAP(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/bens/${id}`);
}
/** Prévia (não grava). Saídas vazias = as das NF-e de saída do mês. */
export async function previaCIAP(ano: number, mes: number, saidasTribExp = '', saidasTotal = ''): Promise<ApuracaoCIAP> {
  const params: Record<string, string | number> = { ano, mes };
  if (saidasTribExp || saidasTotal) { params.saidas_trib_exp = saidasTribExp; params.saidas_total = saidasTotal; }
  const { data } = await httpClient.get(`${BASE}/apuracao`, { params });
  return normApuracao(data as ApuracaoCIAP);
}
export async function apurarCIAP(ano: number, mes: number, saidasTribExp = '', saidasTotal = ''): Promise<ApuracaoCIAP> {
  const { data } = await httpClient.post(`${BASE}/apuracao`, { ano, mes, saidas_trib_exp: saidasTribExp, saidas_total: saidasTotal });
  return normApuracao(data as ApuracaoCIAP);
}
export async function fecharCIAP(ano: number, mes: number, fechar: boolean): Promise<void> {
  await httpClient.post(`${BASE}/apuracao/fechar`, { ano, mes, fechar });
}
export async function apuracoesCIAP(ano: number): Promise<ApuracaoCIAP[]> {
  const { data } = await httpClient.get(`${BASE}/apuracoes`, { params: { ano } });
  return lista<ApuracaoCIAP>(data).map(normApuracao);
}
