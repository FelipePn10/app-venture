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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Linhas de Apuração de ICMS (Bloco E)</span><span className="erp-crumb-code">VFIS0530</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Nova Linha</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editing ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0530 — Linhas de Apuração de ICMS (Bloco E)" filename="vfis0530" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Linhas de Apuração de ICMS</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Dados  — <span style={{fontWeight:400,opacity:0.65}}>{editing ? `Editando ${form.code}` : "Nova"}</span></div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label>
              <input className="erp-input" value={form.code} disabled={editing} placeholder="E110" onChange={(e) => setF("code", e.target.value)} /></div>
            <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label>
              <input className="erp-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Tipo</label>
              <select className="erp-input" value={form.line_type} onChange={(e) => setF("line_type", e.target.value as LinhaApuracaoTipo)}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label">Aceita lançamentos</label>
              <div className="erp-toggle-row">
                <label className="erp-toggle"><input type="checkbox" checked={!!form.accepts_entries} onChange={(e) => setF("accepts_entries", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label>
                <span className="erp-toggle-label">{form.accepts_entries ? "Sim" : "Não"}</span></div></div>
            <div className="erp-field erp-c12"><label className="erp-label">Natureza</label>
              <input className="erp-input" value={form.nature ?? ""} onChange={(e) => setF("nature", e.target.value)} /></div>
          </div>
        </div>

        <div className="erp-fieldset-head">Linhas — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div>
        <div className="erp-fieldset"><div className="erp-fieldset-body">
          <table className="erp-grid">
            <thead><tr><th style={{ width: 80 }}>Código</th><th>Descrição</th><th>Tipo</th><th>Aceita lanç.</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma linha cadastrada.</td></tr>}
              {list.map((l) => (
                <tr key={l.code}>
                  <td style={{ fontWeight: 600 }}>{l.code}</td><td>{l.description}</td><td><span className="erp-badge erp-badge-gray">{l.line_type}</span></td>
                  <td>{l.accepts_entries ? "Sim" : "Não"}</td>
                  <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(l)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Linhas: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
