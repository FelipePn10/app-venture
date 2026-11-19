// VPRO0900 → Execução CONTRA A API DE VERDADE: o código de barras da etapa
// aparece na própria etapa (com "Imprimir etiqueta"), "Etiquetas das etapas"
// gera uma por etapa a fazer, a etapa em andamento mostra o cronômetro e
// concluir sem digitar grava as horas corridas e as peças da ordem (banco).
//
// Uso: APP_URL=… EMAIL=… PASSWORD=… PGURL=<banco da API> node scripts/ui-sim/vpro0900-cronometro.mjs
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
const item = 9_200_000_000 + u;
const alm = sql(`SELECT id FROM warehouse WHERE enterprise_id = ${emp} ORDER BY id LIMIT 1`);
sql(`INSERT INTO items(code,business_code,name,warehouse_code,created_by,enterprise_id) VALUES(${item},'CRONO-${u}','PECA CRONOMETRADA ${u}',${alm},'${ator}',${emp})`);
const of = sql(`INSERT INTO production_orders(order_number,item_code,planned_qty,status,start_date,created_by,enterprise_id)
  VALUES((SELECT COALESCE(MAX(order_number),0)+1 FROM production_orders),${item},12,'IN_PROGRESS',CURRENT_DATE,'${ator}',${emp}) RETURNING id`);
const etapa = (seq, nome, padrao) => sql(`INSERT INTO production_order_operations(production_order_id,sequence,operation_name,planned_hours,setup_hours,enterprise_id)
  VALUES(${of},${seq},'${nome}',${padrao},0.5,${emp}) RETURNING id`);
const corte = etapa(10, 'Corte crono', 2), dobra = etapa(20, 'Dobra crono', 1);

const { browser, page, erros } = await abrir();
page.setDefaultTimeout(20000);
let ok = 0;
const passo = (t) => { ok += 1; console.log(`✓ ${t}`); };
const feedback = (re) => page.locator('.erp-feedback', { hasText: re }).first().waitFor();
try {
  await entrar(page);
  await page.goto(`${APP}/#/screen/VPRO0900`);
  await page.fill('.erp-search', `CRONO-${u}`);
  await page.locator('.erp-list-row', { hasText: `CRONO-${u}` }).first().click();
  await page.locator('.erp-tab', { hasText: 'Execução' }).first().click();
  const linhaCorte = page.locator('tr', { hasText: 'Corte crono' }).first();
  await linhaCorte.waitFor();
  assert.match(await linhaCorte.innerText(), /— \/ 2,5/, 'a linha mostra o padrão (2 h + 0,5 h de preparação)');
  passo('Execução: a etapa mostra horas real / padrão do roteiro');

  // Código de barras: aparece na etapa, não escondido no fim da aba.
  await page.getByRole('button', { name: 'Código de barras da etapa' }).click();
  await feedback(/Código de barras da etapa 10 gerado/);
  const detalhe = page.locator('tr.vpro-etapa-detalhe');
  await detalhe.locator('svg[aria-label^="Código de barras"]').waitFor();
  assert.ok(await detalhe.locator('svg rect').count() > 10, 'o desenho do código de barras saiu na etapa');
  await detalhe.getByRole('button', { name: 'Imprimir etiqueta' }).waitFor();
  await page.screenshot({ path: `${SHOTS}/cronometro-codigo.png`, fullPage: true });
  passo('código de barras aparece na própria etapa, com "Imprimir etiqueta"');

  // Etiquetas de todas as etapas: uma por etapa a fazer.
  await page.evaluate(() => { window.print = () => { window.__impresso = (window.__impresso ?? 0) + 1; }; });
  await page.getByRole('button', { name: 'Etiquetas das etapas' }).click();
  await page.waitForFunction(() => (window.__impresso ?? 0) > 0);
  assert.equal(await page.locator('.etiquetas-etapas > div').count(), 2, 'uma etiqueta por etapa a fazer');
  assert.equal(sql(`SELECT count(DISTINCT operation_id) FROM production_scan_tokens WHERE production_order_id = ${of}`), '2');
  passo('"Etiquetas das etapas" gera e imprime uma etiqueta por etapa');

  // Iniciar: o cronômetro aparece; o posto começou há 40 min.
  await linhaCorte.getByRole('button', { name: 'Iniciar' }).click();
  await feedback(/Etapa em andamento/);
  sql(`INSERT INTO production_operation_execution_events(enterprise_id,production_order_id,operation_id,old_status,new_status,actual_hours_delta,source,occurred_at)
    VALUES(${emp},${of},${corte},'PAUSED','IN_PROGRESS',0,'SIMULACAO',clock_timestamp() - interval '40 minutes')`);
  await page.getByRole('button', { name: 'Atualizar' }).click();
  await page.locator('.erp-tab', { hasText: 'Execução' }).first().click();
  await linhaCorte.getByText(/⏱ 40 min/).waitFor();
  passo('etapa em andamento mostra o cronômetro (⏱ 40 min)');

  // Concluir sem digitar nada.
  assert.equal(await page.inputValue('#et-horas'), '', 'horas ficam vazias');
  assert.equal(await page.getAttribute('#et-pecas', 'placeholder'), '12');
  await linhaCorte.getByRole('button', { name: 'Concluir' }).click();
  await feedback(/Etapa concluída: 40 min pelo cronômetro · 12 peça\(s\) \(quantidade da ordem\)/);
  const horas = Number(sql(`SELECT actual_hours FROM production_order_operations WHERE id = ${corte}`));
  assert.ok(horas > 0.66 && horas < 0.7, `horas gravadas pelo cronômetro: ${horas}`);
  passo(`concluir sem digitar gravou ${horas} h (cronômetro) e as 12 peças da ordem`);
  // As horas da etapa entram no custo da OF na hora (máquina/mão de obra).
  assert.equal(sql(`SELECT count(*) FROM production_order_costs WHERE production_order_id = ${of}`), '1', 'concluir a etapa apurou o custo da OF');
  passo('concluir a etapa com horas atualizou o custo real da OF');

  // Digitado corrige o relógio.
  const linhaDobra = page.locator('tr', { hasText: 'Dobra crono' }).first();
  await linhaDobra.getByRole('button', { name: 'Iniciar' }).click();
  await feedback(/Etapa em andamento/);
  if (!(await page.locator('#et-horas').count())) await linhaDobra.getByRole('button', { name: 'Abrir a etapa' }).click();
  await page.fill('#et-horas', '1.25');
  await page.fill('#et-pecas', '11');
  await linhaDobra.getByRole('button', { name: 'Concluir' }).click();
  await feedback(/Etapa concluída: 1 h 15 min · 11 peça\(s\)\./);
  assert.equal(Number(sql(`SELECT actual_hours FROM production_order_operations WHERE id = ${dobra}`)), 1.25);
  passo('horas e peças digitadas valem e corrigem o cronômetro');

  // Esquecida aberta (15 h): sem horas não conclui; pede as horas trabalhadas.
  // Começou ontem e ninguém parou (sem trilha nova: o início é o started_at).
  const solda = sql(`INSERT INTO production_order_operations(production_order_id,sequence,operation_name,planned_hours,setup_hours,status,started_at,enterprise_id)
    VALUES(${of},30,'Solda crono',1,0.5,'IN_PROGRESS',clock_timestamp() - interval '15 hours',${emp}) RETURNING id`);
  await page.getByRole('button', { name: 'Atualizar' }).click();
  await page.locator('.erp-tab', { hasText: 'Execução' }).first().click();
  const linhaSolda = page.locator('tr', { hasText: 'Solda crono' }).first();
  await linhaSolda.getByRole('button', { name: 'Concluir' }).click();
  await feedback(/parece que ficou aberta\. Digite as horas trabalhadas para concluir/);
  assert.equal(sql(`SELECT status FROM production_order_operations WHERE id = ${solda}`), 'IN_PROGRESS');
  if (!(await page.locator('#et-horas').count())) await linhaSolda.getByRole('button', { name: 'Abrir a etapa' }).click();
  await page.fill('#et-horas', '7');
  await linhaSolda.getByRole('button', { name: 'Concluir' }).click();
  await feedback(/Etapa concluída: 7 h/);
  passo('etapa esquecida aberta há 15 h pede as horas; com 7 h digitadas conclui');

  const semRuido = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/i.test(e));
  assert.deepEqual(semRuido, [], `erros de console: ${semRuido.join(' | ')}`);
  console.log(`\n${ok} passos verdes`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/cronometro-falha.png`, fullPage: true }).catch(() => {});
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
