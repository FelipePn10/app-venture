import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/customers/support/commercial-policies';

/**
 * Políticas Comerciais — `/api/customers/support/commercial-policies` (Comercial).
 *
 * Regras de desconto/acréscimo/frete/comissão aplicadas ao pedido. `kind` separa
 * o tipo (DISCOUNT/SURCHARGE/FREIGHT/COMMISSION); `evaluate` roda as políticas sobre
 * um contexto (valor, quantidade, cliente, item…) e devolve os valores + efeitos.
 * Linhas (faixas) e itens específicos refinam a política.
 */

export type PolicyKind = 'DISCOUNT' | 'SURCHARGE' | 'FREIGHT' | 'COMMISSION';
export type CalcType = 'PERCENT' | 'VALUE';
export type ChoiceType = 'INFORMATION' | 'CHOICE';

export interface CommercialPolicyDTO {
  code?: number;
  description: string;
  kind: PolicyKind;
  choice_type?: ChoiceType;
  calc_type?: CalcType;
  percent_value?: number;
  max_percent?: number;
  max_value?: number;
  min_gross_value?: number;
  min_quantity?: number;
  priority?: number;
  sequence?: number;
  stackable?: boolean;
  requires_approval?: boolean;
  applies_on_net_value?: boolean;
  allow_manual_change?: boolean;
  allow_higher_values?: boolean;
  used_in_commission?: boolean;
  applies_to_items?: boolean;
  subtract_commission_base?: boolean;
  data_types_json?: string[];
  commission_discount_mode?: string;
  customer_code?: number;
  item_code?: string;
  rule_json?: unknown;
  validity_start?: string;
  validity_end?: string;
  is_active?: boolean;
  observation?: string;
}

export interface CommercialPolicyLineDTO {
  id?: number;
  line_number?: number;
  sequence_number?: number;
  description?: string;
  calc_type?: CalcType;
  percent_value?: number;
  fixed_value?: number;
  min_value?: number;
  max_value?: number;
  variables_json?: Obj;
  validity_start?: string;
  validity_end?: string;
}

export interface CommercialPolicySpecificItemDTO {
  id?: number;
  item_code: string;
  item_mask?: string;
  item_classification?: string;
  block_discount?: boolean;
  block_surcharge?: boolean;
  ignore_item_policies?: boolean;
  block_manual_change?: boolean;
  validity_start?: string;
  validity_end?: string;
}

export interface EvaluateRequest {
  gross_value: number;
  quantity: number;
  customer_code?: number;
  sales_table_id?: number;
  payment_condition_id?: number;
  carrier_id?: number;
  item_code?: string;
  item_mask?: string;
  item_classification?: string;
}

function parsePolicy(raw: unknown): CommercialPolicyDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    kind: (parseStr(o, 'kind', 'Kind') || 'DISCOUNT') as PolicyKind,
    choice_type: (parseStr(o, 'choice_type', 'ChoiceType') || undefined) as ChoiceType | undefined,
    calc_type: (parseStr(o, 'calc_type', 'CalcType') || undefined) as CalcType | undefined,
    percent_value: parseNum(o, 'percent_value', 'PercentValue'),
    max_percent: parseNum(o, 'max_percent', 'MaxPercent'),
    max_value: parseNum(o, 'max_value', 'MaxValue'),
    min_gross_value: parseNum(o, 'min_gross_value', 'MinGrossValue'),
    min_quantity: parseNum(o, 'min_quantity', 'MinQuantity'),
    priority: parseNum(o, 'priority', 'Priority'),
    sequence: parseNum(o, 'sequence', 'Sequence'),
    stackable: parseBool(o, 'stackable', 'Stackable'),
    requires_approval: parseBool(o, 'requires_approval', 'RequiresApproval'),
    used_in_commission: parseBool(o, 'used_in_commission', 'UsedInCommission'),
    applies_to_items: parseBool(o, 'applies_to_items', 'AppliesToItems'),
    customer_code: parseNum(o, 'customer_code', 'CustomerCode') || undefined,
    item_code: parseStr(o, 'item_code', 'ItemCode') || undefined,
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

function parseLine(raw: unknown): CommercialPolicyLineDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    line_number: parseNum(o, 'line_number', 'LineNumber'),
    sequence_number: parseNum(o, 'sequence_number', 'SequenceNumber'),
    description: parseStr(o, 'description', 'Description') || undefined,
    calc_type: (parseStr(o, 'calc_type', 'CalcType') || undefined) as CalcType | undefined,
    percent_value: parseNum(o, 'percent_value', 'PercentValue'),
    fixed_value: parseNum(o, 'fixed_value', 'FixedValue'),
    min_value: parseNum(o, 'min_value', 'MinValue'),
    max_value: parseNum(o, 'max_value', 'MaxValue'),
  };
}

function parseSpecificItem(raw: unknown): CommercialPolicySpecificItemDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    item_mask: parseStr(o, 'item_mask', 'ItemMask') || undefined,
    item_classification: parseStr(o, 'item_classification', 'ItemClassification') || undefined,
    block_discount: parseBool(o, 'block_discount', 'BlockDiscount'),
    block_surcharge: parseBool(o, 'block_surcharge', 'BlockSurcharge'),
    ignore_item_policies: parseBool(o, 'ignore_item_policies', 'IgnoreItemPolicies'),
    block_manual_change: parseBool(o, 'block_manual_change', 'BlockManualChange'),
  };
}

// ─── Políticas ────────────────────────────────────────────────────────────────

export async function listCommercialPolicies(kind?: PolicyKind): Promise<CommercialPolicyDTO[]> {
  const { data } = await httpClient.get(BASE, { params: kind ? { kind } : undefined });
  return unwrapArray(data).map(parsePolicy);
}
export async function getCommercialPolicy(code: number): Promise<CommercialPolicyDTO> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parsePolicy(data);
}
export async function createCommercialPolicy(dto: CommercialPolicyDTO): Promise<CommercialPolicyDTO> {
  const { data } = await httpClient.post(BASE, dto);
  return parsePolicy(data);
}
export async function updateCommercialPolicy(code: number, dto: CommercialPolicyDTO): Promise<CommercialPolicyDTO> {
  const { data } = await httpClient.put(`${BASE}/${code}`, dto);
  return parsePolicy(data);
}

// ─── Linhas (faixas) ──────────────────────────────────────────────────────────

export async function listPolicyLines(code: number): Promise<CommercialPolicyLineDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${code}/lines`);
  return unwrapArray(data).map(parseLine);
}
export async function addPolicyLine(code: number, dto: CommercialPolicyLineDTO): Promise<CommercialPolicyLineDTO> {
  const { data } = await httpClient.post(`${BASE}/${code}/lines`, dto);
  return parseLine(data);
}

// ─── Itens específicos ────────────────────────────────────────────────────────

export async function listPolicySpecificItems(code: number): Promise<CommercialPolicySpecificItemDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${code}/specific-items`);
  return unwrapArray(data).map(parseSpecificItem);
}
export async function addPolicySpecificItem(code: number, dto: CommercialPolicySpecificItemDTO): Promise<CommercialPolicySpecificItemDTO> {
  const { data } = await httpClient.post(`${BASE}/${code}/specific-items`, dto);
  return parseSpecificItem(data);
}

// ─── Avaliação ────────────────────────────────────────────────────────────────

/** Roda as políticas sobre um contexto e devolve descontos/acréscimos/frete/comissão + efeitos. */
export async function evaluatePolicies(req: EvaluateRequest): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/evaluate`, req);
  return unwrapObject(data);
}
