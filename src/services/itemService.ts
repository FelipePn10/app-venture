import { httpClient, parseStr, parseNum, parseBool, currentUserId, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/items';

/**
 * Cadastro de Item (`/api/items`) — da matéria-prima ao produto final.
 * O item é composto por pastas: PDM (grupo/modificador/atributos → descrição técnica),
 * Almoxarifado (UM, mínimos), Engenharia (peso/dimensões/tipo), Planejamento (LLC,
 * tipo MRP, ponto de pedido) e Suprimentos.
 *
 * §8 Prontidão para o MRP: `GET /{code}/activation-readiness` roda o checklist
 * (fabricado → exige BOM+roteiro; comprado → exige fornecedor preferencial + alerta
 * de conversão de UM) e devolve `{ready, issues, warnings}` sem alterar estado.
 *
 * ⚠️ `POST /create` na build demo rejeita o corpo do exemplo da doc ("invalid request
 * body"): o DTO de request diverge do modelo de leitura. Mantemos o create conforme a
 * doc; o backend precisa alinhar o binding. Não há `GET /{code}` (404).
 */
export interface ItemDTO {
  id?: number;
  code?: number;
  nature?: number;
  description?: string;
  situation?: string;
  health?: string;
  group_code?: number;
  modifier_code?: number;
  uom?: string;
  minimum_stock?: number;
  eng_type?: string;
  type_struct?: string;
  type_mrp?: string;
  llc?: number;
  ghost?: boolean;
}

export interface ActivationReadiness {
  item_code: number;
  item_type?: string;
  ready: boolean;
  issues: string[];
  warnings: string[];
}

function parseItem(raw: unknown): ItemDTO {
  const o = unwrapObject(raw);
  const pdm = unwrapObject(o['pdm'] ?? o['Pdm']);
  const wh = unwrapObject(o['warehouse'] ?? o['Warehouse']);
  const eng = unwrapObject(o['engineering'] ?? o['Engineering']);
  const pl = unwrapObject(o['planning'] ?? o['Planning']);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    code: parseNum(o, 'code', 'Code'),
    nature: parseNum(o, 'nature', 'Nature'),
    description: parseStr(pdm, 'description_technique', 'DescriptionTechnique') || parseStr(o, 'description', 'Description') || undefined,
    situation: parseStr(o, 'situation', 'Situation') || undefined,
    health: parseStr(o, 'health', 'Health') || undefined,
    group_code: parseNum(pdm, 'group_code', 'GroupCode') || undefined,
    modifier_code: parseNum(pdm, 'modifier_code', 'ModifierCode') || undefined,
    uom: parseStr(wh, 'unit_of_measurement', 'UnitOfMeasurement') || undefined,
    minimum_stock: parseNum(wh, 'minimum_stock', 'MinimumStock'),
    eng_type: parseStr(eng, 'type', 'Type') || undefined,
    type_struct: parseStr(eng, 'type_struct', 'TypeStruct') || undefined,
    type_mrp: parseStr(pl, 'type_mrp', 'TypeMrp') || undefined,
    llc: parseNum(pl, 'llc', 'Llc', 'LLC') || undefined,
    ghost: parseBool(pl, 'ghost', 'Ghost'),
  };
}

export async function listItems(): Promise<ItemDTO[]> {
  const { data } = await httpClient.get(`${BASE}/`);
  return unwrapArray(data).map(parseItem);
}
/** Detalhe do item — o endpoint real é `/api/items/search/{code}` (não há `GET /{code}`). */
export async function getItem(code: number): Promise<ItemDTO> {
  const { data } = await httpClient.get(`${BASE}/search/${code}`);
  return parseItem(data);
}
export async function listItemsWithMasks(): Promise<ItemDTO[]> {
  const { data } = await httpClient.get(`${BASE}/with-masks`);
  return unwrapArray(data).map(parseItem);
}

export async function getActivationReadiness(code: number): Promise<ActivationReadiness> {
  const { data } = await httpClient.get(`${BASE}/${code}/activation-readiness`);
  const o = unwrapObject(data);
  const asStrings = (v: unknown): string[] => unwrapArray(v).map((x) => (typeof x === 'string' ? x : parseStr(unwrapObject(x), 'message', 'Message', 'description', 'Description')));
  return {
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    item_type: parseStr(o, 'item_type', 'ItemType') || undefined,
    ready: parseBool(o, 'ready', 'Ready'),
    issues: asStrings(o['issues'] ?? o['Issues']),
    warnings: asStrings(o['warnings'] ?? o['Warnings']),
  };
}

/**
 * Cria um item com as pastas (PDM/Almoxarifado/Engenharia/Planejamento/Suprimentos).
 * `dto` deve seguir o formato da doc (objeto aninhado). `created_by` do usuário logado.
 */
export async function createItem(dto: Obj): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/create`, { created_by: currentUserId(), ...dto });
  return unwrapObject(data);
}
