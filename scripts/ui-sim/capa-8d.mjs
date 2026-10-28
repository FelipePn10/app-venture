// CAPA / 8D (VINS0500) dirigida pela TELA, contra a API de verdade.
//
// Pré-requisito: a NC aberta pela recusa de um lote de inspeção (NC_CODE) e um
// segundo usuário ativo da empresa (MEMBRO, pelo nome). Percorre o 8D inteiro:
// abre a CAPA a partir da NC, monta a equipe, descreve o problema, dispensa a
// contenção com justificativa, faz 5 porquês, inclui e conclui a ação corretiva
// com evidência, registra a prevenção e encerra como eficaz.
//
// Uso: APP_URL=... EMAIL=... PASSWORD=... NC_CODE=... LIDER=... MEMBRO=... node scripts/ui-sim/capa-8d.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrir, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

const { NC_CODE, LIDER, MEMBRO } = process.env;
assert.ok(NC_CODE && LIDER && MEMBRO, 'informe NC_CODE, LIDER e MEMBRO');
mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await abrir();
page.setDefaultTimeout(25000);
const erros = [];
page.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));
const bloco = (titulo) => page.locator('.erp-fieldset', { has: page.locator('.erp-fieldset-head', { hasText: titulo }) }).first();
const campo = (b, rotulo) => b.locator('.erp-field', { has: page.locator('label', { hasText: rotulo }) }).locator('input, select, textarea').first();
const ok = async (texto) => { await page.locator('.erp-feedback.success', { hasText: texto }).last().waitFor(); };
const avancar = async (etapa) => {
  await page.click('button:has-text("Concluir etapa e avançar")');
  await ok(`Avançou para ${etapa}`);
};
const gravar = async () => { await page.click('button:has-text("Gravar análise")'); await ok('Análise gravada'); };
const opcao = async (select, texto) => {
  const v = await select.locator('option', { hasText: texto }).first().getAttribute('value');
  assert.ok(v, `opção "${texto}" não encontrada`);
  await select.selectOption(v);
};

try {
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* sem armazenamento */ } });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('input[placeholder="voce@empresa.com"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 30000 });
  await page.goto(`${APP}/#/screen/VINS0500`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.erp-tabs').waitFor();

  // NC do lote → CAPA 8D.
  const linhaNC = page.locator('.erp-grid tbody tr', { has: page.locator('td', { hasText: new RegExp(`^${NC_CODE}$`) }) }).first();
  await linhaNC.waitFor();
  assert.match(await linhaNC.innerText(), /Lote \d+/);
  await linhaNC.locator('input[type="checkbox"]').check();
  await page.click('button:has-text("Nova CAPA")');
  const nova = bloco('Nova CAPA');
  await campo(nova, 'Método').selectOption('8D');
  await campo(nova, 'Origem').selectOption('NC');
  await campo(nova, 'Título').fill('Diâmetro do parafuso fora (lote recusado)');
  await nova.locator('button', { hasText: 'Abrir CAPA' }).click();
  await ok('aberta (8D)');
  console.log('  ✓ CAPA 8D aberta a partir da NC do lote');

  await avancar('D1');
  // D1: sem equipe não avança.
  await page.click('button:has-text("Concluir etapa e avançar")');
  await page.locator('.erp-feedback.error', { hasText: 'líder' }).waitFor();
  const equipe = bloco('D1 — Equipe');
  await equipe.locator('button', { hasText: '+ Pessoa' }).click();
  await equipe.locator('button', { hasText: '+ Pessoa' }).click();
  await opcao(equipe.locator('select').nth(0), LIDER);
  await equipe.locator('select').nth(1).selectOption('LIDER');
  await opcao(equipe.locator('select').nth(2), MEMBRO);
  await gravar();
  await avancar('D2');
  console.log('  ✓ D1: avanço barrado sem líder; equipe gravada');

  const d2 = bloco('D2 — Descrição do problema');
  await campo(d2, 'O quê').fill('diâmetro 8,25 mm acima do máximo 8,1');
  await campo(d2, 'Onde').fill('rosqueadeira 2');
  await campo(d2, 'Quando').fill('turno B, 21/10');
  await campo(d2, 'Quanto').fill('3 em 80 na amostra');
  await gravar();
  await avancar('D3');
  await campo(bloco('D3 — Contenção'), 'Contenção não necessária').fill('lote separado na rejeição pela decisão de uso; nada expedido');
  await gravar();
  await avancar('D4');
  const d4 = bloco('D4 — Causa raiz');
  await campo(d4, 'Método').selectOption('5PORQUES');
  await campo(d4, '1º por quê').fill('matriz de laminação gasta');
  await campo(d4, '2º por quê').fill('troca só quando quebra');
  await campo(d4, '3º por quê').fill('sem controle de vida da matriz');
  await campo(d4, 'Causa raiz').fill('vida da matriz não controlada');
  await campo(d4, 'Ponto de escape').fill('medição só no fim do turno');
  await gravar();
  await avancar('D5');
  console.log('  ✓ D2–D4: 5W2H, contenção justificada e 5 porquês');

  const acoes = bloco('Ações');
  await campo(acoes, 'Tipo').selectOption('CORRETIVA');
  await campo(acoes, 'Ação').fill('contador de golpes na matriz com troca preventiva');
  await opcao(campo(acoes, 'Responsável'), LIDER);
  await acoes.locator('button', { hasText: 'Incluir' }).click();
  await ok('Ação incluída');
  await avancar('D6');
  const linha = acoes.locator('tbody tr', { hasText: 'contador de golpes' });
  await linha.locator('button', { hasText: 'Concluir' }).click();
  await page.locator('.erp-feedback.error', { hasText: 'evidência' }).waitFor();
  await linha.locator('input').fill('contador instalado — OS 4512');
  await linha.locator('button', { hasText: 'Concluir' }).click();
  await ok('Ação concluída');
  await avancar('D7');
  await campo(bloco('D7 — Prevenção'), 'O que muda').fill('vida da matriz no plano de manutenção e medição a cada 50 peças');
  await gravar();
  await avancar('D8');
  console.log('  ✓ D5–D7: ação concluída só com evidência; prevenção registrada');

  const d8 = bloco('D8 — Encerramento');
  await campo(d8, 'Como a eficácia foi verificada').fill('5 lotes seguintes aceitos sem diâmetro fora');
  await d8.locator('button', { hasText: 'Eficaz — encerrar' }).click();
  await ok('encerrada: ação eficaz');
  const hist = await bloco('Histórico').innerText();
  assert.match(hist, /encerrada/i);
  assert.equal((hist.match(/etapa/gi) ?? []).length >= 8, true, 'o histórico deveria ter as 8 trocas de etapa');
  await page.screenshot({ path: join(SHOTS, 'vins0500-capa.png'), fullPage: true });
  console.log('  ✓ D8: encerrada como eficaz; histórico com todas as etapas');

  await page.click('button.erp-tab:has-text("Não conformidades")');
  await page.locator('.erp-grid tbody tr', { has: page.locator('td', { hasText: new RegExp(`^${NC_CODE}$`) }) }).locator('button', { hasText: /CAPA \d+/ }).waitFor();
  console.log('  ✓ a NC mostra a CAPA ligada');
  assert.deepEqual(erros, [], `erros na tela:\n${erros.join('\n')}`);
  console.log('OK');
} finally {
  await browser.close();
}
