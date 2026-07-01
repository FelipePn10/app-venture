import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/purchase-requisitions';

/**
 * Solicitação de Compra (§15) + geração de pedidos agrupando por fornecedor.
 * Saldo do item = quantity − attended_qty − cancelled_qty; status OPEN→PARTIAL→ATTENDED.
 */
export interface RequisitionItemDTO {
  id?: number;
  item_code: number;
  quantity: number;
  uom: string;
  suggested_price?: number;
  attended_qty?: number;
  cancelled_qty?: number;
  status?: string;
  cost_center_code?: number;
  delivery_date?: string;
}

export interface RequisitionDTO {
  code?: number;
  enterprise_code: number;
  requester_employee_code?: number;
  emission_date?: string;
  status?: string;
  notes?: string;
  items?: RequisitionItemDTO[];
}

export interface GenerateSelection {
  requisition_item_id: number;
  qty_to_attend: number;
  supplier_code?: number;
}

function parseItem(raw: unknown): RequisitionItemDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    uom: parseStr(o, 'uom', 'Uom') || 'UN',
    suggested_price: parseNum(o, 'suggested_price', 'SuggestedPrice') || undefined,
    attended_qty: parseNum(o, 'attended_qty', 'AttendedQty'),
    cancelled_qty: parseNum(o, 'cancelled_qty', 'CancelledQty'),
    status: parseStr(o, 'status', 'Status') || undefined,
  };
}
function parseReq(raw: unknown): RequisitionDTO {
  const o = unwrapObject(raw);
  const items = o['items'] ?? o['Items'];
  return {
    code: parseNum(o, 'code', 'Code'),
    enterprise_code: parseNum(o, 'enterprise_code', 'EnterpriseCode'),
    requester_employee_code: parseNum(o, 'requester_employee_code', 'RequesterEmployeeCode') || undefined,
    emission_date: parseStr(o, 'emission_date', 'EmissionDate') || undefined,
    status: parseStr(o, 'status', 'Status') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || undefined,
    items: Array.isArray(items) ? items.map(parseItem) : undefined,
  };
}

export async function listRequisitions(onlyOpen = true): Promise<RequisitionDTO[]> {
  const { data } = await httpClient.get(BASE, { params: onlyOpen ? { only_open: true } : undefined });
  return unwrapArray(data).map(parseReq);
}
export async function getRequisition(code: number): Promise<RequisitionDTO> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parseReq(data);
}
export async function createRequisition(dto: RequisitionDTO): Promise<RequisitionDTO> {
  const { data } = await httpClient.post(BASE, dto);
  return parseReq(data);
}
export async function addRequisitionItem(code: number, item: RequisitionItemDTO): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/items`, item);
  return unwrapObject(data);
}
export async function generateOrders(selections: GenerateSelection[]): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/generate-orders`, { selections });
  return unwrapObject(data);
}
