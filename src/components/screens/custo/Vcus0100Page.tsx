import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type WorkCenterCost, type PurchaseCost, type StandardCost,
  type OverheadRule, type OverheadRuleDTO, type OverheadBase, type OverheadMethod,
  type CostHistoryEntry,
  OVERHEAD_BASES, OVERHEAD_METHODS, OVERHEAD_BASE_LABELS, OVERHEAD_METHOD_LABELS,
  overheadRateLabel,
  listWorkCenterCosts, upsertWorkCenterCost,
  getPurchaseCost, upsertPurchaseCost, calculateStandardCost,
  listOverheadRules, createOverheadRule, updateOverheadRule, deactivateOverheadRule,
  listCostHistory,
} from "@/services/standardCostService";
import {
  type AllocationBase, type OverheadAllocation,
  listAllocations, createAllocation, listOverheadAllocations, createOverheadAllocation,
} from "@/services/allocationsService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import {
  loadItems, loadWorkCenters, loadChartOfAccounts, loadFinancialCostCenters, loadCostCenters,
} from "@/services/lookups";

/**
 * VCUS0100 — Custos.
 *
 * ── O que o motor de custo fazia e o que faltava ──
 * A apuração já descia a estrutura, aplicava perda, creditava co-produto, escolhia
 * substituto, cobrava cada operação na taxa do SEU centro de trabalho separando
 * hora-máquina de hora-homem, diluía setup pelo lote e reconhecia operação de
 * terceiro. Faltava o que os ERPs grandes chamam de esquema de cálculo:
 *
 *  1. **Indiretos não entravam.** `overhead_cost` era gravado SEMPRE ZERO — a coluna
 *     existia e não havia como configurar. Energia, depreciação, supervisão e
 *     aluguel simplesmente não chegavam ao custo do produto. É a maior diferença
 *     contra SAP (esquema de cálculo com taxas de sobrecarga), Oracle (overhead
 *     rates por recurso), TOTVS (taxas de CIF) e Focco (despesas indiretas).
 *  2. **O custo saía em dois números** — material e "operação". Sem separar
 *     preparação, máquina, mão de obra e terceiro, não se sabe o que atacar: setup
 *     alto pede lote maior, hora-máquina alta pede outro recurso, terceiro alto pede
 *     internalizar.
 *  3. **Não havia nível próprio × nível inferior**, então um aumento no custo não
 *     dizia se veio da fábrica ou do que se comprou.
 *  4. **Toda apuração sobrescrevia a anterior** — sem histórico não se responde
 *     "por que o custo subiu 12% este mês".
 *
 * As quatro lacunas estão fechadas (migração 000373). Esta tela mostra os
 * componentes, a árvore da estrutura, o rastro de cada indireto aplicado, o
 * cadastro do esquema de rateio e a comparação com as apurações anteriores.
 */

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const COST_TABS = [
  "Apuração do custo",
  "Esquema de indiretos",
  "Centros de trabalho",
  "Custos de compra",
  "Histórico",
  "Rateio contábil",
] as const;

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const today = () => new Date().toISOString().slice(0, 10);

const REGRA_VAZIA: OverheadRuleDTO = {
  code: "", description: "", base: "CONVERSAO", method: "PERCENTUAL", rate: 0,
  valid_from: today(), is_active: true,
};

/** Uma linha da composição do custo, para a tabela de componentes. */
type LinhaDeComponente = { rotulo: string; valor: number; explicacao: string };

export function Vcus0100Page(): JSX.Element {
  const [activeTab, setActiveTab] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  // ── apuração ──
  const [rollupItem, setRollupItem] = useState("");
  const [rollupLote, setRollupLote] = useState("1");
  const [rollup, setRollup] = useState<StandardCost | null>(null);

  // ── esquema de indiretos ──
  const [regras, setRegras] = useState<OverheadRule[]>([]);
  const [regraForm, setRegraForm] = useState<OverheadRuleDTO>(REGRA_VAZIA);
  const [regraEditando, setRegraEditando] = useState<number | null>(null);
  /** O percentual é digitado em % e gravado como fração: 12 na tela, 0,12 no banco. */
  const [taxaDigitada, setTaxaDigitada] = useState("");

  // ── centros de trabalho ──
  const [wccs, setWccs] = useState<WorkCenterCost[]>([]);
  const [wccForm, setWccForm] = useState({ work_center_id: 0, machine_cost_per_hour: 0, labor_cost_per_hour: 0 });

  // ── custo de compra ──
  const [pcForm, setPcForm] = useState({ item_code: "", cost: 0 });
  const [pcResult, setPcResult] = useState<PurchaseCost | null>(null);

  // ── histórico ──
  const [histItem, setHistItem] = useState("");
  const [historico, setHistorico] = useState<CostHistoryEntry[]>([]);

  // ── rateio contábil (bases e distribuição entre centros) ──
  const [bases, setBases] = useState<AllocationBase[]>([]);
  const [ovhs, setOvhs] = useState<OverheadAllocation[]>([]);
  const [baseForm, setBaseForm] = useState<AllocationBase>({ code: 0, description: "", period: "" });
  const [ovhForm, setOvhForm] = useState({
    cost_center_code: 0, period_start: "", period_end: "", allocation_type: "PERCENTAGE",
    description: "", target_cost_center: 0, target_pct: 100, plan_account_code: 0, base_code: 0,
  });

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const loadAll = useCallback(() => run(async () => {
    const [w, b, o, r] = await Promise.all([
      listWorkCenterCosts(),
      listAllocations(),
      listOverheadAllocations(),
      listOverheadRules().catch(() => [] as OverheadRule[]),
    ]);
    setWccs(w); setBases(b); setOvhs(o); setRegras(r);
  }), [run]);
  useEffect(() => { void loadAll(); }, [loadAll]);

  // ── apuração ──────────────────────────────────────────────────────────────

  const componentes = useMemo<LinhaDeComponente[]>(() => {
    if (!rollup) return [];
    return [
      { rotulo: "Material", valor: rollup.material_cost,
        explicacao: "Componentes comprados, com a perda da estrutura e o crédito de co-produto já aplicados" },
      { rotulo: "Preparação (setup)", valor: rollup.setup_cost ?? 0,
        explicacao: `Diluída pelo lote de ${rollup.lot_size ?? 1}: um lote maior baixa este número` },
      { rotulo: "Hora-máquina", valor: rollup.machine_cost ?? 0,
        explicacao: "Ocupação do equipamento na taxa do centro de trabalho de cada operação" },
      { rotulo: "Mão de obra direta", valor: rollup.labor_cost ?? 0,
        explicacao: "Horas-homem do roteiro, já multiplicadas pelo tamanho da equipe" },
      { rotulo: "Serviço de terceiro", valor: rollup.subcontract_cost ?? 0,
        explicacao: "Operações externas do roteiro, no preço vigente do fornecedor" },
      { rotulo: "Indiretos", valor: rollup.overhead_cost,
        explicacao: regras.length === 0
          ? "Zero: nenhuma regra de indireto cadastrada — veja a aba Esquema de indiretos"
          : "Aplicados pelo esquema de rateio; o rastro de cada regra está abaixo" },
    ].filter((l) => l.valor !== 0 || l.rotulo === "Indiretos");
  }, [rollup, regras.length]);

  const rodarRollup = () => run(async () => {
    if (!rollupItem) { setFeedback({ type: "error", message: "Escolha o item a apurar." }); return; }
    const lote = Number(rollupLote) || 1;
    const r = await calculateStandardCost(rollupItem, undefined, lote);
    setRollup(r);
    const semIndireto = (r.overhead_cost ?? 0) === 0 && regras.length === 0;
    setFeedback({
      type: semIndireto ? "info" : "success",
      message: semIndireto
        ? `Custo do item ${rollupItem} apurado em ${money(r.total_cost)} — SEM indiretos, porque nenhuma regra está cadastrada. Energia, depreciação e supervisão não estão neste número.`
        : `Custo do item ${rollupItem} apurado em ${money(r.total_cost)} para o lote de ${lote}.`,
    });
  });

  // ── esquema de indiretos ──────────────────────────────────────────────────

  /** Percentual entra em %, valor entra em reais. A conversão acontece na borda. */
  const taxaParaGravar = (metodo: OverheadMethod, digitado: string): number => {
    const n = Number(digitado.replace(",", "."));
    if (!Number.isFinite(n)) return 0;
    return metodo === "PERCENTUAL" ? n / 100 : n;
  };

  const salvarRegra = () => run(async () => {
    const dto: OverheadRuleDTO = { ...regraForm, rate: taxaParaGravar(regraForm.method, taxaDigitada) };
    if (!dto.code.trim()) { setFeedback({ type: "error", message: "Informe o código da regra." }); return; }
    if (!dto.description.trim()) { setFeedback({ type: "error", message: "Informe a descrição: é o que explica o indireto no custo do produto." }); return; }
    if (!dto.rate || dto.rate <= 0) { setFeedback({ type: "error", message: "Informe a taxa da regra." }); return; }
    if (dto.method === "PERCENTUAL" && dto.rate > 1) {
      setFeedback({ type: "error", message: `${taxaDigitada}% é mais que 100% da base. Confira o número.` }); return;
    }
    if (dto.method === "VALOR_POR_HORA" && !["MAQUINA", "MAO_DE_OBRA", "CONVERSAO", "SETUP"].includes(dto.base)) {
      setFeedback({ type: "error", message: "Valor por hora só incide sobre bases medidas em horas: máquina, mão de obra, preparação ou conversão." });
      return;
    }
    if (regraEditando) await updateOverheadRule(regraEditando, dto);
    else await createOverheadRule(dto);
    setRegras(await listOverheadRules());
    setRegraForm(REGRA_VAZIA); setTaxaDigitada(""); setRegraEditando(null);
    setFeedback({ type: "success", message: `Regra ${dto.code} salva. A próxima apuração já a aplica.` });
  });

  const editarRegra = (r: OverheadRule) => {
    setRegraForm({
      code: r.code, description: r.description, base: r.base, method: r.method, rate: r.rate,
      work_center_id: r.work_center_id, item_code: r.item_code,
      plano_contas_id: r.plano_contas_id, centro_custo_id: r.centro_custo_id,
      valid_from: r.valid_from, valid_to: r.valid_to, is_active: r.is_active, notes: r.notes,
    });
    setTaxaDigitada(r.method === "PERCENTUAL" ? String(Number((r.rate * 100).toFixed(6))) : String(r.rate));
    setRegraEditando(r.id);
    setFeedback({ type: "info", message: `Regra ${r.code} carregada para alteração.` });
  };

  const desativarRegra = (r: OverheadRule) => run(async () => {
    if (!window.confirm(`Desativar a regra ${r.code}?\n\nAs próximas apurações deixam de aplicar este indireto. O histórico das apurações antigas continua apontando para ela.`)) return;
    await deactivateOverheadRule(r.id);
    setRegras(await listOverheadRules());
    setFeedback({ type: "success", message: `Regra ${r.code} desativada.` });
  });

  // ── centros de trabalho ───────────────────────────────────────────────────

  const salvarWcc = () => run(async () => {
    if (!wccForm.work_center_id) { setFeedback({ type: "error", message: "Escolha o centro de trabalho." }); return; }
    if (!wccForm.machine_cost_per_hour && !wccForm.labor_cost_per_hour) {
      setFeedback({ type: "error", message: "Informe a taxa de máquina, a de mão de obra, ou as duas." }); return;
    }
    // `cost_per_hour` é a taxa combinada que o backend mantém por compatibilidade;
    // a apuração usa a de máquina, caindo nela quando o desdobramento não existe.
    await upsertWorkCenterCost(wccForm.work_center_id, wccForm.machine_cost_per_hour,
      { machine: wccForm.machine_cost_per_hour, labor: wccForm.labor_cost_per_hour });
    setWccForm({ work_center_id: 0, machine_cost_per_hour: 0, labor_cost_per_hour: 0 });
    setWccs(await listWorkCenterCosts());
    setFeedback({ type: "success", message: "Taxas do centro de trabalho atualizadas." });
  });

  // ── custo de compra ───────────────────────────────────────────────────────

  const salvarPc = () => run(async () => {
    if (!pcForm.item_code) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    if (!pcForm.cost || pcForm.cost <= 0) { setFeedback({ type: "error", message: "Informe o custo de compra." }); return; }
    const r = await upsertPurchaseCost(pcForm.item_code, pcForm.cost);
    setPcResult(r);
    setFeedback({ type: "success", message: `Custo de compra do item ${pcForm.item_code} atualizado. Reapure os produtos que o consomem.` });
  });
  const consultarPc = () => run(async () => {
    if (!pcForm.item_code) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    setPcResult(await getPurchaseCost(pcForm.item_code));
  });

  // ── histórico ─────────────────────────────────────────────────────────────

  const carregarHistorico = () => run(async () => {
    if (!histItem) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    const linhas = await listCostHistory(histItem);
    setHistorico(linhas);
    setFeedback(linhas.length === 0
      ? { type: "info", message: "Nenhuma apuração registrada para este item. O histórico começa na próxima apuração." }
      : { type: "success", message: `${linhas.length} apuração(ões) encontrada(s).` });
  });

  /** Variação entre a apuração e a anterior, componente a componente. */
  const variacao = useMemo(() => {
    if (historico.length < 2) return null;
    const atual = historico[0];
    const anterior = historico[1];
    const delta = (a: number, b: number) => ({ valor: a - b, pct: b !== 0 ? (a - b) / b : 0 });
    return {
      atual, anterior,
      material: delta(atual.material_cost, anterior.material_cost),
      setup: delta(atual.setup_cost, anterior.setup_cost),
      maquina: delta(atual.machine_cost, anterior.machine_cost),
      maoDeObra: delta(atual.labor_cost, anterior.labor_cost),
      terceiro: delta(atual.subcontract_cost, anterior.subcontract_cost),
      indiretos: delta(atual.overhead_cost, anterior.overhead_cost),
      total: delta(atual.total_cost, anterior.total_cost),
    };
  }, [historico]);

  // ── rateio contábil ───────────────────────────────────────────────────────

  const salvarBase = () => run(async () => {
    if (!baseForm.code || !baseForm.description.trim()) {
      setFeedback({ type: "error", message: "Informe o código e a descrição da base." }); return;
    }
    await createAllocation(baseForm);
    setBaseForm({ code: 0, description: "", period: "" });
    setBases(await listAllocations());
    setFeedback({ type: "success", message: "Base de alocação criada." });
  });

  const salvarOvh = () => run(async () => {
    if (!ovhForm.cost_center_code || !ovhForm.period_start || !ovhForm.period_end) {
      setFeedback({ type: "error", message: "Informe o centro de custo e o período (início e fim)." }); return;
    }
    if (ovhForm.period_end < ovhForm.period_start) {
      setFeedback({ type: "error", message: "A data final é anterior à inicial." }); return;
    }
    if (ovhForm.allocation_type === "BASE" && !ovhForm.base_code) {
      setFeedback({ type: "error", message: "Rateio por base exige escolher o critério." }); return;
    }
    await createOverheadAllocation({
      cost_center_code: ovhForm.cost_center_code,
      period_start: ovhForm.period_start,
      period_end: ovhForm.period_end,
      allocation_type: ovhForm.allocation_type,
      plan_account_code: ovhForm.plan_account_code || undefined,
      base_code: ovhForm.allocation_type === "BASE" ? (ovhForm.base_code || undefined) : undefined,
      description: ovhForm.description || undefined,
      targets: ovhForm.target_cost_center ? [{ cost_center_code: ovhForm.target_cost_center, percentage: ovhForm.target_pct }] : [],
    });
    setOvhForm({
      cost_center_code: 0, period_start: "", period_end: "", allocation_type: "PERCENTAGE",
      description: "", target_cost_center: 0, target_pct: 100, plan_account_code: 0, base_code: 0,
    });
    setOvhs(await listOverheadAllocations());
    setFeedback({ type: "success", message: "Rateio de custos indiretos criado." });
  });

  const regrasVigentes = regras.filter((r) => r.is_active).length;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Custos / Precificação</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Custos</span>
          <span className="erp-crumb-code">VCUS0100</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{COST_TABS[activeTab]}</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Dados</span>
          <button className="erp-btn" onClick={loadAll} disabled={busy}>
            {busy ? <><span className="erp-spin" />Carregando…</> : "Recarregar"}
          </button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup">
          <ExportButton title="VCUS0100 — Custos" filename="vcus0100"
            subtitle={COST_TABS[activeTab]} meta={{ aba: COST_TABS[activeTab] }} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs" role="tablist" aria-label="Áreas de custos">
            {COST_TABS.map((label, index) => (
              <button key={label} role="tab" aria-selected={activeTab === index}
                className={`erp-tab${activeTab === index ? " active" : ""}`}
                onClick={() => { setActiveTab(index); setFeedback(null); }}>{label}</button>
            ))}
          </div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {/* ── 0. Apuração do custo ─────────────────────────────────────── */}
            {activeTab === 0 && (
              <>
                {regrasVigentes === 0 && (
                  <div className="erp-feedback warn">
                    Nenhuma regra de indireto está vigente. O custo apurado sai <strong>sem</strong> energia,
                    depreciação, supervisão e aluguel — só material, preparação, máquina, mão de obra e terceiro.
                    Cadastre o esquema na aba <strong>Esquema de indiretos</strong>.
                  </div>
                )}

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Apurar o custo-padrão</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c5">
                      <label className="erp-label erp-req">Item</label>
                      <LookupField value={rollupItem} loader={loadItems} entityLabel="item"
                        placeholder="Escolher o item a apurar"
                        onChange={(code) => { setRollupItem(String(code ?? "")); setRollup(null); }} />
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Lote de referência</label>
                      <input className="erp-input num" type="number" min="1" step="1" value={rollupLote}
                        onChange={(e) => setRollupLote(e.target.value)} />
                      <span className="erp-hint">
                        A preparação é diluída por este lote. Com 1, cada peça carrega o setup inteiro —
                        é o número conservador.
                      </span>
                    </div>
                    <div className="erp-field erp-c4" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" onClick={rodarRollup} disabled={busy}>
                        {busy ? <><span className="erp-spin" />Apurando…</> : "Apurar custo"}
                      </button>
                    </div>
                  </div>
                </div>

                {rollup && (
                  <>
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">
                        Composição do custo unitário
                        <span style={{ fontWeight: 400, opacity: 0.65 }}>
                          {` — lote ${rollup.lot_size ?? 1} · ${rollup.currency ?? "BRL"}`}
                        </span>
                      </div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c12">
                          <div className="erp-metrics">
                            <div className="erp-metric">
                              <div className="erp-metric-label">Custo total unitário</div>
                              <div className="erp-metric-value">{money(rollup.total_cost)}</div>
                            </div>
                            <div className="erp-metric">
                              <div className="erp-metric-label">Esta etapa agrega</div>
                              <div className="erp-metric-value">{money(rollup.own_level_cost)}</div>
                            </div>
                            <div className="erp-metric">
                              <div className="erp-metric-label">Veio dos componentes</div>
                              <div className="erp-metric-value">{money(rollup.lower_level_cost)}</div>
                            </div>
                            <div className="erp-metric">
                              <div className="erp-metric-label">Indiretos no total</div>
                              <div className="erp-metric-value">
                                {rollup.total_cost ? pct((rollup.overhead_cost ?? 0) / rollup.total_cost) : "0%"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="erp-field erp-c12">
                          <table className="erp-grid">
                            <thead>
                              <tr><th>Componente</th><th className="num">Valor</th><th className="num">% do total</th><th>O que é</th></tr>
                            </thead>
                            <tbody>
                              {componentes.map((c) => (
                                <tr key={c.rotulo}>
                                  <td style={{ fontWeight: 600 }}>{c.rotulo}</td>
                                  <td className="num">{money(c.valor)}</td>
                                  <td className="num">{rollup.total_cost ? pct(c.valor / rollup.total_cost) : "—"}</td>
                                  <td><span className="erp-hint">{c.explicacao}</span></td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr><td>Total</td><td className="num">{money(rollup.total_cost)}</td><td className="num">100%</td><td /></tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>

                    {rollup.overheads && rollup.overheads.length > 0 && (
                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">Indiretos aplicados — de onde vem cada centavo</div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c12">
                            <table className="erp-grid">
                              <thead>
                                <tr><th>Regra</th><th>Base</th><th>Método</th><th className="num">Taxa</th>
                                  <th className="num">Valor da base</th><th className="num">Aplicado</th></tr>
                              </thead>
                              <tbody>
                                {rollup.overheads.map((o) => (
                                  <tr key={o.rule_id}>
                                    <td style={{ fontWeight: 600 }}>{o.code}
                                      <span className="erp-hint" style={{ display: "block" }}>{o.description}</span></td>
                                    <td>{OVERHEAD_BASE_LABELS[o.base] ?? o.base}</td>
                                    <td>{OVERHEAD_METHOD_LABELS[o.method] ?? o.method}</td>
                                    <td className="num">{overheadRateLabel(o)}</td>
                                    <td className="num">{o.method === "PERCENTUAL" ? money(o.base_value) : o.base_value.toLocaleString("pt-BR")}</td>
                                    <td className="num">{money(o.applied)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr><td colSpan={5}>Total de indiretos</td><td className="num">{money(rollup.overhead_cost)}</td></tr>
                              </tfoot>
                            </table>
                            <span className="erp-hint">
                              A ordem de aplicação é fixa (bases específicas, depois conversão, depois total) e nenhum
                              indireto incide sobre outro — é o que garante que duas instalações com as mesmas regras
                              cheguem ao mesmo custo.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {rollup.tree && rollup.tree.length > 1 && (
                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">
                          Composição pela estrutura
                          <span style={{ fontWeight: 400, opacity: 0.65 }}>{` — ${rollup.tree.length} nó(s)`}</span>
                        </div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c12">
                            <table className="erp-grid">
                              <thead>
                                <tr><th>Item</th><th className="num">Material</th><th className="num">Setup</th>
                                  <th className="num">Máquina</th><th className="num">Homem</th>
                                  <th className="num">Terceiro</th><th className="num">Indiretos</th>
                                  <th className="num">Componentes</th><th className="num">Total</th></tr>
                              </thead>
                              <tbody>
                                {rollup.tree.map((n, i) => (
                                  <tr key={`${n.item_code}-${i}`}>
                                    <td style={{ paddingLeft: 8 + n.level * 18, fontWeight: n.level === 0 ? 600 : 400 }}>
                                      {n.level > 0 && "└ "}
                                      <EntityName code={n.item_code} loader={loadItems} />
                                    </td>
                                    <td className="num">{money(n.material_cost)}</td>
                                    <td className="num">{money(n.setup_cost)}</td>
                                    <td className="num">{money(n.machine_cost)}</td>
                                    <td className="num">{money(n.labor_cost)}</td>
                                    <td className="num">{money(n.subcontract_cost)}</td>
                                    <td className="num">{money(n.overhead_cost)}</td>
                                    <td className="num">{money(n.lower_level_cost)}</td>
                                    <td className="num" style={{ fontWeight: 600 }}>{money(n.total_cost)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <span className="erp-hint">
                              Cada nível mostra o que ELE agrega. O que o pai recebe de um componente é o TOTAL dele —
                              por isso a hora-máquina do filho não soma na hora-máquina do pai.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {rollup.avisos && rollup.avisos.length > 0 && (
                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">Avisos da apuração</div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c12">
                            {rollup.avisos.map((a, i) => (
                              <div key={i} className="erp-feedback warn" style={{ margin: "0 0 6px" }}>{a}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── 1. Esquema de indiretos ──────────────────────────────────── */}
            {activeTab === 1 && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    {regraEditando ? `Alterando a regra #${regraEditando}` : "Nova regra de indireto"}
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c2">
                      <label className="erp-label erp-req">Código</label>
                      <input className="erp-input" value={regraForm.code} placeholder="CIF-ENERGIA" maxLength={20}
                        onChange={(e) => setRegraForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} />
                    </div>
                    <div className="erp-field erp-c5">
                      <label className="erp-label erp-req">Descrição</label>
                      <input className="erp-input" value={regraForm.description}
                        placeholder="Energia elétrica da usinagem"
                        onChange={(e) => setRegraForm((p) => ({ ...p, description: e.target.value }))} />
                      <span className="erp-hint">É o que explica o indireto quando alguém questionar o custo.</span>
                    </div>
                    <div className="erp-field erp-c5">
                      <label className="erp-label erp-req">Incide sobre</label>
                      <select className="erp-input" value={regraForm.base}
                        onChange={(e) => setRegraForm((p) => ({ ...p, base: e.target.value as OverheadBase }))}>
                        {OVERHEAD_BASES.map((b) => <option key={b} value={b}>{OVERHEAD_BASE_LABELS[b]}</option>)}
                      </select>
                    </div>

                    <div className="erp-field erp-c4">
                      <label className="erp-label erp-req">Método</label>
                      <select className="erp-input" value={regraForm.method}
                        onChange={(e) => {
                          const metodo = e.target.value as OverheadMethod;
                          setRegraForm((p) => ({ ...p, method: metodo }));
                          setTaxaDigitada("");
                        }}>
                        {OVERHEAD_METHODS.map((m) => <option key={m} value={m}>{OVERHEAD_METHOD_LABELS[m]}</option>)}
                      </select>
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label erp-req">
                        {regraForm.method === "PERCENTUAL" ? "Taxa (%)"
                          : regraForm.method === "VALOR_POR_HORA" ? "R$ por hora" : "R$ por unidade"}
                      </label>
                      <input className="erp-input num" type="number" step="0.0001" min="0" value={taxaDigitada}
                        onChange={(e) => setTaxaDigitada(e.target.value)} />
                      <span className="erp-hint">
                        {regraForm.method === "PERCENTUAL"
                          ? "Digite em percentual: 12 para 12%. O sistema grava a fração."
                          : "Valor em reais."}
                      </span>
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label erp-req">Vigente de</label>
                      <input className="erp-input" type="date" value={regraForm.valid_from}
                        onChange={(e) => setRegraForm((p) => ({ ...p, valid_from: e.target.value }))} />
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Vigente até</label>
                      <input className="erp-input" type="date" value={regraForm.valid_to ?? ""}
                        onChange={(e) => setRegraForm((p) => ({ ...p, valid_to: e.target.value || null }))} />
                      <span className="erp-hint">Em branco: vale indefinidamente.</span>
                    </div>

                    <div className="erp-field erp-c3">
                      <label className="erp-label">Só no centro de trabalho</label>
                      <LookupField value={regraForm.work_center_id ?? undefined} loader={loadWorkCenters}
                        entityLabel="centro de trabalho" placeholder="Toda a fábrica" clearable allowManualCode={false}
                        onChange={(c) => setRegraForm((p) => ({ ...p, work_center_id: c ? Number(c) : null }))} />
                      <span className="erp-hint">Energia caríssima só na usinagem, por exemplo.</span>
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Só no item</label>
                      <LookupField value={regraForm.item_code ?? undefined} loader={loadItems}
                        entityLabel="item" placeholder="Todos os itens" clearable
                        onChange={(c) => setRegraForm((p) => ({ ...p, item_code: c ? String(c) : null }))} />
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Conta contábil do indireto</label>
                      <LookupField value={regraForm.plano_contas_id ?? undefined} loader={loadChartOfAccounts}
                        entityLabel="conta do plano" placeholder="Opcional" clearable allowManualCode={false}
                        onChange={(c) => setRegraForm((p) => ({ ...p, plano_contas_id: c ? Number(c) : null }))} />
                      <span className="erp-hint">Liga o indireto do produto ao que a contabilidade lançou.</span>
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Centro de custo de origem</label>
                      <LookupField value={regraForm.centro_custo_id ?? undefined} loader={loadFinancialCostCenters}
                        entityLabel="centro de custo" placeholder="Opcional" clearable allowManualCode={false}
                        onChange={(c) => setRegraForm((p) => ({ ...p, centro_custo_id: c ? Number(c) : null }))} />
                    </div>

                    <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                      <button className="erp-btn erp-btn-primary" onClick={salvarRegra} disabled={busy}>
                        {regraEditando ? "Salvar alteração" : "Cadastrar regra"}
                      </button>
                      <button className="erp-btn" disabled={busy}
                        onClick={() => { setRegraForm(REGRA_VAZIA); setTaxaDigitada(""); setRegraEditando(null); setFeedback(null); }}>
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Esquema de cálculo
                    <span style={{ fontWeight: 400, opacity: 0.65 }}>
                      {` — ${regrasVigentes} regra(s) ativa(s) de ${regras.length}`}
                    </span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead>
                          <tr><th>Código</th><th>Descrição</th><th>Incide sobre</th><th>Método</th>
                            <th className="num">Taxa</th><th>Escopo</th><th>Vigência</th><th style={{ width: 160 }}>Ações</th></tr>
                        </thead>
                        <tbody>
                          {regras.length === 0 && (
                            <tr><td colSpan={8} className="erp-grid-empty">
                              Nenhuma regra cadastrada. Sem esquema de indiretos, o custo do produto não carrega
                              energia, depreciação, supervisão nem aluguel.
                            </td></tr>
                          )}
                          {regras.map((r) => (
                            <tr key={r.id} className={r.is_active ? undefined : "erp-row-muted"}>
                              <td style={{ fontWeight: 600 }}>{r.code}</td>
                              <td>{r.description}</td>
                              <td>{OVERHEAD_BASE_LABELS[r.base] ?? r.base}</td>
                              <td>{OVERHEAD_METHOD_LABELS[r.method] ?? r.method}</td>
                              <td className="num">{overheadRateLabel(r)}</td>
                              <td>
                                {!r.work_center_id && !r.item_code && <span className="erp-hint">toda a fábrica</span>}
                                {r.work_center_id && <>CT <EntityName code={r.work_center_id} loader={loadWorkCenters} showCode={false} /></>}
                                {r.item_code && <> item <EntityName code={r.item_code} loader={loadItems} showCode={false} /></>}
                              </td>
                              <td>{r.valid_from}{r.valid_to ? ` até ${r.valid_to}` : " em diante"}</td>
                              <td style={{ display: "flex", gap: 6 }}>
                                <button className="erp-btn erp-btn-sm" onClick={() => editarRegra(r)} disabled={busy}>Alterar</button>
                                {r.is_active && (
                                  <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => desativarRegra(r)} disabled={busy}>Desativar</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── 2. Centros de trabalho ───────────────────────────────────── */}
            {activeTab === 2 && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Taxa por hora do centro de trabalho</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c4">
                    <label className="erp-label erp-req">Centro de trabalho</label>
                    <LookupField value={wccForm.work_center_id || undefined} loader={loadWorkCenters}
                      allowManualCode={false} entityLabel="centro de trabalho" placeholder="Escolher centro"
                      onChange={(code) => setWccForm((p) => ({ ...p, work_center_id: Number(code ?? 0) }))} />
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label">R$ por hora-máquina</label>
                    <input className="erp-input num" type="number" step="0.01" min="0"
                      value={wccForm.machine_cost_per_hour || ""}
                      onChange={(e) => setWccForm((p) => ({ ...p, machine_cost_per_hour: Number(e.target.value) }))} />
                    <span className="erp-hint">Ocupação do equipamento, rode ele sozinho ou não.</span>
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label">R$ por hora-homem</label>
                    <input className="erp-input num" type="number" step="0.01" min="0"
                      value={wccForm.labor_cost_per_hour || ""}
                      onChange={(e) => setWccForm((p) => ({ ...p, labor_cost_per_hour: Number(e.target.value) }))} />
                    <span className="erp-hint">Multiplicada pelo tamanho da equipe do roteiro.</span>
                  </div>
                  <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                    <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={salvarWcc} disabled={busy}>Salvar</button>
                  </div>
                  <div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th>Centro de trabalho</th><th className="num">Hora-máquina</th><th className="num">Hora-homem</th><th>Moeda</th></tr></thead>
                      <tbody>
                        {wccs.length === 0 && (
                          <tr><td colSpan={4} className="erp-grid-empty">
                            Nenhuma taxa cadastrada. Sem taxa, o roteiro não gera custo de conversão.
                          </td></tr>
                        )}
                        {wccs.map((w) => (
                          <tr key={w.id ?? w.work_center_id}>
                            <td><EntityName code={w.work_center_id} loader={loadWorkCenters} /></td>
                            <td className="num">{money(w.machine_cost_per_hour ?? w.cost_per_hour)}</td>
                            <td className="num">{money(w.labor_cost_per_hour)}</td>
                            <td>{w.currency ?? "BRL"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── 3. Custos de compra ──────────────────────────────────────── */}
            {activeTab === 3 && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Custo de compra por item</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c5">
                    <label className="erp-label erp-req">Item</label>
                    <LookupField value={pcForm.item_code} loader={loadItems} entityLabel="item"
                      placeholder="Escolher item comprado"
                      onChange={(code) => { setPcForm((p) => ({ ...p, item_code: String(code ?? "") })); setPcResult(null); }} />
                    <span className="erp-hint">É o custo das FOLHAS da estrutura: o que a apuração usa como material.</span>
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label erp-req">Custo unitário</label>
                    <input className="erp-input num" type="number" step="0.01" min="0" value={pcForm.cost || ""}
                      onChange={(e) => setPcForm((p) => ({ ...p, cost: Number(e.target.value) }))} />
                  </div>
                  <div className="erp-field erp-c4" style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                    <button className="erp-btn erp-btn-primary" onClick={salvarPc} disabled={busy}>Salvar custo</button>
                    <button className="erp-btn" onClick={consultarPc} disabled={busy}>Consultar</button>
                  </div>
                  {pcResult && (
                    <div className="erp-field erp-c12">
                      <div className="erp-feedback info" style={{ margin: 0 }}>
                        Item <strong>{pcResult.item_code}</strong>: {money(pcResult.cost)} {pcResult.currency ?? "BRL"}.
                        Alterar aqui não reapura sozinho os produtos que consomem o item — rode a apuração deles.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── 4. Histórico ─────────────────────────────────────────────── */}
            {activeTab === 4 && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Apurações anteriores</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c5">
                      <label className="erp-label erp-req">Item</label>
                      <LookupField value={histItem} loader={loadItems} entityLabel="item"
                        placeholder="Escolher o item"
                        onChange={(code) => { setHistItem(String(code ?? "")); setHistorico([]); }} />
                    </div>
                    <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" onClick={carregarHistorico} disabled={busy}>Consultar histórico</button>
                    </div>
                  </div>
                </div>

                {variacao && (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      O que mudou desde a apuração anterior
                      <span style={{ fontWeight: 400, opacity: 0.65 }}>
                        {` — ${variacao.anterior.calculated_at?.slice(0, 10)} → ${variacao.atual.calculated_at?.slice(0, 10)}`}
                      </span>
                    </div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c12">
                        <table className="erp-grid">
                          <thead>
                            <tr><th>Componente</th><th className="num">Antes</th><th className="num">Agora</th>
                              <th className="num">Variação</th><th className="num">%</th></tr>
                          </thead>
                          <tbody>
                            {([
                              ["Material", variacao.anterior.material_cost, variacao.atual.material_cost, variacao.material],
                              ["Preparação", variacao.anterior.setup_cost, variacao.atual.setup_cost, variacao.setup],
                              ["Hora-máquina", variacao.anterior.machine_cost, variacao.atual.machine_cost, variacao.maquina],
                              ["Mão de obra", variacao.anterior.labor_cost, variacao.atual.labor_cost, variacao.maoDeObra],
                              ["Terceiro", variacao.anterior.subcontract_cost, variacao.atual.subcontract_cost, variacao.terceiro],
                              ["Indiretos", variacao.anterior.overhead_cost, variacao.atual.overhead_cost, variacao.indiretos],
                            ] as const).map(([rotulo, antes, agora, d]) => (
                              <tr key={rotulo}>
                                <td>{rotulo}</td>
                                <td className="num">{money(antes)}</td>
                                <td className="num">{money(agora)}</td>
                                <td className={`num ${d.valor > 0 ? "erp-cell-danger" : ""}`}>
                                  {d.valor > 0 ? "+" : ""}{money(d.valor)}
                                </td>
                                <td className={`num ${d.valor > 0 ? "erp-cell-danger" : ""}`}>
                                  {d.pct ? `${d.pct > 0 ? "+" : ""}${pct(d.pct)}` : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td>Total</td>
                              <td className="num">{money(variacao.anterior.total_cost)}</td>
                              <td className="num">{money(variacao.atual.total_cost)}</td>
                              <td className="num">{variacao.total.valor > 0 ? "+" : ""}{money(variacao.total.valor)}</td>
                              <td className="num">{variacao.total.pct ? `${variacao.total.pct > 0 ? "+" : ""}${pct(variacao.total.pct)}` : "—"}</td>
                            </tr>
                          </tfoot>
                        </table>
                        <span className="erp-hint">
                          Duas apurações só são comparáveis com o MESMO lote: a preparação é diluída por ele.
                          Lotes desta comparação: {variacao.anterior.lot_size} e {variacao.atual.lot_size}.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {historico.length > 0 && (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      Série de apurações
                      <span style={{ fontWeight: 400, opacity: 0.65 }}>{` — ${historico.length}`}</span>
                    </div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c12">
                        <table className="erp-grid">
                          <thead>
                            <tr><th>Apurado em</th><th className="num">Lote</th><th className="num">Material</th>
                              <th className="num">Setup</th><th className="num">Máquina</th><th className="num">Homem</th>
                              <th className="num">Terceiro</th><th className="num">Indiretos</th><th className="num">Total</th></tr>
                          </thead>
                          <tbody>
                            {historico.map((h) => (
                              <tr key={h.id}>
                                <td>{h.calculated_at?.slice(0, 16).replace("T", " ")}</td>
                                <td className="num">{h.lot_size}</td>
                                <td className="num">{money(h.material_cost)}</td>
                                <td className="num">{money(h.setup_cost)}</td>
                                <td className="num">{money(h.machine_cost)}</td>
                                <td className="num">{money(h.labor_cost)}</td>
                                <td className="num">{money(h.subcontract_cost)}</td>
                                <td className="num">{money(h.overhead_cost)}</td>
                                <td className="num" style={{ fontWeight: 600 }}>{money(h.total_cost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <span className="erp-hint">
                          O histórico não é sobrescrito nem apagado: é o que responde "por que o custo subiu".
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── 5. Rateio contábil ───────────────────────────────────────── */}
            {activeTab === 5 && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Base de alocação (critério de rateio entre centros)</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c2">
                      <label className="erp-label erp-req">Código</label>
                      <input className="erp-input num" type="number" value={baseForm.code || ""}
                        onChange={(e) => setBaseForm((p) => ({ ...p, code: Number(e.target.value) }))} />
                    </div>
                    <div className="erp-field erp-c5">
                      <label className="erp-label erp-req">Descrição</label>
                      <input className="erp-input" value={baseForm.description} placeholder="Horas-máquina, área ocupada, nº de pessoas"
                        onChange={(e) => setBaseForm((p) => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">Período</label>
                      <input className="erp-input" placeholder="AAAA-MM" value={baseForm.period ?? ""}
                        onChange={(e) => setBaseForm((p) => ({ ...p, period: e.target.value }))} />
                    </div>
                    <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={salvarBase} disabled={busy}>Criar base</button>
                    </div>
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead><tr><th>Código</th><th>Descrição</th><th>Período</th></tr></thead>
                        <tbody>
                          {bases.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhuma base de alocação.</td></tr>}
                          {bases.map((b, i) => (
                            <tr key={b.code || i}><td>{b.code}</td><td>{b.description || "—"}</td><td>{b.period || "—"}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Distribuição de custos indiretos entre centros de custo</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3">
                      <label className="erp-label erp-req">Centro de custo de origem</label>
                      <LookupField value={ovhForm.cost_center_code || undefined} loader={loadCostCenters}
                        entityLabel="centro de custo" placeholder="Escolher centro"
                        onChange={(c) => setOvhForm((p) => ({ ...p, cost_center_code: Number(c ?? 0) }))} />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label erp-req">Início</label>
                      <input className="erp-input" type="date" value={ovhForm.period_start}
                        onChange={(e) => setOvhForm((p) => ({ ...p, period_start: e.target.value }))} />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label erp-req">Fim</label>
                      <input className="erp-input" type="date" value={ovhForm.period_end}
                        onChange={(e) => setOvhForm((p) => ({ ...p, period_end: e.target.value }))} />
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Centro de destino</label>
                      <LookupField value={ovhForm.target_cost_center || undefined} loader={loadCostCenters}
                        entityLabel="centro de custo" placeholder="Para onde vai" clearable
                        onChange={(c) => setOvhForm((p) => ({ ...p, target_cost_center: Number(c ?? 0) }))} />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">% para o destino</label>
                      <input className="erp-input num" type="number" step="0.01" min="0" max="100" value={ovhForm.target_pct || ""}
                        onChange={(e) => setOvhForm((p) => ({ ...p, target_pct: Number(e.target.value) }))} />
                    </div>

                    <div className="erp-field erp-c3">
                      <label className="erp-label">Conta do plano</label>
                      <LookupField value={ovhForm.plan_account_code || undefined} loader={loadChartOfAccounts}
                        entityLabel="conta do plano" placeholder="Todo o centro" clearable allowManualCode={false}
                        onChange={(c) => setOvhForm((p) => ({ ...p, plan_account_code: Number(c ?? 0) }))} />
                      <span className="erp-hint">Em branco, rateia o centro de custo inteiro.</span>
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Critério</label>
                      <select className="erp-input" value={ovhForm.allocation_type}
                        onChange={(e) => setOvhForm((p) => ({ ...p, allocation_type: e.target.value }))}>
                        <option value="PERCENTAGE">Percentual fixo</option>
                        <option value="BASE">Base de alocação</option>
                      </select>
                    </div>
                    {ovhForm.allocation_type === "BASE" && (
                      <div className="erp-field erp-c3">
                        <label className="erp-label erp-req">Base de alocação</label>
                        <select className="erp-input" value={ovhForm.base_code || ""}
                          onChange={(e) => setOvhForm((p) => ({ ...p, base_code: Number(e.target.value) }))}>
                          <option value="">Escolha o critério</option>
                          {bases.map((b) => <option key={b.code} value={b.code}>{b.description}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Descrição</label>
                      <input className="erp-input" value={ovhForm.description}
                        onChange={(e) => setOvhForm((p) => ({ ...p, description: e.target.value }))} />
                    </div>

                    <div className="erp-field erp-c12">
                      <button className="erp-btn erp-btn-primary" onClick={salvarOvh} disabled={busy}>Criar distribuição</button>
                    </div>
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead><tr><th>Centro de origem</th><th>Período</th><th>Critério</th><th className="num">Destinos</th></tr></thead>
                        <tbody>
                          {ovhs.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma distribuição cadastrada.</td></tr>}
                          {ovhs.map((o, i) => (
                            <tr key={o.id ?? i}>
                              <td>{o.cost_center_code}</td>
                              <td>{o.period_start?.slice(0, 10)} → {o.period_end?.slice(0, 10)}</td>
                              <td>{o.allocation_type === "BASE" ? "Base de alocação" : "Percentual fixo"}</td>
                              <td className="num">{o.targets?.length ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <span className="erp-hint">
                        Esta é a distribuição CONTÁBIL entre centros de custo. O que entra no custo do PRODUTO é o
                        esquema de indiretos, na aba própria.
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Regras de indireto: <strong>{regrasVigentes}</strong></div>
        <div className="erp-status-item">Centros com taxa: <strong>{wccs.length}</strong></div>
        {rollup && <div className="erp-status-item">Último custo apurado: <strong>{money(rollup.total_cost)}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
