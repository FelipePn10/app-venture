/**
 * Varredura manual de telas: abre cada tela, preenche CADA campo conforme o
 * tipo, aciona a ação principal e mede a qualidade da resposta.
 *
 * Além de 4xx/5xx, procura o que a varredura de rotas não vê:
 *  - erro técnico cru chegando ao usuário (parse do Go, SQL, stack)
 *  - texto em inglês na mensagem
 *  - ação principal que não devolve retorno nenhum (falha silenciosa)
 *
 * Resultado em scripts/ui-sim/resultado.json — dentro do projeto, porque /tmp
 * é limpo entre sessões e o relatório se perdeu uma vez.
 */
import { abrir, entrar, SHOTS } from './nav.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

mkdirSync(SHOTS, { recursive: true });
// O resultado fica FORA do repositório: é saída de execução, não código.
const ARQ = process.env.SAIDA ?? join(SHOTS, 'resultado.json');
// As telas vêm do próprio registro, então a varredura acompanha o sistema.
const todas = [...new Set(
  readFileSync('src/components/screens/ScreenHostPage.tsx', 'utf8')
    .match(/^ {2}V[A-Z]{3}\d{4}/gm)?.map((s) => s.trim()) ?? [],
)].sort();
const feitas = existsSync(ARQ) ? JSON.parse(readFileSync(ARQ, 'utf8')) : [];
const jaFeitas = new Set(feitas.map((f) => f.code));
const lote = Number(process.env.LOTE ?? 12);
const alvo = todas.filter((c) => !jaFeitas.has(c)).slice(0, lote);
if (!alvo.length) { console.log('todas as telas já foram exercitadas'); process.exit(0); }

const TECNICO = /parsing time|SQLSTATE|cannot parse|pq:|pgx|goroutine|nil pointer|invalid character|json:|unmarshal|panic/i;
const INGLES = /\b(error|invalid|failed|not found|required|unable|cannot|missing|unexpected)\b/i;

const { browser, page } = await abrir();
await entrar(page);

for (const code of alvo) {
  const r = { code, campos: 0, preenchidos: 0, http: [], feedback: '', tecnico: false, ingles: false, mudo: false, erro: '' };
  let t = null;
  try {
    await page.fill('input[placeholder="Buscar código ou nome..."]', code);
    await page.waitForTimeout(500);
    [t] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 15000 }),
      page.locator(`text=${code}`).first().click(),
    ]);
    t.on('response', (x) => { if (x.status() >= 400 && x.url().includes('/api/')) r.http.push(`${x.status()} ${x.request().method()} ${new URL(x.url()).pathname}`); });
    await t.setViewportSize({ width: 1600, height: 1100 });
    await t.waitForLoadState('networkidle').catch(() => {});
    await t.waitForTimeout(1000);

    for (const lk of (await t.locator('button.erp-lookup-control:visible').all()).slice(0, 8)) {
      r.campos++;
      try {
        await lk.click({ timeout: 2500 }); await t.waitForTimeout(500);
        const op = t.locator('.erp-lookup-option, [class*="lookup-item"], [class*="lookup-list"] > *').first();
        if (await op.count()) { await op.click({ timeout: 2000 }); r.preenchidos++; } else await t.keyboard.press('Escape');
        await t.waitForTimeout(200);
      } catch { await t.keyboard.press('Escape').catch(() => {}); }
    }
    for (const c of (await t.locator('input:visible, select:visible, textarea:visible').all()).slice(0, 35)) {
      try {
        const tag = await c.evaluate((n) => n.tagName.toLowerCase());
        const tipo = (await c.getAttribute('type')) ?? 'text';
        if (tipo === 'checkbox' || tipo === 'radio' || (await c.isDisabled())) continue;
        r.campos++;
        if (tag === 'select') {
          const v = await c.evaluate((n) => [...n.options].map((o) => o.value).filter(Boolean));
          if (v.length) { await c.selectOption(v[0]); r.preenchidos++; }
        } else if (tipo === 'number') { await c.fill('10'); r.preenchidos++; }
        else if (tipo === 'date') { await c.fill('2026-09-20'); r.preenchidos++; }
        else {
          const l = await c.evaluate((n) => n.closest('.erp-field')?.querySelector('label')?.textContent ?? '');
          const v = /c[oó]digo|cod\b/i.test(l) ? '1' : /e-?mail/i.test(l) ? 'a@b.local'
            : /cnpj|cpf|documento/i.test(l) ? '11222333000181' : /descri|nome|raz/i.test(l) ? 'Metalurgica Teste' : 'TESTE';
          await c.fill(v); r.preenchidos++;
        }
      } catch { /* campo não editável */ }
    }
    const btn = t.locator('button.erp-btn-primary:visible').first();
    if (await btn.count()) {
      await btn.click({ timeout: 4000 }).catch(() => {});
      await t.waitForTimeout(2200);
      r.feedback = (await t.locator('[class*="feedback"], [class*="alert"], [class*="erp-msg"]').first().innerText().catch(() => '')).trim().slice(0, 200);
      // Ação principal que não devolve retorno algum nem chamada: falha muda.
      r.mudo = !r.feedback && !r.http.length;
    }
    r.tecnico = TECNICO.test(r.feedback);
    r.ingles = !r.tecnico && INGLES.test(r.feedback);
    if (r.tecnico || r.ingles || r.http.some((h) => h.startsWith('5'))) {
      await t.screenshot({ path: `${SHOTS}/v2-${code}.png`, fullPage: true }).catch(() => {});
    }
  } catch (e) { r.erro = String(e).split('\n')[0].slice(0, 130); }
  finally { if (t) await t.close().catch(() => {}); }

  feitas.push(r);
  writeFileSync(ARQ, JSON.stringify(feitas, null, 1));
  const s = r.erro ? 'ERRO' : r.tecnico ? 'TECN' : r.ingles ? 'INGL' : r.http.some(h=>h.startsWith('5')) ? '500 ' : r.mudo ? 'MUDO' : r.http.length ? 'http' : 'ok  ';
  console.log(`${s} ${code} (${r.preenchidos}/${r.campos})` + (r.feedback ? ` :: ${r.feedback.replace(/\n/g,' ').slice(0,110)}` : '') + (r.erro ? ` :: ${r.erro}` : ''));
}
console.log(`\n${feitas.length}/${todas.length} telas exercitadas`);
await browser.close();
