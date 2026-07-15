import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, currentUserId, type Obj } from '@/services/fiscalShared';

const BASE = '/api/maintenance';

/**
 * Manutenção Preventiva (§6) — `/api/maintenance`.
 * Planos por máquina/centro (frequência) geram Ordens; horas descontadas da
 * capacidade no CRP. Status da ordem: `PLANNED` → `IN_PROGRESS` → `DONE` (`CANCELLED`).
 * Escritas de plano exigem `created_by` (uuid). Rotas reais: planos em `/plans`
 * (+`/{id}`, `/by-machine/{id}`); ordens em `/orders` (+`/advance`, `/generate`,
 * `/by-plan/{id}`, `/by-work-center/{id}`).
 */
export type MaintFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM_DAYS';
export const FREQUENCIES: MaintFrequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM_DAYS'];

export type MaintOrderStatus = 'PLANNED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface MaintPlanDTO {
  id?: number;
  machine_id: number;
  work_center_id?: number;
  description?: string;
  frequency: MaintFrequency;
  frequency_days?: number;
  estimated_hours: number;
  next_scheduled_at?: string;
  is_active?: boolean;
}

export interface MaintOrderDTO {
  id: number;
  plan_id?: number;
  machine_id?: number;
  work_center_id?: number;
  scheduled_date: string;
  status: MaintOrderStatus;
  estimated_hours?: number;
  actual_hours?: number;
  notes?: string;
}

function parsePlan(raw: unknown): MaintPlanDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    machine_id: parseNum(o, 'machine_id', 'MachineID'),
    work_center_id: parseNum(o, 'work_center_id', 'WorkCenterID') || undefined,
    description: parseStr(o, 'description', 'Description') || undefined,
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
    work_center_id: parseNum(o, 'work_center_id', 'WorkCenterID') || undefined,
    scheduled_date: parseStr(o, 'scheduled_date', 'ScheduledDate'),
    status: (parseStr(o, 'status', 'Status') || 'PLANNED') as MaintOrderStatus,
    estimated_hours: parseNum(o, 'estimated_hours', 'EstimatedHours') || undefined,
    actual_hours: parseNum(o, 'actual_hours', 'ActualHours') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || undefined,
  };
}

// ─── Planos ───────────────────────────────────────────────────────────────────

export async function listPlans(active: boolean): Promise<MaintPlanDTO[]> {
  const { data } = await httpClient.get(`${BASE}/plans`, { params: active ? { active: true } : undefined });
  return unwrapArray(data).map(parsePlan);
}
export async function getPlan(id: number): Promise<MaintPlanDTO> {
  const { data } = await httpClient.get(`${BASE}/plans/${id}`);
  return parsePlan(data);
}
export async function listPlansByMachine(machineId: number): Promise<MaintPlanDTO[]> {
  const { data } = await httpClient.get(`${BASE}/plans/by-machine/${machineId}`);
  return unwrapArray(data).map(parsePlan);
}
export async function createPlan(dto: MaintPlanDTO): Promise<MaintPlanDTO> {
  const { data } = await httpClient.post(`${BASE}/plans`, {
    ...dto, description: dto.description ?? '', created_by: currentUserId(),
  });
  return parsePlan(data);
}
/** Rota real: DELETE /plans/{id} (desativa o plano). */
export async function deletePlan(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/plans/${id}`);
}

// ─── Ordens ───────────────────────────────────────────────────────────────────

export async function listPlanOrders(planId: number): Promise<MaintOrderDTO[]> {
  const { data } = await httpClient.get(`${BASE}/orders/by-plan/${planId}`);
  return unwrapArray(data).map(parseOrder);
}
export async function listOrdersByWorkCenter(workCenterId: number, from?: string, to?: string): Promise<MaintOrderDTO[]> {
  const params: Obj = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await httpClient.get(`${BASE}/orders/by-work-center/${workCenterId}`, { params });
  return unwrapArray(data).map(parseOrder);
}
export async function createOrder(dto: { plan_id?: number; scheduled_date: string; estimated_hours?: number; work_center_id?: number; machine_id?: number }): Promise<MaintOrderDTO> {
  const body: Obj = { plan_id: dto.plan_id, scheduled_date: dto.scheduled_date };
  if (dto.estimated_hours !== undefined) body.estimated_hours = dto.estimated_hours;
  if (dto.work_center_id !== undefined) body.work_center_id = dto.work_center_id;
  const { data } = await httpClient.post(`${BASE}/orders`, body);
  return parseOrder(data);
}
/** Rota real: POST /orders/advance com `{order_id, status, actual_hours?, notes?}`. */
export async function advanceOrder(id: number, status: MaintOrderStatus, actualHours?: number, notes?: string): Promise<MaintOrderDTO> {
  const body: Obj = { order_id: id, status };
  if (actualHours !== undefined) body.actual_hours = actualHours;
  if (notes) body.notes = notes;
  const { data } = await httpClient.post(`${BASE}/orders/advance`, body);
  return parseOrder(data);
}
export async function generateOrders(horizonDays: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/orders/generate`, { horizon_days: horizonDays });
  return unwrapObject(data);
}
