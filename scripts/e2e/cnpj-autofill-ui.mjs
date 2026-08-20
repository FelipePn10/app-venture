#!/usr/bin/env node
/** Confirma no navegador que a consulta de CNPJ hidrata os formulários. */
import { chromium } from 'playwright-core';

const FRONTEND = (process.env.FRONTEND_URL ?? 'http://127.0.0.1:4175').replace(/\/$/, '');
const API = (process.env.API_URL ?? 'http://127.0.0.1:5073').replace(/\/$/, '');
const EMAIL = process.env.EMAIL ?? 'instrutor@venturerp.training';
const PASSWORD = process.env.PASSWORD;
const CNPJ = process.env.CNPJ ?? '11222333000181';
if (!PASSWORD) throw new Error('PASSWORD é obrigatória.');

const login = await fetch(`${API}/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
if (!login.ok) throw new Error(`login falhou: ${login.status}`);
const token = (await login.json()).token;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ?? '/home/felipepanosso/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript((value) => localStorage.setItem('erp-auth-storage', JSON.stringify({ state: { token: value, refreshToken: null, expiresAt: null, userName: null, user: null }, version: 0 })), token);

const field = (label) => page.locator('.erp-field').filter({ has: page.locator('.erp-label', { hasText: label }) }).locator('input').first();
const requireValue = async (label) => {
  const value = await field(label).inputValue();
  if (!value.trim()) throw new Error(`campo "${label}" não foi preenchido`);
};
const requireSummary = async () => {
  const note = await page.locator('.erp-note').filter({ hasText: 'Consulta cadastral' }).innerText();
  for (const expected of ['situação ATIVA', 'CNAE principal', 'endereço', 'telefone', 'e-mail']) {
    if (!note.includes(expected)) throw new Error(`resumo cadastral não contém "${expected}"`);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 4) throw new Error(`tela possui estouro horizontal de ${overflow}px após a consulta`);
};

await page.goto(`${FRONTEND}/#/screen/VCLI0500`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: '+ Novo' }).click();
await field('CNPJ/CPF').fill(CNPJ);
await page.getByRole('button', { name: /Consultar CNPJ/ }).click();
await page.locator('.erp-note').filter({ hasText: 'Consulta cadastral' }).waitFor();
await requireValue('Razão social / Nome');
await requireValue('Fantasia');
await requireSummary();
console.log('✓ Cliente: razão social, fantasia e resumo cadastral completo preenchidos sem quebrar o layout.');

await page.goto(`${FRONTEND}/#/screen/VSUP0500`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Novo fornecedor' }).click();
await field('CNPJ/CPF').fill(CNPJ);
await page.getByRole('button', { name: 'Consultar CNPJ' }).click();
await page.locator('.erp-note').filter({ hasText: 'Consulta cadastral' }).waitFor();
await requireValue('Razão social');
await requireValue('Fantasia');
await requireSummary();
console.log('✓ Fornecedor: dados principais e resumo cadastral completo preenchidos sem quebrar o layout.');

await browser.close();
