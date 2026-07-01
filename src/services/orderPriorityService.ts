import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/order-priority';

export interface OrderPriorityDTO {
  code?: number;
  priority: string;
  description: string;
  interval_start: number;
  interval_end: number;
}

function parsePriority(raw: unknown): OrderPriorityDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    priority: parseStr(o, 'priority', 'Priority'),
    description: parseStr(o, 'description', 'Description'),
    interval_start: parseNum(o, 'interval_start', 'IntervalStart'),
    interval_end: parseNum(o, 'interval_end', 'IntervalEnd'),
  };
}

export async function listOrderPriorities(): Promise<OrderPriorityDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list`);
  return unwrapArray(data).map(parsePriority);
}
export async function createOrderPriority(dto: OrderPriorityDTO): Promise<OrderPriorityDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parsePriority(data);
}
export async function findOrderPriority(value: number): Promise<OrderPriorityDTO | null> {
  const { data } = await httpClient.get(`${BASE}/find/${value}`);
  const o = unwrapObject(data);
  return Object.keys(o).length ? parsePriority(o) : null;
}
