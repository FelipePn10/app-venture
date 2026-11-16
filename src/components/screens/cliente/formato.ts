export const money = (v?: number) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dataBR = (s?: string) => (s ? new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString("pt-BR") : "—");

/** "vencido" ou "vence dd/mm/aaaa" quando o limite vence em até 30 dias; null fora disso. */
export function vencimentoDoCredito(c: { credit_limit_expires_at?: string; credit_limit_expired?: boolean }, hoje = new Date()): string | null {
  if (!c.credit_limit_expires_at) return null;
  const vence = new Date(`${c.credit_limit_expires_at.slice(0, 10)}T12:00:00`);
  const meioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12);
  const dias = Math.round((vence.getTime() - meioDia.getTime()) / 86_400_000);
  if (c.credit_limit_expired || dias < 0) return "vencido";
  return dias <= 30 ? `vence ${vence.toLocaleDateString("pt-BR")}` : null;
}

/** Onde o fator aparece na explicação do limite. */
export type GrupoFator = "bloqueio" | "contra" | "favor" | "info";
export function grupoDoFator(f: { code?: string; points: number; max_points: number; blocking?: boolean }): GrupoFator {
  if (f.blocking) return "bloqueio";
  if (f.code === "SEM_HISTORICO") return "info"; // nota-base do cliente novo, não é mérito
  if (f.points < 0) return "contra";
  if (f.max_points > 0) return f.points * 2 < f.max_points ? "contra" : "favor";
  return "info";
}

/** Mesma regra do servidor (CheckCreditApproval): por que o limite não pode ser gravado, ou null. */
export function problemaDoLimite(a: {
  sugerido: number; maxSemAdmin: number; hardStop: boolean; isAdmin: boolean; valor: number; motivo: string;
}): string | null {
  if (!Number.isFinite(a.valor) || a.valor < 0) return "Informe o limite (zero ou mais).";
  if (Math.abs(a.valor * 100 - Math.round(a.valor * 100)) > 1e-6) return "O limite tem no máximo 2 casas decimais.";
  if (a.valor === a.sugerido) return null;
  if ([...a.motivo.trim()].length < 15) return "O valor é diferente do recomendado: escreva a justificativa (mínimo 15 caracteres).";
  if (a.isAdmin) return null;
  if (a.hardStop && a.valor > 0) return "O cliente caiu num bloqueio de crédito: só um administrador libera limite.";
  if (a.valor > a.maxSemAdmin) return `Acima de ${money(a.maxSemAdmin)} só um administrador aprova.`;
  return null;
}

/** "R$ 1.000,00 abaixo do recomendado (−20%)"; null quando igual. */
export function comparadoAoRecomendado(valor: number, sugerido: number): string | null {
  const d = valor - sugerido;
  if (!Number.isFinite(d) || Math.abs(d) < 0.005) return null;
  const pct = sugerido > 0 ? ` (${d > 0 ? "+" : "−"}${Math.abs((d / sugerido) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)` : "";
  return `${money(Math.abs(d))} ${d > 0 ? "acima" : "abaixo"} do recomendado${pct}`;
}

/** Dias até a data (meio-dia local), negativo se já passou. */
export function diasAte(s: string, hoje = new Date()): number {
  const alvo = new Date(`${s.slice(0, 10)}T12:00:00`);
  const meioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12);
  return Math.round((alvo.getTime() - meioDia.getTime()) / 86_400_000);
}
