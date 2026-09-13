import { chromium } from 'playwright-core';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

export const CHROME = process.env.CHROME_PATH
  ?? join(homedir(), '.cache/ms-playwright/chromium-1228/chrome-linux64/chrome');
export const APP = process.env.APP_URL ?? 'http://127.0.0.1:5199';
export const SHOTS = process.env.SHOTS_DIR ?? join(tmpdir(), 'venture-ui-sim');

export async function abrir() {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const erros = [];
  page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));
  return { browser, page, erros };
}

export const EMAIL = process.env.EMAIL ?? 'admin@venturerp.local';
export const PASSWORD = process.env.PASSWORD ?? 'VentureDev@2026';

export async function entrar(page) {
  await page.goto(APP, { waitUntil: 'networkidle' });
  // Preenche o formulário de login como um usuário faria.
  await page.fill('input[placeholder="voce@empresa.com"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}
