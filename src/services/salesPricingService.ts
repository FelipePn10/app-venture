import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/customers/support/sales-tables';
const POLICY = '/api/customers/support/sales-price-policies';

/**
 * Precificação (Comercial) — `/api/customers/sales-tables` + `/api/customers/sales-price-policies`.
 *
 * Tabela de venda define validade, formação de preço, casas decimais, composição
 * (FOB…) e tolerâncias; cada linha é o preço de um item. `pricing` resolve o preço
 * vigente; `price-formation` calcula preço sugerido a partir de custo + margem/cargas
 * (ou de uma política); `generate-prices` faz upsert em lote com histórico.
 */

export interface SalesTableDTO {
  code?: number;
  description: string;
  validity_start?: string;
  validity_end?: string;
  tolerance_min_pct?: number;
  tolerance_max_pct?: number;
  price_formation?: string;   // INFORMADO | FORMADO ...
  decimal_places?: number;
  composition?: string;       // FOB | CIF ...
  table_type?: string;        // NORMAL ...
  base_date?: string;         // PEDIDO | ...
  allow_items_below_cent?: boolean;
  icms_interestadual_por_dentro?: boolean;
  is_active?: boolean;
  observation?: string;
}

export interface SalesTablePriceDTO {
  id?: number;
  item_code: string;
  price: number;
  ume?: string;
  umc?: string;
  price_conv?: number;
  formula?: string;
  situation?: string;  // ATIVO | PROMOCIONAL ...
  blocked?: boolean;
  observation?: string;
}

export interface SalesPricePolicyDTO {
  code?: number;
  description: string;
  cost_source?: string;       // STANDARD_TOTAL ...
  priority?: number;
  sequence?: number;
  policy_scope?: string;      // PREC
  policy_types?: string;      // ITEM-CLIENTE-UF_CLIENTE
  markup_pct?: number;
  margin_pct?: number;
  max_margin_pct?: number;
  ideal_margin_pct?: number;
  margin_step_pct?: number;
  expenses_pct?: number;
  taxes_pct?: number;
  freight_pct?: number;
  commission_pct?: number;
  discount_pct?: number;
  min_margin_pct?: number;
  max_discount_pct?: number;
  incidences_json?: unknown[];
  sales_table_code?: number;
  validity_start?: string;
  validity_end?: string;
  is_active?: boolean;
  observation?: string;
}

export interface PriceFormationRequest {
  sales_table_code: number;
  policy_code?: number;
  item_code: string;
  base_cost?: number;
  markup_pct?: number;
  margin_pct?: number;
  expenses_pct?: number;
  taxes_pct?: number;
  freight_pct?: number;
  commission_pct?: number;
  discount_pct?: number;
}

function parseTable(raw: unknown): SalesTableDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    validity_start: parseStr(o, 'validity_start', 'ValidityStart') || undefined,
    validity_end: parseStr(o, 'validity_end', 'ValidityEnd') || undefined,
    tolerance_min_pct: parseNum(o, 'tolerance_min_pct', 'ToleranceMinPct'),
    tolerance_max_pct: parseNum(o, 'tolerance_max_pct', 'ToleranceMaxPct'),
    price_formation: parseStr(o, 'price_formation', 'PriceFormation') || undefined,
    decimal_places: parseNum(o, 'decimal_places', 'DecimalPlaces'),
    composition: parseStr(o, 'composition', 'Composition') || undefined,
    table_type: parseStr(o, 'table_type', 'TableType') || undefined,
    base_date: parseStr(o, 'base_date', 'BaseDate') || undefined,
    allow_items_below_cent: parseBool(o, 'allow_items_below_cent', 'AllowItemsBelowCent'),
    icms_interestadual_por_dentro: parseBool(o, 'icms_interestadual_por_dentro', 'IcmsInterestadualPorDentro'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
    observation: parseStr(o, 'observation', 'Observation') || undefined,
  };
}

function parsePrice(raw: unknown): SalesTablePriceDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    item_code: parseStr(o, 'item_code', 'ItemCode') || String(parseNum(o, 'item_code', 'ItemCode') ?? ''),
    price: parseNum(o, 'price', 'Price'),
    ume: parseStr(o, 'ume', 'Ume') || undefined,
    umc: parseStr(o, 'umc', 'Umc') || undefined,
    price_conv: parseNum(o, 'price_conv', 'PriceConv'),
    formula: parseStr(o, 'formula', 'Formula') || undefined,
    situation: parseStr(o, 'situation', 'Situation') || undefined,
    blocked: parseBool(o, 'blocked', 'Blocked'),
    observation: parseStr(o, 'observation', 'Observation') || undefined,
  };
}

function parsePolicy(raw: unknown): SalesPricePolicyDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    cost_source: parseStr(o, 'cost_source', 'CostSource') || undefined,
    priority: parseNum(o, 'priority', 'Priority'),
    sequence: parseNum(o, 'sequence', 'Sequence'),
    policy_scope: parseStr(o, 'policy_scope', 'PolicyScope') || undefined,
    policy_types: parseStr(o, 'policy_types', 'PolicyTypes') || undefined,
    markup_pct: parseNum(o, 'markup_pct', 'MarkupPct'),
    margin_pct: parseNum(o, 'margin_pct', 'MarginPct'),
    ideal_margin_pct: parseNum(o, 'ideal_margin_pct', 'IdealMarginPct'),
    expenses_pct: parseNum(o, 'expenses_pct', 'ExpensesPct'),
    taxes_pct: parseNum(o, 'taxes_pct', 'TaxesPct'),
    freight_pct: parseNum(o, 'freight_pct', 'FreightPct'),
    commission_pct: parseNum(o, 'commission_pct', 'CommissionPct'),
    discount_pct: parseNum(o, 'discount_pct', 'DiscountPct'),
    sales_table_code: parseNum(o, 'sales_table_code', 'SalesTableCode'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

// ─── Tabelas ────────────────────────────────────────────────────────────────

export async function listSalesTables(): Promise<SalesTableDTO[]> {
  const { data } = await httpClient.get(BASE);
  return unwrapArray(data).map(parseTable);
}
export async function getSalesTable(tableCode: number): Promise<SalesTableDTO> {
  const { data } = await httpClient.get(`${BASE}/${tableCode}`);
  return parseTable(data);
}
export async function createSalesTable(dto: SalesTableDTO): Promise<SalesTableDTO> {
  const { data } = await httpClient.post(BASE, dto);
  return parseTable(data);
}
export async function updateSalesTable(tableCode: number, dto: SalesTableDTO): Promise<SalesTableDTO> {
  const { data } = await httpClient.put(`${BASE}/${tableCode}`, dto);
  return parseTable(data);
}

// ─── Preços da tabela ─────────────────────────────────────────────────────────

export async function listSalesTablePrices(tableCode: number): Promise<SalesTablePriceDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${tableCode}/prices`);
  return unwrapArray(data).map(parsePrice);
}
export async function createSalesTablePrice(tableCode: number, dto: SalesTablePriceDTO): Promise<SalesTablePriceDTO> {
  const { data } = await httpClient.post(`${BASE}/${tableCode}/prices`, dto);
  return parsePrice(data);
}
export async function updateSalesTablePrice(dto: SalesTablePriceDTO & { id: number }): Promise<SalesTablePriceDTO> {
  const { data } = await httpClient.put(`${BASE}/prices`, dto);
  return parsePrice(data);
}
export async function deleteSalesTablePrice(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/prices/${id}`);
}
export async function listPriceHistory(tableCode: number, itemCode?: string): Promise<Obj[]> {
  const { data } = await httpClient.get(`${BASE}/${tableCode}/price-history`, { params: itemCode ? { item_code: itemCode } : undefined });
  return unwrapArray(data).map(unwrapObject);
}

// ─── Operações de preço ───────────────────────────────────────────────────────

/** Resolve o preço unitário da tabela vigente e o total bruto. */
export async function priceSalesItem(salesTableCode: number, itemCode: string, quantity: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/pricing`, { sales_table_code: salesTableCode, item_code: itemCode, quantity });
  return unwrapObject(data);
}
/** Calcula preço sugerido a partir de custo + margem/cargas (ou política). */
export async function formSalesPrice(req: PriceFormationRequest): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/price-formation`, req);
  return unwrapObject(data);
}
/** Gera preços em lote (upsert + histórico) por política/custo. */
export async function generateSalesTablePrices(salesTableCode: number, policyCode: number, itemCodes: string[], warehouseId?: number, reason?: string): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/generate-prices`, { sales_table_code: salesTableCode, policy_code: policyCode, item_codes: itemCodes, warehouse_id: warehouseId, reason });
  return unwrapObject(data);
}

// ─── Políticas de formação de preço ───────────────────────────────────────────

export async function listSalesPricePolicies(): Promise<SalesPricePolicyDTO[]> {
  const { data } = await httpClient.get(POLICY);
  return unwrapArray(data).map(parsePolicy);
}
export async function getSalesPricePolicy(code: number): Promise<SalesPricePolicyDTO> {
  const { data } = await httpClient.get(`${POLICY}/${code}`);
  return parsePolicy(data);
}
export async function createSalesPricePolicy(dto: SalesPricePolicyDTO): Promise<SalesPricePolicyDTO> {
  const { data } = await httpClient.post(POLICY, dto);
  return parsePolicy(data);
}
export async function updateSalesPricePolicy(code: number, dto: SalesPricePolicyDTO): Promise<SalesPricePolicyDTO> {
  const { data } = await httpClient.put(`${POLICY}/${code}`, dto);
  return parsePolicy(data);
}
