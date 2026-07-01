import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/**
 * Overhead e Base de Alocação (Custos §3).
 *  - Base de alocação (`/api/allocations`): critério de rateio.
 *  - Alocação de overhead (`/api/overhead-allocation`): distribui indiretos pela base.
 *
 * ⚠️ BUG de backend: `POST /api/overhead-allocation/create` falha sempre com
 * `null value in column "cost_center_id"` (SQLSTATE 23502) — o handler não lê
 * nenhum campo de cost center do corpo (testado cost_center_id/code/...). Create
 * de overhead inoperante até correção no backend.
 */
export interface AllocationBase {
  code: number;
  description: string;
  period?: string;
}

export interface OverheadAllocation {
  code: number;
  cost_center_id?: number;
  allocation_base_code?: number;
  description?: string;
  rate?: number;
  period?: string;
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
  return {
    code: parseNum(o, 'code', 'Code'),
    cost_center_id: parseNum(o, 'cost_center_id', 'CostCenterID') || undefined,
    allocation_base_code: parseNum(o, 'allocation_base_code', 'AllocationBaseCode') || undefined,
    description: parseStr(o, 'description', 'Description') || undefined,
    rate: parseNum(o, 'rate', 'Rate') || undefined,
    period: parseStr(o, 'period', 'Period') || undefined,
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
