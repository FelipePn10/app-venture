#!/usr/bin/env node
/**
 * Auditoria de GRADE das telas: mede, no navegador, se o conteúdo ocupa a largura
 * que deveria.
 *
 * ── Por que medir em vez de ler o JSX ──
 * `.erp-fieldset-body` é uma grade de 12 colunas. Um filho direto sem `erp-cN`
 * ocupa UMA coluna: tabela comprimida a ~1/12 da largura, com o cabeçalho quebrado
 * e as colunas ilegíveis. Ler o JSX para achar isso dá falso positivo (duas bodies
 * IRMÃS dentro do mesmo fieldset são legítimas — o fieldset não é grade) e falso
 * negativo (a grade pode vir de um componente). A largura renderizada é a verdade.
 *
 * Também acusa DUAS barras de abas no mesmo painel: era o padrão de uma barra
 * decorativa com aba única acima das abas de verdade — dois controles idênticos em
 * sequência, e só o de baixo navega.
 *
 * ── Controle contra medição vazia ──
 * Toda tela tem de RENDERIZAR antes de ser medida. Sem isso, "0 tabelas" passaria
 * como aprovado e a auditoria estaria afirmando que está certo sem ter olhado.
 * Medido em 30/09/2026: reintroduzir o defeito na VFIS0110 levou a tabela de
 * 1378px para 681px, e a auditoria acusou.
 *
 * Uso:
 *   FRONTEND_URL=http://localhost:5174 API_URL=http://127.0.0.1:5097 \
 *   EMAIL=... PASSWORD=... SCREENS=VFIS0110,VFIN0300 npm run audit:grade
 *
 * Sem SCREENS, audita as telas do módulo fiscal, financeiro, custo e contabilidade.
 */
import { chromium } from 'playwright-core';

const BASE = process.env.FRONTEND_URL ?? 'http://localhost:5174';
const API = process.env.API_URL ?? 'http://127.0.0.1:5097';
const PADRAO = [
  'VCTB0102', 'VCTB0200', 'VUTL0555', 'VCST0202', 'VCUS0100', 'VCUS0200',
  'VFIN0100', 'VFIN0110', 'VFIN0120', 'VFIN0130', 'VFIN0200', 'VFIN0210',
  'VFIN0300', 'VFIN0400', 'VFIN0500', 'VFIN0600', 'VFIN0620',
  'VFIS0100', 'VFIS0110', 'VFIS0200', 'VFIS0210', 'VFIS0220', 'VFIS0300',
  'VFIS0310', 'VFIS0320', 'VFIS0330', 'VFIS0340', 'VFIS0350', 'VFIS0360',
  'VFIS0500', 'VFIS0510', 'VFIS0520', 'VFIS0530', 'VFIS0540', 'VFIS0550',
  'VFIS0560', 'VNFS0100',
];
const telas = process.env.SCREENS ? process.env.SCREENS.split(',').map((s) => s.trim()).filter(Boolean) : PADRAO;

const res = await fetch(`${API}/users/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: process.env.EMAIL, password: process.env.PASSWORD }),
});
if (!res.ok) throw new Error(`login falhou: HTTP ${res.status}`);
const token = (await res.json()).token;

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH ?? '/home/felipepanosso/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript((t) => {
  localStorage.setItem('erp-auth-storage', JSON.stringify({
    state: { token: t, refreshToken: null, expiresAt: null, userName: null, user: null }, version: 0,
  }));
}, token);

let problemas = 0;
for (const tela of telas) {
  await page.goto(`${BASE}/#/screen/${tela}`, { waitUntil: 'domcontentloaded' });
  // Espera pelo CÓDIGO da tela no cabeçalho, não por tempo fixo: as telas são
  // carregadas sob demanda e um timeout curto mede a tela anterior (ou nenhuma).
  try {
    await page.waitForFunction(
      (c) => document.querySelector('.erp-crumb-code')?.textContent?.includes(c) ?? false,
      tela, { timeout: 25_000 });
  } catch { /* o controle de render abaixo acusa */ }
  await page.waitForTimeout(900); // deixa a primeira carga de dados pintar a tabela
  const medidas = await page.evaluate(() => {
    const out = { abas: 0, barrasDeAba: 0, tabelas: [], filhosSemSpan: [], erros: [] };
    // Algumas telas antigas usam outro shell e não têm `.erp-screen`. O critério de
    // render é o CÓDIGO da tela aparecer na página — é o que prova que foi ela que
    // montou, e não a anterior.
    out.renderizou = !!document.querySelector('.erp-screen') || (document.body?.innerText ?? '').length > 300;
    out.codigoNaTela = (document.querySelector('.erp-crumb-code')?.textContent ?? '')
      || (document.body?.innerText ?? '').slice(0, 400);
    out.barrasDeAba = document.querySelectorAll('.erp-detail-panel .erp-tabs').length;
    out.abas = document.querySelectorAll('.erp-tab').length;
    document.querySelectorAll('.erp-fieldset-body').forEach((body) => {
      const largura = body.clientWidth;
      // Filho direto da grade sem classe de coluna: ocupa 1/12.
      [...body.children].forEach((filho) => {
        const temSpan = [...filho.classList].some((c) => /^erp-c\d+$/.test(c));
        const ehTabela = filho.tagName === 'TABLE' || filho.querySelector(':scope > table');
        if (!temSpan && !filho.classList.contains('erp-fieldset') && filho.tagName !== 'STYLE') {
          out.filhosSemSpan.push({ tag: filho.tagName, classe: filho.className?.slice?.(0, 40) ?? '', ehTabela: !!ehTabela });
        }
      });
      body.querySelectorAll('table.erp-grid').forEach((t) => {
        out.tabelas.push({ largura: t.clientWidth, larguraDaGrade: largura, proporcao: largura ? t.clientWidth / largura : 0 });
      });
    });
    return out;
  });
  const estreitas = medidas.tabelas.filter((t) => t.proporcao > 0 && t.proporcao < 0.5);
  const semSpanCritico = medidas.filhosSemSpan.filter((f) => f.ehTabela);
  // Sem render, não há o que medir: reportar ✓ aqui seria afirmar que está certo
  // sem ter olhado.
  const renderizou = medidas.renderizou && medidas.codigoNaTela.includes(tela);
  const ok = renderizou && medidas.barrasDeAba <= 1 && estreitas.length === 0 && semSpanCritico.length === 0;
  if (!ok) problemas++;
  console.log(`${ok ? '✓' : '✗'} ${tela}${renderizou ? '' : '  ← NÃO RENDERIZOU (medição inválida)'}`);
  console.log(`   barras de aba no painel: ${medidas.barrasDeAba}${medidas.barrasDeAba > 1 ? '  ← DUAS barras empilhadas' : ''}`);
  console.log(`   tabelas medidas: ${medidas.tabelas.length}` +
    (medidas.tabelas.length ? ` · larguras ${medidas.tabelas.map((t) => `${t.largura}px (${(t.proporcao * 100).toFixed(0)}% da grade)`).join(', ')}` : ''));
  if (estreitas.length) console.log(`   ✗ ${estreitas.length} tabela(s) comprimida(s) abaixo de 50% da grade`);
  if (semSpanCritico.length) console.log(`   ✗ ${semSpanCritico.length} tabela(s) como filho direto da grade sem erp-cN`);
  if (medidas.filhosSemSpan.length) {
    const amostra = medidas.filhosSemSpan.slice(0, 3).map((f) => `${f.tag}.${f.classe}`).join('; ');
    console.log(`   nota: ${medidas.filhosSemSpan.length} filho(s) da grade sem erp-cN — ${amostra}`);
  }
}
await browser.close();
console.log(`\n${telas.length - problemas}/${telas.length} tela(s) com a grade correta`);
process.exit(problemas ? 1 : 0);
