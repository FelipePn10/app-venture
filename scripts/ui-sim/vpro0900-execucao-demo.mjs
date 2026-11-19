// VPRO0900 NO DEMO (make demo-sync carrega o cenário de cadeia): a árvore
// agrupa pelo pedido do projeto OBRA-DEMO com a OF do RN-DEMO e as OFs da
// bucha e do tubo penduradas; a Execução mostra o material de cada etapa; a
// aba Materiais mostra previsto / já saiu / falta sair; uma OF antiga do demo,
// que nasceu sem lista, aparece com o material da estrutura.
//
// Uso: vite com VITE_API_PROXY_TARGET=http://localhost:5072 na 5199 e
//   EMAIL=admin@panossoerp.demo PASSWORD=Demo@12345 node scripts/ui-sim/vpro0900-execucao-demo.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { abrir, entrar, APP, SHOTS } from './nav.mjs';

fs.mkdirSync(SHOTS, { recursive: true });
const { browser, page, erros } = await abrir();
page.setDefaultTimeout(20000);
let ok = 0;
const passo = (t) => { ok += 1; console.log(`✓ ${t}`); };
const linhas = page.locator('.erp-list-row');
const linhaCom = (texto) => linhas.filter({ hasText: texto }).first();
try {
  await entrar(page);
  await page.goto(`${APP}/#/screen/VPRO0900`);
  await linhaCom('RN-DEMO').waitFor();
  passo('login e lista da VPRO0900');

  await page.getByRole('button', { name: /^Árvore/ }).click();
  const grupo = page.locator('.vpro-grupo', { hasText: 'OBRA-DEMO' }).first();
  await grupo.waitFor();
  const textoGrupo = await grupo.innerText();
  assert.match(textoGrupo, /Pedido \d+/, `o grupo diz o pedido: ${textoGrupo}`);
  assert.match(textoGrupo, /3 OF\(s\)/, `o grupo conta as 3 OFs: ${textoGrupo}`);
  // Logo abaixo do grupo: a OF do RN, depois as filhas recuadas.
  const ordem = await page.evaluate(() => {
    const g = [...document.querySelectorAll('.vpro-grupo')].find((x) => x.textContent?.includes('OBRA-DEMO'));
    const out = [];
    for (let n = g?.nextElementSibling; n && !n.classList.contains('vpro-grupo') && out.length < 3; n = n.nextElementSibling) out.push(n.textContent ?? '');
    return out;
  });
  assert.ok(ordem[0]?.includes('RN-DEMO'), `a OF do RN abre o grupo: ${ordem[0]}`);
  assert.ok(ordem.slice(1).every((t) => t.includes('↳')) && ordem.some((t) => t.includes('BU-DEMO')) && ordem.some((t) => t.includes('TP-DEMO')),
    `bucha e tubo penduradas sob o RN: ${ordem.join(' | ')}`);
  await page.screenshot({ path: `${SHOTS}/demo-arvore.png` });
  passo('árvore: grupo do pedido (OBRA-DEMO) com RN e, penduradas, bucha e tubo');

  await linhaCom('RN-DEMO').click();
  await page.locator('.erp-tab', { hasText: 'Execução' }).first().click();
  const etapa20 = page.locator('tr', { hasText: 'Soldagem' }).first();
  await etapa20.waitFor();
  assert.match(await etapa20.innerText(), /2 item\(ns\)/, 'a etapa de solda conta bucha e tubo');
  await etapa20.getByRole('button', { name: 'Abrir a etapa' }).click();
  const detalhe = page.locator('tr.vpro-etapa-detalhe');
  await detalhe.getByText('BU-DEMO').waitFor();
  await detalhe.getByText('TP-DEMO').waitFor();
  assert.ok(await page.getByText(/Apontar produção — última etapa/).count(), 'o apontamento é da última etapa');
  await page.screenshot({ path: `${SHOTS}/demo-execucao.png`, fullPage: true });
  passo('Execução: a etapa de solda abre com a bucha e o tubo; apontamento na última etapa');

  await page.locator('.erp-tab', { hasText: 'Materiais' }).first().click();
  const tabela = page.locator('.erp-grid', { hasText: 'Falta sair' }).first();
  await tabela.waitFor();
  for (const c of ['BU-DEMO', 'TP-DEMO', '20013']) await tabela.locator('tr', { hasText: c }).first().waitFor();
  await page.getByText('Consumo extra ou perda').waitFor();
  await page.screenshot({ path: `${SHOTS}/demo-materiais.png`, fullPage: true });
  passo('Materiais: bucha, tubo e chapa com previsto / já saiu / falta sair; consumo extra na mesma aba');

  // OF antiga do demo (nasceu sem lista): a rotina completou pela estrutura.
  await page.getByRole('button', { name: /^Árvore/ }).click();
  await linhaCom('10002').click();
  await page.locator('.erp-tab', { hasText: 'Materiais' }).first().click();
  await page.locator('.erp-grid', { hasText: 'Falta sair' }).first().locator('tr', { hasText: '20016' }).first().waitFor();
  passo('OF antiga do item 10002: a lista veio da estrutura (20016 e 20017)');

  const semRuido = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/i.test(e));
  assert.deepEqual(semRuido, [], `erros de console: ${semRuido.join(' | ')}`);
  console.log(`\n${ok} passos verdes`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/demo-falha.png`, fullPage: true }).catch(() => {});
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
