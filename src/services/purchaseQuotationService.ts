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

/** Uma linha da cotação, já com as respostas de cada fornecedor. */
export interface QuotationItemView {
  id: number;
  sequence: number;
  item_code: string;
  quantity: number;
  uom?: string;
  delivery_date?: string;
  prices: QuotationPriceView[];
}

export interface QuotationPriceView {
  id: number;
  supplier_code: number;
  unit_price: number;
  lead_time_days: number;
  payment_term_code?: number;
  is_selected: boolean;
}

export interface QuotationMap {
  code: number;
  status?: string;
  emission_date?: string;
  suppliers: number[];
  items: QuotationItemView[];
}

/**
 * Monta o mapa da cotação: a matriz item × fornecedor.
 *
 * O backend devolve os preços como uma lista solta; o mapa é o que o comprador
 * de fato lê — uma linha por item, uma coluna por fornecedor. É a leitura que
 * transforma vinte números soltos numa decisão.
 */
export async function getQuotationMap(code: number): Promise<QuotationMap> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  const o = unwrapObject(data);
  const raiz = unwrapObject(o['data'] ?? o);
  const fornecedores = unwrapArray(raiz['suppliers'] ?? raiz['Suppliers'])
    .map((s) => parseNum(unwrapObject(s), 'supplier_code', 'SupplierCode'))
    .filter((c) => c > 0);

  const itens: QuotationItemView[] = unwrapArray(raiz['items'] ?? raiz['Items']).map((raw) => {
    const i = unwrapObject(raw);
    return {
      id: parseNum(i, 'id', 'ID'),
      sequence: parseNum(i, 'sequence', 'Sequence'),
      item_code: parseStr(i, 'item_code', 'ItemCode'),
      quantity: parseNum(i, 'quantity', 'Quantity'),
      uom: parseStr(i, 'uom', 'UOM') || undefined,
      delivery_date: parseStr(i, 'delivery_date', 'DeliveryDate') || undefined,
      prices: unwrapArray(i['prices'] ?? i['Prices']).map((p) => {
        const pr = unwrapObject(p);
        return {
          id: parseNum(pr, 'id', 'ID'),
          supplier_code: parseNum(pr, 'supplier_code', 'SupplierCode'),
          unit_price: parseNum(pr, 'unit_price', 'UnitPrice'),
          lead_time_days: parseNum(pr, 'lead_time_days', 'LeadTimeDays'),
          payment_term_code: parseNum(pr, 'payment_term_code', 'PaymentTermCode') || undefined,
          is_selected: unwrapObject(p)['is_selected'] === true || unwrapObject(p)['IsSelected'] === true,
        };
      }),
    };
  }).sort((a, b) => a.sequence - b.sequence);

  // Fornecedor que só apareceu no preço (convidado depois) também entra no mapa.
  const todos = new Set(fornecedores);
  for (const item of itens) for (const p of item.prices) todos.add(p.supplier_code);

  return {
    code: parseNum(raiz, 'code', 'Code') || code,
    status: parseStr(raiz, 'status', 'Status') || undefined,
    emission_date: parseStr(raiz, 'emission_date', 'EmissionDate') || undefined,
    suppliers: [...todos].sort((a, b) => a - b),
    items: itens,
  };
}
