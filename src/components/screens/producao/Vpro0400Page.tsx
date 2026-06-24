import { useState, useCallback, useEffect } from "react";
import {
  type InspectionPointDTO, type InspectionType, type InspectionResultDTO, type InspectionVerdict,
  INSPECTION_TYPES, VERDICTS,
  listInspectionPoints, createInspectionPoint, addInspectionResult, listInspectionResults,
} from "@/services/qualityService";
import { errMessage, type Obj, parseStr, parseNum } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const TYPE_LABEL: Record<InspectionType, string> = { RECEIVING: "Recebimento", IN_PROCESS: "Em processo", FINAL: "Final" };
const EMPTY_POINT: InspectionPointDTO = { name: "", type: "IN_PROCESS", item_code: undefined, description: "" };
const EMPTY_RESULT: InspectionResultDTO = { verdict: "APROVADO", quantity_inspected: 0, quantity_approved: 0, quantity_rejected: 0, observation: "" };

function verdictPill(v: string): JSX.Element {
  const x = v.toUpperCase();
  const cls = x.includes("APROV") ? "fsc-pill-green" : x.includes("REPROV") ? "fsc-pill-red" : "fsc-pill-amber";
  return <span className={`fsc-pill ${cls}`}>{v || "—"}</span>;
}

export function Vpro0400Page(): JSX.Element {
  const [points, setPoints] = useState<InspectionPointDTO[]>([]);
  const [form, setForm] = useState<InspectionPointDTO>(EMPTY_POINT);
  const [selected, setSelected] = useState<InspectionPointDTO | null>(null);
  const [results, setResults] = useState<Obj[]>([]);
  const [resForm, setResForm] = useState<InspectionResultDTO>(EMPTY_RESULT);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setPoints(await listInspectionPoints()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar pontos de inspeção.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof InspectionPointDTO>(k: K, v: InspectionPointDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  const setR = <K extends keyof InspectionResultDTO>(k: K, v: InspectionResultDTO[K]) => setResForm((p) => ({ ...p, [k]: v }));

  async function salvarPonto() {
    if (!form.name.trim()) { setFeedback({ type: "error", message: "Nome do ponto é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    try { await createInspectionPoint(form); setForm(EMPTY_POINT); setFeedback({ type: "success", message: "Ponto de inspeção criado." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function abrir(p: InspectionPointDTO) {
    if (!p.id) return;
    setSelected(p); setResForm(EMPTY_RESULT); setBusy(true); setFeedback(null);
    try { setResults(await listInspectionResults(p.id)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function lancarLaudo() {
    if (!selected?.id) return;
    setBusy(true); setFeedback(null);
    try { await addInspectionResult(selected.id, resForm); setResForm(EMPTY_RESULT); setResults(await listInspectionResults(selected.id)); setFeedback({ type: "success", message: "Laudo registrado." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VPRO0400 — Qualidade (Pontos de Inspeção)</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={() => { setForm(EMPTY_POINT); setFeedback(null); }} disabled={busy}>+ Novo Ponto</button>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvarPonto()} disabled={busy}>{busy ? "..." : "Salvar"}</button></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VPRO0400 — Qualidade (Pontos de Inspeção)" filename="vpro0400" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Ponto de inspeção</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-5"><label className="fsc-label fsc-label-req">Nome</label><input className="fsc-input" value={form.name} onChange={(e) => setF("name", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Tipo</label>
              <select className="fsc-select" value={form.type} onChange={(e) => setF("type", e.target.value as InspectionType)}>
                {INSPECTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Item (cód.)</label><input className="fsc-input fsc-input-right" type="number" value={form.item_code ?? ""} onChange={(e) => setF("item_code", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Operação (ID)</label><input className="fsc-input fsc-input-right" type="number" value={form.operation_id ?? ""} onChange={(e) => setF("operation_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="fsc-field fsc-col-12"><label className="fsc-label">Descrição</label><input className="fsc-input" value={form.description ?? ""} onChange={(e) => setF("description", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Pontos</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{points.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>#</th><th>Nome</th><th>Tipo</th><th>Item</th><th style={{ width: 100 }}>Ações</th></tr></thead>
            <tbody>
              {points.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhum ponto cadastrado.</td></tr>}
              {points.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td><td style={{ fontWeight: 600 }}>{p.name}</td><td><span className="fsc-pill fsc-pill-gray">{TYPE_LABEL[p.type]}</span></td><td>{p.item_code ?? "—"}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => void abrir(p)}>Laudos</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {selected && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Laudos — {selected.name}</span><div className="fsc-section-banner-line" />
              <button className="fsc-btn fsc-btn-ghost" onClick={() => setSelected(null)}>Fechar</button></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Laudo</label>
                  <select className="fsc-select" value={resForm.verdict} onChange={(e) => setR("verdict", e.target.value as InspectionVerdict)}>
                    {VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Qtd inspec.</label><input className="fsc-input fsc-input-right" type="number" value={resForm.quantity_inspected} onChange={(e) => setR("quantity_inspected", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Qtd aprov.</label><input className="fsc-input fsc-input-right" type="number" value={resForm.quantity_approved} onChange={(e) => setR("quantity_approved", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Qtd reprov.</label><input className="fsc-input fsc-input-right" type="number" value={resForm.quantity_rejected} onChange={(e) => setR("quantity_rejected", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void lancarLaudo()} disabled={busy}>+ Laudo</button></div>
                <div className="fsc-field fsc-col-12"><label className="fsc-label">Observação</label><input className="fsc-input" value={resForm.observation ?? ""} onChange={(e) => setR("observation", e.target.value)} /></div>
              </div>
            </div>
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead><tr><th>Laudo</th><th className="fsc-num">Inspec.</th><th className="fsc-num">Aprov.</th><th className="fsc-num">Reprov.</th><th>Observação</th></tr></thead>
                  <tbody>
                    {results.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhum laudo.</td></tr>}
                    {results.map((r, i) => (
                      <tr key={i}>
                        <td>{verdictPill(parseStr(r, "verdict", "Verdict", "result", "Result"))}</td>
                        <td className="fsc-num">{parseNum(r, "quantity_inspected", "QuantityInspected") ?? 0}</td>
                        <td className="fsc-num">{parseNum(r, "quantity_approved", "QuantityApproved") ?? 0}</td>
                        <td className="fsc-num">{parseNum(r, "quantity_rejected", "QuantityRejected") ?? 0}</td>
                        <td>{parseStr(r, "observation", "Observation") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Pontos: <strong>{points.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
