/**
 * Passada visual pelo fluxo de produção depois do MRP: a OF com etapa em
 * terceiro (VPRO0900 → Etapas mostra "Com o terceiro — OS n" e não oferece
 * Iniciar), a impressão da OF (PDF), a OS no VTPS0100 e as sugestões no MRP.
 * APP_URL=… EMAIL=… PASSWORD=… OF=<id> node scripts/ui-sim/fluxo-producao.mjs
 */
import { abrir, entrar, SHOTS, APP } from './nav.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { Buffer } from 'node:buffer';

mkdirSync(SHOTS, { recursive: true });
const OF = process.env.OF ?? '607';
const TECNICO = /SQLSTATE|pq:|pgx|goroutine|nil pointer|unmarshal|panic|constraint|undefined|\[object|NaN/i;
const { browser, page, erros } = await abrir();
page.setDefaultTimeout(9000);
const http = [];
page.on('response', (r) => { const u = new URL(r.url()).pathname; if (u.startsWith('/api')) http.push({ m: r.request().method(), u, s: r.status() }); });
const falhas = []; let n = 0;
async function passo(nome, fn) {
  const desde = http.length; const e0 = erros.length; let detalhe = '';
  try { await fn(); } catch (e) { detalhe = String(e).split('\n')[0].slice(0, 240); }
  await page.waitForTimeout(400);
  // OF sem custo apurado responde 404 em /cost e a tela trata ("ainda não apurado").
  const tolerado = (c) => c.s === 404 && /\/cost$/.test(c.u);
  const ruins = http.slice(desde).filter((c) => c.s >= 400 && !tolerado(c)).map((c) => `${c.m} ${c.u} ${c.s}`);
  const ignorar = http.slice(desde).filter(tolerado).length;
  const fb = ((await page.locator('.erp-feedback').last().textContent().catch(() => '')) ?? '').trim();
  const tec = TECNICO.test(fb) ? `mensagem técnica: ${fb}` : '';
  const novos = erros.slice(e0).filter((e, i) => !(i < ignorar && /404/.test(e)));
  const ok = !detalhe && !ruins.length && !tec && !novos.length;
  n += 1;
  await page.screenshot({ path: `${SHOTS}/fp-${String(n).padStart(2, '0')}-${nome.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 44)}.png` });
  console.log(`${ok ? '✓' : '✗'} ${nome}${fb ? `  — "${fb.slice(0, 150)}"` : ''}`);
  if (!ok) { falhas.push(nome); for (const x of [detalhe, tec, ...ruins, ...novos]) if (x) console.log(`    ${x}`); }
}

await entrar(page);
await page.goto(`${APP}/#/screen/VPRO0900`, { waitUntil: 'networkidle' });

await passo(`abre a OF ${OF}`, async () => {
  await page.locator('.erp-list-row', { hasText: `OF ${OF}` }).first().click();
  await page.waitForSelector('.vpl-record-title');
});
await passo('aba Etapas: zincagem com o terceiro, sem Iniciar', async () => {
  await page.locator('.erp-tab', { hasText: 'Etapas' }).first().click();
  const linha = page.locator('tr', { hasText: 'Zincagem' }).first();
  await linha.getByText(/Com o terceiro — OS \d+/).waitFor();
  if (await linha.getByRole('button', { name: /Iniciar|Concluir/ }).count()) throw new Error('etapa do terceiro ainda oferece Iniciar/Concluir');
});
await passo('Imprimir OP baixa o PDF', async () => {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Imprimir OP' }).click()]);
  const caminho = `${SHOTS}/${download.suggestedFilename()}`;
  await download.saveAs(caminho);
  const { readFileSync } = await import('node:fs');
  if (!readFileSync(caminho).subarray(0, 4).equals(Buffer.from('%PDF'))) throw new Error('o arquivo baixado não é PDF');
  console.log(`    PDF salvo em ${caminho}`);
});
await passo('VTPS0100 lista a OS da OF', async () => {
  await page.goto(`${APP}/#/screen/VTPS0100`, { waitUntil: 'networkidle' });
  await page.locator('.erp-tab', { hasText: 'Ordens de serviço' }).first().click();
  await page.getByRole('button', { name: 'Carregar' }).click();
  await page.waitForTimeout(1200);
  await page.locator('tr', { hasText: 'Zincagem' }).first().waitFor();
});
await passo('VMRP0100: rodar o MRP', async () => {
  await page.goto(`${APP}/#/screen/VMRP0100`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Rodar MRP' }).click();
  await page.waitForResponse((r) => r.url().includes('/api/mrp-calculation/run'), { timeout: 30000 });
  await page.waitForTimeout(1500);
});
// Com chapa faltando, o MRP sugere a compra (empenho da OF aberta) e ela é
// firmada; com chapa sobrando, as compras já firmadas aparecem na fila do
// comprador com o alerta do MRP — nos dois casos a fila conversa com o MRP.
let haCompraDeChapa = false;
await passo('VMRP0100: sugestões depois do cálculo', async () => {
  await page.locator('.erp-tab', { hasText: 'Sugestões' }).first().click();
  await page.waitForTimeout(800);
  haCompraDeChapa = (await page.locator('tr', { hasText: 'CHAPA-075' }).filter({ hasText: 'Compra' }).count()) > 0;
  console.log(`    compra de chapa sugerida: ${haCompraDeChapa ? 'sim' : 'não (estoque cobre)'}`);
});
if (haCompraDeChapa) {
  await passo('VMRP0100: firmar a compra da chapa', async () => {
    const linha = page.locator('tr', { hasText: 'CHAPA-075' }).filter({ hasText: 'Compra' }).first();
    await linha.getByRole('button', { name: 'Firmar' }).click();
    await page.waitForResponse((r) => /\/suggestions\/\d+\/firm/.test(r.url()));
    await page.waitForTimeout(800);
  });
}
await passo('VPDC0200: a fila do comprador traz o que o MRP firmou e o que ele recomenda', async () => {
  await page.goto(`${APP}/#/screen/VPDC0200`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sugestões do MRP' }).click();
  await page.locator('[data-testid="sugestoes-mrp"] tr', { hasText: 'Firmada no MRP' }).first().waitFor();
  if (!haCompraDeChapa) await page.locator('[data-testid="sugestoes-mrp"] tr', { hasText: 'MRP: não precisa mais' }).first().waitFor();
});

writeFileSync(`${SHOTS}/fluxo-producao-resultado.txt`, falhas.length ? falhas.join('\n') : 'ok');
console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo certo');
await browser.close();
process.exit(falhas.length ? 1 : 0);
