// Simulação da cadeia OF filha → OF pai CONTRA A API DE VERDADE.
//
// O caso da Tecnofer: o RN precisa da bucha e do tubo, que também são
// fabricados. O cenário vem do aceite do backend parado depois da entrega da
// bucha (`PARAR_APOS=5 ESTADO=cenario.json bash scripts/test-cadeia-of.sh` no
// panossoerp): a bucha está pronta e reservada para a OF do RN, o tubo ainda
// está em produção e o parâmetro 52 está em "não deixar iniciar".
//
// A tela tem de mostrar a cadeia (pedido, componentes e o que está reservado),
// avisar antes de iniciar, mostrar a recusa do servidor em "não deixar
// iniciar" e, em "avisar", iniciar e mostrar o aviso que o servidor devolve.
//
// Uso: APP_URL=http://127.0.0.1:5199 API_URL=http://localhost:5079 EMAIL=... PASSWORD=... \
//      CENARIO=/caminho/cenario.json node scripts/ui-sim/cadeia-of.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { abrir, entrar, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

const API = process.env.API_URL ?? 'http://localhost:5079';
const c = JSON.parse(fs.readFileSync(process.env.CENARIO, 'utf8'));
fs.mkdirSync(SHOTS, { recursive: true });

const { browser, page, erros } = await abrir();
page.setDefaultTimeout(20000);
const falhas = [];
page.on('response', (r) => { if (r.status() >= 400) falhas.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
let ok = 0;
const passo = (t) => { ok += 1; console.log(`✓ ${t}`); };
const texto = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ');
let tokenDaApi;
const token = async () => {
  if (!tokenDaApi) {
    const r = await fetch(`${API}/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
    assert.ok(r.ok, `login na API: ${r.status}`);
    tokenDaApi = (await r.json()).token;
  }
  return tokenDaApi;
};
const parametro52 = async (valor) => {
  const r = await fetch(`${API}/api/planning-params/update`, { method: 'PUT',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ param_number: 52, value: valor }) });
  assert.ok(r.ok, `parâmetro 52 = ${valor}: ${r.status}`);
};
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

  // ── OF do RN: cadeia no resumo ─────────────────────────────────────────────
  await abrirOF(c.rn1);
  const faixa = page.locator('.erp-feedback.info', { hasText: 'componente(s) fabricado(s)' });
  await faixa.waitFor();
  const t = await texto(faixa);
  assert.match(t, new RegExp(`OF ${c.tp1}`), `a faixa não cita a OF do tubo: ${t}`);
  assert.doesNotMatch(t, new RegExp(`OF ${c.bu1}\\b`), `a bucha já está pronta e não pode aparecer como pendente: ${t}`);
  passo(`faixa: só o tubo (OF ${c.tp1}) ainda não está pronto`);

  const cadeia = page.locator('.erp-fieldset', { hasText: 'Cadeia de fabricação' });
  await cadeia.waitFor();
  const tc = await texto(cadeia);
  assert.match(tc, /Pedido \d+/, `a cadeia não mostra o pedido: ${tc}`);
  const linhaBucha = cadeia.locator('tr', { has: page.locator('button', { hasText: `OF ${c.bu1}` }) });
  assert.match(await texto(linhaBucha), /20/, 'a bucha não mostra as 20 reservadas');
  assert.match(await texto(linhaBucha), /Concluída/, 'a bucha não aparece concluída');
  passo('resumo: pedido de venda, bucha concluída com 20 reservadas, tubo em aberto');
  await page.screenshot({ path: `${SHOTS}/cadeia-resumo.png`, fullPage: true });

  // ── Materiais: reservado para esta OF ──────────────────────────────────────
  await page.locator('.erp-tab', { hasText: 'Materiais' }).click();
  const disp = page.locator('.erp-fieldset', { hasText: 'Disponibilidade para produzir' });
  await disp.waitFor();
  assert.match(await texto(disp.locator("thead")), /Reservado para esta OF/i);
  const linhaDisp = disp.locator('tbody tr').first();
  await linhaDisp.waitFor();
  const linhas = await disp.locator('tbody tr').allInnerTexts();
  assert.ok(linhas.some((l) => /20/.test(l) && /Disponível/.test(l)), `nenhuma linha com a bucha reservada e disponível: ${linhas.join(' | ')}`);
  passo('materiais: a bucha aparece reservada para esta OF e disponível');
  await page.screenshot({ path: `${SHOTS}/cadeia-materiais.png`, fullPage: true });

  // ── Iniciar com "não deixar iniciar" ───────────────────────────────────────
  await page.locator('.erp-tab', { hasText: 'Resumo' }).click();
  await page.locator('button', { hasText: 'Iniciar produção' }).click();
  const dialogo = page.locator('[role="alertdialog"]');
  await dialogo.waitFor();
  const td = await texto(dialogo);
  assert.match(td, /Iniciar antes de os componentes ficarem prontos/, `título do aviso: ${td}`);
  assert.match(td, new RegExp(`OF ${c.tp1}`), `o aviso não diz qual componente falta: ${td}`);
  passo('antes de iniciar, a tela pergunta e diz que o tubo não está pronto');
  await page.screenshot({ path: `${SHOTS}/cadeia-confirmar.png`, fullPage: true });
  await dialogo.locator('button', { hasText: 'Iniciar mesmo assim' }).click();
  const recusa = page.locator('.erp-feedback.error');
  await recusa.waitFor();
  const tr = await texto(recusa);
  assert.match(tr, /não pode começar/, `a recusa do servidor não apareceu: ${tr}`);
  assert.match(tr, new RegExp(`OF ${c.tp1}`), `a recusa não cita a OF do tubo pelo número da tela: ${tr}`);
  assert.match(await texto(page.locator('.vpl-record-title')), /Aberta/, 'a OF mudou de situação mesmo recusada');
  passo(`"não deixar iniciar": o servidor recusa e a tela mostra o motivo (OF ${c.tp1})`);

  // ── Iniciar com "avisar" ───────────────────────────────────────────────────
  await parametro52('AVISAR');
  await page.locator('button', { hasText: 'Iniciar produção' }).click();
  await dialogo.locator('button', { hasText: 'Iniciar mesmo assim' }).click();
  await page.locator('.vpl-record-title', { hasText: 'Em produção' }).waitFor();
  const aviso = page.locator('.erp-feedback', { hasText: 'produção iniciada, mas atenção' });
  await aviso.waitFor();
  assert.match(await texto(aviso), new RegExp(`OF ${c.tp1}`), 'o aviso do servidor não diz qual componente falta');
  passo('"avisar": a OF inicia e a tela mostra o aviso que o servidor devolveu');
  await page.screenshot({ path: `${SHOTS}/cadeia-aviso.png`, fullPage: true });

  // ── A OF da bucha mostra para quem fabrica ─────────────────────────────────
  await abrirOF(c.bu1);
  const cb = page.locator('.erp-fieldset', { hasText: 'Cadeia de fabricação' });
  await cb.waitFor();
  assert.match(await texto(cb), /Esta ordem fabrica componente para/i);
  await cb.locator('button', { hasText: `OF ${c.rn1}` }).click();
  await page.locator('.vpl-record-title', { hasText: `OF ${c.rn1}` }).waitFor();
  passo(`a OF da bucha mostra o RN (OF ${c.rn1}) e abre a OF dele com um clique`);

  // ── Parâmetro 52 na tela de parâmetros ─────────────────────────────────────
  await page.goto(`${APP}/#/screen/VPLN0100`);
  await page.locator('.erp-tab', { hasText: /Parâmetros/ }).click();
  const sel = page.locator('select[aria-label="Valor do parâmetro 52"]');
  await sel.waitFor();
  const opcoes = await sel.locator('option').allInnerTexts();
  assert.deepEqual(opcoes, ['Não conferir', 'Avisar e deixar iniciar', 'Não deixar iniciar']);
  assert.equal(await sel.inputValue(), 'AVISAR');
  passo('parâmetros: o 52 é uma lista com as três opções, mostrando a atual');

  // Respostas de erro que a tela trata: a recusa do início em "não deixar
  // iniciar" (422) e o custo de OF ainda não apurado (404, a aba fica vazia).
  const esperadas = (f) => /^422 POST \/api\/production-order\/\d+\/start$/.test(f) || /^404 GET \/api\/production-order\/\d+\/cost$/.test(f);
  const inesperadas = falhas.filter((f) => !esperadas(f));
  assert.deepEqual(inesperadas, [], `respostas de erro inesperadas: ${inesperadas.join(' | ')}`);
  const relevantes = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/.test(e));
  assert.deepEqual(relevantes, [], `erros no console: ${relevantes.join(' | ')}`);
  passo(`sem erro inesperado (respostas tratadas: ${falhas.length ? [...new Set(falhas.map((f) => f.replace(/\d+/g, '#')))].join(', ') : 'nenhuma'})`);
  console.log(`\n${ok} passos aprovados. Capturas em ${SHOTS}`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/cadeia-falha.png`, fullPage: true }).catch(() => {});
  console.error(`✗ ${e.message}\n  (captura: ${SHOTS}/cadeia-falha.png)`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
