import { useCallback, useEffect, useState } from "react";
import { textoDeBuscaDosItens } from "@/services/lookups";

/**
 * Apelidos de busca dos itens (código anterior, do fornecedor, referência do
 * fabricante, GTIN, atributos livres) para as grades que filtram documentos
 * pelo item: quem procura a OF pelo código antigo do item também a acha.
 * Carrega ao abrir a tela; a lista é a mesma memória dos seletores de item.
 */
export function useBuscaDosItens(): (codigo?: string | number | null) => string {
  const [mapa, setMapa] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let vivo = true;
    void textoDeBuscaDosItens().then((m) => { if (vivo) setMapa(m); });
    return () => { vivo = false; };
  }, []);
  return useCallback((codigo) => (codigo == null ? "" : mapa.get(String(codigo)) ?? ""), [mapa]);
}
