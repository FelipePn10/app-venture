// VMRP0100 → Planos CONTRA A API DE VERDADE: "Agrupar ordens do mesmo item no
// mesmo dia" na criação e no "Alterar plano" (antes nenhuma tela mudava isso),
// e salvar não apaga os parâmetros do plano (a alteração troca o plano inteiro).
//
// Uso: APP_URL=… EMAIL=… PASSWORD=… PGURL=<banco da API> node scripts/ui-sim/vmrp0100-plano-agrupa.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { abrir, entrar, APP, SHOTS } from './nav.mjs';

const PGURL = process.env.PGURL;
assert.ok(PGURL, 'informe PGURL (o banco da API)');
fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync('psql', [PGURL, '-v', 'ON_ERROR_STOP=1', '-qtAX', '-c', q], { encoding: 'utf8' }).trim();
const emp = Number(sql('SELECT id FROM enterprise WHERE code = 1'));
const codigo = 70_000 + (Date.now() % 20_000);
const plano = (col) => sql(`SELECT ${col} FROM production_plans WHERE enterprise_id = ${emp} AND code = ${codigo}`);

const { browser, page, erros } = await abrir();
page.setDefaultTimeout(20000);
let ok = 0;
const passo = (t) => { ok += 1; console.log(`✓ ${t}`); };
const feedback = (re) => page.locator('.erp-feedback', { hasText: re }).first().waitFor();
try {
  await entrar(page);
  await page.goto(`${APP}/#/screen/VMRP0100`);
  await page.locator('.erp-tab', { hasText: /^Planos/ }).first().click();
  await page.fill('#pl-code', String(codigo));
  await page.fill('#pl-name', `Plano agrupado ${codigo}`);
  await page.locator('.erp-check', { hasText: 'Agrupar ordens do mesmo item no mesmo dia' }).first().locator('input').check();
  await page.getByRole('button', { name: 'Criar plano' }).click();
  await feedback(new RegExp(`Plano ${codigo} criado`));
  assert.equal(plano('group_same_date_orders'), 't');
  passo('criar plano com "Agrupar ordens do mesmo item no mesmo dia" grava o agrupamento');

  // Parâmetros que a tela não mostra: precisam sobreviver à alteração.
  sql(`UPDATE production_plans SET independent_demands = 'FROM_DATE', parameters = '{"from_date":"2026-01-01"}' WHERE enterprise_id = ${emp} AND code = ${codigo}`);
  await page.locator('.erp-tab', { hasText: /^Planos/ }).first().click();
  await page.getByRole('button', { name: 'Atualizar' }).first().click();
  await page.locator('tr', { hasText: `Plano agrupado ${codigo}` }).first().click();
  const linha = page.locator('tr', { hasText: `Plano agrupado ${codigo}` }).first();
  assert.match(await linha.innerText(), /Sim/, 'a lista mostra o agrupamento');
  await page.locator('#pl-ed-agrupa').waitFor();
  assert.equal(await page.isChecked('#pl-ed-agrupa'), true);
  await page.locator('#pl-ed-agrupa').uncheck();
  await page.fill('#pl-ed-name', `Plano sem agrupar ${codigo}`);
  await page.getByRole('button', { name: 'Salvar plano' }).click();
  await feedback(new RegExp(`Plano ${codigo} salvo`));
  assert.equal(plano('group_same_date_orders'), 'f');
  assert.equal(plano('name'), `Plano sem agrupar ${codigo}`);
  assert.equal(plano('independent_demands'), 'FROM_DATE');
  assert.equal(plano(`parameters->>'from_date'`), '2026-01-01');
  await page.screenshot({ path: `${SHOTS}/vmrp0100-plano-agrupa.png`, fullPage: true });
  passo('"Alterar plano" troca nome e agrupamento sem apagar demandas independentes e parâmetros');

  const semRuido = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/i.test(e));
  assert.deepEqual(semRuido, [], `erros de console: ${semRuido.join(' | ')}`);
  console.log(`\n${ok} passos verdes`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/vmrp0100-plano-falha.png`, fullPage: true }).catch(() => {});
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally {
  sql(`DELETE FROM production_plans WHERE enterprise_id = ${emp} AND code = ${codigo}`);
  await browser.close();
}
