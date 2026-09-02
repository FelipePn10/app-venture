import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/sales-division';

/**
 * Análise comercial/financeira (enum `sales_division_analysis_enum`). Opcional —
 * omitido/vazio assume `FREE` (default da coluna).
 */
export type DivisionAnalysis = 'FREE' | 'BLOCK_ALWAYS' | 'ALWAYS_ANALYZE';
export const DIVISION_ANALYSIS: { value: DivisionAnalysis; label: string }[] = [
  { value: 'FREE', label: 'Livre (sem análise/bloqueio)' },
  { value: 'BLOCK_ALWAYS', label: 'Bloqueia sempre' },
  { value: 'ALWAYS_ANALYZE', label: 'Sempre analisa' },
];

/**
 * Divisão de Vendas (equipe/região/unidade) associável ao pedido/orçamento.
 *
 * ATENÇÃO: o `PUT` do backend regrava a divisão inteira a partir do corpo
 * enviado — campos ausentes voltam ao zero-value. Por isso o DTO carrega o
 * registro completo e a tela edita sobre a cópia devolvida pela API.
 */
export interface SalesDivisionDTO {
  id?: number;
  code: number;
  description: string;
  commercial_analysis?: DivisionAnalysis;
  financial_analysis?: DivisionAnalysis;
  is_technical_assistance?: boolean;
  consider_delivery_promise?: boolean;
  consider_mrp?: boolean;
  allow_outside_limits?: boolean;
  /**
   * Permite condição de pagamento diferente da cadastrada no cliente. Sem esse
   * indicador o orçamento (VVND0300) recusa a troca da condição de pagamento.
   */
  allow_free_payment_terms?: boolean;
  minimum_delivery_days?: number;
  financial_delay_days?: number;
  pis_percentage?: number;
  cofins_percentage?: number;
  parent_division_id?: number;
  is_active?: boolean;
}

function parseDivision(raw: unknown): SalesDivisionDTO {
  const o = unwrapObject(raw);
  const parentID = parseNum(o, 'parent_division_id', 'ParentDivisionID');
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    commercial_analysis: (parseStr(o, 'commercial_analysis', 'CommercialAnalysis') || undefined) as DivisionAnalysis | undefined,
    financial_analysis: (parseStr(o, 'financial_analysis', 'FinancialAnalysis') || undefined) as DivisionAnalysis | undefined,
    is_technical_assistance: parseBool(o, 'is_technical_assistance', 'IsTechnicalAssistance'),
    consider_delivery_promise: parseBool(o, 'consider_delivery_promise', 'ConsiderDeliveryPromise'),
    consider_mrp: parseBool(o, 'consider_mrp', 'ConsiderMRP', 'ConsiderMrp'),
    allow_outside_limits: parseBool(o, 'allow_outside_limits', 'AllowOutsideLimits'),
    allow_free_payment_terms: parseBool(o, 'allow_free_payment_terms', 'AllowFreePaymentTerms'),
    minimum_delivery_days: parseNum(o, 'minimum_delivery_days', 'MinimumDeliveryDays'),
    financial_delay_days: parseNum(o, 'financial_delay_days', 'FinancialDelayDays'),
    pis_percentage: parseNum(o, 'pis_percentage', 'PISPercentage'),
    cofins_percentage: parseNum(o, 'cofins_percentage', 'CofinsPercentage'),
    parent_division_id: parentID || undefined,
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

/** Monta o corpo completo esperado pelo backend (evita zerar campos no PUT). */
function toBody(dto: SalesDivisionDTO): Obj {
  return {
    code: dto.code,
    description: dto.description,
    commercial_analysis: dto.commercial_analysis ?? 'FREE',
    financial_analysis: dto.financial_analysis ?? 'FREE',
    is_technical_assistance: !!dto.is_technical_assistance,
    consider_delivery_promise: !!dto.consider_delivery_promise,
    consider_mrp: !!dto.consider_mrp,
    allow_outside_limits: !!dto.allow_outside_limits,
    allow_free_payment_terms: !!dto.allow_free_payment_terms,
    minimum_delivery_days: dto.minimum_delivery_days ?? 0,
    financial_delay_days: dto.financial_delay_days ?? 0,
    pis_percentage: dto.pis_percentage ?? 0,
    cofins_percentage: dto.cofins_percentage ?? 0,
    parent_division_id: dto.parent_division_id || undefined,
  };
}

export async function listSalesDivisions(): Promise<SalesDivisionDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list`);
  return unwrapArray(data).map(parseDivision);
}
export async function getSalesDivision(code: number): Promise<SalesDivisionDTO> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parseDivision(data);
}
export async function createSalesDivision(dto: SalesDivisionDTO): Promise<SalesDivisionDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, toBody(dto));
  return parseDivision(data);
}
export async function updateSalesDivision(code: number, dto: SalesDivisionDTO): Promise<SalesDivisionDTO> {
  const { data } = await httpClient.put(`${BASE}/${code}`, toBody(dto));
  return parseDivision(data);
}
export async function deleteSalesDivision(code: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}`);
}
export async function setSalesDivisionStatus(code: number, isActive: boolean): Promise<SalesDivisionDTO> {
  const { data } = await httpClient.patch(`${BASE}/${code}/status`, { is_active: isActive });
  return parseDivision(data);
}
