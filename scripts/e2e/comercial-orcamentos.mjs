#!/usr/bin/env node
/**
 * E2E smoke test — Orçamento de Venda (VVND0300) e Parâmetros (VVND0310)
 * ---------------------------------------------------------------------------
 * Percorre a jornada completa do vendedor usando exatamente as rotas, os corpos
 * e os nomes de campo que `salesQuotationService.ts` usa. Além de conferir o
 * status HTTP, valida o CONTRATO EM TEMPO DE EXECUÇÃO: cada resposta é checada
 * contra a lista de campos que o parser do front-end lê, e as regras de negócio
 * do backend v1.1.0 são exercitadas de verdade (motivo obrigatório, motivo com
 * complemento, descancelamento com o mesmo motivo, DAV travando documentos,
 * sequência única de item, condição de pagamento livre).
 *
 * Uso:
 *   node scripts/e2e/comercial-orcamentos.mjs                # só leituras
 *   RUN_WRITES=1 node scripts/e2e/comercial-orcamentos.mjs   # jornada completa
 *   RUN_CONVERT=1 RUN_WRITES=1 …                             # também converte em pedido
 *
 * Variáveis de ambiente:
 *   API_URL   (default http://localhost:5072 — ambiente demo)
 *   EMAIL     (default admin@panossoerp.demo)
 *   PASSWORD  (default Demo@12345)
 */

const API = (process.env.API_URL ?? 'http://localhost:5072').replace(/\/$/, '');
const EMAIL = process.env.EMAIL ?? 'admin@panossoerp.demo';
const PASSWORD = process.env.PASSWORD ?? 'Demo@12345';
const RUN_WRITES = process.env.RUN_WRITES === '1';
const RUN_CONVERT = process.env.RUN_CONVERT === '1';
const BASE = '/api/sales-quotation';

let token = '';
const results = [];
const fx = {};

/** Campos que cada parser do serviço lê — a resposta precisa trazê-los. */
const PARSER_FIELDS = {
  quotation: ['code', 'quotation_number', 'status', 'quotation_type', 'emission_date', 'digit_date',
    'currency_code', 'probability_pct', 'commission_pct', 'is_nfce', 'delivery_with_receipt',
    'release_status', 'commercial_blocked', 'verify_freight', 'freight_value', 'redelivery_freight_value',
    'insurance_value', 'discount_value', 'surcharge_value', 'retained_tax_value', 'total_gross', 'total_net',
    'is_active', 'can_print_fiscal_receipt', 'can_print_sales_order', 'can_send_email', 'can_print_dav_report'],
  item: ['code', 'sales_quotation_code', 'sequence', 'item_code', 'requested_qty', 'unit_price',
    'attended_qty', 'cancelled_qty', 'balance', 'discount_pct', 'ipi_pct', 'st_pct',
    'total_gross', 'total_net', 'total_net_with_ipi', 'status', 'is_active'],
  report: ['total_quotations', 'total_gross', 'total_net', 'open_count', 'approved_count',
    'converted_count', 'cancelled_count', 'expired_count', 'weighted_net', 'retained_tax'],
  parameters: ['enterprise_code', 'purchase_order_prompt', 'delivery_authorization_prompt',
    'allow_service_items_nfce', 'default_nfce', 'minimum_cif_freight', 'add_redelivery_to_freight'],
  commission: ['id', 'code', 'description', 'commission_pct', 'invoice_pct', 'payment_pct', 'is_active'],
  reason: ['id', 'code', 'description', 'allow_uncancel', 'require_complement', 'is_active'],
  event: ['id', 'sales_quotation_code', 'event_type', 'reason', 'event_date', 'created_at'],
  attachment: ['id', 'sales_quotation_code', 'file_name', 'content_type', 'file_size', 'storage_key', 'uploaded_at'],
};

function record(label, ok, status, note = '') {
  results.push({ label, ok, status, note });
  return ok;
}

function rows(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'items', 'results', 'records']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

async function call(method, path, body, { expect = [200, 201, 204], label = '', raw = false, headers = {} } = {}) {
  if (!RUN_WRITES && method !== 'GET') return { status: 0, json: null, skipped: true };
  const opts = { method, headers: { ...headers } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }

  let status = 0, json = null, text = '', buffer = null;
  try {
    const res = await fetch(`${API}${path}`, opts);
    status = res.status;
    if (raw) buffer = Buffer.from(await res.arrayBuffer());
    else { text = await res.text(); try { json = text ? JSON.parse(text) : null; } catch { /* não-JSON */ } }
  } catch (e) {
    record(label || `${method} ${path}`, false, 'ERR', e.message);
    return { status: 0, json: null };
  }
  const ok = expect.includes(status);
  let note = '';
  if (!ok) note = (text || '').slice(0, 160);
  else if (Array.isArray(json)) note = `${json.length} registro(s)`;
  record(label || `${method} ${path}`, ok, status, note);
  return { status, json, text, buffer, ok };
}

/** Confere que a resposta traz todos os campos que o parser do front-end lê. */
function assertShape(label, payload, kind) {
  const obj = Array.isArray(payload) ? payload[0] : payload;
  if (!obj) return record(`${label} — contrato`, true, '—', 'sem registros para conferir');
  const missing = PARSER_FIELDS[kind].filter((f) => !(f in obj));
  return record(`${label} — contrato`, missing.length === 0, missing.length ? 'DIFF' : 'OK',
    missing.length ? `campo(s) ausente(s): ${missing.join(', ')}` : `${PARSER_FIELDS[kind].length} campos`);
}

/** Confere que uma regra do backend REJEITA o que deve rejeitar. */
async function expectRejection(label, method, path, body) {
  if (!RUN_WRITES) return;
  const r = await call(method, path, body, { expect: [400, 403, 404, 409, 422, 500], label });
  if (r.status >= 200 && r.status < 300) {
    results[results.length - 1].ok = false;
    results[results.length - 1].note = 'backend ACEITOU o que deveria recusar';
  }
}

async function login() {
  try {
    const res = await fetch(`${API}/users/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    const json = await res.json().catch(() => null);
    token = json?.token ?? json?.access_token ?? json?.data?.token ?? '';
    record('POST /users/login', res.status === 200 && !!token, res.status, token ? 'token OK' : 'sem token');
  } catch (e) {
    record('POST /users/login', false, 'ERR', e.message);
  }
  return !!token;
}

/**
 * Sem credenciais dá para verificar a coisa mais importante do deploy: se a
 * versão publicada tem TODAS as rotas que o serviço do front chama. Rota que
 * existe responde 401 (falta token); rota que não existe responde 404.
 */
async function sondarRotas() {
  const routes = [
    ['GET', `${BASE}/parameters`], ['PUT', `${BASE}/parameters`],
    ['GET', `${BASE}/commission-patterns`], ['POST', `${BASE}/commission-patterns`],
    ['GET', `${BASE}/cancellation-reasons`], ['POST', `${BASE}/cancellation-reasons`],
    ['POST', `${BASE}/create`], ['GET', `${BASE}/list`], ['GET', `${BASE}/report`],
    ['GET', `${BASE}/1`], ['PUT', `${BASE}/1`], ['DELETE', `${BASE}/1/cancel`],
    ['POST', `${BASE}/1/attend`], ['POST', `${BASE}/1/uncancel`],
    ['PATCH', `${BASE}/1/status`], ['PATCH', `${BASE}/1/release`],
    ['GET', `${BASE}/1/events`], ['POST', `${BASE}/1/convert-to-order`],
    ['POST', `${BASE}/1/dav`],
    ['GET', `${BASE}/1/attachments`], ['POST', `${BASE}/1/attachments`],
    ['GET', `${BASE}/1/attachments/1`], ['DELETE', `${BASE}/1/attachments/1`],
    ['POST', `${BASE}/items/create`], ['GET', `${BASE}/items/1`],
    ['PUT', `${BASE}/items/1`], ['DELETE', `${BASE}/items/1/cancel`],
  ];
  for (const [method, path] of routes) {
    let status = 0;
    try { status = (await fetch(`${API}${path}`, { method })).status; } catch { status = 0; }
    record(`rota ${method} ${path.replace(/\/1\b/g, '/{code}')}`, status !== 404 && status !== 0, status,
      status === 404 ? 'rota AUSENTE nesta versão do backend' : status === 0 ? 'sem resposta' : 'publicada');
  }
}

const today = () => new Date().toISOString().slice(0, 10);

// ─── Jornadas ────────────────────────────────────────────────────────────────

async function cadastrosDeApoio() {
  const params = await call('GET', `${BASE}/parameters`, undefined, { label: 'GET parâmetros' });
  if (params.json) { assertShape('parâmetros', params.json, 'parameters'); fx.params = params.json; }

  const reasons = await call('GET', `${BASE}/cancellation-reasons`, undefined, { label: 'GET motivos de cancelamento' });
  if (reasons.json?.length) assertShape('motivos', reasons.json, 'reason');
  fx.reasons = reasons.json ?? [];

  const patterns = await call('GET', `${BASE}/commission-patterns`, undefined, { label: 'GET padrões de comissão' });
  if (patterns.json?.length) assertShape('padrões de comissão', patterns.json, 'commission');

  if (!RUN_WRITES) return;

  // Regrava os parâmetros lidos (idempotente) — valida o PUT sem mudar nada.
  const saved = await call('PUT', `${BASE}/parameters`, {
    purchase_order_prompt: fx.params?.purchase_order_prompt || 'Ordem de Compra',
    delivery_authorization_prompt: fx.params?.delivery_authorization_prompt || 'Autorização de Entr.',
    final_consumer_customer_code: fx.params?.final_consumer_customer_code ?? null,
    allow_service_items_nfce: !!fx.params?.allow_service_items_nfce,
    default_nfce: !!fx.params?.default_nfce,
    minimum_cif_freight: fx.params?.minimum_cif_freight ?? '0',
    add_redelivery_to_freight: !!fx.params?.add_redelivery_to_freight,
  }, { label: 'PUT parâmetros (idempotente)' });
  if (saved.json) assertShape('parâmetros gravados', saved.json, 'parameters');

  // Rótulos em branco são recusados pelo Validate() da entidade.
  await expectRejection('PUT parâmetros com rótulo vazio deve falhar', 'PUT', `${BASE}/parameters`,
    { purchase_order_prompt: '', delivery_authorization_prompt: '', minimum_cif_freight: '0' });

  // Padrão de comissão com código automático (backend gera pela sequência).
  const pattern = await call('POST', `${BASE}/commission-patterns`,
    { code: 0, description: 'E2E comissão', commission_pct: '10', invoice_pct: '6', payment_pct: '4' },
    { label: 'POST padrão de comissão (código automático)' });
  if (pattern.json) {
    assertShape('padrão gravado', pattern.json, 'commission');
    record('código de comissão gerado pelo backend', Number(pattern.json.code) > 0, 'OK', `code=${pattern.json.code}`);
  }
  // invoice + payment != commission precisa ser recusado.
  await expectRejection('POST comissão desbalanceada deve falhar', 'POST', `${BASE}/commission-patterns`,
    { code: 0, description: 'E2E inválida', commission_pct: '10', invoice_pct: '5', payment_pct: '4' });

  // Motivos usados no resto da jornada.
  fx.reasonD = (await call('POST', `${BASE}/cancellation-reasons`,
    { code: 9901, description: 'E2E desistência do cliente', allow_uncancel: true, require_complement: false },
    { label: 'POST motivo D (permite descancelar)' })).json;
  fx.reasonC = (await call('POST', `${BASE}/cancellation-reasons`,
    { code: 9902, description: 'E2E erro operacional', allow_uncancel: false, require_complement: true },
    { label: 'POST motivo C (exige complemento)' })).json;
  await expectRejection('POST motivo sem descrição deve falhar', 'POST', `${BASE}/cancellation-reasons`,
    { code: 9903, description: '   ' });
}

async function listagemERelatorio() {
  const list = await call('GET', `${BASE}/list?limit=5&offset=0`, undefined, { label: 'GET lista (limit/offset)' });
  if (list.json?.length) { assertShape('lista', list.json, 'quotation'); fx.anyQuotation = list.json[0]; }

  await call('GET', `${BASE}/list?status=OV&quotation_type=VENDA&from=2000-01-01&to=${today()}`, undefined,
    { label: 'GET lista (status/tipo/período)' });
  await call('GET', `${BASE}/list?limit=9999`, undefined, { label: 'GET lista (limit acima do teto → 100)' });

  const report = await call('GET', `${BASE}/report`, undefined, { label: 'GET relatório' });
  if (report.json) assertShape('relatório', report.json, 'report');
}

async function cicloDoOrcamento() {
  if (!RUN_WRITES) return;

  // Cliente para a proposta: reaproveita um orçamento existente ou busca no cadastro.
  let customer = fx.anyQuotation?.customer_code;
  if (!customer) {
    const customers = await call('GET', '/api/customers', undefined, { label: 'GET clientes (fixture)' });
    customer = customers.json?.[0]?.code ?? customers.json?.[0]?.Code;
  }
  if (!customer) { record('fixture de cliente', false, '—', 'sem cliente cadastrado — jornada de escrita abortada'); return; }

  // enterprise_code omitido de propósito: o backend assume o tenant do login.
  const created = await call('POST', `${BASE}/create`, {
    status: 'OV', quotation_type: 'VENDA', currency_code: 'BRL',
    emission_date: today(), valid_until: today(),
    customer_code: customer, probability_pct: '80', commission_pct: '0',
    is_nfce: false, delivery_with_receipt: false, release_status: 'RELEASED',
    freight_value: '0', redelivery_freight_value: '0', insurance_value: '0',
    discount_value: '0', surcharge_value: '0', retained_tax_value: '0',
    notes: 'Orçamento criado pelo smoke test E2E',
  }, { expect: [201], label: 'POST criar orçamento' });
  if (!created.json?.code) { record('fixture de orçamento', false, '—', 'não foi possível criar'); return; }
  fx.code = created.json.code;
  assertShape('orçamento criado', created.json, 'quotation');
  record('status padrão do novo orçamento é OV', created.json.status === 'OV', 'OK', `status=${created.json.status}`);
  record('backend assumiu a empresa do login', Number(created.json.enterprise_code) > 0, 'OK', `enterprise=${created.json.enterprise_code}`);

  // Compatibilidade instalada: o middleware ignora/substitui a empresa enviada
  // e a resposta precisa continuar pertencendo ao tenant autenticado.
  const tenantGuard = await call('POST', `${BASE}/create`,
    { enterprise_code: Number(created.json.enterprise_code) + 777, customer_code: customer, quotation_type: 'VENDA' },
    { expect: [201], label: 'POST com empresa externa é reescrito para o tenant' });
  record('empresa externa não altera o tenant do orçamento', Number(tenantGuard.json?.enterprise_code) === Number(created.json.enterprise_code), 'OK', `enterprise=${tenantGuard.json?.enterprise_code}`);
  // Tipo de frete fora da lista tem de ser recusado.
  await expectRejection('POST com freight_type inválido deve falhar', 'POST', `${BASE}/create`,
    { customer_code: customer, quotation_type: 'VENDA', freight_type: 'FRETE_MALUCO' });

  // ── Itens ────────────────────────────────────────────────────────────────
  const items = await call('GET', '/api/items', undefined, { label: 'GET itens (fixture)' });
  const availableItems = rows(items.json);
  const itemCode = availableItems[0]?.code ?? availableItems[0]?.Code;
  if (itemCode) {
    const item = await call('POST', `${BASE}/items/create`, {
      sales_quotation_code: fx.code, sequence: 1, item_code: itemCode, mask: '',
      sales_uom: 'UN', requested_qty: '10', unit_price: '100', discount_pct: '10',
      ipi_pct: '5', st_pct: '0',
    }, { expect: [201], label: 'POST incluir item' });
    if (item.json) {
      fx.itemCode = item.json.code;
      assertShape('item criado', item.json, 'item');
      record('total líquido = bruto − desconto', Number(item.json.total_net) === 900, 'OK', `total_net=${item.json.total_net}`);
      record('saldo aberto = solicitado', Number(item.json.balance) === 10, 'OK', `balance=${item.json.balance}`);
    }
    // Sequência duplicada precisa ser recusada (é o que a tela contorna no retry).
    await expectRejection('POST item com sequência repetida deve falhar', 'POST', `${BASE}/items/create`,
      { sales_quotation_code: fx.code, sequence: 1, item_code: itemCode, requested_qty: '1', unit_price: '1' });
    await expectRejection('POST item com quantidade zero deve falhar', 'POST', `${BASE}/items/create`,
      { sales_quotation_code: fx.code, sequence: 2, item_code: itemCode, requested_qty: '0', unit_price: '1' });

    const listItems = await call('GET', `${BASE}/items/${fx.code}`, undefined, { label: 'GET itens do orçamento' });
    if (listItems.json?.length) assertShape('lista de itens', listItems.json, 'item');

    if (fx.itemCode) {
      const updated = await call('PUT', `${BASE}/items/${fx.itemCode}`, {
        requested_qty: '10', unit_price: '100', attended_qty: '4', cancelled_qty: '0',
        discount_pct: '10', ipi_pct: '5', st_pct: '0',
      }, { label: 'PUT atualizar item (atendimento parcial)' });
      if (updated.json) {
        record('item parcial vira PARTIAL', updated.json.status === 'PARTIAL', 'OK', `status=${updated.json.status}`);
        record('saldo desconta o atendido', Number(updated.json.balance) === 6, 'OK', `balance=${updated.json.balance}`);
      }
      await expectRejection('PUT item com atendido+cancelado > solicitado deve falhar', 'PUT', `${BASE}/items/${fx.itemCode}`,
        { requested_qty: '10', unit_price: '100', attended_qty: '8', cancelled_qty: '5' });
    }
  } else {
    record('fixture de item', false, '—', 'sem item cadastrado — parte de itens pulada');
  }

  // ── Capa ─────────────────────────────────────────────────────────────────
  const detail = await call('GET', `${BASE}/${fx.code}`, undefined, { label: 'GET orçamento com itens' });
  if (detail.json) {
    assertShape('detalhe', detail.json, 'quotation');
    record('detalhe traz os itens embutidos', Array.isArray(detail.json.items), 'OK', `${detail.json.items?.length ?? 0} item(ns)`);
  }

  const updatedHeader = await call('PUT', `${BASE}/${fx.code}`, {
    ...detail.json, valid_until: today(), notes: 'Capa atualizada pelo E2E', freight_type: 'CIF PROPRIO',
    verify_freight: true, freight_value: '0',
  }, { label: 'PUT atualizar capa' });
  if (updatedHeader.json) assertShape('capa atualizada', updatedHeader.json, 'quotation');

  // Trocar status/liberação pelo PUT é proibido — a tela usa endpoints próprios.
  await expectRejection('PUT trocando status deve falhar', 'PUT', `${BASE}/${fx.code}`,
    { ...detail.json, status: 'A' });
  await expectRejection('PUT trocando release_status deve falhar', 'PUT', `${BASE}/${fx.code}`,
    { ...detail.json, release_status: 'BLOCKED' });

  // ── Situação ─────────────────────────────────────────────────────────────
  await call('PATCH', `${BASE}/${fx.code}/status`, { status: 'OA' }, { expect: [204], label: 'PATCH status OV → OA' });
  await call('PATCH', `${BASE}/${fx.code}/status`, { status: 'OV' }, { expect: [204], label: 'PATCH status OA → OV' });
  await expectRejection('PATCH status para CANCELLED deve falhar', 'PATCH', `${BASE}/${fx.code}/status`, { status: 'CANCELLED' });
  await expectRejection('PATCH status inexistente deve falhar', 'PATCH', `${BASE}/${fx.code}/status`, { status: 'ZZ' });

  await call('PATCH', `${BASE}/${fx.code}/release`, { release_status: 'BLOCKED', reason: 'Bloqueio E2E' },
    { expect: [204], label: 'PATCH bloquear' });
  const blocked = await call('GET', `${BASE}/${fx.code}`, undefined, { label: 'GET após bloqueio' });
  record('bloqueio liga commercial_blocked', blocked.json?.commercial_blocked === true, 'OK',
    `release=${blocked.json?.release_status} blocked=${blocked.json?.commercial_blocked}`);
  await expectRejection('converter orçamento bloqueado deve falhar', 'POST', `${BASE}/${fx.code}/convert-to-order`, {});
  await expectRejection('PATCH liberação sem motivo deve falhar', 'PATCH', `${BASE}/${fx.code}/release`,
    { release_status: 'RELEASED', reason: '  ' });
  await call('PATCH', `${BASE}/${fx.code}/release`, { release_status: 'MANUAL_RELEASED', reason: 'Liberação E2E' },
    { expect: [204], label: 'PATCH liberar manualmente' });

  // ── Anexos ───────────────────────────────────────────────────────────────
  const form = new FormData();
  form.append('file', new Blob(['conteudo de teste do anexo'], { type: 'text/plain' }), 'e2e-anexo.txt');
  const attachment = await call('POST', `${BASE}/${fx.code}/attachments`, form, { expect: [201], label: 'POST anexo (multipart)' });
  if (attachment.json) {
    assertShape('anexo', attachment.json, 'attachment');
    const list = await call('GET', `${BASE}/${fx.code}/attachments`, undefined, { label: 'GET anexos' });
    if (list.json?.length) assertShape('lista de anexos', list.json, 'attachment');
    const download = await call('GET', `${BASE}/${fx.code}/attachments/${attachment.json.id}`, undefined,
      { label: 'GET baixar anexo', raw: true });
    record('conteúdo do anexo confere', download.buffer?.toString() === 'conteudo de teste do anexo', 'OK',
      `${download.buffer?.length ?? 0} byte(s)`);
    await call('DELETE', `${BASE}/${fx.code}/attachments/${attachment.json.id}`, undefined,
      { expect: [204], label: 'DELETE anexo' });
  }

  // ── DAV ──────────────────────────────────────────────────────────────────
  const dav = await call('POST', `${BASE}/${fx.code}/dav`, {}, { label: 'POST gerar DAV' });
  if (dav.json) {
    assertShape('resposta do DAV', dav.json, 'quotation');
    record('DAV libera só o relatório DAV',
      dav.json.can_print_dav_report === true && dav.json.can_print_fiscal_receipt === false &&
      dav.json.can_print_sales_order === false && dav.json.can_send_email === false, 'OK',
      `dav=${dav.json.can_print_dav_report} cupom=${dav.json.can_print_fiscal_receipt} pedido=${dav.json.can_print_sales_order} email=${dav.json.can_send_email}`);
    const again = await call('POST', `${BASE}/${fx.code}/dav`, {}, { label: 'POST gerar DAV de novo (idempotente)' });
    record('DAV é idempotente', again.json?.dav_generated_at === dav.json.dav_generated_at, 'OK',
      `${again.json?.dav_generated_at ?? '—'}`);
  }

  // ── Eventos ──────────────────────────────────────────────────────────────
  const events = await call('GET', `${BASE}/${fx.code}/events`, undefined, { label: 'GET histórico' });
  if (events.json?.length) {
    assertShape('eventos', events.json, 'event');
    const types = events.json.map((e) => e.event_type);
    record('histórico registrou bloqueio e liberação',
      types.includes('BLOCK') && types.includes('MANUAL_RELEASE'), 'OK', types.join(','));
  }

  // ── Conversão (opcional: cria pedido de verdade) ─────────────────────────
  if (RUN_CONVERT && fx.itemCode) {
    const order = await call('POST', `${BASE}/${fx.code}/convert-to-order`, {}, { expect: [201], label: 'POST converter em pedido' });
    if (order.json) {
      record('conversão devolve o pedido', Number(order.json.code) > 0, 'OK', `pedido=${order.json.order_number ?? order.json.code}`);
      const after = await call('GET', `${BASE}/${fx.code}`, undefined, { label: 'GET após conversão' });
      record('orçamento fica vinculado ao pedido', Number(after.json?.converted_sales_order_code) > 0, 'OK',
        `pedido=${after.json?.converted_sales_order_code} status=${after.json?.status}`);
      await expectRejection('converter duas vezes deve falhar', 'POST', `${BASE}/${fx.code}/convert-to-order`, {});
    }
    return; // orçamento convertido não segue para cancelamento
  }

  // ── Cancelamento / descancelamento ───────────────────────────────────────
  await expectRejection('cancelar sem motivo cadastrado deve falhar', 'DELETE', `${BASE}/${fx.code}/cancel`, { reason_code: 0 });
  if (fx.reasonC) {
    await expectRejection('motivo "exige complemento" sem complemento deve falhar', 'DELETE', `${BASE}/${fx.code}/cancel`,
      { reason_code: fx.reasonC.code });
  }
  if (fx.reasonD) {
    await call('DELETE', `${BASE}/${fx.code}/cancel`, { reason_code: fx.reasonD.code, complement: 'Cancelado pelo E2E' },
      { expect: [204], label: 'DELETE cancelar com motivo D' });
    const cancelled = await call('GET', `${BASE}/${fx.code}`, undefined, { label: 'GET após cancelamento' });
    record('cancelamento grava a DESCRIÇÃO do motivo (não o código)',
      cancelled.json?.cancel_reason === fx.reasonD.description, 'OK', `cancel_reason=${cancelled.json?.cancel_reason}`);

    if (fx.reasonC) {
      // Regra descoberta na auditoria: descancelar exige o MESMO motivo do cancelamento.
      await expectRejection('descancelar com motivo diferente deve falhar', 'POST', `${BASE}/${fx.code}/uncancel`,
        { reason_code: fx.reasonC.code, complement: 'x' });
    }
    const un = await call('POST', `${BASE}/${fx.code}/uncancel`, { reason_code: fx.reasonD.code },
      { expect: [204], label: 'POST descancelar com o mesmo motivo' });
    if (un.ok) {
      const reopened = await call('GET', `${BASE}/${fx.code}`, undefined, { label: 'GET após descancelamento' });
      record('descancelamento devolve o orçamento para OV', reopened.json?.status === 'OV', 'OK', `status=${reopened.json?.status}`);
    }
  }

  // ── Atendimento manual ───────────────────────────────────────────────────
  await expectRejection('atender sem motivo deve falhar', 'POST', `${BASE}/${fx.code}/attend`, { reason: '' });
  const attended = await call('POST', `${BASE}/${fx.code}/attend`,
    { reason: 'Encerrado pelo E2E', event_date: today() }, { expect: [204], label: 'POST atender' });
  if (attended.ok) {
    const done = await call('GET', `${BASE}/${fx.code}`, undefined, { label: 'GET após atendimento' });
    record('atendimento encerra em ATTENDED', done.json?.status === 'ATTENDED', 'OK', `status=${done.json?.status}`);
    await expectRejection('converter orçamento atendido deve falhar', 'POST', `${BASE}/${fx.code}/convert-to-order`, {});
  }
}

async function divisaoDeVendas() {
  const list = await call('GET', '/api/sales-division/list', undefined, { label: 'GET divisões de vendas' });
  if (list.json?.length) {
    const has = 'allow_free_payment_terms' in list.json[0];
    record('divisão expõe allow_free_payment_terms', has, has ? 'OK' : 'DIFF',
      has ? '' : 'campo v1.1.0 ausente na resposta');
  }
}

// ─── Execução ────────────────────────────────────────────────────────────────

(async () => {
  console.log(`E2E Orçamento de Venda — ${API} (${RUN_WRITES ? 'leitura + escrita' : 'somente leitura'})\n`);
  const authenticated = await login();
  if (authenticated) {
    await cadastrosDeApoio();
    await listagemERelatorio();
    await cicloDoOrcamento();
    await divisaoDeVendas();
  } else {
    console.warn('Sem token — rodando apenas a sondagem de rotas. Defina EMAIL/PASSWORD para a jornada completa.\n');
    await sondarRotas();
  }

  const width = Math.max(...results.map((r) => r.label.length));
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.label.padEnd(width)}  ${String(r.status).padStart(4)}  ${r.note}`);
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passos OK.`);
  if (!RUN_WRITES) console.log('Rode com RUN_WRITES=1 para exercitar a jornada completa (criação, DAV, anexos, cancelamento).');
  if (failed.length) { console.error(`\n${failed.length} falha(s).`); process.exit(1); }
})();
