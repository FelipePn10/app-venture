import { httpClient, parseStr, parseNum, currentUserId, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Regras de Itens Configurados (`/api/configurator/item-rules`, backend real cfg_*).
 * Uma regra mapeia respostas de características para valores em tabelas do sistema
 * (contábil/comercial/custos/planejamento…): `target_table` + `target_field` recebem o
 * `content`/`formula` quando as `conditions` (característica ∘ operador ∘ variável) baterem.
 */
const BASE = '/api/configurator/item-rules';

export interface ItemRuleCondition {
  characteristic_id: number;
  operator: string;
  variable_id?: number;
}
export interface ItemRule {
  id?: number;
  item_code: number;
  target_table: string;
  target_field: string;
  content: string;
  formula: string;
  description: string;
  situation: string;
  conditions: ItemRuleCondition[];
}

function parseCondition(raw: unknown): ItemRuleCondition {
  const o = unwrapObject(raw);
  return {
    characteristic_id: parseNum(o, 'characteristic_id', 'CharacteristicID'),
    operator: parseStr(o, 'operator', 'Operator'),
    variable_id: parseNum(o, 'variable_id', 'VariableID') || undefined,
  };
}
function parseRule(raw: unknown): ItemRule {
  const o = unwrapObject(raw);
  const conds = o['conditions'] ?? o['Conditions'];
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    target_table: parseStr(o, 'target_table', 'TargetTable'),
    target_field: parseStr(o, 'target_field', 'TargetField'),
    content: parseStr(o, 'content', 'Content'),
    formula: parseStr(o, 'formula', 'Formula'),
    description: parseStr(o, 'description', 'Description'),
    situation: parseStr(o, 'situation', 'Situation') || 'ATIVO',
    conditions: Array.isArray(conds) ? conds.map(parseCondition) : [],
  };
}

/** Regras de um item (`GET /api/configurator/items/{itemCode}/rules`). */
export async function listItemRules(itemCode: number): Promise<ItemRule[]> {
  const { data } = await httpClient.get(`/api/configurator/items/${itemCode}/rules`);
  return unwrapArray(data).map(parseRule);
}
export async function getItemRule(id: number): Promise<ItemRule> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return parseRule(data);
}
export async function createItemRule(dto: ItemRule): Promise<ItemRule> {
  const { data } = await httpClient.post(BASE, { ...dto, created_by: currentUserId() });
  return parseRule(data);
}
export async function updateItemRule(id: number, dto: ItemRule): Promise<ItemRule> {
  const { data } = await httpClient.put(`${BASE}/${id}`, { ...dto, id });
  return parseRule(data);
}
export async function deleteItemRule(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/${id}`);
}
/** Avalia as regras de um item para um conjunto de respostas. */
export async function evaluateItemRules(itemCode: number, answers: Obj[]): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/evaluate`, { item_code: itemCode, answers });
  return unwrapObject(data);
}
