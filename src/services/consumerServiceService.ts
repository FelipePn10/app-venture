import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, currentUserId, type Obj } from '@/services/fiscalShared';

const BASE = '/api/consumer-service';

/**
 * Atendimento ao Consumidor / SAC — `/api/consumer-service` (Vendas §11).
 *
 * Centraliza consumidores finais, contatos com clientes (histórico imutável) e
 * chamados de SAC. `call_types.is_complaint=true` habilita reclamação (exige
 * sintomas e permite loja/estabelecimento/técnico/loja encaminhada). Pessoa
 * física (`F`) não aceita CNPJ; jurídica (`J`) não aceita CPF.
 *
 * Muitas escritas exigem `created_by` (uuid) — injetado via currentUserId().
 */

// ─── Apoio ────────────────────────────────────────────────────────────────────
export interface CallTypeDTO { code?: number; description: string; is_complaint?: boolean; }
export interface KnowledgeSourceDTO { code?: number; description: string; }

// ─── Consumidor ───────────────────────────────────────────────────────────────
export interface ConsumerDTO {
  code?: number;
  name: string;
  person_type: 'F' | 'J';
  cpf?: string;
  rg?: string;
  cnpj?: string;
  state_registration?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  address?: string;
  address_number?: string;
  complement?: string;
  district?: string;
  market_segment_code?: number;
  knowledge_code?: number;
  notes?: string;
  is_active?: boolean;
}

// ─── Chamado ──────────────────────────────────────────────────────────────────
export interface ConsumerCallDTO {
  code?: number;
  enterprise_code: number;
  consumer_code: number;
  customer_code?: number;
  call_type_code: number;
  direction: 'RECEIVED' | 'MADE' | 'WARRANTY';
  in_warranty?: boolean;
  defect_group_code?: number;
  defect_reason_code?: number;
  responsible_user_code?: number;
  position: 'PENDING' | 'SCHEDULED' | 'RESOLVED';
  situation: 'OTHER' | 'ORDER' | 'DISCONTINUED_ORDER' | 'TECHNICAL_VISIT';
  opened_at?: string;
  return_date?: string;
  visit_requested_date?: string;
  visit_returned_date?: string;
  symptoms?: string;
  subject: string;
  description?: string;
  solution?: string;
}

function parseCallType(raw: unknown): CallTypeDTO {
  const o = unwrapObject(raw);
  return { code: parseNum(o, 'code', 'Code'), description: parseStr(o, 'description', 'Description'), is_complaint: parseBool(o, 'is_complaint', 'IsComplaint') };
}
function parseKnowledge(raw: unknown): KnowledgeSourceDTO {
  const o = unwrapObject(raw);
  return { code: parseNum(o, 'code', 'Code'), description: parseStr(o, 'description', 'Description') };
}
function parseConsumer(raw: unknown): ConsumerDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    name: parseStr(o, 'name', 'Name'),
    person_type: (parseStr(o, 'person_type', 'PersonType') || 'F') as ConsumerDTO['person_type'],
    cpf: parseStr(o, 'cpf', 'CPF'),
    rg: parseStr(o, 'rg', 'RG'),
    cnpj: parseStr(o, 'cnpj', 'CNPJ'),
    state_registration: parseStr(o, 'state_registration', 'StateRegistration'),
    zip_code: parseStr(o, 'zip_code', 'ZipCode'),
    city: parseStr(o, 'city', 'City'),
    state: parseStr(o, 'state', 'State'),
    address: parseStr(o, 'address', 'Address'),
    address_number: parseStr(o, 'address_number', 'AddressNumber'),
    complement: parseStr(o, 'complement', 'Complement'),
    district: parseStr(o, 'district', 'District'),
    market_segment_code: parseNum(o, 'market_segment_code', 'MarketSegmentCode'),
    knowledge_code: parseNum(o, 'knowledge_code', 'KnowledgeCode'),
    notes: parseStr(o, 'notes', 'Notes'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}
function parseCall(raw: unknown): ConsumerCallDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    enterprise_code: parseNum(o, 'enterprise_code', 'EnterpriseCode'),
    consumer_code: parseNum(o, 'consumer_code', 'ConsumerCode'),
    customer_code: parseNum(o, 'customer_code', 'CustomerCode'),
    call_type_code: parseNum(o, 'call_type_code', 'CallTypeCode'),
    direction: (parseStr(o, 'direction', 'Direction') || 'RECEIVED') as ConsumerCallDTO['direction'],
    in_warranty: parseBool(o, 'in_warranty', 'InWarranty'),
    position: (parseStr(o, 'position', 'Position') || 'PENDING') as ConsumerCallDTO['position'],
    situation: (parseStr(o, 'situation', 'Situation') || 'OTHER') as ConsumerCallDTO['situation'],
    opened_at: parseStr(o, 'opened_at', 'OpenedAt') || undefined,
    return_date: parseStr(o, 'return_date', 'ReturnDate') || undefined,
    visit_requested_date: parseStr(o, 'visit_requested_date', 'VisitRequestedDate') || undefined,
    symptoms: parseStr(o, 'symptoms', 'Symptoms'),
    subject: parseStr(o, 'subject', 'Subject'),
    description: parseStr(o, 'description', 'Description'),
    solution: parseStr(o, 'solution', 'Solution'),
  };
}

// ─── Apoio ────────────────────────────────────────────────────────────────────
export async function listCallTypes(): Promise<CallTypeDTO[]> {
  const { data } = await httpClient.get(`${BASE}/call-types`);
  return unwrapArray(data).map(parseCallType);
}
export async function createCallType(dto: CallTypeDTO): Promise<CallTypeDTO> {
  const { data } = await httpClient.post(`${BASE}/call-types`, { ...dto, created_by: currentUserId() });
  return parseCallType(data);
}
export async function listKnowledgeSources(): Promise<KnowledgeSourceDTO[]> {
  const { data } = await httpClient.get(`${BASE}/knowledge-sources`);
  return unwrapArray(data).map(parseKnowledge);
}
export async function createKnowledgeSource(dto: KnowledgeSourceDTO): Promise<KnowledgeSourceDTO> {
  const { data } = await httpClient.post(`${BASE}/knowledge-sources`, { ...dto, created_by: currentUserId() });
  return parseKnowledge(data);
}

// ─── Consumidores ─────────────────────────────────────────────────────────────
export async function listConsumers(filters: { search?: string; state?: string; city?: string } = {}): Promise<ConsumerDTO[]> {
  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.state) params.state = filters.state;
  if (filters.city) params.city = filters.city;
  const { data } = await httpClient.get(`${BASE}/consumers`, { params });
  return unwrapArray(data).map(parseConsumer);
}
export async function getConsumer(code: number): Promise<ConsumerDTO> {
  const { data } = await httpClient.get(`${BASE}/consumers/${code}`);
  return parseConsumer(data);
}
export async function createConsumer(dto: ConsumerDTO): Promise<ConsumerDTO> {
  const { data } = await httpClient.post(`${BASE}/consumers`, { ...dto, created_by: currentUserId(), phones: [], emails: [], contacts: [] });
  return parseConsumer(data);
}
export async function updateConsumer(code: number, dto: ConsumerDTO): Promise<ConsumerDTO> {
  const { data } = await httpClient.put(`${BASE}/consumers/${code}`, dto);
  return parseConsumer(data);
}
export async function addConsumerPhone(code: number, payload: Obj): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/consumers/${code}/phones`, { consumer_code: code, ...payload });
  return unwrapObject(data);
}
export async function addConsumerEmail(code: number, payload: Obj): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/consumers/${code}/emails`, { consumer_code: code, ...payload });
  return unwrapObject(data);
}
export async function addConsumerContact(code: number, payload: Obj): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/consumers/${code}/contacts`, { consumer_code: code, ...payload });
  return unwrapObject(data);
}

// ─── Contatos com cliente (histórico imutável) ────────────────────────────────
export async function createCustomerContact(payload: Obj): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/customer-contacts`, { ...payload, created_by: currentUserId() });
  return unwrapObject(data);
}
export async function listCustomerContacts(filters: { customer_code?: number; from?: string; to?: string } = {}): Promise<Obj[]> {
  const params: Record<string, string> = {};
  if (filters.customer_code) params.customer_code = String(filters.customer_code);
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  const { data } = await httpClient.get(`${BASE}/customer-contacts`, { params });
  return unwrapArray(data).map(unwrapObject);
}

// ─── Chamados ─────────────────────────────────────────────────────────────────
export async function listCalls(filters: { position?: string; situation?: string; visit_state?: string } = {}): Promise<ConsumerCallDTO[]> {
  const params: Record<string, string> = {};
  if (filters.position) params.position = filters.position;
  if (filters.situation) params.situation = filters.situation;
  if (filters.visit_state) params.visit_state = filters.visit_state;
  const { data } = await httpClient.get(`${BASE}/calls`, { params });
  return unwrapArray(data).map(parseCall);
}
export async function getCall(code: number): Promise<ConsumerCallDTO> {
  const { data } = await httpClient.get(`${BASE}/calls/${code}`);
  return parseCall(data);
}
export async function createCall(dto: ConsumerCallDTO): Promise<ConsumerCallDTO> {
  const { data } = await httpClient.post(`${BASE}/calls`, { ...dto, created_by: currentUserId() });
  return parseCall(data);
}
export async function updateCall(code: number, dto: ConsumerCallDTO): Promise<ConsumerCallDTO> {
  const { data } = await httpClient.put(`${BASE}/calls/${code}`, dto);
  return parseCall(data);
}
export async function addCallReturn(code: number, payload: Obj): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/calls/${code}/returns`, { call_code: code, ...payload, created_by: currentUserId() });
  return unwrapObject(data);
}
export async function addCallChecklistItem(code: number, payload: Obj): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/calls/${code}/checklist`, { call_code: code, ...payload });
  return unwrapObject(data);
}
export async function setChecklistItemDone(itemCode: number, done: boolean, notes?: string): Promise<Obj> {
  const { data } = await httpClient.patch(`${BASE}/calls/checklist/${itemCode}`, { done, notes: notes ?? null });
  return unwrapObject(data);
}
export async function getCallsReport(): Promise<Obj> {
  const { data } = await httpClient.get(`${BASE}/calls/report`);
  return unwrapObject(data);
}
