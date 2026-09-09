import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/machine/schedule';

/**
 * Agenda da máquina — `/api/machine/schedule` (Máquinas §2).
 * Consumida pelo CRP/APS. O backend retorna um slot tipo APS
 * (`schedule_date`, `planned_qty`, `produced_qty`, `status`, `sequence`).
 *
 * `GET /list` exige `?machine_code=` e aceita `?date=YYYY-MM-DD` (default hoje).
 * `create` grava a `schedule_date` real; a entidade é um slot de APS
 * (planned_qty/sequence/status), não disponibilidade/paradas.
 */
export interface MachineScheduleDTO {
  code?: number;
  machine_code: number;
  order_code?: number;
  schedule_date?: string;
  start_time?: string;
  end_time?: string;
  planned_qty?: number;
  produced_qty?: number;
  status?: string;
  sequence?: number;
  /**
   * Prioridade que o programador força na mão. A fila é ordenada pela sequência,
   * mas um pedido urgente pode furar a fila sem que todas as sequências sejam
   * renumeradas — é a "prioridade manual" do sequenciador.
   */
  priority_override?: number;
  notes?: string;
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
    order_code: parseNum(o, 'order_code', 'OrderCode') || undefined,
    start_time: parseStr(o, 'start_time', 'StartTime') || undefined,
    end_time: parseStr(o, 'end_time', 'EndTime') || undefined,
    priority_override: parseNum(o, 'priority_override', 'PriorityOverride') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || undefined,
  };
}

export async function createMachineSchedule(dto: MachineScheduleDTO): Promise<MachineScheduleDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseSchedule(data);
}

export async function listMachineSchedules(machineCode: number, date?: string): Promise<MachineScheduleDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list`, { params: { machine_code: machineCode, date } });
  return unwrapArray(data).map(parseSchedule);
}

/**
 * Sequenciamento da fila. O caso de uso existia desde sempre no backend, mas
 * ficou sem rota até a v1.1.17: a fila só podia crescer. Agora o programador
 * reordena, corrige o apontamento e remove o slot que não vai rodar.
 */
export async function reorderMachineSchedule(
  scheduleId: number,
  newSequence: number,
  priorityOverride?: number,
): Promise<void> {
  await httpClient.patch(`${BASE}/reorder`, {
    schedule_id: scheduleId,
    new_sequence: newSequence,
    priority_override: priorityOverride,
  });
}

export async function updateMachineScheduleStatus(
  code: number,
  status: string,
  producedQty: number,
): Promise<MachineScheduleDTO> {
  const { data } = await httpClient.patch(`${BASE}/${code}/status`, { status, produced_qty: producedQty });
  return parseSchedule(data);
}

/** Horários no formato `HH:MM:SS` — é o que o backend converte. */
export async function updateMachineScheduleTimes(
  code: number,
  startTime?: string,
  endTime?: string,
): Promise<MachineScheduleDTO> {
  const { data } = await httpClient.patch(`${BASE}/${code}/times`, {
    start_time: startTime ?? null,
    end_time: endTime ?? null,
  });
  return parseSchedule(data);
}

export async function deleteMachineSchedule(code: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}`);
}
