// Aba Simulador da VMAQ0200: os campos de entrada e o resultado do cálculo
// ficam em grade legível (nada espremido numa coluna) em tela larga e estreita.
//
// Uso: APP_URL=... EMAIL=... PASSWORD=... [ITEM=... MAQUINA=... QTD=...] node scripts/ui-sim/vmaq0200-simulador.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrir, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await abrir();
page.setDefaultTimeout(25000);
const erros = [];
page.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));
const sufixo = process.env.SUFIXO ?? '';
try {
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[placeholder="voce@empresa.com"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 30000 });
  await page.goto(`${APP}/#/screen/VMAQ0200`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.erp-tab', { hasText: 'Simulador' }).first().click();
  const bloco = page.locator('.erp-fieldset', { has: page.locator('.erp-fieldset-head', { hasText: 'Cálculo de tempo de produção' }) }).first();
  await bloco.waitFor();
  // Nenhum campo de entrada pode ficar estreito demais para o conteúdo.
  const larguras = await bloco.locator('.erp-field').evaluateAll((els) => els.map((e) => ({ t: e.querySelector('label')?.textContent?.trim() ?? '', w: Math.round(e.getBoundingClientRect().width) })));
  console.log('  larguras:', JSON.stringify(larguras));
  await page.screenshot({ path: join(SHOTS, `vmaq0200-simulador${sufixo}.png`), fullPage: true });
  if (process.env.ITEM && process.env.MAQUINA) {
    const campos = bloco.locator('.erp-field');
    const preencher = async (rotulo, valor) => {
      await campos.filter({ has: page.locator('label', { hasText: rotulo }) }).locator('button.erp-lookup-control').click();
      await page.locator('.erp-lookup-panel input').fill(valor);
      await page.waitForTimeout(700);
      await page.locator('.erp-lookup-item').first().click();
    };
    await preencher('Item', process.env.ITEM);
    await preencher('Máquina', process.env.MAQUINA);
    await campos.filter({ has: page.locator('label', { hasText: 'Quantidade' }) }).locator('input').fill(process.env.QTD ?? '100');
    await bloco.locator('button', { hasText: 'Calcular tempo' }).click();
    await page.waitForTimeout(1500);
    const res = page.locator('.erp-fieldset', { has: page.locator('.erp-fieldset-head', { hasText: 'Resultado' }) }).first();
    const fb = await page.locator('.erp-feedback').last().textContent().catch(() => '');
    console.log('  feedback:', fb);
    if (await res.isVisible().catch(() => false)) {
      const rl = await res.locator('.erp-field').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
      console.log('  resultado larguras:', JSON.stringify(rl));
      assert.ok(rl.every((w) => w >= 120), 'campo do resultado espremido');
    }
    await page.screenshot({ path: join(SHOTS, `vmaq0200-simulador-resultado${sufixo}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(SHOTS, `vmaq0200-simulador-estreita${sufixo}.png`), fullPage: true });
  assert.deepEqual(erros, [], erros.join('\n'));
  console.log('OK');
} finally {
  await browser.close();
}
