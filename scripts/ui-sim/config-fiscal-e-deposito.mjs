// VNOT0100 e VCUT0100 CONTRA A API DE VERDADE: campos que guardam id interno e
// eram números digitados à mão.
//  - VNOT0100 › Configuração fiscal: escolhe a configuração da própria empresa
//    (razão social e CNPJ); o servidor recusa a de outra empresa.
//  - VCUT0100 › Depósito padrão: escolhe o almoxarifado pela busca; grava o id,
//    que é o que o estoque usa ao firmar o plano.
//
// Monta o próprio cenário no banco da API (PGURL).
// Uso: APP_URL=http://127.0.0.1:5199 PGURL=postgres://... EMAIL=... PASSWORD=... \
//      node scripts/ui-sim/config-fiscal-e-deposito.mjs
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
let cfg = sql(`SELECT id FROM fiscal_configs WHERE enterprise_id = ${emp}`);
if (!cfg) cfg = sql(`INSERT INTO fiscal_configs(cnpj_empresa,razao_social,uf_empresa,updated_by,enterprise_id) VALUES('11222333000181','EMPRESA SIM ${u}','PR','${ator}',${emp}) RETURNING id`);
const razao = sql(`SELECT razao_social FROM fiscal_configs WHERE id = ${cfg}`);
const codAlm = `DEP-${u}`;
const idAlm = sql(`INSERT INTO warehouse(code,description,created_by,location,type,disposition,reservations_allowed,enterprise_id)
  VALUES('${codAlm}','DEPOSITO CORTE ${u}','${ator}','INTERNO','NORMAL',true,true,${emp}) RETURNING id`);

const { browser, page, erros } = await abrir();
page.setDefaultTimeout(20000);
let ok = 0;
const passo = (t) => { ok += 1; console.log(`✓ ${t}`); };
try {
  await entrar(page);
  passo('login');

  await page.goto(`${APP}/#/screen/VNOT0100`);
  const sel = page.locator('select[aria-label="Configuração fiscal"]');
  await sel.locator(`option[value="${cfg}"]`).waitFor({ state: 'attached' });
  assert.match(await sel.locator(`option[value="${cfg}"]`).innerText(), new RegExp(razao));
  await sel.selectOption(String(cfg));
  await page.locator('button', { hasText: 'Salvar configuração' }).click();
  await page.locator('.erp-feedback', { hasText: 'Configuração da central salva' }).waitFor();
  assert.equal(sql(`SELECT fiscal_config_id FROM enterprise_notification_settings WHERE enterprise_id = ${emp}`), cfg);
  passo(`VNOT0100: a configuração fiscal é escolhida pela razão social (${razao}) e gravada pelo id ${cfg}`);

  await page.goto(`${APP}/#/screen/VCUT0100`);
  const dep = page.locator('.erp-field', { has: page.locator('label', { hasText: 'Depósito padrão' }) }).locator('button.erp-lookup-control');
  await dep.click();
  await page.locator('.erp-lookup-panel input').fill(`DEPOSITO CORTE ${u}`);
  await page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: `DEPOSITO CORTE ${u}` }).click();
  await page.locator('button', { hasText: 'Salvar padrões' }).click();
  await page.locator('.erp-feedback', { hasText: 'Padrões da empresa salvos' }).waitFor();
  assert.equal(sql(`SELECT default_warehouse_id FROM cutting_settings WHERE enterprise_id = ${emp}`), idAlm);
  passo(`VCUT0100: o depósito padrão é escolhido pelo nome (código ${codAlm}) e gravado pelo id ${idAlm}`);
  await page.screenshot({ path: `${SHOTS}/vcut-deposito.png`, fullPage: true });

  const relevantes = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/.test(e));
  assert.deepEqual(relevantes, [], `erros no console: ${relevantes.join(' | ')}`);
  passo('sem erro no console');
  console.log(`\n${ok} passos aprovados. Capturas em ${SHOTS}`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/config-fiscal-deposito-falha.png`, fullPage: true }).catch(() => {});
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
