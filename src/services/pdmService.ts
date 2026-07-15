import { httpClient, parseStr, parseNum, currentUserId, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/**
 * PDM — Grupos e Modificadores (`/api/pdm`, backend real panossoerp).
 *
 * A descrição técnica do item nasce da composição **Grupo + Modificador + Atributos**
 * (ver cadastro de Item). No backend, Grupo e Modificador são cadastros mínimos:
 *  - **Grupo**: `code` (int, informado), `description`, `enterprise_id`. Sem exclusão.
 *  - **Modificador**: `id` (gerado), `description`. **Global** — não pertence a um grupo.
 *  - **Atributos**: NÃO têm CRUD próprio — são pares `{name,value}` livres gravados no
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
}
export interface ModificadorPDM {
  id?: number;
  description: string;
}

function parseGrupo(raw: unknown): GrupoPDM {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    enterprise_id: parseNum(o, 'enterprise_id', 'EnterpriseID') || undefined,
  };
}
function parseModificador(raw: unknown): ModificadorPDM {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    description: parseStr(o, 'description', 'Description'),
  };
}

// ── Grupos ──
export async function listarGrupos(): Promise<GrupoPDM[]> {
  const { data } = await httpClient.get(`${BASE}/groups`);
  return unwrapArray(data).map(parseGrupo);
}
export async function buscarGrupo(code: number): Promise<GrupoPDM> {
  const { data } = await httpClient.get(`${BASE}/groups/${code}`);
  return parseGrupo(data);
}
export async function criarGrupo(dto: GrupoPDM): Promise<GrupoPDM> {
  const { data } = await httpClient.post(`${BASE}/create-group`, {
    code: dto.code,
    description: dto.description,
    enterprise_id: dto.enterprise_id ?? 1,
    created_by: currentUserId(),
  });
  return parseGrupo(data);
}
export async function atualizarGrupo(code: number, dto: Pick<GrupoPDM, 'description' | 'enterprise_id'>): Promise<GrupoPDM> {
  const { data } = await httpClient.put(`${BASE}/groups/${code}`, {
    description: dto.description,
    enterprise_id: dto.enterprise_id ?? 1,
  });
  return parseGrupo(data);
}

// ── Modificadores (globais) ──
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
export async function atualizarModificador(id: number, description: string): Promise<ModificadorPDM> {
  const { data } = await httpClient.put(`${BASE}/modifiers/${id}`, { description });
  return parseModificador(data);
}
