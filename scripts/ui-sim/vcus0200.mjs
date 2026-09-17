/**
 * Simulação manual da VCUS0200 — Margem de Contribuição.
 *
 * O ponto da aba nova é o vendedor saber o que sobra ANTES de fechar o pedido,
 * com a mesma conta do fechamento do mês. Se os dois números divergirem, o
 * pedido é fechado por um e o mês mostra outro.
 *
 * Roda com: node scripts/ui-sim/vcus0200.mjs
 */
import { abrir, entrar, SHOTS } from './nav.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

mkdirSync(SHOTS, { recursive: true });

const TECNICO = /parsing time|SQLSTATE|cannot parse|pq:|pgx|goroutine|nil pointer|invalid character|json:|unmarshal|panic|forbidden|unauthorized/i;
const passos = [];
const { browser, page, erros } = await abrir();
const http = [];
page.on('response', (r) => {
  const u = new URL(r.url()).pathname;
  if (u.startsWith('/api')) http.push({ m: r.request().method(), u, s: r.status() });
});

async function passo(nome, fn) {
  const desde = http.length;
  let ok = true, detalhe = '';
  try { await fn(); } catch (e) { ok = false; detalhe = String(e).slice(0, 170); }
  await page.waitForTimeout(500);
  const ruins = http.slice(desde).filter((c) => c.s >= 400);
  const feedback = (await page.locator('.erp-feedback').last().textContent().catch(() => '')) ?? '';
  passos.push({ nome, ok, detalhe, ruins: ruins.map((c) => `${c.m} ${c.u} ${c.s}`), feedback: feedback.trim() });
  console.log(`${!ok || ruins.length ? '✗' : '✓'} ${nome}${ruins.length ? '  [' + ruins.map((c) => c.s).join(',') + ']' : ''}${detalhe ? '\n    ' + detalhe : ''}`);
}

// Os campos são aninhados (um erp-c6 contém erp-c12), então filtrar por texto
// casa o pai e o filho. `.last()` pega o mais interno, que é o que tem o input.
const campo = (rotulo) => page.locator('.erp-field', { hasText: rotulo }).last().locator('input').last();
const preencher = async (pares) => { for (const [r, v] of pares) await campo(r).fill(String(v)); };
/** "R$ 1.234,56" → 1234.56 */
const numero = (t) => Number(String(t ?? '').replace(/[^\d,-]/g, '').replace(',', '.'));

await entrar(page);
await page.waitForTimeout(800);
await page.evaluate(() => { window.location.hash = '#/screen/VCUS0200'; });
await page.locator('.erp-tab').first().waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(1400);

await passo('a aba Simulação existe', async () => {
  const abas = await page.locator('.erp-tab').allTextContents();
  if (!abas.some((a) => /Simula/i.test(a))) throw new Error(`abas: ${abas.join(' | ')}`);
});

await passo('o seletor de base de custo não corta o texto', async () => {
  const sel = page.locator('select').first();
  const { clientWidth, scrollWidth } = await sel.evaluate((el) => ({ clientWidth: el.clientWidth, scrollWidth: el.scrollWidth }));
  const texto = await sel.locator('option:checked').textContent();
  if (scrollWidth > clientWidth + 2) throw new Error(`"${texto}" não cabe (${scrollWidth}px em ${clientWidth}px)`);
});

await page.locator('.erp-tab', { hasText: 'Simulação' }).click();
await page.waitForTimeout(700);

await passo('simular exige preço', async () => {
  await campo('Quantidade').fill('50');
  await page.getByRole('button', { name: 'Simular', exact: true }).click();
});

await passo('cascata completa com os números certos', async () => {
  await preencher([
    ['Quantidade', 50], ['Preço unitário', 180],
    ['Custo unitário', 60], ['Transformação unit.', 22],
    ['IPI (%)', 5], ['ICMS (%)', 18], ['PIS/COFINS (%)', 9.25], ['Comissão (%)', 3],
  ]);
  await page.getByRole('button', { name: 'Simular', exact: true }).click();
  await page.waitForTimeout(1400);

  const linhas = await page.locator('.erp-grid tbody tr').allTextContents();
  const acha = (r) => linhas.find((l) => l.includes(r));
  for (const r of ['Faturamento bruto', '(−) ICMS', '(−) Financeira do prazo', 'Margem de contribuição']) {
    if (!acha(r)) throw new Error(`falta a linha "${r}" na cascata`);
  }
  // 50 × 180 × 1,05 de IPI = 9.450,00
  if (Math.abs(numero(acha('Faturamento bruto')) - 9450) > 0.5) {
    throw new Error(`faturamento bruto errado: ${acha('Faturamento bruto')}`);
  }
  const margem = acha('Margem de contribuição');
  if (!/9,27/.test(margem ?? '')) throw new Error(`margem inesperada: ${margem}`);
});

await passo('o prazo aparece como custo, não some na conta', async () => {
  const ciclo = await campo('Custo de financiar o prazo').inputValue();
  if (!/25 dias/.test(ciclo)) throw new Error(`ciclo de caixa não veio dos parâmetros: "${ciclo}"`);
});

await passo('preço mínimo para a margem pedida', async () => {
  await campo('Margem desejada (%)').fill('25');
  await page.getByRole('button', { name: 'Simular', exact: true }).click();
  await page.waitForTimeout(1400);
  const v = numero(await campo('Preço mínimo para').inputValue());
  if (Math.abs(v - 386.66) > 0.02) throw new Error(`preço mínimo ${v}, esperado ~386,66`);
  const dica = await page.locator('.erp-field', { hasText: 'Preço mínimo para' }).last().locator('.erp-hint').textContent();
  if (!/acima do preço simulado/i.test(dica ?? '')) throw new Error(`dica não orienta: "${dica}"`);
});

await passo('venda com prejuízo é avisada', async () => {
  await campo('Preço unitário').fill('80');
  await page.getByRole('button', { name: 'Simular', exact: true }).click();
  await page.waitForTimeout(1400);
  const aviso = await page.locator('.erp-feedback.error').last().textContent().catch(() => '');
  if (!/prejuízo/i.test(aviso ?? '')) throw new Error(`não avisou do prejuízo: "${aviso}"`);
});

await page.screenshot({ path: join(SHOTS, 'vcus0200-simulacao.png'), fullPage: true });
writeFileSync(join(SHOTS, 'vcus0200.json'), JSON.stringify({ passos, erros }, null, 2));

const tecnicos = passos.filter((p) => TECNICO.test(p.feedback));
const falhas = passos.filter((p) => !p.ok || p.ruins.length);
console.log(`\n${passos.length} passos · ${falhas.length} com problema · ${tecnicos.length} com texto técnico · ${erros.length} erro(s) de console`);
await browser.close();
