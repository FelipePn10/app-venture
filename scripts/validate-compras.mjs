#!/usr/bin/env node
/**
 * Trava o que a rodada de Suprimentos entregou: o pedido de compra deixou de
 * ser um formulário de JSON e a cotação ganhou o mapa comparativo.
 */
import { readFileSync } from 'node:fs';

const checks = [];
function check(name, condition) {
  checks.push(name);
  if (!condition) throw new Error(`Falhou: ${name}`);
  console.log(`✓ ${name}`);
}
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const pedido = read('src/components/screens/suprimento/Vpdc0200Page.tsx');
const mapa = read('src/components/screens/suprimento/MapaCotacaoPanel.tsx');
const cotacao = read('src/components/screens/suprimento/Vsup0400Page.tsx');
const pedidoSrv = read('src/services/purchaseOrderService.ts');
const cotacaoSrv = read('src/services/purchaseQuotationService.ts');
const host = read('src/components/screens/ScreenHostPage.tsx');
const rotinas = read('src/components/screens/operationalRoutines.ts');

// ── Pedido de compra ────────────────────────────────────────────────────────
check('VPDC0200 tem tela própria', /VPDC0200: <Vpdc0200Page \/>/.test(host));
check('VPDC0200 não pede mais JSON cru', !/VPDC0200: routine/.test(rotinas));
check('pedido tem capa, itens e transporte', /"capa"/.test(pedido) && /"itens"/.test(pedido) && /"transporte"/.test(pedido));
check('pedido usa lookup de fornecedor, item, almoxarifado e transportadora',
  /loadSuppliers/.test(pedido) && /loadItems/.test(pedido) && /loadWarehouses/.test(pedido) && /loadCarriers/.test(pedido));
check('pedido mostra o saldo por item', /cancelled_qty/.test(pedido) && /Saldo/.test(pedido));
check('pedido soma bruto, desconto, IPI e frete', /totais.desconto/.test(pedido) && /totalComFrete/.test(pedido));
check('pedido exige o almoxarifado que o backend cobra', /Informe o almoxarifado/.test(pedido));
check('pedido explica a alçada em português', /ALCADA_ROTULO/.test(pedido) && /aguardando autorização/.test(pedido));
check('pedido desliga aprovar fora do status certo', /PODE_APROVAR/.test(pedido));
check('pedido só autoriza alçada quando está bloqueada', /capa\.alcada_status !== "B"/.test(pedido));
for (const campo of ['freight_value', 'carrier_code', 'advance_value', 'incoterm_code', 'tolerance_pct', 'promised_date']) {
  check(`serviço do pedido mapeia ${campo}`, new RegExp(`${campo}[?]?:`).test(pedidoSrv));
}
check('serviço do pedido lê a situação da alçada', /alcada_status/.test(pedidoSrv));

// ── Mapa da cotação ─────────────────────────────────────────────────────────
check('serviço monta a matriz item × fornecedor', /export async function getQuotationMap/.test(cotacaoSrv) && /QuotationMap/.test(cotacaoSrv));
check('cotação abre o mapa comparativo', /MapaCotacaoPanel/.test(cotacao) && /Mapa da cotação/.test(cotacao));
check('mapa destaca o melhor preço por linha', /const melhores = useMemo/.test(mapa) && /cot-celula.*melhor|melhor/.test(mapa));
check('mapa calcula a economia contra o segundo colocado', /segundo \? \(segundo\.unit_price - primeiro\.unit_price\)/.test(mapa));
check('mapa totaliza por fornecedor', /totaisPorFornecedor/.test(mapa) && /Fechar tudo com/.test(mapa));
check('mapa sinaliza quem não cotou tudo', /cotou \$\{t\.cobertos\}/.test(mapa));
check('mapa compara pulverizar × concentrar', /Pulverizar a compra/.test(mapa) && /Concentrar num fornecedor/.test(mapa));
check('mapa permite digitar o preço na própria célula', /gravarPreco/.test(mapa));
check('mapa gera os pedidos dos escolhidos', /generateQuotationOrders/.test(mapa));
check('mapa avisa quando há menos de dois fornecedores', /não há comparação/.test(mapa));

console.log(`\n${checks.length}/${checks.length} validações de compras aprovadas.`);
