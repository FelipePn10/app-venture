import { httpClient } from '@/services/fiscalShared';

const BASE = '/api/financial/relatorios';

/** A single row of a tabular report — arbitrary backend-defined columns. */
export type ReportRow = Record<string, unknown>;

/**
 * Normalized report payload. `single` is true when the backend returned one
 * summary object (e.g. DRE) instead of a list — the screen then renders it as
 * indicator/value pairs.
 */
export interface ReportData {
  single: boolean;
  rows: ReportRow[];
}

function isRow(v: unknown): v is ReportRow {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Fetches a financial report. `endpoint` is the path segment under
 * `/api/financial/relatorios/` (e.g. `"dre"`, `"extrato-cliente/7"`); `params`
 * carries the optional `start`/`end` query string.
 */
export async function getReport(endpoint: string, params?: Record<string, string>): Promise<ReportData> {
  const { data } = await httpClient.get(`${BASE}/${endpoint}`, { params });

  if (Array.isArray(data)) {
    return { single: false, rows: data.filter(isRow) };
  }
  // Some list endpoints wrap the array in a `data`/`items` envelope.
  if (isRow(data)) {
    for (const key of ['data', 'items', 'rows', 'results']) {
      const inner = (data as ReportRow)[key];
      if (Array.isArray(inner)) return { single: false, rows: inner.filter(isRow) };
    }
    // A single summary object (DRE, aging totals, …).
    return { single: true, rows: [data as ReportRow] };
  }
  return { single: false, rows: [] };
}
