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
  item_code: string;
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
  delivery_from?: string;
  delivery_to?: string;
  customer_code?: number;
  representative_code?: number;
  /**
   * Pedidos e itens específicos a reprogramar. O nome aceito pelo backend é
   * `sales_order_codes` — enviado como `order_codes`, o filtro era descartado em
   * silêncio e a reprogramação pegava a faixa inteira de datas. Ambos são
   * numéricos.
   */
  sales_order_codes?: number[];
  item_codes?: number[];
  reason?: string;
  new_date: string;
}

/**
 * Ocupação da capacidade dia a dia. `tankCodes` restringe a consulta a tanques
 * específicos — vai como `tank_code` repetido na URL, que é como o backend lê a
 * lista.
 */
export async function getOccupation(
  filters: { from_date: string; to_date: string; daily_capacity?: number; tank_codes?: number[] },
): Promise<Obj[]> {
  const params = new URLSearchParams();
  params.set('from_date', filters.from_date);
  params.set('to_date', filters.to_date);
  if (filters.daily_capacity) params.set('daily_capacity', String(filters.daily_capacity));
  for (const tanque of filters.tank_codes ?? []) params.append('tank_code', String(tanque));
  const { data } = await httpClient.get(`${BASE}/occupation?${params.toString()}`);
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
