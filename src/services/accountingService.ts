import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Contabilidade (VCTB0200). Os nomes dos campos são os da API
 * (/api/accounting): plano = plan_number/description/valid_from/status; conta =
 * account_number/description/nature_code/is_analytic; lançamento = partida
 * simples débito × crédito. A empresa do lançamento é sempre a da sessão — a
 * API ignora qualquer empresa_id enviado.
 */

const BASE = '/api/accounting';

const dataISO = (v: string) => (v || '').slice(0, 10);

// ─── Planos de contas contábeis ─────────────────────────────────────────────

/** I = incluído (em montagem), A = ativo, X = inativo. */
export type PlanStatus = 'I' | 'A' | 'X';

export interface AccountingPlanDTO {
  id?: number;
  plan_number: number;
  description: string;
  valid_from: string;
  valid_to?: string;
  status: PlanStatus;
}

function parsePlan(raw: unknown): AccountingPlanDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id'),
    plan_number: parseNum(o, 'plan_number'),
    description: parseStr(o, 'description'),
    valid_from: dataISO(parseStr(o, 'valid_from')),
    valid_to: dataISO(parseStr(o, 'valid_to')) || undefined,
    status: (parseStr(o, 'status') || 'I') as PlanStatus,
  };
}

export async function listPlans(): Promise<AccountingPlanDTO[]> {
  const { data } = await httpClient.get(`${BASE}/plans`);
  return unwrapArray(data).map(parsePlan);
}

export async function createPlan(dto: AccountingPlanDTO): Promise<AccountingPlanDTO> {
  const { data } = await httpClient.post(`${BASE}/plans`, {
    plan_number: dto.plan_number,
    description: dto.description,
    valid_from: dto.valid_from,
    valid_to: dto.valid_to || '',
    status: dto.status,
  });
  return parsePlan(data);
}

// ─── Contas contábeis ───────────────────────────────────────────────────────

/** D = devedora, C = credora. */
export type AccountNature = 'D' | 'C';

export interface AccountDTO {
  id?: number;
  plan_id: number;
  parent_id?: number;
  account_number: string;
  description: string;
  nature_code: AccountNature;
  reduced_code?: string;
  requires_cost_center: boolean;
  valid_from: string;
  is_analytic: boolean;
}

function parseAccount(raw: unknown): AccountDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id'),
    plan_id: parseNum(o, 'plan_id'),
    parent_id: parseNum(o, 'parent_id') || undefined,
    account_number: parseStr(o, 'account_number'),
    description: parseStr(o, 'description'),
    nature_code: (parseStr(o, 'nature_code') === 'C' ? 'C' : 'D') as AccountNature,
    reduced_code: parseStr(o, 'reduced_code') || undefined,
    requires_cost_center: parseBool(o, 'requires_cost_center'),
    valid_from: dataISO(parseStr(o, 'valid_from')),
    is_analytic: o['is_analytic'] !== false,
  };
}

export async function listAccounts(planId: number): Promise<AccountDTO[]> {
  const { data } = await httpClient.get(`${BASE}/accounts`, { params: { plan_id: String(planId) } });
  return unwrapArray(data).map(parseAccount);
}

export async function createAccount(dto: AccountDTO): Promise<AccountDTO> {
  const { data } = await httpClient.post(`${BASE}/accounts`, {
    plan_id: dto.plan_id,
    parent_id: dto.parent_id ?? null,
    account_number: dto.account_number,
    description: dto.description,
    nature_code: dto.nature_code,
    reduced_code: dto.reduced_code || null,
    requires_cost_center: dto.requires_cost_center,
    valid_from: dto.valid_from,
    is_analytic: dto.is_analytic,
  });
  return parseAccount(data);
}

/** Rótulo "número — descrição" de uma conta, para listas e lookups. */
export const rotuloConta = (a: AccountDTO): string => `${a.account_number} — ${a.description}`;

// ─── Lançamentos contábeis ──────────────────────────────────────────────────

export interface JournalEntryDTO {
  id?: number;
  plan_id: number;
  entry_date: string;
  entry_number: string;
  batch_number?: string;
  debit_account_id: number;
  credit_account_id: number;
  value: number;
  history_code?: string;
  description: string;
  entry_type?: string;
}

function parseJournal(raw: unknown): JournalEntryDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id'),
    plan_id: parseNum(o, 'plan_id'),
    entry_date: dataISO(parseStr(o, 'entry_date')),
    entry_number: parseStr(o, 'entry_number'),
    batch_number: parseStr(o, 'batch_number') || undefined,
    debit_account_id: parseNum(o, 'debit_account_id'),
    credit_account_id: parseNum(o, 'credit_account_id'),
    value: parseNum(o, 'value'),
    history_code: parseStr(o, 'history_code') || undefined,
    description: parseStr(o, 'description'),
    entry_type: parseStr(o, 'entry_type') || undefined,
  };
}

export async function listJournalEntries(planId: number, from: string, to: string): Promise<JournalEntryDTO[]> {
  const { data } = await httpClient.get(`${BASE}/journal-entries`, { params: { plan_id: String(planId), from, to } });
  return unwrapArray(data).map(parseJournal);
}

export async function createJournalEntry(dto: JournalEntryDTO): Promise<JournalEntryDTO> {
  const { data } = await httpClient.post(`${BASE}/journal-entries`, {
    plan_id: dto.plan_id,
    entry_date: dto.entry_date,
    entry_number: dto.entry_number,
    batch_number: dto.batch_number ?? '',
    debit_account_id: dto.debit_account_id,
    credit_account_id: dto.credit_account_id,
    value: dto.value,
    history_code: dto.history_code ?? '',
    description: dto.description,
    entry_type: dto.entry_type ?? 'MANUAL',
  });
  return parseJournal(data);
}

// ─── Balancete ──────────────────────────────────────────────────────────────

export interface BalanceteRow {
  account_id: number;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface Balancete {
  balanced: boolean;
  total_debit: number;
  total_credit: number;
  rows: BalanceteRow[];
}

export async function getBalancete(planId: number, from: string, to: string): Promise<Balancete> {
  const { data } = await httpClient.get(`${BASE}/balancete`, { params: { plan_id: String(planId), from, to } });
  const o = unwrapObject(data);
  return {
    balanced: parseBool(o, 'balanced'),
    total_debit: parseNum(o, 'total_debit'),
    total_credit: parseNum(o, 'total_credit'),
    rows: unwrapArray(o['lines']).map(unwrapObject).map((r) => ({
      account_id: parseNum(r, 'account_id'),
      account_code: parseStr(r, 'account_number'),
      account_name: parseStr(r, 'description'),
      debit: parseNum(r, 'debit'),
      credit: parseNum(r, 'credit'),
      balance: parseNum(r, 'balance'),
    })),
  };
}

// ─── Contabilização automática da NF-e de entrada ───────────────────────────

/**
 * Contas usadas na aprovação da nota de entrada: débito no plano de contas do
 * item (vinculado à conta contábil) ou na despesa padrão, crédito em
 * Fornecedores; créditos de imposto em "a recuperar"; retenções em "a
 * recolher". Imposto com crédito e sem conta "a recuperar" vira custo.
 */
export interface ParametrosContabilizacao {
  plan_id: number;
  fornecedores_account_id: number;
  icms_recuperar_account_id?: number;
  ipi_recuperar_account_id?: number;
  pis_recuperar_account_id?: number;
  cofins_recuperar_account_id?: number;
  ibs_recuperar_account_id?: number;
  cbs_recuperar_account_id?: number;
  irrf_recolher_account_id?: number;
  pcc_recolher_account_id?: number;
  inss_recolher_account_id?: number;
  iss_recolher_account_id?: number;
  despesa_padrao_account_id?: number;
  contabilizar_entrada: boolean;
  // Restante do ciclo: pagamento, recebimento e NF-e de saída.
  contabilizar_pagamentos: boolean;
  contabilizar_recebimentos: boolean;
  contabilizar_saidas: boolean;
  banco_padrao_account_id?: number;
  juros_pagos_account_id?: number;
  descontos_obtidos_account_id?: number;
  clientes_account_id?: number;
  juros_recebidos_account_id?: number;
  descontos_concedidos_account_id?: number;
  receita_vendas_account_id?: number;
  icms_vendas_account_id?: number;
  icms_recolher_account_id?: number;
  icms_st_recolher_account_id?: number;
  ipi_recolher_account_id?: number;
  pis_vendas_account_id?: number;
  pis_recolher_account_id?: number;
  cofins_vendas_account_id?: number;
  cofins_recolher_account_id?: number;
  cmv_account_id?: number;
  estoque_account_id?: number;
}

/** Os três interruptores do ciclo além da entrada. */
export const FLAGS_CONTABILIZACAO: Array<{ campo: 'contabilizar_entrada' | 'contabilizar_pagamentos' | 'contabilizar_recebimentos' | 'contabilizar_saidas'; rotulo: string }> = [
  { campo: 'contabilizar_entrada', rotulo: 'Aprovação da NF de entrada (e frete)' },
  { campo: 'contabilizar_pagamentos', rotulo: 'Pagamento de fornecedor e recolhimento de retenções' },
  { campo: 'contabilizar_recebimentos', rotulo: 'Recebimento de cliente' },
  { campo: 'contabilizar_saidas', rotulo: 'NF-e de saída (receita, impostos e CMV)' },
];

export const CAMPOS_CONTA_PARAMETRO: Array<{ campo: keyof ParametrosContabilizacao; rotulo: string; grupo: string }> = [
  { campo: 'fornecedores_account_id', rotulo: 'Fornecedores (passivo)', grupo: 'Obrigatórias' },
  { campo: 'despesa_padrao_account_id', rotulo: 'Despesa/estoque padrão (plano sem conta)', grupo: 'Obrigatórias' },
  { campo: 'icms_recuperar_account_id', rotulo: 'ICMS a recuperar', grupo: 'Impostos a recuperar' },
  { campo: 'ipi_recuperar_account_id', rotulo: 'IPI a recuperar', grupo: 'Impostos a recuperar' },
  { campo: 'pis_recuperar_account_id', rotulo: 'PIS a recuperar', grupo: 'Impostos a recuperar' },
  { campo: 'cofins_recuperar_account_id', rotulo: 'COFINS a recuperar', grupo: 'Impostos a recuperar' },
  { campo: 'ibs_recuperar_account_id', rotulo: 'IBS a recuperar', grupo: 'Impostos a recuperar' },
  { campo: 'cbs_recuperar_account_id', rotulo: 'CBS a recuperar', grupo: 'Impostos a recuperar' },
  { campo: 'irrf_recolher_account_id', rotulo: 'IRRF retido a recolher', grupo: 'Retenções a recolher' },
  { campo: 'pcc_recolher_account_id', rotulo: 'PIS/COFINS/CSLL retidos a recolher', grupo: 'Retenções a recolher' },
  { campo: 'inss_recolher_account_id', rotulo: 'INSS retido a recolher', grupo: 'Retenções a recolher' },
  { campo: 'iss_recolher_account_id', rotulo: 'ISS retido a recolher', grupo: 'Retenções a recolher' },
  { campo: 'banco_padrao_account_id', rotulo: 'Banco padrão (conta bancária sem conta contábil)', grupo: 'Pagamentos e recebimentos' },
  { campo: 'juros_pagos_account_id', rotulo: 'Juros e multas pagos (despesa)', grupo: 'Pagamentos e recebimentos' },
  { campo: 'descontos_obtidos_account_id', rotulo: 'Descontos obtidos (receita)', grupo: 'Pagamentos e recebimentos' },
  { campo: 'clientes_account_id', rotulo: 'Clientes (ativo)', grupo: 'Pagamentos e recebimentos' },
  { campo: 'juros_recebidos_account_id', rotulo: 'Juros recebidos (receita)', grupo: 'Pagamentos e recebimentos' },
  { campo: 'descontos_concedidos_account_id', rotulo: 'Descontos concedidos (despesa)', grupo: 'Pagamentos e recebimentos' },
  { campo: 'receita_vendas_account_id', rotulo: 'Receita de vendas', grupo: 'NF-e de saída' },
  { campo: 'icms_vendas_account_id', rotulo: 'ICMS sobre vendas (dedução)', grupo: 'NF-e de saída' },
  { campo: 'icms_recolher_account_id', rotulo: 'ICMS a recolher', grupo: 'NF-e de saída' },
  { campo: 'icms_st_recolher_account_id', rotulo: 'ICMS-ST a recolher', grupo: 'NF-e de saída' },
  { campo: 'ipi_recolher_account_id', rotulo: 'IPI a recolher', grupo: 'NF-e de saída' },
  { campo: 'pis_vendas_account_id', rotulo: 'PIS sobre vendas (dedução)', grupo: 'NF-e de saída' },
  { campo: 'pis_recolher_account_id', rotulo: 'PIS a recolher', grupo: 'NF-e de saída' },
  { campo: 'cofins_vendas_account_id', rotulo: 'COFINS sobre vendas (dedução)', grupo: 'NF-e de saída' },
  { campo: 'cofins_recolher_account_id', rotulo: 'COFINS a recolher', grupo: 'NF-e de saída' },
  { campo: 'cmv_account_id', rotulo: 'Custo da mercadoria vendida (CMV)', grupo: 'NF-e de saída' },
  { campo: 'estoque_account_id', rotulo: 'Estoque (baixa pelo custo médio)', grupo: 'NF-e de saída' },
];

export const GRUPOS_CONTA_PARAMETRO = ['Obrigatórias', 'Impostos a recuperar', 'Retenções a recolher', 'Pagamentos e recebimentos', 'NF-e de saída'];

function parseParametros(raw: unknown): ParametrosContabilizacao | null {
  if (raw == null) return null;
  const o = unwrapObject(raw);
  if (!parseNum(o, 'plan_id')) return null;
  const opt = (k: string) => parseNum(o, k) || undefined;
  return {
    plan_id: parseNum(o, 'plan_id'),
    fornecedores_account_id: parseNum(o, 'fornecedores_account_id'),
    icms_recuperar_account_id: opt('icms_recuperar_account_id'),
    ipi_recuperar_account_id: opt('ipi_recuperar_account_id'),
    pis_recuperar_account_id: opt('pis_recuperar_account_id'),
    cofins_recuperar_account_id: opt('cofins_recuperar_account_id'),
    ibs_recuperar_account_id: opt('ibs_recuperar_account_id'),
    cbs_recuperar_account_id: opt('cbs_recuperar_account_id'),
    irrf_recolher_account_id: opt('irrf_recolher_account_id'),
    pcc_recolher_account_id: opt('pcc_recolher_account_id'),
    inss_recolher_account_id: opt('inss_recolher_account_id'),
    iss_recolher_account_id: opt('iss_recolher_account_id'),
    despesa_padrao_account_id: opt('despesa_padrao_account_id'),
    contabilizar_entrada: parseBool(o, 'contabilizar_entrada'),
    contabilizar_pagamentos: parseBool(o, 'contabilizar_pagamentos'),
    contabilizar_recebimentos: parseBool(o, 'contabilizar_recebimentos'),
    contabilizar_saidas: parseBool(o, 'contabilizar_saidas'),
    banco_padrao_account_id: opt('banco_padrao_account_id'),
    juros_pagos_account_id: opt('juros_pagos_account_id'),
    descontos_obtidos_account_id: opt('descontos_obtidos_account_id'),
    clientes_account_id: opt('clientes_account_id'),
    juros_recebidos_account_id: opt('juros_recebidos_account_id'),
    descontos_concedidos_account_id: opt('descontos_concedidos_account_id'),
    receita_vendas_account_id: opt('receita_vendas_account_id'),
    icms_vendas_account_id: opt('icms_vendas_account_id'),
    icms_recolher_account_id: opt('icms_recolher_account_id'),
    icms_st_recolher_account_id: opt('icms_st_recolher_account_id'),
    ipi_recolher_account_id: opt('ipi_recolher_account_id'),
    pis_vendas_account_id: opt('pis_vendas_account_id'),
    pis_recolher_account_id: opt('pis_recolher_account_id'),
    cofins_vendas_account_id: opt('cofins_vendas_account_id'),
    cofins_recolher_account_id: opt('cofins_recolher_account_id'),
    cmv_account_id: opt('cmv_account_id'),
    estoque_account_id: opt('estoque_account_id'),
  };
}

/** Parâmetros da empresa; null quando ainda não configurados. */
export async function getParametrosContabilizacao(): Promise<ParametrosContabilizacao | null> {
  const { data } = await httpClient.get('/api/fiscal/contabilizacao/parametros');
  return parseParametros(data);
}

export async function salvarParametrosContabilizacao(p: ParametrosContabilizacao): Promise<ParametrosContabilizacao | null> {
  const { data } = await httpClient.put('/api/fiscal/contabilizacao/parametros', p);
  return parseParametros(data);
}

/** Liga (ou desliga, com null) o plano de contas financeiro a uma conta contábil analítica. */
export async function vincularPlanoContaContabil(planoContasId: number, contaContabilId: number | null): Promise<void> {
  await httpClient.put(`/api/financial/plano-contas/${planoContasId}/conta-contabil`, { accounting_account_id: contaContabilId });
}

/** Liga (ou desliga, com null) a conta bancária à sua conta contábil (o "Banco" do pagamento/recebimento). */
export async function vincularContaBancariaContabil(contaBancariaId: number, contaContabilId: number | null): Promise<void> {
  await httpClient.put(`/api/financial/contas-bancarias/${contaBancariaId}/conta-contabil`, { accounting_account_id: contaContabilId });
}

// ─── Demonstrativos ─────────────────────────────────────────────────────────

export async function createDemonstrative(dto: { code: string; description: string; term_text?: string }): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/demonstratives`, dto);
  return unwrapObject(data);
}
