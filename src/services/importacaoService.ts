import { httpClient } from '@/services/httpClient';

const BASE = '/api/importacao';

// ─── Types ────────────────────────────────────────────────────────────────────

type Obj = Record<string, unknown>;

// ─── Defensive parsers ────────────────────────────────────────────────────────

function pick<T>(obj: Obj, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

export function parseStr(obj: Obj, ...keys: string[]): string {
  const v = pick<unknown>(obj, ...keys);
  return v != null ? String(v) : '';
}

export function parseNum(obj: Obj, ...keys: string[]): number | undefined {
  const v = pick<unknown>(obj, ...keys);
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

export function parseBool(obj: Obj, ...keys: string[]): boolean {
  const v = pick<unknown>(obj, ...keys);
  if (v === undefined) return false;
  return v !== false && v !== 0 && v !== 'false' && v !== '';
}

export function unwrapArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Obj;
    for (const key of ['data', 'items', 'results', 'list', 'rows']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    const msg = pick<string>(obj, 'message', 'error', 'msg');
    if (msg) throw new Error(msg);
  }
  return null;
}

// ─── Processo de Importação ───────────────────────────────────────────────────

export type CanalAduaneiro = 'Verde' | 'Amarelo' | 'Vermelho' | 'Cinza';

export type TipoRegime =
  | 'Regime Comum'
  | 'Entreposto Aduaneiro'
  | 'Admissão Temporária'
  | 'Depósito Afiançado'
  | 'Drawback Suspensão'
  | 'Drawback Isenção';

export interface ProcessoImportacaoDTO {
  empresa: string;
  codigo: string;
  data_abertura: string;
  responsavel: string;
  status: string;
  tipo_regime: TipoRegime;
  dt_inicio_regime: string;
  dt_limite_regime?: string;
  dt_encerramento_regime?: string;
  canal_aduaneiro: CanalAduaneiro;
  fornecedor?: string;
  moeda?: string;
}

export interface ProcessoImportacaoResponse {
  empresa: string;
  codigo: string;
  data_abertura: string;
  responsavel: string;
  status: string;
  tipo_regime: string;
  dt_inicio_regime: string;
  dt_limite_regime?: string | null;
  dt_encerramento_regime?: string | null;
  canal_aduaneiro: string;
  fornecedor?: string | null;
  moeda?: string | null;
}

function parseProcessoImportacao(raw: unknown): ProcessoImportacaoResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;
  const codigo = parseStr(obj, 'codigo', 'Codigo');
  if (!codigo) return null;
  return {
    empresa: parseStr(obj, 'empresa', 'Empresa'),
    codigo,
    data_abertura: parseStr(obj, 'data_abertura', 'DataAbertura', 'dataAbertura'),
    responsavel: parseStr(obj, 'responsavel', 'Responsavel'),
    status: parseStr(obj, 'status', 'Status'),
    tipo_regime: parseStr(obj, 'tipo_regime', 'TipoRegime', 'tipoRegime'),
    dt_inicio_regime: parseStr(obj, 'dt_inicio_regime', 'DtInicioRegime', 'dtInicioRegime'),
    dt_limite_regime: parseStr(obj, 'dt_limite_regime', 'DtLimiteRegime', 'dtLimiteRegime') || null,
    dt_encerramento_regime: parseStr(obj, 'dt_encerramento_regime', 'DtEncerramentoRegime', 'dtEncerramentoRegime') || null,
    canal_aduaneiro: parseStr(obj, 'canal_aduaneiro', 'CanalAduaneiro', 'canalAduaneiro'),
    fornecedor: parseStr(obj, 'fornecedor', 'Fornecedor') || null,
    moeda: parseStr(obj, 'moeda', 'Moeda') || null,
  };
}

export async function createProcessoImportacao(dto: ProcessoImportacaoDTO): Promise<ProcessoImportacaoResponse> {
  const response = await httpClient.post<ProcessoImportacaoResponse>(`${BASE}/processo/create`, dto);
  return response.data;
}

export async function listProcessosImportacao(filters?: Record<string, string>): Promise<ProcessoImportacaoResponse[]> {
  const params = new URLSearchParams(filters);
  const qs = params.toString();
  const response = await httpClient.get<unknown>(`${BASE}/processo/list${qs ? `?${qs}` : ''}`);
  const arr = unwrapArray(response.data);
  if (!arr) return [];
  const result: ProcessoImportacaoResponse[] = [];
  for (const item of arr) {
    const p = parseProcessoImportacao(item);
    if (p) result.push(p);
  }
  return result;
}

export async function getProcessoImportacao(codigo: string): Promise<ProcessoImportacaoResponse | null> {
  const response = await httpClient.get<unknown>(`${BASE}/processo/${codigo}`);
  const direct = parseProcessoImportacao(response.data);
  if (direct) return direct;
  if (response.data && typeof response.data === 'object') {
    const obj = response.data as Obj;
    for (const key of ['data', 'processo', 'result', 'item']) {
      const inner = parseProcessoImportacao(obj[key]);
      if (inner) return inner;
    }
  }
  return null;
}

export async function updateProcessoImportacao(codigo: string, dto: ProcessoImportacaoDTO): Promise<ProcessoImportacaoResponse> {
  const response = await httpClient.put<ProcessoImportacaoResponse>(`${BASE}/processo/${codigo}`, dto);
  return response.data;
}

export async function deleteProcessoImportacao(codigo: string): Promise<void> {
  await httpClient.delete(`${BASE}/processo/${codigo}`);
}

// ─── Conhecimento de Transporte ───────────────────────────────────────────────

export type ModalTransporte = 'Aéreo' | 'Aquaviário' | 'Ferroviário' | 'Rodoviário' | 'Outros';

export interface ConhecimentoTransporteDTO {
  numero: string;
  data_emissao: string;
  data_embarque?: string;
  local_origem?: string;
  local_destino?: string;
  armador_transportador?: string;
  data_prevista_chegada?: string;
  data_efetiva_chegada?: string;
  semana_carregamento?: string;
  modal: ModalTransporte;
  tipo_conhecimento?: string;
  status_logistico?: string;
  observacoes?: string;
}

export interface ConhecimentoTransporteResponse {
  numero: string;
  data_emissao: string;
  data_embarque?: string | null;
  local_origem?: string | null;
  local_destino?: string | null;
  armador_transportador?: string | null;
  data_prevista_chegada?: string | null;
  data_efetiva_chegada?: string | null;
  semana_carregamento?: string | null;
  modal: string;
  tipo_conhecimento?: string | null;
  status_logistico?: string | null;
  observacoes?: string | null;
}

function parseConhecimentoTransporte(raw: unknown): ConhecimentoTransporteResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;
  const numero = parseStr(obj, 'numero', 'Numero');
  if (!numero) return null;
  return {
    numero,
    data_emissao: parseStr(obj, 'data_emissao', 'DataEmissao', 'dataEmissao'),
    data_embarque: parseStr(obj, 'data_embarque', 'DataEmbarque', 'dataEmbarque') || null,
    local_origem: parseStr(obj, 'local_origem', 'LocalOrigem', 'localOrigem') || null,
    local_destino: parseStr(obj, 'local_destino', 'LocalDestino', 'localDestino') || null,
    armador_transportador: parseStr(obj, 'armador_transportador', 'ArmadorTransportador', 'armadorTransportador') || null,
    data_prevista_chegada: parseStr(obj, 'data_prevista_chegada', 'DataPrevistaChegada', 'dataPrevistaChegada') || null,
    data_efetiva_chegada: parseStr(obj, 'data_efetiva_chegada', 'DataEfetivaChegada', 'dataEfetivaChegada') || null,
    semana_carregamento: parseStr(obj, 'semana_carregamento', 'SemanaCarregamento', 'semanaCarregamento') || null,
    modal: parseStr(obj, 'modal', 'Modal'),
    tipo_conhecimento: parseStr(obj, 'tipo_conhecimento', 'TipoConhecimento', 'tipoConhecimento') || null,
    status_logistico: parseStr(obj, 'status_logistico', 'StatusLogistico', 'statusLogistico') || null,
    observacoes: parseStr(obj, 'observacoes', 'Observacoes') || null,
  };
}

export async function createConhecimentoTransporte(dto: ConhecimentoTransporteDTO): Promise<ConhecimentoTransporteResponse> {
  const response = await httpClient.post<ConhecimentoTransporteResponse>(`${BASE}/conhecimento/create`, dto);
  return response.data;
}

export async function listConhecimentosTransporte(filters?: Record<string, string>): Promise<ConhecimentoTransporteResponse[]> {
  const params = new URLSearchParams(filters);
  const qs = params.toString();
  const response = await httpClient.get<unknown>(`${BASE}/conhecimento/list${qs ? `?${qs}` : ''}`);
  const arr = unwrapArray(response.data);
  if (!arr) return [];
  const result: ConhecimentoTransporteResponse[] = [];
  for (const item of arr) {
    const c = parseConhecimentoTransporte(item);
    if (c) result.push(c);
  }
  return result;
}

export async function getConhecimentoTransporte(numero: string): Promise<ConhecimentoTransporteResponse | null> {
  const response = await httpClient.get<unknown>(`${BASE}/conhecimento/${numero}`);
  const direct = parseConhecimentoTransporte(response.data);
  if (direct) return direct;
  if (response.data && typeof response.data === 'object') {
    const obj = response.data as Obj;
    for (const key of ['data', 'conhecimento', 'result', 'item']) {
      const inner = parseConhecimentoTransporte(obj[key]);
      if (inner) return inner;
    }
  }
  return null;
}

export async function updateConhecimentoTransporte(numero: string, dto: ConhecimentoTransporteDTO): Promise<ConhecimentoTransporteResponse> {
  const response = await httpClient.put<ConhecimentoTransporteResponse>(`${BASE}/conhecimento/${numero}`, dto);
  return response.data;
}

export async function deleteConhecimentoTransporte(numero: string): Promise<void> {
  await httpClient.delete(`${BASE}/conhecimento/${numero}`);
}

// ─── Container ─────────────────────────────────────────────────────────────────

export interface ContainerDTO {
  codigo: string;
  tipo?: string;
  peso_bruto?: number;
  volume?: number;
}

export interface ContainerResponse {
  codigo: string;
  tipo?: string | null;
  peso_bruto?: number | null;
  volume?: number | null;
}

function parseContainer(raw: unknown): ContainerResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;
  const codigo = parseStr(obj, 'codigo', 'Codigo');
  if (!codigo) return null;
  return {
    codigo,
    tipo: parseStr(obj, 'tipo', 'Tipo') || null,
    peso_bruto: parseNum(obj, 'peso_bruto', 'PesoBruto', 'pesoBruto') ?? null,
    volume: parseNum(obj, 'volume', 'Volume') ?? null,
  };
}

export async function createContainer(conhecimentoNumero: string, dto: ContainerDTO): Promise<ContainerResponse> {
  const response = await httpClient.post<ContainerResponse>(`${BASE}/conhecimento/${conhecimentoNumero}/container/create`, dto);
  return response.data;
}

export async function listContainers(conhecimentoNumero: string): Promise<ContainerResponse[]> {
  const response = await httpClient.get<unknown>(`${BASE}/conhecimento/${conhecimentoNumero}/container/list`);
  const arr = unwrapArray(response.data);
  if (!arr) return [];
  const result: ContainerResponse[] = [];
  for (const item of arr) {
    const c = parseContainer(item);
    if (c) result.push(c);
  }
  return result;
}

export async function deleteContainer(conhecimentoNumero: string, codigo: string): Promise<void> {
  await httpClient.delete(`${BASE}/conhecimento/${conhecimentoNumero}/container/${codigo}`);
}

// ─── Status Logístico ─────────────────────────────────────────────────────────

export interface StatusLogisticoDTO {
  codigo: string;
  descricao: string;
  observacao?: string;
  ativo: boolean;
}

export interface StatusLogisticoResponse {
  codigo: string;
  descricao: string;
  observacao?: string | null;
  ativo: boolean;
}

function parseStatusLogistico(raw: unknown): StatusLogisticoResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;
  const codigo = parseStr(obj, 'codigo', 'Codigo');
  if (!codigo) return null;
  return {
    codigo,
    descricao: parseStr(obj, 'descricao', 'Descricao'),
    observacao: parseStr(obj, 'observacao', 'Observacao') || null,
    ativo: parseBool(obj, 'ativo', 'Ativo'),
  };
}

export async function createStatusLogistico(dto: StatusLogisticoDTO): Promise<StatusLogisticoResponse> {
  const response = await httpClient.post<StatusLogisticoResponse>(`${BASE}/status-logistico/create`, dto);
  return response.data;
}

export async function listStatusLogisticos(): Promise<StatusLogisticoResponse[]> {
  const response = await httpClient.get<unknown>(`${BASE}/status-logistico/list`);
  const arr = unwrapArray(response.data);
  if (!arr) return [];
  const result: StatusLogisticoResponse[] = [];
  for (const item of arr) {
    const s = parseStatusLogistico(item);
    if (s) result.push(s);
  }
  return result;
}

export async function getStatusLogistico(codigo: string): Promise<StatusLogisticoResponse | null> {
  const response = await httpClient.get<unknown>(`${BASE}/status-logistico/${codigo}`);
  const direct = parseStatusLogistico(response.data);
  if (direct) return direct;
  if (response.data && typeof response.data === 'object') {
    const obj = response.data as Obj;
    for (const key of ['data', 'status', 'result', 'item']) {
      const inner = parseStatusLogistico(obj[key]);
      if (inner) return inner;
    }
  }
  return null;
}

export async function updateStatusLogistico(codigo: string, dto: StatusLogisticoDTO): Promise<StatusLogisticoResponse> {
  const response = await httpClient.put<StatusLogisticoResponse>(`${BASE}/status-logistico/${codigo}`, dto);
  return response.data;
}

export async function deleteStatusLogistico(codigo: string): Promise<void> {
  await httpClient.delete(`${BASE}/status-logistico/${codigo}`);
}

// ─── Tipo de Conhecimento ─────────────────────────────────────────────────────

export interface TipoConhecimentoDTO {
  codigo: string;
  descricao: string;
  modal: string;
  ativo: boolean;
}

export interface TipoConhecimentoResponse {
  codigo: string;
  descricao: string;
  modal: string;
  ativo: boolean;
}

function parseTipoConhecimento(raw: unknown): TipoConhecimentoResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;
  const codigo = parseStr(obj, 'codigo', 'Codigo');
  if (!codigo) return null;
  return {
    codigo,
    descricao: parseStr(obj, 'descricao', 'Descricao'),
    modal: parseStr(obj, 'modal', 'Modal'),
    ativo: parseBool(obj, 'ativo', 'Ativo'),
  };
}

export async function createTipoConhecimento(dto: TipoConhecimentoDTO): Promise<TipoConhecimentoResponse> {
  const response = await httpClient.post<TipoConhecimentoResponse>(`${BASE}/tipo-conhecimento/create`, dto);
  return response.data;
}

export async function listTiposConhecimento(): Promise<TipoConhecimentoResponse[]> {
  const response = await httpClient.get<unknown>(`${BASE}/tipo-conhecimento/list`);
  const arr = unwrapArray(response.data);
  if (!arr) return [];
  const result: TipoConhecimentoResponse[] = [];
  for (const item of arr) {
    const t = parseTipoConhecimento(item);
    if (t) result.push(t);
  }
  return result;
}

export async function updateTipoConhecimento(codigo: string, dto: TipoConhecimentoDTO): Promise<TipoConhecimentoResponse> {
  const response = await httpClient.put<TipoConhecimentoResponse>(`${BASE}/tipo-conhecimento/${codigo}`, dto);
  return response.data;
}

export async function deleteTipoConhecimento(codigo: string): Promise<void> {
  await httpClient.delete(`${BASE}/tipo-conhecimento/${codigo}`);
}
