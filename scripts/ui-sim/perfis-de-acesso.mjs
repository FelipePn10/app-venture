// Perfis de acesso (VADM0200) dirigidos pela TELA, contra a API de verdade:
// o administrador cria o perfil "Vendas" (comercial: consultar e incluir) e o
// liga ao usuário; o usuário entra e o menu só mostra o comercial; a tentativa
// de abrir uma rotina fiscal é recusada com a mensagem do perfil. Ao final o
// vínculo e o perfil são desfeitos pela própria tela.
//
// Uso: APP_URL=... EMAIL=<admin> PASSWORD=... USER_EMAIL=<usuário USER> USER_PASSWORD=... node scripts/ui-sim/perfis-de-acesso.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrir, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

const USER_EMAIL = process.env.USER_EMAIL;
const USER_PASSWORD = process.env.USER_PASSWORD;
const PERFIL = `Vendas UI ${Date.now() % 100000}`;
mkdirSync(SHOTS, { recursive: true });

async function entrar(page, email, senha) {
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* sem armazenamento */ } });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('input[type="password"]').waitFor();
  await page.fill('input[placeholder="voce@empresa.com"]', email);
  await page.fill('input[type="password"]', senha);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 30000 });
}

async function abrirTela(page, codigo) {
  await page.goto(`${APP}/#/screen/${codigo}`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
}

const { browser, page } = await abrir();
page.setDefaultTimeout(25000);
const erros = [];
page.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));

try {
  // 1. Administrador cria o perfil e liga ao usuário.
  await entrar(page, EMAIL, PASSWORD);
  await abrirTela(page, 'VADM0200');
  await page.locator('.erp-grid').first().waitFor();
  await page.fill('input[placeholder="Ex.: Vendas, Faturamento, PCP"]', PERFIL);
  await page.locator('input[aria-label^="Comercial"][aria-label$="Incluir/alterar"]').check();
  assert.ok(await page.locator('input[aria-label^="Comercial"][aria-label$="Consultar"]').isChecked(), 'incluir deveria marcar consultar junto');
  await page.click('button:has-text("Gravar perfil")');
  await page.locator('.erp-feedback.success').waitFor();
  console.log(`  ✓ perfil "${PERFIL}" criado pela tela`);

  await page.click('button.erp-tab:has-text("Usuários")');
  const linhaUsuario = page.locator('.erp-grid tbody tr', { hasText: USER_EMAIL }).first();
  await linhaUsuario.locator('label', { hasText: PERFIL }).locator('input').check();
  await linhaUsuario.locator('button', { hasText: 'Gravar' }).click();
  await page.locator('.erp-feedback.success').waitFor();
  await page.screenshot({ path: join(SHOTS, 'vadm0200-usuarios.png'), fullPage: true });
  console.log('  ✓ perfil ligado ao usuário');

  // 2. O usuário entra: o menu mostra o comercial e não mostra o fiscal.
  await entrar(page, USER_EMAIL, USER_PASSWORD);
  await page.waitForTimeout(1500);
  const corpo = (await page.locator('body').innerText()).toLowerCase();
  assert.ok(/comercial/.test(corpo), 'o menu deveria mostrar o comercial');
  assert.ok(!/nf-e de saída/.test(corpo), 'o menu não deveria oferecer a NF-e de saída ao perfil de vendas');
  await page.screenshot({ path: join(SHOTS, 'menu-perfil-vendas.png'), fullPage: true });
  console.log('  ✓ menu do usuário restrito ao comercial');

  // 3. Abrir a rotina fiscal direto pelo endereço: a API recusa com a mensagem do perfil.
  const resposta = page.waitForResponse((r) => r.url().includes('/api/fiscal/exits') && r.request().method() === 'GET');
  await abrirTela(page, 'VFIS0200');
  const r = await resposta;
  assert.equal(r.status(), 403, 'a API deveria recusar a consulta fiscal');
  const json = await r.json();
  assert.match(json.error, /não permite consultar em Fiscal/);
  console.log('  ✓ consulta fiscal recusada: ' + json.error.slice(0, 90) + '…');

  // 4. Administrador desfaz o vínculo e exclui o perfil.
  await entrar(page, EMAIL, PASSWORD);
  await abrirTela(page, 'VADM0200');
  await page.locator('.erp-grid').first().waitFor();
  await page.click('button.erp-tab:has-text("Usuários")');
  const linha = page.locator('.erp-grid tbody tr', { hasText: USER_EMAIL }).first();
  await linha.locator('label', { hasText: PERFIL }).locator('input').uncheck();
  await linha.locator('button', { hasText: 'Gravar' }).click();
  await page.locator('.erp-feedback.success').waitFor();
  await page.click('button.erp-tab:has-text("Perfis")');
  await page.locator('.erp-grid tbody tr', { hasText: PERFIL }).locator('button', { hasText: 'Excluir' }).click();
  await page.locator('.erp-feedback.success').waitFor();
  console.log('  ✓ vínculo desfeito e perfil excluído');

  assert.deepEqual(erros, [], `erros na tela:\n${erros.join('\n')}`);
  console.log(`\nOK — capturas em ${SHOTS}`);
} finally {
  await browser.close();
}
