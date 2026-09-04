import { httpClient } from '@/services/httpClient';

/**
 * Configurador embutido na Estrutura de Produto (VENT0210).
 *
 * O configurador não tem tela própria: a estrutura o abre por um botão, como no
 * FoccoERP (FENG0210 → configurador). São dois endpoints —
 * `GET /api/items/structure/{itemCode}/configurator` carrega perguntas,
 * respostas possíveis, configurações já geradas e as fórmulas de quantidade;
 * `POST .../configurator/apply` valida as restrições (FENG0116), gera a máscara
 * e devolve a estrutura resolvida com as fórmulas avaliadas.
 */

const BASE = '/api/items/structure';

export interface ConfiguratorOption {
  variable_id: number;
  code: string;
  mask_composition: string;
  description: string;
  is_default: boolean;
}

export interface ConfiguratorQuestion {
  characteristic_id: number;
  item_characteristic_id: number;
  sequence: number;
  code: string;
  description: string;
  type: string;
  type_label: string;
  required: boolean;
  allows_multiple: boolean;
  mask?: string;
  formula?: string;
  num_min?: number;
  num_max?: number;
  num_multiple?: number;
  option_true?: string;
  option_false?: string;
  /** Marca as perguntas que alimentam alguma fórmula de quantidade da estrutura. */
  used_by_formula: boolean;
  options: ConfiguratorOption[];
}

export interface ConfiguratorFormula {
  child_code: number;
  child_description: string;
  formula: string;
  quantity_rounding: string;
  quantity_scale: number;
  nominal_quantity: number;
  unit_of_measurement: string;
  variables: string[];
}

export interface ConfiguratorMask {
  id: number;
  mask: string;
  mask_hash: string;
  answered: boolean;
}

export interface ConfiguratorPanel {
  item_code: string;
  item_name?: string;
  configurable: boolean;
  message?: string;
  restrictions_enabled: boolean;
  questions: ConfiguratorQuestion[];
  masks: ConfiguratorMask[];
  formulas: ConfiguratorFormula[];
  missing_formula_variables?: string[];
}

export interface ConfiguratorViolation {
  restriction_code: number;
  characteristic_id: number;
  question?: string;
  operator: string;
  expected_value?: string;
  answered_value?: string;
  message: string;
}

export interface ConfiguratorAnswerInput {
  characteristic_id: number;
  variable_id?: number | null;
  value?: string;
}

export interface ConfiguratorAnswerOutput {
  position: number;
  characteristic_id: number;
  variable_id?: number;
  value: string;
}

export interface ConfiguratorStructureNode {
  component: Record<string, unknown>;
  mask?: string;
  effective_mask?: string;
  requires_mask?: boolean;
  level: number;
  children: ConfiguratorStructureNode[];
}

export interface ConfiguratorApplyResult {
  item_code: string;
  mask: string;
  mask_hash: string;
  persisted: boolean;
  mask_id?: number;
  answers: ConfiguratorAnswerOutput[];
  variables?: Record<string, number>;
  structure?: {
    root_item_code: number;
    root_mask?: string;
    components: ConfiguratorStructureNode[];
    total_levels: number;
    total_nodes: number;
  };
  warnings?: string[];
}

/**
 * Restrição/dependência violada: o backend devolve 422 com a lista das
 * combinações proibidas para a tela destacar as perguntas envolvidas.
 */
export class ConfiguratorRestrictionError extends Error {
  readonly violations: ConfiguratorViolation[];
  constructor(message: string, violations: ConfiguratorViolation[]) {
    super(message);
    this.name = 'ConfiguratorRestrictionError';
    this.violations = violations;
  }
}

/** GET /api/items/structure/{itemCode}/configurator */
export async function loadConfiguratorPanel(itemCode: string): Promise<ConfiguratorPanel> {
  const { data } = await httpClient.get<ConfiguratorPanel>(
    `${BASE}/${encodeURIComponent(itemCode)}/configurator`,
  );
  return {
    ...data,
    questions: data.questions ?? [],
    masks: data.masks ?? [],
    formulas: data.formulas ?? [],
  };
}

/**
 * POST /api/items/structure/{itemCode}/configurator/apply
 *
 * Com `persist: false` a chamada é uma simulação: valida as restrições e
 * devolve a máscara que sairia, sem gravar. Com `persist: true` a configuração
 * passa a valer para o MRP, o custo e as ordens.
 */
export async function applyConfiguration(
  itemCode: string,
  answers: ConfiguratorAnswerInput[],
  persist: boolean,
): Promise<ConfiguratorApplyResult> {
  try {
    const { data } = await httpClient.post<ConfiguratorApplyResult>(
      `${BASE}/${encodeURIComponent(itemCode)}/configurator/apply`,
      { answers, persist },
    );
    return data;
  } catch (error) {
    const response = (error as { response?: { status?: number; data?: unknown } }).response;
    const body = (response?.data ?? {}) as { code?: string; error?: string; violations?: ConfiguratorViolation[] };
    if (response?.status === 422 && body.code === 'RESTRICAO_DE_CONFIGURACAO') {
      throw new ConfiguratorRestrictionError(
        body.error || 'A combinação de respostas viola as restrições cadastradas.',
        body.violations ?? [],
      );
    }
    throw error;
  }
}
