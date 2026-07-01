import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/employee';

export type EmployeeSituation = 'ACTIVE' | 'INACTIVE';

export interface EmployeeDTO {
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
