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
export async function requestPasswordChange(reason: string): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/`, { reason });
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
export async function completePasswordChange(requestId: number, currentPassword: string, newPassword: string, confirmPassword: string): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${requestId}/complete`, { current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword });
  return unwrapObject(data);
}
