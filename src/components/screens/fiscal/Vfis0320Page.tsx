import { useState, useCallback, useEffect } from "react";
import {
  type ParametroIcmsIpi, type ParametroIcmsIpiDTO, type OperationType,
  listParametrosIcmsIpi, createParametroIcmsIpi, updateParametroIcmsIpi,
} from "@/services/fiscalSupportService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const OPS: OperationType[] = ["AMBAS", "ENTRADA", "SAIDA", "CUSTOS"];
const EMPTY: ParametroIcmsIpiDTO = {
  uf: "", ncm_code: "", item_code: undefined, operation_type: "SAIDA",
  icms_pct_contrib: 0, icms_pct_non_contrib: 0, cst_icms_contrib: "00", cst_icms_non_contrib: "00",
};

export function Vfis0320Page(): JSX.Element {
  const [form, setForm] = useState<ParametroIcmsIpiDTO>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [list, setList] = useState<ParametroIcmsIpi[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listParametrosIcmsIpi(false)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar parâmetros.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof ParametroIcmsIpiDTO>(k: K, v: ParametroIcmsIpiDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() { setForm(EMPTY); setEditId(null); setFeedback(null); }
  function edit(p: ParametroIcmsIpi) {
    setForm({ id: p.id, uf: p.uf, ncm_code: p.ncm_code ?? "", item_code: p.item_code, operation_type: p.operation_type,
      icms_pct_contrib: p.icms_pct_contrib, icms_pct_non_contrib: p.icms_pct_non_contrib,
      cst_icms_contrib: p.cst_icms_contrib, cst_icms_non_contrib: p.cst_icms_non_contrib });
    setEditId(p.id); setFeedback(null);
  }

  async function salvar() {
    if (!form.uf.trim()) { setFeedback({ type: "error", message: "UF é obrigatória." }); return; }
    if (!!form.ncm_code?.trim() === !!form.item_code) { setFeedback({ type: "error", message: "Forneça NCM OU código de item (nunca ambos)." }); return; }
    setBusy(true); setFeedback(null);
    const payload: ParametroIcmsIpiDTO = {
      ...form, ncm_code: form.ncm_code?.trim() || undefined,
      item_code: form.item_code || undefined,
    };
    try {
      if (editId !== null) { await updateParametroIcmsIpi({ ...payload, id: editId }); setFeedback({ type: "success", message: `Parâmetro #${editId} atualizado.` }); }
      else { await createParametroIcmsIpi(payload); setFeedback({ type: "success", message: "Parâmetro cadastrado." }); }
      novo(); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Parâmetros ICMS/IPI</span><span className="erp-crumb-code">VFIS0320</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo Parâmetro</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0320 — Parâmetros ICMS/IPI" filename="vfis0320" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Parâmetros ICMS</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Dados  — <span style={{fontWeight:400,opacity:0.65}}>{editId !== null ? `Editando #${editId}` : "Forneça NCM ou Item, nunca ambos"}</span></div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label erp-req">UF</label>
              <input className="erp-input" maxLength={2} value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase())} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">NCM</label>
              <input className="erp-input" value={form.ncm_code ?? ""} onChange={(e) => setF("ncm_code", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Código Item</label>
              <input className="erp-input num" type="number" value={form.item_code ?? ""} onChange={(e) => setF("item_code", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="erp-field erp-c4"><label className="erp-label">Tipo Operação</label>
              <select className="erp-input" value={form.operation_type} onChange={(e) => setF("operation_type", e.target.value as OperationType)}>
                {OPS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
            <div className="erp-field erp-c3"><label className="erp-label">% ICMS Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_pct_contrib} onChange={(e) => setF("icms_pct_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">% ICMS Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_pct_non_contrib} onChange={(e) => setF("icms_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">CST Contrib.</label>
              <input className="erp-input" value={form.cst_icms_contrib} onChange={(e) => setF("cst_icms_contrib", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">CST Não-Contrib.</label>
              <input className="erp-input" value={form.cst_icms_non_contrib} onChange={(e) => setF("cst_icms_non_contrib", e.target.value)} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Parâmetros — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>#</th><th>UF</th><th>NCM / Item</th><th>Operação</th><th>% Contrib.</th><th>% Não-Contrib.</th><th>CST</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum parâmetro cadastrado.</td></tr>}
              {list.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td><td style={{ fontWeight: 600 }}>{p.uf}</td>
                  <td>{p.ncm_code || (p.item_code ? `Item ${p.item_code}` : "—")}</td>
                  <td>{p.operation_type}</td>
                  <td>{p.icms_pct_contrib}</td><td>{p.icms_pct_non_contrib}</td>
                  <td>{p.cst_icms_contrib}/{p.cst_icms_non_contrib}</td>
                  <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(p)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Parâmetros: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
