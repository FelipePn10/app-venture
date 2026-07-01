import { useState, useCallback, useEffect } from "react";
import {
  type LinhaApuracaoDTO, type LinhaApuracaoTipo,
  listLinhasApuracaoIcms, createLinhaApuracaoIcms, updateLinhaApuracaoIcms,
} from "@/services/fiscalSupportService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const TIPOS: LinhaApuracaoTipo[] = ["DEBITO", "CREDITO", "SALDO", "DEDUCAO", "OUTROS"];
const EMPTY: LinhaApuracaoDTO = { code: "", description: "", line_type: "CREDITO", accepts_entries: true, nature: "" };

export function Vfis0530Page(): JSX.Element {
  const [form, setForm] = useState<LinhaApuracaoDTO>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<LinhaApuracaoDTO[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listLinhasApuracaoIcms(false)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar linhas de apuração.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof LinhaApuracaoDTO>(k: K, v: LinhaApuracaoDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() { setForm(EMPTY); setEditing(false); setFeedback(null); }
  function edit(l: LinhaApuracaoDTO) { setForm({ ...l }); setEditing(true); setFeedback(null); }

  async function salvar() {
    if (!form.code.trim() || !form.description.trim()) { setFeedback({ type: "error", message: "Código e Descrição são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editing) { await updateLinhaApuracaoIcms(form); setFeedback({ type: "success", message: `Linha ${form.code} atualizada.` }); }
      else { await createLinhaApuracaoIcms(form); setFeedback({ type: "success", message: `Linha ${form.code} cadastrada.` }); }
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
          <span className="fsc-screen-title">VFIS0530 — Linhas de Apuração de ICMS (Bloco E)</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Nova Linha</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editing ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0530 — Linhas de Apuração de ICMS (Bloco E)" filename="vfis0530" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Dados</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">{editing ? `Editando ${form.code}` : "Nova"}</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Código</label>
              <input className="fsc-input" value={form.code} disabled={editing} placeholder="E110" onChange={(e) => setF("code", e.target.value)} /></div>
            <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Descrição</label>
              <input className="fsc-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo</label>
              <select className="fsc-select" value={form.line_type} onChange={(e) => setF("line_type", e.target.value as LinhaApuracaoTipo)}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Aceita lançamentos</label>
              <div className="fsc-toggle-row">
                <label className="fsc-toggle"><input type="checkbox" checked={!!form.accepts_entries} onChange={(e) => setF("accepts_entries", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label>
                <span className="fsc-toggle-label">{form.accepts_entries ? "Sim" : "Não"}</span></div></div>
            <div className="fsc-field fsc-col-12"><label className="fsc-label">Natureza</label>
              <input className="fsc-input" value={form.nature ?? ""} onChange={(e) => setF("nature", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Linhas</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th style={{ width: 80 }}>Código</th><th>Descrição</th><th>Tipo</th><th>Aceita lanç.</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhuma linha cadastrada.</td></tr>}
              {list.map((l) => (
                <tr key={l.code}>
                  <td style={{ fontWeight: 600 }}>{l.code}</td><td>{l.description}</td><td><span className="fsc-pill fsc-pill-gray">{l.line_type}</span></td>
                  <td>{l.accepts_entries ? "Sim" : "Não"}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => edit(l)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Linhas: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
