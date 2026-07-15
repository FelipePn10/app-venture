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
  const selecionar = (g: GrupoPDM) => { setForm({ code: String(g.code), description: g.description, enterprise_id: String(g.enterprise_id ?? 1) }); setEditing(true); };
  const salvar = () => run(async () => {
    const code = Number(form.code);
    if (!code) { setFeedback({ type: "error", message: "Código do grupo é obrigatório (inteiro)." }); return; }
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    const ent = Number(form.enterprise_id) || 1;
    if (editing) { await atualizarGrupo(code, { description: form.description.trim(), enterprise_id: ent }); setFeedback({ type: "success", message: `Grupo ${code} atualizado.` }); }
    else { await criarGrupo({ code, description: form.description.trim(), enterprise_id: ent }); setFeedback({ type: "success", message: `Grupo ${code} criado.` }); }
    setGrupos(await listarGrupos()); limpar();
  });

  const filtrados = filtro.trim() ? grupos.filter((g) => String(g.code).includes(filtro) || g.description.toLowerCase().includes(filtro.toLowerCase())) : grupos;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Cadastro de Grupos (PDM)</span><span className="erp-crumb-code">VITE0114</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{grupos.length} grupo(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Grupos</span>
          <button className="erp-btn erp-btn-dark" onClick={carregar} disabled={busy}>{busy && <span className="erp-spin" />}Listar</button>
          <button className="erp-btn" onClick={limpar} disabled={busy}>Novo</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Filtrar</span><input className="erp-tinput" style={{ width: 180 }} placeholder="código ou descrição" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VITE0114 — Grupos PDM" filename="vite0114" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Grupos ({filtrados.length})</span><span className="erp-count">{grupos.length}</span></div>
            <div className="erp-list">
              {filtrados.length === 0 && <div className="erp-list-empty">Clique em <strong>Listar</strong>.</div>}
              {filtrados.map((g) => (
                <div key={g.code} className={`erp-list-row${editing && Number(form.code) === g.code ? " erp-row-sel" : ""}`} onClick={() => selecionar(g)}>
                  <span className="erp-list-code">#{g.code}</span><span className="erp-list-sub">{g.description} · empresa {g.enterprise_id ?? "—"}</span>
                </div>
              ))}
            </div>
          </aside>
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">{editing ? `Editar grupo ${form.code}` : "Novo grupo"}</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset"><div className="erp-fieldset-head">Grupo PDM (o código é informado e imutável; sem exclusão no backend)</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input num" type="number" value={form.code} disabled={editing} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></div>
                <div className="erp-field erp-c7"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Empresa</label><input className="erp-input num" type="number" value={form.enterprise_id} onChange={(e) => setForm((f) => ({ ...f, enterprise_id: e.target.value }))} /></div>
                <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>{editing ? "Atualizar" : "Criar"}</button></div>
              </div></div>
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar"><div className="erp-status-item">Grupos: <strong>{grupos.length}</strong></div><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}
