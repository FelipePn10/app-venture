import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/aps';

/** APS — Advanced Planning and Scheduling (§3). Gantt finito por ordem/centro. */
export interface GanttEntry {
  sequence_id: number;
  production_order_id: number;
  work_center_id: number;
  sequence_position: number;
  scheduled_start: string;
  scheduled_end: string;
  duration_hours: number;
  status: string;
}

function parseGantt(raw: unknown): GanttEntry {
  const o = unwrapObject(raw);
  return {
    sequence_id: parseNum(o, 'sequence_id', 'SequenceID'),
    production_order_id: parseNum(o, 'production_order_id', 'ProductionOrderID'),
    work_center_id: parseNum(o, 'work_center_id', 'WorkCenterID'),
    sequence_position: parseNum(o, 'sequence_position', 'SequencePosition'),
    scheduled_start: parseStr(o, 'scheduled_start', 'ScheduledStart'),
    scheduled_end: parseStr(o, 'scheduled_end', 'ScheduledEnd'),
    duration_hours: parseNum(o, 'duration_hours', 'DurationHours'),
    status: parseStr(o, 'status', 'Status'),
  };
}

export async function sequenceAps(): Promise<void> {
  await httpClient.post(`${BASE}/sequence`, {});
}
export async function ganttByOrder(orderId: number): Promise<GanttEntry[]> {
  const { data } = await httpClient.get(`${BASE}/gantt/order/${orderId}`);
  return unwrapArray(data).map(parseGantt);
}
export async function ganttByWorkCenter(workCenterId: number, from: string, to: string): Promise<GanttEntry[]> {
  const { data } = await httpClient.post(`${BASE}/gantt/work-center`, { work_center_id: workCenterId, from, to });
  return unwrapArray(data).map(parseGantt);
}

// ── §3.1 Quadro de Programação (Gantt mês / range) + reschedule + export ──

export type GanttGroupBy = 'work_center' | 'order';
export type GanttScale = 'day' | 'week';

/** Barra do quadro (uma operação/OF sequenciada, ou fallback pela OF). */
export interface GanttBar {
  sequence_id?: number;
  production_order_id?: number;
  work_center_id?: number;
  label: string;
  start: string;
  end: string;
  percent_done?: number;
  is_late?: boolean;
  color_hex?: string;
  status?: string;
}
/** Linha do quadro — um centro de trabalho (group_by=work_center) ou uma OF (group_by=order). */
export interface GanttRow {
  key: string;
  label: string;
  bars: GanttBar[];
}
export interface GanttLoad { work_center_id: number; date: string; load_pct: number; }
export interface GanttDay { date: string; is_working: boolean; is_today: boolean; }
export interface GanttDependency { predecessor_id: number; successor_id: number; overlap_pct?: number; implicit?: boolean; }
export interface GanttBoard {
  rows: GanttRow[];
  load: GanttLoad[];
  days: GanttDay[];
  dependencies: GanttDependency[];
  overloaded_days: number;
  late_bars: number;
  raw: Obj;
}

/** Primeiro array não-vazio entre as chaves candidatas. */
function pickArray(o: Obj, keys: string[]): unknown[] {
  for (const k of keys) { const v = o[k]; if (Array.isArray(v)) return v; }
  return [];
}
function parseBar(raw: unknown): GanttBar {
  const o = unwrapObject(raw);
  return {
    sequence_id: parseNum(o, 'sequence_id', 'SequenceID') || undefined,
    production_order_id: parseNum(o, 'production_order_id', 'ProductionOrderID', 'order_id') || undefined,
    work_center_id: parseNum(o, 'work_center_id', 'WorkCenterID') || undefined,
    label: parseStr(o, 'label', 'Label', 'title', 'name') || String(parseNum(o, 'production_order_id', 'order_id') || ''),
    start: parseStr(o, 'start', 'Start', 'scheduled_start', 'ScheduledStart'),
    end: parseStr(o, 'end', 'End', 'scheduled_end', 'ScheduledEnd'),
    percent_done: parseNum(o, 'percent_done', 'PercentDone', 'progress'),
    is_late: parseBool(o, 'is_late', 'IsLate'),
    color_hex: parseStr(o, 'color_hex', 'ColorHex') || undefined,
    status: parseStr(o, 'status', 'Status') || undefined,
  };
}
function parseRow(raw: unknown): GanttRow {
  const o = unwrapObject(raw);
  return {
    key: String(parseStr(o, 'key', 'Key', 'id', 'work_center_id', 'order_id') || parseNum(o, 'work_center_id', 'order_id', 'id')),
    label: parseStr(o, 'label', 'Label', 'name', 'title') || '—',
    bars: pickArray(o, ['bars', 'Bars', 'tasks', 'Tasks', 'entries', 'Entries']).map(parseBar),
  };
}
function parseBoard(data: unknown): GanttBoard {
  const o = unwrapObject(data);
  const summary = unwrapObject(o['summary'] ?? o['Summary'] ?? {});
  return {
    rows: pickArray(o, ['rows', 'Rows', 'lines', 'Lines']).map(parseRow),
    load: pickArray(o, ['load', 'Load', 'loads', 'Loads']).map((l) => { const x = unwrapObject(l); return { work_center_id: parseNum(x, 'work_center_id', 'WorkCenterID'), date: parseStr(x, 'date', 'Date', 'req_date'), load_pct: parseNum(x, 'load_pct', 'LoadPct') }; }),
    days: pickArray(o, ['days', 'Days']).map((d) => { const x = unwrapObject(d); return { date: parseStr(x, 'date', 'Date'), is_working: parseBool(x, 'is_working', 'IsWorking'), is_today: parseBool(x, 'is_today', 'IsToday') }; }),
    dependencies: pickArray(o, ['dependencies', 'Dependencies']).map((e) => { const x = unwrapObject(e); return { predecessor_id: parseNum(x, 'predecessor_id', 'PredecessorID'), successor_id: parseNum(x, 'successor_id', 'SuccessorID'), overlap_pct: parseNum(x, 'overlap_pct', 'OverlapPct'), implicit: parseBool(x, 'implicit', 'Implicit') }; }),
    overloaded_days: parseNum(summary, 'overloaded_days', 'OverloadedDays'),
    late_bars: parseNum(summary, 'late_bars', 'LateBars'),
    raw: o,
  };
}

/** Quadro mensal (atalho de board com escala diária e o mês inteiro). */
export async function ganttMonth(year: number, month: number, groupBy: GanttGroupBy = 'work_center'): Promise<GanttBoard> {
  const { data } = await httpClient.get(`${BASE}/gantt/month/${year}/${month}`, { params: { group_by: groupBy } });
  return parseBoard(data);
}
/** Quadro em range livre. `to` inclusiva; omitida = 30 dias. `scale` day|week. Máx ~372 dias. */
export async function ganttBoard(from: string, to?: string, scale: GanttScale = 'day', groupBy: GanttGroupBy = 'work_center'): Promise<GanttBoard> {
  const params: Obj = { from, scale, group_by: groupBy };
  if (to) params.to = to;
  const { data } = await httpClient.get(`${BASE}/gantt/board`, { params });
  return parseBoard(data);
}

export interface RescheduleResult {
  shifted: Obj[];
  warnings: string[];
  raw: Obj;
}
/**
 * Remaneja (drag-drop) uma sequência, preservando a duração. `cascade` (default true)
 * empurra as operações a jusante da mesma OF pela rede finish-start. `warnings[]` traz
 * dias que passaram da capacidade do centro — **não bloqueia** (override do planejador).
 */
export async function rescheduleGantt(sequenceId: number, newStart: string, opts: { newWorkCenterId?: number; cascade?: boolean } = {}): Promise<RescheduleResult> {
  const body: Obj = { sequence_id: sequenceId, new_start: newStart, cascade: opts.cascade ?? true };
  if (opts.newWorkCenterId) body.new_work_center_id = opts.newWorkCenterId;
  const { data } = await httpClient.post(`${BASE}/gantt/reschedule`, body);
  const o = unwrapObject(data);
  return {
    shifted: pickArray(o, ['shifted', 'Shifted']).map((s) => unwrapObject(s)),
    warnings: pickArray(o, ['warnings', 'Warnings']).map((w) => String(w)),
    raw: o,
  };
}

/** Exporta o quadro mensal como SVG/PDF (blob para download). */
export async function exportGanttMonth(year: number, month: number, format: 'svg' | 'pdf', groupBy: GanttGroupBy = 'work_center'): Promise<Blob> {
  const { data } = await httpClient.get(`${BASE}/gantt/month/${year}/${month}/export`, { params: { format, group_by: groupBy }, responseType: 'blob' });
  return data as Blob;
}
/** Exporta o quadro de range como SVG/PDF (blob para download). */
export async function exportGanttBoard(from: string, to: string | undefined, format: 'svg' | 'pdf', scale: GanttScale = 'day', groupBy: GanttGroupBy = 'work_center'): Promise<Blob> {
  const params: Obj = { from, scale, group_by: groupBy, format };
  if (to) params.to = to;
  const { data } = await httpClient.get(`${BASE}/gantt/board/export`, { params, responseType: 'blob' });
  return data as Blob;
}
