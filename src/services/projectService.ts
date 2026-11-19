import { httpClient, parseNum, parseStr, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/** Projeto (obra, contrato, desenvolvimento) ao qual pedidos, demandas e ordens de fabricação pertencem. */
export interface Project {
  id?: number;
  code: string;
  name: string;
  customer_code?: number | null;
  customer_name?: string;
  status: 'ATIVO' | 'ENCERRADO' | 'CANCELADO';
  start_date?: string;
  end_date?: string;
  notes?: string;
  open_orders?: number;
  total_orders?: number;
}

export const SITUACAO_PROJETO: Record<Project['status'], { rotulo: string; tom: 'ok' | 'muted' | 'danger' }> = {
  ATIVO: { rotulo: 'Ativo', tom: 'ok' },
  ENCERRADO: { rotulo: 'Encerrado', tom: 'muted' },
  CANCELADO: { rotulo: 'Cancelado', tom: 'danger' },
};

function parseProject(raw: unknown): Project {
  const o = unwrapObject(raw);
  const status = parseStr(o, 'status') as Project['status'];
  return {
    id: parseNum(o, 'id') || undefined,
    code: parseStr(o, 'code'),
    name: parseStr(o, 'name'),
    customer_code: parseNum(o, 'customer_code') || null,
    customer_name: parseStr(o, 'customer_name') || undefined,
    status: status || 'ATIVO',
    start_date: parseStr(o, 'start_date') || undefined,
    end_date: parseStr(o, 'end_date') || undefined,
    notes: parseStr(o, 'notes') || undefined,
    open_orders: parseNum(o, 'open_orders'),
    total_orders: parseNum(o, 'total_orders'),
  };
}

export async function listProjects(busca = '', status = ''): Promise<Project[]> {
  const { data } = await httpClient.get('/api/projects/', { params: { q: busca || undefined, status: status || undefined } });
  return unwrapArray(data).map(parseProject);
}

function corpo(p: Project) {
  return {
    code: p.code.trim(), name: p.name.trim(), customer_code: p.customer_code || undefined, status: p.status,
    start_date: p.start_date || undefined, end_date: p.end_date || undefined, notes: p.notes?.trim() || undefined,
  };
}

export async function createProject(p: Project): Promise<Project> {
  const { data } = await httpClient.post('/api/projects/', corpo(p));
  return parseProject(data);
}

/** Altera pelo código atual (o código pode mudar). */
export async function updateProject(codigoAtual: string, p: Project): Promise<Project> {
  const { data } = await httpClient.put(`/api/projects/${encodeURIComponent(codigoAtual)}`, corpo(p));
  return parseProject(data);
}
