import axios from 'axios';
import { httpClient } from '@/services/httpClient';

export const MACHINE_TYPE_ENUMS = [
  { value: 'CUT',      label: 'Corte' },
  { value: 'BEND',     label: 'Dobrar' },
  { value: 'WELD',     label: 'Soldar' },
  { value: 'ASSEMBLE', label: 'Montar' },
  { value: 'PAINT',    label: 'Pintar' },
  { value: 'LATHE',    label: 'Torno' },
  { value: 'MILL',     label: 'Moinho' },
  { value: 'PRESS',    label: 'Imprensa' },
  { value: 'INJECT',   label: 'Injeção' },
] as const;

export type MachineTypeEnum = typeof MACHINE_TYPE_ENUMS[number]['value'];

export function machineTypeLabel(value: string): string {
  return MACHINE_TYPE_ENUMS.find(e => e.value === value)?.label ?? value;
}

export interface MachineType {
  code: number;
  name: string;
  description?: string | null;
  type: string;
  is_active: boolean;
}

export interface CreateMachineTypeDTO {
  code: number;
  name: string;
  description?: string | null;
  type: string;
  created_by: string;
  is_active: boolean;
}

type Obj = Record<string, unknown>;

function parse(raw: unknown): MachineType | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Obj;
  const code = Number(o.code ?? o.Code);
  const name = String(o.name ?? o.Name ?? '');
  if (!code || !name) return null;
  return {
    code,
    name,
    description: (o.description ?? o.Description ?? null) as string | null,
    type: String(o.type ?? o.Type ?? ''),
    is_active: o.is_active !== false && o.IsActive !== false,
  };
}

function unwrap(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Obj;
    for (const k of ['data', 'items', 'results', 'types']) {
      if (Array.isArray(o[k])) return o[k] as unknown[];
    }
  }
  return [];
}

export async function listMachineTypes(): Promise<MachineType[]> {
  const res = await httpClient.get<unknown>('/api/machine/types/list');
  return unwrap(res.data).map(parse).filter(Boolean) as MachineType[];
}

export async function getMachineTypeByCode(code: number): Promise<MachineType | null> {
  try {
    const res = await httpClient.get<unknown>(`/api/machine/types/${code}`);
    return parse(res.data);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

export async function createMachineType(dto: CreateMachineTypeDTO): Promise<void> {
  await httpClient.post('/api/machine/types/create', dto);
}
