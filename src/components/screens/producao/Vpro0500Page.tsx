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
  const cls = x === "DONE" ? "fsc-pill-green" : x === "IN_PROGRESS" ? "fsc-pill-blue" : x === "CANCELLED" ? "fsc-pill-red" : "fsc-pill-amber";
  return <span className={`fsc-pill ${cls}`}>{s || "—"}</span>;
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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VPRO0500 — Manutenção Preventiva</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Plano</span>
          <button className="fsc-btn fsc-btn-new" onClick={() => { setForm(EMPTY_PLAN); setFeedback(null); }} disabled={busy}>+ Novo</button>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvarPlano()} disabled={busy}>{busy ? "..." : "Salvar"}</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Gerar ordens</span>
          <input className="fsc-input" style={{ width: 70, height: 32 }} type="number" value={horizon} onChange={(e) => setHorizon(e.target.value)} />
          <span className="fsc-action-label">dias</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void gerar()} disabled={busy}>Gerar</button></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VPRO0500 — Manutenção Preventiva" filename="vpro0500" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Novo plano</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Máquina (ID)</label><input className="fsc-input fsc-input-right" type="number" value={form.machine_id || ""} onChange={(e) => setF("machine_id", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Centro (ID)</label><input className="fsc-input fsc-input-right" type="number" value={form.work_center_id ?? ""} onChange={(e) => setF("work_center_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Frequência</label>
              <select className="fsc-select" value={form.frequency} onChange={(e) => setF("frequency", e.target.value as MaintFrequency)}>{FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Intervalo (dias)</label><input className="fsc-input fsc-input-right" type="number" value={form.frequency_days ?? ""} onChange={(e) => setF("frequency_days", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Horas estimadas</label><input className="fsc-input fsc-input-right" type="number" step="0.1" value={form.estimated_hours} onChange={(e) => setF("estimated_hours", Number(e.target.value))} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Planos</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{plans.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>#</th><th>Máquina</th><th>Centro</th><th>Frequência</th><th className="fsc-num">Horas</th><th>Próxima</th><th style={{ width: 150 }}>Ações</th></tr></thead>
            <tbody>
              {plans.length === 0 && <tr><td colSpan={7} className="fsc-empty">Nenhum plano.</td></tr>}
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td><td style={{ fontWeight: 600 }}>{p.machine_id}</td><td>{p.work_center_id ?? "—"}</td>
                  <td>{p.frequency}{p.frequency_days ? ` (${p.frequency_days}d)` : ""}</td><td className="fsc-num">{p.estimated_hours}</td>
                  <td>{(p.next_scheduled_at ?? "").slice(0, 10) || "—"}</td>
                  <td>
                    <button className="fsc-action-btn fsc-edit-btn" onClick={() => void abrir(p)}>Ordens</button>
                    <button className="fsc-action-btn fsc-delete-btn" onClick={() => p.id && void removerPlano(p.id)}>Desativar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {selected && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Ordens do plano {selected.id}</span><div className="fsc-section-banner-line" />
              <button className="fsc-btn fsc-btn-ghost" onClick={() => void novaOrdem()} disabled={busy}>+ Ordem manual</button>
              <button className="fsc-btn fsc-btn-ghost" onClick={() => setSelected(null)}>Fechar</button></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th>#</th><th>Data</th><th>Status</th><th className="fsc-num">Horas reais</th><th style={{ width: 200 }}>Ações</th></tr></thead>
                <tbody>
                  {orders.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhuma ordem.</td></tr>}
                  {orders.map((o) => {
                    const s = (o.status ?? "").toUpperCase();
                    return (
                      <tr key={o.id}>
                        <td>{o.id}</td><td>{o.scheduled_date?.slice(0, 10)}</td><td>{orderPill(o.status)}</td><td className="fsc-num">{o.actual_hours ?? "—"}</td>
                        <td>
                          {s === "PLANNED" && <button className="fsc-action-btn fsc-edit-btn" onClick={() => void avancar(o, "IN_PROGRESS")}>Iniciar</button>}
                          {s === "IN_PROGRESS" && <button className="fsc-action-btn fsc-edit-btn" onClick={() => void avancar(o, "DONE")}>Concluir</button>}
                          {(s === "PLANNED" || s === "IN_PROGRESS") && <button className="fsc-action-btn fsc-delete-btn" onClick={() => void avancar(o, "CANCELLED")}>Cancelar</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Planos: <strong>{plans.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
