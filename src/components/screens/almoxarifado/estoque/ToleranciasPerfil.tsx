import { useCallback, useEffect, useState } from "react";
import { excluirToleranciaPerfil, listarToleranciasPerfil, salvarToleranciaPerfil, type ToleranciaPerfilDTO } from "@/services/stockService";
import { useAcao } from "./comum";
import { FeedbackBox } from "./ui";

/**
 * Até quanto cada perfil de acesso fecha um inventário sem passar pela aprovação.
 * Acima do limite vai à alçada, mesmo em inventário sem aprovação.
 */
export function ToleranciasPerfil() {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lista, setLista] = useState<ToleranciaPerfilDTO[]>([]);
  const carregar = useCallback(() => run(async () => { setLista(await listarToleranciasPerfil()); }), [run]);
  useEffect(() => { void carregar(); }, [carregar]);
  const mudar = (id: number, k: "max_document_value" | "max_line_value", v: string) =>
    setLista((l) => l.map((t) => (t.profile_id === id ? { ...t, [k]: v } : t)));
  const salvar = (t: ToleranciaPerfilDTO) => run(async () => {
    if (!t.max_document_value.trim() && !t.max_line_value.trim()) {
      await excluirToleranciaPerfil(t.profile_id);
      setFeedback({ type: "success", message: `Limite de ${t.profile_name} removido.` });
      return;
    }
    await salvarToleranciaPerfil(t);
    setFeedback({ type: "success", message: `Limite de ${t.profile_name} salvo.` });
  });
  return (
    <div className="erp-fieldset"><div className="erp-fieldset-head">Limite de ajuste de inventário por perfil</div><div className="erp-fieldset-body">
      <FeedbackBox feedback={feedback} />
      <div className="erp-field erp-c12"><table className="erp-grid">
        <thead><tr><th>Perfil</th><th className="num">Por inventário (R$)</th><th className="num">Por linha (R$)</th><th></th></tr></thead>
        <tbody>
          {lista.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum perfil ativo. Cadastre em Perfis de acesso.</td></tr>}
          {lista.map((t) => (
            <tr key={t.profile_id}>
              <td>{t.profile_name}</td>
              <td className="num"><input className="erp-input num" value={t.max_document_value} onChange={(e) => mudar(t.profile_id, "max_document_value", e.target.value)} /></td>
              <td className="num"><input className="erp-input num" value={t.max_line_value} onChange={(e) => mudar(t.profile_id, "max_line_value", e.target.value)} /></td>
              <td><button className="erp-btn erp-btn-sm" onClick={() => void salvar(t)} disabled={busy}>Salvar</button></td>
            </tr>
          ))}
        </tbody>
      </table><span className="erp-field-hint">Vazio nos dois remove o limite. Com mais de um perfil, vale o maior.</span></div>
    </div></div>
  );
}
