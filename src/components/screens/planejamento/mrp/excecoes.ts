import { enumLabel } from "@/utils/enumLabels";
import type { Tom } from "../planFormat";

/**
 * Os tipos de mensagem do MRP, com o que o planejador faz em cada um.
 * FIRM_FENCE: a sugestão precisava começar dentro do horizonte firme (VPLA0310)
 * e foi para o fim dele — só se trata (firmar à mão, acelerar, avisar).
 * DEMANDA_VENCIDA / DEMANDA_ATRASADA: demanda independente (VPLA0102) vencida
 * sem venda ou de finalidade atrasada — encerra-se o saldo da própria linha.
 * ITEM_NAO_PLANEJADO: o item tem falta, mas o cadastro o deixa fora da geração
 * de ordens (terceiro, projeto) — não sai sugestão; compre ou fabrique à mão.
 * INICIO_NO_PASSADO: a sugestão precisaria ter começado antes de hoje para
 * chegar na data pedida — vai atrasar se nada for feito.
 */
const TIPOS_EXCECAO: Record<string, { rotulo: string; tom: Tom }> = {
  EXPEDITE: { rotulo: "Acelerar", tom: "danger" },
  RESCHEDULE_IN: { rotulo: "Antecipar", tom: "danger" },
  RESCHEDULE_OUT: { rotulo: "Postergar", tom: "warn" },
  CANCEL: { rotulo: "Cancelar ordem", tom: "warn" },
  EXCESS_PROJECTED: { rotulo: "Excesso de estoque", tom: "warn" },
  FIRM_FENCE: { rotulo: "Horizonte firme", tom: "warn" },
  DEMANDA_VENCIDA: { rotulo: "Demanda vencida", tom: "warn" },
  DEMANDA_ATRASADA: { rotulo: "Demanda atrasada", tom: "danger" },
  ITEM_NAO_PLANEJADO: { rotulo: "Falta sem sugestão", tom: "danger" },
  INICIO_NO_PASSADO: { rotulo: "Início já vencido", tom: "danger" },
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
