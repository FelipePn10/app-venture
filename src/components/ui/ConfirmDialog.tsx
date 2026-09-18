import { useEffect, useRef } from "react";

/**
 * Confirmação em tela, no lugar de `window.confirm`.
 *
 * O diálogo do navegador não cabe explicação, não diz de qual sistema veio e,
 * dentro do Tauri, aparece com a cara do sistema operacional — o usuário vê uma
 * caixa estranha e clica em OK sem ler. Aqui dá para dizer o que vai acontecer
 * e mostrar QUAL registro será afetado, que é o que evita desativar o errado.
 */
export function ConfirmDialog({
  aberto, titulo, mensagem, assunto, rotuloConfirmar = "Confirmar", tom = "aviso",
  onConfirmar, onCancelar,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  /** O registro afetado, mostrado em destaque para conferência. */
  assunto?: string;
  rotuloConfirmar?: string;
  tom?: "aviso" | "neutro";
  onConfirmar: () => void;
  onCancelar: () => void;
}): JSX.Element | null {
  const confirmarRef = useRef<HTMLButtonElement>(null);

  // Esc cancela e o foco começa no botão de confirmar — quem usa o sistema o dia
  // inteiro não tira a mão do teclado.
  useEffect(() => {
    if (!aberto) return;
    confirmarRef.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === "Escape") onCancelar(); };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, onCancelar]);

  if (!aberto) return null;

  return (
    <div
      className="fsc-confirm-backdrop"
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancelar(); }}
    >
      <div className={`fsc-confirm ${tom === "aviso" ? "aviso" : ""}`} role="alertdialog" aria-modal="true" aria-label={titulo}>
        <div className="fsc-confirm-head">
          <span className="fsc-confirm-ico" aria-hidden="true">{tom === "aviso" ? "⚠️" : "❔"}</span>
          {titulo}
        </div>
        <div className="fsc-confirm-body">
          {mensagem}
          {assunto && <span className="fsc-confirm-subject">{assunto}</span>}
        </div>
        <div className="fsc-confirm-foot">
          <button className="erp-btn" onClick={onCancelar}>Cancelar</button>
          <button ref={confirmarRef} className="erp-btn erp-btn-primary" onClick={onConfirmar}>{rotuloConfirmar}</button>
        </div>
      </div>
    </div>
  );
}
