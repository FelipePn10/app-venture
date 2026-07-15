import { useState, useCallback } from "react";
import { type GrupoPDM, listarGrupos, criarGrupo, atualizarGrupo } from "@/services/pdmService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

export function Vite0114Page(): JSX.Element {
  const [grupos, setGrupos] = useState<GrupoPDM[]>([]);
  const [form, setForm] = useState({ code: "", description: "", enterprise_id: "1" });
  const [editing, setEditing] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = () => run(async () => { setGrupos(await listarGrupos()); });
  const limpar = () => { setForm({ code: "", description: "", enterprise_id: "1" }); setEditing(false); };

  const selecionar = (g: GrupoPDM) => {
    setForm({ code: String(g.code), description: g.description, enterprise_id: String(g.enterprise_id ?? 1) });
    setEditing(true);
  };

  const salvar = () => run(async () => {
    const code = Number(form.code);
    if (!code) { setFeedback({ type: "error", message: "Código do grupo é obrigatório (inteiro)." }); return; }
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    const ent = Number(form.enterprise_id) || 1;
    if (editing) {
      await atualizarGrupo(code, { description: form.description.trim(), enterprise_id: ent });
      setFeedback({ type: "success", message: `Grupo ${code} atualizado.` });
    } else {
      await criarGrupo({ code, description: form.description.trim(), enterprise_id: ent });
      setFeedback({ type: "success", message: `Grupo ${code} criado.` });
    }
    setGrupos(await listarGrupos());
    limpar();
  });

  const filtrados = filtro.trim()
    ? grupos.filter((g) => String(g.code).includes(filtro) || g.description.toLowerCase().includes(filtro.toLowerCase()))
    : grupos;

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VITE0114 — Cadastro de Grupos (PDM)</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Grupos</span>
          <button className="fsc-btn fsc-btn-primary" onClick={carregar} disabled={busy}>Listar</button>
          <button className="fsc-btn fsc-btn-ghost" onClick={limpar} disabled={busy}>Novo</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Filtrar</span>
          <input className="fsc-input" style={{ width: 180, height: 32 }} placeholder="código ou descrição" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VITE0114 — Grupos PDM" filename="vite0114" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">{editing ? `Editar grupo ${form.code}` : "Novo grupo"}</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">o código é informado e não muda; sem exclusão no backend</span></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Código</label><input className="fsc-input fsc-input-right" type="number" value={form.code} disabled={editing} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Descrição</label><input className="fsc-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Empresa</label><input className="fsc-input fsc-input-right" type="number" value={form.enterprise_id} onChange={(e) => setForm((f) => ({ ...f, enterprise_id: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={salvar} disabled={busy}>{editing ? "Atualizar" : "Criar"}</button></div>
        </div></div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Grupos cadastrados ({filtrados.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Código</th><th>Descrição</th><th className="fsc-num">Empresa</th><th></th></tr></thead>
            <tbody>
              {filtrados.length === 0 && <tr><td colSpan={4} className="fsc-empty">Nenhum grupo. Clique em Listar.</td></tr>}
              {filtrados.map((g) => (
                <tr key={g.code} className={editing && Number(form.code) === g.code ? "fsc-row-selected" : ""}>
                  <td className="fsc-num" style={{ fontWeight: 600 }}>{g.code}</td><td>{g.description}</td><td className="fsc-num">{g.enterprise_id ?? "—"}</td>
                  <td><button className="fsc-btn fsc-btn-ghost" onClick={() => selecionar(g)} disabled={busy}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Grupos: <strong>{grupos.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
