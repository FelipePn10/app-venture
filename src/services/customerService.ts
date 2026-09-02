import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';
import { downloadBlob } from '@/services/fileDownload';

const BASE = '/api/customers';
const SUPPORT = `${BASE}/support`;
/** UUID nulo usado quando a tela não tem um usuário autenticado real. */
const SYS_USER = '00000000-0000-0000-0000-000000000000';

// ─── Tipos e enums ──────────────────────────────────────────────────────────

export type CustomerDocType = 'CNPJ' | 'CPF' | 'ESTRANGEIRO' | 'ISENTO';
export type PaymentCondVisibility = 'SOMENTE_VINCULADOS' | 'VINCULADOS_E_NENHUM' | 'TODOS';
export type AddressType = 'COBRANCA' | 'ENTREGA' | 'COMERCIAL' | 'OUTRO';

export const DOC_TYPES: CustomerDocType[] = ['CNPJ', 'CPF', 'ESTRANGEIRO', 'ISENTO'];
export const VISIBILITIES: PaymentCondVisibility[] = ['SOMENTE_VINCULADOS', 'VINCULADOS_E_NENHUM', 'TODOS'];
export const ADDRESS_TYPES: AddressType[] = ['COBRANCA', 'ENTREGA', 'COMERCIAL', 'OUTRO'];

/** Referência leve de um cadastro de apoio para popular selects. */
export interface SupportRef { code: number; description: string; }

export interface CustomerDTO {
  code?: number;
  corporate_code?: number;
  is_corporate?: boolean;
  name: string;
  trade_name?: string;
  document_type: CustomerDocType;
  document_number: string;
  state_registration?: string;
  municipal_registration?: string;
  suframa_code?: string;
  suframa_expiry?: string;
  region_code?: number;
  market_segment_code?: number;
  customer_type_code?: number;
  payment_condition_code?: number;
  sales_table_code?: number;
  carrier_code?: number;
  carrier_group_code?: number;
  invoice_type_code?: number;
  tax_type_code?: number;
  payment_cond_visibility: PaymentCondVisibility;
  credit_limit?: number;
  website?: string;
  blocked?: boolean;
  created_by?: string;
}

// ─── Parsers ────────────────────────────────────────────────────────────────

function parseCustomer(raw: unknown): CustomerDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    corporate_code: parseNum(o, 'corporate_code', 'CorporateCode'),
    is_corporate: parseBool(o, 'is_corporate', 'IsCorporate'),
    name: parseStr(o, 'name', 'Name'),
    trade_name: parseStr(o, 'trade_name', 'TradeName'),
    document_type: (parseStr(o, 'document_type', 'DocumentType') || 'CNPJ') as CustomerDocType,
    document_number: parseStr(o, 'document_number', 'DocumentNumber'),
    state_registration: parseStr(o, 'state_registration', 'StateRegistration'),
    payment_cond_visibility: (parseStr(o, 'payment_cond_visibility', 'PaymentCondVisibility') || 'SOMENTE_VINCULADOS') as PaymentCondVisibility,
    credit_limit: parseNum(o, 'credit_limit', 'CreditLimit'),
    blocked: parseBool(o, 'blocked', 'Blocked'),
  };
}

// ─── Cadastros de apoio (genéricos) ─────────────────────────────────────────

/** Lista um cadastro de apoio como referências {code, description} para selects. */
export async function listRefs(resource: string): Promise<SupportRef[]> {
  const { data } = await httpClient.get(`${SUPPORT}/${resource}`);
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      code: parseNum(o, 'code', 'Code', 'id', 'ID'),
      description: parseStr(o, 'description', 'Description', 'name', 'Name'),
    };
  });
}

/** Lista bruta de um cadastro de apoio (usado pelo SupportCrud genérico). */
export async function listSupport(resource: string): Promise<Obj[]> {
  const { data } = await httpClient.get(`${SUPPORT}/${resource}`);
  return unwrapArray(data).map(unwrapObject);
}

export async function createSupport(resource: string, dto: Record<string, unknown>): Promise<Obj> {
  const { data } = await httpClient.post(`${SUPPORT}/${resource}`, { created_by: SYS_USER, ...dto });
  return unwrapObject(data);
}

export async function updateSupport(resource: string, dto: Record<string, unknown>): Promise<Obj> {
  const code = Number(dto.code);
  const path = resource !== 'regions' && code ? `${SUPPORT}/${resource}/${code}` : `${SUPPORT}/${resource}`;
  const { data } = await httpClient.put(path, dto);
  return unwrapObject(data);
}

/** POST genérico para sub-recursos de apoio (ex.: "carrier-groups/members"). */
export async function postSupport(path: string, body: Record<string, unknown>): Promise<Obj> {
  const { data } = await httpClient.post(`${SUPPORT}/${path}`, body);
  return unwrapObject(data);
}

// ─── Cliente ────────────────────────────────────────────────────────────────

export async function listCustomers(): Promise<CustomerDTO[]> {
  const { data } = await httpClient.get(BASE);
  return unwrapArray(data).map(parseCustomer);
}

/** Detalhe bruto do cliente (a tela faz o parsing defensivo dos campos/pastas). */
export async function getCustomer(code: number): Promise<Obj> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return unwrapObject(data);
}

export async function createCustomer(dto: CustomerDTO): Promise<CustomerDTO> {
  const { data } = await httpClient.post(BASE, { created_by: SYS_USER, ...dto });
  return parseCustomer(data);
}

/**
 * Atualiza um cliente. O backend não expõe PUT/PATCH para os campos do cliente
 * (apenas POST de criação e block/unblock), então reenviamos via POST — que faz
 * upsert quando suportado. Ver nota de lacuna do backend nos docs do projeto.
 */
/** Atualiza o cliente via `PUT /api/customers/{code}` (mesmo corpo por códigos do POST). */
export async function updateCustomer(dto: CustomerDTO): Promise<CustomerDTO> {
  const { data } = await httpClient.put(`${BASE}/${dto.code}`, { created_by: SYS_USER, ...dto });
  return parseCustomer(data);
}

export async function blockCustomer(code: number, reason: string): Promise<void> {
  await httpClient.patch(`${BASE}/${code}/block`, { customer_code: code, reason });
}

export async function unblockCustomer(code: number): Promise<void> {
  await httpClient.patch(`${BASE}/${code}/unblock`, {});
}

export async function addCustomerAddress(code: number, address: Record<string, unknown>): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/addresses`, address);
  return unwrapObject(data);
}

export async function addCustomerContact(code: number, contact: Record<string, unknown>): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/contacts`, contact);
  return unwrapObject(data);
}

export async function listEstablishments(corporateCode: number): Promise<CustomerDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${corporateCode}/establishments`);
  return unwrapArray(data).map(parseCustomer);
}

/** Dados retornados pela consulta de CNPJ (Receita/BrasilAPI via `/api/cnpj/{cnpj}`). */
export interface CnpjLookup {
  cnpj: string;
  legal_name: string;
  trade_name: string;
  registration_status?: string;
  legal_nature?: string;
  opening_date?: string;
  email?: string;
  phone?: string;
  state_registration?: string;
  state_registrations: Array<{ uf: string; number: string; enabled: boolean }>;
  simples_optant?: boolean;
  mei?: boolean;
  size?: string;
  address?: { zip_code?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; uf?: string };
  main_activity?: { code?: string; description?: string };
  secondary_activities: Array<{ code?: string; description?: string }>;
  source?: string;
}

/** Auto-fill: consulta a Receita pelo CNPJ para pré-preencher o cadastro. */
export async function lookupCnpj(cnpj: string): Promise<CnpjLookup> {
  const digits = cnpj.replace(/\D/g, '');
  const { data } = await httpClient.get(`/api/cnpj/${digits}`);
  const root = unwrapObject(data);
  const o = unwrapObject(root['data'] ?? root);
  const addr = unwrapObject(o['address'] ?? o['Address']);
  const act = unwrapObject(o['main_activity'] ?? o['MainActivity']);
  const stateRegistrations = unwrapArray(o['state_registrations'] ?? o['StateRegistrations']);
  const secondaryActivities = unwrapArray(o['secondary_activities'] ?? o['SecondaryActivities']);
  return {
    cnpj: parseStr(o, 'cnpj', 'Cnpj'),
    legal_name: parseStr(o, 'legal_name', 'LegalName'),
    trade_name: parseStr(o, 'trade_name', 'TradeName'),
    registration_status: parseStr(o, 'registration_status', 'RegistrationStatus') || undefined,
    legal_nature: parseStr(o, 'legal_nature', 'LegalNature') || undefined,
    opening_date: parseStr(o, 'opening_date', 'OpeningDate') || undefined,
    email: parseStr(o, 'email', 'Email') || undefined,
    phone: parseStr(o, 'phone', 'Phone') || undefined,
    state_registration: parseStr(o, 'state_registration', 'StateRegistration') || undefined,
    state_registrations: stateRegistrations.map((raw) => {
      const registration = unwrapObject(raw);
      return {
        uf: parseStr(registration, 'uf', 'UF'),
        number: parseStr(registration, 'number', 'Number'),
        enabled: parseBool(registration, 'enabled', 'Enabled'),
      };
    }),
    simples_optant: o['simples_optant'] === true,
    mei: o['mei'] === true,
    size: parseStr(o, 'size', 'Size') || undefined,
    address: {
      zip_code: parseStr(addr, 'zip_code', 'ZipCode') || undefined,
      street: parseStr(addr, 'street', 'Street') || undefined,
      number: parseStr(addr, 'number', 'Number') || undefined,
      complement: parseStr(addr, 'complement', 'Complement') || undefined,
      neighborhood: parseStr(addr, 'neighborhood', 'Neighborhood') || undefined,
      city: parseStr(addr, 'city', 'City') || undefined,
      uf: parseStr(addr, 'uf', 'Uf') || undefined,
    },
    main_activity: { code: parseStr(act, 'code', 'Code') || undefined, description: parseStr(act, 'description', 'Description') || undefined },
    secondary_activities: secondaryActivities.map((raw) => {
      const activity = unwrapObject(raw);
      return { code: parseStr(activity, 'code', 'Code') || undefined, description: parseStr(activity, 'description', 'Description') || undefined };
    }),
    source: parseStr(o, 'source', 'Source') || undefined,
  };
}

/** Exporta a lista de clientes como arquivo (xlsx/pdf/csv), com download no navegador. */
export async function exportCustomers(fmt: 'xlsx' | 'pdf' | 'csv'): Promise<void> {
  const { data } = await httpClient.get(BASE, { params: { format: fmt }, responseType: 'blob' });
  downloadBlob(data as Blob, `clientes.${fmt}`);
}

export async function exportCustomerPDF(code: number, name?: string): Promise<void> {
  const { data } = await httpClient.get(`${BASE}/${code}/report/pdf`, { responseType: 'blob' });
  downloadBlob(data as Blob, `cliente-${code}-${(name || 'ficha').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase()}.pdf`);
}
