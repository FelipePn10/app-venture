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
  /**
   * Pedido de compra que originou o título. É o vínculo que fecha o ciclo
   * pedido → nota → pagamento: sem ele, o financeiro paga sem saber a que
   * compra o título corresponde.
   */
  purchase_order_id?: number;
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
  /** Campos que a resposta já trazia e o parser descartava. */
  tipo_documento?: string;
  data_emissao?: string;
  data_pagamento?: string;
  status_aprovacao?: string;
  fiscal_entry_id?: number;
  purchase_order_id?: number;
  plano_contas_id?: number;
  centro_custo_id?: number;
  desconto?: number;
  juros?: number;
  multa?: number;
  parcela_numero?: number;
  parcela_total?: number;
  forma_pagamento?: string;
}

export interface ContaReceberDTO {
  numero_documento: string;
  cliente_id?: number;
  fiscal_exit_id?: number;
  /** Pedido de venda que originou o título — fecha o ciclo pedido → nota → recebimento. */
  sales_order_id?: number;
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
  /**
   * Campos que a resposta já trazia e o parser descartava. Sem emissão não se
   * confere a carteira com o parceiro; sem o vínculo da nota e do pedido a grade
   * não fecha o ciclo pedido → nota → recebimento.
   */
  data_emissao?: string;
  data_recebimento?: string;
  fiscal_exit_id?: number;
  sales_order_id?: number;
  desconto?: number;
  juros?: number;
  multa?: number;
  parcela_numero?: number;
  parcela_total?: number;
  forma_pagamento?: string;
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

/**
 * Filtros da carteira. Viajam na QUERY STRING.
 *
 * ⚠️ Até esta versão o backend lia estes campos do CORPO de uma rota GET — e
 * nenhum cliente HTTP manda corpo num GET. O filtro nunca chegava: a tela mostrava
 * a carteira inteira com o filtro marcado, e quem consultava concluía que não
 * havia título vencido quando havia.
 *
 * `status` é comparado sem diferenciar maiúsculas: a coluna grava em MAIÚSCULAS.
 */
export interface ListFilters {
  status?: string;
  /** VENCIMENTO (padrão) ou EMISSAO — a data sobre a qual o período filtra. */
  date_field?: 'VENCIMENTO' | 'EMISSAO';
  start_date?: string;
  end_date?: string;
  fornecedor_id?: number | string;
  cliente_id?: number | string;
  /** Casa por trecho, sem diferenciar caixa. */
  documento?: string;
  tipo_documento?: string;
  plano_contas_id?: number | string;
  centro_custo_id?: number | string;
  sales_order_id?: number | string;
  fiscal_exit_id?: number | string;
  valor_minimo?: number | string;
  valor_maximo?: number | string;
  /** Em aberto com vencimento anterior a hoje. */
  somente_vencidos?: boolean | string;
  status_aprovacao?: string;
}

/** Situações do título, com o rótulo que a tela mostra. O valor é MAIÚSCULO porque
 *  é assim que a coluna grava; a tela enviava minúsculas e não filtrava nada. */
export const STATUS_TITULO_PAGAR = [
  { valor: '', rotulo: 'Todas as situações' },
  { valor: 'PENDENTE', rotulo: 'Pendente' },
  { valor: 'APROVADO', rotulo: 'Aprovado' },
  { valor: 'PAGO', rotulo: 'Pago' },
  { valor: 'VENCIDO', rotulo: 'Vencido' },
  { valor: 'CANCELADO', rotulo: 'Cancelado' },
] as const;

export const STATUS_TITULO_RECEBER = [
  { valor: '', rotulo: 'Todas as situações' },
  { valor: 'PENDENTE', rotulo: 'Pendente' },
  { valor: 'PARCIAL', rotulo: 'Recebido em parte' },
  { valor: 'RECEBIDO', rotulo: 'Recebido' },
  { valor: 'PAGO', rotulo: 'Quitado' },
  { valor: 'CANCELADO', rotulo: 'Cancelado' },
] as const;

/** Formas de pagamento. Era campo de texto livre: "boleto", "Boleto" e "BOL"
 *  viravam três formas diferentes nos relatórios. */
export const FORMAS_DE_PAGAMENTO = [
  'BOLETO', 'TRANSFERENCIA', 'PIX', 'DINHEIRO', 'CARTAO', 'CHEQUE', 'DEBITO_AUTOMATICO', 'OUTRO',
] as const;
export type FormaDePagamento = (typeof FORMAS_DE_PAGAMENTO)[number];

export const FORMA_PAGAMENTO_LABELS: Record<FormaDePagamento, string> = {
  BOLETO: 'Boleto',
  TRANSFERENCIA: 'Transferência',
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  CHEQUE: 'Cheque',
  DEBITO_AUTOMATICO: 'Débito automático',
  OUTRO: 'Outra',
};

/** Tipos de documento de um título a pagar. */
export const TIPOS_DE_DOCUMENTO = ['NF-e', 'NFS-e', 'CT-e', 'FATURA', 'RECIBO', 'BOLETO', 'CONTRATO', 'OUTRO'] as const;

/**
 * Dias de atraso de um título em aberto. Negativo = ainda a vencer.
 * Calculado na tela porque o endpoint não devolve; a data de referência é a do
 * navegador, e é por isso que o número aparece ao lado do vencimento e não sozinho.
 */
export function diasDeAtraso(vencimento?: string): number | undefined {
  if (!vencimento) return undefined;
  const venc = new Date(`${vencimento.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(venc.getTime())) return undefined;
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  return Math.round((hoje.getTime() - venc.getTime()) / 86400000);
}

/** Um filtro da carteira está ativo quando qualquer campo foi preenchido. */
export function temFiltroAtivo(f: ListFilters): boolean {
  return Object.entries(f).some(([, v]) => v !== undefined && v !== null && v !== '' && v !== false);
}

/** Título em aberto: nem pago, nem recebido, nem cancelado. */
export function estaEmAberto(status: string): boolean {
  const s = (status || '').toUpperCase();
  return !['PAGO', 'RECEBIDO', 'CANCELADO', 'QUITADO'].includes(s);
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
    fornecedor_id: parseNum(o, 'fornecedor_id', 'FornecedorID') || undefined,
    tipo_documento: parseStr(o, 'tipo_documento', 'TipoDocumento') || undefined,
    data_emissao: parseStr(o, 'data_emissao', 'DataEmissao') || undefined,
    data_pagamento: parseStr(o, 'data_pagamento', 'DataPagamento') || undefined,
    status_aprovacao: parseStr(o, 'status_aprovacao', 'StatusAprovacao') || undefined,
    fiscal_entry_id: parseNum(o, 'fiscal_entry_id', 'FiscalEntryID') || undefined,
    purchase_order_id: parseNum(o, 'purchase_order_id', 'PurchaseOrderID') || undefined,
    plano_contas_id: parseNum(o, 'plano_contas_id', 'PlanoContasID') || undefined,
    centro_custo_id: parseNum(o, 'centro_custo_id', 'CentroCustoID') || undefined,
    desconto: parseNum(o, 'desconto', 'Desconto'),
    juros: parseNum(o, 'juros', 'Juros'),
    multa: parseNum(o, 'multa', 'Multa'),
    parcela_numero: parseNum(o, 'parcela_numero', 'ParcelaNumero') || undefined,
    parcela_total: parseNum(o, 'parcela_total', 'ParcelaTotal') || undefined,
    forma_pagamento: parseStr(o, 'forma_pagamento', 'FormaPagamento') || undefined,
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
    cliente_id: parseNum(o, 'cliente_id', 'ClienteID') || undefined,
    data_emissao: parseStr(o, 'data_emissao', 'DataEmissao') || undefined,
    data_recebimento: parseStr(o, 'data_recebimento', 'DataRecebimento') || undefined,
    fiscal_exit_id: parseNum(o, 'fiscal_exit_id', 'FiscalExitID') || undefined,
    sales_order_id: parseNum(o, 'sales_order_id', 'SalesOrderID') || undefined,
    desconto: parseNum(o, 'desconto', 'Desconto'),
    juros: parseNum(o, 'juros', 'Juros'),
    multa: parseNum(o, 'multa', 'Multa'),
    parcela_numero: parseNum(o, 'parcela_numero', 'ParcelaNumero') || undefined,
    parcela_total: parseNum(o, 'parcela_total', 'ParcelaTotal') || undefined,
    forma_pagamento: parseStr(o, 'forma_pagamento', 'FormaPagamento') || undefined,
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

/**
 * Monta a query string do filtro. Campo vazio, nulo ou `false` fica FORA: mandar
 * `somente_vencidos=false` ou `status=` seria informar o filtro como "vazio", e o
 * backend distingue "não informado" de "informado vazio".
 */
function buildParams(f?: ListFilters): Record<string, string> | undefined {
  if (!f) return undefined;
  const p: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    p[k] = v === true ? '1' : String(v);
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

// ─── Conciliação bancária por OFX (VFIN0620) ────────────────────────────────

/** O que a importação do extrato devolve. */
export interface ImportacaoOFX {
  importados: number;
  duplicados: number;
  conciliados: number;
  /** Linhas descartadas por data ou valor ilegível — antes sumiam em silêncio. */
  ignorados: number;
  avisos?: string[];
  /** Identificação lida do próprio arquivo, para conferir a conta antes de conciliar. */
  banco_do_arquivo?: string;
  conta_do_arquivo?: string;
  periodo_inicio?: string;
  periodo_fim?: string;
}

/**
 * Importa um extrato OFX para a conta bancária e concilia o que casar.
 *
 * O arquivo vai como texto no corpo. O servidor RECUSA o que não for OFX — antes
 * aceitava qualquer coisa e respondia sucesso com zero lançamento, então importar
 * um JSON ou um PDF parecia dar certo e a pessoa concluía que o extrato do mês
 * estava vazio.
 */
export async function importarOFX(contaBancariaID: number, conteudo: string): Promise<ImportacaoOFX> {
  const { data } = await httpClient.post(`${BASE}/conciliacao/${contaBancariaID}/importar-ofx`, {
    ofx_content: conteudo,
  });
  const o = unwrapObject(data);
  return {
    importados: parseNum(o, 'importados', 'Importados'),
    duplicados: parseNum(o, 'duplicados', 'Duplicados'),
    conciliados: parseNum(o, 'conciliados', 'Conciliados'),
    ignorados: parseNum(o, 'ignorados', 'Ignorados'),
    avisos: unwrapArray(o['avisos'] ?? o['Avisos']).map(String),
    banco_do_arquivo: parseStr(o, 'banco_do_arquivo', 'BancoDoArquivo') || undefined,
    conta_do_arquivo: parseStr(o, 'conta_do_arquivo', 'ContaDoArquivo') || undefined,
    periodo_inicio: parseStr(o, 'periodo_inicio', 'PeriodoInicio') || undefined,
    periodo_fim: parseStr(o, 'periodo_fim', 'PeriodoFim') || undefined,
  };
}

/** O que a conferência do arquivo encontrou antes de enviar. */
export interface ConferenciaDoOFX {
  valido: boolean;
  /** Mensagem pronta para a tela quando não é OFX. */
  motivo?: string;
  lancamentos: number;
  banco?: string;
  conta?: string;
  periodo?: string;
}

/**
 * Confere se o arquivo escolhido é um extrato OFX, ANTES de enviar.
 *
 * A validação definitiva é do servidor — esta é a que dá resposta imediata e evita
 * subir um arquivo de megabytes para receber a recusa. A checagem é por ESTRUTURA,
 * não por extensão: um `.ofx` é só um nome, e um PDF renomeado passaria.
 */
export function conferirArquivoOFX(conteudo: string): ConferenciaDoOFX {
  const texto = conteudo.trim();
  if (!texto) {
    return { valido: false, lancamentos: 0, motivo: 'O arquivo está vazio.' };
  }
  const temRaiz = /<OFX>/i.test(texto);
  const temHeader = /OFXHEADER\s*[:=]/i.test(texto);
  if (!temRaiz && !temHeader) {
    return {
      valido: false, lancamentos: 0,
      motivo: `Este arquivo não é um extrato OFX: ${descreverArquivo(texto)}. `
        + 'No site do banco, baixe o extrato no formato OFX (Money / Open Financial Exchange).',
    };
  }
  const lancamentos = (texto.match(/<STMTTRN>/gi) ?? []).length;
  if (lancamentos === 0) {
    return {
      valido: false, lancamentos: 0,
      motivo: 'O arquivo é um OFX válido, mas não tem nenhum lançamento. '
        + 'Confira se o período escolhido no banco tem movimento.',
    };
  }
  // A identificação da conta vem do CABEÇALHO, antes do primeiro lançamento: uma
  // tag homônima dentro de um lançamento apontaria a conta errada no aviso.
  const cabecalho = texto.split(/<STMTTRN>/i)[0];
  const banco = /<BANKID>\s*([^<\s]+)/i.exec(cabecalho)?.[1];
  const conta = /<ACCTID>\s*([^<\s]+)/i.exec(cabecalho)?.[1];
  const inicio = /<DTSTART>\s*(\d{8})/i.exec(cabecalho)?.[1];
  const fim = /<DTEND>\s*(\d{8})/i.exec(cabecalho)?.[1];
  return {
    valido: true, lancamentos, banco, conta,
    periodo: inicio && fim ? `${dataOFX(inicio)} a ${dataOFX(fim)}` : undefined,
  };
}

function dataOFX(aaaammdd: string): string {
  return `${aaaammdd.slice(6, 8)}/${aaaammdd.slice(4, 6)}/${aaaammdd.slice(0, 4)}`;
}

/** Diz o que parece ter sido escolhido, para a recusa ajudar em vez de só barrar. */
function descreverArquivo(texto: string): string {
  if (texto.startsWith('{') || texto.startsWith('[')) return 'parece um arquivo JSON';
  if (texto.startsWith('%PDF')) return 'é um arquivo PDF';
  if (texto.startsWith('PK')) return 'é um ZIP, XLSX ou DOCX';
  if (texto.startsWith('<?xml')) return 'é um XML que não é OFX (nota fiscal, talvez)';
  if (texto.includes(';') || texto.includes(',')) return 'parece uma planilha ou CSV';
  return 'é um texto sem estrutura OFX';
}
