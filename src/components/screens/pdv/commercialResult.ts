import { enumLabel } from "@/utils/enumLabels";

const LABELS: Record<string, string> = {
  commission_value: "Valor da comissão",
  discount_value: "Valor do desconto",
  freight_value: "Valor do frete",
  gross_value: "Valor bruto",
  net_value: "Valor líquido",
  requires_approval: "Exige aprovação",
  surcharge_value: "Valor do acréscimo",
};

export function commercialResultLabel(key: string): string {
  if (LABELS[key]) return LABELS[key];
  const upper = key.toUpperCase();
  const known = enumLabel(upper);
  return known !== upper ? known : key.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function commercialResultValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (value == null || value === "") return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function commercialCalculationLabel(value?: string): string {
  return ({ PERCENT: "Percentual", VALUE: "Valor fixo" } as Record<string, string>)[value ?? ""] ?? value ?? "—";
}
