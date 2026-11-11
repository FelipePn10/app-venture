import { useState } from "react";
import { errMessage } from "@/services/fiscalShared";
import { inutilizarNumeracao } from "@/services/nfeService";
import { confirmar } from "@/components/ui/dialogos";

/*
 * Inutilizar faixa de numeração da NF-e de saída (VFIS0200): números que não vão
 * ser usados (pulados, notas rejeitadas). Não se desfaz. Era a rotina VFIS0620.
 */
export function InutilizacaoPanel({ onFeedback, onFeito }: { onFeedback: (f: { type: "success" | "error"; message: string } | null) => void; onFeito: () => void }): JSX.Element {
  const [f, setF] = useState({ serie: "1", ini: "", fim: "", just: "" });
  const [busy, setBusy] = useState(false);
  const enviar = async () => {
    const serie = Number(f.serie), ini = Number(f.ini), fim = Number(f.fim || f.ini), just = f.just.trim();
    if (!Number.isInteger(serie) || !Number.isInteger(ini) || ini <= 0 || fim < ini) { onFeedback({ type: "error", message: "Informe a série e a faixa (número final igual ou maior que o inicial)." }); return; }
    if (just.length < 15 || just.length > 255) { onFeedback({ type: "error", message: "A justificativa tem de ter entre 15 e 255 caracteres (exigência da SEFAZ)." }); return; }
    const faixa = ini === fim ? `nº ${ini}` : `nº ${ini} a ${fim}`;
    if (!(await confirmar({ titulo: "Inutilizar numeração", mensagem: "A SEFAZ registra a inutilização e ela não pode ser desfeita.", assunto: `Série ${serie}, ${faixa}`, rotulo: "Inutilizar", tom: "perigo" }))) return;
    setBusy(true); onFeedback(null);
    try { await inutilizarNumeracao({ serie, numero_inicial: ini, numero_final: fim, justificativa: just }); onFeedback({ type: "success", message: `Numeração inutilizada: série ${serie}, ${faixa}.` }); onFeito(); }
    catch (e) { onFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  };
  return (
    <div className="erp-fieldset"><div className="erp-fieldset-head">Inutilizar numeração</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Série</label><input className="erp-input num" inputMode="numeric" value={f.serie} onChange={(e) => setF((x) => ({ ...x, serie: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Número inicial</label><input className="erp-input num" inputMode="numeric" value={f.ini} onChange={(e) => setF((x) => ({ ...x, ini: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Número final</label><input className="erp-input num" inputMode="numeric" placeholder="= inicial" value={f.fim} onChange={(e) => setF((x) => ({ ...x, fim: e.target.value }))} /></div>
      <div className="erp-field erp-c6"><label className="erp-label erp-req">Justificativa</label><input className="erp-input" maxLength={255} placeholder="15 a 255 caracteres" value={f.just} onChange={(e) => setF((x) => ({ ...x, just: e.target.value }))} /></div>
      <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-danger" onClick={() => void enviar()} disabled={busy}>Inutilizar</button></div>
    </div></div>
  );
}
