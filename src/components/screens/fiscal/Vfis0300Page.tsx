import { useState, useCallback, useEffect } from "react";
import {
  type Cfop, type CfopDTO, type CfopUtilization, type CfopIndOperacao, type CfopTipoUtil,
  listCfops, createCfop, updateCfop,
} from "@/services/fiscalSupportService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const UTIL: CfopUtilization[] = ["INDUSTRIALIZACAO_COMERCIO", "IMOBILIZADO", "USO_CONSUMO"];
const IND: CfopIndOperacao[] = ["NORMAL", "ENERGIA_ELETRICA", "TELECOMUNICACAO"];
const TIPO: CfopTipoUtil[] = ["NORMAL", "VENDA_COMERCIAL_EXPORTADORA", "COMPRA_FIM_ESPECIFICO_EXPORTACAO", "EXPORTACAO"];
const EMPTY: CfopDTO = {
  code: 0, description: "", utilization: "INDUSTRIALIZACAO_COMERCIO",
  ind_operacao: "NORMAL", tipo_utilizacao: "NORMAL", difal: false, doacao: false,
};

export function Vfis0300Page(): JSX.Element {
  const [form, setForm] = useState<CfopDTO>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<Cfop[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listCfops(false)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar CFOPs.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof CfopDTO>(k: K, v: CfopDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() { setForm(EMPTY); setEditing(false); setFeedback(null); }
  function edit(c: Cfop) { setForm({ ...c }); setEditing(true); setFeedback(null); }

  async function salvar() {
    if (!form.code || !form.description.trim()) { setFeedback({ type: "error", message: "Código e Descrição são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editing) { await updateCfop(form); setFeedback({ type: "success", message: `CFOP ${form.code} atualizado.` }); }
      else { await createCfop(form); setFeedback({ type: "success", message: `CFOP ${form.code} cadastrado.` }); }
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
          <span className="fsc-screen-title">VFIS0300 — CFOPs / Naturezas de Operação</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Novo CFOP</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editing ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0300 — CFOPs / Naturezas de Operação" filename="vfis0300" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Dados</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">{editing ? `Editando CFOP ${form.code}` : "Novo"}</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Código</label>
              <input className="fsc-input fsc-input-right" type="number" value={form.code || ""} disabled={editing} onChange={(e) => setF("code", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-10"><label className="fsc-label fsc-label-req">Descrição</label>
              <input className="fsc-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Utilização</label>
              <select className="fsc-select" value={form.utilization} onChange={(e) => setF("utilization", e.target.value as CfopUtilization)}>
                {UTIL.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Ind. Operação</label>
              <select className="fsc-select" value={form.ind_operacao} onChange={(e) => setF("ind_operacao", e.target.value as CfopIndOperacao)}>
                {IND.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Tipo Utilização</label>
              <select className="fsc-select" value={form.tipo_utilizacao} onChange={(e) => setF("tipo_utilizacao", e.target.value as CfopTipoUtil)}>
                {TIPO.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">DIFAL</label>
              <div className="fsc-toggle-row">
                <label className="fsc-toggle"><input type="checkbox" checked={form.difal} onChange={(e) => setF("difal", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label>
                <span className="fsc-toggle-label">{form.difal ? "Sim" : "Não"}</span></div></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Doação</label>
              <div className="fsc-toggle-row">
                <label className="fsc-toggle"><input type="checkbox" checked={form.doacao} onChange={(e) => setF("doacao", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label>
                <span className="fsc-toggle-label">{form.doacao ? "Sim" : "Não"}</span></div></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">CFOPs</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th style={{ width: 80 }}>Código</th><th>Descrição</th><th>Utilização</th><th>DIFAL</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhum CFOP cadastrado.</td></tr>}
              {list.map((c) => (
                <tr key={c.code}>
                  <td style={{ fontWeight: 600 }}>{c.code}</td><td>{c.description}</td><td>{c.utilization}</td>
                  <td>{c.difal ? <span className="fsc-pill fsc-pill-blue">Sim</span> : <span className="fsc-pill fsc-pill-gray">Não</span>}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => edit(c)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">CFOPs: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
