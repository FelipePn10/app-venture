// Lote de inspeção (VINS0300) dirigido pela TELA, contra a API de verdade.
//
// Pré-requisito (banco de teste): item ITEM com saldo no almoxarifado de
// inspeção INSP, roteiro de inspeção com Diâmetro (7,9 a 8,1) e Rosca, e
// procedimento NBR 5426 nível II NQA 1,0; almoxarifados ALM (disponível) e REJ
// (rejeição). Abre o lote pela tela, grava 80 unidades com 3 diâmetros fora,
// confere a recusa da amostragem, tenta aceitar tudo sem concessão e decide
// 950 aceitas + 50 rejeitadas.
//
// Uso: APP_URL=... EMAIL=... PASSWORD=... ITEM=... INSP=... ALM=... REJ=... FORNECEDOR=... node scripts/ui-sim/lote-inspecao.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrir, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

const { ITEM, INSP, ALM, REJ } = process.env;
const FORNECEDOR = process.env.FORNECEDOR ?? '555';
assert.ok(ITEM && INSP && ALM && REJ, 'informe ITEM, INSP, ALM e REJ');
mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await abrir();
page.setDefaultTimeout(25000);
const erros = [];
page.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));
const bloco = (titulo) => page.locator('.erp-fieldset', { has: page.locator('.erp-fieldset-head', { hasText: titulo }) }).first();
const campo = (b, rotulo) => b.locator('.erp-field', { has: page.locator('label', { hasText: rotulo }) }).locator('input, select').first();

try {
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* sem armazenamento */ } });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('input[placeholder="voce@empresa.com"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 30000 });
  await page.goto(`${APP}/#/screen/VINS0300`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.erp-toolbar').waitFor();

  // Abertura pela tela.
  await page.click('button:has-text("Novo lote manual")');
  const novo = bloco('Novo lote manual');
  await campo(novo, 'Origem').selectOption('RECEBIMENTO');
  await campo(novo, 'Item').fill(ITEM);
  await campo(novo, 'Quantidade').fill('1000');
  await campo(novo, 'Almoxarifado de inspeção').selectOption(INSP);
  await campo(novo, 'Fornecedor').fill(FORNECEDOR);
  await campo(novo, 'Lote / corrida').fill('CORRIDA-SIM');
  await novo.locator('button', { hasText: 'Abrir lote' }).click();
  await page.locator('.erp-feedback.success', { hasText: 'aberto' }).waitFor();
  const cab = page.locator('.erp-fieldset-head', { hasText: /^Lote \d+ — Recebimento/ });
  await cab.waitFor();
  const resumo = await page.locator('.erp-fieldset', { has: cab }).innerText();
  assert.match(resumo, /inspecionar 80, aceitar com até 2/);
  assert.match(resumo, /Fornecedor/);
  console.log('  ✓ lote aberto pela tela: roteiro copiado, amostragem J — n 80, Ac 2');

  // 80 unidades, 4 páginas; diâmetros 1-3 fora (8,25 em pt-BR).
  const res = bloco('Resultados');
  for (let pagina = 0; pagina < 4; pagina++) {
    const linhas = res.locator('tbody tr');
    const n = await linhas.count();
    for (let i = 0; i < n; i++) {
      const tr = linhas.nth(i);
      const unidade = Number(await tr.locator('td').first().innerText());
      await tr.locator('input').first().fill(unidade <= 3 ? '8,25' : '8,0');
      await tr.locator('select').first().selectOption('S');
    }
    if (pagina < 3) await res.locator('button', { hasText: 'Próximas' }).click();
  }
  await res.locator('button', { hasText: 'Gravar resultados' }).click();
  await page.locator('.erp-feedback.success', { hasText: '160 resultado(s) gravado(s)' }).waitFor();
  const aval = await page.locator('.erp-fieldset', { has: cab }).innerText();
  assert.match(aval, /3 unidade\(s\) não conforme\(s\)/);
  assert.match(aval, /recusado pela amostragem/);
  console.log('  ✓ 160 resultados gravados pela tela; a avaliação conta 3 unidades fora → recusado (Ac 2)');

  // Aceitar tudo sem concessão é recusado.
  const decisao = bloco('Decisão de uso');
  await decisao.locator('button', { hasText: 'Aceitar tudo' }).click();
  await campo(decisao, 'Destino aceita').selectOption(ALM);
  await decisao.locator('button', { hasText: 'Registrar decisão' }).click();
  await page.locator('.erp-feedback.error', { hasText: 'CONCESSAO' }).waitFor();
  console.log('  ✓ aceitar o lote recusado sem concessão é barrado com a explicação');

  // Separação: 950 aceitas, 50 rejeitadas.
  await campo(decisao, 'Aceita').fill('950');
  await campo(decisao, 'Rejeitada').fill('50');
  await campo(decisao, 'Destino rejeitada').selectOption(REJ);
  await campo(decisao, 'Tratamento').selectOption('SELECIONAR');
  await campo(decisao, 'Motivo').fill('Triagem 100% do diâmetro');
  await decisao.locator('button', { hasText: 'Registrar decisão' }).click();
  await page.locator('.erp-feedback.success', { hasText: 'o estoque saiu da inspeção' }).waitFor();
  const dec = await bloco('Decisão de uso —').innerText();
  assert.match(dec, /Parcial/i);
  assert.match(dec, /Aceita\s+950/i);
  assert.match(dec, /Rejeitada\s+50/i);
  assert.match(dec, /selecionar/i);
  await page.screenshot({ path: join(SHOTS, 'vins0300-decisao.png'), fullPage: true });
  console.log('  ✓ decisão parcial pela tela: 950 aceitas → disponível, 50 rejeitadas → rejeição');
  assert.deepEqual(erros, [], `erros na tela:\n${erros.join('\n')}`);
  console.log('OK');
} finally {
  await browser.close();
}
