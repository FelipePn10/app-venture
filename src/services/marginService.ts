import { httpClient, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/**
 * Margem de contribuição — quanto sobra de cada venda depois de tudo.
 *
 * Equivale ao FCST0108 (parâmetros), FCST0254 (geração) e FCST0320 (apuração)
 * do FoccoERP. O que distingue esta apuração de "preço menos custo" é a despesa
 * financeira: a venda é recebida em 45 dias mas a matéria-prima foi paga em 30,
 * e esse descasamento tem custo — é por isso que um pedido com margem contábil
 * boa pode dar prejuízo no caixa.
 */
const BASE = '/api/margin';

export interface MarginParameters {
  ano: number;
  mes: number;
  ir_pct: number;
  admin_pct: number;
  freight_pct: number;
  financial_rate_monthly: number;
  avg_sales_term_days: number;
  avg_purchase_term_days: number;
  production_cycle_days: number;
  material_payment_days: number;
  labor_payment_days: number;
  ipi_payment_days: number;
  icms_payment_days: number;
  pis_payment_days: number;
  cofins_payment_days: number;
  /** Derivados pelo backend — mostrados para o usuário não refazer a conta. */
  cash_cycle_days?: number;
  real_financial_rate_pct?: number;
}

/** Base de custo usada na apuração; muda o número e fica gravada com ele. */
export const COST_BASES = [
  { value: 'PADRAO', label: 'Custo padrão — o que o produto deveria custar' },
  { value: 'MEDIO', label: 'Custo médio — o que a mercadoria custou de fato' },
] as const;

export interface MarginLine {
  source_id: number;
  source_item: number;
  issue_date: string;
  item_code?: number | null;
  quantity: number;
  cost_basis: string;
  faturamento_bruto: number;
  ipi: number;
  faturamento_mercadoria: number;
  icms: number;
  pis_cofins: number;
  custo_materia_prima: number;
  custo_transformacao: number;
  lucro_bruto: number;
  despesa_administrativa: number;
  comissao: number;
  frete: number;
  outros: number;
  despesa_financeira: number;
  provisao_ir: number;
  margem: number;
  margem_pct: number;
}

export interface MarginSummary {
  linhas_calculadas: number;
  faturamento_total: number;
  margem_total: number;
  margem_pct: number;
  linhas_com_prejuizo: number;
  cost_basis: string;
}

const PARAM_KEYS: (keyof MarginParameters)[] = [
  'ano', 'mes', 'ir_pct', 'admin_pct', 'freight_pct', 'financial_rate_monthly',
  'avg_sales_term_days', 'avg_purchase_term_days', 'production_cycle_days',
  'material_payment_days', 'labor_payment_days', 'ipi_payment_days',
  'icms_payment_days', 'pis_payment_days', 'cofins_payment_days',
  'cash_cycle_days', 'real_financial_rate_pct',
];

function parseParams(raw: unknown): MarginParameters | null {
  const o = unwrapObject(raw);
  if (!o || Object.keys(o).length === 0) return null;
  const out = {} as MarginParameters;
  for (const k of PARAM_KEYS) (out[k] as number) = parseNum(o, k);
  return out;
}

export async function getMarginParameters(ano: number, mes: number): Promise<MarginParameters | null> {
  const { data } = await httpClient.get(`${BASE}/parameters`, { params: { ano, mes } });
  return parseParams(data);
}

export async function listMarginParameters(ano: number): Promise<MarginParameters[]> {
  const { data } = await httpClient.get(`${BASE}/parameters/list`, { params: { ano } });
  return unwrapArray(data).map(parseParams).filter(Boolean) as MarginParameters[];
}

export async function saveMarginParameters(p: MarginParameters): Promise<MarginParameters | null> {
  const { data } = await httpClient.put(`${BASE}/parameters`, p);
  return parseParams(data);
}

export async function generateMargin(de: string, ate: string, base: string): Promise<MarginSummary> {
  const { data } = await httpClient.post(`${BASE}/generate`, {}, { params: { de, ate, base } });
  const o = unwrapObject(data);
  return {
    linhas_calculadas: parseNum(o, 'linhas_calculadas'),
    faturamento_total: parseNum(o, 'faturamento_total'),
    margem_total: parseNum(o, 'margem_total'),
    margem_pct: parseNum(o, 'margem_pct'),
    linhas_com_prejuizo: parseNum(o, 'linhas_com_prejuizo'),
    cost_basis: String(o['cost_basis'] ?? ''),
  };
}

export async function getMarginReport(
  de: string, ate: string, ordem: 'FATURAMENTO' | 'MARGEM',
  filtros: { item_code?: number; customer_code?: number } = {},
): Promise<MarginLine[]> {
  const { data } = await httpClient.get(`${BASE}/report`, { params: { de, ate, ordem, ...filtros } });
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    const n = (k: string) => parseNum(o, k);
    return {
      source_id: n('source_id'), source_item: n('source_item'),
      issue_date: String(o['issue_date'] ?? ''),
      item_code: n('item_code') || null,
      quantity: n('quantity'), cost_basis: String(o['cost_basis'] ?? ''),
      faturamento_bruto: n('faturamento_bruto'), ipi: n('ipi'),
      faturamento_mercadoria: n('faturamento_mercadoria'), icms: n('icms'),
      pis_cofins: n('pis_cofins'), custo_materia_prima: n('custo_materia_prima'),
      custo_transformacao: n('custo_transformacao'), lucro_bruto: n('lucro_bruto'),
      despesa_administrativa: n('despesa_administrativa'), comissao: n('comissao'),
      frete: n('frete'), outros: n('outros'), despesa_financeira: n('despesa_financeira'),
      provisao_ir: n('provisao_ir'), margem: n('margem'), margem_pct: n('margem_pct'),
    };
  });
}
