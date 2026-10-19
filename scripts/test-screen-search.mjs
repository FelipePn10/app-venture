import { searchErpScreens, normalizeScreenSearch } from '../src/utils/screenSearch.ts';
import { ERP_SCREENS } from '../src/types/erpScreen.ts';

const screens = [
  { code: 'VITM0100', title: 'Cadastro de Itens', description: 'Cadastro completo do produto', module: 'engenharia' },
  { code: 'VITM0110', title: 'Consulta de famílias', description: 'Itens por família', module: 'engenharia' },
  { code: 'VFIS0200', title: 'NF-e de Saída', description: 'Emitir nota fiscal eletrônica', module: 'fiscal' },
  { code: 'VFIS0210', title: 'NF-e de Entrada', description: 'Receber documento fiscal', module: 'fiscal' },
  { code: 'VVND0300', title: 'Orçamento de Venda', description: 'Proposta comercial para o cliente', module: 'comercial' },
  { code: 'VCLI0500', title: 'Cadastro de Cliente', description: 'Dados comerciais e fiscais', module: 'cliente' },
];

function expectFirst(query, code) {
  const result = searchErpScreens(screens, query);
  if (result[0]?.code !== code) throw new Error(`Busca “${query}”: esperado ${code}, recebido ${result[0]?.code ?? 'nenhum'}`);
}

expectFirst('VITM0100', 'VITM0100');
expectFirst('vitm 0100', 'VITM0100');
expectFirst('cadastro de itens', 'VITM0100');
expectFirst('nota fiscal saida', 'VFIS0200');
expectFirst('orçamento', 'VVND0300');
expectFirst('cliente', 'VCLI0500');

const unrelated = searchErpScreens(screens, 'VITM0100');
if (unrelated.length !== 1) throw new Error(`Código exato trouxe ${unrelated.length} resultados em vez de 1`);
if (normalizeScreenSearch('  NF-e de Saída  ') !== 'nf e de saida') throw new Error('Normalização de acentos/pontuação falhou');

const duplicatedFixture = searchErpScreens([
  ...screens,
  { ...screens[0], title: 'Item duplicado por engano' },
], 'VITM0100');
if (duplicatedFixture.length !== 1) throw new Error('A busca não eliminou um código de tela duplicado');

function expectCatalogFirst(query, code) {
  const result = searchErpScreens(ERP_SCREENS, query);
  if (result[0]?.code !== code) throw new Error(`Catálogo “${query}”: esperado ${code}, recebido ${result[0]?.code ?? 'nenhum'}`);
}

expectCatalogFirst('VITM0100', 'VITM0100');
expectCatalogFirst('VFIS0200', 'VFIS0200');
expectCatalogFirst('orçamento de venda', 'VVND0300');
expectCatalogFirst('cadastro de cliente', 'VCLI0500');
expectCatalogFirst('NF-e de saída', 'VFIS0200');

const duplicateCodes = [...new Set(ERP_SCREENS
  .map((screen) => screen.code)
  .filter((code, index, all) => all.indexOf(code) !== index))];
if (duplicateCodes.length > 0) throw new Error(`Catálogo contém códigos duplicados: ${duplicateCodes.join(', ')}`);

const exactCatalogResult = searchErpScreens(ERP_SCREENS, 'VITM0100');
if (exactCatalogResult.length !== 1 || exactCatalogResult[0].code !== 'VITM0100') {
  throw new Error(`VITM0100 deveria ser o único resultado, mas retornou: ${exactCatalogResult.map((item) => item.code).join(', ')}`);
}

// Código antigo que virou apelido abre a tela verdadeira e não duplica na busca.
expectCatalogFirst('VSUP0630', 'VPCT0100');
expectCatalogFirst('VEST0300', 'VLOT0100');
const tolerancias = searchErpScreens(ERP_SCREENS, 'tolerâncias de pedido de compra').map((s) => s.code);
if (tolerancias.filter((c) => c === 'VPCT0100').length !== 1 || tolerancias.includes('VSUP0630')) {
  throw new Error(`Tolerâncias apareceu duplicada ou pelo código antigo: ${tolerancias.join(', ')}`);
}
const semDestino = ERP_SCREENS.filter((s) => s.replacedBy && !ERP_SCREENS.some((t) => t.code === s.replacedBy && !t.replacedBy));
if (semDestino.length > 0) throw new Error(`Apelido sem tela de destino: ${semDestino.map((s) => s.code).join(', ')}`);

console.log('Ranking da busca de telas validado.');
