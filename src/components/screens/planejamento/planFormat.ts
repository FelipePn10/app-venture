import { enumLabel } from "@/utils/enumLabels";

/**
 * Peças comuns das telas de planejamento e produção (MRP, ordens planejadas,
 * CRP, APS, pipeline, exceções e OF). Cada tela repetia o próprio "run com
 * busy e feedback", o próprio cabeçalho de bloco e a própria formatação de
 * data — e cada uma formatava diferente (2026-10-17 numa, 17/10/2026 noutra).
 */

export type Feedback = { type: "success" | "error" | "info"; message: string } | null;
export type Tom = "ok" | "info" | "warn" | "danger" | "muted";

// ── Formatação pt-BR ──────────────────────────────────────────────────────────

/**
 * Datas "só dia" chegam como meia-noite UTC (2026-10-17T00:00:00Z). Converter
 * isso para o fuso local mostrava 16/10 — um dia antes. O dia é lido do texto.
 */
export function data(iso?: string | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
export function dataHora(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
/**
 * Hora de relógio da fábrica gravada sem fuso. O MRP reserva as máquinas em
 * hora local e a API devolve esse valor com "Z" no fim; converter para o fuso
 * do navegador mostrava o término três horas antes. Lê os dígitos como estão.
 */
export function dataHoraRelogio(iso?: string | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}, ${m[4]}:${m[5]}` : dataHora(iso);
}
export function num(n?: number | null, casas = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}
export function horas(n?: number | null): string {
  if (n === null || n === undefined) return "—";
  return `${num(n, 1)} h`;
}
/** Minutos em texto curto: 334,8 → "5 h 35 min". */
export function duracao(minutos?: number | null): string {
  if (!minutos || minutos <= 0) return "—";
  const h = Math.floor(minutos / 60), m = Math.round(minutos % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
export function pct(n?: number | null): string {
  if (n === null || n === undefined) return "—";
  return `${num(n, 1)}%`;
}
/** Dia (YYYY-MM-DD) de hoje no fuso do processo, para comparar com datas "só dia". */
export function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const diaISO = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");
/** Sem acento e minúsculo: a busca "solda" acha "SOLDA" e "Sólda". */
export function normalizar(t: unknown): string {
  return String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// ── Rótulos de domínio ────────────────────────────────────────────────────────

/** O MRP grava o tipo em português (FABRICACAO/COMPRA) e a ordem planejada em inglês. */
const TIPO_ORDEM: Record<string, string> = {
  FABRICACAO: "Fabricação", PRODUCTION: "Fabricação",
  COMPRA: "Compra", PURCHASE: "Compra",
  TERCEIRIZACAO: "Terceirização", OUTSOURCING: "Terceirização",
};
export const tipoOrdem = (t?: string) => (t ? TIPO_ORDEM[t] ?? enumLabel(t) : "—");
export const ehFabricacao = (t?: string) => t === "FABRICACAO" || t === "PRODUCTION";
export const ehCompra = (t?: string) => t === "COMPRA" || t === "PURCHASE";

const TIPO_DEMANDA: Record<string, string> = {
  INDEPENDENT_DEMAND: "Demanda independente", INDEPENDENT: "Demanda independente", INDEPENDENTE: "Demanda independente",
  DEPENDENTE: "Dependente (estrutura)", DEPENDENT: "Dependente (estrutura)",
  SALES_ORDER: "Pedido de venda", FORECAST: "Previsão de vendas", SAFETY_STOCK: "Estoque de segurança",
  REPLENISHMENT: "Reposição", INTER_FACTORY: "Inter-fábrica",
};
export const tipoDemanda = (t?: string) => (t ? TIPO_DEMANDA[t] ?? enumLabel(t) : "—");

const SITUACAO_PLANEJADA: Record<string, { rotulo: string; tom: Tom }> = {
  PLANNED: { rotulo: "Planejada", tom: "info" },
  RELEASED: { rotulo: "Liberada", tom: "ok" },
  CANCELLED: { rotulo: "Cancelada", tom: "muted" },
  COMPLETED: { rotulo: "Concluída", tom: "ok" },
};
/** Ordem planejada firme é liberada com datas travadas: a situação diz as duas coisas. */
export function situacaoPlanejada(status?: string, firme?: boolean): { rotulo: string; tom: Tom } {
  if (firme && status === "RELEASED") return { rotulo: "Firme", tom: "ok" };
  return status ? SITUACAO_PLANEJADA[status] ?? { rotulo: enumLabel(status), tom: "muted" } : { rotulo: "—", tom: "muted" };
}

export const SITUACAO_OF: Record<string, { rotulo: string; tom: Tom }> = {
  OPEN: { rotulo: "Aberta", tom: "info" },
  IN_PROGRESS: { rotulo: "Em produção", tom: "warn" },
  COMPLETED: { rotulo: "Concluída", tom: "ok" },
  CLOSED: { rotulo: "Encerrada", tom: "muted" },
  CANCELLED: { rotulo: "Cancelada", tom: "danger" },
};
export const situacaoOF = (s?: string) => (s ? SITUACAO_OF[s] ?? { rotulo: enumLabel(s), tom: "muted" as Tom } : { rotulo: "—", tom: "muted" as Tom });
