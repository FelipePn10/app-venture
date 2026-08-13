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
  /** Código comercial do item. Nunca converter para número. */
  code?: string;
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
  fiscal_effective?: ItemFiscalEffective;
}

export interface EffectiveFiscalContext {
  classification_id?: number;
  classification_code?: string;
  ncm?: string;
  cest?: string;
  unit?: string;
  origin?: number;
  ipi_rate?: number;
  icms_rate?: number;
  pis_rate?: number;
  cofins_rate?: number;
  calculate_pis_cofins?: boolean;
  sources: Record<string, 'HERDADO' | 'SOBRESCRITO'>;
}

export interface ItemFiscalEffective {
  purchase?: EffectiveFiscalContext;
  sale?: EffectiveFiscalContext;
}

function parseEffectiveContext(raw: unknown): EffectiveFiscalContext | undefined {
  const o = unwrapObject(raw);
  if (!Object.keys(o).length) return undefined;
  const sourcesRaw = unwrapObject(o['sources'] ?? o['Sources']);
  const sources: Record<string, 'HERDADO' | 'SOBRESCRITO'> = {};
  for (const [key, value] of Object.entries(sourcesRaw)) {
    if (value === 'HERDADO' || value === 'SOBRESCRITO') sources[key] = value;
  }
  return {
    classification_id: parseNum(o, 'classification_id', 'ClassificationID') || undefined,
    classification_code: parseStr(o, 'classification_code', 'ClassificationCode') || undefined,
    ncm: parseStr(o, 'ncm', 'NCM') || undefined,
    cest: parseStr(o, 'cest', 'CEST') || undefined,
    unit: parseStr(o, 'unit', 'Unit') || undefined,
    origin: o['origin'] === undefined && o['Origin'] === undefined ? undefined : parseNum(o, 'origin', 'Origin'),
    ipi_rate: o['ipi_rate'] === undefined && o['IPIRate'] === undefined ? undefined : parseNum(o, 'ipi_rate', 'IPIRate'),
    icms_rate: o['icms_rate'] === undefined && o['ICMSRate'] === undefined ? undefined : parseNum(o, 'icms_rate', 'ICMSRate'),
    pis_rate: o['pis_rate'] === undefined && o['PISRate'] === undefined ? undefined : parseNum(o, 'pis_rate', 'PISRate'),
    cofins_rate: o['cofins_rate'] === undefined && o['COFINSRate'] === undefined ? undefined : parseNum(o, 'cofins_rate', 'COFINSRate'),
    calculate_pis_cofins: o['calculate_pis_cofins'] === undefined && o['CalculatePISCOFINS'] === undefined ? undefined : parseBool(o, 'calculate_pis_cofins', 'CalculatePISCOFINS'),
    sources,
  };
}

export interface ActivationReadiness {
  item_code: string;
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
  const fiscal = unwrapObject(o['fiscal_effective'] ?? o['FiscalEffective']);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    code: parseStr(o, 'code', 'Code') || undefined,
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
    fiscal_effective: {
      purchase: parseEffectiveContext(fiscal['purchase'] ?? fiscal['Purchase']),
      sale: parseEffectiveContext(fiscal['sale'] ?? fiscal['Sale']),
    },
  };
}

export async function listItems(): Promise<ItemDTO[]> {
  const { data } = await httpClient.get(`${BASE}/`);
  return unwrapArray(data).map(parseItem);
}
/** Detalhe do item — o endpoint real é `/api/items/search/{code}` (não há `GET /{code}`). */
export async function getItem(code: string): Promise<ItemDTO> {
  const { data } = await httpClient.get(`${BASE}/search/${encodeURIComponent(code)}`);
  return parseItem(data);
}

/** Detalhe completo, usado para copiar as pastas de um item-base no cadastro. */
export async function getItemTemplate(code: string): Promise<Obj> {
  const { data } = await httpClient.get(`${BASE}/search/${encodeURIComponent(code)}`);
  return unwrapObject(data);
}
export async function listItemsWithMasks(): Promise<ItemDTO[]> {
  const { data } = await httpClient.get(`${BASE}/with-masks`);
  return unwrapArray(data).map(parseItem);
}

/** Máscaras configuradas disponíveis para um item, sem exigir digitação manual. */
export async function listItemMasks(code: string): Promise<string[]> {
  const { data } = await httpClient.get(`${BASE}/with-masks`);
  const masks = new Set<string>();
  const collect = (value: unknown): void => {
    if (typeof value === 'string' && value.trim()) { masks.add(value.trim()); return; }
    if (Array.isArray(value)) { value.forEach(collect); return; }
    if (!value || typeof value !== 'object') return;
    const o = value as Obj;
    const itemCode = parseStr(o, 'code', 'Code', 'item_code', 'ItemCode');
    if (itemCode && itemCode !== code) return;
    for (const key of ['mask', 'Mask', 'masks', 'Masks', 'item_masks', 'ItemMasks', 'configured_masks']) {
      if (o[key] !== undefined) collect(o[key]);
    }
    for (const key of ['data', 'items', 'results', 'records']) {
      if (o[key] !== undefined) collect(o[key]);
    }
  };
  collect(data);
  return [...masks].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export async function getActivationReadiness(code: string): Promise<ActivationReadiness> {
  const { data } = await httpClient.get(`${BASE}/${encodeURIComponent(code)}/activation-readiness`);
  const o = unwrapObject(data);
  const asStrings = (v: unknown): string[] => unwrapArray(v).map((x) => (typeof x === 'string' ? x : parseStr(unwrapObject(x), 'message', 'Message', 'description', 'Description')));
  return {
    item_code: parseStr(o, 'item_code', 'ItemCode'),
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
