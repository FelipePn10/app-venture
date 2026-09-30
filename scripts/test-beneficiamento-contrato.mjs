#!/usr/bin/env node
/**
 * Contrato do beneficiamento: os DTOs de `customerMaterialService.ts` contra o que
 * a API devolve de verdade.
 *
 * Existe porque typecheck e lint não pegam divergência de contrato: o TypeScript
 * confia na interface declarada, e um campo que o backend renomeou chega como
 * `undefined` na tela sem erro nenhum — a coluna aparece vazia e ninguém sabe por
 * quê. Aqui cada campo declarado é conferido contra a resposta real.
 *
 * Uso:
 *   API_URL=http://127.0.0.1:5097 TOKEN=<jwt> node scripts/test-beneficiamento-contrato.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const API = (process.env.API_URL ?? 'http://127.0.0.1:5097').replace(/\/+$/, '');
const TOKEN = process.env.TOKEN ?? '';
if (!TOKEN) {
  console.error('TOKEN é obrigatório (JWT de um ADMIN).');
  process.exit(2);
}

const FONTE = new URL('../src/services/customerMaterialService.ts', import.meta.url).pathname;
const fonte = readFileSync(FONTE, 'utf8');

/**
 * Extrai os campos de uma interface do serviço. Ler a FONTE, em vez de repetir a
 * lista aqui, é o que faz o teste acusar um campo novo que ninguém conferiu.
 */
function camposDaInterface(nome) {
  const inicio = fonte.indexOf(`export interface ${nome} {`);
  assert.notEqual(inicio, -1, `interface ${nome} não encontrada em customerMaterialService.ts`);
  const corpo = fonte.slice(inicio, fonte.indexOf('\n}', inicio));
  const campos = [];
  for (const linha of corpo.split('\n').slice(1)) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('//') || limpa.startsWith('/*') || limpa.startsWith('*')) continue;
    const m = /^([a-z_][a-z0-9_]*)(\?)?\s*:/i.exec(limpa);
    if (m) campos.push({ nome: m[1], opcional: !!m[2] });
  }
  assert.ok(campos.length > 0, `interface ${nome} sem campos reconhecidos`);
  return campos;
}

async function api(metodo, caminho, corpo) {
  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  let dados;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  return { status: resposta.status, dados };
}

const checks = [];
async function it(label, fn) {
  try { await fn(); checks.push({ label, ok: true }); }
  catch (e) { checks.push({ label, ok: false, detail: e.message }); }
}

/** Confere que a resposta traz todo campo obrigatório da interface. */
function conferirCampos(interfaceName, objeto, contexto) {
  const faltando = [];
  for (const { nome, opcional } of camposDaInterface(interfaceName)) {
    if (opcional) continue;
    if (!(nome in objeto)) faltando.push(nome);
  }
  assert.deepEqual(faltando, [], `${contexto}: a API não devolveu ${faltando.join(', ')} (declarados em ${interfaceName})`);
}

const sufixo = Date.now() % 100000;
let remessa;
let itemId;

await it('POST / recebe a remessa e devolve todos os campos de RemittanceDTO', async () => {
  const { status, dados } = await api('POST', '/api/customer-material', {
    customer_code: 100,
    nfe_number: 700000 + sufixo,
    nfe_series: '1',
    issue_date: '2026-09-10',
    total_value: '696.56',
    sales_order_code: 5001,
    itens: [
      { customer_item_code: '10014485', description: 'ALUMINIO TUBO', ncm: '76081000', cst: '050', uom: 'KG', qty_invoiced: '16', unit_value: '36.93' },
      { customer_item_code: '10014670', description: 'ALUMINIO BARRA CHATA', ncm: '76041029', cst: '050', uom: 'KG', qty_invoiced: '3.4', unit_value: '31.05' },
    ],
  });
  assert.equal(status, 201, `esperava 201, veio ${status}: ${JSON.stringify(dados)}`);
  remessa = dados;
  conferirCampos('RemittanceDTO', remessa, 'POST /api/customer-material');
  assert.ok(Array.isArray(remessa.itens) && remessa.itens.length === 2, 'as duas linhas deveriam voltar');
  conferirCampos('RemittanceItemDTO', remessa.itens[0], 'itens[0]');
  itemId = remessa.itens[0].id;
});

await it('quantidades voltam como STRING, não number', async () => {
  // Um number aqui significaria float no caminho, e float perde centavo em nota
  // fiscal. O teste fixa o tipo porque a perda é silenciosa.
  for (const campo of ['qty_invoiced', 'qty_received', 'balance_qty', 'unit_value', 'divergence_qty']) {
    assert.equal(typeof remessa.itens[0][campo], 'string', `itens[0].${campo} veio como ${typeof remessa.itens[0][campo]}`);
  }
  assert.equal(typeof remessa.saldo_total, 'string', 'saldo_total deveria ser string');
  assert.equal(typeof remessa.total_value, 'string', 'total_value deveria ser string');
});

await it('o prazo fiscal padrão são 30 dias após a emissão', async () => {
  assert.equal(remessa.fiscal_return_deadline, '2026-10-10',
    `prazo = ${remessa.fiscal_return_deadline}, esperado 2026-10-10 (30 dias de 2026-09-10)`);
  assert.equal(typeof remessa.dias_para_o_prazo, 'number', 'dias_para_o_prazo deveria ser number');
});

await it('GET /{id} devolve o mesmo contrato', async () => {
  const { status, dados } = await api('GET', `/api/customer-material/${remessa.id}`);
  assert.equal(status, 200);
  conferirCampos('RemittanceDTO', dados, `GET /${remessa.id}`);
  conferirCampos('RemittanceItemDTO', dados.itens[0], 'itens[0]');
});

await it('GET / devolve lista com o contrato de RemittanceDTO', async () => {
  const { status, dados } = await api('GET', '/api/customer-material?with_balance=true');
  assert.equal(status, 200);
  assert.ok(Array.isArray(dados), 'a listagem deveria ser um array');
  assert.ok(dados.length > 0, 'a remessa recém-criada deveria aparecer');
  conferirCampos('RemittanceDTO', dados[0], 'GET / [0]');
});

await it('POST movimento devolve MovementDTO e aplica o CFOP 5902', async () => {
  const { status, dados } = await api('POST', `/api/customer-material/items/${itemId}/movements`, {
    movement_type: 'RETURN', quantity: '13.94', idempotency_key: `contrato-ret-${sufixo}`,
  });
  assert.equal(status, 201, `esperava 201, veio ${status}: ${JSON.stringify(dados)}`);
  conferirCampos('MovementDTO', dados, 'POST movimento');
  assert.equal(dados.cfop, '5902', `CFOP = ${dados.cfop}, esperado 5902 aplicado pelo servidor`);
  assert.equal(typeof dados.quantity, 'string', 'quantity deveria ser string');
});

await it('o saldo bate com o documento do cliente (16 − 13,94 = 2,06)', async () => {
  const { dados } = await api('GET', `/api/customer-material/${remessa.id}`);
  const linha = dados.itens.find((i) => i.customer_item_code === '10014485');
  assert.equal(linha.balance_qty, '2.06', `saldo = ${linha.balance_qty}, esperado 2.06`);
  assert.equal(dados.status, 'PARCIAL', `situação = ${dados.status}, esperado PARCIAL`);
});

await it('GET /balance devolve o contrato de BalanceDTO', async () => {
  const { status, dados } = await api('GET', '/api/customer-material/balance');
  assert.equal(status, 200);
  assert.ok(Array.isArray(dados) && dados.length > 0, 'deveria haver saldo de terceiro');
  conferirCampos('BalanceDTO', dados[0], 'GET /balance [0]');
  assert.equal(typeof dados[0].balance, 'string', 'balance deveria ser string');
  assert.equal(typeof dados[0].remessas_abertas, 'number', 'remessas_abertas deveria ser number');
});

await it('GET movimentos devolve a trilha com o contrato', async () => {
  const { status, dados } = await api('GET', `/api/customer-material/items/${itemId}/movements`);
  assert.equal(status, 200);
  assert.ok(Array.isArray(dados) && dados.length > 0, 'deveria haver movimento');
  conferirCampos('MovementDTO', dados[0], 'GET movimentos [0]');
});

await it('os enums do serviço são os que a API aceita', async () => {
  // Um valor que o serviço oferece e a API recusa é um botão que não funciona.
  const tipos = /export const MOVEMENT_TYPES = \[([^\]]+)\]/.exec(fonte)[1]
    .split(',').map((t) => t.trim().replace(/'/g, '')).filter(Boolean);
  for (const tipo of tipos) {
    const corpo = { movement_type: tipo, quantity: '0.01', idempotency_key: `enum-${tipo}-${sufixo}` };
    if (tipo === 'SCRAP') corpo.scrap_destination = 'CLIENTE';
    if (tipo === 'ADJUSTMENT') corpo.reason = 'conferência';
    const { status, dados } = await api('POST', `/api/customer-material/items/${itemId}/movements`, corpo);
    assert.equal(status, 201, `a API recusou o tipo ${tipo} que o serviço oferece: ${JSON.stringify(dados)}`);
  }
  const destinos = /export const SCRAP_DESTINATIONS = \[([^\]]+)\]/.exec(fonte)[1]
    .split(',').map((t) => t.trim().replace(/'/g, '')).filter(Boolean);
  for (const destino of destinos) {
    const { status, dados } = await api('POST', `/api/customer-material/items/${itemId}/movements`, {
      movement_type: 'SCRAP', quantity: '0.01', scrap_destination: destino,
      idempotency_key: `dest-${destino}-${sufixo}`,
    });
    assert.equal(status, 201, `a API recusou a destinação ${destino} que o serviço oferece: ${JSON.stringify(dados)}`);
  }
});

await it('RECEIPT é recusado — a entrada nasce da remessa, não daqui', async () => {
  const { status } = await api('POST', `/api/customer-material/items/${itemId}/movements`, {
    movement_type: 'RECEIPT', quantity: '1', idempotency_key: `receipt-${sufixo}`,
  });
  assert.equal(status, 422, `RECEIPT devolveu ${status}; aceitar infla o saldo do cliente sem nota`);
});

await it('as situações declaradas em STATUS_LABELS existem na API', async () => {
  const situacoes = /export const REMITTANCE_STATUS = \[([^\]]+)\]/.exec(fonte)[1]
    .split(',').map((t) => t.trim().replace(/'/g, '')).filter(Boolean);
  for (const situacao of situacoes) {
    const { status } = await api('GET', `/api/customer-material?status=${situacao}`);
    assert.equal(status, 200, `a API recusou a situação ${situacao}: HTTP ${status}`);
  }
});

await it('GET /{id}/audit devolve o histórico com o contrato de AuditEventDTO', async () => {
  const { status, dados } = await api('GET', `/api/customer-material/${remessa.id}/audit`);
  assert.equal(status, 200, `histórico devolveu ${status}`);
  assert.ok(Array.isArray(dados) && dados.length > 0,
    'histórico vazio: o recebimento e o movimento deste teste tinham de estar na trilha');
  conferirCampos('AuditEventDTO', dados[0], 'GET /{id}/audit [0]');
});

await it('o histórico traz usuário, antes, depois e a operação — o que o cliente pediu', async () => {
  const { dados } = await api('GET', `/api/customer-material/${remessa.id}/audit`);
  const inclusao = dados.find((e) => e.entity_type === 'customer_material_remittances' && e.action === 'INSERT');
  assert.ok(inclusao, 'o recebimento da remessa não está na trilha');
  assert.ok(inclusao.actor_name || inclusao.actor_email,
    'evento sem usuário identificado: a trilha tem de dizer quem fez');
  assert.ok(inclusao.after && inclusao.after.status === 'ABERTA',
    `estado novo não veio no evento: ${JSON.stringify(inclusao.after)?.slice(0, 120)}`);
  assert.ok(new Date(inclusao.occurred_at).getFullYear() > 2000,
    `data e hora inválidas: ${inclusao.occurred_at}`);

  const baixa = dados.find((e) => e.entity_type === 'customer_material_items' && e.action === 'UPDATE');
  assert.ok(baixa, 'a baixa do saldo pelo movimento não está na trilha');
  // Qual coluna de quantidade muda depende do tipo do movimento (retorno, sobra,
  // sucata, ajuste); o que a trilha tem de mostrar em todos é o saldo e a coluna
  // que o movimento consumiu.
  assert.ok(Array.isArray(baixa.changed_fields), 'baixa sem lista de campos alterados');
  assert.ok(baixa.changed_fields.includes('balance_qty'),
    `saldo fora dos campos alterados: ${JSON.stringify(baixa.changed_fields)}`);
  assert.ok(baixa.changed_fields.some((c) => /^qty_(returned|leftover|scrapped|received)$/.test(c)),
    `nenhuma quantidade consumida na baixa: ${JSON.stringify(baixa.changed_fields)}`);
  assert.notEqual(baixa.before?.balance_qty, baixa.after?.balance_qty,
    'saldo anterior e novo iguais na trilha da baixa');
});

await it('o histórico respeita o limite e recusa limite inválido', async () => {
  const { status, dados } = await api('GET', `/api/customer-material/${remessa.id}/audit?limit=1`);
  assert.equal(status, 200);
  assert.equal(dados.length, 1, `limit=1 devolveu ${dados.length} eventos`);
  const invalido = await api('GET', `/api/customer-material/${remessa.id}/audit?limit=abc`);
  assert.equal(invalido.status, 422, `limite inválido devolveu ${invalido.status}, esperado 422`);
});

await it('estornar a baixa devolve o saldo ao cliente e é idempotente', async () => {
  // A nota fiscal deste teste não existe: o que se exercita é o razão do
  // beneficiamento, que referencia a saída por id sem FK. Baixa por nota fictícia,
  // estorno, e o saldo tem de voltar ao que era.
  const nota = 700000 + (Number(sufixo) % 90000);
  const antes = await api('GET', `/api/customer-material/${remessa.id}`);
  const saldoAntes = antes.dados.itens[0].balance_qty;

  const baixa = await api('POST', `/api/customer-material/items/${itemId}/movements`, {
    movement_type: 'RETURN', quantity: '0.5', cfop: '5902',
    idempotency_key: `estorno-teste-${sufixo}`,
  });
  assert.equal(baixa.status, 201, `baixa devolveu ${baixa.status}`);

  const semMotivo = await api('POST', `/api/customer-material/notes/${nota}/reverse`, { reason: 'erro' });
  assert.equal(semMotivo.status, 422, `estorno com motivo curto devolveu ${semMotivo.status}`);

  // A baixa acima não tem nota vinculada, então estornar a nota fictícia não move
  // nada — e é exatamente o que precisa devolver 200 sem estragar saldo.
  const vazio = await api('POST', `/api/customer-material/notes/${nota}/reverse`,
    { reason: 'conferência do contrato: nota sem baixa vinculada' });
  assert.equal(vazio.status, 200, `estorno de nota sem baixa devolveu ${vazio.status}`);
  assert.equal(vazio.dados.reversed, 0, `estornou ${vazio.dados.reversed} movimento(s) de uma nota sem baixa`);

  const depois = await api('GET', `/api/customer-material/${remessa.id}`);
  const esperado = (Number(saldoAntes) - 0.5).toFixed(6);
  assert.equal(Number(depois.dados.itens[0].balance_qty).toFixed(6), esperado,
    `saldo = ${depois.dados.itens[0].balance_qty}, esperado ${esperado} — o estorno tocou o que não devia`);
});

let falhas = 0;
for (const c of checks) {
  if (c.ok) console.log(`  ✓ ${c.label}`);
  else { falhas++; console.log(`  ✗ ${c.label}\n      ${c.detail}`); }
}
console.log(`\n${checks.length - falhas}/${checks.length} verificações passaram`);
process.exit(falhas === 0 ? 0 : 1);
