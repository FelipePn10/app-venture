import { useState, useCallback, useEffect } from "react";
import {
  type MaintPlanDTO, type MaintFrequency, type MaintOrderDTO, type MaintOrderStatus,
  FREQUENCIES,
  listPlans, createPlan, deletePlan, listPlanOrders, createOrder, advanceOrder, generateOrders,
} from "@/services/preventiveMaintenanceService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_PLAN: MaintPlanDTO = { machine_id: 0, work_center_id: undefined, frequency: "MONTHLY", frequency_days: 30, estimated_hours: 1 };

function orderPill(s?: string): JSX.Element {
  const x = (s ?? "").toUpperCase();
  const cls = x === "DONE" ? "erp-badge-green" : x === "IN_PROGRESS" ? "erp-badge-blue" : x === "CANCELLED" ? "erp-badge-red" : "erp-badge-amber";
  return <span className={`erp-badge ${cls}`}>{s || "—"}</span>;
}

export function Vpro0500Page(): JSX.Element {
  const [plans, setPlans] = useState<MaintPlanDTO[]>([]);
  const [form, setForm] = useState<MaintPlanDTO>(EMPTY_PLAN);
  const [selected, setSelected] = useState<MaintPlanDTO | null>(null);
  const [orders, setOrders] = useState<MaintOrderDTO[]>([]);
  const [horizon, setHorizon] = useState("30");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setPlans(await listPlans(false)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar planos.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof MaintPlanDTO>(k: K, v: MaintPlanDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  async function salvarPlano() {
    if (!form.machine_id) { setFeedback({ type: "error", message: "Máquina (ID) é obrigatória." }); return; }
    if (!form.description?.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try { await createPlan(form); setForm(EMPTY_PLAN); setFeedback({ type: "success", message: "Plano de manutenção criado." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function removerPlano(id: number) {
    if (!window.confirm("Desativar este plano?")) return;
    setBusy(true); setFeedback(null);
    try { await deletePlan(id); if (selected?.id === id) setSelected(null); setFeedback({ type: "success", message: "Plano desativado." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const reloadOrders = useCallback(async (planId: number) => {
    setBusy(true);
    try { setOrders(await listPlanOrders(planId)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  async function abrir(p: MaintPlanDTO) { if (!p.id) return; setSelected(p); setFeedback(null); await reloadOrders(p.id); }

  async function novaOrdem() {
    if (!selected?.id) return;
    setBusy(true); setFeedback(null);
    try { await createOrder({ plan_id: selected.id, machine_id: selected.machine_id, scheduled_date: today() }); setFeedback({ type: "success", message: "Ordem criada." }); await reloadOrders(selected.id); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function avancar(o: MaintOrderDTO, status: MaintOrderStatus) {
    if (!o.id || !selected?.id) return;
    let actual: number | undefined;
    if (status === "DONE") { const v = window.prompt("Horas reais de parada:", String(selected.estimated_hours)); if (v === null) return; actual = Number(v); }
    setBusy(true); setFeedback(null);
    try { await advanceOrder(o.id, status, actual); setFeedback({ type: "success", message: `Ordem ${o.id} → ${status}.` }); await reloadOrders(selected.id); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function gerar() {
    setBusy(true); setFeedback(null);
    try { const r = await generateOrders(Number(horizon) || 30); setFeedback({ type: "success", message: `Geração concluída (horizonte ${horizon} dias). ${JSON.stringify(r)}` }); if (selected?.id) await reloadOrders(selected.id); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Produção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Manutenção Preventiva</span><span className="erp-crumb-code">VPRO0500</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Plano</span>
          <button className="erp-btn erp-btn-new" onClick={() => { setForm(EMPTY_PLAN); setFeedback(null); }} disabled={busy}>+ Novo</button>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvarPlano()} disabled={busy}>{busy ? "..." : "Salvar"}</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Gerar ordens</span>
          <input className="erp-input" style={{ width: 70, height: 32 }} type="number" value={horizon} onChange={(e) => setHorizon(e.target.value)} />
          <span className="erp-tgroup-label">dias</span>
          <button className="erp-btn" onClick={() => void gerar()} disabled={busy}>Gerar</button></div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VPRO0500 — Manutenção Preventiva" filename="vpro0500" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Manutenção Preventiva</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Novo plano</div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Máquina (ID)</label><input className="erp-input num" type="number" value={form.machine_id || ""} onChange={(e) => setF("machine_id", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Centro (ID)</label><input className="erp-input num" type="number" value={form.work_center_id ?? ""} onChange={(e) => setF("work_center_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="erp-field erp-c4"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description ?? ""} onChange={(e) => setF("description", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Frequência</label>
              <select className="erp-input" value={form.frequency} onChange={(e) => setF("frequency", e.target.value as MaintFrequency)}>{FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label">Intervalo (dias)</label><input className="erp-input num" type="number" value={form.frequency_days ?? ""} onChange={(e) => setF("frequency_days", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Horas estimadas</label><input className="erp-input num" type="number" step="0.1" value={form.estimated_hours} onChange={(e) => setF("estimated_hours", Number(e.target.value))} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Planos — <span style={{fontWeight:400,opacity:0.65}}>{plans.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>#</th><th>Máquina</th><th>Centro</th><th>Frequência</th><th>Horas</th><th>Próxima</th><th style={{ width: 150 }}>Ações</th></tr></thead>
            <tbody>
              {plans.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum plano.</td></tr>}
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td><td style={{ fontWeight: 600 }}>{p.machine_id}</td><td>{p.work_center_id ?? "—"}</td>
                  <td>{p.frequency}{p.frequency_days ? ` (${p.frequency_days}d)` : ""}</td><td>{p.estimated_hours}</td>
                  <td>{(p.next_scheduled_at ?? "").slice(0, 10) || "—"}</td>
                  <td>
                    <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void abrir(p)}>Ordens</button>
                    <button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => p.id && void removerPlano(p.id)}>Desativar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>

        {selected && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Ordens do plano {selected.id} <button className="erp-btn" onClick={() => void novaOrdem()} disabled={busy}>+ Ordem manual</button> <button className="erp-btn" onClick={() => setSelected(null)}>Fechar</button></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>#</th><th>Data</th><th>Status</th><th>Horas reais</th><th style={{ width: 200 }}>Ações</th></tr></thead>
                <tbody>
                  {orders.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma ordem.</td></tr>}
                  {orders.map((o) => {
                    const s = (o.status ?? "").toUpperCase();
                    return (
                      <tr key={o.id}>
                        <td>{o.id}</td><td>{o.scheduled_date?.slice(0, 10)}</td><td>{orderPill(o.status)}</td><td>{o.actual_hours ?? "—"}</td>
                        <td>
                          {s === "PLANNED" && <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void avancar(o, "IN_PROGRESS")}>Iniciar</button>}
                          {s === "IN_PROGRESS" && <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void avancar(o, "DONE")}>Concluir</button>}
                          {(s === "PLANNED" || s === "IN_PROGRESS") && <button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => void avancar(o, "CANCELLED")}>Cancelar</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div></div></div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Planos: <strong>{plans.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
