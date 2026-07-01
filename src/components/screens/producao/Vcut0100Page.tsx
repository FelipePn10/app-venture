import { useState, useCallback } from "react";
import {
  type CuttingPlanDTO, type CuttingPartDTO, type CuttingStockDTO, type PatternDTO, type CuttingSettings,
  CUT_TYPES,
  listCuttingPlans, getCuttingPlan, createCuttingPlan, deleteCuttingPlan,
  addPart, removePart, addStockPiece, removeStockPiece,
  optimizeCuttingPlan, releaseCuttingPlan, exportCuttingMap,
  getCuttingProgram, scheduleCuttingPlan,
  getCuttingSettings, updateCuttingSettings,
  type CuttingPlanDetail,
} from "@/services/cuttingPlanService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const pct = (n?: number) => `${(n ?? 0).toFixed(1)}%`;
const STATUS_LABEL: Record<string, string> = { RASCUNHO: "Rascunho", OTIMIZADO: "Otimizado", FIRMADO: "Firmado", EM_EXECUCAO: "Em execução", CONCLUIDO: "Concluído" };
const is2D = (t?: string) => t === "GUILLOTINE_2D" || t === "TRUE_SHAPE_2D";

const EMPTY_PLAN: CuttingPlanDTO = { material_item_code: 0, cut_type: "LINEAR_1D", description: "", kerf_mm: 3, trim_mm: 0, min_remnant_mm: 300, stock_uom: "M", uom_factor: 0, warehouse_id: 0, include_remnants: false };
const EMPTY_PART: CuttingPartDTO = { label: "", length_mm: 0, width_mm: 0, height_mm: 0, quantity: 1 };
const EMPTY_STOCK: CuttingStockDTO = { length_mm: 0, width_mm: 0, height_mm: 0, quantity: 1, is_remnant: false };

export function Vcut0100Page(): JSX.Element {
  const [plans, setPlans] = useState<CuttingPlanDTO[]>([]);
  const [detail, setDetail] = useState<CuttingPlanDetail | null>(null);
  const [unplaced, setUnplaced] = useState<Obj[]>([]);
  const [program, setProgram] = useState<Obj | null>(null);
  const [settings, setSettings] = useState<CuttingSettings | null>(null);
  const [newPlan, setNewPlan] = useState<CuttingPlanDTO>({ ...EMPTY_PLAN });
  const [partForm, setPartForm] = useState<CuttingPartDTO>({ ...EMPTY_PART });
  const [stockForm, setStockForm] = useState<CuttingStockDTO>({ ...EMPTY_STOCK });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const listar = () => run(async () => { setPlans(await listCuttingPlans()); if (!settings) setSettings(await getCuttingSettings()); });
  const abrir = (id?: number) => { if (id) void run(async () => { const d = await getCuttingPlan(id); setDetail(d); setUnplaced(d.unplaced ?? []); setProgram(null); }); };
  const refresh = useCallback(async (id: number) => { const d = await getCuttingPlan(id); setDetail(d); }, []);

  const criar = () => run(async () => {
    if (!newPlan.material_item_code) { setFeedback({ type: "error", message: "Item de matéria-prima é obrigatório." }); return; }
    const p = await createCuttingPlan(newPlan);
    setFeedback({ type: "success", message: `Plano ${p.code} criado (${STATUS_LABEL[p.status ?? ""] ?? p.status}).` });
    setPlans(await listCuttingPlans());
    if (p.id) await abrir(p.id);
  });

  const planId = () => detail?.plan.id;

  const adicionarPeca = () => { const id = planId(); if (!id) return; void run(async () => {
    if (!partForm.quantity) { setFeedback({ type: "error", message: "Quantidade é obrigatória." }); return; }
    await addPart(id, partForm); setPartForm({ ...EMPTY_PART }); await refresh(id); setFeedback({ type: "success", message: "Peça adicionada." });
  }); };
  const removerPeca = (partId?: number) => { const id = planId(); if (!id || !partId) return; void run(async () => { await removePart(id, partId); await refresh(id); }); };
  const adicionarEstoque = () => { const id = planId(); if (!id) return; void run(async () => {
    if (!stockForm.quantity) { setFeedback({ type: "error", message: "Quantidade é obrigatória." }); return; }
    await addStockPiece(id, stockForm); setStockForm({ ...EMPTY_STOCK }); await refresh(id); setFeedback({ type: "success", message: "Peça de estoque adicionada." });
  }); };
  const removerEstoque = (stockId?: number) => { const id = planId(); if (!id || !stockId) return; void run(async () => { await removeStockPiece(id, stockId); await refresh(id); }); };

  const otimizar = () => { const id = planId(); if (!id) return; void run(async () => {
    const d = await optimizeCuttingPlan(id); setDetail(d); setUnplaced(d.unplaced ?? []);
    setPlans(await listCuttingPlans());
    setFeedback({ type: (d.unplaced?.length ?? 0) > 0 ? "info" : "success", message: `Otimizado — aproveitamento ${pct(d.plan.utilization_pct)}${(d.unplaced?.length ?? 0) ? ` · ${d.unplaced!.length} peça(s) sem encaixe` : ""}.` });
  }); };
  const firmar = () => { const id = planId(); if (!id) return; void run(async () => {
    await releaseCuttingPlan(id); await refresh(id); setPlans(await listCuttingPlans());
    setFeedback({ type: "success", message: "Plano firmado — estoque baixado, retalhos gerados." });
  }); };
  const excluir = () => { const id = planId(); if (!id) return; void run(async () => { await deleteCuttingPlan(id); setDetail(null); setPlans(await listCuttingPlans()); setFeedback({ type: "success", message: "Plano removido." }); }); };
  const verPrograma = () => { const id = planId(); if (!id) return; void run(async () => { setProgram(await getCuttingProgram(id)); }); };
  const agendar = () => { const id = planId(); if (!id) return; void run(async () => { await scheduleCuttingPlan(id); setFeedback({ type: "success", message: "Corte agendado na máquina do plano." }); }); };
  const exportar = (fmt: "svg" | "dxf" | "pdf") => { const id = planId(); if (!id) return; void run(async () => { await exportCuttingMap(id, fmt); }); };

  const salvarSettings = () => run(async () => {
    if (!settings) return;
    setSettings(await updateCuttingSettings(settings));
    setFeedback({ type: "success", message: "Padrões da empresa salvos." });
  });

  const p = detail?.plan;
  const twoD = is2D(p?.cut_type ?? newPlan.cut_type);

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VCUT0100 — Plano de Corte</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Planos</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={listar} disabled={busy}>Listar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VCUT0100 — Plano de Corte" filename="vcut0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* Novo plano */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Novo plano de corte</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Matéria-prima (item)</label><input className="fsc-input fsc-input-right" type="number" value={newPlan.material_item_code || ""} onChange={(e) => setNewPlan((s) => ({ ...s, material_item_code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo de corte</label>
            <select className="fsc-input" value={newPlan.cut_type} onChange={(e) => setNewPlan((s) => ({ ...s, cut_type: e.target.value }))}>{CUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Descrição</label><input className="fsc-input" value={newPlan.description ?? ""} onChange={(e) => setNewPlan((s) => ({ ...s, description: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-1"><label className="fsc-label">Kerf</label><input className="fsc-input fsc-input-right" type="number" value={newPlan.kerf_mm || ""} onChange={(e) => setNewPlan((s) => ({ ...s, kerf_mm: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-1"><label className="fsc-label">Refile</label><input className="fsc-input fsc-input-right" type="number" value={newPlan.trim_mm || ""} onChange={(e) => setNewPlan((s) => ({ ...s, trim_mm: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-1"><label className="fsc-label">Sobra mín.</label><input className="fsc-input fsc-input-right" type="number" value={newPlan.min_remnant_mm || ""} onChange={(e) => setNewPlan((s) => ({ ...s, min_remnant_mm: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-1"><label className="fsc-label">UoM estoque</label><input className="fsc-input" value={newPlan.stock_uom ?? ""} onChange={(e) => setNewPlan((s) => ({ ...s, stock_uom: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-1"><label className="fsc-label">Fator UoM</label><input className="fsc-input fsc-input-right" type="number" step="0.001" value={newPlan.uom_factor || ""} onChange={(e) => setNewPlan((s) => ({ ...s, uom_factor: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Depósito (p/ firmar)</label><input className="fsc-input fsc-input-right" type="number" value={newPlan.warehouse_id || ""} onChange={(e) => setNewPlan((s) => ({ ...s, warehouse_id: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-3" style={{ alignSelf: "end", display: "flex", gap: 8 }}>
            <label className="fsc-action-label" style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" checked={!!newPlan.include_remnants} onChange={(e) => setNewPlan((s) => ({ ...s, include_remnants: e.target.checked }))} /> semear retalhos</label>
            <button className="fsc-btn fsc-btn-primary" onClick={criar} disabled={busy}>Criar plano</button></div>
        </div></div></div>

        {/* Lista */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Planos ({plans.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Código</th><th>Descrição</th><th>Tipo</th><th className="fsc-num">Material</th><th>Status</th><th className="fsc-num">Aprov.</th><th></th></tr></thead>
            <tbody>
              {plans.length === 0 && <tr><td colSpan={7} className="fsc-empty">Nenhum plano. Clique em Listar.</td></tr>}
              {plans.map((pl) => (
                <tr key={pl.id} className={p?.id === pl.id ? "fsc-row-selected" : ""}>
                  <td className="fsc-num">{pl.code}</td><td>{pl.description || "—"}</td><td>{pl.cut_type}</td><td className="fsc-num">{pl.material_item_code}</td>
                  <td>{STATUS_LABEL[pl.status ?? ""] ?? pl.status}</td><td className="fsc-num">{pct(pl.utilization_pct)}</td>
                  <td><button className="fsc-btn fsc-btn-ghost" onClick={() => abrir(pl.id)} disabled={busy}>Abrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {detail && p && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Plano {p.code} — {STATUS_LABEL[p.status ?? ""] ?? p.status} · {p.cut_type}</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Aproveitamento</label><input className="fsc-input fsc-input-right" value={pct(p.utilization_pct)} readOnly /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Sucata</label><input className="fsc-input fsc-input-right" value={pct(p.scrap_pct)} readOnly /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Estoque usado</label><input className="fsc-input fsc-input-right" value={p.stock_used_count ?? 0} readOnly /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Cortes</label><input className="fsc-input fsc-input-right" value={p.cut_count ?? 0} readOnly /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Demanda</label><input className="fsc-input fsc-input-right" value={p.total_demand ?? 0} readOnly /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Estoque</label><input className="fsc-input fsc-input-right" value={p.total_stock ?? 0} readOnly /></div>
              </div>
              <div className="fsc-action-group" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
                <button className="fsc-btn fsc-btn-primary" onClick={otimizar} disabled={busy}>Otimizar</button>
                <button className="fsc-btn fsc-btn-primary" onClick={firmar} disabled={busy || p.status !== "OTIMIZADO"}>Firmar (baixa)</button>
                <button className="fsc-btn fsc-btn-ghost" onClick={verPrograma} disabled={busy}>Programa</button>
                <button className="fsc-btn fsc-btn-ghost" onClick={agendar} disabled={busy}>Agendar na máquina</button>
                <button className="fsc-btn fsc-btn-ghost" onClick={() => exportar("svg")} disabled={busy}>SVG</button>
                <button className="fsc-btn fsc-btn-ghost" onClick={() => exportar("dxf")} disabled={busy}>DXF</button>
                <button className="fsc-btn fsc-btn-ghost" onClick={() => exportar("pdf")} disabled={busy}>PDF</button>
                <button className="fsc-btn fsc-btn-danger" onClick={excluir} disabled={busy}>Excluir</button>
              </div>
            </div></div>

            {/* Demanda + Estoque */}
            <div className="fsc-grid" style={{ gap: 0 }}>
              <div className="fsc-col-6">
                <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Demanda / peças ({detail.parts.length})</span><div className="fsc-section-banner-line" /></div>
                <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
                  <div className="fsc-field fsc-col-4"><label className="fsc-label">Etiqueta</label><input className="fsc-input" value={partForm.label ?? ""} onChange={(e) => setPartForm((s) => ({ ...s, label: e.target.value }))} /></div>
                  {twoD ? <>
                    <div className="fsc-field fsc-col-3"><label className="fsc-label">Largura</label><input className="fsc-input fsc-input-right" type="number" value={partForm.width_mm || ""} onChange={(e) => setPartForm((s) => ({ ...s, width_mm: Number(e.target.value) }))} /></div>
                    <div className="fsc-field fsc-col-3"><label className="fsc-label">Altura</label><input className="fsc-input fsc-input-right" type="number" value={partForm.height_mm || ""} onChange={(e) => setPartForm((s) => ({ ...s, height_mm: Number(e.target.value) }))} /></div>
                  </> : <div className="fsc-field fsc-col-6"><label className="fsc-label">Comprimento (mm)</label><input className="fsc-input fsc-input-right" type="number" value={partForm.length_mm || ""} onChange={(e) => setPartForm((s) => ({ ...s, length_mm: Number(e.target.value) }))} /></div>}
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Qtd</label><input className="fsc-input fsc-input-right" type="number" value={partForm.quantity || ""} onChange={(e) => setPartForm((s) => ({ ...s, quantity: Number(e.target.value) }))} /></div>
                  <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={adicionarPeca} disabled={busy}>Adicionar peça</button></div>
                </div></div></div>
                <div className="fsc-card"><div className="fsc-results-wrap">
                  <table className="fsc-table"><thead><tr><th>Etiqueta</th><th className="fsc-num">Dim.</th><th className="fsc-num">Qtd</th><th></th></tr></thead>
                    <tbody>{detail.parts.length === 0 && <tr><td colSpan={4} className="fsc-empty">Sem peças.</td></tr>}
                      {detail.parts.map((pt) => <tr key={pt.id}><td>{pt.label || "—"}</td><td className="fsc-num">{pt.length_mm ? `${pt.length_mm}` : `${pt.width_mm}×${pt.height_mm}`}</td><td className="fsc-num">{pt.quantity}</td><td><button className="fsc-btn fsc-btn-ghost" onClick={() => removerPeca(pt.id)} disabled={busy}>×</button></td></tr>)}</tbody>
                  </table>
                </div></div>
              </div>
              <div className="fsc-col-6">
                <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Estoque disponível ({detail.stock_pieces.length})</span><div className="fsc-section-banner-line" /></div>
                <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
                  {twoD ? <>
                    <div className="fsc-field fsc-col-4"><label className="fsc-label">Largura</label><input className="fsc-input fsc-input-right" type="number" value={stockForm.width_mm || ""} onChange={(e) => setStockForm((s) => ({ ...s, width_mm: Number(e.target.value) }))} /></div>
                    <div className="fsc-field fsc-col-4"><label className="fsc-label">Altura</label><input className="fsc-input fsc-input-right" type="number" value={stockForm.height_mm || ""} onChange={(e) => setStockForm((s) => ({ ...s, height_mm: Number(e.target.value) }))} /></div>
                  </> : <div className="fsc-field fsc-col-8"><label className="fsc-label">Comprimento (mm)</label><input className="fsc-input fsc-input-right" type="number" value={stockForm.length_mm || ""} onChange={(e) => setStockForm((s) => ({ ...s, length_mm: Number(e.target.value) }))} /></div>}
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Qtd</label><input className="fsc-input fsc-input-right" type="number" value={stockForm.quantity || ""} onChange={(e) => setStockForm((s) => ({ ...s, quantity: Number(e.target.value) }))} /></div>
                  <div className="fsc-field fsc-col-2" style={{ alignSelf: "end" }}><label className="fsc-action-label" style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" checked={!!stockForm.is_remnant} onChange={(e) => setStockForm((s) => ({ ...s, is_remnant: e.target.checked }))} /> retalho</label></div>
                  <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={adicionarEstoque} disabled={busy}>Adicionar estoque</button></div>
                </div></div></div>
                <div className="fsc-card"><div className="fsc-results-wrap">
                  <table className="fsc-table"><thead><tr><th className="fsc-num">Dim.</th><th className="fsc-num">Qtd</th><th>Retalho?</th><th></th></tr></thead>
                    <tbody>{detail.stock_pieces.length === 0 && <tr><td colSpan={4} className="fsc-empty">Sem estoque.</td></tr>}
                      {detail.stock_pieces.map((s) => <tr key={s.id}><td className="fsc-num">{s.length_mm ? `${s.length_mm}` : `${s.width_mm}×${s.height_mm}`}</td><td className="fsc-num">{s.quantity}</td><td>{s.is_remnant ? "Sim" : "Não"}</td><td><button className="fsc-btn fsc-btn-ghost" onClick={() => removerEstoque(s.id)} disabled={busy}>×</button></td></tr>)}</tbody>
                  </table>
                </div></div>
              </div>
            </div>

            {/* Padrões */}
            {detail.patterns.length > 0 && (
              <>
                <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Padrões de corte ({detail.patterns.length})</span><div className="fsc-section-banner-line" /></div>
                {detail.patterns.map((pat: PatternDTO) => (
                  <div className="fsc-card" key={pat.sequence}><div className="fsc-card-body">
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                      Padrão {pat.sequence} · repetir {pat.repeat_count}× · barra {pat.stock_length_mm ?? `${pat.stock_width_mm}×${pat.stock_height_mm}`} · aprov. {pct(pat.utilization_pct)} · sobra {pat.remnant_mm ?? "—"}mm {pat.reusable_remnant ? "(retalho ♻)" : ""}
                    </div>
                    <table className="fsc-table"><thead><tr><th className="fsc-num">Seq</th><th>Peça</th><th className="fsc-num">Dim.</th><th className="fsc-num">Posição</th></tr></thead>
                      <tbody>{pat.placements.map((pl, i) => <tr key={i}><td className="fsc-num">{pl.sequence}</td><td>{pl.label || pl.part_id}</td><td className="fsc-num">{pl.length_mm ? `${pl.length_mm}mm` : `${pl.width_mm}×${pl.height_mm}`}</td><td className="fsc-num">{pl.offset_mm != null ? `${pl.offset_mm}mm` : pl.pos_x_mm != null ? `(${pl.pos_x_mm},${pl.pos_y_mm})${pl.rotated ? " ↻" : ""}` : "0"}</td></tr>)}</tbody>
                    </table>
                  </div></div>
                ))}
              </>
            )}
            {unplaced.length > 0 && <div className="fsc-feedback error">⚠️ {unplaced.length} peça(s) sem encaixe (maior que qualquer estoque disponível).</div>}

            {program && (
              <>
                <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Programa de corte</span><div className="fsc-section-banner-line" /></div>
                <div className="fsc-card"><div className="fsc-card-body"><pre style={{ margin: 0, fontSize: 11, maxHeight: 240, overflow: "auto", whiteSpace: "pre-wrap" }}>{JSON.stringify(program, null, 2)}</pre></div></div>
              </>
            )}
          </>
        )}

        {/* Settings */}
        {settings && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Padrões da empresa (consumo)</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Modo de consumo</label>
                <select className="fsc-input" value={settings.default_consumption_mode ?? "AUTOMATIC"} onChange={(e) => setSettings((s) => ({ ...s, default_consumption_mode: e.target.value }))}>
                  <option value="AUTOMATIC">Automático (FIFO)</option><option value="MANUAL">Manual (por lote)</option></select></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Sobra mínima padrão (mm)</label><input className="fsc-input fsc-input-right" type="number" value={settings.default_min_remnant_mm ?? 0} onChange={(e) => setSettings((s) => ({ ...s, default_min_remnant_mm: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Depósito padrão</label><input className="fsc-input fsc-input-right" type="number" value={settings.default_warehouse_id ?? ""} onChange={(e) => setSettings((s) => ({ ...s, default_warehouse_id: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-3" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={salvarSettings} disabled={busy}>Salvar padrões</button></div>
            </div></div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Planos: <strong>{plans.length}</strong></div>{p && <div className="fsc-footer-stat">Aberto: <strong>{p.code}</strong></div>}</div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
