import type { OpOrigin, OperationDTO, RouteOperationDTO, TimeUnit, TimeBasis } from "@/services/manufacturingRoutingService";
import { TIME_UNITS, TIME_BASES } from "@/services/manufacturingRoutingService";

export type Feedback = { type: "success" | "error" | "info"; message: string } | null;

/** 106,7987 → "106,80" — a tela mostra peças, não a precisão interna. */
export const pecas = (n: number | undefined, casas = 2): string =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })
    : "—";

/** Número para exibição sem casas inúteis: 0,5 / 12 / 0,0833. */
export const num = (n: number | undefined, max = 4): string =>
  typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("pt-BR", { maximumFractionDigits: max }) : "—";

/** Horas lidas como gente: 0,25 h → "15 min"; 2,5 h → "2 h 30". */
export function duracao(horas: number | undefined): string {
  if (typeof horas !== "number" || !Number.isFinite(horas) || horas <= 0) return "—";
  if (horas < 1 / 60) return `${num(horas * 3600, 0)} s`;
  if (horas < 1) return `${num(horas * 60, 1)} min`;
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export const rotuloUnidade = (u?: TimeUnit): string => TIME_UNITS.find((x) => x.value === u)?.label.toLowerCase() ?? "horas";
export const rotuloBase = (b?: TimeBasis, attr?: string): string => {
  if (b === "ATRIBUTO") return attr ? `por ${attr.toLowerCase()}` : "por atributo";
  return TIME_BASES.find((x) => x.value === b)?.label.toLowerCase() ?? "por peça";
};

/** Uma etapa que sai da fábrica corre em outro relógio e em outro CNPJ. */
export const ehTerceiro = (origem?: OpOrigin): boolean => origem === "EXTERNA" || origem === "TERCEIROS";


/**
 * Corpo completo do PUT da etapa. A gravação substitui todas as sobreposições:
 * campo que não vai no corpo volta a herdar da biblioteca. Por isso a edição
 * sempre parte da etapa como ela está e altera só o que a pessoa mexeu.
 */
export function payloadDaEtapa(ro: RouteOperationDTO): Partial<RouteOperationDTO> & { situation?: string } {
  return {
    work_center_id: ro.work_center_id,
    standard_time: ro.standard_time,
    setup_time: ro.setup_time,
    run_time: ro.run_time,
    labor_time: ro.labor_time,
    run_base_qty: ro.run_base_qty,
    queue_time: ro.queue_time,
    wait_time: ro.wait_time,
    move_time: ro.move_time,
    crew_size: ro.crew_size,
    time_unit: ro.time_unit,
    time_basis: ro.time_basis,
    time_basis_attribute: ro.time_basis === "ATRIBUTO" ? ro.time_basis_attribute : undefined,
    supplier_id: ro.supplier_id,
    service_item_code: ro.service_item_code,
    cost_per_unit: ro.cost_per_unit,
    lead_time_days: ro.lead_time_days,
    third_party_remittance: ro.third_party_remittance,
    scrap_pct: ro.scrap_pct,
    inspection_required: !!ro.inspection_required,
    situation: ro.situation || "APROVADA",
    notes: ro.notes,
  };
}

/** Valor herdado da biblioteca, para o placeholder do campo da etapa. */
export function herdado(op: OperationDTO | undefined, campo: keyof OperationDTO): string {
  if (!op) return "herda";
  const v = op[campo];
  if (v === undefined || v === null || v === "") return "herda";
  return `herda ${typeof v === "number" ? num(v) : String(v)}`;
}

export const SITUACOES_ETAPA = [
  { value: "APROVADA", label: "Ativa", hint: "Executada, entra em prazo, capacidade e custo." },
  { value: "FANTASMA", label: "Fantasma (documental)", hint: "Aparece no roteiro e na ordem, mas não é executada nem custa." },
  { value: "INATIVA", label: "Inativa", hint: "Fica no histórico; não entra em nada." },
];
