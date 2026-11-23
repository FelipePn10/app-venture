import { useAuthStore } from "@/store/authStore";
import { ambienteDoToken } from "@/services/ambienteSessao";

/**
 * Sessão no banco de TREINO (modo simulação): o aviso fica visível em todas as
 * telas, para ninguém lançar no treino achando que é a produção (nem o contrário).
 * Fixo e fora do grid das telas, para não ocupar linha do layout.
 */
export function TreinoBanner(): JSX.Element | null {
  const token = useAuthStore((s) => s.token);
  if (ambienteDoToken(token) !== "training") return null;
  return (
    <div role="status" aria-live="polite" style={{ position: "fixed", left: "50%", bottom: 36, transform: "translateX(-50%)", zIndex: 1900, background: "#b45309", color: "#fff", padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, letterSpacing: ".02em", boxShadow: "0 2px 10px rgba(0,0,0,.25)", pointerEvents: "none" }}>
      TREINO — cópia dos dados, sem valor fiscal. Nada aqui volta para a produção.
    </div>
  );
}
