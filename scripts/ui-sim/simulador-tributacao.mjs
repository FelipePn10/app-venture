// Simulador de Tributação (VFIS0325) pela TELA: o mesmo NCM sai com uma
// tributação para o revendedor (contribuinte) e outra para o consumidor final,
// pela regra de ICMS/IPI (VFIS0320); o NCM sem regra segue a regra geral.
//
// Pré-requisito: regra REGRA (UF PR, saída) para o NCM COM_REGRA com
// contribuinte 12%/CST 00 e não contribuinte 18%; NCM SEM_REGRA sem regra.
// Uso: APP_URL=... EMAIL=... PASSWORD=... REGRA=... COM_REGRA=... SEM_REGRA=... node scripts/ui-sim/simulador-tributacao.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrir, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

const { REGRA, COM_REGRA, SEM_REGRA } = process.env;
assert.ok(REGRA && COM_REGRA && SEM_REGRA, 'informe REGRA, COM_REGRA e SEM_REGRA');
mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await abrir();
page.setDefaultTimeout(25000);
const erros = [];
page.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));
const venda = () => page.locator('.erp-fieldset', { has: page.locator('.erp-fieldset-head', { hasText: 'Venda' }) }).first();
const campoVenda = (rotulo) => venda().locator('.erp-field', { has: page.locator('label', { hasText: rotulo }) }).locator('input, select').first();
const itens = () => page.locator('.erp-fieldset', { has: page.locator('.erp-fieldset-head', { hasText: /^Itens/ }) }).first();
const ncm = (i) => itens().locator('.erp-field', { has: page.locator('label', { hasText: 'NCM' }) }).nth(i).locator('input');
const valor = (i) => itens().locator('.erp-field', { has: page.locator('label', { hasText: 'Valor unitário' }) }).nth(i).locator('input');
const qtd = (i) => itens().locator('.erp-field', { has: page.locator('label', { hasText: 'Quantidade' }) }).nth(i).locator('input');
const linhas = async () => (await page.locator('.erp-fieldset', { has: page.locator('.erp-fieldset-head', { hasText: 'Tributação por linha' }) })
  .locator('.erp-grid tbody tr').allInnerTexts()).map((t) => t.replace(/\s+/g, ' '));

async function simular() {
  await page.locator('button', { hasText: 'Simular' }).click();
  await page.locator('.erp-fieldset-head', { hasText: 'Tributação por linha' }).waitFor();
  return linhas();
}

try {
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[placeholder="voce@empresa.com"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 30000 });
  await page.goto(`${APP}/#/screen/VFIS0325`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await venda().waitFor();

  await campoVenda('UF de destino').fill('PR');
  await campoVenda('IE do destinatário').fill('9012345678');
  await ncm(0).fill(COM_REGRA); await qtd(0).fill('1'); await valor(0).fill('1000');
  await page.locator('button', { hasText: '+ Linha' }).click();
  await ncm(1).fill(SEM_REGRA); await qtd(1).fill('1'); await valor(1).fill('1000');

  let ls = await simular();
  console.log('  revenda:', JSON.stringify(ls));
  assert.match(ls[0], new RegExp(`nº ${REGRA}`), 'linha 1 deve usar a regra do cadastro');
  assert.match(ls[0], /\b00\b/);
  assert.match(ls[0], /12(,00)?\s?%\s*=\s*(R\$\s*)?120,00/);
  assert.match(ls[1], /geral/);
  assert.match(ls[1], /\b51\b/, 'sem regra: regra geral com diferimento (CST 51)');
  const notaLinha1 = (await page.locator('.erp-note', { hasText: 'Linha 1:' }).first().innerText()).replace(/\s+/g, ' ');
  assert.doesNotMatch(notaLinha1, /ICMS diferido em/, `linha 1 sem diferimento não pode explicar diferimento: ${notaLinha1}`);
  assert.match(notaLinha1, /sem diferimento/);
  await page.screenshot({ path: join(SHOTS, 'vfis0325-revenda.png'), fullPage: true });
  console.log('  ✓ revenda: NCM com regra a 12% (CST 00); NCM sem regra na regra geral (CST 51)');

  await campoVenda('IE do destinatário').fill('');
  ls = await simular();
  console.log('  consumidor:', JSON.stringify(ls));
  assert.match(ls[0], new RegExp(`nº ${REGRA}`));
  assert.match(ls[0], /18(,00)?\s?%/, 'consumidor final: alíquota de não contribuinte da regra');
  assert.doesNotMatch(ls[1], /\b51\b/, 'consumidor final não tem diferimento');
  await page.screenshot({ path: join(SHOTS, 'vfis0325-consumidor.png'), fullPage: true });
  console.log('  ✓ consumidor final: mesma regra, alíquota de não contribuinte (18%); NCM sem regra sem diferimento');
  assert.deepEqual(erros, [], erros.join('\n'));
  console.log('OK');
} finally {
  await browser.close();
}
