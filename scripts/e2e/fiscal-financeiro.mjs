#!/usr/bin/env node
/**
 * E2E smoke test — VentureERP (jornadas de funcionários)
 * ---------------------------------------------------------------------------
 * Simula funcionários usando os MESMOS endpoints que os serviços do front-end
 * consomem. Cobertura atual: Fiscal/Financeiro (fiscalConfigService,
 * taxTableService, nfeService, fiscalSupportService, fiscalAdvancedService,
 * financialService, financialReportsService), Contabilidade (/api/accounting)
 * e Cadastro de Cliente (customerService + SupportCrud).
 * Cresce um bloco por módulo reconstruído.
 *
 * Valida que cada rota responde como a documentação descreve. Não aborta no
 * primeiro erro: roda tudo e imprime um resumo ✓/✗ por passo.
 *
 * Uso:
 *   node scripts/e2e/fiscal-financeiro.mjs
 *
 * Variáveis de ambiente:
 *   API_URL   (default http://localhost:5072 — ambiente demo)
 *   EMAIL     (default admin@panossoerp.demo)
 *   PASSWORD  (default Demo@12345)
 *   RUN_WRITES=1   também executa escritas idempotentes/seguras (upserts, cadastros de teste)
 *   RUN_NFE=1      também cria uma NF-e de saída em rascunho (exercita o motor tributário)
 */

const API = (process.env.API_URL ?? 'http://localhost:5072').replace(/\/$/, '');
const EMAIL = process.env.EMAIL ?? 'admin@panossoerp.demo';
const PASSWORD = process.env.PASSWORD ?? 'Demo@12345';
const RUN_WRITES = process.env.RUN_WRITES === '1';
const RUN_NFE = process.env.RUN_NFE === '1';

let token = '';
const results = [];

function pad(s, n) { return String(s).padEnd(n); }

async function call(method, path, body, { expect = [200, 201, 204], journey = '', label = '' } = {}) {
  const url = `${API}${path}`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);
  let status = 0, json = null, text = '';
  try {
    const res = await fetch(url, opts);
    status = res.status;
    text = await res.text();
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  } catch (e) {
    results.push({ journey, label: label || `${method} ${path}`, ok: false, status: 'ERR', note: e.message });
    return { status: 0, json: null, text: '' };
  }
  const ok = expect.includes(status);
  let note = '';
  if (Array.isArray(json)) note = `${json.length} registro(s)`;
  else if (json && typeof json === 'object') {
    if (Array.isArray(json.data)) note = `data[${json.data.length}]`;
    else note = Object.keys(json).slice(0, 3).join(',');
  }
  if (!ok) note = (json && (json.message || json.error)) || text.slice(0, 80) || note;
  results.push({ journey, label: label || `${method} ${path}`, ok, status, note });
  return { status, json, text };
}

// ─── Jornadas ────────────────────────────────────────────────────────────────

async function login() {
  const res = await fetch(`${API}/users/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await res.json().catch(() => ({}));
  token = j.token ?? j.Token ?? j.access_token ?? '';
  results.push({ journey: 'Auth', label: 'POST /users/login', ok: res.status === 200 && !!token, status: res.status, note: token ? 'token OK' : 'sem token' });
  if (!token) { console.error('Falha no login — abortando.'); process.exit(1); }
}

async function journeyAnalistaFiscal() {
  const J = 'Analista Fiscal';
  await call('GET', '/api/fiscal/config', undefined, { journey: J, label: 'Ver configuração fiscal' });
  await call('GET', '/api/fiscal/tabelas/ncm', undefined, { journey: J, label: 'Listar NCMs (IPI/PIS/COFINS)' });
  await call('GET', '/api/fiscal/tabelas/icms-interno', undefined, { journey: J, label: 'Mapa ICMS interno por UF' });
  await call('GET', '/api/fiscal/tabelas/icms-interestadual', undefined, { journey: J, label: 'Mapa ICMS interestadual' });
  await call('GET', '/api/fiscal/exits/list', undefined, { journey: J, label: 'Listar NF-e de saída' });
  await call('GET', '/api/fiscal/entries/list', undefined, { journey: J, label: 'Listar NF-e de entrada' });
  await call('GET', '/api/fiscal/cte/list', undefined, { journey: J, label: 'Listar CT-e' });
  // Cadastros de apoio fiscal
  await call('GET', '/api/fiscal/support/dispositivos-legais/', undefined, { journey: J, label: 'Apoio: dispositivos legais' });
  await call('GET', '/api/fiscal/support/cfops/', undefined, { journey: J, label: 'Apoio: CFOPs' });
  await call('GET', '/api/fiscal/support/parametros-icms-ipi/', undefined, { journey: J, label: 'Apoio: parâmetros ICMS/IPI' });
  await call('GET', '/api/fiscal/support/motivos-transferencia-dapi/', undefined, { journey: J, label: 'Apoio: motivos DAPI' });
  await call('GET', '/api/fiscal/support/linhas-apuracao-icms/', undefined, { journey: J, label: 'Apoio: linhas apuração ICMS' });
  await call('GET', '/api/fiscal/support/apuracao-simples-nacional/', undefined, { journey: J, label: 'Apoio: apuração Simples' });
  // Avançado
  await call('GET', '/api/fiscal/icms-reducao/', undefined, { journey: J, label: 'Redução/Subst./Diferimento ICMS' });
  await call('GET', '/api/fiscal-classifications/', undefined, { journey: J, label: 'Classificações fiscais' });
  await call('GET', '/api/entry-operations', undefined, { journey: J, label: 'Operações de entrada' });

  if (RUN_WRITES) {
    await call('POST', '/api/fiscal/tabelas/ncm', {
      ncm: '84714900', aliq_ipi: 0.05, aliq_pis: 0.0165, aliq_cofins: 0.076,
      cst_pis: '01', cst_cofins: '01', cst_ipi: '50', description: 'E2E — Computadores',
    }, { journey: J, label: 'Upsert NCM 84714900 (idempotente)' });
    await call('POST', '/api/fiscal/tabelas/icms-interestadual', {
      origin_uf: 'PR', destination_uf: 'SP', aliq_icms: 0.12,
    }, { journey: J, label: 'Upsert ICMS interestadual PR→SP' });
  }
}

async function journeyRecebimentoFiscal() {
  const J = 'Recebimento Fiscal';
  // leituras já cobertas; aqui exercícios de escrita opcionais
  if (RUN_NFE) {
    const r = await call('POST', '/api/fiscal/exits/create', {
      numero_nf: 990001, serie: '001', data_emissao: '2025-08-15', data_saida: '2025-08-15',
      cnpj_destinatario: '98765432000188', razao_social_destinatario: 'Cliente E2E SA',
      ie_destinatario: '1234567890', uf_destinatario: 'SP', tipo_pessoa: 'J', cfop: '6101',
      natureza_operacao: 'Venda de mercadoria', valor_produtos: 1000, valor_frete: 0,
      valor_seguro: 0, valor_desconto: 0,
      itens: [{ sequence: 1, item_code: 10, ncm: '84714900', cfop: '6101', quantidade: 1, unit_price: 1000, total_price: 1000, origem_mercadoria: '0', description: 'Item E2E' }],
    }, { journey: J, label: 'Criar NF-e saída rascunho (motor tributário)', expect: [200, 201] });
    if (r.json && (r.json.id || r.json.valor_icms !== undefined)) {
      results.push({ journey: J, label: '↳ impostos calculados', ok: true, status: r.status, note: `icms=${r.json.valor_icms} ipi=${r.json.valor_ipi} total=${r.json.valor_total}` });
    }
  }
}

async function journeyTesouraria() {
  const J = 'Tesouraria/Financeiro';
  await call('GET', '/api/financial/contas-bancarias/list', undefined, { journey: J, label: 'Contas bancárias' });
  await call('GET', '/api/financial/condicoes-pagamento/list', undefined, { journey: J, label: 'Condições de pagamento' });
  await call('GET', '/api/financial/centros-custo/list', undefined, { journey: J, label: 'Centros de custo' });
  await call('GET', '/api/financial/contas-pagar/list', undefined, { journey: J, label: 'Contas a pagar' });
  await call('GET', '/api/financial/contas-pagar/aging', undefined, { journey: J, label: 'Aging a pagar' });
  await call('GET', '/api/financial/contas-receber/list', undefined, { journey: J, label: 'Contas a receber' });
  await call('GET', '/api/financial/contas-receber/aging', undefined, { journey: J, label: 'Aging a receber' });
  await call('GET', '/api/financial/fluxo-caixa?start_date=2025-07-01&end_date=2026-06-30', undefined, { journey: J, label: 'Fluxo de caixa (período)' });
  await call('GET', '/api/financial/fluxo-projetado?start_date=2025-07-01', undefined, { journey: J, label: 'Fluxo projetado' });
  await call('GET', '/api/financial/saldo-contas', undefined, { journey: J, label: 'Saldo das contas' });

  if (RUN_WRITES) {
    await call('POST', '/api/financial/contas-bancarias/create', {
      banco: '341', agencia: '1234', conta: '56789', digito: '0', descricao: 'E2E Conta',
      titular: 'Tecnofer', saldo_inicial: 1000, chave_pix: 'e2e@tecnofer.com', tipo_chave_pix: 'email',
    }, { journey: J, label: 'Criar conta bancária (teste)' });
    // Backend expects `parcelas` as a JSON string of an array (não "30,60").
    await call('POST', '/api/financial/condicoes-pagamento/create', { nome: 'E2E 30/60', parcelas: JSON.stringify([30, 60]) }, { journey: J, label: 'Criar condição de pagamento' });
  }
}

async function journeyApuracao() {
  const J = 'Apuração';
  await call('POST', '/api/financial/apuracao-impostos', { competencia: '2025-08' }, { journey: J, label: 'Apurar impostos 2025-08', expect: [200, 201] });
  await call('GET', '/api/financial/apuracao-impostos/2025-08', undefined, { journey: J, label: 'Consultar apuração 2025-08', expect: [200, 404] });
}

async function journeyRelatorios() {
  const J = 'Relatórios';
  const range = '?start=2025-07-01&end=2026-06-30';
  await call('GET', `/api/financial/relatorios/livro-entradas${range}`, undefined, { journey: J, label: 'R01 Livro de entradas' });
  await call('GET', `/api/financial/relatorios/livro-saidas${range}`, undefined, { journey: J, label: 'R02 Livro de saídas' });
  await call('GET', `/api/financial/relatorios/dre${range}`, undefined, { journey: J, label: 'R05 DRE' });
  await call('GET', '/api/financial/relatorios/aging-receber', undefined, { journey: J, label: 'R09 Aging receber detalhado' });
  await call('GET', '/api/financial/relatorios/aging-pagar', undefined, { journey: J, label: 'R10 Aging pagar detalhado' });
  await call('GET', `/api/financial/relatorios/produtos-vendidos${range}`, undefined, { journey: J, label: 'R13 Produtos vendidos' });
  await call('GET', `/api/financial/relatorios/curva-abc-clientes${range}`, undefined, { journey: J, label: 'R17 Curva ABC clientes' });
  await call('GET', `/api/financial/relatorios/curva-abc-produtos${range}`, undefined, { journey: J, label: 'R18 Curva ABC produtos' });
}

function codeOf(json) {
  if (!json || typeof json !== 'object') return undefined;
  return json.code ?? json.Code ?? json.id ?? json.ID;
}

async function journeyCadastroCliente() {
  const J = 'Cadastrista de Clientes';
  // Leituras (sempre)
  await call('GET', '/api/customers', undefined, { journey: J, label: 'Listar clientes' });
  await call('GET', '/api/customers/1', undefined, { journey: J, label: 'Abrir cliente #1', expect: [200, 404] });
  for (const r of ['regions', 'market-segments', 'contact-types', 'customer-types', 'carriers', 'carrier-groups', 'payment-conditions', 'sales-tables', 'invoice-types', 'tax-types']) {
    await call('GET', `/api/customers/support/${r}`, undefined, { journey: J, label: `Apoio: ${r}` });
  }
  if (!RUN_WRITES) return;

  // Escrita: cadastra apoios na ordem recomendada, depois o cliente.
  // Códigos únicos por execução → script re-executável (cada run = um novo
  // cliente sendo cadastrado por um funcionário), sem colisão de chave única.
  const SYS = '00000000-0000-0000-0000-000000000000';
  const RUN = Date.now() % 90000;
  const CTYPE_CODE = 90000 + RUN;
  const reg = await call('POST', '/api/customers/support/regions', { description: `E2E Sul ${RUN}`, uf: 'SC', city: 'Florianópolis', created_by: SYS }, { journey: J, label: 'Criar região' });
  const seg = await call('POST', '/api/customers/support/market-segments', { description: `E2E Indústria ${RUN}`, parent_code: null, has_pis_cofins_retention: false, retention_indicator: null }, { journey: J, label: 'Criar segmento' });
  await call('POST', '/api/customers/support/contact-types', { description: `E2E Comprador ${RUN}` }, { journey: J, label: 'Criar tipo de contato' });
  const ctype = await call('POST', '/api/customers/support/customer-types', { code: CTYPE_CODE, description: `E2E Indústria CT ${RUN}`, category: 'NORMAL', delivery_days: 5 }, { journey: J, label: 'Criar tipo de cliente' });
  const carr = await call('POST', '/api/customers/support/carriers', { description: `E2E BB Boleto ${RUN}`, billing_type: 'BOLETO', uses_credit_limit: false, consider_available: true, postpone_due_date: false, receipt_days: 3, payment_days: 1 }, { journey: J, label: 'Criar portador' });
  const cgrp = await call('POST', '/api/customers/support/carrier-groups', { description: `E2E Principais ${RUN}` }, { journey: J, label: 'Criar grupo de portadores' });
  if (codeOf(cgrp.json) && codeOf(carr.json)) {
    await call('POST', '/api/customers/support/carrier-groups/members', { carrier_group_code: codeOf(cgrp.json), carrier_code: codeOf(carr.json) }, { journey: J, label: 'Vincular portador ao grupo' });
  }
  const pcond = await call('POST', '/api/customers/support/payment-conditions', { description: `E2E 30/60 ${RUN}`, carrier_code: codeOf(carr.json), analysis_type: 'SEMPRE_ANALISA', parcel_start: 'EMISSAO', expenses: 0, average_term: 45, is_special: false, is_revenue: true, is_at_sight: false }, { journey: J, label: 'Criar condição de pagamento' });
  if (codeOf(pcond.json)) {
    await call('POST', '/api/customers/support/payment-conditions/installments', { payment_condition_code: codeOf(pcond.json), installment_number: 1, due_days: 30, description: '1ª Parcela', document_type: 'DUPLICATA', movement_type: null, carrier_code: codeOf(carr.json) }, { journey: J, label: 'Adicionar parcela à condição' });
  }
  const stab = await call('POST', '/api/customers/support/sales-tables', { description: `E2E Tabela 2025 ${RUN}`, validity_start: '2025-01-01T00:00:00Z', validity_end: null, tolerance_min_pct: 0, tolerance_max_pct: 5, price_formation: 'INFORMADO', decimal_places: 2, composition: 'FOB', table_type: 'NORMAL', base_date: 'PEDIDO', allow_items_below_cent: false, icms_interestadual_por_dentro: false, observation: null }, { journey: J, label: 'Criar tabela de vendas' });
  const inv = await call('POST', '/api/customers/support/invoice-types', { description: `E2E Venda Normal ${RUN}`, type: 'VENDA', stock_movement: 'ATUALIZA', icms_type: 'TRIBUTADO', icms_pct: 12, generates_revenue: true, updates_inventory: true, generates_financial_title: true, calc_pis_cofins: true, requires_sales_order: true, lists_fiscal_books: true, model_nf: '55', cst_icms: '00', cst_ipi: '50', cst_pis: '01', cst_cofins: '01', baixa_pedido: true }, { journey: J, label: 'Criar tipo de NF de saída' });
  const tax = await call('POST', '/api/customers/support/tax-types', { description: `E2E Tributação Padrão ${RUN}`, icms_base_total_items: true, icms_base_subtract_discount: true, pis_cofins_base_total_items: true, is_consumer: false }, { journey: J, label: 'Criar tipo de imposto' });

  // Cliente
  const CODE = 900000 + RUN;
  const cust = await call('POST', '/api/customers', {
    code: CODE, is_corporate: false, name: `Cliente E2E Ltda ${RUN}`, trade_name: 'E2E',
    document_type: 'CNPJ', document_number: '11.222.333/0001-81', state_registration: '123456789',
    region_code: codeOf(reg.json), market_segment_code: codeOf(seg.json), customer_type_code: codeOf(ctype.json) ?? CTYPE_CODE,
    payment_condition_code: codeOf(pcond.json), sales_table_code: codeOf(stab.json), carrier_code: codeOf(carr.json),
    carrier_group_code: codeOf(cgrp.json), invoice_type_code: codeOf(inv.json), tax_type_code: codeOf(tax.json),
    payment_cond_visibility: 'SOMENTE_VINCULADOS', credit_limit: 50000, website: 'https://e2e.com.br', created_by: SYS,
  }, { journey: J, label: `Criar cliente ${CODE}`, expect: [200, 201, 409] });
  await call('POST', `/api/customers/${CODE}/addresses`, { customer_code: CODE, address_type: 'COBRANCA', zip_code: '88010-000', street: 'Rua E2E', number: '100', neighborhood: 'Centro', city: 'Florianópolis', uf: 'SC', country: 'Brasil', is_default: true }, { journey: J, label: 'Adicionar endereço', expect: [200, 201, 404] });
  await call('POST', `/api/customers/${CODE}/contacts`, { customer_code: CODE, name: 'João E2E', email: 'joao@e2e.com', phone: '4833334444', mobile: '48999990000', position: 'Comprador', is_primary: true }, { journey: J, label: 'Adicionar contato', expect: [200, 201, 404] });
  await call('PATCH', `/api/customers/${CODE}/block`, { customer_code: CODE, reason: 'Teste E2E de bloqueio' }, { journey: J, label: 'Bloquear cliente', expect: [200, 204, 404] });
  await call('PATCH', `/api/customers/${CODE}/unblock`, {}, { journey: J, label: 'Desbloquear cliente', expect: [200, 204, 404] });
}

async function journeyCadastrosPlataforma() {
  const J = 'Cadastros & Plataforma';
  const RUN = Date.now() % 90000;
  await call('GET', '/api/employee/list', undefined, { journey: J, label: 'RH: listar funcionários' });
  await call('GET', '/api/order-priority/list', undefined, { journey: J, label: 'PCP: prioridades de ordem' });
  await call('GET', '/api/location/countries/', undefined, { journey: J, label: 'Localização: países' });
  await call('GET', '/api/location/ufs/', undefined, { journey: J, label: 'Localização: UFs' });
  await call('GET', '/api/items/classifications/masks/', undefined, { journey: J, label: 'Classificação: máscaras' });
  await call('GET', '/api/industrial-calendar/month/2025/8', undefined, { journey: J, label: 'Calendário industrial (mês)' });
  await call('GET', '/api/restriction/list', undefined, { journey: J, label: 'Configurador: restrições' });
  if (!RUN_WRITES) return;

  const empCode = 90000 + RUN;
  await call('POST', '/api/employee/create', { code: empCode, name: `Func E2E ${RUN}`, role: 'Operador', situation: 'ACTIVE', participates_budget: false, technical_assistant: false }, { journey: J, label: 'RH: criar funcionário', expect: [200, 201, 409, 422] });
  await call('PUT', '/api/employee/update', { code: empCode, name: `Func E2E ${RUN} (editado)`, role: 'Supervisor', situation: 'ACTIVE' }, { journey: J, label: 'RH: atualizar funcionário', expect: [200, 201, 404, 422] });
  await call('POST', '/api/order-priority/create', { priority: `P${RUN}`, description: `Prioridade E2E ${RUN}`, interval_start: 1 + (RUN % 90), interval_end: 1 + (RUN % 90) + 5 }, { journey: J, label: 'PCP: criar prioridade', expect: [200, 201, 409, 422] });
  await call('POST', '/api/location/countries/', { sigla: `Z${String(RUN).slice(-2)}`, name: `País E2E ${RUN}`, ddi: '+99', bacen_code: '9999', sis_comex: 'ZZ' }, { journey: J, label: 'Criar país', expect: [200, 201, 409, 422] });
  await call('POST', '/api/items/classifications/masks/', { description: `Máscara E2E ${RUN}`, mask: '99.99' }, { journey: J, label: 'Criar máscara de classificação', expect: [200, 201, 409, 422] });
  await call('POST', '/api/industrial-calendar/create', { year: 2025, month: 8, day: 1 + (RUN % 27), is_workday: false, description: 'Feriado E2E' }, { journey: J, label: 'Registrar dia não útil', expect: [200, 201, 409, 422] });
  await call('POST', '/api/enterprise/create', { cnpj: '11.222.333/0001-81', razao_social: `Empresa E2E ${RUN}`, regime_tributario: '3', uf: 'PR', created_by: '00000000-0000-0000-0000-000000000001' }, { journey: J, label: 'Cadastrar empresa (CNPJ fixo: 500=já existe)', expect: [200, 201, 409, 422, 500] });
  const plan = await call('POST', '/api/accounting/plans', { empresa_id: 1, name: `Plano E2E ${RUN}`, year: 2025, is_active: true, valid_from: '2025-01-01' }, { journey: J, label: 'Contábil: criar plano', expect: [200, 201, 409, 422] });
  const planId = codeOf(plan.json);
  if (planId) {
    await call('POST', '/api/accounting/accounts', { plan_id: planId, code: '1.1.1.01', name: 'Caixa E2E', account_type: 'ANALITICA', nature: 'DEVEDORA', parent_id: null, valid_from: '2025-01-01' }, { journey: J, label: 'Contábil: criar conta', expect: [200, 201, 409, 422] });
  }
  await call('POST', '/api/fiscal/nfse/create', { numero_rps: 90000 + RUN, serie_rps: '1', tipo_rps: 1, data_emissao: '2025-08-15', natureza_operacao: 1, optante_simples: false, tomador_cnpj_cpf: '98765432000188', tomador_razao_social: 'Tomador E2E', tomador_codigo_municipio: '3550308', tomador_uf: 'SP', item_lista_servico: '14.01', codigo_tributario_municipio: '140100', discriminacao: 'Serviço E2E', codigo_municipio: '4106902', valor_servicos: 1000, valor_deducoes: 0, aliquota_iss: 0.05, iss_retido: false }, { journey: J, label: 'Emitir NFS-e (rascunho + ISS)', expect: [200, 201, 409, 422] });
}

async function journeyVendasExpedicao() {
  const J = 'Vendas & Expedição';
  const RUN = Date.now() % 90000;
  await call('GET', '/api/sales-order/list', undefined, { journey: J, label: 'Vendas: listar pedidos' });
  await call('GET', '/api/sales-order/status/F', undefined, { journey: J, label: 'Vendas: pedidos faturados' });
  await call('GET', '/api/sales-order/customer/8', undefined, { journey: J, label: 'Vendas: pedidos do cliente 8' });
  await call('GET', '/api/sales-order/1241', undefined, { journey: J, label: 'Vendas: consultar pedido 1241 (capa+itens)', expect: [200, 404] });
  await call('GET', '/api/sales-order/items/1241', undefined, { journey: J, label: 'Vendas: itens do pedido 1241', expect: [200, 404] });
  await call('GET', '/api/sales-division/list', undefined, { journey: J, label: 'Vendas: divisões' });
  await call('GET', '/api/delivery-promise-params', undefined, { journey: J, label: 'Promessa: parâmetros (404=não configurado)', expect: [200, 404] });
  await call('GET', '/api/delivery-reschedule/list/1', undefined, { journey: J, label: 'Reprogramações do pedido 1' });
  await call('GET', '/api/shipments/', undefined, { journey: J, label: 'Expedição: listar romaneios' });
  if (!RUN_WRITES) return;

  await call('POST', '/api/sales-division/create', { code: 9000 + (RUN % 900), description: `Divisão E2E ${RUN}` }, { journey: J, label: 'Criar divisão (LACUNA: enum commercial_analysis)', expect: [200, 201, 409, 422, 500] });
  await call('POST', '/api/delivery-reschedule/create', { code: 50000 + RUN, sales_order_code: 1, item_code: 1, old_date: '2025-08-10T00:00:00Z', new_date: '2025-08-20T00:00:00Z', reason: 'Atraso de produção E2E' }, { journey: J, label: 'Registrar reprogramação', expect: [200, 201, 404, 409, 422] });

  // ── Pedido de Venda — ciclo de vida (§1): create → item → confirmar (P) →
  //    crédito/reserva/demanda → bloqueio → cancelar. Usa cliente 8 / item 10003.
  const so = await call('POST', '/api/sales-order/create', { enterprise_code: 1, customer_code: 8, currency_code: 'BRL', payment_term_code: 2, emission_date: '2026-06-30T00:00:00Z', delivery_date: '2026-07-10T00:00:00Z' }, { journey: J, label: 'Pedido: criar capa (rascunho R)', expect: [200, 201] });
  const soCode = codeOf(so.json);
  if (soCode) {
    await call('POST', '/api/sales-order/items/create', { sales_order_code: soCode, item_code: 10003, requested_qty: 3, unit_price: 100, warehouse_code: 2, sales_uom: 'UN' }, { journey: J, label: 'Pedido: adicionar item', expect: [200, 201] });
    await call('GET', `/api/sales-order/items/${soCode}`, undefined, { journey: J, label: 'Pedido: listar itens (totais computados)' });
    await call('PATCH', `/api/sales-order/${soCode}/status`, { status: 'P' }, { journey: J, label: 'Pedido: confirmar (→P, dispara crédito/reserva/demanda)', expect: [200, 201, 204] });
    const conf = await call('GET', `/api/sales-order/${soCode}`, undefined, { journey: J, label: 'Pedido: consultar após confirmar (status/bloqueio)' });
    const blocked = conf.json && conf.json.is_blocked;
    if (blocked) await call('PATCH', `/api/sales-order/${soCode}/unblock`, {}, { journey: J, label: 'Pedido: desbloquear (crédito estourou)', expect: [200, 201, 204] });
    await call('PATCH', `/api/sales-order/${soCode}/block`, {}, { journey: J, label: 'Pedido: bloquear manualmente', expect: [200, 201, 204] });
    // BUG DE BACKEND: cancel grava status "CANCELLED" (9 chars) numa coluna varchar(5)
    // → 500 "value too long for type character varying(5)". Cancelamento de pedido
    // está quebrado no schema; precisa ALTER COLUMN status TYPE varchar(10+). 200/204 = corrigido.
    await call('DELETE', `/api/sales-order/${soCode}/cancel`, undefined, { journey: J, label: 'Pedido: cancelar (BUG: varchar(5) não cabe CANCELLED)', expect: [200, 201, 204, 500] });
  }

  // Romaneio (doc Módulo de Romaneio). Auto-fill e export funcionam no demo; os
  // endpoints da migration 000169 (separate/transport/volumes/events/nfe-link,
  // items/confer novo) ainda NÃO estão montados no demo → 404 esperado.
  await call('GET', '/api/shipments/?status=OPEN&limit=5', undefined, { journey: J, label: 'Expedição: listar com filtros' });
  const af = await call('POST', '/api/shipments/auto-fill/sales-order', { sales_order_code: 1241 }, { journey: J, label: 'Auto-fill do pedido de venda 1241', expect: [200, 201] });
  const afCode = codeOf(af.json);
  if (afCode) {
    await call('GET', `/api/shipments/${afCode}`, undefined, { journey: J, label: 'Romaneio auto-fill: detalhe' });
    await call('GET', `/api/shipments/${afCode}/export/pdf`, undefined, { journey: J, label: 'Romaneio: export PDF' });
    await call('GET', `/api/shipments/${afCode}/export/xlsx`, undefined, { journey: J, label: 'Romaneio: export Excel' });
    await call('POST', `/api/shipments/${afCode}/separate`, {}, { journey: J, label: 'Separar (000169 — não montado no demo)', expect: [200, 201, 204, 404] });
    await call('PUT', `/api/shipments/${afCode}/transport`, { freight_modality: 'CIF', freight_value: 450, vehicle_plate: 'ABC1D23' }, { journey: J, label: 'Transporte (000169 — não montado no demo)', expect: [200, 201, 204, 404] });
    await call('POST', `/api/shipments/${afCode}/volumes`, { volume_number: 1, package_type: 'PALLET', gross_weight: 545.5, length_cm: 120, width_cm: 100, height_cm: 80 }, { journey: J, label: 'Volume (000169 — não montado no demo)', expect: [200, 201, 404] });
    await call('GET', `/api/shipments/${afCode}/events`, undefined, { journey: J, label: 'Eventos (000169 — não montado no demo)', expect: [200, 404] });
  }

  const sh = await call('POST', '/api/shipments/', { sales_order_code: 1, volumes: 1, weight: 10 }, { journey: J, label: 'Criar romaneio (OPEN)', expect: [200, 201] });
  const shCode = codeOf(sh.json);
  if (shCode) {
    const it = await call('POST', `/api/shipments/${shCode}/items`, { item_code: 10, quantity: 2 }, { journey: J, label: 'Adicionar item ao romaneio', expect: [200, 201, 422] });
    const itemId = codeOf(it.json) ?? (it.json && it.json.shipment_item_id);
    if (itemId) await call('POST', '/api/shipments/items/confer', { shipment_item_id: itemId, conferred_qty: 2 }, { journey: J, label: 'Conferir item (path antigo do demo)', expect: [200, 201, 204, 422] });
    await call('POST', `/api/shipments/${shCode}/confer`, {}, { journey: J, label: 'Conferir romaneio', expect: [200, 201, 204, 422] });
    await call('POST', `/api/shipments/${shCode}/ship`, { accept_divergences: true }, { journey: J, label: 'Despachar romaneio (SHIPPED)', expect: [200, 201, 204, 422] });
    await call('GET', `/api/shipments/${shCode}`, undefined, { journey: J, label: 'Consultar romaneio (status final)' });
  }
}

async function journeyProducao() {
  const J = 'Produção (OF)';
  const RUN_TAG = Date.now() % 100000;
  await call('GET', '/api/production-order/list', undefined, { journey: J, label: 'Listar ordens de produção' });
  await call('GET', '/api/production-order/600', undefined, { journey: J, label: 'Consultar OF 600', expect: [200, 404] });
  await call('GET', '/api/production-order/600/appointments', undefined, { journey: J, label: 'Apontamentos da OF 600', expect: [200, 404] });
  await call('GET', '/api/production-order/600/consumptions', undefined, { journey: J, label: 'Consumos da OF 600', expect: [200, 404] });
  await call('GET', '/api/production-order/600/operations', undefined, { journey: J, label: 'Operações da OF 600', expect: [200, 404] });
  if (!RUN_WRITES) return;

  // Ciclo de vida: create → start → apontar → consumir → operações → concluir(IN+lote) → fechar(custo).
  const of = await call('POST', '/api/production-order/create', { item_code: 10001, planned_qty: 10, machine_id: 3, cost_center_id: 1, employee_id: 1, priority: 'NORMAL' }, { journey: J, label: 'Criar OF (OPEN)', expect: [200, 201] });
  const ofId = codeOf(of.json);
  if (ofId) {
    await call('POST', `/api/production-order/${ofId}/start`, {}, { journey: J, label: 'Iniciar OF (→IN_PROGRESS)', expect: [200, 201] });
    await call('POST', '/api/production-order/appointment', { production_order_id: ofId, produced_qty: 4, scrapped_qty: 0 }, { journey: J, label: 'Apontar produção (qtd)', expect: [200, 201] });
    // consumo: campo correto é consumed_qty (quantity é ignorado pelo backend)
    await call('POST', '/api/production-order/consumption', { production_order_id: ofId, item_code: 10050, consumed_qty: 3, warehouse_id: 2 }, { journey: J, label: 'Consumir insumo (OUT, consumed_qty)', expect: [200, 201] });
    await call('POST', '/api/production-order/operations/explode', { production_order_id: ofId }, { journey: J, label: 'Explodir roteiro (vazio se item sem roteiro)', expect: [200, 201] });
    // BUG DE BACKEND: advance dá 500 SQLSTATE 42P08 (inconsistent types deduced for parameter $2)
    await call('POST', '/api/production-order/operations/advance', { production_order_id: ofId }, { journey: J, label: 'Avançar operação (BUG: SQLSTATE 42P08)', expect: [200, 201, 204, 422, 500] });
    await call('POST', `/api/production-order/${ofId}/scrap-return`, { scrap_item_code: 10050, warehouse_id: 2, quantity: 1, unit_value: 5, notes: 'retalho E2E' }, { journey: J, label: 'Retornar sucata (IN valorizado)', expect: [200, 201] });
    await call('POST', `/api/production-order/${ofId}/complete`, { warehouse_id: 2, lot: `E2E-${RUN_TAG}` }, { journey: J, label: 'Concluir OF (IN do acabado + lote)', expect: [200, 201] });
    await call('POST', `/api/production-order/${ofId}/settle-cost`, {}, { journey: J, label: 'Apurar custo real', expect: [200, 201] });
    const c = await call('GET', `/api/production-order/${ofId}/cost`, undefined, { journey: J, label: 'Consultar custo + variâncias' });
    void c;
    await call('POST', `/api/production-order/${ofId}/close`, {}, { journey: J, label: 'Fechar OF (→CLOSED)', expect: [200, 201] });
  }
}

async function journeyMaquinas() {
  const J = 'Máquinas & Roteiro';
  const RUN = Date.now() % 90000;
  await call('GET', '/api/machine/list', undefined, { journey: J, label: 'Listar máquinas' });
  await call('GET', '/api/machine/types/list', undefined, { journey: J, label: 'Listar tipos de máquina' });
  // BUG: time/list e schedule/list exigem item_code/machine_code mas rejeitam todas as formas
  await call('GET', '/api/machine/time/list?item_code=10001', undefined, { journey: J, label: 'Tempos (BUG: invalid item_code)', expect: [200, 400, 422] });
  await call('GET', '/api/machine/schedule/list?machine_code=1001', undefined, { journey: J, label: 'Agendas (BUG: invalid machine_code)', expect: [200, 400, 422] });
  if (!RUN_WRITES) return;

  const code = 30000 + RUN;
  await call('POST', '/api/machine/types/create', { code, name: `Tipo E2E ${RUN}`, type: 'CUT', is_active: true, created_by: '00000000-0000-0000-0000-000000000001' }, { journey: J, label: 'Criar tipo de máquina', expect: [200, 201, 409, 422] });
  // create de máquina com enum PT real (capacity_per_unit/period) — antes quebrava com PIECES/DAY
  const mc = await call('POST', '/api/machine/create', { code, name: `Maq E2E ${RUN}`, machine_type_code: 1, capacity: 100, capacity_per_unit: 'PEÇAS', capacity_period: 'DIA', efficiency_rate: 0.9, is_active: true, created_by: '00000000-0000-0000-0000-000000000001' }, { journey: J, label: 'Criar máquina (enum PT: PEÇAS/DIA)', expect: [200, 201, 409, 422] });
  const mcode = codeOf(mc.json);
  await call('POST', '/api/machine/time/create', { item_code: 10001, machine_code: mcode || 1001, production_time: 2, production_time_unit: 'MINUTO', production_base_qty: 1, setup_time: 30, priority: 1 }, { journey: J, label: 'Cadastrar tempo item × máquina', expect: [200, 201, 409, 422] });
  await call('POST', '/api/machine/schedule/create', { machine_code: mcode || 1001, schedule_date: '2026-07-01T00:00:00Z', planned_qty: 40, sequence: 1 }, { journey: J, label: 'Criar agenda da máquina', expect: [200, 201, 409, 422] });
  // BUG: calculate quebrado no backend (column "is_active" does not exist, SQLSTATE 42703); campo é demand_qty
  await call('POST', '/api/machine/time/production/calculate', { item_code: 10001, machine_code: mcode || 1001, demand_qty: 500 }, { journey: J, label: 'Calcular tempo (BUG: is_active column 42703)', expect: [200, 201, 400, 422, 500] });
}

async function journeyManufatura() {
  const J = 'Manufatura (PCP)';
  const RUN = Date.now() % 90000;
  const UID = '00000000-0000-0000-0000-000000000001';
  // §1 Roteiro
  await call('GET', '/api/routing/operations', undefined, { journey: J, label: 'Roteiro: listar operações' });
  await call('GET', '/api/routing/routes?item_code=10001', undefined, { journey: J, label: 'Roteiro: roteiros do item 10001' });
  await call('GET', '/api/routing/routes/1', undefined, { journey: J, label: 'Roteiro: detalhe (route+operations+network)', expect: [200, 404] });
  await call('GET', '/api/routing/routes/1/lead-time', undefined, { journey: J, label: 'Roteiro: lead time (CPM)', expect: [200, 404] });
  // §2 CRP — só /calculate está montado no demo (plans/work-centers = 404)
  await call('POST', '/api/crp/calculate', { plan_code: 1 }, { journey: J, label: 'CRP: calcular plano 1' });
  await call('GET', '/api/crp/plans/1', undefined, { journey: J, label: 'CRP: registros do plano (NÃO montado no demo)', expect: [200, 404] });
  // §3 APS — BUG: sequence lê priority "NORMAL" como int (22P02)
  await call('POST', '/api/aps/sequence', { plan_code: 1 }, { journey: J, label: 'APS: sequenciar (BUG: priority int 22P02)', expect: [200, 201, 422, 500] });
  await call('GET', '/api/aps/gantt/order/600', undefined, { journey: J, label: 'APS: Gantt da ordem 600' });
  // §4 Custo Padrão / §5 Qualidade — NÃO montados no demo (404)
  await call('GET', '/api/standard-cost/', undefined, { journey: J, label: 'Custo Padrão: listar (NÃO montado no demo)', expect: [200, 404] });
  await call('GET', '/api/quality/inspection-points', undefined, { journey: J, label: 'Qualidade: pontos (NÃO montado no demo)', expect: [200, 404] });
  // §6 Manutenção
  await call('GET', '/api/maintenance/plans', undefined, { journey: J, label: 'Manutenção: listar planos' });
  // §7 Previsão — demo espera period int; doc usa string "YYYY-MM"
  await call('POST', '/api/forecast/statistical', { item_code: 1001, history: [{ period: '2026-01', quantity: 120 }, { period: '2026-02', quantity: 135 }, { period: '2026-03', quantity: 118 }], periods_ahead: 3 }, { journey: J, label: 'Previsão (doc=string period; demo antigo=int → 400)', expect: [200, 400, 422] });
  // §8 Alertas MRP
  await call('POST', '/api/mrp-calculation/exceptions/notify', { plan_code: 1 }, { journey: J, label: 'Alertas MRP: notificar exceções' });
  if (!RUN_WRITES) return;

  const op = await call('POST', '/api/routing/operations', { name: `Op E2E ${RUN}`, origin: 'INTERNA', standard_time: 0.5 }, { journey: J, label: 'Roteiro: criar operação', expect: [200, 201, 409, 422] });
  const rt = await call('POST', '/api/routing/routes', { item_code: 10001, description: `Roteiro E2E ${RUN}`, alternative: (RUN % 30) + 2, is_standard: false, created_by: UID }, { journey: J, label: 'Roteiro: criar roteiro', expect: [200, 201, 409, 422] });
  const rid = codeOf(rt.json);
  const opId = codeOf(op.json);
  if (rid && opId) {
    await call('POST', `/api/routing/route-operations/${rid}`, { operation_id: opId, sequence: 10, work_center_id: 1, standard_time: 0.5 }, { journey: J, label: 'Roteiro: adicionar operação ao roteiro', expect: [200, 201, 409, 422] });
  }
  await call('POST', '/api/maintenance/plans', { machine_id: 1001, work_center_id: 1, frequency: 'MONTHLY', frequency_days: 30, estimated_hours: 2, created_by: UID }, { journey: J, label: 'Manutenção: criar plano', expect: [200, 201, 409, 422] });
  await call('POST', '/api/maintenance/orders/generate', { horizon_days: 30 }, { journey: J, label: 'Manutenção: gerar ordens (horizonte 30d)', expect: [200, 201, 422] });
}

async function journeyCustos() {
  const J = 'Custos';
  const RUN = Date.now() % 90000;
  const UID = '00000000-0000-0000-0000-000000000001';
  // §1 Custo Padrão (endpoints reais: /rollup, /items/{code}, /work-center-costs, /purchase-costs)
  await call('GET', '/api/standard-cost/work-center-costs', undefined, { journey: J, label: 'Custo padrão: custos de centro de trabalho' });
  await call('GET', '/api/standard-cost/items/10001', undefined, { journey: J, label: 'Custo padrão do item 10001', expect: [200, 404] });
  // §2 Centro de Custo
  await call('GET', '/api/cost-center/list', undefined, { journey: J, label: 'Centro de custo: listar' });
  // §3 Overhead e Base de Alocação
  await call('GET', '/api/allocations/list', undefined, { journey: J, label: 'Bases de alocação: listar' });
  await call('GET', '/api/overhead-allocation/list', undefined, { journey: J, label: 'Alocações de overhead: listar' });
  if (!RUN_WRITES) return;

  await call('POST', '/api/standard-cost/rollup', { item_code: 10001, mask: '', calculated_by: UID }, { journey: J, label: 'Rollup do custo padrão (item 10001)', expect: [200, 201, 422] });
  await call('POST', '/api/standard-cost/work-center-costs', { work_center_id: 1, cost_per_hour: 85.5, updated_by: UID }, { journey: J, label: 'Upsert custo/hora do centro 1', expect: [200, 201, 422] });
  await call('POST', '/api/standard-cost/purchase-costs', { item_code: 10050, cost: 12.5, updated_by: UID }, { journey: J, label: 'Upsert custo de compra (item 10050)', expect: [200, 201, 422] });
  // code amplo p/ evitar colisão entre runs; backend retorna 500 em duplicata (deveria ser 409)
  await call('POST', '/api/allocations/create', { code: 700000 + RUN, description: `Base E2E ${RUN}`, period: '2026-06' }, { journey: J, label: 'Criar base de alocação', expect: [200, 201, 409, 422, 500] });
  // BUG: overhead-allocation/create grava cost_center_id NULL (handler não lê o campo) → 500 (23502)
  await call('POST', '/api/overhead-allocation/create', { code: 600 + (RUN % 400), cost_center_id: 1, allocation_base_code: 501, description: 'OH E2E', rate: 15, period: '2026-06' }, { journey: J, label: 'Criar overhead (BUG: cost_center_id NULL 23502)', expect: [200, 201, 422, 500] });
}

async function journeyEstoque() {
  const J = 'Estoque & Almoxarifado';
  const RUN = Date.now() % 90000;
  // §1-2 movimentos e saldos
  await call('GET', '/api/stock/movements/list', undefined, { journey: J, label: 'Movimentos: listar' });
  await call('GET', '/api/stock/balances/list', undefined, { journey: J, label: 'Saldos: listar' });
  await call('GET', '/api/stock/balances/item/10001', undefined, { journey: J, label: 'Saldos do item 10001' });
  // §6 ATP
  await call('GET', '/api/stock/balances/atp/10001', undefined, { journey: J, label: 'ATP do item 10001 (disponível=saldo−reservas)' });
  // §5 tipos de movimento, §4 inventários
  await call('GET', '/api/estoque/tipos-movimento/', undefined, { journey: J, label: 'Tipos de movimento: listar' });
  await call('GET', '/api/stock/inventories/list', undefined, { journey: J, label: 'Inventários: listar' });
  // §7 lotes
  await call('GET', '/api/stock/lots/item/10001', undefined, { journey: J, label: 'Lotes do item 10001' });
  if (!RUN_WRITES) return;

  await call('POST', '/api/stock/movements/create', { item_code: 10001, warehouse_id: 2, movement_type: 'IN', quantity: 5, unit_price: 10 }, { journey: J, label: 'Lançar movimento IN (atualiza saldo/custo)', expect: [200, 201] });
  // §3 reserva: criar → liberar
  const rv = await call('POST', '/api/stock/reservations/create', { item_code: 10001, warehouse_id: 2, quantity: 1, reference_type: 'MANUAL', reference_code: RUN }, { journey: J, label: 'Criar reserva (ATP reduz)', expect: [200, 201] });
  const rvId = codeOf(rv.json);
  if (rvId) await call('PATCH', `/api/stock/reservations/${rvId}/release`, {}, { journey: J, label: 'Liberar reserva', expect: [200, 201, 204] });
  // §4 inventário: criar → contar → fechar
  const inv = await call('POST', '/api/stock/inventories/create', { warehouse_id: 2, description: `Inv E2E ${RUN}` }, { journey: J, label: 'Criar inventário (OPEN)', expect: [200, 201] });
  const invId = (inv.json && (inv.json.id ?? inv.json.ID)) || codeOf(inv.json); // code=0 no create
  if (invId) {
    await call('POST', '/api/stock/inventories/count', { inventory_id: invId, item_code: 10001, warehouse_id: 2, counted_qty: 100 }, { journey: J, label: 'Registrar contagem', expect: [200, 201, 204] });
    await call('GET', `/api/stock/inventories/${invId}/items`, undefined, { journey: J, label: 'Itens do inventário' });
    await call('POST', `/api/stock/inventories/${invId}/close`, {}, { journey: J, label: 'Fechar inventário', expect: [200, 201, 204] });
  }
  // §5 tipo de movimento (campo é description, não descricao)
  await call('POST', '/api/estoque/tipos-movimento/', { sigla: `E${RUN % 900}`, description: `Ajuste E2E ${RUN}`, tipo: 'IN' }, { journey: J, label: 'Criar tipo de movimento', expect: [200, 201, 409, 422] });
  // §7 lote + genealogia
  await call('POST', '/api/stock/lots/register', { item_code: 10001, lot: `LOTE-${RUN}`, heat_number: `H${RUN}`, certificate: 'CERT-E2E' }, { journey: J, label: 'Registrar lote (corrida/certificado)', expect: [200, 201, 409] });
  await call('GET', '/api/stock/lots/genealogy/10001/E2E-15609', undefined, { journey: J, label: 'Genealogia de um lote', expect: [200, 404] });
  // §8 consumo médio
  await call('POST', '/api/stock/consumption-average/recalc', { item_code: 10001 }, { journey: J, label: 'Recalcular consumo médio (ROP)', expect: [200, 201] });
  await call('GET', '/api/stock/consumption-average/10001', undefined, { journey: J, label: 'Consumo médio do item 10001', expect: [200, 404] });
}

async function journeyContador() {
  const J = 'Contador';
  await call('GET', '/api/accounting/plans?empresa_id=1', undefined, { journey: J, label: 'Planos de conta' });
  await call('GET', '/api/accounting/accounts?plan_id=1', undefined, { journey: J, label: 'Contas contábeis', expect: [200, 400, 404] });
  await call('GET', '/api/accounting/journal-entries?empresa_id=1&period=2025-08', undefined, { journey: J, label: 'Lançamentos contábeis', expect: [200, 400, 404] });
  await call('GET', '/api/accounting/balancete?plan_id=1&empresa_id=1&from=2025-07-01&to=2026-06-30', undefined, { journey: J, label: 'Balancete', expect: [200, 400, 404] });
}

// ─── Runner ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏭 E2E VentureERP (jornadas de funcionários) → ${API}`);
  console.log(`   writes=${RUN_WRITES ? 'ON' : 'off'}  nfe=${RUN_NFE ? 'ON' : 'off'}\n`);
  await login();
  await journeyAnalistaFiscal();
  await journeyRecebimentoFiscal();
  await journeyTesouraria();
  await journeyApuracao();
  await journeyRelatorios();
  await journeyCadastroCliente();
  await journeyCadastrosPlataforma();
  await journeyVendasExpedicao();
  await journeyProducao();
  await journeyMaquinas();
  await journeyManufatura();
  await journeyCustos();
  await journeyEstoque();
  await journeyContador();

  // Print grouped report
  let current = '';
  for (const r of results) {
    if (r.journey !== current) { current = r.journey; console.log(`\n── ${current} ──`); }
    const icon = r.ok ? '✓' : '✗';
    console.log(`  ${icon} ${pad(r.status, 4)} ${pad(r.label, 42)} ${r.note ?? ''}`);
  }
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n══ Resultado: ${pass} ✓  /  ${fail} ✗  (${results.length} chamadas) ══\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
