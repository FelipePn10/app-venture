import { httpClient } from '@/services/httpClient';

const BASE = '/api/industrial-calendar';

export interface CreateCalendarDayDTO {
  year: number;
  month: number;
  day: number;
  is_workday: boolean;
  description?: string;
}

export interface ParsedCalendarDay {
  year: number;
  month: number;
  day: number;
  is_workday: boolean;
}

// ─── Defensive parsers ────────────────────────────────────────────────────────
// The backend may return any of these shapes:
//   { year, month, day, is_workday }       ← snake_case DTO
//   { year, month, day, isWorkday }        ← camelCase
//   { Year, Month, Day, IsWorkday }        ← PascalCase (Go default without json tags)
//   { date: "2025-05-10T00:00:00Z", is_workday } ← date string field

type Obj = Record<string, unknown>;

function pick<T>(obj: Obj, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

function parseIsWorkday(obj: Obj): boolean {
  const v = pick<unknown>(obj, 'is_workday', 'isWorkday', 'IsWorkday');
  // If field is absent, default to true (working day) so we don't mark unknown days as holidays
  if (v === undefined) return true;
  return v !== false && v !== 0 && v !== 'false';
}

function parseDateFields(obj: Obj): { year: number; month: number; day: number } | null {
  // Shape 1: separate numeric fields
  const year  = pick<unknown>(obj, 'year',  'Year');
  const month = pick<unknown>(obj, 'month', 'Month');
  const day   = pick<unknown>(obj, 'day',   'Day');

  if (year != null && month != null && day != null) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (y > 0 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // Shape 2: ISO date string "date" / "Date" / "calendar_date"
  const raw = pick<unknown>(obj, 'date', 'Date', 'calendar_date', 'calendarDate');
  if (typeof raw === 'string' && raw.length >= 10) {
    // Grab just the YYYY-MM-DD prefix to avoid TZ shift from full ISO parse
    const [y, m, d] = raw.substring(0, 10).split('-').map(Number);
    if (y > 0 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getCalendarMonth(year: number, month: number): Promise<ParsedCalendarDay[]> {
  const response = await httpClient.get<unknown>(`${BASE}/month/${year}/${month}`);
  const raw = response.data;

  // Log the raw response so the dev can see the exact shape in the browser console
  console.debug('[industrialCalendar] getCalendarMonth raw response:', raw);

  if (!Array.isArray(raw)) return [];

  const result: ParsedCalendarDay[] = [];
  for (const item of raw as unknown[]) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Obj;
    const date = parseDateFields(obj);
    if (!date) {
      console.debug('[industrialCalendar] Could not parse date from item:', item);
      continue;
    }
    result.push({ ...date, is_workday: parseIsWorkday(obj) });
  }

  console.debug('[industrialCalendar] parsed days:', result);
  return result;
}

export async function createCalendarDay(dto: CreateCalendarDayDTO): Promise<void> {
  await httpClient.post(`${BASE}/create`, dto);
}

/** Retorna apenas os dias úteis do mês (GET /workdays/{year}/{month}). */
export async function getWorkdays(year: number, month: number): Promise<ParsedCalendarDay[]> {
  const response = await httpClient.get<unknown>(`${BASE}/workdays/${year}/${month}`);
  const raw = response.data;
  if (!Array.isArray(raw)) return [];
  const result: ParsedCalendarDay[] = [];
  for (const item of raw as unknown[]) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Obj;
    const date = parseDateFields(obj);
    if (date) result.push({ ...date, is_workday: true });
  }
  return result;
}
