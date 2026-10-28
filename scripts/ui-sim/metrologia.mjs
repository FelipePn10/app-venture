// Metrologia (VINS0600) + medição no lote (VINS0300), pela TELA.
//
// Pré-requisito: item ITEM com roteiro de inspeção cuja etapa Diâmetro pede
// instrumento do grupo Paquímetro, e procedimento de amostragem no roteiro.
// Cadastra e calibra um paquímetro, abre um lote, confere que a medição sem
// instrumento é recusada e com o paquímetro passa; registra calibração
// reprovada e confere o bloqueio e o lote na análise de impacto.
//
// Uso: APP_URL=... EMAIL=... PASSWORD=... ITEM=... CODIGO=... node scripts/ui-sim/metrologia.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrir, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

const { ITEM } = process.env;
const CODIGO = process.env.CODIGO ?? 'PQ-SIM';
assert.ok(ITEM, 'informe ITEM');
mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await abrir();
page.setDefaultTimeout(25000);
const erros = [];
page.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));
const bloco = (titulo) => page.locator('.erp-fieldset', { has: page.locator('.erp-fieldset-head', { hasText: titulo }) }).first();
const campo = (b, rotulo) => b.locator('.erp-field', { has: page.locator('label', { hasText: rotulo }) }).locator('input, select').first();
const tela = async (codigo) => {
  await page.goto(`${APP}/#/screen/${codigo}`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.erp-toolbar').waitFor();
};

try {
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* sem armazenamento */ } });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('input[placeholder="voce@empresa.com"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 30000 });

  // Cadastro e calibração aprovada.
  await tela('VINS0600');
  const cad = bloco('Novo instrumento');
  await campo(cad, 'Código').fill(CODIGO);
  await campo(cad, 'Descrição').fill('Paquímetro digital 150 mm');
  await campo(cad, 'Grupo').fill('Paquímetro');
  await campo(cad, 'Frequência').fill('180');
  await campo(cad, 'Erro máximo admissível').fill('0,03');
  await page.click('button:has-text("Gravar instrumento")');
  await page.locator('.erp-feedback.success', { hasText: `Instrumento ${CODIGO} gravado` }).waitFor();
  const calib = bloco('Registrar calibração');
  await campo(calib, 'Erro').fill('0,01');
  await campo(calib, 'Incerteza').fill('0,005');
  await calib.locator('button', { hasText: 'Registrar calibração' }).click();
  await page.locator('.erp-feedback.success', { hasText: 'Calibração aprovada' }).waitFor();
  console.log(`  ✓ ${CODIGO} cadastrado (grupo normalizado) e calibrado: aprovado pelo erro + incerteza ≤ EMA`);

  // Lote: sem instrumento recusa; com o paquímetro grava.
  await tela('VINS0300');
  await page.click('button:has-text("Novo lote manual")');
  const novo = bloco('Novo lote manual');
  await campo(novo, 'Item').fill(ITEM);
  await campo(novo, 'Quantidade').fill('10');
  await novo.locator('button', { hasText: 'Abrir lote' }).click();
  await page.locator('.erp-feedback.success', { hasText: 'aberto' }).waitFor();
  const res = bloco('Resultados');
  const linhas = res.locator('tbody tr');
  const n = await linhas.count();
  for (let i = 0; i < n; i++) {
    await linhas.nth(i).locator('input').first().fill('8,0');
    await linhas.nth(i).locator('td select').first().selectOption('S');
  }
  await res.locator('button', { hasText: 'Gravar resultados' }).click();
  await page.locator('.erp-feedback.error', { hasText: 'informe o instrumento' }).waitFor();
  const seletor = res.locator('select[aria-label="Instrumento de Diâmetro"]');
  const valor = await seletor.locator('option', { hasText: CODIGO }).getAttribute('value');
  await seletor.selectOption(valor);
  await res.locator('button', { hasText: 'Gravar resultados' }).click();
  await page.locator('.erp-feedback.success', { hasText: 'resultado(s) gravado(s)' }).waitFor();
  console.log(`  ✓ medição sem instrumento recusada; com ${CODIGO} gravada (${n} unidades)`);

  // Calibração reprovada: bloqueio e impacto.
  await tela('VINS0600');
  await page.locator('.erp-grid tbody tr', { hasText: CODIGO }).locator('button', { hasText: 'Abrir' }).click();
  const calib2 = bloco('Registrar calibração');
  await campo(calib2, 'Executor').selectOption('EXTERNO');
  await campo(calib2, 'Certificado').fill('RBC-SIM-1');
  await campo(calib2, 'Erro').fill('0,05');
  await calib2.locator('button', { hasText: 'Registrar calibração' }).click();
  await page.locator('.erp-feedback.error', { hasText: 'REPROVADA' }).waitFor();
  const imp = await bloco('Impacto da reprovação').innerText();
  assert.match(imp, new RegExp(`${ITEM}`), 'o lote medido deveria aparecer no impacto');
  assert.match(await page.locator('.erp-grid tbody tr', { hasText: CODIGO }).first().innerText(), /Bloqueado/);
  await page.screenshot({ path: join(SHOTS, 'vins0600-impacto.png'), fullPage: true });
  console.log('  ✓ reprovada: instrumento bloqueado e o lote medido aparece na análise de impacto');
  assert.deepEqual(erros, [], `erros na tela:\n${erros.join('\n')}`);
  console.log('OK');
} finally {
  await browser.close();
}
