/**
 * Distribuição das parcelas da nota de entrada por plano de contas.
 *
 * Tudo em CENTAVOS inteiros: somar 33333,33 três vezes em ponto flutuante não
 * dá 99999,99 exatos, e a conferência da distribuição é justamente "a soma
 * fecha?". É o mesmo algoritmo do backend (domain/fiscal/entrada), para a tela
 * mostrar na hora o que a aprovação vai aceitar.
 */

export interface ContaChave {
  plano: number;
  cc?: number;
}

export const chaveConta = (plano: number, cc?: number): string => `${plano}:${cc ?? 0}`;

export function lerChave(k: string): ContaChave {
  const [p, c] = k.split(':').map(Number);
  return { plano: p, cc: c || undefined };
}

export const paraCentavos = (v: number): number => Math.round((v || 0) * 100);
export const deCentavos = (c: number): number => c / 100;

/**
 * Total de cada conta (em centavos) a partir dos itens classificados. Item
 * cuja operação não gera financeiro (bonificação, remessa, comodato) não entra.
 */
export function totaisPorConta(itens: Array<{ plano?: number; cc?: number; valorContabil: number; geraFinanceiro?: boolean }>): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of itens) {
    if (!it.plano || it.geraFinanceiro === false) continue;
    const k = chaveConta(it.plano, it.cc);
    m.set(k, (m.get(k) ?? 0) + paraCentavos(it.valorContabil));
  }
  return m;
}

export function chavesOrdenadas(m: Map<string, number>): string[] {
  return [...m.keys()].sort((a, b) => {
    const x = lerChave(a); const y = lerChave(b);
    return x.plano !== y.plano ? x.plano - y.plano : (x.cc ?? 0) - (y.cc ?? 0);
  });
}

/**
 * Distribui cada parcela na proporção do total de cada conta sobre o total das
 * parcelas. Cada conta fecha no seu total (a última parcela leva os centavos)
 * e, quando todos os itens estão classificados, cada parcela fecha no seu
 * valor (a última conta leva os centavos). Com itens ainda sem plano, a
 * parcela fica distribuída só na parte classificada — o resto é pendência.
 */
export function distribuirProporcional(parcelasCent: number[], totais: Map<string, number>): Array<Map<string, number>> {
  const contas = chavesOrdenadas(totais);
  const totalClassificado = contas.reduce((s, k) => s + (totais.get(k) ?? 0), 0);
  const totalParcelas = parcelasCent.reduce((s, v) => s + v, 0);
  const base = Math.max(totalClassificado, totalParcelas);
  const fechaLinha = totalClassificado === totalParcelas;
  const acumulado = new Map<string, number>();
  return parcelasCent.map((valor, pi) => {
    const linha = new Map<string, number>();
    if (!contas.length || base <= 0) return linha;
    const ultimaParcela = pi === parcelasCent.length - 1;
    let somaLinha = 0;
    contas.forEach((k, ci) => {
      let v: number;
      if (ultimaParcela) v = (totais.get(k) ?? 0) - (acumulado.get(k) ?? 0);
      else if (fechaLinha && ci === contas.length - 1) v = valor - somaLinha;
      else v = Math.round((valor * (totais.get(k) ?? 0)) / base);
      if (v < 0) v = 0;
      acumulado.set(k, (acumulado.get(k) ?? 0) + v);
      somaLinha += v;
      linha.set(k, v);
    });
    return linha;
  });
}

/**
 * Redistribui os totais para somarem exatamente `alvoCent`, na mesma proporção
 * (a última conta leva os centavos). É o Escalar do backend: com retenção, o
 * fornecedor recebe o líquido e cada plano encolhe na proporção.
 */
export function escalar(totais: Map<string, number>, alvoCent: number): Map<string, number> {
  const contas = chavesOrdenadas(totais);
  const soma = contas.reduce((s, k) => s + (totais.get(k) ?? 0), 0);
  if (soma === alvoCent || soma <= 0) return new Map(totais);
  const out = new Map<string, number>();
  let acumulado = 0;
  contas.forEach((k, i) => {
    if (i === contas.length - 1) { out.set(k, alvoCent - acumulado); return; }
    const v = Math.round(((totais.get(k) ?? 0) * alvoCent) / soma);
    out.set(k, v);
    acumulado += v;
  });
  return out;
}

/**
 * O que a nota deve ao fornecedor e quanto disso cabe a cada plano de contas
 * (PlanoFinanceiro do backend): base = valor contábil dos itens que geram
 * financeiro; a pagar = base − retenções; alvos = totais por plano escalados
 * para fechar no valor a pagar.
 */
export function planoFinanceiro(
  itens: Array<{ plano?: number; cc?: number; valorContabil: number; geraFinanceiro?: boolean }>,
  retencoesCent: number,
): { baseCent: number; aPagarCent: number; totais: Map<string, number>; alvos: Map<string, number> } {
  const baseCent = itens.filter((it) => it.geraFinanceiro !== false).reduce((s, it) => s + paraCentavos(it.valorContabil), 0);
  const aPagarCent = Math.max(0, baseCent - retencoesCent);
  const totais = totaisPorConta(itens);
  return { baseCent, aPagarCent, totais, alvos: escalar(totais, aPagarCent) };
}

/** Divide um valor em n parcelas iguais; a última leva os centavos. */
export function parcelasIguais(totalCent: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(totalCent / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? totalCent - base * (n - 1) : base));
}

export interface Divergencia {
  tipo: 'parcela' | 'conta' | 'total';
  chave: string;
  mensagem: string;
}

/** Confere a matriz parcelas × contas (centavos). Tolerância: 0. */
export function conferirMatriz(
  parcelas: Array<{ numero: number; valorCent: number; dist: Map<string, number> }>,
  totais: Map<string, number>,
  totalNotaCent: number,
  fmt: (cent: number) => string,
): Divergencia[] {
  const out: Divergencia[] = [];
  const somaParcelas = parcelas.reduce((s, p) => s + p.valorCent, 0);
  if (parcelas.length && somaParcelas !== totalNotaCent) {
    out.push({ tipo: 'total', chave: 'total', mensagem: `As parcelas somam ${fmt(somaParcelas)} e o valor a pagar ao fornecedor é ${fmt(totalNotaCent)}.` });
  }
  const porConta = new Map<string, number>();
  for (const p of parcelas) {
    let s = 0;
    for (const [k, v] of p.dist) { s += v; porConta.set(k, (porConta.get(k) ?? 0) + v); }
    if (totais.size && s !== p.valorCent) {
      out.push({ tipo: 'parcela', chave: String(p.numero), mensagem: `Parcela ${p.numero}: distribuído ${fmt(s)} de ${fmt(p.valorCent)}.` });
    }
  }
  for (const k of chavesOrdenadas(totais)) {
    const dist = porConta.get(k) ?? 0;
    const tot = totais.get(k) ?? 0;
    if (parcelas.length && dist !== tot) {
      out.push({ tipo: 'conta', chave: k, mensagem: `Conta ${k.split(':')[0]}: parcelas somam ${fmt(dist)}, a parte do plano no valor a pagar é ${fmt(tot)}.` });
    }
  }
  return out;
}
