import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/delivery-reschedule';

/** Reprogramação de entrega — histórico de remarcações vinculado ao pedido. */
export interface RescheduleDTO {
  code?: number;
  sales_order_code: number;
  item_code: number;
  old_date: string;
  new_date: string;
  reason?: string;
}

function parseReschedule(raw: unknown): RescheduleDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    sales_order_code: parseNum(o, 'sales_order_code', 'SalesOrderCode'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    old_date: parseStr(o, 'old_date', 'OldDate'),
    new_date: parseStr(o, 'new_date', 'NewDate'),
    reason: parseStr(o, 'reason', 'Reason'),
  };
}

/** Converte "YYYY-MM-DD" (input date) para RFC3339, exigido pelo backend. */
function toRfc3339(d: string): string {
  if (!d) return d;
  return /T/.test(d) ? d : `${d}T00:00:00Z`;
}

export async function createReschedule(dto: RescheduleDTO): Promise<RescheduleDTO> {
  const payload = { ...dto, old_date: toRfc3339(dto.old_date), new_date: toRfc3339(dto.new_date) };
  const { data } = await httpClient.post(`${BASE}/create`, payload);
  return parseReschedule(data);
}
export async function listReschedulesByOrder(salesOrderCode: number): Promise<RescheduleDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list/${salesOrderCode}`);
  return unwrapArray(data).map(parseReschedule);
}
