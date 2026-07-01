import { httpClient, parseStr, parseNum, parseBool, currentUserId, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/production-plan';

/**
 * Plano de Produção (`/api/production-plan`) — o "plano" que o MRP roda
 * (`POST /api/mrp-calculation/run {plan_code}`). Define os modos de planejamento
 * executados (`planning_types`: MRP, MIN_MAX, REORDER_POINT, KANBAN, MPS) e o filtro
 * de demandas independentes. O `code` é obrigatório e positivo na criação.
 */
export const PLANNING_TYPES = ['MRP', 'MIN_MAX', 'REORDER_POINT', 'KANBAN', 'MPS'] as const;
export const INDEPENDENT_DEMAND_FILTERS = ['NO', 'FROM_DATE', 'ALL'] as const;

export interface ProductionPlanDTO {
  id?: number;
  code: number;
  name: string;
  independent_demands?: string;
  group_same_date_orders?: boolean;
  planning_types?: string[];
  is_active?: boolean;
}

function parsePlan(raw: unknown): ProductionPlanDTO {
  const o = unwrapObject(raw);
  const pt = o['planning_types'] ?? o['PlanningTypes'];
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    code: parseNum(o, 'code', 'Code'),
    name: parseStr(o, 'name', 'Name'),
    independent_demands: parseStr(o, 'independent_demands', 'IndependentDemands') || undefined,
    group_same_date_orders: parseBool(o, 'group_same_date_orders', 'GroupSameDateOrders'),
    planning_types: Array.isArray(pt) ? (pt as string[]) : [],
    is_active: o['is_active'] !== false && o['IsActive'] !== false,
  };
}

export async function listProductionPlans(): Promise<ProductionPlanDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list`);
  return unwrapArray(data).map(parsePlan);
}
export async function getProductionPlan(code: number): Promise<ProductionPlanDTO> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parsePlan(data);
}
export async function createProductionPlan(dto: ProductionPlanDTO): Promise<ProductionPlanDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, {
    independent_demands: 'ALL',
    group_same_date_orders: false,
    is_active: true,
    created_by: currentUserId(),
    ...dto,
  });
  return parsePlan(data);
}
export async function updateProductionPlan(dto: ProductionPlanDTO): Promise<ProductionPlanDTO> {
  const { data } = await httpClient.put(`${BASE}/update`, dto);
  return parsePlan(data);
}
export async function deleteProductionPlan(code: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}`);
}
