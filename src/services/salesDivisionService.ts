import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

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

/** Divisão de Vendas (equipe/região/unidade) associável ao pedido. */
export interface SalesDivisionDTO {
  code: number;
  description: string;
  commercial_analysis?: DivisionAnalysis;
  financial_analysis?: DivisionAnalysis;
  consider_mrp?: boolean;
}

function parseDivision(raw: unknown): SalesDivisionDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    commercial_analysis: (parseStr(o, 'commercial_analysis', 'CommercialAnalysis') || undefined) as DivisionAnalysis | undefined,
    financial_analysis: (parseStr(o, 'financial_analysis', 'FinancialAnalysis') || undefined) as DivisionAnalysis | undefined,
    consider_mrp: o['consider_mrp'] === true || o['ConsiderMrp'] === true,
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
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseDivision(data);
}
export async function updateSalesDivision(code: number, dto: SalesDivisionDTO): Promise<SalesDivisionDTO> {
  const { data } = await httpClient.put(`${BASE}/${code}`, dto);
  return parseDivision(data);
}
export async function deleteSalesDivision(code: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}`);
}
