import { httpClient } from '@/services/fiscalShared';

// Parâmetros comerciais da empresa (Fase 5.3). O backend manda o percentual
// como decimal exato (texto); nulo = sem alçada.
export interface ParametrosComerciais { desconto_max_pct: number | string | null; }

const BASE = '/api/parametros-comerciais';

export async function obterParametrosComerciais(): Promise<ParametrosComerciais> {
  const { data } = await httpClient.get(BASE);
  return data;
}
export async function salvarParametrosComerciais(p: { desconto_max_pct: string | null }): Promise<ParametrosComerciais> {
  const { data } = await httpClient.put(BASE, p);
  return data;
}
