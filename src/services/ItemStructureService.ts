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

/** Como arredondar a quantidade calculada por fórmula. */
export type QuantityRounding = 'NONE' | 'UP' | 'DOWN' | 'NEAREST';
export const ROUNDING_OPTIONS: { value: QuantityRounding; label: string; hint: string }[] = [
  { value: 'NONE', label: 'Sem arredondamento', hint: 'Usa a quantidade exata calculada' },
  { value: 'UP', label: 'Para cima', hint: 'Arredonda sempre para cima — evita faltar material' },
  { value: 'DOWN', label: 'Para baixo', hint: 'Arredonda sempre para baixo' },
  { value: 'NEAREST', label: 'Mais próximo', hint: 'Arredonda para o valor mais próximo' },
];

/** Como a perda de custo é expressa. */
export type CostLossType = 'PERCENTUAL' | 'QUANTIDADE';
export const COST_LOSS_OPTIONS: { value: CostLossType; label: string }[] = [
  { value: 'PERCENTUAL', label: 'Percentual' },
  { value: 'QUANTIDADE', label: 'Quantidade' },
];

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface ItemInfo {
  id: number;
  code: string;
  name: string;
  unit: UnitOfMeasurement;
}

export interface StructureComponent {
  id: number;
  parentCode: string;
  childCode: string;
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
  // Vigência do componente na estrutura. Fora do intervalo o componente não é
  // explodido pelo planejamento, o que permite trocar uma matéria-prima numa
  // data futura sem manter duas estruturas.
  startDate: string | null;
  endDate: string | null;
  /** Quantidade vinda de fórmula; quando presente, substitui a quantidade fixa. */
  quantityFormula: string | null;
  /** Fórmula da perda, quando a perda não é um percentual fixo. */
  lossFormula: string | null;
  quantityRounding: QuantityRounding;
  quantityScale: number;
  /** Saída da ordem (co-produto ou sucata), não insumo. */
  isCoproduct: boolean;
  /** Quantidade por ordem, não por unidade do pai (ex.: setup). */
  isFixedQty: boolean;
  /** >0 agrupa componentes alternativos entre si. */
  substituteGroup: number;
  /** Menor número = preferencial dentro do grupo de alternativos. */
  substitutePriority: number;
  /** Herda o roteiro do filho para o pai (item fantasma). */
  inherit: boolean;
  /** Almoxarifado de onde o componente é baixado; vazio usa o do cadastro do item. */
  warehouseCode: number | null;
  /** Almoxarifado de linha, junto ao operador. */
  lineWarehouseCode: number | null;
  /** Consumida uma vez por ordem (preparação da máquina). */
  setupLoss: number;
  /** A perda de custo é separada da de engenharia e entra só no custo. */
  costLossType: CostLossType;
  costLoss: number;
  costCenterCode: number | null;
  /** Entra na linha crítica analisada pelo plano mestre. */
  isCriticalMps: boolean;
  generatesInspection: boolean;
  // Tree extras
  level: number;
  hasChildren: boolean;
}

export interface CreateStructurePayload {
  parent_code: string;
  child_code: string;
  parent_mask?: string | null;
  quantity: number;
  unit_of_measurement: UnitOfMeasurement;
  health: Health;
  loss_percentage: number;
  position?: number;
  sequence?: number;
  notes?: string | null;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  quantity_formula?: string | null;
  loss_formula?: string | null;
  quantity_rounding?: QuantityRounding;
  quantity_scale?: number;
  is_coproduct?: boolean;
  is_fixed_qty?: boolean;
  substitute_group?: number;
  substitute_priority?: number;
  inherit?: boolean;
  warehouse_code?: number | null;
  line_warehouse_code?: number | null;
  setup_loss?: number;
  cost_loss_type?: CostLossType;
  cost_loss?: number;
  cost_center_code?: number | null;
  is_critical_mps?: boolean;
  generates_inspection?: boolean;
}

// ─── Raw shapes from backend ──────────────────────────────────────────────────

interface RawComponent {
  id: number;
  // A API devolve parent_code/child_code; os nomes *_item_code vieram de um
  // contrato antigo e deixavam o código do filho vazio na grade.
  parent_code?: string;
  child_code?: string;
  parent_item_code?: string;
  child_item_code?: string;
  child_description: string;
  parent_mask?: string | null;
  quantity: number;
  effective_quantity: number;
  unit_of_measurement: string;
  health: string;
  loss_percentage: number;
  // A API chama a posição de "sequence"; "position" é o nome antigo.
  sequence?: number;
  position?: number;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  start_date?: string | null;
  end_date?: string | null;
  quantity_formula?: string | null;
  loss_formula?: string | null;
  quantity_rounding?: string | null;
  quantity_scale?: number | null;
  is_coproduct?: boolean;
  is_fixed_qty?: boolean;
  substitute_group?: number;
  substitute_priority?: number;
  inherit?: boolean;
  warehouse_code?: number | null;
  line_warehouse_code?: number | null;
  setup_loss?: number;
  cost_loss_type?: CostLossType;
  cost_loss?: number;
  cost_center_code?: number | null;
  is_critical_mps?: boolean;
  generates_inspection?: boolean;
}

interface RawTreeNode {
  component: RawComponent;
  level: number;
  children: RawTreeNode[];
}

interface RawResolveResponse {
  root_item_code: string;
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
    code: String(code),
    name: String(pdm?.['DescriptionTechnique'] ?? inner['name'] ?? ''),
    unit: (String(wh?.['UnitOfMeasurement'] ?? inner['unit'] ?? 'UN')) as UnitOfMeasurement,
  };
}

function mapComponent(r: RawComponent, level: number, hasChildren: boolean): StructureComponent {
  return {
    id:                r.id,
    parentCode:        String(r.parent_code ?? r.parent_item_code ?? ''),
    childCode:         String(r.child_code ?? r.child_item_code ?? ''),
    childDescription:  r.child_description,
    parentMask:        r.parent_mask ?? null,
    quantity:          r.quantity,
    effectiveQuantity: r.effective_quantity,
    unitOfMeasurement: r.unit_of_measurement as UnitOfMeasurement,
    health:            r.health as Health,
    lossPercentage:    r.loss_percentage,
    // A API chama a posição de "sequence"; "position" é o nome antigo.
    position:          r.sequence ?? r.position ?? 0,
    notes:             r.notes ?? null,
    isActive:          r.is_active,
    createdAt:         r.created_at,
    updatedAt:         r.updated_at,
    // A data chega como ISO; a tela usa apenas o dia.
    startDate:         r.start_date ? String(r.start_date).slice(0, 10) : null,
    endDate:           r.end_date ? String(r.end_date).slice(0, 10) : null,
    quantityFormula:   r.quantity_formula ?? null,
    lossFormula:       r.loss_formula ?? null,
    quantityRounding:  (r.quantity_rounding ?? 'NONE') as QuantityRounding,
    quantityScale:     r.quantity_scale ?? 4,
    isCoproduct:       r.is_coproduct ?? false,
    isFixedQty:        r.is_fixed_qty ?? false,
    substituteGroup:   r.substitute_group ?? 0,
    substitutePriority: r.substitute_priority ?? 1,
    inherit:           r.inherit ?? false,
    warehouseCode:     r.warehouse_code ?? null,
    lineWarehouseCode: r.line_warehouse_code ?? null,
    setupLoss:         r.setup_loss ?? 0,
    costLossType:      (r.cost_loss_type ?? 'PERCENTUAL') as CostLossType,
    costLoss:          r.cost_loss ?? 0,
    costCenterCode:    r.cost_center_code ?? null,
    isCriticalMps:     r.is_critical_mps ?? false,
    generatesInspection: r.generates_inspection ?? false,
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
export async function findItemByCode(itemCode: string): Promise<ItemInfo> {
  const res = await httpClient.get<unknown>(`/api/items/search/${encodeURIComponent(itemCode)}`);
  return mapItemInfo(res.data);
}

/**
 * GET /api/items/structure/resolve/{code}?mask={mask}
 * Returns the full tree. We return only the direct children of the root.
 */
export async function resolveStructure(
  parentCode: string,
  mask?: string | null,
): Promise<{ components: StructureComponent[]; totalLevels: number; totalNodes: number }> {
  const params: Record<string, string> = {};
  if (mask) params['mask'] = mask;

  const res = await httpClient.get<RawResolveResponse>(
    `/api/items/structure/resolve/${encodeURIComponent(parentCode)}`,
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
  childCode: string,
  mask?: string | null,
): Promise<StructureComponent[]> {
  const params: Record<string, string> = {};
  if (mask) params['mask'] = mask;

  const res = await httpClient.get<RawResolveResponse>(
    `/api/items/structure/resolve/${encodeURIComponent(childCode)}`,
    { params },
  );

  return flattenLevel(res.data.components ?? []);
}

/** POST /api/items/structure/create — o backend lê a posição via campo `sequence`. */
export async function createComponent(payload: CreateStructurePayload): Promise<StructureComponent> {
  const res = await httpClient.post<RawComponent>('/api/items/structure/create', {
    ...payload,
    sequence: payload.position,
  });
  return mapComponent(res.data, 1, false);
}

/** PUT /api/items/structure/update — atualiza quantidade/UM/perda/posição/notas do componente. */
export async function updateComponent(payload: CreateStructurePayload): Promise<StructureComponent> {
  const res = await httpClient.put<RawComponent>('/api/items/structure/update', payload);
  return mapComponent(res.data, 1, false);
}

/** DELETE /api/items/structure/{parentCode}/{childCode} — remove o componente da estrutura. */
export async function deleteComponent(parentCode: string, childCode: string, mask?: string | null): Promise<void> {
  const params: Record<string, string> = {};
  if (mask) params['mask'] = mask;
  await httpClient.delete(
    `/api/items/structure/${encodeURIComponent(parentCode)}/${encodeURIComponent(childCode)}`,
    { params },
  );
}

/** Validates mask: GET /api/items/search/{code}?mask={mask} — adjust if backend has dedicated route */
export async function validateMask(itemCode: string, mask: string): Promise<boolean> {
  try {
    await httpClient.get(`/api/items/search/${encodeURIComponent(itemCode)}`, { params: { mask } });
    return true;
  } catch {
    return false;
  }
}

// ─── Conferências da estrutura ────────────────────────────────────────────────

/** Resultado da simulação da fórmula de quantidade. */
export interface FormulaSimulation {
  valid: boolean;
  error?: string;
  variables: string[];
  missing_variables?: string[];
  raw_result: number;
  rounded_result: number;
  quantity_with_loss: number;
  quantity_per_order: number;
  explanation: string;
}

/**
 * Simula a fórmula antes de gravar — `POST /api/items/structure/simulate-formula`.
 *
 * Uma fórmula errada só apareceria depois, como necessidade errada no MRP,
 * quando o erro já custou compra ou produção.
 */
export async function simulateFormula(input: {
  formula: string;
  quantity_rounding?: QuantityRounding;
  quantity_scale?: number;
  loss_percentage?: number;
  setup_loss?: number;
  variables: Record<string, number>;
}): Promise<FormulaSimulation> {
  const { data } = await httpClient.post<FormulaSimulation>('/api/items/structure/simulate-formula', input);
  return data;
}

/** Uma alteração registrada na estrutura. */
export interface StructureHistoryEntry {
  id: number;
  parent_code: string;
  child_code: string;
  action: 'INCLUSAO' | 'ALTERACAO' | 'EXCLUSAO';
  changed_by_name: string;
  changed_at: string;
  changes: { field: string; before: string; after: string }[];
}

/** Histórico da estrutura — `GET /api/items/structure/{itemCode}/history`. */
export async function listStructureHistory(itemCode: string, limit = 100): Promise<StructureHistoryEntry[]> {
  const { data } = await httpClient.get<StructureHistoryEntry[]>(
    `/api/items/structure/${encodeURIComponent(itemCode)}/history`,
    { params: { limit } },
  );
  return Array.isArray(data) ? data : [];
}
