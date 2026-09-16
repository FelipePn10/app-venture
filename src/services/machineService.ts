import axios from 'axios';
import { httpClient } from '@/services/httpClient';

// Valores reais do enum `machine_capacity_unit_enum` (backend, em PT) — confirmados
// ao vivo. Os antigos (PIECES/KG/DAY...) NÃO existem no enum e quebravam todo create.
export const CAPACITY_UNITS = [
  { value: 'PEÇAS',  label: 'Peças' },
  { value: 'UN',     label: 'Unidades' },
  { value: 'CHAPAS', label: 'Chapas' },
  { value: 'KG',     label: 'Quilogramas (kg)' },
  { value: 'T',      label: 'Toneladas (t)' },
  { value: 'M',      label: 'Metros (m)' },
  { value: 'M2',     label: 'Metros quadrados (m²)' },
  { value: 'M3',     label: 'Metros cúbicos (m³)' },
  { value: 'LITROS', label: 'Litros (L)' },
] as const;

// Valores reais do enum `machine_capacity_period_enum` (backend, em PT).
export const CAPACITY_PERIODS = [
  { value: 'MINUTO', label: 'Por Minuto' },
  { value: 'HORA',   label: 'Por Hora' },
  { value: 'DIA',    label: 'Por Dia' },
] as const;

/**
 * Unidade do tempo de preparação. O banco só aceita MINUTE/HOUR (constraint),
 * mas quem usa a tela lê "minuto"/"hora".
 */
export const PREPARATION_TIME_UNITS = [
  { value: 'MINUTE', label: 'Minutos' },
  { value: 'HOUR', label: 'Horas' },
] as const;

export function preparationUnitLabel(v?: string) {
  return PREPARATION_TIME_UNITS.find((u) => u.value === v)?.label ?? 'Minutos';
}

export type CapacityUnit   = typeof CAPACITY_UNITS[number]['value'];
export type CapacityPeriod = typeof CAPACITY_PERIODS[number]['value'];

export function capacityUnitLabel(v: string)   { return CAPACITY_UNITS.find(u => u.value === v)?.label ?? v; }
export function capacityPeriodLabel(v: string) { return CAPACITY_PERIODS.find(p => p.value === v)?.label ?? v; }

export interface Machine {
  id: number;
  code: number;
  name: string;
  machine_type_code: number;
  cost_center_code?: number | null;
  available_hours_per_day?: number | null;
  capacity: number;
  capacity_per_unit: string;
  capacity_period: string;
  efficiency_rate: number;
  is_active: boolean;
  /**
   * Cadastro completo do recurso (equivalente ao FENG0111 do FoccoERP): a que
   * grupo e calendário a máquina pertence, onde fica no chão de fábrica, se é
   * gargalo, quanto tempo leva para preparar e quem responde pela manutenção.
   */
  resource_group_id?: number | null;
  calendar_id?: number | null;
  location?: string | null;
  is_critical?: boolean;
  usage_description?: string | null;
  acquired_on?: string | null;
  preparation_time?: number;
  preparation_time_unit?: string;
  supplier_code?: number | null;
  brand?: string | null;
  is_preferred?: boolean;
  maintenance_responsible_employee_id?: number | null;
}

export interface CreateMachineDTO {
  inherit_work_center_hours?: boolean;
  code: number;
  name: string;
  machine_type_code: number;
  cost_center_code?: number | null;
  available_hours_per_day?: number | null;
  capacity: number;
  capacity_per_unit: string;
  capacity_period: string;
  efficiency_rate: number;
  is_active: boolean;
  /**
   * Cadastro completo do recurso (equivalente ao FENG0111 do FoccoERP): a que
   * grupo e calendário a máquina pertence, onde fica no chão de fábrica, se é
   * gargalo, quanto tempo leva para preparar e quem responde pela manutenção.
   */
  resource_group_id?: number | null;
  calendar_id?: number | null;
  location?: string | null;
  is_critical?: boolean;
  usage_description?: string | null;
  acquired_on?: string | null;
  preparation_time?: number;
  preparation_time_unit?: string;
  supplier_code?: number | null;
  brand?: string | null;
  is_preferred?: boolean;
  maintenance_responsible_employee_id?: number | null;
  created_by?: string;
}

type Obj = Record<string, unknown>;

function parse(raw: unknown): Machine | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Obj;
  const code = Number(o.code ?? o.Code);
  const name = String(o.name ?? o.Name ?? '');
  if (!code || !name) return null;
  return {
    id: Number(o.id ?? o.ID ?? 0),
    code,
    name,
    machine_type_code: Number(o.machine_type_code ?? o.MachineTypeCode ?? 0),
    cost_center_code: o.cost_center_code != null ? Number(o.cost_center_code) : null,
    available_hours_per_day: o.available_hours_per_day == null ? null : Number(o.available_hours_per_day),
    capacity: Number(o.capacity ?? o.Capacity ?? 0),
    capacity_per_unit: String(o.capacity_per_unit ?? o.CapacityPerUnit ?? o.capacity_unit ?? ''),
    capacity_period: String(o.capacity_period ?? o.CapacityPeriod ?? ''),
    efficiency_rate: Number(o.efficiency_rate ?? o.EfficiencyRate ?? 100),
    is_active: o.is_active !== false && o.IsActive !== false,
    resource_group_id: o.resource_group_id != null ? Number(o.resource_group_id) : null,
    calendar_id: o.calendar_id != null ? Number(o.calendar_id) : null,
    location: (o.location as string) ?? null,
    is_critical: o.is_critical === true,
    usage_description: (o.usage_description as string) ?? null,
    acquired_on: (o.acquired_on as string) ?? null,
    preparation_time: Number(o.preparation_time ?? 0),
    preparation_time_unit: String(o.preparation_time_unit ?? 'MINUTE'),
    supplier_code: o.supplier_code != null ? Number(o.supplier_code) : null,
    brand: (o.brand as string) ?? null,
    is_preferred: o.is_preferred === true,
    maintenance_responsible_employee_id:
      o.maintenance_responsible_employee_id != null ? Number(o.maintenance_responsible_employee_id) : null,
  };
}

function unwrap(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Obj;
    for (const k of ['data', 'items', 'results', 'machines']) {
      if (Array.isArray(o[k])) return o[k] as unknown[];
    }
  }
  return [];
}

export async function listMachines(): Promise<Machine[]> {
  const res = await httpClient.get<unknown>('/api/machine/list');
  return unwrap(res.data).map(parse).filter(Boolean) as Machine[];
}

export async function getMachineByCode(code: number): Promise<Machine | null> {
  try {
    const res = await httpClient.get<unknown>(`/api/machine/${code}`);
    return parse(res.data);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

export async function createMachine(dto: CreateMachineDTO): Promise<void> {
  await httpClient.post('/api/machine/create', dto);
}

/**
 * Altera o cadastro da máquina. A rota `PUT /api/machine/{code}` não existia:
 * o caso de uso estava implementado sem handler, e o SQL comparava o código com
 * o parâmetro do período de capacidade. Máquina só podia ser criada e excluída.
 */
export async function updateMachine(code: number, dto: CreateMachineDTO): Promise<Machine | null> {
  const res = await httpClient.put<unknown>(`/api/machine/${code}`, dto);
  return parse(res.data);
}

/**
 * Máquinas de um tipo. É o que responde "quais recursos atendem quando o
 * roteiro pede uma serra" — sem isso o tipo é só um rótulo no cadastro.
 */
export async function listMachinesByType(typeCode: number): Promise<Machine[]> {
  const res = await httpClient.get<unknown>(`/api/machine/types/${typeCode}/machines`);
  return unwrap(res.data).map(parse).filter(Boolean) as Machine[];
}

/** Um turno do calendário. `end` menor que `start` significa que vira o dia. */
export interface MachineCalendarInterval { weekday: number; start: string; end: string }
export interface MachineCalendar { id: number; code: number; description: string; intervals: MachineCalendarInterval[] }

export const WEEKDAYS = [
  { value: 0, label: 'Domingo' }, { value: 1, label: 'Segunda' }, { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' }, { value: 4, label: 'Quinta' }, { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
] as const;

/** Horas do turno, contando a virada do dia (22:00→06:00 = 8h). */
export function shiftHours(start: string, end: string): number {
  const min = (t: string) => { const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const d = min(end) - min(start);
  return (d > 0 ? d : d + 24 * 60) / 60;
}

function parseCalendar(raw: unknown): MachineCalendar {
  const row = raw as Obj;
  const rawIntervals = Array.isArray(row.intervals) ? row.intervals : [];
  return {
    id: Number(row.id ?? row.ID),
    code: Number(row.code ?? row.Code),
    description: String(row.description ?? row.Description ?? ''),
    intervals: rawIntervals.map((i) => {
      const v = i as Obj;
      return { weekday: Number(v.weekday ?? v.Weekday ?? 0), start: String(v.start ?? v.Start ?? ''), end: String(v.end ?? v.End ?? '') };
    }).filter((i) => i.start !== '' && i.end !== ''),
  };
}

export async function listMachineCalendars(): Promise<MachineCalendar[]> {
  const { data } = await httpClient.get<unknown>('/api/aps/machine-calendars');
  return unwrap(data).map(parseCalendar);
}

export async function upsertMachineCalendar(dto: { code: number; description: string; intervals: MachineCalendarInterval[] }): Promise<MachineCalendar> {
  const { data } = await httpClient.post<unknown>('/api/aps/machine-calendars', dto);
  return parseCalendar(data);
}

export async function deleteMachineCalendar(id: number): Promise<void> {
  await httpClient.delete(`/api/aps/machine-calendars/${id}`);
}

export interface MachineDowntime {
  id: number; machine_id: number; starts_at: string; ends_at: string;
  downtime_type: string; reason: string;
}
/**
 * Domínio fechado, igual ao CHECK da tabela. Um seletor com opção que o banco
 * recusa é pior que não ter seletor: o usuário escolhe e leva erro na cara.
 * Quebra e troca de ferramenta cabem em UNPLANNED; o motivo específico vai na
 * descrição, que é texto livre.
 */
export const DOWNTIME_TYPES = [
  { value: 'UNPLANNED', label: 'Quebra / parada não programada' },
  { value: 'MAINTENANCE', label: 'Manutenção' },
  { value: 'PLANNED', label: 'Parada programada' },
] as const;

export async function listMachineDowntimes(machineId: number, from: string, to: string): Promise<MachineDowntime[]> {
  const { data } = await httpClient.get<unknown>('/api/aps/machine-downtimes', { params: { machine_id: machineId, from, to } });
  return unwrap(data).map((raw) => {
    const row = raw as Obj;
    return {
      id: Number(row.id ?? row.ID),
      machine_id: Number(row.machine_id ?? row.MachineID ?? 0),
      starts_at: String(row.starts_at ?? row.StartsAt ?? ''),
      ends_at: String(row.ends_at ?? row.EndsAt ?? ''),
      downtime_type: String(row.downtime_type ?? row.DowntimeType ?? ''),
      reason: String(row.reason ?? row.Reason ?? ''),
    };
  });
}

export async function createMachineDowntime(dto: { machine_id: number; starts_at: string; ends_at: string; downtime_type: string; reason: string }): Promise<void> {
  await httpClient.post('/api/aps/machine-downtimes', dto, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
}

export async function deleteMachineDowntime(id: number): Promise<void> {
  await httpClient.delete(`/api/aps/machine-downtimes/${id}`, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
}

/**
 * Consumível da máquina — gás de corte, eletrodo, arame, óleo.
 *
 * Guarda a AUTONOMIA (quanto rende uma carga) e o tempo de troca. A taxa de
 * consumo não mora aqui: ela depende do que está sendo produzido e fica na
 * produtividade do item (`consumption_per_hour`).
 */
export interface MachineConsumable {
  id: number;
  machine_code: number;
  code: string;
  description: string;
  unit: string;
  capacity_per_refill: number;
  replacement_minutes: number;
  is_active: boolean;
}

function parseConsumable(raw: unknown): MachineConsumable {
  const o = raw as Obj;
  return {
    id: Number(o.id ?? o.ID ?? 0),
    machine_code: Number(o.machine_code ?? o.MachineCode ?? 0),
    code: String(o.code ?? o.Code ?? ''),
    description: String(o.description ?? o.Description ?? ''),
    unit: String(o.unit ?? o.Unit ?? ''),
    capacity_per_refill: Number(o.capacity_per_refill ?? o.CapacityPerRefill ?? 0),
    replacement_minutes: Number(o.replacement_minutes ?? o.ReplacementMinutes ?? 0),
    is_active: o.is_active !== false,
  };
}

/** Sem `machineCode`, devolve os consumíveis de todas as máquinas da empresa. */
export async function listMachineConsumables(machineCode?: number): Promise<MachineConsumable[]> {
  const { data } = await httpClient.get<unknown>('/api/machine/consumables/', {
    params: machineCode ? { machine_code: machineCode } : undefined,
  });
  return unwrap(data).map(parseConsumable);
}

export async function upsertMachineConsumable(dto: {
  machine_code: number; code: string; description: string; unit: string;
  capacity_per_refill: number; replacement_minutes: number;
}): Promise<MachineConsumable> {
  const { data } = await httpClient.post<unknown>('/api/machine/consumables/', dto);
  return parseConsumable(data);
}

export async function deleteMachineConsumable(id: number): Promise<void> {
  await httpClient.delete(`/api/machine/consumables/${id}`);
}
