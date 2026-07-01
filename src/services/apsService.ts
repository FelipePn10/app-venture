import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

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
