/**
 * Plano de parcelas livre: "30% na entrada e o resto em 3 vezes", "3 vezes e 40%
 * no final" ou "20% em 45 dias". Cada bloco diz quanto leva e em quantas parcelas;
 * tudo em CENTAVOS inteiros para a soma fechar exatamente no total.
 */

export type ModoBloco = 'percentual' | 'valor' | 'restante';

export interface BlocoPlano {
  id: number;
  rotulo: string;
  modo: ModoBloco;
  /** Percentual (30 = 30%) ou valor em reais, conforme o modo. Ignorado em "restante". */
  quanto: number;
  quantidade: number;
  /** Dias da data-base até a primeira parcela do bloco. */
  dias: number;
  /** Dias entre as parcelas do bloco. */
  intervalo: number;
}

export interface ParcelaDoPlano {
  numero: number;
  valorCent: number;
  dias: number;
  rotulo: string;
}

export interface ResultadoPlano {
  parcelas: ParcelaDoPlano[];
  /** Primeiro problema, em português; vazio quando o plano fecha no total. */
  erro: string;
}

const brl = (cent: number): string =>
  (cent / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function dividir(totalCent: number, n: number): number[] {
  const base = Math.floor(totalCent / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? totalCent - base * (n - 1) : base));
}

export function calcularPlano(blocos: BlocoPlano[], totalCent: number): ResultadoPlano {
  const vazio = (erro: string): ResultadoPlano => ({ parcelas: [], erro });
  if (!blocos.length) return vazio('Monte o plano com pelo menos um bloco de parcelas.');
  if (totalCent <= 0) return vazio('Sem valor a parcelar.');

  const restantes = blocos.filter((b) => b.modo === 'restante');
  if (restantes.length > 1) return vazio('Só um bloco pode ficar com o restante.');

  for (const [i, b] of blocos.entries()) {
    const nome = b.rotulo || `Bloco ${i + 1}`;
    if (!Number.isInteger(b.quantidade) || b.quantidade < 1) return vazio(`${nome}: informe quantas parcelas.`);
    if (b.dias < 0 || b.intervalo < 0) return vazio(`${nome}: os dias não podem ser negativos.`);
    if (b.quantidade > 1 && b.intervalo === 0) return vazio(`${nome}: informe o intervalo entre as parcelas.`);
    if (b.modo !== 'restante' && !(b.quanto > 0)) return vazio(`${nome}: informe ${b.modo === 'percentual' ? 'o percentual' : 'o valor'}.`);
  }

  const somaPct = blocos.reduce((s, b) => s + (b.modo === 'percentual' ? b.quanto : 0), 0);
  if (somaPct > 100.0001) return vazio(`Os percentuais somam ${somaPct.toLocaleString('pt-BR')}%: passam de 100%.`);

  const valorDe = new Map<number, number>();
  let usado = 0;
  for (const b of blocos) {
    if (b.modo === 'restante') continue;
    const v = b.modo === 'percentual' ? Math.round((totalCent * b.quanto) / 100) : Math.round(b.quanto * 100);
    valorDe.set(b.id, v);
    usado += v;
  }

  const fechaEm100 = !restantes.length && blocos.every((b) => b.modo === 'percentual') && Math.abs(somaPct - 100) <= 0.0001;
  if (fechaEm100 && usado !== totalCent) {
    // O arredondamento dos percentuais não pode criar nem sumir centavo.
    const ultimo = blocos[blocos.length - 1];
    valorDe.set(ultimo.id, (valorDe.get(ultimo.id) ?? 0) + totalCent - usado);
    usado = totalCent;
  }

  if (restantes.length) {
    const sobra = totalCent - usado;
    if (sobra <= 0) return vazio(`Os blocos já somam R$ ${brl(usado)} de R$ ${brl(totalCent)}: não sobra nada para o restante.`);
    valorDe.set(restantes[0].id, sobra);
  } else if (usado > totalCent) {
    return vazio(`Os blocos somam R$ ${brl(usado)}, mais que os R$ ${brl(totalCent)} a parcelar.`);
  } else if (usado < totalCent) {
    return vazio(`Os blocos somam R$ ${brl(usado)} de R$ ${brl(totalCent)}: faltam R$ ${brl(totalCent - usado)}. Ajuste os valores ou use um bloco "Restante".`);
  }

  const linhas: Array<Omit<ParcelaDoPlano, 'numero'>> = [];
  for (const b of blocos) {
    const valor = valorDe.get(b.id) ?? 0;
    if (valor < b.quantidade) return vazio(`${b.rotulo || 'Bloco'}: valor pequeno demais para ${b.quantidade} parcelas.`);
    dividir(valor, b.quantidade).forEach((v, i) => {
      linhas.push({
        valorCent: v,
        dias: b.dias + b.intervalo * i,
        rotulo: b.quantidade > 1 ? `${b.rotulo || 'Parcela'} ${i + 1}/${b.quantidade}` : (b.rotulo || 'Parcela'),
      });
    });
  }
  // Ordem de vencimento, mantendo a ordem digitada nos empates.
  const parcelas = linhas
    .map((l, i) => ({ l, i }))
    .sort((a, b) => a.l.dias - b.l.dias || a.i - b.i)
    .map(({ l }, i) => ({ ...l, numero: i + 1 }));
  return { parcelas, erro: '' };
}

let proximoId = 1;
export const novoBloco = (parcial: Partial<BlocoPlano> = {}): BlocoPlano => ({
  id: proximoId++, rotulo: '', modo: 'restante', quanto: 0, quantidade: 1, dias: 30, intervalo: 30, ...parcial,
});

export const planoParcelasIguais = (n = 1, intervalo = 30): BlocoPlano[] => [
  novoBloco({ rotulo: n > 1 ? 'Parcela' : 'Pagamento', modo: 'restante', quantidade: n, dias: intervalo, intervalo }),
];

export const planoEntradaMaisParcelas = (pct = 30, n = 3, intervalo = 30): BlocoPlano[] => [
  novoBloco({ rotulo: 'Entrada', modo: 'percentual', quanto: pct, quantidade: 1, dias: 0, intervalo: 0 }),
  novoBloco({ rotulo: 'Parcela', modo: 'restante', quantidade: n, dias: intervalo, intervalo }),
];

export const planoParcelasMaisFinal = (n = 3, pct = 40, intervalo = 30): BlocoPlano[] => [
  novoBloco({ rotulo: 'Parcela', modo: 'restante', quantidade: n, dias: intervalo, intervalo }),
  novoBloco({ rotulo: 'Saldo final', modo: 'percentual', quanto: pct, quantidade: 1, dias: intervalo * (n + 1), intervalo: 0 }),
];

export interface ParcelaDaCondicao {
  installment_number: number;
  due_days: number;
  percentage?: number;
  base_event?: string;
  description?: string;
}

/**
 * Condição de pagamento do cadastro vira blocos. Sem percentual, as parcelas têm
 * o mesmo peso. "Na entrega" conta da entrada da mercadoria na empresa.
 */
export function planoDaCondicao(parcelas: ParcelaDaCondicao[], diasAteEntrega = 0): BlocoPlano[] {
  if (!parcelas.length) return [novoBloco({ rotulo: 'À vista', modo: 'restante', quantidade: 1, dias: 0, intervalo: 0 })];
  const ordenadas = [...parcelas].sort((a, b) => a.installment_number - b.installment_number);
  const usaPct = ordenadas.some((p) => p.percentage !== undefined);
  return ordenadas.map((p, i) => {
    const ultima = i === ordenadas.length - 1;
    const dias = p.base_event === 'ENTRADA' ? 0 : p.due_days + (p.base_event === 'ENTREGA' ? diasAteEntrega : 0);
    const rotulo = p.description || (p.base_event === 'ENTRADA' ? 'Entrada' : `Parcela ${i + 1}`);
    if (usaPct) return novoBloco({ rotulo, modo: 'percentual', quanto: p.percentage ?? 0, quantidade: 1, dias, intervalo: 0 });
    return ultima
      ? novoBloco({ rotulo, modo: 'restante', quantidade: 1, dias, intervalo: 0 })
      : novoBloco({ rotulo, modo: 'percentual', quanto: Number((100 / ordenadas.length).toFixed(4)), quantidade: 1, dias, intervalo: 0 });
  });
}

/** Soma os dias à data (AAAA-MM-DD) ao meio-dia, para o fuso não mudar o dia. */
export function dataMaisDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
