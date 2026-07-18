import { useState, useCallback, useEffect } from "react";
import {
  type PlanoConta, type PlanoContaDTO, type PlanoTipo, type PlanoNatureza,
  listPlanoContas, createPlanoConta,
} from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const TIPOS: PlanoTipo[] = ["RECEITA", "DESPESA", "ATIVO", "PASSIVO", "PATRIMONIO"];
const EMPTY: PlanoContaDTO = { codigo: "", descricao: "", tipo: "RECEITA", natureza: "CREDITO", parent_code: "", nivel: 1 };

export function Vfin0120Page(): JSX.Element {
  const [form, setForm] = useState<PlanoContaDTO>(EMPTY);
  const [list, setList] = useState<PlanoConta[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listPlanoContas()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar plano de contas.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof PlanoContaDTO>(k: K, v: PlanoContaDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  async function salvar() {
    if (!form.codigo.trim() || !form.descricao.trim()) { setFeedback({ type: "error", message: "Código e Descrição são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const nivel = form.codigo.split(".").length;
      await createPlanoConta({ ...form, nivel, parent_code: form.parent_code?.trim() || undefined });
      setFeedback({ type: "success", message: `Conta ${form.codigo} cadastrada.` });
      setForm(EMPTY); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Plano de Contas</span><span className="erp-crumb-code">VFIN0120</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={() => { setForm(EMPTY); setFeedback(null); }} disabled={busy}>+ Nova Conta</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIN0120 — Plano de Contas" filename="plano-de-contas" disabled={busy} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Plano de Contas</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Dados</div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label>
              <input className="erp-input" value={form.codigo} placeholder="3.1.01" onChange={(e) => setF("codigo", e.target.value)} /></div>
            <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label>
              <input className="erp-input" value={form.descricao} onChange={(e) => setF("descricao", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Código Pai</label>
              <input className="erp-input" value={form.parent_code ?? ""} placeholder="3.1" onChange={(e) => setF("parent_code", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Tipo</label>
              <select className="erp-input" value={form.tipo} onChange={(e) => setF("tipo", e.target.value as PlanoTipo)}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label">Natureza</label>
              <select className="erp-input" value={form.natureza} onChange={(e) => setF("natureza", e.target.value as PlanoNatureza)}>
                <option value="CREDITO">CRÉDITO</option><option value="DEBITO">DÉBITO</option></select></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Plano de contas — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Código</th><th>Descrição</th><th>Tipo</th><th>Natureza</th><th>Nível</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma conta cadastrada.</td></tr>}
              {list.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, paddingLeft: 12 + (c.nivel ?? 1) * 8 }}>{c.codigo}</td>
                  <td>{c.descricao}</td><td><span className="erp-badge erp-badge-gray">{c.tipo}</span></td>
                  <td>{c.natureza}</td><td>{c.nivel ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Contas: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
