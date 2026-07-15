import { useState, useCallback } from "react";
import { listPasswordChangeRequests, requestPasswordChange, approvePasswordChange, rejectPasswordChange, completePasswordChange } from "@/services/passwordChangeService";
import { errMessage, parseStr, parseNum, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

/** VUSR0100 — Solicitações de Troca de Senha (solicitar → aprovar → concluir/rejeitar). */
export function Vusr0100Page(): JSX.Element {
  const [rows, setRows] = useState<Obj[]>([]);
  const [reason, setReason] = useState("");
  const [comp, setComp] = useState({ id: "", current: "", nova: "", confirm: "" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = () => run(async () => { setRows(await listPasswordChangeRequests()); });
  const solicitar = () => run(async () => { if (!reason.trim()) { setFeedback({ type: "error", message: "Informe o motivo." }); return; } await requestPasswordChange(reason.trim()); setReason(""); setRows(await listPasswordChangeRequests()); setFeedback({ type: "success", message: "Solicitação criada." }); });
  const aprovar = (id: number) => run(async () => { await approvePasswordChange(id); setRows(await listPasswordChangeRequests()); setFeedback({ type: "success", message: `Solicitação ${id} aprovada.` }); });
  const rejeitar = (id: number) => run(async () => { await rejectPasswordChange(id); setRows(await listPasswordChangeRequests()); setFeedback({ type: "success", message: `Solicitação ${id} rejeitada.` }); });
  const concluir = () => run(async () => {
    const id = Number(comp.id); if (!id) { setFeedback({ type: "error", message: "Informe o id da solicitação." }); return; }
    if (comp.nova !== comp.confirm) { setFeedback({ type: "error", message: "Nova senha e confirmação não conferem." }); return; }
    await completePasswordChange(id, comp.current, comp.nova, comp.confirm); setComp({ id: "", current: "", nova: "", confirm: "" }); setRows(await listPasswordChangeRequests());
    setFeedback({ type: "success", message: "Troca concluída." });
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Cadastros &amp; Plataforma</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Solicitações de Troca de Senha</span><span className="erp-crumb-code">VUSR0100</span>
        </nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{rows.length} solicitação(ões)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Solicitações</span><button className="erp-btn erp-btn-dark" onClick={carregar} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VUSR0100 — Troca de Senha" filename="vusr0100" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Solicitações</span><span className="erp-count">{rows.length}</span></div>
            <div className="erp-list">
              {rows.length === 0 && <div className="erp-list-empty">Clique em <strong>Carregar</strong>.</div>}
              {rows.map((r, i) => { const id = parseNum(r, "id", "ID", "request_id"); const st = parseStr(r, "status", "Status"); return (
                <div key={i} className="erp-list-row" style={{ cursor: "default" }}>
                  <span className="erp-list-code">#{id}</span><span className="erp-list-sub">{parseStr(r, "reason", "Reason") || "—"} · {st}</span>
                  <div className="erp-list-meta" style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    <button className="erp-btn erp-btn-sm" onClick={() => aprovar(id)} disabled={busy}>Aprovar</button>
                    <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => rejeitar(id)} disabled={busy}>Rejeitar</button>
                  </div>
                </div>
              ); })}
            </div>
          </aside>
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Solicitar / concluir</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset"><div className="erp-fieldset-head">Nova solicitação</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c9"><label className="erp-label erp-req">Motivo</label><input className="erp-input" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
                <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={solicitar} disabled={busy}>Solicitar</button></div>
              </div></div>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Concluir troca (após aprovação)</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Solicitação (id)</label><input className="erp-input num" type="number" value={comp.id} onChange={(e) => setComp((c) => ({ ...c, id: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Senha atual</label><input className="erp-input" type="password" value={comp.current} onChange={(e) => setComp((c) => ({ ...c, current: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Nova senha</label><input className="erp-input" type="password" value={comp.nova} onChange={(e) => setComp((c) => ({ ...c, nova: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Confirmar</label><input className="erp-input" type="password" value={comp.confirm} onChange={(e) => setComp((c) => ({ ...c, confirm: e.target.value }))} /></div>
                <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={concluir} disabled={busy}>Concluir troca</button></div>
              </div></div>
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar"><div className="erp-status-item">Solicitações: <strong>{rows.length}</strong></div><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}
