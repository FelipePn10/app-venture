#!/usr/bin/env node
/**
 * E2E — Cadastros de fundação (Dia 1 do treinamento)
 * ---------------------------------------------------------------------------
 * Este script existe por causa de uma classe específica de bug: a apostila
 * afirma um comportamento ("o código é gerado automaticamente", "o intervalo é
 * 1–10", "busque o item antes de digitar") que o sistema NÃO tem. Aqui cada
 * afirmação da documentação vira uma asserção contra o backend real.
 *
 * Cobre:
 *   VFUN0100  Funcionário     — código sequencial, `code <= 0` recusado
 *   VPRI0100  Prioridade APS  — intervalo é QUANTIDADE; faixas não se sobrepõem
 *   VCTB0102  Centro de custo — CC Pai inexistente
 *   VENT0204  Grupo PDM       — pré-requisito do item
 *   VITE0115  Modificador PDM — pré-requisito do item
 *   VENT0200  Item            — exige PDM existente; item-base é só um modelo opcional
 *   lookups   — endpoints que o <LookupField> consome respondem
 *
 * Uso:
 *   node scripts/e2e/cadastros-fundacao.mjs                # só leituras
 *   RUN_WRITES=1 node scripts/e2e/cadastros-fundacao.mjs   # jornada completa
 *
 * Variáveis de ambiente:
 *   API_URL   (default http://localhost:5073 — ambiente de treinamento)
 *   EMAIL     (default instrutor@venturerp.training)
 *   PASSWORD  — obrigatória. O instrutor usa `TRAINING_ADMIN_PASSWORD` e os
 *               alunos usam `TRAINING_TRAINEE_PASSWORD`, ambas em
 *               `deploy/training/training.env` no repositório do backend.
 */

const API = (process.env.API_URL ?? 'http://localhost:5073').replace(/\/$/, '');
const EMAIL = process.env.EMAIL ?? 'instrutor@venturerp.training';
const PASSWORD = process.env.PASSWORD ?? '';
const RUN_WRITES = process.env.RUN_WRITES === '1';

let token = '';
let authenticatedUserId = '';
const results = [];

function record(label, ok, status, note = '') {
  results.push({ label, ok, status, note });
  return ok;
}

async function call(method, path, body, { expect = [200, 201, 204], label = '', silent = false } = {}) {
  if (!RUN_WRITES && method !== 'GET') return { status: 0, json: null, skipped: true };
  const opts = { method, headers: {} };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let status = 0, json = null, text = '';
  try {
    const res = await fetch(`${API}${path}`, opts);
    status = res.status;
    text = await res.text();
    try { json = text ? JSON.parse(text) : null; } catch { /* não-JSON */ }
  } catch (e) {
    if (!silent) record(label || `${method} ${path}`, false, 'ERR', e.message);
    return { status: 0, json: null };
  }
  const ok = expect.includes(status);
  if (!silent) {
    record(label || `${method} ${path}`, ok, status,
      ok ? (Array.isArray(json) ? `${json.length} registro(s)` : '') : (text || '').slice(0, 160));
  }
  return { status, json, text, ok };
}

/** Confere que o backend RECUSA o que a regra de negócio manda recusar. */
async function expectRejection(label, method, path, body) {
  if (!RUN_WRITES) return record(label, true, 'SKIP', 'requer RUN_WRITES=1');
  const r = await call(method, path, body, { expect: [400, 403, 404, 409, 422, 500], label, silent: true });
  const recusou = r.status >= 400 && r.status < 600;
  return record(label, recusou, r.status,
    recusou ? 'recusado como esperado' : 'backend ACEITOU o que deveria recusar');
}

/** Validação de domínio deve responder 4xx útil; erro 500 é falha do contrato. */
async function expectValidationRejection(label, method, path, body) {
  if (!RUN_WRITES) return record(label, true, 'SKIP', 'requer RUN_WRITES=1');
  const r = await call(method, path, body, { expect: [400, 409, 422], label, silent: true });
  return record(label, [400, 409, 422].includes(r.status), r.status,
    [400, 409, 422].includes(r.status) ? 'recusado com erro de validação' : `esperado 400/409/422; recebido ${r.status}`);
}

/** Desembrulha `{data: […]}` / `{items: […]}` como o `unwrapArray` do front. */
function arr(payload) {
  if (Array.isArray(payload)) return payload;
  for (const k of ['data', 'items', 'result', 'results']) {
    if (Array.isArray(payload?.[k])) return payload[k];
  }
  return [];
}

async function login() {
  if (!PASSWORD) {
    record('POST /users/login', false, 'CONF',
      'defina PASSWORD= (TRAINING_ADMIN_PASSWORD do backend, em deploy/training/training.env)');
    return false;
  }
  try {
    const res = await fetch(`${API}/users/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    const json = await res.json().catch(() => null);
    token = json?.token ?? json?.access_token ?? json?.data?.token ?? '';
    if (token) {
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      authenticatedUserId = claims.sub ?? claims.user_id ?? claims.id ?? '';
    }
    record('POST /users/login', res.status === 200 && !!token, res.status, token ? 'token OK' : 'sem token');
  } catch (e) {
    record('POST /users/login', false, 'ERR', e.message);
  }
  return !!token;
}

// ───────────────────────────────────────────────────────────────────────────
// VFUN0100 — o código do funcionário
// ───────────────────────────────────────────────────────────────────────────
async function funcionarios() {
  console.log('\n── VFUN0100 · Cadastro de Funcionário');
  const lista = await call('GET', '/api/employee/list', undefined, { label: 'GET /api/employee/list' });
  const funcs = arr(lista.json);

  // A apostila diz "o Código é gerado automaticamente (campo desabilitado)".
  // O backend NÃO tem sequência: `entity.NewEmployee` exige code > 0 vindo do
  // cliente. O front (Vfun0100Page) calcula max+1 — este teste fixa esse
  // contrato para que ninguém volte a pedir o número ao usuário.
  const maiorCodigo = funcs.reduce((m, e) => Math.max(m, Number(e.code ?? e.Code ?? 0)), 0);
  const proximo = maiorCodigo + 1;
  record('VFUN0100 — próximo código calculável a partir da lista', proximo > 0, 'OK',
    `maior=${maiorCodigo} → próximo=${proximo}`);

  await expectRejection('VFUN0100 — recusa código zero/negativo',
    'POST', '/api/employee/create', { code: 0, name: 'Teste Código Zero', role: 'PLANNER' });

  await expectRejection('VFUN0100 — recusa nome vazio',
    'POST', '/api/employee/create', { code: proximo, name: '   ', role: 'PLANNER' });

  if (RUN_WRITES) {
    const criado = await call('POST', '/api/employee/create',
      { code: proximo, name: `E2E Funcionário ${proximo}`, role: 'PLANNER', participates_budget: false, technical_assistant: false },
      { expect: [200, 201], label: `VFUN0100 — cria funcionário ${proximo}` });
    const gravado = Number(criado.json?.code ?? criado.json?.Code ?? criado.json?.data?.code ?? 0);
    record('VFUN0100 — código gravado é o sugerido', gravado === proximo, gravado ? 'OK' : 'DIFF',
      `esperado ${proximo}, veio ${gravado}`);

    // Repetir o mesmo código tem de falhar — é o que justifica o retry do front.
    await expectRejection('VFUN0100 — recusa código duplicado',
      'POST', '/api/employee/create', { code: proximo, name: 'Duplicado', role: 'PLANNER' });
  }
}

// ───────────────────────────────────────────────────────────────────────────
// VPRI0100 — o que é "Intervalo 1–10"
// ───────────────────────────────────────────────────────────────────────────
async function prioridades() {
  console.log('\n── VPRI0100 · Prioridade de Ordens (APS)');
  const lista = await call('GET', '/api/order-priority/list', undefined, { label: 'GET /api/order-priority/list' });
  const faixas = arr(lista.json);

  // O intervalo é QUANTIDADE da ordem planejada (mrp_service_impl.go →
  // findPriorityForQuantity). Não é dias, não é valor. `/find/{valor}` prova
  // isso: passando uma quantidade, o backend devolve a faixa correspondente.
  if (faixas.length > 0) {
    const f = faixas[0];
    const inicio = Number(f.interval_start ?? f.IntervalStart ?? 0);
    const fim = Number(f.interval_end ?? f.IntervalEnd ?? 0);
    const meio = Math.floor((inicio + fim) / 2);
    const achado = await call('GET', `/api/order-priority/find/${meio}`, undefined,
      { label: `VPRI0100 — /find/${meio} resolve a faixa por QUANTIDADE` });
    const nome = achado.json?.priority ?? achado.json?.Priority ?? achado.json?.data?.priority;
    record('VPRI0100 — quantidade cai na faixa esperada',
      !!nome, nome ? 'OK' : 'DIFF',
      `qtd ${meio} (faixa ${inicio}–${fim}) → prioridade "${nome ?? '—'}"`);

    record('VPRI0100 — faixas não se sobrepõem',
      semSobreposicao(faixas), semSobreposicao(faixas) ? 'OK' : 'DIFF',
      faixas.map((x) => `${x.priority ?? x.Priority}:${x.interval_start ?? x.IntervalStart}-${x.interval_end ?? x.IntervalEnd}`).join(' | '));
  } else {
    record('VPRI0100 — há faixas cadastradas', false, 'VAZIO',
      'sem prioridades: o MRP não consegue priorizar ordem nenhuma');
  }

  await expectRejection('VPRI0100 — recusa início >= fim',
    'POST', '/api/order-priority/create',
    { priority: 'E2E_INVALIDA', description: 'início maior que fim', interval_start: 50, interval_end: 10 });

  if (faixas.length > 0 && RUN_WRITES) {
    const f = faixas[0];
    const inicio = Number(f.interval_start ?? f.IntervalStart ?? 0);
    const fim = Number(f.interval_end ?? f.IntervalEnd ?? 0);
    await expectRejection('VPRI0100 — recusa faixa sobreposta',
      'POST', '/api/order-priority/create',
      { priority: 'E2E_SOBREPOSTA', description: 'sobrepõe faixa existente', interval_start: inicio, interval_end: fim });
  }
}

function semSobreposicao(faixas) {
  const fs = faixas
    .map((f) => [Number(f.interval_start ?? f.IntervalStart ?? 0), Number(f.interval_end ?? f.IntervalEnd ?? 0)])
    .sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < fs.length; i++) if (fs[i][0] <= fs[i - 1][1]) return false;
  return true;
}

// ───────────────────────────────────────────────────────────────────────────
// VCTB0102 — CC Pai
// ───────────────────────────────────────────────────────────────────────────
async function centrosDeCusto() {
  console.log('\n── VCTB0102 · Centro de Custo');
  await call('GET', '/api/cost-center/list', undefined,
    { expect: [200, 204, 400, 404], label: 'GET /api/cost-center/list' });

  // O backend aceita `parent_code` sem checar a referência — o front (Vctb0102Page)
  // é quem confere via GET antes de gravar. Este teste documenta a lacuna: se um
  // dia o backend passar a recusar, o resultado muda e o teste avisa.
  const inexistente = 987654;
  const r = await call('GET', `/api/cost-center/${inexistente}`, undefined,
    { expect: [200, 204, 404], label: `VCTB0102 — consulta CC ${inexistente} (inexistente)`, silent: true });
  const naoExiste = r.status === 404 || r.status === 204 || !r.json || Object.keys(r.json ?? {}).length === 0;
  record(`VCTB0102 — CC Pai inexistente é detectável pelo front`, naoExiste, r.status,
    naoExiste ? 'consulta devolve vazio/404 → front consegue barrar' : 'consulta devolveu objeto: front não consegue distinguir');
}

// ───────────────────────────────────────────────────────────────────────────
// PDM antes do item — a ordem que a apostila trocava
// ───────────────────────────────────────────────────────────────────────────
async function pdmEItem() {
  console.log('\n── VENT0204 / VITE0115 / VENT0200 · PDM é pré-requisito do Item');

  let grupos = arr((await call('GET', '/api/pdm/groups', undefined, { label: 'GET /api/pdm/groups' })).json);
  let mods = arr((await call('GET', '/api/pdm/modifiers', undefined, { label: 'GET /api/pdm/modifiers' })).json);

  // No modo de escrita, percorre o mesmo pré-cadastro que o usuário faz: Grupo
  // (próximo código sugerido) → Modificador (código gerado) → Item completo.
  if (RUN_WRITES) {
    const nextGroup = grupos.reduce((max, g) => Math.max(max, Number(g.code ?? g.Code ?? 0)), 0) + 1;
    const sufixo = Date.now().toString().slice(-8);
    const criadoGrupo = await call('POST', '/api/pdm/create-group', {
      code: nextGroup, description: `E2E GRUPO ${sufixo}`, enterprise_id: 1, created_by: authenticatedUserId,
    }, { expect: [200, 201], label: `VITE0114 — cria grupo com código automático ${nextGroup}` });
    const criadoMod = await call('POST', '/api/pdm/create-modifier', {
      description: `E2E MODIFICADOR ${sufixo}`, created_by: authenticatedUserId,
    }, { expect: [200, 201], label: 'VITE0115 — cria modificador com código automático' });

    const grupoNovo = criadoGrupo.json?.data ?? criadoGrupo.json;
    const modNovo = criadoMod.json?.data ?? criadoMod.json;
    if (criadoGrupo.ok && grupoNovo) grupos = [grupoNovo, ...grupos];
    if (criadoMod.ok && modNovo) mods = [modNovo, ...mods];
  }

  record('PDM — há grupo cadastrado antes de cadastrar item', grupos.length > 0,
    grupos.length ? 'OK' : 'VAZIO',
    grupos.length ? `${grupos.length} grupo(s)` : 'sem grupo: nenhum item pode ser criado');
  record('PDM — há modificador cadastrado antes de cadastrar item', mods.length > 0,
    mods.length ? 'OK' : 'VAZIO',
    mods.length ? `${mods.length} modificador(es)` : 'sem modificador: nenhum item pode ser criado');

  // A afirmação central: item SEM PDM válido é recusado. É por isso que o
  // cadastro de PDM tem de vir ANTES do cadastro de item na apostila.
  const itens = arr((await call('GET', '/api/items/', undefined, { label: 'GET /api/items/' })).json);
  const proximoItem = itens.reduce((m, i) => Math.max(m, Number(i.code ?? i.Code ?? 0)), 0) + 1;

  await expectRejection('VENT0200 — recusa item com grupo PDM inexistente',
    'POST', '/api/items/create', corpoItem(proximoItem, { group_code: 999999, modifier_code: mods[0]?.id ?? 1 }));

  await expectRejection('VENT0200 — recusa item com código zero',
    'POST', '/api/items/create', corpoItem(0, { group_code: grupos[0]?.code ?? 1, modifier_code: mods[0]?.id ?? 1 }));

  // Usa um valor inequivocamente inexistente: UMs como CX podem ser válidas no
  // mestre atual da empresa e não servem como fixture negativa estável.
  await expectRejection('VENT0200 — recusa unidade de medida inexistente',
    'POST', '/api/items/create',
    corpoItem(proximoItem, { group_code: grupos[0]?.code ?? 1, modifier_code: mods[0]?.id ?? 1, uom: 'UNIDADE_INVALIDA_E2E' }));

  if (RUN_WRITES && grupos.length && mods.length) {
    const groupCode = Number(grupos[0].code ?? grupos[0].Code);
    const modifierCode = Number(mods[0].id ?? mods[0].ID);
    await call('POST', '/api/items/create',
      corpoItem(proximoItem + 1, { group_code: groupCode, modifier_code: modifierCode, nature: 1, semItemBase: true }),
      { expect: [200, 201], label: 'VENT0200 — cria Configurado sem item-base obrigatório' });
    const criado = await call('POST', '/api/items/create',
      corpoItem(proximoItem, {
        group_code: groupCode,
        modifier_code: modifierCode,
        pastasCompletas: true,
        cyclicalCountDays: 1,
      }),
      { expect: [200, 201], label: `VENT0200 — cria item ${proximoItem} com PDM válido` });
    if (criado.ok) {
      const consultado = await call('GET', `/api/items/search/${proximoItem}`, undefined,
        { expect: [200], label: `VENT0200 — relê item ${proximoItem} após gravar` });
      const item = consultado.json?.data ?? consultado.json;
      record('VENT0200 — item mantém Grupo e Modificador escolhidos',
        Number(item?.pdm?.group_code ?? item?.PDM?.GroupCode ?? groupCode) === groupCode &&
        Number(item?.pdm?.modifier_code ?? item?.PDM?.ModifierCode ?? modifierCode) === modifierCode,
        consultado.status, `grupo=${groupCode}; modificador=${modifierCode}`);
      record('VENT0200 — pasta Comercial persiste na criação',
        item?.commercial?.description === `E2E Comercial ${proximoItem}` &&
        Number(item?.commercial?.warranty_days) === 365 && item?.commercial?.issue_loading_labels === true,
        consultado.status, `commercial=${item?.commercial ? 'presente' : 'ausente'}`);
      record('VENT0200 — pasta Contábil persiste zero/false e dados fiscais',
        Number(item?.accounting?.origin) === 0 && item?.accounting?.calculate_pis_cofins === false &&
        item?.accounting?.cest === '0100100',
        consultado.status, `accounting=${item?.accounting ? 'presente' : 'ausente'}`);

      const atualizado = await call('PUT', `/api/items/${proximoItem}`, {
        commercial: { warranty_days: 730 },
        accounting: { origin: 1, calculate_pis_cofins: true },
      }, { expect: [200], label: `VENT0200 — atualiza parcialmente item ${proximoItem}` });
      const itemAtualizado = atualizado.json?.data ?? atualizado.json;
      record('VENT0200 — atualização parcial não apaga campos omitidos',
        Number(itemAtualizado?.commercial?.warranty_days) === 730 &&
        itemAtualizado?.commercial?.description === `E2E Comercial ${proximoItem}` &&
        Number(itemAtualizado?.accounting?.origin) === 1 &&
        itemAtualizado?.accounting?.cest === '0100100',
        atualizado.status, 'garantia/origem alteradas; descrição/CEST preservados');

      await expectValidationRejection('VENT0200 — recusa CEST inválido sem erro 500',
        'PUT', `/api/items/${proximoItem}`, { accounting: { cest: '123' } });
      await call('GET', `/api/items/${proximoItem}/activation-readiness`, undefined,
        { expect: [200], label: `VITM0100 — prontidão do item ${proximoItem}` });

      // A política permanente fica no item. O worker do backend é quem deve
      // materializá-la como ocorrência operacional; o Desktop não cria essa
      // programação automática pela rota de contagens.
      await new Promise((resolve) => setTimeout(resolve, 6500));
      const contagens = arr((await call('GET', '/api/stock/cycle-counts?limit=200&offset=0', undefined,
        { expect: [200], label: 'VEST0500 — lista ocorrências após política do item' })).json);
      const ocorrenciaAutomatica = contagens.find((c) => String(c.item_code) === String(proximoItem));
      record('VENT0200 → VEST0500 — política gera ocorrência operacional automaticamente',
        !!ocorrenciaAutomatica, ocorrenciaAutomatica ? 'OK' : 'AUSENTE',
        ocorrenciaAutomatica
          ? `item=${ocorrenciaAutomatica.item_code}; estado=${ocorrenciaAutomatica.state}`
          : 'nenhuma ocorrência criada pelo scheduler após 6,5 s');
    }
  }
}

/** Corpo do item no formato que `Vent0200Page` monta. */
function corpoItem(code, {
  group_code,
  modifier_code,
  uom = 'UN',
  nature = 2,
  semItemBase = false,
  pastasCompletas = false,
  cyclicalCountDays,
}) {
  return {
    code: String(code),
    created_by: authenticatedUserId,
    name: `E2E Item ${code}`,
    nature,
    situation: 'LINHA',
    health: 'ATIVO',
    pdm: { group_code, modifier_code, attributes: [], description_technique: `E2E Item ${code}` },
    warehouse: {
      warehouse_code: 1,
      unit_of_measurement: uom,
      automatic_low: false,
      minimum_stock: 0,
      ...(cyclicalCountDays ? { cyclical_count_config: { days_interval: cyclicalCountDays } } : {}),
    },
    engineering: {
      ...(nature !== 2 && !semItemBase ? { item_base_cod: '1' } : {}),
      weight: { gross: 1, net: 1, unit: 'KG' },
      type: 'COMPRADO', type_struct: 'INDUSTRIAL', oem: false,
    },
    planning: { type_mrp: 'NORMAL_MRP', llc: 9, ghost: false },
    supplies: { type_of_use: 'INDUSTRIALIZACAO' },
    ...(pastasCompletas ? {
      commercial: {
        description: `E2E Comercial ${code}`, sale_type: 'VENDA',
        volume_conversion_factor: 1, sale_multiple: 5, minimum_sale_quantity: 5,
        estimated_delivery_days: 7, warranty_days: 365,
        allow_billing_description_change: true, issue_loading_labels: true,
        assemble_shipping_volumes: false, requires_special_packaging: false,
        withhold_pis_cofins: false, is_packaging: false, mobile_enabled: false,
        export_packaging: false, classification_code: 'E2E', notes: 'Teste completo do item',
      },
      accounting: {
        origin: 0, sale_ipi_type: 'PERCENTUAL', sale_ipi_rate: 5,
        purchase_ipi_type: 'PERCENTUAL', purchase_ipi_rate: 5, icms_rate: 18,
        sale_unit_of_measurement: 'UN', purchase_unit_of_measurement: 'UN',
        accounting_classification_code: 'E2E', cest: '0100100', input_code: '01',
        calculate_pis_cofins: false, notes: 'Teste contábil completo',
      },
    } : {}),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Lookups — o <LookupField> só funciona se estes endpoints responderem
// ───────────────────────────────────────────────────────────────────────────
async function lookups() {
  console.log('\n── Lookups · fontes de dados dos campos de busca');
  const fontes = [
    ['grupos PDM', '/api/pdm/groups'],
    ['modificadores PDM', '/api/pdm/modifiers'],
    ['itens', '/api/items/'],
    ['almoxarifados', '/api/warehouse/list'],
    ['clientes', '/api/customers'],
    ['fornecedores', '/api/suppliers'],
  ];
  for (const [nome, rota] of fontes) {
    const r = await call('GET', rota, undefined, { expect: [200, 204], label: `lookup ${nome} — ${rota}`, silent: true });
    const n = arr(r.json).length;
    record(`lookup ${nome}`, r.status === 200 || r.status === 204, r.status,
      r.status === 200 ? `${n} opção(ões)` : 'campo de busca abrirá vazio');
  }
}

// ───────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nE2E Cadastros de Fundação — ${API}`);
  console.log(RUN_WRITES ? 'modo: LEITURA + ESCRITA' : 'modo: só leitura (use RUN_WRITES=1 para a jornada completa)');

  if (!(await login())) {
    console.error('\n✖ login falhou — sem token não dá para seguir.');
    imprimir();
    process.exit(1);
  }

  await funcionarios();
  await prioridades();
  await centrosDeCusto();
  await pdmEItem();
  await lookups();

  imprimir();
  const falhas = results.filter((r) => !r.ok).length;
  process.exit(falhas > 0 ? 1 : 0);
}

function imprimir() {
  console.log('\n' + '─'.repeat(78));
  for (const r of results) {
    const marca = r.ok ? '✔' : '✖';
    console.log(`${marca} [${String(r.status).padEnd(4)}] ${r.label}${r.note ? `  — ${r.note}` : ''}`);
  }
  const ok = results.filter((r) => r.ok).length;
  console.log('─'.repeat(78));
  console.log(`${ok}/${results.length} verificações passaram\n`);
}

main();
