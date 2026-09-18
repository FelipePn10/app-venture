/**
 * Simulação manual do Roteiro de Fabricação (VENT0202).
 *
 * Exercita a tela como quem desenha um processo de verdade: o caso da bucha
 * que é torneada aqui, cementada num terceiro e retificada aqui. O que se
 * procura é o que só aparece USANDO — campo que não volta, opção que o banco
 * recusa, botão que some, número que a tela calcula diferente do backend.
 *
 * Roda com: APP_URL=http://localhost:5199 node scripts/ui-sim/roteiro.mjs
 */
import { abrir, entrar, SHOTS } from './nav.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

mkdirSync(SHOTS, { recursive: true });

const TECNICO = /parsing time|SQLSTATE|cannot parse|pq:|pgx|goroutine|nil pointer|invalid character|json:|unmarshal|panic|constraint|forbidden|unauthorized|undefined|\[object/i;
const passos = [];
const { browser, page, erros } = await abrir();
const http = [];
page.on('response', (r) => {
  const u = new URL(r.url()).pathname;
  if (u.startsWith('/api')) http.push({ m: r.request().method(), u, s: r.status() });
});

async function passo(nome, fn) {
  const desde = http.length;
  let ok = true, detalhe = '';
  try { await fn(); } catch (e) { ok = false; detalhe = String(e).split('\n')[0].slice(0, 180); }
  if (page.isClosed()) { console.log('página fechada — interrompendo'); return; }
  await page.waitForTimeout(450);
  const ruins = http.slice(desde).filter((c) => c.s >= 400);
  const feedback = (await page.locator('.erp-feedback').last().textContent().catch(() => '')) ?? '';
  passos.push({ nome, ok, detalhe, ruins: ruins.map((c) => `${c.m} ${c.u} ${c.s}`), feedback: feedback.trim() });
  console.log(`${!ok || ruins.length ? '✗' : '✓'} ${nome}${ruins.length ? '  [' + ruins.map((c) => c.s).join(',') + ']' : ''}${detalhe ? '\n    ' + detalhe : ''}`);
}

// Falha rápido: 6 s é mais que suficiente numa tela local, e um passo travado
// não pode consumir a simulação inteira.
page.setDefaultTimeout(6000);

const abaClick = (rotulo) => page.locator('.erp-tab', { hasText: rotulo }).first().click();

/**
 * Os campos são aninhados (erp-c6 contém erp-c12) e rótulos como "Nome" também
 * aparecem no cabeçalho das grades. Escopar ao BLOCO e casar o <label> exato é
 * o que faz o seletor apontar para o campo certo.
 */
const bloco = (titulo) => page.locator('.erp-fieldset').filter({ has: page.locator('.erp-fieldset-head', { hasText: titulo }) });
const campoEm = (titulo, rotulo) => bloco(titulo).locator('.erp-field').filter({ has: page.getByText(rotulo, { exact: true }) }).last();
const campo = (rotulo) => page.locator('.erp-field').filter({ has: page.getByText(rotulo, { exact: true }) }).last();
const input = (rotulo) => campo(rotulo).locator('input').last();
const select = (rotulo) => campo(rotulo).locator('select').last();
const numero = (t) => Number(String(t ?? '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));

await entrar(page);
await page.waitForTimeout(800);
await page.evaluate(() => { window.location.hash = '#/screen/VENT0202'; });
await page.locator('.erp-tab').first().waitFor({ state: 'visible', timeout: 25000 });
await page.waitForTimeout(1500);

await passo('as seis abas do PDF estão na tela', async () => {
  const abas = await page.locator('.erp-tab').allTextContents();
  const esperadas = ['Operação / Biblioteca', 'Roteiros do item', 'Etapas do roteiro',
                     'Recursos e ferramentas', 'Rede de dependências', 'Tempo e custo do lote'];
  const faltando = esperadas.filter((e) => !abas.some((a) => a.includes(e)));
  if (faltando.length) throw new Error(`faltam: ${faltando.join(' | ')} — achei: ${abas.join(' | ')}`);
});

await passo('a biblioteca carrega e mostra a coluna de refugo', async () => {
  const cabecalhos = await page.locator('.erp-grid thead th').allTextContents();
  if (!cabecalhos.some((h) => /Refugo/i.test(h))) throw new Error(`sem coluna de refugo: ${cabecalhos.join(' | ')}`);
  const linhas = await page.locator('.erp-grid tbody tr').count();
  if (linhas === 0) throw new Error('biblioteca vazia');
});

await passo('cadastrar operação interna com refugo', async () => {
  await page.fill('#rot-op-nome', 'Rebarbar — simulação');
  await page.fill('#rot-op-refugo', '4.5');
  await page.fill('#rot-op-maquina', '6');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.waitForTimeout(1800);
  if (!await page.locator('.erp-grid tbody tr', { hasText: 'Rebarbar — simulação' }).count()) {
    throw new Error('a operação não apareceu na biblioteca depois de salvar');
  }
});

await passo('o refugo cadastrado volta na grade (não vira zero)', async () => {
  await page.waitForTimeout(800);
  const linha = page.locator('.erp-grid tbody tr', { hasText: 'Rebarbar — simulação' }).first();
  if (!await linha.count()) throw new Error('a operação criada não apareceu na biblioteca');
  const celulas = await linha.locator('td').allTextContents();
  if (!celulas.some((c) => c.includes('4.5%') || c.includes('4,5%'))) {
    throw new Error(`refugo não voltou: ${celulas.join(' | ')}`);
  }
});

await passo('origem TERCEIROS revela os campos de terceirização', async () => {
  await page.locator('.erp-grid tbody tr', { hasText: 'Rebarbar — simulação' }).first()
    .getByRole('button', { name: 'Editar' }).click();
  await page.waitForTimeout(700);
  const formOp = bloco('Operação');
  if (await formOp.getByText('Prazo (dias)', { exact: true }).count()) {
    throw new Error('campos de terceiro visíveis numa operação interna');
  }
  await page.selectOption('#rot-op-origem', 'TERCEIROS');
  await page.waitForTimeout(500);
  for (const r of ['Fornecedor', 'Prazo (dias)', 'O que remeter']) {
    if (!await formOp.getByText(r, { exact: true }).count()) throw new Error(`campo "${r}" não apareceu`);
  }
  await page.selectOption('#rot-op-origem', 'INTERNA');
});

await passo('desativar abre modal em português, não caixa do navegador', async () => {
  let nativo = false;
  page.once('dialog', async (d) => { nativo = true; await d.dismiss(); });
  await page.locator('.erp-grid tbody tr', { hasText: 'Rebarbar — simulação' }).first()
    .getByRole('button', { name: 'Desativar' }).click();
  await page.waitForTimeout(600);
  if (nativo) throw new Error('ainda usa window.confirm');
  const modal = page.locator('.fsc-confirm');
  if (!await modal.count()) throw new Error('nenhum modal apareceu');
  const texto = await modal.textContent();
  if (!/Rebarbar — simulação/.test(texto ?? '')) throw new Error('o modal não diz QUAL registro será afetado');
  if (!/continuam funcionando|nada é apagado/i.test(texto ?? '')) throw new Error('o modal não explica a consequência');
});

await passo('Esc cancela o modal sem desativar nada', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  if (await page.locator('.fsc-confirm').count()) throw new Error('o modal não fechou com Esc');
  if (!await page.locator('.erp-grid tbody tr', { hasText: 'Rebarbar — simulação' }).count()) {
    throw new Error('cancelar desativou assim mesmo');
  }
});

await passo('o modal confirma e desativa de verdade', async () => {
  await page.locator('.erp-grid tbody tr', { hasText: 'Rebarbar — simulação' }).first()
    .getByRole('button', { name: 'Desativar' }).click();
  await page.waitForTimeout(500);
  await page.locator('.fsc-confirm').getByRole('button', { name: 'Desativar' }).click();
  await page.waitForTimeout(1500);
  const f = await page.locator('.erp-feedback').last().textContent();
  if (!/desativada/i.test(f ?? '')) throw new Error(`sem confirmação: "${f}"`);
});

// ── roteiro da bucha ──
/**
 * O LookupField é um botão que abre um painel com busca — nunca um campo de
 * digitar código. É a regra da casa: quem opera procura pelo nome, não decora
 * número. O teste segue o mesmo caminho do usuário.
 */
async function escolherNoLookup(controle, termo) {
  await controle.click();
  const busca = page.locator('.erp-lookup-panel input');
  await busca.waitFor({ state: 'visible' });
  await busca.fill(termo);
  await page.waitForTimeout(1200);
  const item = page.locator('.erp-lookup-item').first();
  await item.waitFor({ state: 'visible' });
  const rotulo = (await item.textContent()) ?? '';
  await item.click();
  await page.waitForTimeout(1400);
  return rotulo;
}

await passo('abrir o roteiro da bucha pelo item', async () => {
  const escolhido = await escolherNoLookup(page.locator('.erp-toolbar .erp-lookup-control').first(), 'BUCHA');
  if (!/bucha/i.test(escolhido)) throw new Error(`o lookup escolheu outra coisa: "${escolhido}"`);
  await page.waitForTimeout(1200);
});

await passo('a aba Roteiros do item lista o roteiro criado', async () => {
  await abaClick('Roteiros do item');
  await page.waitForTimeout(900);
  const linhas = await page.locator('.erp-grid tbody tr').allTextContents();
  if (!linhas.some((l) => /Bucha temperada/i.test(l))) throw new Error(`roteiro não listado: ${linhas.join(' | ').slice(0, 200)}`);
});

await passo('abrir o roteiro leva para as etapas', async () => {
  await page.locator('.erp-grid tbody tr', { hasText: 'Bucha temperada' }).first()
    .getByRole('button', { name: 'Abrir' }).click();
  await page.waitForTimeout(1800);
  const ativa = await page.locator('.erp-tab.active').textContent();
  if (!/Etapas/i.test(ativa ?? '')) throw new Error(`aba ativa: "${ativa}"`);
});

await passo('a cascata de refugo mostra quanto soltar', async () => {
  const faixa = await page.locator('.fsc-rot-cascata').first().textContent();
  if (!/soltar na primeira etapa/i.test(faixa ?? '')) throw new Error(`faixa sem a conta: "${faixa}"`);
  // lote padrão 100 e roteiro com 3%/1,5%/2% → 106,80
  if (!/106,80/.test(faixa ?? '')) throw new Error(`quantidade a soltar errada: "${faixa}"`);
});

await passo('mudar o lote recalcula a cascata', async () => {
  await page.fill('#rot-lote', '250');
  await page.waitForTimeout(700);
  const faixa = await page.locator('.fsc-rot-cascata').first().textContent();
  if (!/266,99|267,00/.test(faixa ?? '')) throw new Error(`não recalculou para 250: "${faixa}"`);
});

await passo('a etapa no terceiro está destacada na grade', async () => {
  const terceiro = page.locator('.erp-grid tbody tr.fsc-rot-terceiro');
  if (!await terceiro.count()) throw new Error('nenhuma etapa marcada como terceiro');
  const texto = await terceiro.first().textContent();
  if (!/Cementar/i.test(texto ?? '')) throw new Error(`etapa destacada errada: "${texto}"`);
  if (!/TERCEIRO/.test(texto ?? '')) throw new Error('falta a marca TERCEIRO');
  if (!/fornecedor/i.test(texto ?? '')) throw new Error('não mostra o fornecedor');
});

await passo('as etapas com inspeção aparecem marcadas', async () => {
  const marcadas = await page.locator('.fsc-rot-flag.insp').count();
  if (marcadas < 2) throw new Error(`esperava 2 etapas com inspeção, achei ${marcadas}`);
});

await passo('escolher operação externa revela terceirização NA ETAPA', async () => {
  const sel = page.locator('#rot-et-operacao');
  const opcoes = await sel.locator('option').allTextContents();
  const externa = opcoes.find((o) => /Terceiros|Externa/i.test(o));
  if (!externa) throw new Error(`nenhuma operação externa na lista: ${opcoes.join(' | ')}`);
  await sel.selectOption({ label: externa });
  await page.waitForTimeout(600);
  const formEtapa = bloco('Incluir etapa');
  for (const r of ['Fornecedor', 'Prazo (dias)', 'O que remeter', 'Custo por peça']) {
    if (!await formEtapa.getByText(r, { exact: true }).count()) throw new Error(`"${r}" não apareceu na etapa do roteiro`);
  }
});

await passo('o fornecedor da biblioteca já vem preenchido na etapa', async () => {
  const v = await page.locator('#rot-et-prazo').inputValue();
  if (!v) throw new Error('o prazo da operação de biblioteca não foi herdado no formulário');
});

await passo('detalhar uma etapa abre recursos e ferramentas', async () => {
  await page.locator('.erp-grid tbody tr', { hasText: 'Tornear' }).first()
    .getByRole('button', { name: 'Detalhar' }).click();
  await page.waitForTimeout(1500);
  const ativa = await page.locator('.erp-tab.active').textContent();
  if (!/Recursos/i.test(ativa ?? '')) throw new Error(`aba ativa: "${ativa}"`);
  for (const bloco of ['Centros de trabalho alternativos', 'Ferramentas', 'Documentos desta etapa', 'Inspeção nesta etapa']) {
    if (!await page.locator('.erp-fieldset-head', { hasText: bloco }).count()) throw new Error(`falta o bloco "${bloco}"`);
  }
});

await passo('o documento da biblioteca aparece na etapa marcado como herdado', async () => {
  // Escopar ao bloco: a aba tem quatro grades e "Da operação" só faz sentido
  // na de documentos.
  const linhas = await bloco('Documentos desta etapa').locator('tbody tr').allTextContents();
  const herdado = linhas.find((l) => /Da operação/i.test(l));
  if (!herdado) throw new Error(`nenhum documento herdado visível: ${linhas.join(' | ').slice(0, 250)}`);
  if (!/tornear/i.test(herdado)) throw new Error(`documento herdado inesperado: "${herdado}"`);
});

await passo('anexar documento a esta etapa', async () => {
  await page.fill('#rot-doc-etapa-titulo', 'Ficha de torneamento — simulação');
  await bloco('Documentos desta etapa').getByRole('button', { name: '+ Documento' }).click();
  await page.waitForTimeout(1600);
  const f = await page.locator('.erp-feedback').last().textContent();
  if (!/vinculado a esta etapa/i.test(f ?? '')) throw new Error(`sem confirmação: "${f}"`);
});

await passo('rede de dependências abre sem erro', async () => {
  await abaClick('Rede de dependências');
  await page.waitForTimeout(900);
  if (!await page.locator('.erp-fieldset-head', { hasText: 'Rede de dependências' }).count()) {
    throw new Error('bloco da rede não renderizou');
  }
});

await passo('tempo e custo do lote calcula e separa os dois relógios', async () => {
  await abaClick('Tempo e custo do lote');
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Calcular prazo' }).click();
  await page.waitForTimeout(2000);
  const faixa = await page.locator('.fsc-rot-cascata').first().textContent();
  if (!/trabalho interno/i.test(faixa ?? '')) throw new Error(`sem as horas internas: "${faixa}"`);
  if (!/no terceiro/i.test(faixa ?? '')) throw new Error(`o prazo do terceiro não aparece: "${faixa}"`);
  if (!/dias corridos/i.test(faixa ?? '')) throw new Error('não distingue dias corridos de dias úteis');
  const tabela = await page.locator('.erp-grid').last().textContent();
  if (!/Custo por peça/i.test(tabela ?? '')) throw new Error('a tabela de custo não renderizou embutida');
  if (await page.locator('.rot-backdrop').count()) throw new Error('o custo ainda abre como janela por cima, não como aba');
});

await passo('em telefone a tela não rola na horizontal', async () => {
  await page.setViewportSize({ width: 400, height: 780 });
  await page.waitForTimeout(700);
  const largura = await page.evaluate(() => document.documentElement.scrollWidth);
  if (largura > 412) throw new Error(`rola na horizontal (${largura}px)`);
  await page.setViewportSize({ width: 1600, height: 1000 });
});

if (!page.isClosed()) await page.screenshot({ path: join(SHOTS, 'roteiro-final.png'), fullPage: true });
writeFileSync(join(SHOTS, 'roteiro.json'), JSON.stringify({ passos, erros }, null, 2));

const tecnicos = passos.filter((p) => TECNICO.test(p.feedback));
const falhas = passos.filter((p) => !p.ok || p.ruins.length);
console.log(`\n${passos.length} passos · ${falhas.length} com problema · ${tecnicos.length} com texto técnico · ${erros.length} erro(s) de console`);
if (erros.length) console.log('console:', erros.slice(0, 5).join('\n  '));
await browser.close();
