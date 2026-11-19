// Cadeia de OF SEM pedido de venda (VPRO0900) CONTRA A API DE VERDADE: o RN é
// feito para estoque (demanda independente). A OF da bucha mostra para que ela
// está sendo feita — a demanda do RN, herdada da OF pai — e a OF do RN mostra
// a mesma demanda e as filhas. Antes a cadeia só mostrava pedido de venda, e
// sem pedido a bucha não dizia de onde vinha.
//
// Cenário: PARAR_APOS=3 ESTADO=cenario.json bash scripts/test-cadeia-demanda-independente.sh
// (no backend). Uso: APP_URL=... API_URL=... EMAIL=... PASSWORD=... CENARIO=cenario.json \
//      node scripts/ui-sim/cadeia-demanda.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { abrir, entrar, APP, SHOTS } from './nav.mjs';

const c = JSON.parse(fs.readFileSync(process.env.CENARIO, 'utf8'));
fs.mkdirSync(SHOTS, { recursive: true });

const { browser, page, erros } = await abrir();
page.setDefaultTimeout(20000);
let ok = 0;
const passo = (t) => { ok += 1; console.log(`✓ ${t}`); };
const texto = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ');
const abrirOF = async (id) => {
  await page.goto(`${APP}/#/screen/VPRO0900`);
  await page.locator('.erp-list-row').first().waitFor();
  await page.locator('.erp-chip', { hasText: 'Todas' }).click();
  await page.locator('.erp-list-row', { has: page.locator('.erp-list-code', { hasText: new RegExp(`^OF ${id}$`) }) }).click();
  await page.locator('.vpl-record-title', { hasText: `OF ${id}` }).waitFor();
};

try {
  await entrar(page);
  passo('login');

  await abrirOF(c.bu1);
  const painel = page.locator('.vpl-panel, .erp-fieldset, section', { hasText: 'Cadeia de fabricação' }).last();
  const selo = painel.locator('text=/Demanda ' + c.dem1 + ' · Produção para estoque/');
  await selo.waitFor();
  const t = await texto(selo);
  assert.ok(t.includes(`RN-${c.sufixo}`), t);
  assert.ok(!(await texto(painel)).includes('Pedido(s) de venda'), 'sem pedido de venda, a cadeia não mostra a seção de pedidos');
  assert.ok((await texto(painel)).includes(`OF ${c.rn1}`), 'a bucha mostra a OF do RN como pai');
  const corpo = await texto(page.locator('body'));
  assert.ok(!/parent_item=/.test(corpo), 'a observação da OF não pode mostrar a marca técnica parent_item=');
  assert.ok(corpo.includes('Componente gerado pelo MRP para a ordem pai'), 'a observação traduz a marca do MRP');
  passo(`OF da bucha: mostra a demanda ${c.dem1} (produção para estoque) do RN e a OF ${c.rn1} como pai`);
  await page.screenshot({ path: `${SHOTS}/cadeia-demanda-bucha.png`, fullPage: true });

  await abrirOF(c.rn1);
  const painelRN = page.locator('.vpl-panel, .erp-fieldset, section', { hasText: 'Cadeia de fabricação' }).last();
  await painelRN.locator('text=/Demanda ' + c.dem1 + ' ·/').waitFor();
  const tRN = await texto(painelRN);
  assert.ok(tRN.includes(`OF ${c.bu1}`) && tRN.includes(`OF ${c.tp1}`), tRN);
  passo('OF do RN: mostra a mesma demanda e a bucha e o tubo como filhas');

  const relevantes = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/.test(e));
  assert.deepEqual(relevantes, [], `erros no console: ${relevantes.join(' | ')}`);
  passo('sem erro no console');
  console.log(`\n${ok} passos aprovados. Capturas em ${SHOTS}`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/cadeia-demanda-falha.png`, fullPage: true }).catch(() => {});
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
