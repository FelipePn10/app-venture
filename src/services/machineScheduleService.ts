import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/machine/schedule';

/**
 * Agenda da máquina — `/api/machine/schedule` (Máquinas §2).
 * Consumida pelo CRP/APS. O backend retorna um slot tipo APS
 * (`schedule_date`, `planned_qty`, `produced_qty`, `status`, `sequence`).
 *
 * ⚠️ `GET /list` exige `machine_code` mas rejeita todas as formas testadas
 * (query/body) com "invalid machine_code" — **list quebrado no backend**.
 * `create` funciona, mas ignora datas enviadas como date-only (grava `0001-01-01`).
 */
export interface MachineScheduleDTO {
  code?: number;
  machine_code: number;
  schedule_date?: string;
  planned_qty?: number;
  produced_qty?: number;
  status?: string;
  sequence?: number;
}

function parseSchedule(raw: unknown): MachineScheduleDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    machine_code: parseNum(o, 'machine_code', 'MachineCode'),
    schedule_date: parseStr(o, 'schedule_date', 'ScheduleDate') || undefined,
    planned_qty: parseNum(o, 'planned_qty', 'PlannedQty'),
    produced_qty: parseNum(o, 'produced_qty', 'ProducedQty'),
    status: parseStr(o, 'status', 'Status'),
    sequence: parseNum(o, 'sequence', 'Sequence'),
  };
}

export async function createMachineSchedule(dto: MachineScheduleDTO): Promise<MachineScheduleDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseSchedule(data);
}

/** ⚠️ Backend retorna "invalid machine_code" — quebrado até correção no handler. */
export async function listMachineSchedules(machineCode: number): Promise<MachineScheduleDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list`, { params: { machine_code: machineCode } });
  return unwrapArray(data).map(parseSchedule);
}
