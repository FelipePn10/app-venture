import { useState, useCallback, useEffect } from "react";
import {
  type CodigoAjusteApuracaoDTO,
  listAjustesApuracaoIcms, createAjusteApuracaoIcms, updateAjusteApuracaoIcms,
} from "@/services/fiscalSupportService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: CodigoAjusteApuracaoDTO = { code: "", uf: "", description: "", valid_from: today() };

export function Vfis0510Page(): JSX.Element {
  const [form, setForm] = useState<CodigoAjusteApuracaoDTO>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [list, setList] = useState<CodigoAjusteApuracaoDTO[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listAjustesApuracaoIcms(false)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar códigos de ajuste.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof CodigoAjusteApuracaoDTO>(k: K, v: CodigoAjusteApuracaoDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() { setForm({ ...EMPTY, valid_from: today() }); setEditId(null); setFeedback(null); }
  function edit(c: CodigoAjusteApuracaoDTO) { setForm({ ...c }); setEditId(c.id ?? null); setFeedback(null); }

  async function salvar() {
    if (!form.code.trim() || !form.uf.trim() || !form.description.trim()) { setFeedback({ type: "error", message: "Código, UF e Descrição são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editId !== null) { await updateAjusteApuracaoIcms({ ...form, id: editId }); setFeedback({ type: "success", message: `Código ${form.code} atualizado.` }); }
      else { await createAjusteApuracaoIcms(form); setFeedback({ type: "success", message: `Código ${form.code} cadastrado.` }); }
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
          <span className="fsc-screen-title">VFIS0510 — Códigos de Ajuste de Apuração ICMS (5.1.1)</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Novo Código</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0510 — Códigos de Ajuste de Apuração ICMS (5.1.1)" filename="vfis0510" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Dados</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">Par (código, UF) é único</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Código</label>
              <input className="fsc-input" value={form.code} placeholder="SP10000000" onChange={(e) => setF("code", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">UF</label>
              <input className="fsc-input" maxLength={2} value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase())} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Vigência</label>
              <input className="fsc-input" type="date" value={(form.valid_from ?? "").slice(0, 10)} onChange={(e) => setF("valid_from", e.target.value)} /></div>
            <div className="fsc-field fsc-col-12"><label className="fsc-label fsc-label-req">Descrição</label>
              <input className="fsc-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Códigos</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>Código</th><th>UF</th><th>Descrição</th><th>Vigência</th><th>Ativo</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhum código cadastrado.</td></tr>}
              {list.map((c) => (
                <tr key={c.id ?? `${c.code}-${c.uf}`}>
                  <td style={{ fontWeight: 600 }}>{c.code}</td><td>{c.uf}</td><td>{c.description}</td>
                  <td>{(c.valid_from ?? "").slice(0, 10) || "—"}</td>
                  <td>{c.is_active === false ? <span className="fsc-pill fsc-pill-red">Não</span> : <span className="fsc-pill fsc-pill-green">Sim</span>}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => edit(c)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Códigos: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
