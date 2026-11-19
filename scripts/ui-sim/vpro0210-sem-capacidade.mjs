// VPRO0210 → Sequenciar CONTRA A API DE VERDADE: uma OF com etapa que não cabe
// em um ano de máquina não para a programação — a tela avisa a OF, a etapa e
// as horas, e as outras ordens continuam programadas (banco).
//
// Uso: APP_URL=… EMAIL=… PASSWORD=… PGURL=<banco da API> node scripts/ui-sim/vpro0210-sem-capacidade.mjs
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
// Um centro que tem máquina ativa: a etapa vai para ele.
const centro = sql(`SELECT mt.id FROM machine_types mt JOIN machines m ON m.machine_type_code = mt.code AND m.enterprise_id = mt.enterprise_id AND m.is_active
  WHERE mt.enterprise_id = ${emp} AND mt.is_active ORDER BY mt.id LIMIT 1`);
const alm = sql(`SELECT id FROM warehouse WHERE enterprise_id = ${emp} ORDER BY id LIMIT 1`);
const item = 9_300_000_000 + u;
sql(`INSERT INTO items(code,business_code,name,warehouse_code,created_by,enterprise_id) VALUES(${item},'APS-${u}','PECA GIGANTE ${u}',${alm},'${ator}',${emp})`);
const of = sql(`INSERT INTO production_orders(order_number,item_code,planned_qty,status,start_date,created_by,enterprise_id)
  VALUES((SELECT COALESCE(MAX(order_number),0)+1 FROM production_orders),${item},50000,'OPEN',CURRENT_DATE,'${ator}',${emp}) RETURNING id`);
// 9.000 h: tempo de roteiro lido na unidade errada (segundos como horas).
sql(`INSERT INTO production_order_operations(production_order_id,sequence,operation_name,planned_hours,setup_hours,work_center_id,enterprise_id)
  VALUES(${of},10,'Laser gigante',9000,1,${centro},${emp})`);

const { browser, page, erros } = await abrir();
page.setDefaultTimeout(120000);
let ok = 0;
const passo = (t) => { ok += 1; console.log(`✓ ${t}`); };
try {
  await entrar(page);
  await page.goto(`${APP}/#/screen/VPRO0210`);
  await page.getByRole('button', { name: 'Sequenciar ordens' }).click();
  const aviso = page.locator('.erp-feedback', { hasText: new RegExp(`Ficaram fora da programação: .*a etapa 10 da OF ${of} precisa de 9001,0 h`) }).first();
  await aviso.waitFor();
  const texto = await aviso.innerText();
  assert.match(texto, /operação\(ões\) sequenciada\(s\)/, 'as outras ordens foram sequenciadas');
  assert.match(texto, /confira o tempo e a unidade do roteiro/);
  passo(`a tela diz qual OF (${of}), etapa e horas não cabem, sem parar a programação`);
  assert.equal(sql(`SELECT count(*) FROM production_sequences WHERE production_order_id = ${of}`), '0', 'a OF que não cabe não ganha barra pela metade');
  const outras = Number(sql(`SELECT count(*) FROM production_sequences WHERE production_order_id <> ${of} AND updated_at > now() - interval '10 minutes'`));
  assert.ok(outras > 0, 'as demais ordens foram programadas');
  await page.screenshot({ path: `${SHOTS}/vpro0210-sem-capacidade.png`, fullPage: true });
  passo(`a OF gigante ficou sem programação e ${outras} etapa(s) de outras OFs foram programadas`);
  const semRuido = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/i.test(e));
  assert.deepEqual(semRuido, [], `erros de console: ${semRuido.join(' | ')}`);
  console.log(`\n${ok} passos verdes`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/vpro0210-sem-capacidade-falha.png`, fullPage: true }).catch(() => {});
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally {
  sql(`UPDATE production_orders SET status = 'CANCELLED', is_active = FALSE WHERE id = ${of}`);
  await browser.close();
}
