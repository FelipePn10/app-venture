import { enumLabel } from "@/utils/enumLabels";
import type { Tom } from "../planFormat";

/** Os cinco tipos de mensagem do MRP, com o que o planejador faz em cada um. */
const TIPOS_EXCECAO: Record<string, { rotulo: string; tom: Tom }> = {
  EXPEDITE: { rotulo: "Acelerar", tom: "danger" },
  RESCHEDULE_IN: { rotulo: "Antecipar", tom: "danger" },
  RESCHEDULE_OUT: { rotulo: "Postergar", tom: "warn" },
  CANCEL: { rotulo: "Cancelar ordem", tom: "warn" },
  EXCESS_PROJECTED: { rotulo: "Excesso de estoque", tom: "warn" },
};
export const tipoExcecao = (t: string) => TIPOS_EXCECAO[t]?.rotulo ?? enumLabel(t);
/** Mensagens que pedem ação imediata ficam em vermelho; excesso e cancelamento, em amarelo. */
export function tomDaExcecao(tipo: string): Tom {
  const conhecido = TIPOS_EXCECAO[tipo];
  if (conhecido) return conhecido.tom;
  const t = tipo.toUpperCase();
  if (/LATE|OVERDUE|PAST|SHORT|OVERLOAD|CYCLE/.test(t)) return "danger";
  if (/EXCESS|CANCEL|RESCHEDULE/.test(t)) return "warn";
  return "info";
}
