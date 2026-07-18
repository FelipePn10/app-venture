import { useState, useCallback, useEffect } from "react";
import {
  type RestrictionDTO, type RestrictionOperator, OPERATORS,
  listRestrictions, createRestriction, deleteRestriction, evaluateRestriction,
} from "@/services/configuratorService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: RestrictionDTO = { name: "", attribute: "", operator: "==", value: "" };

export function Vpro0800Page(): JSX.Element {
  const [list, setList] = useState<RestrictionDTO[]>([]);
  const [form, setForm] = useState<RestrictionDTO>(EMPTY);
  const [evalId, setEvalId] = useState<number | "">("");
  const [ctx, setCtx] = useState('{\n  "cor": "azul"\n}');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listRestrictions()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar restrições.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof RestrictionDTO>(k: K, v: RestrictionDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  async function salvar() {
    if (!form.name.trim() || !form.attribute.trim()) { setFeedback({ type: "error", message: "Nome e atributo são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await createRestriction(form); setForm(EMPTY); setFeedback({ type: "success", message: "Restrição criada." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function remover(id: number) {
    setBusy(true); setFeedback(null);
    try { await deleteRestriction(id); await reload(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function avaliar() {
    if (evalId === "") { setFeedback({ type: "error", message: "Selecione a restrição." }); return; }
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(ctx); } catch { setFeedback({ type: "error", message: "Contexto não é um JSON válido." }); return; }
    setBusy(true); setFeedback(null);
    try { const r = await evaluateRestriction(Number(evalId), parsed); setFeedback({ type: "info", message: `Resultado: ${JSON.stringify(r)}` }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Produção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Restrições e Configurador</span><span className="erp-crumb-code">VPRO0800</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={() => { setForm(EMPTY); setFeedback(null); }} disabled={busy}>+ Nova</button>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : "Salvar"}</button></div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VPRO0800 — Restrições e Configurador" filename="vpro0800" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Restrições e Configurador</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Regra</div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c4"><label className="erp-label erp-req">Nome</label><input className="erp-input" value={form.name} onChange={(e) => setF("name", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Atributo</label><input className="erp-input" value={form.attribute} placeholder="cor, tensao..." onChange={(e) => setF("attribute", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Operador</label>
              <select className="erp-input" value={form.operator} onChange={(e) => setF("operator", e.target.value as RestrictionOperator)}>
                {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
            <div className="erp-field erp-c3"><label className="erp-label">Valor</label><input className="erp-input" value={form.value} placeholder="azul  ou  azul,verde (IN)" onChange={(e) => setF("value", e.target.value)} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Restrições — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>#</th><th>Nome</th><th>Atributo</th><th>Operador</th><th>Valor</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma restrição.</td></tr>}
              {list.map((r) => (
                <tr key={r.id}><td>{r.id}</td><td style={{ fontWeight: 600 }}>{r.name}</td><td>{r.attribute}</td>
                  <td><span className="erp-badge erp-badge-gray">{r.operator}</span></td><td>{r.value}</td>
                  <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => r.id && void remover(r.id)}>Excluir</button></td></tr>
              ))}
            </tbody>
          </table>
        </div></div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Avaliar — <span style={{fontWeight:400,opacity:0.65}}>contexto em JSON</span></div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c4"><label className="erp-label">Restrição</label>
              <select className="erp-input" value={evalId} onChange={(e) => setEvalId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">— selecione —</option>
                {list.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void avaliar()} disabled={busy}>Avaliar</button></div>
            <div className="erp-field erp-c12"><label className="erp-label">Contexto (JSON)</label>
              <textarea className="erp-textarea" rows={4} value={ctx} onChange={(e) => setCtx(e.target.value)} /></div>
          
        </div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Restrições: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
