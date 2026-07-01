import { useState, useEffect, useCallback } from "react";
import { type OrderPriorityDTO, listOrderPriorities, createOrderPriority } from "@/services/orderPriorityService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: OrderPriorityDTO = { priority: "", description: "", interval_start: 0, interval_end: 0 };

export function Vpri0100Page(): JSX.Element {
  const [list, setList] = useState<OrderPriorityDTO[]>([]);
  const [form, setForm] = useState<OrderPriorityDTO>(EMPTY);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listOrderPriorities()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar prioridades.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function salvar() {
    if (!form.priority.trim()) { setFeedback({ type: "error", message: "Prioridade é obrigatória." }); return; }
    if (form.interval_end < form.interval_start) { setFeedback({ type: "error", message: "Intervalo inválido (fim < início)." }); return; }
    setBusy(true); setFeedback(null);
    try { await createOrderPriority(form); setFeedback({ type: "success", message: `Prioridade ${form.priority} criada.` }); setForm(EMPTY); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VPRI0100 — Prioridade de Ordens (APS)</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : "Adicionar"}</button>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void reload()} disabled={busy}>Recarregar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VPRI0100 — Prioridade de Ordens" filename="vpri0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner">
          <span className="fsc-section-banner-pill">APS</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">Níveis de prioridade usados no sequenciamento de ordens.</span>
        </div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Prioridade</label>
            <input className="fsc-input" value={form.priority} placeholder="Ex.: Urgente, Alta, Normal" onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-5"><label className="fsc-label">Descrição</label>
            <input className="fsc-input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Intervalo início</label>
            <input className="fsc-input fsc-input-right" type="number" value={form.interval_start} onChange={(e) => setForm((p) => ({ ...p, interval_start: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Intervalo fim</label>
            <input className="fsc-input fsc-input-right" type="number" value={form.interval_end} onChange={(e) => setForm((p) => ({ ...p, interval_end: Number(e.target.value) }))} /></div>
        </div></div></div>

        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Cód.</th><th>Prioridade</th><th>Descrição</th><th className="fsc-num">Início</th><th className="fsc-num">Fim</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhuma prioridade cadastrada.</td></tr>}
              {list.slice().sort((a, b) => a.interval_start - b.interval_start).map((p, i) => (
                <tr key={p.code ?? i}><td className="fsc-num">{p.code}</td><td style={{ fontWeight: 600 }}>{p.priority}</td><td>{p.description}</td><td className="fsc-num">{p.interval_start}</td><td className="fsc-num">{p.interval_end}</td></tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Prioridades: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
