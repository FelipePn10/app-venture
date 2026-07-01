import { httpClient, parseStr, parseNum, parseBool, currentUserId, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/cutting-plans';

/**
 * Plano de Corte (`cutting_plan`) — nesting de peças na matéria-prima.
 * Tipos: LINEAR_1D (barras/perfis), GUILLOTINE_2D (chapa/painel), TRUE_SHAPE_2D
 * (irregular laser/plasma). Status: RASCUNHO → OTIMIZADO → FIRMADO → EM_EXECUCAO →
 * CONCLUIDO. Firmar (release) baixa estoque, gera retalhos rastreáveis e a trilha de
 * consumo — exige `warehouse_id` no plano (ou no settings da empresa).
 */
export const CUT_TYPES = ['LINEAR_1D', 'GUILLOTINE_2D', 'TRUE_SHAPE_2D'] as const;
export const CONSUMPTION_MODES = ['AUTOMATIC', 'MANUAL'] as const;

export interface CuttingPlanDTO {
  id?: number;
  code?: number;
  description?: string;
  cut_type?: string;
  source?: string;
  status?: string;
  material_item_code: number;
  warehouse_id?: number;
  production_order_code?: number;
  stock_uom?: string;
  uom_factor?: number;
  kerf_mm?: number;
  trim_mm?: number;
  min_remnant_mm?: number;
  include_remnants?: boolean;
  lot_consumption_mode?: string;
  machine_code?: number;
  // métricas do resultado
  utilization_pct?: number;
  scrap_pct?: number;
  stock_used_count?: number;
  cut_count?: number;
  total_demand?: number;
  total_stock?: number;
}

export interface CuttingPartDTO {
  id?: number;
  label?: string;
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;
  grain?: string;
  allow_rotation?: boolean;
  quantity: number;
}

export interface CuttingStockDTO {
  id?: number;
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;
  quantity: number;
  is_remnant?: boolean;
  priority?: number;
  lot?: string;
}

export interface PlacementDTO {
  sequence: number;
  part_id?: number;
  label?: string;
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;
  offset_mm?: number;
  pos_x_mm?: number;
  pos_y_mm?: number;
  rotated?: boolean;
}

export interface PatternDTO {
  sequence: number;
  stock_length_mm?: number;
  stock_width_mm?: number;
  stock_height_mm?: number;
  repeat_count: number;
  used_mm?: number;
  used_area_mm2?: number;
  kerf_loss_mm?: number;
  remnant_mm?: number;
  utilization_pct?: number;
  is_remnant?: boolean;
  reusable_remnant?: boolean;
  placements: PlacementDTO[];
}

export interface CuttingPlanDetail {
  plan: CuttingPlanDTO;
  parts: CuttingPartDTO[];
  stock_pieces: CuttingStockDTO[];
  patterns: PatternDTO[];
  unplaced?: Obj[];
}

export interface CuttingSettings {
  default_consumption_mode?: string;
  default_min_remnant_mm?: number;
  default_warehouse_id?: number;
}

function parsePlan(raw: unknown): CuttingPlanDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description') || undefined,
    cut_type: parseStr(o, 'cut_type', 'CutType') || undefined,
    source: parseStr(o, 'source', 'Source') || undefined,
    status: parseStr(o, 'status', 'Status') || undefined,
    material_item_code: parseNum(o, 'material_item_code', 'MaterialItemCode'),
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID') || undefined,
    stock_uom: parseStr(o, 'stock_uom', 'StockUom') || undefined,
    uom_factor: parseNum(o, 'uom_factor', 'UomFactor'),
    kerf_mm: parseNum(o, 'kerf_mm', 'KerfMm'),
    trim_mm: parseNum(o, 'trim_mm', 'TrimMm'),
    min_remnant_mm: parseNum(o, 'min_remnant_mm', 'MinRemnantMm'),
    utilization_pct: parseNum(o, 'utilization_pct', 'UtilizationPct'),
    scrap_pct: parseNum(o, 'scrap_pct', 'ScrapPct'),
    stock_used_count: parseNum(o, 'stock_used_count', 'StockUsedCount'),
    cut_count: parseNum(o, 'cut_count', 'CutCount'),
    total_demand: parseNum(o, 'total_demand', 'TotalDemand'),
    total_stock: parseNum(o, 'total_stock', 'TotalStock'),
  };
}
function parsePart(raw: unknown): CuttingPartDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    label: parseStr(o, 'label', 'Label') || undefined,
    length_mm: parseNum(o, 'length_mm', 'LengthMm') || undefined,
    width_mm: parseNum(o, 'width_mm', 'WidthMm') || undefined,
    height_mm: parseNum(o, 'height_mm', 'HeightMm') || undefined,
    quantity: parseNum(o, 'quantity', 'Quantity'),
  };
}
function parseStock(raw: unknown): CuttingStockDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    length_mm: parseNum(o, 'length_mm', 'LengthMm') || undefined,
    width_mm: parseNum(o, 'width_mm', 'WidthMm') || undefined,
    height_mm: parseNum(o, 'height_mm', 'HeightMm') || undefined,
    quantity: parseNum(o, 'quantity', 'Quantity'),
    is_remnant: parseBool(o, 'is_remnant', 'IsRemnant'),
    priority: parseNum(o, 'priority', 'Priority') || undefined,
  };
}
function parsePlacement(raw: unknown): PlacementDTO {
  const o = unwrapObject(raw);
  return {
    sequence: parseNum(o, 'sequence', 'Sequence'),
    part_id: parseNum(o, 'part_id', 'PartID') || undefined,
    label: parseStr(o, 'label', 'Label') || undefined,
    length_mm: parseNum(o, 'length_mm', 'LengthMm') || undefined,
    width_mm: parseNum(o, 'width_mm', 'WidthMm') || undefined,
    height_mm: parseNum(o, 'height_mm', 'HeightMm') || undefined,
    offset_mm: parseNum(o, 'offset_mm', 'OffsetMm') || undefined,
    pos_x_mm: parseNum(o, 'pos_x_mm', 'PosXMm') || undefined,
    pos_y_mm: parseNum(o, 'pos_y_mm', 'PosYMm') || undefined,
    rotated: parseBool(o, 'rotated', 'Rotated'),
  };
}
function parsePattern(raw: unknown): PatternDTO {
  const o = unwrapObject(raw);
  return {
    sequence: parseNum(o, 'sequence', 'Sequence'),
    stock_length_mm: parseNum(o, 'stock_length_mm', 'StockLengthMm') || undefined,
    stock_width_mm: parseNum(o, 'stock_width_mm', 'StockWidthMm') || undefined,
    stock_height_mm: parseNum(o, 'stock_height_mm', 'StockHeightMm') || undefined,
    repeat_count: parseNum(o, 'repeat_count', 'RepeatCount'),
    used_mm: parseNum(o, 'used_mm', 'UsedMm') || undefined,
    used_area_mm2: parseNum(o, 'used_area_mm2', 'UsedAreaMm2') || undefined,
    kerf_loss_mm: parseNum(o, 'kerf_loss_mm', 'KerfLossMm') || undefined,
    remnant_mm: parseNum(o, 'remnant_mm', 'RemnantMm') || undefined,
    utilization_pct: parseNum(o, 'utilization_pct', 'UtilizationPct'),
    is_remnant: parseBool(o, 'is_remnant', 'IsRemnant'),
    reusable_remnant: parseBool(o, 'reusable_remnant', 'ReusableRemnant'),
    placements: unwrapArray(o['placements'] ?? o['Placements']).map(parsePlacement),
  };
}
function parseDetail(raw: unknown): CuttingPlanDetail {
  const o = unwrapObject(raw);
  const plan = o['plan'] ?? o['Plan'];
  return {
    plan: parsePlan(plan ?? o),
    parts: unwrapArray(o['parts'] ?? o['Parts']).map(parsePart),
    stock_pieces: unwrapArray(o['stock_pieces'] ?? o['StockPieces']).map(parseStock),
    patterns: unwrapArray(o['patterns'] ?? o['Patterns']).map(parsePattern),
    unplaced: unwrapArray(o['unplaced'] ?? o['Unplaced']).map(unwrapObject),
  };
}

// ── CRUD ──
export async function listCuttingPlans(onlyOpen = false): Promise<CuttingPlanDTO[]> {
  const { data } = await httpClient.get(BASE, { params: onlyOpen ? { only_open: true } : undefined });
  return unwrapArray(data).map(parsePlan);
}
export async function getCuttingPlan(id: number): Promise<CuttingPlanDetail> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return parseDetail(data);
}
export async function createCuttingPlan(dto: CuttingPlanDTO & { parts?: CuttingPartDTO[]; stock_pieces?: CuttingStockDTO[] }): Promise<CuttingPlanDTO> {
  const { data } = await httpClient.post(BASE, { ...dto, created_by: currentUserId() });
  return parsePlan(data);
}
export async function deleteCuttingPlan(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/${id}`);
}
export async function createPlansFromOrders(dto: { production_order_codes?: number[]; planned_order_codes?: number[] }): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/from-orders`, { ...dto, created_by: currentUserId() });
  return unwrapObject(data);
}

// ── Peças e estoque ──
export async function addPart(id: number, part: CuttingPartDTO): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${id}/parts`, part);
  return unwrapObject(data);
}
export async function removePart(id: number, partId: number): Promise<void> {
  await httpClient.delete(`${BASE}/${id}/parts/${partId}`);
}
export async function addStockPiece(id: number, stock: CuttingStockDTO): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${id}/stock`, stock);
  return unwrapObject(data);
}
export async function removeStockPiece(id: number, stockId: number): Promise<void> {
  await httpClient.delete(`${BASE}/${id}/stock/${stockId}`);
}

// ── Otimizar / firmar ──
export async function optimizeCuttingPlan(id: number): Promise<CuttingPlanDetail> {
  const { data } = await httpClient.post(`${BASE}/${id}/optimize`, {});
  return parseDetail(data);
}
export async function releaseCuttingPlan(id: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${id}/release`, {});
  return unwrapObject(data);
}

// ── Programa / agenda / rateio ──
export async function getCuttingProgram(id: number): Promise<Obj> {
  const { data } = await httpClient.get(`${BASE}/${id}/program`);
  return unwrapObject(data);
}
export async function scheduleCuttingPlan(id: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${id}/schedule`, {});
  return unwrapObject(data);
}
export async function getOrderCosts(id: number): Promise<Obj[]> {
  const { data } = await httpClient.get(`${BASE}/${id}/order-costs`);
  return unwrapArray(data).map(unwrapObject);
}

// ── Export (download binário) ──
export async function exportCuttingMap(id: number, fmt: 'svg' | 'dxf' | 'pdf'): Promise<void> {
  const { data } = await httpClient.get(`${BASE}/${id}/export`, { params: { format: fmt }, responseType: 'blob' });
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement('a');
  a.href = url; a.download = `plano_corte_${id}.${fmt}`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ── Settings + retalhos ──
export async function getCuttingSettings(): Promise<CuttingSettings> {
  const { data } = await httpClient.get('/api/cutting-settings');
  const o = unwrapObject(data);
  return {
    default_consumption_mode: parseStr(o, 'default_consumption_mode', 'DefaultConsumptionMode') || undefined,
    default_min_remnant_mm: parseNum(o, 'default_min_remnant_mm', 'DefaultMinRemnantMm'),
    default_warehouse_id: parseNum(o, 'default_warehouse_id', 'DefaultWarehouseID') || undefined,
  };
}
export async function updateCuttingSettings(dto: CuttingSettings): Promise<CuttingSettings> {
  const { data } = await httpClient.put('/api/cutting-settings', dto);
  return unwrapObject(data) as CuttingSettings;
}
export async function listStockRemnants(itemCode: number, onlyAvailable = true): Promise<Obj[]> {
  const { data } = await httpClient.get('/api/stock-remnants', { params: { item_code: itemCode, only_available: onlyAvailable } });
  return unwrapArray(data).map(unwrapObject);
}
