import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/maintenance';

/** Manutenção Preventiva (§6): planos + ordens; horas descontadas da capacidade no CRP. */
export type MaintFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM_DAYS';
export const FREQUENCIES: MaintFrequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM_DAYS'];

export type MaintOrderStatus = 'PLANNED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface MaintPlanDTO {
  id?: number;
  machine_id: number;
  work_center_id?: number;
  frequency: MaintFrequency;
  frequency_days?: number;
  estimated_hours: number;
  next_scheduled_at?: string;
}

export interface MaintOrderDTO {
  id: number;
  plan_id?: number;
  machine_id?: number;
  scheduled_date: string;
  status: MaintOrderStatus;
  actual_hours?: number;
}

function parsePlan(raw: unknown): MaintPlanDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    machine_id: parseNum(o, 'machine_id', 'MachineID'),
    work_center_id: parseNum(o, 'work_center_id', 'WorkCenterID') || undefined,
    frequency: (parseStr(o, 'frequency', 'Frequency') || 'MONTHLY') as MaintFrequency,
    frequency_days: parseNum(o, 'frequency_days', 'FrequencyDays'),
    estimated_hours: parseNum(o, 'estimated_hours', 'EstimatedHours'),
    next_scheduled_at: parseStr(o, 'next_scheduled_at', 'NextScheduledAt') || undefined,
  };
}
function parseOrder(raw: unknown): MaintOrderDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    plan_id: parseNum(o, 'plan_id', 'PlanID') || undefined,
    machine_id: parseNum(o, 'machine_id', 'MachineID') || undefined,
    scheduled_date: parseStr(o, 'scheduled_date', 'ScheduledDate'),
    status: (parseStr(o, 'status', 'Status') || 'PLANNED') as MaintOrderStatus,
    actual_hours: parseNum(o, 'actual_hours', 'ActualHours') || undefined,
  };
}

export async function listPlans(active: boolean): Promise<MaintPlanDTO[]> {
  const { data } = await httpClient.get(`${BASE}/plans`, { params: active ? { active: true } : undefined });
  return unwrapArray(data).map(parsePlan);
}
export async function createPlan(dto: MaintPlanDTO): Promise<MaintPlanDTO> {
  const { data } = await httpClient.post(`${BASE}/plans`, dto);
  return parsePlan(data);
}
export async function deletePlan(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/plans/${id}`);
}
export async function listPlanOrders(planId: number): Promise<MaintOrderDTO[]> {
  const { data } = await httpClient.get(`${BASE}/plans/${planId}/orders`);
  return unwrapArray(data).map(parseOrder);
}
export async function createOrder(dto: { plan_id?: number; machine_id?: number; scheduled_date: string }): Promise<MaintOrderDTO> {
  const { data } = await httpClient.post(`${BASE}/orders`, dto);
  return parseOrder(data);
}
export async function advanceOrder(id: number, status: MaintOrderStatus, actualHours?: number): Promise<MaintOrderDTO> {
  const body: Obj = { status };
  if (actualHours !== undefined) body.actual_hours = actualHours;
  const { data } = await httpClient.put(`${BASE}/orders/${id}/advance`, body);
  return parseOrder(data);
}
export async function generateOrders(horizonDays: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/orders/generate`, { horizon_days: horizonDays });
  return unwrapObject(data);
}
