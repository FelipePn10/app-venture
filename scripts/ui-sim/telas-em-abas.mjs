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

const PLANOS = [{ code: 1, name: 'Plano mensal', status: 'ABERTO' }];
const SUGESTOES = [{ id: 1, item_code: 'RN-01001', suggested_qty: 100, need_date: '2026-10-01', order_type: 'PRODUCTION' }];
const EXCECOES = [{ item_code: 'RN-01001', exception_type: 'ATRASO', message: 'necessidade no passado' }];
const ORDENS_PLAN = [{ id: 9, code: 9, item_code: 'RN-01001', quantity: 100, status: 'PLANNED', order_type: 'PRODUCTION' }];

const OFS = [{ id: 77, item_code: 'RN-01001', planned_qty: 100, produced_qty: 10, scrapped_qty: 0, status: 'IN_PROGRESS' }];
const OPERACOES = [{ id: 1, sequence: 10, operation_name: 'Corte', status: 'PENDING' }];
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
  else if (p.includes('/mrp/plans') || p === '/api/mrp/plans') body = PLANOS;
  else if (p.includes('/suggestions')) body = SUGESTOES;
  else if (p.includes('/exceptions')) body = EXCECOES;
  else if (p.includes('/planned-orders')) body = ORDENS_PLAN;
  else if (p.includes('/production-orders/77/operations')) body = OPERACOES;
  else if (p.includes('/production-orders/77/materials')) body = MATERIAIS;
  else if (p.includes('/production-orders/77')) body = OFS[0];
  else if (p.includes('/production-orders')) body = OFS;
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

  // ── VMRP0100 — o ciclo do planejador em quatro abas ──────────────────────
  await abrirTela('VMRP0100');
  const abasMrp = (await abas()).join(' | ');
  for (const esperada of ['Plano', 'Resultado', 'Item', 'Relatórios']) {
    assert.ok(abasMrp.includes(esperada), `a aba "${esperada}" não apareceu no MRP: ${abasMrp}`);
  }
  texto = await corpo();
  assert.ok(contem(texto, 'Planos de produção'), 'a aba Plano não trouxe o cadastro do plano');
  assert.ok(!contem(texto, 'Sugestões de ordens'), 'as sugestões apareceram na aba do plano');

  await clicarAba('Resultado');
  texto = await corpo();
  assert.ok(contem(texto, 'Sugestões de ordens'), 'a aba Resultado não trouxe as sugestões');
  assert.ok(contem(texto, 'Ordens planejadas'), 'a aba Resultado não trouxe as ordens planejadas');

  await clicarAba('Item');
  texto = await corpo();
  assert.ok(/perfil mrp do item/.test(texto), 'a aba Item não trouxe o perfil time-phased');

  await clicarAba('Relatórios');
  texto = await corpo();
  assert.ok(/relatórios operacionais/.test(texto), 'a aba Relatórios não trouxe os relatórios');

  // ── VPRO0900 — ordem de produção ─────────────────────────────────────────
  await abrirTela('VPRO0900');
  const abasOf = (await abas()).join(' | ');
  for (const esperada of ['Ordens', 'Apontamento', 'Etapas', 'Materiais']) {
    assert.ok(abasOf.includes(esperada), `a aba "${esperada}" não apareceu na OF: ${abasOf}`);
  }
  // Sem ordem escolhida, as abas de trabalho ficam desabilitadas em vez de
  // mostrarem uma tela vazia sem explicação.
  const apontamentoDesabilitado = await page
    .locator('.erp-detail-panel > .erp-tabs .erp-tab', { hasText: 'Apontamento' }).first().isDisabled();
  assert.ok(apontamentoDesabilitado, 'a aba de apontamento deveria exigir uma ordem aberta');
  texto = await corpo();
  assert.ok(contem(texto, 'Nova ordem'), 'a aba Ordens não trouxe a criação da OF');
  assert.ok(!contem(texto, 'Qtd produzida'), 'o apontamento apareceu antes de abrir uma ordem');

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
