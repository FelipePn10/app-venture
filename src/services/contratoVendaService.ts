import { httpClient } from '@/services/fiscalShared';

// Contrato de venda (Fase 5.2): itens com quantidade e preço fixados, teto de
// valor, vigência, programação e pedidos de chamada que consomem o saldo.
const BASE = '/api/contratos-venda';
type Num = string | number;

export type SituacaoContrato = 'RASCUNHO' | 'ATIVO' | 'ENCERRADO' | 'CANCELADO';
export const ROTULO_SITUACAO_CONTRATO: Record<SituacaoContrato, string> = { RASCUNHO: 'Rascunho', ATIVO: 'Ativo', ENCERRADO: 'Encerrado', CANCELADO: 'Cancelado' };
export interface ItemContrato { id: number; item_code: string; item_nome?: string; quantidade: Num; preco_unitario: Num; consumido: Num; saldo: Num }
export interface ParcelaContrato { id: number; contrato_item_id: number; item_code: string; data_prevista: string; quantidade: Num; sales_order_code?: number }
export interface ContratoVenda {
  id: number; numero: number; customer_code: number; cliente_nome?: string; descricao: string; vigencia_inicio: string; vigencia_fim: string;
  valor_contratado?: Num; valor_consumido: Num; situacao: SituacaoContrato; alerta_saldo_pct: number; alerta_dias: number; payment_term_code?: number;
  observacao?: string; motivo_encerramento?: string; created_at: string; itens: ItemContrato[]; programacao: ParcelaContrato[];
}

export async function listarContratos(f: { cliente?: number; situacao?: string } = {}): Promise<ContratoVenda[]> {
  const params: Record<string, string> = {};
  if (f.cliente) params.cliente = String(f.cliente);
  if (f.situacao) params.situacao = f.situacao;
  const { data } = await httpClient.get(BASE, { params });
  return (data ?? []) as ContratoVenda[];
}
export async function criarContrato(dto: {
  customer_code: number; descricao: string; vigencia_inicio: string; vigencia_fim: string; valor_contratado?: string; alerta_saldo_pct?: number; alerta_dias?: number;
  payment_term_code?: number; observacao?: string; itens: { item_code: string; quantidade: string; preco_unitario: string }[];
}): Promise<ContratoVenda> {
  const { data } = await httpClient.post(BASE, dto);
  return data as ContratoVenda;
}
export async function obterContrato(id: number): Promise<ContratoVenda> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return data as ContratoVenda;
}
export async function mudarSituacaoContrato(id: number, situacao: SituacaoContrato, motivo = ''): Promise<ContratoVenda> {
  const { data } = await httpClient.post(`${BASE}/${id}/situacao`, { situacao, motivo });
  return data as ContratoVenda;
}
export async function programarContrato(id: number, dto: { contrato_item_id: number; data: string; quantidade: string }): Promise<ContratoVenda> {
  const { data } = await httpClient.post(`${BASE}/${id}/programacao`, dto);
  return data as ContratoVenda;
}
export async function removerParcelaContrato(id: number, parcela: number): Promise<ContratoVenda> {
  const { data } = await httpClient.delete(`${BASE}/${id}/programacao/${parcela}`);
  return data as ContratoVenda;
}
export async function chamarContrato(id: number, dto: { data_entrega: string; linhas: { contrato_item_id: number; quantidade: string; parcela_id?: number }[] }) {
  const { data } = await httpClient.post(`${BASE}/${id}/chamadas`, dto);
  return data as { sales_order_code: number; order_number: number; total: Num; contrato: ContratoVenda };
}
