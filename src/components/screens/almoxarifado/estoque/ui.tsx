import type React from "react";
import type { Feedback } from "./comum";

export function FeedbackBox({ feedback }: { feedback: Feedback }) {
  return feedback ? <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div> : null;
}

/** Selo da situação do estoque (ATP). */
export function SituacaoBadge({ situacao }: { situacao?: string }) {
  const s = situacao || "LIVRE";
  const cor = s === "LIVRE" ? "erp-badge-green" : s === "INSPECAO" ? "erp-badge-amber" : "erp-badge-red";
  const rotulo = s === "LIVRE" ? "Livre" : s === "INSPECAO" ? "Em inspeção" : "Bloqueado";
  return <span className={`erp-badge ${cor}`}>{rotulo}</span>;
}

/** Linha de resumo dentro do corpo da aba (o estilo da barra de status pinta o
 *  destaque de branco e ele sumia no fundo claro). */
export function Resumo({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 12.5, color: "var(--v-text, #1c2b22)" }}>{children}</span>;
}
