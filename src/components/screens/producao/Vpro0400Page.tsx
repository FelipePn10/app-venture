import { useState, useCallback, useEffect } from "react";
import {
  type InspectionPlanDTO, type CharacteristicDTO, type QualityRecordDTO, type MeasurementDTO,
  type NonConformanceDTO, type PointType, type QualityResult, type NCSeverity, type NCDisposition,
  POINT_TYPES, QUALITY_RESULTS, NC_SEVERITIES, NC_DISPOSITIONS,
  listPlansByItem, getPlan, createPlan, deactivatePlan, addCharacteristic,
  listRecordsByOrder, listRecordsByItem, createRecord,
  listOpenNCs, createNC, dispositionNC,
} from "@/services/qualityService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type View = "plans" | "records" | "nc";

const resultBadge = (r?: string) => {
  const map: Record<string, string> = { APROVADO: "ok", REJEITADO: "err", CONDICIONAL: "warn", PENDENTE: "draft" };
  return <span className={`erp-badge ${map[r ?? ""] ?? "info"}`}>{r ?? "—"}</span>;
};
const sevBadge = (s?: string) => {
  const map: Record<string, string> = { CRITICA: "err", MAIOR: "warn", MENOR: "info", OBSERVACAO: "draft" };
  return <span className={`erp-badge ${map[s ?? ""] ?? "info"}`}>{s ?? "—"}</span>;
};

const EMPTY_PLAN: InspectionPlanDTO = { item_code: 0, point_type: "PROCESSO", description: "", sample_size: 1, acceptance_level: 0 };
const EMPTY_CHAR: CharacteristicDTO = { name: "", is_critical: false };
const EMPTY_NC: NonConformanceDTO = { item_code: 0, nonconform_qty: 1, description: "", severity: "MENOR" };

export function Vpro0400Page(): JSX.Element {
  const [view, setView] = useState<View>("plans");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  // planos
  const [planItem, setPlanItem] = useState<number | undefined>(undefined);
  const [plans, setPlans] = useState<InspectionPlanDTO[]>([]);
  const [planForm, setPlanForm] = useState<InspectionPlanDTO>(EMPTY_PLAN);
  const [selPlan, setSelPlan] = useState<InspectionPlanDTO | null>(null);
  const [charForm, setCharForm] = useState<CharacteristicDTO>(EMPTY_CHAR);

  // registros
  const [recPlanId, setRecPlanId] = useState<number | undefined>(undefined);
  const [recChars, setRecChars] = useState<CharacteristicDTO[]>([]);
  const [recForm, setRecForm] = useState<QualityRecordDTO>({ plan_id: 0, item_code: 0, inspected_qty: 0, approved_qty: 0, rejected_qty: 0, result: "PENDENTE" });
  const [meas, setMeas] = useState<Record<number, { measured_value: number; is_conformant: boolean }>>({});
  const [recFilterKind, setRecFilterKind] = useState<"order" | "item">("order");
  const [recFilterVal, setRecFilterVal] = useState("");
  const [records, setRecords] = useState<QualityRecordDTO[]>([]);

  // não-conformidades
  const [ncs, setNcs] = useState<NonConformanceDTO[]>([]);
  const [ncForm, setNcForm] = useState<NonConformanceDTO>(EMPTY_NC);
  const [dispSel, setDispSel] = useState<Record<number, NCDisposition>>({});

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  // ── planos ──
  const buscarPlanos = () => run(async () => {
    if (!planItem) { setFeedback({ type: "error", message: "Selecione o item." }); return; }
    const list = await listPlansByItem(planItem); setPlans(list);
    setFeedback({ type: "info", message: `${list.length} plano(s) para o item ${planItem}.` });
  });
  const gravarPlano = () => run(async () => {
    if (!planForm.item_code) { setFeedback({ type: "error", message: "Informe o item do plano." }); return; }
    if (!planForm.description.trim()) { setFeedback({ type: "error", message: "Informe a descrição." }); return; }
    await createPlan(planForm); setPlanForm(EMPTY_PLAN);
    setFeedback({ type: "success", message: "Plano de inspeção criado." });
    if (planItem) setPlans(await listPlansByItem(planItem));
  });
  const abrirPlano = (id?: number) => { if (!id) return; void run(async () => { setSelPlan(await getPlan(id)); }); };
  const removerPlano = (id?: number) => { if (!id) return; void run(async () => {
    await deactivatePlan(id); setSelPlan(null);
    setFeedback({ type: "success", message: `Plano ${id} desativado.` });
    if (planItem) setPlans(await listPlansByItem(planItem));
  }); };
  const gravarCarac = () => run(async () => {
    if (!selPlan?.id) return;
    if (!charForm.name.trim()) { setFeedback({ type: "error", message: "Informe o nome da característica." }); return; }
    await addCharacteristic({ ...charForm, plan_id: selPlan.id }); setCharForm(EMPTY_CHAR);
    setFeedback({ type: "success", message: "Característica adicionada." });
    setSelPlan(await getPlan(selPlan.id));
  });

  // ── registros ──
  const carregarPlanoRegistro = (id?: number) => { setRecPlanId(id); if (!id) { setRecChars([]); return; } void run(async () => {
    const p = await getPlan(id); setRecChars(p.characteristics ?? []);
    setRecForm((f) => ({ ...f, plan_id: id, item_code: p.item_code }));
  }); };
  const gravarRegistro = () => run(async () => {
    if (!recForm.plan_id) { setFeedback({ type: "error", message: "Selecione o plano." }); return; }
    const measurements: MeasurementDTO[] = Object.entries(meas).map(([cid, m]) => ({ characteristic_id: Number(cid), measured_value: m.measured_value, is_conformant: m.is_conformant }));
    await createRecord({ ...recForm, measurements });
    setFeedback({ type: "success", message: "Registro de inspeção gravado." });
    setMeas({});
  });
  const filtrarRegistros = () => run(async () => {
    const v = Number(recFilterVal);
    if (!v) { setFeedback({ type: "error", message: "Informe o código de filtro." }); return; }
    setRecords(recFilterKind === "order" ? await listRecordsByOrder(v) : await listRecordsByItem(v));
  });

  // ── NCs ──
  const carregarNCs = useCallback(() => run(async () => { setNcs(await listOpenNCs()); }), [run]);
  useEffect(() => { void carregarNCs(); }, [carregarNCs]);
  const gravarNC = () => run(async () => {
    if (!ncForm.item_code) { setFeedback({ type: "error", message: "Informe o item." }); return; }
    if (!ncForm.description.trim()) { setFeedback({ type: "error", message: "Descreva a não-conformidade." }); return; }
    await createNC(ncForm); setNcForm(EMPTY_NC);
    setFeedback({ type: "success", message: "Não-conformidade registrada." });
    await carregarNCs();
  });
  const aplicarDisposicao = (nc: NonConformanceDTO) => { const d = dispSel[nc.id!]; if (!nc.id || !d) { setFeedback({ type: "error", message: "Escolha a disposição." }); return; } void run(async () => {
    await dispositionNC(nc.id!, d);
    setFeedback({ type: "success", message: `NC ${nc.id} → ${d}.` });
    await carregarNCs();
  }); };

  const numField = (label: string, val: number | null | undefined, on: (n: number) => void, req = false, cls = "erp-c3") => (
    <div className={`erp-field ${cls}`}><label className={`erp-label${req ? " erp-req" : ""}`}>{label}</label><input className="erp-input num" type="number" value={val ?? ""} onChange={(e) => on(Number(e.target.value))} /></div>
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Produção &amp; Chão de Fábrica</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Qualidade — Planos, Registros e Não-conformidades</span>
          <span className="erp-crumb-code">VPRO0400</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Planos de inspeção · características · laudos · NC/disposição</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className={`erp-btn${view === "plans" ? " erp-btn-dark" : ""}`} onClick={() => setView("plans")} disabled={busy}>Planos &amp; Características</button>
          <button className={`erp-btn${view === "records" ? " erp-btn-dark" : ""}`} onClick={() => setView("records")} disabled={busy}>Registros</button>
          <button className={`erp-btn${view === "nc" ? " erp-btn-dark" : ""}`} onClick={() => setView("nc")} disabled={busy}>Não-conformidades</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPRO0400 — Qualidade" filename="vpro0400" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        {view === "plans" && (
          <div className="erp-main">
            <div className="erp-list-panel">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Novo plano de inspeção</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c6"><label className="erp-label erp-req">Item</label><LookupField value={planForm.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setPlanForm((p) => ({ ...p, item_code: c ?? 0 }))} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label erp-req">Momento</label><select className="erp-tselect" value={planForm.point_type} onChange={(e) => setPlanForm((p) => ({ ...p, point_type: e.target.value as PointType }))}>{POINT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="erp-field erp-c12"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={planForm.description} onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))} /></div>
                  {numField("Tam. amostra", planForm.sample_size, (n) => setPlanForm((p) => ({ ...p, sample_size: n })), true, "erp-c3")}
                  {numField("Nível aceitação", planForm.acceptance_level, (n) => setPlanForm((p) => ({ ...p, acceptance_level: n })), false, "erp-c3")}
                  {numField("Op. roteiro (id)", planForm.route_operation_id, (n) => setPlanForm((p) => ({ ...p, route_operation_id: n || null })), false, "erp-c3")}
                  <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={gravarPlano} disabled={busy}>Criar plano</button></div>
                </div>
              </div>
              <div className="erp-toolbar" style={{ borderRadius: 0 }}>
                <div className="erp-tgroup"><span className="erp-tgroup-label">Item</span><div style={{ minWidth: 200 }}><LookupField value={planItem} loader={loadItems} entityLabel="item" onChange={setPlanItem} /></div><button className="erp-btn erp-btn-primary" onClick={buscarPlanos} disabled={busy}>Buscar planos</button></div>
              </div>
              <div className="erp-grid-wrap">
                <table className="erp-grid">
                  <thead><tr><th className="num">ID</th><th>Momento</th><th>Descrição</th><th className="num">Amostra</th></tr></thead>
                  <tbody>
                    {plans.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Busque planos por item.</td></tr>}
                    {plans.map((p) => (
                      <tr key={p.id} onClick={() => abrirPlano(p.id)} className={selPlan?.id === p.id ? "erp-row-sel" : ""} style={{ cursor: "pointer" }}>
                        <td className="num">{p.id}</td><td>{p.point_type}</td><td>{p.description}</td><td className="num">{p.sample_size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="erp-detail-panel">
              {selPlan ? (
                <>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Plano {selPlan.id} — {selPlan.point_type} · item {selPlan.item_code}
                      <button className="erp-btn erp-btn-danger erp-btn-sm" style={{ float: "right" }} onClick={() => removerPlano(selPlan.id)} disabled={busy}>Desativar</button>
                    </div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c12"><label className="erp-label">Descrição</label><input className="erp-input" readOnly value={selPlan.description} /></div>
                    </div>
                  </div>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Nova característica</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c5"><label className="erp-label erp-req">Nome</label><input className="erp-input" value={charForm.name} onChange={(e) => setCharForm((p) => ({ ...p, name: e.target.value }))} /></div>
                      {numField("Nominal", charForm.nominal, (n) => setCharForm((p) => ({ ...p, nominal: n })), false, "erp-c3")}
                      <div className="erp-field erp-c2"><label className="erp-label">Unidade</label><input className="erp-input" value={charForm.unit ?? ""} onChange={(e) => setCharForm((p) => ({ ...p, unit: e.target.value }))} /></div>
                      <div className="erp-field erp-c2" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="crit" className="erp-check" type="checkbox" checked={!!charForm.is_critical} onChange={(e) => setCharForm((p) => ({ ...p, is_critical: e.target.checked }))} /><label htmlFor="crit" className="erp-label" style={{ margin: 0 }}>Crítica</label></div>
                      {numField("Tol. inferior", charForm.tolerance_lower, (n) => setCharForm((p) => ({ ...p, tolerance_lower: n })), false, "erp-c3")}
                      {numField("Tol. superior", charForm.tolerance_upper, (n) => setCharForm((p) => ({ ...p, tolerance_upper: n })), false, "erp-c3")}
                      <div className="erp-field erp-c6" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={gravarCarac} disabled={busy}>Adicionar característica</button></div>
                    </div>
                  </div>
                  <div className="erp-grid-wrap">
                    <table className="erp-grid">
                      <thead><tr><th>Característica</th><th className="num">Nominal</th><th className="num">Tol. −/+</th><th>Un.</th><th>Crítica</th></tr></thead>
                      <tbody>
                        {(selPlan.characteristics ?? []).length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Sem características.</td></tr>}
                        {(selPlan.characteristics ?? []).map((c) => (
                          <tr key={c.id}><td>{c.name}</td><td className="num">{c.nominal ?? "—"}</td><td className="num">{c.tolerance_lower ?? "—"} / {c.tolerance_upper ?? "—"}</td><td>{c.unit || "—"}</td><td>{c.is_critical ? <span className="erp-badge err">Crítica</span> : ""}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="erp-fieldset"><div className="erp-fieldset-body"><p style={{ padding: 12, color: "var(--v-text-3)" }}>Selecione um plano para gerenciar suas características.</p></div></div>
              )}
            </div>
          </div>
        )}

        {view === "records" && (
          <>
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Novo registro de inspeção (laudo)</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c6"><label className="erp-label erp-req">Plano</label>
                  <select className="erp-tselect" value={recPlanId ?? ""} onChange={(e) => carregarPlanoRegistro(e.target.value ? Number(e.target.value) : undefined)}>
                    <option value="">— busque planos na aba Planos —</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.point_type} · {p.description}</option>)}
                  </select>
                </div>
                {numField("OF (id)", recForm.production_order_id, (n) => setRecForm((f) => ({ ...f, production_order_id: n || null })), false, "erp-c3")}
                <div className="erp-field erp-c3"><label className="erp-label">Lote</label><input className="erp-input" value={recForm.lot ?? ""} onChange={(e) => setRecForm((f) => ({ ...f, lot: e.target.value }))} /></div>
                {numField("Inspecionado", recForm.inspected_qty, (n) => setRecForm((f) => ({ ...f, inspected_qty: n })), true, "erp-c3")}
                {numField("Aprovado", recForm.approved_qty, (n) => setRecForm((f) => ({ ...f, approved_qty: n })), true, "erp-c3")}
                {numField("Rejeitado", recForm.rejected_qty, (n) => setRecForm((f) => ({ ...f, rejected_qty: n })), true, "erp-c3")}
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Resultado</label><select className="erp-tselect" value={recForm.result} onChange={(e) => setRecForm((f) => ({ ...f, result: e.target.value as QualityResult }))}>{QUALITY_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                <div className="erp-field erp-c12"><label className="erp-label">Observações</label><input className="erp-input" value={recForm.notes ?? ""} onChange={(e) => setRecForm((f) => ({ ...f, notes: e.target.value }))} /></div>
              </div>
            </div>
            {recChars.length > 0 && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Medições por característica</div>
                <div className="erp-fieldset-body">
                  {recChars.map((c) => (
                    <div key={c.id} className="erp-field erp-c6" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <label className="erp-label" style={{ margin: 0, minWidth: 120 }}>{c.name}{c.unit ? ` (${c.unit})` : ""}</label>
                      <input className="erp-input num" type="number" placeholder="valor" style={{ width: 100 }} value={meas[c.id!]?.measured_value ?? ""} onChange={(e) => setMeas((m) => ({ ...m, [c.id!]: { measured_value: Number(e.target.value), is_conformant: m[c.id!]?.is_conformant ?? true } }))} />
                      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><input className="erp-check" type="checkbox" checked={meas[c.id!]?.is_conformant ?? true} onChange={(e) => setMeas((m) => ({ ...m, [c.id!]: { measured_value: m[c.id!]?.measured_value ?? 0, is_conformant: e.target.checked } }))} />conforme</label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 12 }}><button className="erp-btn erp-btn-primary" onClick={gravarRegistro} disabled={busy}>{busy && <span className="erp-spin" />}Gravar registro</button></div>

            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Consultar registros</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label">Filtrar por</label><select className="erp-tselect" value={recFilterKind} onChange={(e) => setRecFilterKind(e.target.value as "order" | "item")}><option value="order">Ordem (OF)</option><option value="item">Item</option></select></div>
                <div className="erp-field erp-c3"><label className="erp-label">Código</label><input className="erp-input num" type="number" value={recFilterVal} onChange={(e) => setRecFilterVal(e.target.value)} /></div>
                <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn" onClick={filtrarRegistros} disabled={busy}>Consultar</button></div>
              </div>
            </div>
            <div className="erp-grid-wrap">
              <table className="erp-grid">
                <thead><tr><th className="num">ID</th><th className="num">Plano</th><th className="num">OF</th><th>Lote</th><th className="num">Insp/Aprov/Rej</th><th>Resultado</th></tr></thead>
                <tbody>
                  {records.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Sem registros.</td></tr>}
                  {records.map((r) => (
                    <tr key={r.id}><td className="num">{r.id}</td><td className="num">{r.plan_id}</td><td className="num">{r.production_order_id ?? "—"}</td><td>{r.lot || "—"}</td><td className="num">{r.inspected_qty}/{r.approved_qty}/{r.rejected_qty}</td><td>{resultBadge(r.result)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === "nc" && (
          <>
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Registrar não-conformidade</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label><LookupField value={ncForm.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setNcForm((p) => ({ ...p, item_code: c ?? 0 }))} /></div>
                {numField("Registro (id)", ncForm.quality_record_id, (n) => setNcForm((p) => ({ ...p, quality_record_id: n || null })), false, "erp-c2")}
                {numField("OF (id)", ncForm.production_order_id, (n) => setNcForm((p) => ({ ...p, production_order_id: n || null })), false, "erp-c2")}
                <div className="erp-field erp-c2"><label className="erp-label">Lote</label><input className="erp-input" value={ncForm.lot ?? ""} onChange={(e) => setNcForm((p) => ({ ...p, lot: e.target.value }))} /></div>
                {numField("Qtd NC", ncForm.nonconform_qty, (n) => setNcForm((p) => ({ ...p, nonconform_qty: n })), true, "erp-c2")}
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Severidade</label><select className="erp-tselect" value={ncForm.severity} onChange={(e) => setNcForm((p) => ({ ...p, severity: e.target.value as NCSeverity }))}>{NC_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="erp-field erp-c9"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={ncForm.description} onChange={(e) => setNcForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn erp-btn-primary" onClick={gravarNC} disabled={busy}>Registrar NC</button><button className="erp-btn" style={{ marginLeft: 8 }} onClick={() => carregarNCs()} disabled={busy}>Atualizar abertas</button></div>
              </div>
            </div>
            <div className="erp-grid-wrap">
              <table className="erp-grid">
                <thead><tr><th className="num">ID</th><th className="num">Item</th><th>Lote</th><th className="num">Qtd</th><th>Severidade</th><th>Descrição</th><th style={{ width: 260 }}>Disposição</th></tr></thead>
                <tbody>
                  {ncs.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma NC em aberto.</td></tr>}
                  {ncs.map((nc) => (
                    <tr key={nc.id}>
                      <td className="num">{nc.id}</td><td className="num">{nc.item_code}</td><td>{nc.lot || "—"}</td><td className="num">{nc.nonconform_qty}</td><td>{sevBadge(nc.severity)}</td><td>{nc.description}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <select className="erp-tselect" value={dispSel[nc.id!] ?? ""} onChange={(e) => setDispSel((d) => ({ ...d, [nc.id!]: e.target.value as NCDisposition }))}>
                            <option value="">— disposição —</option>{NC_DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <button className="erp-btn erp-btn-sm" onClick={() => aplicarDisposicao(nc)} disabled={busy}>Aplicar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <footer className="erp-statusbar">
        {view === "plans" && <div className="erp-status-item">Planos: <strong>{plans.length}</strong>{selPlan && <> · Características: <strong>{selPlan.characteristics?.length ?? 0}</strong></>}</div>}
        {view === "records" && <div className="erp-status-item">Registros: <strong>{records.length}</strong></div>}
        {view === "nc" && <div className="erp-status-item">NC abertas: <strong>{ncs.length}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
