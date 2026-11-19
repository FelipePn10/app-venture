// VPRO0900 + VPLA0120 CONTRA A API DE VERDADE: reconhecer a OF sem decorar o
// número, e o que deixou de ser trabalho manual.
//  - VPLA0120: cadastra um projeto com cliente.
//  - VPRO0900: a OF filha diz "↳ para OF X · item"; a árvore pendura a filha
//    sob a pai; a busca pelo projeto acha as duas.
//  - "Cliente e projeto" na OF pai: a filha que herdou acompanha (banco).
//  - Apontamento sem o campo de depósito da baixa; Custo sem botão de apurar;
//    o apontamento baixa o material automático da lista da OF (banco).
//
// Monta o próprio cenário no banco da API (PGURL): RN (pai) e BU (filha) com
// elo de cadeia, em produção, com um material automático na OF do RN.
// Uso: APP_URL=http://127.0.0.1:5199 PGURL=postgres://... EMAIL=... PASSWORD=... \
//      node scripts/ui-sim/vpro0900-identificacao.mjs
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
const cliente = 880_000_000 + u;
sql(`INSERT INTO customers(code,name,document_number,created_by,enterprise_id) VALUES(${cliente},'CLIENTE SIM ${u}','11444777000161','${ator}',${emp})`);
const [rn, bu, chapa] = [9_100_000_000 + u * 3, 9_100_000_001 + u * 3, 9_100_000_002 + u * 3];
const alm = sql(`INSERT INTO warehouse(code,description,created_by,location,type,disposition,reservations_allowed,enterprise_id)
  VALUES('ALM-${u}','ALMOX SIM ${u}','${ator}','INTERNO','NORMAL',true,true,${emp}) RETURNING id`);
for (const [c, nome] of [[rn, `RN SIM ${u}`], [bu, `BUCHA SIM ${u}`], [chapa, `CHAPA SIM ${u}`]]) {
  sql(`INSERT INTO items(code,business_code,name,warehouse_code,created_by,enterprise_id) VALUES(${c},'${nome.split(' ')[0]}-${u}','${nome}',${alm},'${ator}',${emp})`);
}
const planejada = (item) => sql(`INSERT INTO planned_orders(order_number,item_code,quantity,order_type,demand_type,need_date,created_by,demand_code,enterprise_id,is_firm)
  VALUES(${u % 900000 + Math.floor(Math.random() * 1000)},${item},10,'PRODUCTION','SALES_ORDER',CURRENT_DATE + 5,'${ator}',1,${emp},TRUE) RETURNING id`);
const plRn = planejada(rn), plBu = planejada(bu);
sql(`INSERT INTO production_chain_links(enterprise_id,child_planned_order_id,parent_planned_order_id,quantity,created_by) VALUES(${emp},${plBu},${plRn},10,'${ator}')`);
const of = (item, pl, inicio) => sql(`INSERT INTO production_orders(order_number,item_code,planned_qty,status,start_date,created_by,enterprise_id,planned_order_id,warehouse_id)
  VALUES((SELECT COALESCE(MAX(order_number),0)+1 FROM production_orders),${item},10,'IN_PROGRESS',CURRENT_DATE + ${inicio},'${ator}',${emp},${pl},${alm}) RETURNING id`);
const ofBu = of(bu, plBu, 0);
const ofRn = of(rn, plRn, 2);
// Material automático da OF do RN (20 chapas para 10 RN) e saldo para baixar.
sql(`INSERT INTO production_order_materials(production_order_id,enterprise_id,material_kind,item_code,mask,quantity,warehouse_id,automatic_issue,created_by)
  VALUES(${ofRn},${emp},'DEMAND',${chapa},'',20,${alm},TRUE,'${ator}')`);
sql(`INSERT INTO stock_movements(item_code,mask,warehouse_id,movement_type,quantity,unit_price,total_price,created_by,enterprise_id,movement_date)
  VALUES(${chapa},'',${alm},'IN',100,2,200,'${ator}',${emp},CURRENT_DATE)`);
sql(`INSERT INTO stock_balances(item_code,mask,warehouse_id,quantity,avg_cost,last_cost,total_cost,enterprise_id)
  VALUES(${chapa},'',${alm},100,2,2,200,${emp})`);
const operador = sql(`SELECT code FROM employees WHERE enterprise_id = ${emp} ORDER BY id LIMIT 1`)
  || sql(`INSERT INTO employees(code,name,created_by,enterprise_id) VALUES(${770_000 + (u % 100_000)},'OPERADOR SIM ${u}','${ator}',${emp}) RETURNING code`);

const { browser, page, erros } = await abrir();
page.setDefaultTimeout(20000);
let ok = 0;
const passo = (t) => { ok += 1; console.log(`✓ ${t}`); };
const linhaDaOF = (id) => page.locator('.erp-list-row').filter({ has: page.locator('.erp-list-code', { hasText: new RegExp(`^(↳ )?OF ${id}$`) }) }).first();
try {
  await entrar(page);
  passo('login');

  // VPLA0120: projeto com cliente.
  await page.goto(`${APP}/#/screen/VPLA0120`);
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click();
  await page.fill('#pj-cod', `OBRA-${u}`);
  await page.fill('#pj-nome', `Obra simulada ${u}`);
  const campoCliente = page.locator('.erp-field', { has: page.locator('label', { hasText: 'Cliente' }) }).locator('button.erp-lookup-control');
  await campoCliente.click();
  await page.locator('.erp-lookup-panel input').fill(`CLIENTE SIM ${u}`);
  await page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: `CLIENTE SIM ${u}` }).click();
  await page.getByRole('button', { name: 'Cadastrar projeto' }).click();
  await page.locator('.erp-feedback', { hasText: `Projeto OBRA-${u} cadastrado` }).waitFor();
  assert.equal(sql(`SELECT customer_code FROM projects WHERE enterprise_id = ${emp} AND code = 'OBRA-${u}'`), String(cliente));
  passo(`VPLA0120: projeto OBRA-${u} cadastrado com o cliente`);

  // VPRO0900: a filha diz para qual OF a peça vai.
  await page.goto(`${APP}/#/screen/VPRO0900`);
  await linhaDaOF(ofBu).waitFor();
  assert.match(await linhaDaOF(ofBu).innerText(), new RegExp(`↳ para OF ${ofRn} · RN-${u}`));
  assert.match(await linhaDaOF(ofBu).innerText(), new RegExp(`BUCHA-${u}`));
  passo(`lista: a OF ${ofBu} mostra o item e "↳ para OF ${ofRn} · RN-${u}"`);

  // Árvore: a filha logo abaixo da pai, recuada.
  await page.getByRole('button', { name: /^Árvore/ }).click();
  const codigos = await page.locator('.erp-list-row .erp-list-code').allInnerTexts();
  const iPai = codigos.indexOf(`OF ${ofRn}`), iFilha = codigos.indexOf(`↳ OF ${ofBu}`);
  assert.ok(iPai >= 0 && iFilha === iPai + 1, `na árvore a filha vem logo abaixo da pai (pai ${iPai}, filha ${iFilha})`);
  await page.screenshot({ path: `${SHOTS}/vpro0900-arvore.png` });
  passo('árvore: a OF da bucha fica pendurada sob a OF do RN, mesmo começando antes');

  // Cliente e projeto na pai: a filha acompanha.
  await linhaDaOF(ofRn).click();
  await page.getByRole('button', { name: 'Cliente e projeto' }).click();
  const dlg = page.locator('.erp-modal');
  await dlg.locator('.erp-field', { has: page.locator('label', { hasText: 'Projeto' }) }).locator('button.erp-lookup-control').click();
  await page.locator('.erp-lookup-panel input').fill(`OBRA-${u}`);
  await page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: `Obra simulada ${u}` }).click();
  await dlg.getByRole('button', { name: 'Salvar' }).click();
  await page.locator('.erp-feedback', { hasText: `OF ${ofRn}: cliente e projeto gravados` }).waitFor();
  const proj = sql(`SELECT id FROM projects WHERE enterprise_id = ${emp} AND code = 'OBRA-${u}'`);
  assert.equal(sql(`SELECT customer_code || '/' || project_id FROM production_orders WHERE id = ${ofRn}`), `${cliente}/${proj}`, 'o projeto traz o cliente');
  assert.equal(sql(`SELECT customer_code || '/' || project_id FROM production_orders WHERE id = ${ofBu}`), `${cliente}/${proj}`, 'a filha herda da pai');
  await page.locator('.vpl-record').getByText(`CLIENTE SIM ${u}`).first().waitFor();
  passo('cabeçalho: cliente e projeto gravados na OF do RN, e a OF da bucha herdou os dois');

  // Busca pelo projeto acha a pai e a filha.
  await page.fill('.erp-search', `OBRA-${u}`);
  await page.waitForTimeout(300);
  const achadas = await page.locator('.erp-list-row .erp-list-code').allInnerTexts();
  assert.ok(achadas.some((t) => t.endsWith(`OF ${ofRn}`)) && achadas.some((t) => t.endsWith(`OF ${ofBu}`)), `a busca pelo projeto acha as duas: ${achadas.join(', ')}`);
  passo('busca pelo código do projeto acha a OF do RN e a da bucha');

  // A filha abre e diz de quem é componente.
  await linhaDaOF(ofBu).click();
  await page.locator('.vpl-record').getByRole('button', { name: new RegExp(`OF ${ofRn} · RN-${u}`) }).waitFor();
  passo(`cabeçalho da bucha: "Componente para OF ${ofRn} · RN-${u}" (abre a pai com um clique)`);

  // Execução na OF do RN: o material da etapa aparece; aponta sem escolher depósito.
  await linhaDaOF(ofRn).click();
  await page.locator('.erp-tab', { hasText: 'Materiais' }).first().click();
  await page.getByText('Consumo extra ou perda').waitFor();
  await page.locator('tr', { hasText: `CHAPA-${u}` }).first().waitFor();
  await page.locator('.erp-tab', { hasText: 'Execução' }).first().click();
  assert.equal(await page.getByText('Baixa automática da estrutura').count(), 0, 'o campo de depósito da baixa saiu');
  await page.getByText(/Apontar produção/).first().waitFor();
  await page.fill('#ap-prod', '5');
  const campoOp = page.locator('.erp-field', { has: page.locator('label', { hasText: 'Operador' }) }).locator('.erp-lookup-control');
  await campoOp.click();
  await page.locator('.erp-lookup-panel input').fill(operador);
  await page.waitForTimeout(500);
  await page.locator('.erp-lookup-item').first().click();
  await page.getByRole('button', { name: 'Registrar apontamento' }).click();
  await page.locator('.erp-feedback', { hasText: 'os materiais com baixa automática saíram do estoque' }).waitFor();
  assert.equal(sql(`SELECT COALESCE(SUM(quantity),0)::numeric(18,2) FROM stock_movements WHERE enterprise_id=${emp} AND reference_type='PRODUCTION_ORDER' AND reference_code=${ofRn} AND item_code=${chapa} AND movement_type='OUT'`), '10.00');
  passo('apontar 5 de 10 baixou 10 das 20 chapas da lista da OF, sem escolher depósito');

  // Custo: calculado sozinho, sem botão de apurar.
  await page.locator('.erp-tab', { hasText: 'Custo' }).first().click();
  assert.equal(await page.getByRole('button', { name: /Apurar custo|Apurar de novo/ }).count(), 0);
  await page.getByText(/atualizado em .* sozinho, a cada movimento/).waitFor();
  assert.equal(sql(`SELECT material_cost_real::numeric(18,2) FROM production_order_costs WHERE production_order_id = ${ofRn}`), '20.00');
  await page.screenshot({ path: `${SHOTS}/vpro0900-custo.png`, fullPage: true });
  passo('custo da OF atualizado pelo apontamento (material R$ 20,00), sem botão de apurar');

  const relevantes = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/.test(e));
  assert.deepEqual(relevantes, [], `erros no console: ${relevantes.join(' | ')}`);
  passo('sem erro no console');
  console.log(`\n${ok} passos aprovados. Capturas em ${SHOTS}`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/vpro0900-identificacao-falha.png`, fullPage: true }).catch(() => {});
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
