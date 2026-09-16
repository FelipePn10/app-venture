import { httpClient } from '@/services/httpClient';

export interface ItemMachineTime {
  item_code: string;
  mask?: string | null;
  machine_code: number;
  production_time: number;
  production_time_unit: string;
  production_base_qty: number;
  setup_time: number;
  priority: number;
  efficiency_rate?: number | null;
  time_basis?: "CYCLE" | "PROPORTIONAL";
  /** Consumível gasto e a taxa por hora de usinagem. Andam sempre juntos. */
  consumable_id?: number | null;
  consumption_per_hour?: number | null;
}

export interface CreateItemMachineTimeDTO {
  item_code: string;
  mask?: string | null;
  machine_code: number;
  production_time: number;
  production_time_unit: string;
  production_base_qty: number;
  setup_time: number;
  priority: number;
  efficiency_rate?: number | null;
  time_basis?: "CYCLE" | "PROPORTIONAL";
  /** Consumível gasto e a taxa por hora de usinagem. Andam sempre juntos. */
  consumable_id?: number | null;
  consumption_per_hour?: number | null;
}

export interface CalculateProductionDTO {
  item_code: string;
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
  efficiency_rate: number;
  efficiency_source: string;
  time_basis: string;
  consumable_description: string;
  consumable_unit: string;
  consumable_used: number;
  consumable_refills: number;
  consumable_minutes: number;
}

type Obj = Record<string, unknown>;

function parseTime(raw: unknown): ItemMachineTime | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Obj;
  const item_code    = String(o.item_code    ?? o.ItemCode    ?? '');
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
    efficiency_rate: o.efficiency_rate == null ? null : Number(o.efficiency_rate),
    time_basis: o.time_basis === "PROPORTIONAL" ? "PROPORTIONAL" : "CYCLE",
    consumable_id: o.consumable_id == null ? null : Number(o.consumable_id),
    consumption_per_hour: o.consumption_per_hour == null ? null : Number(o.consumption_per_hour),
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

/** Lista os tempos de um item — o filtro `?item_code=` é obrigatório (query-string). */
export async function listItemMachineTimes(itemCode: string): Promise<ItemMachineTime[]> {
  const res = await httpClient.get<unknown>('/api/machine/time/list', { params: { item_code: itemCode } });
  return unwrap(res.data).map(parseTime).filter(Boolean) as ItemMachineTime[];
}

export async function createItemMachineTime(dto: CreateItemMachineTimeDTO): Promise<void> {
  await httpClient.post('/api/machine/time/create', dto);
}

export async function calculateProductionTime(dto: CalculateProductionDTO): Promise<ProductionCalcResult> {
  const res = await httpClient.post<unknown>('/api/machine/time/production/calculate', dto);
  const o = res.data as Obj;
  return {
    efficiency_rate: Number(o.machine_efficiency_rate ?? 1),
    efficiency_source: String(o.efficiency_source ?? "MACHINE"),
    time_basis: String(o.time_basis ?? "CYCLE"),
    total_minutes:      Number(o.total_minutes      ?? o.TotalMinutes      ?? 0),
    total_hours:        Number(o.total_hours         ?? o.TotalHours        ?? 0),
    total_days:         Number(o.total_days          ?? o.TotalDays         ?? 0),
    production_minutes: Number(o.machining_minutes ?? o.production_minutes  ?? o.ProductionMinutes ?? 0),
    setup_minutes:      Number(o.setup_minutes        ?? o.SetupMinutes      ?? 0),
    cycles:             Number(o.batch_count ?? o.cycles               ?? o.Cycles            ?? 0),
    is_bottleneck:      Boolean(o.machine_is_bottleneck ?? o.is_bottleneck        ?? o.IsBottleneck      ?? false),
    consumable_description: String(o.consumable_description ?? ''),
    consumable_unit:        String(o.consumable_unit ?? ''),
    consumable_used:        Number(o.consumable_used ?? 0),
    consumable_refills:     Number(o.consumable_refills ?? 0),
    consumable_minutes:     Number(o.consumable_minutes ?? 0),
  };
}
