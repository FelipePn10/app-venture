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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VCUS0100 — Custos (centro, compra, alocação, overhead)</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Dados</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={loadAll} disabled={busy}>Recarregar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VCUS0100 — Custos" filename="vcus0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* Rollup do custo padrão */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Custo padrão — rollup</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={rollupItem || ""} onChange={(e) => setRollupItem(Number(e.target.value))} /></div>
          <div className="fsc-field fsc-col-3" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={rodarRollup} disabled={busy}>Recalcular (rollup)</button></div>
          {rollup && <>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Material</label><input className="fsc-input fsc-input-right" value={money(rollup.material_cost)} readOnly /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Operação</label><input className="fsc-input fsc-input-right" value={money(rollup.operation_cost)} readOnly /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Total</label><input className="fsc-input fsc-input-right" value={money(rollup.total_cost)} readOnly /></div>
          </>}
        </div></div></div>

        {/* Custo/hora por centro de trabalho */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Custo/hora por centro de trabalho</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Centro de trabalho (ID)</label><input className="fsc-input fsc-input-right" type="number" value={wccForm.work_center_id || ""} onChange={(e) => setWccForm((p) => ({ ...p, work_center_id: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Custo/hora</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={wccForm.cost_per_hour || ""} onChange={(e) => setWccForm((p) => ({ ...p, cost_per_hour: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-3" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={salvarWcc} disabled={busy}>Salvar custo/hora</button></div>
        </div></div></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Centro</th><th className="fsc-num">Custo/hora</th><th>Moeda</th></tr></thead>
            <tbody>
              {wccs.length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhum custo de centro cadastrado.</td></tr>}
              {wccs.map((w) => <tr key={w.id ?? w.work_center_id}><td className="fsc-num">{w.work_center_id}</td><td className="fsc-num">{money(w.cost_per_hour)}</td><td>{w.currency ?? "BRL"}</td></tr>)}
            </tbody>
          </table>
        </div></div>

        {/* Custo de compra por item */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Custo de compra por item</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={pcForm.item_code || ""} onChange={(e) => setPcForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Custo</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={pcForm.cost || ""} onChange={(e) => setPcForm((p) => ({ ...p, cost: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-6" style={{ alignSelf: "end", display: "flex", gap: 8 }}>
            <button className="fsc-btn fsc-btn-primary" onClick={salvarPc} disabled={busy}>Salvar custo</button>
            <button className="fsc-btn fsc-btn-ghost" onClick={consultarPc} disabled={busy}>Consultar</button>
            {pcResult && <span className="fsc-action-label">Item {pcResult.item_code}: {money(pcResult.cost)} {pcResult.currency ?? ""}</span>}
          </div>
        </div></div></div>

        {/* Base de alocação */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Base de alocação (critério de rateio)</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Código</label><input className="fsc-input fsc-input-right" type="number" value={baseForm.code || ""} onChange={(e) => setBaseForm((p) => ({ ...p, code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-5"><label className="fsc-label fsc-label-req">Descrição</label><input className="fsc-input" value={baseForm.description} onChange={(e) => setBaseForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Período</label><input className="fsc-input" placeholder="YYYY-MM" value={baseForm.period ?? ""} onChange={(e) => setBaseForm((p) => ({ ...p, period: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-3" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={salvarBase} disabled={busy}>Criar base</button></div>
        </div></div></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Código</th><th>Descrição</th><th>Período</th></tr></thead>
            <tbody>
              {bases.length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhuma base de alocação.</td></tr>}
              {bases.map((b, i) => <tr key={b.code || i}><td className="fsc-num">{b.code}</td><td>{b.description || "—"}</td><td>{b.period || "—"}</td></tr>)}
            </tbody>
          </table>
        </div></div>

        {/* Alocação de overhead */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Alocação de overhead</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Centro de custo</label><input className="fsc-input fsc-input-right" type="number" value={ovhForm.cost_center_code || ""} onChange={(e) => setOvhForm((p) => ({ ...p, cost_center_code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Início</label><input className="fsc-input" type="date" value={ovhForm.period_start} onChange={(e) => setOvhForm((p) => ({ ...p, period_start: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Fim</label><input className="fsc-input" type="date" value={ovhForm.period_end} onChange={(e) => setOvhForm((p) => ({ ...p, period_end: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Alvo (centro)</label><input className="fsc-input fsc-input-right" type="number" value={ovhForm.target_cost_center || ""} onChange={(e) => setOvhForm((p) => ({ ...p, target_cost_center: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Alvo %</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={ovhForm.target_pct || ""} onChange={(e) => setOvhForm((p) => ({ ...p, target_pct: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Descrição</label><input className="fsc-input" value={ovhForm.description} onChange={(e) => setOvhForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={salvarOvh} disabled={busy}>Criar alocação de overhead</button></div>
        </div></div></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Centro custo</th><th>Período</th><th>Tipo</th><th className="fsc-num">Alvos</th></tr></thead>
            <tbody>
              {ovhs.length === 0 && <tr><td colSpan={4} className="fsc-empty">Nenhuma alocação de overhead.</td></tr>}
              {ovhs.map((o, i) => <tr key={o.id ?? i}><td className="fsc-num">{o.cost_center_code}</td><td>{o.period_start?.slice(0, 10)} → {o.period_end?.slice(0, 10)}</td><td>{o.allocation_type ?? "—"}</td><td className="fsc-num">{o.targets?.length ?? 0}</td></tr>)}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Centros: <strong>{wccs.length}</strong></div><div className="fsc-footer-stat">Bases: <strong>{bases.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
