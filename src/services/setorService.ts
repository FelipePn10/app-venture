import { httpClient } from '@/services/httpClient';

/** Setor da empresa e as pessoas que respondem por ele (VNOT0100 › Setores). */
export interface Setor { code: string; name: string; active: boolean; members: { user_id: string; name: string; email: string }[] }

/** Quem responde pelo planejamento e pelas compras de um grupo do PDM. */
export interface Responsaveis {
  group_code: number; group_description?: string;
  planning_department?: string; planning_department_name?: string; planning_people?: string[];
  purchasing_department?: string; purchasing_department_name?: string; purchasing_people?: string[];
}

export async function listarSetores(): Promise<Setor[]> {
  const { data } = await httpClient.get<Setor[]>('/api/setores/');
  return (Array.isArray(data) ? data : []).map((s) => ({ ...s, members: s.members ?? [] }));
}
export async function salvarSetor(s: Pick<Setor, 'code' | 'name' | 'active'>): Promise<void> {
  await httpClient.put('/api/setores/', s);
}
export async function definirPessoasDoSetor(codigo: string, usuarios: string[]): Promise<void> {
  await httpClient.put(`/api/setores/${encodeURIComponent(codigo)}/membros`, { user_ids: usuarios });
}
export async function responsaveisDoGrupo(grupo: number): Promise<Responsaveis> {
  const { data } = await httpClient.get<Responsaveis>(`/api/setores/grupos/${grupo}/responsaveis`);
  return data;
}
export async function salvarResponsaveisDoGrupo(grupo: number, planejamento: string, compras: string): Promise<Responsaveis> {
  const { data } = await httpClient.put<Responsaveis>(`/api/setores/grupos/${grupo}/responsaveis`, {
    planning_department: planejamento || null, purchasing_department: compras || null,
  });
  return data;
}
export async function responsaveisDoItem(codigo: string): Promise<Responsaveis | null> {
  try {
    const { data } = await httpClient.get<Responsaveis>(`/api/items/governanca/itens/${encodeURIComponent(codigo)}/responsaveis`);
    return data;
  } catch { return null; }
}
