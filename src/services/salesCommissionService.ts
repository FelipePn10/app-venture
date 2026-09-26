import { httpClient, parseStr, parseNum, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Rateio de comissão do pedido e do orçamento de venda.
 *
 * A capa dos dois documentos tem UM representante e UM percentual. Na prática a
 * venda é dividida — o representante da região e o parceiro que trouxe o
 * cliente — e o percentual muda de documento para documento. O backend atende os
 * dois documentos com as mesmas regras (`/api/sales-order/{code}/representatives`
 * e `/api/sales-quotation/{code}/representatives`), e é por isso que o serviço é
 * um só: exatamente um principal, sem representante repetido, soma até 100% e
 * representante ativo e vinculado à empresa. O principal continua espelhado na
 * capa, para nenhum relatório antigo mudar de resposta.
 */

const optStr = (o: Obj, ...keys: string[]) => parseStr(o, ...keys) || undefined;
const optNum = (o: Obj, ...keys: string[]) => parseNum(o, ...keys) || undefined;

/** Papéis do rateio: um principal e os demais parceiros. */
export const COMMISSION_ROLES = [
  { value: 'PRINCIPAL', label: 'Representante principal' },
  { value: 'PARCEIRO', label: 'Parceiro' },
] as const;

/**
 * Base de incidência. Comissão sobre o total líquido inclui frete e acréscimos
 * da capa; sobre o total dos produtos, não. A base fica gravada na linha para a
 * conta poder ser auditada depois.
 */
export const COMMISSION_BASES = [
  { value: 'TOTAL_PRODUTOS', label: 'Total dos produtos' },
  { value: 'TOTAL_LIQUIDO', label: 'Total líquido do documento' },
] as const;

export const MAX_COMMISSION_REPRESENTATIVES = 5;

export interface RateioComissaoLinhaDTO {
  id?: number;
  representative_code: number;
  representative_name?: string;
  role: string;
  role_label?: string;
  commission_pct: number;
  commission_base: string;
  commission_base_label?: string;
  /** Calculado pelo backend a partir da base da própria linha. */
  commission_value?: number;
  notes?: string;
}

export interface RateioComissaoDTO {
  document_code: number;
  total_produtos: number;
  total_liquido: number;
  total_pct: number;
  total_valor: number;
  representatives: RateioComissaoLinhaDTO[];
}

function parseRateioLinha(raw: unknown): RateioComissaoLinhaDTO {
  const o = unwrapObject(raw);
  return {
    id: optNum(o, 'id', 'ID'),
    representative_code: parseNum(o, 'representative_code', 'RepresentativeCode'),
    representative_name: optStr(o, 'representative_name', 'RepresentativeName'),
    role: parseStr(o, 'role', 'Role'),
    role_label: optStr(o, 'role_label', 'RoleLabel'),
    commission_pct: parseNum(o, 'commission_pct', 'CommissionPct'),
    commission_base: parseStr(o, 'commission_base', 'CommissionBase'),
    commission_base_label: optStr(o, 'commission_base_label', 'CommissionBaseLabel'),
    commission_value: parseNum(o, 'commission_value', 'CommissionValue'),
    notes: optStr(o, 'notes', 'Notes'),
  };
}

export function parseRateioComissao(raw: unknown): RateioComissaoDTO {
  const o = unwrapObject(raw);
  const linhas = o['representatives'] ?? o['Representantes'];
  return {
    document_code: parseNum(o, 'document_code', 'DocumentCode'),
    total_produtos: parseNum(o, 'total_produtos', 'TotalProdutos'),
    total_liquido: parseNum(o, 'total_liquido', 'TotalLiquido'),
    total_pct: parseNum(o, 'total_pct', 'TotalPct'),
    total_valor: parseNum(o, 'total_valor', 'TotalValor'),
    representatives: Array.isArray(linhas) ? linhas.map(parseRateioLinha) : [],
  };
}

export async function getQuotationCommissionSplit(code: number): Promise<RateioComissaoDTO> {
  const { data } = await httpClient.get(`/api/sales-quotation/${code}/representatives`);
  return parseRateioComissao(data);
}

/**
 * Substitui o rateio inteiro. O backend exige exatamente um principal, sem
 * representante repetido, soma até 100% e representante ativo e vinculado à
 * empresa; o principal é espelhado na capa do documento.
 */
export async function saveQuotationCommissionSplit(code: number, linhas: RateioComissaoLinhaDTO[]): Promise<RateioComissaoDTO> {
  const { data } = await httpClient.put(`/api/sales-quotation/${code}/representatives`, {
    representatives: linhas.map((l) => ({
      representative_code: l.representative_code,
      role: l.role,
      commission_pct: l.commission_pct,
      commission_base: l.commission_base,
      notes: l.notes || undefined,
    })),
  });
  return parseRateioComissao(data);
}

export async function getSalesOrderCommissionSplit(code: number): Promise<RateioComissaoDTO> {
  const { data } = await httpClient.get(`/api/sales-order/${code}/representatives`);
  return parseRateioComissao(data);
}

export async function saveSalesOrderCommissionSplit(code: number, linhas: RateioComissaoLinhaDTO[]): Promise<RateioComissaoDTO> {
  const { data } = await httpClient.put(`/api/sales-order/${code}/representatives`, {
    representatives: linhas.map((l) => ({
      representative_code: l.representative_code,
      role: l.role,
      commission_pct: l.commission_pct,
      commission_base: l.commission_base,
      notes: l.notes || undefined,
    })),
  });
  return parseRateioComissao(data);
}
