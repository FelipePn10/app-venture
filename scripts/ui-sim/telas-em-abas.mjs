// Simulação das telas que passaram a ser divididas em abas.
//
// Estoque (VEST0100), MRP (VMRP0100) e Ordem de Produção (VPRO0900) eram uma
// rolagem única com oito ou nove assuntos empilhados. O que se prova aqui é que
// cada assunto ficou numa aba, que a aba mostra o que promete e — o mais
// importante — que NADA aparece fora da sua aba (era o risco de quebrar a tela
// ao dividi-la).
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { APP, CHROME } from './nav.mjs';

const ITENS = [{ code: 'RN-01001', name: 'CHAPA GALVANIZADA #16', health: 'ATIVO', pdm: { description_technique: 'CHAPA' }, warehouse: { unit_of_measurement: 'KG' } }];
const DEPOSITOS = [{ id: 1, code: 1, description: 'ALMOX CENTRAL', name: 'ALMOX CENTRAL' }];
const MOVIMENTOS = [{ id: 501, item_code: 'RN-01001', warehouse_id: 1, movement_type: 'ENTRY', quantity: 120, created_at: '2026-09-20T10:00:00Z' }];
const ATP = { item_code: 'RN-01001', total_on_hand: 120, total_reserved: 20, total_available: 100 };
const SALDOS = [{ warehouse_id: 1, quantity: 120, reserved_qty: 20, available_qty: 100, avg_cost: 8.5 }];
const LOTES = [{ lot: 'L-2026-01', warehouse_id: 1, quantity: 60 }];
const CONSUMO = { item_code: 'RN-01001', avg_monthly_consumption: 45, total_consumed: 540, window_months: 12 };

const PLANOS = [{ code: 1, name: 'Plano mensal', is_active: true, planning_types: ['MRP'], independent_demands: 'ALL', last_calculated_at: '2026-09-30T10:00:00-03:00' }];
const SUGESTOES = [{ code: 1, order_number: 10000, item_code: 'RN-01001', quantity: 100, need_date: '2026-10-01T00:00:00Z', start_date: '2026-09-29T00:00:00Z', order_type: 'FABRICACAO', demand_type: 'INDEPENDENT_DEMAND', plan_code: 1 }];
const EXCECOES = [{ item_code: 'RN-01001', message_type: 'EXPEDITE', description: 'necessidade no passado' }];
const COBERTURA = [{ item_code: 'RN-01001', description: 'CHAPA GALVANIZADA #16', item_type: 'COMPRADO', status: 'ATENCAO', reason: 'a falta só é coberta por ordem planejada ainda não firmada', stock: 20, safety_stock: 0, demand: 120, firm_supply: 0, planned_supply: 100, days_of_supply: 4, stock_shortage_date: '2026-10-01T00:00:00Z', receipt_days_of_supply: 4, firm_shortage_date: '2026-10-01T00:00:00Z', firm_shortage_qty: 100, min_projected: 0, planned_orders: 1 }];
const RAIZES = [{ item_code: 'RN-01001', item_description: 'CHAPA GALVANIZADA #16', need_date: '2026-10-01T00:00:00Z', quantity: 120, demand: { kind: 'PEDIDO_VENDA', code: 7, label: 'Pedido 5001 · Cliente Teste' }, from_stock: 20, from_firm: 0, from_suggestions: 100, shortage: 0, chain_shortage: true }];
const CADEIA = [{ item_code: 'RN-01001', item_description: 'CHAPA GALVANIZADA #16', need_date: '2026-10-01T00:00:00Z', quantity: 100, demand: { kind: 'PEDIDO_VENDA', label: 'Pedido 5001' }, supply: { kind: 'FALTA', label: 'Sem cobertura' }, late: false, children: [] }];
const ORDENS_PLAN = [{ code: 9, order_number: 9001, item_code: 'RN-01001', quantity: 100, status: 'PLANNED', order_type: 'PRODUCTION', plan_code: 1 }];

const OFS = [{ id: 77, item_code: 'RN-01001', planned_qty: 100, produced_qty: 10, scrapped_qty: 0, status: 'IN_PROGRESS', start_date: '2026-10-01T00:00:00Z' }];
const OPERACOES = [{ id: 1, sequence: 10, operation_name: 'Corte', status: 'PENDING', can_start: true }];
const MATERIAIS = [{ id: 3, item_code: 'RN-01001', quantity: 50, allocated_qty: 0, warehouse_id: 1 }];

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(12000);
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text().slice(0, 200)); });

await page.addInitScript(() => localStorage.setItem('erp-auth-storage', JSON.stringify({
  state: { token: 'isolated-ui-test', userName: 'Teste', user: { name: 'Teste', role: 'ADMIN' }, expiresAt: null, rememberMe: true }, version: 0,
})));

await page.route('**/*', async (route) => {
  const p = new URL(route.request().url()).pathname;
  if (!p.startsWith('/api/') && !p.startsWith('/users/')) return route.continue();
  let body = [];
  if (p === '/api/items' || p === '/api/items/') body = ITENS;
  else if (p.startsWith('/api/almoxarifados') || p.startsWith('/api/warehouse')) body = DEPOSITOS;
  else if (p.includes('/movements')) body = MOVIMENTOS;
  else if (p.includes('/atp')) body = ATP;
  else if (p.includes('/balances')) body = SALDOS;
  else if (p.includes('/lots')) body = LOTES;
  else if (p.includes('consumption')) body = CONSUMO;
  else if (p === '/api/production-plan/list') body = PLANOS;
  else if (p.includes('/inter-factories')) body = [];
  else if (p === '/api/mrp-reports/coverage') body = COBERTURA;
  else if (p.endsWith('/roots') && p.includes('/pegging/')) body = RAIZES;
  else if (p.endsWith('/down') && p.includes('/pegging/')) body = CADEIA;
  else if (p.includes('/suggestions')) body = SUGESTOES;
  else if (p.includes('/exceptions')) body = EXCECOES;
  else if (p === '/api/planned-order/list') body = ORDENS_PLAN;
  else if (p === '/api/production-order/77/operations') body = OPERACOES;
  else if (p === '/api/production-order/77/materials') body = MATERIAIS;
  else if (p === '/api/production-order/77/appointments' || p === '/api/production-order/77/consumptions') body = [];
  else if (p === '/api/production-order/77/cost') return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"sem custo"}' });
  else if (p === '/api/production-order/77') body = OFS[0];
  else if (p === '/api/production-order/list') body = OFS;
  else if (p === '/users/me') body = { id: 'test', name: 'Teste', role: 'ADMIN' };
  else if (p === '/api/version') body = { version: '1.3.0', min_client: '1.0.0' };
  else if (p.startsWith('/api/enterprise')) body = [{ id: 1, code: 1, nome_fantasia: 'VENTURE' }];
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});

const abrirTela = async (codigo) => {
  await page.goto(`${APP}/#/screen/${codigo}`);
  await page.locator('.erp-crumb-code', { hasText: codigo }).waitFor();
  await page.locator('.erp-tabs').first().waitFor();
};
const abas = () => page.locator('.erp-detail-panel > .erp-tabs .erp-tab').allTextContents();
const clicarAba = async (rotulo) => {
  await page.locator('.erp-detail-panel > .erp-tabs .erp-tab', { hasText: rotulo }).first().click();
};
/**
 * `innerText` devolve o texto JÁ transformado pelo CSS, e os títulos dos blocos
 * são maiúsculos por estilo. Comparar em minúsculas evita um teste que falha por
 * causa de `text-transform`.
 */
const corpo = async () => (await page.locator('.erp-detail-body').first().innerText()).replace(/\s+/g, ' ').toLowerCase();
const contem = (texto, trecho) => texto.includes(trecho.toLowerCase());

try {
  // ── VEST0100 — cinco assuntos, cinco abas ────────────────────────────────
  await abrirTela('VEST0100');
  const abasEstoque = (await abas()).join(' | ');
  for (const esperada of ['Saldos e ATP', 'Movimentos', 'Reservas', 'Separação e guarda', 'Lotes']) {
    assert.ok(abasEstoque.includes(esperada), `a aba "${esperada}" não apareceu no estoque: ${abasEstoque}`);
  }
  // A aba inicial fala de saldo e NÃO mostra o formulário de outra aba.
  let texto = await corpo();
  assert.ok(/consultar|atp|selecione o item/.test(texto), `a aba de saldos não explicou o que fazer: ${texto.slice(0, 200)}`);
  assert.ok(!contem(texto, 'Lançar movimento'), 'o formulário de movimento apareceu fora da aba de movimentos');
  assert.ok(!contem(texto, 'Registrar lote'), 'o formulário de lote apareceu fora da aba de lotes');

  await clicarAba('Movimentos');
  texto = await corpo();
  assert.ok(contem(texto, 'Lançar movimento'), 'a aba de movimentos não trouxe o lançamento');
  assert.ok(!contem(texto, 'Criar reserva'), 'a reserva apareceu na aba de movimentos');

  await clicarAba('Reservas');
  texto = await corpo();
  assert.ok(contem(texto, 'Criar reserva'), 'a aba de reservas não trouxe o formulário');

  await clicarAba('Separação e guarda');
  texto = await corpo();
  assert.ok(/sugerir separação/.test(texto), 'a aba de separação não trouxe a sugestão');
  assert.ok(/recalcular curva abc/.test(texto), 'a curva ABC ficou fora da aba de separação e guarda');

  await clicarAba('Lotes');
  texto = await corpo();
  assert.ok(contem(texto, 'Registrar lote'), 'a aba de lotes não trouxe o registro');
  assert.ok(!contem(texto, 'Lançar movimento'), 'o movimento apareceu na aba de lotes');

  // ── VMRP0100 — o trabalho do planejador, uma aba por passo ───────────────
  await abrirTela('VMRP0100');
  const abasMrp = (await abas()).join(' | ');
  for (const esperada of ['Visão geral', 'Cobertura', 'Sugestões', 'Ordens planejadas', 'Exceções', 'Rastreamento', 'Perfil do item', 'Planos', 'Relatórios']) {
    assert.ok(abasMrp.includes(esperada), `a aba "${esperada}" não apareceu no MRP: ${abasMrp}`);
  }
  await page.locator('.vpl-kpi', { hasText: 'Sugestões a firmar' }).waitFor();
  texto = await corpo();
  assert.ok(contem(texto, 'Próximos passos'), 'a visão geral não trouxe os próximos passos');
  assert.ok(!contem(texto, 'Novo plano'), 'o cadastro de plano apareceu na visão geral');

  await clicarAba('Cobertura');
  await page.locator('.vpl-kpi', { hasText: 'Atenção' }).waitFor();
  texto = await corpo();
  assert.ok(contem(texto, 'RN-01001') && contem(texto, '4 dias') && contem(texto, 'Firmar 1'), 'a aba Cobertura não trouxe o item, os dias e a ação de firmar');
  assert.ok(!contem(texto, 'Novo plano'), 'o cadastro de plano apareceu na cobertura');

  await clicarAba('Rastreamento');
  await page.locator('tr', { hasText: 'Pedido 5001' }).first().click();
  await page.locator('tr', { hasText: 'Falta' }).first().waitFor();
  texto = await corpo();
  assert.ok(contem(texto, 'Falta na cadeia') && contem(texto, 'Pedido 5001'), 'a aba Rastreamento não trouxe a origem e a falta');
  assert.ok(!contem(texto, 'Novo plano'), 'o cadastro de plano apareceu no rastreamento');

  await clicarAba('Sugestões');
  texto = await corpo();
  assert.ok(contem(texto, 'RN-01001') && contem(texto, 'Fabricação'), 'a aba Sugestões não trouxe a sugestão traduzida');
  assert.ok(!contem(texto, 'Novo plano'), 'o cadastro de plano apareceu nas sugestões');

  await clicarAba('Ordens planejadas');
  texto = await corpo();
  assert.ok(contem(texto, '9001') && contem(texto, 'Planejada'), 'a aba Ordens planejadas não trouxe a ordem');

  await clicarAba('Exceções');
  texto = await corpo();
  assert.ok(contem(texto, 'Acelerar'), 'a exceção não veio traduzida');

  await clicarAba('Planos');
  texto = await corpo();
  assert.ok(contem(texto, 'Novo plano') && contem(texto, 'Empresas inter-fábrica'), 'a aba Planos não trouxe o cadastro');
  assert.ok(!contem(texto, 'Necessidade'), 'as sugestões apareceram na aba de planos');

  await clicarAba('Relatórios');
  texto = await corpo();
  assert.ok(/explosão multinível/.test(texto), 'a aba Relatórios não trouxe os relatórios');

  // ── VPRO0900 — lista à esquerda, ordem aberta à direita ─────────────────
  await page.goto(`${APP}/#/screen/VPRO0900`);
  await page.locator('.erp-crumb-code', { hasText: 'VPRO0900' }).waitFor();
  await page.locator('.erp-list-row', { hasText: 'OF 77' }).waitFor();
  // Sem ordem escolhida não há abas de trabalho, e sim a orientação.
  assert.equal(await page.locator('.erp-detail-panel .erp-tabs').count(), 0, 'as abas da OF apareceram sem ordem aberta');
  texto = await corpo();
  assert.ok(contem(texto, 'Escolha uma ordem na lista'), 'a tela não orientou a escolher a ordem');
  assert.ok(!contem(texto, 'Apontar produção'), 'o apontamento apareceu antes de abrir uma ordem');

  await page.locator('.erp-list-row', { hasText: 'OF 77' }).click();
  await page.locator('.erp-detail-panel .erp-tabs').waitFor();
  const abasOf = (await page.locator('.erp-detail-panel .erp-tabs .erp-tab').allTextContents()).join(' | ');
  for (const esperada of ['Resumo', 'Apontamento', 'Etapas', 'Materiais', 'Consumos', 'Custo']) {
    assert.ok(abasOf.includes(esperada), `a aba "${esperada}" não apareceu na OF: ${abasOf}`);
  }
  texto = await corpo();
  assert.ok(!contem(texto, 'Apontar produção'), 'o apontamento apareceu no resumo');
  await page.locator('.erp-detail-panel .erp-tabs .erp-tab', { hasText: 'Apontamento' }).click();
  texto = await corpo();
  assert.ok(contem(texto, 'Apontar produção') && contem(texto, 'Entregar ao estoque'), 'a aba Apontamento não trouxe apontamento e entrega');
  assert.ok(!contem(texto, 'Leitura por código de barras'), 'a leitura por código apareceu fora da aba Etapas');
  await page.locator('.erp-detail-panel .erp-tabs .erp-tab', { hasText: 'Etapas' }).click();
  texto = await corpo();
  assert.ok(contem(texto, 'Corte') && contem(texto, 'Leitura por código de barras'), 'a aba Etapas não trouxe o roteiro');

  const semRuido = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/i.test(e));
  assert.deepEqual(semRuido, [], `erros de console: ${semRuido.join(' | ')}`);
  console.log('SIMULAÇÃO OK — VEST0100, VMRP0100 e VPRO0900 divididas em abas, sem conteúdo fora da aba.');
} catch (e) {
  console.error('FALHOU:', e.message);
  if (erros.length) console.error('console:', erros.slice(0, 5).join(' | '));
  process.exitCode = 1;
} finally {
  await browser.close();
}
