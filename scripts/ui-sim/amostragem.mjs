// Amostragem NBR 5426 (VINS0110) dirigida pela TELA, contra a API de verdade.
//
// ETAPA=procedimentos: calculadora (lote 1000, nível II, NQA 1,0 → n 80, Ac 2;
// apertada Ac 1; lote 6 → 100 %), cadastro de um procedimento pela norma e de
// um plano fixo com skip-lot, e alteração do primeiro.
// ETAPA=liberar: com um estado suspenso já gravado (CODIGO, ITEM), a aba de
// severidade mostra a suspensão e a liberação pela tela volta para apertada.
//
// Uso: APP_URL=... EMAIL=... PASSWORD=... ETAPA=procedimentos|liberar CODIGO=... [ITEM=...] node scripts/ui-sim/amostragem.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrir, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

const ETAPA = process.env.ETAPA ?? 'procedimentos';
const CODIGO = process.env.CODIGO ?? `SIM${Date.now() % 100000}`;
const ITEM = process.env.ITEM ?? '';
mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await abrir();
page.setDefaultTimeout(25000);
const erros = [];
page.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));

const campo = (rotulo) => page.locator('.erp-field', { has: page.locator('label', { hasText: rotulo }) }).locator('input, select').first();

try {
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* sem armazenamento */ } });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('input[placeholder="voce@empresa.com"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 30000 });
  await page.goto(`${APP}/#/screen/VINS0110`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.erp-tabs').waitFor();

  if (ETAPA === 'procedimentos') {
    // Calculadora.
    await campo('Tamanho do lote').fill('1000');
    await campo('Nível').selectOption('II');
    await campo('NQA').selectOption('1.0');
    await page.click('button:has-text("Calcular")');
    const resultado = page.locator('.erp-fieldset', { hasText: 'Resultado' });
    await resultado.waitFor();
    const texto = await resultado.innerText();
    assert.match(texto, /Letra-código J/);
    assert.match(texto, /inspecionar 80 unidades; aceitar com até 2 não conforme\(s\), recusar com 3/);
    const apertada = await resultado.locator('tr', { hasText: 'Apertada' }).innerText();
    assert.match(apertada, /80\s+1\s+2/, `apertada: ${apertada}`);
    const atenuada = await resultado.locator('tr', { hasText: 'Atenuada' }).innerText();
    assert.match(atenuada, /32\s+1\s+2/, `atenuada: ${atenuada}`);
    console.log('  ✓ calculadora: lote 1000, II, NQA 1,0 → J, n 80, Ac 2 (apertada Ac 1; atenuada n 32 Ac 1)');

    await campo('Tamanho do lote').fill('6');
    await campo('NQA').selectOption('0.65');
    await page.click('button:has-text("Calcular")');
    await page.locator('.erp-fieldset', { hasText: 'Resultado' }).getByText('o lote inteiro').waitFor();
    console.log('  ✓ lote 6, NQA 0,65 → amostra alcança o lote: 100 %');
    await page.screenshot({ path: join(SHOTS, 'vins0110-calculadora.png'), fullPage: true });

    // Procedimento pela norma.
    await page.click('button.erp-tab:has-text("Procedimentos")');
    await campo('Código').fill(CODIGO);
    await campo('Descrição').fill('Recebimento de chapas — NQA 1,0');
    await campo('Tipo').selectOption('NORMA');
    await campo('Nível').selectOption('II');
    await campo('NQA').selectOption('1.0');
    await page.locator('label.erp-check', { hasText: 'Permitir inspeção atenuada' }).locator('input').check();
    await page.click('button:has-text("Gravar")');
    await page.locator('.erp-feedback.success', { hasText: `Procedimento ${CODIGO} gravado` }).waitFor();
    const linha = page.locator('.erp-grid tbody tr', { hasText: CODIGO });
    assert.match(await linha.innerText(), /NBR 5426\s+Nível II, NQA 1,0\s+Sim/);
    console.log(`  ✓ procedimento ${CODIGO} (NBR 5426, II, NQA 1,0, atenuada permitida) gravado`);

    // Plano fixo com skip-lot.
    await campo('Código').fill(`${CODIGO}F`);
    await campo('Descrição').fill('Parafusos — plano fixo');
    await campo('Tipo').selectOption('FIXO');
    await campo('Amostra (n)').fill('13');
    await campo('Ac').fill('0');
    await campo('Re').fill('1');
    await campo('Skip-lot após').fill('5');
    await campo('Inspecionar 1 a cada').fill('3');
    await page.click('button:has-text("Gravar")');
    await page.locator('.erp-feedback.success', { hasText: `Procedimento ${CODIGO}F gravado` }).waitFor();
    assert.match(await page.locator('.erp-grid tbody tr', { hasText: `${CODIGO}F` }).innerText(), /n 13, Ac 0, Re 1.*após 5, 1 a cada 3/s);
    console.log('  ✓ plano fixo 13/0/1 com skip-lot (após 5, 1 a cada 3) gravado');

    // Plano fixo inválido: Re ≤ Ac é recusado com mensagem.
    await campo('Código').fill(`${CODIGO}X`);
    await campo('Descrição').fill('inválido');
    await campo('Tipo').selectOption('FIXO');
    await campo('Amostra (n)').fill('5');
    await campo('Ac').fill('2');
    await campo('Re').fill('2');
    await page.click('button:has-text("Gravar")');
    await page.locator('.erp-feedback.error', { hasText: 'Re > Ac' }).waitFor();
    console.log('  ✓ plano fixo com Re ≤ Ac recusado pela API com a mensagem');

    // Alteração.
    await page.locator('.erp-grid tbody tr').filter({ has: page.locator('td', { hasText: new RegExp(`^${CODIGO}$`) }) }).locator('button', { hasText: 'Alterar' }).click();
    await campo('NQA').selectOption('0.65');
    await page.click('button:has-text("Gravar")');
    await page.locator('.erp-feedback.success').waitFor();
    assert.match(await page.locator('.erp-grid tbody tr').filter({ has: page.locator('td', { hasText: new RegExp(`^${CODIGO}$`) }) }).innerText(), /NQA 0,65/);
    console.log('  ✓ procedimento alterado para NQA 0,65');
    await page.screenshot({ path: join(SHOTS, 'vins0110-procedimentos.png'), fullPage: true });
  } else {
    await page.click('button.erp-tab:has-text("Severidade por item")');
    await campo('Item').fill(ITEM);
    await page.click('button:has-text("Consultar")');
    const linha = page.locator('.erp-grid tbody tr', { hasText: CODIGO }).first();
    await linha.waitFor();
    assert.match(await linha.innerText(), /Suspensa/);
    await linha.locator('button', { hasText: 'Liberar' }).click();
    const bloco = page.locator('.erp-fieldset', { hasText: 'Liberar a inspeção do item' });
    await bloco.waitFor();
    assert.ok(await bloco.locator('button', { hasText: 'Liberar' }).isDisabled(), 'sem motivo não libera');
    await bloco.locator('input').fill('8D nº 12 aceito — troca do fornecedor de matéria-prima');
    await bloco.locator('button', { hasText: 'Liberar' }).click();
    await page.locator('.erp-feedback.success', { hasText: 'recomeça em apertada' }).waitFor();
    const depois = await page.locator('.erp-grid tbody tr', { hasText: CODIGO }).first().innerText();
    assert.ok(!/Suspensa/.test(depois) && /Apertada/.test(depois), `depois da liberação: ${depois}`);
    const hist = page.locator('.erp-fieldset', { hasText: 'Histórico de trocas' });
    await hist.locator('tr', { hasText: 'Liberação' }).waitFor();
    assert.match(await hist.locator('tr', { hasText: 'Liberação' }).innerText(), /liberada: 8D nº 12 aceito/);
    await page.screenshot({ path: join(SHOTS, 'vins0110-liberacao.png'), fullPage: true });
    console.log('  ✓ suspensão liberada pela tela; histórico registra a liberação');
  }
  assert.deepEqual(erros, [], `erros na tela:\n${erros.join('\n')}`);
  console.log('OK');
} finally {
  await browser.close();
}
