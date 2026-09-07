import { useEffect } from "react";

/**
 * Fecha um painel modal com Esc.
 *
 * Num ERP de mesa o usuário vem do teclado: abre a consulta, olha e sai. Ter de
 * caçar o botão "Fechar" com o mouse quebra esse ritmo — e é o que acontecia em
 * todos os painéis da engenharia.
 */
export function useEscapeToClose(onClose: () => void): void {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onClose]);
}
