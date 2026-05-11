import axios from 'axios';
import { httpClient } from '@/services/httpClient';

const BASE = '/api/item-calendar-promise';

export interface ItemCalendarDay {
  item_code: number;
  mask: string;
  year: number;
  month: number;
  day: number;
  is_workday: boolean;
  description?: string | null;
}

export interface CreateItemCalendarDayDTO {
  item_code: number;
  mask: string;
  year: number;
  month: number;
  day: number;
  is_workday: boolean;
  description?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Obj = Record<string, unknown>;

function encodeMask(mask: string): string {
  const m = mask.trim();
  return encodeURIComponent(m || '-');
}

function parseDay(raw: unknown): ItemCalendarDay | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Obj;

  const item_code = Number(o['item_code'] ?? o['ItemCode'] ?? o['itemCode']);
  const year      = Number(o['year']      ?? o['Year']);
  const month     = Number(o['month']     ?? o['Month']);
  const day       = Number(o['day']       ?? o['Day']);

  if (!item_code || !year || !month || !day) return null;

  const wv = o['is_workday'] ?? o['IsWorkday'] ?? o['isWorkday'];
  const is_workday = wv !== false && wv !== 0 && wv !== 'false';

  return {
    item_code,
    mask:        String(o['mask']        ?? o['Mask']        ?? ''),
    year,
    month,
    day,
    is_workday,
    description: (o['description'] ?? o['Description'] ?? null) as string | null,
  };
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Obj;
    for (const k of ['data', 'items', 'days', 'results']) {
      if (Array.isArray(o[k])) return o[k] as unknown[];
    }
  }
  return [];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function listItemCalendarMonth(
  itemCode: number,
  mask: string,
  year: number,
  month: number,
): Promise<ItemCalendarDay[]> {
  try {
    const res = await httpClient.get<unknown>(
      `${BASE}/${itemCode}/${encodeMask(mask)}/${year}/${month}`,
    );
    const result: ItemCalendarDay[] = [];
    for (const raw of unwrapArray(res.data)) {
      const d = parseDay(raw);
      if (d) result.push(d);
    }
    return result;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return [];
    throw err;
  }
}

export async function upsertItemCalendarDay(dto: CreateItemCalendarDayDTO): Promise<void> {
  await httpClient.post(`${BASE}/create`, dto);
}

export async function deleteItemCalendarDay(
  itemCode: number,
  mask: string,
  year: number,
  month: number,
  day: number,
): Promise<void> {
  await httpClient.delete(
    `${BASE}/${itemCode}/${encodeMask(mask)}/${year}/${month}/${day}`,
  );
}
