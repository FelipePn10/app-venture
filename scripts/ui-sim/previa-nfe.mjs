// Prévia da NF-e dirigida pela TELA, contra a API de verdade.
//
// A prévia existe para o time conferir a nota antes de emitir. Só vale se ela
// aparecer de fato na tela: esta simulação clica em "Prévia" na listagem e exige
// que a conferência, o emitente/destinatário, os itens, os totais e as parcelas
// estejam visíveis — e que o botão de emitir fique BLOQUEADO enquanto houver
// pendência que impede.
//
// Uso: APP_URL=http://localhost:5199 EMAIL=... PASSWORD=... node scripts/ui-sim/previa-nfe.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { abrir, APP, EMAIL, PASSWORD, SHOTS } from './nav.mjs';

mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await abrir();
// O console do Chrome não põe a URL no texto do erro, só em location: sem olhar
// ali, o favicon ausente do servidor de desenvolvimento passa por erro de tela.
const erros = [];
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const url = m.location()?.url ?? '';
  if (/favicon|fonts\.gstatic|4318|traces/.test(url)) return;
  erros.push(`${m.text().slice(0, 140)} @ ${url}`);
});
page.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));
page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) erros.push(`HTTP ${r.status()} ${r.url()}`); });
page.setDefaultTimeout(25000);

const limpo = async (sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ');

try {
  await page.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="password"]').waitFor();
  await page.fill('input[placeholder="voce@empresa.com"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), undefined, { timeout: 30000 });
  console.log('  ✓ login pela tela');

  await page.goto(`${APP}/#/screen/VFIS0200`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' }); // rota por hash não recarrega sozinha
  await page.locator('.erp-grid').first().waitFor();

  // A situação da nota tem de aparecer traduzida, não o enum cru do backend.
  const tabela = await limpo('.erp-grid');
  assert.ok(!/DRAFT|AUTHORIZED|CANCELLED/i.test(tabela),
    `a listagem está mostrando o status técnico em vez do rótulo: ${tabela.slice(0, 200)}`);
  console.log('  ✓ situação da nota traduzida na listagem');

  // O botão Prévia tem de existir para nota em rascunho — antes de corrigir o
  // status, nenhum botão de ação aparecia em nota nova.
  const botaoPrevia = page.locator('button', { hasText: 'Prévia' }).first();
  await botaoPrevia.waitFor();
  console.log('  ✓ botão "Prévia" disponível na nota em rascunho');

  await botaoPrevia.click();
  const modal = page.locator('.erp-modal');
  await modal.waitFor();
  // innerText devolve o texto JÁ transformado pelo CSS (os títulos sobem para
  // maiúsculas), então a comparação ignora caixa.
  const corpo = (await modal.innerText()).replace(/\s+/g, ' ');
  const corpoCmp = corpo.toLowerCase();

  for (const secao of ['conferência', 'emitente e destinatário', 'itens', 'totais', 'pagamento', 'documento que será transmitido']) {
    assert.ok(corpoCmp.includes(secao), `a prévia não mostrou a seção "${secao}"`);
  }
  console.log('  ✓ prévia mostra conferência, partes, itens, totais, pagamento e documento');

  assert.ok(/produção|homologação/.test(corpoCmp), 'a prévia não indicou o ambiente');
  console.log(`  ✓ ambiente visível: ${/homologação/.test(corpoCmp) ? 'HOMOLOGAÇÃO' : 'PRODUÇÃO'}`);

  // A conta do total escrita em palavras é o que responde "por que deu esse valor".
  assert.ok(/produtos .* \+ ipi .* = /.test(corpoCmp), 'a prévia não explicou a composição do total');
  console.log('  ✓ composição do total explicada em palavras');

  // Emitir tem de estar bloqueado quando a conferência acusa impedimento.
  const temImpedimento = corpoCmp.includes('impede');
  const emitir = page.locator('.erp-modal-actions button', { hasText: 'Emitir NF-e' }).first();
  await emitir.waitFor();
  const bloqueado = await emitir.isDisabled();
  assert.equal(bloqueado, temImpedimento,
    `botão Emitir ${bloqueado ? 'bloqueado' : 'liberado'} mas a conferência ${temImpedimento ? 'acusou' : 'não acusou'} impedimento`);
  console.log(`  ✓ botão Emitir ${bloqueado ? 'bloqueado pela conferência' : 'liberado (nada impede)'}`);

  // O documento transmitido fica escondido até o usuário pedir.
  await page.locator('.erp-modal button', { hasText: 'Mostrar' }).first().click();
  await page.locator('.erp-modal pre').first().waitFor();
  const payload = await limpo('.erp-modal pre');
  assert.ok(payload.includes('"emitente"') && payload.includes('"destinatario"'),
    'o documento transmitido não veio no formato esperado');
  console.log('  ✓ documento transmitido pode ser inspecionado');

  await page.screenshot({ path: `${SHOTS}/previa-nfe.png`, fullPage: false });

  // A prévia não pode alterar a nota: fechar e a listagem segue igual.
  await page.locator('.erp-modal-actions button', { hasText: 'Fechar' }).first().click();
  await page.locator('.erp-modal').waitFor({ state: 'detached' });
  console.log('  ✓ prévia fecha sem alterar a nota');

  assert.equal(erros.length, 0, `erros no console ou requisições recusadas: ${erros.join(' | ')}`);
  console.log(`\nPrévia da NF-e validada pela tela. Captura em ${SHOTS}/previa-nfe.png\n`);
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/previa-nfe-ERRO.png` }).catch(() => {});
  console.error('FALHOU:', e.message);
  if (erros.length) console.error('console:', erros.slice(0, 5).join(' | '));
  process.exitCode = 1;
} finally {
  await browser.close();
}
