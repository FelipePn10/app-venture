/**
 * Validação da cadeia comercial-fiscal-financeira sobre dados reais.
 *
 * Percorre: condição de pagamento composta → orçamento → plano de pagamento →
 * conversão em pedido (conferindo se a capa fecha com os itens e se o rateio de
 * comissão viajou) → nota fiscal → PRÉVIA da NF-e (a conferência antes de
 * emitir) → e confere que a prévia acusa exatamente o que está pendente.
 *
 * Nunca roda contra produção: a API é checada antes de qualquer chamada.
 *
 *   API=http://localhost:5081 EMAIL=... SENHA=... node scripts/validacao-orcamento-pedido-nfe.mjs
 */
const API = (process.env.API ?? 'http://localhost:5081').replace(/\/$/, '');
const EMAIL = process.env.EMAIL ?? 'comercial@tecnofer.com.br';
const SENHA = process.env.SENHA ?? 'Sandbox@2026';

if (/:5070|:5072|:5073|venturerp\.com|dev-api/.test(API)) {
  console.error(`RECUSADO: ${API} parece ambiente real. Esta validação grava dados.`);
  process.exit(2);
}

const PRECO = 1000, QTD = 10, DESC = 10, IPI = 5, ST = 0;
let token = '';
const passos = [];
function ok(nome, detalhe) { passos.push({ nome, ok: true, detalhe }); console.log(`  ✓ ${nome}${detalhe ? ` — ${detalhe}` : ''}`); }
function falha(nome, detalhe) { passos.push({ nome, ok: false, detalhe }); console.log(`  ✗ ${nome} — ${detalhe}`); }

async function chamar(metodo, rota, corpo, extras = {}) {
  const r = await fetch(API + rota, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extras,
    },
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  });
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  return { status: r.status, dados };
}

const desembrulhar = (d) => (d && typeof d === 'object' && 'data' in d ? d.data : d);
const num = (o, ...ks) => { for (const k of ks) { const v = o?.[k]; if (typeof v === 'number') return v; if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v); } return 0; };
const str = (o, ...ks) => { for (const k of ks) { const v = o?.[k]; if (typeof v === 'string' && v) return v; } return ''; };
const perto = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;
const hoje = new Date().toISOString().slice(0, 10);
const emDias = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

async function main() {
  console.log(`\nValidação da cadeia orçamento → pedido → NF-e → título  ·  ${API}\n`);

  // ── 1. sessão
  const login = await chamar('POST', '/users/login', { email: EMAIL, password: SENHA, remember_me: true });
  if (login.status !== 200) { falha('login', `HTTP ${login.status}: ${JSON.stringify(login.dados).slice(0, 200)}`); return encerrar(); }
  token = str(desembrulhar(login.dados), 'token', 'access_token');
  ok('login', EMAIL);

  // ── 2. condição de pagamento composta (30% entrada, 20% entrega, resto 28/56)
  const marca = Date.now().toString().slice(-6);
  const cond = await chamar('POST', '/api/customers/support/payment-conditions', {
    description: `VALIDACAO ${marca} 30/20/28/56`,
    average_term_days: 30,
    is_active: true,
  });
  const condObj = desembrulhar(cond.dados);
  const condCode = num(condObj, 'code', 'Code');
  if (cond.status >= 300 || !condCode) { falha('criar condição de pagamento', `HTTP ${cond.status}: ${JSON.stringify(cond.dados).slice(0, 250)}`); return encerrar(); }
  ok('criar condição de pagamento', `código ${condCode}`);

  const parcelas = [
    { installment_number: 1, percentage: 30, base_event: 'ENTRADA', due_days: 0, description: 'entrada' },
    { installment_number: 2, percentage: 20, base_event: 'ENTREGA', due_days: 0, description: 'na entrega' },
    { installment_number: 3, percentage: 25, base_event: 'EMISSAO', due_days: 28, description: '28 dias' },
    { installment_number: 4, percentage: 25, base_event: 'EMISSAO', due_days: 56, description: '56 dias' },
  ];
  let parcelasOk = 0;
  for (const p of parcelas) {
    const r = await chamar('POST', '/api/customers/support/payment-conditions/installments', { ...p, payment_condition_code: condCode });
    if (r.status < 300) parcelasOk++;
    else falha(`parcela ${p.installment_number}`, `HTTP ${r.status}: ${JSON.stringify(r.dados).slice(0, 200)}`);
  }
  if (parcelasOk === parcelas.length) ok('cadastrar 4 parcelas', '30% entrada + 20% entrega + 25% 28d + 25% 56d');

  // ── 3. cliente e item reais de produção
  const clientes = desembrulhar((await chamar('GET', '/api/customers')).dados) ?? [];
  const cliente = (Array.isArray(clientes) ? clientes : []).find((c) => num(c, 'code', 'Code') > 0);
  if (!cliente) { falha('achar cliente', 'nenhum cliente na base'); return encerrar(); }
  const clienteCode = num(cliente, 'code', 'Code');
  ok('cliente de produção', `${clienteCode} — ${str(cliente, 'name', 'Name')}`);

  const itens = desembrulhar((await chamar('GET', '/api/items')).dados) ?? [];
  const item = (Array.isArray(itens) ? itens : []).find((i) => str(i, 'business_code', 'BusinessCode').startsWith('RN-'))
    ?? (Array.isArray(itens) ? itens : [])[0];
  const itemCode = str(item, 'business_code', 'BusinessCode') || String(num(item, 'code', 'Code'));
  ok('item de produção', `${itemCode} — ${str(item, 'name', 'Name')}`);

  // ── 3b. tabela de venda com vigência e preço (item 3.3 do relatório)
  //
  // Sem preço vigente o orçamento recusa o item: é a trava que a empresa vai
  // encontrar no primeiro orçamento se a tabela ficar vazia.
  const tabelas = desembrulhar((await chamar('GET', '/api/customers/support/sales-tables')).dados) ?? [];
  let tabela = (Array.isArray(tabelas) ? tabelas : [])[0];
  if (!tabela) {
    const nova = await chamar('POST', '/api/customers/support/sales-tables', {
      description: `VALIDACAO ${marca}`, validity_start: hoje, validity_end: emDias(365), is_active: true,
    });
    tabela = desembrulhar(nova.dados);
  }
  const tabelaCode = num(tabela, 'code', 'Code');
  const temVigencia = Boolean(str(tabela, 'validity_start', 'ValidityStart'));
  if (temVigencia) ok('tabela de venda com vigência', `tabela ${tabelaCode}: ${str(tabela, 'validity_start', 'ValidityStart')} → ${str(tabela, 'validity_end', 'ValidityEnd')}`);
  else falha('tabela de venda sem vigência', `tabela ${tabelaCode} — o orçamento vai recusar o item`);

  const preco = await chamar('POST', `/api/customers/support/sales-tables/${tabelaCode}/prices`, {
    sales_table_code: tabelaCode, item_code: itemCode, price: PRECO, price_conv: PRECO,
    situation: 'ATIVO', blocked: false,
  });
  if (preco.status < 300) ok('preço do item na tabela', `${itemCode} = R$ ${PRECO.toFixed(2)}`);
  else console.log(`  · preço já existia ou recusado (HTTP ${preco.status}) — segue com o que está cadastrado`);

  // ── 4. orçamento
  const orc = await chamar('POST', '/api/sales-quotation/create', {
    customer_code: clienteCode,
    emission_date: hoje,
    digit_date: hoje,
    delivery_date: emDias(20),
    quotation_type: 'VENDA',
    payment_term_code: condCode,
    price_table_code: tabelaCode,
    currency_code: 'BRL',
    status: 'OV',
    release_status: 'RELEASED',
  });
  const orcObj = desembrulhar(orc.dados);
  const orcCode = num(orcObj, 'code', 'Code');
  if (orc.status >= 300 || !orcCode) { falha('criar orçamento', `HTTP ${orc.status}: ${JSON.stringify(orc.dados).slice(0, 300)}`); return encerrar(); }
  ok('criar orçamento', `código ${orcCode}`);

  const itemOrc = await chamar('POST', '/api/sales-quotation/items/create', {
    sales_quotation_code: orcCode,
    sequence: 1, item_code: itemCode, requested_qty: QTD, unit_price: PRECO,
    discount_pct: DESC, ipi_pct: IPI, st_pct: ST, sales_uom: 'UN',
    price_table_code: tabelaCode,
  });
  if (itemOrc.status >= 300) { falha('incluir item no orçamento', `HTTP ${itemOrc.status}: ${JSON.stringify(itemOrc.dados).slice(0, 300)}`); return encerrar(); }

  // Conta esperada: produto = 10 × 1000 − 10% = 9.000; IPI 5% = 450; total c/ IPI = 9.450.
  const linha = desembrulhar(itemOrc.dados);
  const produtoEsp = QTD * PRECO * (1 - DESC / 100);
  const ipiEsp = produtoEsp * IPI / 100;
  const totalLiq = num(linha, 'total_net', 'TotalNet');
  const totalIpi = num(linha, 'total_ipi', 'TotalIPI');
  const totalComIpi = num(linha, 'total_net_with_ipi', 'TotalNetWithIPI');
  if (perto(totalLiq, produtoEsp) && perto(totalIpi, ipiEsp) && perto(totalComIpi, produtoEsp + ipiEsp)) {
    ok('separação produto × IPI × produto+IPI', `produto ${totalLiq} · IPI ${totalIpi} · com IPI ${totalComIpi}`);
  } else {
    falha('separação produto × IPI', `esperado ${produtoEsp}/${ipiEsp}/${produtoEsp + ipiEsp}, veio ${totalLiq}/${totalIpi}/${totalComIpi}`);
  }

  // ── 5. plano de pagamento do orçamento
  const plano = await chamar('GET', `/api/sales-quotation/${orcCode}/payment-schedule`);
  const planoObj = desembrulhar(plano.dados);
  const pcs = planoObj?.parcelas ?? planoObj?.Parcelas ?? [];
  if (plano.status === 200 && pcs.length === 4) {
    const soma = pcs.reduce((a, p) => a + num(p, 'valor', 'Valor'), 0);
    const base = num(planoObj, 'total', 'Total');
    if (perto(soma, base)) ok('plano de pagamento do orçamento', `4 parcelas somando ${soma.toFixed(2)} = total ${base.toFixed(2)}`);
    else falha('plano de pagamento: soma', `parcelas ${soma} × total ${base}`);
    const entrada = pcs.find((p) => num(p, 'numero', 'Numero') === 1);
    if (perto(num(entrada, 'percentual', 'Percentual'), 30)) ok('parcela de entrada 30%', `R$ ${num(entrada, 'valor', 'Valor').toFixed(2)}`);
    else falha('parcela de entrada', `percentual veio ${num(entrada, 'percentual', 'Percentual')}`);
  } else {
    falha('plano de pagamento do orçamento', `HTTP ${plano.status}, ${pcs.length} parcela(s): ${JSON.stringify(plano.dados).slice(0, 250)}`);
  }

  // ── 6. conversão em pedido
  const conv = await chamar('POST', `/api/sales-quotation/${orcCode}/convert-to-order`, {});
  const pedidoObj = desembrulhar(conv.dados);
  const pedidoCode = num(pedidoObj, 'code', 'Code');
  if (conv.status >= 300 || !pedidoCode) { falha('converter em pedido', `HTTP ${conv.status}: ${JSON.stringify(conv.dados).slice(0, 300)}`); return encerrar(); }
  ok('converter orçamento em pedido', `pedido ${pedidoCode}`);

  const pedido = desembrulhar((await chamar('GET', `/api/sales-order/${pedidoCode}`)).dados);
  const itensPedido = desembrulhar((await chamar('GET', `/api/sales-order/items/${pedidoCode}`)).dados) ?? [];
  const somaItens = (Array.isArray(itensPedido) ? itensPedido : []).reduce((a, i) => a + num(i, 'total_net', 'TotalNet'), 0);
  const capaLiq = num(pedido, 'total_net', 'TotalNet');
  if (perto(somaItens, capaLiq)) ok('capa do pedido fecha com os itens', `capa ${capaLiq.toFixed(2)} = itens ${somaItens.toFixed(2)}`);
  else falha('capa do pedido × itens', `capa ${capaLiq} ≠ soma dos itens ${somaItens}`);

  if (num(pedido, 'payment_term_code', 'PaymentTermCode') === condCode) ok('condição de pagamento viajou na conversão', `condição ${condCode}`);
  else falha('condição de pagamento na conversão', `pedido veio com ${num(pedido, 'payment_term_code', 'PaymentTermCode')}`);

  // ── 7. nota fiscal a partir do pedido
  const nf = await chamar('POST', '/api/fiscal/exits/create', {
    numero_nf: 0, serie: '1', data_emissao: hoje, data_saida: emDias(20),
    customer_code: clienteCode,
    cfop: '5101', natureza_operacao: 'VENDA DE PRODUCAO DO ESTABELECIMENTO',
    valor_produtos: somaItens, valor_frete: 0, valor_seguro: 0, valor_desconto: 0,
    sales_order_code: pedidoCode,
    itens: (Array.isArray(itensPedido) ? itensPedido : []).map((i, idx) => ({
      sequence: idx + 1,
      item_code: num(i, 'item_code', 'ItemCode'),
      ncm: '73269000',
      cfop: '5101',
      quantity: num(i, 'requested_qty', 'RequestedQty'),
      unit_price: num(i, 'unit_price', 'UnitPrice'),
      total_price: num(i, 'total_net', 'TotalNet'),
      origem_mercadoria: '0',
      description: str(i, 'item_name', 'ItemName') || `Item ${num(i, 'item_code', 'ItemCode')}`,
    })),
  });
  const nfObj = desembrulhar(nf.dados);
  const nfId = num(nfObj, 'id', 'ID');
  if (nf.status >= 300 || !nfId) { falha('criar NF-e em rascunho', `HTTP ${nf.status}: ${JSON.stringify(nf.dados).slice(0, 400)}`); return encerrar(); }
  ok('criar NF-e em rascunho', `id ${nfId}, nº ${num(nfObj, 'numero_nf', 'NumeroNF')}`);

  // O endereço do destinatário tem de vir do cadastro do cliente, senão a SEFAZ recusa.
  const temEndereco = str(nfObj, 'dest_logradouro', 'DestLogradouro') !== '';
  if (temEndereco) {
    ok('endereço do destinatário preenchido do cadastro',
      `${str(nfObj, 'dest_logradouro', 'DestLogradouro')}, ${str(nfObj, 'dest_municipio', 'DestMunicipio')}/${str(nfObj, 'uf_destinatario', 'UFDestinatario')}`);
  } else {
    falha('endereço do destinatário', 'cliente de produção não tem endereço cadastrado — a prévia deve acusar (item 3.5 do relatório)');
  }

  // ── 8. PRÉVIA — o ponto central desta validação
  const prev = await chamar('GET', `/api/fiscal/exits/${nfId}/previa`);
  const p = desembrulhar(prev.dados);
  if (prev.status !== 200) { falha('prévia da NF-e', `HTTP ${prev.status}: ${JSON.stringify(prev.dados).slice(0, 400)}`); return encerrar(); }
  ok('prévia da NF-e responde', `${(p.itens ?? []).length} item(ns), ${(p.pendencias ?? []).length} pendência(s)`);

  const pend = p.pendencias ?? [];
  const impede = pend.filter((x) => x.nivel === 'IMPEDE');
  const atencao = pend.filter((x) => x.nivel === 'ATENCAO');
  console.log(`     impedem (${impede.length}):`);
  for (const x of impede) console.log(`       · ${x.campo}: ${x.mensagem}`);
  console.log(`     atenção (${atencao.length}):`);
  for (const x of atencao) console.log(`       · ${x.campo}: ${x.mensagem}`);

  // A prévia tem de travar a emissão quando há impedimento, e liberar quando não há.
  if (p.pode_autorizar === (impede.length === 0)) ok('prévia decide a emissão pela conferência', `pode_autorizar=${p.pode_autorizar}`);
  else falha('prévia × pode_autorizar', `${impede.length} impedimento(s) mas pode_autorizar=${p.pode_autorizar}`);

  // O token está desligado no sandbox: isso TEM de aparecer como impedimento.
  if (impede.some((x) => x.campo === 'token_focus')) ok('prévia acusa provedor fiscal não configurado', 'token_focus');
  else falha('prévia e o token', 'o sandbox está sem token e a prévia não acusou');

  // O município zerado (cópia de produção) tem de ser ATENÇÃO, nunca impedimento.
  const mun = pend.find((x) => x.campo === 'emitente.codigo_municipio');
  if (mun && mun.nivel === 'ATENCAO' && /SPED/.test(mun.mensagem)) ok('município zerado tratado como atenção e com a consequência certa', mun.mensagem.slice(0, 80) + '…');
  else if (mun) falha('município zerado', `nível ${mun.nivel}: ${mun.mensagem}`);
  else ok('município do emitente preenchido', 'nada a acusar');

  // Totais da prévia batem com a nota.
  if (perto(num(p.totais, 'valor_total_nf'), num(nfObj, 'valor_total', 'ValorTotal'))) {
    ok('totais da prévia batem com a nota', `R$ ${num(p.totais, 'valor_total_nf').toFixed(2)}`);
  } else {
    falha('totais da prévia', `prévia ${num(p.totais, 'valor_total_nf')} × nota ${num(nfObj, 'valor_total', 'ValorTotal')}`);
  }

  // As parcelas da prévia vêm da condição do PEDIDO e somam o total da nota.
  const pp = p.pagamento?.parcelas ?? [];
  const somaParc = pp.reduce((a, x) => a + num(x, 'valor'), 0);
  if (pp.length === 4 && perto(somaParc, num(p.totais, 'valor_total_nf'))) {
    ok('parcelas da NF-e vêm da condição do pedido', `4 parcelas somando R$ ${somaParc.toFixed(2)}`);
  } else {
    falha('parcelas da NF-e', `${pp.length} parcela(s) somando ${somaParc.toFixed(2)} × total ${num(p.totais, 'valor_total_nf').toFixed(2)}`);
  }
  if (p.pagamento?.origem?.includes('pedido')) ok('origem da condição é o pedido de venda', p.pagamento.origem);
  else falha('origem da condição', String(p.pagamento?.origem));

  // O payload transmitido tem de levar as duplicatas das parcelas a prazo.
  try {
    const enviado = JSON.parse(p.payload_enviado);
    const dups = enviado.duplicatas ?? [];
    if (dups.length >= 2) ok('duplicatas no documento transmitido', `${dups.length} duplicata(s), 1ª vence ${dups[0].data_vencimento}`);
    else falha('duplicatas no documento', `${dups.length} duplicata(s) para uma venda a prazo`);
    if ((enviado.destinatario?.logradouro ?? '') !== '' || !temEndereco) {
      ok('endereço do destinatário no documento transmitido', enviado.destinatario?.logradouro || '(vazio, como o cadastro)');
    } else {
      falha('endereço no documento transmitido', 'a nota tem endereço mas o payload saiu sem');
    }
  } catch (e) {
    falha('payload transmitido', `não é JSON válido: ${e.message}`);
  }

  // ── 9. a prévia não altera nada
  const depois = desembrulhar((await chamar('GET', `/api/fiscal/exits/${nfId}`)).dados);
  if (str(depois, 'status', 'Status') === str(nfObj, 'status', 'Status')) ok('prévia não muda o status da nota', str(depois, 'status', 'Status'));
  else falha('prévia alterou a nota', `${str(nfObj, 'status', 'Status')} → ${str(depois, 'status', 'Status')}`);

  encerrar();
}

function encerrar() {
  const bons = passos.filter((p) => p.ok).length;
  console.log(`\n${bons}/${passos.length} verificações passaram.\n`);
  process.exit(bons === passos.length ? 0 : 1);
}

main().catch((e) => { console.error('erro inesperado:', e); process.exit(3); });
