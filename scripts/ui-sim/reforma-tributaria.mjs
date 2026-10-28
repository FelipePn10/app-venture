// Reforma tributária (VFIS0670 e prévia da NF-e) dirigida pela TELA, contra a
// API de verdade: o ano de 2027 aparece pendente até a CBS ser cadastrada, o
// CFOP de bonificação passa a sair com 410001 e a prévia mostra o cClassTrib e a
// origem de cada linha — e aceita corrigi-lo ali.
//
// Pré-requisito: uma NF-e em RASCUNHO da empresa do usuário, com uma linha de
// CFOP 5910 (NOTA_ID). Uso:
//   APP_URL=http://127.0.0.1:5199 EMAIL=... PASSWORD=... NOTA_ID=123 node scripts/ui-sim/reforma-tributaria.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrir, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

const NOTA_ID = Number(process.env.NOTA_ID ?? 0);
mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await abrir();
const erros = [];
page.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));
page.on('response', (r) => {
  // 422 esperado: o teste grava um código inválido de propósito.
  if (r.status() >= 400 && r.status() !== 422 && !/favicon/.test(r.url())) erros.push(`HTTP ${r.status()} ${r.url()}`);
});
page.setDefaultTimeout(25000);
const texto = async (sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ');

try {
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="password"]').waitFor();
  await page.fill('input[placeholder="voce@empresa.com"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 30000 });
  console.log('  ✓ login pela tela');

  await page.goto(`${APP}/#/screen/VFIS0670`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.erp-grid tbody tr', { hasText: '2026' }).first().waitFor();
  let corpo = await texto('.erp-detail-body');
  assert.ok(/2026/.test(corpo) && /Lei \(LC 214\/2025\)/i.test(corpo), `2026 deveria vir da lei: ${corpo.slice(0, 300)}`);
  assert.ok(/2027: a CBS do ano/i.test(corpo), 'o aviso de 2027 sem CBS não apareceu');
  console.log('  ✓ 2026 pela lei e 2027 pendente de CBS');

  // Cadastra a CBS de 2027.
  const campos = page.locator('.erp-fieldset', { hasText: 'Cadastrar ou alterar um ano' }).first().locator('input');
  await campos.nth(0).fill('2027');
  await campos.nth(1).fill('0,05');
  await campos.nth(2).fill('0,05');
  await campos.nth(3).fill('8,7');
  await campos.nth(4).fill('Simulação de tela');
  await page.click('button:has-text("Gravar alíquotas")');
  await page.locator('.erp-feedback.success').waitFor();
  corpo = await texto('.erp-detail-body');
  assert.ok(/Cadastro da empresa/.test(corpo) && /8,7%/.test(corpo), `2027 deveria aparecer cadastrada: ${corpo.slice(0, 400)}`);
  await page.screenshot({ path: join(SHOTS, 'vfis0670-aliquotas.png'), fullPage: true });
  console.log('  ✓ CBS de 2027 cadastrada pela tela');

  // CFOP de bonificação → 410001; código inválido é recusado com a mensagem.
  await page.click('button.erp-tab:has-text("cClassTrib por CFOP")');
  const cfopInputs = page.locator('.erp-fieldset', { hasText: 'Vincular CFOP' }).first().locator('input');
  await cfopInputs.nth(0).fill('5910');
  await cfopInputs.nth(1).fill('999999');
  await page.click('button:has-text("Gravar vínculo")');
  await page.locator('.erp-feedback.error').waitFor();
  assert.ok(/tabela oficial/.test(await texto('.erp-feedback.error')), 'o erro do código inválido não foi explicado');
  await cfopInputs.nth(1).fill('410001');
  await page.click('button:has-text("Gravar vínculo")');
  await page.locator('.erp-feedback.success').waitFor();
  assert.ok(/5910/.test(await texto('.erp-grid')), 'o vínculo não apareceu na lista');
  console.log('  ✓ CFOP 5910 vinculado a 410001 (inválido recusado antes)');

  await page.click('button.erp-tab:has-text("Tabela oficial")');
  await page.locator('select').first().selectOption('410');
  const linhas = await page.locator('.erp-grid tbody tr').count();
  assert.ok(linhas > 10, `a tabela oficial deveria listar os códigos do CST 410 (veio ${linhas})`);
  await page.screenshot({ path: join(SHOTS, 'vfis0670-tabela.png'), fullPage: true });
  console.log(`  ✓ tabela oficial filtrada por CST 410: ${linhas} códigos`);

  if (NOTA_ID > 0) {
    await page.goto(`${APP}/#/screen/VFIS0200`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.erp-grid').first().waitFor();
    const linha = page.locator('.erp-grid tbody tr', { hasText: String(990001) }).first();
    await linha.locator('button', { hasText: 'Prévia' }).click();
    const modal = page.locator('.erp-modal');
    await modal.waitFor();
    const entradas = modal.locator('input[title^="cClassTrib desta linha"]');
    const valores = await entradas.evaluateAll((els) => els.map((e) => e.value));
    let m = (await modal.innerText()).replace(/\s+/g, ' ');
    assert.deepEqual(valores, ['410001', '000001'], `cClassTrib das linhas: ${valores}`);
    assert.ok(/do CFOP · CST 410/.test(m) && /padrão · CST 000/.test(m), `origens não apareceram: ${m.slice(0, 300)}`);
    console.log('  ✓ prévia: bonificação com 410001 vindo do CFOP');

    await entradas.nth(1).fill('200030');
    await modal.locator('button', { hasText: 'Aplicar' }).first().click();
    await page.waitForFunction(() => document.querySelector('.erp-modal')?.textContent?.includes('da linha'));
    m = (await modal.innerText()).replace(/\s+/g, ' ');
    const depois = await entradas.evaluateAll((els) => els.map((e) => e.value));
    assert.ok(depois[1] === '200030' && /da linha · CST 200/.test(m), `a sobrescrita da linha não apareceu na prévia: ${depois}`);
    await page.screenshot({ path: join(SHOTS, 'vfis0200-previa-reforma.png'), fullPage: true });
    console.log('  ✓ prévia: cClassTrib corrigido na linha (200030, com redução)');
  }

  // Modo de convivência: só o modelo atual exige motivo, avisa na prévia e volta.
  await page.goto(`${APP}/#/screen/VFIS0670`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const blocoModo = page.locator('.erp-fieldset', { hasText: 'Modelo de tributação na NF-e' }).first();
  await blocoModo.waitFor();
  await blocoModo.locator('select').selectOption('SOMENTE_ATUAL');
  await blocoModo.locator('button', { hasText: 'Gravar modo' }).click();
  await page.locator('.erp-feedback.error', { hasText: 'motivo' }).waitFor();
  await blocoModo.locator('input').fill('Teste de convivência dos modelos');
  await blocoModo.locator('button', { hasText: 'Gravar modo' }).click();
  await page.locator('.erp-feedback.success', { hasText: 'só com o modelo atual' }).waitFor();
  await page.locator('.erp-feedback.error', { hasText: 'saindo sem o grupo IBS/CBS' }).waitFor();
  console.log('  ✓ modo "só o modelo atual" exige motivo e fica visível');
  if (NOTA_ID > 0) {
    await page.goto(`${APP}/#/screen/VFIS0200`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.erp-grid').first().waitFor();
    await page.locator('.erp-grid tbody tr', { hasText: String(990001) }).first().locator('button', { hasText: 'Prévia' }).click();
    const modal = page.locator('.erp-modal');
    await modal.waitFor();
    assert.ok(/só com o modelo atual/.test(await modal.innerText()), 'a prévia deveria avisar que o grupo IBS/CBS está desligado');
    await modal.locator('button', { hasText: 'Mostrar' }).first().click();
    const payload = (await modal.innerText());
    assert.ok(/codigo_situacao_tributaria_icms|icms_situacao_tributaria/.test(payload), 'o documento deveria mostrar o modelo atual (ICMS)');
    assert.ok(!/ibs_cbs_situacao_tributaria/.test(payload), 'o documento transmitido não deveria levar o grupo IBS/CBS');
    console.log('  ✓ prévia avisa e o documento sai só com o modelo atual');
    await page.goto(`${APP}/#/screen/VFIS0670`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await blocoModo.waitFor();
  }
  await blocoModo.locator('select').selectOption('AUTOMATICO');
  await blocoModo.locator('button', { hasText: 'Gravar modo' }).click();
  await page.locator('.erp-feedback.success', { hasText: 'modelo atual e o grupo IBS/CBS' }).waitFor();
  console.log('  ✓ de volta ao automático');

  assert.deepEqual(erros, [], `erros na tela:\n${erros.join('\n')}`);
  console.log(`\nOK — capturas em ${SHOTS}`);
} finally {
  await browser.close();
}
