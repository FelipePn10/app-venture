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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VPRO0800 — Restrições e Configurador</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={() => { setForm(EMPTY); setFeedback(null); }} disabled={busy}>+ Nova</button>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : "Salvar"}</button></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VPRO0800 — Restrições e Configurador" filename="vpro0800" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Regra</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-4"><label className="fsc-label fsc-label-req">Nome</label><input className="fsc-input" value={form.name} onChange={(e) => setF("name", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Atributo</label><input className="fsc-input" value={form.attribute} placeholder="cor, tensao..." onChange={(e) => setF("attribute", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Operador</label>
              <select className="fsc-select" value={form.operator} onChange={(e) => setF("operator", e.target.value as RestrictionOperator)}>
                {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Valor</label><input className="fsc-input" value={form.value} placeholder="azul  ou  azul,verde (IN)" onChange={(e) => setF("value", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Restrições</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>#</th><th>Nome</th><th>Atributo</th><th>Operador</th><th>Valor</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhuma restrição.</td></tr>}
              {list.map((r) => (
                <tr key={r.id}><td>{r.id}</td><td style={{ fontWeight: 600 }}>{r.name}</td><td>{r.attribute}</td>
                  <td><span className="fsc-pill fsc-pill-gray">{r.operator}</span></td><td>{r.value}</td>
                  <td><button className="fsc-action-btn fsc-delete-btn" onClick={() => r.id && void remover(r.id)}>Excluir</button></td></tr>
              ))}
            </tbody>
          </table>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Avaliar</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">contexto em JSON</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Restrição</label>
              <select className="fsc-select" value={evalId} onChange={(e) => setEvalId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">— selecione —</option>
                {list.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void avaliar()} disabled={busy}>Avaliar</button></div>
            <div className="fsc-field fsc-col-12"><label className="fsc-label">Contexto (JSON)</label>
              <textarea className="fsc-textarea" rows={4} value={ctx} onChange={(e) => setCtx(e.target.value)} /></div>
          </div>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Restrições: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
