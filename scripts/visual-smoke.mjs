#!/usr/bin/env node
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.FRONTEND_URL ?? 'http://127.0.0.1:4174';
const API = (process.env.API_URL ?? BASE).replace(/\/$/, '');
const PASSWORD = process.env.PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const USER_EMAIL = process.env.USER_EMAIL;
if (!PASSWORD || !ADMIN_EMAIL || !USER_EMAIL) throw new Error('PASSWORD, ADMIN_EMAIL and USER_EMAIL are required');

const catalog = readFileSync(new URL('../src/types/erpScreen.ts', import.meta.url), 'utf8');
const codes = [...new Set([...catalog.matchAll(/code:\s*["']([A-Z][A-Z0-9]+)["']/g)].map((m) => m[1]))];
const output = '/tmp/venturerp-visual-smoke';
mkdirSync(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH ?? '/home/felipepanosso/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const failures = [];

async function login(page, email) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: /Entrar na plataforma/i }).click();
  await page.waitForFunction(() => window.location.hash === '#/dashboard', undefined, { timeout: 15_000 });
}

async function seedSession(page, email) {
  const response = await fetch(`${API}/users/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!response.ok) throw new Error(`login de preparação falhou: HTTP ${response.status}`);
  const data = await response.json();
  const token = data.token ?? data.accessToken ?? data.access_token ?? data.data?.token;
  if (!token) throw new Error('login de preparação não retornou token');
  await page.addInitScript((sessionToken) => {
    localStorage.setItem('erp-auth-storage', JSON.stringify({ state: { token: sessionToken, refreshToken: null, expiresAt: null, userName: null, user: null }, version: 0 }));
  }, token);
  await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.body?.innerText.includes('Validando sessão'), undefined, { timeout: 15_000 });
}

async function openScreen(page, code) {
  await page.evaluate((screenCode) => { window.location.hash = `/screen/${screenCode}`; }, code);
  await page.waitForTimeout(120);
}

const anonymous = await browser.newPage();
await anonymous.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, (route) => route.abort());
await anonymous.goto(`${BASE}/#/screen/VENT0204`, { waitUntil: 'networkidle' });
if (!anonymous.url().includes('#/login')) failures.push('rota de tela acessível sem autenticação');
await anonymous.screenshot({ path: `${output}/login-desktop.png`, fullPage: true });
await anonymous.close();

const admin = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await admin.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, (route) => route.abort());
let currentCode = 'dashboard';
admin.on('pageerror', (error) => failures.push(`${currentCode}: pageerror: ${error.message}`));
await login(admin, ADMIN_EMAIL);
await admin.screenshot({ path: `${output}/dashboard-desktop.png`, fullPage: true });
for (const code of codes) {
  try {
    currentCode = code;
    await openScreen(admin, code);
    const body = await admin.evaluate(() => document.body?.innerText ?? '');
    if (body.includes('Tela ainda não implementada')) failures.push(`${code}: fallback não implementado`);
    if (!body.includes(code)) failures.push(`${code}: código da rotina ausente após renderização`);
    await admin.screenshot({ path: `${output}/${code.toLowerCase()}-desktop.png`, fullPage: true });
  } catch (error) {
    failures.push(`${code}: falha de renderização (${error instanceof Error ? error.message : String(error)})`);
  }
}
for (const code of ['VENT0204', 'VVRE0200', 'VMRP0100']) {
  await openScreen(admin, code);
  await admin.screenshot({ path: `${output}/${code.toLowerCase()}-desktop.png`, fullPage: true });
}
await admin.close();

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, (route) => route.abort());
await seedSession(mobile, ADMIN_EMAIL);
for (const code of codes) {
  await openScreen(mobile, code);
  const body = await mobile.evaluate(() => document.body?.innerText ?? '');
  if (!body.includes(code)) failures.push(`${code}: tela móvel não terminou de renderizar`);
  const metrics = await mobile.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    offenders: [...document.querySelectorAll('*')]
      .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 8)
      .slice(0, 5)
      .map((element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}:${Math.round(element.getBoundingClientRect().right)}px`),
  }));
  if (metrics.width > metrics.viewport + 8) failures.push(`${code}: overflow móvel ${metrics.width}px/${metrics.viewport}px (${metrics.offenders.join(', ')})`);
  await mobile.screenshot({ path: `${output}/${code.toLowerCase()}-mobile.png`, fullPage: true });
}
await mobile.close();

const user = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await user.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, (route) => route.abort());
await seedSession(user, USER_EMAIL);
await openScreen(user, 'VAPS0100');
await user.locator('select').first().selectOption({ label: 'Cadastrar' });
const disabled = await user.locator('button:disabled').count();
if (disabled === 0) failures.push('perfil USER não teve operações administrativas desabilitadas em VAPS0100');
await user.screenshot({ path: `${output}/vaps0100-user.png`, fullPage: true });
await user.close();

await browser.close();
console.log(JSON.stringify({ catalog_screens: codes.length, screenshots: output, failures }, null, 2));
if (failures.length) process.exit(1);
