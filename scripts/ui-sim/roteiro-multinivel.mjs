/**
 * Cenário de vários níveis pela tela VENT0202 — o armário de aço:
 *
 *   ARM-01 (armário)          solda → montagem → embalagem (+ etapa fantasma)
 *    ├─ 2× PORTA-01           roteiro a partir de modelo + zincagem em terceiro
 *    │    └─ CHAPA-075 (comprada)
 *    ├─ 2× LATERAL-01         dois alternativos por faixa de lote (≤ 49 / ≥ 50)
 *    │    └─ CHAPA-075
 *    └─ 1× KIT-FER-01 (comprado) — entra na etapa de montagem
 *
 * Pressupõe os itens, a estrutura e o centro "Montagem" já cadastrados.
 * APP_URL=… EMAIL=… PASSWORD=… node scripts/ui-sim/roteiro-multinivel.mjs
 */
import { abrir, entrar, SHOTS, APP } from './nav.mjs';
import { mkdirSync } from 'node:fs';

mkdirSync(SHOTS, { recursive: true });
const TECNICO = /SQLSTATE|pq:|pgx|goroutine|nil pointer|unmarshal|panic|constraint|undefined|\[object|NaN/i;
const { browser, page, erros } = await abrir();
page.setDefaultTimeout(8000);
const http = [];
page.on('response', (r) => { const u = new URL(r.url()).pathname; if (u.startsWith('/api')) http.push({ m: r.request().method(), u, s: r.status() }); });
const falhas = []; let n = 0;
async function passo(nome, fn) {
  const desde = http.length; const e0 = erros.length; let detalhe = '';
  try { await fn(); } catch (e) { detalhe = String(e).split('\n')[0].slice(0, 240); }
  await page.waitForTimeout(350);
  const ruins = http.slice(desde).filter((c) => c.s >= 400).map((c) => `${c.m} ${c.u} ${c.s}`);
  const fb = ((await page.locator('.erp-feedback').last().textContent().catch(() => '')) ?? '').trim();
  const tec = TECNICO.test(fb) ? `mensagem técnica: ${fb}` : '';
  const ok = !detalhe && !ruins.length && !tec && erros.length === e0;
  n += 1;
  await page.screenshot({ path: `${SHOTS}/${String(n).padStart(2, '0')}-${nome.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 44)}.png` });
  console.log(`${ok ? '✓' : '✗'} ${nome}${fb ? `  — "${fb.slice(0, 150)}"` : ''}`);
  if (!ok) { falhas.push(nome); for (const x of [detalhe, tec, ...ruins, ...erros.slice(e0)]) if (x) console.log(`    ${x}`); }
}
async function lookup(controle, termo) {
  await controle.click();
  const busca = page.locator('.erp-lookup-panel input');
  await busca.waitFor({ state: 'visible' });
  await busca.fill(termo);
  await page.waitForTimeout(900);
  const item = page.locator('.erp-lookup-item').first();
  await item.waitFor({ state: 'visible' });
  await item.click();
  await page.waitForTimeout(700);
}
const modal = () => page.locator('.erp-modal').last();
const campoNo = (raiz, rotulo) => raiz.locator('.erp-field').filter({ has: page.locator('label').getByText(rotulo, { exact: true }) }).last();
const feedback = async (re) => page.waitForFunction((src) => [...document.querySelectorAll('.erp-feedback')].some((e) => new RegExp(src, 'i').test(e.textContent ?? '')), re.source, { timeout: 9000 });
const aba = (t) => page.locator('.erp-tab', { hasText: t }).first().click();
const opcaoCom = async (select, texto) => select.locator('option').filter({ hasText: texto }).first().getAttribute('value');

async function escolherItem(codigo) {
  await page.getByRole('tab', { name: 'Roteiros do item' }).click();
  await lookup(page.locator('.erp-toolbar .erp-lookup-control').first(), codigo);
}
async function abrirRoteiro(texto) {
  await page.locator('.erp-list-row', { hasText: texto }).first().click();
  await page.waitForSelector('.rot-cabecalho');
}
/** Inclui uma etapa pelo editor. `extra` preenche o formulário antes de salvar. */
async function incluirEtapa(seq, operacao, extra) {
  await aba('Etapas');
  await page.locator('.rot-etapa.nova').click();
  const m = modal();
  await m.locator('#et-seq').fill(String(seq));
  await m.locator('#et-op').selectOption(await opcaoCom(m.locator('#et-op'), operacao));
  if (extra) await extra(m);
  await m.getByRole('button', { name: 'Incluir etapa' }).click();
  await feedback(new RegExp(`Etapa ${seq} incluída`));
  return m;
}
async function abrirEtapa(seq) {
  await aba('Etapas');
  await page.locator('.rot-etapa:not(.nova)').filter({ has: page.locator('.rot-etapa-seq', { hasText: new RegExp(`^${seq}$`) }) }).first().click();
  return modal();
}
const fechar = (m) => m.getByRole('button', { name: 'Fechar' }).click();

await entrar(page);
await page.goto(`${APP}/#/screen/VENT0202`, { waitUntil: 'networkidle' });

// ════ Biblioteca ════════════════════════════════════════════════════════════
async function novaOperacao(nome, preencher) {
  await page.getByRole('tab', { name: 'Biblioteca de operações' }).click();
  if (await page.locator('.erp-list-row', { hasText: nome }).count()) return; // reexecução
  await page.getByRole('button', { name: '+ Nova' }).click();
  await page.fill('#bib-nome', nome);
  await preencher();
  await page.getByRole('button', { name: 'Criar operação' }).click();
  await feedback(/criada/);
}
await passo('biblioteca: Zincagem em terceiro (5 dias)', () => novaOperacao('Zincagem', async () => {
  await page.selectOption('#bib-origem', 'TERCEIROS');
  await lookup(campoNo(page.locator('.erp-detail-panel'), 'Fornecedor').locator('.erp-lookup-control'), 'Aços');
  await campoNo(page.locator('.erp-detail-panel'), 'Prazo (dias)').locator('input').fill('5');
  await campoNo(page.locator('.erp-detail-panel'), 'Custo por peça (se faltar na VTER0100)').locator('input').fill('3.5');
}));
await passo('biblioteca: Montagem final no centro Montagem', () => novaOperacao('Montagem final', async () => {
  await lookup(campoNo(page.locator('.erp-detail-panel'), 'Centro de trabalho padrão').locator('.erp-lookup-control'), 'Montagem');
  await page.selectOption('#bib-unidade', 'MIN');
  await page.fill('#bib-setup', '10'); await page.fill('#bib-run', '6');
}));
await passo('biblioteca: Embalagem', () => novaOperacao('Embalagem', async () => {
  await lookup(campoNo(page.locator('.erp-detail-panel'), 'Centro de trabalho padrão').locator('.erp-lookup-control'), 'Montagem');
  await page.selectOption('#bib-unidade', 'MIN');
  await page.fill('#bib-run', '2');
}));
await passo('biblioteca: Pintura a pó por m²', () => novaOperacao('Pintura a pó', async () => {
  await lookup(campoNo(page.locator('.erp-detail-panel'), 'Centro de trabalho padrão').locator('.erp-lookup-control'), 'Pintura');
  await page.selectOption('#bib-unidade', 'MIN');
  await page.selectOption('#bib-base', 'M2');
  await page.fill('#bib-setup', '15'); await page.fill('#bib-run', '1.5');
}));
await passo('biblioteca: editar operação antiga mantém o tempo legado', async () => {
  await page.getByRole('tab', { name: 'Biblioteca de operações' }).click();
  await page.locator('.erp-list-row', { hasText: 'Dobra' }).first().click();
  const run = await page.inputValue('#bib-run');
  if (Number(run) <= 0) throw new Error(`o tempo legado não veio para o campo: ${run}`);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await feedback(/atualizada/);
  await page.locator('.erp-list-row', { hasText: 'Dobra' }).first().click();
  if (Number(await page.inputValue('#bib-run')) <= 0) throw new Error('salvar apagou o tempo da operação');
});

await passo('biblioteca: centro padrão nas operações antigas (laser, dobradeira, solda)', async () => {
  await page.getByRole('tab', { name: 'Biblioteca de operações' }).click();
  for (const [op, centro] of [['Corte a Laser', 'Laser'], ['Dobra', 'Dobradeira'], ['Soldagem MIG', 'Solda']]) {
    await page.locator('.erp-list-row', { hasText: op }).first().click();
    const campo = campoNo(page.locator('.erp-detail-panel'), 'Centro de trabalho padrão');
    if (!(await campo.textContent())?.includes(centro)) {
      await lookup(campo.locator('.erp-lookup-control'), centro);
    }
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await feedback(new RegExp(`"${op}" atualizada`));
  }
});

// ════ Modelo ═══════════════════════════════════════════════════════════════
const MODELO = 'Chapa: corte, dobra, pintura';
await passo('modelo: cria o modelo de chapa', async () => {
  await page.getByRole('tab', { name: 'Modelos' }).click();
  if (await page.locator('.erp-list-row', { hasText: MODELO }).count()) { await abrirRoteiro(MODELO); return; }
  await page.getByRole('button', { name: '+ Novo modelo' }).click();
  await page.waitForSelector('#rot-desc');
  await page.fill('#rot-desc', MODELO);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await feedback(/salvo/);
});
await passo('modelo: três etapas', async () => {
  if (await page.locator('.rot-etapa:not(.nova)').count() >= 3) return;
  for (const [s, o] of [[10, 'Corte a Laser'], [20, 'Dobra'], [30, 'Pintura a pó']]) {
    const m = await incluirEtapa(s, o); await fechar(m);
  }
});

// ════ PORTA-01 ═════════════════════════════════════════════════════════════
await passo('porta: roteiro a partir do modelo', async () => {
  await escolherItem('PORTA-01');
  if (await page.locator('.erp-list-row').count()) { await page.locator('.erp-list-row').first().click(); return; }
  await page.getByRole('button', { name: 'A partir de modelo' }).click();
  const m = modal();
  await m.locator('select').first().selectOption(await opcaoCom(m.locator('select').first(), MODELO));
  await campoNo(m, 'Descrição').locator('input').fill('Porta — corte, dobra, zincagem, pintura');
  await m.getByRole('button', { name: 'Criar' }).click();
  await feedback(/a partir do modelo: 3 etapa/);
});
await passo('porta: zincagem em terceiro entre dobra e pintura', async () => {
  if (await page.locator('.rot-etapa-nome', { hasText: 'Zincagem' }).count()) return;
  const m = await incluirEtapa(25, 'Zincagem');
  await fechar(m);
  const cartao = page.locator('.rot-etapa.terceiro');
  if (!(await cartao.count())) throw new Error('a etapa de terceiro não aparece destacada');
  const onde = await cartao.first().locator('.rot-etapa-onde').textContent();
  if (!/Aços/.test(onde ?? '') || !/5 dias/.test(onde ?? '')) throw new Error(`fornecedor/prazo herdados não aparecem: ${onde}`);
});
await passo('porta: etapa 10 com tempo próprio em segundos e refugo', async () => {
  const m = await abrirEtapa(10);
  await campoNo(m, 'Unidade desta etapa').locator('select').selectOption('SEGUNDO');
  await m.locator('#et-run').fill('45');
  await m.locator('#et-refugo').fill('2');
  await m.getByRole('button', { name: 'Salvar etapa' }).click();
  await feedback(/Etapa 10 atualizada/);
});
await passo('porta: centro alternativo na etapa 10 (prensa, 30% mais lenta)', async () => {
  const m = modal();
  await m.getByRole('button', { name: 'Centros' }).click();
  if (!(await m.locator('.erp-grid tbody tr', { hasText: 'Prensa' }).count())) {
    await lookup(campoNo(m, 'Centro alternativo').locator('.erp-lookup-control'), 'Prensa');
    await campoNo(m, 'Fator de tempo').locator('input').fill('1.3');
    await m.getByRole('button', { name: '+ Alternativo' }).click();
    await m.locator('.erp-grid tbody tr', { hasText: 'Prensa' }).waitFor();
  }
});
await passo('porta: desenho na etapa 10', async () => {
  const m = modal();
  await m.getByRole('button', { name: 'Documentos' }).click();
  if (await m.locator('.erp-grid tbody tr', { hasText: 'Desenho da porta' }).count()) { await fechar(m); return; }
  await campoNo(m, 'Título').locator('input').fill('Desenho da porta 1800×450');
  await campoNo(m, 'Referência').locator('input').fill('DES-PORTA-01');
  await campoNo(m, 'Rev.').locator('input').fill('B');
  await m.getByTitle('Anexar').click();
  await feedback(/Documento vinculado/);
  await m.locator('.erp-grid tbody tr', { hasText: 'Desenho da porta' }).waitFor();
  await fechar(m);
});
await passo('porta: inspeção da camada de pó na pintura', async () => {
  const m = await abrirEtapa(30);
  await m.getByRole('button', { name: 'Inspeção' }).click();
  if (!(await m.locator('.erp-grid tbody tr', { hasText: 'camada' }).count())) {
    await m.locator('#insp-desc').fill('Espessura da camada de pó (60–80 µm)');
    await campoNo(m, 'Amostra').locator('input').fill('5');
    await m.getByRole('button', { name: '+ Plano' }).click();
    await feedback(/Plano de inspeção criado/);
  }
  await m.getByRole('button', { name: 'Etapa', exact: true }).click();
  const marcado = await m.locator('.erp-toggle-row input[type=checkbox]').last().isChecked();
  if (!marcado) throw new Error('criar o plano devia marcar a etapa como ponto de inspeção');
  await fechar(m);
});
await passo('porta: pintura por m² usa a área da porta (0,81 m²)', async () => {
  const cartao = page.locator('.rot-etapa').filter({ hasText: 'Pintura a pó' }).first();
  if (await cartao.locator('.rot-tag.erro').count()) throw new Error('a pintura ficou sem medida');
  const m = await abrirEtapa(30);
  const dica = await m.locator('text=Cada peça deste item').textContent().catch(() => '');
  if (!/0,81/.test(dica ?? '')) throw new Error(`área esperada 0,81 m²; tela: ${dica}`);
  await fechar(m);
});
await passo('porta: prontidão sem pendência que trave', async () => {
  const txt = await page.locator('.fsc-rot-prontidao').first().textContent();
  // Sem produtividade na VMAQ0200 ainda: a única pendência aceitável é máquina apta.
  if (/sem centro de trabalho/.test(txt ?? '')) throw new Error(`etapas herdadas continuam sem centro: ${txt}`);
});

// ════ LATERAL-01: dois alternativos por faixa de lote ═════════════════════
await passo('lateral: alternativo 1 para lote pequeno (até 49)', async () => {
  await escolherItem('LATERAL-01');
  if (!(await page.locator('.erp-list-row', { hasText: 'Lote pequeno' }).count())) {
    await page.getByRole('button', { name: '+ Novo roteiro' }).click();
    const m = modal();
    await campoNo(m, 'Descrição').locator('input').fill('Lote pequeno');
    await m.getByRole('button', { name: 'Criar' }).click();
    await feedback(/Roteiro criado/);
    for (const [s, o] of [[10, 'Corte a Laser'], [20, 'Dobra'], [30, 'Pintura a pó']]) { const e = await incluirEtapa(s, o); await fechar(e); }
  } else await abrirRoteiro('Lote pequeno');
  await campoNo(page.locator('.rot-cabecalho'), 'Lote até').locator('input').fill('49');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await feedback(/salvo/);
});
await passo('lateral: alternativo 2 (a partir de 50) por cópia, com corte mais rápido', async () => {
  if (!(await page.locator('.erp-list-row', { hasText: 'Lote grande' }).count())) {
    await page.getByRole('button', { name: 'Copiar', exact: true }).click();
    const m = modal();
    await lookup(campoNo(m, 'Item de destino').locator('.erp-lookup-control'), 'LATERAL-01');
    await campoNo(m, 'Alternativa').locator('input').fill('2');
    await campoNo(m, 'Descrição').locator('input').fill('Lote grande');
    await m.getByRole('button', { name: 'Copiar' }).click();
    await feedback(/copiado/);
  }
  await abrirRoteiro('Lote grande');
  const cab = page.locator('.rot-cabecalho');
  await campoNo(cab, 'Lote a partir de').locator('input').fill('50');
  await campoNo(cab, 'Lote até').locator('input').fill('');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await feedback(/salvo/);
  const m = await abrirEtapa(10);
  await campoNo(m, 'Unidade desta etapa').locator('select').selectOption('SEGUNDO');
  await m.locator('#et-run').fill('30');
  await m.getByRole('button', { name: 'Salvar etapa' }).click();
  await feedback(/atualizada/);
  await fechar(m);
});
await passo('lateral: a lista mostra as duas faixas', async () => {
  const pequeno = await page.locator('.erp-list-row', { hasText: 'Lote pequeno' }).textContent();
  const grande = await page.locator('.erp-list-row', { hasText: 'Lote grande' }).textContent();
  if (!/≤ 49/.test(pequeno ?? '') || !/≥ 50/.test(grande ?? '')) throw new Error(`faixas: "${pequeno}" / "${grande}"`);
});
await passo('lateral: desativar e reativar o alternativo 2', async () => {
  await abrirRoteiro('Lote grande');
  await page.locator('.rot-cabecalho').getByRole('button', { name: 'Desativar' }).click();
  await page.getByRole('button', { name: 'Desativar', exact: true }).last().click();
  await feedback(/Desativado/);
  await abrirRoteiro('Lote grande');
  await page.locator('.rot-cabecalho').getByRole('button', { name: 'Reativar' }).click();
  await feedback(/Reativado/);
});

// ════ ARM-01 ═══════════════════════════════════════════════════════════════
await passo('armário: roteiro com solda, usinagem fantasma, montagem e embalagem', async () => {
  await escolherItem('ARM-01');
  if (await page.locator('.erp-list-row').count()) { await page.locator('.erp-list-row').first().click(); return; }
  await page.getByRole('button', { name: '+ Novo roteiro' }).click();
  const m = modal();
  await campoNo(m, 'Descrição').locator('input').fill('Armário — estrutura, montagem, embalagem');
  await m.getByRole('button', { name: 'Criar' }).click();
  await feedback(/Roteiro criado/);
  for (const [s, o] of [[10, 'Soldagem MIG'], [15, 'Usinagem'], [20, 'Montagem final'], [30, 'Embalagem']]) {
    const e = await incluirEtapa(s, o, s === 15 ? async (x) => { await campoNo(x, 'Situação').locator('select').selectOption('FANTASMA'); } : undefined);
    await fechar(e);
  }
  if (!(await page.locator('.rot-etapa.fantasma').count())) throw new Error('a etapa fantasma não aparece tracejada');
});
await passo('armário: remover a embalagem e incluir de novo na mesma sequência', async () => {
  await aba('Etapas');
  const linha = page.locator('.erp-grid tbody tr', { hasText: 'Embalagem' }).first();
  await linha.getByRole('button', { name: 'Remover' }).click();
  await page.getByRole('button', { name: 'Remover', exact: true }).last().click();
  await feedback(/Etapa removida/);
  const m = await incluirEtapa(30, 'Embalagem');
  await fechar(m);
});
await passo('armário: dependências solda → montagem → embalagem', async () => {
  await aba('Dependências');
  if (await page.locator('.erp-grid tbody tr', { hasText: 'Montagem final' }).count() >= 2) return;
  const bloco = page.locator('.erp-fieldset').filter({ has: page.locator('.erp-fieldset-head', { hasText: 'Nova dependência' }) });
  const [a, b] = [bloco.locator('select').nth(0), bloco.locator('select').nth(1)];
  for (const [de, para] of [['Soldagem MIG', 'Montagem final'], ['Montagem final', 'Embalagem']]) {
    await a.selectOption(await opcaoCom(a, de));
    await b.selectOption(await opcaoCom(b, para));
    await page.getByRole('button', { name: '+ Dependência' }).click();
    await feedback(/Dependência criada/);
  }
});
await passo('armário: ciclo na rede é recusado com mensagem clara', async () => {
  const bloco = page.locator('.erp-fieldset').filter({ has: page.locator('.erp-fieldset-head', { hasText: 'Nova dependência' }) });
  const [a, b] = [bloco.locator('select').nth(0), bloco.locator('select').nth(1)];
  await a.selectOption(await opcaoCom(a, 'Embalagem'));
  await b.selectOption(await opcaoCom(b, 'Soldagem MIG'));
  await page.getByRole('button', { name: '+ Dependência' }).click();
  await feedback(/ciclo/);
  // A recusa (422) é a resposta esperada: tira-a das contas do passo.
  http.splice(http.length - 1, 1);
  erros.splice(erros.length - 1, 1);
});
await passo('armário: porta e kit entram na montagem, lateral na solda', async () => {
  await aba('Materiais por etapa');
  await page.waitForSelector('select[aria-label^="Etapa do componente"]');
  for (const [comp, etapa] of [['PORTA-01', 'Montagem final'], ['KIT-FER-01', 'Montagem final'], ['LATERAL-01', 'Soldagem MIG']]) {
    const sel = page.locator(`select[aria-label="Etapa do componente ${comp}"]`);
    await sel.selectOption(await opcaoCom(sel, etapa));
    await feedback(new RegExp(`${comp} entra na etapa`));
  }
});
await passo('armário: tempo e custo calculam com o lote de 60', async () => {
  await page.locator('.rot-lote input').fill('60');
  await aba('Tempo e custo');
  await page.getByRole('button', { name: /Calcular prazo/ }).click();
  await page.waitForSelector('text=caminho crítico');
  const faixa = await page.locator('.fsc-rot-cascata').first().textContent();
  if (/caminho crítico: —/.test(faixa ?? '')) throw new Error(`sem caminho crítico: ${faixa}`);
});

console.log(falhas.length ? `\n${falhas.length} passo(s) com falha: ${falhas.join('; ')}` : '\nTodos os passos passaram.');
await browser.close();
process.exit(falhas.length ? 1 : 0);
