// Plano de parcelas livre: combinação de percentual, valor e parcelas, em centavos.
import {
  calcularPlano, novoBloco, planoEntradaMaisParcelas, planoParcelasMaisFinal, planoParcelasIguais, planoDaCondicao,
} from '../src/utils/planoParcelas.ts';

const falhar = (m) => { throw new Error(m); };
const valores = (r) => r.parcelas.map((p) => p.valorCent).join();
const dias = (r) => r.parcelas.map((p) => p.dias).join();

let r = calcularPlano(planoEntradaMaisParcelas(30, 3, 30), 100000);
if (r.erro || valores(r) !== '30000,23333,23333,23334' || dias(r) !== '0,30,60,90') falhar(`entrada + parcelas: ${valores(r)} ${dias(r)} ${r.erro}`);

r = calcularPlano(planoParcelasMaisFinal(3, 40, 30), 100000);
if (r.erro || valores(r) !== '20000,20000,20000,40000' || dias(r) !== '30,60,90,120') falhar(`parcelas + final: ${valores(r)} ${r.erro}`);

// Percentual no meio: ordena pelo vencimento.
r = calcularPlano([
  novoBloco({ rotulo: 'Parcela', modo: 'restante', quantidade: 2, dias: 30, intervalo: 60 }),
  novoBloco({ rotulo: 'Meio', modo: 'percentual', quanto: 20, quantidade: 1, dias: 60, intervalo: 0 }),
], 100000);
if (r.erro || dias(r) !== '30,60,90' || valores(r) !== '40000,20000,40000') falhar(`meio: ${valores(r)} ${dias(r)}`);
if (r.parcelas.map((p) => p.numero).join() !== '1,2,3') falhar('numeração deve seguir o vencimento');

// Centavo não some: 33,33% + 33,33% + 33,34% de R$ 1.000,01.
r = calcularPlano([33.33, 33.33, 33.34].map((quanto, i) => novoBloco({ modo: 'percentual', quanto, dias: i * 30, intervalo: 0 })), 100001);
if (r.erro || r.parcelas.reduce((s, p) => s + p.valorCent, 0) !== 100001) falhar(`centavo: ${valores(r)} ${r.erro}`);

// Valor fixo + restante.
r = calcularPlano([novoBloco({ modo: 'valor', quanto: 150.5, dias: 0, intervalo: 0 }), novoBloco({ modo: 'restante', quantidade: 2 })], 100000);
if (r.erro || valores(r) !== '15050,42475,42475') falhar(`valor: ${valores(r)}`);

// O que não fecha é recusado com mensagem.
const recusa = (blocos, total, trecho) => {
  const x = calcularPlano(blocos, total);
  if (!x.erro.includes(trecho) || x.parcelas.length) falhar(`esperava "${trecho}", veio "${x.erro}"`);
};
recusa([novoBloco({ modo: 'percentual', quanto: 60 }), novoBloco({ modo: 'percentual', quanto: 50 })], 1000, 'passam de 100%');
recusa([novoBloco({ modo: 'percentual', quanto: 60 })], 1000, 'faltam');
recusa([novoBloco({ modo: 'restante' }), novoBloco({ modo: 'restante' })], 1000, 'Só um bloco');
recusa([novoBloco({ modo: 'percentual', quanto: 100 }), novoBloco({ modo: 'restante' })], 1000, 'não sobra');
recusa([novoBloco({ modo: 'valor', quanto: 20 })], 1000, 'mais que');
recusa([novoBloco({ modo: 'restante', quantidade: 3, intervalo: 0 })], 1000, 'intervalo');
recusa([novoBloco({ modo: 'restante', quantidade: 0 })], 1000, 'quantas');
recusa(planoParcelasIguais(2), 0, 'Sem valor');

// Condições do cadastro.
r = calcularPlano(planoDaCondicao([
  { installment_number: 1, due_days: 0, percentage: 30, base_event: 'ENTRADA' },
  { installment_number: 2, due_days: 28, percentage: 35 },
  { installment_number: 3, due_days: 56, percentage: 35 },
]), 100000);
if (r.erro || valores(r) !== '30000,35000,35000' || dias(r) !== '0,28,56') falhar(`condição %: ${valores(r)} ${r.erro}`);
r = calcularPlano(planoDaCondicao([{ installment_number: 1, due_days: 28 }, { installment_number: 2, due_days: 56 }, { installment_number: 3, due_days: 84 }]), 100000);
if (r.erro || r.parcelas.length !== 3 || r.parcelas.reduce((s, p) => s + p.valorCent, 0) !== 100000) falhar(`condição igual: ${valores(r)} ${r.erro}`);
r = calcularPlano(planoDaCondicao([]), 5000);
if (r.erro || dias(r) !== '0' || valores(r) !== '5000') falhar('sem parcelas é à vista');
r = calcularPlano(planoDaCondicao([{ installment_number: 1, due_days: 10, percentage: 100, base_event: 'ENTREGA' }], 5), 5000);
if (dias(r) !== '15') falhar(`entrega conta da entrada: ${dias(r)}`);

console.log('plano de parcelas ok');
