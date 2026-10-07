// Distribuição das parcelas da nota de entrada por plano de contas — o mesmo
// algoritmo do backend (domain/fiscal/entrada), em centavos.
import {
  totaisPorConta, distribuirProporcional, parcelasIguais, conferirMatriz, chaveConta, escalar, planoFinanceiro,
} from '../src/components/screens/fiscal/entradaRateio.ts';

const fmt = (c) => (c / 100).toFixed(2);
const falhar = (m) => { throw new Error(m); };

// Nota de 100 mil: 50 mil de matéria-prima (plano 10) e 50 mil de EPI (plano 20), 3 parcelas.
const itens = [{ plano: 10, valorContabil: 50000 }, { plano: 20, valorContabil: 50000 }];
const totais = totaisPorConta(itens);
const parcelas = parcelasIguais(10_000_000, 3);
if (parcelas.join() !== '3333333,3333333,3333334') falhar(`parcelas iguais: ${parcelas}`);

const dist = distribuirProporcional(parcelas, totais);
const matriz = parcelas.map((v, i) => ({ numero: i + 1, valorCent: v, dist: dist[i] }));
const div = conferirMatriz(matriz, totais, 10_000_000, fmt);
if (div.length) falhar(`proporcional deveria fechar: ${JSON.stringify(div)}`);

// Distribuição manual: parcela 1 toda EPI, 2 toda MP, 3 dividida.
const manual = [
  { numero: 1, valorCent: 3333333, dist: new Map([[chaveConta(20), 3333333]]) },
  { numero: 2, valorCent: 3333333, dist: new Map([[chaveConta(10), 3333333]]) },
  { numero: 3, valorCent: 3333334, dist: new Map([[chaveConta(10), 1666667], [chaveConta(20), 1666667]]) },
];
if (conferirMatriz(manual, totais, 10_000_000, fmt).length) falhar('distribuição manual válida acusou divergência');

// Tudo em MP não fecha com 50/50 dos itens.
const errado = parcelas.map((v, i) => ({ numero: i + 1, valorCent: v, dist: new Map([[chaveConta(10), v]]) }));
if (!conferirMatriz(errado, totais, 10_000_000, fmt).some((d) => d.tipo === 'conta')) falhar('tudo em MP deveria divergir por conta');

// Classificação parcial: só o EPI classificado — cada parcela recebe metade
// em EPI, nunca o valor inteiro nem zero.
const parcial = distribuirProporcional(parcelas, totaisPorConta([{ plano: 20, valorContabil: 50000 }, { valorContabil: 50000 }]));
let somaEpi = 0;
parcial.forEach((m, i) => {
  const v = m.get(chaveConta(20)) ?? 0;
  if (v <= 0 || Math.abs(v - parcelas[i] / 2) > 2) falhar(`parcela ${i + 1} deveria ter metade em EPI, tem ${fmt(v)}`);
  somaEpi += v;
});
if (somaEpi !== 5_000_000) falhar(`EPI recebe ${fmt(somaEpi)} nas parcelas, esperado 50000.00`);

// Retenções (mesmo caso do backend: TestPlanoFinanceiro_RetencoesEItensSemFinanceiro):
// 10.000 de itens (6.000 MP + 4.000 EPI), 615 retidos → 9.385 ao fornecedor, e
// os planos encolhem na proporção para fechar exatamente no valor a pagar.
const pf = planoFinanceiro([{ plano: 10, valorContabil: 6000 }, { plano: 20, valorContabil: 4000 }], 61500);
if (pf.baseCent !== 1_000_000 || pf.aPagarCent !== 938_500) falhar(`base ${fmt(pf.baseCent)} a pagar ${fmt(pf.aPagarCent)}`);
const somaAlvos = [...pf.alvos.values()].reduce((s, v) => s + v, 0);
if (somaAlvos !== 938_500) falhar(`alvos somam ${fmt(somaAlvos)}, esperado 9385.00`);
if (pf.alvos.get(chaveConta(10)) !== 563_100) falhar(`MP deveria ficar com 5631.00, ficou ${fmt(pf.alvos.get(chaveConta(10)))}`);
const parcelasLiquidas = parcelasIguais(pf.aPagarCent, 2);
const distLiq = distribuirProporcional(parcelasLiquidas, pf.alvos);
const matrizLiq = parcelasLiquidas.map((v, i) => ({ numero: i + 1, valorCent: v, dist: distLiq[i] }));
if (conferirMatriz(matrizLiq, pf.alvos, pf.aPagarCent, fmt).length) falhar('parcelas pelo líquido deveriam fechar');
if (!conferirMatriz(matrizLiq, pf.alvos, 1_000_000, fmt).some((d) => d.tipo === 'total')) falhar('parcelas pelo líquido não fecham com o total bruto');

// Bonificação (não gera financeiro) fica fora da base e dos planos.
const bonif = planoFinanceiro([{ plano: 10, valorContabil: 6000 }, { plano: 20, valorContabil: 4000, geraFinanceiro: false }], 0);
if (bonif.baseCent !== 600_000 || bonif.alvos.size !== 1) falhar(`bonificação: base ${fmt(bonif.baseCent)}, ${bonif.alvos.size} plano(s)`);

// Escalar fecha exato com dízima (TestEscalar_FechaExato).
const esc = escalar(new Map([[chaveConta(1), 3333], [chaveConta(2), 3333], [chaveConta(3), 3334]]), 9001);
if ([...esc.values()].reduce((s, v) => s + v, 0) !== 9001) falhar('escalar não fechou');

console.log('rateio da nota de entrada: ok');
