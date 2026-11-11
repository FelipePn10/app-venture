import axios from 'axios';
import { httpClient } from '@/services/httpClient';

/**
 * Naturezas do recurso. Os valores são os do enum do backend — `INJECT` não
 * existe lá (é `INJECTION`) e era recusado na gravação. Os rótulos passaram a
 * usar o vocabulário de chão de fábrica: `MILL` é fresadora (não moinho) e
 * `PRESS` é prensa (não imprensa).
 */
export const MACHINE_TYPE_ENUMS = [
  { value: 'CUT',       label: 'Corte' },
  { value: 'BEND',      label: 'Dobra' },
  { value: 'WELD',      label: 'Solda' },
  { value: 'ASSEMBLE',  label: 'Montagem' },
  { value: 'PAINT',     label: 'Pintura' },
  { value: 'LATHE',     label: 'Torno' },
  { value: 'MILL',      label: 'Fresadora' },
  { value: 'PRESS',     label: 'Prensa' },
  { value: 'INJECTION', label: 'Injeção' },
] as const;

export type MachineTypeEnum = typeof MACHINE_TYPE_ENUMS[number]['value'];

export function machineTypeLabel(value: string): string {
  return MACHINE_TYPE_ENUMS.find(e => e.value === value)?.label ?? value;
}

export interface MachineType {
  /**
   * Chave interna do tipo. É ela que o roteiro guarda como **centro de
   * trabalho** (`route_operations.work_center_id`) — não o `code`. Sem ela não
   * dá para dizer que etapa roda em qual máquina.
   */
  id?: number;
  code: number;
  name: string;
  description?: string | null;
  type: string;
  /** A operação exige um operador dedicado? Entra no cálculo de mão de obra. */
  requires_operator?: boolean;
  is_active: boolean;
  /** Custeio e capacidade do centro no sequenciamento (aba Perfil e APS da VMAQ0200). */
  machine_cost_center_id?: number;
  labor_cost_center_id?: number;
  capacity_hours?: string;
}

export interface CreateMachineTypeDTO {
  code: number;
  name: string;
  description?: string | null;
  type: string;
  requires_operator?: boolean;
  created_by?: string;
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
    id: Number(o.id ?? o.ID) || undefined,
    code,
    name,
    description: (o.description ?? o.Description ?? null) as string | null,
    type: String(o.type ?? o.Type ?? ''),
    requires_operator: o.requires_operator === true || o.RequiresOperator === true,
    is_active: o.is_active !== false && o.IsActive !== false,
    machine_cost_center_id: Number(o.machine_cost_center_id) || undefined,
    labor_cost_center_id: Number(o.labor_cost_center_id) || undefined,
    capacity_hours: o.capacity_hours ? String(o.capacity_hours) : undefined,
  };
}

/** Centros de custo de máquina e de mão de obra e capacidade (horas/dia) do centro. Só administrador. */
export async function saveWorkCenterSequencing(id: number, dto: { machine_cost_center_id?: number; labor_cost_center_id?: number; capacity_hours: string }): Promise<void> {
  await httpClient.put(`/api/aps/work-centers/${id}/sequencing`, { machine_cost_center_id: dto.machine_cost_center_id ?? null, labor_cost_center_id: dto.labor_cost_center_id ?? null, capacity_hours: dto.capacity_hours || '0' });
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

/**
 * Altera o tipo de máquina. Assim como a máquina, o caso de uso existia sem
 * rota — e o SQL comparava o código com o parâmetro de `is_active`.
 */
export async function updateMachineType(code: number, dto: CreateMachineTypeDTO): Promise<void> {
  await httpClient.put(`/api/machine/types/${code}`, dto);
}
