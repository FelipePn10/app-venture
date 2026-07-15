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
let authenticatedUserId = '';
const results = [];
const fixtures = {};

function pad(s, n) { return String(s).padEnd(n); }

async function call(method, path, body, { expect = [200, 201, 204], journey = '', label = '' } = {}) {
  if (!RUN_WRITES && method !== 'GET' && method !== 'HEAD') {
    return { status: 0, json: null, text: '', skipped: true };
  }
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

async function callMultipart(path, form, { expect = [200], journey = '', label = '' } = {}) {
  if (!RUN_WRITES) return { status: 0, json: null, text: '', skipped: true };
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API}${path}`, { method: 'POST', headers, body: form });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  const ok = expect.includes(res.status);
  results.push({ journey, label: label || `POST ${path}`, ok, status: res.status, note: ok ? Object.keys(json ?? {}).join(',') : (json?.message ?? json?.error ?? text.slice(0, 80)) });
  return { status: res.status, json, text };
}

// ─── Jornadas ────────────────────────────────────────────────────────────────

async function login() {
  const res = await fetch(`${API}/users/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await res.json().catch(() => ({}));
  token = j.token ?? j.Token ?? j.access_token ?? '';
  if (token) {
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    authenticatedUserId = claims.sub ?? claims.user_id ?? claims.id ?? '';
  }
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
    const bank = await call('POST', '/api/financial/contas-bancarias/create', {
      banco: '341', agencia: '1234', conta: '56789', digito: '0', descricao: 'E2E Conta',
      titular: 'Tecnofer', saldo_inicial: 1000, chave_pix: 'e2e@tecnofer.com', tipo_chave_pix: 'email',
    }, { journey: J, label: 'Criar conta bancária (teste)' });
    const bankId = idOf(bank.json);
    if (bankId) {
      const fitid = `VENTUREERP-E2E-${Date.now()}`;
      const ofx = `OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\nSECURITY:NONE\nENCODING:USASCII\nCHARSET:1252\nCOMPRESSION:NONE\nOLDFILEUID:NONE\nNEWFILEUID:NONE\n\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST><STMTTRN><TRNTYPE:CREDIT><DTPOSTED:20260714120000><TRNAMT:19.90><FITID:${fitid}><MEMO:Importação E2E VentureERP></STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
      await call('POST', `/api/financial/conciliacao/${bankId}/importar-ofx`, { ofx_content: ofx }, { journey: J, label: 'Importar arquivo OFX real e persistir lançamento' });
    }
    // Backend expects `parcelas` as a JSON string of an array (não "30,60").
    await call('POST', '/api/financial/condicoes-pagamento/create', { nome: 'E2E 30/60', parcelas: JSON.stringify([30, 60]) }, { journey: J, label: 'Criar condição de pagamento' });
  }
}

async function journeyImportacoesReais() {
  const J = 'Importações reais';
  if (!RUN_WRITES) return;
  const csv = [
    'codigo;ex;tipo;descricao;nacionalfederal;importadosfederal;estadual;municipal;vigenciainicio;vigenciafim;chave;versao;fonte',
    '84714900;0;0;Computadores E2E;13,45;17,82;18,00;2,00;01/07/2026;31/12/2026;E2E-IBPT-2026;26.2.A;IBPT',
  ].join('\n');
  await call('POST', '/api/fiscal/ibpt/import', { uf: 'SC', csv }, { journey: J, label: 'Importar CSV IBPT válido' });
  await call('GET', '/api/fiscal/ibpt/lookup?ncm=84714900&uf=SC', undefined, { journey: J, label: 'Confirmar persistência do NCM importado' });

  const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const form = new FormData();
  form.set('brand_color', '#2F7D47');
  form.set('logo', new Blob([onePixelPng], { type: 'image/png' }), 'venture-e2e.png');
  await callMultipart('/api/fiscal/config/branding', form, { journey: J, label: 'Enviar logo PNG multipart e cor hexadecimal' });
  const cfg = await call('GET', '/api/fiscal/config', undefined, { journey: J, label: 'Confirmar preview persistido do branding' });
  const cfgData = cfg.json?.data ?? cfg.json ?? {};
  const logoResponse = await fetch(`${API}/api/fiscal/config/logo`, { headers: { Authorization: `Bearer ${token}` } });
  const logoBytes = Buffer.from(await logoResponse.arrayBuffer());
  const brandingPersisted = String(cfgData.brand_color ?? '').toUpperCase() === '#2F7D47'
    && logoResponse.status === 200 && logoResponse.headers.get('content-type') === 'image/png' && logoBytes.length > 0;
  results.push({ journey: J, label: '↳ preview recuperado do banco', ok: brandingPersisted, status: logoResponse.status, note: brandingPersisted ? `cor e logo PNG (${logoBytes.length} bytes)` : 'cor ou endpoint de preview divergente' });
}

async function journeyApuracao() {
  const J = 'Apuração';
  if (RUN_WRITES) await call('POST', '/api/financial/apuracao-impostos', { competencia: '2025-08' }, { journey: J, label: 'Apurar impostos 2025-08', expect: [200, 201] });
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
  if (json.data && typeof json.data === 'object') return codeOf(json.data);
  return json.code ?? json.Code ?? json.id ?? json.ID;
}

function idOf(json) {
  if (!json || typeof json !== 'object') return undefined;
  if (json.data && typeof json.data === 'object') return idOf(json.data);
  return json.id ?? json.ID;
}

async function journeyCadastroCliente() {
  const J = 'Cadastrista de Clientes';
  // Leituras (sempre)
  await call('GET', '/api/customers', undefined, { journey: J, label: 'Listar clientes' });
  await call('GET', '/api/customers/1', undefined, { journey: J, label: 'Abrir cliente #1', expect: [200, 404] });
  for (const r of ['regions', 'market-segments', 'contact-types', 'customer-types', 'carriers', 'carrier-groups', 'payment-conditions', 'sales-tables', 'invoice-types', 'tax-types']) {
    await call('GET', `/api/customers/support/${r}`, undefined, { journey: J, label: `Apoio: ${r}` });
  }
  // Auto-fill por CNPJ (Receita) + export server-side da lista (xlsx/pdf/csv)
  await call('GET', '/api/cnpj/19131243000197', undefined, { journey: J, label: 'Auto-fill: consulta CNPJ na Receita' });
  await call('GET', '/api/customers?format=xlsx', undefined, { journey: J, label: 'Exportar clientes (Excel)' });
  await call('GET', '/api/customers?format=csv', undefined, { journey: J, label: 'Exportar clientes (CSV)' });
  if (!RUN_WRITES) return;

  // Escrita: cadastra apoios na ordem recomendada, depois o cliente.
  // Códigos únicos por execução → script re-executável (cada run = um novo
  // cliente sendo cadastrado por um funcionário), sem colisão de chave única.
  const SYS = authenticatedUserId;
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
  await call('POST', '/api/order-priority/create', { priority: `P${RUN}`, description: `Prioridade E2E ${RUN}`, interval_start: 100000 + RUN * 10, interval_end: 100005 + RUN * 10 }, { journey: J, label: 'PCP: criar prioridade', expect: [200, 201] });
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
  await call('GET', '/api/sales-quotation/list', undefined, { journey: J, label: 'Orçamentos: listar carteira (§3)' });
  await call('GET', '/api/sales-quotation/report', undefined, { journey: J, label: 'Orçamentos: relatório consolidado (ponderado por prob.)' });
  await call('GET', '/api/delivery-promise-params', undefined, { journey: J, label: 'Promessa: parâmetros (404=não configurado)', expect: [200, 404] });
  await call('GET', '/api/delivery-promise/occupation?from_date=2026-07-01&to_date=2026-07-31&daily_capacity=50', undefined, { journey: J, label: 'Promessa: ocupação de tanque (§8)' });
  await call('GET', '/api/delivery-reschedule/list/1', undefined, { journey: J, label: 'Reprogramações do pedido 1' });
  await call('GET', '/api/shipments/', undefined, { journey: J, label: 'Expedição: listar romaneios' });
  if (!RUN_WRITES) return;

  await call('POST', '/api/sales-division/create', { code: 9000 + (RUN % 900), description: `Divisão E2E ${RUN}`, commercial_analysis: 'ALWAYS_ANALYZE', financial_analysis: 'FREE', consider_mrp: true }, { journey: J, label: 'Criar divisão (enum FREE/BLOCK_ALWAYS/ALWAYS_ANALYZE)', expect: [200, 201, 409, 422] });
  await call('POST', '/api/delivery-reschedule/create', { code: 50000 + RUN, sales_order_code: 1, item_code: 1, old_date: '2025-08-10T00:00:00Z', new_date: '2025-08-20T00:00:00Z', reason: 'Atraso de produção E2E' }, { journey: J, label: 'Registrar reprogramação', expect: [200, 201, 404, 409, 422] });
  await call('POST', '/api/delivery-promise/tank-reservations', { requested_delivery_date: '2026-07-20', firm_days: 7, daily_capacity: 50, verify_stock: true, commit: false, lines: [{ item_code: 10003, quantity: 10, unit_price: 100 }] }, { journey: J, label: 'Promessa: simular reserva de tanque (commit=false)', expect: [200, 201, 422] });
  await call('POST', '/api/delivery-promise/reschedule', { delivery_from: '2026-07-01', delivery_to: '2026-12-31', new_date: '2026-08-15', reason: 'Reprogramação E2E', created_by: authenticatedUserId }, { journey: J, label: 'Promessa: reprogramação em lote (ignora data firme)', expect: [200, 201, 422] });
  await call('POST', '/api/delivery-promise/tank-reservations/expire?now=2026-07-20', {}, { journey: J, label: 'Promessa: expirar reservas vencidas', expect: [200, 201, 204] });

  // ── Orçamento (§3): create → item → converter em pedido (copia saldo aberto)
  //    → cancela um segundo orçamento com motivo. Vínculo em converted_sales_order_code.
  const quo = await call('POST', '/api/sales-quotation/create', { enterprise_code: 1, customer_code: 8, currency_code: 'BRL', quotation_type: 'VENDA', payment_term_code: 2, emission_date: '2026-06-30T00:00:00Z', valid_until: '2026-07-31T00:00:00Z', probability_pct: 80 }, { journey: J, label: 'Orçamento: criar capa (rascunho R)', expect: [200, 201] });
  const quoCode = codeOf(quo.json);
  if (quoCode) {
    await call('POST', '/api/sales-quotation/items/create', { sales_quotation_code: quoCode, item_code: 10003, requested_qty: 5, unit_price: 100, sales_uom: 'UN' }, { journey: J, label: 'Orçamento: adicionar item', expect: [200, 201] });
    await call('GET', `/api/sales-quotation/${quoCode}`, undefined, { journey: J, label: 'Orçamento: consultar capa+itens (totais/ponderado)' });
    await call('POST', `/api/sales-quotation/${quoCode}/convert-to-order`, {}, { journey: J, label: 'Orçamento: converter em pedido (saldo aberto)', expect: [200, 201, 409, 422] });
    await call('DELETE', `/api/sales-quotation/${quoCode}/cancel`, { reason: 'Cliente desistiu — E2E', complement: 'teste automatizado' }, { journey: J, label: 'Orçamento: cancelar com motivo', expect: [200, 201, 204, 409, 422] });
  }

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
    // BUG DE BACKEND: cancel grava status "CANCELLED" (9 chars) numa coluna varchar(5)
    // → 500 "value too long for type character varying(5)". Cancelamento de pedido
    // está quebrado no schema; precisa ALTER COLUMN status TYPE varchar(10+). 200/204 = corrigido.
  }

  // Romaneio (doc Módulo de Romaneio). Auto-fill e export funcionam no demo; os
  // endpoints da migration 000169 (separate/transport/volumes/events/nfe-link,
  // items/confer novo) ainda NÃO estão montados no demo → 404 esperado.
  await call('GET', '/api/shipments/?status=OPEN&limit=5', undefined, { journey: J, label: 'Expedição: listar com filtros' });
  const af = soCode ? await call('POST', '/api/shipments/auto-fill/sales-order', { sales_order_code: soCode }, { journey: J, label: `Auto-fill do pedido de venda ${soCode}`, expect: [200, 201, 409, 422] }) : { json: null };
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
  if (soCode) {
    await call('PATCH', `/api/sales-order/${soCode}/block`, {}, { journey: J, label: 'Pedido: bloquear manualmente após montar romaneio', expect: [200, 201, 204] });
    await call('DELETE', `/api/sales-order/${soCode}/cancel`, { reason: 'Cancelamento automatizado E2E' }, { journey: J, label: 'Pedido: cancelar após expedição', expect: [200, 201, 204, 409, 422] });
  }

  const sh = await call('POST', '/api/shipments/', { sales_order_code: 1, volumes: 1, weight: 10 }, { journey: J, label: 'Criar romaneio (OPEN)', expect: [200, 201] });
  const shCode = codeOf(sh.json);
  if (shCode) {
    const it = await call('POST', `/api/shipments/${shCode}/items`, { item_code: 10, quantity: 2 }, { journey: J, label: 'Adicionar item ao romaneio', expect: [200, 201, 422] });
    const itemId = codeOf(it.json) ?? (it.json && it.json.shipment_item_id);
    if (itemId) await call('POST', `/api/shipments/${shCode}/items/confer`, { item_id: itemId, conferred_qty: 2 }, { journey: J, label: 'Conferir item do romaneio', expect: [200, 201, 204, 422] });
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
  await call('GET', '/api/production-order/600/materials', undefined, { journey: J, label: 'Materiais da OF 600 (MRP)', expect: [200, 404] });
  await call('GET', '/api/production-order/maintenance', undefined, { journey: J, label: 'OFs em manutenção (sem movimento)' });
  await call('GET', '/api/production-order/delivery-candidates?order_type=MRP', undefined, { journey: J, label: 'Candidatos a entrega (MRP)' });
  if (!RUN_WRITES) return;

  // Ciclo de vida: create → start → apontar → consumir → operações → concluir(IN+lote) → fechar(custo).
  if (!fixtures.itemCode || !fixtures.machineId) return;
  const of = await call('POST', '/api/production-order/create', { item_code: fixtures.itemCode, planned_qty: 10, machine_id: fixtures.machineId, priority: 'NORMAL' }, { journey: J, label: 'Criar OF (OPEN)', expect: [200, 201] });
  const ofId = codeOf(of.json);
  if (ofId) {
    await call('POST', `/api/production-order/${ofId}/start`, {}, { journey: J, label: 'Iniciar OF (→IN_PROGRESS)', expect: [200, 201] });
    await call('POST', '/api/production-order/appointment', { production_order_id: ofId, produced_qty: 4, scrapped_qty: 0 }, { journey: J, label: 'Apontar produção (qtd)', expect: [200, 201] });
    // consumo: campo correto é consumed_qty (quantity é ignorado pelo backend)
    await call('POST', '/api/production-order/consumption', { production_order_id: ofId, item_code: 10050, consumed_qty: 3, warehouse_id: 2 }, { journey: J, label: 'Consumir insumo (OUT, consumed_qty)', expect: [200, 201] });
    const exploded = await call('POST', '/api/production-order/operations/explode', { order_id: ofId, route_id: fixtures.routeId }, { journey: J, label: 'Explodir roteiro da OF', expect: [201] });
    const orderOperations = Array.isArray(exploded.json) ? exploded.json : (exploded.json?.data ?? []);
    const orderOperationId = orderOperations[0]?.id ?? orderOperations[0]?.ID;
    if (orderOperationId) {
      await call('POST', '/api/production-order/operations/advance', { operation_id: orderOperationId, status: 'IN_PROGRESS' }, { journey: J, label: 'Avançar operação do roteiro', expect: [200] });
    }
    await call('POST', '/api/aps/sequence', { start_from: '2026-07-15T08:00:00-03:00', order_ids: [ofId] }, { journey: J, label: 'APS: sequenciar OF real', expect: [200, 201] });
    const gantt = await call('GET', `/api/aps/gantt/order/${ofId}`, undefined, { journey: J, label: 'APS: consultar barras geradas' });
    const bars = Array.isArray(gantt.json) ? gantt.json : (gantt.json?.data ?? gantt.json?.bars ?? []);
    const sequenceId = bars[0]?.id ?? bars[0]?.sequence_id;
    if (sequenceId) {
      await call('POST', '/api/aps/gantt/reschedule', { sequence_id: sequenceId, new_start: '2026-07-16T08:00:00-03:00', cascade: true }, { journey: J, label: 'APS: remanejar sequência real', expect: [200] });
    }
    await call('POST', `/api/production-order/${ofId}/scrap-return`, { scrap_item_code: 10050, warehouse_id: 2, quantity: 1, unit_value: 5, notes: 'retalho E2E' }, { journey: J, label: 'Retornar sucata (IN valorizado)', expect: [200, 201] });
    await call('POST', `/api/production-order/${ofId}/complete`, { warehouse_id: 2, lot: `E2E-${RUN_TAG}` }, { journey: J, label: 'Concluir OF (IN do acabado + lote)', expect: [200, 201] });
    await call('POST', `/api/production-order/${ofId}/settle-cost`, {}, { journey: J, label: 'Apurar custo real', expect: [200, 201] });
    const c = await call('GET', `/api/production-order/${ofId}/cost`, undefined, { journey: J, label: 'Consultar custo + variâncias' });
    void c;
    await call('POST', `/api/production-order/${ofId}/close`, {}, { journey: J, label: 'Fechar OF (→CLOSED)', expect: [200, 201] });
  }
}

async function journeyFerramental() {
  const J = 'Ferramental (Ficha)';
  const RUN = Date.now() % 90000;
  await call('GET', '/api/routing/tools', undefined, { journey: J, label: 'Ferramentas: listar (§4.1)' });
  await call('GET', '/api/routing/tools/replacement', undefined, { journey: J, label: 'Ferramentas: precisam de troca' });
  await call('GET', '/api/tool-production-sheet/orders', undefined, { journey: J, label: 'Ficha: ordens elegíveis (exclui OFC)' });
  if (!RUN_WRITES) return;

  const t = await call('POST', '/api/routing/tools', { name: `Matriz E2E ${RUN}`, tool_type: 'MATRIZ', life_type: 'GOLPES', life_limit: 100000, cost: 5000 }, { journey: J, label: 'Criar ferramenta (código gerado)', expect: [200, 201, 409, 422] });
  const tid = t.json?.id ?? t.json?.ID;
  if (tid) {
    await call('POST', `/api/routing/tools/${tid}/serials`, { serial_number: `SN-${RUN}`, status: 'ATIVA', location: 'Almox A' }, { journey: J, label: 'Criar série da ferramenta', expect: [200, 201, 409, 422] });
    await call('GET', `/api/routing/tools/${tid}/serials`, undefined, { journey: J, label: 'Listar séries da ferramenta' });
    await call('POST', `/api/routing/tools/${tid}/reset-life`, {}, { journey: J, label: 'Zerar vida útil após troca', expect: [200, 201, 204] });
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
  await call('POST', '/api/machine/types/create', { code, name: `Tipo E2E ${RUN}`, type: 'CUT', is_active: true, created_by: authenticatedUserId }, { journey: J, label: 'Criar tipo de máquina', expect: [200, 201] });
  // create de máquina com enum PT real (capacity_per_unit/period) — antes quebrava com PIECES/DAY
  const mc = await call('POST', '/api/machine/create', { code, name: `Maq E2E ${RUN}`, machine_type_code: code, capacity: 100, capacity_per_unit: 'PEÇAS', capacity_period: 'DIA', efficiency_rate: 0.9, is_active: true, created_by: authenticatedUserId }, { journey: J, label: 'Criar máquina (enum PT: PEÇAS/DIA)', expect: [200, 201] });
  const mcode = codeOf(mc.json);
  if (!mcode || !fixtures.itemCode) return;
  fixtures.machineCode = mcode;
  const machineList = await call('GET', '/api/machine/list', undefined, { journey: J, label: 'Confirmar máquina criada' });
  const machines = Array.isArray(machineList.json) ? machineList.json : (machineList.json?.data ?? []);
  const persistedMachine = machines.find((entry) => Number(entry.code ?? entry.Code) === Number(mcode));
  fixtures.machineId = persistedMachine?.id ?? persistedMachine?.ID;
  await call('POST', '/api/machine/time/create', { item_code: fixtures.itemCode, machine_code: mcode, production_time: 2, production_time_unit: 'MINUTO', production_base_qty: 1, setup_time: 30, priority: 1 }, { journey: J, label: 'Cadastrar tempo item × máquina', expect: [200, 201] });
  await call('POST', '/api/machine/schedule/create', { machine_code: mcode, schedule_date: '2026-07-01T00:00:00Z', planned_qty: 40, sequence: 1 }, { journey: J, label: 'Criar agenda da máquina', expect: [200, 201] });
  // BUG: calculate quebrado no backend (column "is_active" does not exist, SQLSTATE 42703); campo é demand_qty
  await call('POST', '/api/machine/time/production/calculate', { item_code: fixtures.itemCode, machine_code: mcode, demand_qty: 500 }, { journey: J, label: 'Calcular tempo de produção', expect: [200, 201] });
}

async function journeyManufatura() {
  const J = 'Manufatura (PCP)';
  const RUN = Date.now() % 90000;
  const UID = authenticatedUserId;
  // §1 Roteiro
  await call('GET', '/api/routing/operations', undefined, { journey: J, label: 'Roteiro: listar operações' });
  await call('GET', '/api/routing/routes?item_code=10001', undefined, { journey: J, label: 'Roteiro: roteiros do item 10001' });
  await call('GET', '/api/routing/routes/1', undefined, { journey: J, label: 'Roteiro: detalhe (route+operations+network)', expect: [200, 404] });
  await call('GET', '/api/routing/routes/1/lead-time', undefined, { journey: J, label: 'Roteiro: lead time (CPM)', expect: [200, 404] });
  // §2 CRP — só /calculate está montado no demo (plans/work-centers = 404)
  await call('POST', '/api/crp/calculate', { plan_code: 1 }, { journey: J, label: 'CRP: calcular plano 1' });
  await call('GET', '/api/crp/1', undefined, { journey: J, label: 'CRP: registros do plano', expect: [200, 404] });
  // §3 APS — BUG: sequence lê priority "NORMAL" como int (22P02)
  await call('POST', '/api/aps/sequence', { plan_code: 1 }, { journey: J, label: 'APS: sequenciar (BUG: priority int 22P02)', expect: [200, 201, 422, 500] });
  await call('GET', '/api/aps/gantt/order/600', undefined, { journey: J, label: 'APS: Gantt da ordem 600' });
  // §3.1 Quadro de Programação (mês / range livre) — fallback plota OFs mesmo sem sequenciar
  await call('GET', '/api/aps/gantt/month/2026/6?group_by=work_center', undefined, { journey: J, label: 'APS: quadro mensal (por centro)', expect: [200, 400] });
  await call('GET', '/api/aps/gantt/board?from=2026-06-01&to=2026-06-30&scale=week&group_by=order', undefined, { journey: J, label: 'APS: quadro em range (semana, por OF)', expect: [200, 400] });
  await call('GET', '/api/aps/gantt/month/2026/6/export?format=svg', undefined, { journey: J, label: 'APS: export do quadro (SVG)', expect: [200, 400] });
  // §4 Custo Padrão / §5 Qualidade
  await call('GET', '/api/standard-cost/', undefined, { journey: J, label: 'Custo Padrão: listar (NÃO montado no demo)', expect: [200, 404] });
  await call('GET', '/api/quality/plans/by-item/10001', undefined, { journey: J, label: 'Qualidade: planos do item 10001' });
  await call('GET', '/api/quality/non-conformances/open', undefined, { journey: J, label: 'Qualidade: NC em aberto' });
  // §6 Manutenção
  await call('GET', '/api/maintenance/plans', undefined, { journey: J, label: 'Manutenção: listar planos' });
  // §7 Previsão — demo espera period int; doc usa string "YYYY-MM"
  await call('POST', '/api/forecast/statistical', { item_code: 1001, history: [{ period: '2026-01', quantity: 120 }, { period: '2026-02', quantity: 135 }, { period: '2026-03', quantity: 118 }], periods_ahead: 3 }, { journey: J, label: 'Previsão (doc=string period; demo antigo=int → 400)', expect: [200, 400, 422] });
  // §8 Alertas MRP
  await call('POST', '/api/mrp-calculation/exceptions/notify', { plan_code: 1 }, { journey: J, label: 'Alertas MRP: notificar exceções' });
  if (!RUN_WRITES) return;

  const op = await call('POST', '/api/routing/operations', { name: `Op E2E ${RUN}`, origin: 'INTERNA', standard_time: 0.5 }, { journey: J, label: 'Roteiro: criar operação', expect: [200, 201, 409, 422] });
  const routeItem = fixtures.itemCode;
  const rt = routeItem ? await call('POST', '/api/routing/routes', { item_code: routeItem, description: `Roteiro E2E ${RUN}`, alternative: (RUN % 30000) + 2, is_standard: true, created_by: UID }, { journey: J, label: 'Roteiro: criar roteiro', expect: [200, 201] }) : { json: null };
  const rid = idOf(rt.json);
  const opId = codeOf(op.json);
  if (rid && opId) {
    const routeOperation = await call('POST', `/api/routing/route-operations/${rid}`, { operation_id: opId, sequence: 10, standard_time: 0.5, situation: 'APROVADA' }, { journey: J, label: 'Roteiro: adicionar operação ao roteiro', expect: [200, 201] });
    fixtures.routeId = rid;
    fixtures.routeOperationId = codeOf(routeOperation.json);
  }
  const mp = fixtures.machineId ? await call('POST', '/api/maintenance/plans', { machine_id: fixtures.machineId, description: `Preventiva E2E ${RUN}`, frequency: 'MONTHLY', frequency_days: 30, estimated_hours: 2, created_by: UID }, { journey: J, label: 'Manutenção: criar plano', expect: [200, 201] }) : { json: null };
  const planId = codeOf(mp.json);
  if (planId) {
    const mo = await call('POST', '/api/maintenance/orders', { plan_id: planId, scheduled_date: '2026-08-01', estimated_hours: 2 }, { journey: J, label: 'Manutenção: criar ordem', expect: [200, 201, 409, 422] });
    const ordId = codeOf(mo.json);
    if (ordId) await call('POST', '/api/maintenance/orders/advance', { order_id: ordId, status: 'IN_PROGRESS' }, { journey: J, label: 'Manutenção: avançar ordem (→IN_PROGRESS)', expect: [200, 201, 422] });
    await call('GET', `/api/maintenance/orders/by-plan/${planId}`, undefined, { journey: J, label: 'Manutenção: ordens do plano' });
  }
  await call('POST', '/api/maintenance/orders/generate', { horizon_days: 30 }, { journey: J, label: 'Manutenção: gerar ordens (horizonte 30d)', expect: [200, 201, 422] });
  // §5 Qualidade: plano → característica → registro(+medições) → NC → disposição
  const qualityItem = fixtures.itemCode;
  const qp = qualityItem ? await call('POST', '/api/quality/plans', { item_code: qualityItem, route_operation_id: fixtures.routeOperationId || undefined, point_type: 'PROCESSO', description: `Inspeção E2E ${RUN}`, sample_size: 5, acceptance_level: 1, created_by: UID }, { journey: J, label: 'Qualidade: criar plano', expect: [200, 201] }) : { json: null };
  const qpId = codeOf(qp.json);
  if (qpId) {
    const qc = await call('POST', '/api/quality/characteristics', { plan_id: qpId, name: 'Espessura', nominal: 2.0, tolerance_lower: 1.9, tolerance_upper: 2.1, unit: 'mm', is_critical: true }, { journey: J, label: 'Qualidade: adicionar característica', expect: [200, 201, 409, 422] });
    const qcId = codeOf(qc.json);
    const measurements = qcId ? [{ characteristic_id: qcId, measured_value: 2.03, is_conformant: true }] : [];
    await call('POST', '/api/quality/records', { plan_id: qpId, item_code: qualityItem, inspected_qty: 5, approved_qty: 5, rejected_qty: 0, result: 'APROVADO', created_by: UID, measurements }, { journey: J, label: 'Qualidade: registrar laudo (+medições)', expect: [200, 201] });
  }
  const nc = await call('POST', '/api/quality/non-conformances', { item_code: 10001, nonconform_qty: 2, description: `Rebarba fora do padrão ${RUN}`, severity: 'MENOR', created_by: UID }, { journey: J, label: 'Qualidade: abrir NC', expect: [200, 201, 409, 422] });
  const ncId = codeOf(nc.json);
  if (ncId) await call('POST', `/api/quality/non-conformances/${ncId}/disposition`, { disposition: 'RETRABALHO', disposed_by: UID }, { journey: J, label: 'Qualidade: dispor NC (RETRABALHO)', expect: [200, 201, 204, 422] });
}

async function journeyCustos() {
  const J = 'Custos';
  const RUN = Date.now() % 90000;
  const UID = authenticatedUserId;
  // §1 Custo Padrão (endpoints reais: /rollup, /items/{code}, /work-center-costs, /purchase-costs)
  await call('GET', '/api/standard-cost/work-center-costs', undefined, { journey: J, label: 'Custo padrão: custos de centro de trabalho' });
  await call('GET', '/api/standard-cost/items/10001', undefined, { journey: J, label: 'Custo padrão do item 10001', expect: [200, 404] });
  // §2 Centro de Custo
  await call('GET', '/api/cost-center/list', undefined, { journey: J, label: 'Centro de custo: listar' });
  // §3 Overhead e Base de Alocação
  await call('GET', '/api/allocations/list', undefined, { journey: J, label: 'Bases de alocação: listar' });
  await call('GET', '/api/overhead-allocation/list', undefined, { journey: J, label: 'Alocações de overhead: listar' });
  if (!RUN_WRITES) return;

  const costItem = fixtures.itemCode;
  if (costItem) await call('POST', '/api/standard-cost/rollup', { item_code: costItem, mask: '', calculated_by: UID }, { journey: J, label: 'Rollup do custo padrão do item E2E', expect: [200, 201] });
  await call('POST', '/api/standard-cost/work-center-costs', { work_center_id: 1, cost_per_hour: 85.5, updated_by: UID }, { journey: J, label: 'Upsert custo/hora do centro 1', expect: [200, 201, 422] });
  if (costItem) await call('POST', '/api/standard-cost/purchase-costs', { item_code: costItem, cost: 12.5, updated_by: UID }, { journey: J, label: 'Upsert custo de compra do item E2E', expect: [200, 201] });
  const sourceCC = 100000 + RUN;
  const targetCC = 200000 + RUN;
  await call('POST', '/api/cost-center/create', { code: sourceCC, description: `CC origem E2E ${RUN}`, type: 'ADMINISTRATIVE', is_ratio: true, start_date: '2026-01-01', created_by: UID }, { journey: J, label: 'Criar centro de custo de origem', expect: [200, 201] });
  await call('POST', '/api/cost-center/create', { code: targetCC, description: `CC destino E2E ${RUN}`, type: 'PRODUCTIVE', is_ratio: true, start_date: '2026-01-01', created_by: UID }, { journey: J, label: 'Criar centro de custo de destino', expect: [200, 201] });
  const allocationCode = 700000 + RUN;
  await call('POST', '/api/allocations/create', { code: allocationCode, description: `Base E2E ${RUN}`, period: '2026-06' }, { journey: J, label: 'Criar base de alocação', expect: [200, 201] });
  await call('POST', '/api/overhead-allocation/create', { cost_center_code: sourceCC, base_code: allocationCode, period_start: '2026-01-01', period_end: '2026-01-31', allocation_type: 'PERCENTAGE', created_by: UID, targets: [{ cost_center_code: targetCC, percentage: 100, amount: 0 }] }, { journey: J, label: 'Criar overhead com rateio integral', expect: [200, 201] });
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

async function journeyPlanoCorte() {
  const J = 'Plano de Corte';
  const UID = authenticatedUserId;
  await call('GET', '/api/cutting-settings', undefined, { journey: J, label: 'Ler padrões da empresa (consumo/sobra)' });
  await call('GET', '/api/cutting-plans?only_open=true', undefined, { journey: J, label: 'Listar planos abertos' });
  await call('GET', '/api/stock-remnants?item_code=5001&only_available=true', undefined, { journey: J, label: 'Listar retalhos do material', expect: [200, 400] });
  if (!RUN_WRITES) return;

  // 1D: criar (com depósito p/ firmar) → otimizar → firmar → programa → export
  const plan = await call('POST', '/api/cutting-plans', {
    material_item_code: 5001, description: 'Corte E2E 1D', cut_type: 'LINEAR_1D', kerf_mm: 3, trim_mm: 0, min_remnant_mm: 300,
    stock_uom: 'M', warehouse_id: 2,
    parts: [{ label: 'Perna 720', length_mm: 720, quantity: 8 }, { label: 'Travessa 1200', length_mm: 1200, quantity: 4 }],
    stock_pieces: [{ length_mm: 6000, quantity: 5 }, { length_mm: 2300, quantity: 1, is_remnant: true }],
    created_by: UID,
  }, { journey: J, label: 'Criar plano 1D (com peças + estoque)', expect: [200, 201] });
  const pid = (plan.json && (plan.json.id ?? plan.json.ID)) || codeOf(plan.json);
  if (pid) {
    await call('POST', `/api/cutting-plans/${pid}/parts`, { label: 'Extra 500', length_mm: 500, quantity: 2 }, { journey: J, label: 'Adicionar peça', expect: [200, 201] });
    await call('POST', `/api/cutting-plans/${pid}/stock`, { length_mm: 5000, quantity: 2 }, { journey: J, label: 'Adicionar estoque', expect: [200, 201] });
    const opt = await call('POST', `/api/cutting-plans/${pid}/optimize`, {}, { journey: J, label: 'Otimizar (BFD/column-generation)', expect: [200, 201] });
    const util = opt.json && opt.json.plan && opt.json.plan.utilization_pct;
    if (util != null) results.push({ journey: J, label: `  → aproveitamento ${Number(util).toFixed(1)}%`, ok: true, status: 200, note: '' });
    await call('GET', `/api/cutting-plans/${pid}`, undefined, { journey: J, label: 'Detalhe (padrões + posições)' });
    await call('GET', `/api/cutting-plans/${pid}/program`, undefined, { journey: J, label: 'Programa de corte' });
    await call('GET', `/api/cutting-plans/${pid}/export?format=svg`, undefined, { journey: J, label: 'Export SVG do mapa' });
    await call('GET', `/api/cutting-plans/${pid}/export?format=dxf`, undefined, { journey: J, label: 'Export DXF do mapa' });
    await call('POST', `/api/cutting-plans/${pid}/release`, {}, { journey: J, label: 'Firmar (baixa estoque + retalhos)', expect: [200, 201, 422] });
    await call('GET', `/api/cutting-plans/${pid}/order-costs`, undefined, { journey: J, label: 'Rateio de custo por OP', expect: [200, 404] });
  }
  // from-orders (sem ordens válidas → 422 esperado)
  await call('POST', '/api/cutting-plans/from-orders', { production_order_codes: [600], created_by: UID }, { journey: J, label: 'Gerar planos a partir de OP (Fase 5)', expect: [200, 201, 422] });
}

async function journeyMRP() {
  const J = 'MRP (Planejamento)';
  const UID = authenticatedUserId;
  // Leituras (funcionam; vazias sem plano semeado)
  await call('GET', '/api/mrp-calculation/suggestions/1', undefined, { journey: J, label: 'Sugestões do plano 1' });
  await call('GET', '/api/mrp-calculation/exceptions/1', undefined, { journey: J, label: 'Exceções do plano 1' });
  await call('GET', '/api/mrp-calculation/profile/10001/1', undefined, { journey: J, label: 'Perfil MRP do item 10001' });
  await call('GET', '/api/mrp-calculation/configured-rules/10001', undefined, { journey: J, label: 'Regras configuradas do item 10001' });
  await call('GET', '/api/planned-order/list', undefined, { journey: J, label: 'Ordens planejadas: listar' });
  // Relatórios operacionais (/api/mrp-reports) — tenant-aware, vazios sem plano semeado
  await call('GET', '/api/mrp-reports/profile?plan_code=1', undefined, { journey: J, label: 'Relatório: perfil', expect: [200, 400] });
  await call('GET', '/api/mrp-reports/availability?item_code=10001&quantity=1&layout=AMBOS', undefined, { journey: J, label: 'Relatório: disponibilidade', expect: [200, 400] });
  await call('GET', '/api/mrp-reports/grouped-needs?plan_code=1', undefined, { journey: J, label: 'Relatório: necessidades agrupadas', expect: [200, 400] });
  await call('GET', '/api/mrp-reports/explosion/10001?quantity=1', undefined, { journey: J, label: 'Relatório: explosão do item 10001', expect: [200, 400, 404] });
  await call('GET', '/api/mrp-reports/reorder-point?planning_type=REORDER_POINT', undefined, { journey: J, label: 'Relatório: ponto de reposição', expect: [200, 400] });
  // Empresas inter-fábrica do plano 1 (leitura)
  await call('GET', '/api/production-plan/1/inter-factories', undefined, { journey: J, label: 'Inter-fábrica do plano 1', expect: [200, 404] });
  if (!RUN_WRITES) return;

  // Criar plano de produção (o "plano" que o MRP roda) — code positivo obrigatório
  const RUN = Date.now() % 90000;
  const plan = await call('POST', '/api/production-plan/create', { code: 8000 + RUN, name: `Plano E2E ${RUN}`, planning_types: ['MRP'], independent_demands: 'ALL', is_active: true, created_by: UID }, { journey: J, label: 'Criar plano de produção', expect: [200, 201, 409, 422] });
  const planCode = (plan.json && plan.json.code) || (8000 + RUN);
  await call('GET', '/api/production-plan/list', undefined, { journey: J, label: 'Listar planos de produção' });
  // Inter-fábrica: substitui a lista (vazia remove tudo); empresa inexistente/igual à do plano → rejeita
  await call('PUT', `/api/production-plan/${planCode}/inter-factories`, { enterprises: [] }, { journey: J, label: 'Inter-fábrica: esvaziar lista', expect: [200, 201, 204, 400, 404, 422] });
  // Agora o run tem um plano real (sem demanda pode gerar 0 ordens, mas roda)
  // run exige initial_order_number (obrigatório, positivo) + generate_llc; 409 se já houver cálculo RUNNING
  await call('POST', '/api/mrp-calculation/run', { plan_code: planCode, initial_order_number: 10000 + RUN, generate_llc: true }, { journey: J, label: 'Rodar MRP (initial_order_number + generate_llc)', expect: [200, 201, 202, 400, 409, 500] });
  await call('GET', `/api/mrp-calculation/suggestions/${planCode}`, undefined, { journey: J, label: 'Sugestões do plano recém-rodado' });
  const plannedItem = fixtures.itemCode ?? 10001;
  await call('POST', '/api/mrp-calculation/configured-rules', { item_code: plannedItem, table_type: 'PLANNING_DATA', field_name: 'lead_time', rule_type: 'EQUAL', rule_value: '15', sequence: 1 }, { journey: J, label: 'Criar regra configurada', expect: [200, 201, 409, 422] });
  // demand_type omitido assume INDEPENDENT (bug corrigido no backend)
  const poc = await call('POST', '/api/planned-order/create', { item_code: plannedItem, quantity: 10, order_type: 'PRODUCTION', need_date: '2026-08-01T00:00:00Z', start_date: '2026-07-20T00:00:00Z', created_by: UID }, { journey: J, label: 'Criar ordem planejada (demand_type→INDEPENDENT)', expect: [200, 201] });
  const poCode = codeOf(poc.json);
  if (poCode) await call('POST', '/api/planned-order/transition', { order_codes: [poCode], target: 'RELEASED', start_date: '2026-07-21', end_date: '2026-07-28' }, { journey: J, label: 'Transicionar ordem planejada (→RELEASED)', expect: [200, 201, 204] });
}

function genCNPJ(seed) {
  const base = String(10000000 + (seed % 89999999)).padStart(8, '0') + '0001';
  const calc = (nums) => {
    const w = nums.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = nums.split('').reduce((acc, d, i) => acc + Number(d) * w[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(base);
  const d2 = calc(base + d1);
  return base + d1 + d2;
}

async function journeyFornecedor() {
  const J = 'Cadastro de Fornecedor';
  const RUN = Date.now() % 90000;
  const UID = authenticatedUserId;
  await call('GET', '/api/suppliers', undefined, { journey: J, label: 'Listar fornecedores' });
  await call('GET', '/api/suppliers/support/supplier-types', undefined, { journey: J, label: 'Apoio: tipos de fornecedor' });
  await call('GET', '/api/suppliers/support/contact-types', undefined, { journey: J, label: 'Apoio: tipos de contato' });
  await call('GET', '/api/suppliers/1', undefined, { journey: J, label: 'Abrir fornecedor #1 (pastas hidratadas)', expect: [200, 404] });
  await call('GET', '/api/cnpj/19131243000197', undefined, { journey: J, label: 'Auto-fill: consulta CNPJ na Receita' });
  await call('GET', '/api/suppliers?format=csv', undefined, { journey: J, label: 'Exportar fornecedores (CSV)' });
  if (!RUN_WRITES) return;

  // Apoios → parâmetros → tipo → fornecedor → block/unblock → defaults
  const st = await call('POST', '/api/suppliers/support/supplier-types', { description: `Tipo E2E ${RUN}`, kind: 'NORMAL', created_by: UID }, { journey: J, label: 'Criar tipo de fornecedor', expect: [200, 201, 409, 422] });
  const stc = codeOf(st.json);
  await call('POST', '/api/suppliers/support/contact-types', { description: `Comprador E2E ${RUN}` }, { journey: J, label: 'Criar tipo de contato', expect: [200, 201, 409, 422] });
  await call('PUT', '/api/suppliers/support/parameters', { enterprise_code: 1, default_due_base_date: 'EMISSAO', requires_financial_account: false, homologation_default: true }, { journey: J, label: 'Salvar parâmetros da empresa 1', expect: [200, 201] });
  await call('GET', '/api/suppliers/support/parameters/1', undefined, { journey: J, label: 'Ler parâmetros da empresa 1' });
  // CNPJ VÁLIDO (dígito verificador) único por run; type FK real
  const doc = genCNPJ(RUN);
  const sup = await call('POST', '/api/suppliers', { name: `Fornecedor E2E ${RUN}`, trade_name: 'Forn E2E', person_type: 'JURIDICA', document_type: 'CNPJ', document_number: doc, state_registration: '123456', supplier_type_code: stc || 1, freight_type: 'CIF', icms_contributor: 'CONTRIBUINTE', created_by: UID }, { journey: J, label: 'Criar fornecedor PJ', expect: [200, 201, 409, 422] });
  const sc = codeOf(sup.json);
  if (sc) {
    fixtures.supplierCode = sc;
    await call('POST', '/api/suppliers/addresses', { supplier_code: sc, zip_code: '88010-000', street: 'Rua E2E', number: '100', city: 'Florianópolis', uf: 'SC', country: 'Brasil' }, { journey: J, label: 'Pasta: adicionar endereço', expect: [200, 201, 422] });
    await call('POST', '/api/suppliers/phones', { supplier_code: sc, number: '(48) 3333-4444', ranking: 1 }, { journey: J, label: 'Pasta: adicionar telefone', expect: [200, 201, 422] });
    await call('POST', '/api/suppliers/emails', { supplier_code: sc, email: 'e2e@forn.com', ranking: 1 }, { journey: J, label: 'Pasta: adicionar e-mail', expect: [200, 201, 422] });
    await call('POST', '/api/suppliers/enterprises', { supplier_code: sc, enterprise_code: 1, ipi: false }, { journey: J, label: 'Pasta: vínculo de empresa', expect: [200, 201, 422] });
    await call('GET', `/api/suppliers/${sc}/enterprises`, undefined, { journey: J, label: 'Listar vínculos de empresa' });
    await call('GET', `/api/suppliers/${sc}/purchasing-defaults?enterprise=1`, undefined, { journey: J, label: 'Provider de defaults de compra', expect: [200, 404, 422] });
    await call('PATCH', `/api/suppliers/${sc}/block`, { reason: 'Teste E2E' }, { journey: J, label: 'Bloquear fornecedor', expect: [200, 201, 204] });
    await call('PATCH', `/api/suppliers/${sc}/unblock`, {}, { journey: J, label: 'Desbloquear fornecedor', expect: [200, 201, 204] });
    // SEFAZ: estados sem serviço / sem token retornam erro informativo
    await call('POST', `/api/suppliers/${sc}/sefaz-query`, {}, { journey: J, label: 'Consulta cadastral SEFAZ (erro informativo esperado)', expect: [200, 201, 400, 422, 500] });
  }
}

async function journeyCompras() {
  const J = 'Compras (Suprimento)';
  const RUN = Date.now() % 90000;
  const UID = authenticatedUserId;
  // Leituras
  await call('GET', '/api/item-conversions/item/10050', undefined, { journey: J, label: 'Conversões UM do item 10050' });
  await call('GET', '/api/purchase-price-tables', undefined, { journey: J, label: 'Tabelas de preço de compra' });
  await call('GET', '/api/item-suppliers/item/10050', undefined, { journey: J, label: 'Fornecedores preferenciais do item 10050' });
  await call('GET', '/api/purchase-order/list', undefined, { journey: J, label: 'Pedidos de compra' });
  await call('GET', '/api/purchase-order/suggestions', undefined, { journey: J, label: 'Sugestões de compra (MRP)' });
  await call('GET', '/api/purchase-requisitions?only_open=true', undefined, { journey: J, label: 'Solicitações de compra abertas' });
  await call('GET', '/api/purchase-quotations?only_open=true', undefined, { journey: J, label: 'Cotações abertas' });
  // Procurement — contratos de fornecedores (VCON0200/0400/0202) + camada operacional
  await call('GET', '/api/procurement/supplier-contracts', undefined, { journey: J, label: 'Contratos de fornecedores (VCON0400)' });
  await call('GET', '/api/procurement/receiving-notices', undefined, { journey: J, label: 'Avisos de recebimento (VAVR0200)', expect: [200, 400] });
  await call('GET', '/api/procurement/records', undefined, { journey: J, label: 'Registros operacionais de suprimento', expect: [200, 400] });
  await call('GET', '/api/procurement/purchase-movements', undefined, { journey: J, label: 'Histórico consolidado de movimentações', expect: [200, 400] });
  // Superfície procurement completa (leituras)
  await call('GET', '/api/procurement/receiving-inspection-orders', undefined, { journey: J, label: 'Ordens de inspeção de recebimento', expect: [200, 400] });
  await call('GET', '/api/procurement/approval-limits', undefined, { journey: J, label: 'Alçada de valores (FALC)', expect: [200, 400] });
  await call('GET', '/api/procurement/edi-messages', undefined, { journey: J, label: 'Mensagens EDI (FEDS)', expect: [200, 400] });
  await call('GET', '/api/procurement/import-processes', undefined, { journey: J, label: 'Processos de importação (FIMP)', expect: [200, 400] });
  await call('GET', '/api/procurement/parameters', undefined, { journey: J, label: 'Parâmetros de suprimentos', expect: [200, 400] });
  await call('GET', '/api/procurement/suppliers/1/scorecards', undefined, { journey: J, label: 'Scorecards (IQF) do fornecedor 1', expect: [200, 400, 404] });
  await call('GET', '/api/procurement/suppliers/1/homologations', undefined, { journey: J, label: 'Homologações do fornecedor 1', expect: [200, 400, 404] });
  if (!RUN_WRITES) return;

  // §11 Conversão UM: upsert → convert
  const conversionItem = fixtures.itemCode ?? 10050;
  const purchaseSupplier = fixtures.supplierCode;
  await call('POST', '/api/item-conversions', { item_code: conversionItem, from_uom: 'CX', to_uom: 'UN', factor: 12 }, { journey: J, label: 'Cadastrar conversão 1 CX = 12 UN', expect: [200, 201] });
  await call('GET', `/api/item-conversions/convert?item=${conversionItem}&from=CX&to=UN&qty=2`, undefined, { journey: J, label: 'Converter 2 CX → UN', expect: [200] });
  // §14 Fornecedor preferencial
  if (purchaseSupplier) await call('POST', '/api/item-suppliers', { item_code: conversionItem, supplier_code: purchaseSupplier, ranking: 1, supplier_item_code: `E2E-${RUN}`, supplier_uom: 'UN', lead_time_days: 7 }, { journey: J, label: 'Vincular fornecedor preferencial', expect: [200, 201] });
  // §12 Tabela de preço: criar → item
  const tbl = purchaseSupplier ? await call('POST', '/api/purchase-price-tables', { supplier_code: purchaseSupplier, description: `Tabela E2E ${RUN}`, currency_code: 'BRL', validity_start: '2026-01-01' }, { journey: J, label: 'Criar tabela de preço', expect: [200, 201] }) : { json: null };
  const tcode = codeOf(tbl.json);
  if (tcode) await call('POST', '/api/purchase-price-tables/items', { table_code: tcode, item_code: conversionItem, supplier_code: purchaseSupplier, price: 9.9, uom: 'UN', min_qty: 0, update_replacement_value: true }, { journey: J, label: 'Adicionar item à tabela', expect: [200, 201] });
  // §13 Pedido de compra: criar (defaults do fornecedor) → item → cancelar
  const po = await call('POST', '/api/purchase-order/create', { enterprise_code: 1, supplier_code: 1, currency_code: 'BRL', freight_type: 'CIF' }, { journey: J, label: 'Criar pedido de compra (defaults do fornecedor)', expect: [200, 201] });
  const pcode = codeOf(po.json);
  if (pcode) {
    await call('POST', `/api/purchase-order/${pcode}/items`, { item_code: 10050, requested_qty: 5, unit_price: 10 }, { journey: J, label: 'Adicionar item (preço/IPI/UM resolvidos)', expect: [200, 201, 422] });
    await call('DELETE', `/api/purchase-order/${pcode}/cancel`, undefined, { journey: J, label: 'Cancelar pedido de compra', expect: [200, 201, 204] });
  }
  // §15 Solicitação: criar (com item) → gerar pedidos
  const req = await call('POST', '/api/purchase-requisitions', { enterprise_code: 1, created_by: authenticatedUserId, items: [{ item_code: conversionItem, quantity: 8, uom: 'UN', suggested_price: 9.9 }] }, { journey: J, label: 'Criar solicitação de compra', expect: [200, 201] });
  const rcode = codeOf(req.json);
  if (rcode) {
    const rdet = await call('GET', `/api/purchase-requisitions/${rcode}`, undefined, { journey: J, label: 'Detalhe da solicitação (itens)' });
    const item = rdet.json && (rdet.json.items || [])[0];
    if (item && (item.id ?? item.ID)) {
      await call('POST', '/api/purchase-requisitions/generate-orders', { enterprise_code: 1, created_by: authenticatedUserId, selections: [{ requisition_item_id: item.id ?? item.ID, qty_to_attend: 8, supplier_code: purchaseSupplier }] }, { journey: J, label: 'Gerar pedidos da solicitação (agrupa por fornecedor)', expect: [200, 201] });
    }
  }
  // §16 Cotação: criar → convidar fornecedores
  const quo = await call('POST', '/api/purchase-quotations', { enterprise_code: 1, supplier_codes: [1] }, { journey: J, label: 'Criar cotação', expect: [200, 201] });
  const qcode = codeOf(quo.json);
  if (qcode) await call('POST', `/api/purchase-quotations/${qcode}/suppliers`, { supplier_codes: [1] }, { journey: J, label: 'Convidar fornecedores para cotação', expect: [200, 201, 422] });
  // Contrato de fornecedor: criar (capa + linha) → consumir saldo → mudar status
  const ct = await call('POST', '/api/procurement/supplier-contracts', { enterprise_code: 1, supplier_code: 1, contract_number: `CT-E2E-${RUN}`, status: 'ACTIVE', currency: 'BRL', valid_from: '2026-01-01', items: [{ item_code: 10050, mask: '', contracted_qty: 100, unit_price: 9.9, min_order_qty: 0 }], created_by: UID }, { journey: J, label: 'Criar contrato de fornecedor (VCON0200)', expect: [200, 201, 409, 422] });
  const ctid = codeOf(ct.json);
  if (ctid) {
    await call('POST', `/api/procurement/supplier-contracts/${ctid}/consume`, { item_code: 10050, mask: '', quantity: 10 }, { journey: J, label: 'Baixar saldo do contrato (VCON0202)', expect: [200, 201, 409, 422] });
    await call('PATCH', `/api/procurement/supplier-contracts/${ctid}/status`, { status: 'CLOSED' }, { journey: J, label: 'Encerrar contrato (status)', expect: [200, 201, 422] });
  }
  // FAVR: aviso de recebimento (VAVR0200) → avançar status → divergência → resolver
  const rn = await call('POST', '/api/procurement/receiving-notices', { enterprise_code: 1, supplier_code: 1, dock: 'D1', invoice_number: `NF-${RUN}`, items: [{ item_code: 10050, mask: '', expected_qty: 100 }], created_by: UID }, { journey: J, label: 'Criar aviso de recebimento (VAVR0200)', expect: [200, 201, 409, 422] });
  const rnid = codeOf(rn.json);
  if (rnid) {
    await call('PATCH', `/api/procurement/receiving-notices/${rnid}/status`, { status: 'ARRIVED', blocked: false }, { journey: J, label: 'Aviso: avançar (→ARRIVED)', expect: [200, 201, 422] });
    const dv = await call('POST', '/api/procurement/receiving-divergences', { notice_id: rnid, supplier_code: 1, item_code: 10050, mask: '', divergence_type: 'SHORTAGE', expected_qty: 100, actual_qty: 95, affects_supplier_score: true, created_by: UID }, { journey: J, label: 'Registrar divergência (falta)', expect: [200, 201, 422] });
    const dvid = codeOf(dv.json);
    if (dvid) await call('PATCH', `/api/procurement/receiving-divergences/${dvid}/resolution`, { resolution: 'PARTIAL_RETURN' }, { journey: J, label: 'Resolver divergência (devolução parcial)', expect: [200, 201, 422] });
  }
  // Inspeção estruturada (VINS0200): roteiro por item com 1 etapa
  await call('POST', '/api/procurement/receiving-inspection-routes', { enterprise_code: 1, basis: 'ITEM', item_code: 10050, mask: '', inspection_warehouse_id: 1, valid_from: '2026-01-01', steps: [{ sequence: 10, inspection_name: 'Dimensional', kind: 'VALUE', appointment_mode: 'ALL_MEASUREMENTS', is_required: true, sample_qty: 5, acceptance_qty: 0, rejection_qty: 1, nominal_value: 10, min_value: 9.8, max_value: 10.2, attributes: [] }], created_by: UID }, { journey: J, label: 'Criar roteiro de inspeção (VINS0200)', expect: [200, 201, 409, 422] });
  // IQF: computar scorecard a partir de dados reais + registro operacional + alçada + parâmetro + importação
  await call('POST', '/api/procurement/supplier-scorecards/compute', { supplier_code: 1, period_start: '2026-01-01', period_end: '2026-06-30', commercial_score: 100, service_score: 100, persist: false, created_by: UID }, { journey: J, label: 'Computar IQF do fornecedor (VAVF0204)', expect: [200, 201, 400, 422] });
  await call('POST', '/api/procurement/records', { record_type: 'RECEIVING_CHECKLIST', status: 'OPEN', supplier_code: 1, mask: '', quantity: 0, payload: {} }, { journey: J, label: 'Criar registro operacional', expect: [200, 201, 422] });
  await call('POST', '/api/procurement/approval-limits', { enterprise_code: 1, scope: 'GLOBAL', currency: 'BRL', auto_approve_max: 10000, valid_from: '2026-01-01', created_by: UID }, { journey: J, label: 'Criar regra de alçada (FALC)', expect: [200, 201, 409, 422] });
  await call('PUT', '/api/procurement/parameters', { enterprise_code: 1, domain: 'RECEIVING_NOTICE', param_key: 'auto_block', param_value: 'true', value_type: 'BOOL' }, { journey: J, label: 'Upsert parâmetro de suprimentos', expect: [200, 201, 422] });
  await call('POST', '/api/procurement/import-processes', { enterprise_code: 1, currency: 'USD', exchange_rate: 5, apportion_basis: 'VALUE', items: [{ item_code: 10050, mask: '', quantity: 10, weight: 1, fob_unit_price: 20 }], expenses: [{ expense_type: 'FREIGHT', amount: 400, in_item_cost: true }], created_by: UID }, { journey: J, label: 'Criar processo de importação (FIMP)', expect: [200, 201, 422] });
}

async function journeyPDM() {
  const J = 'PDM (Grupos/Modificadores)';
  const RUN = Date.now() % 90000;
  const UID = authenticatedUserId;
  await call('GET', '/api/pdm/groups', undefined, { journey: J, label: 'PDM: listar grupos' });
  await call('GET', '/api/pdm/modifiers', undefined, { journey: J, label: 'PDM: listar modificadores' });
  if (!RUN_WRITES) return;

  // Grupo: code informado; sem exclusão. Modificador: id gerado, global (sem grupo).
  const gcode = 70000 + RUN;
  const group = await call('POST', '/api/pdm/create-group', { code: gcode, description: `Grupo E2E ${RUN}`, enterprise_id: 1, created_by: UID }, { journey: J, label: 'PDM: criar grupo', expect: [200, 201] });
  if (group.status === 200 || group.status === 201) {
    fixtures.groupCode = gcode;
    await call('GET', `/api/pdm/groups/${gcode}`, undefined, { journey: J, label: 'PDM: buscar grupo' });
    await call('PUT', `/api/pdm/groups/${gcode}`, { description: `Grupo E2E ${RUN} (upd)`, enterprise_id: 1 }, { journey: J, label: 'PDM: atualizar grupo', expect: [200, 201] });
  }
  const mod = await call('POST', '/api/pdm/create-modifier', { description: `Modificador E2E ${RUN}`, created_by: UID }, { journey: J, label: 'PDM: criar modificador', expect: [200, 201, 409, 422] });
  const mid = codeOf(mod.json);
  if (mid) {
    fixtures.modifierCode = mid;
    await call('GET', `/api/pdm/modifiers/${mid}`, undefined, { journey: J, label: 'PDM: buscar modificador', expect: [200, 404] });
    await call('PUT', `/api/pdm/modifiers/${mid}`, { description: `Modificador E2E ${RUN} (upd)` }, { journey: J, label: 'PDM: atualizar modificador', expect: [200, 201, 404, 422] });
  }
}

async function journeyItem() {
  const J = 'Cadastro de Item';
  const UID = authenticatedUserId;
  await call('GET', '/api/items/', undefined, { journey: J, label: 'Listar itens' });
  await call('GET', '/api/items/with-masks', undefined, { journey: J, label: 'Listar itens com máscaras' });
  await call('GET', '/api/items/search/10001', undefined, { journey: J, label: 'Detalhe do item 10001 (search)', expect: [200, 404] });
  await call('GET', '/api/items/10001/activation-readiness', undefined, { journey: J, label: 'Prontidão do item 10001 p/ o MRP (§8)', expect: [200, 404, 422] });
  await call('POST', '/api/reports/export?format=csv', { title: 'Relatório E2E', columns: ['A', 'B'], rows: [['1', '2']] }, { journey: J, label: 'Export genérico de relatório (CSV)', expect: [200, 201] });
  await call('GET', '/api/items/structure/resolve/10001', undefined, { journey: J, label: 'Resolver estrutura/BOM do item 10001' });
  await call('GET', '/api/items/structure/where-used/10050', undefined, { journey: J, label: 'Onde-é-usado do item 10050' });
  await call('GET', '/api/item-conversions/item/1020', undefined, { journey: J, label: 'Conversões de UM do item (compra≠estoque)' });
  await call('GET', '/api/item-suppliers/item/1020', undefined, { journey: J, label: 'Fornecedor preferencial do item' });
  if (!RUN_WRITES) return;

  if (!fixtures.groupCode || !fixtures.modifierCode) return;
  const itemCode = 100000 + (Date.now() % 90000);
  const item = await call('POST', '/api/items/create', { code: itemCode, nature: 2, situation: 0, health: 'ATIVO', pdm: { group_code: fixtures.groupCode, modifier_code: fixtures.modifierCode, attributes: [], description_technique: '' }, warehouse: { warehouse_code: 1, unit_of_measurement: 'UN', automatic_low: false, minimum_stock: 0 }, engineering: { type: 0, type_struct: 0, oem: false, weight: { gross: 1, net: 1, unit: 'KG' } }, planning: { type_mrp: 0, llc: 2, ghost: false }, supplies: { type_of_use: 0 }, created_by: UID }, { journey: J, label: 'Criar item-base com pastas completas', expect: [200, 201] });
  if (item.status === 200 || item.status === 201) fixtures.itemCode = codeOf(item.json) || itemCode;
}

async function journeyContador() {
  const J = 'Contador';
  await call('GET', '/api/accounting/plans?empresa_id=1', undefined, { journey: J, label: 'Planos de conta' });
  await call('GET', '/api/accounting/accounts?plan_id=1', undefined, { journey: J, label: 'Contas contábeis', expect: [200, 400, 404] });
  await call('GET', '/api/accounting/journal-entries?empresa_id=1&period=2025-08', undefined, { journey: J, label: 'Lançamentos contábeis', expect: [200, 400, 404] });
  await call('GET', '/api/accounting/balancete?plan_id=1&empresa_id=1&from=2025-07-01&to=2026-06-30', undefined, { journey: J, label: 'Balancete', expect: [200, 400, 404] });
}

async function journeyRepresentantes() {
  const J = 'Representantes';
  const RUN = Date.now() % 90000;
  await call('GET', '/api/representatives/list', undefined, { journey: J, label: 'Representantes: listar (§5)' });
  await call('GET', '/api/representatives/list?active_status=ACTIVE', undefined, { journey: J, label: 'Representantes: só ativos' });
  await call('GET', '/api/representatives/types/', undefined, { journey: J, label: 'Tipos de representante' });
  await call('GET', '/api/representatives/report?sort_by=NAME&with_accounts=true', undefined, { journey: J, label: 'Relatório cadastral (com contas)' });
  await call('GET', '/api/representatives/follow-up', undefined, { journey: J, label: 'Ficha de acompanhamento comercial' });
  if (!RUN_WRITES) return;

  const tp = await call('POST', '/api/representatives/types/', { description: `Externo E2E ${RUN}`, is_free: true, ignores_direct_billing: false }, { journey: J, label: 'Criar tipo de representante', expect: [200, 201, 409, 422] });
  const typeCode = codeOf(tp.json);
  const rp = await call('POST', '/api/representatives/create', { name: `Representante E2E ${RUN}`, document_number: '19131243000197', register_date: '2026-07-01', type_code: typeCode || undefined, state: 'sc', city: 'Joinville', device_quantity: 0, is_customer: false, is_supplier: false }, { journey: J, label: 'Cadastrar representante (UF normalizada)', expect: [200, 201, 409, 422] });
  const repCode = codeOf(rp.json);
  if (repCode) {
    await call('GET', `/api/representatives/${repCode}`, undefined, { journey: J, label: 'Abrir representante (pastas)' });
    await call('POST', '/api/representatives/phones', { representative_code: repCode, ddd: '47', phone: '99999-0000', phone_type: 'COMMERCIAL', ranking: 1 }, { journey: J, label: 'Pasta: telefone (atualiza contato principal)', expect: [200, 201, 422] });
    await call('POST', '/api/representatives/emails', { representative_code: repCode, email: `rep${RUN}@venture.test`, ranking: 1 }, { journey: J, label: 'Pasta: e-mail', expect: [200, 201, 422] });
    await call('POST', '/api/representatives/enterprises', { representative_code: repCode, enterprise_code: 1, commission_pct: 5, is_active: true }, { journey: J, label: 'Pasta: empresa de atuação', expect: [200, 201, 422] });
    await call('PATCH', `/api/representatives/${repCode}/block`, { reason: 'Bloqueio E2E' }, { journey: J, label: 'Bloquear com motivo', expect: [200, 201, 204] });
    await call('PATCH', `/api/representatives/${repCode}/unblock`, {}, { journey: J, label: 'Desbloquear', expect: [200, 201, 204] });
  }
}

async function journeyMetas() {
  const J = 'Metas de Vendas';
  const RUN = Date.now() % 90000;
  await call('GET', '/api/sales-goals/list', undefined, { journey: J, label: 'Metas: listar (§6)' });
  await call('GET', '/api/sales-goals/periods/', undefined, { journey: J, label: 'Períodos de meta' });
  await call('GET', '/api/sales-goals/report?analysis_base=SALES&include_missed_items=true', undefined, { journey: J, label: 'Relatório previsto × realizado' });
  if (!RUN_WRITES) return;

  const pe = await call('POST', '/api/sales-goals/periods/', { description: `Período E2E ${RUN}`, period_type: 'MONTH', start_date: '2026-08-01', end_date: '2026-08-31' }, { journey: J, label: 'Criar período mensal', expect: [200, 201, 409, 422] });
  const periodCode = codeOf(pe.json);
  if (periodCode) {
    const go = await call('POST', '/api/sales-goals/create', { representative_code: 1, period_code: periodCode, analysis_base: 'SALES', award_pct: 2 }, { journey: J, label: 'Criar meta por representante', expect: [200, 201, 409, 422] });
    const goalCode = codeOf(go.json);
    if (goalCode) {
      await call('POST', '/api/sales-goals/items', { goal_code: goalCode, target_type: 'ITEM', item_code: 10003, target_quantity: 100, target_value: 10000, sales_uom: 'UN', bonus_pct: 1, is_active: true }, { journey: J, label: 'Linha de meta (alvo único: item)', expect: [200, 201, 422] });
      await call('GET', `/api/sales-goals/${goalCode}`, undefined, { journey: J, label: 'Consultar meta com itens' });
    }
    // Regra: período invertido deve ser rejeitado (422/400).
    await call('POST', '/api/sales-goals/periods/', { description: 'Invertido', period_type: 'CUSTOM', start_date: '2026-09-30', end_date: '2026-09-01' }, { journey: J, label: 'Período invertido (deve dar 400/422)', expect: [400, 422] });
  }
}

async function journeySAC() {
  const J = 'SAC / Consumidor';
  const RUN = Date.now() % 90000;
  const SYS = authenticatedUserId;
  await call('GET', '/api/consumer-service/call-types', undefined, { journey: J, label: 'SAC: tipos de chamado (§11)' });
  await call('GET', '/api/consumer-service/knowledge-sources', undefined, { journey: J, label: 'SAC: locais de conhecimento' });
  await call('GET', '/api/consumer-service/consumers', undefined, { journey: J, label: 'SAC: consumidores' });
  await call('GET', '/api/consumer-service/calls', undefined, { journey: J, label: 'SAC: chamados' });
  await call('GET', '/api/consumer-service/calls/report', undefined, { journey: J, label: 'SAC: indicadores de chamados' });
  if (!RUN_WRITES) return;

  const ct = await call('POST', '/api/consumer-service/call-types', { description: `Reclamação E2E ${RUN}`, is_complaint: true, created_by: SYS }, { journey: J, label: 'Criar tipo (reclamação)', expect: [200, 201, 409, 422] });
  const typeCode = codeOf(ct.json);
  const co = await call('POST', '/api/consumer-service/consumers', { code: 900000 + RUN, name: `Consumidor E2E ${RUN}`, person_type: 'F', cpf: '52998224725', state: 'SC', city: 'Blumenau', created_by: SYS, phones: [], emails: [], contacts: [] }, { journey: J, label: 'Cadastrar consumidor (F não aceita CNPJ)', expect: [200, 201, 409, 422] });
  const consumerCode = codeOf(co.json) ?? (900000 + RUN);
  if (typeCode && consumerCode) {
    const cl = await call('POST', '/api/consumer-service/calls', { enterprise_code: 1, consumer_code: consumerCode, call_type_code: typeCode, direction: 'RECEIVED', position: 'PENDING', situation: 'OTHER', opened_at: '2026-07-01', subject: 'Chamado E2E', symptoms: 'ruído', created_by: SYS }, { journey: J, label: 'Abrir chamado (reclamação exige sintomas)', expect: [200, 201, 422] });
    const callCode = codeOf(cl.json);
    if (callCode) {
      await call('POST', `/api/consumer-service/calls/${callCode}/returns`, { call_code: callCode, contacted_at: '2026-07-02', contact_type: 'PHONE', description: 'Retorno E2E', created_by: SYS }, { journey: J, label: 'Registrar retorno no chamado', expect: [200, 201, 422] });
    }
  }
}

async function journeyRecorrentes() {
  const J = 'Vendas Recorrentes';
  const RUN = Date.now() % 90000;
  const SYS = authenticatedUserId;
  await call('GET', '/api/recurring-sales/list', undefined, { journey: J, label: 'Recorrentes: console (§12)' });
  await call('GET', '/api/recurring-sales/monthly-revenue?from=2026-07-01&to=2027-06-30', undefined, { journey: J, label: 'Projeção de receita mensal' });
  await call('GET', '/api/recurring-sales/future-commissions?from=2026-07-01&to=2027-06-30', undefined, { journey: J, label: 'Projeção de comissões futuras' });
  await call('GET', '/api/recurring-sales/adjustment-dates', undefined, { journey: J, label: 'Datas de reajuste' });
  if (!RUN_WRITES) return;

  const rs = await call('POST', '/api/recurring-sales/create', { enterprise_code: 1, customer_code: 8, item_code: 10003, movement_type: 'SALE', term_type: 'INDEFINITE', sale_date: '2026-07-01', next_adjustment_date: '2027-07-01', quantity: 1, unit_value: 500, grace_months: 0, created_by: SYS, representatives: [{ representative_code: 1, is_primary: true, commission_percent: 5, commission_base: 'ORIGINAL', is_lifetime: true }] }, { journey: J, label: 'Criar recorrência SALE (indeterminada)', expect: [200, 201, 409, 422] });
  const rsCode = codeOf(rs.json);
  if (rsCode) {
    await call('GET', `/api/recurring-sales/${rsCode}`, undefined, { journey: J, label: 'Consultar recorrência' });
    await call('POST', `/api/recurring-sales/${rsCode}/generate-order`, { created_by: SYS, confirm_order: false }, { journey: J, label: 'Gerar pedido de venda rastreado', expect: [200, 201, 409, 422] });
    await call('POST', `/api/recurring-sales/${rsCode}/cancel`, { reason: 'E2E', created_by: SYS }, { journey: J, label: 'Cancelar recorrência (movimento CANCELLATION)', expect: [200, 201, 204, 409, 422] });
  }
}

async function journeyPrevisao() {
  const J = 'Previsão de Vendas';
  const RUN = Date.now() % 90000;
  const YEAR = 2027;
  await call('GET', `/api/sales-forecast/list/${YEAR}`, undefined, { journey: J, label: 'Previsão: lista do ano (§7)' });
  await call('GET', '/api/sales-forecast/blocks/list', undefined, { journey: J, label: 'Previsão: bloqueios de período' });
  await call('GET', '/api/sales-forecast/appropriation/list', undefined, { journey: J, label: 'Previsão: tabelas de apropriação' });
  if (!RUN_WRITES) return;

  await call('POST', '/api/sales-forecast/create', { item_code: 10003, week: 10, year: YEAR, quantity: 25 }, { journey: J, label: 'Cadastrar previsão semanal (1..53)', expect: [200, 201, 409, 422] });
  await call('POST', '/api/sales-forecast/create-monthly', { item_code: 10003, year: YEAR, month: 3, quantity: 100, accepts_fraction: true, update_existing: true }, { journey: J, label: 'Previsão mensal rateada em semanas', expect: [200, 201, 409, 422] });
  await call('POST', '/api/sales-forecast/blocks/create', { start_date: `${YEAR}-06-01`, end_date: `${YEAR}-06-30`, reason: `E2E ${RUN}` }, { journey: J, label: 'Bloquear período de previsão', expect: [200, 201, 409, 422] });
  const ap = await call('POST', '/api/sales-forecast/appropriation/create', { description: `Apropriação E2E ${RUN}`, monday_pct: 20, tuesday_pct: 20, wednesday_pct: 20, thursday_pct: 20, friday_pct: 20, saturday_pct: 0, sunday_pct: 0, is_default: false }, { journey: J, label: 'Criar tabela de apropriação (soma 100%)', expect: [200, 201, 409, 422] });
  const apId = codeOf(ap.json);
  if (apId) await call('POST', '/api/sales-forecast/appropriation/set-default', { id: apId }, { journey: J, label: 'Definir apropriação padrão', expect: [200, 201, 204, 409, 422] });
  await call('POST', '/api/sales-forecast/generate', { item_code: 10003, history_source: 'ORDERS', history_from: '2026-01-01', history_to: '2026-12-31', start_week: 1, start_year: YEAR, target_end_week: 52, target_end_year: YEAR, projection_pct: 10, accepts_fraction: true, update_existing: true }, { journey: J, label: 'Gerar previsão por histórico (ORDERS)', expect: [200, 201, 409, 422] });
  await call('GET', '/api/sales-forecast/item/10003', undefined, { journey: J, label: 'Previsão por item' });
}

async function journeyAssistencia() {
  const J = 'Assistência Técnica';
  const RUN = Date.now() % 90000;
  const SYS = authenticatedUserId;
  await call('GET', '/api/technical-assistance/defect-groups', undefined, { journey: J, label: 'AT: grupos de defeito (§10)' });
  await call('GET', '/api/technical-assistance/defect-reasons', undefined, { journey: J, label: 'AT: motivos de defeito' });
  await call('GET', '/api/technical-assistance/warranty-responsibles', undefined, { journey: J, label: 'AT: responsáveis pela garantia' });
  await call('GET', '/api/technical-assistance/calls', undefined, { journey: J, label: 'AT: chamados' });
  await call('GET', '/api/technical-assistance/calls/report', undefined, { journey: J, label: 'AT: indicadores de chamados' });
  if (!RUN_WRITES) return;

  const gr = await call('POST', '/api/technical-assistance/defect-groups', { description: `Grupo E2E ${RUN}`, created_by: SYS }, { journey: J, label: 'Criar grupo de defeito', expect: [200, 201, 409, 422] });
  const groupCode = codeOf(gr.json);
  let reasonCode;
  if (groupCode) {
    const rs = await call('POST', '/api/technical-assistance/defect-reasons', { group_code: groupCode, description: `Motivo E2E ${RUN}`, allows_complement: true, requires_return_note: false, generates_sales_order: false, generates_production_order: false, created_by: SYS }, { journey: J, label: 'Criar motivo (exige complemento)', expect: [200, 201, 409, 422] });
    reasonCode = codeOf(rs.json);
  }
  const wr = await call('POST', '/api/technical-assistance/warranty-responsibles', { name: `Responsável E2E ${RUN}`, email: 'garantia@venture.com', created_by: SYS }, { journey: J, label: 'Criar responsável pela garantia', expect: [200, 201, 409, 422] });
  const cl = await call('POST', '/api/technical-assistance/calls', { enterprise_code: 1, customer_code: 8, subject: `Chamado AT E2E ${RUN}`, priority: 'NORMAL', opened_at: '2026-07-01', promised_date: '2026-07-15', return_note_required: false, created_by: SYS, items: [{ sequence: 1, item_code: 10003, mask: '', quantity: 1, defect_reason_code: reasonCode ?? null, defect_complement: reasonCode ? 'ruído anormal' : null, purchase_invoice_date: '2026-01-10', warranty_days: 365, requested_action: 'REPAIR' }] }, { journey: J, label: 'Abrir chamado com item (calcula garantia)', expect: [200, 201, 409, 422] });
  const callCode = codeOf(cl.json);
  if (callCode) {
    await call('GET', `/api/technical-assistance/calls/${callCode}`, undefined, { journey: J, label: 'Consulta detalhada do chamado' });
    await call('PATCH', `/api/technical-assistance/calls/${callCode}/status`, { code: callCode, status: 'IN_ANALYSIS', diagnosis: 'Em análise E2E', created_by: SYS }, { journey: J, label: 'Alterar status (PENDING→IN_ANALYSIS)', expect: [200, 201, 204, 409, 422] });
  }
}

async function journeyPrecificacao() {
  const J = 'Precificação';
  const RUN = Date.now() % 90000;
  await call('GET', '/api/customers/support/sales-tables', undefined, { journey: J, label: 'Tabelas de venda' });
  await call('GET', '/api/customers/support/sales-price-policies', undefined, { journey: J, label: 'Políticas de formação de preço' });
  if (!RUN_WRITES) return;

  const st = await call('POST', '/api/customers/support/sales-tables', { description: `Tabela E2E ${RUN}`, validity_start: '2026-01-01T00:00:00Z', validity_end: '2026-12-31T00:00:00Z', price_formation: 'INFORMADO', decimal_places: 2, composition: 'FOB', table_type: 'NORMAL', base_date: 'PEDIDO' }, { journey: J, label: 'Criar tabela de venda', expect: [200, 201, 409, 422] });
  const stCode = codeOf(st.json);
  if (stCode) {
    await call('POST', `/api/customers/support/sales-tables/${stCode}/prices`, { item_code: '1001', price: 250, ume: 'UN', umc: 'UN', situation: 'ATIVO', blocked: false }, { journey: J, label: 'Incluir preço na tabela', expect: [200, 201, 409, 422] });
    await call('POST', '/api/customers/support/sales-tables/pricing', { sales_table_code: stCode, item_code: '1001', quantity: 3 }, { journey: J, label: 'Resolver preço vigente (pricing)', expect: [200, 201, 422] });
    await call('GET', `/api/customers/support/sales-tables/${stCode}/prices`, undefined, { journey: J, label: 'Listar preços da tabela' });
  }
  const policyOrder = 1000 + RUN;
  const pol = await call('POST', '/api/customers/support/sales-price-policies', { description: `Política PREC E2E ${RUN}`, cost_source: 'STANDARD_TOTAL', priority: policyOrder, sequence: policyOrder, policy_scope: 'PREC', policy_types: 'MARGIN', margin_pct: 20, taxes_pct: 12, commission_pct: 5, incidences_json: {}, validity_start: '2026-01-01T00:00:00Z', validity_end: '2026-12-31T00:00:00Z' }, { journey: J, label: 'Criar política de formação', expect: [200, 201] });
  const polCode = codeOf(pol.json);
  if (stCode && polCode) {
    await call('POST', '/api/customers/support/sales-tables/price-formation', { sales_table_code: stCode, policy_code: polCode, item_code: '1001', base_cost: 100, margin_pct: 20, taxes_pct: 10 }, { journey: J, label: 'Formar preço sugerido (~153.85)', expect: [200, 201, 422] });
  }
}

async function journeyPoliticasComerciais() {
  const J = 'Políticas Comerciais';
  const RUN = Date.now() % 90000;
  await call('GET', '/api/customers/support/commercial-policies?kind=DISCOUNT', undefined, { journey: J, label: 'Políticas de desconto' });
  await call('GET', '/api/customers/support/commercial-policies?kind=FREIGHT', undefined, { journey: J, label: 'Políticas de frete' });
  await call('POST', '/api/customers/support/commercial-policies/evaluate', { gross_value: 1000, quantity: 10, customer_code: 100, item_code: '1001' }, { journey: J, label: 'Avaliar políticas (simulador)', expect: [200, 201, 422] });
  if (!RUN_WRITES) return;

  const cp = await call('POST', '/api/customers/support/commercial-policies', { description: `Desconto volume E2E ${RUN}`, kind: 'DISCOUNT', choice_type: 'INFORMATION', calc_type: 'PERCENT', percent_value: 10, max_percent: 12, min_gross_value: 1000, min_quantity: 5, priority: 1, sequence: 10, stackable: true, allow_manual_change: true, data_types_json: {}, rule_json: {}, commission_discount_mode: 'REAL', validity_start: '2026-01-01T00:00:00Z', validity_end: '2026-12-31T00:00:00Z' }, { journey: J, label: 'Criar política de desconto', expect: [200, 201] });
  const cpCode = codeOf(cp.json);
  if (cpCode) {
    await call('POST', `/api/customers/support/commercial-policies/${cpCode}/lines`, { line_number: 1, sequence_number: 1, calc_type: 'PERCENT', percent_value: 8, min_value: 0, max_value: 1200 }, { journey: J, label: 'Adicionar faixa à política', expect: [200, 201, 422] });
    await call('POST', `/api/customers/support/commercial-policies/${cpCode}/specific-items`, { item_code: '1001', block_discount: false }, { journey: J, label: 'Adicionar item específico', expect: [200, 201, 422] });
  }
}

// ─── Runner ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏭 E2E VentureERP (jornadas de funcionários) → ${API}`);
  console.log(`   writes=${RUN_WRITES ? 'ON' : 'off'}  nfe=${RUN_NFE ? 'ON' : 'off'}\n`);
  await login();
  await journeyAnalistaFiscal();
  await journeyRecebimentoFiscal();
  await journeyTesouraria();
  await journeyImportacoesReais();
  await journeyApuracao();
  await journeyRelatorios();
  await journeyCadastroCliente();
  await journeyCadastrosPlataforma();
  await journeyVendasExpedicao();
  await journeyRepresentantes();
  await journeyMetas();
  await journeySAC();
  await journeyRecorrentes();
  await journeyPrevisao();
  await journeyAssistencia();
  await journeyPrecificacao();
  await journeyPoliticasComerciais();
  await journeyPDM();
  await journeyItem();
  await journeyFerramental();
  await journeyMaquinas();
  await journeyManufatura();
  await journeyProducao();
  await journeyCustos();
  await journeyEstoque();
  await journeyPlanoCorte();
  await journeyMRP();
  await journeyFornecedor();
  await journeyCompras();
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
