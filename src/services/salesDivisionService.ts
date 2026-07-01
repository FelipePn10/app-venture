import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/sales-division';

/** Divisão de Vendas (equipe/região/unidade) associável ao pedido. */
export interface SalesDivisionDTO {
  code: number;
  description: string;
  /**
   * Análise comercial — campo exigido pelo backend mas com enum NÃO documentado
   * (nenhum valor testado foi aceito). Preencher quando o valor válido for
   * conhecido; ver lacuna nos docs do projeto.
   */
  commercial_analysis?: string;
}

function parseDivision(raw: unknown): SalesDivisionDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    commercial_analysis: parseStr(o, 'commercial_analysis', 'CommercialAnalysis') || undefined,
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
