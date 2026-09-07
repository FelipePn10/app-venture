import { httpClient, parseStr, parseNum, currentUserId, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/**
 * Restrições e dependências do configurador (`/api/restriction`).
 *
 * É onde se "ensina" ao sistema quais combinações de respostas existem de fato.
 * A regra tem duas metades, como no FoccoERP (FENG0116):
 *
 *   SE   (dominantes)  a COR for igual a PRETO **E** a LARGURA pertencer a 400,450
 *   ENTÃO (determinantes) a PROFUNDIDADE é inválida
 *
 * O configurador aplica isso enquanto o usuário responde: some a pergunta que
 * deixou de fazer sentido e a combinação impossível nunca chega à produção.
 */
const BASE = '/api/restriction';

/** Operadores aceitos pelo banco — os mesmos sete do FoccoERP. */
export const RESTRICTION_OPERATORS = [
  { value: 'EQUAL', label: 'for igual a' },
  { value: 'DIFFERENT', label: 'for diferente de' },
  { value: 'GREATER', label: 'for maior que' },
  { value: 'LESS', label: 'for menor que' },
  { value: 'BELONGS', label: 'pertencer a' },
  { value: 'NOT_BELONGS', label: 'não pertencer a' },
  { value: 'INVALID', label: 'for inválida' },
] as const;

export type RestrictionOperator = (typeof RESTRICTION_OPERATORS)[number]['value'];

export const RESTRICTION_CONNECTORS = [
  { value: 'AND', label: 'E' },
  { value: 'OR', label: 'OU' },
] as const;

export interface RestrictionDominant {
  question_id: number;
  operator: RestrictionOperator;
  condition_type: 'AND' | 'OR';
  answer_value: string;
  sequence: number;
}

export interface RestrictionDeterminant {
  question_id: number;
  operator: RestrictionOperator;
  answer_value?: string | null;
}

export interface Restriction {
  code: number;
  situation: string;
  item_code?: string;
  customer_code?: number;
  reason_code?: number;
  weight?: number;
  dominants: RestrictionDominant[];
  determinants: RestrictionDeterminant[];
}

export interface RestrictionReason {
  code: number;
  description: string;
  situation: string;
}

function parseDominant(raw: unknown): RestrictionDominant {
  const o = unwrapObject(raw);
  return {
    question_id: parseNum(o, 'question_id', 'QuestionID'),
    operator: (parseStr(o, 'operator', 'Operator') || 'EQUAL') as RestrictionOperator,
    condition_type: (parseStr(o, 'condition_type', 'ConditionType') || 'AND') as 'AND' | 'OR',
    answer_value: parseStr(o, 'answer_value', 'AnswerValue'),
    sequence: parseNum(o, 'sequence', 'Sequence'),
  };
}

function parseDeterminant(raw: unknown): RestrictionDeterminant {
  const o = unwrapObject(raw);
  return {
    question_id: parseNum(o, 'question_id', 'QuestionID'),
    operator: (parseStr(o, 'operator', 'Operator') || 'INVALID') as RestrictionOperator,
    answer_value: parseStr(o, 'answer_value', 'AnswerValue') || undefined,
  };
}

function parseRestriction(raw: unknown): Restriction {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    situation: parseStr(o, 'situation', 'Situation') || 'ACTIVE',
    item_code: parseStr(o, 'item_code', 'ItemCode') || undefined,
    customer_code: parseNum(o, 'customer_code', 'CustomerCode') || undefined,
    reason_code: parseNum(o, 'reason_code', 'ReasonCode') || undefined,
    weight: parseNum(o, 'weight', 'Weight') || undefined,
    dominants: unwrapArray(o['dominants'] ?? o['Dominants']).map(parseDominant)
      .sort((a, b) => a.sequence - b.sequence),
    determinants: unwrapArray(o['determinants'] ?? o['Determinants']).map(parseDeterminant),
  };
}

export async function listRestrictionsByItem(itemCode: string): Promise<Restriction[]> {
  const { data } = await httpClient.get(`${BASE}/item/${encodeURIComponent(itemCode)}`);
  return unwrapArray(data).map(parseRestriction);
}

export async function getRestriction(code: number): Promise<Restriction> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parseRestriction(data);
}

export async function createRestriction(input: {
  itemCode: string;
  /** Restrição que só vale para um cliente — vence a regra geral do item. */
  customerCode?: number;
  reasonCode?: number;
  dominants: RestrictionDominant[];
  determinants: RestrictionDeterminant[];
}): Promise<Restriction> {
  const { data } = await httpClient.post(`${BASE}/create`, {
    situation: 'ACTIVE',
    item_code: Number(input.itemCode),
    customer_code: input.customerCode ?? null,
    reason_code: input.reasonCode ?? null,
    dominants: input.dominants,
    determinants: input.determinants,
    created_by: currentUserId(),
  });
  return parseRestriction(data);
}

/**
 * Precedência entre regras, em palavras.
 *
 * O backend dá peso a cada escopo — cliente 32, item 16, classificação 8,
 * divisão 4 — e a regra de maior peso é a que vale. Sem explicar isso, duas
 * regras conflitantes viram mistério para quem cadastrou.
 */
export function precedenciaEmPalavras(r: Restriction): string {
  switch (r.weight) {
    case 32: return 'Vale para um cliente específico — vence as regras gerais do item.';
    case 16: return 'Vale para o item — vence classificação e divisão.';
    case 8: return 'Vale para a classificação do item.';
    case 4: return 'Vale para a divisão de vendas.';
    default: return 'Regra geral, aplicada quando nenhuma mais específica existe.';
  }
}

export async function deactivateRestriction(code: number): Promise<void> {
  await httpClient.patch(`${BASE}/${code}/deactivate`);
}

/**
 * Resultado da conferência de uma combinação — é o que permite auditar por que
 * uma pergunta sumiu ou veio respondida sozinha no configurador.
 */
export interface RestrictionEvaluation {
  /** Código da restrição que disparou; 0 quando nenhuma se aplica. */
  restriction_code: number;
  /** Perguntas que deixam de fazer sentido e somem da tela. */
  invalid_question_ids: number[];
  /** Perguntas que a regra responde sozinha, com o valor forçado. */
  locked_values: Record<number, string>;
  /** As respostas depois de aplicada a regra. */
  cleaned_answers: Record<number, string>;
}

export async function evaluateRestrictions(
  itemCode: string,
  answers: Record<number, string>,
  customerCode?: number,
): Promise<RestrictionEvaluation> {
  const { data } = await httpClient.post(`${BASE}/evaluate`, {
    item_code: Number(itemCode),
    ...(customerCode ? { customer_code: customerCode } : {}),
    answers,
  });
  const o = unwrapObject(data);
  const mapa = (v: unknown): Record<number, string> => {
    const out: Record<number, string> = {};
    const obj = unwrapObject(v);
    for (const [k, val] of Object.entries(obj)) out[Number(k)] = String(val ?? '');
    return out;
  };
  return {
    restriction_code: parseNum(o, 'restriction_code', 'RestrictionCode'),
    invalid_question_ids: unwrapArray(o['invalid_question_ids'] ?? o['InvalidQuestionIDs']).map((x) => Number(x)),
    locked_values: mapa(o['locked_values'] ?? o['LockedValues']),
    cleaned_answers: mapa(o['cleaned_answers'] ?? o['CleanedAnswers']),
  };
}

// ── Motivos (FENG0103): por que a combinação não existe ──
export async function listRestrictionReasons(): Promise<RestrictionReason[]> {
  const { data } = await httpClient.get('/api/restriction-reason/list');
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      code: parseNum(o, 'code', 'Code'),
      description: parseStr(o, 'description', 'Description'),
      situation: parseStr(o, 'situation', 'Situation') || 'ACTIVE',
    };
  });
}

export async function createRestrictionReason(description: string): Promise<RestrictionReason> {
  const { data } = await httpClient.post('/api/restriction-reason/create', { description, situation: 'ACTIVE' });
  const o = unwrapObject(data);
  return {
    code: parseNum(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    situation: parseStr(o, 'situation', 'Situation') || 'ACTIVE',
  };
}
