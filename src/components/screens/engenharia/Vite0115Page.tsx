import { useState, useCallback } from "react";
import { type ModificadorPDM, listarModificadores, criarModificador, atualizarModificador } from "@/services/pdmService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

export function Vite0115Page(): JSX.Element {
  const [mods, setMods] = useState<ModificadorPDM[]>([]);
  const [form, setForm] = useState({ id: 0, description: "" });
  const [editing, setEditing] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = () => run(async () => { setMods(await listarModificadores()); });
  const limpar = () => { setForm({ id: 0, description: "" }); setEditing(false); };
  const selecionar = (m: ModificadorPDM) => { setForm({ id: m.id ?? 0, description: m.description }); setEditing(true); };

  const salvar = () => run(async () => {
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    if (editing) {
      await atualizarModificador(form.id, form.description.trim());
      setFeedback({ type: "success", message: `Modificador ${form.id} atualizado.` });
    } else {
      const m = await criarModificador(form.description.trim());
      setFeedback({ type: "success", message: `Modificador ${m.id ?? ""} criado.` });
    }
    setMods(await listarModificadores());
    limpar();
  });

  const filtrados = filtro.trim()
    ? mods.filter((m) => String(m.id).includes(filtro) || m.description.toLowerCase().includes(filtro.toLowerCase()))
    : mods;

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VITE0115 — Cadastro de Modificadores (PDM)</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Modificadores</span>
          <button className="fsc-btn fsc-btn-primary" onClick={carregar} disabled={busy}>Listar</button>
          <button className="fsc-btn fsc-btn-ghost" onClick={limpar} disabled={busy}>Novo</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Filtrar</span>
          <input className="fsc-input" style={{ width: 180, height: 32 }} placeholder="id ou descrição" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VITE0115 — Modificadores PDM" filename="vite0115" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">{editing ? `Editar modificador ${form.id}` : "Novo modificador"}</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">o modificador é global (não pertence a um grupo); o id é gerado</span></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Id</label><input className="fsc-input fsc-input-right" value={editing ? form.id : "—"} disabled /></div>
          <div className="fsc-field fsc-col-8"><label className="fsc-label fsc-label-req">Descrição</label><input className="fsc-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={salvar} disabled={busy}>{editing ? "Atualizar" : "Criar"}</button></div>
        </div></div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Modificadores cadastrados ({filtrados.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Id</th><th>Descrição</th><th></th></tr></thead>
            <tbody>
              {filtrados.length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhum modificador. Clique em Listar.</td></tr>}
              {filtrados.map((m) => (
                <tr key={m.id} className={editing && form.id === m.id ? "fsc-row-selected" : ""}>
                  <td className="fsc-num" style={{ fontWeight: 600 }}>{m.id}</td><td>{m.description}</td>
                  <td><button className="fsc-btn fsc-btn-ghost" onClick={() => selecionar(m)} disabled={busy}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Modificadores: <strong>{mods.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
