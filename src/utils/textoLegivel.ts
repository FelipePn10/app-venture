/**
 * Valor estruturado em texto para quem lê a tela: nunca JSON. Cada chave vira um
 * rótulo ("horizon_days" → "Horizon days") e as listas viram itens separados.
 */
export function textoLegivel(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (typeof valor === "number") return valor.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
  if (Array.isArray(valor)) return valor.length ? valor.map(textoLegivel).join("; ") : "—";
  if (typeof valor === "object") {
    const partes = Object.entries(valor as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([chave, v]) => `${rotuloDaChave(chave)}: ${textoLegivel(v)}`);
    return partes.length ? partes.join(" · ") : "—";
  }
  return String(valor);
}

function rotuloDaChave(chave: string): string {
  const texto = chave.replace(/_/g, " ").trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
