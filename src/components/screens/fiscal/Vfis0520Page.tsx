import { useState, useCallback, useEffect } from "react";
import {
  type CodigoAjusteIcmsDTO, type TabelaAjusteRef,
  listAjustesIcms, createAjusteIcms, updateAjusteIcms,
} from "@/services/fiscalSupportService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const TABS: TabelaAjusteRef[] = ["5.2", "5.3", "5.6", "5.7"];
const EMPTY: CodigoAjusteIcmsDTO = { uf: "", code: "", description: "", table_ref: "5.2", valid_from: today() };

export function Vfis0520Page(): JSX.Element {
  const [form, setForm] = useState<CodigoAjusteIcmsDTO>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [list, setList] = useState<CodigoAjusteIcmsDTO[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listAjustesIcms(false)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar códigos de ajuste.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof CodigoAjusteIcmsDTO>(k: K, v: CodigoAjusteIcmsDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() { setForm({ ...EMPTY, valid_from: today() }); setEditId(null); setFeedback(null); }
  function edit(c: CodigoAjusteIcmsDTO) { setForm({ ...c }); setEditId(c.id ?? null); setFeedback(null); }

  async function salvar() {
    if (!form.code.trim() || !form.uf.trim() || !form.description.trim()) { setFeedback({ type: "error", message: "Código, UF e Descrição são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editId !== null) { await updateAjusteIcms({ ...form, id: editId }); setFeedback({ type: "success", message: `Código ${form.code} atualizado.` }); }
      else { await createAjusteIcms(form); setFeedback({ type: "success", message: `Código ${form.code} cadastrado.` }); }
      novo(); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Códigos de Ajuste ICMS (5.2/5.3/5.6/5.7)</span><span className="erp-crumb-code">VFIS0520</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo Código</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0520 — Códigos de Ajuste ICMS (5.2/5.3/5.6/5.7)" filename="vfis0520" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Códigos de Ajuste ICMS</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Dados  — <span style={{fontWeight:400,opacity:0.65}}>Chave única (UF, código, tabela)</span></div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Código</label>
              <input className="erp-input" value={form.code} placeholder="SP20000100" onChange={(e) => setF("code", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">UF</label>
              <input className="erp-input" maxLength={2} value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase())} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Tabela</label>
              <select className="erp-input" value={form.table_ref} onChange={(e) => setF("table_ref", e.target.value as TabelaAjusteRef)}>
                {TABS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label">Vigência</label>
              <input className="erp-input" type="date" value={(form.valid_from ?? "").slice(0, 10)} onChange={(e) => setF("valid_from", e.target.value)} /></div>
            <div className="erp-field erp-c12"><label className="erp-label erp-req">Descrição</label>
              <input className="erp-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Códigos — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Código</th><th>UF</th><th>Tabela</th><th>Descrição</th><th>Ativo</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum código cadastrado.</td></tr>}
              {list.map((c) => (
                <tr key={c.id ?? `${c.uf}-${c.code}-${c.table_ref}`}>
                  <td style={{ fontWeight: 600 }}>{c.code}</td><td>{c.uf}</td><td><span className="erp-badge erp-badge-gray">{c.table_ref}</span></td><td>{c.description}</td>
                  <td>{c.is_active === false ? <span className="erp-badge err">Não</span> : <span className="erp-badge ok">Sim</span>}</td>
                  <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(c)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Códigos: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
