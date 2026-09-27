import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/fiscal';

// ─── Enums ──────────────────────────────────────────────────────────────────

export type TipoPessoa = 'J' | 'F';
export type TipoRateio = 'VALOR' | 'PESO';

// ─── NF-e de saída ──────────────────────────────────────────────────────────

export interface ExitItemDTO {
  sequence: number;
  item_code: string;
  ncm: string;
  cfop: string;
  quantidade: number;
  unit_price: number;
  total_price: number;
  origem_mercadoria: string;
  description: string;
  mva_pct?: number;
  aliq_interna_destino_st?: number;
  red_base_st_pct?: number;
}

export interface CreateExitDTO {
  numero_nf: number;
  serie: string;
  data_emissao: string;
  data_saida: string;
  cnpj_destinatario: string;
  razao_social_destinatario: string;
  ie_destinatario: string;
  uf_destinatario: string;
  tipo_pessoa: TipoPessoa;
  cfop: string;
  natureza_operacao: string;
  valor_produtos: number;
  valor_frete: number;
  valor_seguro: number;
  valor_desconto: number;
  sales_order_code?: number;
  /**
   * Cliente da nota. Informado, o sistema completa o endereço do destinatário
   * (exigido pela NF-e) a partir do cadastro — endereço de ENTREGA quando
   * existe, senão o de COBRANÇA — e resolve a condição de pagamento.
   */
  customer_code?: number;
  /**
   * Endereço do destinatário. Só preencha para uma entrega pontual em endereço
   * diferente do cadastro: o que for informado aqui prevalece, e o que ficar
   * vazio é completado pelo cadastro do cliente.
   */
  dest_logradouro?: string;
  dest_numero?: string;
  dest_complemento?: string;
  dest_bairro?: string;
  dest_municipio?: string;
  dest_codigo_municipio?: string;
  dest_cep?: string;
  dest_email?: string;
  dest_telefone?: string;
  /** Carga de expedição que originou a nota, quando a saída vem do romaneio. */
  shipment_load_code?: number;
  /**
   * Cupom fiscal que esta nota substitui. É o caso do varejo que emite cupom no
   * balcão e depois converte em NF-e a pedido do cliente: o número, a data e o
   * ECF ficam na nota para a fiscalização amarrar os dois documentos.
   */
  fiscal_coupon_number?: string;
  fiscal_coupon_date?: string;
  fiscal_coupon_ecf_serial?: string;
  itens: ExitItemDTO[];
}

export interface FiscalExit {
  id: number;
  numero_nf: number;
  serie: string;
  status: string;
  valor_total: number;
  cnpj_destinatario: string;
  razao_social_destinatario: string;
  data_emissao: string;
  valor_icms: number;
  valor_ipi: number;
  valor_pis: number;
  valor_cofins: number;
  chave_nfe?: string;
  protocolo?: string;
  focus_ref?: string;
}

export interface ExitStatus {
  exit_id: number;
  focus_ref: string;
  status: string;
  chave_nfe?: string;
  protocolo?: string;
  motivo?: string;
}

function parseExit(raw: unknown): FiscalExit {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    numero_nf: parseNum(o, 'numero_nf', 'NumeroNf'),
    serie: parseStr(o, 'serie', 'Serie'),
    status: parseStr(o, 'status', 'Status'),
    valor_total: parseNum(o, 'valor_total', 'ValorTotal'),
    cnpj_destinatario: parseStr(o, 'cnpj_destinatario', 'CnpjDestinatario'),
    razao_social_destinatario: parseStr(o, 'razao_social_destinatario', 'RazaoSocialDestinatario'),
    data_emissao: parseStr(o, 'data_emissao', 'DataEmissao'),
    valor_icms: parseNum(o, 'valor_icms', 'ValorIcms'),
    valor_ipi: parseNum(o, 'valor_ipi', 'ValorIpi'),
    valor_pis: parseNum(o, 'valor_pis', 'ValorPis'),
    valor_cofins: parseNum(o, 'valor_cofins', 'ValorCofins'),
    chave_nfe: parseStr(o, 'chave_nfe', 'ChaveNfe'),
    protocolo: parseStr(o, 'protocolo', 'Protocolo'),
    focus_ref: parseStr(o, 'focus_ref', 'FocusRef'),
  };
}

export async function listExits(): Promise<FiscalExit[]> {
  const { data } = await httpClient.get(`${BASE}/exits/list`);
  return unwrapArray(data).map(parseExit);
}
export async function createExit(dto: CreateExitDTO): Promise<FiscalExit> {
  const { data } = await httpClient.post(`${BASE}/exits/create`, dto);
  return parseExit(data);
}
export async function authorizeExit(code: number): Promise<FiscalExit> {
  const { data } = await httpClient.post(`${BASE}/exits/${code}/authorize`, {});
  return parseExit(data);
}
export async function cancelExit(code: number, justificativa: string): Promise<FiscalExit> {
  const { data } = await httpClient.post(`${BASE}/exits/${code}/cancel`, { justificativa });
  return parseExit(data);
}
export async function cartaCorrecaoExit(code: number, textoCorrecao: string): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/exits/${code}/carta-correcao`, { texto_correcao: textoCorrecao });
  return unwrapObject(data);
}
export async function getExitStatus(id: number): Promise<ExitStatus> {
  const { data } = await httpClient.get(`${BASE}/exits/${id}/status`);
  const o = unwrapObject(data);
  return {
    exit_id: parseNum(o, 'exit_id', 'ExitId'),
    focus_ref: parseStr(o, 'focus_ref', 'FocusRef'),
    status: parseStr(o, 'status', 'Status'),
    chave_nfe: parseStr(o, 'chave_nfe', 'ChaveNfe'),
    protocolo: parseStr(o, 'protocolo', 'Protocolo'),
    motivo: parseStr(o, 'motivo', 'Motivo'),
  };
}
/**
 * Prévia da NF-e: a nota montada exatamente como será transmitida, com a lista
 * do que ainda impede a emissão.
 *
 * Emitir é irreversível — nota autorizada só sai do ar por cancelamento, que tem
 * prazo e justificativa. A prévia existe para o erro aparecer ANTES, na tela, e
 * não na recusa da SEFAZ.
 */
export interface PreviaParteNFe {
  documento: string;
  nome: string;
  ie?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  codigo_municipio?: string;
  uf?: string;
  cep?: string;
  email?: string;
  telefone?: string;
}

export interface PreviaItemNFe {
  sequence: number;
  item_code?: number;
  descricao: string;
  ncm: string;
  cfop: string;
  um: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  origem_mercadoria: string;
  cst_icms: string;
  base_icms: number;
  aliq_icms: number;
  valor_icms: number;
  cst_ipi: string;
  aliq_ipi: number;
  valor_ipi: number;
  cst_pis: string;
  valor_pis: number;
  cst_cofins: string;
  valor_cofins: number;
  base_icms_st: number;
  valor_icms_st: number;
  mva: number;
}

export interface PreviaTotaisNFe {
  valor_produtos: number;
  valor_frete: number;
  valor_seguro: number;
  valor_desconto: number;
  valor_ipi: number;
  valor_icms: number;
  base_icms_st: number;
  valor_icms_st: number;
  valor_pis: number;
  valor_cofins: number;
  valor_total_nf: number;
  conferencia: string;
}

export interface PreviaParcelaNFe {
  numero: number;
  percentual: number;
  valor: number;
  vencimento: string;
  descricao: string;
  forma_pagamento_nf: string;
  estimado: boolean;
}

export interface PreviaPagamentoNFe {
  condicao_code?: number;
  condicao_descricao?: string;
  origem: string;
  parcelas: PreviaParcelaNFe[];
  aviso?: string;
}

/** Nível "IMPEDE" trava a emissão; "ATENCAO" deixa emitir, mas tem consequência. */
export interface PreviaPendenciaNFe {
  nivel: 'IMPEDE' | 'ATENCAO';
  campo: string;
  mensagem: string;
  como_resolver: string;
}

export interface PreviaNFe {
  fiscal_exit_id: number;
  numero_nf: number;
  serie: string;
  status: string;
  data_emissao: string;
  data_saida?: string;
  natureza_operacao: string;
  cfop: string;
  ambiente: string;
  tipo_operacao: string;
  consumidor_final: boolean;
  sales_order_code?: number;
  shipment_load_code?: number;
  emitente: PreviaParteNFe;
  destinatario: PreviaParteNFe;
  itens: PreviaItemNFe[];
  totais: PreviaTotaisNFe;
  pagamento: PreviaPagamentoNFe;
  pendencias: PreviaPendenciaNFe[];
  pode_autorizar: boolean;
  payload_enviado: string;
}

function parseParte(o: Obj): PreviaParteNFe {
  return {
    documento: parseStr(o, 'documento', 'Documento'),
    nome: parseStr(o, 'nome', 'Nome'),
    ie: parseStr(o, 'ie', 'IE'),
    logradouro: parseStr(o, 'logradouro', 'Logradouro'),
    numero: parseStr(o, 'numero', 'Numero'),
    complemento: parseStr(o, 'complemento', 'Complemento'),
    bairro: parseStr(o, 'bairro', 'Bairro'),
    municipio: parseStr(o, 'municipio', 'Municipio'),
    codigo_municipio: parseStr(o, 'codigo_municipio', 'CodigoMunicipio'),
    uf: parseStr(o, 'uf', 'UF'),
    cep: parseStr(o, 'cep', 'CEP'),
    email: parseStr(o, 'email', 'Email'),
    telefone: parseStr(o, 'telefone', 'Telefone'),
  };
}

export async function previewExit(id: number): Promise<PreviaNFe> {
  const { data } = await httpClient.get(`${BASE}/exits/${id}/previa`);
  const o = unwrapObject(data);
  const totais = unwrapObject(o['totais'] ?? o['Totais']);
  const pagamento = unwrapObject(o['pagamento'] ?? o['Pagamento']);
  return {
    fiscal_exit_id: parseNum(o, 'fiscal_exit_id', 'FiscalExitID'),
    numero_nf: parseNum(o, 'numero_nf', 'NumeroNF'),
    serie: parseStr(o, 'serie', 'Serie'),
    status: parseStr(o, 'status', 'Status'),
    data_emissao: parseStr(o, 'data_emissao', 'DataEmissao'),
    data_saida: parseStr(o, 'data_saida', 'DataSaida'),
    natureza_operacao: parseStr(o, 'natureza_operacao', 'NaturezaOperacao'),
    cfop: parseStr(o, 'cfop', 'Cfop'),
    ambiente: parseStr(o, 'ambiente', 'Ambiente'),
    tipo_operacao: parseStr(o, 'tipo_operacao', 'TipoOperacao'),
    consumidor_final: Boolean(o['consumidor_final'] ?? o['ConsumidorFinal']),
    sales_order_code: parseNum(o, 'sales_order_code', 'SalesOrderCode') || undefined,
    shipment_load_code: parseNum(o, 'shipment_load_code', 'ShipmentLoadCode') || undefined,
    emitente: parseParte(unwrapObject(o['emitente'] ?? o['Emitente'])),
    destinatario: parseParte(unwrapObject(o['destinatario'] ?? o['Destinatario'])),
    itens: unwrapArray(o['itens'] ?? o['Itens']).map(unwrapObject).map((i) => ({
      sequence: parseNum(i, 'sequence', 'Sequence'),
      item_code: parseNum(i, 'item_code', 'ItemCode') || undefined,
      descricao: parseStr(i, 'descricao', 'Descricao'),
      ncm: parseStr(i, 'ncm', 'Ncm'),
      cfop: parseStr(i, 'cfop', 'Cfop'),
      um: parseStr(i, 'um', 'UM'),
      quantidade: parseNum(i, 'quantidade', 'Quantidade'),
      valor_unitario: parseNum(i, 'valor_unitario', 'ValorUnit'),
      valor_total: parseNum(i, 'valor_total', 'ValorTotal'),
      origem_mercadoria: parseStr(i, 'origem_mercadoria', 'Origem'),
      cst_icms: parseStr(i, 'cst_icms', 'CstICMS'),
      base_icms: parseNum(i, 'base_icms', 'BaseICMS'),
      aliq_icms: parseNum(i, 'aliq_icms', 'AliqICMS'),
      valor_icms: parseNum(i, 'valor_icms', 'ValorICMS'),
      cst_ipi: parseStr(i, 'cst_ipi', 'CstIPI'),
      aliq_ipi: parseNum(i, 'aliq_ipi', 'AliqIPI'),
      valor_ipi: parseNum(i, 'valor_ipi', 'ValorIPI'),
      cst_pis: parseStr(i, 'cst_pis', 'CstPIS'),
      valor_pis: parseNum(i, 'valor_pis', 'ValorPIS'),
      cst_cofins: parseStr(i, 'cst_cofins', 'CstCOFINS'),
      valor_cofins: parseNum(i, 'valor_cofins', 'ValorCOFINS'),
      base_icms_st: parseNum(i, 'base_icms_st', 'BaseICMSST'),
      valor_icms_st: parseNum(i, 'valor_icms_st', 'ValorICMSST'),
      mva: parseNum(i, 'mva', 'MVA'),
    })),
    totais: {
      valor_produtos: parseNum(totais, 'valor_produtos', 'ValorProdutos'),
      valor_frete: parseNum(totais, 'valor_frete', 'ValorFrete'),
      valor_seguro: parseNum(totais, 'valor_seguro', 'ValorSeguro'),
      valor_desconto: parseNum(totais, 'valor_desconto', 'ValorDesconto'),
      valor_ipi: parseNum(totais, 'valor_ipi', 'ValorIPI'),
      valor_icms: parseNum(totais, 'valor_icms', 'ValorICMS'),
      base_icms_st: parseNum(totais, 'base_icms_st', 'BaseICMSST'),
      valor_icms_st: parseNum(totais, 'valor_icms_st', 'ValorICMSST'),
      valor_pis: parseNum(totais, 'valor_pis', 'ValorPIS'),
      valor_cofins: parseNum(totais, 'valor_cofins', 'ValorCOFINS'),
      valor_total_nf: parseNum(totais, 'valor_total_nf', 'ValorTotalNF'),
      conferencia: parseStr(totais, 'conferencia', 'Conferencia'),
    },
    pagamento: {
      condicao_code: parseNum(pagamento, 'condicao_code', 'CondicaoCode') || undefined,
      condicao_descricao: parseStr(pagamento, 'condicao_descricao', 'CondicaoDescricao'),
      origem: parseStr(pagamento, 'origem', 'Origem'),
      aviso: parseStr(pagamento, 'aviso', 'Aviso'),
      parcelas: unwrapArray(pagamento['parcelas'] ?? pagamento['Parcelas']).map(unwrapObject).map((p) => ({
        numero: parseNum(p, 'numero', 'Numero'),
        percentual: parseNum(p, 'percentual', 'Percentual'),
        valor: parseNum(p, 'valor', 'Valor'),
        vencimento: parseStr(p, 'vencimento', 'Vencimento'),
        descricao: parseStr(p, 'descricao', 'Descricao'),
        forma_pagamento_nf: parseStr(p, 'forma_pagamento_nf', 'FormaPagamentoNF'),
        estimado: Boolean(p['estimado'] ?? p['Estimado']),
      })),
    },
    pendencias: unwrapArray(o['pendencias'] ?? o['Pendencias']).map(unwrapObject).map((p) => ({
      nivel: (parseStr(p, 'nivel', 'Nivel') === 'IMPEDE' ? 'IMPEDE' : 'ATENCAO') as 'IMPEDE' | 'ATENCAO',
      campo: parseStr(p, 'campo', 'Campo'),
      mensagem: parseStr(p, 'mensagem', 'Mensagem'),
      como_resolver: parseStr(p, 'como_resolver', 'ComoResolver'),
    })),
    pode_autorizar: Boolean(o['pode_autorizar'] ?? o['PodeAutorizar']),
    payload_enviado: parseStr(o, 'payload_enviado', 'PayloadEnviado'),
  };
}

export async function listCartasCorrecao(code: number): Promise<Obj[]> {
  const { data } = await httpClient.get(`${BASE}/exits/${code}/cartas-correcao`);
  return unwrapArray(data).map(unwrapObject);
}

// ─── NF-e de entrada ────────────────────────────────────────────────────────

export interface EntryItemDTO {
  sequence: number;
  item_code: string;
  ncm: string;
  cfop: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  base_icms: number;
  aliq_icms: number;
  valor_icms: number;
  base_ipi: number;
  aliq_ipi: number;
  valor_ipi: number;
  valor_pis: number;
  valor_cofins: number;
  cst_icms: string;
  cst_ipi: string;
  cst_pis: string;
  cst_cofins: string;
  gera_credito_icms: boolean;
  gera_credito_ipi: boolean;
  gera_credito_pis: boolean;
  gera_credito_cofins: boolean;
}

export interface CreateEntryDTO {
  numero_nf: number;
  serie: string;
  modelo: string;
  data_emissao: string;
  data_entrada: string;
  cnpj_emitente: string;
  razao_social_emitente: string;
  ie_emitente: string;
  uf_emitente: string;
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
  purchase_order_code?: number;
  /**
   * CT-e que trouxe a mercadoria. Amarrar a nota ao conhecimento é o que permite
   * apropriar o frete àquela entrada — sem o vínculo, o custo do transporte fica
   * solto e não entra no custo do material.
   */
  cte_code?: number;
  itens: EntryItemDTO[];
}

export interface FiscalEntry {
  id: number;
  numero_nf: number;
  serie: string;
  status: string;
  valor_total: number;
  cnpj_emitente: string;
  razao_social_emitente: string;
  data_entrada: string;
  data_emissao?: string;
}

function parseEntry(raw: unknown): FiscalEntry {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    numero_nf: parseNum(o, 'numero_nf', 'NumeroNf'),
    serie: parseStr(o, 'serie', 'Serie'),
    status: parseStr(o, 'status', 'Status'),
    valor_total: parseNum(o, 'valor_total', 'ValorTotal'),
    cnpj_emitente: parseStr(o, 'cnpj_emitente', 'CnpjEmitente'),
    razao_social_emitente: parseStr(o, 'razao_social_emitente', 'RazaoSocialEmitente'),
    data_entrada: parseStr(o, 'data_entrada', 'DataEntrada'),
    data_emissao: parseStr(o, 'data_emissao', 'DataEmissao'),
  };
}

export async function listEntries(): Promise<FiscalEntry[]> {
  const { data } = await httpClient.get(`${BASE}/entries/list`);
  return unwrapArray(data).map(parseEntry);
}
export async function createEntry(dto: CreateEntryDTO): Promise<FiscalEntry> {
  const { data } = await httpClient.post(`${BASE}/entries/create`, dto);
  return parseEntry(data);
}
export async function approveEntry(id: number): Promise<FiscalEntry> {
  const { data } = await httpClient.post(`${BASE}/entries/${id}/approve`, {});
  return parseEntry(data);
}
export async function uploadNfeXml(xmlContent: string): Promise<FiscalEntry> {
  const { data } = await httpClient.post(`${BASE}/entries/upload-nfe`, { xml_content: xmlContent });
  return parseEntry(data);
}
export async function importNfeByKey(accessKey: string): Promise<FiscalEntry> {
  const { data } = await httpClient.post(`${BASE}/entries/import-nfe`, { access_key: accessKey });
  return parseEntry(data);
}

// ─── CT-e ───────────────────────────────────────────────────────────────────

/**
 * Dados de emissão do CT-e exigidos pela SEFAZ. Sem eles o conhecimento existe
 * só como registro local: a autorização é recusada com "não possui emission_data".
 * O emitente é preenchido pelo backend a partir da configuração fiscal — aqui
 * vão as partes e o trajeto.
 */
export interface CteEmissionData {
  natureza_operacao?: string;
  tipo_cte?: number;
  tipo_servico?: number;
  modal?: string;
  uf_inicio: string;
  municipio_inicio: string;
  uf_fim: string;
  municipio_fim: string;
  tomador_servico?: number;
  remetente: CteParte;
  destinatario: CteParte;
  produto_predominante?: string;
  valor_carga?: number;
  rntrc?: string;
}

export interface CteParte {
  cnpj?: string;
  cpf?: string;
  inscricao_estadual?: string;
  nome?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  codigo_municipio?: string;
  uf?: string;
  cep?: string;
}

/** Quem paga o frete, na codificação da SEFAZ. */
export const CTE_TOMADORES = [
  { value: 0, label: 'Remetente' },
  { value: 1, label: 'Expedidor' },
  { value: 2, label: 'Recebedor' },
  { value: 3, label: 'Destinatário' },
  { value: 4, label: 'Outros' },
] as const;

/** Finalidade do conhecimento. */
export const CTE_TIPOS = [
  { value: 0, label: 'Normal' },
  { value: 1, label: 'Complemento de valores' },
  { value: 2, label: 'Anulação' },
  { value: 3, label: 'Substituto' },
] as const;

export interface CreateCteDTO {
  numero_cte: number;
  serie: string;
  data_emissao: string;
  data_entrada: string;
  cnpj_emitente: string;
  razao_social_emitente: string;
  uf_emitente: string;
  cfop: string;
  valor_frete: number;
  valor_seguro: number;
  valor_outros: number;
  valor_total: number;
  valor_icms: number;
  base_icms: number;
  aliq_icms: number;
  cst_icms: string;
  tipo_rateio: TipoRateio;
  fiscal_entry_id?: number;
  emission_data?: CteEmissionData;
}

export interface Cte {
  id: number;
  numero_cte: number;
  serie: string;
  cnpj_emitente: string;
  razao_social_emitente: string;
  uf_emitente: string;
  data_emissao: string;
  valor_frete: number;
  valor_total: number;
  tipo_rateio: string;
  status?: string;
}

function parseCte(raw: unknown): Cte {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    numero_cte: parseNum(o, 'numero_cte', 'NumeroCte'),
    serie: parseStr(o, 'serie', 'Serie'),
    cnpj_emitente: parseStr(o, 'cnpj_emitente', 'CnpjEmitente'),
    razao_social_emitente: parseStr(o, 'razao_social_emitente', 'RazaoSocialEmitente'),
    uf_emitente: parseStr(o, 'uf_emitente', 'UfEmitente'),
    data_emissao: parseStr(o, 'data_emissao', 'DataEmissao'),
    valor_frete: parseNum(o, 'valor_frete', 'ValorFrete'),
    valor_total: parseNum(o, 'valor_total', 'ValorTotal'),
    tipo_rateio: parseStr(o, 'tipo_rateio', 'TipoRateio'),
    status: parseStr(o, 'status', 'Status'),
  };
}

export async function listCtes(): Promise<Cte[]> {
  const { data } = await httpClient.get(`${BASE}/cte/list`);
  return unwrapArray(data).map(parseCte);
}
export async function createCte(dto: CreateCteDTO): Promise<Cte> {
  const { data } = await httpClient.post(`${BASE}/cte/create`, dto);
  return parseCte(data);
}

/**
 * Envia o CT-e à SEFAZ. Só funciona quando o conhecimento foi gravado com os
 * dados de emissão — o backend recusa a autorização sem eles.
 */
export async function authorizeCte(code: number): Promise<Cte> {
  const { data } = await httpClient.post(`${BASE}/cte/${code}/authorize`, {});
  return parseCte(data);
}
