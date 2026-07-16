import { httpClient, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Solicitações de Troca de Senha (`/api/password-change-requests`). Fluxo:
 * solicitar (`POST /` com motivo) → aprovar (ADMIN) → concluir (novo password) / rejeitar.
 */
const BASE = '/api/password-change-requests';

export async function listPasswordChangeRequests(params?: Obj): Promise<Obj[]> {
  const { data } = await httpClient.get(`${BASE}/`, { params });
  return unwrapArray(data).map((r) => unwrapObject(r));
}
/** Config opcional com token explícito — usado na tela de login, onde o store
 *  de auth ainda está vazio (o interceptor não injeta Authorization). */
function withToken(token?: string) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}

export async function requestPasswordChange(reason: string, token?: string): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/`, { reason }, withToken(token));
  return unwrapObject(data);
}
export async function approvePasswordChange(requestId: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${requestId}/approve`, {});
  return unwrapObject(data);
}
export async function rejectPasswordChange(requestId: number, reason = ''): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${requestId}/reject`, { reason });
  return unwrapObject(data);
}
/** Conclui a troca informando a senha atual + nova + confirmação. */
export async function completePasswordChange(requestId: number | string, currentPassword: string, newPassword: string, confirmPassword: string, token?: string): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${requestId}/complete`, { current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword }, withToken(token));
  return unwrapObject(data);
}
