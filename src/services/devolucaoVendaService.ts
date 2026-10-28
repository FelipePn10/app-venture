import { httpClient } from '@/services/fiscalShared';

// Devolução de venda (Fase 5.1): nasce da NF de saída autorizada; efetiva pela
// NF-e de entrada da empresa (emissão própria) ou pela NF do cliente.
const BASE = '/api/devolucoes-venda';
type Num = string | number;

export type ModoDevolucao = 'EMISSAO_PROPRIA' | 'NF_CLIENTE';
export type SituacaoDevolucao = 'RASCUNHO' | 'EMITIDA' | 'EFETIVADA' | 'CANCELADA';
export const ROTULO_MODO: Record<ModoDevolucao, string> = { EMISSAO_PROPRIA: 'NF-e de entrada da empresa', NF_CLIENTE: 'NF de devolução do cliente' };
export const ROTULO_SITUACAO_DEV: Record<SituacaoDevolucao, string> = { RASCUNHO: 'Rascunho', EMITIDA: 'NF-e autorizada', EFETIVADA: 'Efetivada', CANCELADA: 'Cancelada' };
export const MOTIVOS_DEVOLUCAO: Record<string, string> = {
  DEFEITO: 'Defeito', AVARIA_TRANSPORTE: 'Avaria no transporte', ERRO_PEDIDO: 'Erro no pedido', DESISTENCIA: 'Desistência do cliente', GARANTIA: 'Garantia', OUTROS: 'Outros',
};

export interface SerieDaNota { id: number; numero: string }
export interface LinhaDevolvivel {
  fiscal_exit_item_id: number; sequencia: number; item_code?: string; descricao: string; cfop: string; quantidade: Num; devolvida: Num; disponivel: Num;
  valor_unitario: Num; controla_serie: boolean; series: SerieDaNota[];
}
export interface PreviaDevolucao { fiscal_exit_id: number; numero_nf: number; customer_code?: number; linhas: LinhaDevolvivel[] }
export interface ItemDevolucao { id: number; fiscal_exit_item_id: number; item_code?: string; descricao?: string; cfop?: string; quantidade: Num; valor_produtos: Num; valor_icms: Num; valor_ipi: Num; valor_total: Num; series: number[]; custo_unitario?: Num }
export interface DevolucaoVenda {
  id: number; numero: number; fiscal_exit_id: number; numero_nf: number; customer_code?: number; cliente_nome?: string; modo: ModoDevolucao; situacao: SituacaoDevolucao;
  motivo: string; observacao?: string; warehouse_id: number; nf_cliente_chave?: string; nf_propria_id?: number; nf_propria_status?: string;
  valor_total: Num; abatido: Num; credito_cliente: Num; adiantamento_id?: number; efetivada_em?: string; cancelada_em?: string; created_at: string; itens: ItemDevolucao[];
}

export async function previaDevolucao(nota: number): Promise<PreviaDevolucao> {
  const { data } = await httpClient.get(`${BASE}/previa`, { params: { nota } });
  return data as PreviaDevolucao;
}
export async function criarDevolucao(dto: {
  fiscal_exit_id: number; modo: ModoDevolucao; motivo: string; observacao?: string; warehouse_id: number; nf_cliente_chave?: string;
  itens: { fiscal_exit_item_id: number; quantidade: string; series?: number[] }[];
}): Promise<DevolucaoVenda> {
  const { data } = await httpClient.post(BASE, dto);
  return data as DevolucaoVenda;
}
export async function listarDevolucoes(f: { nota?: number; situacao?: string } = {}): Promise<DevolucaoVenda[]> {
  const params: Record<string, string> = {};
  if (f.nota) params.nota = String(f.nota);
  if (f.situacao) params.situacao = f.situacao;
  const { data } = await httpClient.get(BASE, { params });
  return (data ?? []) as DevolucaoVenda[];
}
export async function obterDevolucao(id: number): Promise<DevolucaoVenda> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return data as DevolucaoVenda;
}
export async function gerarNFDevolucao(id: number): Promise<DevolucaoVenda> {
  const { data } = await httpClient.post(`${BASE}/${id}/nf`, {});
  return data as DevolucaoVenda;
}
export async function efetivarDevolucao(id: number): Promise<{ devolucao: DevolucaoVenda; avisos: string[] }> {
  const { data } = await httpClient.post(`${BASE}/${id}/efetivar`, {});
  return data as { devolucao: DevolucaoVenda; avisos: string[] };
}
export async function cancelarDevolucao(id: number, motivo: string): Promise<DevolucaoVenda> {
  const { data } = await httpClient.post(`${BASE}/${id}/cancelamento`, { motivo });
  return data as DevolucaoVenda;
}
