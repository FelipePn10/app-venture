import { httpClient, parseNum, parseStr, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';
import { downloadResponse } from '@/services/fileDownload';

/**
 * NF-e de ENTRADA como documento completo: o que veio do XML, a conciliação de
 * cada item com o cadastro, o plano de contas por item e as parcelas com a
 * distribuição financeira por plano de contas.
 *
 * É o mesmo desenho dos ERPs de mercado: o XML do fornecedor vira uma
 * pré-nota; os itens são ligados ao cadastro pelo vínculo produto × fornecedor
 * (o "de/para", que fica memorizado para a próxima nota); cada item recebe a
 * sua natureza/plano; e o contas a pagar nasce por duplicata, com o rateio por
 * plano de contas ("múltiplas naturezas").
 */

const BASE = '/api/fiscal/entries';

export type EntradaStatus = 'PENDING' | 'CONFERRED' | 'APPROVED' | 'WRITTEN_OFF' | 'CANCELLED' | string;

export interface EntradaItem {
  id: number;
  sequence: number;
  item_code?: number;
  item_name?: string;
  item_uom?: string;
  item_supplier_id?: number;
  supplier_item_code?: string;
  resolution_strategy?: string;
  description?: string;
  uom?: string;
  ncm?: string;
  cest?: string;
  ean?: string;
  cfop: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  valor_frete: number;
  valor_seguro: number;
  valor_desconto: number;
  valor_outras: number;
  valor_icms: number;
  aliq_icms: number;
  base_icms: number;
  valor_ipi: number;
  valor_icms_st: number;
  valor_pis: number;
  valor_cofins: number;
  cst_icms?: string;
  cst_ipi?: string;
  valor_contabil: number;
  fator_conversao?: number;
  quantidade_estoque?: number;
  pedido_compra_xml?: string;
  plano_contas_id?: number;
  plano_contas_codigo?: string;
  plano_contas_nome?: string;
  centro_custo_id?: number;
  centro_custo_nome?: string;
  // Operação de entrada (TES), estoque e pedido de compra (3-way).
  cfop_entrada?: string;
  entry_operation_code?: number;
  entry_operation_name?: string;
  movimenta_estoque: boolean;
  gera_financeiro: boolean;
  warehouse_id?: number;
  warehouse_name?: string;
  purchase_order_code?: number;
  purchase_order_item_code?: number;
  /** Número do pedido de compra e linha, como o comprador conhece. */
  purchase_order_number?: number;
  purchase_order_sequence?: number;
  qtd_recebida_antes?: number;
  stock_movement_id?: number;
  custo_aquisicao: number;
  item_ncm?: string;
  gera_credito_icms: boolean;
  gera_credito_ipi: boolean;
  gera_credito_pis: boolean;
  gera_credito_cofins: boolean;
  // Reforma tributária (IBS/CBS/IS).
  cst_ibscbs?: string;
  valor_ibs: number;
  valor_cbs: number;
  valor_is: number;
  gera_credito_ibscbs: boolean;
}

export interface EntradaRetencao {
  tipo: string;
  descricao: string;
  valor: number;
  vencimento: string;
}

export interface EntradaDivergencia {
  nivel: 'IMPEDE' | 'ATENCAO';
  item?: number;
  tipo: string;
  mensagem: string;
  esperado?: string;
  informado?: string;
}

export interface EntradaAlocacao {
  plano_contas_id: number;
  centro_custo_id?: number;
  valor: number;
}

export interface EntradaParcela {
  id?: number;
  numero: number;
  documento?: string;
  data_vencimento: string;
  valor: number;
  forma_pagamento?: string;
  origem?: string;
  conta_pagar_id?: number;
  distribuicao: EntradaAlocacao[];
}

export interface EntradaTotalConta {
  plano_contas_id: number;
  plano_contas_codigo?: string;
  plano_contas_nome?: string;
  centro_custo_id?: number;
  centro_custo_nome?: string;
  valor: number;
  percentual: number;
}

export interface EntradaPendencia {
  nivel: 'IMPEDE' | 'ATENCAO';
  campo: string;
  mensagem: string;
}

export interface EntradaDocumento {
  id: number;
  chave_acesso?: string;
  numero_nf: number;
  serie: string;
  modelo: string;
  data_emissao: string;
  data_entrada: string;
  cnpj_emitente: string;
  razao_social_emitente: string;
  ie_emitente?: string;
  uf_emitente?: string;
  cnpj_destinatario?: string;
  natureza_operacao?: string;
  protocolo?: string;
  supplier_code?: number;
  supplier_name?: string;
  purchase_order_code?: number;
  valor_produtos: number;
  valor_frete: number;
  valor_seguro: number;
  valor_desconto: number;
  valor_outras: number;
  valor_ipi: number;
  valor_icms: number;
  valor_icms_st: number;
  valor_pis: number;
  valor_cofins: number;
  valor_total: number;
  modalidade_frete?: string;
  informacoes_complementares?: string;
  sem_pagamento: boolean;
  status: EntradaStatus;
  itens: EntradaItem[];
  parcelas: EntradaParcela[];
  totais_por_conta: EntradaTotalConta[];
  pendencias: EntradaPendencia[];
  pode_aprovar: boolean;
  itens_conciliados: number;
  itens_classificados: number;
  warnings: string[];
  entry_operation_code?: number;
  base_ibscbs: number;
  valor_ibs: number;
  valor_cbs: number;
  valor_is: number;
  valor_ret_pis: number;
  valor_ret_cofins: number;
  valor_ret_csll: number;
  valor_irrf: number;
  valor_ret_prev: number;
  valor_iss_ret: number;
  total_retencoes: number;
  /** Total da nota menos as retenções: é o que o fornecedor recebe. */
  valor_a_pagar: number;
  /** PENDENTE, CONCLUIDO, NAO_APLICA ou ESTORNADO. */
  stock_status?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  retencoes: EntradaRetencao[];
  divergencias: EntradaDivergencia[];
}

const optNum = (o: Obj, ...k: string[]): number | undefined => {
  const v = parseNum(o, ...k);
  return v ? v : undefined;
};
const optStr = (o: Obj, ...k: string[]): string | undefined => parseStr(o, ...k) || undefined;

function parseItem(raw: unknown): EntradaItem {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id'),
    sequence: parseNum(o, 'sequence'),
    item_code: optNum(o, 'item_code'),
    item_name: optStr(o, 'item_name'),
    item_uom: optStr(o, 'item_uom'),
    item_supplier_id: optNum(o, 'item_supplier_id'),
    supplier_item_code: optStr(o, 'supplier_item_code'),
    resolution_strategy: optStr(o, 'resolution_strategy'),
    description: optStr(o, 'description'),
    uom: optStr(o, 'uom'),
    ncm: optStr(o, 'ncm'),
    cest: optStr(o, 'cest'),
    ean: optStr(o, 'ean'),
    cfop: parseStr(o, 'cfop'),
    quantity: parseNum(o, 'quantity'),
    unit_price: parseNum(o, 'unit_price'),
    total_price: parseNum(o, 'total_price'),
    valor_frete: parseNum(o, 'valor_frete'),
    valor_seguro: parseNum(o, 'valor_seguro'),
    valor_desconto: parseNum(o, 'valor_desconto'),
    valor_outras: parseNum(o, 'valor_outras'),
    valor_icms: parseNum(o, 'valor_icms'),
    aliq_icms: parseNum(o, 'aliq_icms'),
    base_icms: parseNum(o, 'base_icms'),
    valor_ipi: parseNum(o, 'valor_ipi'),
    valor_icms_st: parseNum(o, 'valor_icms_st'),
    valor_pis: parseNum(o, 'valor_pis'),
    valor_cofins: parseNum(o, 'valor_cofins'),
    cst_icms: optStr(o, 'cst_icms'),
    cst_ipi: optStr(o, 'cst_ipi'),
    valor_contabil: parseNum(o, 'valor_contabil'),
    fator_conversao: optNum(o, 'fator_conversao'),
    quantidade_estoque: optNum(o, 'quantidade_estoque'),
    pedido_compra_xml: optStr(o, 'pedido_compra_xml'),
    plano_contas_id: optNum(o, 'plano_contas_id'),
    plano_contas_codigo: optStr(o, 'plano_contas_codigo'),
    plano_contas_nome: optStr(o, 'plano_contas_nome'),
    centro_custo_id: optNum(o, 'centro_custo_id'),
    centro_custo_nome: optStr(o, 'centro_custo_nome'),
    cfop_entrada: optStr(o, 'cfop_entrada'),
    entry_operation_code: optNum(o, 'entry_operation_code'),
    entry_operation_name: optStr(o, 'entry_operation_name'),
    movimenta_estoque: o['movimenta_estoque'] !== false,
    gera_financeiro: o['gera_financeiro'] !== false,
    warehouse_id: optNum(o, 'warehouse_id'),
    warehouse_name: optStr(o, 'warehouse_name'),
    purchase_order_code: optNum(o, 'purchase_order_code'),
    purchase_order_item_code: optNum(o, 'purchase_order_item_code'),
    purchase_order_number: optNum(o, 'purchase_order_number'),
    purchase_order_sequence: optNum(o, 'purchase_order_sequence'),
    qtd_recebida_antes: optNum(o, 'qtd_recebida_antes'),
    stock_movement_id: optNum(o, 'stock_movement_id'),
    custo_aquisicao: parseNum(o, 'custo_aquisicao'),
    item_ncm: optStr(o, 'item_ncm'),
    gera_credito_icms: Boolean(o['gera_credito_icms']),
    gera_credito_ipi: Boolean(o['gera_credito_ipi']),
    gera_credito_pis: Boolean(o['gera_credito_pis']),
    gera_credito_cofins: Boolean(o['gera_credito_cofins']),
    cst_ibscbs: optStr(o, 'cst_ibscbs'),
    valor_ibs: parseNum(o, 'valor_ibs'),
    valor_cbs: parseNum(o, 'valor_cbs'),
    valor_is: parseNum(o, 'valor_is'),
    gera_credito_ibscbs: Boolean(o['gera_credito_ibscbs']),
  };
}

export function parseEntradaDocumento(raw: unknown): EntradaDocumento {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id'),
    chave_acesso: optStr(o, 'chave_acesso'),
    numero_nf: parseNum(o, 'numero_nf'),
    serie: parseStr(o, 'serie'),
    modelo: parseStr(o, 'modelo'),
    data_emissao: parseStr(o, 'data_emissao').slice(0, 10),
    data_entrada: parseStr(o, 'data_entrada').slice(0, 10),
    cnpj_emitente: parseStr(o, 'cnpj_emitente'),
    razao_social_emitente: parseStr(o, 'razao_social_emitente'),
    ie_emitente: optStr(o, 'ie_emitente'),
    uf_emitente: optStr(o, 'uf_emitente'),
    cnpj_destinatario: optStr(o, 'cnpj_destinatario'),
    natureza_operacao: optStr(o, 'natureza_operacao'),
    protocolo: optStr(o, 'protocolo'),
    supplier_code: optNum(o, 'supplier_code'),
    supplier_name: optStr(o, 'supplier_name'),
    purchase_order_code: optNum(o, 'purchase_order_code'),
    valor_produtos: parseNum(o, 'valor_produtos'),
    valor_frete: parseNum(o, 'valor_frete'),
    valor_seguro: parseNum(o, 'valor_seguro'),
    valor_desconto: parseNum(o, 'valor_desconto'),
    valor_outras: parseNum(o, 'valor_outras'),
    valor_ipi: parseNum(o, 'valor_ipi'),
    valor_icms: parseNum(o, 'valor_icms'),
    valor_icms_st: parseNum(o, 'valor_icms_st'),
    valor_pis: parseNum(o, 'valor_pis'),
    valor_cofins: parseNum(o, 'valor_cofins'),
    valor_total: parseNum(o, 'valor_total'),
    modalidade_frete: optStr(o, 'modalidade_frete'),
    informacoes_complementares: optStr(o, 'informacoes_complementares'),
    sem_pagamento: Boolean(o['sem_pagamento']),
    status: parseStr(o, 'status'),
    itens: unwrapArray(o['itens']).map(parseItem),
    parcelas: unwrapArray(o['parcelas']).map(unwrapObject).map((p) => ({
      id: optNum(p, 'id'),
      numero: parseNum(p, 'numero'),
      documento: optStr(p, 'documento'),
      data_vencimento: parseStr(p, 'data_vencimento').slice(0, 10),
      valor: parseNum(p, 'valor'),
      forma_pagamento: optStr(p, 'forma_pagamento'),
      origem: optStr(p, 'origem'),
      conta_pagar_id: optNum(p, 'conta_pagar_id'),
      distribuicao: unwrapArray(p['distribuicao']).map(unwrapObject).map((a) => ({
        plano_contas_id: parseNum(a, 'plano_contas_id'),
        centro_custo_id: optNum(a, 'centro_custo_id'),
        valor: parseNum(a, 'valor'),
      })),
    })),
    totais_por_conta: unwrapArray(o['totais_por_conta']).map(unwrapObject).map((t) => ({
      plano_contas_id: parseNum(t, 'plano_contas_id'),
      plano_contas_codigo: optStr(t, 'plano_contas_codigo'),
      plano_contas_nome: optStr(t, 'plano_contas_nome'),
      centro_custo_id: optNum(t, 'centro_custo_id'),
      centro_custo_nome: optStr(t, 'centro_custo_nome'),
      valor: parseNum(t, 'valor'),
      percentual: parseNum(t, 'percentual'),
    })),
    pendencias: unwrapArray(o['pendencias']).map(unwrapObject).map((p) => ({
      nivel: (parseStr(p, 'nivel') === 'IMPEDE' ? 'IMPEDE' : 'ATENCAO') as 'IMPEDE' | 'ATENCAO',
      campo: parseStr(p, 'campo'),
      mensagem: parseStr(p, 'mensagem'),
    })),
    pode_aprovar: Boolean(o['pode_aprovar']),
    itens_conciliados: parseNum(o, 'itens_conciliados'),
    itens_classificados: parseNum(o, 'itens_classificados'),
    warnings: unwrapArray(o['warnings']).map((w) => String(w)),
    entry_operation_code: optNum(o, 'entry_operation_code'),
    base_ibscbs: parseNum(o, 'base_ibscbs'),
    valor_ibs: parseNum(o, 'valor_ibs'),
    valor_cbs: parseNum(o, 'valor_cbs'),
    valor_is: parseNum(o, 'valor_is'),
    valor_ret_pis: parseNum(o, 'valor_ret_pis'),
    valor_ret_cofins: parseNum(o, 'valor_ret_cofins'),
    valor_ret_csll: parseNum(o, 'valor_ret_csll'),
    valor_irrf: parseNum(o, 'valor_irrf'),
    valor_ret_prev: parseNum(o, 'valor_ret_prev'),
    valor_iss_ret: parseNum(o, 'valor_iss_ret'),
    total_retencoes: parseNum(o, 'total_retencoes'),
    // Resposta antiga (sem o campo): o valor a pagar é o total da nota.
    valor_a_pagar: o['valor_a_pagar'] === undefined ? parseNum(o, 'valor_total') : parseNum(o, 'valor_a_pagar'),
    stock_status: optStr(o, 'stock_status'),
    cancelled_at: optStr(o, 'cancelled_at'),
    cancel_reason: optStr(o, 'cancel_reason'),
    retencoes: unwrapArray(o['retencoes']).map(unwrapObject).map((r) => ({
      tipo: parseStr(r, 'tipo'),
      descricao: parseStr(r, 'descricao'),
      valor: parseNum(r, 'valor'),
      vencimento: parseStr(r, 'vencimento').slice(0, 10),
    })),
    divergencias: unwrapArray(o['divergencias']).map(unwrapObject).map((d) => ({
      nivel: (parseStr(d, 'nivel') === 'IMPEDE' ? 'IMPEDE' : 'ATENCAO') as 'IMPEDE' | 'ATENCAO',
      item: optNum(d, 'item'),
      tipo: parseStr(d, 'tipo'),
      mensagem: parseStr(d, 'mensagem'),
      esperado: optStr(d, 'esperado'),
      informado: optStr(d, 'informado'),
    })),
  };
}

export async function getEntradaDocumento(id: number): Promise<EntradaDocumento> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return parseEntradaDocumento(data);
}

export interface UploadXmlResultado {
  arquivo: string;
  entrada?: EntradaDocumento;
  erro?: string;
}

/**
 * Envia os ARQUIVOS XML (não o texto). Cada arquivo é uma nota: um XML com
 * problema no lote não impede os outros, e a resposta diz o que houve com cada
 * um. Os arquivos vão em lotes para caber no limite de tamanho da API.
 */
export async function uploadEntradaXml(arquivos: File[], opcoes: { data_entrada?: string; purchase_order_code?: number } = {}): Promise<UploadXmlResultado[]> {
  const resultados: UploadXmlResultado[] = [];
  const LOTE = 15;
  for (let i = 0; i < arquivos.length; i += LOTE) {
    const form = new FormData();
    for (const f of arquivos.slice(i, i + LOTE)) form.append('files', f, f.name);
    if (opcoes.data_entrada) form.append('data_entrada', opcoes.data_entrada);
    if (opcoes.purchase_order_code) form.append('purchase_order_code', String(opcoes.purchase_order_code));
    try {
      const { data } = await httpClient.post(`${BASE}/upload-xml`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      resultados.push(...parseResultadosUpload(data));
    } catch (e) {
      // 422 com o corpo de resultados = nenhum arquivo do lote entrou.
      const corpo = (e as { response?: { data?: unknown } })?.response?.data;
      const lidos = corpo ? parseResultadosUpload(corpo) : [];
      if (lidos.length) { resultados.push(...lidos); continue; }
      throw e;
    }
  }
  return resultados;
}

function parseResultadosUpload(data: unknown): UploadXmlResultado[] {
  const o = unwrapObject(data);
  return unwrapArray(o['resultados']).map(unwrapObject).map((r) => ({
    arquivo: parseStr(r, 'arquivo'),
    entrada: r['entrada'] ? parseEntradaDocumento(r['entrada']) : undefined,
    erro: optStr(r, 'erro'),
  }));
}

export async function importarEntradaPorChave(chave: string): Promise<EntradaDocumento> {
  const { data } = await httpClient.post(`${BASE}/import-key`, { chave_acesso: chave });
  return parseEntradaDocumento(data);
}

export interface ConciliacaoItemPayload {
  id: number;
  item_code?: number;
  plano_contas_id?: number;
  centro_custo_id?: number;
  lembrar_vinculo?: boolean;
  fator_conversao?: number;
  entry_operation_code?: number;
  warehouse_id?: number;
  /** Linha do pedido de compra; 0 desfaz o vínculo. */
  purchase_order_item_code?: number;
  /** CFOP de entrada informado à mão (prevalece sobre o calculado). */
  cfop_entrada?: string;
}

export interface ConciliacaoPayload {
  itens: ConciliacaoItemPayload[];
  entry_operation_code?: number;
  purchase_order_code?: number;
  parcelas?: Array<{
    numero: number;
    documento?: string;
    data_vencimento: string;
    valor: number;
    forma_pagamento?: string;
    distribuicao?: EntradaAlocacao[];
  }>;
  recalcular_distribuicao?: boolean;
}

export async function salvarConciliacao(id: number, payload: ConciliacaoPayload): Promise<EntradaDocumento> {
  const { data } = await httpClient.put(`${BASE}/${id}/conciliacao`, payload);
  return parseEntradaDocumento(data);
}

export async function aprovarEntrada(id: number): Promise<EntradaDocumento> {
  const { data } = await httpClient.post(`${BASE}/${id}/approve`, {});
  return parseEntradaDocumento(data);
}

/**
 * Cancela a nota. Aprovada, estorna tudo numa transação: títulos (recusa se
 * algum já foi pago), estoque (recusa se o material já foi consumido), pedido
 * de compra, créditos fiscais e contabilidade.
 */
export async function cancelarEntrada(id: number, motivo: string): Promise<EntradaDocumento> {
  const { data } = await httpClient.post(`${BASE}/${id}/cancelar`, { motivo });
  return parseEntradaDocumento(data);
}

export interface LinhaPedidoCompra {
  code: number;
  purchase_order_code: number;
  order_number: number;
  sequence: number;
  item_code: number;
  status: string;
  requested_qty: number;
  received_qty: number;
  invoiced_qty: number;
  saldo_a_faturar: number;
  unit_price: number;
  fator_estoque: number;
  warehouse_id?: number;
}

/** Linhas de pedido de compra em aberto do fornecedor para o item da nota. */
export async function listarPedidosDoItem(entradaId: number, itemId: number, itemCode?: number): Promise<LinhaPedidoCompra[]> {
  const { data } = await httpClient.get(`${BASE}/${entradaId}/itens/${itemId}/pedidos`, { params: itemCode ? { item_code: itemCode } : undefined });
  return unwrapArray(data).map(unwrapObject).map((l) => ({
    code: parseNum(l, 'code'),
    purchase_order_code: parseNum(l, 'purchase_order_code'),
    order_number: parseNum(l, 'order_number'),
    sequence: parseNum(l, 'sequence'),
    item_code: parseNum(l, 'item_code'),
    status: parseStr(l, 'status'),
    requested_qty: parseNum(l, 'requested_qty'),
    received_qty: parseNum(l, 'received_qty'),
    invoiced_qty: parseNum(l, 'invoiced_qty'),
    saldo_a_faturar: parseNum(l, 'saldo_a_faturar'),
    unit_price: parseNum(l, 'unit_price'),
    fator_estoque: parseNum(l, 'fator_estoque') || 1,
    warehouse_id: optNum(l, 'warehouse_id'),
  }));
}

export interface SugestaoItem {
  item_code: number;
  name: string;
  uom?: string;
  ncm?: string;
  score: number;
  motivo: string;
  is_active: boolean;
}

export async function sugerirItens(entradaId: number, itemId: number, q = ''): Promise<SugestaoItem[]> {
  const { data } = await httpClient.get(`${BASE}/${entradaId}/itens/${itemId}/sugestoes`, { params: q ? { q } : undefined });
  return unwrapArray(data).map(unwrapObject).map((s) => ({
    item_code: parseNum(s, 'item_code'),
    name: parseStr(s, 'name'),
    uom: optStr(s, 'uom'),
    ncm: optStr(s, 'ncm'),
    score: parseNum(s, 'score'),
    motivo: parseStr(s, 'motivo'),
    is_active: s['is_active'] !== false,
  }));
}

export async function baixarXmlEntrada(id: number, numero: number): Promise<void> {
  const resp = await httpClient.get(`${BASE}/${id}/xml`, { responseType: 'blob' });
  downloadResponse(resp.data as Blob, resp.headers as Record<string, unknown>, `nfe-entrada-${numero}.xml`);
}

// ─── Notas recebidas na SEFAZ (distribuição DF-e) ────────────────────────────

/**
 * Caixa de entrada fiscal: as NF-e emitidas contra o CNPJ da empresa, que a
 * SEFAZ distribui (via Focus NF-e) mesmo sem o fornecedor mandar o XML. Daqui
 * a nota é manifestada (ciência, confirmação, desconhecimento, operação não
 * realizada) e importada como nota de entrada.
 */
export type TipoManifestacao = 'ciencia' | 'confirmacao' | 'desconhecimento' | 'nao_realizada';

export const ROTULO_MANIFESTACAO: Record<string, string> = {
  ciencia: 'Ciência da operação',
  confirmacao: 'Confirmação da operação',
  desconhecimento: 'Desconhecimento da operação',
  nao_realizada: 'Operação não realizada',
};

export interface NFeRecebida {
  chave_acesso: string;
  cnpj_emitente: string;
  nome_emitente: string;
  numero_nf?: number;
  serie?: string;
  data_emissao?: string;
  valor_total: number;
  situacao: string;
  manifestacao?: string;
  xml_completo: boolean;
  fiscal_entry_id?: number;
  synced_at?: string;
  /** Prazo da manifestação conclusiva (emissão + 180 dias), quando ainda falta. */
  prazo_manifestacao?: string;
  dias_para_prazo?: number;
  alerta_prazo: boolean;
}

export interface StatusRecebidas {
  automatico: boolean;
  sincronizado_em?: string;
  ultima_tentativa?: string;
  ultimo_erro?: string;
  prazo_proximo: number;
  prazo_vencido: number;
  intervalo_minutos: number;
  alerta_prazo_dias: number;
}

const RECEBIDAS = '/api/fiscal/recebidas';

export async function statusRecebidas(): Promise<StatusRecebidas> {
  const { data } = await httpClient.get(`${RECEBIDAS}/status`);
  const o = unwrapObject(data);
  return {
    automatico: Boolean(o['automatico']),
    sincronizado_em: optStr(o, 'sincronizado_em'),
    ultima_tentativa: optStr(o, 'ultima_tentativa'),
    ultimo_erro: optStr(o, 'ultimo_erro'),
    prazo_proximo: parseNum(o, 'prazo_proximo'),
    prazo_vencido: parseNum(o, 'prazo_vencido'),
    intervalo_minutos: parseNum(o, 'intervalo_minutos') || 60,
    alerta_prazo_dias: parseNum(o, 'alerta_prazo_dias') || 30,
  };
}

export async function definirSincronizacaoAutomatica(ativo: boolean): Promise<void> {
  await httpClient.put(`${RECEBIDAS}/automatico`, { ativo });
}

export async function listarRecebidas(opcoes: { pendentes?: boolean; prazo?: boolean; q?: string } = {}): Promise<NFeRecebida[]> {
  const params: Record<string, string> = {};
  if (opcoes.pendentes) params.pendentes = '1';
  if (opcoes.prazo) params.prazo = '1';
  if (opcoes.q?.trim()) params.q = opcoes.q.trim();
  const { data } = await httpClient.get(RECEBIDAS, { params });
  return unwrapArray(data).map(unwrapObject).map((r) => ({
    chave_acesso: parseStr(r, 'chave_acesso'),
    cnpj_emitente: parseStr(r, 'cnpj_emitente'),
    nome_emitente: parseStr(r, 'nome_emitente'),
    numero_nf: optNum(r, 'numero_nf'),
    serie: optStr(r, 'serie'),
    data_emissao: optStr(r, 'data_emissao'),
    valor_total: parseNum(r, 'valor_total'),
    situacao: parseStr(r, 'situacao'),
    manifestacao: optStr(r, 'manifestacao'),
    xml_completo: Boolean(r['xml_completo']),
    fiscal_entry_id: optNum(r, 'fiscal_entry_id'),
    synced_at: optStr(r, 'synced_at'),
    prazo_manifestacao: optStr(r, 'prazo_manifestacao'),
    dias_para_prazo: r['dias_para_prazo'] == null ? undefined : parseNum(r, 'dias_para_prazo'),
    alerta_prazo: Boolean(r['alerta_prazo']),
  }));
}

export async function sincronizarRecebidas(): Promise<{ recebidas: number; novas: number; versao: number }> {
  const { data } = await httpClient.post(`${RECEBIDAS}/sincronizar`, {}, { timeout: 180000 });
  const o = unwrapObject(data);
  return { recebidas: parseNum(o, 'recebidas'), novas: parseNum(o, 'novas'), versao: parseNum(o, 'versao') };
}

export async function manifestarRecebida(chave: string, tipo: TipoManifestacao, justificativa = ''): Promise<void> {
  await httpClient.post(`${RECEBIDAS}/${chave}/manifestar`, { tipo, justificativa });
}

export async function importarRecebida(chave: string): Promise<EntradaDocumento> {
  const { data } = await httpClient.post(`${RECEBIDAS}/${chave}/importar`, {});
  return parseEntradaDocumento(data);
}

// ─── Lançamento manual ───────────────────────────────────────────────────────

export interface EntradaManualItem {
  sequence: number;
  item_code?: number;
  description?: string;
  ncm: string;
  cfop: string;
  uom?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  valor_icms: number;
  valor_ipi: number;
  plano_contas_id?: number;
  centro_custo_id?: number;
  entry_operation_code?: number;
  warehouse_id?: number;
}

export interface EntradaManualPayload {
  chave_acesso?: string;
  numero_nf: number;
  serie: string;
  modelo: string;
  data_emissao: string;
  data_entrada: string;
  supplier_code?: number;
  cnpj_emitente: string;
  razao_social_emitente: string;
  ie_emitente?: string;
  uf_emitente?: string;
  valor_produtos: number;
  valor_frete: number;
  valor_seguro: number;
  valor_desconto: number;
  valor_ipi: number;
  valor_icms: number;
  valor_pis: number;
  valor_cofins: number;
  valor_total: number;
  tipo_documento: string;
  cte_code?: number;
  entry_operation_code?: number;
  valor_ret_pis?: number;
  valor_ret_cofins?: number;
  valor_ret_csll?: number;
  valor_irrf?: number;
  valor_ret_prev?: number;
  valor_iss_ret?: number;
  itens: Array<EntradaManualItem & {
    base_icms: number; aliq_icms: number; base_ipi: number; aliq_ipi: number; valor_pis: number; valor_cofins: number;
    gera_credito_icms: boolean; gera_credito_ipi: boolean; gera_credito_pis: boolean; gera_credito_cofins: boolean;
  }>;
  parcelas?: Array<{ numero: number; data_vencimento: string; valor: number; documento?: string }>;
}

export async function criarEntradaManual(payload: EntradaManualPayload): Promise<EntradaDocumento> {
  const { data } = await httpClient.post(`${BASE}/create`, payload);
  return parseEntradaDocumento(data);
}

// ─── Status ──────────────────────────────────────────────────────────────────

export const ROTULO_STATUS_ENTRADA: Record<string, string> = {
  PENDING: 'Pendente',
  CONFERRED: 'Conferida',
  APPROVED: 'Aprovada',
  WRITTEN_OFF: 'Baixada',
  CANCELLED: 'Cancelada',
};

export const ROTULO_ESTOQUE: Record<string, string> = {
  PENDENTE: 'A movimentar na aprovação',
  CONCLUIDO: 'Estoque movimentado',
  NAO_APLICA: 'Sem movimentação',
  ESTORNADO: 'Estornado',
};

export const ROTULO_ESTRATEGIA: Record<string, string> = {
  CODIGO_EXATO: 'Vínculo do fornecedor',
  EAN: 'Código de barras',
  DESCRICAO: 'Descrição',
  HISTORICO: 'Histórico',
  MANUAL: 'Manual',
  NAO_RESOLVIDO: 'Não conciliado',
};

// ─── Cadastros a partir da nota ──────────────────────────────────────────────

/**
 * Cadastra o emitente da nota como fornecedor com o que o XML declara (razão
 * social, fantasia, CNPJ, IE e endereço) e liga a nota — e as outras pendentes
 * do mesmo CNPJ — a ele. Devolve a nota atualizada.
 */
export async function cadastrarFornecedorDaNota(id: number): Promise<EntradaDocumento> {
  const { data } = await httpClient.post(`${BASE}/${id}/fornecedor`, {});
  return parseEntradaDocumento(data);
}

/** Unidades de estoque aceitas pelo cadastro de itens. */
export const UNIDADES_ITEM = ['UN', 'PC', 'CX', 'KG', 'TONELADA', 'M', 'M2', 'M3', 'CM', 'MM', 'L', 'GL', 'PAR', 'IN', 'MICROMETRO'] as const;
export type TipoUsoItem = 'INDUSTRIALIZACAO' | 'CONSUMO' | 'IMOBILIZADO';

export interface ItemDaNotaPayload {
  nome?: string;
  unidade?: string;
  warehouse_id?: number;
  tipo_uso?: TipoUsoItem;
  revenda?: boolean;
}

export interface ItemDaNotaCriado { item_code: number; codigo: string; nome: string; unidade: string; aviso: string }

/** Cadastra o item que a linha da nota descreve (o que ainda não existe no cadastro). */
export async function cadastrarItemDaNota(id: number, itemId: number, p: ItemDaNotaPayload): Promise<ItemDaNotaCriado> {
  const { data } = await httpClient.post(`${BASE}/${id}/itens/${itemId}/cadastrar-item`, p);
  const o = unwrapObject(data);
  return { item_code: parseNum(o, 'item_code'), codigo: parseStr(o, 'codigo'), nome: parseStr(o, 'nome'), unidade: parseStr(o, 'unidade'), aviso: parseStr(o, 'aviso') };
}

/** Unidade da nota → unidade do cadastro (a mesma tradução do backend); vazio sem equivalente. */
export function unidadeDoCadastro(u?: string): string {
  const x = (u ?? '').trim().toUpperCase();
  const mapa: Record<string, string> = { UND: 'UN', UNID: 'UN', UNIDADE: 'UN', UNI: 'UN', PCA: 'PC', PECA: 'PC', 'PÇ': 'PC', PCS: 'PC',
    TON: 'TONELADA', TN: 'TONELADA', T: 'TONELADA', LT: 'L', LTS: 'L', MT: 'M', MTS: 'M', CXA: 'CX', CAIXA: 'CX' };
  const v = mapa[x] ?? x;
  return (UNIDADES_ITEM as readonly string[]).includes(v) ? v : '';
}

/** Tipo de uso sugerido pelo CFOP de entrada (o mesmo critério do backend). */
export function tipoUsoPeloCfop(cfop?: string): TipoUsoItem {
  const s = (cfop ?? '').slice(1);
  if (['556', '407', '653'].includes(s)) return 'CONSUMO';
  if (['551', '406'].includes(s)) return 'IMOBILIZADO';
  return 'INDUSTRIALIZACAO';
}
