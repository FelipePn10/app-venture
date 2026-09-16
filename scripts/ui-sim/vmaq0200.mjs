/**
 * Simulação manual da VMAQ0200 — Máquinas, turnos, paradas e capacidade.
 *
 * Percorre aba por aba como um usuário faria: cadastra um centro de trabalho,
 * uma máquina, um calendário com TURNO NOTURNO (22:00–06:00, o caso que o banco
 * recusava), uma parada de máquina, a produtividade do item e por fim simula o
 * tempo. Registra toda resposta HTTP e todo erro de console.
 *
 * Roda com: node scripts/ui-sim/vmaq0200.mjs
 */
import { abrir, entrar, SHOTS } from './nav.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

mkdirSync(SHOTS, { recursive: true });

const TECNICO = /parsing time|SQLSTATE|cannot parse|pq:|pgx|goroutine|nil pointer|invalid character|json:|unmarshal|panic|constraint/i;
const passos = [];
const { browser, page, erros } = await abrir();
const http = [];
page.on('response', (r) => {
  const u = new URL(r.url()).pathname;
  if (u.startsWith('/api') || u.startsWith('/users')) http.push({ m: r.request().method(), u, s: r.status() });
});

const marca = () => http.length;
async function passo(nome, fn) {
  const desde = marca();
  const antes = erros.length;
  let ok = true, detalhe = '';
  try { await fn(); } catch (e) { ok = false; detalhe = String(e).slice(0, 180); }
  await page.waitForTimeout(700);
  const chamadas = http.slice(desde);
  const feedback = await page.locator('.erp-feedback').last().textContent().catch(() => '') ?? '';
  const ruins = chamadas.filter((c) => c.s >= 400);
  passos.push({
    nome, ok, detalhe,
    chamadas: chamadas.map((c) => `${c.m} ${c.u} ${c.s}`),
    ruins: ruins.map((c) => `${c.m} ${c.u} ${c.s}`),
    feedback: feedback.trim().slice(0, 200),
    tecnico: TECNICO.test(feedback),
    consoleNovo: erros.slice(antes),
  });
  const sinal = !ok || ruins.length ? '✗' : '✓';
  console.log(`${sinal} ${nome}${ruins.length ? '  [' + ruins.map((c) => c.s).join(',') + ']' : ''}${feedback ? '  → ' + feedback.trim().slice(0, 110) : ''}${detalhe ? '\n    ' + detalhe : ''}`);
}

async function abrirAba(rotulo) {
  await page.locator('.erp-tab', { hasText: rotulo }).first().click({ timeout: 5000 });
  await page.waitForTimeout(400);
}

await entrar(page);
// O dashboard abre cada tela em janela separada (window.open), então dirigimos
// pela rota do gerenciador de janelas. `goto` só com hash diferente não remonta
// o roteador; atribuir location.hash remonta.
await page.waitForTimeout(800);
await page.evaluate(() => { window.location.hash = '#/screen/VMAQ0200'; });
// Espera a tela montar em vez de cronometrar: com timeout fixo a corrida entre
// o roteador e a primeira carga de dados fazia a contagem de abas dar zero.
await page.locator('.erp-tab').first().waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(1200);

const SUF = String(Number(String(Date.now()).slice(-5)) || 10001).replace(/^0+/, '') || '10001';
const MAQ = SUF; // a máquina criada na aba Máquinas usa este código

// ── 1. As abas existem? ─────────────────────────────────────────────────────
await passo('abas renderizadas', async () => {
  const n = await page.locator('.erp-tab').count();
  const rotulos = await page.locator('.erp-tab').allTextContents();
  if (n < 8) throw new Error(`esperava 8 abas, achei ${n}: ${rotulos.join(' | ')}`);
  console.log('   abas:', rotulos.join(' · '));
});

// ── 2. Centro de trabalho ───────────────────────────────────────────────────
await abrirAba('Centros de trabalho');
await passo('cadastrar centro de trabalho', async () => {
  await page.locator('.erp-field', { hasText: 'Código' }).first().locator('input').fill(SUF);
  await page.locator('.erp-field', { hasText: 'Nome' }).first().locator('input').fill(`Corte laser ${SUF}`);
  await page.locator('.erp-field', { hasText: 'Descrição' }).first().locator('input').fill('Centro de corte a laser');
  await page.getByRole('button', { name: /Cadastrar|Gravar/i }).first().click();
});

// ── 3. Turno noturno — o caso que o banco recusava ──────────────────────────
await abrirAba('Turnos');
await passo('turno noturno 22:00→06:00', async () => {
  await page.locator('.erp-field', { hasText: 'Código' }).first().locator('input').fill(SUF);
  await page.locator('.erp-field', { hasText: 'Descrição' }).first().locator('input').fill(`Três turnos ${SUF}`);
  await page.getByRole('button', { name: 'Adicionar turno' }).click();
  await page.waitForTimeout(300);
  const linha = page.locator('.erp-grid tbody tr').first();
  await linha.locator('select').selectOption('1');
  await linha.locator('input[type=time]').first().fill('22:00');
  await linha.locator('input[type=time]').last().fill('06:00');
  await page.waitForTimeout(200);
  const horas = await linha.locator('td').nth(3).textContent();
  const obs = await linha.locator('td').nth(4).textContent();
  if (horas?.trim() !== '8.00') throw new Error(`a tela calculou ${horas} horas, esperado 8.00`);
  if (!/vira o dia/i.test(obs ?? '')) throw new Error(`faltou avisar que vira o dia: "${obs}"`);
  await page.getByRole('button', { name: 'Cadastrar calendário' }).click();
});

await passo('turno degenerado é recusado com texto claro', async () => {
  await page.getByRole('button', { name: 'Adicionar turno' }).click();
  await page.waitForTimeout(300);
  const linha = page.locator('.erp-grid tbody tr').first();
  await linha.locator('input[type=time]').first().fill('08:00');
  await linha.locator('input[type=time]').last().fill('08:00');
  await page.locator('.erp-field', { hasText: 'Código' }).first().locator('input').fill(String(Number(SUF) + 1));
  await page.locator('.erp-field', { hasText: 'Descrição' }).first().locator('input').fill('degenerado');
  await page.getByRole('button', { name: 'Cadastrar calendário' }).click();
});

// ── 4. Máquina ──────────────────────────────────────────────────────────────
await abrirAba('Máquinas');
await passo('cadastrar máquina com jornada de 16h', async () => {
  await page.locator('.erp-field', { hasText: 'Código' }).first().locator('input').fill(SUF);
  await page.locator('.erp-field', { hasText: 'Nome' }).first().locator('input').fill(`Laser ${SUF}`);
  await page.locator('.erp-field', { hasText: 'Tipo' }).first().locator('select, input').first().selectOption({ index: 1 }).catch(() => {});
  await page.locator('.erp-field', { hasText: 'Horas disponíveis por dia' }).locator('input').fill('16');
  // O calendário recém-criado tem de aparecer na lista de seleção da máquina.
  const opcoes = await page.locator('.erp-field', { hasText: 'Calendário de turnos' }).locator('select option').allTextContents();
  if (!opcoes.some((o) => o.includes(`Três turnos ${SUF}`))) {
    throw new Error(`o calendário criado na aba Turnos não apareceu na máquina: ${opcoes.join(' | ')}`);
  }
  await page.locator('.erp-field', { hasText: 'Calendário de turnos' }).locator('select')
    .selectOption({ label: `${SUF} · Três turnos ${SUF}` });
  await page.getByRole('button', { name: 'Criar máquina' }).click();
});

await passo('a grade mostra a jornada do recurso', async () => {
  const linha = page.locator('.erp-grid tbody tr').filter({ hasText: `Laser ${SUF}` }).first();
  const jornada = await linha.locator('td').nth(6).textContent();
  if (!new RegExp(`Três turnos ${SUF}`).test(jornada ?? '')) {
    throw new Error(`a coluna Jornada não mostra o calendário: "${jornada}"`);
  }
  if (!/turno\(s\)/.test(jornada ?? '')) throw new Error(`faltou resumir os turnos: "${jornada}"`);
});

// ── 5. Parada de máquina ────────────────────────────────────────────────────
await abrirAba('Paradas');
await passo('consulta de paradas exige máquina', async () => {
  await page.getByRole('button', { name: 'Consultar' }).click();
});

await passo('registrar quebra de máquina', async () => {
  // Só as três opções que o banco aceita podem estar no seletor: uma opção que
  // o CHECK recusa é pior que nenhuma, porque o usuário escolhe e leva erro.
  const opcoes = await page.locator('.erp-field', { hasText: 'Motivo' }).locator('select option').allTextContents();
  if (opcoes.length !== 3) throw new Error(`seletor com ${opcoes.length} opções: ${opcoes.join(' | ')}`);

  await page.locator('button.erp-lookup-control').first().click();
  await page.waitForTimeout(500);
  await page.locator('.erp-lookup-panel input').fill(String(MAQ));
  await page.waitForTimeout(600);
  await page.locator('.erp-lookup-item').first().click();
  await page.waitForTimeout(300);
  await page.locator('.erp-field', { hasText: 'Início' }).locator('input').fill('2026-09-21T08:00');
  await page.locator('.erp-field', { hasText: 'Fim' }).locator('input').fill('2026-09-21T10:30');
  await page.locator('.erp-field', { hasText: 'Descrição' }).locator('input').fill('Quebra do servo do eixo Y');
  await page.getByRole('button', { name: 'Registrar parada' }).click();
});

await passo('parada sem descrição é recusada antes de ir ao servidor', async () => {
  await page.locator('.erp-field', { hasText: 'Descrição' }).locator('input').fill('');
  await page.locator('.erp-field', { hasText: 'Início' }).locator('input').fill('2026-09-22T08:00');
  await page.locator('.erp-field', { hasText: 'Fim' }).locator('input').fill('2026-09-22T09:00');
  await page.getByRole('button', { name: 'Registrar parada' }).click();
});

await passo('a parada aparece na consulta', async () => {
  await page.locator('.erp-field', { hasText: 'De' }).locator('input[type=date]').fill('2026-09-21');
  await page.locator('.erp-field', { hasText: 'Até' }).locator('input[type=date]').fill('2026-09-21');
  await page.getByRole('button', { name: 'Consultar' }).click();
  await page.waitForTimeout(900);
  const linhas = await page.locator('.erp-grid tbody tr').allTextContents();
  if (!linhas.some((l) => /servo do eixo Y/.test(l))) throw new Error(`a parada gravada não apareceu: ${linhas.join(' // ')}`);
  if (!linhas.some((l) => /2\.50|2,50/.test(l))) throw new Error(`horas da parada não conferem (esperado 2.50): ${linhas.join(' // ')}`);
});

// ── 6. Consumível: autonomia da carga e tempo de troca ──────────────────────
await abrirAba('Consumíveis');
await passo('cadastrar cilindro de oxigênio', async () => {
  // O filtro por texto pega também a nota explicativa; o campo é o primeiro
  // LookupField visível do formulário.
  await page.locator('button.erp-lookup-control').first().click();
  await page.waitForTimeout(500);
  await page.locator('.erp-lookup-panel input').fill(String(MAQ));
  await page.waitForTimeout(600);
  await page.locator('.erp-lookup-item').first().click();
  await page.waitForTimeout(300);
  await page.locator('.erp-field', { hasText: 'Código' }).first().locator('input').fill('O2');
  await page.locator('.erp-field', { hasText: 'Descrição' }).first().locator('input').fill('Oxigênio de corte');
  await page.locator('.erp-field', { hasText: 'Rende por carga' }).locator('input').fill('200');
  await page.locator('.erp-field', { hasText: 'Tempo de troca' }).locator('input').fill('20');
  await page.getByRole('button', { name: 'Gravar consumível' }).click();
});

await passo('consumível sem autonomia é recusado', async () => {
  await page.locator('.erp-field', { hasText: 'Código' }).first().locator('input').fill('N2');
  await page.locator('.erp-field', { hasText: 'Descrição' }).first().locator('input').fill('Nitrogênio');
  await page.locator('.erp-field', { hasText: 'Rende por carga' }).locator('input').fill('');
  await page.getByRole('button', { name: 'Gravar consumível' }).click();
});

await passo('alterar carrega o consumível no formulário', async () => {
  await page.locator('.erp-grid tbody tr').filter({ hasText: 'O2' }).first()
    .getByRole('button', { name: 'Alterar' }).click();
  await page.waitForTimeout(400);
  const rende = await page.locator('.erp-field', { hasText: 'Rende por carga' }).locator('input').inputValue();
  const troca = await page.locator('.erp-field', { hasText: 'Tempo de troca' }).locator('input').inputValue();
  if (rende !== '200' || troca !== '20') throw new Error(`o formulário não recebeu os valores: rende=${rende} troca=${troca}`);
});

// ── 7. Produtividade com consumo ────────────────────────────────────────────
await abrirAba('Produtividade');
await passo('taxa de consumo só habilita com consumível escolhido', async () => {
  const taxa = page.locator('.erp-field', { hasText: 'Consumo por hora de usinagem' }).locator('input');
  if (!(await taxa.isDisabled())) throw new Error('a taxa deveria começar desabilitada até escolher o consumível');
  const dica = await page.locator('.erp-field', { hasText: 'Consumo por hora de usinagem' }).locator('.erp-hint').textContent();
  if (!/escolha o consumível/i.test(dica ?? '')) throw new Error(`dica não orienta: "${dica}"`);
});

// ── 8. Simulador ────────────────────────────────────────────────────────────
await abrirAba('Simulador');
await passo('simulador exige campos', async () => {
  await page.getByRole('button', { name: 'Calcular tempo' }).click();
});

// ── 9. Demais abas abrem sem erro ───────────────────────────────────────────
for (const a of ['Preparação', 'Agenda']) {
  await passo(`aba ${a} abre`, async () => { await abrirAba(a); });
}

await page.screenshot({ path: join(SHOTS, 'vmaq0200-abas.png'), fullPage: true });
writeFileSync(join(SHOTS, 'vmaq0200.json'), JSON.stringify({ passos, erros }, null, 2));

const falhas = passos.filter((p) => !p.ok || p.ruins.length || p.tecnico);
console.log(`\n${passos.length} passos · ${falhas.length} com problema · ${erros.length} erro(s) de console`);
if (erros.length) console.log('console:', erros.slice(0, 5).join('\n'));
await browser.close();
