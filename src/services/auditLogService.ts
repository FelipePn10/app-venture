import { httpClient, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Log de Auditoria (`GET /api/audit-log`, somente ADMIN). Retorna eventos de auditoria;
 * filtros passados como query params (ex.: entity, action, user, from, to). Como o
 * payload varia, devolvemos `Obj[]` para a tela renderizar as colunas disponíveis.
 */
export async function listAuditLog(params?: Obj): Promise<Obj[]> {
  const { data } = await httpClient.get('/api/audit-log', { params });
  return unwrapArray(data).map((r) => unwrapObject(r));
}
