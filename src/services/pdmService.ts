import { httpClient } from '@/services/httpClient';

const BASE = '/api/pdm';

// ─── DTOs ──────────────────────────────────────────────────────────────────────

export interface EmpresaVinculoPDM_DTO {
  empresa: string;
  item_base?: string;
}

export interface GrupoPDM_DTO {
  grupo_pdm: string;
  descricao: string;
  abrev: string;
  empresas: EmpresaVinculoPDM_DTO[];
}

export interface ModificadorPDM_DTO {
  grupo_pdm: string;
  modificador: string;
  descricao: string;
  abreviacao: string;
  empresas: EmpresaVinculoPDM_DTO[];
}

export interface AtributoPDM_DTO {
  grupo_pdm: string;
  modificador: string;
  seq: number;
  atributo: number;
  texto_ant: string;
  descricao: string;
  texto_post: string;
  tam: 'Essencial' | 'Complementar';
  ec: 'Essencial' | 'Complementar';
  empresas: EmpresaVinculoPDM_DTO[];
}

// ─── Response Types ────────────────────────────────────────────────────────────

export interface EmpresaVinculoPDM_Response {
  empresa: string;
  item_base?: string;
}

export interface GrupoPDM_Response {
  grupo_pdm: string;
  descricao: string;
  abrev: string;
  empresas: EmpresaVinculoPDM_Response[];
}

export interface ModificadorPDM_Response {
  grupo_pdm: string;
  modificador: string;
  descricao: string;
  abreviacao: string;
  empresas: EmpresaVinculoPDM_Response[];
}

export interface AtributoPDM_Response {
  grupo_pdm: string;
  modificador: string;
  seq: number;
  atributo: number;
  texto_ant: string;
  descricao: string;
  texto_post: string;
  tam: 'Essencial' | 'Complementar';
  ec: 'Essencial' | 'Complementar';
  empresas: EmpresaVinculoPDM_Response[];
}

// ─── Defensive Parsers ─────────────────────────────────────────────────────────

function parseStr(raw: unknown, ...keys: string[]): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') return String(raw);
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) {
      const v = r[k];
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return String(v);
    }
  }
  return '';
}

function parseNum(raw: unknown, ...keys: string[]): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    return isNaN(n) ? 0 : n;
  }
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) {
      const v = r[k];
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = Number(v);
        return isNaN(n) ? 0 : n;
      }
    }
  }
  return 0;
}

function parseTamEC(raw: unknown, ...keys: string[]): 'Essencial' | 'Complementar' {
  if (raw === null || raw === undefined) return 'Essencial';
  if (typeof raw === 'string') {
    const v = raw.trim().toLowerCase();
    if (v.startsWith('c')) return 'Complementar';
    return 'Essencial';
  }
  if (typeof raw === 'number') return raw === 1 ? 'Complementar' : 'Essencial';
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) {
      const v = r[k];
      if (typeof v === 'string') {
        const sv = v.trim().toLowerCase();
        if (sv.startsWith('c')) return 'Complementar';
        return 'Essencial';
      }
      if (typeof v === 'number') return v === 1 ? 'Complementar' : 'Essencial';
    }
  }
  return 'Essencial';
}

function parseEmpresa(raw: unknown): EmpresaVinculoPDM_Response {
  return {
    empresa: parseStr(raw, 'empresa', 'Empresa', 'COD_EMPRESA'),
    item_base: parseStr(raw, 'item_base', 'ItemBase', 'COD_ITEM_BASE') || undefined,
  };
}

function parseGrupo(raw: unknown): GrupoPDM_Response {
  return {
    grupo_pdm: parseStr(raw, 'grupo_pdm', 'GrupoPDM', 'COD_GRUPO_PDM'),
    descricao: parseStr(raw, 'descricao', 'Descricao', 'DES_GRUPO'),
    abrev: parseStr(raw, 'abrev', 'Abrev', 'ABREV_GRUPO'),
    empresas: Array.isArray((raw as any)?.empresas ?? (raw as any)?.Empresas)
      ? ((raw as any)?.empresas ?? (raw as any)?.Empresas).map(parseEmpresa)
      : [],
  };
}

function parseModificador(raw: unknown): ModificadorPDM_Response {
  return {
    grupo_pdm: parseStr(raw, 'grupo_pdm', 'GrupoPDM', 'COD_GRUPO_PDM'),
    modificador: parseStr(raw, 'modificador', 'Modificador', 'COD_MODIFICADOR'),
    descricao: parseStr(raw, 'descricao', 'Descricao', 'DES_MODIFICADOR'),
    abreviacao: parseStr(raw, 'abreviacao', 'Abreviacao', 'ABREV_MODIFICADOR'),
    empresas: Array.isArray((raw as any)?.empresas ?? (raw as any)?.Empresas)
      ? ((raw as any)?.empresas ?? (raw as any)?.Empresas).map(parseEmpresa)
      : [],
  };
}

function parseAtributo(raw: unknown): AtributoPDM_Response {
  return {
    grupo_pdm: parseStr(raw, 'grupo_pdm', 'GrupoPDM', 'COD_GRUPO_PDM'),
    modificador: parseStr(raw, 'modificador', 'Modificador', 'COD_MODIFICADOR'),
    seq: parseNum(raw, 'seq', 'Seq', 'SEQ'),
    atributo: parseNum(raw, 'atributo', 'Atributo', 'COD_ATRIBUTO'),
    texto_ant: parseStr(raw, 'texto_ant', 'TextoAnt', 'TEXTO_ANT'),
    descricao: parseStr(raw, 'descricao', 'Descricao', 'DES_ATRIBUTO'),
    texto_post: parseStr(raw, 'texto_post', 'TextoPost', 'TEXTO_POST'),
    tam: parseTamEC(raw, 'tam', 'TAM', 'TAM_ATRIBUTO'),
    ec: parseTamEC(raw, 'ec', 'EC', 'EC_ATRIBUTO'),
    empresas: Array.isArray((raw as any)?.empresas ?? (raw as any)?.Empresas)
      ? ((raw as any)?.empresas ?? (raw as any)?.Empresas).map(parseEmpresa)
      : [],
  };
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

// ─── Grupos PDM ────────────────────────────────────────────────────────────────

export async function criarGrupoPDM(dto: GrupoPDM_DTO): Promise<GrupoPDM_Response> {
  const { data } = await httpClient.post(`${BASE}/grupos`, dto);
  return parseGrupo(data);
}

export async function atualizarGrupoPDM(grupo: string, dto: Partial<GrupoPDM_DTO>): Promise<GrupoPDM_Response> {
  const { data } = await httpClient.put(`${BASE}/grupos/${grupo}`, dto);
  return parseGrupo(data);
}

export async function buscarGrupoPDM(grupo: string): Promise<GrupoPDM_Response | null> {
  try {
    const { data } = await httpClient.get(`${BASE}/grupos/${grupo}`);
    return parseGrupo(data);
  } catch {
    return null;
  }
}

export async function listarGruposPDM(): Promise<GrupoPDM_Response[]> {
  const { data } = await httpClient.get(`${BASE}/grupos`);
  return unwrapArray(data).map(parseGrupo);
}

// ─── Modificadores PDM ─────────────────────────────────────────────────────────

export async function criarModificadorPDM(dto: ModificadorPDM_DTO): Promise<ModificadorPDM_Response> {
  const { data } = await httpClient.post(`${BASE}/modificadores`, dto);
  return parseModificador(data);
}

export async function atualizarModificadorPDM(
  grupo: string,
  modificador: string,
  dto: Partial<ModificadorPDM_DTO>,
): Promise<ModificadorPDM_Response> {
  const { data } = await httpClient.put(`${BASE}/modificadores/${grupo}/${modificador}`, dto);
  return parseModificador(data);
}

export async function buscarModificadorPDM(grupo: string, modificador: string): Promise<ModificadorPDM_Response | null> {
  try {
    const { data } = await httpClient.get(`${BASE}/modificadores/${grupo}/${modificador}`);
    return parseModificador(data);
  } catch {
    return null;
  }
}

export async function listarModificadoresPDM(grupo?: string): Promise<ModificadorPDM_Response[]> {
  const params = grupo ? { grupo_pdm: grupo } : undefined;
  const { data } = await httpClient.get(`${BASE}/modificadores`, { params });
  return unwrapArray(data).map(parseModificador);
}

// ─── Atributos PDM ─────────────────────────────────────────────────────────────

export async function criarAtributoPDM(dto: AtributoPDM_DTO): Promise<AtributoPDM_Response> {
  const { data } = await httpClient.post(`${BASE}/atributos`, dto);
  return parseAtributo(data);
}

export async function atualizarAtributoPDM(
  grupo: string,
  modificador: string,
  seq: number,
  dto: Partial<AtributoPDM_DTO>,
): Promise<AtributoPDM_Response> {
  const { data } = await httpClient.put(`${BASE}/atributos/${grupo}/${modificador}/${seq}`, dto);
  return parseAtributo(data);
}

export async function buscarAtributoPDM(
  grupo: string,
  modificador: string,
  seq: number,
): Promise<AtributoPDM_Response | null> {
  try {
    const { data } = await httpClient.get(`${BASE}/atributos/${grupo}/${modificador}/${seq}`);
    return parseAtributo(data);
  } catch {
    return null;
  }
}

export async function listarAtributosPDM(grupo?: string, modificador?: string): Promise<AtributoPDM_Response[]> {
  const params: Record<string, string> = {};
  if (grupo) params.grupo_pdm = grupo;
  if (modificador) params.modificador = modificador;
  const { data } = await httpClient.get(`${BASE}/atributos`, { params });
  return unwrapArray(data).map(parseAtributo);
}

// ─── Copiar / Colar Atributos ──────────────────────────────────────────────────

export async function copiarAtributos(grupo: string, modificador: string): Promise<AtributoPDM_Response[]> {
  const { data } = await httpClient.get(`${BASE}/atributos/copiar/${grupo}/${modificador}`);
  return unwrapArray(data).map(parseAtributo);
}

export async function colarAtributos(
  grupo: string,
  modificador: string,
  atributos: AtributoPDM_DTO[],
): Promise<AtributoPDM_Response[]> {
  const { data } = await httpClient.post(`${BASE}/atributos/colar/${grupo}/${modificador}`, { atributos });
  return unwrapArray(data).map(parseAtributo);
}
