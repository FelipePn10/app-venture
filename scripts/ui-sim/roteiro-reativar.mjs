// Roteiro desativado aparece na lista do item e volta pelo botão Reativar.
// Com outro roteiro padrão ativo, o reativado volta como alternativo.
//
// Pré-requisito: o item ITEM (busca pelo nome em BUSCA) com um roteiro ativo e
// padrão (NOVO) e outro desativado, que era padrão (ANTIGO).
// Uso: APP_URL=... EMAIL=... PASSWORD=... BUSCA=... ANTIGO=... NOVO=... node scripts/ui-sim/roteiro-reativar.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrir, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

const { BUSCA, ANTIGO, NOVO } = process.env;
assert.ok(BUSCA && ANTIGO && NOVO, 'informe BUSCA, ANTIGO e NOVO');
mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await abrir();
page.setDefaultTimeout(25000);
const erros = [];
page.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));
const linha = (t) => page.locator('.erp-grid tbody tr', { hasText: t }).first();
try {
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[placeholder="voce@empresa.com"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 30000 });
  await page.goto(`${APP}/#/screen/VENT0202`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.erp-toolbar .erp-lookup-control').first().click();
  await page.locator('.erp-lookup-panel input').fill(BUSCA);
  await page.waitForTimeout(1200);
  await page.locator('.erp-lookup-item').first().click();
  await page.locator('.erp-tab', { hasText: 'Roteiros do item' }).first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(SHOTS, 'vent0202-reativar-antes.png'), fullPage: true });
  await linha(ANTIGO).waitFor();
  assert.match(await linha(ANTIGO).innerText(), /Desativado/);
  assert.match(await linha(NOVO).innerText(), /Ativo/);
  assert.equal(await linha(ANTIGO).locator('button', { hasText: 'Desativar' }).count(), 0, 'desativado não pode oferecer Desativar');
  console.log('  ✓ desativado aparece na lista, marcado, com Reativar');
  await linha(ANTIGO).locator('button', { hasText: 'Reativar' }).click();
  await page.locator('.erp-feedback.success', { hasText: 'reativado como alternativo' }).waitFor();
  const depois = await linha(ANTIGO).innerText();
  assert.match(depois, /Ativo/);
  assert.match(depois, /Não/, 'o reativado não pode voltar como padrão com outro padrão ativo');
  assert.match(await linha(NOVO).innerText(), /Sim/);
  await page.screenshot({ path: join(SHOTS, 'vent0202-reativar.png'), fullPage: true });
  console.log('  ✓ reativado como alternativo; o padrão atual continua padrão');
  assert.deepEqual(erros, [], erros.join('\n'));
  console.log('OK');
} finally {
  await browser.close();
}
