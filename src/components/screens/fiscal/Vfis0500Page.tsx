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
    <div className="fsc-root">
      <header className="fsc-topbar">
        <div className="fsc-topbar-left">
          <div className="fsc-logo">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
              <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>
          <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
          <span className="fsc-screen-title">VFIS0500 — Motivos de Transferência DAPI</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Novo Motivo</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editing ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0500 — Motivos de Transferência DAPI" filename="vfis0500" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Dados</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">{editing ? `Editando ${form.code}` : "Novo"}</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Código</label>
              <input className="fsc-input" value={form.code} disabled={editing} placeholder="01" onChange={(e) => setF("code", e.target.value)} /></div>
            <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Motivo</label>
              <input className="fsc-input" value={form.reason} onChange={(e) => setF("reason", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Destino (UF)</label>
              <input className="fsc-input" maxLength={2} value={form.destination ?? ""} onChange={(e) => setF("destination", e.target.value.toUpperCase())} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Vigência</label>
              <input className="fsc-input" type="date" value={(form.valid_from ?? "").slice(0, 10)} onChange={(e) => setF("valid_from", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Motivos</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th style={{ width: 80 }}>Código</th><th>Motivo</th><th>Destino</th><th>Vigência</th><th>Ativo</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhum motivo cadastrado.</td></tr>}
              {list.map((m) => (
                <tr key={m.code}>
                  <td style={{ fontWeight: 600 }}>{m.code}</td><td>{m.reason}</td><td>{m.destination || "—"}</td>
                  <td>{(m.valid_from ?? "").slice(0, 10) || "—"}</td>
                  <td>{m.is_active === false ? <span className="fsc-pill fsc-pill-red">Não</span> : <span className="fsc-pill fsc-pill-green">Sim</span>}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => edit(m)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Motivos: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
