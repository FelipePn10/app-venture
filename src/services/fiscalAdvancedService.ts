import { httpClient, parseStr, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

// ─── Helpers ────────────────────────────────────────────────────────────────

function asList<T>(data: unknown): T[] {
  return unwrapArray(data) as T[];
}
function asOne<T>(data: unknown): T {
  return unwrapObject(data) as T;
}
function cleanParams(f?: Record<string, unknown>): Record<string, string> | undefined {
  if (!f) return undefined;
  const p: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v !== undefined && v !== null && v !== '') p[k] = String(v);
  }
  return Object.keys(p).length ? p : undefined;
}

// ─── Enums ──────────────────────────────────────────────────────────────────

export type IcmsOpType = 'AMBAS' | 'ENTRADA' | 'SAIDA' | 'CUSTOS';
export type RedTarget = 'BASE' | 'PERCENTUAL';
export type IpiIndicator = 'PERCENTUAL' | 'VALOR';
export type ArrecadacaoIndicator = 'SEFAZ' | 'JUSTICA_FEDERAL' | 'JUSTICA_ESTADUAL' | 'OUTROS';
export type RestituicaoTipo = 'RESTITUICAO' | 'RESSARCIMENTO' | 'COMPLEMENTACAO';
export type NotaEspecialPurpose = 'COMPLEMENTAR' | 'AJUSTE';

// ─── §28 Redução/Substituição/Diferimento de ICMS ───────────────────────────

export interface IcmsReducaoDTO {
  id?: number;
  uf: string;
  operation_type: IcmsOpType;
  icms_pct_contrib: number;
  icms_pct_non_contrib: number;
  cst_icms_contrib: string;
  cst_icms_non_contrib: string;
  ncm_code?: string;
  is_preferential?: boolean;
  item_id?: number;
  item_mask?: string;
  customer_id?: number;
  establishment_id?: number;
  supplier_id?: number;
  market_segment_id?: number;
  invoice_type_out_id?: number;
  invoice_type_in_id?: number;
  icms_red_pct_contrib?: number;
  icms_red_target_contrib?: RedTarget;
  icms_deferral_pct?: number;
  icms_deferral_target?: RedTarget;
  icms_subst_pct_contrib?: number;
  mod_bc_icms_st?: string;
  fci_icms_pct?: number;
  fci_reduce_base?: boolean;
  difal_icms_red_pct?: number;
  difal_icms_type?: string;
}
export interface IcmsReducao extends IcmsReducaoDTO { id: number; }

const ICMS_RED = '/api/fiscal/icms-reducao';

export async function listIcmsReducao(filters?: { uf?: string; item_id?: number | string; active?: boolean }): Promise<IcmsReducao[]> {
  const { data } = await httpClient.get(`${ICMS_RED}/`, { params: cleanParams(filters) });
  return asList(data);
}
export async function findIcmsReducao(filter: { uf?: string; item_id?: string | number; customer_id?: string | number; op_type?: string }): Promise<IcmsReducao | null> {
  const { data } = await httpClient.get(`${ICMS_RED}/find`, { params: cleanParams(filter) });
  const o = unwrapObject(data);
  return Object.keys(o).length ? (o as unknown as IcmsReducao) : null;
}
export async function createIcmsReducao(dto: IcmsReducaoDTO): Promise<IcmsReducao> {
  const { data } = await httpClient.post(`${ICMS_RED}/`, dto);
  return asOne(data);
}
export async function updateIcmsReducao(dto: IcmsReducaoDTO): Promise<IcmsReducao> {
  const { data } = await httpClient.put(`${ICMS_RED}/`, dto);
  return asOne(data);
}

// ─── §30 Restituição/Ressarcimento/Complementação ICMS ST ───────────────────

export interface IcmsStRestituicaoDTO {
  id?: number;
  empresa_id: number;
  period: string;
  restitution_type: RestituicaoTipo;
  uf: string;
  orig_doc_model: string;
  orig_doc_number: string;
  orig_doc_date?: string;
  orig_emitter_cnpj: string;
  item_code: string;
  cfop: string;
  cst_icms: string;
  icms_st_base: number;
  icms_st_aliq: number;
  icms_st_value: number;
  icms_st_base_restitution: number;
  icms_st_value_restitution: number;
}
export interface IcmsStRestituicao extends IcmsStRestituicaoDTO { id: number; }

const ICMS_ST = '/api/fiscal/icms-st-restituicao';

export async function listIcmsStRestituicao(filter?: { empresa_id?: number; period?: string; uf?: string }): Promise<IcmsStRestituicao[]> {
  const { data } = await httpClient.get(`${ICMS_ST}/`, { params: cleanParams(filter) });
  return asList(data);
}
export async function createIcmsStRestituicao(dto: IcmsStRestituicaoDTO): Promise<IcmsStRestituicao> {
  const { data } = await httpClient.post(`${ICMS_ST}/`, dto);
  return asOne(data);
}
export async function updateIcmsStRestituicao(dto: IcmsStRestituicaoDTO): Promise<IcmsStRestituicao> {
  const { data } = await httpClient.put(`${ICMS_ST}/`, dto);
  return asOne(data);
}

// ─── §29 Adicionais do resumo de ICMS (C197) ────────────────────────────────

export interface ResumoAdicionalDTO {
  id?: number;
  summary_entry_id: number;
  arrecadacao_indicator: ArrecadacaoIndicator;
  processo: string;
  description: string;
}

const ICMS_ADIC = '/api/fiscal/icms-resumo-adicionais';

export async function listResumoAdicionais(summaryEntryId: number): Promise<Obj[]> {
  const { data } = await httpClient.get(`${ICMS_ADIC}/${summaryEntryId}`);
  return unwrapArray(data).map(unwrapObject);
}
export async function createResumoAdicional(dto: ResumoAdicionalDTO): Promise<ResumoAdicionalDTO> {
  const { data } = await httpClient.post(`${ICMS_ADIC}/`, dto);
  return asOne(data);
}

// ─── §31 Notas especiais de ajuste ──────────────────────────────────────────

export interface NotaEspecialDTO {
  id?: number;
  empresa_id: number;
  purpose: NotaEspecialPurpose;
  issue_date: string;
  period: string;
  cfop_id?: number;
  icms_apuracao_line_id?: number;
  adjustment_code_id?: number;
  auto_generate_summary: boolean;
  total_value: number;
  total_icms: number;
  observation?: string;
  status?: string;
}
export interface NotaEspecial extends NotaEspecialDTO { id: number; status?: string; }

export interface NotaEspecialItemDTO {
  id?: number;
  sequence?: number;
  item_code: string;
  description: string;
  quantity: number;
  unit: string;
  unit_value: number;
  total_value: number;
  icms_base: number;
  icms_pct: number;
  icms_value: number;
  cst_icms: string;
  cfop_id?: number;
}

const NOTAS_ESP = '/api/fiscal/notas-especiais';

export async function listNotasEspeciais(filter?: { empresa_id?: number; period?: string }): Promise<NotaEspecial[]> {
  const { data } = await httpClient.get(`${NOTAS_ESP}/`, { params: cleanParams(filter) });
  return asList(data);
}
export async function createNotaEspecial(dto: NotaEspecialDTO): Promise<NotaEspecial> {
  const { data } = await httpClient.post(`${NOTAS_ESP}/`, dto);
  return asOne(data);
}
export async function updateNotaEspecial(dto: NotaEspecialDTO): Promise<NotaEspecial> {
  const { data } = await httpClient.put(`${NOTAS_ESP}/`, dto);
  return asOne(data);
}
export async function addNotaEspecialItem(notaId: number, dto: NotaEspecialItemDTO): Promise<NotaEspecialItemDTO> {
  const { data } = await httpClient.post(`${NOTAS_ESP}/${notaId}/itens`, dto);
  return asOne(data);
}
export async function listNotaEspecialItens(notaId: number): Promise<Obj[]> {
  const { data } = await httpClient.get(`${NOTAS_ESP}/${notaId}/itens`);
  return unwrapArray(data).map(unwrapObject);
}

// ─── §34 Classificações fiscais ─────────────────────────────────────────────

export interface FiscalClassificationDTO {
  code?: string;
  description: string;
  ncm: string;
  cest?: string;
  ex_tarifario?: string;
  ipi_rate: number;
  ipi_indicator: IpiIndicator;
  pis_rate: number;
  cofins_rate: number;
  mod_bc_icms?: string;
  mod_bc_icms_st?: string;
  cod_clas_trib?: string;
  cod_clas_trib_trib_reg?: string;
  obs_fiscal?: string;
  is_active?: boolean;
}
export interface FiscalClassification extends FiscalClassificationDTO { code: string; is_active?: boolean; }
export interface ClassificationLanguage { language: string; description: string; }
export interface ClassificationExportAttr {
  ncm: string;
  code: string;
  description: string;
  domain: string;
  start_date: string;
  end_date: string;
}
export interface ClassificationExportAttrDTO extends ClassificationExportAttr {
  classification_code: string;
}
export interface FiscalClassificationDetail extends FiscalClassification {
  languages: Obj[];
  exportAttributes: Obj[];
}

const CLASSIF = '/api/fiscal-classifications';

export async function listFiscalClassifications(includeInactive = false): Promise<FiscalClassification[]> {
  const { data } = await httpClient.get(`${CLASSIF}/`, includeInactive ? { params: { only_active: 'false' } } : undefined);
  return asList(data);
}
export async function getClassificationDetail(code: string): Promise<FiscalClassificationDetail> {
  const { data } = await httpClient.get(`${CLASSIF}/${encodeURIComponent(code)}`);
  const o = unwrapObject(data);
  return {
    ...(o as unknown as FiscalClassification),
    languages: unwrapArray(o['languages'] ?? o['Languages']).map(unwrapObject),
    exportAttributes: unwrapArray(
      o['exportAttributes'] ?? o['export_attributes'] ?? o['ExportAttributes'],
    ).map(unwrapObject),
  };
}
export async function createFiscalClassification(dto: FiscalClassificationDTO): Promise<FiscalClassification> {
  const { data } = await httpClient.post(`${CLASSIF}/`, dto);
  return asOne(data);
}
export async function updateFiscalClassification(dto: FiscalClassificationDTO): Promise<FiscalClassification> {
  const { data } = await httpClient.put(`${CLASSIF}/`, dto);
  return asOne(data);
}
export async function addClassificationLanguage(dto: { classification_code: string; language: string; description: string }): Promise<ClassificationLanguage> {
  const { data } = await httpClient.post(`${CLASSIF}/languages`, dto);
  return asOne(data);
}
export async function addClassificationExportAttribute(dto: ClassificationExportAttrDTO): Promise<ClassificationExportAttr> {
  const { data } = await httpClient.post(`${CLASSIF}/export-attributes`, dto);
  return asOne(data);
}

// ─── §35 Operações de entrada (+ grupos de estado) ──────────────────────────

export interface EntryOperationDTO {
  code: string;
  description: string;
  invoice_type_code: string;
  nature_operation: string;
  classification_type?: string;
  classification_code?: string;
  state_group_code: string;
  supplier_type_code: string;
  is_active?: boolean;
}
export interface StateGroupDTO {
  code: string;
  description: string;
  ufs?: string[];
}
export interface EntryOperationValidation { valid: boolean; reason: string; }

const ENTRY_OP = '/api/entry-operations';

export async function listEntryOperations(): Promise<EntryOperationDTO[]> {
  const { data } = await httpClient.get(`${ENTRY_OP}`);
  return asList(data);
}
export async function createEntryOperation(dto: EntryOperationDTO): Promise<EntryOperationDTO> {
  const { data } = await httpClient.post(`${ENTRY_OP}`, dto);
  return asOne(data);
}
export async function updateEntryOperation(dto: EntryOperationDTO): Promise<EntryOperationDTO> {
  const { data } = await httpClient.put(`${ENTRY_OP}`, dto);
  return asOne(data);
}
export async function validateEntryOperation(code: string, uf: string): Promise<EntryOperationValidation> {
  const { data } = await httpClient.get(`${ENTRY_OP}/${encodeURIComponent(code)}/validate`, { params: { uf } });
  const o = unwrapObject(data);
  return { valid: parseBool(o, 'valid', 'Valid'), reason: parseStr(o, 'reason', 'Reason') };
}
export async function listStateGroups(): Promise<StateGroupDTO[]> {
  const { data } = await httpClient.get(`${ENTRY_OP}/state-groups`);
  return asList(data);
}
export async function createStateGroup(dto: StateGroupDTO): Promise<StateGroupDTO> {
  const { data } = await httpClient.post(`${ENTRY_OP}/state-groups`, dto);
  return asOne(data);
}
export async function addUfToStateGroup(code: string, uf: string): Promise<StateGroupDTO> {
  const { data } = await httpClient.post(`${ENTRY_OP}/state-groups/${encodeURIComponent(code)}/ufs`, { uf });
  return asOne(data);
}
