// Certificado de qualidade (VINS0700) e documentos (VINS0800) pela TELA.
//
// Pré-requisito: lote de inspeção decidido do ITEM com lote LOTE (aproveitado
// APROVADO unidades) e o lote de estoque com corrida; segunda usuária da
// empresa (EMAIL2/PASSWORD2) para aprovar o documento.
//
// Uso: APP_URL=... EMAIL=... PASSWORD=... EMAIL2=... PASSWORD2=... ITEM=... LOTE=... APROVADO=... DOC=... node scripts/ui-sim/certificado-documentos.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrir, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

const { EMAIL2, PASSWORD2, ITEM, LOTE, APROVADO } = process.env;
const DOC = process.env.DOC ?? 'IT-SIM-01';
assert.ok(EMAIL2 && PASSWORD2 && ITEM && LOTE && APROVADO, 'informe EMAIL2, PASSWORD2, ITEM, LOTE, APROVADO');
mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await abrir();
page.setDefaultTimeout(25000);
const erros = [];
page.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));
const bloco = (titulo) => page.locator('.erp-fieldset', { has: page.locator('.erp-fieldset-head', { hasText: titulo }) }).first();
const campo = (b, rotulo) => b.locator('.erp-field', { has: page.locator('label', { hasText: rotulo }) }).locator('input, select, textarea').first();

async function entrar(email, senha) {
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* sem armazenamento */ } });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('input[placeholder="voce@empresa.com"]', email);
  await page.fill('input[type="password"]', senha);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 30000 });
}
async function tela(codigo) {
  await page.goto(`${APP}/#/screen/${codigo}`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.erp-toolbar').waitFor();
}

try {
  await entrar(EMAIL, PASSWORD);
  await tela('VINS0700');
  const em = bloco('Emitir certificado');
  await campo(em, 'Item').fill(ITEM);
  await campo(em, 'Lote / corrida').fill(LOTE);
  await campo(em, 'Quantidade').fill(String(Number(APROVADO) + 10));
  await em.locator('button', { hasText: 'Emitir' }).click();
  await page.locator('.erp-feedback.error', { hasText: 'passa do que os lotes' }).waitFor();
  await campo(em, 'Quantidade').fill(APROVADO);
  await campo(em, 'Observações').fill('Conforme pedido do cliente');
  await em.locator('button', { hasText: 'Emitir' }).click();
  await page.locator('.erp-feedback.success', { hasText: /Certificado \d+ emitido/ }).waitFor();
  const det = await page.locator('.erp-fieldset', { has: page.locator('.erp-fieldset-head', { hasText: /^Certificado \d+/ }) }).first().innerText();
  assert.match(det, /corrida C-9911/);
  assert.match(det, /certificado da usina GERDAU 44120/);
  assert.match(det, /Diâmetro/);
  const download = page.waitForEvent('download');
  await page.locator('.erp-grid tbody tr').first().locator('button', { hasText: 'PDF' }).click();
  const arq = await download;
  assert.match(arq.suggestedFilename(), /^certificado-\d+\.pdf$/);
  await page.screenshot({ path: join(SHOTS, 'vins0700-certificado.png'), fullPage: true });
  console.log(`  ✓ certificado: acima do aprovado recusado; emitido com corrida e certificado da usina; PDF ${arq.suggestedFilename()}`);

  await tela('VINS0800');
  const cab = bloco('Novo documento');
  await campo(cab, 'Código').fill(DOC);
  await campo(cab, 'Título').fill('Inspeção do diâmetro do parafuso');
  await campo(cab, 'Tipo').selectOption('IT');
  await campo(cab, 'Item').fill(ITEM);
  await cab.locator('button', { hasText: 'Gravar' }).click();
  await page.locator('.erp-feedback.success', { hasText: `Documento ${DOC} gravado` }).waitFor();
  const rev = bloco('Nova revisão');
  await campo(rev, 'O que muda').fill('emissão inicial');
  await campo(rev, 'Texto').fill('1. Medir 5 peças por hora com paquímetro calibrado.\n2. Registrar no lote de inspeção.');
  await rev.locator('button', { hasText: 'Gravar rascunho' }).click();
  await page.locator('.erp-feedback.success', { hasText: 'Rascunho da revisão 0' }).waitFor();
  await page.click('button:has-text("Aprovar revisão")');
  await page.locator('.erp-feedback.error', { hasText: 'quem elaborou' }).waitFor();
  console.log('  ✓ documento criado e rascunho gravado; quem elaborou não aprova');

  await entrar(EMAIL2, PASSWORD2);
  await tela('VINS0800');
  await page.locator('.erp-grid tbody tr', { hasText: DOC }).locator('button', { hasText: 'Abrir' }).click();
  await page.click('button:has-text("Aprovar revisão")');
  await page.locator('.erp-feedback.success', { hasText: 'Revisão 0 aprovada e vigente' }).waitFor();
  assert.match(await page.locator('.erp-grid tbody tr', { hasText: DOC }).innerText(), /rev\. 0/);
  await page.screenshot({ path: join(SHOTS, 'vins0800-documento.png'), fullPage: true });
  console.log('  ✓ outra pessoa aprovou: revisão 0 vigente');
  assert.deepEqual(erros, [], `erros na tela:\n${erros.join('\n')}`);
  console.log('OK');
} finally {
  await browser.close();
}
