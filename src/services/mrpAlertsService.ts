import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/mrp-calculation';

/** Alertas de Exceções MRP (§8): notifica via webhook e/ou e-mail. */
export interface MrpException {
  item_code: number;
  message_type: string;
  description: string;
}

export interface MrpAlertResult {
  plan_code: number;
  generated_at: string;
  total: number;
  by_type: Record<string, number>;
  exceptions: MrpException[];
}

export interface NotifyRequest {
  plan_code: number;
  webhook_url?: string;
  email_to?: string[];
}

export async function notifyMrpExceptions(req: NotifyRequest): Promise<MrpAlertResult> {
  const { data } = await httpClient.post(`${BASE}/exceptions/notify`, req);
  const o = unwrapObject(data);
  const byTypeRaw = unwrapObject(o['by_type'] ?? o['ByType']);
  const by_type: Record<string, number> = {};
  for (const k of Object.keys(byTypeRaw)) by_type[k] = Number(byTypeRaw[k]) || 0;
  const exceptions = unwrapArray(o['exceptions'] ?? o['Exceptions']).map((raw) => {
    const e = unwrapObject(raw);
    return {
      item_code: parseNum(e, 'item_code', 'ItemCode'),
      message_type: parseStr(e, 'message_type', 'MessageType'),
      description: parseStr(e, 'description', 'Description'),
    };
  });
  return {
    plan_code: parseNum(o, 'plan_code', 'PlanCode'),
    generated_at: parseStr(o, 'generated_at', 'GeneratedAt'),
    total: parseNum(o, 'total', 'Total'),
    by_type,
    exceptions,
  };
}
