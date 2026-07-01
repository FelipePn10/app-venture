import { httpClient, parseStr, parseNum, parseBool, currentUserId, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/suppliers';
const SUPPORT = `${BASE}/support`;

/**
 * Cadastro de Fornecedor (Fornecedores / Transportadoras) — `/api/suppliers`.
 * Reaproveita condição de pagamento / transportadora / região do módulo de Cliente.
 * Cobre entidade + pastas (endereços/telefones/emails/vencimentos/contatos/empresas),
 * apoios (tipos de fornecedor/contato), parâmetros por empresa, consulta SEFAZ e o
 * provider de defaults consumido pelo Pedido de Compra.
 */
export type PersonType = 'JURIDICA' | 'FISICA';
export const PERSON_TYPES: PersonType[] = ['JURIDICA', 'FISICA'];

export type DocumentType = 'CNPJ' | 'CPF' | 'ESTRANGEIRO' | 'ISENTO';
export const DOCUMENT_TYPES: DocumentType[] = ['CNPJ', 'CPF', 'ESTRANGEIRO', 'ISENTO'];

export type FreightType = 'CIF' | 'DAF' | 'FOB' | 'SEM_FRETE' | 'CONVENIO' | 'RETIRA' | 'CORTESIA' | 'TERCEIROS';
export const FREIGHT_TYPES: FreightType[] = ['CIF', 'DAF', 'FOB', 'SEM_FRETE', 'CONVENIO', 'RETIRA', 'CORTESIA', 'TERCEIROS'];

export type IcmsContributor = 'CONTRIBUINTE' | 'NAO_CONTRIBUINTE' | 'ISENTO';
export const ICMS_CONTRIBUTORS: IcmsContributor[] = ['CONTRIBUINTE', 'NAO_CONTRIBUINTE', 'ISENTO'];

export type ViticolaObligation = 'NUNCA' | 'AS_VEZES' | 'SEMPRE';
export const VITICOLA: ViticolaObligation[] = ['NUNCA', 'AS_VEZES', 'SEMPRE'];

export type TrackingPlatform = 'SSW' | 'FRETEWEB' | 'ENGLOBA_SISTEMAS' | 'NENHUM';
export const TRACKING_PLATFORMS: TrackingPlatform[] = ['SSW', 'FRETEWEB', 'ENGLOBA_SISTEMAS', 'NENHUM'];

export type SupplierKind = 'NORMAL' | 'TRANSPORTADORA' | 'TRANSP_REDESP' | 'REDESPACHO';
export const SUPPLIER_KINDS: SupplierKind[] = ['NORMAL', 'TRANSPORTADORA', 'TRANSP_REDESP', 'REDESPACHO'];

export interface SupplierDTO {
  id?: number;
  code?: number;
  name: string;
  trade_name?: string;
  person_type: PersonType;
  document_type: DocumentType;
  document_number: string;
  state_registration?: string;
  municipal_registration?: string;
  supplier_type_code?: number;
  freight_type: FreightType;
  icms_contributor: IcmsContributor;
  is_representative?: boolean;
  is_customer?: boolean;
  is_mei?: boolean;
  is_active?: boolean;
  viticola_obligation?: ViticolaObligation;
  tracking_platform?: TrackingPlatform;
  corporate_code?: number;
  gln_code?: string;
  agriculture_ministry_registration?: string;
  homologated?: boolean;
  billing_receipt_status?: string;
  last_sefaz_query?: string;
  register_date?: string;
  payment_condition_id?: number;
  created_by?: string;
}

export interface SupplierTypeDTO {
  id?: number;
  code?: number;
  description: string;
  kind: SupplierKind;
}

export interface ContactTypeDTO {
  id?: number;
  code?: number;
  description: string;
}

export interface EnterpriseLinkDTO {
  id?: number;
  supplier_code?: number;
  enterprise_code: number;
  financial_account?: number;
  ipi?: boolean;
  default_invoice_type_id?: number;
  purchase_price_table_id?: number;
}

export interface SupplierParametersDTO {
  enterprise_code: number;
  default_financial_account?: string;
  unique_item_code_per_supplier?: boolean;
  requires_financial_account?: boolean;
  purchase_supplier_type_id?: number;
  copy_obs_to_purchase_order?: boolean;
  copy_obs_to_entry_invoice?: boolean;
  homologation_default?: boolean;
  use_stock_uom?: boolean;
  generic_supplier_code?: number;
  default_due_base_date?: string;
}

function parseSupplier(raw: unknown): SupplierDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseNum(o, 'code', 'Code'),
    name: parseStr(o, 'name', 'Name'),
    trade_name: parseStr(o, 'trade_name', 'TradeName') || undefined,
    person_type: (parseStr(o, 'person_type', 'PersonType') || 'JURIDICA') as PersonType,
    document_type: (parseStr(o, 'document_type', 'DocumentType') || 'CNPJ') as DocumentType,
    document_number: parseStr(o, 'document_number', 'DocumentNumber'),
    state_registration: parseStr(o, 'state_registration', 'StateRegistration') || undefined,
    municipal_registration: parseStr(o, 'municipal_registration', 'MunicipalRegistration') || undefined,
    supplier_type_code: parseNum(o, 'supplier_type_code', 'supplier_type_id', 'SupplierTypeID') || undefined,
    freight_type: (parseStr(o, 'freight_type', 'FreightType') || 'CIF') as FreightType,
    icms_contributor: (parseStr(o, 'icms_contributor', 'IcmsContributor') || 'CONTRIBUINTE') as IcmsContributor,
    is_representative: parseBool(o, 'is_representative', 'IsRepresentative'),
    is_customer: parseBool(o, 'is_customer', 'IsCustomer'),
    is_mei: parseBool(o, 'is_mei', 'IsMei'),
    is_active: o['is_active'] !== false && o['IsActive'] !== false,
    viticola_obligation: (parseStr(o, 'viticola_obligation', 'ViticolaObligation') || 'NUNCA') as ViticolaObligation,
    tracking_platform: (parseStr(o, 'tracking_platform', 'TrackingPlatform') || 'NENHUM') as TrackingPlatform,
    corporate_code: parseNum(o, 'corporate_code', 'CorporateCode') || undefined,
    gln_code: parseStr(o, 'gln_code', 'GlnCode') || undefined,
    agriculture_ministry_registration: parseStr(o, 'agriculture_ministry_registration', 'AgricultureMinistryRegistration') || undefined,
    homologated: parseBool(o, 'homologated', 'Homologated'),
    billing_receipt_status: parseStr(o, 'billing_receipt_status', 'BillingReceiptStatus') || undefined,
    register_date: parseStr(o, 'register_date', 'RegisterDate') || undefined,
    payment_condition_id: parseNum(o, 'payment_condition_id', 'PaymentConditionID') || undefined,
  };
}
function parseType(raw: unknown): SupplierTypeDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    kind: (parseStr(o, 'kind', 'Kind') || 'NORMAL') as SupplierKind,
  };
}
function parseContactType(raw: unknown): ContactTypeDTO {
  const o = unwrapObject(raw);
  return { id: parseNum(o, 'id', 'ID'), code: parseNum(o, 'code', 'Code'), description: parseStr(o, 'description', 'Description') };
}
function parseEnterprise(raw: unknown): EnterpriseLinkDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode') || undefined,
    enterprise_code: parseNum(o, 'enterprise_code', 'EnterpriseCode'),
    financial_account: parseNum(o, 'financial_account', 'FinancialAccount') || undefined,
    ipi: parseBool(o, 'ipi', 'calculates_ipi', 'Ipi'),
    default_invoice_type_id: parseNum(o, 'default_invoice_type_id', 'DefaultInvoiceTypeID') || undefined,
    purchase_price_table_id: parseNum(o, 'purchase_price_table_id', 'PurchasePriceTableID') || undefined,
  };
}
function parseParameters(raw: unknown): SupplierParametersDTO {
  const o = unwrapObject(raw);
  return {
    enterprise_code: parseNum(o, 'enterprise_code', 'EnterpriseCode'),
    default_financial_account: parseStr(o, 'default_financial_account', 'DefaultFinancialAccount') || undefined,
    unique_item_code_per_supplier: parseBool(o, 'unique_item_code_per_supplier', 'UniqueItemCodePerSupplier'),
    requires_financial_account: parseBool(o, 'requires_financial_account', 'RequiresFinancialAccount'),
    purchase_supplier_type_id: parseNum(o, 'purchase_supplier_type_id', 'PurchaseSupplierTypeID') || undefined,
    copy_obs_to_purchase_order: parseBool(o, 'copy_obs_to_purchase_order', 'CopyObsToPurchaseOrder'),
    copy_obs_to_entry_invoice: parseBool(o, 'copy_obs_to_entry_invoice', 'CopyObsToEntryInvoice'),
    homologation_default: parseBool(o, 'homologation_default', 'HomologationDefault'),
    use_stock_uom: parseBool(o, 'use_stock_uom', 'UseStockUom'),
    generic_supplier_code: parseNum(o, 'generic_supplier_code', 'GenericSupplierCode') || undefined,
    default_due_base_date: parseStr(o, 'default_due_base_date', 'DefaultDueBaseDate') || undefined,
  };
}

// ── Fornecedor ──
export async function listSuppliers(onlyActive = true): Promise<SupplierDTO[]> {
  const { data } = await httpClient.get(BASE, { params: onlyActive ? undefined : { only_active: false } });
  return unwrapArray(data).map(parseSupplier);
}
export async function getSupplier(code: number): Promise<Obj> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return unwrapObject(data);
}
export async function createSupplier(dto: SupplierDTO): Promise<SupplierDTO> {
  const { data } = await httpClient.post(BASE, { created_by: currentUserId(), ...dto });
  return parseSupplier(data);
}
export async function updateSupplier(dto: SupplierDTO): Promise<SupplierDTO> {
  const { data } = await httpClient.put(BASE, dto);
  return parseSupplier(data);
}
export async function blockSupplier(code: number, reason?: string): Promise<void> {
  await httpClient.patch(`${BASE}/${code}/block`, { reason: reason ?? '' });
}
export async function unblockSupplier(code: number): Promise<void> {
  await httpClient.patch(`${BASE}/${code}/unblock`, {});
}
export async function listEstablishments(corporateCode: number): Promise<SupplierDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${corporateCode}/establishments`);
  return unwrapArray(data).map(parseSupplier);
}

// ── Apoios ──
export async function listSupplierTypes(): Promise<SupplierTypeDTO[]> {
  const { data } = await httpClient.get(`${SUPPORT}/supplier-types`);
  return unwrapArray(data).map(parseType);
}
export async function createSupplierType(dto: SupplierTypeDTO): Promise<SupplierTypeDTO> {
  const { data } = await httpClient.post(`${SUPPORT}/supplier-types`, { created_by: currentUserId(), ...dto });
  return parseType(data);
}
export async function updateSupplierType(dto: SupplierTypeDTO): Promise<SupplierTypeDTO> {
  const { data } = await httpClient.put(`${SUPPORT}/supplier-types`, dto);
  return parseType(data);
}
export async function listContactTypes(): Promise<ContactTypeDTO[]> {
  const { data } = await httpClient.get(`${SUPPORT}/contact-types`);
  return unwrapArray(data).map(parseContactType);
}
export async function createContactType(dto: ContactTypeDTO): Promise<ContactTypeDTO> {
  const { data } = await httpClient.post(`${SUPPORT}/contact-types`, dto);
  return parseContactType(data);
}

// ── Parâmetros por empresa ──
export async function getParameters(enterpriseCode: number): Promise<SupplierParametersDTO> {
  const { data } = await httpClient.get(`${SUPPORT}/parameters/${enterpriseCode}`);
  return parseParameters(data);
}
export async function updateParameters(dto: SupplierParametersDTO): Promise<SupplierParametersDTO> {
  const { data } = await httpClient.put(`${SUPPORT}/parameters`, dto);
  return parseParameters(data);
}

// ── Pastas ──
export async function addAddress(body: Obj): Promise<void> {
  await httpClient.post(`${BASE}/addresses`, body);
}
export async function addPhone(body: Obj): Promise<void> {
  await httpClient.post(`${BASE}/phones`, body);
}
export async function addEmail(body: Obj): Promise<void> {
  await httpClient.post(`${BASE}/emails`, body);
}
export async function addDueDate(body: Obj): Promise<void> {
  await httpClient.post(`${BASE}/due-dates`, body);
}
export async function addContact(body: Obj): Promise<void> {
  await httpClient.post(`${BASE}/contacts`, body);
}

// ── Vínculo com empresa ──
export async function listEnterprises(code: number): Promise<EnterpriseLinkDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${code}/enterprises`);
  return unwrapArray(data).map(parseEnterprise);
}
export async function addEnterprise(dto: EnterpriseLinkDTO): Promise<EnterpriseLinkDTO> {
  const { data } = await httpClient.post(`${BASE}/enterprises`, dto);
  return parseEnterprise(data);
}

// ── SEFAZ + defaults ──
export async function sefazQuery(code: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/sefaz-query`, {});
  return unwrapObject(data);
}
export async function getPurchasingDefaults(code: number, enterpriseCode: number): Promise<Obj> {
  const { data } = await httpClient.get(`${BASE}/${code}/purchasing-defaults`, { params: { enterprise: enterpriseCode } });
  return unwrapObject(data);
}

// ── Exportação ──
export async function exportSuppliers(fmt: 'xlsx' | 'pdf' | 'csv'): Promise<void> {
  const { data } = await httpClient.get(BASE, { params: { format: fmt }, responseType: 'blob' });
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement('a');
  a.href = url; a.download = `fornecedores.${fmt}`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
