import { httpClient } from './httpClient';

const BASE = '/api/contratos';

// ─── Defensive parsers ──────────────────────────────────────────────────────

type Obj = Record<string, unknown>;

function pick<T>(obj: Obj, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

function parseStr(obj: Obj, ...keys: string[]): string {
  const v = pick<unknown>(obj, ...keys);
  return v != null ? String(v) : '';
}

function parseNum(obj: Obj, ...keys: string[]): number | undefined {
  const v = pick<unknown>(obj, ...keys);
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function parseBool(obj: Obj, ...keys: string[]): boolean {
  const v = pick<unknown>(obj, ...keys);
  if (v === undefined) return false;
  return v !== false && v !== 0 && v !== 'false' && v !== '';
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Obj;
    for (const key of ['data', 'items', 'contratos', 'results', 'list']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    const msg = pick<string>(obj, 'message', 'error', 'msg');
    if (msg) throw new Error(msg);
  }
  return [];
}

// ─── DTOs / Types ──────────────────────────────────────────────────────────

export interface ContratoDTO {
  contrato?: string;
  tp_contrato: string;
  contrato_for: string;
  fornecedor: string;
  abertura: string;
  validade: string;
  encerramento?: string;
  moeda: string;
  data_moeda: string;
  data_base_conversao?: string;
  valor?: number;
  conta_financ: string;
  descricao: string;
  data_vcto: string;
  tipo_pgto: string;
  tipo_vcto: string;
  subsequente: boolean;
}

export interface ContratoResponse {
  contrato: string;
  tp_contrato: string;
  contrato_for: string;
  fornecedor: string;
  fornecedorNome?: string;
  abertura: string;
  validade: string;
  encerramento?: string;
  moeda: string;
  data_moeda: string;
  data_base_conversao?: string;
  valor?: number;
  conta_financ: string;
  descricao: string;
  data_vcto: string;
  tipo_pgto: string;
  tipo_vcto: string;
  subsequente: boolean;
}

export interface ContratoFilter {
  contratos?: string;
  fornecedor?: string;
  corretor?: string;
  tipo_contrato?: string;
  pedido_compra?: string;
  nf_entrada?: string;
  itens?: string;
  data_base_conversao?: string;
  data_abertura_inicio?: string;
  data_abertura_fim?: string;
  data_validade_inicio?: string;
  data_validade_fim?: string;
  funcionario?: string;
}

export interface TipoContratoDTO {
  descricao: string;
  tempo_determinado: string;
  ativo: boolean;
}

export interface TipoContratoResponse {
  codigo: string;
  descricao: string;
  tempo_determinado: string;
  ativo: boolean;
}

export interface CancelamentoItemDTO {
  cancela_todos: boolean;
  descancela_todos: boolean;
  itens: Array<{
    codigo: string;
    tipo: 'Cancelar' | 'Descancelar';
    motivo: string;
    quantidade: number;
  }>;
}

// ─── Response parsers ──────────────────────────────────────────────────────

function parseContrato(raw: unknown): ContratoResponse {
  const obj = raw as Obj;
  return {
    contrato: parseStr(obj, 'contrato', 'Contrato', 'NUM_CONTRATO'),
    tp_contrato: parseStr(obj, 'tp_contrato', 'TpContrato', 'TP_CONTRATO'),
    contrato_for: parseStr(obj, 'contrato_for', 'ContratoFor', 'CONTRATO_FOR'),
    fornecedor: parseStr(obj, 'fornecedor', 'Fornecedor', 'COD_FORN'),
    fornecedorNome: parseStr(obj, 'fornecedorNome', 'FornecedorNome', 'NOM_FORN', 'nome') || undefined,
    abertura: parseStr(obj, 'abertura', 'Abertura', 'DAT_ABERTURA'),
    validade: parseStr(obj, 'validade', 'Validade', 'DAT_VALIDADE'),
    encerramento: parseStr(obj, 'encerramento', 'Encerramento', 'DAT_ENCERRAMENTO') || undefined,
    moeda: parseStr(obj, 'moeda', 'Moeda', 'MOEDA'),
    data_moeda: parseStr(obj, 'data_moeda', 'DataMoeda', 'DATA_MOEDA'),
    data_base_conversao: parseStr(obj, 'data_base_conversao', 'DataBaseConversao', 'DATA_BASE_CONVERSAO') || undefined,
    valor: parseNum(obj, 'valor', 'Valor', 'VLR'),
    conta_financ: parseStr(obj, 'conta_financ', 'ContaFinanc', 'CTA_FINANC'),
    descricao: parseStr(obj, 'descricao', 'Descricao', 'DESCRICAO'),
    data_vcto: parseStr(obj, 'data_vcto', 'DataVcto', 'DAT_VCTO'),
    tipo_pgto: parseStr(obj, 'tipo_pgto', 'TipoPgto', 'TIPO_PGTO'),
    tipo_vcto: parseStr(obj, 'tipo_vcto', 'TipoVcto', 'TIPO_VCTO'),
    subsequente: parseBool(obj, 'subsequente', 'Subsequente', 'SUBSEQUENTE'),
  };
}

function parseTipoContrato(raw: unknown): TipoContratoResponse {
  const obj = raw as Obj;
  return {
    codigo: parseStr(obj, 'codigo', 'Codigo', 'CODIGO'),
    descricao: parseStr(obj, 'descricao', 'Descricao', 'DESCRICAO'),
    tempo_determinado: parseStr(obj, 'tempo_determinado', 'TempoDeterminado', 'TEMPO_DETERMINADO'),
    ativo: parseBool(obj, 'ativo', 'Ativo', 'ATIVO'),
  };
}

// ─── API: Contratos ────────────────────────────────────────────────────────

export async function listarContratos(filters?: ContratoFilter): Promise<ContratoResponse[]> {
  const params = new URLSearchParams();
  if (filters?.contratos) params.set('contrato', filters.contratos);
  if (filters?.fornecedor) params.set('fornecedor', filters.fornecedor);
  if (filters?.corretor) params.set('corretor', filters.corretor);
  if (filters?.tipo_contrato) params.set('tipo_contrato', filters.tipo_contrato);
  if (filters?.pedido_compra) params.set('pedido_compra', filters.pedido_compra);
  if (filters?.nf_entrada) params.set('nf_entrada', filters.nf_entrada);
  if (filters?.itens) params.set('itens', filters.itens);
  if (filters?.data_base_conversao) params.set('data_base_conversao', filters.data_base_conversao);
  if (filters?.data_abertura_inicio) params.set('data_abertura_inicio', filters.data_abertura_inicio);
  if (filters?.data_abertura_fim) params.set('data_abertura_fim', filters.data_abertura_fim);
  if (filters?.data_validade_inicio) params.set('data_validade_inicio', filters.data_validade_inicio);
  if (filters?.data_validade_fim) params.set('data_validade_fim', filters.data_validade_fim);
  if (filters?.funcionario) params.set('funcionario', filters.funcionario);
  const qs = params.toString();
  const { data } = await httpClient.get<unknown>(`${BASE}/list${qs ? `?${qs}` : ''}`);
  return unwrapArray(data).map(parseContrato);
}

export async function criarContrato(dto: ContratoDTO): Promise<ContratoResponse> {
  const { data } = await httpClient.post<unknown>(BASE, dto);
  return parseContrato(data);
}

export async function atualizarContrato(contrato: string, dto: Partial<ContratoDTO>): Promise<ContratoResponse> {
  const { data } = await httpClient.put<unknown>(`${BASE}/${contrato}`, dto);
  return parseContrato(data);
}

export async function buscarContrato(contrato: string): Promise<ContratoResponse | null> {
  try {
    const { data } = await httpClient.get<unknown>(`${BASE}/${contrato}`);
    return parseContrato(data);
  } catch { return null; }
}

export async function excluirContrato(contrato: string): Promise<void> {
  await httpClient.delete(`${BASE}/${contrato}`);
}

// ─── API: Tipos de Contrato ────────────────────────────────────────────────

export async function listarTiposContrato(): Promise<TipoContratoResponse[]> {
  const { data } = await httpClient.get<unknown>(`${BASE}/tipos`);
  return unwrapArray(data).map(parseTipoContrato);
}

export async function criarTipoContrato(dto: TipoContratoDTO): Promise<TipoContratoResponse> {
  const { data } = await httpClient.post<unknown>(`${BASE}/tipos`, dto);
  return parseTipoContrato(data);
}

export async function atualizarTipoContrato(codigo: string, dto: Partial<TipoContratoDTO>): Promise<TipoContratoResponse> {
  const { data } = await httpClient.put<unknown>(`${BASE}/tipos/${codigo}`, dto);
  return parseTipoContrato(data);
}

// ─── API: Cancelamento de Itens ────────────────────────────────────────────

export async function cancelarItens(dto: CancelamentoItemDTO): Promise<void> {
  await httpClient.post(`${BASE}/cancelar-itens`, dto);
}
