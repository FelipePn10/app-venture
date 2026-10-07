import { httpClient, parseBool, parseNum, parseStr, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Frete sobre compras: o CT-e da transportadora que trouxe a mercadoria. Ligado
 * às NF-e de entrada que transportou, é rateado entre os itens; ao ser lançado
 * complementa o custo do estoque, gera o título da transportadora e contabiliza.
 */

const BASE = '/api/fiscal/fretes';

export type FreteStatus = 'PENDENTE' | 'LANCADO' | 'CANCELADO' | string;
export type TipoRateioFrete = 'VALOR' | 'QUANTIDADE' | 'PESO';

export const ROTULO_RATEIO: Record<TipoRateioFrete, string> = {
  VALOR: 'Pelo valor dos itens',
  QUANTIDADE: 'Pela quantidade',
  PESO: 'Pelo peso',
};

export interface FreteNota {
  fiscal_entry_id: number;
  numero_nf: number;
  serie: string;
  emitente: string;
  valor_total: number;
  status: string;
  chave_acesso?: string;
}

export interface FreteAlocacao {
  fiscal_entry_id: number;
  fiscal_entry_item_id: number;
  item_code?: number;
  descricao: string;
  valor: number;
  valor_estoque: number;
  valor_despesa: number;
}

export interface Frete {
  id: number;
  chave_cte?: string;
  numero: number;
  serie: string;
  data_emissao: string;
  cnpj_transportadora: string;
  nome_transportadora: string;
  uf_transportadora?: string;
  supplier_code?: number;
  supplier_name?: string;
  cfop?: string;
  valor_frete: number;
  base_icms: number;
  aliq_icms: number;
  valor_icms: number;
  credita_icms: boolean;
  /** O que vai ao custo: frete menos o ICMS creditado. */
  custo_frete: number;
  tipo_rateio: TipoRateioFrete;
  data_vencimento: string;
  status: FreteStatus;
  conta_pagar_id?: number;
  observacao?: string;
  lancado_em?: string;
  cancelado_em?: string;
  cancel_reason?: string;
  notas: FreteNota[];
  alocacoes: FreteAlocacao[];
}

export interface FretePayload {
  supplier_code?: number;
  chave_cte?: string;
  numero: number;
  serie: string;
  data_emissao: string;
  cnpj_transportadora: string;
  nome_transportadora: string;
  uf_transportadora?: string;
  cfop?: string;
  valor_frete: number;
  base_icms: number;
  aliq_icms: number;
  valor_icms: number;
  credita_icms: boolean;
  tipo_rateio: TipoRateioFrete;
  data_vencimento: string;
  observacao?: string;
  notas_ids: number[];
}

const optStr = (o: Obj, k: string): string | undefined => parseStr(o, k) || undefined;
const optNum = (o: Obj, k: string): number | undefined => parseNum(o, k) || undefined;

export function parseFrete(raw: unknown): Frete {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id'),
    chave_cte: optStr(o, 'chave_cte'),
    numero: parseNum(o, 'numero'),
    serie: parseStr(o, 'serie'),
    data_emissao: parseStr(o, 'data_emissao').slice(0, 10),
    cnpj_transportadora: parseStr(o, 'cnpj_transportadora'),
    nome_transportadora: parseStr(o, 'nome_transportadora'),
    uf_transportadora: optStr(o, 'uf_transportadora'),
    supplier_code: optNum(o, 'supplier_code'),
    supplier_name: optStr(o, 'supplier_name'),
    cfop: optStr(o, 'cfop'),
    valor_frete: parseNum(o, 'valor_frete'),
    base_icms: parseNum(o, 'base_icms'),
    aliq_icms: parseNum(o, 'aliq_icms'),
    valor_icms: parseNum(o, 'valor_icms'),
    credita_icms: parseBool(o, 'credita_icms'),
    custo_frete: parseNum(o, 'custo_frete'),
    tipo_rateio: (parseStr(o, 'tipo_rateio') || 'VALOR') as TipoRateioFrete,
    data_vencimento: parseStr(o, 'data_vencimento').slice(0, 10),
    status: parseStr(o, 'status'),
    conta_pagar_id: optNum(o, 'conta_pagar_id'),
    observacao: optStr(o, 'observacao'),
    lancado_em: optStr(o, 'lancado_em'),
    cancelado_em: optStr(o, 'cancelado_em'),
    cancel_reason: optStr(o, 'cancel_reason'),
    notas: unwrapArray(o['notas']).map(unwrapObject).map((n) => ({
      fiscal_entry_id: parseNum(n, 'fiscal_entry_id'),
      numero_nf: parseNum(n, 'numero_nf'),
      serie: parseStr(n, 'serie'),
      emitente: parseStr(n, 'emitente'),
      valor_total: parseNum(n, 'valor_total'),
      status: parseStr(n, 'status'),
      chave_acesso: optStr(n, 'chave_acesso'),
    })),
    alocacoes: unwrapArray(o['alocacoes']).map(unwrapObject).map((a) => ({
      fiscal_entry_id: parseNum(a, 'fiscal_entry_id'),
      fiscal_entry_item_id: parseNum(a, 'fiscal_entry_item_id'),
      item_code: optNum(a, 'item_code'),
      descricao: parseStr(a, 'descricao'),
      valor: parseNum(a, 'valor'),
      valor_estoque: parseNum(a, 'valor_estoque'),
      valor_despesa: parseNum(a, 'valor_despesa'),
    })),
  };
}

/** Payload de edição a partir de um frete gravado (para trocar notas, rateio ou vencimento). */
export function payloadDoFrete(f: Frete): FretePayload {
  return {
    supplier_code: f.supplier_code,
    chave_cte: f.chave_cte,
    numero: f.numero,
    serie: f.serie,
    data_emissao: f.data_emissao,
    cnpj_transportadora: f.cnpj_transportadora,
    nome_transportadora: f.nome_transportadora,
    uf_transportadora: f.uf_transportadora,
    cfop: f.cfop,
    valor_frete: f.valor_frete,
    base_icms: f.base_icms,
    aliq_icms: f.aliq_icms,
    valor_icms: f.valor_icms,
    credita_icms: f.credita_icms,
    tipo_rateio: f.tipo_rateio,
    data_vencimento: f.data_vencimento,
    observacao: f.observacao,
    notas_ids: f.notas.map((n) => n.fiscal_entry_id),
  };
}

export async function listarFretes(status = ''): Promise<Frete[]> {
  const { data } = await httpClient.get(BASE, { params: status ? { status } : {} });
  return unwrapArray(data).map(parseFrete);
}

export async function obterFrete(id: number): Promise<Frete> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return parseFrete(data);
}

export async function criarFrete(p: FretePayload): Promise<Frete> {
  const { data } = await httpClient.post(BASE, p);
  return parseFrete(data);
}

export async function atualizarFrete(id: number, p: FretePayload): Promise<Frete> {
  const { data } = await httpClient.put(`${BASE}/${id}`, p);
  return parseFrete(data);
}

/** Importa o XML do CT-e: as notas de entrada citadas no CT-e já vêm ligadas. */
export async function importarFreteXml(arquivo: File, opcoes: { data_vencimento?: string; tipo_rateio?: TipoRateioFrete } = {}): Promise<Frete> {
  const form = new FormData();
  form.append('file', arquivo, arquivo.name);
  if (opcoes.data_vencimento) form.append('data_vencimento', opcoes.data_vencimento);
  if (opcoes.tipo_rateio) form.append('tipo_rateio', opcoes.tipo_rateio);
  const { data } = await httpClient.post(`${BASE}/upload-xml`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
  return parseFrete(data);
}

export async function lancarFrete(id: number): Promise<Frete> {
  const { data } = await httpClient.post(`${BASE}/${id}/lancar`, {});
  return parseFrete(data);
}

export async function cancelarFrete(id: number, motivo: string): Promise<Frete> {
  const { data } = await httpClient.post(`${BASE}/${id}/cancelar`, { motivo });
  return parseFrete(data);
}
