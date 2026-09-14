/**
 * Exploração profunda de tela: preenche os campos e aciona CADA ação, não só a
 * principal — inclusive abas e botões de linha —, registrando toda chamada HTTP
 * com método e status.
 *
 * A varredura rasa (varrer.mjs) clicava só no botão primário e por isso só
 * exercitava o POST de criação. Boa parte dos defeitos mora nas outras ações:
 * alterar, excluir, consultar com filtro, aprovar, cancelar.
 */
import { abrir, entrar, SHOTS } from './nav.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

mkdirSync(SHOTS, { recursive: true });
const ARQ = process.env.SAIDA ?? join(SHOTS, 'exploracao.json');
const todas = [...new Set(
  readFileSync('src/components/screens/ScreenHostPage.tsx', 'utf8')
    .match(/^ {2}V[A-Z]{3}\d{4}/gm)?.map((s) => s.trim()) ?? [],
)].sort();
const feitas = existsSync(ARQ) ? JSON.parse(readFileSync(ARQ, 'utf8')) : [];
const jaFeitas = new Set(feitas.map((f) => f.code));
const alvo = todas.filter((c) => !jaFeitas.has(c)).slice(0, Number(process.env.LOTE ?? 8));
if (!alvo.length) { console.log(`todas as ${todas.length} telas exploradas`); process.exit(0); }

const TECNICO = /parsing time|SQLSTATE|cannot parse|pq:|pgx|goroutine|nil pointer|invalid character|json:|unmarshal|panic|reflect|interface \{\}/i;
const INGLES = /\b(error|invalid|failed|not found|required|unable|cannot|missing|unexpected|must be|should be)\b/i;

const { browser, page } = await abrir();
await entrar(page);

// Telas aposentadas de propósito: saem do menu e o registro só serve para um
// atalho antigo ver o aviso de substituta. Não há o que exercitar.
const APOSENTADAS = new Set(['VCON0100', 'VPRO0100', 'VSUP0510']);

for (const code of alvo) {
  if (APOSENTADAS.has(code)) {
    feitas.push({ code, acoes: 0, chamadas: [], problemas: [], erro: '', aposentada: true });
    writeFileSync(ARQ, JSON.stringify(feitas, null, 1));
    console.log(`--   ${code} (aposentada, substituída)`);
    continue;
  }
  const r = { code, acoes: 0, chamadas: [], problemas: [], erro: '' };
  let t = null;
  // Limite por tela. Sem isto, uma tela que não abre (as aposentadas) ou um
  // clique que abre diálogo nativo/download segura a varredura inteira — foi o
  // que aconteceu: 10 minutos parados numa tela só.
  const LIMITE_MS = Number(process.env.LIMITE_TELA_MS ?? 90000);
  const prazo = Date.now() + LIMITE_MS;
  const noPrazo = () => Date.now() < prazo;
  try {
    await page.fill('input[placeholder="Buscar código ou nome..."]', code);
    await page.waitForTimeout(450);
    [t] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 15000 }),
      page.locator(`text=${code}`).first().click(),
    ]);
    t.on('response', (x) => {
      if (!x.url().includes('/api/')) return;
      r.chamadas.push({ m: x.request().method(), s: x.status(), p: new URL(x.url()).pathname });
    });
    await t.setViewportSize({ width: 1600, height: 1100 });
    await t.waitForLoadState('networkidle').catch(() => {});
    await t.waitForTimeout(900);

    const preencher = async () => {
      for (const lk of (await t.locator('button.erp-lookup-control:visible').all()).slice(0, 8)) {
        try {
          await lk.click({ timeout: 2000 }); await t.waitForTimeout(450);
          const op = t.locator('.erp-lookup-option, [class*="lookup-item"], [class*="lookup-list"] > *').first();
          if (await op.count()) await op.click({ timeout: 1800 }); else await t.keyboard.press('Escape');
          await t.waitForTimeout(150);
        } catch { await t.keyboard.press('Escape').catch(() => {}); }
      }
      for (const c of (await t.locator('input:visible, select:visible, textarea:visible').all()).slice(0, 30)) {
        try {
          const tag = await c.evaluate((n) => n.tagName.toLowerCase());
          const tipo = (await c.getAttribute('type')) ?? 'text';
          if (tipo === 'checkbox' || tipo === 'radio' || (await c.isDisabled())) continue;
          if (tag === 'select') {
            const v = await c.evaluate((n) => [...n.options].map((o) => o.value).filter(Boolean));
            if (v.length) await c.selectOption(v[0]);
          } else if (tipo === 'number') await c.fill('10');
          else if (tipo === 'date') await c.fill('2026-09-20');
          else {
            const l = await c.evaluate((n) => n.closest('.erp-field')?.querySelector('label')?.textContent ?? '');
            await c.fill(/c[oó]digo|cod\b/i.test(l) ? '1' : /e-?mail/i.test(l) ? 'a@b.local'
              : /cnpj|cpf|documento/i.test(l) ? '11222333000181' : /descri|nome|raz/i.test(l) ? 'Metalurgica Teste' : 'TESTE');
          }
        } catch { /* segue */ }
      }
    };

    const lerAviso = async () => (await t.locator('[class*="feedback"], [class*="alert"], [class*="erp-msg"]').first()
      .innerText().catch(() => '')).trim().slice(0, 180);

    // Abas primeiro: cada uma costuma ter suas próprias ações.
    const abas = await t.locator('[class*="tab"]:visible, [role="tab"]:visible').all();
    const paineis = abas.length ? abas.slice(0, 5) : [null];

    for (const aba of paineis) {
      if (!noPrazo()) break;
      if (aba) { await aba.click({ timeout: 2500 }).catch(() => {}); await t.waitForTimeout(700); }
      await preencher();
      const botoes = await t.locator('button:visible').all();
      for (const b of botoes.slice(0, 14)) {
        const rotulo = (await b.innerText().catch(() => '')).trim();
        if (!rotulo || rotulo.length > 40) continue;
        if (/sair|logout|fechar|voltar|cancelar sess/i.test(rotulo)) continue;
        if (!(await b.isEnabled().catch(() => false))) continue;
        const antes = r.chamadas.length;
        await b.click({ timeout: 2500 }).catch(() => {});
        await t.waitForTimeout(1300);
        r.acoes++;
        const aviso = await lerAviso();
        if (aviso) {
          if (TECNICO.test(aviso)) r.problemas.push({ tipo: 'TECNICO', acao: rotulo, aviso });
          else if (INGLES.test(aviso)) r.problemas.push({ tipo: 'INGLES', acao: rotulo, aviso });
        }
        for (const c of r.chamadas.slice(antes)) {
          if (c.s >= 500) r.problemas.push({ tipo: 'HTTP5XX', acao: rotulo, aviso: `${c.s} ${c.m} ${c.p}` });
        }
        await t.keyboard.press('Escape').catch(() => {});
      }
    }
    if (r.problemas.length) await t.screenshot({ path: `${SHOTS}/x-${code}.png`, fullPage: true }).catch(() => {});
  } catch (e) { r.erro = String(e).split('\n')[0].slice(0, 120); }
  finally { if (t) await t.close().catch(() => {}); }

  feitas.push(r);
  writeFileSync(ARQ, JSON.stringify(feitas, null, 1));
  const metodos = [...new Set(r.chamadas.map((c) => c.m))].join('/');
  const sinal = r.erro ? 'ERRO' : r.problemas.length ? '!!!!' : 'ok  ';
  console.log(`${sinal} ${code} ações=${r.acoes} chamadas=${r.chamadas.length} [${metodos || '—'}]`
    + r.problemas.map((p) => `\n       ${p.tipo} «${p.acao}» ${p.aviso.replace(/\n/g, ' ').slice(0, 95)}`).join(''));
}
console.log(`\n${feitas.length}/${todas.length} telas exploradas`);
await browser.close();
