import { httpClient } from '@/services/fiscalShared';

/** Simulação de tributação: o mesmo cálculo da NF-e, sem gravar nada. */
export interface SimulacaoItemInput {
  /** Código do item como aparece na tela (o comercial). */
  item_code?: string;
  ncm?: string;
  origem_mercadoria?: string;
  quantidade: number;
  valor_unitario: number;
}

export interface SimulacaoInput {
  customer_code?: number;
  sales_order_code?: number;
  uf_destino?: string;
  ie_destinatario?: string;
  tipo_pessoa?: string;
  finalidade_compra?: string;
  invoice_type_id?: number;
  cfop?: string;
  valor_frete?: number;
  valor_desconto?: number;
  itens: SimulacaoItemInput[];
}

export interface SimulacaoLinha {
  sequencia: number;
  /** Código do item como aparece na tela. */
  item_code?: string;
  ncm: string;
  origem_mercadoria: string;
  valor_produtos: number;
  regra_icms_ipi_id?: number;
  cst_icms: string;
  base_icms: number;
  aliq_icms_pct: number;
  valor_icms: number;
  icms_reducao_base_pct: number;
  icms_diferimento_pct: number;
  valor_icms_diferido: number;
  mva_pct: number;
  base_icms_st: number;
  aliq_icms_st_pct: number;
  valor_icms_st: number;
  cst_ipi: string;
  aliq_ipi_pct: number;
  valor_ipi: number;
  cst_pis: string;
  aliq_pis_pct: number;
  valor_pis: number;
  cst_cofins: string;
  aliq_cofins_pct: number;
  valor_cofins: number;
  valor_difal: number;
  valor_fcp_uf_dest: number;
  aliq_credito_simples_pct: number;
  valor_credito_simples: number;
  notas: string[];
}

export interface SimulacaoResultado {
  regime: string;
  uf_origem: string;
  uf_destino: string;
  tipo_destinatario: string;
  finalidade_compra?: string;
  origem_finalidade: string;
  consumidor_final: boolean;
  tipo_nota?: string;
  exige_regra: boolean;
  itens: SimulacaoLinha[];
  totais: {
    base_icms: number; valor_icms: number; valor_icms_diferido: number; base_icms_st: number; valor_icms_st: number;
    valor_ipi: number; valor_pis: number; valor_cofins: number; valor_difal: number; valor_fcp_uf_dest: number;
  };
  valor_total_nota: number;
  pendencias: { nivel: 'IMPEDE' | 'ATENCAO'; mensagem: string }[];
}

/** No fiscal (VFIS0325) usa a rota do módulo Fiscal; no comercial, a do pedido. */
export async function simularTributacao(input: SimulacaoInput, modulo: 'fiscal' | 'comercial' = 'fiscal'): Promise<SimulacaoResultado> {
  const path = modulo === 'fiscal' ? '/api/fiscal/tributacao/simular' : '/api/sales-order/tributacao/simular';
  const { data } = await httpClient.post<SimulacaoResultado>(path, input);
  return { ...data, itens: data.itens ?? [], pendencias: data.pendencias ?? [] };
}
