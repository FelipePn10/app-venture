import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';
import { downloadBlob } from '@/services/fileDownload';

const BASE = '/api/customers';
// Caminho literal (e não `${BASE}/support`) para a auditoria de cobertura de
// rotas conseguir casar as chamadas montadas em runtime com as rotas do backend.
const SUPPORT = '/api/customers/support';
/** UUID nulo usado quando a tela não tem um usuário autenticado real. */
const SYS_USER = '00000000-0000-0000-0000-000000000000';

// ─── Tipos e enums ──────────────────────────────────────────────────────────

export type CustomerDocType = 'CNPJ' | 'CPF' | 'ESTRANGEIRO' | 'ISENTO';
export type AddressType = 'COBRANCA' | 'ENTREGA' | 'COMERCIAL' | 'OUTRO';

export const DOC_TYPES: CustomerDocType[] = ['CNPJ', 'CPF', 'ESTRANGEIRO', 'ISENTO'];
export const ADDRESS_TYPES: AddressType[] = ['COBRANCA', 'ENTREGA', 'COMERCIAL', 'OUTRO'];

/** Referência leve de um cadastro de apoio para popular selects. */
export interface SupportRef { code: number; description: string; }

export type IEIndicator = '' | 'CONTRIBUINTE' | 'ISENTO' | 'NAO_CONTRIBUINTE';
export type TaxRegime = '' | 'SIMPLES' | 'MEI' | 'NORMAL';
export type FreightType = '' | 'CIF' | 'FOB' | 'TERCEIROS' | 'SEM_FRETE';

export const IE_INDICATORS: { value: IEIndicator; label: string }[] = [
  { value: '', label: 'Deduzir pela inscrição estadual' },
  { value: 'CONTRIBUINTE', label: 'Contribuinte do ICMS' },
  { value: 'ISENTO', label: 'Contribuinte isento' },
  { value: 'NAO_CONTRIBUINTE', label: 'Não contribuinte' },
];
export const TAX_REGIMES: { value: TaxRegime; label: string }[] = [
  { value: '', label: 'Não informado' },
  { value: 'SIMPLES', label: 'Simples Nacional' },
  { value: 'MEI', label: 'MEI' },
  { value: 'NORMAL', label: 'Lucro Presumido / Real' },
];
export const FREIGHT_TYPES: { value: FreightType; label: string }[] = [
  { value: '', label: 'Não informado' },
  { value: 'CIF', label: 'CIF — remetente paga' },
  { value: 'FOB', label: 'FOB — destinatário paga' },
  { value: 'TERCEIROS', label: 'Terceiros' },
  { value: 'SEM_FRETE', label: 'Sem frete' },
];

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
  /** Portador de cobrança padrão. */
  carrier_code?: number;
  tax_type_code?: number;
  /** Finalidade da compra: REVENDA, INDUSTRIALIZACAO ou USO_CONSUMO ("" = deduzir pela IE). */
  finalidade_compra?: FinalidadeCompra;
  website?: string;
  ie_indicator?: IEIndicator;
  tax_regime?: TaxRegime;
  main_cnae?: string;
  nfe_email?: string;
  billing_email?: string;
  representative_code?: number;
  shipping_carrier_id?: number;
  freight_type?: FreightType;
  requires_customer_po?: boolean;
  requires_quality_cert?: boolean;
  allows_partial_billing?: boolean;
  receiving_notes?: string;
  commercial_notes?: string;
  financial_notes?: string;
  /** 2 = esta tela; sem ele o backend preserva os campos que a tela antiga não conhece. */
  form_version?: number;
  /** Só na inclusão; depois o limite muda pela revisão de crédito. */
  credit_limit?: number;
  credit_limit_reason?: string;
  blocked?: boolean;
  is_active?: boolean;
  credit_risk_class?: string;
  credit_limit_expires_at?: string;
  credit_limit_expired?: boolean;
  created_by?: string;
}

/** O que o cliente faz com a mercadoria — muda a tributação da venda. */
export type FinalidadeCompra = '' | 'REVENDA' | 'INDUSTRIALIZACAO' | 'USO_CONSUMO';

export const FINALIDADES_COMPRA: { value: FinalidadeCompra; label: string }[] = [
  { value: '', label: 'Deduzir pela inscrição estadual' },
  { value: 'REVENDA', label: 'Revenda' },
  { value: 'INDUSTRIALIZACAO', label: 'Industrialização' },
  { value: 'USO_CONSUMO', label: 'Uso, consumo ou ativo' },
];

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
    credit_limit: parseNum(o, 'credit_limit', 'CreditLimit'),
    credit_risk_class: parseStr(o, 'credit_risk_class') || undefined,
    credit_limit_expires_at: parseStr(o, 'credit_limit_expires_at') || undefined,
    credit_limit_expired: parseBool(o, 'credit_limit_expired'),
    blocked: parseBool(o, 'blocked', 'Blocked'),
    is_active: o['is_active'] !== false,
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
/** todos: inclui os inativos (a tela de cadastro); sem ele, só os ativos (listas de escolha). */
export async function listSupport(resource: string, todos = false): Promise<Obj[]> {
  const { data } = await httpClient.get(`${SUPPORT}/${resource}`, todos ? { params: { only_active: false } } : undefined);
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

/** Inativa (some das listas de escolha) ou reativa um cadastro de apoio. */
export async function setSupportActive(resource: string, code: number, isActive: boolean): Promise<void> {
  await httpClient.patch(`${SUPPORT}/${resource}/${code}/active`, { is_active: isActive });
}

/** Exclui um cadastro de apoio (o backend recusa o que estiver em uso). */
export async function deleteSupport(resource: string, code: number): Promise<void> {
  await httpClient.delete(`${SUPPORT}/${resource}/${code}`);
}

/** POST genérico para sub-recursos de apoio (ex.: "carrier-groups/members"). */
export async function postSupport(path: string, body: Record<string, unknown>): Promise<Obj> {
  const { data } = await httpClient.post(`${SUPPORT}/${path}`, body);
  return unwrapObject(data);
}

// ─── Cliente ────────────────────────────────────────────────────────────────

/** Por padrão só os ativos (é o que os outros documentos podem usar); a VCLI0500 pede todos. */
export async function listCustomers(opts: { includeInactive?: boolean } = {}): Promise<CustomerDTO[]> {
  const { data } = await httpClient.get(BASE, opts.includeInactive ? { params: { only_active: false } } : undefined);
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

export async function updateCustomerAddress(code: number, id: number, address: Record<string, unknown>): Promise<Obj> {
  const { data } = await httpClient.put(`${BASE}/${code}/addresses/${id}`, address);
  return unwrapObject(data);
}

export async function deleteCustomerAddress(code: number, id: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}/addresses/${id}`);
}

export async function updateCustomerContact(code: number, id: number, contact: Record<string, unknown>): Promise<Obj> {
  const { data } = await httpClient.put(`${BASE}/${code}/contacts/${id}`, contact);
  return unwrapObject(data);
}

export async function deleteCustomerContact(code: number, id: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}/contacts/${id}`);
}

// ─── Ciclo de vida: inativar, reativar, excluir ─────────────────────────────

export interface CustomerUsage { code: string; label: string; total: number; open: number; }
export interface CustomerUsageReport {
  can_delete: boolean;
  can_inactivate: boolean;
  delete_reason?: string;
  inactivate_reason?: string;
  usages: CustomerUsage[];
}

export async function getCustomerUsage(code: number): Promise<CustomerUsageReport> {
  const { data } = await httpClient.get(`${BASE}/${code}/usage`);
  const o = unwrapObject(data);
  return {
    can_delete: o['can_delete'] === true,
    can_inactivate: o['can_inactivate'] === true,
    delete_reason: parseStr(o, 'delete_reason') || undefined,
    inactivate_reason: parseStr(o, 'inactivate_reason') || undefined,
    usages: unwrapArray(o['usages']).map((raw) => {
      const u = unwrapObject(raw);
      return { code: parseStr(u, 'code'), label: parseStr(u, 'label'), total: parseNum(u, 'total'), open: parseNum(u, 'open') };
    }),
  };
}

export async function inactivateCustomer(code: number): Promise<void> {
  await httpClient.patch(`${BASE}/${code}/inactivate`, {});
}

export async function reactivateCustomer(code: number): Promise<void> {
  await httpClient.patch(`${BASE}/${code}/reactivate`, {});
}

export async function deleteCustomer(code: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}`);
}

/** Reconsulta a situação na Receita (bloqueia o cliente se deixou de estar ATIVA). */
export async function refreshCustomerRegistration(code: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/registration-check`, {});
  return unwrapObject(data);
}

// ─── Crédito ────────────────────────────────────────────────────────────────

export interface CreditFactor { code: string; label: string; points: number; max_points: number; detail: string; blocking?: boolean; }

export interface CreditSuggestion {
  customer_code?: number;
  score: number;
  risk_class: string;
  suggested_limit: number;
  current_limit?: number;
  expires_at: string;
  has_history: boolean;
  hard_stop: boolean;
  deteriorating: boolean;
  group_members: number[];
  registration_checked: boolean;
  /** Até quanto um usuário comum aprova; acima, só ADMIN. */
  max_without_admin: number;
  factors: CreditFactor[];
}

function parseFactors(raw: unknown): CreditFactor[] {
  return unwrapArray(raw).map((r) => {
    const f = unwrapObject(r);
    return { code: parseStr(f, 'code'), label: parseStr(f, 'label'), points: parseNum(f, 'points'), max_points: parseNum(f, 'max_points'), detail: parseStr(f, 'detail'), blocking: f['blocking'] === true };
  });
}

function parseSuggestion(data: unknown): CreditSuggestion {
  const o = unwrapObject(data);
  return {
    customer_code: parseNum(o, 'customer_code') || undefined,
    score: parseNum(o, 'score'),
    risk_class: parseStr(o, 'risk_class'),
    suggested_limit: parseNum(o, 'suggested_limit'),
    current_limit: o['current_limit'] == null ? undefined : parseNum(o, 'current_limit'),
    expires_at: parseStr(o, 'expires_at'),
    has_history: o['has_history'] === true,
    hard_stop: o['hard_stop'] === true,
    deteriorating: o['deteriorating'] === true,
    group_members: unwrapArray(o['group_members']).map((n) => Number(n)),
    registration_checked: o['registration_checked'] === true,
    max_without_admin: parseNum(o, 'max_without_admin'),
    factors: parseFactors(o['factors']),
  };
}

/** Sugestão de limite para cliente gravado (code) ou para um documento ainda não cadastrado. */
export async function suggestCredit(arg: { code: number } | { document_type: string; document: string }): Promise<CreditSuggestion> {
  const { data } = 'code' in arg
    ? await httpClient.get(`${BASE}/${arg.code}/credit-suggestion`)
    : await httpClient.get(`${BASE}/credit-suggestion`, { params: { document_type: arg.document_type, document: arg.document.replace(/\D/g, '') } });
  return parseSuggestion(data);
}

export async function setCreditLimit(code: number, credit_limit: number, reason: string): Promise<Obj> {
  const { data } = await httpClient.put(`${BASE}/${code}/credit-limit`, { credit_limit, reason });
  return unwrapObject(data);
}

export interface CreditReview {
  id: number; origin: string; suggested_limit: number; approved_limit: number; previous_limit?: number;
  score: number; risk_class: string; expires_at: string; deviates: boolean; reason?: string;
  factors: CreditFactor[]; created_by: string; created_by_name: string; created_at: string;
}

export async function listCreditReviews(code: number): Promise<CreditReview[]> {
  const { data } = await httpClient.get(`${BASE}/${code}/credit-reviews`);
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      id: parseNum(o, 'id'), origin: parseStr(o, 'origin'), suggested_limit: parseNum(o, 'suggested_limit'),
      approved_limit: parseNum(o, 'approved_limit'), previous_limit: o['previous_limit'] == null ? undefined : parseNum(o, 'previous_limit'),
      score: parseNum(o, 'score'), risk_class: parseStr(o, 'risk_class'), expires_at: parseStr(o, 'expires_at'),
      deviates: o['deviates'] === true, reason: parseStr(o, 'reason') || undefined, factors: parseFactors(o['factors']),
      created_by: parseStr(o, 'created_by'), created_by_name: parseStr(o, 'created_by_name'), created_at: parseStr(o, 'created_at'),
    };
  });
}

export interface CreditPolicy {
  max_limit: number; new_customer_capital_pct: number; new_customer_cap: number; new_customer_revenue_pct: number; override_tolerance_pct: number;
  overdue_block_days: number; history_months: number;
  validity_months_a: number; validity_months_b: number; validity_months_c: number; validity_months_d: number; validity_months_e: number;
  registration_check_days: number;
}

export async function getCreditPolicy(): Promise<CreditPolicy> {
  const { data } = await httpClient.get(`${SUPPORT}/credit-policy`);
  return unwrapObject(data) as unknown as CreditPolicy;
}

export async function saveCreditPolicy(p: CreditPolicy): Promise<CreditPolicy> {
  const { data } = await httpClient.put(`${SUPPORT}/credit-policy`, p);
  return unwrapObject(data) as unknown as CreditPolicy;
}

// ─── Visão 360 ──────────────────────────────────────────────────────────────

export interface CustomerOverview {
  open_orders: number; open_orders_value: number; production_orders_in_progress: number; open_quotations: number;
  open_service_orders: number; open_receivables: number; overdue_receivables: number; max_open_overdue_days: number;
  billed_12m: number; last_order_date?: string; last_invoice_date?: string; avg_delay_days: number; max_delay_days: number;
  on_time_pct?: number; group_members: number; group_exposure: number; concentration_pct: number;
  credit_limit: number; credit_used: number; credit_available: number;
  billing_by_month: { month: string; value: number }[]; alerts: string[];
}

export async function getCustomerOverview(code: number): Promise<CustomerOverview> {
  const { data } = await httpClient.get(`${BASE}/${code}/overview`);
  const o = unwrapObject(data) as unknown as CustomerOverview;
  return { ...o, billing_by_month: o.billing_by_month ?? [], alerts: o.alerts ?? [] };
}

/**
 * O que quem vende precisa saber ao escolher o cliente (orçamento e pedido):
 * observação comercial, exigências e situação de crédito do cadastro.
 */
export function avisosDoCliente(c: Obj): string[] {
  const a: string[] = [];
  if (c['is_active'] === false) a.push('Cliente INATIVO.');
  if (c['blocked'] === true) a.push(`Cliente BLOQUEADO: ${parseStr(c, 'block_reason') || 'sem motivo informado'}.`);
  const classe = parseStr(c, 'credit_risk_class');
  if (classe === 'D' || classe === 'E') a.push(`Classe de risco ${classe}: o pedido vai para análise de crédito.`);
  if (c['credit_limit_expired'] === true) a.push('Limite de crédito vencido: o pedido vai para análise até a revisão na VCLI0500.');
  const receita = parseStr(c, 'registration_status');
  if (receita && receita.toUpperCase() !== 'ATIVA') a.push(`Situação na Receita: ${receita}.`);
  if (c['requires_customer_po'] === true) a.push('Exige o número do pedido de compra do cliente.');
  if (c['requires_quality_cert'] === true) a.push('Exige certificado de qualidade na entrega.');
  if (c['allows_partial_billing'] === false) a.push('Não aceita faturamento parcial.');
  const obs = parseStr(c, 'commercial_notes');
  if (obs) a.push(obs);
  return a;
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
  /** Capital social em reais (texto decimal), quando a fonte informa. */
  share_capital?: string;
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
    share_capital: parseStr(o, 'share_capital') || undefined,
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

// ─── Condição de pagamento: parcelas e simulação ─────────────────────────────

/**
 * Eventos a partir dos quais o vencimento da parcela é contado. Sem eles não era
 * possível cadastrar "30% de entrada, 20% na entrega e o restante em 28/56
 * dias": a condição só guardava os dias, e todos contavam da emissão.
 */
export const PAYMENT_BASE_EVENTS = [
  { value: 'EMISSAO', label: 'Emissão do documento' },
  { value: 'ENTRADA', label: 'Entrada (no ato)' },
  { value: 'ENTREGA', label: 'Entrega' },
  { value: 'FATURAMENTO', label: 'Faturamento' },
] as const;

export function paymentBaseEventLabel(value?: string): string {
  return PAYMENT_BASE_EVENTS.find((e) => e.value === value)?.label ?? (value || 'Emissão do documento');
}

export interface InstallmentDTO {
  id?: number;
  installment_number: number;
  due_days: number;
  description?: string;
  document_type?: string;
  movement_type?: string;
  carrier_id?: number;
  /**
   * Quanto do total a parcela leva. Nulo em TODAS as parcelas = divisão em
   * partes iguais (comportamento antigo). Informado em parte delas, o backend
   * recusa: não há como adivinhar quanto vai no resto.
   */
  percentage?: number;
  base_event?: string;
  /** O que falta para a condição fechar 100% — aviso, não erro: a parcela foi gravada. */
  warning?: string;
}

function parseInstallment(raw: unknown): InstallmentDTO {
  const o = unwrapObject(raw);
  const pct = o['percentage'] ?? o['Percentage'];
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    installment_number: parseNum(o, 'installment_number', 'InstallmentNumber'),
    due_days: parseNum(o, 'due_days', 'DueDays'),
    description: parseStr(o, 'description', 'Description') || undefined,
    document_type: parseStr(o, 'document_type', 'DocumentType') || undefined,
    movement_type: parseStr(o, 'movement_type', 'MovementType') || undefined,
    carrier_id: parseNum(o, 'carrier_id', 'CarrierID') || undefined,
    // `percentage` nulo é informação (divisão em partes iguais), não zero.
    percentage: pct === null || pct === undefined ? undefined : Number(pct),
    base_event: parseStr(o, 'base_event', 'BaseEvent') || 'EMISSAO',
    warning: parseStr(o, 'warning', 'Aviso') || undefined,
  };
}

/** O fornecedor guarda o id da condição; os campos de busca trabalham com o código. */
export async function codigoDaCondicao(id: number): Promise<number | undefined> {
  const { data } = await httpClient.get(`${SUPPORT}/payment-conditions`);
  const achada = unwrapArray(data).map((r) => unwrapObject(r)).find((o) => o && parseNum(o, 'id', 'ID') === id);
  return achada ? parseNum(achada, 'code', 'Code') || undefined : undefined;
}

export async function listPaymentConditionInstallments(conditionCode: number): Promise<InstallmentDTO[]> {
  const { data } = await httpClient.get(`${SUPPORT}/payment-conditions/${conditionCode}/installments`);
  return unwrapArray(data).map(parseInstallment);
}

/** Reenviar a mesma parcela ALTERA (upsert por número), não duplica. */
export async function addPaymentConditionInstallment(dto: {
  payment_condition_code: number;
  installment_number: number;
  due_days: number;
  percentage?: number;
  base_event?: string;
  description?: string;
  document_type?: string;
  carrier_code?: number;
}): Promise<InstallmentDTO> {
  const { data } = await httpClient.post(`${SUPPORT}/payment-conditions/installments`, dto);
  return parseInstallment(data);
}

export async function deletePaymentConditionInstallment(conditionCode: number, id: number): Promise<void> {
  await httpClient.delete(`${SUPPORT}/payment-conditions/${conditionCode}/installments/${id}`);
}

export interface PlanoSimuladoParcela {
  numero: number;
  percentual: number;
  valor: number;
  vencimento: string;
  dias_prazo: number;
  evento: string;
  evento_rotulo: string;
  descricao: string;
  estimado: boolean;
}

export interface PlanoSimuladoDTO {
  condicao_code: number;
  condicao_descricao: string;
  total: number;
  parcelas: PlanoSimuladoParcela[];
  aviso?: string;
}

/**
 * Mostra a condição em dinheiro e em datas antes de ela ser usada em qualquer
 * pedido — é a conferência do cadastro. Sem `total`, o backend usa R$ 1.000 de
 * referência.
 */
export async function simulatePaymentCondition(
  conditionCode: number,
  opts?: { total?: number; emissionDate?: string; deliveryDate?: string },
): Promise<PlanoSimuladoDTO> {
  const params: Record<string, string> = {};
  if (opts?.total !== undefined) params.total = String(opts.total);
  if (opts?.emissionDate) params.emission_date = opts.emissionDate;
  if (opts?.deliveryDate) params.delivery_date = opts.deliveryDate;
  const { data } = await httpClient.get(`${SUPPORT}/payment-conditions/${conditionCode}/simulate`, { params });
  const o = unwrapObject(data);
  const parcelas = o['parcelas'] ?? o['Parcelas'];
  return {
    condicao_code: parseNum(o, 'condicao_code', 'CondicaoCode'),
    condicao_descricao: parseStr(o, 'condicao_descricao', 'CondicaoDescricao'),
    total: parseNum(o, 'total', 'Total'),
    parcelas: (Array.isArray(parcelas) ? parcelas : []).map((raw) => {
      const p = unwrapObject(raw);
      return {
        numero: parseNum(p, 'numero', 'Numero'),
        percentual: parseNum(p, 'percentual', 'Percentual'),
        valor: parseNum(p, 'valor', 'Valor'),
        vencimento: parseStr(p, 'vencimento', 'Vencimento'),
        dias_prazo: parseNum(p, 'dias_prazo', 'DiasPrazo'),
        evento: parseStr(p, 'evento', 'Evento'),
        evento_rotulo: parseStr(p, 'evento_rotulo', 'EventoRotulo'),
        descricao: parseStr(p, 'descricao', 'Descricao'),
        estimado: parseBool(p, 'estimado', 'Estimado'),
      };
    }),
    aviso: parseStr(o, 'aviso', 'Aviso') || undefined,
  };
}

/** Condições de pagamento da empresa (código e descrição) — sem cache: a VFIN0110 cria e já escolhe. */
export async function listPaymentConditionOptions(): Promise<{ code: number; description: string; is_active: boolean }[]> {
  const { data } = await httpClient.get(`${SUPPORT}/payment-conditions`);
  return unwrapArray(data).map((r) => unwrapObject(r)).map((o) => ({ code: parseNum(o, 'code', 'Code'), description: parseStr(o, 'description', 'Description'), is_active: o['is_active'] !== false }))
    .filter((c) => c.code > 0).sort((a, b) => a.description.localeCompare(b.description, 'pt-BR'));
}
