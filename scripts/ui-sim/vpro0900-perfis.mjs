/**
 * VPRO0900 pelos dois perfis que a usam:
 *  - OPERATOR (posto): abre a OF, executa etapa, aponta; não vê criar,
 *    iniciar, cancelar, encerrar, entregar ao estoque nem custo.
 *  - PCP (ADMIN/USER): apura o custo e vê os componentes do padrão.
 * APP_URL=… OF=<id aberta em produção> OF_CUSTO=<id concluída> node scripts/ui-sim/vpro0900-perfis.mjs
 */
import { abrir, SHOTS, APP } from './nav.mjs';
import { mkdirSync } from 'node:fs';
import process from 'node:process';

mkdirSync(SHOTS, { recursive: true });
const OF = process.env.OF ?? '607';
const OF_CUSTO = process.env.OF_CUSTO ?? '604';
const TECNICO = /SQLSTATE|pq:|pgx|goroutine|nil pointer|unmarshal|panic|constraint|undefined|\[object|NaN/i;
const falhas = []; let n = 0;

async function sessao(email, senha, nome, passos) {
  const { browser, page, erros } = await abrir();
  page.setDefaultTimeout(9000);
  const http = [];
  page.on('response', (r) => { const u = new URL(r.url()).pathname; if (u.startsWith('/api')) http.push({ m: r.request().method(), u, s: r.status() }); });
  const passo = async (titulo, fn) => {
    const desde = http.length; const e0 = erros.length; let detalhe = '';
    try { await fn(page); } catch (e) { detalhe = String(e).split('\n')[0].slice(0, 240); }
    await page.waitForTimeout(400);
    const ruins = http.slice(desde).filter((c) => c.s >= 400 && !(c.s === 404 && /\/cost$/.test(c.u))).map((c) => `${c.m} ${c.u} ${c.s}`);
    const fb = ((await page.locator('.erp-feedback').last().textContent().catch(() => '')) ?? '').trim();
    const tec = TECNICO.test(fb) ? `mensagem técnica: ${fb}` : '';
    const novos = erros.slice(e0).filter((e) => !/404/.test(e));
    const ok = !detalhe && !ruins.length && !tec && !novos.length;
    n += 1;
    await page.screenshot({ path: `${SHOTS}/pf-${String(n).padStart(2, '0')}-${(nome + '-' + titulo).replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 50)}.png` });
    console.log(`${ok ? '✓' : '✗'} [${nome}] ${titulo}${fb ? `  — "${fb.slice(0, 140)}"` : ''}`);
    if (!ok) { falhas.push(titulo); for (const x of [detalhe, tec, ...ruins, ...novos]) if (x) console.log(`    ${x}`); }
  };
  await page.goto(APP, { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="voce@empresa.com"]', email);
  await page.fill('input[type="password"]', senha);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.hash.includes('dashboard'), undefined, { timeout: 30000 }).catch(() => {});
  await page.goto(`${APP}/#/screen/VPRO0900`, { waitUntil: 'networkidle' });
  await passos(passo);
  await browser.close();
}

await sessao('operador@panossoerp.demo', 'Operador@12345', 'operador', async (passo) => {
  await passo('abre a OF em produção', async (page) => {
    await page.locator('.erp-chip', { hasText: 'Todas' }).first().click();
    // Pelo código da linha: a linha de outra OF pode dizer "↳ para OF ${OF}".
    await page.locator('.erp-list-row').filter({ has: page.locator('.erp-list-code', { hasText: new RegExp(`^(↳ )?OF ${OF}$`) }) }).first().click();
    await page.waitForSelector('.vpl-record-title');
  });
  await passo('não oferece ações de PCP', async (page) => {
    for (const rotulo of ['+ Nova OF', 'Iniciar produção', 'Cancelar OF', 'Encerrar', 'Cliente e projeto']) {
      if (await page.getByRole('button', { name: rotulo, exact: true }).count()) throw new Error(`operador vê "${rotulo}"`);
    }
    if (await page.locator('.erp-tab', { hasText: 'Custo' }).count()) throw new Error('operador vê a aba Custo');
  });
  await passo('Execução: inicia e conclui a etapa liberada', async (page) => {
    await page.locator('.erp-tab', { hasText: 'Execução' }).first().click();
    const linha = page.locator('tr', { hasText: 'Corte a Laser' }).first();
    // A etapa atual abre sozinha com horas e peças; outra etapa abre pela seta.
    if (!(await page.locator('#et-horas').count())) await linha.getByRole('button', { name: 'Abrir a etapa' }).click();
    await page.fill('#et-horas', '0.8');
    await page.fill('#et-pecas', '40');
    await linha.getByRole('button', { name: 'Iniciar' }).click();
    await page.waitForTimeout(800);
    // Os dados da etapa valem para o próximo botão: preenche de novo para concluir.
    await page.fill('#et-horas', '0.8');
    await page.fill('#et-pecas', '40');
    await linha.getByRole('button', { name: 'Concluir' }).click();
    await page.waitForTimeout(800);
    await linha.getByText('Concluída').first().waitFor();
  });
  await passo('Execução: sem entrega ao estoque, com aviso', async (page) => {
    await page.locator('.erp-tab', { hasText: 'Execução' }).first().click();
    if (await page.getByRole('button', { name: /Registrar entrega|Entregar e concluir/ }).count()) throw new Error('operador vê a entrega ao estoque');
    await page.getByText('feitas pelo PCP ou almoxarifado').waitFor();
  });
  await passo('aponta produção escolhendo máquina e operador', async (page) => {
    await page.fill('#ap-prod', '5');
    const escolher = async (rotulo, termo) => {
      const campo = page.locator('.erp-field').filter({ has: page.locator('label', { hasText: rotulo }) }).first();
      await campo.locator('.erp-lookup-control').click();
      const busca = page.locator('.erp-lookup-panel input');
      await busca.waitFor({ state: 'visible' });
      if (termo) await busca.fill(termo);
      await page.waitForTimeout(600);
      await page.locator('.erp-lookup-item').first().click();
    };
    await escolher('Máquina', '');
    await escolher('Operador', '');
    await page.getByRole('button', { name: 'Registrar apontamento' }).click();
    await page.waitForResponse((r) => r.url().includes('/api/production-order/appointment') && r.request().method() === 'POST');
  });
  await passo('imprime a OP', async (page) => {
    const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Imprimir OP' }).click()]);
    await d.saveAs(`${SHOTS}/operador-${d.suggestedFilename()}`);
  });
});

await sessao(process.env.EMAIL ?? 'admin@panossoerp.demo', process.env.PASSWORD ?? 'Demo@12345', 'pcp', async (passo) => {
  await passo('abre a OF concluída', async (page) => {
    await page.locator('.erp-chip', { hasText: 'Todas' }).first().click();
    await page.locator('.erp-list-row').filter({ has: page.locator('.erp-list-code', { hasText: new RegExp(`^(↳ )?OF ${OF_CUSTO}$`) }) }).first().click();
    await page.waitForSelector('.vpl-record-title');
  });
  await passo('o custo vem calculado, sem botão de apurar', async (page) => {
    if (await page.getByRole('button', { name: /Apurar custo|Apurar de novo/ }).count()) throw new Error('ainda há botão de apurar custo');
    await page.locator('.erp-tab', { hasText: 'Custo' }).first().click();
    await page.getByText(/atualizado em .* sozinho, a cada movimento/).waitFor();
    for (const c of ['Material', 'Máquina e preparação', 'Mão de obra', 'Serviços de terceiros', 'Indiretos']) {
      await page.locator('td', { hasText: c }).first().waitFor();
    }
  });
  await passo('a leitura do código de barras abre a OF', async (page) => {
    await page.fill('.erp-search', `OF${String(OF).padStart(6, '0')}`);
    await page.press('.erp-search', 'Enter');
    await page.waitForTimeout(1000);
    const titulo = await page.locator('.vpl-record-title').textContent();
    if (!titulo?.includes(`OF ${OF}`)) throw new Error(`abriu ${titulo}`);
  });
});

console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo certo');
process.exit(falhas.length ? 1 : 0);
