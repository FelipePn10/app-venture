// Simulação do rastreamento (pegging) nas telas, com a API simulada.
//
// Prova o que o planejador e o comercial veem do vínculo necessidade ↔
// suprimento: o elo atrasado destacado com o motivo, o filtro "só com atraso",
// a exceção dizendo a quem afeta, o "Para quem é" das ordens planejadas
// (consulta para cima com a ordem certa), a aba "Atendimento (MRP)" do pedido de
// venda e a linha de cadeia atrasada na comparação de cenário.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { APP, CHROME } from './nav.mjs';

const MOTIVO = 'CHASSI SOLDADO: a fabricação termina em 25/10/2026, depois da necessidade (falta de capacidade)';
const PLANOS = [{ code: 1, name: 'Plano mensal', is_active: true, planning_types: ['MRP'], independent_demands: 'ALL', last_calculated_at: '2026-10-13T10:00:00-03:00' }];
const RAIZES = [
  { item_code: 'CARRINHO-01', item_description: 'CARRINHO DE CARGA', need_date: '2026-10-18T00:00:00Z', quantity: 4, demand: { kind: 'PEDIDO_VENDA', code: 7, label: 'Pedido 5001 · Cliente Teste' }, from_stock: 0, from_firm: 0, from_suggestions: 4, shortage: 0, chain_shortage: false, chain_late: true, late_reason: MOTIVO, latest_supply: '2026-10-25T00:00:00Z' },
  { item_code: 'CARRINHO-01', item_description: 'CARRINHO DE CARGA', need_date: '2026-11-20T00:00:00Z', quantity: 2, demand: { kind: 'DEMANDA_INDEPENDENTE', code: 3, label: 'Demanda independente 3' }, from_stock: 2, from_firm: 0, from_suggestions: 0, shortage: 0, chain_shortage: false, chain_late: false, latest_supply: '2026-11-20T00:00:00Z' },
];
const CADEIA = [{
  item_code: 'CARRINHO-01', item_description: 'CARRINHO DE CARGA', need_date: '2026-10-18T00:00:00Z', quantity: 4,
  demand: { kind: 'PEDIDO_VENDA', label: 'Pedido 5001' }, supply: { kind: 'SUGESTAO', code: 10, label: 'Sugestão 71000 · fabricação', date: '2026-10-18T00:00:00Z' }, late: false,
  children: [{
    item_code: 'CHASSI-01', item_description: 'CHASSI SOLDADO', need_date: '2026-10-18T00:00:00Z', quantity: 4,
    demand: { kind: 'SUGESTAO', label: 'Sugestão 71000' }, supply: { kind: 'SUGESTAO', code: 11, label: 'Sugestão 71005 · fabricação', date: '2026-10-25T00:00:00Z' },
    late: true, late_reason: 'a fabricação termina em 25/10/2026, depois da necessidade (falta de capacidade)', children: [],
  }],
}];
const ACIMA = [{ item_code: 'TUBO-30', item_description: 'TUBO 30X30', need_date: '2026-10-18T00:00:00Z', quantity: 12, demand: { kind: 'PEDIDO_VENDA', label: 'Pedido 5001 · Cliente Teste' }, supply: { kind: 'ORDEM_FIRME', code: 9, label: 'Ordem firme 9001 · compra' }, late: false, children: [] }];
const EXCECOES = [{ code: 1, item_code: 'TUBO-30', message_type: 'RESCHEDULE_IN', description: 'TUBO-30: ordem firme de 12 un. chega em 25/10/2026, mas a necessidade é 18/10/2026 (7 dia(s) de atraso). Antecipar.', source_type: 'PLANNED_ORDER', source_code: 9, source_order_number: 9001, source_need_date: '2026-10-25T00:00:00Z', suggested_date: '2026-10-18T00:00:00Z', affected_demands: ['Pedido 5001 · Cliente Teste', 'Demanda independente 3'] }];
const ORDENS_PLAN = [{ code: 9, order_number: 9001, item_code: 'TUBO-30', quantity: 12, status: 'RELEASED', is_firm: true, order_type: 'PURCHASE', plan_code: 1 }];
const PEDIDO = { code: 41, order_number: 5001, status: 'C', customer_code: 1, enterprise_code: 1, items: [] };
const ATENDIMENTO = [{ plan_code: 1, plan_name: 'Plano mensal', calculated_at: '2026-10-13T10:00:00-03:00', roots: [RAIZES[0]], trees: [CADEIA] }];
const CENARIO = { id: 3, name: 'Turno extra', base_plan_code: 1, base_plan_name: 'Plano mensal', scenario_plan_code: 1000000001, status: 'CALCULADO', calculated_at: '2026-10-13T11:00:00-03:00', changes_count: 0 };
const resumo = (late) => ({ plan_code: 1, calculated_at: '2026-10-13T11:00:00-03:00', suggestions: 3, production_qty: 4, purchase_qty: 12, coverage_critical: 0, coverage_warning: 0, coverage_ok: 3, exceptions: 1, overload_days: 0, max_load_pct: 80, roots: 2, roots_with_shortage: 0, roots_late: late });
const COMPARACAO = { base: resumo(2), scenario: resumo(0), items: [], work_centers: [], base_stale: false, notes: [] };

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(12000);
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text().slice(0, 200)); });

await page.addInitScript(() => localStorage.setItem('erp-auth-storage', JSON.stringify({
  state: { token: 'isolated-ui-test', userName: 'Teste', user: { name: 'Teste', role: 'ADMIN' }, expiresAt: null, rememberMe: true }, version: 0,
})));

const consultasParaCima = [];
await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  const p = url.pathname;
  if (!p.startsWith('/api/') && !p.startsWith('/users/')) return route.continue();
  let body = [];
  if (p === '/api/production-plan/list') body = PLANOS;
  else if (p.endsWith('/roots') && p.includes('/pegging/')) body = RAIZES;
  else if (p.endsWith('/down') && p.includes('/pegging/')) body = CADEIA;
  else if (p.endsWith('/up') && p.includes('/pegging/')) { consultasParaCima.push(url.search); body = ACIMA; }
  else if (p === '/api/mrp-calculation/pegging/sales-order/41') body = ATENDIMENTO;
  else if (p.includes('/exceptions')) body = EXCECOES;
  else if (p === '/api/planned-order/list') body = ORDENS_PLAN;
  else if (p === '/api/sales-order/list') body = [PEDIDO];
  else if (p === '/api/sales-order/41') body = PEDIDO;
  else if (p === '/api/sales-order/41/representatives') body = { representatives: [], total_valor: 0 };
  else if (p === '/api/planning/scenarios') body = [CENARIO];
  else if (p === '/api/planning/scenarios/3') body = { ...CENARIO, changes: [] };
  else if (p === '/api/planning/scenarios/3/compare') body = COMPARACAO;
  else if (p === '/api/planning/auto-run') body = {};
  else if (p === '/users/me') body = { id: 'test', name: 'Teste', role: 'ADMIN' };
  else if (p === '/api/version') body = { version: '1.3.0', min_client: '1.0.0' };
  else if (p.startsWith('/api/enterprise')) body = [{ id: 1, code: 1, nome_fantasia: 'VENTURE' }];
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});

const abrirTela = async (codigo) => {
  await page.goto(`${APP}/#/screen/${codigo}`);
  await page.locator('.erp-crumb-code', { hasText: codigo }).waitFor();
};
const clicarAba = (rotulo) => page.locator('.erp-tab', { hasText: rotulo }).first().click();
const corpo = async () => (await page.locator('.erp-detail-body').first().innerText()).replace(/\s+/g, ' ');

try {
  // ── Rastreamento: atraso visível, filtrável e explicado ─────────────────
  await abrirTela('VMRP0100');
  await clicarAba('Rastreamento');
  await page.locator('.vpl-kpi', { hasText: 'Com atraso na cadeia' }).waitFor();
  const kpi = await page.locator('.vpl-kpi', { hasText: 'Com atraso na cadeia' }).innerText();
  assert.match(kpi, /\b1\b/, `o indicador de atraso não contou a origem atrasada: ${kpi}`);
  assert.ok((await corpo()).includes(MOTIVO), 'a lista de origens não mostrou o motivo do atraso');
  await page.locator('input[aria-label="Só com atraso"]').check();
  assert.equal(await page.locator('tr.vpl-click').count(), 1, 'o filtro "só com atraso" não deixou só a origem atrasada');
  await page.locator('tr.vpl-click').first().click();
  await page.locator('tr.vpl-atraso').waitFor();
  assert.equal(await page.locator('tr.vpl-atraso').count(), 1, 'a árvore não destacou exatamente o elo atrasado');
  const titulo = await page.locator('tr.vpl-atraso').getAttribute('title');
  assert.match(titulo ?? '', /termina em 25\/10\/2026/, 'o elo atrasado não traz o motivo ao passar o mouse');
  assert.ok((await page.locator('tr.vpl-atraso').innerText()).includes('CHASSI-01'), 'o destaque caiu no elo errado');

  // ── Exceções: a quem afeta, e a busca acha pelo pedido ──────────────────
  await clicarAba('Exceções');
  await page.locator('text=/Afeta: Pedido 5001/').waitFor();
  await page.locator('#ex-busca').fill('Pedido 5001');
  assert.equal(await page.locator('text=/Afeta: Pedido 5001/').count(), 1, 'a busca pelo pedido não achou a exceção que o afeta');

  // ── Ordens planejadas: "Para quem é" sobe pela ordem certa ──────────────
  await clicarAba('Ordens planejadas');
  await page.locator('tr.vpl-click', { hasText: '9001' }).first().click();
  await page.locator('button', { hasText: 'Para quem é' }).click();
  await page.locator('text=/Para quem é a ordem 9001/').waitFor();
  assert.ok(consultasParaCima.some((q) => q.includes('supply_kind=ORDEM_FIRME') && q.includes('supply_code=9')),
    `"Para quem é" não consultou a ordem planejada 9: ${consultasParaCima.join(' ; ')}`);

  // ── Pedido de venda: aba Atendimento (MRP) ──────────────────────────────
  await abrirTela('VVND0200');
  await page.locator('button', { hasText: 'Listar todos' }).click();
  await page.locator('.erp-list-row', { hasText: '#41' }).click();
  await clicarAba('Atendimento (MRP)');
  await page.locator('text=Plano Plano mensal').waitFor();
  let texto = await corpo();
  assert.ok(texto.includes('CARRINHO-01') && texto.includes('Atrasada'), 'o atendimento não mostrou a linha do pedido atrasada');
  await page.locator('tr.vpl-click').first().click();
  await page.locator('tr.vpl-atraso').waitFor();

  // ── Cenário: pedidos com cadeia atrasada, real × cenário ────────────────
  await abrirTela('VPLN0100');
  await clicarAba('Cenários');
  await page.locator('tr.vpl-click', { hasText: 'Turno extra' }).click();
  const linha = page.locator('tr', { hasText: 'Pedidos/demandas com cadeia atrasada' });
  await linha.waitFor();
  texto = (await linha.innerText()).replace(/\s+/g, ' ');
  assert.match(texto, /2.*0/, `a comparação não mostrou 2 no real e 0 no cenário: ${texto}`);

  const graves = erros.filter((e) => !/status of 4\d\d|favicon/.test(e));
  assert.deepEqual(graves, [], `erros no navegador: ${graves.join(' | ')}`);
  console.log('SIMULAÇÃO OK — atraso no rastreamento, exceção que afeta pedido, "Para quem é", atendimento do pedido e cenário.');
} finally {
  await browser.close();
}
