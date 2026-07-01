import { useState, useCallback } from "react";
import {
  type MrpSuggestion, type MrpProfileRow, type ConfiguredRule, type MrpException, type PlannedOrder, type MrpRunResult,
  RULE_TYPES,
  runMrp, getMrpProfile, getExceptions,
  listSuggestions, firmSuggestion,
  listConfiguredRules, createConfiguredRule,
  listPlannedOrders, firmPlannedOrder,
} from "@/services/mrpService";
import { type ProductionPlanDTO, listProductionPlans, createProductionPlan } from "@/services/productionPlanService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const d10 = (s?: string) => s?.slice(0, 10) ?? "—";

export function Vmrp0100Page(): JSX.Element {
  const [planCode, setPlanCode] = useState("1");
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
    const r = await runMrp(c); setRunResult(r);
    setFeedback({ type: "success", message: `MRP executado (${r.status ?? "OK"}) — ${r.items_processed ?? 0} itens, ${r.orders_generated ?? 0} ordens.` });
    await carregar();
  });
  const carregar = useCallback(async () => {
    const c = pc(); if (!c) return;
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

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VMRP0100 — MRP (Planejamento de Materiais)</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Plano</span>
          <input className="fsc-input fsc-input-right" style={{ width: 80, height: 32 }} type="number" value={planCode} onChange={(e) => setPlanCode(e.target.value)} />
          <button className="fsc-btn fsc-btn-primary" onClick={rodarMrp} disabled={busy}>Rodar MRP</button>
          <button className="fsc-btn fsc-btn-ghost" onClick={consultar} disabled={busy}>Consultar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VMRP0100 — MRP" filename="vmrp0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* Planos MRP (o plano que o cálculo roda) */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Planos de produção (MRP)</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Novo — código</label><input className="fsc-input fsc-input-right" type="number" value={newPlan.code} onChange={(e) => setNewPlan((p) => ({ ...p, code: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-4"><label className="fsc-label">Nome</label><input className="fsc-input" value={newPlan.name} onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-3" style={{ alignSelf: "end", display: "flex", gap: 8 }}>
            <button className="fsc-btn fsc-btn-primary" onClick={criarPlano} disabled={busy}>Criar plano</button>
            <button className="fsc-btn fsc-btn-ghost" onClick={carregarPlanos} disabled={busy}>Listar planos</button></div>
        </div>
        {plans.length > 0 && (
          <table className="fsc-table" style={{ marginTop: 10 }}>
            <thead><tr><th className="fsc-num">Código</th><th>Nome</th><th>Modos</th><th>Ativo</th><th></th></tr></thead>
            <tbody>{plans.map((pl) => <tr key={pl.code} className={Number(planCode) === pl.code ? "fsc-row-selected" : ""}><td className="fsc-num">{pl.code}</td><td>{pl.name}</td><td>{(pl.planning_types ?? []).join(", ")}</td><td>{pl.is_active ? "Sim" : "Não"}</td><td><button className="fsc-btn fsc-btn-ghost" onClick={() => setPlanCode(String(pl.code))} disabled={busy}>Selecionar</button></td></tr>)}</tbody>
          </table>
        )}
        </div></div>

        {runResult && (
          <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Status</label><input className="fsc-input" value={runResult.status ?? "—"} readOnly /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Itens processados</label><input className="fsc-input fsc-input-right" value={runResult.items_processed ?? 0} readOnly /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Ordens geradas</label><input className="fsc-input fsc-input-right" value={runResult.orders_generated ?? 0} readOnly /></div>
          </div></div></div>
        )}

        {/* Sugestões */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Sugestões de ordens ({suggestions.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Código</th><th className="fsc-num">Item</th><th className="fsc-num">Qtd</th><th>Tipo ordem</th><th>Demanda</th><th>Necessidade</th><th>Início</th><th className="fsc-num">LLC</th><th></th></tr></thead>
            <tbody>
              {suggestions.length === 0 && <tr><td colSpan={9} className="fsc-empty">Nenhuma sugestão. Rode o MRP e clique em Consultar.</td></tr>}
              {suggestions.map((s) => (
                <tr key={s.code}>
                  <td className="fsc-num">{s.code}</td><td className="fsc-num">{s.item_code}</td><td className="fsc-num">{s.quantity}</td>
                  <td>{s.order_type === "PRODUCTION" ? "Fabricação" : s.order_type === "PURCHASE" ? "Compra" : s.order_type}</td>
                  <td>{s.demand_type === "INDEPENDENT" ? "Independente" : s.demand_type === "DEPENDENT" ? "Dependente" : s.demand_type}</td>
                  <td>{d10(s.need_date)}</td><td>{d10(s.start_date)}</td><td className="fsc-num">{s.llc}</td>
                  <td><button className="fsc-btn fsc-btn-primary" onClick={() => firmar(s.code)} disabled={busy}>Firmar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {/* Exceções */}
        {exceptions.length > 0 && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Exceções / alertas ({exceptions.length})</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table"><thead><tr><th className="fsc-num">Item</th><th>Tipo</th><th>Descrição</th></tr></thead>
                <tbody>{exceptions.map((e, i) => <tr key={i}><td className="fsc-num">{e.item_code}</td><td>{e.message_type}</td><td>{e.description}</td></tr>)}</tbody>
              </table>
            </div></div>
          </>
        )}

        {/* Ordens Planejadas */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Ordens planejadas ({planned.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Nº ordem</th><th className="fsc-num">Item</th><th className="fsc-num">Qtd</th><th>Tipo</th><th>Status</th><th>Firme?</th><th></th></tr></thead>
            <tbody>
              {planned.length === 0 && <tr><td colSpan={7} className="fsc-empty">Nenhuma ordem planejada.</td></tr>}
              {planned.map((o, i) => (
                <tr key={i}>
                  <td className="fsc-num">{o.order_number ?? o.code}</td><td className="fsc-num">{o.item_code}</td><td className="fsc-num">{o.quantity}</td>
                  <td>{o.order_type}</td><td>{o.status}</td><td>{o.is_firm ? "Sim" : "Não"}</td>
                  <td>{!o.is_firm && <button className="fsc-btn fsc-btn-ghost" onClick={() => firmarPlanejada(o.code ?? o.planned_code)} disabled={busy}>Firmar</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {/* Perfil do item */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Perfil MRP do item (tabela time-phased)</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Item</label><input className="fsc-input fsc-input-right" type="number" value={profileItem} onChange={(e) => setProfileItem(e.target.value)} /></div>
          <div className="fsc-field fsc-col-3" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-ghost" onClick={verPerfil} disabled={busy}>Ver perfil</button></div>
        </div>
        {profile.length > 0 && (
          <table className="fsc-table" style={{ marginTop: 10 }}>
            <thead><tr><th>Data</th><th className="fsc-num">Demanda</th><th className="fsc-num">Planejadas</th><th className="fsc-num">Firmes</th><th className="fsc-num">Estoque proj.</th></tr></thead>
            <tbody>{profile.map((r, i) => <tr key={i}><td>{d10(r.date)}</td><td className="fsc-num">{r.demand ?? 0}</td><td className="fsc-num">{r.planned_orders ?? 0}</td><td className="fsc-num">{r.firm_orders ?? 0}</td><td className="fsc-num">{r.projected_stock ?? 0}</td></tr>)}</tbody>
          </table>
        )}
        </div></div>

        {/* Regras configuradas */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Regras configuradas por item</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Item</label><input className="fsc-input fsc-input-right" type="number" value={ruleItem} onChange={(e) => setRuleItem(e.target.value)} /></div>
          <div className="fsc-field fsc-col-2" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-ghost" onClick={verRegras} disabled={busy}>Listar</button></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Tabela</label>
            <select className="fsc-input" value={ruleForm.table_type} onChange={(e) => setRuleForm((s) => ({ ...s, table_type: e.target.value }))}><option value="PLANNING_DATA">PLANNING_DATA</option><option value="PLANNER_DATA">PLANNER_DATA</option></select></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Campo</label><input className="fsc-input" value={ruleForm.field_name} onChange={(e) => setRuleForm((s) => ({ ...s, field_name: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Regra</label>
            <select className="fsc-input" value={ruleForm.rule_type} onChange={(e) => setRuleForm((s) => ({ ...s, rule_type: e.target.value as ConfiguredRule["rule_type"] }))}>{RULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Valor</label><input className="fsc-input" value={ruleForm.rule_value} onChange={(e) => setRuleForm((s) => ({ ...s, rule_value: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={criarRegra} disabled={busy}>Criar regra</button></div>
        </div>
        {rules.length > 0 && (
          <table className="fsc-table" style={{ marginTop: 10 }}>
            <thead><tr><th className="fsc-num">Item</th><th>Tabela</th><th>Campo</th><th>Regra</th><th>Valor</th><th className="fsc-num">Seq</th></tr></thead>
            <tbody>{rules.map((r, i) => <tr key={i}><td className="fsc-num">{r.item_code}</td><td>{r.table_type}</td><td>{r.field_name}</td><td>{r.rule_type}</td><td>{r.rule_value}</td><td className="fsc-num">{r.sequence ?? "—"}</td></tr>)}</tbody>
          </table>
        )}
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Sugestões: <strong>{suggestions.length}</strong></div><div className="fsc-footer-stat">Ordens: <strong>{planned.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
