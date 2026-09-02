import { httpClient, parseNum, parseStr, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/commercial-commissions';

export interface CommercialCommissionEntryDTO {
  code: number;
  representative_code: number;
  sales_order_code: number;
  event_type: string;
  competence_date: string;
  base_amount: string;
  commission_pct: string;
  amount: string;
  status: string;
  payment_reference?: string;
  reversed_of?: number;
}

export interface CommercialCommissionFilters {
  representative_code?: number;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface CommercialCommissionSettingsDTO {
  competence_event: 'FATURAMENTO' | 'RECEBIMENTO' | 'RATEIO';
  invoice_share_pct: string;
  receipt_share_pct: string;
}

function parseEntry(raw: unknown): CommercialCommissionEntryDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    representative_code: parseNum(o, 'representative_code', 'RepresentativeCode'),
    sales_order_code: parseNum(o, 'sales_order_code', 'SalesOrderCode'),
    event_type: parseStr(o, 'event_type', 'EventType'),
    competence_date: parseStr(o, 'competence_date', 'CompetenceDate'),
    base_amount: parseStr(o, 'base_amount', 'BaseAmount'),
    commission_pct: parseStr(o, 'commission_pct', 'CommissionPct'),
    amount: parseStr(o, 'amount', 'Amount'),
    status: parseStr(o, 'status', 'Status'),
    payment_reference: parseStr(o, 'payment_reference', 'PaymentReference') || undefined,
    reversed_of: parseNum(o, 'reversal_of', 'ReversalOf') || undefined,
  };
}

export async function listCommercialCommissions(filters: CommercialCommissionFilters = {}): Promise<CommercialCommissionEntryDTO[]> {
  const { data } = await httpClient.get(`${BASE}/ledger`, { params: filters });
  return unwrapArray(data).map(parseEntry);
}

export async function getCommercialCommissionSettings(): Promise<CommercialCommissionSettingsDTO> {
  const { data } = await httpClient.get(`${BASE}/settings`);
  const o = unwrapObject(data);
  return {
    competence_event: (parseStr(o, 'competence_event', 'CompetenceEvent') || 'FATURAMENTO') as CommercialCommissionSettingsDTO['competence_event'],
    invoice_share_pct: parseStr(o, 'invoice_share_pct', 'InvoiceSharePct') || '100',
    receipt_share_pct: parseStr(o, 'receipt_share_pct', 'ReceiptSharePct') || '0',
  };
}

export async function saveCommercialCommissionSettings(dto: CommercialCommissionSettingsDTO): Promise<CommercialCommissionSettingsDTO> {
  const { data } = await httpClient.put(`${BASE}/settings`, dto);
  const o = unwrapObject(data);
  return {
    competence_event: (parseStr(o, 'competence_event', 'CompetenceEvent') || dto.competence_event) as CommercialCommissionSettingsDTO['competence_event'],
    invoice_share_pct: parseStr(o, 'invoice_share_pct', 'InvoiceSharePct') || dto.invoice_share_pct,
    receipt_share_pct: parseStr(o, 'receipt_share_pct', 'ReceiptSharePct') || dto.receipt_share_pct,
  };
}

export async function transitionCommercialCommission(code: number, action: 'CONCILIADA' | 'PAGA', reason: string, paymentReference?: string): Promise<CommercialCommissionEntryDTO> {
  const { data } = await httpClient.post(`${BASE}/ledger/${code}/${action}`, { reason, payment_reference: paymentReference || undefined }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
  return parseEntry(data);
}
