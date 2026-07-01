import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/fiscal';

// ─── Enums ──────────────────────────────────────────────────────────────────

export type TipoPessoa = 'J' | 'F';
export type TipoRateio = 'VALOR' | 'PESO';

// ─── NF-e de saída ──────────────────────────────────────────────────────────

export interface ExitItemDTO {
  sequence: number;
  item_code: number;
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
export async function listCartasCorrecao(code: number): Promise<Obj[]> {
  const { data } = await httpClient.get(`${BASE}/exits/${code}/cartas-correcao`);
  return unwrapArray(data).map(unwrapObject);
}

// ─── NF-e de entrada ────────────────────────────────────────────────────────

export interface EntryItemDTO {
  sequence: number;
  item_code: number;
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
