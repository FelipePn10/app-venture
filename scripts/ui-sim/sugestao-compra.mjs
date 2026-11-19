// Aprovação da sugestão de compra do MRP (VPDC0200 › Sugestões do MRP) CONTRA A
// API DE VERDADE — o caso da chapa da Tecnofer: estocada em kg, comprada em UN
// (1 UN = 84,78 kg), com preço na tabela do fornecedor por kg.
//
// Com o preço em branco, a tela aprova e o pedido sai em chapas inteiras com o
// preço da tabela convertido; num item sem tabela, a tela mostra a recusa do
// servidor (antes o pedido ia a R$ 0,00 e passava pela alçada).
//
// Monta o próprio cenário no banco da API (PGURL) e roda na tela.
// Uso: APP_URL=http://127.0.0.1:5199 API_URL=http://localhost:5079 PGURL=postgres://... \
//      EMAIL=... PASSWORD=... node scripts/ui-sim/sugestao-compra.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { abrir, entrar, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

const API = process.env.API_URL ?? 'http://localhost:5079';
const PGURL = process.env.PGURL;
assert.ok(PGURL, 'informe PGURL (o banco da API)');
fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync('psql', [PGURL, '-v', 'ON_ERROR_STOP=1', '-qtAX', '-c', q], { encoding: 'utf8' }).trim();

// ── Cenário ──────────────────────────────────────────────────────────────────
const u = Date.now() % 1_000_000;
const emp = Number(sql('SELECT id FROM enterprise WHERE code = 1'));
const ator = sql(`SELECT id FROM users WHERE email = '${EMAIL}'`);
const almox = Number(sql(`INSERT INTO warehouse(code,description,created_by,location,type,disposition,reservations_allowed,enterprise_id)
  VALUES('SUG-${u}','SUGESTAO ${u}','${ator}','INTERNO','NORMAL',true,true,${emp}) RETURNING id`));
const item = (nome, n, estoque, compra) => {
  const c = 93_000_000_000 + u * 10 + n;
  sql(`INSERT INTO items(code,business_code,name,warehouse_code,created_by,enterprise_id,engineering_type,warehouse_unit_of_measurement,supplies_purchase_uom,engineering_weight)
    VALUES(${c},'${nome}-${u}','${nome} ${u}',${almox},'${ator}',${emp},1,'${estoque}','${compra}','{"gross":1,"net":1,"unit":"KG"}')`);
  return c;
};
const chapa = item('CHAPA', 1, 'KG', 'UN');
const parafuso = item('PARAF', 2, 'UN', 'UN');
const forn = 1_900_000_000 + u;
sql(`INSERT INTO suppliers(code,name,document_number,created_by,enterprise_id) VALUES(${forn},'ACO SIM ${u}','${String(forn).padStart(14, '0')}','${ator}',${emp})`);
for (const c of [chapa, parafuso]) {
  sql(`INSERT INTO item_preferred_suppliers(item_code,supplier_code,is_preferred,created_by,enterprise_id) VALUES(${c},${forn},true,'${ator}',${emp})`);
}
const tab = Number(sql(`INSERT INTO purchase_price_tables(code,description,created_by,enterprise_id,supplier_code) VALUES(${u},'SIM ${u}','${ator}',${emp},${forn}) RETURNING id`));
sql(`INSERT INTO purchase_price_table_items(table_id,item_code,uom,price) VALUES(${tab},${chapa},'KG',12.50)`);
const planejada = (c, qtd) => Number(sql(`INSERT INTO planned_orders(order_number,item_code,quantity,order_type,demand_type,need_date,created_by,demand_code,enterprise_id,warehouse_code,supplier_code)
  VALUES(${u * 10 + (c % 10)},${c},${qtd},'PURCHASE','REPLENISHMENT',CURRENT_DATE+20,'${ator}',0,${emp},${almox},${forn}) RETURNING code`));
const plChapa = planejada(chapa, '376.7932');
const plParaf = planejada(parafuso, '100');

const login = await fetch(`${API}/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
const token = (await login.json()).token;
const conv = await fetch(`${API}/api/item-conversions/`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ item_code: `CHAPA-${u}`, from_uom: 'UN', to_uom: 'KG', factor: '84.78', rounding_percent: '0', tolerance_value: '0', tolerance_type: 'PERCENT' }) });
assert.ok(conv.ok, `conversão da chapa: ${conv.status}`);

// ── Tela ─────────────────────────────────────────────────────────────────────
const { browser, page, erros } = await abrir();
page.setDefaultTimeout(20000);
const falhas = [];
page.on('response', (r) => { if (r.status() >= 400) falhas.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
let ok = 0;
const passo = (t) => { ok += 1; console.log(`✓ ${t}`); };
const texto = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ');

const abrirSugestoes = async () => {
  await page.goto(`${APP}/#/screen/VPDC0200`);
  await page.locator('button', { hasText: 'Sugestões do MRP' }).click();
  await page.locator('[data-testid="sugestoes-mrp"] tbody tr').first().waitFor();
};
const linhaDa = (code) => page.locator('[data-testid="sugestoes-mrp"] tbody tr', { has: page.locator('td', { hasText: new RegExp(`^${code}$`) }) });

try {
  await entrar(page);
  passo('login');

  // Parafuso sem tabela de preço: preço em branco → a tela mostra a recusa.
  await abrirSugestoes();
  await linhaDa(plParaf).locator('button', { hasText: 'Aprovar' }).click();
  const preco = page.locator('input[aria-label="Preço unitário"]');
  await preco.waitFor();
  assert.equal(await preco.getAttribute('placeholder'), 'Tabela do fornecedor');
  assert.match(await texto(page.locator('.erp-field-hint', { hasText: 'Vazio' })), /tabela de preço do fornecedor/);
  passo('o preço aceita ficar em branco e a tela explica: vale a tabela do fornecedor, na unidade de compra');
  await page.locator('button', { hasText: 'Gerar pedido' }).click();
  const recusa = page.locator('.erp-feedback.error', { hasText: 'não tem preço' });
  await recusa.waitFor();
  passo('item sem preço em tabela: a tela mostra a recusa do servidor (antes saía pedido a R$ 0,00)');
  await page.screenshot({ path: `${SHOTS}/sugestao-sem-preco.png`, fullPage: true });
  assert.equal(sql(`SELECT COUNT(*) FROM purchase_order_items WHERE planned_order_code=${plParaf}`), '0', 'gerou pedido sem preço');

  // Chapa: preço em branco → tabela por kg convertida, pedido em chapas inteiras.
  await page.locator('button', { hasText: 'Desistir' }).click();
  await linhaDa(plChapa).locator('button', { hasText: 'Aprovar' }).click();
  await page.locator('button', { hasText: 'Gerar pedido' }).click();
  await page.locator('.erp-feedback', { hasText: 'Sugestão aprovada' }).waitFor();
  passo('chapa aprovada com o preço em branco');
  await page.screenshot({ path: `${SHOTS}/sugestao-chapa.png`, fullPage: true });
  const l = sql(`SELECT requested_qty::numeric(18,4)||'|'||purchase_uom||'|'||unit_price::numeric(18,4)||'|'||internal_qty::numeric(18,4)
    FROM purchase_order_items WHERE planned_order_code=${plChapa}`).split('|');
  assert.deepEqual(l, ['5.0000', 'UN', '1059.7500', '423.9000'], `linha do pedido: ${l}`);
  passo('o pedido aberto tem 5 UN de chapa a R$ 1.059,75 (12,50/kg × 84,78) e 423,9 kg no estoque');

  const esperadas = (f) => /^422 POST \/api\/purchase-order\/suggestions\/\d+\/approve$/.test(f);
  const inesperadas = falhas.filter((f) => !esperadas(f));
  assert.deepEqual(inesperadas, [], `respostas de erro inesperadas: ${inesperadas.join(' | ')}`);
  const relevantes = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/.test(e));
  assert.deepEqual(relevantes, [], `erros no console: ${relevantes.join(' | ')}`);
  passo('sem erro inesperado (só a recusa do item sem preço)');
  console.log(`\n${ok} passos aprovados. Capturas em ${SHOTS}`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/sugestao-falha.png`, fullPage: true }).catch(() => {});
  console.error(`✗ ${e.message}\n  (captura: ${SHOTS}/sugestao-falha.png)`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
