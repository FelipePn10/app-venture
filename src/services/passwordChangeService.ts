import { httpClient, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/**
 * Troca de senha com aprovação: o titular solicita, outro administrador da
 * empresa aprova (ou rejeita com motivo) e o titular conclui em até 15 minutos.
 * O identificador da solicitação só circula entre tela e API — nunca é exibido.
 */
const BASE = '/api/password-change-requests';

export type SituacaoTrocaSenha = 'PENDING' | 'APPROVED' | 'REJECTED' | 'USED' | 'EXPIRED';

export interface SolicitacaoTrocaSenha {
  id: string;
  user_name?: string;
  user_email?: string;
  status: SituacaoTrocaSenha;
  reason?: string;
  expires_at?: string;
  approved_by_name?: string;
  approved_at?: string;
  rejected_by_name?: string;
  rejected_at?: string;
  rejection_reason?: string;
  used_at?: string;
  created_at: string;
  own: boolean;
}

/** Rótulo e cor de cada situação, para todas as telas do fluxo. */
export const SITUACAO_TROCA_SENHA: Record<SituacaoTrocaSenha, { rotulo: string; badge: string }> = {
  PENDING: { rotulo: 'Aguardando aprovação', badge: 'erp-badge-amber' },
  APPROVED: { rotulo: 'Aprovada', badge: 'erp-badge-green' },
  REJECTED: { rotulo: 'Rejeitada', badge: 'erp-badge-red' },
  USED: { rotulo: 'Concluída', badge: 'erp-badge-gray' },
  EXPIRED: { rotulo: 'Expirada', badge: 'erp-badge-gray' },
};

/** Política da nova senha (a mesma que a API valida). */
export const REGRAS_SENHA: { rotulo: string; ok: (s: string) => boolean }[] = [
  { rotulo: 'De 12 a 128 caracteres', ok: (s) => [...s].length >= 12 && [...s].length <= 128 },
  { rotulo: 'Uma letra maiúscula', ok: (s) => /[A-Z]/.test(s) },
  { rotulo: 'Uma letra minúscula', ok: (s) => /[a-z]/.test(s) },
  { rotulo: 'Um número', ok: (s) => /[0-9]/.test(s) },
  { rotulo: 'Um caractere especial', ok: (s) => /[^A-Za-z0-9]/.test(s) },
];

function paraSolicitacao(raw: unknown): SolicitacaoTrocaSenha {
  const o = unwrapObject(raw);
  return {
    id: String(o.id ?? ''),
    user_name: o.user_name as string | undefined,
    user_email: o.user_email as string | undefined,
    status: String(o.status ?? 'PENDING').toUpperCase() as SituacaoTrocaSenha,
    reason: o.reason as string | undefined,
    expires_at: o.expires_at as string | undefined,
    approved_by_name: o.approved_by_name as string | undefined,
    approved_at: o.approved_at as string | undefined,
    rejected_by_name: o.rejected_by_name as string | undefined,
    rejected_at: o.rejected_at as string | undefined,
    rejection_reason: o.rejection_reason as string | undefined,
    used_at: o.used_at as string | undefined,
    created_at: String(o.created_at ?? ''),
    own: Boolean(o.own),
  };
}

/** Config opcional com token explícito — usado na tela de login, onde o store
 *  de auth ainda está vazio (o interceptor não injeta Authorization). */
function withToken(token?: string) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}

/** Solicitações da empresa (somente administrador). */
export async function listPasswordChangeRequests(status = ''): Promise<SolicitacaoTrocaSenha[]> {
  const { data } = await httpClient.get(`${BASE}/`, { params: status ? { status } : undefined });
  return unwrapArray(data).map(paraSolicitacao);
}

/** Solicitações de quem está logado, a mais recente primeiro. */
export async function myPasswordChangeRequests(token?: string): Promise<SolicitacaoTrocaSenha[]> {
  const { data } = await httpClient.get(`${BASE}/mine`, withToken(token));
  return unwrapArray(data).map(paraSolicitacao);
}

export async function requestPasswordChange(reason: string, token?: string): Promise<SolicitacaoTrocaSenha> {
  const { data } = await httpClient.post(`${BASE}/`, { reason }, withToken(token));
  return paraSolicitacao(data);
}
export async function approvePasswordChange(requestId: string): Promise<void> {
  await httpClient.post(`${BASE}/${requestId}/approve`, {});
}
export async function rejectPasswordChange(requestId: string, reason: string): Promise<void> {
  await httpClient.post(`${BASE}/${requestId}/reject`, { reason });
}
/** Conclui a troca informando a senha atual + nova + confirmação. */
export async function completePasswordChange(requestId: string, currentPassword: string, newPassword: string, confirmPassword: string, token?: string): Promise<void> {
  await httpClient.post(`${BASE}/${requestId}/complete`, { current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword }, withToken(token));
}

/** A solicitação que vale agora: a mais recente aguardando ou aprovada. */
export function solicitacaoAtiva(lista: SolicitacaoTrocaSenha[]): SolicitacaoTrocaSenha | undefined {
  return lista.find((s) => s.status === 'PENDING' || s.status === 'APPROVED');
}
