#!/usr/bin/env node
/** Auditoria visual geométrica de todas as rotinas em navegador real. */
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const FRONTEND = (process.env.FRONTEND_URL ?? 'http://127.0.0.1:4175').replace(/\/$/, '');
const API = (process.env.API_URL ?? 'http://127.0.0.1:5073').replace(/\/$/, '');
const EMAIL = process.env.EMAIL ?? 'instrutor@venturerp.training';
const PASSWORD = process.env.PASSWORD;
if (!PASSWORD) throw new Error('PASSWORD é obrigatória.');
const [width, height] = (process.env.VIEWPORT ?? '1280x720').split('x').map(Number);
const source = readFileSync(new URL('../src/types/erpScreen.ts', import.meta.url), 'utf8');
const codes = [...new Set([...source.matchAll(/code:\s*["']([A-Z][A-Z0-9]+)["']/g)].map((match) => match[1]))];
const output = '/tmp/venturerp-layout-audit';
mkdirSync(output, { recursive: true });

const login = await fetch(`${API}/users/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!login.ok) throw new Error(`login falhou: HTTP ${login.status}`);
const token = (await login.json()).token;

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH ?? '/home/felipepanosso/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height } });
await page.addInitScript((value) => localStorage.setItem('erp-auth-storage', JSON.stringify({ state: { token: value, refreshToken: null, expiresAt: null, userName: null, user: null }, version: 0 })), token);

const problems = [];
for (const code of codes) {
  const runtimeErrors = [];
  const onPageError = (error) => runtimeErrors.push(error.message);
  page.on('pageerror', onPageError);
  try {
    await page.goto(`${FRONTEND}/#/screen/${code}`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForTimeout(350);
    const result = await page.evaluate(() => {
      const text = document.body?.innerText ?? '';
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 2 && rect.height > 2 && style.display !== 'none' && style.visibility !== 'hidden';
      };
      const controls = [...document.querySelectorAll('button,input,select,textarea,a[href]')].filter(visible);
      const overlaps = [];
      for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i], b = controls[j];
        if (a.contains(b) || b.contains(a)) continue;
        // A assistência global posiciona a lupa deliberadamente dentro da
        // borda direita de campos relacionais e reserva padding para ela.
        if (a.classList.contains('erp-entity-lookup-btn') || b.classList.contains('erp-entity-lookup-btn')) continue;
        const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
        const iw = Math.min(ar.right, br.right) - Math.max(ar.left, br.left);
        const ih = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
        if (iw <= 3 || ih <= 3) continue;
        const ratio = (iw * ih) / Math.min(ar.width * ar.height, br.width * br.height);
        if (ratio < 0.18) continue;
        overlaps.push(`${a.tagName.toLowerCase()}.${String(a.className).slice(0, 35)} × ${b.tagName.toLowerCase()}.${String(b.className).slice(0, 35)}`);
      }
      const root = document.documentElement;
      return {
        notFound: /404\s*(page not found|página não encontrada)|page not found/i.test(text),
        renderError: /algo deu errado|erro ao renderizar|uncaught error/i.test(text),
        horizontalOverflow: root.scrollWidth > innerWidth + 4,
        overlaps: [...new Set(overlaps)].slice(0, 8),
      };
    });
    if (runtimeErrors.length || result.notFound || result.renderError || result.horizontalOverflow || result.overlaps.length) {
      problems.push({ code, runtimeErrors: runtimeErrors.slice(0, 3), ...result });
      await page.screenshot({ path: `${output}/${code}.png`, fullPage: true }).catch(() => {});
    }
  } catch (error) {
    problems.push({ code, navigationError: error.message });
  } finally {
    page.off('pageerror', onPageError);
  }
}
await browser.close();

console.log(`Auditoria geométrica — ${codes.length} tela(s), ${width}×${height}`);
for (const problem of problems) console.log(JSON.stringify(problem));
console.log(`${problems.length} tela(s) com problema.`);
process.exit(problems.length ? 1 : 0);
