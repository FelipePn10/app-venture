import { useState, useCallback, useMemo, useEffect } from "react";
import {
  type SalesGoalDTO,
  type SalesGoalItemDTO,
  type SalesGoalPeriodDTO,
  listSalesGoals,
  getSalesGoal,
  createSalesGoal,
  addSalesGoalItem,
  listSalesGoalPeriods,
  createSalesGoalPeriod,
  getSalesGoalsReport,
  upsertGroupTarget,
  addGroupCustomer,
  upsertGoalBalance,
} from "@/services/salesGoalsService";
import { errMessage, parseNum } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadItems, loadRepresentatives, loadCustomers } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type View = "goals" | "periods";
type DetailTab = "dados" | "itens" | "grupo";

/** Os três patamares que o mercado usa para premiar o representante. */
const PATAMARES = [
  { chave: "minimum", rotulo: "Mínima" },
  { chave: "probable", rotulo: "Provável" },
  { chave: "ideal", rotulo: "Ideal" },
] as const;

const META_GRUPO_VAZIA = {
  commercial_group_code: "", goal_type: "VALOR",
  minimum_value: "", minimum_bonus_pct: "",
  probable_value: "", probable_bonus_pct: "",
  ideal_value: "", ideal_bonus_pct: "",
};

/** Repartição da meta do grupo entre os clientes que o compõem. */
const CLIENTE_META_VAZIA = {
  customer_code: "", representative_code: "",
  minimum_value: "", minimum_bonus_pct: "",
  probable_value: "", probable_bonus_pct: "",
  ideal_value: "", ideal_bonus_pct: "",
};

const SALDO_VAZIO = {
  next_period_code: "", balance_scope: "REPRESENTANTE", goal_type: "VALOR",
  realized_value: "", ideal_value: "", balance_value: "", notes: "",
};
type TargetKind = "item" | "classification" | "group";
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_GOAL: SalesGoalDTO = { representative_code: 0, period_code: 0, analysis_base: "SALES", award_pct: 0 };
const EMPTY_PERIOD: SalesGoalPeriodDTO = { period_type: "MONTH", start_date: "", end_date: "", description: "" };
const EMPTY_ITEM: { kind: TargetKind; target: string; quantity: string; value: string; sales_uom: string; bonus_pct: string } =
  { kind: "item", target: "", quantity: "", value: "", sales_uom: "UN", bonus_pct: "" };

export function Vvnd0500Page(): JSX.Element {
  const [view, setView] = useState<View>("goals");
  const [goals, setGoals] = useState<SalesGoalDTO[]>([]);
  const [periods, setPeriods] = useState<SalesGoalPeriodDTO[]>([]);
  const [selected, setSelected] = useState<SalesGoalDTO | null>(null);
  const [goalForm, setGoalForm] = useState<SalesGoalDTO>(EMPTY_GOAL);
  const [periodForm, setPeriodForm] = useState<SalesGoalPeriodDTO>(EMPTY_PERIOD);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [listSearch, setListSearch] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<DetailTab>("dados");
  const [metaGrupo, setMetaGrupo] = useState({ ...META_GRUPO_VAZIA });
  const [metaGrupoId, setMetaGrupoId] = useState<number | null>(null);
  const [clienteMeta, setClienteMeta] = useState({ ...CLIENTE_META_VAZIA });
  const [saldo, setSaldo] = useState({ ...SALDO_VAZIO });
  const [creating, setCreating] = useState(true);

  const setG = useCallback(<K extends keyof SalesGoalDTO>(k: K, v: SalesGoalDTO[K]) => setGoalForm((p) => ({ ...p, [k]: v })), []);
  const setP = useCallback(<K extends keyof SalesGoalPeriodDTO>(k: K, v: SalesGoalPeriodDTO[K]) => setPeriodForm((p) => ({ ...p, [k]: v })), []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregarPeriodos = useCallback(() => run(async () => { setPeriods(await listSalesGoalPeriods()); }), [run]);
  useEffect(() => { void carregarPeriodos(); }, [carregarPeriodos]);

  const refreshSelected = useCallback(async (code: number) => { setSelected(await getSalesGoal(code)); }, []);
  const listar = () => run(async () => { setGoals(await listSalesGoals()); });

  const novo = () => { setCreating(true); setSelected(null); setGoalForm(EMPTY_GOAL); setTab("dados"); setFeedback(null); };
  const abrir = (code?: number) => { if (!code) return; setCreating(false); setTab("dados"); void run(async () => { await refreshSelected(code); }); };

  const criarMeta = () => run(async () => {
    if (!goalForm.representative_code) { setFeedback({ type: "error", message: "Representante é obrigatório." }); return; }
    if (!goalForm.period_code) { setFeedback({ type: "error", message: "Período é obrigatório." }); return; }
    const created = await createSalesGoal(goalForm);
    setGoalForm(EMPTY_GOAL); await listar();
    if (created.code) { setCreating(false); await refreshSelected(created.code); }
    setFeedback({ type: "success", message: `Meta ${created.code} criada.` });
  });

  const criarPeriodo = () => run(async () => {
    if (!periodForm.description?.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    if (!periodForm.start_date || !periodForm.end_date) { setFeedback({ type: "error", message: "Datas inicial e final são obrigatórias." }); return; }
    if (periodForm.start_date > periodForm.end_date) { setFeedback({ type: "error", message: "Período invertido: início depois do fim." }); return; }
    await createSalesGoalPeriod(periodForm); setPeriodForm(EMPTY_PERIOD); await carregarPeriodos();
    setFeedback({ type: "success", message: "Período criado." });
  });

  const adicionarItem = () => { const code = selected?.code; if (!code) return; void run(async () => {
    if (!itemForm.target.trim()) { setFeedback({ type: "error", message: "Informe o alvo (item, classificação ou grupo)." }); return; }
    const numericTarget = Number(itemForm.target);
    const payload: SalesGoalItemDTO = {
      goal_code: code,
      target_type: itemForm.kind === "item" ? "ITEM" : itemForm.kind === "classification" ? "CLASSIFICATION" : "GROUP",
      item_code: itemForm.kind === "item" ? itemForm.target : undefined,
      item_classification_code: itemForm.kind === "classification" ? numericTarget : undefined,
      item_group_code: itemForm.kind === "group" ? numericTarget : undefined,
      target_quantity: itemForm.quantity ? Number(itemForm.quantity) : 0,
      target_value: itemForm.value ? Number(itemForm.value) : 0,
      sales_uom: itemForm.sales_uom || undefined,
      bonus_pct: itemForm.bonus_pct ? Number(itemForm.bonus_pct) : 0,
      is_active: true,
    };
    await addSalesGoalItem(payload);
    setItemForm(EMPTY_ITEM); await refreshSelected(code);
    setFeedback({ type: "success", message: "Linha de meta adicionada (alvo único)." });
  }); };

  const relatorio = () => run(async () => {
    const rows = await getSalesGoalsReport({
      representative_code: selected?.representative_code || undefined,
      period_code: selected?.period_code || undefined,
      analysis_base: selected?.analysis_base,
      include_missed_items: true,
    });
    setSummary(`Previsto × realizado: ${rows.length} linha(s) de meta na abrangência.`);
    setFeedback({ type: "info", message: "Relatório previsto × realizado gerado (veja a barra de status)." });
  });

  const items = selected?.items ?? [];
  const periodLabel = (c?: number) => { const p = periods.find((x) => x.code === c); return p ? `${p.description || p.period_type} (${p.start_date?.slice(0, 10)}→${p.end_date?.slice(0, 10)})` : (c ? `#${c}` : "—"); };
  const targetLabel = (it: SalesGoalItemDTO) => it.item_code ? `Item ${it.item_code}` : it.item_classification_code ? `Classif. ${it.item_classification_code}` : it.item_group_code ? `Grupo ${it.item_group_code}` : "—";
  const periodTypeLabel = (type?: string) => ({ MONTH: "Mensal", WEEK: "Semanal", CUSTOM: "Personalizado" }[type ?? ""] ?? type ?? "—");

  const visible = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return goals;
    return goals.filter((g) => String(g.code ?? "").includes(q) || String(g.representative_code ?? "").includes(q));
  }, [goals, listSearch]);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Metas de Vendas</span>
          <span className="erp-crumb-code">VVND0500</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Previsto × realizado · premiação</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className={`erp-btn${view === "goals" ? " erp-btn-dark" : ""}`} onClick={() => setView("goals")} disabled={busy}>Metas</button>
          <button className={`erp-btn${view === "periods" ? " erp-btn-dark" : ""}`} onClick={() => setView("periods")} disabled={busy}>Períodos</button>
        </div>
        {view === "goals" && <>
          <div className="erp-tspacer" />
          <div className="erp-tgroup">
            <button className="erp-btn erp-btn-primary" onClick={novo} disabled={busy}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Nova meta
            </button>
            <button className="erp-btn" onClick={listar} disabled={busy}>Listar</button>
            <button className="erp-btn" onClick={relatorio} disabled={busy || !selected}>Relatório</button>
          </div>
        </>}
        <div className="erp-tgroup"><ExportButton title="VVND0500 — Metas de Vendas" filename="vvnd0500" /></div>
      </div>

      <div className="erp-content">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

      {view === "periods" ? (
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Períodos</span><span className="erp-count">{periods.length}</span></div>
            <div className="erp-list">
              {periods.length === 0 && <div className="erp-list-empty">Nenhum período cadastrado.</div>}
              {periods.map((p) => (
                <div key={p.code} className="erp-list-row" style={{ cursor: "default" }}>
                  <span className="erp-list-code">#{p.code}</span>
                  <span className="erp-list-sub">{p.description || p.period_type}</span>
                  <div className="erp-list-meta"><span className="erp-badge info">{periodTypeLabel(p.period_type)}</span><span style={{ marginLeft: "auto", fontSize: 11, color: "var(--v-text-3)" }}>{p.start_date?.slice(0, 10)} → {p.end_date?.slice(0, 10)}</span></div>
                </div>
              ))}
            </div>
          </aside>
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Novo período</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Janela da meta</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c4"><label className="erp-label erp-req">Descrição</label><input className="erp-input" required value={periodForm.description ?? ""} onChange={(e) => setP("description", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Tipo</label><select className="erp-input" value={periodForm.period_type} onChange={(e) => setP("period_type", e.target.value as SalesGoalPeriodDTO["period_type"])}><option value="MONTH">Mensal</option><option value="WEEK">Semanal</option><option value="CUSTOM">Customizado</option></select></div>
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Início</label><input className="erp-input" type="date" value={periodForm.start_date} onChange={(e) => setP("start_date", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Fim</label><input className="erp-input" type="date" value={periodForm.end_date} onChange={(e) => setP("end_date", e.target.value)} /></div>
                  <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={criarPeriodo} disabled={busy}>Criar</button></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Metas</span>
              <span className="erp-count">{visible.length}</span>
              <div className="erp-panel-head-spacer" />
              <input className="erp-search" placeholder="Buscar…" value={listSearch} onChange={(e) => setListSearch(e.target.value)} />
            </div>
            <div className="erp-list">
              {visible.length === 0 && <div className="erp-list-empty">Nenhuma meta carregada.<br />Use <strong>Listar</strong> na barra acima.</div>}
              {visible.map((g) => (
                <div key={g.code} className={`erp-list-row${selected?.code === g.code ? " sel" : ""}`} onClick={() => abrir(g.code)}>
                  <span className="erp-list-code">#{g.code}</span>
                  <span className="erp-list-sub"><EntityName code={g.representative_code} loader={loadRepresentatives} prefix="Representante" /></span>
                  <div className="erp-list-meta"><span className="erp-badge info">{g.analysis_base === "SALES" ? "Vendas" : "Faturamento"}</span><span className="erp-badge">Prem. {g.award_pct ?? 0}%</span></div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            {creating ? (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Nova meta</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Cabeçalho da meta</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c3"><label className="erp-label erp-req">Representante</label><LookupField value={goalForm.representative_code || undefined} loader={loadRepresentatives} entityLabel="representante" onChange={(code) => setG("representative_code", code ?? 0)} /></div>
                      <div className="erp-field erp-c5"><label className="erp-label erp-req">Período</label>
                        <select className="erp-input" value={goalForm.period_code || ""} onChange={(e) => setG("period_code", Number(e.target.value))}>
                          <option value="">Selecionar período…</option>
                          {periods.map((p) => <option key={p.code} value={p.code}>{periodLabel(p.code)}</option>)}
                        </select>
                      </div>
                      <div className="erp-field erp-c2"><label className="erp-label">Base</label><select className="erp-input" value={goalForm.analysis_base} onChange={(e) => setG("analysis_base", e.target.value as SalesGoalDTO["analysis_base"])}><option value="SALES">Vendas</option><option value="INVOICING">Faturamento</option></select></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Premiação %</label><input className="erp-input num" type="number" value={goalForm.award_pct || ""} onChange={(e) => setG("award_pct", Number(e.target.value))} /></div>
                    </div>
                  </div>
                  {periods.length === 0 && <p style={{ fontSize: 12, color: "var(--v-text-3)" }}>Nenhum período cadastrado — crie um na aba <strong>Períodos</strong> antes.</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="erp-btn erp-btn-primary" onClick={criarMeta} disabled={busy}>{busy && <span className="erp-spin" />}Criar meta</button>
                    <button className="erp-btn" onClick={() => setGoalForm(EMPTY_GOAL)} disabled={busy}>Limpar</button>
                  </div>
                </div>
              </>
            ) : selected ? (
              <>
                <div className="erp-tabs">
                  <button className={`erp-tab${tab === "dados" ? " active" : ""}`} onClick={() => setTab("dados")}>Dados gerais</button>
                  <button className={`erp-tab${tab === "itens" ? " active" : ""}`} onClick={() => setTab("itens")}>Itens da meta ({items.length})</button>
                  <button className={`erp-tab${tab === "grupo" ? " active" : ""}`} onClick={() => setTab("grupo")}>Grupo e saldo</button>
                </div>
                <div className="erp-detail-body">
                  {tab === "grupo" ? (
                    <>
                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">Meta do grupo comercial — mínima, provável e ideal</div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c12"><span className="erp-field-hint">
                            A premiação do representante costuma ter três patamares: a meta mínima que garante o
                            bônus base, a provável que é a esperada, e a ideal que puxa o esforço. Sem os três,
                            só resta um número solto — e o comercial não sabe onde está.
                          </span></div>
                          <div className="erp-field erp-c3"><label className="erp-label erp-req">Grupo comercial</label>
                            <input className="erp-input num" type="number" value={metaGrupo.commercial_group_code}
                              onChange={(e) => setMetaGrupo((p) => ({ ...p, commercial_group_code: e.target.value }))} /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Tipo de meta</label>
                            <select className="erp-input" value={metaGrupo.goal_type}
                              onChange={(e) => setMetaGrupo((p) => ({ ...p, goal_type: e.target.value }))}>
                              <option value="VALOR">Valor</option><option value="QUANTIDADE">Quantidade</option>
                            </select></div>
                          {PATAMARES.map((pt) => (
                            <div className="erp-field erp-c12" key={pt.chave} style={{ flexDirection: "row", gap: 10 }}>
                              <div style={{ flex: 1 }}>
                                <label className="erp-label">Meta {pt.rotulo.toLowerCase()}</label>
                                <input className="erp-input num" type="number"
                                  value={metaGrupo[`${pt.chave}_value` as keyof typeof metaGrupo]}
                                  onChange={(e) => setMetaGrupo((p) => ({ ...p, [`${pt.chave}_value`]: e.target.value }))} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label className="erp-label">Bônus {pt.rotulo.toLowerCase()} (%)</label>
                                <input className="erp-input num" type="number"
                                  value={metaGrupo[`${pt.chave}_bonus_pct` as keyof typeof metaGrupo]}
                                  onChange={(e) => setMetaGrupo((p) => ({ ...p, [`${pt.chave}_bonus_pct`]: e.target.value }))} />
                              </div>
                            </div>
                          ))}
                          <div className="erp-field erp-c12" style={{ flexDirection: "row" }}>
                            <button className="erp-btn erp-btn-primary" disabled={busy} onClick={() => void run(async () => {
                              if (!metaGrupo.commercial_group_code) { setFeedback({ type: "error", message: "Informe o grupo comercial." }); return; }
                              const n = (v: string) => Number(v) || 0;
                              const gravada = await upsertGroupTarget({
                                period_code: selected.period_code,
                                commercial_group_code: Number(metaGrupo.commercial_group_code),
                                goal_type: metaGrupo.goal_type,
                                minimum_value: n(metaGrupo.minimum_value), minimum_bonus_pct: n(metaGrupo.minimum_bonus_pct),
                                probable_value: n(metaGrupo.probable_value), probable_bonus_pct: n(metaGrupo.probable_bonus_pct),
                                ideal_value: n(metaGrupo.ideal_value), ideal_bonus_pct: n(metaGrupo.ideal_bonus_pct),
                                is_active: true,
                              });
                              const id = parseNum(gravada, "id", "ID", "group_goal_id", "GroupGoalID");
                              setMetaGrupoId(id || null);
                              setMetaGrupo({ ...META_GRUPO_VAZIA });
                              setFeedback({
                                type: "success",
                                message: id
                                  ? "Meta do grupo gravada — agora dá para repartir entre os clientes."
                                  : "Meta do grupo gravada.",
                              });
                            })}>Gravar meta do grupo</button>
                          </div>
                        </div>
                      </div>

                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">Clientes da meta do grupo</div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c12">
                            <p className="erp-note">
                              A meta do grupo é o teto; aqui ela é repartida entre os clientes que compõem
                              o grupo. É o que permite cobrar o representante por cliente, e não só pelo
                              total — sem isso a meta do grupo fica sem dono.
                            </p>
                          </div>
                          {!metaGrupoId && (
                            <div className="erp-field erp-c12">
                              <span className="erp-hint">Grave a meta do grupo acima para liberar a divisão por cliente.</span>
                            </div>
                          )}
                          <div className="erp-field erp-c3">
                            <label className="erp-label erp-req">Cliente</label>
                            <LookupField value={Number(clienteMeta.customer_code) || undefined}
                              onChange={(c) => setClienteMeta((p) => ({ ...p, customer_code: c ? String(c) : "" }))}
                              loader={loadCustomers} entityLabel="cliente" placeholder="Escolher cliente" clearable />
                          </div>
                          <div className="erp-field erp-c3">
                            <label className="erp-label">Representante</label>
                            <LookupField value={Number(clienteMeta.representative_code) || undefined}
                              onChange={(c) => setClienteMeta((p) => ({ ...p, representative_code: c ? String(c) : "" }))}
                              loader={loadRepresentatives} entityLabel="representante" placeholder="Do cliente" clearable />
                          </div>
                          {PATAMARES.map((pt) => (
                            <div className="erp-field erp-c12" key={`cli-${pt.chave}`} style={{ flexDirection: "row", gap: 10 }}>
                              <div style={{ flex: 1 }}>
                                <label className="erp-label">Meta {pt.rotulo.toLowerCase()}</label>
                                <input className="erp-input num" type="number"
                                  value={clienteMeta[`${pt.chave}_value` as keyof typeof clienteMeta]}
                                  onChange={(e) => setClienteMeta((p) => ({ ...p, [`${pt.chave}_value`]: e.target.value }))} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label className="erp-label">Bônus {pt.rotulo.toLowerCase()} (%)</label>
                                <input className="erp-input num" type="number"
                                  value={clienteMeta[`${pt.chave}_bonus_pct` as keyof typeof clienteMeta]}
                                  onChange={(e) => setClienteMeta((p) => ({ ...p, [`${pt.chave}_bonus_pct`]: e.target.value }))} />
                              </div>
                            </div>
                          ))}
                          <div className="erp-field erp-c12">
                            <button className="erp-btn erp-btn-primary" disabled={busy || !metaGrupoId} onClick={() => void run(async () => {
                              if (!metaGrupoId) { setFeedback({ type: "error", message: "Grave a meta do grupo antes." }); return; }
                              if (!clienteMeta.customer_code) { setFeedback({ type: "error", message: "Escolha o cliente." }); return; }
                              const n = (v: string) => Number(v) || 0;
                              await addGroupCustomer({
                                group_goal_id: metaGrupoId,
                                customer_code: Number(clienteMeta.customer_code),
                                representative_code: clienteMeta.representative_code ? Number(clienteMeta.representative_code) : undefined,
                                minimum_value: n(clienteMeta.minimum_value), minimum_bonus_pct: n(clienteMeta.minimum_bonus_pct),
                                probable_value: n(clienteMeta.probable_value), probable_bonus_pct: n(clienteMeta.probable_bonus_pct),
                                ideal_value: n(clienteMeta.ideal_value), ideal_bonus_pct: n(clienteMeta.ideal_bonus_pct),
                                is_active: true,
                              });
                              setClienteMeta({ ...CLIENTE_META_VAZIA });
                              setFeedback({ type: "success", message: "Cliente incluído na meta do grupo." });
                            })}>Incluir cliente na meta</button>
                          </div>
                        </div>
                      </div>

                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">Saldo de meta — o que sobra ou falta vai para o próximo período</div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c3"><label className="erp-label">Abrangência</label>
                            <select className="erp-input" value={saldo.balance_scope}
                              onChange={(e) => setSaldo((p) => ({ ...p, balance_scope: e.target.value }))}>
                              <option value="REPRESENTANTE">Representante</option>
                              <option value="GRUPO">Grupo comercial</option>
                              <option value="CLIENTE">Cliente</option>
                            </select></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Próximo período</label>
                            <select className="erp-input" value={saldo.next_period_code}
                              onChange={(e) => setSaldo((p) => ({ ...p, next_period_code: e.target.value }))}>
                              <option value="">Não transfere</option>
                              {periods.map((p) => <option key={p.code} value={p.code}>{periodLabel(p.code)}</option>)}
                            </select></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Tipo de meta</label>
                            <select className="erp-input" value={saldo.goal_type}
                              onChange={(e) => setSaldo((p) => ({ ...p, goal_type: e.target.value }))}>
                              <option value="VALOR">Valor</option><option value="QUANTIDADE">Quantidade</option>
                            </select></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Realizado</label>
                            <input className="erp-input num" type="number" value={saldo.realized_value}
                              onChange={(e) => setSaldo((p) => ({ ...p, realized_value: e.target.value }))} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Meta ideal</label>
                            <input className="erp-input num" type="number" value={saldo.ideal_value}
                              onChange={(e) => setSaldo((p) => ({ ...p, ideal_value: e.target.value }))} /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Saldo</label>
                            <input className="erp-input num" type="number" value={saldo.balance_value}
                              onChange={(e) => setSaldo((p) => ({ ...p, balance_value: e.target.value }))} />
                            <span className="erp-field-hint">Positivo sobra, negativo falta.</span></div>
                          <div className="erp-field erp-c6"><label className="erp-label">Observações</label>
                            <input className="erp-input" value={saldo.notes}
                              onChange={(e) => setSaldo((p) => ({ ...p, notes: e.target.value }))} /></div>
                          <div className="erp-field erp-c12" style={{ flexDirection: "row" }}>
                            <button className="erp-btn erp-btn-primary" disabled={busy} onClick={() => void run(async () => {
                              const n = (v: string) => Number(v) || 0;
                              await upsertGoalBalance({
                                period_code: selected.period_code,
                                next_period_code: saldo.next_period_code ? Number(saldo.next_period_code) : null,
                                balance_scope: saldo.balance_scope,
                                representative_code: selected.representative_code,
                                goal_type: saldo.goal_type,
                                realized_value: n(saldo.realized_value),
                                ideal_value: n(saldo.ideal_value),
                                balance_value: n(saldo.balance_value),
                                notes: saldo.notes.trim() || null,
                              });
                              setSaldo({ ...SALDO_VAZIO });
                              setFeedback({ type: "success", message: "Saldo de meta gravado." });
                            })}>Gravar saldo</button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : tab === "dados" ? (
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Meta #{selected.code} <span className="erp-badge info" style={{ marginLeft: 4 }}>{selected.analysis_base === "SALES" ? "Vendas" : "Faturamento"}</span></div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c3"><label className="erp-label">Representante</label><div className="erp-input strong"><EntityName code={selected.representative_code} loader={loadRepresentatives} prefix="Representante" /></div></div>
                        <div className="erp-field erp-c6"><label className="erp-label">Período</label><input className="erp-input" value={periodLabel(selected.period_code)} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Premiação %</label><input className="erp-input num" value={selected.award_pct ?? 0} readOnly /></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">Adicionar linha (alvo único: item OU classificação OU grupo)</div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c3"><label className="erp-label erp-req">Tipo de alvo</label><select className="erp-input" value={itemForm.kind} onChange={(e) => setItemForm((p) => ({ ...p, kind: e.target.value as TargetKind, target: "" }))}><option value="item">Item</option><option value="classification">Classificação</option><option value="group">Grupo</option></select></div>
                          <div className="erp-field erp-c3"><label className="erp-label erp-req">Alvo</label>
                            {itemForm.kind === "item"
                              ? <LookupField value={itemForm.target || undefined} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => setItemForm((p) => ({ ...p, target: c ? String(c) : "" }))} />
                              : <input className="erp-input num" type="number" value={itemForm.target} onChange={(e) => setItemForm((p) => ({ ...p, target: e.target.value }))} />}
                          </div>
                          <div className="erp-field erp-c2"><label className="erp-label">Quantidade</label><input className="erp-input num" type="number" value={itemForm.quantity} onChange={(e) => setItemForm((p) => ({ ...p, quantity: e.target.value }))} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Valor</label><input className="erp-input num" type="number" value={itemForm.value} onChange={(e) => setItemForm((p) => ({ ...p, value: e.target.value }))} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Bônus %</label><input className="erp-input num" type="number" value={itemForm.bonus_pct} onChange={(e) => setItemForm((p) => ({ ...p, bonus_pct: e.target.value }))} /></div>
                          <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn erp-btn-primary" onClick={adicionarItem} disabled={busy}>{busy && <span className="erp-spin" />}Adicionar linha de meta</button></div>
                        </div>
                      </div>
                      <div className="erp-grid-wrap">
                        <table className="erp-grid">
                          <thead><tr><th>Alvo</th><th className="num">Quantidade</th><th className="num">Valor</th><th>UM</th><th className="num">Bônus %</th></tr></thead>
                          <tbody>
                            {items.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma linha nesta meta.</td></tr>}
                            {items.map((it) => (
                              <tr key={it.code}>
                                <td>{targetLabel(it)}</td>
                                <td className="num">{it.target_quantity ?? "—"}</td>
                                <td className="num">{money(it.target_value)}</td>
                                <td>{it.sales_uom ?? "—"}</td>
                                <td className="num">{it.bonus_pct ?? 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="erp-detail-empty">
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.2"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4"/></svg>
                <div className="erp-detail-empty-title">Nenhuma meta selecionada</div>
                <div className="erp-detail-empty-sub">Selecione uma meta na lista, ou clique em <strong>Nova meta</strong>. Crie os <strong>Períodos</strong> primeiro.</div>
              </div>
            )}
          </section>
        </div>
      )}
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Metas: <strong>{visible.length}</strong></div>
        <div className="erp-status-item">Períodos: <strong>{periods.length}</strong></div>
        {summary && <div className="erp-status-item">{summary}</div>}
        {selected && <div className="erp-status-item">Selecionada: <strong>#{selected.code}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
