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
  /**
   * Abrangência do plano. Ou o plano roda para uma classificação de itens
   * (`classification`, opcionalmente restrita a códigos específicos em
   * `class_item_codes`, separados por vírgula), ou roda para um item de ordem
   * (`order_item_code`) — o backend recusa os dois juntos.
   */
  classification?: string;
  class_item_codes?: string;
  order_item_code?: number;
  /** Parâmetros livres do plano. `from_date` é obrigatório com demandas a partir de uma data. */
  parameters?: Record<string, unknown>;
  is_active?: boolean;
  /** Quando o MRP rodou este plano pela última vez. */
  last_calculated_at?: string;
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
    classification: parseStr(o, 'classification', 'Classification') || undefined,
    class_item_codes: parseStr(o, 'class_item_codes', 'ClassItemCodes') || undefined,
    order_item_code: parseNum(o, 'order_item_code', 'OrderItemCode') || undefined,
    is_active: o['is_active'] !== false && o['IsActive'] !== false,
    last_calculated_at: parseStr(o, 'last_calculated_at', 'LastCalculatedAt') || undefined,
    // A alteração troca o plano inteiro: sem os parâmetros lidos aqui, salvar
    // o plano apagaria a data das demandas independentes e o resto.
    parameters: o['parameters'] && typeof o['parameters'] === 'object' ? (o['parameters'] as Record<string, unknown>) : undefined,
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
/** Altera o plano. O servidor troca o plano INTEIRO: mande o plano lido, com a mudança. */
export async function updateProductionPlan(dto: ProductionPlanDTO): Promise<ProductionPlanDTO> {
  const { data } = await httpClient.put(`${BASE}/update`, {
    code: dto.code, name: dto.name, independent_demands: dto.independent_demands ?? 'ALL',
    group_same_date_orders: !!dto.group_same_date_orders, planning_types: dto.planning_types ?? ['MRP'],
    classification: dto.classification ?? null, class_item_codes: dto.class_item_codes ?? null,
    order_item_code: dto.order_item_code ?? null, parameters: dto.parameters ?? {},
  });
  return parsePlan(data);
}
export async function deleteProductionPlan(code: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}`);
}

/**
 * Empresas inter-fábrica de um plano. Cada associação informa a empresa de origem
 * cujas ordens `INTER_FACTORY` serão carregadas como demanda DIF, e `auto_release`
 * (se as sugestões OIF/OCI derivadas seguem para liberação automática).
 * `PUT` substitui a lista inteira (lista vazia remove todas); empresa inexistente,
 * repetida ou igual à do plano é rejeitada. Isolado pelo tenant do JWT.
 */
export interface InterFactoryDTO {
  source_enterprise_code: number;
  auto_release: boolean;
}
function parseInterFactory(raw: unknown): InterFactoryDTO {
  const o = unwrapObject(raw);
  return {
    source_enterprise_code: parseNum(o, 'source_enterprise_code', 'SourceEnterpriseCode', 'enterprise_code'),
    auto_release: parseBool(o, 'auto_release', 'AutoRelease'),
  };
}
export async function getInterFactories(planCode: number): Promise<InterFactoryDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${planCode}/inter-factories`);
  return unwrapArray(data).map(parseInterFactory);
}
export async function setInterFactories(planCode: number, list: InterFactoryDTO[]): Promise<InterFactoryDTO[]> {
  const { data } = await httpClient.put(`${BASE}/${planCode}/inter-factories`, { enterprises: list });
  return unwrapArray(data).map(parseInterFactory);
}
