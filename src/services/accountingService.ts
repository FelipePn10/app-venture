import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/accounting';

// ─── Planos de conta ────────────────────────────────────────────────────────

export interface AccountingPlanDTO {
  id?: number;
  empresa_id: number;
  name: string;
  year: number;
  is_active?: boolean;
}
function parsePlan(raw: unknown): AccountingPlanDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    empresa_id: parseNum(o, 'empresa_id', 'EmpresaID'),
    name: parseStr(o, 'name', 'Name'),
    year: parseNum(o, 'year', 'Year'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}
export async function listPlans(empresaId: number): Promise<AccountingPlanDTO[]> {
  const { data } = await httpClient.get(`${BASE}/plans`, { params: { empresa_id: String(empresaId) } });
  return unwrapArray(data).map(parsePlan);
}
export async function createPlan(dto: AccountingPlanDTO): Promise<AccountingPlanDTO> {
  // O backend exige `valid_from` (date-only) — derivamos do ano do plano.
  const valid_from = `${dto.year}-01-01`;
  const { data } = await httpClient.post(`${BASE}/plans`, { ...dto, valid_from });
  return parsePlan(data);
}

// ─── Contas contábeis ───────────────────────────────────────────────────────

export type AccountType = 'SINTETICA' | 'ANALITICA';
export type AccountNature = 'DEVEDORA' | 'CREDORA';
export interface AccountDTO {
  id?: number;
  plan_id: number;
  code: string;
  name: string;
  account_type: AccountType;
  nature: AccountNature;
  parent_id?: number | null;
}
function parseAccount(raw: unknown): AccountDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    plan_id: parseNum(o, 'plan_id', 'PlanID'),
    code: parseStr(o, 'code', 'Code'),
    name: parseStr(o, 'name', 'Name'),
    account_type: (parseStr(o, 'account_type', 'AccountType') || 'ANALITICA') as AccountType,
    nature: (parseStr(o, 'nature', 'Nature') || 'DEVEDORA') as AccountNature,
  };
}
export async function listAccounts(planId: number): Promise<AccountDTO[]> {
  const { data } = await httpClient.get(`${BASE}/accounts`, { params: { plan_id: String(planId) } });
  return unwrapArray(data).map(parseAccount);
}
export async function createAccount(dto: AccountDTO): Promise<AccountDTO> {
  // O módulo accounting exige `valid_from` (date-only) nas entidades.
  const valid_from = new Date().toISOString().slice(0, 10);
  const { data } = await httpClient.post(`${BASE}/accounts`, { valid_from, ...dto });
  return parseAccount(data);
}

// ─── Lançamentos contábeis ──────────────────────────────────────────────────

export interface JournalEntryDTO {
  id?: number;
  empresa_id: number;
  entry_date: string;
  period: string;
  history: string;
  debit_account_id: number;
  credit_account_id: number;
  value: number;
}
function parseJournal(raw: unknown): JournalEntryDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    empresa_id: parseNum(o, 'empresa_id', 'EmpresaID'),
    entry_date: parseStr(o, 'entry_date', 'EntryDate'),
    period: parseStr(o, 'period', 'Period'),
    history: parseStr(o, 'history', 'History'),
    debit_account_id: parseNum(o, 'debit_account_id', 'DebitAccountID'),
    credit_account_id: parseNum(o, 'credit_account_id', 'CreditAccountID'),
    value: parseNum(o, 'value', 'Value'),
  };
}
export async function listJournalEntries(empresaId: number, period: string): Promise<JournalEntryDTO[]> {
  const { data } = await httpClient.get(`${BASE}/journal-entries`, { params: { empresa_id: String(empresaId), period } });
  return unwrapArray(data).map(parseJournal);
}
export async function createJournalEntry(dto: JournalEntryDTO): Promise<JournalEntryDTO> {
  const valid_from = (dto.entry_date || new Date().toISOString()).slice(0, 10);
  const { data } = await httpClient.post(`${BASE}/journal-entries`, { valid_from, ...dto });
  return parseJournal(data);
}

// ─── Balancete ──────────────────────────────────────────────────────────────

export interface BalanceteRow {
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
export async function getBalancete(planId: number, empresaId: number, from: string, to: string): Promise<Balancete> {
  const { data } = await httpClient.get(`${BASE}/balancete`, { params: { plan_id: String(planId), empresa_id: String(empresaId), from, to } });
  const o = unwrapObject(data);
  const rawRows = unwrapArray(o['rows'] ?? o['accounts'] ?? data);
  const rows = rawRows.map((r) => {
    const ro = unwrapObject(r);
    return {
      account_code: parseStr(ro, 'account_code', 'code', 'Code'),
      account_name: parseStr(ro, 'account_name', 'name', 'Name'),
      debit: parseNum(ro, 'debit', 'Debit', 'total_debit'),
      credit: parseNum(ro, 'credit', 'Credit', 'total_credit'),
      balance: parseNum(ro, 'balance', 'Balance', 'saldo'),
    };
  });
  return {
    balanced: parseBool(o, 'balanced', 'Balanced'),
    total_debit: parseNum(o, 'total_debit', 'TotalDebit'),
    total_credit: parseNum(o, 'total_credit', 'TotalCredit'),
    rows,
  };
}

// ─── Demonstrativos & SPED ECD ──────────────────────────────────────────────

export async function createDemonstrative(dto: { empresa_id: number; type: string; period: string; name: string }): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/demonstratives`, dto);
  return unwrapObject(data);
}
