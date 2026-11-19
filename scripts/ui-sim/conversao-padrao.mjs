// VSUP0110 › Conversões padrão CONTRA A API DE VERDADE: gravar 1 JG = 4 PC
// recalcula a estrutura que usa a peça em jogo, e excluir a conversão avisa a
// estrutura que ficou sem conversão (antes a exclusão não dizia nada).
//
// Monta o próprio cenário no banco da API (PGURL) e desliga a linha no fim.
// Uso: APP_URL=http://127.0.0.1:5199 PGURL=postgres://... EMAIL=... PASSWORD=... \
//      node scripts/ui-sim/conversao-padrao.mjs
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
assert.equal(sql(`SELECT COUNT(*) FROM global_unit_conversions WHERE from_uom='JG' AND to_uom='PC' AND enterprise_id=${emp} AND is_active`), '0', 'já existe JG → PC; exclua antes');
const almox = Number(sql(`INSERT INTO warehouse(code,description,created_by,location,type,disposition,reservations_allowed,enterprise_id)
  VALUES('CPAD-${u}','CONV PADRAO ${u}','${ator}','INTERNO','NORMAL',true,true,${emp}) RETURNING id`));
const item = (nome, n, tipo, estoque) => {
  const c = 95_000_000_000 + u * 10 + n;
  sql(`INSERT INTO items(code,business_code,name,warehouse_code,created_by,enterprise_id,engineering_type,warehouse_unit_of_measurement,engineering_weight)
    VALUES(${c},'${nome}-${u}','${nome} ${u}',${almox},'${ator}',${emp},${tipo},'${estoque}','{"gross":1,"net":1,"unit":"KG"}')`);
  return c;
};
const peca = item('PECAJ', 1, 1, 'PC');
const pai = item('RNJ', 2, 0, 'UN');
sql(`INSERT INTO item_structures(parent_code,child_code,quantity,unit_of_measurement,quantity_stock_uom,conversion_factor,sequence,created_by)
  VALUES(${pai},${peca},1,'JG',1,1,1,'${ator}')`);
const linha = () => sql(`SELECT quantity_stock_uom::numeric(20,4)||'|'||conversion_factor::numeric(20,4) FROM item_structures WHERE parent_code=${pai} AND is_active`);

const { browser, page, erros } = await abrir();
page.setDefaultTimeout(30000);
page.on('dialog', (d) => void d.accept());
let ok = 0;
const passo = (t) => { ok += 1; console.log(`✓ ${t}`); };
try {
  await entrar(page);
  passo('login');
  await page.goto(`${APP}/#/screen/VSUP0110`);
  await page.locator('button.erp-tab', { hasText: 'Conversões padrão' }).click();
  const corpo = page.locator('.erp-fieldset', { hasText: 'Nova conversão padrão' });
  const selects = corpo.locator('select');
  const inputs = corpo.locator('input');
  await inputs.nth(0).fill('1');
  await selects.nth(0).selectOption('JG');
  await inputs.nth(1).fill('4');
  await selects.nth(1).selectOption('PC');
  await corpo.locator('button', { hasText: 'Gravar' }).click();
  const gravou = page.locator('.erp-feedback', { hasText: 'Conversão padrão gravada' });
  await gravou.waitFor();
  assert.match(await gravou.innerText(), /recalculadas/);
  assert.equal(linha(), '4.0000|4.0000', 'a estrutura não foi recalculada');
  passo('gravar 1 JG = 4 PC: a tela avisa o recálculo e a linha RNJ passa a 4 PC');

  const lin = page.locator('tr', { hasText: '1 JG = 4 PC' });
  await lin.locator('button', { hasText: 'Excluir' }).click();
  await page.locator('.erp-modal-actions button', { hasText: 'Excluir' }).click();
  const excluiu = page.locator('.erp-feedback', { hasText: 'Conversão padrão excluída' });
  await excluiu.waitFor();
  const texto = (await excluiu.innerText()).replace(/\s+/g, ' ');
  assert.ok(texto.includes(`RNJ-${u}`) && texto.includes(`PECAJ-${u}`), texto);
  passo('excluir: a tela aponta a estrutura RNJ que ficou sem conversão');
  await page.screenshot({ path: `${SHOTS}/conversao-padrao-excluida.png`, fullPage: true });
  const relevantes = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/.test(e));
  assert.deepEqual(relevantes, [], `erros no console: ${relevantes.join(' | ')}`);
  passo('sem erro no console');
  console.log(`\n${ok} passos aprovados. Capturas em ${SHOTS}`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/conversao-padrao-falha.png`, fullPage: true }).catch(() => {});
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally {
  sql(`UPDATE item_structures SET is_active=false WHERE parent_code=${pai}`);
  await browser.close();
}
