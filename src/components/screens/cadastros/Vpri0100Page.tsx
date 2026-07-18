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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Cadastros & Plataforma</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Prioridade de Ordens (APS)</span><span className="erp-crumb-code">VPRI0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : "Adicionar"}</button>
          <button className="erp-btn" onClick={() => void reload()} disabled={busy}>Recarregar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VPRI0100 — Prioridade de Ordens" filename="vpri0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Prioridade de Ordens</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">APS  — <span style={{fontWeight:400,opacity:0.65}}>Níveis de prioridade usados no sequenciamento de ordens.</span></div><div className="erp-fieldset-body">
          <div className="erp-field erp-c3"><label className="erp-label erp-req">Prioridade</label>
            <input className="erp-input" value={form.priority} placeholder="Ex.: Urgente, Alta, Normal" onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} /></div>
          <div className="erp-field erp-c5"><label className="erp-label">Descrição</label>
            <input className="erp-input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Intervalo início</label>
            <input className="erp-input num" type="number" value={form.interval_start} onChange={(e) => setForm((p) => ({ ...p, interval_start: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Intervalo fim</label>
            <input className="erp-input num" type="number" value={form.interval_end} onChange={(e) => setForm((p) => ({ ...p, interval_end: Number(e.target.value) }))} /></div>
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Cód.</th><th>Prioridade</th><th>Descrição</th><th>Início</th><th>Fim</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma prioridade cadastrada.</td></tr>}
              {list.slice().sort((a, b) => a.interval_start - b.interval_start).map((p, i) => (
                <tr key={p.code ?? i}><td>{p.code}</td><td style={{ fontWeight: 600 }}>{p.priority}</td><td>{p.description}</td><td>{p.interval_start}</td><td>{p.interval_end}</td></tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Prioridades: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
