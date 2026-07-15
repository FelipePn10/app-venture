import { httpClient, parseStr, parseNum, currentUserId, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Pipeline de Planejamento (`/api/planning/run-pipeline`) e Parâmetros de Planejamento
 * (`/api/planning-params`). O pipeline encadeia MRP → CRP → APS num disparo e devolve um
 * parecer de viabilidade consolidado.
 */

export interface PipelineResult {
  viable?: boolean;
  notes?: string;
  raw: Obj;
}
/** Executa MRP→CRP→APS num disparo. Requer escopo `planning:run`. */
export async function runPipeline(planCode: number, initialOrderNumber = 10000, generateLlc = true, startFrom?: string): Promise<PipelineResult> {
  const body: Obj = { plan_code: planCode, initial_order_number: initialOrderNumber, generate_llc: generateLlc };
  if (startFrom) body.start_from = startFrom;
  const { data } = await httpClient.post('/api/planning/run-pipeline', body);
  const o = unwrapObject(data);
  return { viable: o['viable'] as boolean, notes: parseStr(o, 'notes', 'Notes') || undefined, raw: o };
}

export interface PlanningParam {
  param_number: number;
  value: string;
  description?: string;
}
function parseParam(raw: unknown): PlanningParam {
  const o = unwrapObject(raw);
  return {
    param_number: parseNum(o, 'param_number', 'ParamNumber', 'number', 'Number'),
    value: parseStr(o, 'value', 'Value'),
    description: parseStr(o, 'description', 'Description') || undefined,
  };
}
export async function listPlanningParams(): Promise<PlanningParam[]> {
  const { data } = await httpClient.get('/api/planning-params/list');
  return unwrapArray(data).map(parseParam);
}
export async function getPlanningParam(num: number): Promise<PlanningParam> {
  const { data } = await httpClient.get(`/api/planning-params/${num}`);
  return parseParam(data);
}
export async function updatePlanningParam(paramNumber: number, value: string): Promise<PlanningParam> {
  const { data } = await httpClient.put('/api/planning-params/update', { param_number: paramNumber, value, updated_by: currentUserId() });
  return parseParam(data);
}
