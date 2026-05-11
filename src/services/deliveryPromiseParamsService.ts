import axios from 'axios';
import { httpClient } from '@/services/httpClient';

const BASE = '/api/delivery-promise-params';

export interface DeliveryPromiseParams {
  use_delivery_promise: boolean;
  blocked_orders_in_promise: boolean;
  default_order_sort: string;
  show_order_values: number;
  blocked_export_in_promise: boolean;
  break_tank_occupation: boolean;
  recalculate_after_release: boolean;
  reprogram_loaded_orders: boolean;
  allow_delivery_date_change: boolean;
}

export interface UpdateDeliveryPromiseParamsDTO extends DeliveryPromiseParams {
  updated_by: string;
}

type Obj = Record<string, unknown>;

function parseBool(obj: Obj, ...keys: string[]): boolean {
  for (const k of keys) {
    if (obj[k] !== undefined) {
      const v = obj[k];
      return v !== false && v !== 0 && v !== 'false' && v !== '';
    }
  }
  return false;
}

function parseStr(obj: Obj, ...keys: string[]): string {
  for (const k of keys) {
    if (obj[k] != null) return String(obj[k]);
  }
  return '';
}

function parseNum(obj: Obj, ...keys: string[]): number {
  for (const k of keys) {
    if (obj[k] !== undefined) {
      const n = Number(obj[k]);
      if (!isNaN(n)) return n;
    }
  }
  return 0;
}

export const DEFAULT_PARAMS: DeliveryPromiseParams = {
  use_delivery_promise: false,
  blocked_orders_in_promise: false,
  default_order_sort: '',
  show_order_values: 0,
  blocked_export_in_promise: false,
  break_tank_occupation: false,
  recalculate_after_release: false,
  reprogram_loaded_orders: false,
  allow_delivery_date_change: false,
};

function parseParams(raw: unknown): DeliveryPromiseParams {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PARAMS };
  const obj = raw as Obj;
  const src: Obj =
    obj['data'] && typeof obj['data'] === 'object' ? (obj['data'] as Obj) : obj;

  return {
    use_delivery_promise:       parseBool(src, 'use_delivery_promise',       'UseDeliveryPromise'),
    blocked_orders_in_promise:  parseBool(src, 'blocked_orders_in_promise',  'BlockedOrdersInPromise'),
    default_order_sort:         parseStr( src, 'default_order_sort',         'DefaultOrderSort'),
    show_order_values:          parseNum( src, 'show_order_values',          'ShowOrderValues'),
    blocked_export_in_promise:  parseBool(src, 'blocked_export_in_promise',  'BlockedExportInPromise'),
    break_tank_occupation:      parseBool(src, 'break_tank_occupation',      'BreakTankOccupation'),
    recalculate_after_release:  parseBool(src, 'recalculate_after_release',  'RecalculateAfterRelease'),
    reprogram_loaded_orders:    parseBool(src, 'reprogram_loaded_orders',    'ReprogramLoadedOrders'),
    allow_delivery_date_change: parseBool(src, 'allow_delivery_date_change', 'AllowDeliveryDateChange'),
  };
}

export async function getDeliveryPromiseParams(): Promise<DeliveryPromiseParams> {
  try {
    const res = await httpClient.get<unknown>(BASE);
    return parseParams(res.data);
  } catch (err) {
    // 404 → params not yet initialized on the server; return defaults
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return { ...DEFAULT_PARAMS };
    }
    throw err;
  }
}

export async function updateDeliveryPromiseParams(
  dto: UpdateDeliveryPromiseParamsDTO,
): Promise<void> {
  await httpClient.put(`${BASE}/update`, dto);
}
