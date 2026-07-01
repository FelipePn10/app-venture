import { httpClient } from '@/services/httpClient';

export interface ItemMachineTime {
  item_code: number;
  mask?: string | null;
  machine_code: number;
  production_time: number;
  production_time_unit: string;
  production_base_qty: number;
  setup_time: number;
  priority: number;
}

export interface CreateItemMachineTimeDTO {
  item_code: number;
  mask?: string | null;
  machine_code: number;
  production_time: number;
  production_time_unit: string;
  production_base_qty: number;
  setup_time: number;
  priority: number;
}

export interface CalculateProductionDTO {
  item_code: number;
  mask?: string | null;
  machine_code: number;
  /** Backend exige `demand_qty` (não `quantity`); `quantity` é rejeitado. */
  demand_qty: number;
}

export interface ProductionCalcResult {
  total_minutes: number;
  total_hours: number;
  total_days: number;
  production_minutes: number;
  setup_minutes: number;
  cycles: number;
  is_bottleneck: boolean;
}

type Obj = Record<string, unknown>;

function parseTime(raw: unknown): ItemMachineTime | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Obj;
  const item_code    = Number(o.item_code    ?? o.ItemCode    ?? 0);
  const machine_code = Number(o.machine_code ?? o.MachineCode ?? 0);
  if (!item_code || !machine_code) return null;
  return {
    item_code,
    mask: (o.mask ?? o.Mask ?? null) as string | null,
    machine_code,
    production_time:      Number(o.production_time      ?? o.ProductionTime     ?? 0),
    production_time_unit: String(o.production_time_unit ?? o.ProductionTimeUnit ?? 'MINUTE'),
    production_base_qty:  Number(o.production_base_qty  ?? o.ProductionBaseQty  ?? 1),
    setup_time: Number(o.setup_time ?? o.SetupTime ?? 0),
    priority:   Number(o.priority   ?? o.Priority   ?? 1),
  };
}

function unwrap(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Obj;
    for (const k of ['data', 'items', 'results', 'times']) {
      if (Array.isArray(o[k])) return o[k] as unknown[];
    }
  }
  return [];
}

export async function listItemMachineTimes(): Promise<ItemMachineTime[]> {
  const res = await httpClient.get<unknown>('/api/machine/time/list');
  return unwrap(res.data).map(parseTime).filter(Boolean) as ItemMachineTime[];
}

export async function createItemMachineTime(dto: CreateItemMachineTimeDTO): Promise<void> {
  await httpClient.post('/api/machine/time/create', dto);
}

export async function calculateProductionTime(dto: CalculateProductionDTO): Promise<ProductionCalcResult> {
  const res = await httpClient.post<unknown>('/api/machine/time/production/calculate', dto);
  const o = res.data as Obj;
  return {
    total_minutes:      Number(o.total_minutes      ?? o.TotalMinutes      ?? 0),
    total_hours:        Number(o.total_hours         ?? o.TotalHours        ?? 0),
    total_days:         Number(o.total_days          ?? o.TotalDays         ?? 0),
    production_minutes: Number(o.production_minutes  ?? o.ProductionMinutes ?? 0),
    setup_minutes:      Number(o.setup_minutes        ?? o.SetupMinutes      ?? 0),
    cycles:             Number(o.cycles               ?? o.Cycles            ?? 0),
    is_bottleneck:      Boolean(o.is_bottleneck        ?? o.IsBottleneck      ?? false),
  };
}
