// Simulação de tela das mudanças desta rodada, dirigindo o navegador como um
// usuário faria. As respostas da API são fixtures isoladas — o backend tem seus
// próprios testes; o que se prova aqui é que a TELA mostra o número certo.
//
// Cobre:
//   1. VCLI0520 — condição "30% entrada, 20% entrega, restante 28/56 dias":
//      percentual e evento base por parcela, o aviso de que não fecha 100% e a
//      simulação em dinheiro;
//   2. VVND0300 — produto, IPI e produto + IPI como leituras distintas do mesmo
//      orçamento, o plano de pagamento e o rateio de comissão de 2 representantes;
//   3. VSUP0140 — cadastro de transportadora: pendências, frota, regiões e a
//      cotação comparativa de frete aberta em componentes.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { APP, CHROME } from './nav.mjs';

// ── Fixtures ────────────────────────────────────────────────────────────────

const CONDICOES = [{
  id: 1, code: 1, description: '30% ENTRADA, 20% ENTREGA E RESTANTE 28/56 DIAS',
  analysis_type: 'SEMPRE_ANALISA', parcel_start: 'EMISSAO', average_term: 28, is_active: true,
}];

/** Parcelas como o backend devolve: percentual por parcela e evento do prazo. */
let PARCELAS = [
  { id: 1, installment_number: 1, due_days: 0, percentage: 30, base_event: 'ENTRADA' },
  { id: 2, installment_number: 2, due_days: 0, percentage: 20, base_event: 'ENTREGA' },
  { id: 3, installment_number: 3, due_days: 28, percentage: 25, base_event: 'EMISSAO' },
];

const PLANO_SIMULADO = {
  condicao_code: 1, condicao_descricao: CONDICOES[0].description, total: 10000,
  parcelas: [
    { numero: 1, percentual: 30, valor: 3000, vencimento: '2026-09-25', dias_prazo: 0, evento: 'ENTRADA', evento_rotulo: 'entrada (no ato)', descricao: 'entrada', estimado: false },
    { numero: 2, percentual: 20, valor: 2000, vencimento: '2026-10-20', dias_prazo: 0, evento: 'ENTREGA', evento_rotulo: 'entrega', descricao: 'na entrega', estimado: false },
    { numero: 3, percentual: 25, valor: 2500, vencimento: '2026-10-23', dias_prazo: 28, evento: 'EMISSAO', evento_rotulo: 'emissão', descricao: '28 dias da emissão', estimado: false },
    { numero: 4, percentual: 25, valor: 2500, vencimento: '2026-11-20', dias_prazo: 56, evento: 'EMISSAO', evento_rotulo: 'emissão', descricao: '56 dias da emissão', estimado: false },
  ],
};

/** Orçamento com IPI e ST: 225 de produto, 11,25 de IPI, 4,50 de ST. */
const ORCAMENTO = {
  code: 2, quotation_number: 2, enterprise_code: 1, status: 'OV', quotation_type: 'VENDA',
  emission_date: '2026-09-25', digit_date: '2026-09-25', delivery_date: '2026-10-20',
  customer_code: 9001, representative_code: 6, sales_division_code: 1, price_table_code: 1,
  payment_term_code: 1, currency_code: 'BRL', commission_pct: 3, release_status: 'RELEASED',
  total_gross: 250, total_net: 225, total_ipi: 11.25, total_st: 4.5, total_with_ipi: 236.25,
  retained_tax_value: 0, is_active: true,
  items: [{
    code: 1, sales_quotation_code: 2, sequence: 1, item_code: '950300', requested_qty: 10,
    unit_price: 25, attended_qty: 0, cancelled_qty: 0, balance: 10, discount_pct: 10,
    ipi_pct: 5, st_pct: 2, total_gross: 250, total_net: 225, total_ipi: 11.25, total_st: 4.5,
    total_net_with_ipi: 236.25, status: 'OPEN', is_active: true, sales_uom: 'UN',
  }],
};

const PLANO_ORCAMENTO = { ...PLANO_SIMULADO, total: 225, parcelas: PLANO_SIMULADO.parcelas.map((p) => ({ ...p, valor: (225 * p.percentual) / 100 })) };

const RATEIO = {
  document_code: 2, total_produtos: 225, total_liquido: 225, total_pct: 4.5, total_valor: 10.13,
  representatives: [
    { id: 1, representative_code: 6, representative_name: 'Representante Regional Sul', role: 'PRINCIPAL', role_label: 'Representante principal', commission_pct: 3, commission_base: 'TOTAL_PRODUTOS', commission_base_label: 'Total dos produtos', commission_value: 6.75 },
    { id: 2, representative_code: 7, representative_name: 'Parceiro Indicador', role: 'PARCEIRO', role_label: 'Parceiro', commission_pct: 1.5, commission_base: 'TOTAL_LIQUIDO', commission_base_label: 'Total líquido do documento', commission_value: 3.38, notes: 'indicou o cliente' },
  ],
};

const TRANSPORTADORA = {
  id: 1, supplier_code: 900, supplier_name: 'Transportes Boa Entrega', supplier_document: '11222333000181',
  antt_rntrc: '12345678', antt_expiry: '2027-12-31', shipper_type: 'ETC', shipper_type_label: 'ETC — Empresa de Transporte de Carga',
  modal: 'RODOVIARIO', modal_label: 'Rodoviário', issues_cte: true, default_freight_type: 'CIF',
  freight_min_value: 80, freight_kg_rate: 0.9, freight_pct_value: 0.5, gris_pct: 0.2, toll_per_100kg: 6,
  insurance_company: 'Seguradora Alfa', insurance_policy: 'AP-1', insurance_expiry: '2027-06-30',
  insurance_coverage: 100000, average_lead_days: 5, is_active: true,
  alerts: ['nenhum veículo ativo cadastrado'],
  vehicles: [{ id: 1, plate: 'ABC1D23', vehicle_type: 'TRUCK', capacity_kg: 5000, capacity_m3: 30, driver_name: 'João', axles: 3, is_active: false }],
  service_areas: [
    { id: 1, state: 'SP', lead_days: 3, min_value: 70, kg_rate: 0.8, pct_value: 0, is_active: true },
    { id: 2, state: 'RJ', lead_days: 5, min_value: 0, kg_rate: 0, pct_value: 0, is_active: true },
  ],
  performance: { occurrences: 2, average_delay_days: 1.5, total_cost_impact: 320, last_occurrence_date: '2026-09-10', since: '2025-09-25' },
};

const COTACAO = {
  destination: 'SP', weight_kg: 150, cargo_value: 10000, cheapest_carrier_id: 1, fastest_carrier_id: 1,
  quotes: [{
    carrier_id: 1, supplier_code: 900, supplier_name: 'Transportes Boa Entrega', modal: 'RODOVIARIO',
    modal_label: 'Rodoviário', service_area_id: 1, service_area: 'SP', weight_value: 120,
    ad_valorem_value: 50, gris_value: 20, toll_value: 12, minimum_applied: false, total: 202,
    lead_days: 3, estimated_delivery: '2026-09-28', alerts: ['nenhum veículo ativo cadastrado'],
  }],
  not_served_by: [],
};

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
page.setDefaultTimeout(12000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

await page.addInitScript(() => localStorage.setItem('erp-auth-storage', JSON.stringify({
  state: { token: 'isolated-ui-test', userName: 'Teste', user: { name: 'Teste', role: 'ADMIN' }, expiresAt: null }, version: 0,
})));

await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  const p = url.pathname;
  if (!p.startsWith('/api/') && !p.startsWith('/users/')) return route.continue();
  const metodo = route.request().method();
  let body = [];
  if (p === '/api/customers/support/payment-conditions') body = CONDICOES;
  else if (p === '/api/customers/support/payment-conditions/1/installments') body = PARCELAS;
  else if (p === '/api/customers/support/payment-conditions/installments' && metodo === 'POST') {
    const enviado = JSON.parse(route.request().postData() ?? '{}');
    // O backend devolve `warning` quando a condição ainda não fecha 100% — e a
    // parcela FOI gravada. A tela precisa tratar isso como aviso, não erro.
    PARCELAS = [...PARCELAS, { id: 4, installment_number: enviado.installment_number, due_days: enviado.due_days, percentage: enviado.percentage, base_event: enviado.base_event }];
    body = { ...PARCELAS[PARCELAS.length - 1] };
  } else if (p.startsWith('/api/customers/support/payment-conditions/1/installments/') && metodo === 'DELETE') {
    PARCELAS = PARCELAS.filter((x) => String(x.id) !== p.split('/').pop());
    body = { deleted: 1 };
  } else if (p === '/api/customers/support/payment-conditions/1/simulate') body = PLANO_SIMULADO;
  else if (p === '/api/sales-quotation/list') body = [ORCAMENTO];
  else if (p === '/api/sales-quotation/2') body = ORCAMENTO;
  else if (p === '/api/sales-quotation/2/payment-schedule') body = PLANO_ORCAMENTO;
  else if (p === '/api/sales-quotation/2/representatives') body = RATEIO;
  else if (p === '/api/sales-quotation/2/events' || p === '/api/sales-quotation/2/attachments') body = [];
  else if (p === '/api/sales-quotation/parameters') body = { enterprise_code: 1, purchase_order_prompt: 'Ordem de Compra', delivery_authorization_prompt: 'Autorização de Entr.' };
  else if (p === '/api/sales-quotation/cancellation-reasons') body = [];
  else if (p === '/api/shipping-carriers') body = [TRANSPORTADORA];
  else if (p === '/api/shipping-carriers/1') body = TRANSPORTADORA;
  else if (p === '/api/shipping-carriers/1/occurrences') body = [];
  else if (p === '/api/shipping-carriers/quote') body = COTACAO;
  else if (p === '/api/customers' || p === '/api/customers/') body = [{ code: 9001, name: 'Metalurgica Tecnofer LTDA' }];
  else if (p === '/api/items' || p === '/api/items/') body = [{ code: '950300', name: 'Chapa de aço 3 mm', health: 'ATIVO' }];
  else if (p === '/api/representatives/list') body = [{ code: 6, name: 'Representante Regional Sul', is_active: true }, { code: 7, name: 'Parceiro Indicador', is_active: true }];
  else if (p === '/api/suppliers' || p === '/api/suppliers/') body = [{ code: 900, name: 'Transportes Boa Entrega', is_active: true }];
  else if (p === '/users/me') body = { id: 'test', name: 'Teste', role: 'ADMIN' };
  else if (p === '/api/version') body = { version: '1.2.0', min_client: '1.0.0' };
  else if (p.startsWith('/api/enterprise')) body = [{ id: 1, code: 1, nome_fantasia: 'VENTURE' }];
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});

const texto = async (sel) => (await page.locator(sel).first().textContent() ?? '').replace(/\s+/g, ' ').trim();

try {
  // ── 1. VCLI0520 — condição de pagamento composta ─────────────────────────
  await page.goto(`${APP}/#/screen/VCLI0520`);
  await page.locator('.erp-crumb-code', { hasText: 'VCLI0520' }).waitFor();
  await page.locator('.erp-fieldset').first().waitFor();
  // O código da condição é o primeiro campo do bloco de parcelas.
  await page.locator('.erp-field', { hasText: 'Condição (cód.)' }).locator('input').fill('1');
  // A primeira grade da tela é o CRUD da condição; a das parcelas é a que tem a
  // coluna "Prazo conta de".
  const gradeParcelas = page.locator('table.erp-grid').filter({ hasText: 'Prazo conta de' });
  await gradeParcelas.waitFor();

  const grade = (await gradeParcelas.textContent() ?? '').replace(/\s+/g, ' ').trim();
  assert.match(grade, /30%/, `a grade não mostrou o percentual da parcela: ${grade}`);
  assert.match(grade, /Entrada \(no ato\)/, `a grade não mostrou o evento base: ${grade}`);
  assert.match(grade, /Entrega/, 'a parcela presa à entrega não apareceu');
  assert.match(grade, /75%/, `o total dos percentuais não apareceu: ${grade}`);
  assert.match(grade, /não fecham 100%/, 'a tela não avisou que a condição está incompleta');

  // Entrada é pagamento no ato: escolher ENTRADA precisa travar o prazo em dias.
  const seletorEvento = page.locator('select').filter({ hasText: 'Emissão do documento' }).first();
  await seletorEvento.selectOption('ENTRADA');
  const dias = page.locator('.erp-field', { hasText: 'Dias venc.' }).locator('input');
  assert.equal(await dias.inputValue(), '0', 'entrada deveria zerar o prazo em dias');
  assert.ok(await dias.isDisabled(), 'entrada deveria travar o campo de dias');

  // Gravar a 4ª parcela fecha 100%: a mensagem passa a ser de sucesso.
  await seletorEvento.selectOption('EMISSAO');
  await page.locator('.erp-field', { hasText: '% do total' }).locator('input').fill('25');
  await dias.fill('56');
  await page.getByRole('button', { name: 'Gravar parcela' }).click();
  await page.locator('.erp-feedback').first().waitFor();
  const aviso = await texto('.erp-feedback');
  assert.match(aviso, /Parcela 4 gravada|gravada/, `feedback inesperado ao gravar: ${aviso}`);

  // Simular mostra a condição em dinheiro, sem gravar nada.
  await page.getByRole('button', { name: 'Simular' }).click();
  const gradePlano = page.locator('table.erp-grid').filter({ hasText: 'Como foi contado' });
  await gradePlano.waitFor();
  const simulacao = (await gradePlano.textContent() ?? '').replace(/\s+/g, ' ').trim();
  assert.match(simulacao, /R\$\s?3\.000,00/, `a simulação não mostrou a entrada de 30%: ${simulacao}`);
  assert.match(simulacao, /20\/10\/2026/, 'a parcela da entrega não usou a data de entrega');

  // Excluir parcela precisa explicar a consequência antes.
  await page.getByRole('button', { name: 'Excluir' }).first().click();
  await page.locator('[role="alertdialog"]').waitFor();
  const dialogo = await texto('[role="alertdialog"]');
  assert.match(dialogo, /deixam de fechar 100%/, `o diálogo não explicou a consequência: ${dialogo}`);
  await page.getByRole('button', { name: 'Cancelar' }).click();

  // ── 2. VVND0300 — produto, IPI e produto + IPI ───────────────────────────
  await page.goto(`${APP}/#/screen/VVND0300`);
  await page.locator('.erp-crumb-code', { hasText: 'VVND0300' }).waitFor();
  await page.locator('.erp-list-row').first().click();
  await page.locator('.erp-fieldset-head', { hasText: 'Orçamento #2' }).waitFor();

  // Os totais moram em <input readonly>: o valor está em `value`, não no texto.
  const valorDoCampo = async (rotulo) =>
    page.locator('.erp-field', { hasText: rotulo }).first().locator('input').inputValue();
  assert.equal(await valorDoCampo('Produtos (líquido)'), '225,00', 'a capa não mostrou o valor dos produtos');
  assert.equal(await valorDoCampo('IPI'), '11,25', 'a capa não mostrou o IPI separado');
  assert.equal(await valorDoCampo('Produto + IPI'), '236,25', 'a capa não mostrou produto + IPI');
  assert.equal(await valorDoCampo('ST (por fora)'), '4,50', 'a capa não mostrou o ST separado');
  assert.equal(await valorDoCampo('Total bruto (antes do desconto)'), '250,00', 'o bruto antes do desconto mudou');

  // A coluna em destaque da grade acompanha a leitura escolhida.
  await page.locator('.erp-tab', { hasText: 'Itens' }).click();
  await page.locator('table.erp-grid').waitFor();
  const cabecalhoProduto = await texto('table.erp-grid thead');
  assert.match(cabecalhoProduto, /IPI R\$/, 'a grade de itens não ganhou a coluna de IPI em reais');
  assert.match(cabecalhoProduto, /ST R\$/, 'a grade de itens não ganhou a coluna de ST em reais');

  await page.locator('.erp-tab', { hasText: 'Dados gerais' }).click();
  await page.locator('.erp-chip', { hasText: 'Produto + IPI' }).click();
  await page.locator('.erp-tab', { hasText: 'Itens' }).click();
  const rodapeComIPI = await texto('table.erp-grid tfoot');
  assert.match(rodapeComIPI, /236,25/, `o total da leitura "produto + IPI" não apareceu: ${rodapeComIPI}`);

  await page.locator('.erp-tab', { hasText: 'Dados gerais' }).click();
  await page.locator('.erp-chip', { hasText: 'IPI' }).first().click();
  await page.locator('.erp-tab', { hasText: 'Itens' }).click();
  const rodapeIPI = await texto('table.erp-grid tfoot');
  assert.match(rodapeIPI, /11,25/, `o total da leitura "IPI" não apareceu: ${rodapeIPI}`);

  // Plano de pagamento do orçamento.
  await page.locator('.erp-tab', { hasText: 'Pagamento' }).click();
  await page.locator('.erp-fieldset-head', { hasText: 'Plano de pagamento' }).waitFor();
  const plano = await texto('table.erp-grid');
  assert.match(plano, /entrada/, `o plano não descreveu a entrada: ${plano}`);
  assert.match(plano, /67,50/, 'o plano não calculou 30% de 225');
  assert.match(plano, /20\/10\/2026/, 'a parcela da entrega não usou a data de entrega do orçamento');

  // Rateio de comissão com dois representantes.
  await page.locator('.erp-tab', { hasText: 'Comissão' }).click();
  await page.locator('.erp-fieldset-head', { hasText: 'Rateio de comissão' }).waitFor();
  const comissao = await texto('.erp-fieldset:has-text("Rateio de comissão")');
  assert.match(comissao, /Representante Regional Sul|Repr\./, `o principal não apareceu no rateio: ${comissao}`);
  assert.match(comissao, /6,75/, 'o valor da comissão do principal não apareceu');
  assert.match(comissao, /3,38/, 'o valor da comissão do parceiro não apareceu');
  assert.match(comissao, /Total dos produtos/, 'a base de cálculo não apareceu');

  // ── 3. VSUP0140 — cadastro de transportadora ─────────────────────────────
  await page.goto(`${APP}/#/screen/VSUP0140`);
  // Espera a tela trocar de verdade: o hash muda sem recarregar a página, então
  // sem isto os seletores ainda encontram a tela anterior.
  await page.locator('.erp-crumb-code', { hasText: 'VSUP0140' }).waitFor();
  await page.locator('.erp-list-row').first().waitFor();
  const linha = await texto('.erp-list-row');
  assert.match(linha, /Transportes Boa Entrega/, `a lista não mostrou a transportadora: ${linha}`);
  assert.match(linha, /RNTRC 12345678/, 'a lista não mostrou o RNTRC');
  assert.match(linha, /pendência/, 'a lista não sinalizou a pendência');

  // A cotação aparece antes de escolher transportadora: é a pergunta da expedição.
  await page.fill('.erp-field:has-text("UF") input', 'SP');
  await page.getByRole('button', { name: 'Cotar frete' }).click();
  await page.locator('table.erp-grid').first().waitFor();
  const cotacao = await texto('table.erp-grid');
  assert.match(cotacao, /mais barata/, `a cotação não marcou a mais barata: ${cotacao}`);
  assert.match(cotacao, /202,00/, 'o total da cotação não apareceu');
  assert.match(cotacao, /120,00/, 'o componente de peso não apareceu');
  assert.match(cotacao, /3d/, 'o prazo da região não apareceu');

  await page.locator('.erp-list-row').first().click();
  await page.locator('.erp-fieldset-head', { hasText: 'Identificação e habilitação' }).waitFor();
  const pendencia = await texto('.erp-note');
  assert.match(pendencia, /nenhum veículo ativo/, `a pendência não foi explicada: ${pendencia}`);

  // Frota e regiões são grades EDITÁVEIS: o valor está no input, não no texto.
  await page.locator('.erp-tab', { hasText: 'Frota' }).click();
  await page.locator('table.erp-grid tbody tr').first().waitFor();
  const placa = await page.locator('table.erp-grid tbody tr').first().locator('input').first().inputValue();
  assert.equal(placa, 'ABC1D23', `a frota não apareceu: placa lida "${placa}"`);
  const ativo = page.locator('table.erp-grid tbody tr').first().locator('input[type="checkbox"]');
  assert.equal(await ativo.isChecked(), false, 'o veículo inativo apareceu como ativo — é a origem da pendência');

  await page.locator('.erp-tab', { hasText: 'Regiões' }).click();
  await page.locator('table.erp-grid tbody tr').first().waitFor();
  const uf = await page.locator('table.erp-grid tbody tr').first().locator('input').first().inputValue();
  assert.equal(uf, 'SP', `a região não apareceu: UF lida "${uf}"`);
  const prazoRegiao = await page.locator('table.erp-grid tbody tr').first().locator('input').nth(4).inputValue();
  assert.equal(prazoRegiao, '3', `o prazo da região não apareceu: "${prazoRegiao}"`);

  const semRuido = errors.filter((e) => !/favicon|ResizeObserver|Failed to load resource/i.test(e));
  assert.deepEqual(semRuido, [], `erros de console na simulação: ${semRuido.join(' | ')}`);
  console.log('SIMULAÇÃO OK — VCLI0520, VVND0300 e VSUP0140 conferidos na tela.');
} catch (e) {
  console.error('FALHOU:', e.message);
  if (errors.length) console.error('console:', errors.slice(0, 5).join(' | '));
  await page.screenshot({ path: '/tmp/venture-ui-sim/comercial-round3.png' }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
