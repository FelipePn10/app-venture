/**
 * Simulação do Roteiro de Fabricação unificado (VENT0202, modos Roteiros do
 * item / Modelos / Biblioteca). Percorre a tela como quem desenha o processo:
 * cria uma operação por perímetro, monta um modelo, abre o roteiro de um item,
 * edita etapa (tempo, centro alternativo, ferramenta, inspeção), mexe na rede,
 * aloca componente na etapa, copia o roteiro e cria outro a partir do modelo.
 *
 * Qualquer resposta HTTP ≥ 400, erro de console ou mensagem técnica na tela
 * conta como falha do passo.
 *
 * APP_URL=http://127.0.0.1:5211 EMAIL=… PASSWORD=… ITEM=10002 ITEM_DESTINO=10004 \
 *   node scripts/ui-sim/roteiro-unificado.mjs
 */
import { abrir, entrar, SHOTS, APP } from './nav.mjs';
import { mkdirSync } from 'node:fs';

mkdirSync(SHOTS, { recursive: true });
const ITEM = process.env.ITEM ?? '10002';
const DESTINO = process.env.ITEM_DESTINO ?? '10004';
const SUF = String(Date.now()).slice(-5);
const TECNICO = /SQLSTATE|pq:|pgx|goroutine|nil pointer|unmarshal|panic|constraint|undefined|\[object|NaN/i;

const { browser, page, erros } = await abrir();
page.setDefaultTimeout(7000);
const http = [];
page.on('response', (r) => {
  const u = new URL(r.url()).pathname;
  if (u.startsWith('/api')) http.push({ m: r.request().method(), u, s: r.status() });
});
const falhas = [];
let n = 0;
async function passo(nome, fn) {
  const desde = http.length; const errosAntes = erros.length;
  let detalhe = '';
  try { await fn(); } catch (e) { detalhe = String(e).split('\n')[0].slice(0, 220); }
  await page.waitForTimeout(400);
  const ruins = http.slice(desde).filter((c) => c.s >= 400).map((c) => `${c.m} ${c.u} ${c.s}`);
  const fb = ((await page.locator('.erp-feedback').last().textContent().catch(() => '')) ?? '').trim();
  const tec = TECNICO.test(fb) ? `mensagem técnica: ${fb}` : '';
  const novosErros = erros.slice(errosAntes);
  const ok = !detalhe && !ruins.length && !tec && !novosErros.length;
  n += 1;
  await page.screenshot({ path: `${SHOTS}/${String(n).padStart(2, '0')}-${nome.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)}.png` });
  console.log(`${ok ? '✓' : '✗'} ${nome}${fb ? `  — "${fb.slice(0, 140)}"` : ''}`);
  if (!ok) { falhas.push(nome); for (const x of [detalhe, tec, ...ruins, ...novosErros]) if (x) console.log(`    ${x}`); }
}

async function escolherNoLookup(controle, termo) {
  await controle.click();
  const busca = page.locator('.erp-lookup-panel input');
  await busca.waitFor({ state: 'visible' });
  await busca.fill(termo);
  await page.waitForTimeout(1000);
  const item = page.locator('.erp-lookup-item').first();
  await item.waitFor({ state: 'visible' });
  await item.click();
  await page.waitForTimeout(1000);
}
const modal = () => page.locator('.erp-modal').last();
const campoNo = (raiz, rotulo) => raiz.locator('.erp-field').filter({ has: page.locator('label').getByText(rotulo, { exact: true }) }).last();
const esperarFeedback = async (re) => {
  await page.waitForFunction((src) => [...document.querySelectorAll('.erp-feedback')].some((e) => new RegExp(src, 'i').test(e.textContent ?? '')), re.source, { timeout: 8000 });
};

await entrar(page);
await page.goto(`${APP}/#/screen/VENT0202`, { waitUntil: 'networkidle' });

// ── Biblioteca ───────────────────────────────────────────────────────────────
const OP = `Fita de borda ${SUF}`;
await passo('biblioteca: cria operação por perímetro', async () => {
  await page.getByRole('tab', { name: 'Biblioteca de operações' }).click();
  await page.getByRole('button', { name: '+ Nova' }).click();
  await page.fill('#bib-nome', OP);
  await page.selectOption('#bib-unidade', 'MIN');
  await page.selectOption('#bib-base', 'PERIMETRO');
  await page.fill('#bib-setup', '5');
  await page.fill('#bib-run', '0.5');
  await page.getByRole('button', { name: 'Criar operação' }).click();
  await esperarFeedback(/criada/);
  await page.locator('.erp-list-row', { hasText: OP }).waitFor();
  const titulo = await page.locator('.erp-detail-panel .erp-panel-title').first().textContent();
  if (/Operação \d+$/.test(titulo ?? '') && !(await page.locator('.erp-list-row.sel', { hasText: (titulo ?? '').replace('Operação ', '') }).count())) {
    throw new Error(`o título mostra o id interno: ${titulo}`);
  }
});

// ── Modelos ──────────────────────────────────────────────────────────────────
const MODELO = `Modelo painel ${SUF}`;
await passo('modelos: cria e nomeia o modelo', async () => {
  await page.getByRole('tab', { name: 'Modelos' }).click();
  await page.getByRole('button', { name: '+ Novo modelo' }).click();
  await page.waitForSelector('#rot-desc');
  await page.fill('#rot-desc', MODELO);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await esperarFeedback(/salvo/);
  await page.locator('.erp-list-row', { hasText: MODELO }).waitFor();
});
for (const [seq, nome] of [['10', 'Corte'], ['20', OP]]) {
  await passo(`modelos: inclui etapa ${seq}`, async () => {
    await page.locator('.rot-etapa.nova').click();
    const m = modal();
    await m.locator('#et-seq').fill(seq);
    const opcao = await m.locator('#et-op option').filter({ hasText: nome }).first().getAttribute('value');
    await m.locator('#et-op').selectOption(opcao);
    await m.getByRole('button', { name: 'Incluir etapa' }).click();
    await esperarFeedback(new RegExp(`Etapa ${seq} incluída`));
    await m.getByRole('button', { name: 'Fechar' }).click();
  });
}

// ── Roteiro do item ──────────────────────────────────────────────────────────
await passo('item: escolhe o item e abre o roteiro', async () => {
  await page.getByRole('tab', { name: 'Roteiros do item' }).click();
  await escolherNoLookup(page.locator('.erp-toolbar .erp-lookup-control').first(), ITEM);
  await page.locator('.erp-list-row').first().click();
  await page.waitForSelector('.rot-fluxo');
  await page.waitForSelector('.fsc-rot-prontidao');
});

await passo('item: etapa com tempo no campo antigo é corrigida pela tela', async () => {
  const cartao = page.locator('.rot-etapa:not(.nova)').first();
  await cartao.click();
  const m = modal();
  const botao = m.getByRole('button', { name: 'Usar como tempo de máquina' });
  if (await botao.count()) await botao.click();
  else await m.locator('#et-run').fill('2');
  await m.getByRole('button', { name: 'Salvar etapa' }).click();
  await esperarFeedback(/atualizada/);
});

await passo('item: alternativo vira principal e sobrevive ao salvar a etapa', async () => {
  const m = modal();
  await m.getByRole('button', { name: 'Centros' }).click();
  // Garante ao menos um alternativo (o Solda, se ele ainda não for o principal).
  await escolherNoLookup(campoNo(m, 'Centro alternativo').locator('.erp-lookup-control'), 'Solda');
  await m.getByRole('button', { name: '+ Alternativo' }).click();
  await page.waitForTimeout(800);
  const linha = m.locator('.erp-grid tbody tr').filter({ has: page.getByRole('button', { name: 'Tornar principal' }) }).first();
  const promovido = ((await linha.locator('td').first().textContent()) ?? '').trim();
  // O rótulo do principal vem com o código ("3 · Solda"); a linha mostra o nome.
  const antigo = ((await m.locator('.fsc-rot-cascata strong').first().textContent()) ?? '').trim().replace(/^\d+\s*·\s*/, '');
  await linha.getByRole('button', { name: 'Tornar principal' }).click();
  await esperarFeedback(/passa a ser o principal/);
  await page.waitForTimeout(800);
  // O centro antigo ficou como alternativo.
  if (!(await m.locator('.erp-grid tbody tr', { hasText: antigo }).count())) throw new Error(`o centro antigo (${antigo}) sumiu da etapa`);
  // Salvar a aba Etapa logo depois não pode desfazer a troca.
  await m.getByRole('button', { name: 'Etapa', exact: true }).click();
  await m.getByRole('button', { name: 'Salvar etapa' }).click();
  await esperarFeedback(/atualizada/);
  await m.getByRole('button', { name: 'Fechar' }).click();
  const onde = ((await page.locator('.rot-etapa:not(.nova)').first().locator('.rot-etapa-onde').textContent()) ?? '').trim();
  if (!onde || !promovido.toLowerCase().includes(onde.toLowerCase().slice(0, 6))) throw new Error(`a etapa devia rodar em "${promovido}", está em "${onde}"`);
  await page.locator('.rot-etapa:not(.nova)').first().click();
});

await passo('item: plano de inspeção na etapa', async () => {
  const m = modal();
  await m.getByRole('button', { name: 'Inspeção' }).click();
  await m.locator('#insp-desc').fill(`Esquadro ${SUF}`);
  await m.getByRole('button', { name: '+ Plano' }).click();
  await esperarFeedback(/Plano de inspeção criado/);
  await m.getByRole('button', { name: 'Fechar' }).click();
});

await passo('item: inclui etapa por perímetro', async () => {
  await page.locator('.rot-etapa.nova').click();
  const m = modal();
  const opcao = await m.locator('#et-op option').filter({ hasText: OP }).first().getAttribute('value');
  await m.locator('#et-op').selectOption(opcao);
  await m.getByRole('button', { name: 'Incluir etapa' }).click();
  await esperarFeedback(/incluída/);
  await m.getByRole('button', { name: 'Fechar' }).click();
});

await passo('item: dependência e remoção da etapa do meio', async () => {
  await page.locator('.erp-tab', { hasText: 'Dependências' }).click();
  const selects = page.locator('.erp-fieldset').filter({ has: page.locator('.erp-fieldset-head', { hasText: 'Nova dependência' }) }).locator('select');
  const opts = await selects.nth(0).locator('option').evaluateAll((os) => os.map((o) => o.value).filter((v) => v !== '0'));
  if (opts.length < 3) throw new Error(`o roteiro precisa de 3 etapas; tem ${opts.length}`);
  await selects.nth(0).selectOption(opts[0]); await selects.nth(1).selectOption(opts[1]);
  await page.getByRole('button', { name: '+ Dependência' }).click(); await esperarFeedback(/Dependência criada/);
  await selects.nth(0).selectOption(opts[1]); await selects.nth(1).selectOption(opts[2]);
  await page.getByRole('button', { name: '+ Dependência' }).click(); await esperarFeedback(/Dependência criada/);
  await page.locator('.erp-tab', { hasText: 'Etapas' }).click();
  await page.locator('.erp-grid tbody tr').nth(1).getByRole('button', { name: 'Remover' }).click();
  await page.getByRole('button', { name: 'Remover', exact: true }).last().click();
  await esperarFeedback(/Etapa removida/);
  await page.locator('.erp-tab', { hasText: 'Dependências' }).click();
  const linhas = await page.locator('.erp-grid tbody tr').count();
  if (linhas !== 1) throw new Error(`esperava 1 dependência ligando a 1ª à 3ª; há ${linhas}`);
});

await passo('item: tempo e custo calculam', async () => {
  await page.locator('.erp-tab', { hasText: 'Tempo e custo' }).click();
  await page.getByRole('button', { name: /Calcular prazo/ }).click();
  await page.waitForSelector('text=caminho crítico');
});

await passo('item: padrão × real carrega', async () => {
  await page.locator('.erp-tab', { hasText: 'Padrão × real' }).click();
  await page.waitForSelector('text=Tempo padrão × apontado');
  await page.waitForTimeout(800);
});

await passo('item: cabeçalho com faixa de lote', async () => {
  await campoNo(page.locator('.rot-cabecalho'), 'Lote a partir de').locator('input').fill('1');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await esperarFeedback(/salvo/);
});

await passo('item: copia o roteiro para outro item', async () => {
  await page.getByRole('button', { name: 'Copiar', exact: true }).first().click();
  const m = modal();
  await escolherNoLookup(campoNo(m, 'Item de destino').locator('.erp-lookup-control'), DESTINO);
  await campoNo(m, 'Alternativa').locator('input').fill(String(1000 + (Number(SUF) % 30000)));
  await m.getByRole('button', { name: 'Copiar' }).click();
  await esperarFeedback(/copiado/);
});

await passo('item destino: novo roteiro a partir do modelo', async () => {
  await escolherNoLookup(page.locator('.erp-toolbar .erp-lookup-control').first(), DESTINO);
  await page.getByRole('button', { name: 'A partir de modelo' }).click();
  const m = modal();
  const valor = await m.locator('select').first().locator('option', { hasText: MODELO }).getAttribute('value');
  await m.locator('select').first().selectOption(valor);
  // A tela já sugere a próxima alternativa livre.
  await m.getByRole('button', { name: 'Criar' }).click();
  await esperarFeedback(/a partir do modelo/);
});

await passo('item destino: aloca componente numa etapa', async () => {
  await page.locator('.erp-tab', { hasText: 'Materiais por etapa' }).click();
  await page.waitForTimeout(1000);
  const sel = page.locator('select[aria-label^="Etapa do componente"]').first();
  if (!(await sel.count())) throw new Error('o item destino não tem componente na estrutura');
  const valor = await sel.locator('option').nth(2).getAttribute('value');
  await sel.selectOption(valor);
  await esperarFeedback(/entra na etapa/);
});

await passo('VENT0115 não existe mais', async () => {
  await page.goto(`${APP}/#/screen/VENT0115`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  if (await page.getByText('Rotina unificada').count()) throw new Error('a VENT0115 ainda aparece como rotina aposentada');
});

console.log(falhas.length ? `\n${falhas.length} passo(s) com falha: ${falhas.join('; ')}` : '\nTodos os passos passaram.');
console.log(`capturas em ${SHOTS}`);
await browser.close();
process.exit(falhas.length ? 1 : 0);
