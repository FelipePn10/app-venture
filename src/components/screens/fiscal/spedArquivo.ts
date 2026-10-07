// Funções puras do arquivo da EFD (sem dependências de tela, testadas em scripts/test-sped-efd.mjs).

/**
 * O PVA da EFD lê o arquivo em ISO-8859-1 (Latin-1). O texto vem da API em
 * UTF-8; cada caractere acentuado do português cabe em um byte do Latin-1. O que
 * não cabe (emoji, aspas tipográficas) vira "?" em vez de corromper a linha.
 */
export function paraLatin1(texto: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(texto.length));
  let n = 0;
  for (const ch of texto) {
    const c = ch.codePointAt(0) ?? 63;
    out[n++] = c <= 0xff ? c : 63;
  }
  return out.slice(0, n);
}

/** Mês anterior ao de hoje (a EFD se entrega do mês fechado). */
export function competenciaAnterior(hoje: Date): { ano: number; mes: number } {
  const m = hoje.getMonth(); // 0-11: o mês anterior em 1-12
  return m === 0 ? { ano: hoje.getFullYear() - 1, mes: 12 } : { ano: hoje.getFullYear(), mes: m };
}

/** CPF só com dígitos e 11 posições (o 0100 exige). */
export function cpfValido(cpf: string): boolean {
  return cpf.replace(/\D/g, '').length === 11;
}
