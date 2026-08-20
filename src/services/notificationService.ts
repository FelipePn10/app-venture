import { httpClient } from './httpClient';

export type NotificationCadence = 'IMEDIATO' | 'RESUMO_DIARIO' | 'IMEDIATO_E_RESUMO_DIARIO';
export type NotificationSeverity = 'INFORMATIVO' | 'ATENCAO' | 'CRITICO';
export type RecipientType = 'USUARIO' | 'PAPEL' | 'DEPARTAMENTO';

export interface NotificationEvent {
  event_key: string;
  version: number;
  name: string;
  description: string;
  module: string;
  event_kind: 'EVENTO' | 'PENDENCIA' | string;
  severity: NotificationSeverity;
  allowed_cadences: NotificationCadence[];
  enabled_by_default: boolean;
  suggested_recipient_roles: string[];
  producer_status: 'ATIVO' | 'FUTURO';
  producer_description: string;
}

export interface NotificationUserRecipient { id: string; name: string; role: string; active: boolean }
export interface NotificationDepartmentRecipient { code: string; description: string; active: boolean }

export interface NotificationSettings {
  enabled: boolean;
  digest_time: string;
  timezone: string;
  retention_days: number;
  max_attachment_bytes: number;
  max_emails_per_minute: number;
  fiscal_config_id?: number | null;
}

export interface NotificationRecipient {
  recipient_type: RecipientType;
  user_id?: string;
  recipient_key?: string;
}

export interface NotificationSubscription {
  id?: string;
  event_key: string;
  event_version: number;
  enabled: boolean;
  cadence: NotificationCadence;
  thresholds: Record<string, unknown>;
  recipients: NotificationRecipient[];
}

export type NotificationRecord = Record<string, unknown>;

const BASE = '/api/notifications';

export async function listNotificationEvents(): Promise<NotificationEvent[]> {
  const { data } = await httpClient.get<NotificationEvent[]>(`${BASE}/events`);
  return Array.isArray(data) ? data : [];
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const { data } = await httpClient.get<NotificationSettings>(`${BASE}/settings`);
  return data;
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  await httpClient.put(`${BASE}/settings`, settings);
}

export async function listNotificationSubscriptions(): Promise<NotificationSubscription[]> {
  const { data } = await httpClient.get<NotificationSubscription[]>(`${BASE}/subscriptions`);
  return Array.isArray(data) ? data : [];
}

export async function listNotificationUsers(): Promise<NotificationUserRecipient[]> {
  const { data } = await httpClient.get<NotificationUserRecipient[]>(`${BASE}/recipients/users`);
  return Array.isArray(data) ? data : [];
}

export async function listNotificationDepartments(): Promise<NotificationDepartmentRecipient[]> {
  const { data } = await httpClient.get<NotificationDepartmentRecipient[]>(`${BASE}/recipients/departments`);
  return Array.isArray(data) ? data : [];
}

export async function saveNotificationSubscription(subscription: NotificationSubscription): Promise<void> {
  const payload = { ...subscription };
  if (subscription.id) await httpClient.put(`${BASE}/subscriptions/${subscription.id}`, payload);
  else await httpClient.post(`${BASE}/subscriptions`, payload);
}

export async function deleteNotificationSubscription(id: string): Promise<void> {
  await httpClient.delete(`${BASE}/subscriptions/${id}`);
}

export async function enqueueNotificationTest(): Promise<void> {
  await httpClient.post(`${BASE}/test-email`);
}

export async function listNotificationRecords(kind: 'alerts' | 'deliveries' | 'dead-letters', limit = 50, offset = 0): Promise<NotificationRecord[]> {
  const path = kind === 'alerts' ? `${BASE}/alerts` : kind === 'deliveries' ? `${BASE}/deliveries` : `${BASE}/dead-letters`;
  const { data } = await httpClient.get<NotificationRecord[]>(path, { params: { limit, offset } });
  return Array.isArray(data) ? data : [];
}

export async function getNotificationAlert(id: string): Promise<NotificationRecord> {
  const { data } = await httpClient.get<NotificationRecord>(`${BASE}/alerts/${id}`);
  return data;
}

export async function retryNotificationDelivery(id: string): Promise<void> {
  await httpClient.post(`${BASE}/deliveries/${id}/retry`);
}

export interface CycleCount {
  id: string;
  warehouse_id: number;
  warehouse_address_id?: number | null;
  item_code: string;
  origin: 'MANUAL' | 'POLITICA_ITEM';
  policy_days?: number;
  mask: string;
  lot_code: string;
  scheduled_for: string;
  state: 'PROGRAMADA' | 'EM_CONTAGEM' | 'DIVERGENTE' | 'CONCLUIDA' | 'APROVADA' | 'CANCELADA';
  expected_quantity?: string;
  counted_quantity?: string;
  divergence_quantity?: string;
  created_at: string;
  updated_at: string;
}

export async function listCycleCounts(limit = 100, offset = 0): Promise<CycleCount[]> {
  const { data } = await httpClient.get<CycleCount[]>('/api/stock/cycle-counts/', { params: { limit, offset } });
  return Array.isArray(data) ? data : [];
}

export async function createCycleCount(input: Pick<CycleCount, 'warehouse_id' | 'item_code' | 'mask' | 'lot_code' | 'scheduled_for'> & { warehouse_address_id?: number }): Promise<CycleCount> {
  const { data } = await httpClient.post<CycleCount>('/api/stock/cycle-counts/', input);
  return data;
}

export async function transitionCycleCount(id: string, state: CycleCount['state'], countedQuantity?: string, reason?: string): Promise<CycleCount> {
  const { data } = await httpClient.post<CycleCount>(`/api/stock/cycle-counts/${id}/transition`, {
    state,
    counted_quantity: countedQuantity?.replace(',', '.') || undefined,
    reason: reason?.trim() || '',
  });
  return data;
}
