import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Serviços de Terceiros (`/api/third-party-services`) — preços de serviço por
 * item×fornecedor×operação, ordens de serviço (OF→requisição→OC), reajuste, cópia/mover,
 * conversões globais e resolução de preço vigente.
 */
const BASE = '/api/third-party-services';

export interface ServicePrice {
  id?: number;
  item_code: number;
  mask?: string;
  supplier_code: number;
  operation_id: number;
  uom?: string;
  reference_date?: string;
  preferred?: boolean;
  unit_price: string | number;
  freight_type?: string;
}
function parsePrice(raw: unknown): ServicePrice {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined, item_code: parseNum(o, 'item_code', 'ItemCode'), mask: parseStr(o, 'mask', 'Mask') || undefined,
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode'), operation_id: parseNum(o, 'operation_id', 'OperationID'),
    uom: parseStr(o, 'uom', 'UOM') || undefined, reference_date: parseStr(o, 'reference_date', 'ReferenceDate') || undefined,
    preferred: parseBool(o, 'preferred', 'Preferred'), unit_price: parseStr(o, 'unit_price', 'UnitPrice') || 0, freight_type: parseStr(o, 'freight_type', 'FreightType') || undefined,
  };
}

// ── Preços ──
export async function listServicePrices(params?: Obj): Promise<ServicePrice[]> { const { data } = await httpClient.get(`${BASE}/prices`, { params }); return unwrapArray(data).map(parsePrice); }
export async function createServicePrice(dto: ServicePrice): Promise<ServicePrice> {
  const { data } = await httpClient.post(`${BASE}/prices`, {
    item_code: dto.item_code, mask: dto.mask ?? '', supplier_code: dto.supplier_code, operation_id: dto.operation_id,
    uom: dto.uom ?? '', reference_date: dto.reference_date ?? new Date().toISOString(), preferred: !!dto.preferred,
    unit_price: String(dto.unit_price), freight_type: dto.freight_type ?? 'CIF',
  });
  return parsePrice(data);
}
export async function deleteServicePrice(id: number): Promise<void> { await httpClient.delete(`${BASE}/prices/${id}`); }
/** Resolve o preço vigente para item/fornecedor/operação numa data. */
export async function resolveServicePrice(params: Obj): Promise<Obj> { const { data } = await httpClient.get(`${BASE}/prices/resolve`, { params }); return unwrapObject(data); }
export async function readjustServicePrices(ids: number[], percent: string, reason = ''): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/prices/readjust`, { ids, percent, reference_date: new Date().toISOString(), reason });
  return unwrapObject(data);
}

// ── Ordens de serviço ──
export async function listServiceOrders(params?: Obj): Promise<Obj[]> { const { data } = await httpClient.get(`${BASE}/orders`, { params }); return unwrapArray(data).map((r) => unwrapObject(r)); }
export async function getServiceOrder(id: number): Promise<Obj> { const { data } = await httpClient.get(`${BASE}/orders/${id}`); return unwrapObject(data); }
export async function getServiceOrderMovements(id: number): Promise<Obj[]> { const { data } = await httpClient.get(`${BASE}/orders/${id}/movements`); return unwrapArray(data).map((r) => unwrapObject(r)); }
export async function addServiceOrderMovement(id: number, body: Obj): Promise<Obj> { const { data } = await httpClient.post(`${BASE}/orders/${id}/movements`, body); return unwrapObject(data); }
export async function updateServiceOrderStatus(id: number, status: string): Promise<Obj> { const { data } = await httpClient.patch(`${BASE}/orders/${id}/status`, { status }); return unwrapObject(data); }
/** Gera ordens de serviço de terceiros a partir de uma OF (operações externas). */
export async function generateOrdersFromProduction(productionOrderId: number, body: Obj = {}): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/production-orders/${productionOrderId}/orders`, body);
  return unwrapObject(data);
}
