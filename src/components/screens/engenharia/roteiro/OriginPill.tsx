import { enumLabel } from "@/utils/enumLabels";

/** Onde a operação corre: verde na fábrica, âmbar externa, azul terceiros. */
export function OriginPill({ origem }: { origem?: string }): JSX.Element {
  const cls = origem === "INTERNA" ? "erp-badge-green" : origem === "EXTERNA" ? "erp-badge-amber" : "erp-badge-blue";
  return <span className={`erp-badge ${cls}`}>{enumLabel(origem ?? "INTERNA")}</span>;
}
