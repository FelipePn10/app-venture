// Simulação de tela: o que o usuário vê ao procurar um item.
//
// Cobre três regressões de uma vez:
//   1. item INATIVO não pode aparecer na lista de busca de nenhuma tela…
//   2. …exceto no cadastro de item (VENT0200), que é onde se reativa;
//   3. o campo Item da barra de ferramentas precisa caber a descrição.
// As respostas da API são fixtures isoladas; o backend tem seus próprios testes.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { APP, CHROME } from './nav.mjs';

const item = (code, nome, health) => ({
  code, name: nome, health, situation: 'LINHA',
  pdm: { description_technique: nome },
  warehouse: { unit_of_measurement: 'UN' },
});
const FORNECEDORES = [
  { code: 10, name: 'ACOS DO SUL LTDA', is_active: true },
  { code: 11, name: 'FORNECEDOR ENCERRADO ME', is_active: false },
];
const CLIENTES = [
  { code: 20, name: 'METALURGICA BOA VISTA', blocked: false },
  { code: 21, name: 'CLIENTE INADIMPLENTE SA', blocked: true },
];
const MAQUINAS = [
  { code: 30, name: 'LASER CALFRAN 3000', is_active: true, machine_type_code: 5 },
  { code: 31, name: 'GUILHOTINA SUCATEADA', is_active: false, machine_type_code: 5 },
];
/** O centro de trabalho do roteiro é o ID do tipo de máquina, não o código. */
const TIPOS = [{ id: 8, code: 5, name: 'LASER', type: 'CORTE', is_active: true }];
/** Montagens que consomem a chapa — o impacto de inativá-la. */
const ONDE_USADO = { item_code: 'RN-01001', rows: [
  { level: 1, parent_code: 'TP-01001-A', parent_description: 'TAMPA SUPERIOR', quantity: 2 },
  { level: 2, parent_code: 'MQ-0500', parent_description: 'CONJUNTO MONTADO', quantity: 1 },
]};

const ITENS = [
  item('RN-01001', 'CHAPA GALVANIZADA #16 1200x3000 ACABAMENTO FOSCO', 'ATIVO'),
  item('RN-09999', 'PERFIL DESCONTINUADO 50x25 — NAO USAR', 'INATIVO'),
  item('BU-050', 'BUCHA DE BRONZE 50MM', 'FANTASMA'),
];

/** A chapa tem roteiro com tempo por etapa; a bucha não tem roteiro nenhum. */
const ROTEIRO = {
  route: { id: 42, code: 4, item_code: 'RN-01001', description: 'Roteiro da chapa', alternative: 1, is_standard: true },
  // 0,0042 h = 15,12 s por peça no centro 8 (LASER).
  operations: [{ id: 1001, sequence: 10, operation_id: 7, operation_name: 'Cortar no laser', run_time: 15,
    effective_work_center_id: 8, eff_time: { setup_hours: 0.08, run_hours: 0.0042, run_base_qty: 1 } }],
  network: [],
};

/** Formato REAL do log: requisição, não domínio — sem `action` nem `entity`. */
const AUDITORIA = [
  { id: 1219, occurred_at: '2026-09-19T10:12:34-03:00', method: 'POST', route: '/api/routing/operations',
    path: '/api/routing/operations', status: 201, user_id: '2b4a9a19', user_role: 'ADMIN', latency_ms: 41 },
  { id: 1218, occurred_at: '2026-09-19T10:11:02-03:00', method: 'DELETE', route: '/api/items/structure/{p}/{c}',
    path: '/api/items/structure/900500/101', status: 403, user_id: '2b4a9a19', user_role: 'ADMIN', latency_ms: 12 },
];

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.addInitScript(() => localStorage.setItem('erp-auth-storage', JSON.stringify({
  state: { token: 'isolated-ui-test', userName: 'Teste', user: { name: 'Teste', role: 'ADMIN' }, expiresAt: null }, version: 0,
})));

await page.route('**/*', async (route) => {
  const p = new URL(route.request().url()).pathname;
  if (!p.startsWith('/api/') && !p.startsWith('/users/')) return route.continue();
  let body = [];
  if (p === '/api/items/' || p === '/api/items') body = ITENS;
  else if (p === '/api/routing/routes') {
    const alvo = new URL(route.request().url()).searchParams.get('item_code');
    body = alvo === 'RN-01001' ? [ROTEIRO.route] : [];
  }
  else if (p === '/api/routing/routes/42') body = ROTEIRO;
  else if (p.startsWith('/api/items/structure/where-used/')) body = ONDE_USADO;
  else if (p === '/api/suppliers' || p === '/api/suppliers/') body = FORNECEDORES;
  else if (p === '/api/customers' || p === '/api/customers/') body = CLIENTES;
  else if (p === '/api/machine/list' || p === '/api/machine') body = MAQUINAS;
  else if (p === '/api/machine/types/list') body = TIPOS;
  else if (p === '/api/audit-log') body = AUDITORIA;
  else if (p === '/users/me') body = { id: 'test', name: 'Teste', role: 'ADMIN' };
  else if (p === '/api/version') body = { version: '1.1.33', min_client: '1.0.0' };
  else if (p.startsWith('/api/enterprise')) body = [{ id: 1, code: 1, nome_fantasia: 'VENTURE' }];
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});

const abrirLista = async (campo) => {
  await campo.locator('.erp-lookup-control').click();
  await page.locator('.erp-lookup-panel').waitFor();
};
const fecharLista = async () => { await page.keyboard.press('Escape'); await page.locator('.erp-lookup-panel').waitFor({ state: 'detached' }); };
const codigosNaLista = () => page.locator('.erp-lookup-panel .erp-lookup-item-code').allTextContents();

try {
  // ── 1. VSUP0110 — tela comum: nada de item inativo ───────────────────────
  await page.goto(`${APP}/#/screen/VSUP0110`);
  const barra = page.locator('.erp-toolbar .erp-tlookup');
  await barra.waitFor();

  const largura = await barra.evaluate((el) => el.getBoundingClientRect().width);
  assert.ok(largura >= 400, `campo Item da barra ficou com ${Math.round(largura)}px; esperado >= 400`);

  await abrirLista(barra);
  const lista = await codigosNaLista();
  assert.ok(lista.includes('RN-01001'), 'item ativo sumiu da lista');
  assert.ok(lista.includes('BU-050'), 'item FANTASMA é de planejamento e deve continuar selecionável');
  assert.ok(!lista.includes('RN-09999'), `item inativo apareceu na busca: ${lista.join(', ')}`);
  const rodape = await page.locator('.erp-lookup-panel .erp-lookup-foot').textContent();
  assert.match(rodape, /1 inativo\(s\) fora da lista/, `rodapé não avisou do inativo: ${rodape}`);

  // Buscar pelo código do inativo também não pode trazê-lo.
  await page.locator('.erp-lookup-panel input').fill('RN-09999');
  assert.deepEqual(await codigosNaLista(), [], 'busca pelo código do inativo devolveu o item');
  await fecharLista();

  // A descrição inteira precisa caber no campo depois de escolher.
  await abrirLista(barra);
  await page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: 'CHAPA GALVANIZADA' }).click();
  const texto = await barra.locator('.erp-lookup-value').textContent();
  assert.equal(texto, 'RN-01001 — CHAPA GALVANIZADA #16 1200x3000 ACABAMENTO FOSCO');
  const cortado = await barra.locator('.erp-lookup-value').evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  assert.ok(!cortado, 'a descrição do item continua cortada no campo da barra');

  // ── 2. VENT0200 — cadastro de item: o inativo PRECISA aparecer ───────────
  await page.goto(`${APP}/#/screen/VENT0200`);
  const manutencao = page.locator('.it-open-item');
  await manutencao.waitFor();
  await abrirLista(manutencao);
  const listaCadastro = await codigosNaLista();
  assert.ok(listaCadastro.includes('RN-09999'), 'sem o inativo aqui não há como reativá-lo');
  const marcado = await page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: 'PERFIL DESCONTINUADO' }).locator('.erp-lookup-item-off').textContent();
  assert.equal(marcado, 'inativo', 'o inativo precisa se anunciar na lista do cadastro');
  await fecharLista();

  // ── 3. VENT0202 — "Máquina" da biblioteca é tempo, não equipamento ───────
  await page.goto(`${APP}/#/screen/VENT0202`);
  await page.getByRole('button', { name: 'Operação / Biblioteca' }).click();
  const campoTempo = page.locator('#rot-op-maquina');
  await campoTempo.waitFor();
  assert.equal(await campoTempo.getAttribute('type'), 'number', 'o campo deixou de ser numérico');
  const rotulo = await page.locator('label[for="rot-op-maquina"]').textContent();
  assert.equal(rotulo, 'Tempo de máquina', `rótulo ambíguo: ${rotulo}`);
  const rotulos = await page.locator('.erp-fieldset-body .erp-label').allTextContents();
  assert.ok(!rotulos.includes('Máquina'), `ainda há um campo chamado só "Máquina": ${rotulos.join(' | ')}`);

  // ── 4. VMAQ0200 — a tela diz quem manda no tempo ─────────────────────────
  await page.goto(`${APP}/#/screen/VMAQ0200`);
  await page.getByRole('button', { name: 'Produtividade' }).click();
  const campoItem = page.locator('.erp-fieldset-body .erp-field', { hasText: 'Item' }).first();
  await abrirLista(campoItem);
  await page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: 'CHAPA GALVANIZADA' }).click();
  const comRoteiro = page.locator('.erp-note', { hasText: 'Este item tem roteiro' });
  await comRoteiro.waitFor();
  assert.match(await comRoteiro.textContent(), /Quem define[\s\S]*é o roteiro/,
    'a tela precisa dizer que o tempo vem do roteiro, não deste campo');

  await abrirLista(campoItem);
  await page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: 'BUCHA DE BRONZE' }).click();
  await page.locator('.erp-note', { hasText: 'ainda não tem roteiro com tempo por etapa' }).waitFor();

  // Divergência: o roteiro diz 15 s/peça; cadastrar 60 s aqui tem de acusar.
  await abrirLista(campoItem);
  await page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: 'CHAPA GALVANIZADA' }).click();
  const campoMaq = page.locator('.erp-fieldset-body .erp-field', { hasText: 'Máquina' }).locator('.erp-lookup').first();
  await abrirLista(campoMaq);
  await page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: 'LASER CALFRAN' }).click();
  await page.locator('#maq-unidade-tempo').selectOption('SEGUNDO');
  await page.locator('#maq-tempo-producao').fill('60');
  await page.locator('#maq-qtd-no-tempo').fill('1');
  const comparativo = page.locator('.maq-comparativo');
  await comparativo.waitFor();
  const textoComp = await comparativo.textContent();
  assert.ok(textoComp.includes('LASER'), `comparativo não nomeou o centro: ${textoComp}`);
  assert.match(textoComp, /roteiro: ?15,1 s/, `tempo do roteiro errado: ${textoComp}`);
  assert.match(textoComp, /esta produtividade: ?60 s/, `tempo do cadastro errado: ${textoComp}`);
  assert.equal(await page.locator('.maq-comparativo.divergente').count(), 1, '75% de diferença tem de acusar divergência');

  // Alinhar os dois números faz o alerta sumir.
  await page.locator('#maq-tempo-producao').fill('15');
  await page.waitForFunction(() => document.querySelectorAll('.maq-comparativo.divergente').length === 0);
  assert.equal(await page.locator('.maq-comparativo').count(), 1, 'o comparativo continua visível, só sem alerta');

  // ── 5. Mesma regra para fornecedor, cliente e máquina ────────────────────
  await page.goto(`${APP}/#/screen/VSUP0130`);
  const campoFornecedor = page.locator('.erp-field', { hasText: 'Fornecedor' }).locator('.erp-lookup').first();
  await campoFornecedor.waitFor();
  await abrirLista(campoFornecedor);
  const fornecedores = await page.locator('.erp-lookup-panel .erp-lookup-item-label').allTextContents();
  assert.ok(fornecedores.some((t) => t.includes('ACOS DO SUL')), `fornecedor ativo sumiu: ${fornecedores.join(', ')}`);
  assert.ok(!fornecedores.some((t) => t.includes('ENCERRADO')), `fornecedor inativo apareceu: ${fornecedores.join(', ')}`);
  await fecharLista();

  await page.goto(`${APP}/#/screen/VMAQ0200`);
  await page.getByRole('button', { name: 'Produtividade' }).click();
  const campoMaquina = page.locator('.erp-fieldset-body .erp-field', { hasText: 'Máquina' }).locator('.erp-lookup').first();
  await campoMaquina.waitFor();
  await abrirLista(campoMaquina);
  const maquinas = await page.locator('.erp-lookup-panel .erp-lookup-item-label').allTextContents();
  assert.ok(maquinas.some((t) => t.includes('LASER CALFRAN')), `máquina ativa sumiu: ${maquinas.join(', ')}`);
  assert.ok(!maquinas.some((t) => t.includes('SUCATEADA')), `máquina inativa apareceu: ${maquinas.join(', ')}`);
  await fecharLista();

  // ── 6. VENT0200 avisa o impacto antes de inativar ────────────────────────
  await page.goto(`${APP}/#/screen/VENT0200`);
  await abrirLista(page.locator('.it-open-item'));
  await page.locator('.erp-lookup-panel .erp-lookup-item', { hasText: 'CHAPA GALVANIZADA' }).click();
  await page.locator('.it-sit-badge').waitFor();
  const estado = page.locator('select.it-select').filter({ has: page.locator('option[value="FANTASMA"]') }).first();
  await estado.selectOption('INATIVO');
  const impacto = page.locator('.it-impacto-alerta');
  await impacto.waitFor();
  const textoImpacto = await impacto.textContent();
  assert.match(textoImpacto, /2 montagem\(ns\) usam este item/, `aviso não contou as montagens: ${textoImpacto}`);
  assert.ok(textoImpacto.includes('TP-01001-A') && textoImpacto.includes('MQ-0500'),
    'o aviso precisa dizer QUAIS montagens, não só quantas');

  // ── 7. VAUD0100 lê os campos que o log realmente devolve ────────────────
  await page.goto(`${APP}/#/screen/VAUD0100`);
  await page.getByRole('button', { name: 'Consultar' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.erp-grid tbody tr').length === 2);
  const linhas = await page.locator('.erp-grid tbody tr').allTextContents();
  assert.ok(linhas.some((t) => t.includes('Cadastrou roteiro de fabricação')),
    `a ação e o cadastro têm de sair do método e da rota: ${linhas.join(' || ')}`);
  assert.ok(linhas.some((t) => t.includes('Excluiu estrutura de produto')), `esperava a exclusão traduzida: ${linhas.join(' || ')}`);
  assert.ok(!linhas.some((t) => t.includes('Registrou uma ação')), 'nenhuma linha pode cair no texto genérico');
  assert.ok(linhas.some((t) => t.includes('Recusado (403)')), 'o resultado da requisição precisa aparecer');

  assert.deepEqual(errors, [], `erros de página: ${errors.join(' | ')}`);
  console.log('✓ item inativo fora das buscas, visível no cadastro, barra larga, rótulo de tempo, precedência do roteiro, cadastros inativos, impacto de inativar e histórico legível');
} finally {
  await browser.close();
}
