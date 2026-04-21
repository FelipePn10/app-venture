import { httpClient } from '@/services/httpClient';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UnitOfMeasurement =
  | 'MM' | 'CM' | 'M' | 'IN' | 'KG'
  | 'M2' | 'M3' | 'UN' | 'MICROMETRO' | 'TONELADA';

export type Health = 'ATIVO' | 'INATIVO' | 'FANTASMA';

export const UNIT_OPTIONS: UnitOfMeasurement[] = [
  'UN', 'MM', 'CM', 'M', 'IN', 'KG', 'M2', 'M3', 'MICROMETRO', 'TONELADA',
];
export const HEALTH_OPTIONS: Health[] = ['ATIVO', 'INATIVO', 'FANTASMA'];

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface ItemInfo {
  id: number;
  code: number;
  name: string;
  unit: UnitOfMeasurement;
}

export interface StructureComponent {
  id: number;
  parentCode: number;
  childCode: number;
  childDescription: string;
  parentMask: string | null;
  quantity: number;
  effectiveQuantity: number;
  unitOfMeasurement: UnitOfMeasurement;
  health: Health;
  lossPercentage: number;
  position: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Tree extras
  level: number;
  hasChildren: boolean;
}

export interface CreateStructurePayload {
  parent_code: number;
  child_code: number;
  parent_mask?: string | null;
  quantity: number;
  unit_of_measurement: UnitOfMeasurement;
  health: Health;
  loss_percentage: number;
  position: number;
  notes?: string | null;
  is_active: boolean;
}

// ─── Raw shapes from backend ──────────────────────────────────────────────────

interface RawComponent {
  id: number;
  parent_item_code: number;
  child_item_code: number;
  child_description: string;
  parent_mask?: string | null;
  quantity: number;
  effective_quantity: number;
  unit_of_measurement: string;
  health: string;
  loss_percentage: number;
  position: number;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RawTreeNode {
  component: RawComponent;
  level: number;
  children: RawTreeNode[];
}

interface RawResolveResponse {
  root_item_code: number;
  components: RawTreeNode[];
  total_levels: number;
  total_nodes: number;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapItemInfo(raw: unknown): ItemInfo {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Resposta inesperada ao buscar item: ${typeof raw}`);
  }
  const body = raw as Record<string, unknown>;
  const inner = (body['data'] && typeof body['data'] === 'object' ? body['data'] : body) as Record<string, unknown>;
  const code = inner['Code'] ?? inner['code'];
  if (code == null) {
    throw new Error(`Item não encontrado. Resposta: ${JSON.stringify(inner).slice(0, 200)}`);
  }
  const pdm = inner['PDM'] as Record<string, unknown> | undefined;
  const wh  = inner['Warehouse'] as Record<string, unknown> | undefined;
  return {
    id:   Number(inner['ID'] ?? inner['id'] ?? 0),
    code: Number(code),
    name: String(pdm?.['DescriptionTechnique'] ?? inner['name'] ?? ''),
    unit: (String(wh?.['UnitOfMeasurement'] ?? inner['unit'] ?? 'UN')) as UnitOfMeasurement,
  };
}

function mapComponent(r: RawComponent, level: number, hasChildren: boolean): StructureComponent {
  return {
    id:                r.id,
    parentCode:        r.parent_item_code,
    childCode:         r.child_item_code,
    childDescription:  r.child_description,
    parentMask:        r.parent_mask ?? null,
    quantity:          r.quantity,
    effectiveQuantity: r.effective_quantity,
    unitOfMeasurement: r.unit_of_measurement as UnitOfMeasurement,
    health:            r.health as Health,
    lossPercentage:    r.loss_percentage,
    position:          r.position,
    notes:             r.notes ?? null,
    isActive:          r.is_active,
    createdAt:         r.created_at,
    updatedAt:         r.updated_at,
    level,
    hasChildren,
  };
}

/** Flattens tree into a flat list for the current visible level only */
function flattenLevel(nodes: RawTreeNode[]): StructureComponent[] {
  return nodes.map((n) =>
    mapComponent(n.component, n.level, n.children.length > 0)
  );
}

// ─── Service ──────────────────────────────────────────────────────────────────

/** GET /api/items/search/{code} */
export async function findItemByCode(itemCode: number): Promise<ItemInfo> {
  const res = await httpClient.get<unknown>(`/api/items/search/${itemCode}`);
  return mapItemInfo(res.data);
}

/**
 * GET /api/items/structure/resolve/{code}?mask={mask}
 * Returns the full tree. We return only the direct children of the root.
 */
export async function resolveStructure(
  parentCode: number,
  mask?: string | null,
): Promise<{ components: StructureComponent[]; totalLevels: number; totalNodes: number }> {
  const params: Record<string, string> = {};
  if (mask) params['mask'] = mask;

  const res = await httpClient.get<RawResolveResponse>(
    `/api/items/structure/resolve/${parentCode}`,
    { params },
  );

  const data = res.data;
  return {
    components:  flattenLevel(data.components ?? []),
    totalLevels: data.total_levels ?? 0,
    totalNodes:  data.total_nodes ?? 0,
  };
}

/**
 * When drilling down into a child, we resolve that child's subtree
 * and return its direct children.
 */
export async function resolveChildLevel(
  childCode: number,
  mask?: string | null,
): Promise<StructureComponent[]> {
  const params: Record<string, string> = {};
  if (mask) params['mask'] = mask;

  const res = await httpClient.get<RawResolveResponse>(
    `/api/items/structure/resolve/${childCode}`,
    { params },
  );

  return flattenLevel(res.data.components ?? []);
}

/** POST /api/items/structure/create */
export async function createComponent(payload: CreateStructurePayload): Promise<StructureComponent> {
  const res = await httpClient.post<RawComponent>('/api/items/structure/create', payload);
  return mapComponent(res.data, 1, false);
}

/** Validates mask: GET /api/items/search/{code}?mask={mask} — adjust if backend has dedicated route */
export async function validateMask(itemCode: number, mask: string): Promise<boolean> {
  try {
    await httpClient.get(`/api/items/search/${itemCode}`, { params: { mask } });
    return true;
  } catch {
    return false;
  }
}