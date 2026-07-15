import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Tolerâncias de Pedido de Compra (`/api/purchase-order-tolerances`). Define faixas de
 * tolerância de `QUANTITY | ITEM_PRICE | PRODUCTS_TOTAL` aplicáveis a
 * `ENTRY_INVOICE | RECEIVING_NOTICE | ALL`, com limite `PERCENT | FIXED` e ação `BLOCK | WARN`.
 */
const BASE = '/api/purchase-order-tolerances';
export const TOLERANCE_TYPES = ['QUANTITY', 'ITEM_PRICE', 'PRODUCTS_TOTAL'] as const;
export const APPLIES_TO = ['ALL', 'ENTRY_INVOICE', 'RECEIVING_NOTICE'] as const;
export const VALUE_TYPES = ['PERCENT', 'FIXED'] as const;
export const ACTIONS = ['WARN', 'BLOCK'] as const;

export interface PurchaseTolerance {
  id?: number;
  tolerance_type: string;
  applies_to: string;
  interval_min: string | number;
  interval_max?: string | number;
  tolerance_value: string | number;
  value_type: string;
  supplier_code?: number;
  action: string;
  is_active?: boolean;
}
function parse(raw: unknown): PurchaseTolerance {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    tolerance_type: parseStr(o, 'tolerance_type', 'ToleranceType'),
    applies_to: parseStr(o, 'applies_to', 'AppliesTo'),
    interval_min: parseStr(o, 'interval_min', 'IntervalMin') || 0,
    interval_max: parseStr(o, 'interval_max', 'IntervalMax') || undefined,
    tolerance_value: parseStr(o, 'tolerance_value', 'ToleranceValue') || 0,
    value_type: parseStr(o, 'value_type', 'ValueType'),
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode') || undefined,
    action: parseStr(o, 'action', 'Action'),
    is_active: o['is_active'] !== false && o['IsActive'] !== false,
  };
}
export async function listTolerances(): Promise<PurchaseTolerance[]> {
  const { data } = await httpClient.get(`${BASE}/`);
  return unwrapArray(data).map(parse);
}
export async function upsertTolerance(dto: PurchaseTolerance): Promise<PurchaseTolerance> {
  const body: Obj = {
    tolerance_type: dto.tolerance_type, applies_to: dto.applies_to,
    interval_min: String(dto.interval_min), interval_max: dto.interval_max != null ? String(dto.interval_max) : null,
    tolerance_value: String(dto.tolerance_value), value_type: dto.value_type,
    supplier_code: dto.supplier_code ?? null, action: dto.action, is_active: dto.is_active ?? true,
  };
  if (dto.id) body.id = dto.id;
  const method = dto.id ? httpClient.put : httpClient.post;
  const { data } = await method(`${BASE}/`, body);
  return parse(data);
}
export async function deleteTolerance(id: number): Promise<void> { await httpClient.delete(`${BASE}/${id}`); }
/** Avalia esperado × real contra a regra aplicável (retorna resultado + eventual bloqueio/aviso). */
export async function evaluateTolerance(toleranceType: string, appliesTo: string, expected: number, actual: number, supplierCode?: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/evaluate`, { tolerance_type: toleranceType, applies_to: appliesTo, expected: String(expected), actual: String(actual), supplier_code: supplierCode ?? null });
  return unwrapObject(data);
}
