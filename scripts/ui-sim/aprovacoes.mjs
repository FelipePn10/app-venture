// Aprovações (VAPR0100) dirigidas pela TELA, contra a API de verdade.
//
// ETAPA=politica: o administrador grava, pela tela, a alçada de liberação de
// crédito com um nível cujo aprovador é APROVADOR (nome do usuário na lista).
// ETAPA=alcada: o administrador grava a alçada de desconto do pedido (7,5%),
// a tela recusa valor inválido, mostra o gravado ao reabrir e remove a alçada.
// ETAPA=decidir: o aprovador entra, vê a solicitação como "sua vez", abre e
// aprova; a tela informa que o documento foi liberado.
//
// Uso: APP_URL=... EMAIL=... PASSWORD=... ETAPA=politica|alcada|decidir [APROVADOR=...] node scripts/ui-sim/aprovacoes.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrir, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

const ETAPA = process.env.ETAPA ?? 'politica';
const APROVADOR = process.env.APROVADOR ?? '';
mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await abrir();
page.setDefaultTimeout(25000);
const erros = [];
page.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));

try {
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* sem armazenamento */ } });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('input[placeholder="voce@empresa.com"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 30000 });
  await page.goto(`${APP}/#/screen/VAPR0100`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.erp-tabs').waitFor();

  if (ETAPA === 'politica') {
    await page.click('button.erp-tab:has-text("Políticas de alçada")');
    const bloco = page.locator('.erp-fieldset', { hasText: 'Liberação de crédito do pedido de venda' }).first();
    await bloco.waitFor();
    await bloco.locator('select').nth(0).selectOption('1');
    const aprovador = bloco.locator('table select').first();
    const valor = await aprovador.locator('option', { hasText: APROVADOR }).first().getAttribute('value');
    assert.ok(valor, `o aprovador "${APROVADOR}" não está na lista`);
    await aprovador.selectOption(valor);
    await bloco.locator('button', { hasText: 'Gravar política' }).click();
    await page.locator('.erp-feedback.success').waitFor();
    await page.screenshot({ path: join(SHOTS, 'vapr0100-politica.png'), fullPage: true });
    console.log(`  ✓ alçada de crédito gravada com o aprovador ${APROVADOR}`);
  } else if (ETAPA === 'alcada') {
    await page.click('button.erp-tab:has-text("Políticas de alçada")');
    const bloco = page.locator('.erp-fieldset', { hasText: 'Pedido bloqueado por política comercial' }).first();
    await bloco.waitFor();
    const campo = bloco.locator('input[placeholder="sem limite"]');
    await campo.fill('abc');
    await bloco.locator('button', { hasText: 'Gravar alçada' }).click();
    await page.locator('.erp-feedback.error', { hasText: 'Informe a alçada' }).waitFor();
    await campo.fill('7,5');
    await bloco.locator('button', { hasText: 'Gravar alçada' }).click();
    await page.locator('.erp-feedback.success', { hasText: 'acima de 7,5%' }).waitFor();
    await page.click('button.erp-tab:has-text("Pendentes")');
    await page.click('button.erp-tab:has-text("Políticas de alçada")');
    await bloco.waitFor();
    assert.equal(await campo.inputValue(), '7,5', 'ao reabrir, a tela mostra a alçada gravada');
    await page.screenshot({ path: join(SHOTS, 'vapr0100-alcada.png'), fullPage: true });
    await campo.fill('');
    await bloco.locator('button', { hasText: 'Gravar alçada' }).click();
    await page.locator('.erp-feedback.success', { hasText: 'Alçada removida' }).waitFor();
    console.log('  ✓ alçada de desconto do pedido gravada, conferida e removida pela tela');
  } else {
    const linha = page.locator('.erp-grid tbody tr', { hasText: 'sua vez' }).first();
    await linha.waitFor();
    await linha.locator('button', { hasText: 'Decidir' }).click();
    const modal = page.locator('.erp-modal');
    await modal.waitFor();
    assert.ok(/Solicitada/.test(await modal.innerText()), 'o histórico deveria mostrar a solicitação');
    await modal.locator('textarea').fill('Cliente quitou o título vencido');
    await modal.locator('button', { hasText: 'Aprovar nível 1' }).click();
    await page.locator('.erp-feedback.success').waitFor();
    const msg = await page.locator('.erp-feedback.success').innerText();
    assert.match(msg, /concluída: o documento foi liberado/);
    await page.click('button.erp-tab:has-text("Histórico")');
    await page.locator('.erp-grid tbody tr', { hasText: 'Aprovada' }).first().waitFor();
    await page.screenshot({ path: join(SHOTS, 'vapr0100-historico.png'), fullPage: true });
    console.log('  ✓ aprovador decidiu pela tela: ' + msg);
  }
  assert.deepEqual(erros, [], `erros na tela:\n${erros.join('\n')}`);
  console.log('OK');
} finally {
  await browser.close();
}
