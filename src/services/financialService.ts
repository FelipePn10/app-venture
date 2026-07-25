import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/financial';

// ─── Cadastros base ─────────────────────────────────────────────────────────

export interface ContaBancariaDTO {
  banco: string;
  agencia: string;
  conta: string;
  digito: string;
  descricao: string;
  titular: string;
  saldo_inicial: number;
  chave_pix: string;
  tipo_chave_pix: string;
}
export interface ContaBancaria extends ContaBancariaDTO {
  id: number;
  /**
   * `ContaBancariaResponse` NÃO traz saldo atual — o cadastro só guarda o saldo
   * inicial. O saldo movimentado vem de `/saldo-contas` ({@link getSaldoContas}),
   * consumido pelo VFIN0300. Fica opcional para a tela poder cair no saldo inicial.
   */
  saldo_atual?: number;
}

export interface CondicaoPagamentoDTO { nome: string; parcelas: string; }
export interface CondicaoPagamento extends CondicaoPagamentoDTO { id: number; }

export type PlanoTipo = 'RECEITA' | 'DESPESA' | 'ATIVO' | 'PASSIVO' | 'PATRIMONIO';
export type PlanoNatureza = 'DEBITO' | 'CREDITO';
export interface PlanoContaDTO {
  codigo: string;
  descricao: string;
  tipo: PlanoTipo;
  natureza: PlanoNatureza;
  parent_code?: string;
  nivel: number;
}
export interface PlanoConta extends PlanoContaDTO { id: number; }

export interface CentroCustoDTO { codigo: string; descricao: string; tipo: string; }
export interface CentroCusto extends CentroCustoDTO { id: number; }

// ─── Contas a pagar / receber ───────────────────────────────────────────────

export interface ContaPagarDTO {
  numero_documento: string;
  tipo_documento: string;
  fornecedor_id?: number;
  fiscal_entry_id?: number;
  data_emissao: string;
  data_vencimento: string;
  valor_bruto: number;
  desconto: number;
  parcela_numero: number;
  parcela_total: number;
  forma_pagamento: string;
  plano_contas_id?: number;
  centro_custo_id?: number;
  observacao: string;
}
export interface ContaPagar {
  id: number;
  numero_documento: string;
  status: string;
  valor_bruto: number;
  valor_pago: number;
  data_vencimento: string;
  fornecedor_id?: number;
}

export interface ContaReceberDTO {
  numero_documento: string;
  cliente_id?: number;
  fiscal_exit_id?: number;
  data_emissao: string;
  data_vencimento: string;
  valor_bruto: number;
  desconto: number;
  parcela_numero: number;
  parcela_total: number;
  forma_pagamento: string;
  observacao: string;
}
export interface ContaReceber {
  id: number;
  numero_documento: string;
  status: string;
  valor_bruto: number;
  valor_recebido: number;
  data_vencimento: string;
  cliente_id?: number;
}

export interface BaixaPagamentoDTO {
  conta_bancaria_id: number;
  valor_pago: number;
  data_pagamento: string;
  observacao?: string;
}
export interface BaixaRecebimentoDTO {
  conta_bancaria_id: number;
  valor_recebido: number;
  data_recebimento: string;
  observacao?: string;
}

/**
 * Faixa de vencimento devolvida por `/contas-pagar/aging` e `/contas-receber/aging`.
 *
 * O backend responde uma LISTA de `{period, total}` agrupada no SQL — as faixas
 * são `Vencido`, `7 dias`, `15 dias`, `30 dias`, `60 dias` e `Acima de 60 dias`.
 * Não existe um objeto único com faixas fixas: a tela renderiza o que vier.
 */
export interface AgingBucket {
  period: string;
  total: number;
}

export interface ListFilters {
  status?: string;
  start_date?: string;
  end_date?: string;
  fornecedor_id?: number | string;
  cliente_id?: number | string;
}

// ─── Fluxo de caixa & saldos ────────────────────────────────────────────────

export interface FluxoCaixaItem {
  data: string;
  tipo: string;
  valor: number;
  descricao: string;
  conta_bancaria_id?: number;
  conciliado?: boolean;
}
export interface FluxoProjetadoItem {
  data_vencimento: string;
  tipo: string;
  valor: number;
  descricao: string;
}
export interface SaldoConta {
  id: number;
  banco: string;
  descricao: string;
  saldo_atual: number;
}

// ─── Apuração ───────────────────────────────────────────────────────────────

/**
 * Apuração de impostos — `/apuracao-impostos`.
 *
 * O backend devolve uma LISTA com UMA LINHA POR IMPOSTO (`TaxAssessmentResponse`),
 * não um objeto com colunas fixas por tributo. `debitos` são as saídas,
 * `creditos` as entradas, e o resultado do período fica em `saldo_devedor` /
 * `saldo_credor` (um dos dois é zero).
 */
export interface ApuracaoImposto {
  id: number;
  imposto: string;
  competencia: string;
  debitos: number;
  creditos: number;
  saldo_devedor: number;
  saldo_credor: number;
  status: string;
  cp_id?: number;
  data_vencimento?: string;
}

// ─── Parsers (tolerate snake_case AND PascalCase — see demo doc §7) ──────────

function parseContaBancaria(raw: unknown): ContaBancaria {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    banco: parseStr(o, 'banco', 'Banco'),
    agencia: parseStr(o, 'agencia', 'Agencia'),
    conta: parseStr(o, 'conta', 'Conta'),
    digito: parseStr(o, 'digito', 'Digito'),
    descricao: parseStr(o, 'descricao', 'Descricao'),
    titular: parseStr(o, 'titular', 'Titular'),
    saldo_inicial: parseNum(o, 'saldo_inicial', 'SaldoInicial'),
    saldo_atual: parseNum(o, 'saldo_atual', 'SaldoAtual') || undefined,
    chave_pix: parseStr(o, 'chave_pix', 'ChavePix'),
    tipo_chave_pix: parseStr(o, 'tipo_chave_pix', 'TipoChavePix'),
  };
}

/** Backend stores `parcelas` as `[{ dias, percentual }]`; flatten to "30,60,90". */
function parcelasToStr(v: unknown): string {
  if (Array.isArray(v)) {
    return v
      .map((p) => (p && typeof p === 'object' ? parseNum(p as Obj, 'dias', 'Dias', 'days') : Number(p) || 0))
      .join(',');
  }
  return v != null ? String(v) : '';
}

function parseCondicao(raw: unknown): CondicaoPagamento {
  const o = unwrapObject(raw);
  return { id: parseNum(o, 'id', 'ID'), nome: parseStr(o, 'nome', 'Nome'), parcelas: parcelasToStr(o['parcelas'] ?? o['Parcelas']) };
}

function parsePlano(raw: unknown): PlanoConta {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    codigo: parseStr(o, 'codigo', 'Codigo'),
    descricao: parseStr(o, 'descricao', 'Descricao'),
    tipo: (parseStr(o, 'tipo', 'Tipo') || 'RECEITA') as PlanoTipo,
    natureza: (parseStr(o, 'natureza', 'Natureza') || 'CREDITO') as PlanoNatureza,
    parent_code: parseStr(o, 'parent_code', 'ParentCode'),
    nivel: parseNum(o, 'nivel', 'Nivel'),
  };
}

function parseCentro(raw: unknown): CentroCusto {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    codigo: parseStr(o, 'codigo', 'Codigo'),
    descricao: parseStr(o, 'descricao', 'Descricao'),
    tipo: parseStr(o, 'tipo', 'Tipo'),
  };
}

function parsePagar(raw: unknown): ContaPagar {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    numero_documento: parseStr(o, 'numero_documento', 'NumeroDocumento'),
    status: parseStr(o, 'status', 'Status'),
    valor_bruto: parseNum(o, 'valor_bruto', 'ValorBruto'),
    valor_pago: parseNum(o, 'valor_pago', 'ValorPago'),
    data_vencimento: parseStr(o, 'data_vencimento', 'DataVencimento'),
    fornecedor_id: parseNum(o, 'fornecedor_id', 'FornecedorID'),
  };
}

function parseReceber(raw: unknown): ContaReceber {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    numero_documento: parseStr(o, 'numero_documento', 'NumeroDocumento'),
    status: parseStr(o, 'status', 'Status'),
    valor_bruto: parseNum(o, 'valor_bruto', 'ValorBruto'),
    valor_recebido: parseNum(o, 'valor_recebido', 'ValorRecebido'),
    data_vencimento: parseStr(o, 'data_vencimento', 'DataVencimento'),
    cliente_id: parseNum(o, 'cliente_id', 'ClienteID'),
  };
}

function parseAgingBucket(raw: unknown): AgingBucket {
  const o = unwrapObject(raw);
  return {
    period: parseStr(o, 'period', 'Period'),
    total: parseNum(o, 'total', 'Total'),
  };
}

/** Soma das faixas — o backend não devolve total consolidado. */
export function agingTotal(buckets: AgingBucket[]): number {
  return buckets.reduce((sum, b) => sum + b.total, 0);
}

function buildParams(f?: ListFilters): Record<string, string> | undefined {
  if (!f) return undefined;
  const p: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v !== undefined && v !== null && v !== '') p[k] = String(v);
  }
  return Object.keys(p).length ? p : undefined;
}

// ─── Contas bancárias ───────────────────────────────────────────────────────

export async function listContasBancarias(): Promise<ContaBancaria[]> {
  const { data } = await httpClient.get(`${BASE}/contas-bancarias/list`);
  return unwrapArray(data).map(parseContaBancaria);
}
export async function createContaBancaria(dto: ContaBancariaDTO): Promise<ContaBancaria> {
  const { data } = await httpClient.post(`${BASE}/contas-bancarias/create`, dto);
  return parseContaBancaria(data);
}

// ─── Condições de pagamento ─────────────────────────────────────────────────

export async function listCondicoesPagamento(): Promise<CondicaoPagamento[]> {
  const { data } = await httpClient.get(`${BASE}/condicoes-pagamento/list`);
  return unwrapArray(data).map(parseCondicao);
}
export async function createCondicaoPagamento(dto: CondicaoPagamentoDTO): Promise<CondicaoPagamento> {
  // Backend expects `parcelas` as a JSON array of day counts (sent as a JSON
  // string), not the raw comma-separated text the screen collects.
  const days = dto.parcelas.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
  const { data } = await httpClient.post(`${BASE}/condicoes-pagamento/create`, { nome: dto.nome, parcelas: JSON.stringify(days) });
  return parseCondicao(data);
}

// ─── Plano de contas ────────────────────────────────────────────────────────

export async function listPlanoContas(): Promise<PlanoConta[]> {
  const { data } = await httpClient.get(`${BASE}/plano-contas/list`);
  return unwrapArray(data).map(parsePlano);
}
export async function createPlanoConta(dto: PlanoContaDTO): Promise<PlanoConta> {
  const { data } = await httpClient.post(`${BASE}/plano-contas/create`, dto);
  return parsePlano(data);
}

// ─── Centros de custo ───────────────────────────────────────────────────────

export async function listCentrosCusto(): Promise<CentroCusto[]> {
  const { data } = await httpClient.get(`${BASE}/centros-custo/list`);
  return unwrapArray(data).map(parseCentro);
}
export async function createCentroCusto(dto: CentroCustoDTO): Promise<CentroCusto> {
  const { data } = await httpClient.post(`${BASE}/centros-custo/create`, dto);
  return parseCentro(data);
}

// ─── Contas a pagar ─────────────────────────────────────────────────────────

export async function listContasPagar(filters?: ListFilters): Promise<ContaPagar[]> {
  const { data } = await httpClient.get(`${BASE}/contas-pagar/list`, { params: buildParams(filters) });
  return unwrapArray(data).map(parsePagar);
}
export async function createContaPagar(dto: ContaPagarDTO): Promise<ContaPagar> {
  const { data } = await httpClient.post(`${BASE}/contas-pagar/create`, dto);
  return parsePagar(data);
}
export async function approveContaPagar(id: number, motivoRejeicao: string | null): Promise<ContaPagar> {
  const { data } = await httpClient.post(`${BASE}/contas-pagar/${id}/approve`, { motivo_rejeicao: motivoRejeicao });
  return parsePagar(data);
}
export async function baixarContaPagar(id: number, dto: BaixaPagamentoDTO): Promise<ContaPagar> {
  const { data } = await httpClient.post(`${BASE}/contas-pagar/${id}/baixar`, dto);
  return parsePagar(data);
}
export async function cancelContaPagar(id: number): Promise<ContaPagar> {
  const { data } = await httpClient.post(`${BASE}/contas-pagar/${id}/cancel`, {});
  return parsePagar(data);
}
export async function agingPagar(): Promise<AgingBucket[]> {
  const { data } = await httpClient.get(`${BASE}/contas-pagar/aging`);
  return unwrapArray(data).map(parseAgingBucket);
}

// ─── Contas a receber ───────────────────────────────────────────────────────

export async function listContasReceber(filters?: ListFilters): Promise<ContaReceber[]> {
  const { data } = await httpClient.get(`${BASE}/contas-receber/list`, { params: buildParams(filters) });
  return unwrapArray(data).map(parseReceber);
}
export async function createContaReceber(dto: ContaReceberDTO): Promise<ContaReceber> {
  const { data } = await httpClient.post(`${BASE}/contas-receber/create`, dto);
  return parseReceber(data);
}
export async function baixarContaReceber(id: number, dto: BaixaRecebimentoDTO): Promise<ContaReceber> {
  const { data } = await httpClient.post(`${BASE}/contas-receber/${id}/baixar`, dto);
  return parseReceber(data);
}
export async function cancelContaReceber(id: number): Promise<ContaReceber> {
  const { data } = await httpClient.post(`${BASE}/contas-receber/${id}/cancel`, {});
  return parseReceber(data);
}
export async function agingReceber(): Promise<AgingBucket[]> {
  const { data } = await httpClient.get(`${BASE}/contas-receber/aging`);
  return unwrapArray(data).map(parseAgingBucket);
}

// ─── Fluxo de caixa & saldos ────────────────────────────────────────────────

export async function getFluxoCaixa(start: string, end: string): Promise<FluxoCaixaItem[]> {
  const { data } = await httpClient.get(`${BASE}/fluxo-caixa`, { params: { start_date: start, end_date: end } });
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      data: parseStr(o, 'data', 'Data'),
      tipo: parseStr(o, 'tipo', 'Tipo'),
      valor: parseNum(o, 'valor', 'Valor'),
      descricao: parseStr(o, 'descricao', 'Descricao'),
      conta_bancaria_id: parseNum(o, 'conta_bancaria_id', 'ContaBancariaID'),
      conciliado: parseBool(o, 'conciliado', 'Conciliado'),
    };
  });
}

export async function getFluxoProjetado(start: string): Promise<FluxoProjetadoItem[]> {
  const { data } = await httpClient.get(`${BASE}/fluxo-projetado`, { params: { start_date: start } });
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      data_vencimento: parseStr(o, 'data_vencimento', 'DataVencimento'),
      tipo: parseStr(o, 'tipo', 'Tipo'),
      valor: parseNum(o, 'valor', 'Valor'),
      descricao: parseStr(o, 'descricao', 'Descricao'),
    };
  });
}

export async function getSaldoContas(): Promise<SaldoConta[]> {
  // The backend returns `{ saldo_consolidado, contas: [{ conta_id, saldo }] }`
  // (no bank name/description), so we join with the bank list to give the
  // screen a usable label.
  const [saldoRes, banks] = await Promise.all([
    httpClient.get(`${BASE}/saldo-contas`),
    listContasBancarias().catch(() => [] as ContaBancaria[]),
  ]);
  const data = saldoRes.data as unknown;
  const bankById = new Map(banks.map((b) => [b.id, b]));

  let rows: unknown[] = [];
  if (Array.isArray(data)) rows = data;
  else if (data && typeof data === 'object') {
    const o = data as Obj;
    rows = Array.isArray(o['contas']) ? (o['contas'] as unknown[]) : unwrapArray(data);
  }

  return rows.map((raw) => {
    const o = unwrapObject(raw);
    const id = parseNum(o, 'conta_id', 'id', 'ID', 'ContaID');
    const bank = bankById.get(id);
    return {
      id,
      banco: parseStr(o, 'banco', 'Banco') || bank?.banco || '',
      descricao: parseStr(o, 'descricao', 'Descricao') || bank?.descricao || `Conta ${id}`,
      saldo_atual: parseNum(o, 'saldo', 'saldo_atual', 'SaldoAtual'),
    };
  });
}

// ─── Apuração de impostos ───────────────────────────────────────────────────

function parseApuracao(raw: unknown): ApuracaoImposto {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    imposto: parseStr(o, 'imposto', 'Imposto'),
    competencia: parseStr(o, 'competencia', 'Competencia'),
    debitos: parseNum(o, 'debitos', 'Debitos'),
    creditos: parseNum(o, 'creditos', 'Creditos'),
    saldo_devedor: parseNum(o, 'saldo_devedor', 'SaldoDevedor'),
    saldo_credor: parseNum(o, 'saldo_credor', 'SaldoCredor'),
    status: parseStr(o, 'status', 'Status'),
    cp_id: parseNum(o, 'cp_id', 'CpID') || undefined,
    data_vencimento: parseStr(o, 'data_vencimento', 'DataVencimento') || undefined,
  };
}

export async function apurarImpostos(competencia: string): Promise<ApuracaoImposto[]> {
  const { data } = await httpClient.post(`${BASE}/apuracao-impostos`, { competencia });
  return unwrapArray(data).map(parseApuracao);
}

export async function getApuracao(competencia: string): Promise<ApuracaoImposto[]> {
  const { data } = await httpClient.get(`${BASE}/apuracao-impostos/${encodeURIComponent(competencia)}`);
  return unwrapArray(data).map(parseApuracao);
}
