import { httpClient, parseNum, parseStr, unwrapArray, unwrapObject } from '@/services/fiscalShared';
import { parseExit, type FiscalExit } from '@/services/nfeService';

/**
 * Devolução de compra: NF-e de saída com finalidade 4, o CFOP de devolução da compra
 * (1101→5201, 1102→5202, 2102→6202...) e a nota
 * de entrada referenciada. Ao ser autorizada (VFIS0200 ou aqui mesmo), a
 * mercadoria sai do estoque pelo custo médio, o valor abate os títulos em aberto
 * da nota e o que sobrar vira crédito a receber do fornecedor.
 */

export interface DevolucaoItemPrevia {
  fiscal_entry_item_id: number;
  sequence: number;
  item_code?: number;
  descricao: string;
  uom?: string;
  quantidade: number;
  devolvida: number;
  disponivel: number;
  valor_unitario: number;
  cfop_devolucao: string;
}

/** Endereço do fornecedor lido do XML da nota; `faltando` é o que a NF-e exige e o XML não trouxe. */
export interface EnderecoDevolucao {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  codigo_municipio: string;
  cep: string;
  faltando: string[];
}

export interface DevolucaoPrevia {
  fiscal_entry_id: number;
  numero_nf: number;
  serie: string;
  fornecedor: string;
  status: string;
  chave_acesso?: string;
  itens: DevolucaoItemPrevia[];
  endereco: EnderecoDevolucao;
}

export interface DevolucaoPayload {
  fiscal_entry_id: number;
  data_emissao: string;
  serie?: string;
  natureza_operacao?: string;
  itens: Array<{ fiscal_entry_item_id: number; quantidade: number }>;
  dest_logradouro?: string;
  dest_numero?: string;
  dest_complemento?: string;
  dest_bairro?: string;
  dest_municipio?: string;
  dest_codigo_municipio?: string;
  dest_cep?: string;
}

export async function previaDevolucao(entradaId: number): Promise<DevolucaoPrevia> {
  const { data } = await httpClient.get(`/api/fiscal/entries/${entradaId}/devolucao`);
  const o = unwrapObject(data);
  const e = unwrapObject(o['endereco']);
  return {
    endereco: {
      logradouro: parseStr(e, 'logradouro'), numero: parseStr(e, 'numero'), complemento: parseStr(e, 'complemento'),
      bairro: parseStr(e, 'bairro'), municipio: parseStr(e, 'municipio'), codigo_municipio: parseStr(e, 'codigo_municipio'),
      cep: parseStr(e, 'cep'), faltando: unwrapArray(e['faltando']).map(String),
    },
    fiscal_entry_id: parseNum(o, 'fiscal_entry_id'),
    numero_nf: parseNum(o, 'numero_nf'),
    serie: parseStr(o, 'serie'),
    fornecedor: parseStr(o, 'fornecedor'),
    status: parseStr(o, 'status'),
    chave_acesso: parseStr(o, 'chave_acesso') || undefined,
    itens: unwrapArray(o['itens']).map(unwrapObject).map((i) => ({
      fiscal_entry_item_id: parseNum(i, 'fiscal_entry_item_id'),
      sequence: parseNum(i, 'sequence'),
      item_code: parseNum(i, 'item_code') || undefined,
      descricao: parseStr(i, 'descricao'),
      uom: parseStr(i, 'uom') || undefined,
      quantidade: parseNum(i, 'quantidade'),
      devolvida: parseNum(i, 'devolvida'),
      disponivel: parseNum(i, 'disponivel'),
      valor_unitario: parseNum(i, 'valor_unitario'),
      cfop_devolucao: parseStr(i, 'cfop_devolucao'),
    })),
  };
}

/** Cria a NF-e de devolução em rascunho; a autorização é a da NF-e de saída. */
export async function criarDevolucao(p: DevolucaoPayload): Promise<FiscalExit> {
  const { data } = await httpClient.post('/api/fiscal/devolucoes', p);
  return parseExit(data);
}

/** Refaz a efetivação de uma devolução autorizada cujo pós-SEFAZ falhou (estoque, títulos). */
export async function reprocessarDevolucao(exitId: number): Promise<FiscalExit> {
  const { data } = await httpClient.post(`/api/fiscal/devolucoes/${exitId}/efetivar`, {});
  return parseExit(data);
}
