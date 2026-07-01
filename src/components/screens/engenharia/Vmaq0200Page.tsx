import { useState, useCallback, useEffect } from "react";
import {
  type Machine,
  CAPACITY_UNITS,
  CAPACITY_PERIODS,
  capacityUnitLabel,
  capacityPeriodLabel,
  listMachines,
  createMachine,
} from "@/services/machineService";
import { type MachineType, listMachineTypes, machineTypeLabel } from "@/services/machineTypeService";
import {
  type CreateItemMachineTimeDTO,
  type ProductionCalcResult,
  createItemMachineTime,
  calculateProductionTime,
} from "@/services/itemMachineTimeService";
import { createMachineSchedule } from "@/services/machineScheduleService";
import { errMessage } from "@/services/fiscalShared";
import { useAuthStore } from "@/store/authStore";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

function resolveUserId(id: string | undefined, token: string | null): string {
  if (id) return id;
  if (!token) return "";
  try {
    const part = token.split(".")[1];
    if (!part) return "";
    const p = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    return String(p["sub"] ?? p["id"] ?? p["user_id"] ?? "");
  } catch { return ""; }
}

const TIME_UNITS = CAPACITY_PERIODS; // produção usa o mesmo enum de período (MINUTO/HORA/DIA)

const EMPTY_MACHINE = { code: 0, name: "", machine_type_code: 0, capacity: 0, capacity_per_unit: "PEÇAS", capacity_period: "DIA", efficiency_rate: 0.9 };
const EMPTY_TIME: CreateItemMachineTimeDTO = { item_code: 0, mask: "", machine_code: 0, production_time: 0, production_time_unit: "MINUTO", production_base_qty: 1, setup_time: 0, priority: 1 };

export function Vmaq0200Page(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [machines, setMachines] = useState<Machine[]>([]);
  const [types, setTypes] = useState<MachineType[]>([]);
  const [mForm, setMForm] = useState({ ...EMPTY_MACHINE });
  const [tForm, setTForm] = useState<CreateItemMachineTimeDTO>({ ...EMPTY_TIME });
  const [calc, setCalc] = useState({ item_code: 0, mask: "", machine_code: 0, demand_qty: 0 });
  const [calcResult, setCalcResult] = useState<ProductionCalcResult | null>(null);
  const [sched, setSched] = useState({ machine_code: 0, schedule_date: "", planned_qty: 0, sequence: 0 });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const loadAll = useCallback(() => run(async () => {
    const [ms, ts] = await Promise.all([listMachines(), listMachineTypes()]);
    setMachines(ms); setTypes(ts);
  }), [run]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const criarMaquina = () => run(async () => {
    if (!mForm.code || !mForm.name.trim()) { setFeedback({ type: "error", message: "Código e nome são obrigatórios." }); return; }
    if (!mForm.machine_type_code) { setFeedback({ type: "error", message: "Tipo de máquina é obrigatório." }); return; }
    await createMachine({ ...mForm, name: mForm.name.trim(), is_active: true, created_by: resolveUserId(user?.id, token) });
    setFeedback({ type: "success", message: `Máquina "${mForm.name.trim()}" criada.` });
    setMForm({ ...EMPTY_MACHINE });
    setMachines(await listMachines());
  });

  const criarTempo = () => run(async () => {
    if (!tForm.item_code || !tForm.machine_code) { setFeedback({ type: "error", message: "Item e máquina são obrigatórios." }); return; }
    if (!tForm.production_time || !tForm.production_base_qty) { setFeedback({ type: "error", message: "Tempo de ciclo e qtd base são obrigatórios." }); return; }
    await createItemMachineTime({ ...tForm, mask: tForm.mask || null });
    setFeedback({ type: "success", message: "Tempo item × máquina cadastrado." });
    setTForm({ ...EMPTY_TIME });
  });

  const calcular = () => run(async () => {
    if (!calc.item_code || !calc.machine_code || !calc.demand_qty) { setFeedback({ type: "error", message: "Item, máquina e quantidade são obrigatórios." }); return; }
    setCalcResult(null);
    const r = await calculateProductionTime({ item_code: calc.item_code, machine_code: calc.machine_code, mask: calc.mask || null, demand_qty: calc.demand_qty });
    setCalcResult(r);
    setFeedback({ type: r.is_bottleneck ? "info" : "success", message: r.is_bottleneck ? "Calculado — ⚠️ máquina em sobrecarga (gargalo)." : "Tempo de produção calculado." });
  });

  const criarAgenda = () => run(async () => {
    if (!sched.machine_code) { setFeedback({ type: "error", message: "Máquina é obrigatória." }); return; }
    await createMachineSchedule({
      machine_code: sched.machine_code,
      schedule_date: sched.schedule_date ? `${sched.schedule_date}T00:00:00Z` : undefined,
      planned_qty: sched.planned_qty || undefined,
      sequence: sched.sequence || undefined,
    });
    setFeedback({ type: "success", message: "Agenda registrada para a máquina." });
  });

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VMAQ0200 — Máquinas, Tempos e Cálculo</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Dados</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={loadAll} disabled={busy}>Recarregar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VMAQ0200 — Máquinas e Tempos" filename="vmaq0200" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* ── Cálculo de tempo de produção (§3) ──────────────────────────── */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Cálculo de tempo de produção</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={calc.item_code || ""} onChange={(e) => setCalc((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Máscara</label><input className="fsc-input" value={calc.mask} onChange={(e) => setCalc((p) => ({ ...p, mask: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Máquina</label>
            <select className="fsc-input" value={calc.machine_code || ""} onChange={(e) => setCalc((p) => ({ ...p, machine_code: Number(e.target.value) }))}>
              <option value="">—</option>{machines.map((m) => <option key={m.code} value={m.code}>{m.code} · {m.name}</option>)}
            </select></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Quantidade</label><input className="fsc-input fsc-input-right" type="number" value={calc.demand_qty || ""} onChange={(e) => setCalc((p) => ({ ...p, demand_qty: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-4" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={calcular} disabled={busy}>Calcular tempo</button></div>
        </div>
        {calcResult && (
          <div className="fsc-grid" style={{ marginTop: 10 }}>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Ciclos</label><input className="fsc-input fsc-input-right" value={calcResult.cycles} readOnly /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Setup (min)</label><input className="fsc-input fsc-input-right" value={calcResult.setup_minutes} readOnly /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Produção (min)</label><input className="fsc-input fsc-input-right" value={calcResult.production_minutes} readOnly /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Total (min)</label><input className="fsc-input fsc-input-right" value={calcResult.total_minutes} readOnly /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Total (h)</label><input className="fsc-input fsc-input-right" value={calcResult.total_hours} readOnly /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Gargalo?</label><input className="fsc-input" value={calcResult.is_bottleneck ? "⚠️ Sim" : "Não"} readOnly /></div>
          </div>
        )}
        </div></div>

        {/* ── Máquinas ───────────────────────────────────────────────────── */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Nova máquina</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Código</label><input className="fsc-input fsc-input-right" type="number" value={mForm.code || ""} onChange={(e) => setMForm((p) => ({ ...p, code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Nome</label><input className="fsc-input" value={mForm.name} onChange={(e) => setMForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Tipo</label>
            <select className="fsc-input" value={mForm.machine_type_code || ""} onChange={(e) => setMForm((p) => ({ ...p, machine_type_code: Number(e.target.value) }))}>
              <option value="">—</option>{types.map((t) => <option key={t.code} value={t.code}>{t.code} · {t.name} ({machineTypeLabel(t.type)})</option>)}
            </select></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Capacidade</label><input className="fsc-input fsc-input-right" type="number" value={mForm.capacity || ""} onChange={(e) => setMForm((p) => ({ ...p, capacity: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Eficiência</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={mForm.efficiency_rate} onChange={(e) => setMForm((p) => ({ ...p, efficiency_rate: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Unidade de capacidade</label>
            <select className="fsc-input" value={mForm.capacity_per_unit} onChange={(e) => setMForm((p) => ({ ...p, capacity_per_unit: e.target.value }))}>
              {CAPACITY_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Período</label>
            <select className="fsc-input" value={mForm.capacity_period} onChange={(e) => setMForm((p) => ({ ...p, capacity_period: e.target.value }))}>
              {CAPACITY_PERIODS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select></div>
          <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={criarMaquina} disabled={busy}>Criar máquina</button></div>
        </div></div></div>

        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Código</th><th>Nome</th><th className="fsc-num">Tipo</th><th className="fsc-num">Capacidade</th><th>Unidade</th><th>Período</th><th className="fsc-num">Efic.</th></tr></thead>
            <tbody>
              {machines.length === 0 && <tr><td colSpan={7} className="fsc-empty">Nenhuma máquina.</td></tr>}
              {machines.map((m) => (
                <tr key={m.code}>
                  <td className="fsc-num">{m.code}</td><td>{m.name}</td><td className="fsc-num">{m.machine_type_code}</td>
                  <td className="fsc-num">{m.capacity}</td><td>{capacityUnitLabel(m.capacity_per_unit)}</td><td>{capacityPeriodLabel(m.capacity_period)}</td>
                  <td className="fsc-num">{(m.efficiency_rate * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {/* ── Tempo item × máquina ───────────────────────────────────────── */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Tempo por item × máquina (cadastro central do cálculo)</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={tForm.item_code || ""} onChange={(e) => setTForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Máscara</label><input className="fsc-input" value={tForm.mask ?? ""} onChange={(e) => setTForm((p) => ({ ...p, mask: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Máquina</label>
            <select className="fsc-input" value={tForm.machine_code || ""} onChange={(e) => setTForm((p) => ({ ...p, machine_code: Number(e.target.value) }))}>
              <option value="">—</option>{machines.map((m) => <option key={m.code} value={m.code}>{m.code} · {m.name}</option>)}
            </select></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Tempo ciclo</label><input className="fsc-input fsc-input-right" type="number" value={tForm.production_time || ""} onChange={(e) => setTForm((p) => ({ ...p, production_time: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Unidade tempo</label>
            <select className="fsc-input" value={tForm.production_time_unit} onChange={(e) => setTForm((p) => ({ ...p, production_time_unit: e.target.value }))}>
              {TIME_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Qtd base</label><input className="fsc-input fsc-input-right" type="number" value={tForm.production_base_qty || ""} onChange={(e) => setTForm((p) => ({ ...p, production_base_qty: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Setup</label><input className="fsc-input fsc-input-right" type="number" value={tForm.setup_time || ""} onChange={(e) => setTForm((p) => ({ ...p, setup_time: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Prioridade (1=preferida)</label><input className="fsc-input fsc-input-right" type="number" value={tForm.priority || ""} onChange={(e) => setTForm((p) => ({ ...p, priority: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={criarTempo} disabled={busy}>Cadastrar tempo</button></div>
        </div></div></div>

        {/* ── Agenda ─────────────────────────────────────────────────────── */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Agenda da máquina (CRP/APS)</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Máquina</label>
            <select className="fsc-input" value={sched.machine_code || ""} onChange={(e) => setSched((p) => ({ ...p, machine_code: Number(e.target.value) }))}>
              <option value="">—</option>{machines.map((m) => <option key={m.code} value={m.code}>{m.code} · {m.name}</option>)}
            </select></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Data</label><input className="fsc-input" type="date" value={sched.schedule_date} onChange={(e) => setSched((p) => ({ ...p, schedule_date: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Qtd planejada</label><input className="fsc-input fsc-input-right" type="number" value={sched.planned_qty || ""} onChange={(e) => setSched((p) => ({ ...p, planned_qty: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Sequência</label><input className="fsc-input fsc-input-right" type="number" value={sched.sequence || ""} onChange={(e) => setSched((p) => ({ ...p, sequence: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={criarAgenda} disabled={busy}>Registrar</button></div>
        </div></div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Máquinas: <strong>{machines.length}</strong></div><div className="fsc-footer-stat">Tipos: <strong>{types.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
