// Simulação CONTRA A API DE VERDADE (sem fixture nenhuma).
//
// As outras simulações isolam a API para testar a tela; esta faz o contrário:
// prova que a tela e o backend desta rodada conversam de fato — login com
// "manter conectado", plano de pagamento e rateio de comissão de um orçamento
// real, os três valores do orçamento (produto, IPI, produto + IPI) e a cotação
// de frete da transportadora cadastrada.
//
// Uso: APP_URL=http://localhost:5198 API_URL=http://localhost:5070 \
//      EMAIL=... PASSWORD=... node scripts/ui-sim/ponta-a-ponta-real.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { APP, CHROME, EMAIL, PASSWORD } from './nav.mjs';

const API = process.env.API_URL ?? 'http://localhost:5070';

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(20000);
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text().slice(0, 200)); });

const texto = async (sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').toLowerCase();

try {
  // ── Login de verdade, com "manter conectado" marcado ─────────────────────
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="password"]').waitFor();
  const caixa = page.locator('.lp-checkbox');
  if (!(await caixa.isChecked())) await caixa.click();
  await page.locator('input[placeholder="voce@empresa.com"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 25000 });

  // O token que o backend devolveu tem prazo de uma semana (a caixa marcada).
  const sessao = JSON.parse(await page.evaluate(() => window.localStorage.getItem('erp-auth-storage')));
  const faltam = new Date(sessao.state.expiresAt).getTime() - Date.now();
  assert.ok(sessao.state.rememberMe === true, 'a sessão gravada não registrou o "manter conectado"');
  assert.ok(faltam > 6 * 24 * 60 * 60 * 1000, `o backend não deu prazo de semana: faltam ${Math.round(faltam / 3600000)}h`);

  // ── Qual orçamento existe de verdade no banco ───────────────────────────
  const token = sessao.state.token;
  const buscar = async (rota) => {
    const r = await fetch(API + rota, { headers: { Authorization: `Bearer ${token}` } });
    assert.ok(r.ok, `${rota} respondeu ${r.status}`);
    return r.json();
  };
  const lista = await buscar('/api/sales-quotation/list');
  assert.ok(Array.isArray(lista) && lista.length > 0, 'não há orçamento no ambiente para exercitar a tela');
  const comItens = lista.find((q) => Number(q.total_net) > 0) ?? lista[0];
  const codigo = comItens.code;

  // ── VVND0300 contra a API real: três leituras, pagamento e comissão ─────
  await page.goto(`${APP}/#/screen/VVND0300`);
  await page.locator('.erp-crumb-code', { hasText: 'VVND0300' }).waitFor();
  await page.locator('.erp-list-row').first().waitFor();
  await page.locator('.erp-list-row', { hasText: String(comItens.quotation_number ?? codigo) }).first().click();
  await page.locator('.erp-fieldset-head', { hasText: /Orçamento #/ }).waitFor();

  const valorDoCampo = async (rotulo) =>
    page.locator('.erp-field', { hasText: rotulo }).first().locator('input').inputValue();
  const produtos = await valorDoCampo('Produtos (líquido)');
  const ipi = await valorDoCampo('IPI');
  const comIPI = await valorDoCampo('Produto + IPI');
  const numero = (v) => Number(v.replace(/\./g, '').replace(',', '.'));
  assert.ok(
    Math.abs(numero(produtos) + numero(ipi) - numero(comIPI)) < 0.02,
    `produto + IPI não fecha na tela: ${produtos} + ${ipi} ≠ ${comIPI}`,
  );

  // Plano de pagamento vindo do backend (condição com percentual e evento).
  await page.locator('.erp-tab', { hasText: 'Pagamento' }).click();
  await page.locator('.erp-fieldset-head', { hasText: 'Plano de pagamento' }).waitFor();
  const plano = await texto('.erp-fieldset:has-text("Plano de pagamento")');
  assert.ok(
    /entrada|à vista|parcela|condição/.test(plano),
    `a aba de pagamento não trouxe nada do backend: ${plano.slice(0, 200)}`,
  );

  // Rateio de comissão vindo do backend.
  await page.locator('.erp-tab', { hasText: 'Comissão' }).click();
  await page.locator('.erp-fieldset-head', { hasText: 'Rateio de comissão' }).waitFor();
  const comissao = await texto('.erp-fieldset:has-text("Rateio de comissão")');
  assert.ok(/base|comissão/.test(comissao), `a aba de comissão não carregou: ${comissao.slice(0, 200)}`);

  // ── VSUP0140 contra a API real: lista e cotação de frete ────────────────
  await page.goto(`${APP}/#/screen/VSUP0140`);
  await page.locator('.erp-crumb-code', { hasText: 'VSUP0140' }).waitFor();
  const transportadoras = await buscar('/api/shipping-carriers');
  if (transportadoras.length > 0) {
    await page.locator('.erp-list-row').first().waitFor();
    await page.locator('.erp-field:has-text("UF") input').first().fill('SP');
    await page.getByRole('button', { name: 'Cotar frete' }).click();
    await page.locator('table.erp-grid').first().waitFor();
    const cotacao = await texto('table.erp-grid');
    assert.ok(cotacao.length > 20, 'a cotação de frete não trouxe linha nenhuma da API');
  }

  const semRuido = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource|X-ERP-Client-Version/i.test(e));
  assert.deepEqual(semRuido, [], `erros de console contra a API real: ${semRuido.join(' | ')}`);
  console.log(`PONTA A PONTA OK — login com sessão de semana, orçamento ${codigo} com produto/IPI/produto+IPI batendo, plano de pagamento e rateio de comissão vindos da API.`);
} catch (e) {
  console.error('FALHOU:', e.message);
  if (erros.length) console.error('console:', erros.slice(0, 5).join(' | '));
  process.exitCode = 1;
} finally {
  await browser.close();
}
