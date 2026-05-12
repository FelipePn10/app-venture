import { httpClient } from '@/services/httpClient';

const BASE = '/api/engenharia';

export interface RoteiroPadraoDTO {
  roteiro: string;
  descricao: string;
  situacao: string;
  operacoes: OperacaoPadraoDTO[];
}

export interface OperacaoPadraoDTO {
  seq: number;
  operacao: string;
  centroTrabalho: string;
  um: string;
  lote: number;
  tempo: number;
  percRecupPerda: number;
  tempoPreparacao: number;
  qtdHomens: number;
  dataInicio: string;
  dataFim: string;
  apontamento: string;
  origem: string;
}

export interface RoteiroPadraoResponse {
  roteiro: string;
  descricao: string;
  situacao: string;
  operacoes: OperacaoPadraoResponse[];
}

export interface OperacaoPadraoResponse {
  seq: number;
  operacao: string;
  operacaoDesc: string;
  centroTrabalho: string;
  ctDesc: string;
  tempoCorrigido: number;
  qtdHomens: number;
  dataInicio: string;
  dataFim: string;
}

export interface RoteiroFabricacaoDTO {
  item: string;
  mascara: string;
  alternativo: string;
  operacoes: OperacaoFabricacaoDTO[];
}

export interface OperacaoFabricacaoDTO {
  seq: number;
  operacao: string;
  centroTrabalho: string;
  roteiroPadrao: string;
  dataInicio: string;
  dataFim: string;
  situacao: string;
  origem: string;
}

export interface RoteiroFabricacaoResponse {
  item: string;
  itemDesc: string;
  mascara: string;
  alternativo: string;
  operacoes: OperacaoFabricacaoResponse[];
}

export interface OperacaoFabricacaoResponse {
  seq: number;
  operacao: string;
  operacaoDesc: string;
  centroTrabalho: string;
  ctDesc: string;
  tempoCorrigido: number;
  qtdHomens: number;
  origem: string;
  dataInicio: string;
  dataFim: string;
  roteiroPadrao: string;
  situacao: string;
  formula: string;
}

export interface RelatorioTempoCTFilter {
  item?: string;
  dataEmissaoInicio?: string;
  dataEmissaoFim?: string;
  centroTrabalho?: string;
  opcao?: string;
  selecao?: string;
  somentePai?: boolean;
  tipoEstrutura?: string;
  quebraUM?: boolean;
}

export interface TempoCTResponse {
  centroTrabalho: string;
  ctDesc: string;
  operacao: string;
  operacaoDesc: string;
  item: string;
  itemDesc: string;
  quantidade: number;
  um: string;
  tempoTotal: number;
  custoTotal: number;
}

function parseStr(raw: unknown, ...keys: string[]): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') return String(raw);
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) { const v = r[k]; if (typeof v === 'string') return v; if (typeof v === 'number') return String(v); }
  }
  return '';
}

function parseNum(raw: unknown, ...keys: string[]): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') { const n = Number(raw); return isNaN(n) ? 0 : n; }
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) { const v = r[k]; if (typeof v === 'number') return v; if (typeof v === 'string') { const n = Number(v); return isNaN(n) ? 0 : n; } }
  }
  return 0;
}

function parseOpPadrao(raw: unknown): OperacaoPadraoResponse {
  return {
    seq: parseNum(raw, 'seq', 'Seq', 'SEQ'),
    operacao: parseStr(raw, 'operacao', 'Operacao', 'COD_OPERACAO'),
    operacaoDesc: parseStr(raw, 'operacaoDesc', 'descricao', 'NOM_OPERACAO'),
    centroTrabalho: parseStr(raw, 'centroTrabalho', 'CentroTrabalho', 'COD_CT'),
    ctDesc: parseStr(raw, 'ctDesc', 'ctDesc', 'NOM_CT'),
    tempoCorrigido: parseNum(raw, 'tempoCorrigido', 'TempoCorrigido', 'TEMPO_COR'),
    qtdHomens: parseNum(raw, 'qtdHomens', 'QtdHomens', 'QTD_HOMENS'),
    dataInicio: parseStr(raw, 'dataInicio', 'DataInicio', 'DAT_INICIO'),
    dataFim: parseStr(raw, 'dataFim', 'DataFim', 'DAT_FIM'),
  };
}

function parseRoteiroPadrao(raw: unknown): RoteiroPadraoResponse {
  return {
    roteiro: parseStr(raw, 'roteiro', 'Roteiro', 'COD_ROTEIRO'),
    descricao: parseStr(raw, 'descricao', 'Descricao', 'DES_ROTEIRO'),
    situacao: parseStr(raw, 'situacao', 'Situacao', 'SITUACAO'),
    operacoes: Array.isArray((raw as any)?.operacoes ?? (raw as any)?.Operacoes)
      ? ((raw as any)?.operacoes ?? (raw as any)?.Operacoes).map(parseOpPadrao)
      : [],
  };
}

function parseOpFab(raw: unknown): OperacaoFabricacaoResponse {
  return {
    seq: parseNum(raw, 'seq', 'Seq', 'SEQ'),
    operacao: parseStr(raw, 'operacao', 'Operacao', 'COD_OPERACAO'),
    operacaoDesc: parseStr(raw, 'operacaoDesc', 'descricao', 'NOM_OPERACAO'),
    centroTrabalho: parseStr(raw, 'centroTrabalho', 'CentroTrabalho', 'COD_CT'),
    ctDesc: parseStr(raw, 'ctDesc', 'ctDesc', 'NOM_CT'),
    tempoCorrigido: parseNum(raw, 'tempoCorrigido', 'TempoCorrigido', 'TEMPO_COR'),
    qtdHomens: parseNum(raw, 'qtdHomens', 'QtdHomens', 'QTD_HOMENS'),
    origem: parseStr(raw, 'origem', 'Origem', 'ORIGEM'),
    dataInicio: parseStr(raw, 'dataInicio', 'DataInicio', 'DAT_INICIO'),
    dataFim: parseStr(raw, 'dataFim', 'DataFim', 'DAT_FIM'),
    roteiroPadrao: parseStr(raw, 'roteiroPadrao', 'RoteiroPadrao', 'COD_ROT_PADRAO'),
    situacao: parseStr(raw, 'situacao', 'Situacao', 'SITUACAO'),
    formula: parseStr(raw, 'formula', 'Formula', 'FORMULA'),
  };
}

function parseRoteiroFab(raw: unknown): RoteiroFabricacaoResponse {
  return {
    item: parseStr(raw, 'item', 'Item', 'COD_ITEM'),
    itemDesc: parseStr(raw, 'itemDesc', 'descricao', 'NOM_ITEM'),
    mascara: parseStr(raw, 'mascara', 'Mascara', 'COD_MASCARA'),
    alternativo: parseStr(raw, 'alternativo', 'Alternativo', 'ALTERNATIVO'),
    operacoes: Array.isArray((raw as any)?.operacoes ?? (raw as any)?.Operacoes)
      ? ((raw as any)?.operacoes ?? (raw as any)?.Operacoes).map(parseOpFab)
      : [],
  };
}

function parseTempoCT(raw: unknown): TempoCTResponse {
  return {
    centroTrabalho: parseStr(raw, 'centroTrabalho', 'CentroTrabalho', 'COD_CT'),
    ctDesc: parseStr(raw, 'ctDesc', 'ctDesc', 'NOM_CT'),
    operacao: parseStr(raw, 'operacao', 'Operacao', 'COD_OPERACAO'),
    operacaoDesc: parseStr(raw, 'operacaoDesc', 'operacaoDesc', 'NOM_OPERACAO'),
    item: parseStr(raw, 'item', 'Item', 'COD_ITEM'),
    itemDesc: parseStr(raw, 'itemDesc', 'itemDesc', 'NOM_ITEM'),
    quantidade: parseNum(raw, 'quantidade', 'Quantidade', 'QTD'),
    um: parseStr(raw, 'um', 'UM', 'UNID_MEDIDA'),
    tempoTotal: parseNum(raw, 'tempoTotal', 'TempoTotal', 'TEMPO_TOTAL'),
    custoTotal: parseNum(raw, 'custoTotal', 'CustoTotal', 'CUSTO_TOTAL'),
  };
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

// ─── Roteiro Padrão ───────────────────────────────────────────────────────────

export async function criarRoteiroPadrao(dto: RoteiroPadraoDTO): Promise<RoteiroPadraoResponse> {
  const { data } = await httpClient.post(`${BASE}/roteiro-padrao`, dto);
  return parseRoteiroPadrao(data);
}

export async function atualizarRoteiroPadrao(roteiro: string, dto: Partial<RoteiroPadraoDTO>): Promise<RoteiroPadraoResponse> {
  const { data } = await httpClient.put(`${BASE}/roteiro-padrao/${roteiro}`, dto);
  return parseRoteiroPadrao(data);
}

export async function buscarRoteiroPadrao(roteiro: string): Promise<RoteiroPadraoResponse | null> {
  try {
    const { data } = await httpClient.get(`${BASE}/roteiro-padrao/${roteiro}`);
    return parseRoteiroPadrao(data);
  } catch { return null; }
}

export async function listarRoteirosPadrao(): Promise<RoteiroPadraoResponse[]> {
  const { data } = await httpClient.get(`${BASE}/roteiro-padrao`);
  return unwrapArray(data).map(parseRoteiroPadrao);
}

// ─── Roteiro Fabricação ───────────────────────────────────────────────────────

export async function criarRoteiroFabricacao(dto: RoteiroFabricacaoDTO): Promise<RoteiroFabricacaoResponse> {
  const { data } = await httpClient.post(`${BASE}/roteiro-fabricacao`, dto);
  return parseRoteiroFab(data);
}

export async function atualizarRoteiroFabricacao(item: string, dto: Partial<RoteiroFabricacaoDTO>): Promise<RoteiroFabricacaoResponse> {
  const { data } = await httpClient.put(`${BASE}/roteiro-fabricacao/${item}`, dto);
  return parseRoteiroFab(data);
}

export async function buscarRoteiroFabricacao(item: string): Promise<RoteiroFabricacaoResponse | null> {
  try {
    const { data } = await httpClient.get(`${BASE}/roteiro-fabricacao/${item}`);
    return parseRoteiroFab(data);
  } catch { return null; }
}

// ─── Relatório Tempo CT ───────────────────────────────────────────────────────

export async function gerarRelatorioTempoCT(filters: RelatorioTempoCTFilter): Promise<TempoCTResponse[]> {
  const { data } = await httpClient.post(`${BASE}/relatorio-tempo-ct`, filters);
  return unwrapArray(data).map(parseTempoCT);
}
