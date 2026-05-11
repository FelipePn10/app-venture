import axios from 'axios';
import { httpClient } from '@/services/httpClient';

export const CAPACITY_UNITS = [
  { value: 'PIECES', label: 'Peças' },
  { value: 'KG',     label: 'Quilogramas (kg)' },
  { value: 'TONS',   label: 'Toneladas (t)' },
  { value: 'METERS', label: 'Metros (m)' },
  { value: 'MM',     label: 'Milímetros (mm)' },
  { value: 'M2',     label: 'Metros quadrados (m²)' },
  { value: 'M3',     label: 'Metros cúbicos (m³)' },
  { value: 'LITERS', label: 'Litros (L)' },
] as const;

export const CAPACITY_PERIODS = [
  { value: 'MINUTE', label: 'Por Minuto' },
  { value: 'HOUR',   label: 'Por Hora' },
  { value: 'DAY',    label: 'Por Dia' },
] as const;

export type CapacityUnit   = typeof CAPACITY_UNITS[number]['value'];
export type CapacityPeriod = typeof CAPACITY_PERIODS[number]['value'];

export function capacityUnitLabel(v: string)   { return CAPACITY_UNITS.find(u => u.value === v)?.label ?? v; }
export function capacityPeriodLabel(v: string) { return CAPACITY_PERIODS.find(p => p.value === v)?.label ?? v; }

export interface Machine {
  code: number;
  name: string;
  machine_type_code: number;
  cost_center_code?: number | null;
  capacity: number;
  capacity_per_unit: string;
  capacity_period: string;
  efficiency_rate: number;
  is_active: boolean;
}

export interface CreateMachineDTO {
  code: number;
  name: string;
  machine_type_code: number;
  cost_center_code?: number | null;
  capacity: number;
  capacity_per_unit: string;
  capacity_period: string;
  efficiency_rate: number;
  is_active: boolean;
  created_by: string;
}

type Obj = Record<string, unknown>;

function parse(raw: unknown): Machine | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Obj;
  const code = Number(o.code ?? o.Code);
  const name = String(o.name ?? o.Name ?? '');
  if (!code || !name) return null;
  return {
    code,
    name,
    machine_type_code: Number(o.machine_type_code ?? o.MachineTypeCode ?? 0),
    cost_center_code: o.cost_center_code != null ? Number(o.cost_center_code) : null,
    capacity: Number(o.capacity ?? o.Capacity ?? 0),
    capacity_per_unit: String(o.capacity_per_unit ?? o.CapacityPerUnit ?? o.capacity_unit ?? ''),
    capacity_period: String(o.capacity_period ?? o.CapacityPeriod ?? ''),
    efficiency_rate: Number(o.efficiency_rate ?? o.EfficiencyRate ?? 100),
    is_active: o.is_active !== false && o.IsActive !== false,
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
