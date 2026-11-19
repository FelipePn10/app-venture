// VMRP0100 contra a API de verdade: uma linha de estrutura numa unidade que não
// converte para a de estoque do componente (tubo estocado em M, linha em KG).
// O cálculo roda, e a tela avisa qual estrutura revisar — antes o aviso só ia
// na resposta e a tela dizia apenas "MRP calculado".
//
// Monta o próprio cenário no banco da API (PGURL) e desliga a linha no fim.
// Uso: APP_URL=http://127.0.0.1:5199 PGURL=postgres://... EMAIL=... PASSWORD=... \
//      node scripts/ui-sim/mrp-estrutura-sem-conversao.mjs
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
const almox = Number(sql(`INSERT INTO warehouse(code,description,created_by,location,type,disposition,reservations_allowed,enterprise_id)
  VALUES('MRPX-${u}','MRP SEM CONV ${u}','${ator}','INTERNO','NORMAL',true,true,${emp}) RETURNING id`));
const item = (nome, n, tipo, estoque) => {
  const c = 94_000_000_000 + u * 10 + n;
  sql(`INSERT INTO items(code,business_code,name,warehouse_code,created_by,enterprise_id,engineering_type,warehouse_unit_of_measurement,engineering_weight)
    VALUES(${c},'${nome}-${u}','${nome} ${u}',${almox},'${ator}',${emp},${tipo},'${estoque}','{"gross":1,"net":1,"unit":"KG"}')`);
  return c;
};
const tubo = item('TUBOX', 1, 1, 'M');
const pai = item('RNX', 2, 0, 'UN');
sql(`INSERT INTO item_structures(parent_code,child_code,quantity,unit_of_measurement,quantity_stock_uom,conversion_factor,sequence,created_by)
  VALUES(${pai},${tubo},2,'KG',2,1,1,'${ator}')`);
const plano = Number(sql(`SELECT COALESCE(MAX(code),9000)+1 FROM production_plans`));
sql(`INSERT INTO production_plans(code,name,created_by,enterprise_id,is_active) VALUES(${plano},'SEM CONVERSAO ${u}','${ator}',${emp},true)`);

const { browser, page, erros } = await abrir();
page.setDefaultTimeout(60000);
let ok = 0;
const passo = (t) => { ok += 1; console.log(`✓ ${t}`); };
try {
  await entrar(page);
  passo('login');
  await page.goto(`${APP}/#/screen/VMRP0100`);
  const sel = page.locator('select[aria-label="Plano"]');
  await sel.locator(`option[value="${plano}"]`).waitFor({ state: 'attached' });
  await sel.selectOption(String(plano));
  await page.locator('button', { hasText: 'Rodar MRP' }).click();
  const aviso = page.locator('.erp-feedback', { hasText: 'MRP calculado' });
  await aviso.waitFor();
  const texto = (await aviso.innerText()).replace(/\s+/g, ' ');
  assert.match(texto, /linha\(s\) de estrutura sem conversão/, texto);
  assert.ok(texto.includes(`RNX-${u}`) && texto.includes(`TUBOX-${u}`), texto);
  passo('o cálculo roda e a tela aponta a estrutura RNX ← tubo em KG sem conversão');
  await page.screenshot({ path: `${SHOTS}/mrp-sem-conversao.png`, fullPage: true });
  const relevantes = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/.test(e));
  assert.deepEqual(relevantes, [], `erros no console: ${relevantes.join(' | ')}`);
  passo('sem erro no console');
  console.log(`\n${ok} passos aprovados. Capturas em ${SHOTS}`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/mrp-sem-conversao-falha.png`, fullPage: true }).catch(() => {});
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally {
  // As próximas rodadas calculam a empresa inteira: a linha sai de cena.
  sql(`UPDATE item_structures SET is_active=false WHERE parent_code=${pai}`);
  await browser.close();
}
