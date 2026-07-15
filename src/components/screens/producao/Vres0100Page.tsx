import { useState, useCallback } from "react";
import { type RestrictionReason, listRestrictionReasons, createRestrictionReason, updateRestrictionReason, deleteRestrictionReason } from "@/services/restrictionReasonService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: RestrictionReason = { description: "", situation: "ATIVO" };

export function Vres0100Page(): JSX.Element {
  const [list, setList] = useState<RestrictionReason[]>([]);
  const [form, setForm] = useState<RestrictionReason>({ ...EMPTY });
  const [editCode, setEditCode] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = () => run(async () => { setList(await listRestrictionReasons()); });
  const novo = () => { setForm({ ...EMPTY }); setEditCode(null); };
  const selecionar = (r: RestrictionReason) => { setForm({ ...r }); setEditCode(r.code ?? null); };
  const salvar = () => run(async () => {
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    if (editCode) { await updateRestrictionReason(editCode, form); setFeedback({ type: "success", message: `Motivo ${editCode} atualizado.` }); }
    else { await createRestrictionReason(form); setFeedback({ type: "success", message: "Motivo criado." }); }
    setList(await listRestrictionReasons()); novo();
  });
  const remover = (code?: number) => { if (!code) return; void run(async () => { await deleteRestrictionReason(code); setList(await listRestrictionReasons()); novo(); }); };

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Produção</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Motivos de Restrição</span><span className="erp-crumb-code">VRES0100</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">apoio das Restrições (VPRO0800)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Motivos</span>
          <button className="erp-btn erp-btn-dark" onClick={carregar} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button>
          <button className="erp-btn" onClick={novo} disabled={busy}>Novo</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VRES0100 — Motivos de Restrição" filename="vres0100" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Motivos</span><span className="erp-count">{list.length}</span></div>
            <div className="erp-list">
              {list.length === 0 && <div className="erp-list-empty">Clique em <strong>Carregar</strong>.</div>}
              {list.map((r) => (
                <div key={r.code} className={`erp-list-row${editCode === r.code ? " erp-row-sel" : ""}`} onClick={() => selecionar(r)}>
                  <span className="erp-list-code">#{r.code}</span><span className="erp-list-sub">{r.description} · {r.situation}</span>
                  <div className="erp-list-meta"><button className="erp-btn erp-btn-danger erp-btn-sm" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); remover(r.code); }} disabled={busy}>Excluir</button></div>
                </div>
              ))}
            </div>
          </aside>
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">{editCode ? `Editar motivo ${editCode}` : "Novo motivo"}</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Motivo de restrição</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c8"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Situação</label><select className="erp-input" value={form.situation} onChange={(e) => setForm((f) => ({ ...f, situation: e.target.value }))}><option value="ATIVO">ATIVO</option><option value="INATIVO">INATIVO</option></select></div>
                  <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>{editCode ? "Atualizar" : "Criar"}</button></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Motivos: <strong>{list.length}</strong></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
