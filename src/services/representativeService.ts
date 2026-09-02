import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/representatives';

/**
 * Representantes — `/api/representatives` (Vendas e Expedição §5).
 *
 * Cadastro de vendedores externos/internos, gerentes e prepostos. Cada venda
 * aponta para um cadastro com documento, território, comissão e contatos. Pode
 * ser vinculado a um cliente e/ou fornecedor existente (`is_customer`/`is_supplier`)
 * sem duplicar cadastro. Exige `name`, `document_number` e `register_date`;
 * a UF é normalizada em maiúsculas e `device_quantity` não aceita negativo.
 */
export interface RepresentativeDTO {
  code?: number;
  is_customer?: boolean;
  customer_code?: number;
  is_supplier?: boolean;
  supplier_code?: number;
  name: string;
  trade_name?: string;
  type_code?: number;
  category_code?: number;
  register_date?: string;
  core_number?: string;
  document_number: string;
  postal_code?: string;
  city?: string;
  state?: string;
  full_address?: string;
  street?: string;
  street_number?: string;
  complement?: string;
  district?: string;
  device_quantity?: number;
  is_active?: boolean;
  is_blocked?: boolean;
  block_reason?: string;
  main_phone?: string;
  main_email?: string;
  enterprises?: RepresentativeEnterpriseDTO[];
  segments?: RepresentativeSegmentDTO[];
  sales_plans?: RepresentativeSalesPlanDTO[];
  interests?: RepresentativeInterestDTO[];
  phones?: RepresentativePhoneDTO[];
  emails?: RepresentativeEmailDTO[];
  correspondence_addresses?: RepresentativeAddressDTO[];
}

export interface RepresentativeEnterpriseDTO { id?: number; enterprise_code: number; enterprise_name?: string; commission_pct?: number; is_default?: boolean; is_active?: boolean; }
export interface RepresentativeSegmentDTO { id?: number; market_segment_code: number; is_active?: boolean; }
export interface RepresentativeSalesPlanDTO { id?: number; sales_plan_code: number; is_active?: boolean; }
export interface RepresentativeInterestDTO { id?: number; item_classification_code: number; is_active?: boolean; }
export interface RepresentativePhoneDTO { id?: number; ddi?: string; ddd?: string; phone: string; phone_type?: string; ranking?: number; }
export interface RepresentativeEmailDTO { id?: number; email: string; ranking?: number; }
export interface RepresentativeAddressDTO { id?: number; postal_code?: string; city?: string; state?: string; full_address?: string; street?: string; street_number?: string; district?: string; is_default?: boolean; }

export interface RepresentativeTypeDTO {
  code?: number;
  description: string;
  is_free?: boolean;
  ignores_direct_billing?: boolean;
  is_active?: boolean;
}

export interface RepresentativeListFilters {
  codes?: string;
  description?: string;
  type_code?: number;
  state?: string;
  region_code?: number;
  active_status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
}

export interface RepresentativeReportFilters extends RepresentativeListFilters {
  sort_by?: 'CODE' | 'NAME' | 'STATE' | 'REGION';
  with_accounts?: boolean;
}

export interface RepresentativeFollowUpFilters {
  representative_codes?: string;
  customer_codes?: string;
  from?: string;
  to?: string;
}

function parseRep(raw: unknown): RepresentativeDTO {
  const o = unwrapObject(raw);
  const rows = (key: string, pascal: string) => unwrapArray(o[key] ?? o[pascal]).map(unwrapObject);
  return {
    code: parseNum(o, 'code', 'Code'),
    is_customer: parseBool(o, 'is_customer', 'IsCustomer'),
    customer_code: parseNum(o, 'customer_code', 'CustomerCode'),
    is_supplier: parseBool(o, 'is_supplier', 'IsSupplier'),
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode'),
    name: parseStr(o, 'name', 'Name'),
    trade_name: parseStr(o, 'trade_name', 'TradeName'),
    type_code: parseNum(o, 'type_code', 'TypeCode'),
    category_code: parseNum(o, 'category_code', 'CategoryCode'),
    register_date: parseStr(o, 'register_date', 'RegisterDate') || undefined,
    core_number: parseStr(o, 'core_number', 'CoreNumber'),
    document_number: parseStr(o, 'document_number', 'DocumentNumber'),
    postal_code: parseStr(o, 'postal_code', 'PostalCode'),
    city: parseStr(o, 'city', 'City'),
    state: parseStr(o, 'state', 'State'),
    full_address: parseStr(o, 'full_address', 'FullAddress'),
    street: parseStr(o, 'street', 'Street'),
    street_number: parseStr(o, 'street_number', 'StreetNumber'),
    complement: parseStr(o, 'complement', 'Complement'),
    district: parseStr(o, 'district', 'District'),
    device_quantity: parseNum(o, 'device_quantity', 'DeviceQuantity'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
    is_blocked: parseBool(o, 'blocked', 'Blocked', 'is_blocked', 'IsBlocked'),
    block_reason: parseStr(o, 'block_reason', 'BlockReason'),
    main_phone: parseStr(o, 'main_phone', 'MainPhone'),
    main_email: parseStr(o, 'main_email', 'MainEmail'),
    enterprises: rows('enterprises', 'Enterprises').map((v) => ({ id: parseNum(v, 'id', 'ID'), enterprise_code: parseNum(v, 'enterprise_code', 'EnterpriseCode'), enterprise_name: parseStr(v, 'enterprise_name', 'EnterpriseName'), commission_pct: parseNum(v, 'commission_pct', 'CommissionPct'), is_default: parseBool(v, 'is_default', 'IsDefault'), is_active: parseBool(v, 'is_active', 'IsActive') })),
    segments: rows('segments', 'Segments').map((v) => ({ id: parseNum(v, 'id', 'ID'), market_segment_code: parseNum(v, 'market_segment_code', 'MarketSegmentCode'), is_active: parseBool(v, 'is_active', 'IsActive') })),
    sales_plans: rows('sales_plans', 'SalesPlans').map((v) => ({ id: parseNum(v, 'id', 'ID'), sales_plan_code: parseNum(v, 'sales_plan_code', 'SalesPlanCode'), is_active: parseBool(v, 'is_active', 'IsActive') })),
    interests: rows('interests', 'Interests').map((v) => ({ id: parseNum(v, 'id', 'ID'), item_classification_code: parseNum(v, 'item_classification_code', 'ItemClassificationCode'), is_active: parseBool(v, 'is_active', 'IsActive') })),
    phones: rows('phones', 'Phones').map((v) => ({ id: parseNum(v, 'id', 'ID'), ddi: parseStr(v, 'ddi', 'DDI'), ddd: parseStr(v, 'ddd', 'DDD'), phone: parseStr(v, 'phone', 'Phone'), phone_type: parseStr(v, 'phone_type', 'PhoneType'), ranking: parseNum(v, 'ranking', 'Ranking') })),
    emails: rows('emails', 'Emails').map((v) => ({ id: parseNum(v, 'id', 'ID'), email: parseStr(v, 'email', 'Email'), ranking: parseNum(v, 'ranking', 'Ranking') })),
    correspondence_addresses: rows('correspondence_addresses', 'CorrespondenceAddresses').map((v) => ({ id: parseNum(v, 'id', 'ID'), postal_code: parseStr(v, 'postal_code', 'PostalCode'), city: parseStr(v, 'city', 'City'), state: parseStr(v, 'state', 'State'), full_address: parseStr(v, 'full_address', 'FullAddress'), street: parseStr(v, 'street', 'Street'), street_number: parseStr(v, 'street_number', 'StreetNumber'), district: parseStr(v, 'district', 'District'), is_default: parseBool(v, 'is_default', 'IsDefault') })),
  };
}

export async function listRepresentativeSalesPlans(): Promise<number[]> {
  const { data } = await httpClient.get(`${BASE}/sales-plans`);
  return unwrapArray(data).map((raw) => parseNum(unwrapObject(raw), 'code', 'Code')).filter((code) => code > 0);
}

function parseType(raw: unknown): RepresentativeTypeDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    is_free: parseBool(o, 'is_free', 'IsFree'),
    ignores_direct_billing: parseBool(o, 'ignores_direct_billing', 'IgnoresDirectBilling'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

// ─── Cadastro ────────────────────────────────────────────────────────────────

export async function listRepresentatives(filters: RepresentativeListFilters = {}): Promise<RepresentativeDTO[]> {
  const params: Record<string, string> = {};
  if (filters.codes) params.codes = filters.codes;
  if (filters.description) params.description = filters.description;
  if (filters.type_code) params.type_code = String(filters.type_code);
  if (filters.state) params.state = filters.state;
  if (filters.region_code) params.region_code = String(filters.region_code);
  if (filters.active_status) params.active_status = filters.active_status;
  const { data } = await httpClient.get(`${BASE}/list`, { params });
  return unwrapArray(data).map(parseRep);
}
export async function getRepresentative(code: number): Promise<RepresentativeDTO> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parseRep(data);
}
export async function createRepresentative(dto: RepresentativeDTO): Promise<RepresentativeDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseRep(data);
}
export async function updateRepresentative(code: number, dto: RepresentativeDTO): Promise<RepresentativeDTO> {
  const { data } = await httpClient.put(`${BASE}/${code}`, { ...dto, code });
  return parseRep(data);
}
export async function blockRepresentative(code: number, reason: string): Promise<Obj> {
  const { data } = await httpClient.patch(`${BASE}/${code}/block`, { reason });
  return unwrapObject(data);
}
export async function unblockRepresentative(code: number): Promise<Obj> {
  const { data } = await httpClient.patch(`${BASE}/${code}/unblock`, {});
  return unwrapObject(data);
}

// ─── Relatórios ──────────────────────────────────────────────────────────────

export async function getRepresentativeReport(filters: RepresentativeReportFilters = {}): Promise<Obj[]> {
  const params: Record<string, string> = {};
  if (filters.codes) params.codes = filters.codes;
  if (filters.description) params.description = filters.description;
  if (filters.type_code) params.type_code = String(filters.type_code);
  if (filters.state) params.state = filters.state;
  if (filters.region_code) params.region_code = String(filters.region_code);
  if (filters.active_status) params.active_status = filters.active_status;
  if (filters.sort_by) params.sort_by = filters.sort_by;
  if (filters.with_accounts) params.with_accounts = 'true';
  const { data } = await httpClient.get(`${BASE}/report`, { params });
  return unwrapArray(data).map(unwrapObject);
}
export async function getRepresentativeFollowUp(filters: RepresentativeFollowUpFilters = {}): Promise<Obj[]> {
  const params: Record<string, string> = {};
  if (filters.representative_codes) params.representative_codes = filters.representative_codes;
  if (filters.customer_codes) params.customer_codes = filters.customer_codes;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  const { data } = await httpClient.get(`${BASE}/follow-up`, { params });
  return unwrapArray(data).map(unwrapObject);
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export async function listRepresentativeTypes(): Promise<RepresentativeTypeDTO[]> {
  const { data } = await httpClient.get(`${BASE}/types/`);
  return unwrapArray(data).map(parseType);
}
export async function getRepresentativeType(code: number): Promise<RepresentativeTypeDTO> {
  const { data } = await httpClient.get(`${BASE}/types/${code}`);
  return parseType(data);
}
export async function createRepresentativeType(dto: RepresentativeTypeDTO): Promise<RepresentativeTypeDTO> {
  const { data } = await httpClient.post(`${BASE}/types/`, dto);
  return parseType(data);
}
export async function updateRepresentativeType(code: number, dto: RepresentativeTypeDTO): Promise<RepresentativeTypeDTO> {
  const { data } = await httpClient.put(`${BASE}/types/${code}`, { ...dto, code });
  return parseType(data);
}

// ─── Pastas do cadastro ──────────────────────────────────────────────────────
// Vínculos por representante (representative_code no corpo). Campos por pasta:
//  phones: ddi?, ddd?, phone, phone_type, ranking
//  emails: email, ranking
//  enterprises: enterprise_code, commission_pct, is_default, is_active

export type RepresentativeFolder =
  | 'enterprises' | 'accounting' | 'regions' | 'segments' | 'sales-plans'
  | 'interests' | 'phones' | 'emails' | 'correspondence-addresses' | 'contacts';

export async function addRepresentativeFolder(folder: RepresentativeFolder, payload: Obj): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${folder}`, payload);
  return unwrapObject(data);
}
