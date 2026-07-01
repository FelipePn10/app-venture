import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/**
 * Overhead e Base de Alocação (Custos §3).
 *  - Base de alocação (`/api/allocations`): critério de rateio.
 *  - Alocação de overhead (`/api/overhead-allocation`): distribui indiretos entre
 *    centros de custo (`targets[]`). Campo obrigatório: `cost_center_code` (na capa e
 *    em cada target); ausência → 422. Código duplicado em `allocations` → 409.
 */
export interface AllocationBase {
  code: number;
  description: string;
  period?: string;
}

export interface OverheadAllocation {
  id?: number;
  cost_center_code: number;
  period_start: string;
  period_end: string;
  allocation_type?: string;
  description?: string;
  targets?: { cost_center_code: number; percentage: number }[];
}

function parseBase(raw: unknown): AllocationBase {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    period: parseStr(o, 'period', 'Period') || undefined,
  };
}
function parseOverhead(raw: unknown): OverheadAllocation {
  const o = unwrapObject(raw);
  const targets = unwrapArray(o['targets'] ?? o['Targets']).map((t) => {
    const to = unwrapObject(t);
    return { cost_center_code: parseNum(to, 'cost_center_code', 'CostCenterCode'), percentage: parseNum(to, 'percentage', 'Percentage') };
  });
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    cost_center_code: parseNum(o, 'cost_center_code', 'CostCenterCode'),
    period_start: parseStr(o, 'period_start', 'PeriodStart') || '',
    period_end: parseStr(o, 'period_end', 'PeriodEnd') || '',
    allocation_type: parseStr(o, 'allocation_type', 'AllocationType') || undefined,
    description: parseStr(o, 'description', 'Description') || undefined,
    targets,
  };
}

// ── Base de alocação ──
export async function listAllocations(): Promise<AllocationBase[]> {
  const { data } = await httpClient.get('/api/allocations/list');
  return unwrapArray(data).map(parseBase);
}
export async function createAllocation(dto: AllocationBase): Promise<AllocationBase> {
  const { data } = await httpClient.post('/api/allocations/create', dto);
  return parseBase(data);
}

// ── Alocação de overhead ──
export async function listOverheadAllocations(): Promise<OverheadAllocation[]> {
  const { data } = await httpClient.get('/api/overhead-allocation/list');
  return unwrapArray(data).map(parseOverhead);
}
export async function createOverheadAllocation(dto: OverheadAllocation): Promise<OverheadAllocation> {
  const { data } = await httpClient.post('/api/overhead-allocation/create', dto);
  return parseOverhead(data);
}
