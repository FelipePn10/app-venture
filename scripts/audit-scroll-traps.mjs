#!/usr/bin/env node
/**
 * Auditoria de "armadilhas de rolagem"
 * ---------------------------------------------------------------------------
 * Abre cada tela do catálogo num navegador real e procura conteúdo que
 * **transborda sem poder ser rolado**: um elemento cujo `scrollHeight` é maior
 * que o `clientHeight` mas que tem `overflow-y: hidden` (ou está dentro de um
 * ancestral que corta), de modo que a parte de baixo fica inalcançável.
 *
 * É o tipo de bug que não aparece em teste de unidade nem em `tsc`: depende de
 * layout real, altura de viewport e quantidade de dados carregados.
 *
 * Uso:
 *   FRONTEND_URL=http://localhost:5174 API_URL=http://localhost:5073 \
 *   EMAIL=instrutor@venturerp.training PASSWORD=… \
 *   node scripts/audit-scroll-traps.mjs
 *
 *   SCREENS=VFUN0100,VENT0200   # limita a auditoria a telas específicas
 *   VIEWPORT=1280x720           # simula uma tela menor (default 1440x900)
 */

import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = (process.env.FRONTEND_URL ?? 'http://localhost:5174').replace(/\/$/, '');
const API = (process.env.API_URL ?? 'http://localhost:5073').replace(/\/$/, '');
const EMAIL = process.env.EMAIL ?? 'instrutor@venturerp.training';
const PASSWORD = process.env.PASSWORD;
if (!PASSWORD) throw new Error('PASSWORD é obrigatória (TRAINING_ADMIN_PASSWORD do backend).');

const [vw, vh] = (process.env.VIEWPORT ?? '1440x900').split('x').map(Number);

const catalog = readFileSync(new URL('../src/types/erpScreen.ts', import.meta.url), 'utf8');
const todas = [...new Set([...catalog.matchAll(/code:\s*["']([A-Z][A-Z0-9]+)["']/g)].map((m) => m[1]))];
const codes = process.env.SCREENS ? process.env.SCREENS.split(',').map((s) => s.trim()) : todas;

const output = '/tmp/venturerp-scroll-audit';
mkdirSync(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH ?? '/home/felipepanosso/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

const page = await browser.newPage({ viewport: { width: vw, height: vh } });

// Sessão via token, sem passar pelo formulário de login.
const res = await fetch(`${API}/users/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!res.ok) throw new Error(`login falhou: HTTP ${res.status}`);
const token = (await res.json()).token;
await page.addInitScript((t) => {
  localStorage.setItem('erp-auth-storage', JSON.stringify({
    state: { token: t, refreshToken: null, expiresAt: null, userName: null, user: null }, version: 0,
  }));
}, token);
await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !document.body?.innerText.includes('Validando sessão'), undefined, { timeout: 20_000 });

/**
 * Roda dentro da página: acha elementos que transbordam e não rolam.
 *
 * Um elemento é "armadilha" quando transborda na vertical e nem ele nem
 * nenhum ancestral até o `body` consegue rolar esse excesso.
 */
const detectar = () => {
  const rolavel = (el) => {
    const s = getComputedStyle(el);
    return /(auto|scroll|overlay)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2;
  };
  const achados = [];
  for (const el of document.querySelectorAll('body *')) {
    const excesso = el.scrollHeight - el.clientHeight;
    if (excesso <= 4) continue;                       // ruído de arredondamento
    if (el.clientHeight === 0) continue;              // não renderizado
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    if (rolavel(el)) continue;                        // ele mesmo rola: ok

    // Algum ancestral rola o excesso?
    let a = el.parentElement, salvo = false;
    while (a && a !== document.documentElement) {
      if (rolavel(a)) { salvo = true; break; }
      a = a.parentElement;
    }
    if (salvo) continue;
    if (document.scrollingElement && document.scrollingElement.scrollHeight > window.innerHeight + 2) continue;

    achados.push({
      tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 70),
      excesso,
      altura: el.clientHeight,
      overflowY: s.overflowY,
    });
  }
  // Deduplica por classe, guardando o pior caso.
  const porClasse = new Map();
  for (const f of achados) {
    const k = `${f.tag}.${f.cls}`;
    if (!porClasse.has(k) || porClasse.get(k).excesso < f.excesso) porClasse.set(k, f);
  }
  return [...porClasse.values()].sort((a, b) => b.excesso - a.excesso).slice(0, 6);
};

const problemas = [];
let visitadas = 0;

for (const code of codes) {
  try {
    await page.evaluate((c) => { window.location.hash = `/screen/${c}`; }, code);
    await page.waitForTimeout(450);

    // Clica em "Listar"/"Pesquisar"/"Carregar" para popular grades — uma lista
    // vazia nunca transborda, e é justamente com dados que o bug aparece.
    for (const nome of [/^Listar$/i, /^Pesquisar$/i, /^Carregar$/i, /^Recarregar$/i]) {
      const b = page.getByRole('button', { name: nome });
      if (await b.count()) { await b.first().click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(700); break; }
    }
    await page.waitForTimeout(250);

    const achados = await page.evaluate(detectar);
    visitadas++;
    if (achados.length) {
      problemas.push({ code, achados });
      await page.screenshot({ path: `${output}/${code}.png` }).catch(() => {});
    }
  } catch (e) {
    problemas.push({ code, erro: e.message.slice(0, 100) });
  }
}

await browser.close();

console.log(`\nAuditoria de rolagem — ${visitadas} tela(s) · viewport ${vw}×${vh}\n${'─'.repeat(78)}`);
if (!problemas.length) {
  console.log('Nenhum conteúdo cortado sem rolagem.\n');
} else {
  for (const p of problemas) {
    if (p.erro) { console.log(`✖ ${p.code}: erro — ${p.erro}`); continue; }
    console.log(`\n✖ ${p.code}  (screenshot: ${output}/${p.code}.png)`);
    for (const a of p.achados) {
      console.log(`    ${a.tag}.${a.cls || '(sem classe)'}`);
      console.log(`      altura ${a.altura}px · ${a.excesso}px cortados · overflow-y: ${a.overflowY}`);
    }
  }
  console.log(`\n${'─'.repeat(78)}\n${problemas.length} tela(s) com conteúdo inalcançável.\n`);
}
process.exit(problemas.length ? 1 : 0);
