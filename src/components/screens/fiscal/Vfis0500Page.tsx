import { useState, useCallback, useEffect } from "react";
import {
  type MotivoDapiDTO,
  listMotivosDapi, createMotivoDapi, updateMotivoDapi,
} from "@/services/fiscalSupportService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: MotivoDapiDTO = { code: "", reason: "", destination: "", valid_from: today() };

export function Vfis0500Page(): JSX.Element {
  const [form, setForm] = useState<MotivoDapiDTO>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<MotivoDapiDTO[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listMotivosDapi(false)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar motivos DAPI.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof MotivoDapiDTO>(k: K, v: MotivoDapiDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() { setForm({ ...EMPTY, valid_from: today() }); setEditing(false); setFeedback(null); }
  function edit(m: MotivoDapiDTO) { setForm({ ...m }); setEditing(true); setFeedback(null); }

  async function salvar() {
    if (!form.code.trim() || !form.reason.trim()) { setFeedback({ type: "error", message: "Código e Motivo são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editing) { await updateMotivoDapi(form); setFeedback({ type: "success", message: `Motivo ${form.code} atualizado.` }); }
      else { await createMotivoDapi(form); setFeedback({ type: "success", message: `Motivo ${form.code} cadastrado.` }); }
      novo(); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Motivos de Transferência DAPI</span><span className="erp-crumb-code">VFIS0500</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo Motivo</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editing ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0500 — Motivos de Transferência DAPI" filename="vfis0500" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Motivos de Transferência D</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Dados  — <span style={{fontWeight:400,opacity:0.65}}>{editing ? `Editando ${form.code}` : "Novo"}</span></div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label>
              <input className="erp-input" value={form.code} disabled={editing} placeholder="01" onChange={(e) => setF("code", e.target.value)} /></div>
            <div className="erp-field erp-c6"><label className="erp-label erp-req">Motivo</label>
              <input className="erp-input" value={form.reason} onChange={(e) => setF("reason", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Destino (UF)</label>
              <input className="erp-input" maxLength={2} value={form.destination ?? ""} onChange={(e) => setF("destination", e.target.value.toUpperCase())} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Vigência</label>
              <input className="erp-input" type="date" value={(form.valid_from ?? "").slice(0, 10)} onChange={(e) => setF("valid_from", e.target.value)} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Motivos — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th style={{ width: 80 }}>Código</th><th>Motivo</th><th>Destino</th><th>Vigência</th><th>Ativo</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum motivo cadastrado.</td></tr>}
              {list.map((m) => (
                <tr key={m.code}>
                  <td style={{ fontWeight: 600 }}>{m.code}</td><td>{m.reason}</td><td>{m.destination || "—"}</td>
                  <td>{(m.valid_from ?? "").slice(0, 10) || "—"}</td>
                  <td>{m.is_active === false ? <span className="erp-badge err">Não</span> : <span className="erp-badge ok">Sim</span>}</td>
                  <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(m)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Motivos: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
