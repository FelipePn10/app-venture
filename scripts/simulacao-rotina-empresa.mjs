#!/usr/bin/env node
/**
 * Simulação da ROTINA COMPLETA da empresa, de ponta a ponta, contra uma API real.
 *
 * Não é teste de unidade nem de contrato: é a empresa usando o sistema por um
 * ciclo inteiro — vender, planejar, comprar/receber, produzir, apontar, faturar,
 * receber e fechar — com os DADOS DE PRODUÇÃO restaurados num ambiente separado.
 * O que se procura aqui é o que nenhum teste isolado pega: uma etapa que não
 * conversa com a próxima.
 *
 * Uso (nunca contra produção):
 *   API=http://localhost:5081 EMAIL=... SENHA=... node scripts/simulacao-rotina-empresa.mjs
 *
 * Saída: um relatório por etapa (ok / falhou / pulada) e, no fim, a lista do que
 * impede a empresa de rodar. Código de saída 1 quando alguma etapa essencial falha.
 */
const API = (process.env.API ?? 'http://localhost:5081').replace(/\/$/, '');
const EMAIL = process.env.EMAIL ?? 'comercial@tecnofer.com.br';
const SENHA = process.env.SENHA ?? 'Sandbox@2026';

if (/:5070|:5072|:5073|venturerp\.com|dev-api/.test(API)) {
  console.error('Recusando rodar: este roteiro escreve dados e só deve rodar no sandbox.');
  process.exit(2);
}

const etapas = [];
let token = '';

const hoje = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const maisDias = (n) => iso(new Date(hoje.getTime() + n * 86400000));

let sequenciaIdempotencia = 0;

async function chamar(metodo, rota, corpo, opcoes = {}) {
  const r = await fetch(API + rota, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Apontamento e outras gravações repetíveis exigem Idempotency-Key: é o
      // que impede o duplo clique do chão de fábrica virar dois apontamentos.
      ...(opcoes.idempotente ? { 'Idempotency-Key': `sim-${Date.now()}-${++sequenciaIdempotencia}` } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  return { status: r.status, ok: r.ok, dados };
}

/**
 * Executa uma etapa da rotina. `essencial` marca o que, falhando, impede a
 * empresa de operar — é o que decide o código de saída.
 */
async function etapa(nome, fn, { essencial = true } = {}) {
  try {
    const resultado = await fn();
    if (resultado && resultado.pulada) {
      etapas.push({ nome, situacao: 'pulada', detalhe: resultado.pulada });
      console.log(`○ ${nome} — pulada: ${resultado.pulada}`);
      return null;
    }
    etapas.push({ nome, situacao: 'ok', detalhe: resultado?.detalhe ?? '' });
    console.log(`✓ ${nome}${resultado?.detalhe ? ` — ${resultado.detalhe}` : ''}`);
    return resultado?.valor ?? resultado ?? true;
  } catch (e) {
    etapas.push({ nome, situacao: 'falhou', essencial, detalhe: e.message });
    console.log(`✗ ${nome} — ${e.message}`);
    return null;
  }
}

const exigir = (r, oque) => {
  if (!r.ok) {
    const msg = typeof r.dados === 'object' && r.dados ? (r.dados.error ?? r.dados.message ?? JSON.stringify(r.dados).slice(0, 220)) : String(r.dados).slice(0, 220);
    throw new Error(`${oque}: HTTP ${r.status} — ${msg}`);
  }
  return r.dados;
};

const contexto = {};

// ─── 0. Entrar no sistema ───────────────────────────────────────────────────
await etapa('Login do usuário da empresa', async () => {
  const r = await chamar('POST', '/users/login', { email: EMAIL, password: SENHA, remember_me: true });
  const d = exigir(r, 'login');
  token = d.token;
  return { detalhe: `${d.name} (${d.role}), sessão até ${d.expires_at?.slice(0, 10)}` };
});

// ─── 1. O que a empresa já cadastrou ────────────────────────────────────────
await etapa('Ler os cadastros da empresa (itens, clientes, máquinas, almoxarifados)', async () => {
  const itens = exigir(await chamar('GET', '/api/items/'), 'itens');
  const clientes = exigir(await chamar('GET', '/api/customers'), 'clientes');
  const maquinas = exigir(await chamar('GET', '/api/machine/list'), 'máquinas');
  const almox = exigir(await chamar('GET', '/api/warehouse/list'), 'almoxarifados');
  const lista = Array.isArray(itens) ? itens : (itens.data ?? []);
  contexto.itens = lista;
  contexto.acabado = lista.find((i) => String(i.code ?? i.business_code).startsWith('RN-01001') && !String(i.code ?? '').includes('PRIME'))
    ?? lista.find((i) => String(i.code ?? '').startsWith('RN-'));
  contexto.cliente = (Array.isArray(clientes) ? clientes : clientes.data ?? [])[0];
  return {
    detalhe: `${lista.length} itens · ${(Array.isArray(clientes) ? clientes : clientes.data ?? []).length} clientes · ` +
      `${(Array.isArray(maquinas) ? maquinas : maquinas.data ?? []).length} máquinas · ` +
      `${(Array.isArray(almox) ? almox : almox.data ?? []).length} almoxarifados`,
  };
});

if (!contexto.acabado) {
  console.error('Sem item acabado no banco: a rotina não pode ser simulada.');
  process.exit(1);
}
const ACABADO = String(contexto.acabado.code ?? contexto.acabado.business_code);

// ─── 1b. Preparar no SANDBOX o que falta no cadastro de produção ────────────
// Estas etapas não corrigem produção: elas completam o sandbox para a rotina
// poder ser simulada inteira. O que falta aqui é o relatório de cadastro que a
// empresa precisa fazer antes de operar.
const PREPARAR = process.env.PREPARAR !== 'nao';

await etapa('Preparar cadastro que falta: condição de pagamento comercial', async () => {
  if (!PREPARAR) return { pulada: 'PREPARAR=nao' };
  const atuais = exigir(await chamar('GET', '/api/customers/support/payment-conditions'), 'condições');
  const arr = Array.isArray(atuais) ? atuais : atuais?.data ?? [];
  if (arr.length) return { detalhe: `já existem ${arr.length}` };
  const d = exigir(await chamar('POST', '/api/customers/support/payment-conditions', {
    description: '28/56/84 dias (simulação)', analysis_type: 'SEMPRE_ANALISA', parcel_start: 'EMISSAO', average_term: 56,
  }), 'criar condição');
  for (const [n, dias] of [[1, 28], [2, 56], [3, 84]]) {
    exigir(await chamar('POST', '/api/customers/support/payment-conditions/installments', {
      payment_condition_code: d.code, installment_number: n, due_days: dias,
      percentage: n === 3 ? 34 : 33, base_event: 'EMISSAO',
    }), `parcela ${n}`);
  }
  return { detalhe: `condição ${d.code} criada com 3 parcelas` };
}, { essencial: false });

await etapa('Preparar cadastro que falta: representante', async () => {
  if (!PREPARAR) return { pulada: 'PREPARAR=nao' };
  const atuais = exigir(await chamar('GET', '/api/representatives/list'), 'representantes');
  const arr = Array.isArray(atuais) ? atuais : atuais?.data ?? [];
  if (arr.length) return { detalhe: `já existem ${arr.length}` };
  const d = exigir(await chamar('POST', '/api/representatives/create', {
    name: 'Representante da simulação', document_number: '11222333000181', document_type: 'CNPJ', is_active: true,
  }), 'criar representante');
  return { detalhe: `representante ${d.code}` };
}, { essencial: false });

await etapa('Preparar cadastro que falta: preço de venda do produto', async () => {
  if (!PREPARAR) return { pulada: 'PREPARAR=nao' };
  const tabelas = exigir(await chamar('GET', '/api/customers/support/sales-tables'), 'tabelas');
  const arr = Array.isArray(tabelas) ? tabelas : tabelas?.data ?? [];
  const tabela = arr[0];
  if (!tabela) return { pulada: 'sem tabela de venda cadastrada' };
  // Vigência vencida impede o orçamento: a tabela da empresa está sem vigência.
  await chamar('PUT', `/api/customers/support/sales-tables/${tabela.code}`, {
    code: tabela.code, description: tabela.description, price_formation: 'INFORMADO',
    validity_start: `${hoje.getFullYear()}-01-01T00:00:00Z`,
    validity_end: `${hoje.getFullYear() + 1}-12-31T00:00:00Z`,
    decimal_places: 2, is_active: true,
  });
  const r = await chamar('POST', `/api/customers/support/sales-tables/${tabela.code}/prices/`, {
    sales_table_code: tabela.code, item_code: ACABADO, price: 1850, price_conv: 1850,
    situation: 'ATIVO', blocked: false,
  });
  if (!r.ok && !JSON.stringify(r.dados).includes('duplicate key')) exigir(r, 'preço de venda');
  return { detalhe: `${ACABADO} a R$ 1.850,00 na tabela ${tabela.code}` };
}, { essencial: false });

await etapa('Preparar cadastro que falta: conta bancária (sem ela não há baixa)', async () => {
  if (!PREPARAR) return { pulada: 'PREPARAR=nao' };
  const atuais = exigir(await chamar('GET', '/api/financial/contas-bancarias/list'), 'contas bancárias');
  const arr = Array.isArray(atuais) ? atuais : atuais?.data ?? [];
  if (arr.length) { contexto.contaBancaria = arr[0].ID ?? arr[0].id; return { detalhe: `já existem ${arr.length}` }; }
  const d = exigir(await chamar('POST', '/api/financial/contas-bancarias/create', {
    banco: '001', agencia: '0001', conta: '123456', descricao: 'Conta da simulação', saldo_inicial: 0,
  }), 'criar conta bancária');
  contexto.contaBancaria = d.ID ?? d.id;
  return { detalhe: `conta bancária ${contexto.contaBancaria} criada` };
}, { essencial: false });

await etapa('Preparar cadastro que falta: roteiro com tempo para os itens fabricados', async () => {
  if (!PREPARAR) return { pulada: 'PREPARAR=nao' };
  const fabricados = contexto.itens.filter((i) => /^(RN|TP|BU)-/.test(String(i.code)));
  let criados = 0, comEtapa = 0, jaTinham = 0;
  for (const item of fabricados) {
    const existentes = await chamar('GET', `/api/routing/routes?item_code=${encodeURIComponent(String(item.code))}`);
    const lista = Array.isArray(existentes.dados) ? existentes.dados : existentes.dados?.data ?? [];
    let rotaID = lista[0]?.id;
    if (rotaID) { jaTinham += 1; } else {
      const rota = await chamar('POST', '/api/routing/routes', {
        item_code: String(item.code), description: `Roteiro ${item.code} (simulação)`,
        alternative: 1, is_standard: true,
      });
      if (!rota.ok) continue;
      rotaID = rota.dados?.id;
      criados += 1;
    }
    // Uma etapa com TEMPO: sem tempo unitário o CRP não tem carga e a ordem
    // planejada não pode ser firmada.
    const ops = await chamar('GET', `/api/routing/${rotaID}`);
    const temEtapa = (ops.dados?.operations ?? ops.dados?.route_operations ?? []).length > 0;
    if (!temEtapa) {
      const nova = await chamar('POST', `/api/routing/route-operations/${rotaID}`, {
        route_id: rotaID, sequence: 10, operation_id: 3, work_center_id: 3,
        setup_time: 5, run_time: 1, run_base_qty: 1, time_unit: 'MIN',
      });
      if (nova.ok) comEtapa += 1;
    }
  }
  return { detalhe: `${criados} roteiro(s) criado(s), ${comEtapa} etapa(s) com tempo, ${jaTinham} já existiam` };
}, { essencial: false });

// ─── 2. Comercial: orçamento → pedido ───────────────────────────────────────
await etapa('Conferir se o comercial tem preço, condição de pagamento e representante', async () => {
  const tabelas = exigir(await chamar('GET', '/api/customers/support/sales-tables'), 'tabelas de venda');
  const condicoes = exigir(await chamar('GET', '/api/customers/support/payment-conditions'), 'condições');
  const reps = exigir(await chamar('GET', '/api/representatives/list'), 'representantes');
  const arr = (x) => (Array.isArray(x) ? x : x?.data ?? []);
  contexto.tabelaVenda = arr(tabelas)[0];
  contexto.condicao = arr(condicoes)[0];
  contexto.representante = arr(reps)[0];
  const faltas = [];
  if (!contexto.tabelaVenda) faltas.push('nenhuma tabela de venda');
  if (!contexto.condicao) faltas.push('nenhuma condição de pagamento comercial (payment_conditions)');
  if (!contexto.representante) faltas.push('nenhum representante');
  if (faltas.length) throw new Error(`faltando para vender: ${faltas.join('; ')}`);
  return { detalhe: `tabela ${contexto.tabelaVenda.code} · condição ${contexto.condicao.code} · representante ${contexto.representante.code}` };
}, { essencial: true });

await etapa('Conferir se o item acabado tem preço na tabela de venda', async () => {
  if (!contexto.tabelaVenda) return { pulada: 'sem tabela de venda' };
  const precos = await chamar('GET', `/api/customers/support/sales-tables/${contexto.tabelaVenda.code}/prices/`);
  const arr = Array.isArray(precos.dados) ? precos.dados : precos.dados?.data ?? [];
  // A tabela de preço guarda a CHAVE INTERNA do item; o cadastro de item expõe
  // o código comercial. Conferir só pelo comercial dava falso negativo.
  const doItem = arr.find((p) => String(p.item_code) === ACABADO)
    ?? arr.find((p) => String(p.item_code) === String(contexto.chaveInternaDoAcabado ?? ''));
  if (!doItem) {
    if (arr.length) return { detalhe: `a tabela ${contexto.tabelaVenda.code} tem ${arr.length} preço(s); o do ${ACABADO} será conferido ao incluir o item` };
    throw new Error(`a tabela ${contexto.tabelaVenda.code} não tem preço nenhum — o orçamento recusa incluir item`);
  }
  contexto.precoVenda = Number(doItem.price);
  return { detalhe: `${ACABADO} a R$ ${contexto.precoVenda}` };
});

await etapa('Criar orçamento de venda', async () => {
  if (!contexto.cliente) return { pulada: 'sem cliente' };
  const corpo = {
    enterprise_code: 1, status: 'OV', quotation_type: 'VENDA',
    emission_date: iso(hoje), digit_date: iso(hoje), delivery_date: maisDias(30),
    customer_code: contexto.cliente.code,
    sales_division_code: 1,
    price_table_code: contexto.tabelaVenda?.code,
    payment_term_code: contexto.condicao?.code,
    representative_code: contexto.representante?.code,
    currency_code: 'BRL', probability_pct: '80', commission_pct: '3',
    release_status: 'RELEASED',
  };
  const d = exigir(await chamar('POST', '/api/sales-quotation/create', corpo), 'criar orçamento');
  contexto.orcamento = d.code;
  return { detalhe: `orçamento ${d.quotation_number ?? d.code}` };
});

await etapa('Incluir o produto no orçamento', async () => {
  if (!contexto.orcamento) return { pulada: 'sem orçamento' };
  const d = exigir(await chamar('POST', '/api/sales-quotation/items/create', {
    sales_quotation_code: contexto.orcamento, sequence: 1, item_code: ACABADO,
    requested_qty: '20', unit_price: String(contexto.precoVenda ?? 100),
    discount_pct: '0', ipi_pct: '5', st_pct: '0',
  }), 'item do orçamento');
  contexto.chaveInternaDoAcabado = d.legacy_item_code;
  return { detalhe: `produto ${d.total_net} · IPI ${d.total_ipi} · com IPI ${d.total_net_with_ipi} (item interno ${d.legacy_item_code})` };
});

await etapa('Ver o plano de pagamento do orçamento', async () => {
  if (!contexto.orcamento) return { pulada: 'sem orçamento' };
  const d = exigir(await chamar('GET', `/api/sales-quotation/${contexto.orcamento}/payment-schedule`), 'plano de pagamento');
  return { detalhe: `${d.parcelas.length} parcela(s) — ${d.parcelas.map((p) => `${p.percentual}% em ${p.vencimento}`).join(', ')}` };
});

await etapa('Converter o orçamento em pedido de venda', async () => {
  if (!contexto.orcamento) return { pulada: 'sem orçamento' };
  const d = exigir(await chamar('POST', `/api/sales-quotation/${contexto.orcamento}/convert-to-order`, {}), 'conversão');
  contexto.pedido = d.code;
  return { detalhe: `pedido ${d.order_number ?? d.code}` };
});

await etapa('Conferir o rateio de comissão do pedido', async () => {
  if (!contexto.pedido) return { pulada: 'sem pedido' };
  const d = exigir(await chamar('GET', `/api/sales-order/${contexto.pedido}/representatives`), 'rateio');
  return { detalhe: `${d.representatives.length} representante(s), R$ ${d.total_valor} de comissão` };
});

// ─── 3. PCP: demanda → MRP → ordem planejada → OF ───────────────────────────
await etapa('Lançar demanda independente do produto', async () => {
  const codigo = Math.floor(Date.now() / 1000) % 1000000;
  // O item vai pelo CÓDIGO DE NEGÓCIO, como a tela manda — o `id` da resposta
  // do cadastro de item é outra chave e aponta para o item errado.
  const r = await chamar('POST', '/api/independent-demand/create', {
    code_demand: codigo, item_code: ACABADO, quantity: 20, demand_date: maisDias(30),
  });
  if (!r.ok) throw new Error(`demanda independente: HTTP ${r.status} — ${JSON.stringify(r.dados).slice(0, 200)}`);
  contexto.demanda = codigo;
  return { detalhe: `demanda ${codigo} para ${maisDias(30)}` };
}, { essencial: false });

await etapa('Criar plano de produção e rodar o MRP', async () => {
  const codigo = (Math.floor(Date.now() / 1000) % 100000) + 1;
  const criar = await chamar('POST', '/api/production-plan/create', {
    code: codigo, name: `Simulação ${iso(hoje)}`, independent_demands: 'ALL',
    group_same_date_orders: true, planning_types: [], parameters: {},
  });
  exigir(criar, 'criar plano');
  contexto.plano = codigo;
  const rodar = await chamar('POST', '/api/mrp-calculation/run', {
    plan_code: codigo, initial_order_number: 90000 + (Math.floor(Date.now() / 1000) % 9000), generate_llc: true,
  });
  const d = exigir(rodar, 'rodar MRP');
  contexto.mrp = d;
  const sug = Array.isArray(d?.suggestions) ? d.suggestions.length : (d?.suggestions_count ?? '?');
  return { detalhe: `plano ${codigo} rodou — ${sug} sugestão(ões)` };
});

await etapa('Ler as sugestões do MRP', async () => {
  if (!contexto.plano) return { pulada: 'sem plano' };
  const d = exigir(await chamar('GET', `/api/mrp-calculation/suggestions/${contexto.plano}`), 'sugestões');
  const arr = Array.isArray(d) ? d : d?.data ?? [];
  contexto.sugestoes = arr;
  if (arr.length === 0) throw new Error('o MRP não sugeriu nada: sem sugestão não há o que firmar');
  return { detalhe: `${arr.length} sugestão(ões); primeira: item ${arr[0].item_code} qtd ${arr[0].suggested_qty ?? arr[0].quantity}` };
});

await etapa('Firmar uma sugestão de fabricação (vira ordem planejada)', async () => {
  const fabricacao = contexto.sugestoes?.filter((x) => /FABRIC|PRODUCTION/i.test(String(x.order_type))) ?? [];
  const s = fabricacao[0] ?? contexto.sugestoes?.[0];
  if (!s) return { pulada: 'sem sugestão' };
  contexto.sugestaoFirmada = s;
  const r = await chamar('POST', `/api/mrp-calculation/suggestions/${s.code ?? s.id}/firm`, {});
  const d = exigir(r, 'firmar sugestão');
  contexto.ordemPlanejada = d?.code ?? d?.order_code ?? d?.id;
  if (!contexto.ordemPlanejada) {
    // A resposta não traz o código: pega a última ordem planejada da lista.
    const lista = exigir(await chamar('GET', '/api/planned-order/list'), 'ordens planejadas');
    const arr = Array.isArray(lista) ? lista : lista?.data ?? [];
    contexto.ordensPlanejadas = arr;
    contexto.ordemPlanejada = arr[arr.length - 1]?.code;
  }
  if (!contexto.ordemPlanejada) throw new Error('firmou mas não devolveu nem listou a ordem planejada');
  return { detalhe: `ordem planejada ${contexto.ordemPlanejada}` };
});

await etapa('Liberar a ordem planejada (gera a ordem de fabricação)', async () => {
  if (!contexto.ordemPlanejada) return { pulada: 'sem ordem planejada' };
  const lista = exigir(await chamar('GET', '/api/planned-order/list'), 'ordens planejadas');
  const arrOP = Array.isArray(lista) ? lista : lista?.data ?? [];
  const op = arrOP.find((o) => Number(o.code) === Number(contexto.ordemPlanejada));
  if (op && /RELEASED/i.test(String(op.status ?? ''))) {
    // Firmar já liberou: seguir em frente é o comportamento certo.
  } else {
    const r = await chamar('POST', '/api/planned-order/transition', {
      order_codes: [Number(contexto.ordemPlanejada)], target: 'RELEASED',
    });
    exigir(r, 'liberar ordem planejada');
  }
  const ofs = exigir(await chamar('GET', '/api/production-order/list'), 'lista de OF');
  const arr = Array.isArray(ofs) ? ofs : ofs?.data ?? [];
  // A OF da simulação é a MAIS NOVA do item firmado — a lista vem da mais
  // recente para a mais antiga, e pegar a última pegava uma OF já encerrada.
  const doItem = arr.filter((o) => String(o.item_code) === String(contexto.sugestaoFirmada?.item_code ?? ''));
  const candidatas = (doItem.length ? doItem : arr).slice().sort((a, b) => Number(b.id) - Number(a.id));
  contexto.of = candidatas.find((o) => String(o.status) === 'OPEN') ?? candidatas[0];
  return { detalhe: `${arr.length} OF na fábrica; OF da simulação ${contexto.of?.id} (item ${contexto.of?.item_code})` };
});

// ─── 4. CRP e APS ───────────────────────────────────────────────────────────
await etapa('Calcular a capacidade (CRP) do plano', async () => {
  if (!contexto.plano) return { pulada: 'sem plano' };
  const r = await chamar('POST', '/api/crp/calculate', { plan_code: contexto.plano });
  const d = exigir(r, 'CRP');
  const linhas = Number(d?.total_entries ?? 0);
  const semCarga = (d?.orders_without_load ?? []).length;
  if (!linhas) throw new Error(`o CRP não devolveu carga nenhuma (${semCarga} ordem(ns) sem carga) — confira roteiro, tempo da operação e centro de trabalho`);
  const detalhe = await chamar('GET', `/api/crp/${contexto.plano}`);
  const arr = Array.isArray(detalhe.dados) ? detalhe.dados : [];
  const horas = arr.reduce((t, c) => t + Number(c.required_hours ?? c.load_hours ?? 0), 0);
  return { detalhe: `${linhas} carga(s) centro/dia · ${horas.toFixed(2)} h · ${d.overload_count ?? 0} sobrecarga(s) · ${semCarga} ordem(ns) sem carga` };
}, { essencial: false });

await etapa('Sequenciar a fábrica (APS)', async () => {
  const r = await chamar('POST', '/api/aps/sequence', { start_from: new Date().toISOString(), direction: 'FORWARD' });
  if (!r.ok) throw new Error(`APS: HTTP ${r.status} — ${JSON.stringify(r.dados).slice(0, 160)}`);
  const d = r.dados;
  const operacoes = Number(d?.scheduled_operations ?? d?.events?.length ?? 0);
  const ordens = Number(d?.orders_processed ?? 0);
  if (!operacoes) throw new Error('o APS não sequenciou nada — sem OF aberta com etapa e centro de trabalho não há o que sequenciar');
  const recursos = await chamar('GET', '/api/aps/sequence/resources');
  const arrRec = Array.isArray(recursos.dados) ? recursos.dados : [];
  return { detalhe: `${ordens} ordem(ns) sequenciada(s), ${operacoes} operação(ões), ${arrRec.length} recurso(s)` };
}, { essencial: false });

// ─── 5. Estoque: entrada de matéria-prima ───────────────────────────────────
await etapa('Dar entrada de matéria-prima no estoque', async () => {
  const chapa = contexto.itens.find((i) => String(i.code) === '5')
    ?? contexto.itens.find((i) => /CHAPA/i.test(String(i.name ?? i.description)));
  if (!chapa) return { pulada: 'sem matéria-prima cadastrada' };
  const r = await chamar('POST', '/api/stock/movements/create', {
    item_code: String(chapa.code), mask: '', warehouse_id: 1,
    movement_type: 'ENTRADA', quantity: 500, unit_price: 24, total_price: 12000,
    notes: 'entrada da simulação de rotina',
  });
  const d = exigir(r, 'entrada de estoque');
  contexto.materiaPrima = chapa;
  return { detalhe: `movimento ${d.id ?? '—'} · 500 UN de ${chapa.code} no ALM-MP` };
});

await etapa('Consultar saldo e ATP do material', async () => {
  const chapa = contexto.materiaPrima;
  if (!chapa) return { pulada: 'sem material' };
  const saldo = exigir(await chamar('GET', `/api/stock/balances/item/${chapa.code}`), 'saldo');
  const arr = Array.isArray(saldo) ? saldo : saldo?.data ?? [];
  const atp = await chamar('GET', `/api/stock/balances/atp/${chapa.code}`);
  const disp = atp.ok ? (atp.dados?.total_available ?? atp.dados?.available_qty) : 'HTTP ' + atp.status;
  return { detalhe: `${arr.length} linha(s) de saldo · ATP ${disp}` };
});

// ─── 6. Chão de fábrica ─────────────────────────────────────────────────────
await etapa('Abrir a OF e explodir o roteiro', async () => {
  if (!contexto.of?.id) return { pulada: 'sem OF' };
  const det = exigir(await chamar('GET', `/api/production-order/${contexto.of.id}`), 'detalhe da OF');
  // A liberação já explode o roteiro; aqui se confere o resultado. Explodir de
  // novo é o caminho de exceção (roteiro trocado depois de abrir a ordem).
  let ops = await chamar('GET', `/api/production-order/${contexto.of.id}/operations`);
  let arr = Array.isArray(ops.dados) ? ops.dados : ops.dados?.data ?? [];
  if (arr.length === 0) {
    const explodir = await chamar('POST', '/api/production-order/operations/explode', { order_id: contexto.of.id });
    if (!explodir.ok) throw new Error(`explodir roteiro: HTTP ${explodir.status} — ${JSON.stringify(explodir.dados).slice(0, 200)}`);
    ops = await chamar('GET', `/api/production-order/${contexto.of.id}/operations`);
    arr = Array.isArray(ops.dados) ? ops.dados : ops.dados?.data ?? [];
  }
  if (arr.length === 0) throw new Error('a OF nasceu sem etapa: o item não tem roteiro com operação');
  contexto.etapas = arr;
  const horas = arr.reduce((t, o) => t + Number(o.planned_hours ?? 0), 0);
  return { detalhe: `OF ${det.id} do item ${det.item_code} com ${arr.length} etapa(s), ${horas.toFixed(2)} h planejadas` };
}, { essencial: false });

await etapa('Iniciar, apontar produção e consumir material na OF', async () => {
  if (!contexto.of?.id) return { pulada: 'sem OF' };
  const inicio = await chamar('POST', `/api/production-order/${contexto.of.id}/start`, { id: contexto.of.id, start_date: iso(hoje) });
  if (!inicio.ok) throw new Error(`iniciar OF: HTTP ${inicio.status} — ${JSON.stringify(inicio.dados).slice(0, 160)}`);
  // O apontamento exige operador (quem produziu) — é o que liga a hora à pessoa.
  const funcionarios = await chamar('GET', '/api/employee/list');
  const listaFunc = Array.isArray(funcionarios.dados) ? funcionarios.dados : funcionarios.dados?.data ?? [];
  const operador = listaFunc[0];
  const ap = await chamar('POST', '/api/production-order/appointment', {
    production_order_id: contexto.of.id, produced_qty: 5, scrapped_qty: 0, appointment_date: iso(hoje),
    employee_id: operador?.code ?? operador?.id, machine_id: 1,
  }, { idempotente: true });
  if (!ap.ok) throw new Error(`apontar produção: HTTP ${ap.status} — ${JSON.stringify(ap.dados).slice(0, 160)}`);
  // Consumo de insumo ligado ao apontamento: é assim que se sabe quanto de
  // material foi para cada lote produzido.
  const materiais = await chamar('GET', `/api/production-order/${contexto.of.id}/materials`);
  const listaMat = Array.isArray(materiais.dados) ? materiais.dados : materiais.dados?.data ?? [];
  let consumo = 'sem material na OF';
  if (listaMat.length) {
    const m = listaMat[0];
    const c = await chamar('POST', '/api/production-order/consumption', {
      production_order_id: contexto.of.id, item_code: String(m.item_code),
      consumed_qty: 1, warehouse_id: 1, consumption_date: iso(hoje),
    });
    consumo = c.ok ? `consumo de ${m.item_code} lançado` : `consumo recusado: HTTP ${c.status} ${JSON.stringify(c.dados).slice(0, 120)}`;
  }
  return { detalhe: `OF iniciada, 5 peças apontadas, ${listaMat.length} material(is) na ordem — ${consumo}` };
}, { essencial: false });

await etapa('Concluir a OF (entrada do acabado no estoque)', async () => {
  if (!contexto.of?.id) return { pulada: 'sem OF' };
  const r = await chamar('POST', `/api/production-order/${contexto.of.id}/complete`, {
    id: contexto.of.id, warehouse_id: 4, lot: `LOTE-SIM-${iso(hoje)}`,
  });
  if (!r.ok) throw new Error(`concluir OF: HTTP ${r.status} — ${JSON.stringify(r.dados).slice(0, 200)}`);
  const saldo = await chamar('GET', `/api/stock/balances/item/${ACABADO}`);
  const arr = Array.isArray(saldo.dados) ? saldo.dados : saldo.dados?.data ?? [];
  return { detalhe: `OF concluída; ${arr.length} linha(s) de saldo do acabado` };
}, { essencial: false });

// ─── 7. Fiscal e financeiro ─────────────────────────────────────────────────
await etapa('Emitir a nota fiscal de saída do pedido', async () => {
  if (!contexto.pedido) return { pulada: 'sem pedido' };
  const r = await chamar('POST', '/api/fiscal/exits/create', {
    sales_order_code: contexto.pedido, cfop: '5101', natureza_operacao: 'Venda de produção do estabelecimento',
    data_emissao: iso(hoje),
  });
  if (!r.ok) throw new Error(`nota de saída: HTTP ${r.status} — ${JSON.stringify(r.dados).slice(0, 220)}`);
  contexto.nota = r.dados?.code ?? r.dados?.id;
  return { detalhe: `nota ${contexto.nota}` };
}, { essencial: false });

await etapa('Autorizar a nota (gera título a receber e a comissão)', async () => {
  if (!contexto.nota) return { pulada: 'sem nota' };
  const r = await chamar('POST', `/api/fiscal/exits/${contexto.nota}/authorize`, {});
  if (!r.ok) {
    const msg = String(r.dados?.error ?? '');
    // No sandbox o token da Focus é removido de propósito: nenhuma chamada pode
    // sair para o provedor fiscal a partir de dados restaurados de produção.
    if (/token da Focus/i.test(msg)) return { pulada: 'provedor fiscal desligado no sandbox (proposital)' };
    throw new Error(`autorizar nota: HTTP ${r.status} — ${JSON.stringify(r.dados).slice(0, 200)}`);
  }
  return { detalhe: `nota ${contexto.nota} autorizada` };
}, { essencial: false });

await etapa('Gerar o título a receber do pedido (quando a NF-e não pode ser autorizada aqui)', async () => {
  if (!contexto.pedido) return { pulada: 'sem pedido' };
  const plano = await chamar('GET', `/api/sales-quotation/${contexto.orcamento}/payment-schedule`);
  const parcelas = plano.ok ? plano.dados.parcelas : [];
  let criados = 0;
  for (const p of parcelas) {
    const r = await chamar('POST', '/api/financial/contas-receber/create', {
      numero_documento: `PED-${contexto.pedido}/${p.numero}`,
      cliente_id: contexto.cliente?.code, sales_order_id: contexto.pedido,
      data_emissao: iso(hoje), data_vencimento: p.vencimento,
      valor_bruto: p.valor, desconto: 0,
      parcela_numero: p.numero, parcela_total: parcelas.length,
    });
    if (r.ok) criados += 1;
    else contexto.erroTitulo = `HTTP ${r.status} — ${JSON.stringify(r.dados).slice(0, 180)}`;
  }
  if (!criados) throw new Error(`nenhum título a receber foi criado a partir do plano de pagamento (${contexto.erroTitulo ?? 'sem parcelas'})`);
  contexto.titulos = criados;
  return { detalhe: `${criados} título(s) a receber criado(s) a partir do plano de pagamento` };
}, { essencial: false });

await etapa('Baixar o primeiro título (entrada no caixa)', async () => {
  const lista = exigir(await chamar('GET', '/api/financial/contas-receber/list'), 'contas a receber');
  const arr = Array.isArray(lista) ? lista : lista?.data ?? [];
  // ⚠️ Esta rota responde em PascalCase (o struct do financeiro não tem tag
  // json): as chaves são ID, ValorBruto, Status — não id/valor/status.
  const chave = (t, ...nomes) => nomes.map((n) => t[n]).find((v) => v !== undefined);
  const aberto = arr.find((t) => !/PAGO|RECEBIDO|CANCELAD/i.test(String(chave(t, 'Status', 'status') ?? ''))) ?? arr[0];
  if (!aberto) return { pulada: 'nenhum título em aberto' };
  const id = chave(aberto, 'ID', 'id');
  if (!contexto.contaBancaria) {
    const contas = await chamar('GET', '/api/financial/contas-bancarias/list');
    const lista = Array.isArray(contas.dados) ? contas.dados : contas.dados?.data ?? [];
    contexto.contaBancaria = lista[0]?.ID ?? lista[0]?.id;
  }
  if (!contexto.contaBancaria) throw new Error('não há conta bancária cadastrada: a baixa do título é impossível');
  const r = await chamar('POST', `/api/financial/contas-receber/${id}/baixar`, {
    conta_bancaria_id: Number(contexto.contaBancaria),
    valor_recebido: Number(chave(aberto, 'ValorBruto', 'valor_bruto')),
    data_recebimento: iso(hoje),
  });
  if (!r.ok) throw new Error(`baixa: HTTP ${r.status} — ${JSON.stringify(r.dados).slice(0, 200)}`);
  return { detalhe: `título ${id} baixado em conta bancária ${contexto.contaBancaria}` };
}, { essencial: false });

await etapa('Conferir contas a receber e fluxo de caixa', async () => {
  const cr = exigir(await chamar('GET', '/api/financial/contas-receber/list'), 'contas a receber');
  const arr = Array.isArray(cr) ? cr : cr?.data ?? [];
  const recebidos = arr.filter((t) => /PAGO|RECEBIDO/i.test(String(t.Status ?? t.status ?? ''))).length;
  const fluxo = await chamar('GET', `/api/financial/fluxo-caixa?from=${iso(hoje)}&to=${maisDias(90)}`);
  if (!fluxo.ok) throw new Error(`fluxo de caixa: HTTP ${fluxo.status}`);
  return { detalhe: `${arr.length} título(s) a receber (${recebidos} baixado[s]) · fluxo de caixa consultado` };
}, { essencial: false });

await etapa('Conferir a razão de comissões', async () => {
  const r = await chamar('GET', '/api/commercial-commissions/ledger');
  if (!r.ok) throw new Error(`razão de comissões: HTTP ${r.status}`);
  const arr = Array.isArray(r.dados) ? r.dados : r.dados?.data ?? [];
  return { detalhe: `${arr.length} lançamento(s) de comissão` };
}, { essencial: false });

await etapa('Conferir o balancete contábil', async () => {
  const r = await chamar('GET', `/api/accounting/balancete?from=${hoje.getFullYear()}-01-01&to=${iso(hoje)}&plan_id=1`);
  if (!r.ok) throw new Error(`balancete: HTTP ${r.status} — ${JSON.stringify(r.dados).slice(0, 160)}`);
  const arr = Array.isArray(r.dados) ? r.dados : r.dados?.accounts ?? r.dados?.data ?? [];
  return { detalhe: `${arr.length ?? 0} conta(s) no balancete` };
}, { essencial: false });

// ─── 8. Custo e margem ──────────────────────────────────────────────────────
await etapa('Apurar o custo padrão do produto (rollup)', async () => {
  const r = await chamar('POST', '/api/standard-cost/rollup', { item_code: ACABADO, mask: '' });
  if (!r.ok) throw new Error(`rollup de custo: HTTP ${r.status} — ${JSON.stringify(r.dados).slice(0, 200)}`);
  const d = r.dados;
  return { detalhe: `custo total ${d?.total_cost ?? d?.total ?? '—'}` };
}, { essencial: false });

await etapa('Simular a margem da venda', async () => {
  const r = await chamar('POST', '/api/margin/simulate', {
    ano: hoje.getFullYear(), mes: hoje.getMonth() + 1, quantidade: 20,
    preco_unitario: contexto.precoVenda ?? 1850, custo_unitario: 24,
    custo_transformacao_unitario: 0, ipi_pct: 5, icms_pct: 18, pis_cofins_pct: 9.25,
    comissao_pct: 3, outros_valor: 0, margem_desejada_pct: 25,
  });
  if (!r.ok) {
    const msg = String(r.dados?.error ?? '');
    if (/parâmetros de margem/i.test(msg)) {
      throw new Error('os parâmetros de margem do mês não estão cadastrados — a simulação de margem não roda sem eles (cadastro pendente, não defeito)');
    }
    throw new Error(`margem: HTTP ${r.status} — ${JSON.stringify(r.dados).slice(0, 200)}`);
  }
  const d = r.dados;
  return { detalhe: `margem ${d?.margem_pct ?? d?.margem_liquida_pct ?? '—'} · preço para 25% = ${d?.preco_minimo ?? d?.preco_unitario ?? '—'}` };
}, { essencial: false });

// ─── Relatório ──────────────────────────────────────────────────────────────
const ok = etapas.filter((e) => e.situacao === 'ok').length;
const falhas = etapas.filter((e) => e.situacao === 'falhou');
const puladas = etapas.filter((e) => e.situacao === 'pulada');
console.log('\n' + '─'.repeat(78));
console.log(`ROTINA SIMULADA — ${ok} etapa(s) ok · ${falhas.length} falha(s) · ${puladas.length} pulada(s)`);
if (falhas.length) {
  console.log('\nO que impede a empresa de rodar:');
  for (const f of falhas) console.log(`  • ${f.nome}${f.essencial ? ' [essencial]' : ''}\n      ${f.detalhe}`);
}
if (puladas.length) {
  console.log('\nEtapas puladas por falta de pré-requisito:');
  for (const p of puladas) console.log(`  • ${p.nome} — ${p.detalhe}`);
}
process.exitCode = falhas.some((f) => f.essencial) ? 1 : 0;
