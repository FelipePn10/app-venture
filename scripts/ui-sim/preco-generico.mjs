// VSUP0120 CONTRA A API DE VERDADE: preço lançado com o fornecedor limpo é
// GENÉRICO e vale no pedido. A Tecnofer tinha as linhas da tabela gravadas com
// fornecedor 0: a tela mostrava "Genérico", a busca de preço do pedido ignorava
// a linha e a aprovação recusava por falta de preço.
//
// Monta o próprio cenário no banco da API (PGURL).
// Uso: APP_URL=http://127.0.0.1:5199 PGURL=postgres://... EMAIL=... PASSWORD=... \
//      node scripts/ui-sim/preco-generico.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { abrir, entrar, APP, EMAIL, SHOTS } from './nav.mjs';

const PGURL = process.env.PGURL;
assert.ok(PGURL, 'informe PGURL (o banco da API)');
fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync('psql', [PGURL, '-v', 'ON_ERROR_STOP=1', '-qtAX', '-c', q], { encoding: 'utf8' }).trim();

const u = Date.now() % 1_000_000;
const emp = Number(sql('SELECT id FROM enterprise WHERE code = 1'));
const ator = sql(`SELECT id FROM users WHERE email = '${EMAIL}'`);
const forn = 1_960_000_000 + u;
sql(`INSERT INTO suppliers(code,name,document_number,created_by,enterprise_id) VALUES(${forn},'FORN GENERICO ${u}','${String(forn).padStart(14, '0')}','${ator}',${emp})`);
const item = 93_000_000_000 + u;
const almox = sql(`INSERT INTO warehouse(code,description,created_by,location,type,disposition,reservations_allowed,enterprise_id)
  VALUES('PRG-${u}','DEPOSITO PRECO ${u}','${ator}','INTERNO','NORMAL',true,true,${emp}) RETURNING id`);
sql(`INSERT INTO items(code,business_code,name,warehouse_code,created_by,enterprise_id,engineering_type,warehouse_unit_of_measurement)
  VALUES(${item},'PRG-${u}','CHAPA PRECO GENERICO ${u}',${almox},'${ator}',${emp},1,'UN')`);
const codTab = 900_000 + u;
sql(`INSERT INTO purchase_price_tables(code,description,created_by,enterprise_id) VALUES(${codTab},'TABELA GERAL ${u}','${ator}',${emp})`);

const { browser, page, erros } = await abrir();
page.setDefaultTimeout(20000);
let ok = 0;
const passo = (t) => { ok += 1; console.log(`✓ ${t}`); };
try {
  await entrar(page);
  passo('login');
  await page.goto(`${APP}/#/screen/VSUP0120`);
  await page.locator('input.erp-search').fill(`TABELA GERAL ${u}`);
  await page.locator('.erp-list-row', { hasText: `TABELA GERAL ${u}` }).click();
  const bloco = page.locator('.erp-fieldset', { hasText: 'Adicionar preço' });
  const campo = (rotulo) => bloco.locator('.erp-field', { has: page.locator('label', { hasText: rotulo }) });
  await campo('Item').locator('button.erp-lookup-control').click();
  await page.locator('.erp-lookup-panel input').fill(`PRG-${u}`);
  await page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: `PRG-${u}` }).click();
  await campo('Preço').locator('input').fill('41.7');
  // Escolhe um fornecedor e LIMPA: o campo volta a "Genérico".
  await campo('Fornecedor').locator('button.erp-lookup-control').click();
  await page.locator('.erp-lookup-panel input').fill(`FORN GENERICO ${u}`);
  await page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: `FORN GENERICO ${u}` }).click();
  await campo('Fornecedor').locator('.erp-lookup-clear').click();
  await bloco.locator('button', { hasText: 'Adicionar preço' }).click();
  await page.locator('.erp-feedback', { hasText: 'Preço salvo' }).waitFor();
  const gravado = sql(`SELECT COALESCE(i.supplier_code::text,'NULO') FROM purchase_price_table_items i JOIN purchase_price_tables t ON t.id=i.table_id WHERE t.code=${codTab} AND t.enterprise_id=${emp}`);
  assert.equal(gravado, 'NULO', `o preço genérico gravou fornecedor ${gravado}`);
  passo('preço com o fornecedor limpo grava genérico (vazio), não 0');
  const linha = page.locator('.erp-grid tbody tr', { hasText: `PRG-${u}` });
  await linha.waitFor();
  assert.ok(!(await linha.innerText()).includes('FORN GENERICO'), 'a grade não deve mostrar fornecedor na linha genérica');
  await page.screenshot({ path: `${SHOTS}/preco-generico.png`, fullPage: true });
  passo('a grade mostra a linha sem fornecedor');

  const relevantes = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/.test(e));
  assert.deepEqual(relevantes, [], `erros no console: ${relevantes.join(' | ')}`);
  passo('sem erro no console');
  console.log(`\n${ok} passos aprovados. Capturas em ${SHOTS}`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/preco-generico-falha.png`, fullPage: true }).catch(() => {});
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
