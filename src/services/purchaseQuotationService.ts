import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/purchase-quotations';

/**
 * Cotação de Compra (§16): libera itens de solicitações/ordens planejadas para
 * cotação, registra preços por fornecedor, seleciona o vencedor e gera pedidos.
 * Fluxo: criar → registrar preços (QUOTED) → selecionar → gerar pedidos.
 */
export interface QuotationDTO {
  code?: number;
  enterprise_code: number;
  emission_date?: string;
  status?: string;
  items?: Obj[];
  prices?: Obj[];
  suppliers?: Obj[];
}

export interface QuotationPriceDTO {
  quotation_item_id: number;
  supplier_code: number;
  price: number;
  lead_time_days?: number;
  payment_condition_code?: number;
}

export interface CreateQuotationDTO {
  enterprise_code: number;
  requisition_item_ids?: number[];
  planned_order_codes?: number[];
  supplier_codes?: number[];
}

function parseQuotation(raw: unknown): QuotationDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    enterprise_code: parseNum(o, 'enterprise_code', 'EnterpriseCode'),
    emission_date: parseStr(o, 'emission_date', 'EmissionDate') || undefined,
    status: parseStr(o, 'status', 'Status') || undefined,
    items: unwrapArray(o['items'] ?? o['Items']).map(unwrapObject),
    prices: unwrapArray(o['prices'] ?? o['Prices']).map(unwrapObject),
    suppliers: unwrapArray(o['suppliers'] ?? o['Suppliers']).map(unwrapObject),
  };
}

export async function listQuotations(onlyOpen = true): Promise<QuotationDTO[]> {
  const { data } = await httpClient.get(BASE, { params: onlyOpen ? { only_open: true } : undefined });
  return unwrapArray(data).map(parseQuotation);
}
/** Detalhe cru (a tela lê `.items`/`.prices`/`.suppliers` inline como Obj). */
export async function getQuotation(code: number): Promise<Obj> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return unwrapObject(data);
}
export async function createQuotation(dto: CreateQuotationDTO): Promise<QuotationDTO> {
  const { data } = await httpClient.post(BASE, dto);
  return parseQuotation(data);
}
export async function addQuotationSuppliers(code: number, supplierCodes: number[]): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/suppliers`, { supplier_codes: supplierCodes });
  return unwrapObject(data);
}
export async function addQuotationPrice(dto: QuotationPriceDTO): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/prices`, dto);
  return unwrapObject(data);
}
export async function selectQuotationPrice(priceId: number): Promise<Obj> {
  const { data } = await httpClient.patch(`${BASE}/prices/${priceId}/select`, {});
  return unwrapObject(data);
}
export async function generateQuotationOrders(code: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/generate-orders`, {});
  return unwrapObject(data);
}
