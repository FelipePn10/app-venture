import { openErpScreenWindow } from "@/utils/windowManager";

/** Formatação e navegação comuns das telas de gestão. */
export const reais = (v?: number) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const abrirTela = (codigo: string) => { if (codigo) void openErpScreenWindow(codigo); };
/** Primeiro dia do mês corrente e hoje (AAAA-MM-DD), no fuso local. */
export function periodoDoMes(): { de: string; ate: string } {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return { de: `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`, ate: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` };
}
export function diasAtras(dias: number): string {
  const d = new Date(); d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
