// VSUP0500 › Empresas CONTRA A API DE VERDADE: a tabela de preço de compra do
// vínculo é escolhida pela busca (código e descrição), não digitada como número.
// Antes o campo pedia um número solto e gravava o id da tabela, que ninguém vê;
// e quem lia o vínculo usava esse id como código da tabela — o pedido ficava sem
// preço. Aqui o id e o código são diferentes de propósito.
//
// Monta o próprio cenário no banco da API (PGURL).
// Uso: APP_URL=http://127.0.0.1:5199 PGURL=postgres://... EMAIL=... PASSWORD=... \
//      node scripts/ui-sim/vinculo-tabela-compra.mjs
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
const forn = 1_950_000_000 + u;
const nome = `VINCULO SIM ${u}`;
sql(`INSERT INTO suppliers(code,name,document_number,created_by,enterprise_id) VALUES(${forn},'${nome}','${String(forn).padStart(14, '0')}','${ator}',${emp})`);
const codTab = 800_000 + u;
const idTab = Number(sql(`INSERT INTO purchase_price_tables(code,description,created_by,enterprise_id,supplier_code)
  VALUES(${codTab},'TABELA VINCULO ${u}','${ator}',${emp},${forn}) RETURNING id`));
assert.notEqual(idTab, codTab);
// Tipo de nota: o vínculo guarda o id; a tela mostra a descrição (antes era um número digitado).
const codNota = 700_000 + u;
const idNota = Number(sql(`INSERT INTO invoice_types(code,description,type,enterprise_id) VALUES(${codNota},'NOTA VINCULO ${u}','OUTROS',${emp}) RETURNING id`));
assert.notEqual(idNota, codNota);
// Parâmetro de compras: o tipo de fornecedor também é guardado pelo id.
const codTipo = 600_000 + u;
const idTipo = Number(sql(`INSERT INTO supplier_types(code,description,enterprise_id) VALUES(${codTipo},'TIPO VINCULO ${u}',${emp}) RETURNING id`));
assert.notEqual(idTipo, codTipo);

const { browser, page, erros } = await abrir();
page.setDefaultTimeout(20000);
let ok = 0;
const passo = (t) => { ok += 1; console.log(`✓ ${t}`); };
try {
  await entrar(page);
  passo('login');
  await page.goto(`${APP}/#/screen/VSUP0500`);
  await page.locator('input.erp-search').fill(nome);
  await page.locator('.erp-list-row', { hasText: nome }).click();
  await page.locator('button.erp-tab', { hasText: 'Empresas' }).click();

  const vinculo = page.locator('.erp-fieldset', { hasText: 'Vincular empresa' });
  const campo = (rotulo) => vinculo.locator('.erp-field', { has: page.locator('label', { hasText: rotulo }) }).locator('button.erp-lookup-control');
  await campo('Estabelecimento').click();
  await page.locator('.erp-lookup-panel .erp-lookup-item').first().click();

  await campo('Tab. preço compra').click();
  await page.locator('.erp-lookup-panel input').fill(String(codTab));
  const opcao = page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: `TABELA VINCULO ${u}` });
  await opcao.waitFor();
  assert.equal((await opcao.locator('.erp-lookup-item-code').innerText()).trim(), String(codTab), 'a busca deve mostrar o código, não o id');
  await opcao.click();
  assert.equal((await campo('Tab. preço compra').innerText()).trim(), `${codTab} — TABELA VINCULO ${u}`);
  passo(`a busca lista a tabela pelo código ${codTab} e descrição (o id ${idTab} fica por trás)`);

  await campo('Tipo NF default').click();
  await page.locator('.erp-lookup-panel input').fill(`NOTA VINCULO ${u}`);
  await page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: `NOTA VINCULO ${u}` }).click();
  passo('o tipo de nota é escolhido pela busca, não digitado como id');

  await vinculo.locator('button', { hasText: 'Vincular empresa' }).click();
  await page.locator('.erp-feedback', { hasText: 'Vínculo de empresa salvo' }).waitFor();
  const gravado = sql(`SELECT se.purchase_price_table_id||'|'||se.default_invoice_type_id FROM supplier_enterprises se JOIN suppliers s ON s.id = se.supplier_id WHERE s.code = ${forn}`);
  assert.equal(gravado, `${idTab}|${idNota}`, `o vínculo gravou ${gravado}, esperado ${idTab}|${idNota}`);
  const linha = page.locator('.erp-grid tbody tr', { hasText: `TABELA VINCULO ${u} (${codTab})` });
  await linha.waitFor();
  assert.ok((await linha.innerText()).includes(`NOTA VINCULO ${u}`), 'a grade deve mostrar a descrição do tipo de nota');
  passo('vínculo gravado com os ids, e a grade mostra tabela e tipo de nota pelo nome');
  await page.screenshot({ path: `${SHOTS}/vinculo-tabela-compra.png`, fullPage: true });

  await page.locator('button', { hasText: 'Cadastros de apoio' }).click();
  await page.locator('button.erp-tab', { hasText: 'Parâmetros de compras' }).click();
  await page.locator('.erp-feedback', { hasText: 'Parâmetros de compras carregados' }).waitFor();
  const tipo = page.locator('.erp-field', { has: page.locator('label', { hasText: 'Tipo de fornecedor para comprar' }) }).locator('button.erp-lookup-control');
  await tipo.click();
  await page.locator('.erp-lookup-panel input').fill(String(codTipo));
  const opTipo = page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: `TIPO VINCULO ${u}` });
  await opTipo.waitFor();
  assert.equal((await opTipo.locator('.erp-lookup-item-code').innerText()).trim(), String(codTipo), 'a busca deve mostrar o código do tipo');
  await opTipo.click();
  await page.locator('button', { hasText: 'Salvar parâmetros' }).click();
  await page.locator('.erp-feedback', { hasText: 'Parâmetros de compras salvos' }).waitFor();
  const tipoGravado = sql(`SELECT purchase_supplier_type_id FROM supplier_parameters WHERE enterprise_code = 1`);
  assert.equal(tipoGravado, String(idTipo), `o parâmetro gravou ${tipoGravado}, esperado o id ${idTipo}`);
  passo(`parâmetro de compras: o tipo de fornecedor é buscado pelo código ${codTipo} e gravado pelo id ${idTipo}`);

  const relevantes = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/.test(e));
  assert.deepEqual(relevantes, [], `erros no console: ${relevantes.join(' | ')}`);
  passo('sem erro no console');
  console.log(`\n${ok} passos aprovados. Capturas em ${SHOTS}`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/vinculo-tabela-compra-falha.png`, fullPage: true }).catch(() => {});
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
