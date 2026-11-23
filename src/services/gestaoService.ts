import { httpClient, parseBool, parseNum, parseStr, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Rotinas de gestão da rodada de validação: painel de implantação, central de
 * pendências, indicadores, cobrança/conciliação, custo industrial, expedição
 * guiada, em poder de terceiros, assistente de conversão, promessa (CTP) e
 * modo simulação. Os valores decimais chegam do backend como texto: aqui viram
 * número só para exibir (nenhuma conta de dinheiro é refeita no front).
 */

const n = (o: Obj, k: string) => Number(parseStr(o, k) || 0);
const nOpt = (o: Obj, k: string) => { const s = parseStr(o, k); return s === '' ? undefined : Number(s); };
const arr = (o: Obj, k: string) => unwrapArray(o[k] ?? []).map(unwrapObject);

// ── Painel de implantação ────────────────────────────────────────────────────

export interface ItemImplantacao {
  key: string; area: string; title: string; screen: string; screen_name: string; how_to_fix: string;
  weight: number; pending: number; total: number; ready: boolean; percent: number;
}
export interface PainelImplantacao { percent: number; ready_count: number; total_count: number; items: ItemImplantacao[] }

export async function painelImplantacao(): Promise<PainelImplantacao> {
  const o = unwrapObject((await httpClient.get('/api/implantacao/painel')).data);
  return {
    percent: parseNum(o, 'percent'), ready_count: parseNum(o, 'ready_count'), total_count: parseNum(o, 'total_count'),
    items: arr(o, 'items').map((i) => ({
      key: parseStr(i, 'key'), area: parseStr(i, 'area'), title: parseStr(i, 'title'), screen: parseStr(i, 'screen'),
      screen_name: parseStr(i, 'screen_name'), how_to_fix: parseStr(i, 'how_to_fix'), weight: parseNum(i, 'weight'),
      pending: parseNum(i, 'pending'), total: parseNum(i, 'total'), ready: parseBool(i, 'ready'), percent: parseNum(i, 'percent'),
    })),
  };
}

// ── Central de pendências ────────────────────────────────────────────────────

export type Severidade = 'ALTA' | 'MEDIA' | 'BAIXA';
export interface Pendencia { key: string; area: string; title: string; screen: string; severity: Severidade; count: number; value?: number; oldest?: string }

export async function pendenciasDoDia(): Promise<Pendencia[]> {
  return unwrapArray((await httpClient.get('/api/pendencias/dia')).data).map(unwrapObject).map((p) => ({
    key: parseStr(p, 'key'), area: parseStr(p, 'area'), title: parseStr(p, 'title'), screen: parseStr(p, 'screen'),
    severity: (parseStr(p, 'severity') || 'MEDIA') as Severidade, count: parseNum(p, 'count'),
    value: nOpt(p, 'value'), oldest: parseStr(p, 'oldest') || undefined,
  }));
}

// ── Indicadores ──────────────────────────────────────────────────────────────

export interface Margem { code: number; name: string; revenue: number; cogs: number; margin: number; margin_pct: number }
export interface OEE {
  machine_id: number; code: number; name: string; worked_hours: number; available_hours: number; good_qty: number; scrap_qty: number;
  availability_pct: number; quality_pct: number; performance_pct?: number; oee_pct: number;
}
export interface Pontualidade { code: number; name: string; lines: number; on_time: number; on_time_pct: number; avg_delay_days: number }
export interface Indicadores {
  from: string; to: string; sales?: Margem; oee: OEE[];
  inventory_turnover?: { cogs: number; stock_value: number; annual_turnover: number; coverage_days: number };
  supplier_on_time: Pontualidade[]; delivery_promise?: Pontualidade;
}

const margem = (m: Obj): Margem => ({ code: parseNum(m, 'code'), name: parseStr(m, 'name'), revenue: n(m, 'revenue'), cogs: n(m, 'cogs'), margin: n(m, 'margin'), margin_pct: n(m, 'margin_pct') });
const pontual = (p: Obj): Pontualidade => ({ code: parseNum(p, 'code'), name: parseStr(p, 'name'), lines: parseNum(p, 'lines'), on_time: parseNum(p, 'on_time'), on_time_pct: n(p, 'on_time_pct'), avg_delay_days: n(p, 'avg_delay_days') });

export async function indicadores(de: string, ate: string): Promise<Indicadores> {
  const o = unwrapObject((await httpClient.get('/api/indicadores', { params: { de, ate } })).data);
  const giro = o.inventory_turnover ? unwrapObject(o.inventory_turnover) : null;
  return {
    from: parseStr(o, 'from'), to: parseStr(o, 'to'),
    sales: o.sales ? margem(unwrapObject(o.sales)) : undefined,
    oee: arr(o, 'oee').map((m) => ({
      machine_id: parseNum(m, 'machine_id'), code: parseNum(m, 'code'), name: parseStr(m, 'name'), worked_hours: n(m, 'worked_hours'),
      available_hours: n(m, 'available_hours'), good_qty: n(m, 'good_qty'), scrap_qty: n(m, 'scrap_qty'), availability_pct: n(m, 'availability_pct'),
      quality_pct: n(m, 'quality_pct'), performance_pct: nOpt(m, 'performance_pct'), oee_pct: n(m, 'oee_pct'),
    })),
    inventory_turnover: giro ? { cogs: n(giro, 'cogs'), stock_value: n(giro, 'stock_value'), annual_turnover: n(giro, 'annual_turnover'), coverage_days: n(giro, 'coverage_days') } : undefined,
    supplier_on_time: arr(o, 'supplier_on_time').map(pontual),
    delivery_promise: o.delivery_promise ? pontual(unwrapObject(o.delivery_promise)) : undefined,
  };
}

// ── Cobrança e conciliação ───────────────────────────────────────────────────

export interface ResultadoRetorno { settled: string[]; already_settled: string[]; not_found: string[]; failures: string[]; other_occurrences: number }
const lista = (o: Obj, k: string) => unwrapArray(o[k] ?? []).map(String);

export async function processarRetorno(contaBancariaId: number, content: string): Promise<ResultadoRetorno> {
  const o = unwrapObject((await httpClient.post('/api/financial/retorno-bancario', { conta_bancaria_id: contaBancariaId, content }, { timeout: 120000 })).data);
  return { settled: lista(o, 'settled'), already_settled: lista(o, 'already_settled'), not_found: lista(o, 'not_found'), failures: lista(o, 'failures'), other_occurrences: parseNum(o, 'other_occurrences') };
}

export interface CobrancaGerada { external_id: string; txid?: string; pix_copy_paste?: string; our_number?: string; digitable_line?: string; barcode?: string; expires_at?: string; pending: boolean }
export async function gerarCobranca(tituloId: number): Promise<CobrancaGerada> {
  const o = unwrapObject((await httpClient.post(`/api/financial/contas-receber/${tituloId}/pix`, {}, { timeout: 60000 })).data);
  return {
    external_id: parseStr(o, 'external_id'), txid: parseStr(o, 'txid') || undefined, pix_copy_paste: parseStr(o, 'pix_copy_paste') || undefined,
    our_number: parseStr(o, 'our_number') || undefined, digitable_line: parseStr(o, 'digitable_line') || undefined, barcode: parseStr(o, 'barcode') || undefined,
    expires_at: parseStr(o, 'expires_at') || undefined, pending: parseBool(o, 'pending'),
  };
}

export type CanalAviso = 'EMAIL' | 'WHATSAPP';
export async function enviarAvisoCobranca(tituloId: number, channel: CanalAviso, to: string[]): Promise<{ channel: string; to: string[] }> {
  const o = unwrapObject((await httpClient.post(`/api/financial/contas-receber/${tituloId}/aviso`, { channel, to: to.length ? to : undefined })).data);
  return { channel: parseStr(o, 'channel'), to: lista(o, 'to') };
}

export interface SemanaFluxo { week_start: string; receivable_titles: number; receivable_orders: number; payable_titles: number; payable_orders: number; net: number; cumulative: number }
export async function fluxoComPedidos(dias: number): Promise<SemanaFluxo[]> {
  return unwrapArray((await httpClient.get('/api/financial/fluxo-projetado-pedidos', { params: { dias } })).data).map(unwrapObject).map((s) => ({
    week_start: parseStr(s, 'week_start'), receivable_titles: n(s, 'receivable_titles'), receivable_orders: n(s, 'receivable_orders'),
    payable_titles: n(s, 'payable_titles'), payable_orders: n(s, 'payable_orders'), net: n(s, 'net'), cumulative: n(s, 'cumulative'),
  }));
}

export interface LinhaDRE { account_number: string; description: string; level: number; analytic: boolean; value: number; pct_of_revenue: number }
export interface DREGerencial { lines: LinhaDRE[]; revenue: number; result: number }
export async function dreGerencial(de: string, ate: string): Promise<DREGerencial> {
  const o = unwrapObject((await httpClient.get('/api/financial/dre-gerencial', { params: { de, ate } })).data);
  return {
    revenue: n(o, 'revenue'), result: n(o, 'result'),
    lines: arr(o, 'lines').map((l) => ({ account_number: parseStr(l, 'account_number'), description: parseStr(l, 'description'), level: parseNum(l, 'level'), analytic: parseBool(l, 'analytic'), value: n(l, 'value'), pct_of_revenue: n(l, 'pct_of_revenue') })),
  };
}

// ── Custo industrial ─────────────────────────────────────────────────────────

export interface VariacaoOF {
  production_order_id: number; order_number: number; item_code: string; item_name: string; produced_qty: number;
  standard_cost: number; actual_cost: number; material_variance: number; labor_variance: number; machine_variance: number;
  overhead_variance: number; subcontract_variance: number; total_variance: number; variance_pct: number; settled_at: string;
}
export interface Variacoes { orders: VariacaoOF[]; standard_cost: number; actual_cost: number; total_variance: number; unfavorable_variance: number; variance_pct: number }

export async function variacoesDeCusto(de: string, ate: string): Promise<Variacoes> {
  const o = unwrapObject((await httpClient.get('/api/standard-cost/variacoes', { params: { de, ate } })).data);
  return {
    standard_cost: n(o, 'standard_cost'), actual_cost: n(o, 'actual_cost'), total_variance: n(o, 'total_variance'), unfavorable_variance: n(o, 'unfavorable_variance'), variance_pct: n(o, 'variance_pct'),
    orders: arr(o, 'orders').map((v) => ({
      production_order_id: parseNum(v, 'production_order_id'), order_number: parseNum(v, 'order_number'), item_code: parseStr(v, 'item_code'), item_name: parseStr(v, 'item_name'),
      produced_qty: n(v, 'produced_qty'), standard_cost: n(v, 'standard_cost'), actual_cost: n(v, 'actual_cost'), material_variance: n(v, 'material_variance'),
      labor_variance: n(v, 'labor_variance'), machine_variance: n(v, 'machine_variance'), overhead_variance: n(v, 'overhead_variance'),
      subcontract_variance: n(v, 'subcontract_variance'), total_variance: n(v, 'total_variance'), variance_pct: n(v, 'variance_pct'), settled_at: parseStr(v, 'settled_at'),
    })),
  };
}

export interface LinhaMargem {
  line_code: number; item_code: string; item_name: string; quantity: number; revenue: number; standard_cost: number; actual_cost: number;
  invoiced_qty: number; standard_margin: number; actual_margin: number; standard_margin_pct: number; actual_margin_pct: number; warning?: string;
}
export interface MargemPedido {
  sales_order_code: number; lines: LinhaMargem[]; revenue: number; standard_cost: number; actual_cost: number;
  standard_margin: number; standard_margin_pct: number; actual_margin: number; actual_margin_pct: number;
}
export async function margemDoPedido(code: number): Promise<MargemPedido> {
  const o = unwrapObject((await httpClient.get(`/api/standard-cost/margem/pedido/${code}`)).data);
  return {
    sales_order_code: parseNum(o, 'sales_order_code'), revenue: n(o, 'revenue'), standard_cost: n(o, 'standard_cost'), actual_cost: n(o, 'actual_cost'),
    standard_margin: n(o, 'standard_margin'), standard_margin_pct: n(o, 'standard_margin_pct'), actual_margin: n(o, 'actual_margin'), actual_margin_pct: n(o, 'actual_margin_pct'),
    lines: arr(o, 'lines').map((l) => ({
      line_code: parseNum(l, 'line_code'), item_code: parseStr(l, 'item_code'), item_name: parseStr(l, 'item_name'), quantity: n(l, 'quantity'), revenue: n(l, 'revenue'),
      standard_cost: n(l, 'standard_cost'), actual_cost: n(l, 'actual_cost'), invoiced_qty: n(l, 'invoiced_qty'), standard_margin: n(l, 'standard_margin'),
      actual_margin: n(l, 'actual_margin'), standard_margin_pct: n(l, 'standard_margin_pct'), actual_margin_pct: n(l, 'actual_margin_pct'), warning: parseStr(l, 'warning') || undefined,
    })),
  };
}
export async function apurarTodosOsCustos(): Promise<{ calculated: number; failures: string[] }> {
  const o = unwrapObject((await httpClient.post('/api/standard-cost/rollup/todos', {}, { timeout: 300000 })).data);
  return { calculated: parseNum(o, 'calculated'), failures: lista(o, 'failures') };
}

// ── Expedição guiada ─────────────────────────────────────────────────────────

export interface Etapa { name: string; state: 'FEITA' | 'ATUAL' | 'PENDENTE'; at?: string }
export interface AcaoFluxo { code: string; description: string; method: string; path: string }
export interface RomaneioNoFluxo { code: number; status: string; nfe_id?: number; nfe_number?: number; nfe_status?: string; steps: Etapa[]; next_action?: AcaoFluxo }
export interface FluxoExpedicao { sales_order_code: number; pending_to_ship: number; in_open_shipments: number; shipments: RomaneioNoFluxo[]; next_action?: AcaoFluxo }

const acao = (v: unknown): AcaoFluxo | undefined => {
  if (!v) return undefined;
  const a = unwrapObject(v);
  return { code: parseStr(a, 'code'), description: parseStr(a, 'description'), method: parseStr(a, 'method'), path: parseStr(a, 'path') };
};

export async function fluxoDoPedido(code: number): Promise<FluxoExpedicao> {
  const o = unwrapObject((await httpClient.get(`/api/shipments/fluxo/pedido/${code}`)).data);
  return {
    sales_order_code: parseNum(o, 'sales_order_code'), pending_to_ship: n(o, 'pending_to_ship'), in_open_shipments: n(o, 'in_open_shipments'), next_action: acao(o.next_action),
    shipments: arr(o, 'shipments').map((s) => ({
      code: parseNum(s, 'code'), status: parseStr(s, 'status'), nfe_id: nOpt(s, 'nfe_id'), nfe_number: nOpt(s, 'nfe_number'), nfe_status: parseStr(s, 'nfe_status') || undefined,
      next_action: acao(s.next_action),
      steps: arr(s, 'steps').map((e) => ({ name: parseStr(e, 'name'), state: (parseStr(e, 'state') || 'PENDENTE') as Etapa['state'], at: parseStr(e, 'at') || undefined })),
    })),
  };
}

/** Executa a próxima ação que o backend indicou (caminho e método vêm dele). */
export async function executarAcaoDoFluxo(a: AcaoFluxo): Promise<void> {
  const caminho = a.path.startsWith('/') ? a.path : `/${a.path}`;
  await httpClient.request({ method: a.method || 'POST', url: caminho, data: {}, timeout: 120000 });
}

export interface OfertaFrete { carrier: string; carrier_document: string; service: string; delivery_days: number; estimated_date: string; price: number; expires_at?: string }
export async function cotarFreteOnline(romaneio: number): Promise<OfertaFrete[]> {
  return unwrapArray((await httpClient.post(`/api/shipments/${romaneio}/cotacao-online`, {}, { timeout: 60000 })).data).map(unwrapObject).map((f) => ({
    carrier: parseStr(f, 'carrier'), carrier_document: parseStr(f, 'carrier_document'), service: parseStr(f, 'service'), delivery_days: parseNum(f, 'delivery_days'),
    estimated_date: parseStr(f, 'estimated_date'), price: n(f, 'price'), expires_at: parseStr(f, 'expires_at') || undefined,
  }));
}
export interface EventoRastreio { at: string; status: string; place?: string }
export async function rastrearCarga(romaneio: number): Promise<EventoRastreio[]> {
  return unwrapArray((await httpClient.get(`/api/shipments/${romaneio}/rastreio`, { timeout: 60000 })).data).map(unwrapObject).map((e) => ({
    at: parseStr(e, 'at'), status: parseStr(e, 'status'), place: parseStr(e, 'place') || undefined,
  }));
}

// ── Em poder de terceiros ────────────────────────────────────────────────────

export interface EmPoder {
  supplier_code: number; supplier_name: string; service_order_id: number; service_order_code: number; production_order_id: number;
  item_code: number; item_business_code: string; item_name: string; remitted: number; returned: number; received: number; in_hands: number;
  value: number; first_remittance: string; due_date: string; days_in_hands: number; overdue: boolean;
  legal_deadline: string; legal_deadline_near: boolean; legal_deadline_passed: boolean;
}
// O domínio serializa com o nome do campo em Go (sem tag): aceita os dois.
const g = (o: Obj, snake: string, go: string) => parseStr(o, snake, go);
const gn = (o: Obj, snake: string, go: string) => Number(g(o, snake, go) || 0);

export async function emPoderDeTerceiros(filtro: { supplier_code?: number; only_overdue?: boolean } = {}): Promise<EmPoder[]> {
  const { data } = await httpClient.get('/api/third-party-services/em-poder', { params: { supplier_code: filtro.supplier_code, only_overdue: filtro.only_overdue ? 'true' : undefined } });
  return unwrapArray(data).map(unwrapObject).map((x) => ({
    supplier_code: gn(x, 'supplier_code', 'SupplierCode'), supplier_name: g(x, 'supplier_name', 'SupplierName'),
    service_order_id: gn(x, 'service_order_id', 'ServiceOrderID'), service_order_code: gn(x, 'service_order_code', 'ServiceOrderCode'),
    production_order_id: gn(x, 'production_order_id', 'ProductionOrderID'), item_code: gn(x, 'item_code', 'ItemCode'),
    item_business_code: g(x, 'item_business_code', 'ItemBusinessCode'), item_name: g(x, 'item_name', 'ItemName'),
    remitted: gn(x, 'remitted', 'Remitted'), returned: gn(x, 'returned', 'Returned'), received: gn(x, 'received', 'Received'), in_hands: gn(x, 'in_hands', 'InHands'),
    value: gn(x, 'value', 'Value'), first_remittance: g(x, 'first_remittance', 'FirstRemittance'), due_date: g(x, 'due_date', 'DueDate'),
    days_in_hands: gn(x, 'days_in_hands', 'DaysInHands'), overdue: parseBool(x, 'overdue', 'Overdue'), legal_deadline: g(x, 'legal_deadline', 'LegalDeadline'),
    legal_deadline_near: parseBool(x, 'legal_deadline_near', 'LegalDeadlineNear'), legal_deadline_passed: parseBool(x, 'legal_deadline_passed', 'LegalDeadlinePassed'),
  }));
}

export interface NFeRemessaDTO {
  quantity: string; unit_value?: string; data_emissao: string; serie?: string; natureza_operacao?: string;
  cst_icms?: string; cst_ipi?: string; cst_pis_cofins?: string; cbenef?: string; texto_legal?: string;
}
export async function gerarNFeRemessa(osId: number, dto: NFeRemessaDTO): Promise<{ id: number; numero_nf?: number }> {
  const o = unwrapObject((await httpClient.post(`/api/third-party-services/orders/${osId}/nfe-remessa`, dto)).data);
  return { id: parseNum(o, 'id'), numero_nf: parseNum(o, 'numero_nf') || undefined };
}

// ── Assistente de conversão ──────────────────────────────────────────────────

export type Formato = 'CHAPA' | 'BARRA_REDONDA' | 'BARRA_QUADRADA' | 'BARRA_SEXTAVADA' | 'TUBO_REDONDO' | 'TUBO_RETANGULAR' | 'KG_POR_METRO';
export interface MedidasDaPeca {
  item_code: string; shape: Formato; material?: string; density?: string; length_mm: string; width_mm?: string;
  thickness_mm?: string; diameter_mm?: string; side_mm?: string; kg_per_meter?: string;
}
export interface SugestaoConversao { from_uom: string; to_uom: string; factor: number; explanation: string; current_factor?: number; applied: boolean; warning?: string }
export interface ResultadoAssistente { item_code: string; weight_kg: number; formula: string; suggestions: SugestaoConversao[]; multiple_lot: number; multiple_lot_explanation: string; multiple_lot_applied: boolean }

const limpo = (m: MedidasDaPeca) => Object.fromEntries(Object.entries(m).filter(([, v]) => v !== '' && v !== undefined));
function resultado(raw: unknown): ResultadoAssistente {
  const o = unwrapObject(raw);
  return {
    item_code: parseStr(o, 'item_code'), weight_kg: n(o, 'weight_kg'), formula: parseStr(o, 'formula'), multiple_lot: n(o, 'multiple_lot'),
    multiple_lot_explanation: parseStr(o, 'multiple_lot_explanation'), multiple_lot_applied: parseBool(o, 'multiple_lot_applied'),
    suggestions: arr(o, 'suggestions').map((s) => ({
      from_uom: parseStr(s, 'from_uom'), to_uom: parseStr(s, 'to_uom'), factor: n(s, 'factor'), explanation: parseStr(s, 'explanation'),
      current_factor: nOpt(s, 'current_factor'), applied: parseBool(s, 'applied'), warning: parseStr(s, 'warning') || undefined,
    })),
  };
}
export async function simularConversao(m: MedidasDaPeca): Promise<ResultadoAssistente> {
  return resultado((await httpClient.post('/api/item-conversions/assistente', limpo(m))).data);
}
export async function aplicarConversao(m: MedidasDaPeca, apply: string[], applyMultipleLot: boolean): Promise<ResultadoAssistente> {
  return resultado((await httpClient.post('/api/item-conversions/assistente/aplicar', { ...limpo(m), apply, apply_multiple_lot: applyMultipleLot })).data);
}

// ── Promessa de entrega (CTP) ────────────────────────────────────────────────

export interface Promessa { item_code: string; quantity: number; promised_date: string; source: string; explanation: string[]; components: Promessa[] }
function promessa(raw: unknown): Promessa {
  const p = unwrapObject(raw);
  return {
    item_code: parseStr(p, 'item_code'), quantity: n(p, 'quantity'), promised_date: parseStr(p, 'promised_date'), source: parseStr(p, 'source'),
    explanation: unwrapArray(p.explanation ?? []).map(String), components: unwrapArray(p.components ?? []).map(promessa),
  };
}
export async function simularPromessa(lines: { item_code: string; quantity: string }[]): Promise<Promessa[]> {
  return unwrapArray((await httpClient.post('/api/delivery-promise/simular', { lines }, { timeout: 60000 })).data).map(promessa);
}

// ── Repetir pedido ───────────────────────────────────────────────────────────

export async function repetirPedido(code: number): Promise<{ code: number; lines: number; skipped: string[] }> {
  const o = unwrapObject((await httpClient.post(`/api/sales-order/${code}/repetir`, {})).data);
  const pedido = unwrapObject(o.sales_order ?? {});
  return { code: parseNum(pedido, 'code'), lines: parseNum(o, 'lines'), skipped: lista(o, 'skipped') };
}

// ── Modo simulação (banco de treino) ─────────────────────────────────────────

export interface StatusSimulacao { state: string; progress: number; message?: string; requested_at?: string; finished_at?: string; training_url?: string }
const status = (raw: unknown): StatusSimulacao => {
  const o = unwrapObject(raw);
  return { state: parseStr(o, 'state') || 'idle', progress: parseNum(o, 'progress'), message: parseStr(o, 'message') || undefined, requested_at: parseStr(o, 'requested_at') || undefined, finished_at: parseStr(o, 'finished_at') || undefined, training_url: parseStr(o, 'training_url') || undefined };
};
export async function statusSimulacao(): Promise<StatusSimulacao> { return status((await httpClient.get('/api/system/simulacao/status')).data); }
export async function pedirSimulacao(): Promise<StatusSimulacao> { return status((await httpClient.post('/api/system/simulacao', {})).data); }

// ── Integrações (o que está ligado) ──────────────────────────────────────────

export interface StatusIntegracoes { bank: boolean; whatsapp: boolean; freight: boolean; portal: boolean; bank_webhook_ready: boolean; training: boolean }
export async function statusIntegracoes(): Promise<StatusIntegracoes> {
  const o = unwrapObject((await httpClient.get('/api/integracoes/status')).data);
  return { bank: parseBool(o, 'bank'), whatsapp: parseBool(o, 'whatsapp'), freight: parseBool(o, 'freight'), portal: parseBool(o, 'portal'), bank_webhook_ready: parseBool(o, 'bank_webhook_ready'), training: parseBool(o, 'training') };
}
export async function registrarWebhookInter(baseUrl: string): Promise<string> {
  const o = unwrapObject((await httpClient.post('/api/integracoes/inter/webhook-registrar', { base_url: baseUrl })).data);
  return parseStr(o, 'registered');
}

// ── Portal do cliente: links (tela do cliente) ───────────────────────────────

export interface LinkPortal {
  id: number; customer_code: number; description?: string; expires_at: string; revoked_at?: string; last_access_at?: string;
  access_count: number; created_at: string; token?: string; url?: string;
}
const link = (o: Obj): LinkPortal => ({
  id: parseNum(o, 'id'), customer_code: parseNum(o, 'customer_code'), description: parseStr(o, 'description') || undefined, expires_at: parseStr(o, 'expires_at'),
  revoked_at: parseStr(o, 'revoked_at') || undefined, last_access_at: parseStr(o, 'last_access_at') || undefined, access_count: parseNum(o, 'access_count'),
  created_at: parseStr(o, 'created_at'), token: parseStr(o, 'token') || undefined, url: parseStr(o, 'url') || undefined,
});
export async function criarLinkPortal(cliente: number, dias: number, descricao: string): Promise<LinkPortal> {
  return link(unwrapObject((await httpClient.post(`/api/customers/${cliente}/portal-links`, { days: dias, description: descricao })).data));
}
export async function listarLinksPortal(cliente: number): Promise<LinkPortal[]> {
  return unwrapArray((await httpClient.get(`/api/customers/${cliente}/portal-links`)).data).map(unwrapObject).map(link);
}
export async function revogarLinkPortal(id: number): Promise<void> {
  await httpClient.delete(`/api/customers/portal-links/${id}`);
}
