import { httpClient, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/delivery-promise';

/**
 * Promessa de Entrega — `/api/delivery-promise` (Vendas §8).
 *
 * Ocupação diária de tanque/setor, reserva comercial de capacidade (simula ou
 * grava), expiração de reservas vencidas e reprogramação em lote de datas de
 * entrega (respeitando linhas/pedidos com data firme). Os parâmetros e o
 * calendário por item ficam em serviços próprios (VPME0102 / VPME0102ITE).
 */
export interface TankReservationLine {
  item_code: number;
  mask?: string;
  quantity: number;
  unit_price?: number;
}
export interface TankReservationRequest {
  requested_delivery_date: string;
  firm_days?: number;
  daily_capacity?: number;
  verify_stock?: boolean;
  commit: boolean;
  lines: TankReservationLine[];
}
export interface RescheduleRequest {
  from?: string;
  to?: string;
  customer_code?: number;
  representative_code?: number;
  order_codes?: number[];
  item_codes?: number[];
  new_date: string;
}

export async function getOccupation(filters: { from_date: string; to_date: string; daily_capacity?: number }): Promise<Obj[]> {
  const params: Record<string, string> = { from_date: filters.from_date, to_date: filters.to_date };
  if (filters.daily_capacity) params.daily_capacity = String(filters.daily_capacity);
  const { data } = await httpClient.get(`${BASE}/occupation`, { params });
  return unwrapArray(data).map(unwrapObject);
}

export async function reserveTank(payload: TankReservationRequest): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/tank-reservations`, payload);
  return unwrapObject(data);
}
export async function cancelTankReservation(code: number): Promise<void> {
  await httpClient.delete(`${BASE}/tank-reservations/${code}`);
}
export async function expireTankReservations(now?: string): Promise<Obj> {
  const params: Record<string, string> = {};
  if (now) params.now = now;
  const { data } = await httpClient.post(`${BASE}/tank-reservations/expire`, {}, { params });
  return unwrapObject(data);
}

export async function rescheduleBatch(payload: RescheduleRequest): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/reschedule`, payload);
  return unwrapObject(data);
}
