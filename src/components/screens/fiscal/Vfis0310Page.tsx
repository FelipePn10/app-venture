import { useState, useCallback, useEffect } from "react";
import {
  type DispositivoLegal, type DispositivoLegalDTO, type DispositivoTipo,
  listDispositivosLegais, createDispositivoLegal, updateDispositivoLegal,
} from "@/services/fiscalSupportService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const TIPOS: DispositivoTipo[] = ["ICMS", "IPI", "LAUDO", "PIS", "COFINS"];
const EMPTY: DispositivoLegalDTO = { type: "ICMS", description: "" };

export function Vfis0310Page(): JSX.Element {
  const [form, setForm] = useState<DispositivoLegalDTO>(EMPTY);
  const [editCode, setEditCode] = useState<number | null>(null);
  const [list, setList] = useState<DispositivoLegal[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listDispositivosLegais(false)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar dispositivos legais.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  function novo() { setForm(EMPTY); setEditCode(null); setFeedback(null); }
  function edit(d: DispositivoLegal) { setForm({ code: d.code, type: d.type, description: d.description }); setEditCode(d.code); setFeedback(null); }

  async function salvar() {
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editCode !== null) { await updateDispositivoLegal({ ...form, code: editCode }); setFeedback({ type: "success", message: `Dispositivo ${editCode} atualizado.` }); }
      else { await createDispositivoLegal(form); setFeedback({ type: "success", message: "Dispositivo legal cadastrado." }); }
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
          <span className="fsc-screen-title">VFIS0310 — Dispositivos Legais</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Novo Dispositivo</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editCode !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0310 — Dispositivos Legais" filename="vfis0310" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Dados</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">{editCode !== null ? `Editando #${editCode}` : "Novo"}</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo</label>
              <select className="fsc-select" value={form.type} onChange={(e) => { setForm((p) => ({ ...p, type: e.target.value as DispositivoTipo })); setFeedback(null); }}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="fsc-field fsc-col-10"><label className="fsc-label fsc-label-req">Descrição</label>
              <input className="fsc-input" value={form.description} placeholder="Art. 12 do Dec. 45.490/2000 — Isenção ICMS"
                onChange={(e) => { setForm((p) => ({ ...p, description: e.target.value })); setFeedback(null); }} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Dispositivos</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th style={{ width: 70 }}>Código</th><th style={{ width: 100 }}>Tipo</th><th>Descrição</th><th style={{ width: 80 }}>Ativo</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhum dispositivo cadastrado.</td></tr>}
              {list.map((d) => (
                <tr key={d.code}>
                  <td style={{ fontWeight: 600 }}>{d.code}</td>
                  <td><span className="fsc-pill fsc-pill-gray">{d.type}</span></td>
                  <td>{d.description}</td>
                  <td>{d.is_active === false ? <span className="fsc-pill fsc-pill-red">Não</span> : <span className="fsc-pill fsc-pill-green">Sim</span>}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => edit(d)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Dispositivos: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
