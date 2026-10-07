import { httpClient, parseStr, parseNum, currentUserId, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/standard-cost';

/**
 * Custo Padrão (Custos §1): rollup pela estrutura (material + transformação +
 * overhead, respeitando o LLC) + custos de centro de trabalho e de compra.
 *
 * Endpoints reais confirmados na demo: `POST /rollup` (exige `calculated_by`),
 * `GET /items/{itemCode}`, `POST|GET /work-center-costs`, `POST /purchase-costs`
 * + `GET /purchase-costs/{itemCode}`. **Não há list-all** (`GET /` → 404).
 * O backend retorna `labor_cost`; a tela usa `operation_cost` (mapeado no parser).
 */
/**
 * Custo-padrão apurado, aberto por componente.
 *
 * `operation_cost` continua existindo e continua sendo a CONVERSÃO INTEIRA
 * (preparação + máquina + mão de obra) — a precificação já lê esse campo e mudar
 * o sentido dele quebraria VCST0202. Os campos novos abrem o que estava somado:
 * `setup_cost`, `machine_cost`, `labor_cost` e `subcontract_cost`.
 */
export interface StandardCost {
  item_code: string;
  mask?: string;
  material_cost: number;
  /** Conversão inteira: preparação + máquina + mão de obra. */
  operation_cost: number;
  overhead_cost: number;
  total_cost: number;
  currency?: string;
  calculated_at?: string;
  /** Componentes abertos (migração 000373). */
  setup_cost?: number;
  machine_cost?: number;
  labor_cost?: number;
  subcontract_cost?: number;
  /** O que esta etapa agrega × o que veio dos componentes de baixo. */
  own_level_cost?: number;
  lower_level_cost?: number;
  /** Lote da apuração: o setup é diluído por ele, então duas apurações com lotes
   *  diferentes não são comparáveis. */
  lot_size?: number;
  /** Rastro de cada regra de indireto aplicada. */
  overheads?: OverheadApplied[];
  /** Composição por nível da estrutura. */
  tree?: CostTreeNode[];
  /** O que não deu certo sem invalidar a apuração. */
  avisos?: string[];
}

export interface OverheadApplied {
  rule_id: number;
  code: string;
  description: string;
  base: OverheadBase;
  method: OverheadMethod;
  rate: number;
  base_value: number;
  applied: number;
}

export interface CostTreeNode {
  item_code: number;
  mask?: string;
  level: number;
  material_cost: number;
  setup_cost: number;
  machine_cost: number;
  labor_cost: number;
  subcontract_cost: number;
  overhead_cost: number;
  lower_level_cost: number;
  total_cost: number;
}

export const OVERHEAD_BASES = ['MATERIAL', 'SETUP', 'MAQUINA', 'MAO_DE_OBRA', 'CONVERSAO', 'SUBCONTRATACAO', 'TOTAL'] as const;
export type OverheadBase = (typeof OVERHEAD_BASES)[number];

export const OVERHEAD_METHODS = ['PERCENTUAL', 'VALOR_POR_HORA', 'VALOR_POR_UNIDADE'] as const;
export type OverheadMethod = (typeof OVERHEAD_METHODS)[number];

/** Rótulos em português: a tela não mostra o enum do banco. */
export const OVERHEAD_BASE_LABELS: Record<OverheadBase, string> = {
  MATERIAL: 'Material',
  SETUP: 'Preparação (setup)',
  MAQUINA: 'Hora-máquina',
  MAO_DE_OBRA: 'Hora-homem',
  CONVERSAO: 'Conversão (setup + máquina + homem)',
  SUBCONTRATACAO: 'Serviço de terceiro',
  TOTAL: 'Custo total antes dos indiretos',
};

export const OVERHEAD_METHOD_LABELS: Record<OverheadMethod, string> = {
  PERCENTUAL: 'Percentual sobre a base',
  VALOR_POR_HORA: 'R$ por hora da base',
  VALOR_POR_UNIDADE: 'R$ por unidade produzida',
};

/** Uma linha do esquema de rateio de indiretos. */
export interface OverheadRule {
  id: number;
  code: string;
  description: string;
  base: OverheadBase;
  method: OverheadMethod;
  /** Fração no método percentual (0,12 = 12%); reais nos outros. */
  rate: number;
  work_center_id?: number | null;
  item_code?: string | null;
  plano_contas_id?: number | null;
  centro_custo_id?: number | null;
  valid_from: string;
  valid_to?: string | null;
  is_active: boolean;
  notes?: string | null;
}

export interface OverheadRuleDTO {
  code: string;
  description: string;
  base: OverheadBase;
  method: OverheadMethod;
  rate: number;
  work_center_id?: number | null;
  item_code?: string | null;
  plano_contas_id?: number | null;
  centro_custo_id?: number | null;
  valid_from: string;
  valid_to?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

/** Uma apuração passada, para comparar o custo ao longo do tempo. */
export interface CostHistoryEntry {
  id: number;
  item_code: number;
  mask?: string;
  lot_size: number;
  material_cost: number;
  setup_cost: number;
  machine_cost: number;
  labor_cost: number;
  subcontract_cost: number;
  overhead_cost: number;
  own_level_cost: number;
  lower_level_cost: number;
  total_cost: number;
  currency?: string;
  overheads?: OverheadApplied[];
  calculated_at: string;
}

export interface WorkCenterCost {
  id?: number;
  work_center_id: number;
  cost_per_hour: number;
  /** Separar máquina de mão de obra é o que permite custear um roteiro em que
   *  a máquina roda sozinha, ou em que dois operadores atendem um equipamento. */
  machine_cost_per_hour?: number;
  labor_cost_per_hour?: number;
  currency?: string;
}

export interface PurchaseCost {
  item_code: string;
  cost: number;
  currency?: string;
}

function parseCost(raw: unknown): StandardCost {
  const o = unwrapObject(raw);
  return {
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    material_cost: parseNum(o, 'material_cost', 'MaterialCost'),
    operation_cost: parseNum(o, 'operation_cost', 'OperationCost', 'labor_cost', 'LaborCost'),
    overhead_cost: parseNum(o, 'overhead_cost', 'OverheadCost'),
    total_cost: parseNum(o, 'total_cost', 'TotalCost'),
    currency: parseStr(o, 'currency', 'Currency') || undefined,
    calculated_at: parseStr(o, 'calculated_at', 'CalculatedAt') || undefined,
    setup_cost: parseNum(o, 'setup_cost', 'SetupCost'),
    machine_cost: parseNum(o, 'machine_cost', 'MachineCost'),
    labor_cost: parseNum(o, 'labor_cost', 'LaborCost'),
    subcontract_cost: parseNum(o, 'subcontract_cost', 'SubcontractCost'),
    own_level_cost: parseNum(o, 'own_level_cost', 'OwnLevelCost'),
    lower_level_cost: parseNum(o, 'lower_level_cost', 'LowerLevelCost'),
    lot_size: parseNum(o, 'lot_size', 'LotSize') || 1,
    overheads: unwrapArray(o['overheads'] ?? o['Overheads']).map(parseOverheadApplied),
    tree: unwrapArray(o['tree'] ?? o['Tree']).map(parseTreeNode),
    avisos: unwrapArray(o['avisos'] ?? o['Avisos']).map(String),
  };
}

function parseOverheadApplied(raw: unknown): OverheadApplied {
  const o = unwrapObject(raw);
  return {
    rule_id: parseNum(o, 'rule_id', 'RuleID'),
    code: parseStr(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    base: (parseStr(o, 'base', 'Base') || 'TOTAL') as OverheadBase,
    method: (parseStr(o, 'method', 'Method') || 'PERCENTUAL') as OverheadMethod,
    rate: parseNum(o, 'rate', 'Rate'),
    base_value: parseNum(o, 'base_value', 'BaseValue'),
    applied: parseNum(o, 'applied', 'Applied'),
  };
}

function parseTreeNode(raw: unknown): CostTreeNode {
  const o = unwrapObject(raw);
  return {
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    level: parseNum(o, 'level', 'Level'),
    material_cost: parseNum(o, 'material_cost', 'MaterialCost'),
    setup_cost: parseNum(o, 'setup_cost', 'SetupCost'),
    machine_cost: parseNum(o, 'machine_cost', 'MachineCost'),
    labor_cost: parseNum(o, 'labor_cost', 'LaborCost'),
    subcontract_cost: parseNum(o, 'subcontract_cost', 'SubcontractCost'),
    overhead_cost: parseNum(o, 'overhead_cost', 'OverheadCost'),
    lower_level_cost: parseNum(o, 'lower_level_cost', 'LowerLevelCost'),
    total_cost: parseNum(o, 'total_cost', 'TotalCost'),
  };
}

function parseOverheadRule(raw: unknown): OverheadRule {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseStr(o, 'code', 'Code'),
    description: parseStr(o, 'description', 'Description'),
    base: (parseStr(o, 'base', 'Base') || 'TOTAL') as OverheadBase,
    method: (parseStr(o, 'method', 'Method') || 'PERCENTUAL') as OverheadMethod,
    rate: parseNum(o, 'rate', 'Rate'),
    work_center_id: parseNum(o, 'work_center_id', 'WorkCenterID') || null,
    item_code: parseStr(o, 'item_code', 'ItemCode') || null,
    plano_contas_id: parseNum(o, 'plano_contas_id', 'PlanoContasID') || null,
    centro_custo_id: parseNum(o, 'centro_custo_id', 'CentroCustoID') || null,
    valid_from: parseStr(o, 'valid_from', 'ValidFrom'),
    valid_to: parseStr(o, 'valid_to', 'ValidTo') || null,
    is_active: o['is_active'] !== false && o['IsActive'] !== false,
    notes: parseStr(o, 'notes', 'Notes') || null,
  };
}

function parseHistory(raw: unknown): CostHistoryEntry {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    lot_size: parseNum(o, 'lot_size', 'LotSize') || 1,
    material_cost: parseNum(o, 'material_cost', 'MaterialCost'),
    setup_cost: parseNum(o, 'setup_cost', 'SetupCost'),
    machine_cost: parseNum(o, 'machine_cost', 'MachineCost'),
    labor_cost: parseNum(o, 'labor_cost', 'LaborCost'),
    subcontract_cost: parseNum(o, 'subcontract_cost', 'SubcontractCost'),
    overhead_cost: parseNum(o, 'overhead_cost', 'OverheadCost'),
    own_level_cost: parseNum(o, 'own_level_cost', 'OwnLevelCost'),
    lower_level_cost: parseNum(o, 'lower_level_cost', 'LowerLevelCost'),
    total_cost: parseNum(o, 'total_cost', 'TotalCost'),
    currency: parseStr(o, 'currency', 'Currency') || undefined,
    overheads: unwrapArray(o['overheads'] ?? o['Overheads']).map(parseOverheadApplied),
    calculated_at: parseStr(o, 'calculated_at', 'CalculatedAt'),
  };
}
function parseWcc(raw: unknown): WorkCenterCost {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    work_center_id: parseNum(o, 'work_center_id', 'WorkCenterID'),
    cost_per_hour: parseNum(o, 'cost_per_hour', 'CostPerHour'),
    machine_cost_per_hour: parseNum(o, 'machine_cost_per_hour', 'MachineCostPerHour') || undefined,
    labor_cost_per_hour: parseNum(o, 'labor_cost_per_hour', 'LaborCostPerHour') || undefined,
    currency: parseStr(o, 'currency', 'Currency') || undefined,
  };
}
function parsePurchaseCost(raw: unknown): PurchaseCost {
  const o = unwrapObject(raw);
  return {
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    cost: parseNum(o, 'cost', 'Cost', 'unit_cost', 'UnitCost', 'purchase_cost', 'PurchaseCost'),
    currency: parseStr(o, 'currency', 'Currency') || undefined,
  };
}

// ── Custo padrão do item ──
/**
 * `lotSize` é o lote de referência sobre o qual o setup das operações é diluído
 * (setup ÷ lote). Com lote 1 o setup inteiro cai em cada peça e o custo padrão
 * sai muito acima do que a fábrica pratica; com o lote real de produção o
 * número fecha com o chão de fábrica. Vazio = 1, que é o default do backend.
 */
export async function calculateStandardCost(itemCode: string, mask?: string, lotSize?: number): Promise<StandardCost> {
  const { data } = await httpClient.post(`${BASE}/rollup`, {
    item_code: itemCode,
    mask: mask ?? '',
    lot_size: lotSize && lotSize > 0 ? lotSize : 1,
    calculated_by: currentUserId(),
  });
  return parseCost(data);
}
export async function getStandardCost(itemCode: string): Promise<StandardCost> {
  const { data } = await httpClient.get(`${BASE}/items/${itemCode}`);
  return parseCost(data);
}
/** O backend não expõe list-all de custo padrão (`GET /` → 404); retorna []. */
export async function listStandardCosts(): Promise<StandardCost[]> {
  return [];
}

// ── Custo/hora por centro de trabalho ──
export async function listWorkCenterCosts(): Promise<WorkCenterCost[]> {
  const { data } = await httpClient.get(`${BASE}/work-center-costs`);
  return unwrapArray(data).map(parseWcc);
}
/**
 * Grava a tarifa do centro de trabalho. `updated_by` sai do JWT no backend —
 * mandar o autor pelo corpo permitiria assinar a alteração como outra pessoa.
 */
export async function upsertWorkCenterCost(
  workCenterId: number,
  costPerHour: number,
  split?: { machine?: number; labor?: number },
): Promise<WorkCenterCost> {
  const { data } = await httpClient.post(`${BASE}/work-center-costs`, {
    work_center_id: workCenterId,
    cost_per_hour: costPerHour,
    machine_cost_per_hour: split?.machine ?? 0,
    labor_cost_per_hour: split?.labor ?? 0,
  });
  return parseWcc(data);
}

// ── Custo de compra por item ──
export async function getPurchaseCost(itemCode: string): Promise<PurchaseCost> {
  const { data } = await httpClient.get(`${BASE}/purchase-costs/${itemCode}`);
  return parsePurchaseCost(data);
}
export async function upsertPurchaseCost(itemCode: string, cost: number): Promise<PurchaseCost> {
  const { data } = await httpClient.post(`${BASE}/purchase-costs`, { item_code: itemCode, cost, updated_by: currentUserId() });
  return parsePurchaseCost(data);
}

// ─── Esquema de rateio de indiretos e histórico (migração 000373) ─────────────

/**
 * Regras de indireto da empresa. É o que faz `overhead_cost` deixar de ser zero:
 * sem nenhuma regra cadastrada, o custo do produto não carrega energia,
 * depreciação, supervisão nem aluguel — e era esse o estado anterior.
 */
export async function listOverheadRules(): Promise<OverheadRule[]> {
  const { data } = await httpClient.get(`${BASE}/overhead-rules`);
  return unwrapArray(data).map(parseOverheadRule);
}

export async function createOverheadRule(dto: OverheadRuleDTO): Promise<OverheadRule> {
  const { data } = await httpClient.post(`${BASE}/overhead-rules`, dto);
  return parseOverheadRule(data);
}

export async function updateOverheadRule(id: number, dto: OverheadRuleDTO): Promise<OverheadRule> {
  const { data } = await httpClient.put(`${BASE}/overhead-rules/${id}`, dto);
  return parseOverheadRule(data);
}

/** Desativa; não apaga. O histórico de apuração aponta para a regra. */
export async function deactivateOverheadRule(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/overhead-rules/${id}`);
}

/** Apurações passadas do item, da mais recente para a mais antiga. */
export async function listCostHistory(itemCode: string, mask?: string, limit?: number): Promise<CostHistoryEntry[]> {
  const params = new URLSearchParams();
  if (mask) params.set('mask', mask);
  if (limit && limit > 0) params.set('limit', String(limit));
  const texto = params.toString();
  const { data } = await httpClient.get(`${BASE}/history/${itemCode}${texto ? `?${texto}` : ''}`);
  return unwrapArray(data).map(parseHistory);
}

/**
 * Converte a taxa para exibição. Percentual guarda fração (0,12) e se mostra como
 * 12%; os métodos por valor guardam reais e se mostram como moeda. Misturar os dois
 * na mesma coluna sem esta distinção mostraria "0,12" para uma taxa de 12%.
 */
export function overheadRateLabel(rule: Pick<OverheadRule, 'method' | 'rate'>): string {
  if (rule.method === 'PERCENTUAL') {
    return `${(rule.rate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`;
  }
  const valor = rule.rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return rule.method === 'VALOR_POR_HORA' ? `R$ ${valor}/h` : `R$ ${valor}/un`;
}
