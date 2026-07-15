import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, currentUserId, type Obj } from '@/services/fiscalShared';

const BASE = '/api/technical-assistance';

/**
 * Assistência Técnica — `/api/technical-assistance` (Vendas e Expedição §10, migration 000193).
 *
 * Registra chamados de garantia/assistência, controla grupos/motivos de defeito,
 * responsáveis pela garantia, notas de devolução/remessa/serviço e gera pedidos de
 * venda (origem `ASSISTANCE`) ou ordens de produção de assistência.
 *
 * Status do chamado: `PENDING` → `IN_ANALYSIS` → `WAITING_RETURN` / `WAITING_ORDER`
 * → `ATTENDED` → `CLOSED`; `CANCELLED`. O chamado numera por empresa (`call_number`).
 * O item calcula `warranty_until`/`in_warranty` a partir da nota de compra + dias de
 * garantia. Regras de bloqueio no atendimento/fechamento: motivo com
 * `allows_complement` exige `defect_complement`; motivo que exige nota de devolução
 * ou geração de pedido/ordem trava o fechamento até a pendência ser resolvida.
 *
 * Escritas exigem `created_by` (uuid) — preenchido por `currentUserId()`.
 */

// ─── Cadastros auxiliares ──────────────────────────────────────────────────────

export interface DefectGroupDTO {
  code?: number;
  description: string;
}

export interface DefectReasonDTO {
  code?: number;
  group_code: number;
  description: string;
  allows_complement?: boolean;
  generates_revenue?: boolean;
  requires_return_note?: boolean;
  generates_sales_order?: boolean;
  generates_production_order?: boolean;
  is_replacement?: boolean;
  is_service?: boolean;
  available_web?: boolean;
}

export interface WarrantyResponsibleDTO {
  code?: number;
  name: string;
  employee_code?: number | null;
  customer_code?: number | null;
  email?: string | null;
  phone?: string | null;
}

// ─── Chamados ──────────────────────────────────────────────────────────────────

export interface TACallItemDTO {
  code?: number;
  call_code?: number;
  sequence: number;
  item_code: number;
  mask?: string;
  serial_number?: string | null;
  quantity: number;
  defect_reason_code?: number | null;
  defect_complement?: string | null;
  purchase_invoice_number?: string | null;
  purchase_invoice_date?: string;
  warranty_days?: number;
  requested_action?: string;
  notes?: string | null;
  warranty_until?: string;
  in_warranty?: boolean;
}

export interface TACallDTO {
  code?: number;
  call_number?: number;
  enterprise_code: number;
  customer_code: number;
  consumer_name?: string | null;
  consumer_document?: string | null;
  technical_assistant_code?: number | null;
  warranty_responsible_code?: number | null;
  priority?: string;
  opened_at?: string;
  promised_date?: string;
  subject: string;
  description?: string | null;
  return_note_required?: boolean;
  status?: string;
  diagnosis?: string | null;
  solution?: string | null;
  items?: TACallItemDTO[];
}

export interface TAReturnNoteDTO {
  call_code?: number;
  note_number: string;
  note_series?: string | null;
  emission_date: string;
  customer_code?: number | null;
  operation_type: string;
  access_key?: string | null;
  total_value?: number;
  notes?: string | null;
}

export interface TACallStatusDTO {
  status: string;
  diagnosis?: string | null;
  solution?: string | null;
  service_invoice_number?: string | null;
  close_reason?: string | null;
}

export interface TAGenerateOrdersDTO {
  sales_division_code?: number | null;
  price_table_code?: number | null;
  payment_term_code?: number | null;
  warehouse_code?: number | null;
}

function parseGroup(raw: unknown): DefectGroupDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
  };
}

function parseReason(raw: unknown): DefectReasonDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    group_code: parseNum(o, 'group_code', 'GroupCode'),
    description: parseStr(o, 'description', 'Description'),
    allows_complement: parseBool(o, 'allows_complement', 'AllowsComplement'),
    generates_revenue: parseBool(o, 'generates_revenue', 'GeneratesRevenue'),
    requires_return_note: parseBool(o, 'requires_return_note', 'RequiresReturnNote'),
    generates_sales_order: parseBool(o, 'generates_sales_order', 'GeneratesSalesOrder'),
    generates_production_order: parseBool(o, 'generates_production_order', 'GeneratesProductionOrder'),
    is_replacement: parseBool(o, 'is_replacement', 'IsReplacement'),
    is_service: parseBool(o, 'is_service', 'IsService'),
    available_web: parseBool(o, 'available_web', 'AvailableWeb'),
  };
}

function parseResponsible(raw: unknown): WarrantyResponsibleDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    name: parseStr(o, 'name', 'Name'),
    employee_code: parseNum(o, 'employee_code', 'EmployeeCode') || null,
    customer_code: parseNum(o, 'customer_code', 'CustomerCode') || null,
    email: parseStr(o, 'email', 'Email') || null,
    phone: parseStr(o, 'phone', 'Phone') || null,
  };
}

function parseItem(raw: unknown): TACallItemDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    call_code: parseNum(o, 'call_code', 'CallCode'),
    sequence: parseNum(o, 'sequence', 'Sequence'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    serial_number: parseStr(o, 'serial_number', 'SerialNumber') || null,
    quantity: parseNum(o, 'quantity', 'Quantity'),
    defect_reason_code: parseNum(o, 'defect_reason_code', 'DefectReasonCode') || null,
    defect_complement: parseStr(o, 'defect_complement', 'DefectComplement') || null,
    purchase_invoice_number: parseStr(o, 'purchase_invoice_number', 'PurchaseInvoiceNumber') || null,
    purchase_invoice_date: parseStr(o, 'purchase_invoice_date', 'PurchaseInvoiceDate') || undefined,
    warranty_days: parseNum(o, 'warranty_days', 'WarrantyDays'),
    requested_action: parseStr(o, 'requested_action', 'RequestedAction') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || null,
    warranty_until: parseStr(o, 'warranty_until', 'WarrantyUntil') || undefined,
    in_warranty: parseBool(o, 'in_warranty', 'InWarranty'),
  };
}

function parseCall(raw: unknown): TACallDTO {
  const o = unwrapObject(raw);
  const rawItems = o['items'] ?? o['Items'];
  return {
    code: parseNum(o, 'code', 'Code'),
    call_number: parseNum(o, 'call_number', 'CallNumber'),
    enterprise_code: parseNum(o, 'enterprise_code', 'EnterpriseCode'),
    customer_code: parseNum(o, 'customer_code', 'CustomerCode'),
    consumer_name: parseStr(o, 'consumer_name', 'ConsumerName') || null,
    consumer_document: parseStr(o, 'consumer_document', 'ConsumerDocument') || null,
    technical_assistant_code: parseNum(o, 'technical_assistant_code', 'TechnicalAssistantCode') || null,
    warranty_responsible_code: parseNum(o, 'warranty_responsible_code', 'WarrantyResponsibleCode') || null,
    priority: parseStr(o, 'priority', 'Priority') || undefined,
    opened_at: parseStr(o, 'opened_at', 'OpenedAt') || undefined,
    promised_date: parseStr(o, 'promised_date', 'PromisedDate') || undefined,
    subject: parseStr(o, 'subject', 'Subject'),
    description: parseStr(o, 'description', 'Description') || null,
    return_note_required: parseBool(o, 'return_note_required', 'ReturnNoteRequired'),
    status: parseStr(o, 'status', 'Status') || undefined,
    diagnosis: parseStr(o, 'diagnosis', 'Diagnosis') || null,
    solution: parseStr(o, 'solution', 'Solution') || null,
    items: Array.isArray(rawItems) ? rawItems.map(parseItem) : undefined,
  };
}

// ─── Cadastros auxiliares ──────────────────────────────────────────────────────

export async function listDefectGroups(): Promise<DefectGroupDTO[]> {
  const { data } = await httpClient.get(`${BASE}/defect-groups`);
  return unwrapArray(data).map(parseGroup);
}
export async function createDefectGroup(dto: DefectGroupDTO): Promise<DefectGroupDTO> {
  const { data } = await httpClient.post(`${BASE}/defect-groups`, { ...dto, created_by: currentUserId() });
  return parseGroup(data);
}
export async function listDefectReasons(groupCode?: number): Promise<DefectReasonDTO[]> {
  const q = groupCode ? `?group_code=${groupCode}` : '';
  const { data } = await httpClient.get(`${BASE}/defect-reasons${q}`);
  return unwrapArray(data).map(parseReason);
}
export async function createDefectReason(dto: DefectReasonDTO): Promise<DefectReasonDTO> {
  const { data } = await httpClient.post(`${BASE}/defect-reasons`, { ...dto, created_by: currentUserId() });
  return parseReason(data);
}
export async function listWarrantyResponsibles(): Promise<WarrantyResponsibleDTO[]> {
  const { data } = await httpClient.get(`${BASE}/warranty-responsibles`);
  return unwrapArray(data).map(parseResponsible);
}
export async function createWarrantyResponsible(dto: WarrantyResponsibleDTO): Promise<WarrantyResponsibleDTO> {
  const { data } = await httpClient.post(`${BASE}/warranty-responsibles`, { ...dto, created_by: currentUserId() });
  return parseResponsible(data);
}

// ─── Chamados ──────────────────────────────────────────────────────────────────

export async function listCalls(): Promise<TACallDTO[]> {
  const { data } = await httpClient.get(`${BASE}/calls`);
  return unwrapArray(data).map(parseCall);
}
export async function getCall(code: number): Promise<TACallDTO> {
  const { data } = await httpClient.get(`${BASE}/calls/${code}`);
  return parseCall(data);
}
export async function reportCalls(): Promise<Obj[]> {
  const { data } = await httpClient.get(`${BASE}/calls/report`);
  return unwrapArray(data).map(unwrapObject);
}
export async function createCall(dto: TACallDTO): Promise<TACallDTO> {
  const items = (dto.items ?? []).map((it) => ({ ...it, created_by: undefined }));
  const { data } = await httpClient.post(`${BASE}/calls`, { ...dto, items, created_by: currentUserId() });
  return parseCall(data);
}
export async function addCallItem(callCode: number, item: TACallItemDTO): Promise<TACallItemDTO> {
  const { data } = await httpClient.post(`${BASE}/calls/${callCode}/items`, { ...item, call_code: callCode });
  return parseItem(data);
}
export async function addReturnNote(callCode: number, note: TAReturnNoteDTO): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/calls/${callCode}/return-notes`, {
    ...note,
    call_code: callCode,
    created_by: currentUserId(),
  });
  return unwrapObject(data);
}
export async function generateOrders(callCode: number, dto: TAGenerateOrdersDTO): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/calls/${callCode}/generate-orders`, {
    ...dto,
    call_code: callCode,
    created_by: currentUserId(),
  });
  return unwrapObject(data);
}
export async function updateCallStatus(callCode: number, dto: TACallStatusDTO): Promise<Obj> {
  const { data } = await httpClient.patch(`${BASE}/calls/${callCode}/status`, {
    ...dto,
    code: callCode,
    created_by: currentUserId(),
  });
  return unwrapObject(data);
}
