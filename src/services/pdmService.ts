import { httpClient, parseStr, parseNum, currentUserId, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/**
 * PDM — Grupos e Modificadores (`/api/pdm`, backend real panossoerp).
 *
 * A descrição técnica do item nasce da composição **Grupo + Modificador + Atributos**
 * (ver cadastro de Item). No backend, Grupo e Modificador são cadastros mínimos:
 *  - **Grupo**: `code` (int, informado), `description`, `enterprise_id`. Sem exclusão.
 *  - **Modificador**: `id` (gerado), `description`. Vincula-se a grupos; grupo sem vínculo aceita todos.
 *  - **Atributos**: o modelo mora em `/atributos`; os valores, em `pdm.attributes` no
 *    cadastro do item (`pdm.attributes`), não neste módulo.
 *
 * Rotas: `POST /create-group`, `GET /groups`, `GET|PUT /groups/{code}`,
 *        `POST /create-modifier`, `GET /modifiers`, `GET|PUT /modifiers/{id}`.
 * `created_by` vem do usuário logado.
 */
const BASE = '/api/pdm';

export interface GrupoPDM {
  id?: number;
  code: number;
  description: string;
  enterprise_id?: number;
  is_active?: boolean;
}
export interface ModificadorPDM {
  id?: number;
  description: string;
  is_active?: boolean;
}
export interface UsoPDM { groups: Record<string, number>; modifiers: Record<string, number> }

function parseGrupo(raw: unknown): GrupoPDM {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    enterprise_id: parseNum(o, 'enterprise_id', 'EnterpriseID') || undefined,
    is_active: o['is_active'] !== false,
  };
}
function parseModificador(raw: unknown): ModificadorPDM {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    description: parseStr(o, 'description', 'Description'),
    is_active: o['is_active'] !== false,
  };
}

// ── Grupos ──
/** A API pagina em até 200: a lista parava nas primeiras linhas e o próximo código saía repetido. */
export async function listarGrupos(): Promise<GrupoPDM[]> {
  const todos: GrupoPDM[] = [];
  for (let page = 1; ; page++) {
    const { data } = await httpClient.get(`${BASE}/groups`, { params: { page, page_size: 200 } });
    const lote = unwrapArray(data).map(parseGrupo);
    todos.push(...lote);
    if (lote.length < 200) return todos;
  }
}
export async function usoDoPDM(): Promise<UsoPDM> {
  const { data } = await httpClient.get(`${BASE}/uso`);
  return data as UsoPDM;
}
export async function buscarGrupo(code: number): Promise<GrupoPDM> {
  const { data } = await httpClient.get(`${BASE}/groups/${code}`);
  return parseGrupo(data);
}
export async function criarGrupo(dto: GrupoPDM): Promise<GrupoPDM> {
  const { data } = await httpClient.post(`${BASE}/create-group`, {
    code: dto.code,
    description: dto.description,
  });
  return parseGrupo(data);
}
export async function atualizarGrupo(code: number, dto: Pick<GrupoPDM, 'description' | 'is_active'>): Promise<GrupoPDM> {
  const { data } = await httpClient.put(`${BASE}/groups/${code}`, {
    description: dto.description,
    is_active: dto.is_active,
  });
  return parseGrupo(data);
}

// ── Modificadores (da empresa; o vínculo com grupos fica na VITE0116) ──
export async function listarModificadores(): Promise<ModificadorPDM[]> {
  const { data } = await httpClient.get(`${BASE}/modifiers`);
  return unwrapArray(data).map(parseModificador);
}
export async function buscarModificador(id: number): Promise<ModificadorPDM> {
  const { data } = await httpClient.get(`${BASE}/modifiers/${id}`);
  return parseModificador(data);
}
export async function criarModificador(description: string): Promise<ModificadorPDM> {
  const { data } = await httpClient.post(`${BASE}/create-modifier`, { description, created_by: currentUserId() });
  return parseModificador(data);
}
export async function atualizarModificador(id: number, description: string, is_active?: boolean): Promise<ModificadorPDM> {
  const { data } = await httpClient.put(`${BASE}/modifiers/${id}`, { description, is_active });
  return parseModificador(data);
}

// ─── Padrão descritivo ───────────────────────────────────────────────────────
// Cada par grupo+modificador tem o seu modelo de atributos, e a descrição técnica
// do item é gerada a partir dele. Sem modelo, a descrição segue livre.

export type TipoAtributoPDM = 'TEXTO' | 'NUMERO' | 'LISTA';
export interface ValorAtributoPDM { id?: number; value: string; abbreviation?: string | null; position: number; is_active: boolean }
export interface AtributoPDM {
  id?: number; group_code: number; modifier_id: number; name: string; position: number; value_type: TipoAtributoPDM;
  unit?: string | null; prefix?: string | null; decimal_places: number; is_required: boolean; in_description: boolean;
  in_signature: boolean; is_active: boolean; values: ValorAtributoPDM[];
}
export interface ModeloPDM {
  group_code: number; group_description: string; modifier_id: number; modifier_description: string;
  modifier_abbreviation?: string | null; attributes: AtributoPDM[];
}
export interface PreviaPDM {
  description: string; signature: string; attributes: { Name: string; Value: string }[]; length: number;
  exceeds_invoice_limit: boolean; errors: string[]; has_standard: boolean; duplicates: string[];
}

export async function obterModeloPDM(group: number, modifier: number): Promise<ModeloPDM> {
  const { data } = await httpClient.get(`${BASE}/modelo`, { params: { group_code: group, modifier_id: modifier } });
  return data as ModeloPDM;
}
export async function modificadoresDoGrupo(group: number): Promise<number[]> {
  const { data } = await httpClient.get(`${BASE}/groups/${group}/modifiers`);
  return (data ?? []) as number[];
}
export async function salvarModificadoresDoGrupo(group: number, modifiers: number[]): Promise<number[]> {
  const { data } = await httpClient.put(`${BASE}/groups/${group}/modifiers`, { modifiers });
  return (data ?? []) as number[];
}
export async function salvarAbreviacaoDoModificador(id: number, abbreviation: string): Promise<void> {
  await httpClient.put(`${BASE}/modifiers/${id}/abbreviation`, { abbreviation: abbreviation.trim() || null });
}
export async function salvarAtributoPDM(a: AtributoPDM): Promise<AtributoPDM> {
  const { data } = a.id ? await httpClient.put(`${BASE}/atributos/${a.id}`, a) : await httpClient.post(`${BASE}/atributos`, a);
  return data as AtributoPDM;
}
export async function inativarAtributoPDM(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/atributos/${id}`);
}
export async function previaDaDescricaoPDM(dto: { group_code: number; modifier_id: number; attributes: { name: string; value: string }[]; exclude?: string }): Promise<PreviaPDM> {
  const { data } = await httpClient.post(`${BASE}/descricao`, dto);
  return data as PreviaPDM;
}
