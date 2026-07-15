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
} from "@/services/salesGoalsService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type View = "goals" | "periods";
type DetailTab = "dados" | "itens";
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
    if (!periodForm.start_date || !periodForm.end_date) { setFeedback({ type: "error", message: "Datas inicial e final são obrigatórias." }); return; }
    if (periodForm.start_date > periodForm.end_date) { setFeedback({ type: "error", message: "Período invertido: início depois do fim." }); return; }
    await createSalesGoalPeriod(periodForm); setPeriodForm(EMPTY_PERIOD); await carregarPeriodos();
    setFeedback({ type: "success", message: "Período criado." });
  });

  const adicionarItem = () => { const code = selected?.code; if (!code) return; void run(async () => {
    if (!itemForm.target.trim()) { setFeedback({ type: "error", message: "Informe o alvo (item, classificação ou grupo)." }); return; }
    const t = Number(itemForm.target);
    const payload: SalesGoalItemDTO = {
      goal_code: code,
      target_type: itemForm.kind === "item" ? "ITEM" : itemForm.kind === "classification" ? "CLASSIFICATION" : "GROUP",
      item_code: itemForm.kind === "item" ? t : undefined,
      item_classification_code: itemForm.kind === "classification" ? t : undefined,
      item_group_code: itemForm.kind === "group" ? t : undefined,
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
                  <div className="erp-list-meta"><span className="erp-badge info">{p.period_type}</span><span style={{ marginLeft: "auto", fontSize: 11, color: "var(--v-text-3)" }}>{p.start_date?.slice(0, 10)} → {p.end_date?.slice(0, 10)}</span></div>
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
                  <div className="erp-field erp-c4"><label className="erp-label">Descrição</label><input className="erp-input" value={periodForm.description ?? ""} onChange={(e) => setP("description", e.target.value)} /></div>
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
                  <span className="erp-list-sub">Repres. {g.representative_code}</span>
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
                      <div className="erp-field erp-c3"><label className="erp-label erp-req">Representante</label><input className="erp-input num" type="number" value={goalForm.representative_code || ""} onChange={(e) => setG("representative_code", Number(e.target.value))} /></div>
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
                </div>
                <div className="erp-detail-body">
                  {tab === "dados" ? (
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Meta #{selected.code} <span className="erp-badge info" style={{ marginLeft: 4 }}>{selected.analysis_base === "SALES" ? "Vendas" : "Faturamento"}</span></div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c3"><label className="erp-label">Representante</label><input className="erp-input num strong" value={selected.representative_code} readOnly /></div>
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
                              ? <LookupField value={itemForm.target ? Number(itemForm.target) : undefined} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => setItemForm((p) => ({ ...p, target: c ? String(c) : "" }))} />
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
