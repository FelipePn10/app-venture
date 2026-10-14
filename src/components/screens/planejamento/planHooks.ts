import { useCallback, useState } from "react";
import { errMessage } from "@/services/fiscalShared";
import type { Feedback } from "./planFormat";

/** Executa uma ação da tela com indicador de ocupado e mensagem de erro legível. */
export function useAcao() {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  return { busy, feedback, setFeedback, run };
}

/** Seleção múltipla de linhas por chave. */
export function useSelecao<K extends string | number>() {
  const [sel, setSel] = useState<Set<K>>(new Set());
  const alternar = useCallback((k: K) => setSel((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; }), []);
  const definir = useCallback((ks: K[]) => setSel(new Set(ks)), []);
  const limpar = useCallback(() => setSel(new Set()), []);
  return { sel, alternar, definir, limpar };
}
