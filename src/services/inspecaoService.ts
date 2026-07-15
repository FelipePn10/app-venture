import axios from "axios";

const BASE = "/api/inspecao";

// ════════════════════════════════════════════════════════════════════════
// Tipos de Ocorrência
// ════════════════════════════════════════════════════════════════════════

export interface TipoOcorrenciaDTO {
  codigo: string;
  descricao: string;
  email: boolean;
  layout: string;
  nao_conformidade: boolean;
  disposicao: boolean;
  causa: boolean;
  acoes_corretivas: boolean;
  acoes_preventivas: boolean;
  verificacao_acoes: boolean;
  fechamento: boolean;
}

export interface TipoOcorrenciaResponse extends TipoOcorrenciaDTO {}

export interface TipoOcorrenciaFilter {
  codigo?: string;
  descricao?: string;
  layout?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Ocorrências
// ════════════════════════════════════════════════════════════════════════

export interface OcorrenciaDTO {
  numero: string;
  data_ocorrencia: string;
  fornecedor: string;
  tipo_ocorrencia: string;
  item: string;
  ordem_insp_processo: string;
  sequencia: string;
  exibir_dados_relatorio?: boolean;
  abonado?: boolean;
  fechamento?: string;
  motivo_abono?: string;
}

export interface OcorrenciaResponse extends OcorrenciaDTO {}

export interface OcorrenciaFilter {
  numero?: string;
  tipo_ocorrencia?: string;
  fornecedor?: string;
  centro_custo?: string;
  data_inicio?: string;
  data_fim?: string;
  tipo?: string;
  listar?: "AMBAS" | "FECHADAS" | "ABERTAS";
}

// ════════════════════════════════════════════════════════════════════════
// Roteiro de Inspeção
// ════════════════════════════════════════════════════════════════════════

export interface InspecaoSequenciaItem {
  sequencia: number;
  inspecao: string;
  especie: string;
  apontamento: boolean;
  forma_apontamento: string;
  emite_etiqueta: boolean;
  grupo_instr?: string;
  tipo_amostra?: string;
  um?: string;
  norma?: string;
  referencia?: string;
  data_validade?: string;
  instrumentos?: string[];
}

export interface RoteiroInspecaoDTO {
  classificacao?: string;
  item?: string;
  almoxarifado?: string;
  manuseio?: string;
  armazenamento?: string;
  tipo_roteiro?: string;
  elaborado?: string;
  data_cadastro?: string;
  tipo_mercado?: string;
  tipo?: string;
  data_validade?: string;
  sequencias: InspecaoSequenciaItem[];
}

export interface RoteiroInspecaoResponse extends RoteiroInspecaoDTO {}

export interface RoteiroInspecaoFilter {
  classificacao?: string;
  item?: string;
  almoxarifado?: string;
  tipo_roteiro?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Ordem de Inspeção
// ════════════════════════════════════════════════════════════════════════

export interface OrdemInspecaoItem {
  sequencia: number;
  item: string;
  quantidade: number;
  descricao: string;
  nro_nota?: string;
  nro_aviso?: string;
  data_entrada?: string;
}

export interface OrdemInspecaoDTO {
  ordem: string;
  nro_nota: string;
  fornecedor: string;
  itens: OrdemInspecaoItem[];
  data_entrada: string;
  status: string;
  classificacao?: string;
  tipo?: string;
}

export interface OrdemInspecaoResponse extends OrdemInspecaoDTO {}

export interface OrdemInspecaoFilter {
  ordem?: string;
  nro_nota?: string;
  fornecedor?: string;
  itens?: string;
  classificacao?: string;
  data_entrada?: string;
  status?: string;
  tipo?: string;
  configurado?: boolean;
}

// ════════════════════════════════════════════════════════════════════════
// Tipo de Roteiro
// ════════════════════════════════════════════════════════════════════════

export interface TipoRoteiroDTO {
  codigo: string;
  descricao: string;
}

export interface TipoRoteiroResponse extends TipoRoteiroDTO {}

// ════════════════════════════════════════════════════════════════════════
// Abono Divergência
// ════════════════════════════════════════════════════════════════════════

export interface AbonoDivergenciaDTO {
  descricao: string;
}

export interface AbonoDivergenciaResponse extends AbonoDivergenciaDTO {
  codigo: string;
}

// ════════════════════════════════════════════════════════════════════════
// Avaliação de Fornecedores
// ════════════════════════════════════════════════════════════════════════

export interface DimensaoDTO {
  id: string;
  descricao: string;
  peso: number;
}

export interface CriterioDTO {
  id: string;
  descricao: string;
  peso: number;
  tipo: string;
}

export interface IntervaloDTO {
  sequencia: number;
  item: string;
  classificacao: string;
  fornecedor: string;
  valor_inicial: number;
  valor_final: number;
  conceito: number;
}

export interface AvaliacaoFornecedorDTO {
  fornecedor: string;
  tipo_fornecedor: string;
  tipo_utilizacao: string;
  dimensoes: DimensaoDTO[];
  criterios: CriterioDTO[];
  intervalos: IntervaloDTO[];
}

export interface AvaliacaoFornecedorResponse extends AvaliacaoFornecedorDTO {}

// ════════════════════════════════════════════════════════════════════════
// Envio IQF
// ════════════════════════════════════════════════════════════════════════

export interface EnvioIQF_DTO {
  fornecedor: string;
  tipo: string;
  periodo_inicio: string;
  periodo_fim: string;
}

export interface EnvioIQF_Response extends EnvioIQF_DTO {
  empresa: string;
  iqf: number;
  parecer: string;
  classificacao: string;
  layout: string;
}

// ════════════════════════════════════════════════════════════════════════
// Inspeção (consulta)
// ════════════════════════════════════════════════════════════════════════

export interface InspecaoRecord {
  ordem: string;
  data_ordem: string;
  data_inspecao: string;
  fornecedor: string;
  tipo: string;
  classificacao: string;
  itens: string;
  configurado: boolean;
  tipo_roteiro: string;
}

export interface InspecaoFilter {
  data_ordem_inicio?: string;
  data_ordem_fim?: string;
  data_inspecao_inicio?: string;
  data_inspecao_fim?: string;
  fornecedor?: string;
  tipo?: string;
  classificacao?: string;
  itens?: string;
  configurado?: boolean;
  ordem?: string;
  tipo_roteiro?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Defensive Parsers
// ════════════════════════════════════════════════════════════════════════

function safeString(v: unknown, def = ""): string {
  return typeof v === "string" ? v : def;
}

function safeBoolean(v: unknown, def = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toUpperCase() === "TRUE" || v === "1";
  if (typeof v === "number") return v === 1;
  return def;
}

function safeNumber(v: unknown, def = 0): number {
  if (typeof v === "number") return isFinite(v) ? v : def;
  if (typeof v === "string") {
    const n = Number(v);
    return isFinite(n) ? n : def;
  }
  return def;
}

function safeArray<T>(v: unknown, mapper: (item: unknown) => T): T[] {
  if (Array.isArray(v)) return v.map(mapper);
  return [];
}

function normalizeError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    const msg = data?.message ?? data?.error;
    if (msg) return msg;
  }
  return error instanceof Error ? error.message : fallback;
}

// ════════════════════════════════════════════════════════════════════════
// CRUD — Tipo de Ocorrência
// ════════════════════════════════════════════════════════════════════════

export async function listTipoOcorrencia(filtros?: TipoOcorrenciaFilter): Promise<TipoOcorrenciaResponse[]> {
  const { data } = await axios.get<TipoOcorrenciaResponse[]>(`${BASE}/tipo-ocorrencia`, { params: filtros });
  return data.map((r) => ({
    codigo: safeString(r.codigo),
    descricao: safeString(r.descricao),
    email: safeBoolean(r.email),
    layout: safeString(r.layout),
    nao_conformidade: safeBoolean(r.nao_conformidade),
    disposicao: safeBoolean(r.disposicao),
    causa: safeBoolean(r.causa),
    acoes_corretivas: safeBoolean(r.acoes_corretivas),
    acoes_preventivas: safeBoolean(r.acoes_preventivas),
    verificacao_acoes: safeBoolean(r.verificacao_acoes),
    fechamento: safeBoolean(r.fechamento),
  }));
}

export async function getTipoOcorrencia(codigo: string): Promise<TipoOcorrenciaResponse | null> {
  try {
    const { data } = await axios.get<TipoOcorrenciaResponse>(`${BASE}/tipo-ocorrencia/${codigo}`);
    return {
      codigo: safeString(data.codigo),
      descricao: safeString(data.descricao),
      email: safeBoolean(data.email),
      layout: safeString(data.layout),
      nao_conformidade: safeBoolean(data.nao_conformidade),
      disposicao: safeBoolean(data.disposicao),
      causa: safeBoolean(data.causa),
      acoes_corretivas: safeBoolean(data.acoes_corretivas),
      acoes_preventivas: safeBoolean(data.acoes_preventivas),
      verificacao_acoes: safeBoolean(data.verificacao_acoes),
      fechamento: safeBoolean(data.fechamento),
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function createTipoOcorrencia(dto: TipoOcorrenciaDTO): Promise<TipoOcorrenciaResponse> {
  const { data } = await axios.post<TipoOcorrenciaResponse>(`${BASE}/tipo-ocorrencia`, dto);
  return { ...dto, ...data };
}

export async function updateTipoOcorrencia(codigo: string, dto: TipoOcorrenciaDTO): Promise<TipoOcorrenciaResponse> {
  const { data } = await axios.put<TipoOcorrenciaResponse>(`${BASE}/tipo-ocorrencia/${codigo}`, dto);
  return { ...dto, ...data };
}

export async function deleteTipoOcorrencia(codigo: string): Promise<void> {
  await axios.delete(`${BASE}/tipo-ocorrencia/${codigo}`);
}

// ════════════════════════════════════════════════════════════════════════
// CRUD — Ocorrência
// ════════════════════════════════════════════════════════════════════════

export async function listOcorrencias(filtros?: OcorrenciaFilter): Promise<OcorrenciaResponse[]> {
  const { data } = await axios.get<OcorrenciaResponse[]>(`${BASE}/ocorrencia`, { params: filtros });
  return data.map((r) => ({
    numero: safeString(r.numero),
    data_ocorrencia: safeString(r.data_ocorrencia),
    fornecedor: safeString(r.fornecedor),
    tipo_ocorrencia: safeString(r.tipo_ocorrencia),
    item: safeString(r.item),
    ordem_insp_processo: safeString(r.ordem_insp_processo),
    sequencia: safeString(r.sequencia),
    exibir_dados_relatorio: safeBoolean(r.exibir_dados_relatorio),
    abonado: safeBoolean(r.abonado),
    fechamento: safeString(r.fechamento),
    motivo_abono: safeString(r.motivo_abono),
  }));
}

export async function getOcorrencia(numero: string): Promise<OcorrenciaResponse | null> {
  try {
    const { data } = await axios.get<OcorrenciaResponse>(`${BASE}/ocorrencia/${numero}`);
    return {
      numero: safeString(data.numero),
      data_ocorrencia: safeString(data.data_ocorrencia),
      fornecedor: safeString(data.fornecedor),
      tipo_ocorrencia: safeString(data.tipo_ocorrencia),
      item: safeString(data.item),
      ordem_insp_processo: safeString(data.ordem_insp_processo),
      sequencia: safeString(data.sequencia),
      exibir_dados_relatorio: safeBoolean(data.exibir_dados_relatorio),
      abonado: safeBoolean(data.abonado),
      fechamento: safeString(data.fechamento),
      motivo_abono: safeString(data.motivo_abono),
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function createOcorrencia(dto: OcorrenciaDTO): Promise<OcorrenciaResponse> {
  const { data } = await axios.post<OcorrenciaResponse>(`${BASE}/ocorrencia`, dto);
  return { ...dto, ...data };
}

export async function updateOcorrencia(numero: string, dto: OcorrenciaDTO): Promise<OcorrenciaResponse> {
  const { data } = await axios.put<OcorrenciaResponse>(`${BASE}/ocorrencia/${numero}`, dto);
  return { ...dto, ...data };
}

// ════════════════════════════════════════════════════════════════════════
// CRUD — Roteiro de Inspeção
// ════════════════════════════════════════════════════════════════════════

function parseSequenciaItem(v: unknown): InspecaoSequenciaItem {
  const r = v as Record<string, unknown>;
  return {
    sequencia: safeNumber(r?.sequencia),
    inspecao: safeString(r?.inspecao),
    especie: safeString(r?.especie),
    apontamento: safeBoolean(r?.apontamento),
    forma_apontamento: safeString(r?.forma_apontamento),
    emite_etiqueta: safeBoolean(r?.emite_etiqueta),
    grupo_instr: safeString(r?.grupo_instr) || undefined,
    tipo_amostra: safeString(r?.tipo_amostra) || undefined,
    um: safeString(r?.um) || undefined,
    norma: safeString(r?.norma) || undefined,
    referencia: safeString(r?.referencia) || undefined,
    data_validade: safeString(r?.data_validade) || undefined,
    instrumentos: safeArray(r?.instrumentos, (i) => safeString(i)),
  };
}

export async function listRoteirosInspecao(filtros?: RoteiroInspecaoFilter): Promise<RoteiroInspecaoResponse[]> {
  const { data } = await axios.get<RoteiroInspecaoResponse[]>(`${BASE}/roteiro-inspecao`, { params: filtros });
  return data.map((r) => ({
    classificacao: safeString(r.classificacao) || undefined,
    item: safeString(r.item) || undefined,
    almoxarifado: safeString(r.almoxarifado) || undefined,
    manuseio: safeString(r.manuseio) || undefined,
    armazenamento: safeString(r.armazenamento) || undefined,
    tipo_roteiro: safeString(r.tipo_roteiro) || undefined,
    elaborado: safeString(r.elaborado) || undefined,
    data_cadastro: safeString(r.data_cadastro) || undefined,
    tipo_mercado: safeString(r.tipo_mercado) || undefined,
    tipo: safeString(r.tipo) || undefined,
    data_validade: safeString(r.data_validade) || undefined,
    sequencias: safeArray(r.sequencias, parseSequenciaItem),
  }));
}

export async function createRoteiroInspecao(dto: RoteiroInspecaoDTO): Promise<RoteiroInspecaoResponse> {
  const { data } = await axios.post<RoteiroInspecaoResponse>(`${BASE}/roteiro-inspecao`, dto);
  return { ...dto, ...data };
}

export async function updateRoteiroInspecao(id: string, dto: RoteiroInspecaoDTO): Promise<RoteiroInspecaoResponse> {
  const { data } = await axios.put<RoteiroInspecaoResponse>(`${BASE}/roteiro-inspecao/${id}`, dto);
  return { ...dto, ...data };
}

// ════════════════════════════════════════════════════════════════════════
// CRUD — Ordem de Inspeção
// ════════════════════════════════════════════════════════════════════════

function parseOrdemItem(v: unknown): OrdemInspecaoItem {
  const r = v as Record<string, unknown>;
  return {
    sequencia: safeNumber(r?.sequencia),
    item: safeString(r?.item),
    quantidade: safeNumber(r?.quantidade),
    descricao: safeString(r?.descricao),
    nro_nota: safeString(r?.nro_nota) || undefined,
    nro_aviso: safeString(r?.nro_aviso) || undefined,
    data_entrada: safeString(r?.data_entrada) || undefined,
  };
}

export async function listOrdensInspecao(filtros?: OrdemInspecaoFilter): Promise<OrdemInspecaoResponse[]> {
  const { data } = await axios.get<OrdemInspecaoResponse[]>(`${BASE}/ordem-inspecao`, { params: filtros });
  return data.map((r) => ({
    ordem: safeString(r.ordem),
    nro_nota: safeString(r.nro_nota),
    fornecedor: safeString(r.fornecedor),
    data_entrada: safeString(r.data_entrada),
    status: safeString(r.status),
    classificacao: safeString(r.classificacao) || undefined,
    tipo: safeString(r.tipo) || undefined,
    itens: safeArray(r.itens, parseOrdemItem),
  }));
}

export async function getOrdemInspecao(ordem: string): Promise<OrdemInspecaoResponse | null> {
  try {
    const { data } = await axios.get<OrdemInspecaoResponse>(`${BASE}/ordem-inspecao/${ordem}`);
    return {
      ordem: safeString(data.ordem),
      nro_nota: safeString(data.nro_nota),
      fornecedor: safeString(data.fornecedor),
      data_entrada: safeString(data.data_entrada),
      status: safeString(data.status),
      classificacao: safeString(data.classificacao) || undefined,
      tipo: safeString(data.tipo) || undefined,
      itens: safeArray(data.itens, parseOrdemItem),
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function deleteOrdemInspecao(ordem: string): Promise<void> {
  await axios.delete(`${BASE}/ordem-inspecao/${ordem}`);
}

export async function aprovarOrdemInspecao(ordem: string): Promise<void> {
  await axios.post(`${BASE}/ordem-inspecao/${ordem}/aprovar`);
}

// ════════════════════════════════════════════════════════════════════════
// CRUD — Tipo de Roteiro
// ════════════════════════════════════════════════════════════════════════

export async function listTipoRoteiro(): Promise<TipoRoteiroResponse[]> {
  const { data } = await axios.get<TipoRoteiroResponse[]>(`${BASE}/tipo-roteiro`);
  return data.map((r) => ({
    codigo: safeString(r.codigo),
    descricao: safeString(r.descricao),
  }));
}

export async function createTipoRoteiro(dto: TipoRoteiroDTO): Promise<TipoRoteiroResponse> {
  const { data } = await axios.post<TipoRoteiroResponse>(`${BASE}/tipo-roteiro`, dto);
  return data;
}

// ════════════════════════════════════════════════════════════════════════
// CRUD — Abono Divergência
// ════════════════════════════════════════════════════════════════════════

export async function createAbonoDivergencia(dto: AbonoDivergenciaDTO): Promise<AbonoDivergenciaResponse> {
  const { data } = await axios.post<AbonoDivergenciaResponse>(`${BASE}/abono-divergencia`, dto);
  return data;
}

// ════════════════════════════════════════════════════════════════════════
// CRUD — Avaliação de Fornecedores
// ════════════════════════════════════════════════════════════════════════

function parseDimensao(v: unknown): DimensaoDTO {
  const r = v as Record<string, unknown>;
  return {
    id: safeString(r?.id),
    descricao: safeString(r?.descricao),
    peso: safeNumber(r?.peso),
  };
}

function parseCriterio(v: unknown): CriterioDTO {
  const r = v as Record<string, unknown>;
  return {
    id: safeString(r?.id),
    descricao: safeString(r?.descricao),
    peso: safeNumber(r?.peso),
    tipo: safeString(r?.tipo),
  };
}

function parseIntervalo(v: unknown): IntervaloDTO {
  const r = v as Record<string, unknown>;
  return {
    sequencia: safeNumber(r?.sequencia),
    item: safeString(r?.item),
    classificacao: safeString(r?.classificacao),
    fornecedor: safeString(r?.fornecedor),
    valor_inicial: safeNumber(r?.valor_inicial),
    valor_final: safeNumber(r?.valor_final),
    conceito: safeNumber(r?.conceito),
  };
}

export async function getAvaliacaoFornecedor(id: string): Promise<AvaliacaoFornecedorResponse | null> {
  try {
    const { data } = await axios.get<AvaliacaoFornecedorResponse>(`${BASE}/avaliacao-fornecedor/${id}`);
    return {
      fornecedor: safeString(data.fornecedor),
      tipo_fornecedor: safeString(data.tipo_fornecedor),
      tipo_utilizacao: safeString(data.tipo_utilizacao),
      dimensoes: safeArray(data.dimensoes, parseDimensao),
      criterios: safeArray(data.criterios, parseCriterio),
      intervalos: safeArray(data.intervalos, parseIntervalo),
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function saveAvaliacaoFornecedor(dto: AvaliacaoFornecedorDTO): Promise<AvaliacaoFornecedorResponse> {
  const { data } = await axios.post<AvaliacaoFornecedorResponse>(`${BASE}/avaliacao-fornecedor`, dto);
  return data;
}

// ════════════════════════════════════════════════════════════════════════
// CRUD — Envio IQF
// ════════════════════════════════════════════════════════════════════════

export async function listEnvioIQF(filtros?: EnvioIQF_DTO): Promise<EnvioIQF_Response[]> {
  const { data } = await axios.get<EnvioIQF_Response[]>(`${BASE}/envio-iqf`, { params: filtros });
  return data.map((r) => ({
    fornecedor: safeString(r.fornecedor),
    tipo: safeString(r.tipo),
    periodo_inicio: safeString(r.periodo_inicio),
    periodo_fim: safeString(r.periodo_fim),
    empresa: safeString(r.empresa),
    iqf: safeNumber(r.iqf),
    parecer: safeString(r.parecer),
    classificacao: safeString(r.classificacao),
    layout: safeString(r.layout),
  }));
}

export async function enviarIQF(dto: EnvioIQF_DTO): Promise<void> {
  await axios.post(`${BASE}/envio-iqf`, dto);
}

// ════════════════════════════════════════════════════════════════════════
// CRUD — Inspeção (consulta)
// ════════════════════════════════════════════════════════════════════════

export async function listInspecoes(filtros?: InspecaoFilter): Promise<InspecaoRecord[]> {
  const { data } = await axios.get<InspecaoRecord[]>(`${BASE}/consulta`, { params: filtros });
  return data.map((r) => ({
    ordem: safeString(r.ordem),
    data_ordem: safeString(r.data_ordem),
    data_inspecao: safeString(r.data_inspecao),
    fornecedor: safeString(r.fornecedor),
    tipo: safeString(r.tipo),
    classificacao: safeString(r.classificacao),
    itens: safeString(r.itens),
    configurado: safeBoolean(r.configurado),
    tipo_roteiro: safeString(r.tipo_roteiro),
  }));
}

export async function gerarExcelInspecao(filtros?: InspecaoFilter): Promise<void> {
  await axios.post(`${BASE}/consulta/excel`, filtros, { responseType: "blob" });
}

export { normalizeError as normalizeInspecaoError };
