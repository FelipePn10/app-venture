/**
 * Casos de borda do cadastro de roteiro (VENT0202), sobre os itens do cenário
 * do armário (roteiro-multinivel.mjs): validações, situação da etapa, troca do
 * padrão, máscara, modelo, remoções e operação desativada.
 *
 * APP_URL=… EMAIL=… PASSWORD=… node scripts/ui-sim/roteiro-casos.mjs
 */
import { abrir, entrar, SHOTS, APP } from './nav.mjs';
import { mkdirSync } from 'node:fs';
import process from 'node:process';

mkdirSync(SHOTS, { recursive: true });
const SUF = String(Date.now()).slice(-4);
const TECNICO = /SQLSTATE|pq:|pgx|goroutine|nil pointer|unmarshal|panic|constraint|undefined|\[object|NaN/i;
const { browser, page, erros } = await abrir();
page.setDefaultTimeout(8000);
const http = [];
page.on('response', (r) => { const u = new URL(r.url()).pathname; if (u.startsWith('/api')) http.push({ m: r.request().method(), u, s: r.status() }); });
const falhas = []; let n = 0;
/** `esperados`: quantas respostas 4xx o passo provoca de propósito. */
async function passo(nome, fn, esperados = 0) {
  const desde = http.length; const e0 = erros.length; let detalhe = '';
  try { await fn(); } catch (e) { detalhe = String(e).split('\n')[0].slice(0, 240); }
  await page.waitForTimeout(350);
  const ruins = http.slice(desde).filter((c) => c.s >= 400);
  const fb = ((await page.locator('.erp-feedback').last().textContent().catch(() => '')) ?? '').trim();
  const tec = TECNICO.test(fb) ? `mensagem técnica: ${fb}` : '';
  const errosNovos = erros.slice(e0).filter((e) => !/status of 4\d\d/.test(e));
  const ok = !detalhe && ruins.length === esperados && !tec && !errosNovos.length;
  n += 1;
  await page.screenshot({ path: `${SHOTS}/${String(n).padStart(2, '0')}-${nome.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 44)}.png` });
  console.log(`${ok ? '✓' : '✗'} ${nome}${fb ? `  — "${fb.slice(0, 150)}"` : ''}`);
  if (!ok) { falhas.push(nome); for (const x of [detalhe, tec, ...ruins.map((c) => `${c.m} ${c.u} ${c.s}`), ...errosNovos]) if (x) console.log(`    ${x}`); }
}
async function lookup(controle, termo) {
  await controle.click();
  const busca = page.locator('.erp-lookup-panel input');
  await busca.waitFor({ state: 'visible' });
  await busca.fill(termo); await page.waitForTimeout(900);
  await page.locator('.erp-lookup-item').first().click(); await page.waitForTimeout(700);
}
const modal = () => page.locator('.erp-modal').last();
const campoNo = (raiz, rotulo) => raiz.locator('.erp-field').filter({ has: page.locator('label').getByText(rotulo, { exact: true }) }).last();
const feedback = async (re) => page.waitForFunction((src) => [...document.querySelectorAll('.erp-feedback')].some((e) => new RegExp(src, 'i').test(e.textContent ?? '')), re.source, { timeout: 9000 });
const aba = (t) => page.locator('.erp-tab', { hasText: t }).first().click();
const opcaoCom = async (select, texto) => select.locator('option').filter({ hasText: texto }).first().getAttribute('value');
const cab = () => page.locator('.rot-cabecalho');
const salvarCab = () => page.getByRole('button', { name: 'Salvar', exact: true }).click();
async function escolherItem(codigo) {
  await page.getByRole('tab', { name: 'Roteiros do item' }).click();
  await lookup(page.locator('.erp-toolbar .erp-lookup-control').first(), codigo);
}
// O cabeçalho já existe do roteiro anterior: espera o NOVO carregar (descrição),
// senão o clique seguinte cai no formulário que ainda vai ser substituído.
const abrirRoteiro = async (texto) => {
  await page.locator('.erp-list-row', { hasText: texto }).first().click();
  await page.waitForSelector('.rot-cabecalho');
  await page.waitForFunction((t) => [...document.querySelectorAll('.rot-cabecalho input')].some((i) => i.value.includes(t)), texto, { timeout: 8000 });
};
async function abrirEtapa(seq) {
  await aba('Etapas');
  await page.locator('.rot-etapa:not(.nova)').filter({ has: page.locator('.rot-etapa-seq', { hasText: new RegExp(`^${seq}$`) }) }).first().click();
  return modal();
}

await entrar(page);
await page.goto(`${APP}/#/screen/VENT0202`, { waitUntil: 'networkidle' });

// ── validações ──────────────────────────────────────────────────────────────
await passo('validação: lote máximo menor que o mínimo é recusado na tela', async () => {
  await escolherItem('LATERAL-01');
  await abrirRoteiro('Lote grande');
  await campoNo(cab(), 'Lote até').locator('input').fill('10');
  await salvarCab();
  await feedback(/máximo não pode ser menor que o mínimo/);
  await campoNo(cab(), 'Lote até').locator('input').fill('');
});
await passo('validação: fim da vigência antes do início é recusado', async () => {
  await campoNo(cab(), 'Vigente de').locator('input').fill('2027-03-01');
  await campoNo(cab(), 'até').locator('input').fill('2027-01-01');
  await salvarCab();
  await feedback(/fim da vigência não pode ser anterior/);
  await campoNo(cab(), 'Vigente de').locator('input').fill('');
  await campoNo(cab(), 'até').locator('input').fill('');
  await salvarCab();
  await feedback(/salvo/);
}, 1);
await passo('validação: sequência repetida é recusada com mensagem clara', async () => {
  await aba('Etapas');
  await page.locator('.rot-etapa.nova').click();
  const m = modal();
  await m.locator('#et-seq').fill('20');
  await m.locator('#et-op').selectOption(await opcaoCom(m.locator('#et-op'), 'Embalagem'));
  await m.getByRole('button', { name: 'Incluir etapa' }).click();
  await m.locator('.erp-feedback.error', { hasText: 'sequência 20' }).waitFor();
  await m.getByRole('button', { name: 'Cancelar' }).click();
}, 1);

// ── situação da etapa e troca do padrão ─────────────────────────────────────
await passo('etapa inativa sai do prazo e aparece tracejada', async () => {
  const m = await abrirEtapa(30);
  await campoNo(m, 'Situação').locator('select').selectOption('INATIVA');
  await m.getByRole('button', { name: 'Salvar etapa' }).click();
  await feedback(/Etapa 30 atualizada/);
  await m.getByRole('button', { name: 'Fechar' }).click();
  if (!(await page.locator('.rot-etapa.fantasma', { hasText: 'Pintura' }).count())) throw new Error('a etapa inativa não aparece tracejada');
  const m2 = await abrirEtapa(30);
  await campoNo(m2, 'Situação').locator('select').selectOption('APROVADA');
  await m2.getByRole('button', { name: 'Salvar etapa' }).click();
  await feedback(/Etapa 30 atualizada/);
  await m2.getByRole('button', { name: 'Fechar' }).click();
});
await passo('trocar o padrão: o outro alternativo deixa de ser padrão', async () => {
  await abrirRoteiro('Lote grande');
  const toggle = cab().locator('.erp-toggle input[type=checkbox]').first();
  if (!(await toggle.isChecked())) await cab().locator('.erp-toggle').first().click();
  await salvarCab();
  await feedback(/salvo como padrão/);
  const pequeno = await page.locator('.erp-list-row', { hasText: 'Lote pequeno' }).textContent();
  const grande = await page.locator('.erp-list-row', { hasText: 'Lote grande' }).textContent();
  if (/Padrão/.test(pequeno ?? '') || !/Padrão/.test(grande ?? '')) throw new Error(`padrão: pequeno="${pequeno}" grande="${grande}"`);
  // volta ao estado do cenário
  await abrirRoteiro('Lote pequeno');
  if (!(await cab().locator('.erp-toggle input[type=checkbox]').first().isChecked())) await cab().locator('.erp-toggle').first().click();
  await salvarCab();
  await feedback(/salvo como padrão/);
});

// ── máscara ─────────────────────────────────────────────────────────────────
await passo('roteiro próprio para a máscara BRANCO', async () => {
  await escolherItem('PORTA-01');
  if (await page.locator('.erp-list-row', { hasText: 'máscara BRANCO' }).count()) return;
  await page.getByRole('button', { name: '+ Novo roteiro' }).click();
  const m = modal();
  await campoNo(m, 'Descrição').locator('input').fill('Porta branca (pintura dupla)');
  await campoNo(m, 'Máscara (opcional)').locator('input').fill('BRANCO');
  await m.getByRole('button', { name: 'Criar' }).click();
  await feedback(/Roteiro criado/);
  await page.locator('.erp-list-row', { hasText: 'máscara BRANCO' }).waitFor();
});

// ── modelo ──────────────────────────────────────────────────────────────────
await passo('transformar o roteiro da porta em modelo', async () => {
  await abrirRoteiro('zincagem');
  await cab().getByRole('button', { name: 'Copiar' }).click();
  const m = modal();
  await m.getByRole('button', { name: 'Transformar em modelo' }).click();
  await campoNo(m, 'Nome do modelo').locator('input').fill(`Porta zincada ${SUF}`);
  await m.getByRole('button', { name: 'Copiar' }).click();
  await feedback(/Modelo "Porta zincada/);
  await page.getByRole('tab', { name: 'Modelos' }).click();
  await page.locator('.erp-list-row', { hasText: `Porta zincada ${SUF}` }).waitFor();
});
await passo('usar o modelo num item (lateral, alternativa nova)', async () => {
  await abrirRoteiro(`Porta zincada ${SUF}`);
  const etapasModelo = await page.locator('.rot-etapa:not(.nova)').count();
  if (await page.locator('.erp-tab', { hasText: 'Materiais' }).count()) throw new Error('modelo não deve ter a aba de materiais');
  await cab().getByRole('button', { name: 'Usar em um item' }).click();
  const m = modal();
  await lookup(campoNo(m, 'Item de destino').locator('.erp-lookup-control'), 'LATERAL-01');
  await campoNo(m, 'Alternativa').locator('input').fill(String(100 + (Number(SUF) % 800)));
  await m.getByRole('button', { name: 'Copiar' }).click();
  await feedback(new RegExp(`${etapasModelo} etapa`));
});

// ── remoções ────────────────────────────────────────────────────────────────
await passo('remover centro alternativo, documento e ferramenta da etapa', async () => {
  await escolherItem('PORTA-01');
  await abrirRoteiro('zincagem');
  const m = await abrirEtapa(10);
  await m.getByRole('button', { name: 'Centros' }).click();
  const prensa = m.locator('.erp-grid tbody tr', { hasText: 'Prensa' });
  if (await prensa.count()) { await prensa.getByRole('button', { name: 'Remover' }).click(); await page.waitForTimeout(700); }
  if (await m.locator('.erp-grid tbody tr', { hasText: 'Prensa' }).count()) throw new Error('o alternativo não saiu');
  await m.getByRole('button', { name: 'Ferramentas' }).click();
  await lookup(campoNo(m, 'Ferramenta').locator('.erp-lookup-control'), 'Bico');
  await m.getByRole('button', { name: '+ Ferramenta' }).click();
  await m.locator('.erp-grid tbody tr').filter({ has: page.getByRole('button', { name: 'Remover' }) }).first().waitFor();
  await m.locator('.erp-grid tbody tr').filter({ has: page.getByRole('button', { name: 'Remover' }) }).first().getByRole('button', { name: 'Remover' }).click();
  await page.waitForTimeout(700);
  await m.getByRole('button', { name: 'Documentos' }).click();
  const doc = m.locator('.erp-grid tbody tr', { hasText: 'Desenho da porta' });
  if (await doc.count()) { await doc.getByRole('button', { name: 'Remover' }).click(); await feedback(/Documento removido/); }
  await m.getByRole('button', { name: 'Fechar' }).click();
});
await passo('remover dependência e devolver material ao início da ordem', async () => {
  await escolherItem('ARM-01');
  await page.locator('.erp-list-row').first().click();
  await aba('Dependências');
  const linhas = page.locator('.erp-grid tbody tr').filter({ has: page.getByRole('button', { name: 'Remover' }) });
  const antes = await linhas.count();
  await linhas.last().getByRole('button', { name: 'Remover' }).click();
  await page.waitForTimeout(800);
  if ((await linhas.count()) !== antes - 1) throw new Error('a dependência não saiu');
  await aba('Materiais por etapa');
  const sel = page.locator('select[aria-label="Etapa do componente KIT-FER-01"]');
  await sel.selectOption('');
  await feedback(/KIT-FER-01 entra no início da ordem/);
  await sel.selectOption(await opcaoCom(sel, 'Montagem final'));
  await feedback(/KIT-FER-01 entra na etapa/);
});

// ── operação desativada ─────────────────────────────────────────────────────
await passo('operação desativada some da escolha da etapa', async () => {
  const nome = `Rebarbar ${SUF}`;
  await page.getByRole('tab', { name: 'Biblioteca de operações' }).click();
  await page.getByRole('button', { name: '+ Nova' }).click();
  await page.fill('#bib-nome', nome);
  await page.getByRole('button', { name: 'Criar operação' }).click();
  await feedback(/criada/);
  await page.locator('.erp-detail-panel').getByRole('button', { name: 'Desativar' }).click();
  await page.getByRole('button', { name: 'Desativar', exact: true }).last().click();
  await feedback(/desativada/);
  await escolherItem('ARM-01');
  await page.locator('.erp-list-row').first().click();
  await aba('Etapas');
  await page.locator('.rot-etapa.nova').click();
  const ofertas = await modal().locator('#et-op option').allTextContents();
  await modal().getByRole('button', { name: 'Cancelar' }).click();
  if (ofertas.some((o) => o.includes(nome))) throw new Error('a operação desativada continua sendo oferecida');
});

console.log(falhas.length ? `\n${falhas.length} passo(s) com falha: ${falhas.join('; ')}` : '\nTodos os passos passaram.');
await browser.close();
process.exit(falhas.length ? 1 : 0);
