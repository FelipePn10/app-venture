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
          <span className="fsc-screen-title">VFIS0320 — Parâmetros ICMS/IPI</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Novo Parâmetro</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0320 — Parâmetros ICMS/IPI" filename="vfis0320" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Dados</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">{editId !== null ? `Editando #${editId}` : "Forneça NCM ou Item, nunca ambos"}</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">UF</label>
              <input className="fsc-input" maxLength={2} value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase())} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">NCM</label>
              <input className="fsc-input" value={form.ncm_code ?? ""} onChange={(e) => setF("ncm_code", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Código Item</label>
              <input className="fsc-input fsc-input-right" type="number" value={form.item_code ?? ""} onChange={(e) => setF("item_code", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Tipo Operação</label>
              <select className="fsc-select" value={form.operation_type} onChange={(e) => setF("operation_type", e.target.value as OperationType)}>
                {OPS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">% ICMS Contrib.</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.icms_pct_contrib} onChange={(e) => setF("icms_pct_contrib", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">% ICMS Não-Contrib.</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.icms_pct_non_contrib} onChange={(e) => setF("icms_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">CST Contrib.</label>
              <input className="fsc-input" value={form.cst_icms_contrib} onChange={(e) => setF("cst_icms_contrib", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">CST Não-Contrib.</label>
              <input className="fsc-input" value={form.cst_icms_non_contrib} onChange={(e) => setF("cst_icms_non_contrib", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Parâmetros</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>#</th><th>UF</th><th>NCM / Item</th><th>Operação</th><th className="fsc-num">% Contrib.</th><th className="fsc-num">% Não-Contrib.</th><th>CST</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={8} className="fsc-empty">Nenhum parâmetro cadastrado.</td></tr>}
              {list.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td><td style={{ fontWeight: 600 }}>{p.uf}</td>
                  <td>{p.ncm_code || (p.item_code ? `Item ${p.item_code}` : "—")}</td>
                  <td>{p.operation_type}</td>
                  <td className="fsc-num">{p.icms_pct_contrib}</td><td className="fsc-num">{p.icms_pct_non_contrib}</td>
                  <td>{p.cst_icms_contrib}/{p.cst_icms_non_contrib}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => edit(p)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Parâmetros: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
