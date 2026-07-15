import { httpClient, parseStr, parseNum, parseBool, currentUserId, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Configurador de Produto (cfg_*, `/api/configurator`). Descreve itens configuráveis por
 * **características** (perguntas) respondidas por **variáveis** (respostas) agrupadas em
 * **conjuntos**, e monta a **máscara** do item a partir das respostas.
 *
 * Tipos de característica: ESCOLHA · ESCOLHA_MULT · FORMULA · DESENHO · INF_CARACTER ·
 * INF_NUMERICA · OPCAO · CAMPO · SEQUENCIAL.
 */
const BASE = '/api/configurator';
export const CHAR_TYPES = ['ESCOLHA', 'ESCOLHA_MULT', 'FORMULA', 'DESENHO', 'INF_CARACTER', 'INF_NUMERICA', 'OPCAO', 'CAMPO', 'SEQUENCIAL'] as const;

export interface CfgSet { id?: number; description: string; is_active?: boolean; }
export interface CfgVariable {
  id?: number; set_id?: number; code: string; description: string; mask_composition?: string;
  is_special?: boolean; include_description?: boolean; special_data?: string; marketing?: boolean; is_active?: boolean;
}
export interface CfgCharacteristic {
  id?: number; code: string; description: string; type: string; set_id?: number; default_variable_id?: number;
  mask?: string; is_special?: boolean; affects_price?: boolean; controls_goals?: boolean; receiving_type?: string;
  field_source?: string; formula?: string; is_required?: boolean; num_min?: number; num_max?: number;
  option_true?: string; option_false?: string; is_active?: boolean;
}
export interface CfgMaskAnswer { characteristic_id: number; variable_id?: number; value?: string; }

function parseSet(raw: unknown): CfgSet {
  const o = unwrapObject(raw);
  return { id: parseNum(o, 'id', 'ID') || undefined, description: parseStr(o, 'description', 'Description'), is_active: o['is_active'] !== false && o['IsActive'] !== false };
}
function parseVar(raw: unknown): CfgVariable {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined, set_id: parseNum(o, 'set_id', 'SetID') || undefined,
    code: parseStr(o, 'code', 'Code'), description: parseStr(o, 'description', 'Description'),
    mask_composition: parseStr(o, 'mask_composition', 'MaskComposition') || undefined,
    is_special: parseBool(o, 'is_special', 'IsSpecial'), include_description: parseBool(o, 'include_description', 'IncludeDescription'),
    marketing: parseBool(o, 'marketing', 'Marketing'), is_active: o['is_active'] !== false && o['IsActive'] !== false,
  };
}
function parseChar(raw: unknown): CfgCharacteristic {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined, code: parseStr(o, 'code', 'Code'), description: parseStr(o, 'description', 'Description'),
    type: parseStr(o, 'type', 'Type') || 'ESCOLHA', set_id: parseNum(o, 'set_id', 'SetID') || undefined,
    default_variable_id: parseNum(o, 'default_variable_id', 'DefaultVariableID') || undefined, mask: parseStr(o, 'mask', 'Mask') || undefined,
    is_special: parseBool(o, 'is_special', 'IsSpecial'), affects_price: parseBool(o, 'affects_price', 'AffectsPrice'),
    controls_goals: parseBool(o, 'controls_goals', 'ControlsGoals'), receiving_type: parseStr(o, 'receiving_type', 'ReceivingType') || undefined,
    field_source: parseStr(o, 'field_source', 'FieldSource') || undefined, formula: parseStr(o, 'formula', 'Formula') || undefined,
    is_required: parseBool(o, 'is_required', 'IsRequired'), num_min: parseNum(o, 'num_min', 'NumMin') || undefined, num_max: parseNum(o, 'num_max', 'NumMax') || undefined,
    is_active: o['is_active'] !== false && o['IsActive'] !== false,
  };
}

// ── Conjuntos ──
export async function listSets(): Promise<CfgSet[]> { const { data } = await httpClient.get(`${BASE}/sets`); return unwrapArray(data).map(parseSet); }
export async function createSet(description: string): Promise<CfgSet> { const { data } = await httpClient.post(`${BASE}/sets`, { description, created_by: currentUserId() }); return parseSet(data); }
export async function updateSet(id: number, description: string, isActive = true): Promise<CfgSet> { const { data } = await httpClient.put(`${BASE}/sets/${id}`, { id, description, is_active: isActive }); return parseSet(data); }
export async function deleteSet(id: number): Promise<void> { await httpClient.delete(`${BASE}/sets/${id}`); }

// ── Variáveis (de um conjunto) ──
export async function listSetVariables(setId: number): Promise<CfgVariable[]> { const { data } = await httpClient.get(`${BASE}/sets/${setId}/variables`); return unwrapArray(data).map(parseVar); }
export async function createVariable(setId: number, dto: CfgVariable): Promise<CfgVariable> {
  const { data } = await httpClient.post(`${BASE}/sets/${setId}/variables`, {
    set_id: setId, code: dto.code, description: dto.description, mask_composition: dto.mask_composition ?? '',
    is_special: !!dto.is_special, include_description: !!dto.include_description, special_data: dto.special_data ?? '', marketing: !!dto.marketing, created_by: currentUserId(),
  });
  return parseVar(data);
}
export async function deleteVariable(varId: number): Promise<void> { await httpClient.delete(`${BASE}/variables/${varId}`); }

// ── Características ──
export async function listCharacteristics(onlyActive = false): Promise<CfgCharacteristic[]> {
  const { data } = await httpClient.get(`${BASE}/characteristics`, { params: onlyActive ? { only_active: true } : undefined });
  return unwrapArray(data).map(parseChar);
}
export async function createCharacteristic(dto: CfgCharacteristic): Promise<CfgCharacteristic> {
  const { data } = await httpClient.post(`${BASE}/characteristics`, {
    code: dto.code, description: dto.description, type: dto.type, set_id: dto.set_id ?? null, default_variable_id: dto.default_variable_id ?? null,
    mask: dto.mask ?? '', is_special: !!dto.is_special, affects_price: !!dto.affects_price, controls_goals: !!dto.controls_goals,
    receiving_type: dto.receiving_type ?? 'NENHUM', field_source: dto.field_source ?? '', formula: dto.formula ?? '', is_required: !!dto.is_required,
    num_min: dto.num_min ?? null, num_max: dto.num_max ?? null, option_true: dto.option_true ?? 'SIM', option_false: dto.option_false ?? 'NAO', created_by: currentUserId(),
  });
  return parseChar(data);
}
export async function deleteCharacteristic(id: number): Promise<void> { await httpClient.delete(`${BASE}/characteristics/${id}`); }

// ── Características do item + geração de máscara ──
export async function listItemCharacteristics(itemCode: number): Promise<Obj[]> { const { data } = await httpClient.get(`${BASE}/items/${itemCode}/characteristics`); return unwrapArray(data).map((r) => unwrapObject(r)); }
export async function addItemCharacteristic(itemCode: number, characteristicId: number, sequence: number, opts: Obj = {}): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/items/${itemCode}/characteristics`, { item_code: itemCode, characteristic_id: characteristicId, sequence, ...opts });
  return unwrapObject(data);
}
/** Gera (e opcionalmente persiste) a máscara do item a partir das respostas. */
export async function generateMask(itemCode: number, answers: CfgMaskAnswer[], persist = false): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/generate-mask`, { item_code: itemCode, answers, persist, created_by: currentUserId() });
  return unwrapObject(data);
}
