import { httpClient, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/fiscal/support';

// ─── Helpers ────────────────────────────────────────────────────────────────
// The fiscal-support endpoints answer in snake_case (Go structs with json tags).
// We tolerate `{ data: [...] }` envelopes via unwrapArray/unwrapObject.

function asList<T>(data: unknown): T[] {
  return unwrapArray(data) as T[];
}
function asOne<T>(data: unknown): T {
  return unwrapObject(data) as T;
}
/** `?only_active=false` includes inactive records. */
function activeParams(includeInactive: boolean) {
  return includeInactive ? { params: { only_active: 'false' } } : undefined;
}

// ─── Enums ──────────────────────────────────────────────────────────────────

export type DispositivoTipo = 'ICMS' | 'IPI' | 'LAUDO' | 'PIS' | 'COFINS';
export type CfopUtilization = 'INDUSTRIALIZACAO_COMERCIO' | 'IMOBILIZADO' | 'USO_CONSUMO';
export type CfopIndOperacao = 'NORMAL' | 'ENERGIA_ELETRICA' | 'TELECOMUNICACAO';
export type CfopTipoUtil = 'NORMAL' | 'VENDA_COMERCIAL_EXPORTADORA' | 'COMPRA_FIM_ESPECIFICO_EXPORTACAO' | 'EXPORTACAO';
export type OperationType = 'AMBAS' | 'ENTRADA' | 'SAIDA' | 'CUSTOS';
export type TabelaAjusteRef = '5.2' | '5.3' | '5.6' | '5.7';
export type LinhaApuracaoTipo = 'DEBITO' | 'CREDITO' | 'SALDO' | 'DEDUCAO' | 'OUTROS';
export type SimplesAnexo = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

// ─── Dispositivos legais ────────────────────────────────────────────────────

export interface DispositivoLegalDTO { code?: number; type: DispositivoTipo; description: string; }
export interface DispositivoLegal extends DispositivoLegalDTO { code: number; is_active?: boolean; }

export async function listDispositivosLegais(includeInactive = false): Promise<DispositivoLegal[]> {
  const { data } = await httpClient.get(`${BASE}/dispositivos-legais/`, activeParams(includeInactive));
  return asList(data);
}
export async function createDispositivoLegal(dto: DispositivoLegalDTO): Promise<DispositivoLegal> {
  const { data } = await httpClient.post(`${BASE}/dispositivos-legais/`, dto);
  return asOne(data);
}
export async function updateDispositivoLegal(dto: DispositivoLegalDTO): Promise<DispositivoLegal> {
  const { data } = await httpClient.put(`${BASE}/dispositivos-legais/`, dto);
  return asOne(data);
}

// ─── CFOPs ──────────────────────────────────────────────────────────────────

export interface CfopDTO {
  code: number;
  description: string;
  utilization: CfopUtilization;
  ind_operacao: CfopIndOperacao;
  tipo_utilizacao: CfopTipoUtil;
  difal: boolean;
  doacao: boolean;
}
export interface Cfop extends CfopDTO { is_active?: boolean; }

export async function listCfops(includeInactive = false): Promise<Cfop[]> {
  const { data } = await httpClient.get(`${BASE}/cfops/`, activeParams(includeInactive));
  return asList(data);
}
export async function createCfop(dto: CfopDTO): Promise<Cfop> {
  const { data } = await httpClient.post(`${BASE}/cfops/`, dto);
  return asOne(data);
}
export async function updateCfop(dto: CfopDTO): Promise<Cfop> {
  const { data } = await httpClient.put(`${BASE}/cfops/`, dto);
  return asOne(data);
}

// ─── Parâmetros básicos ICMS/IPI ────────────────────────────────────────────

/** Sobre o que a redução incide: a base de cálculo ou a alíquota. */
export const RED_TARGETS = ['BASE', 'PERCENTUAL'] as const;
/** Natureza do acréscimo de ICMS. */
export const ACRES_TYPES = ['FUNDO_COMBATE_POBREZA', 'OUTROS'] as const;
/** Como o DIFAL é tratado na operação. */
export const DIFAL_TYPES = ['TRIBUTADO', 'ISENTO_OUTRAS', 'NAO_CONSIDERA'] as const;
/** Modalidade da base de cálculo do ICMS-ST (tag modBCST da NF-e). */
export const BC_ST_MODALITIES = [
  'PRECO_TABELADO', 'LISTA_NEGATIVA', 'LISTA_POSITIVA', 'LISTA_NEUTRA',
  'MARGEM_VALOR_AGREGADO', 'PAUTA', 'VALOR_OPERACAO',
] as const;

/**
 * Parâmetro de ICMS/IPI por NCM ou item, UF e operação.
 *
 * O cadastro é grande porque a tributação brasileira é: cada imposto tem
 * alíquota, redução, substituição e acréscimo, e cada um deles se comporta
 * diferente para contribuinte e não contribuinte. A tela só coletava sete
 * campos — o resto do modelo, que o backend já grava, ficava inalcançável.
 */
export interface ParametroIcmsIpiDTO {
  id?: number;
  // Chave de busca
  uf: string;
  ncm_code?: string;
  item_code?: string;
  item_config_mask?: string;
  operation_type: OperationType;
  // Filtros opcionais
  customer_code?: number;
  customer_establishment_code?: number;
  market_segment_id?: number;
  invoice_type_exit_id?: number;
  invoice_type_entry_id?: number;
  tax_type_id?: number;
  is_preferred?: boolean;
  is_simples_optante?: boolean;

  // ICMS — alíquota
  icms_pct_contrib: number;
  icms_pct_non_contrib: number;
  legal_device_icms_contrib_id?: number;
  legal_device_icms_non_contrib_id?: number;
  cst_icms_contrib: string;
  cst_icms_non_contrib: string;
  cst_icms_contrib_dev?: string;
  cst_icms_non_contrib_dev?: string;
  cst_situation_b?: string;
  csosn_icms?: string;
  cod_beneficio_fiscal?: string;

  // ICMS — redução
  icms_red_pct_contrib?: number;
  icms_red_target_contrib?: string;
  legal_device_icms_red_contrib_id?: number;
  icms_red_pct_non_contrib?: number;
  icms_red_target_non_contrib?: string;
  legal_device_icms_red_non_contrib_id?: number;

  // ICMS — diferimento
  icms_deferral_pct?: number;
  icms_deferral_target?: string;
  legal_device_icms_deferral_id?: number;
  cod_benef_rbc?: string;

  // ICMS — substituição
  icms_subst_pct_contrib?: number;
  icms_subst_pct_non_contrib?: number;
  icms_subst_pct_contrib_uc?: number;
  icms_subst_red_pct?: number;
  legal_device_icms_subst_contrib_id?: number;
  legal_device_icms_subst_non_contrib_id?: number;
  legal_device_icms_subst_red_id?: number;
  icms_internal_pct?: number;
  bc_icms_st_modality?: string;
  icms_pct_for_st_contrib?: number;
  icms_pct_for_st_non_contrib?: number;

  // ICMS — acréscimos (FCP e outros)
  icms_acres_pct_contrib?: number;
  icms_acres_type_contrib?: string;
  icms_acres_sum_contrib?: boolean;
  icms_acres_pct_non_contrib?: number;
  icms_acres_type_non_contrib?: string;
  icms_acres_sum_non_contrib?: boolean;
  icms_st_acres_pct_contrib?: number;
  icms_st_acres_type_contrib?: string;
  icms_st_acres_sum_contrib?: boolean;
  icms_st_acres_pct_non_contrib?: number;
  icms_st_acres_type_non_contrib?: string;
  icms_st_acres_sum_non_contrib?: boolean;
  fcp_st_partilha_pct?: number;

  // IPI
  ipi_red_pct_contrib?: number;
  ipi_red_target_contrib?: string;
  legal_device_ipi_contrib_id?: number;
  ipi_red_pct_non_contrib?: number;
  ipi_red_target_non_contrib?: string;
  legal_device_ipi_non_contrib_id?: number;
  cst_ipi_exit?: string;
  cst_ipi_entry?: string;

  // FCI, Zona Franca e benefícios
  icms_pct_origins_1238?: number;
  icms_subst_pct_origins_1238?: number;
  calc_base_red_fci?: boolean;
  cst_icms_fci?: string;
  uses_icms_zona_franca?: boolean;
  dif_aliq_st_contrib_uc?: number;
  cod_benef_contrib?: string;
  cod_benef_non_contrib?: string;
  codigo_anexo_sn?: string;
  origem_clas_ipi?: string;
  description_full?: string;

  // DIFAL
  icms_difal_red_pct?: number;
  icms_difal_type?: string;
  difal_purchase_red_pct?: number;
  difal_purchase_red_target?: string;
}
export interface ParametroIcmsIpi extends ParametroIcmsIpiDTO { id: number; is_active?: boolean; }

export async function listParametrosIcmsIpi(includeInactive = false): Promise<ParametroIcmsIpi[]> {
  const { data } = await httpClient.get(`${BASE}/parametros-icms-ipi/`, activeParams(includeInactive));
  return asList(data);
}
export async function createParametroIcmsIpi(dto: ParametroIcmsIpiDTO): Promise<ParametroIcmsIpi> {
  const { data } = await httpClient.post(`${BASE}/parametros-icms-ipi/`, dto);
  return asOne(data);
}
export async function updateParametroIcmsIpi(dto: ParametroIcmsIpiDTO): Promise<ParametroIcmsIpi> {
  const { data } = await httpClient.put(`${BASE}/parametros-icms-ipi/`, dto);
  return asOne(data);
}

// ─── Motivos de transferência DAPI ──────────────────────────────────────────

export interface MotivoDapiDTO {
  code: string;
  reason: string;
  destination: string;
  valid_from: string;
  is_active?: boolean;
}

export async function listMotivosDapi(includeInactive = false): Promise<MotivoDapiDTO[]> {
  const { data } = await httpClient.get(`${BASE}/motivos-transferencia-dapi/`, activeParams(includeInactive));
  return asList(data);
}
export async function createMotivoDapi(dto: MotivoDapiDTO): Promise<MotivoDapiDTO> {
  const { data } = await httpClient.post(`${BASE}/motivos-transferencia-dapi/`, dto);
  return asOne(data);
}
export async function updateMotivoDapi(dto: MotivoDapiDTO): Promise<MotivoDapiDTO> {
  const { data } = await httpClient.put(`${BASE}/motivos-transferencia-dapi/`, dto);
  return asOne(data);
}

// ─── Códigos de ajuste de apuração ICMS (Tabela 5.1.1) ──────────────────────

export interface CodigoAjusteApuracaoDTO {
  id?: number;
  code: string;
  uf: string;
  description: string;
  valid_from: string;
  is_active?: boolean;
}

export async function listAjustesApuracaoIcms(includeInactive = false): Promise<CodigoAjusteApuracaoDTO[]> {
  const { data } = await httpClient.get(`${BASE}/codigos-ajuste-apuracao-icms/`, activeParams(includeInactive));
  return asList(data);
}
export async function createAjusteApuracaoIcms(dto: CodigoAjusteApuracaoDTO): Promise<CodigoAjusteApuracaoDTO> {
  const { data } = await httpClient.post(`${BASE}/codigos-ajuste-apuracao-icms/`, dto);
  return asOne(data);
}
export async function updateAjusteApuracaoIcms(dto: CodigoAjusteApuracaoDTO): Promise<CodigoAjusteApuracaoDTO> {
  const { data } = await httpClient.put(`${BASE}/codigos-ajuste-apuracao-icms/`, dto);
  return asOne(data);
}

// ─── Códigos de ajuste ICMS (Tabelas 5.2/5.3/5.6/5.7) ───────────────────────

export interface CodigoAjusteIcmsDTO {
  id?: number;
  uf: string;
  code: string;
  description: string;
  table_ref: TabelaAjusteRef;
  valid_from: string;
  is_active?: boolean;
}

export async function listAjustesIcms(includeInactive = false): Promise<CodigoAjusteIcmsDTO[]> {
  const { data } = await httpClient.get(`${BASE}/codigos-ajuste-icms/`, activeParams(includeInactive));
  return asList(data);
}
export async function createAjusteIcms(dto: CodigoAjusteIcmsDTO): Promise<CodigoAjusteIcmsDTO> {
  const { data } = await httpClient.post(`${BASE}/codigos-ajuste-icms/`, dto);
  return asOne(data);
}
export async function updateAjusteIcms(dto: CodigoAjusteIcmsDTO): Promise<CodigoAjusteIcmsDTO> {
  const { data } = await httpClient.put(`${BASE}/codigos-ajuste-icms/`, dto);
  return asOne(data);
}

// ─── Linhas de apuração de ICMS ─────────────────────────────────────────────

export interface LinhaApuracaoDTO {
  code: string;
  description: string;
  line_type: LinhaApuracaoTipo;
  accepts_entries: boolean;
  nature: string;
  is_active?: boolean;
}

export async function listLinhasApuracaoIcms(includeInactive = false): Promise<LinhaApuracaoDTO[]> {
  const { data } = await httpClient.get(`${BASE}/linhas-apuracao-icms/`, activeParams(includeInactive));
  return asList(data);
}
export async function createLinhaApuracaoIcms(dto: LinhaApuracaoDTO): Promise<LinhaApuracaoDTO> {
  const { data } = await httpClient.post(`${BASE}/linhas-apuracao-icms/`, dto);
  return asOne(data);
}
export async function updateLinhaApuracaoIcms(dto: LinhaApuracaoDTO): Promise<LinhaApuracaoDTO> {
  const { data } = await httpClient.put(`${BASE}/linhas-apuracao-icms/`, dto);
  return asOne(data);
}

// ─── Lançamentos resumo de ICMS (+ notas) ───────────────────────────────────

export interface LancamentoResumoDTO {
  id?: number;
  period: string;
  uf: string;
  cfop_id: number;
  icms_base: number;
  icms_value: number;
  is_active?: boolean;
}
export interface NotaResumoDTO {
  id?: number;
  note_number: string;
  note_series: string;
  emitter_cnpj: string;
  issue_date: string;
  item_value: number;
  icms_base: number;
  icms_value: number;
}

export async function listLancamentosResumoIcms(includeInactive = false): Promise<LancamentoResumoDTO[]> {
  const { data } = await httpClient.get(`${BASE}/lancamentos-resumo-icms/`, activeParams(includeInactive));
  return asList(data);
}
export async function createLancamentoResumoIcms(dto: LancamentoResumoDTO): Promise<LancamentoResumoDTO> {
  const { data } = await httpClient.post(`${BASE}/lancamentos-resumo-icms/`, dto);
  return asOne(data);
}
export async function updateLancamentoResumoIcms(dto: LancamentoResumoDTO): Promise<LancamentoResumoDTO> {
  const { data } = await httpClient.put(`${BASE}/lancamentos-resumo-icms/`, dto);
  return asOne(data);
}
export async function addNotaResumoIcms(lancamentoId: number, dto: NotaResumoDTO): Promise<NotaResumoDTO> {
  const { data } = await httpClient.post(`${BASE}/lancamentos-resumo-icms/${lancamentoId}/notas`, dto);
  return asOne(data);
}
export async function listNotasResumoIcms(lancamentoId: number): Promise<Obj[]> {
  const { data } = await httpClient.get(`${BASE}/lancamentos-resumo-icms/${lancamentoId}/notas`);
  return unwrapArray(data).map(unwrapObject);
}

// ─── Apuração do Simples Nacional ───────────────────────────────────────────

export interface ApuracaoSimplesDTO {
  id?: number;
  period: string;
  annex: SimplesAnexo;
  receita_interna: number;
  receita_externa: number;
  folha_pagamento: number;
  receita_bruta_12m: number;
  simples_recolhido: number;
  aliquota_nominal: number;
  aliquota_efetiva: number;
  aliquota_efetiva_icms: number;
  parcela_deduzir: number;
  observation?: string;
  is_active?: boolean;
}
export type ApuracaoSimples = ApuracaoSimplesDTO;

export async function listApuracaoSimples(includeInactive = false): Promise<ApuracaoSimples[]> {
  const { data } = await httpClient.get(`${BASE}/apuracao-simples-nacional/`, activeParams(includeInactive));
  return asList(data);
}
export async function createApuracaoSimples(dto: ApuracaoSimplesDTO): Promise<ApuracaoSimples> {
  const { data } = await httpClient.post(`${BASE}/apuracao-simples-nacional/`, dto);
  return asOne(data);
}
export async function updateApuracaoSimples(dto: ApuracaoSimplesDTO): Promise<ApuracaoSimples> {
  const { data } = await httpClient.put(`${BASE}/apuracao-simples-nacional/`, dto);
  return asOne(data);
}
