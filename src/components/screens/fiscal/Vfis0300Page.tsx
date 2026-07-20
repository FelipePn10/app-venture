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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">CFOPs / Naturezas de Operação</span><span className="erp-crumb-code">VFIS0300</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{list.length} CFOP(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Cadastro</span><button className="erp-btn erp-btn-primary" onClick={novo} disabled={busy}>+ Novo CFOP</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Ações</span><button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editing ? "Atualizar" : "Salvar"}</button></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VFIS0300 — CFOPs / Naturezas de Operação" filename="vfis0300" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">CFOPs</button></div>
          <div className="erp-detail-body">
            <div className="erp-fieldset"><div className="erp-fieldset-head">{editing ? `Editando CFOP ${form.code}` : "Novo CFOP"}</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input num" type="number" value={form.code || ""} disabled={editing} onChange={(e) => setF("code", Number(e.target.value))} /></div>
              <div className="erp-field erp-c10"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
              <div className="erp-field erp-c4"><label className="erp-label">Utilização</label><select className="erp-input" value={form.utilization} onChange={(e) => setF("utilization", e.target.value as CfopUtilization)}>{UTIL.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
              <div className="erp-field erp-c4"><label className="erp-label">Ind. Operação</label><select className="erp-input" value={form.ind_operacao} onChange={(e) => setF("ind_operacao", e.target.value as CfopIndOperacao)}>{IND.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
              <div className="erp-field erp-c4"><label className="erp-label">Tipo Utilização</label><select className="erp-input" value={form.tipo_utilizacao} onChange={(e) => setF("tipo_utilizacao", e.target.value as CfopTipoUtil)}>{TIPO.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
              <div className="erp-field erp-c3"><label className="erp-label">DIFAL</label><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={form.difal} onChange={(e) => setF("difal", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">{form.difal ? "Sim" : "Não"}</span></div></div>
              <div className="erp-field erp-c3"><label className="erp-label">Doação</label><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={form.doacao} onChange={(e) => setF("doacao", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">{form.doacao ? "Sim" : "Não"}</span></div></div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">CFOPs ({list.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th style={{ width: 80 }}>Código</th><th>Descrição</th><th>Utilização</th><th>DIFAL</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                <tbody>
                  {list.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum CFOP cadastrado.</td></tr>}
                  {list.map((c) => (
                    <tr key={c.code}>
                      <td style={{ fontWeight: 600 }}>{c.code}</td><td>{c.description}</td><td>{c.utilization}</td>
                      <td>{c.difal ? <span className="erp-badge info">Sim</span> : <span className="erp-badge">Não</span>}</td>
                      <td><button className="erp-btn erp-btn-sm" onClick={() => edit(c)}>Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div></div>
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">CFOPs: <strong>{list.length}</strong></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
