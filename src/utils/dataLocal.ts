/**
 * Dia de hoje (AAAA-MM-DD) no fuso de quem usa o sistema.
 *
 * `new Date().toISOString().slice(0, 10)` dá o dia em UTC: depois das 21h em
 * Brasília já é amanhã, e as telas sugeriam emissão, entrega e vencimento com
 * um dia a mais.
 */
export function hojeLocal(): string {
  return diaLocal(new Date());
}

/** Dia (AAAA-MM-DD) de uma data no fuso local. */
export function diaLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
