import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/financial/adiantamentos';

/**
 * Adiantamentos de clientes e fornecedores (VFIN0600).
 *
 * Um adiantamento é dinheiro que já mudou de mãos antes do título existir:
 * pagamento antecipado a fornecedor (PAGAR) ou recebimento antecipado de cliente
 * (RECEBER). O movimento de caixa acontece na hora do registro; o SALDO fica
 * disponível para ser aplicado depois em um ou mais títulos.
 *
 * ⚠️ Antes desta versão a tela era um formulário JSON genérico: a pessoa digitava
 * o corpo da requisição à mão. Não havia lista de saldos, nem escolha de conta
 * bancária, nem como saber em qual título aplicar.
 */

export const ADIANTAMENTO_TIPOS = ['PAGAR', 'RECEBER'] as const;
export type AdiantamentoTipo = (typeof ADIANTAMENTO_TIPOS)[number];

/** O que cada tipo significa na operação — "PAGAR" sozinho não diz nada. */
export const ADIANTAMENTO_TIPO_LABELS: Record<AdiantamentoTipo, string> = {
  PAGAR: 'Pago a fornecedor (adiantamento de compra)',
  RECEBER: 'Recebido de cliente (adiantamento de venda)',
};

export const ADIANTAMENTO_STATUS = ['ABERTO', 'PARCIAL', 'QUITADO', 'CANCELADO'] as const;
export type AdiantamentoStatus = (typeof ADIANTAMENTO_STATUS)[number];

export const ADIANTAMENTO_STATUS_LABELS: Record<AdiantamentoStatus, string> = {
  ABERTO: 'Saldo integral disponível',
  PARCIAL: 'Saldo usado em parte',
  QUITADO: 'Saldo todo aplicado',
  CANCELADO: 'Cancelado',
};

export interface Adiantamento {
  id: number;
  tipo: AdiantamentoTipo;
  /** Cliente (RECEBER) ou fornecedor (PAGAR). */
  parceiro_id?: number;
  conta_bancaria_id: number;
  numero_documento?: string;
  data_adiantamento: string;
  valor_original: number;
  valor_utilizado: number;
  /** O que ainda pode ser aplicado em títulos. */
  saldo: number;
  status: AdiantamentoStatus;
  descricao?: string;
  is_active: boolean;
}

export interface AdiantamentoDTO {
  tipo: AdiantamentoTipo;
  parceiro_id?: number;
  conta_bancaria_id: number;
  numero_documento?: string;
  data_adiantamento: string;
  valor_original: number;
  descricao?: string;
}

/** Aplicação de um saldo de adiantamento sobre um título. */
export interface AplicarAdiantamentoDTO {
  conta_tipo: 'PAGAR' | 'RECEBER';
  conta_id: number;
  valor: number;
  data_aplicacao?: string;
}

function parseAdiantamento(raw: unknown): Adiantamento {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    tipo: (parseStr(o, 'tipo', 'Tipo') || 'PAGAR') as AdiantamentoTipo,
    parceiro_id: parseNum(o, 'parceiro_id', 'ParceiroID') || undefined,
    conta_bancaria_id: parseNum(o, 'conta_bancaria_id', 'ContaBancariaID'),
    numero_documento: parseStr(o, 'numero_documento', 'NumeroDocumento') || undefined,
    data_adiantamento: parseStr(o, 'data_adiantamento', 'DataAdiantamento'),
    valor_original: parseNum(o, 'valor_original', 'ValorOriginal'),
    valor_utilizado: parseNum(o, 'valor_utilizado', 'ValorUtilizado'),
    saldo: parseNum(o, 'saldo', 'Saldo'),
    status: (parseStr(o, 'status', 'Status') || 'ABERTO') as AdiantamentoStatus,
    descricao: parseStr(o, 'descricao', 'Descricao') || undefined,
    is_active: o['is_active'] !== false && o['IsActive'] !== false,
  };
}

export async function listAdiantamentos(filtros?: { tipo?: AdiantamentoTipo; parceiro_id?: number }): Promise<Adiantamento[]> {
  const params: Record<string, string> = {};
  if (filtros?.tipo) params.tipo = filtros.tipo;
  if (filtros?.parceiro_id) params.parceiro_id = String(filtros.parceiro_id);
  const { data } = await httpClient.get(`${BASE}/list`, { params: Object.keys(params).length ? params : undefined });
  return unwrapArray(data).map(parseAdiantamento);
}

export async function getAdiantamento(id: number): Promise<Adiantamento> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return parseAdiantamento(data);
}

export async function createAdiantamento(dto: AdiantamentoDTO): Promise<Adiantamento> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseAdiantamento(data);
}

/**
 * Aplica parte (ou todo) o saldo do adiantamento sobre um título. O tipo do título
 * acompanha o tipo do adiantamento: saldo pago a fornecedor abate conta a PAGAR;
 * saldo recebido de cliente abate conta a RECEBER. Cruzar os dois abateria a
 * dívida de um com o crédito de outro.
 */
export async function aplicarAdiantamento(id: number, dto: AplicarAdiantamentoDTO): Promise<unknown> {
  const { data } = await httpClient.post(`${BASE}/${id}/aplicar`, dto);
  return data;
}

/** O título que um adiantamento pode abater: mesmo lado da operação. */
export function tipoDeTituloDoAdiantamento(tipo: AdiantamentoTipo): 'PAGAR' | 'RECEBER' {
  return tipo === 'PAGAR' ? 'PAGAR' : 'RECEBER';
}
