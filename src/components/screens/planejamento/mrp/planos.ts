import type { ProductionPlanDTO } from "@/services/productionPlanService";
import { enumLabel } from "@/utils/enumLabels";

export function demandasIndependentes(v?: string): string {
  return v === "ALL" ? "Todas" : v === "NO" ? "Não considera" : v === "FROM_DATE" ? "A partir de uma data" : v ? enumLabel(v) : "—";
}

export function abrangenciaDo(p: ProductionPlanDTO): string {
  if (p.order_item_code) return `Item de ordem ${p.order_item_code}`;
  if (p.classification) return `Classificação ${p.classification}${p.class_item_codes ? ` (${p.class_item_codes})` : ""}`;
  return "Todos os itens";
}
