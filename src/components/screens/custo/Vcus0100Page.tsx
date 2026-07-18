import { useState, useCallback, useEffect } from "react";
import {
  type WorkCenterCost,
  type PurchaseCost,
  type StandardCost,
  listWorkCenterCosts,
  upsertWorkCenterCost,
  getPurchaseCost,
  upsertPurchaseCost,
  calculateStandardCost,
} from "@/services/standardCostService";
import {
  type AllocationBase,
  type OverheadAllocation,
  listAllocations,
  createAllocation,
  listOverheadAllocations,
  createOverheadAllocation,
} from "@/services/allocationsService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function Vcus0100Page(): JSX.Element {
  const [wccs, setWccs] = useState<WorkCenterCost[]>([]);
  const [bases, setBases] = useState<AllocationBase[]>([]);
  const [ovhs, setOvhs] = useState<OverheadAllocation[]>([]);
  const [wccForm, setWccForm] = useState({ work_center_id: 0, cost_per_hour: 0 });
  const [pcForm, setPcForm] = useState({ item_code: 0, cost: 0 });
  const [pcResult, setPcResult] = useState<PurchaseCost | null>(null);
  const [rollupItem, setRollupItem] = useState(0);
  const [rollup, setRollup] = useState<StandardCost | null>(null);
  const [baseForm, setBaseForm] = useState<AllocationBase>({ code: 0, description: "", period: "" });
  const [ovhForm, setOvhForm] = useState({ cost_center_code: 0, period_start: "", period_end: "", allocation_type: "PERCENTAGE", description: "", target_cost_center: 0, target_pct: 100 });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const loadAll = useCallback(() => run(async () => {
    const [w, b, o] = await Promise.all([listWorkCenterCosts(), listAllocations(), listOverheadAllocations()]);
    setWccs(w); setBases(b); setOvhs(o);
  }), [run]);
  useEffect(() => { void loadAll(); }, [loadAll]);

  const salvarWcc = () => run(async () => {
    if (!wccForm.work_center_id) { setFeedback({ type: "error", message: "Centro de trabalho é obrigatório." }); return; }
    await upsertWorkCenterCost(wccForm.work_center_id, wccForm.cost_per_hour);
    setWccForm({ work_center_id: 0, cost_per_hour: 0 });
    setWccs(await listWorkCenterCosts());
    setFeedback({ type: "success", message: "Custo/hora do centro atualizado." });
  });
  const salvarPc = () => run(async () => {
    if (!pcForm.item_code) { setFeedback({ type: "error", message: "Item é obrigatório." }); return; }
    const r = await upsertPurchaseCost(pcForm.item_code, pcForm.cost);
    setPcResult(r); setFeedback({ type: "success", message: "Custo de compra atualizado." });
  });
  const consultarPc = () => run(async () => {
    if (!pcForm.item_code) { setFeedback({ type: "error", message: "Informe o item." }); return; }
    setPcResult(await getPurchaseCost(pcForm.item_code));
  });
  const rodarRollup = () => run(async () => {
    if (!rollupItem) { setFeedback({ type: "error", message: "Informe o item." }); return; }
    setRollup(await calculateStandardCost(rollupItem));
    setFeedback({ type: "success", message: `Rollup do item ${rollupItem} recalculado.` });
  });
  const salvarBase = () => run(async () => {
    if (!baseForm.code || !baseForm.description.trim()) { setFeedback({ type: "error", message: "Código e descrição são obrigatórios." }); return; }
    await createAllocation(baseForm);
    setBaseForm({ code: 0, description: "", period: "" });
    setBases(await listAllocations());
    setFeedback({ type: "success", message: "Base de alocação criada." });
  });
  const salvarOvh = () => run(async () => {
    if (!ovhForm.cost_center_code || !ovhForm.period_start || !ovhForm.period_end) { setFeedback({ type: "error", message: "Centro de custo e período (início/fim) são obrigatórios." }); return; }
    await createOverheadAllocation({
      cost_center_code: ovhForm.cost_center_code,
      period_start: ovhForm.period_start,
      period_end: ovhForm.period_end,
      allocation_type: ovhForm.allocation_type,
      description: ovhForm.description || undefined,
      targets: ovhForm.target_cost_center ? [{ cost_center_code: ovhForm.target_cost_center, percentage: ovhForm.target_pct }] : [],
    });
    setOvhForm({ cost_center_code: 0, period_start: "", period_end: "", allocation_type: "PERCENTAGE", description: "", target_cost_center: 0, target_pct: 100 });
    setOvhs(await listOverheadAllocations());
    setFeedback({ type: "success", message: "Alocação de overhead criada." });
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Custos / Precificação</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Custos (centro, compra, alocação, overhead)</span><span className="erp-crumb-code">VCUS0100</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">custo padrão &amp; alocações</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Dados</span><button className="erp-btn erp-btn-dark" onClick={loadAll} disabled={busy}>{busy && <span className="erp-spin" />}Recarregar</button></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VCUS0100 — Custos" filename="vcus0100" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Custos</button></div>
          <div className="erp-detail-body">

            <div className="erp-fieldset"><div className="erp-fieldset-head">Custo padrão — rollup</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={rollupItem || ""} onChange={(e) => setRollupItem(Number(e.target.value))} /></div>
              <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={rodarRollup} disabled={busy}>Recalcular (rollup)</button></div>
              {rollup && <>
                <div className="erp-field erp-c2"><label className="erp-label">Material</label><input className="erp-input num" value={money(rollup.material_cost)} readOnly /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Operação</label><input className="erp-input num" value={money(rollup.operation_cost)} readOnly /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Total</label><input className="erp-input num" value={money(rollup.total_cost)} readOnly /></div>
              </>}
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Custo/hora por centro de trabalho</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Centro de trabalho (ID)</label><input className="erp-input num" type="number" value={wccForm.work_center_id || ""} onChange={(e) => setWccForm((p) => ({ ...p, work_center_id: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Custo/hora</label><input className="erp-input num" type="number" step="0.01" value={wccForm.cost_per_hour || ""} onChange={(e) => setWccForm((p) => ({ ...p, cost_per_hour: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={salvarWcc} disabled={busy}>Salvar custo/hora</button></div>
              <div className="erp-field erp-c12"><table className="erp-grid">
                <thead><tr><th>Centro</th><th>Custo/hora</th><th>Moeda</th></tr></thead>
                <tbody>
                  {wccs.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhum custo de centro cadastrado.</td></tr>}
                  {wccs.map((w) => <tr key={w.id ?? w.work_center_id}><td>{w.work_center_id}</td><td>{money(w.cost_per_hour)}</td><td>{w.currency ?? "BRL"}</td></tr>)}
                </tbody>
              </table></div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Custo de compra por item</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={pcForm.item_code || ""} onChange={(e) => setPcForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Custo</label><input className="erp-input num" type="number" step="0.01" value={pcForm.cost || ""} onChange={(e) => setPcForm((p) => ({ ...p, cost: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c6" style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                <button className="erp-btn erp-btn-primary" onClick={salvarPc} disabled={busy}>Salvar custo</button>
                <button className="erp-btn" onClick={consultarPc} disabled={busy}>Consultar</button>
                {pcResult && <span className="erp-tgroup-label">Item {pcResult.item_code}: {money(pcResult.cost)} {pcResult.currency ?? ""}</span>}
              </div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Base de alocação (critério de rateio)</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input num" type="number" value={baseForm.code || ""} onChange={(e) => setBaseForm((p) => ({ ...p, code: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c5"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={baseForm.description} onChange={(e) => setBaseForm((p) => ({ ...p, description: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Período</label><input className="erp-input" placeholder="YYYY-MM" value={baseForm.period ?? ""} onChange={(e) => setBaseForm((p) => ({ ...p, period: e.target.value }))} /></div>
              <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={salvarBase} disabled={busy}>Criar base</button></div>
              <div className="erp-field erp-c12"><table className="erp-grid">
                <thead><tr><th>Código</th><th>Descrição</th><th>Período</th></tr></thead>
                <tbody>
                  {bases.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhuma base de alocação.</td></tr>}
                  {bases.map((b, i) => <tr key={b.code || i}><td>{b.code}</td><td>{b.description || "—"}</td><td>{b.period || "—"}</td></tr>)}
                </tbody>
              </table></div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Alocação de overhead</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Centro de custo</label><input className="erp-input num" type="number" value={ovhForm.cost_center_code || ""} onChange={(e) => setOvhForm((p) => ({ ...p, cost_center_code: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Início</label><input className="erp-input" type="date" value={ovhForm.period_start} onChange={(e) => setOvhForm((p) => ({ ...p, period_start: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Fim</label><input className="erp-input" type="date" value={ovhForm.period_end} onChange={(e) => setOvhForm((p) => ({ ...p, period_end: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Alvo (centro)</label><input className="erp-input num" type="number" value={ovhForm.target_cost_center || ""} onChange={(e) => setOvhForm((p) => ({ ...p, target_cost_center: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Alvo %</label><input className="erp-input num" type="number" step="0.01" value={ovhForm.target_pct || ""} onChange={(e) => setOvhForm((p) => ({ ...p, target_pct: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Descrição</label><input className="erp-input" value={ovhForm.description} onChange={(e) => setOvhForm((p) => ({ ...p, description: e.target.value }))} /></div>
              <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={salvarOvh} disabled={busy}>Criar alocação de overhead</button></div>
              <div className="erp-field erp-c12"><table className="erp-grid">
                <thead><tr><th>Centro custo</th><th>Período</th><th>Tipo</th><th>Alvos</th></tr></thead>
                <tbody>
                  {ovhs.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma alocação de overhead.</td></tr>}
                  {ovhs.map((o, i) => <tr key={o.id ?? i}><td>{o.cost_center_code}</td><td>{o.period_start?.slice(0, 10)} → {o.period_end?.slice(0, 10)}</td><td>{o.allocation_type ?? "—"}</td><td>{o.targets?.length ?? 0}</td></tr>)}
                </tbody>
              </table></div>
            </div></div>

          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Centros: <strong>{wccs.length}</strong></div><div className="erp-status-item">Bases: <strong>{bases.length}</strong></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
