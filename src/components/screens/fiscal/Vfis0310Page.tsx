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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Dispositivos Legais</span><span className="erp-crumb-code">VFIS0310</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo Dispositivo</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editCode !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0310 — Dispositivos Legais" filename="vfis0310" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Dispositivos Legais</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Dados  — <span style={{fontWeight:400,opacity:0.65}}>{editCode !== null ? `Editando #${editCode}` : "Novo"}</span></div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label">Tipo</label>
              <select className="erp-input" value={form.type} onChange={(e) => { setForm((p) => ({ ...p, type: e.target.value as DispositivoTipo })); setFeedback(null); }}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="erp-field erp-c10"><label className="erp-label erp-req">Descrição</label>
              <input className="erp-input" value={form.description} placeholder="Art. 12 do Dec. 45.490/2000 — Isenção ICMS"
                onChange={(e) => { setForm((p) => ({ ...p, description: e.target.value })); setFeedback(null); }} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Dispositivos — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th style={{ width: 70 }}>Código</th><th style={{ width: 100 }}>Tipo</th><th>Descrição</th><th style={{ width: 80 }}>Ativo</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum dispositivo cadastrado.</td></tr>}
              {list.map((d) => (
                <tr key={d.code}>
                  <td style={{ fontWeight: 600 }}>{d.code}</td>
                  <td><span className="erp-badge erp-badge-gray">{d.type}</span></td>
                  <td>{d.description}</td>
                  <td>{d.is_active === false ? <span className="erp-badge err">Não</span> : <span className="erp-badge ok">Sim</span>}</td>
                  <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(d)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Dispositivos: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
