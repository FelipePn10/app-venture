import { httpClient, parseNum, parseStr, unwrapArray, unwrapObject } from '@/services/fiscalShared';
import { type FiscalExit } from '@/services/nfeService';

/**
 * NF-e de saída a partir do pedido de venda. O pedido não vira nota ao ser
 * registrado: quando chega a hora, o faturamento lê o pedido — cliente,
 * endereço, itens, preço negociado, frete, condição de pagamento,
 * representante e comissão — e monta a nota com o que ainda falta faturar
 * (total ou parcial). A nota nasce em rascunho e segue pela prévia/autorização.
 */

export interface PedidoItemParaFaturar {
  sales_order_item_code: number;
  sequence: number;
  item_code: number;
  item_name: string;
  ncm?: string;
  uom?: string;
  origem: string;
  quantidade_pedida: number;
  quantidade_cancelada: number;
  quantidade_faturada: number;
  quantidade_em_nota: number;
  quantidade_pendente: number;
  preco_unitario: number;
  desconto_pct: number;
  ipi_pct: number;
  valor_pendente: number;
}

export interface PedidoParaFaturar {
  sales_order_code: number;
  order_number: number;
  status: string;
  emission_date: string;
  customer_code?: number;
  customer_name: string;
  customer_document: string;
  customer_ie?: string;
  customer_uf?: string;
  customer_city?: string;
  endereco_completo: boolean;
  representative_code?: number;
  representative_name?: string;
  commission_pct: number;
  comissoes: Array<{ representative_code: number; representative_name: string; papel: string; commission_pct: number }>;
  payment_term_code?: number;
  payment_term_descricao?: string;
  freight_type?: string;
  freight_value: number;
  insurance_value: number;
  discount_value: number;
  cfop_sugerido: string;
  natureza_sugerida: string;
  itens: PedidoItemParaFaturar[];
  valor_pendente: number;
  impedimentos: string[];
  pode_faturar: boolean;
  notas_do_pedido: Array<{ id: number; numero_nf: number; status: string; valor_total: number }>;
}

export async function previaFaturamentoPedido(code: number): Promise<PedidoParaFaturar> {
  const { data } = await httpClient.get(`/api/fiscal/exits/sales-order/${code}/previa`);
  const o = unwrapObject(data);
  return {
    sales_order_code: parseNum(o, 'sales_order_code'),
    order_number: parseNum(o, 'order_number'),
    status: parseStr(o, 'status'),
    emission_date: parseStr(o, 'emission_date'),
    customer_code: parseNum(o, 'customer_code') || undefined,
    customer_name: parseStr(o, 'customer_name'),
    customer_document: parseStr(o, 'customer_document'),
    customer_ie: parseStr(o, 'customer_ie') || undefined,
    customer_uf: parseStr(o, 'customer_uf') || undefined,
    customer_city: parseStr(o, 'customer_city') || undefined,
    endereco_completo: Boolean(o['endereco_completo']),
    representative_code: parseNum(o, 'representative_code') || undefined,
    representative_name: parseStr(o, 'representative_name') || undefined,
    commission_pct: parseNum(o, 'commission_pct'),
    comissoes: unwrapArray(o['comissoes']).map(unwrapObject).map((c) => ({
      representative_code: parseNum(c, 'representative_code'),
      representative_name: parseStr(c, 'representative_name'),
      papel: parseStr(c, 'papel'),
      commission_pct: parseNum(c, 'commission_pct'),
    })),
    payment_term_code: parseNum(o, 'payment_term_code') || undefined,
    payment_term_descricao: parseStr(o, 'payment_term_descricao') || undefined,
    freight_type: parseStr(o, 'freight_type') || undefined,
    freight_value: parseNum(o, 'freight_value'),
    insurance_value: parseNum(o, 'insurance_value'),
    discount_value: parseNum(o, 'discount_value'),
    cfop_sugerido: parseStr(o, 'cfop_sugerido'),
    natureza_sugerida: parseStr(o, 'natureza_sugerida'),
    itens: unwrapArray(o['itens']).map(unwrapObject).map((i) => ({
      sales_order_item_code: parseNum(i, 'sales_order_item_code'),
      sequence: parseNum(i, 'sequence'),
      item_code: parseNum(i, 'item_code'),
      item_name: parseStr(i, 'item_name'),
      ncm: parseStr(i, 'ncm') || undefined,
      uom: parseStr(i, 'uom') || undefined,
      origem: parseStr(i, 'origem'),
      quantidade_pedida: parseNum(i, 'quantidade_pedida'),
      quantidade_cancelada: parseNum(i, 'quantidade_cancelada'),
      quantidade_faturada: parseNum(i, 'quantidade_faturada'),
      quantidade_em_nota: parseNum(i, 'quantidade_em_nota'),
      quantidade_pendente: parseNum(i, 'quantidade_pendente'),
      preco_unitario: parseNum(i, 'preco_unitario'),
      desconto_pct: parseNum(i, 'desconto_pct'),
      ipi_pct: parseNum(i, 'ipi_pct'),
      valor_pendente: parseNum(i, 'valor_pendente'),
    })),
    valor_pendente: parseNum(o, 'valor_pendente'),
    impedimentos: unwrapArray(o['impedimentos']).map((x) => String(x)),
    pode_faturar: Boolean(o['pode_faturar']),
    notas_do_pedido: unwrapArray(o['notas_do_pedido']).map(unwrapObject).map((n) => ({
      id: parseNum(n, 'id'), numero_nf: parseNum(n, 'numero_nf'), status: parseStr(n, 'status'), valor_total: parseNum(n, 'valor_total'),
    })),
  };
}

export interface FaturarPedidoPayload {
  sales_order_code: number;
  data_emissao: string;
  data_saida?: string;
  serie: string;
  cfop: string;
  natureza_operacao: string;
  valor_frete?: number;
  valor_seguro?: number;
  valor_desconto?: number;
  itens?: Array<{ sales_order_item_code: number; quantidade: number }>;
}

export async function faturarPedido(payload: FaturarPedidoPayload): Promise<FiscalExit> {
  const { data } = await httpClient.post('/api/fiscal/exits/from-sales-order', payload);
  const o = unwrapObject(data);
  return {
    id: parseNum(o, 'id'),
    numero_nf: parseNum(o, 'numero_nf'),
    serie: parseStr(o, 'serie'),
    status: parseStr(o, 'status'),
    valor_total: parseNum(o, 'valor_total'),
    cnpj_destinatario: parseStr(o, 'cnpj_destinatario'),
    razao_social_destinatario: parseStr(o, 'razao_social_destinatario'),
    data_emissao: parseStr(o, 'data_emissao'),
    valor_icms: parseNum(o, 'valor_icms'),
    valor_ipi: parseNum(o, 'valor_ipi'),
    valor_pis: parseNum(o, 'valor_pis'),
    valor_cofins: parseNum(o, 'valor_cofins'),
  };
}
