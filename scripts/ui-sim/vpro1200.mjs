/**
 * Simulação manual da VPRO1200 — terminal de parada de máquina.
 *
 * Exercita o ciclo completo do operador e os casos que só aparecem num terminal:
 * tocar duas vezes, trocar de posto com parada aberta, e o relógio andando.
 *
 * Roda com: node scripts/ui-sim/vpro1200.mjs
 */
import { abrir, entrar, SHOTS } from './nav.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

mkdirSync(SHOTS, { recursive: true });

const TECNICO = /parsing time|SQLSTATE|cannot parse|pq:|pgx|goroutine|nil pointer|invalid character|json:|unmarshal|panic|constraint|forbidden|unauthorized/i;
const passos = [];
const { browser, page, erros } = await abrir();
const http = [];
page.on('response', (r) => {
  const u = new URL(r.url()).pathname;
  if (u.startsWith('/api') || u.startsWith('/users')) http.push({ m: r.request().method(), u, s: r.status() });
});

async function passo(nome, fn) {
  const desde = http.length;
  let ok = true, detalhe = '';
  try { await fn(); } catch (e) { ok = false; detalhe = String(e).slice(0, 170); }
  await page.waitForTimeout(500);
  const chamadas = http.slice(desde);
  const ruins = chamadas.filter((c) => c.s >= 400);
  const feedback = (await page.locator('.erp-feedback').last().textContent().catch(() => '')) ?? '';
  passos.push({ nome, ok, detalhe, ruins: ruins.map((c) => `${c.m} ${c.u} ${c.s}`), feedback: feedback.trim() });
  console.log(`${!ok || ruins.length ? '✗' : '✓'} ${nome}${ruins.length ? '  [' + ruins.map((c) => c.s).join(',') + ']' : ''}${detalhe ? '\n    ' + detalhe : ''}`);
}

const estado = () => page.locator('.fsc-term-state').first().textContent().catch(() => '');
const relogio = () => page.locator('.fsc-term-clock').textContent().catch(() => '');

await entrar(page);
await page.waitForTimeout(800);
await page.evaluate(() => { window.location.hash = '#/screen/VPRO1200'; });
await page.locator('.fsc-term').waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(900);

await passo('abre sem posto escolhido, sem erro', async () => {
  const vazio = await page.locator('.fsc-term-empty').textContent();
  if (!/Escolha a máquina/i.test(vazio ?? '')) throw new Error(`estado vazio não orienta: "${vazio}"`);
  if (await page.locator('.fsc-term-stage').count()) throw new Error('mostrou o palco sem máquina escolhida');
});

await passo('escolher o posto mostra "produzindo"', async () => {
  await page.locator('#vpro1200-maquina').selectOption({ index: 1 });
  await page.waitForTimeout(1200);
  const e = await estado();
  if (!/produzindo/i.test(e ?? '')) throw new Error(`estado inesperado: "${e}"`);
  const tiles = await page.locator('.fsc-term-tile').count();
  if (tiles !== 6) throw new Error(`esperava 6 motivos, achei ${tiles}`);
});

await passo('tocar no motivo abre a parada', async () => {
  await page.locator('.fsc-term-tile', { hasText: 'Falta de material' }).click();
  await page.waitForTimeout(1200);
  const e = await estado();
  if (!/parada/i.test(e ?? '')) throw new Error(`não entrou em parada: "${e}"`);
  if (!/Falta de material/.test(await page.locator('.fsc-term-reason').textContent() ?? '')) {
    throw new Error('o motivo tocado não aparece no palco');
  }
  if (!await page.locator('.fsc-term-stage.parada').count()) throw new Error('o palco não mudou de cor');
});

await passo('o relógio anda', async () => {
  const antes = await relogio();
  await page.waitForTimeout(2400);
  const depois = await relogio();
  if (antes === depois) throw new Error(`relógio parado em ${antes}`);
});

await passo('trocar de posto e voltar preserva a parada', async () => {
  await page.locator('#vpro1200-maquina').selectOption({ index: 2 });
  await page.waitForTimeout(1100);
  const outro = await estado();
  if (/parada/i.test(outro ?? '')) throw new Error('a outra máquina apareceu parada — estado vazou entre postos');
  await page.locator('#vpro1200-maquina').selectOption({ index: 1 });
  await page.waitForTimeout(1200);
  const voltou = await estado();
  if (!/parada/i.test(voltou ?? '')) throw new Error(`a parada se perdeu ao voltar: "${voltou}"`);
});

await passo('encerrar devolve a duração', async () => {
  await page.locator('.fsc-term-back').click();
  await page.waitForTimeout(1200);
  const f = await page.locator('.erp-feedback').last().textContent();
  if (!/encerrada/i.test(f ?? '')) throw new Error(`sem retorno ao encerrar: "${f}"`);
  if (!/\d{2}:\d{2}/.test(f ?? '')) throw new Error(`não informou a duração: "${f}"`);
  const e = await estado();
  if (!/produzindo/i.test(e ?? '')) throw new Error(`não voltou a produzir: "${e}"`);
});

await passo('em telefone os motivos continuam alcançáveis', async () => {
  await page.setViewportSize({ width: 400, height: 780 });
  await page.waitForTimeout(600);
  const larguraDoCorpo = await page.evaluate(() => document.documentElement.scrollWidth);
  if (larguraDoCorpo > 410) throw new Error(`a página rola na horizontal (${larguraDoCorpo}px)`);
  const alvo = await page.locator('.fsc-term-tile').first().boundingBox();
  if (!alvo || alvo.height < 44) throw new Error(`alvo pequeno demais para toque: ${alvo?.height}px`);
  await page.setViewportSize({ width: 1600, height: 1000 });
});

await page.screenshot({ path: join(SHOTS, 'vpro1200-final.png'), fullPage: true });
writeFileSync(join(SHOTS, 'vpro1200.json'), JSON.stringify({ passos, erros }, null, 2));

const tecnicos = passos.filter((p) => TECNICO.test(p.feedback));
const falhas = passos.filter((p) => !p.ok || p.ruins.length);
console.log(`\n${passos.length} passos · ${falhas.length} com problema · ${tecnicos.length} com texto técnico · ${erros.length} erro(s) de console`);
await browser.close();
