// Simulação da caixa "manter conectado", dirigindo o navegador como um usuário.
//
// O problema relatado: marcar a caixa, entrar, sair e entrar de novo continuava
// pedindo e-mail e senha. A caixa era um checkbox sem estado — ninguém a lia.
//
// O que se prova aqui:
//   1. marcada → a escolha vai para o backend (`remember_me`), a sessão é
//      gravada no localStorage e sobrevive a reabrir o app;
//   2. o e-mail volta preenchido e a caixa volta marcada no próximo login;
//   3. desmarcada → a sessão fica só na janela (sessionStorage), o disco não
//      guarda nada e reabrir o app cai na tela de login;
//   4. token perto de vencer → o app renova a sessão na abertura, sem voltar
//      para o login.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { APP, CHROME } from './nav.mjs';

const EMAIL = 'operador@venturerp.local';
const SENHA = 'SenhaDeTeste@2026';

/** Token de mentira com `exp` controlado — o app lê o exp do JWT. */
function tokenFalso(expiraEmMs) {
  const cabecalho = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const corpo = Buffer.from(JSON.stringify({
    user_id: '11111111-1111-1111-1111-111111111111',
    sub: '11111111-1111-1111-1111-111111111111',
    role: 'USER', enterprise_id: 1, auth_version: 1, environment: 'production',
    exp: Math.floor((Date.now() + expiraEmMs) / 1000),
    iat: Math.floor(Date.now() / 1000),
  })).toString('base64url');
  return `${cabecalho}.${corpo}.assinatura-de-teste`;
}

const UMA_SEMANA = 7 * 24 * 60 * 60 * 1000;
const UM_DIA = 24 * 60 * 60 * 1000;

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
page.setDefaultTimeout(12000);
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));

/** Guarda o corpo do último login para conferir o `remember_me` enviado. */
let ultimoLogin = null;
let renovacoes = 0;

await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  const p = url.pathname;
  if (!p.startsWith('/api/') && !p.startsWith('/users/')) return route.continue();
  let body = {};
  if (p === '/users/login') {
    ultimoLogin = JSON.parse(route.request().postData() ?? '{}');
    const lembrar = ultimoLogin.remember_me === true;
    body = {
      token: tokenFalso(lembrar ? UMA_SEMANA : UM_DIA),
      name: 'Operador de Teste', email: EMAIL, role: 'USER',
      environment: 'production', remember_me: lembrar,
      expires_at: new Date(Date.now() + (lembrar ? UMA_SEMANA : UM_DIA)).toISOString(),
    };
  } else if (p === '/users/session/renew') {
    renovacoes += 1;
    body = {
      token: tokenFalso(UMA_SEMANA), remember_me: true,
      expires_at: new Date(Date.now() + UMA_SEMANA).toISOString(),
      session_start: new Date().toISOString(),
    };
  } else if (p === '/users/me') {
    body = { id: '11111111-1111-1111-1111-111111111111', name: 'Operador de Teste', email: EMAIL, role: 'USER' };
  } else if (p === '/api/version') {
    body = { version: '1.3.0', min_client: '1.0.0' };
  } else if (p.startsWith('/api/enterprise')) {
    body = [{ id: 1, code: 1, nome_fantasia: 'VENTURE' }];
  } else {
    body = [];
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});

const entrar = async (marcar) => {
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="password"]').waitFor();
  const caixa = page.locator('.lp-checkbox');
  if ((await caixa.isChecked()) !== marcar) await caixa.click();
  const campoEmail = page.locator('input[placeholder="voce@empresa.com"]');
  if (!(await campoEmail.inputValue())) await campoEmail.fill(EMAIL);
  await page.locator('input[type="password"]').fill(SENHA);
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 15000 });
};

const sair = async () => {
  await page.getByRole('button', { name: /sair|logout/i }).first().click();
  await page.waitForFunction(() => window.location.hash.includes('login'), undefined, { timeout: 15000 });
};

/**
 * Reabre o app de verdade. Trocar só o hash NÃO recarrega a página: o estado em
 * memória sobreviveria e o teste passaria sem provar nada sobre persistência.
 */
const reabrirApp = async (hash) => {
  await page.goto(`${APP}/#${hash}`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.body?.innerText.includes('Validando sessão'), undefined, { timeout: 15000 });
};

const guardado = (onde) => page.evaluate((k) => {
  try { return window[k].getItem('erp-auth-storage'); } catch { return null; }
}, onde);

try {
  // ── 1. Marcada: a escolha vai ao backend e a sessão vai para o disco ──────
  await entrar(true);
  assert.equal(ultimoLogin.remember_me, true, 'o login não enviou remember_me ao backend');
  assert.ok(await guardado('localStorage'), 'com "manter conectado" a sessão precisa ficar no localStorage');
  assert.equal(await guardado('sessionStorage'), null, 'a sessão não deveria estar só na janela');

  // ── 2. Reabrir o app continua conectado (é a promessa da caixa) ───────────
  await reabrirApp('/dashboard');
  assert.ok(page.url().includes('dashboard'), 'reabrir o app com a caixa marcada caiu na tela de login');

  // ── 3. Sair guarda o e-mail e a escolha para o próximo acesso ─────────────
  await sair();
  assert.equal(await page.locator('.lp-checkbox').isChecked(), true, 'a caixa não veio marcada no próximo login');
  assert.equal(
    await page.locator('input[placeholder="voce@empresa.com"]').inputValue(), EMAIL,
    'o e-mail do último acesso não voltou preenchido',
  );

  // ── 4. Desmarcada: nada fica no disco e reabrir pede login ────────────────
  await entrar(false);
  assert.equal(ultimoLogin.remember_me, false, 'o login enviou remember_me mesmo com a caixa desmarcada');
  assert.ok(await guardado('sessionStorage'), 'sem "manter conectado" a sessão fica na janela');
  assert.equal(await guardado('localStorage'), null, 'sem "manter conectado" nada pode ficar no disco');
  const emailGuardado = await page.evaluate(() => {
    try { return window.localStorage.getItem('erp-auth-last-email'); } catch { return null; }
  });
  assert.equal(emailGuardado, null, 'desmarcar deveria apagar o e-mail guardado');

  // Fechar o app (nova aba = sessionStorage novo) precisa pedir login de novo.
  const outraAba = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await outraAba.goto(`${APP}/#/dashboard`, { waitUntil: 'domcontentloaded' });
  // O guarda de rota redireciona num tique depois da hidratação; esperar a URL
  // é mais honesto que esperar um tempo fixo.
  await outraAba.waitForFunction(() => window.location.hash.includes('login'), undefined, { timeout: 15000 })
    .catch(() => { throw new Error('sem "manter conectado" a sessão não deveria sobreviver a abrir o sistema de novo'); });
  await outraAba.close();

  // ── 5. Token perto de vencer: o app renova em vez de pedir login ──────────
  renovacoes = 0;
  await page.evaluate(({ token, expira }) => {
    window.localStorage.setItem('erp-auth-remember', '1');
    window.sessionStorage.removeItem('erp-auth-storage');
    window.localStorage.setItem('erp-auth-storage', JSON.stringify({
      state: {
        token, refreshToken: null, expiresAt: expira, rememberMe: true,
        userName: 'Operador de Teste', user: { name: 'Operador de Teste', role: 'USER' },
      },
      version: 0,
    }));
  }, { token: tokenFalso(2 * 60 * 60 * 1000), expira: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() });

  await reabrirApp('/dashboard');
  assert.ok(page.url().includes('dashboard'), 'sessão perto de vencer caiu no login em vez de renovar');
  // Uma renovação por abertura — o roteiro abre e recarrega, então 1 ou 2.
  assert.ok(renovacoes >= 1, 'o app não renovou a sessão perto do vencimento');
  assert.ok(renovacoes <= 2, `o app renovou a sessão ${renovacoes} vezes numa abertura`);
  const depois = JSON.parse(await guardado('localStorage'));
  assert.ok(
    new Date(depois.state.expiresAt).getTime() - Date.now() > 6 * 24 * 60 * 60 * 1000,
    `o vencimento não foi estendido pela renovação: ${depois.state.expiresAt}`,
  );

  const semRuido = erros.filter((e) => !/favicon|ResizeObserver|Failed to load resource/i.test(e));
  assert.deepEqual(semRuido, [], `erros de console: ${semRuido.join(' | ')}`);
  console.log('SIMULAÇÃO OK — "manter conectado" guarda a sessão, traz o e-mail e renova antes de vencer.');
} catch (e) {
  console.error('FALHOU:', e.message);
  if (erros.length) console.error('console:', erros.slice(0, 5).join(' | '));
  process.exitCode = 1;
} finally {
  await browser.close();
}
