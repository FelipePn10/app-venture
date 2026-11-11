import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/employee';

export type EmployeeSituation = 'ACTIVE' | 'INACTIVE';

export interface EmployeeDTO {
  /** Chave interna — é ela que o apontamento devolve em `employee_id`. */
  id?: number;
  code: number;
  name: string;
  role?: string;
  situation?: EmployeeSituation;
  participates_budget?: boolean;
  technical_assistant?: boolean;
}

function parseEmployee(raw: unknown): EmployeeDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    code: parseNum(o, 'code', 'Code'),
    name: parseStr(o, 'name', 'Name'),
    role: parseStr(o, 'role', 'Role'),
    situation: (parseStr(o, 'situation', 'Situation') || 'ACTIVE') as EmployeeSituation,
    participates_budget: parseBool(o, 'participates_budget', 'ParticipatesBudget'),
    technical_assistant: parseBool(o, 'technical_assistant', 'TechnicalAssistant'),
  };
}

export async function listEmployees(): Promise<EmployeeDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list`);
  return unwrapArray(data).map(parseEmployee);
}

/**
 * Funcionários de uma função. Usado onde a escolha só faz sentido dentro de um
 * papel — responsável pela manutenção do recurso é mecânico, comprador do
 * pedido é comprador.
 */
export async function listEmployeesByRole(role: string): Promise<EmployeeDTO[]> {
  const { data } = await httpClient.get(`${BASE}/by-role/${encodeURIComponent(role)}`);
  return unwrapArray(data).map(parseEmployee);
}
export async function getEmployee(code: number): Promise<EmployeeDTO> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parseEmployee(data);
}
export async function createEmployee(dto: EmployeeDTO): Promise<EmployeeDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseEmployee(data);
}
export async function updateEmployee(dto: EmployeeDTO): Promise<EmployeeDTO> {
  const { data } = await httpClient.put(`${BASE}/update`, dto);
  return parseEmployee(data);
}
export async function deactivateEmployee(code: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}/deactivate`);
}

// ── Contatos e funções do funcionário (era a rotina genérica VAPS0400) ──
export interface EmployeeContact { contact_type: 'PHONE' | 'EMAIL'; value: string; is_primary: boolean }
export interface EmployeeFunction { function_name: string; cost_center_id?: number; is_supervisor: boolean; is_manager: boolean }
export interface EmployeeProfile { contacts: EmployeeContact[]; functions: EmployeeFunction[]; credit_limit: string }
/** Sem perfil gravado o backend responde 404: vale o perfil vazio. */
export async function getEmployeeProfile(employeeId: number): Promise<EmployeeProfile> {
  try {
    const { data } = await httpClient.get(`/api/aps/employees/${employeeId}/sequencing-profile`);
    const o = (data ?? {}) as Record<string, unknown>;
    const arr = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
    return {
      contacts: arr(o.contacts).map((c) => ({ contact_type: c.contact_type === 'EMAIL' ? 'EMAIL' : 'PHONE', value: String(c.value ?? ''), is_primary: c.is_primary === true })),
      functions: arr(o.functions).map((f) => ({ function_name: String(f.function_name ?? ''), cost_center_id: Number(f.cost_center_id) || undefined, is_supervisor: f.is_supervisor === true, is_manager: f.is_manager === true })),
      credit_limit: String(o.credit_limit ?? '0'),
    };
  } catch (e) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) return { contacts: [], functions: [], credit_limit: '0' };
    throw e;
  }
}
export async function saveEmployeeProfile(employeeId: number, p: EmployeeProfile): Promise<void> {
  await httpClient.put(`/api/aps/employees/${employeeId}/sequencing-profile`, {
    contacts: p.contacts.map((c) => ({ ...c, value: c.value.trim() })),
    functions: p.functions.map((f) => ({ ...f, function_name: f.function_name.trim(), cost_center_id: f.cost_center_id ?? null })),
    credit_limit: p.credit_limit || '0',
  });
}
