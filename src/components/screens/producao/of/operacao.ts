import type { MaterialAvailabilityStatus } from "@/services/productionOrderService";
import type { Tom } from "../../planejamento/planFormat";

/** Situação da etapa do roteiro na OF. */
export const OPERACAO: Record<string, { rotulo: string; tom: Tom }> = {
  PENDING: { rotulo: "Pendente", tom: "muted" }, IN_PROGRESS: { rotulo: "Em andamento", tom: "warn" },
  PAUSED: { rotulo: "Pausada", tom: "info" }, INTERRUPTED: { rotulo: "Interrompida", tom: "danger" },
  DONE: { rotulo: "Concluída", tom: "ok" }, SKIPPED: { rotulo: "Dispensada", tom: "muted" },
};

/** Situação de disponibilidade de material da OF (faltas antes de liberar). */
export const SITUACAO_FALTA: Record<MaterialAvailabilityStatus, { rotulo: string; tom: Tom }> = {
  COMPLETA: { rotulo: "Material disponível", tom: "ok" },
  PARCIAL: { rotulo: "Falta parcial", tom: "warn" },
  SEM_SALDO: { rotulo: "Sem material", tom: "danger" },
  SEM_LISTA: { rotulo: "Sem lista de materiais", tom: "muted" },
};

