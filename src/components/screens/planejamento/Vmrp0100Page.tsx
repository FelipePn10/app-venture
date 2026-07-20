import { useState, useCallback } from "react";
import {
  type MrpSuggestion, type MrpProfileRow, type ConfiguredRule, type MrpException, type PlannedOrder, type MrpRunResult,
  RULE_TYPES,
  runMrp, getMrpProfile, getExceptions,
  listSuggestions, firmSuggestion,
  listConfiguredRules, createConfiguredRule,
  listPlannedOrders, firmPlannedOrder,
} from "@/services/mrpService";
import { type ProductionPlanDTO, type InterFactoryDTO, listProductionPlans, createProductionPlan, getInterFactories, setInterFactories } from "@/services/productionPlanService";
import { type MrpReport, type ReportParams, reportProfile, reportAvailability, reportGroupedNeeds, reportExplosion, reportReorderPoint } from "@/services/mrpReportsService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const d10 = (s?: string) => s?.slice(0, 10) ?? "—";

type ReportKind = "profile" | "availability" | "grouped-needs" | "explosion" | "reorder-point";
const REPORT_LABELS: Record<ReportKind, string> = {
  profile: "Perfil",
  availability: "Disponibilidade",
  "grouped-needs": "Necessidades agrupadas",
  explosion: "Explosão (multinível)",
  "reorder-point": "Ponto de reposição",
};
const fmtCell = (v: unknown): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}T/.test(s) ? s.slice(0, 10) : s;
};

export function Vmrp0100Page(): JSX.Element {
  const [planCode, setPlanCode] = useState("1");
  const [initialOrder, setInitialOrder] = useState("10000");
  const [plans, setPlans] = useState<ProductionPlanDTO[]>([]);
  const [newPlan, setNewPlan] = useState({ code: "", name: "" });
  const [runResult, setRunResult] = useState<MrpRunResult | null>(null);
  const [suggestions, setSuggestions] = useState<MrpSuggestion[]>([]);
  const [planned, setPlanned] = useState<PlannedOrder[]>([]);
  const [exceptions, setExceptions] = useState<MrpException[]>([]);
  const [profileItem, setProfileItem] = useState("");
  const [profile, setProfile] = useState<MrpProfileRow[]>([]);
  const [ruleItem, setRuleItem] = useState("");
  const [rules, setRules] = useState<ConfiguredRule[]>([]);
  const [ruleForm, setRuleForm] = useState<ConfiguredRule>({ item_code: 0, table_type: "PLANNING_DATA", field_name: "lead_time", rule_type: "EQUAL", rule_value: "", sequence: 1 });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  // Inter-fábrica (empresas de origem cujas ordens INTER_FACTORY entram no cálculo)
  const [interFactories, setInterFactoriesState] = useState<InterFactoryDTO[]>([]);
  const [ifForm, setIfForm] = useState({ code: "", autoRelease: false });
  // Relatórios operacionais (/api/mrp-reports)
  const [reportKind, setReportKind] = useState<ReportKind>("profile");
  const [repItem, setRepItem] = useState("");
  const [repFrom, setRepFrom] = useState("");
  const [repTo, setRepTo] = useState("");
  const [repQty, setRepQty] = useState("1");
  const [report, setReport] = useState<MrpReport | null>(null);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const pc = () => Number(planCode);

  const carregarPlanos = () => run(async () => { setPlans(await listProductionPlans()); });
  const criarPlano = () => run(async () => {
    const code = Number(newPlan.code);
    if (!code) { setFeedback({ type: "error", message: "Informe um código de plano positivo." }); return; }
    if (!newPlan.name.trim()) { setFeedback({ type: "error", message: "Nome do plano é obrigatório." }); return; }
    await createProductionPlan({ code, name: newPlan.name.trim(), planning_types: ["MRP"] });
    setNewPlan({ code: "", name: "" });
    setPlans(await listProductionPlans());
    setPlanCode(String(code));
    setFeedback({ type: "success", message: `Plano ${code} criado — selecionado para rodar o MRP.` });
  });

  const rodarMrp = () => run(async () => {
    const c = pc(); if (!c) { setFeedback({ type: "error", message: "Informe o código do plano." }); return; }
    const ion = Number(initialOrder); if (!ion || ion <= 0) { setFeedback({ type: "error", message: "Nº inicial de ordem deve ser positivo." }); return; }
    const r = await runMrp(c, ion); setRunResult(r);
    setFeedback({ type: "success", message: `MRP executado (${r.status ?? "OK"}) — ${r.items_processed ?? 0} itens, ${r.orders_generated ?? 0} ordens.` });
    await carregar();
  });
  const carregar = useCallback(async () => {
    const c = Number(planCode); if (!c) return;
    const [sg, ex, po] = await Promise.all([listSuggestions(c), getExceptions(c), listPlannedOrders()]);
    setSuggestions(sg); setExceptions(ex); setPlanned(po);
  }, [planCode]);
  const consultar = () => run(async () => { await carregar(); setFeedback({ type: "info", message: "Sugestões, exceções e ordens carregadas." }); });

  const firmar = (code: number) => run(async () => {
    const po = await firmSuggestion(code);
    setFeedback({ type: "success", message: `Sugestão ${code} firmada → Ordem Planejada ${po.order_number ?? po.planned_code}${po.order_type === "PRODUCTION" ? " (+ OF criada)" : ""}.` });
    await carregar();
  });
  const firmarPlanejada = (code?: number) => { if (!code) return; void run(async () => { await firmPlannedOrder(code); setFeedback({ type: "success", message: `Ordem planejada ${code} firmada.` }); await carregar(); }); };

  const verPerfil = () => run(async () => {
    const it = Number(profileItem), c = pc();
    if (!it || !c) { setFeedback({ type: "error", message: "Informe item e plano." }); return; }
    setProfile(await getMrpProfile(it, c));
  });

  const verRegras = () => run(async () => { const it = Number(ruleItem); if (!it) { setFeedback({ type: "error", message: "Informe o item." }); return; } setRules(await listConfiguredRules(it)); setRuleForm((s) => ({ ...s, item_code: it })); });
  const criarRegra = () => run(async () => {
    if (!ruleForm.item_code || !ruleForm.field_name.trim()) { setFeedback({ type: "error", message: "Item e campo são obrigatórios." }); return; }
    await createConfiguredRule(ruleForm);
    setFeedback({ type: "success", message: "Regra configurada criada." });
    setRules(await listConfiguredRules(ruleForm.item_code));
  });

  // ── Inter-fábrica ──
  const listarInter = () => run(async () => { const c = pc(); if (!c) { setFeedback({ type: "error", message: "Informe o plano." }); return; } setInterFactoriesState(await getInterFactories(c)); });
  const addInter = () => run(async () => {
    const c = pc(); if (!c) { setFeedback({ type: "error", message: "Informe o plano." }); return; }
    const code = Number(ifForm.code);
    if (!code) { setFeedback({ type: "error", message: "Informe o código da empresa de origem." }); return; }
    if (interFactories.some((f) => f.source_enterprise_code === code)) { setFeedback({ type: "error", message: "Empresa já associada." }); return; }
    const next = [...interFactories, { source_enterprise_code: code, auto_release: ifForm.autoRelease }];
    setInterFactoriesState(await setInterFactories(c, next));
    setIfForm({ code: "", autoRelease: false });
    setFeedback({ type: "success", message: `Empresa ${code} associada ao plano ${c}.` });
  });
  const removeInter = (code: number) => run(async () => {
    const c = pc(); if (!c) return;
    const next = interFactories.filter((f) => f.source_enterprise_code !== code);
    setInterFactoriesState(await setInterFactories(c, next));
    setFeedback({ type: "success", message: `Empresa ${code} removida${next.length === 0 ? " (lista esvaziada)" : ""}.` });
  });

  // ── Relatórios operacionais ──
  const gerarRelatorio = () => run(async () => {
    const c = pc(); const it = Number(repItem);
    if ((reportKind === "profile" || reportKind === "grouped-needs") && !c) {
      setFeedback({ type: "error", message: `O relatório "${REPORT_LABELS[reportKind]}" exige o código do plano MRP.` });
      return;
    }
    const common: ReportParams = {};
    if (c) common.plan_code = c;
    if (it) common.item_code = it;
    if (repFrom) common.from = repFrom;
    if (repTo) common.to = repTo;
    let r: MrpReport;
    switch (reportKind) {
      case "profile": r = await reportProfile({ ...common, plan_code: c, layout: "SINTETICO", position: "CURRENT" }); break;
      case "availability":
        if (!it) { setFeedback({ type: "error", message: "Disponibilidade exige item (+ quantidade) ou pedidos de venda." }); return; }
        r = await reportAvailability({ ...common, quantity: Number(repQty) || 1, layout: "AMBOS" }); break;
      case "grouped-needs": r = await reportGroupedNeeds({ ...common, plan_code: c }); break;
      case "explosion":
        if (!it) { setFeedback({ type: "error", message: "Explosão exige o item a explodir." }); return; }
        r = await reportExplosion(it, { quantity: Number(repQty) || 1, at: repTo || repFrom || undefined, list_mode: "TODOS", explosion_option: "SIMPLES" }); break;
      case "reorder-point": r = await reportReorderPoint({ ...common, planning_type: "REORDER_POINT" }); break;
      default: return;
    }
    setReport(r);
    setFeedback({ type: "info", message: `Relatório "${REPORT_LABELS[reportKind]}": ${r.rows.length} linha(s).` });
  });
  const reportCols = report && report.rows.length > 0 ? Array.from(report.rows.reduce((set, row) => { Object.keys(row).forEach((k) => set.add(k)); return set; }, new Set<string>())) : [];

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Planejamento</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">MRP (Planejamento de Materiais)</span><span className="erp-crumb-code">VMRP0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Plano</span>
          <input className="erp-input num" style={{ width: 80, height: 32 }} type="number" value={planCode} onChange={(e) => setPlanCode(e.target.value)} />
          <span className="erp-tgroup-label">Nº ordem inicial</span>
          <input className="erp-input num" style={{ width: 90, height: 32 }} type="number" value={initialOrder} onChange={(e) => setInitialOrder(e.target.value)} title="initial_order_number — obrigatório e positivo" />
          <button className="erp-btn erp-btn-primary" onClick={rodarMrp} disabled={busy}>Rodar MRP</button>
          <button className="erp-btn" onClick={consultar} disabled={busy}>Consultar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VMRP0100 — MRP" filename="vmrp0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">MRP</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* Planos MRP (o plano que o cálculo roda) */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Planos de produção (MRP)</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label">Novo — código</label><input className="erp-input num" type="number" value={newPlan.code} onChange={(e) => setNewPlan((p) => ({ ...p, code: e.target.value }))} /></div>
          <div className="erp-field erp-c4"><label className="erp-label">Nome</label><input className="erp-input" value={newPlan.name} onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))} /></div>
          <div className="erp-field erp-c3" style={{ alignSelf: "end", display: "flex", gap: 8 }}>
            <button className="erp-btn erp-btn-primary" onClick={criarPlano} disabled={busy}>Criar plano</button>
            <button className="erp-btn" onClick={carregarPlanos} disabled={busy}>Listar planos</button></div>
        
        {plans.length > 0 && (
          <table className="erp-grid" style={{ marginTop: 10 }}>
            <thead><tr><th>Código</th><th>Nome</th><th>Modos</th><th>Ativo</th><th></th></tr></thead>
            <tbody>{plans.map((pl) => <tr key={pl.code} className={Number(planCode) === pl.code ? "erp-row-sel" : ""}><td>{pl.code}</td><td>{pl.name}</td><td>{(pl.planning_types ?? []).join(", ")}</td><td>{pl.is_active ? "Sim" : "Não"}</td><td><button className="erp-btn" onClick={() => setPlanCode(String(pl.code))} disabled={busy}>Selecionar</button></td></tr>)}</tbody>
          </table>
        )}
        </div></div>

        {/* Empresas inter-fábrica do plano */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Empresas inter-fábrica ({interFactories.length}) — <span style={{fontWeight:400,opacity:0.65}}>Origens cujas ordens INTER_FACTORY entram como demanda DIF no plano {planCode}</span></div><div className="erp-fieldset-body">
          <div className="erp-field erp-c3"><label className="erp-label">Empresa origem (código)</label><input className="erp-input num" type="number" value={ifForm.code} onChange={(e) => setIfForm((s) => ({ ...s, code: e.target.value }))} /></div>
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><label className="erp-label" style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={ifForm.autoRelease} onChange={(e) => setIfForm((s) => ({ ...s, autoRelease: e.target.checked }))} />Liberação automática</label></div>
          <div className="erp-field erp-c4" style={{ alignSelf: "end", display: "flex", gap: 8 }}>
            <button className="erp-btn erp-btn-primary" onClick={addInter} disabled={busy}>Associar</button>
            <button className="erp-btn" onClick={listarInter} disabled={busy}>Listar</button></div>
        
        {interFactories.length > 0 && (
          <table className="erp-grid" style={{ marginTop: 10 }}>
            <thead><tr><th>Empresa origem</th><th>Liberação automática</th><th></th></tr></thead>
            <tbody>{interFactories.map((f) => <tr key={f.source_enterprise_code}><td>{f.source_enterprise_code}</td><td>{f.auto_release ? "Sim" : "Não"}</td><td><button className="erp-btn" onClick={() => removeInter(f.source_enterprise_code)} disabled={busy}>Remover</button></td></tr>)}</tbody>
          </table>
        )}
        </div></div>

        {runResult && (
          <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body">
            <div className="erp-field erp-c3"><label className="erp-label">Status</label><input className="erp-input" value={runResult.status ?? "—"} readOnly /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Itens processados</label><input className="erp-input num" value={runResult.items_processed ?? 0} readOnly /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Ordens geradas</label><input className="erp-input num" value={runResult.orders_generated ?? 0} readOnly /></div>
          </div></div>
        )}

        {/* Sugestões */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Sugestões de ordens ({suggestions.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Código</th><th>Item</th><th>Qtd</th><th>Tipo ordem</th><th>Demanda</th><th>Necessidade</th><th>Início</th><th>LLC</th><th></th></tr></thead>
            <tbody>
              {suggestions.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhuma sugestão. Rode o MRP e clique em Consultar.</td></tr>}
              {suggestions.map((s) => (
                <tr key={s.code}>
                  <td>{s.code}</td><td>{s.item_code}</td><td>{s.quantity}</td>
                  <td>{s.order_type === "PRODUCTION" ? "Fabricação" : s.order_type === "PURCHASE" ? "Compra" : s.order_type}</td>
                  <td>{s.demand_type === "INDEPENDENT" ? "Independente" : s.demand_type === "DEPENDENT" ? "Dependente" : s.demand_type}</td>
                  <td>{d10(s.need_date)}</td><td>{d10(s.start_date)}</td><td>{s.llc}</td>
                  <td><button className="erp-btn erp-btn-primary" onClick={() => firmar(s.code)} disabled={busy}>Firmar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>

        {/* Exceções */}
        {exceptions.length > 0 && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Exceções / alertas ({exceptions.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid"><thead><tr><th>Item</th><th>Tipo</th><th>Descrição</th></tr></thead>
                <tbody>{exceptions.map((e, i) => <tr key={i}><td>{e.item_code}</td><td>{e.message_type}</td><td>{e.description}</td></tr>)}</tbody>
              </table>
            </div></div></div>
          </>
        )}

        {/* Ordens Planejadas */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Ordens planejadas ({planned.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Nº ordem</th><th>Item</th><th>Qtd</th><th>Tipo</th><th>Status</th><th>Firme?</th><th></th></tr></thead>
            <tbody>
              {planned.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma ordem planejada.</td></tr>}
              {planned.map((o, i) => (
                <tr key={i}>
                  <td>{o.order_number ?? o.code}</td><td>{o.item_code}</td><td>{o.quantity}</td>
                  <td>{o.order_type}</td><td>{o.status}</td><td>{o.is_firm ? "Sim" : "Não"}</td>
                  <td>{!o.is_firm && <button className="erp-btn" onClick={() => firmarPlanejada(o.code ?? o.planned_code)} disabled={busy}>Firmar</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>

        {/* Perfil do item */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Perfil MRP do item (tabela time-phased)</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c3"><label className="erp-label">Item</label><input className="erp-input num" type="number" value={profileItem} onChange={(e) => setProfileItem(e.target.value)} /></div>
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={verPerfil} disabled={busy}>Ver perfil</button></div>
        
        {profile.length > 0 && (
          <table className="erp-grid" style={{ marginTop: 10 }}>
            <thead><tr><th>Data</th><th>Demanda</th><th>Planejadas</th><th>Firmes</th><th>Estoque proj.</th></tr></thead>
            <tbody>{profile.map((r, i) => <tr key={i}><td>{d10(r.date)}</td><td>{r.demand ?? 0}</td><td>{r.planned_orders ?? 0}</td><td>{r.firm_orders ?? 0}</td><td>{r.projected_stock ?? 0}</td></tr>)}</tbody>
          </table>
        )}
        </div></div>

        {/* Regras configuradas */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Regras configuradas por item</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label">Item</label><input className="erp-input num" type="number" value={ruleItem} onChange={(e) => setRuleItem(e.target.value)} /></div>
          <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={verRegras} disabled={busy}>Listar</button></div>
          <div className="erp-field erp-c2"><label className="erp-label">Tabela</label>
            <select className="erp-input" value={ruleForm.table_type} onChange={(e) => setRuleForm((s) => ({ ...s, table_type: e.target.value }))}><option value="PLANNING_DATA">PLANNING_DATA</option><option value="PLANNER_DATA">PLANNER_DATA</option></select></div>
          <div className="erp-field erp-c2"><label className="erp-label">Campo</label><input className="erp-input" value={ruleForm.field_name} onChange={(e) => setRuleForm((s) => ({ ...s, field_name: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Regra</label>
            <select className="erp-input" value={ruleForm.rule_type} onChange={(e) => setRuleForm((s) => ({ ...s, rule_type: e.target.value as ConfiguredRule["rule_type"] }))}>{RULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="erp-field erp-c2"><label className="erp-label">Valor</label><input className="erp-input" value={ruleForm.rule_value} onChange={(e) => setRuleForm((s) => ({ ...s, rule_value: e.target.value }))} /></div>
          <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={criarRegra} disabled={busy}>Criar regra</button></div>
        
        {rules.length > 0 && (
          <table className="erp-grid" style={{ marginTop: 10 }}>
            <thead><tr><th>Item</th><th>Tabela</th><th>Campo</th><th>Regra</th><th>Valor</th><th>Seq</th></tr></thead>
            <tbody>{rules.map((r, i) => <tr key={i}><td>{r.item_code}</td><td>{r.table_type}</td><td>{r.field_name}</td><td>{r.rule_type}</td><td>{r.rule_value}</td><td>{r.sequence ?? "—"}</td></tr>)}</tbody>
          </table>
        )}
        </div></div>

        {/* Relatórios operacionais (/api/mrp-reports) */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Relatórios operacionais — <span style={{fontWeight:400,opacity:0.65}}>perfil · disponibilidade · necessidades agrupadas · explosão · ponto de reposição</span></div><div className="erp-fieldset-body">
          <div className="erp-field erp-c3"><label className="erp-label">Relatório</label>
            <select className="erp-input" value={reportKind} onChange={(e) => setReportKind(e.target.value as ReportKind)}>{(Object.keys(REPORT_LABELS) as ReportKind[]).map((k) => <option key={k} value={k}>{REPORT_LABELS[k]}</option>)}</select></div>
          <div className="erp-field erp-c2"><label className="erp-label">Item{reportKind === "explosion" ? " *" : ""}</label><input className="erp-input num" type="number" value={repItem} onChange={(e) => setRepItem(e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">{reportKind === "explosion" ? "Quantidade" : "De"}</label>{reportKind === "explosion" || reportKind === "availability" ? <input className="erp-input num" type="number" value={repQty} onChange={(e) => setRepQty(e.target.value)} /> : <input className="erp-input" type="date" value={repFrom} onChange={(e) => setRepFrom(e.target.value)} />}</div>
          <div className="erp-field erp-c2"><label className="erp-label">{reportKind === "explosion" ? "Data (at)" : "Até"}</label><input className="erp-input" type="date" value={repTo} onChange={(e) => setRepTo(e.target.value)} /></div>
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={gerarRelatorio} disabled={busy}>Gerar relatório</button></div>
        
        {report && (
          report.rows.length === 0
            ? <div className="erp-grid-empty" style={{ marginTop: 10 }}>Sem linhas para os filtros informados.</div>
            : <div className="erp-fieldset-body" style={{ marginTop: 10 }}><table className="erp-grid">
                <thead><tr>{reportCols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>{report.rows.map((row, i) => <tr key={i}>{reportCols.map((c) => <td key={c}>{fmtCell(row[c])}</td>)}</tr>)}</tbody>
                {report.totals && <tfoot><tr>{reportCols.map((c, i) => <td key={c} style={{ fontWeight: 600 }}>{i === 0 ? "Totais" : fmtCell(report.totals?.[c])}</td>)}</tr></tfoot>}
              </table></div>
        )}
        </div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Sugestões: <strong>{suggestions.length}</strong></div><div className="erp-status-item">Ordens: <strong>{planned.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
