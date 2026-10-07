import { useState, useEffect, useCallback, useMemo } from "react";
import {
  type AccountingPlanDTO, type AccountDTO, type JournalEntryDTO, type Balancete, type AccountNature, type PlanStatus,
  type ParametrosContabilizacao,
  listPlans, createPlan, listAccounts, createAccount, listJournalEntries, createJournalEntry, getBalancete,
  getParametrosContabilizacao, salvarParametrosContabilizacao, vincularPlanoContaContabil, vincularContaBancariaContabil, rotuloConta,
  CAMPOS_CONTA_PARAMETRO, GRUPOS_CONTA_PARAMETRO, FLAGS_CONTABILIZACAO,
} from "@/services/accountingService";
import { listPlanoContas, listContasBancarias, type PlanoConta, type ContaBancaria } from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "plans" | "accounts" | "journal" | "balancete" | "entrada";

const money = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hojeISO = () => new Date().toISOString().slice(0, 10);
const ROTULO_STATUS: Record<PlanStatus, string> = { I: "Em montagem", A: "Ativo", X: "Inativo" };

/** Primeiro e último dia da competência AAAA-MM (o último de verdade, não o dia 28). */
function limitesDaCompetencia(period: string): { from: string; to: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(period.trim());
  if (!m) return null;
  const ano = Number(m[1]); const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return null;
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return { from: `${m[1]}-${m[2]}-01`, to: `${m[1]}-${m[2]}-${String(ultimo).padStart(2, "0")}` };
}

const PARAMETROS_VAZIOS: ParametrosContabilizacao = {
  plan_id: 0, fornecedores_account_id: 0, contabilizar_entrada: false,
  contabilizar_pagamentos: false, contabilizar_recebimentos: false, contabilizar_saidas: false,
};

export function Vctb0200Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("plans");
  const [plans, setPlans] = useState<AccountingPlanDTO[]>([]);
  const [planId, setPlanId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [period, setPeriod] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
  const [journal, setJournal] = useState<JournalEntryDTO[]>([]);
  const [balancete, setBalancete] = useState<Balancete | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const [pForm, setPForm] = useState<AccountingPlanDTO>({ plan_number: 1, description: "", valid_from: `${new Date().getFullYear()}-01-01`, status: "A" });
  const [aForm, setAForm] = useState<AccountDTO>({ plan_id: 0, account_number: "", description: "", nature_code: "D", requires_cost_center: false, valid_from: hojeISO(), is_analytic: true });
  const [jForm, setJForm] = useState<JournalEntryDTO>({ plan_id: 0, entry_date: hojeISO(), entry_number: "", description: "", debit_account_id: 0, credit_account_id: 0, value: 0 });

  // Contabilização da NF de entrada.
  const [params, setParams] = useState<ParametrosContabilizacao>(PARAMETROS_VAZIOS);
  const [paramsCarregados, setParamsCarregados] = useState(false);
  const [planosFinanceiros, setPlanosFinanceiros] = useState<PlanoConta[]>([]);
  const [contasDoParametro, setContasDoParametro] = useState<AccountDTO[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);

  const reloadPlans = useCallback(async () => {
    setBusy(true);
    try { setPlans(await listPlans()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar planos.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reloadPlans(); }, [reloadPlans]);

  const contaPorId = useMemo(() => new Map(accounts.map((a) => [a.id ?? 0, a])), [accounts]);
  const analiticas = useMemo(() => accounts.filter((a) => a.is_analytic), [accounts]);
  const nomeConta = (id: number) => { const a = contaPorId.get(id); return a ? rotuloConta(a) : `#${id}`; };

  async function savePlan() {
    if (!pForm.description.trim() || !pForm.plan_number || !pForm.valid_from) { setFeedback({ type: "error", message: "Número, descrição e início da vigência são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await createPlan(pForm); setFeedback({ type: "success", message: "Plano criado." }); setPForm((p) => ({ ...p, description: "", plan_number: p.plan_number + 1 })); await reloadPlans(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function loadAccounts(id: number) {
    setPlanId(id); setAForm((p) => ({ ...p, plan_id: id })); setJForm((p) => ({ ...p, plan_id: id })); setBusy(true);
    try { setAccounts(await listAccounts(id)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function saveAccount() {
    if (!planId) { setFeedback({ type: "error", message: "Abra um plano na aba Planos." }); return; }
    if (!aForm.account_number.trim() || !aForm.description.trim()) { setFeedback({ type: "error", message: "Número e descrição da conta são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await createAccount({ ...aForm, plan_id: planId }); setFeedback({ type: "success", message: "Conta criada." }); setAForm((p) => ({ ...p, account_number: "", description: "" })); await loadAccounts(planId); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function loadJournal() {
    const lim = limitesDaCompetencia(period);
    if (!planId) { setFeedback({ type: "error", message: "Abra um plano na aba Planos." }); return; }
    if (!lim) { setFeedback({ type: "error", message: "Competência inválida: use AAAA-MM." }); return; }
    setBusy(true);
    try { setJournal(await listJournalEntries(planId, lim.from, lim.to)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function saveJournal() {
    if (!planId) { setFeedback({ type: "error", message: "Abra um plano na aba Planos." }); return; }
    if (!jForm.description.trim() || !jForm.debit_account_id || !jForm.credit_account_id || !(jForm.value > 0)) { setFeedback({ type: "error", message: "Preencha histórico, contas de débito e crédito e valor." }); return; }
    if (jForm.debit_account_id === jForm.credit_account_id) { setFeedback({ type: "error", message: "Débito e crédito na mesma conta não movimentam nada." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createJournalEntry({ ...jForm, plan_id: planId, entry_number: jForm.entry_number.trim() || `M${Date.now()}` });
      setFeedback({ type: "success", message: "Lançamento criado." });
      setJForm((p) => ({ ...p, description: "", entry_number: "", value: 0 }));
      await loadJournal();
    }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function loadBalancete() {
    const lim = limitesDaCompetencia(period);
    if (!planId) { setFeedback({ type: "error", message: "Abra um plano na aba Planos primeiro." }); return; }
    if (!lim) { setFeedback({ type: "error", message: "Competência inválida: use AAAA-MM." }); return; }
    setBusy(true); setFeedback(null);
    try { setBalancete(await getBalancete(planId, lim.from, lim.to)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function abrirEntrada() {
    setTab("entrada");
    setBusy(true); setFeedback(null);
    try {
      const [p, planosFin, bancos] = await Promise.all([getParametrosContabilizacao(), listPlanoContas(), listContasBancarias()]);
      setPlanosFinanceiros(planosFin);
      setContasBancarias(bancos);
      const atual = p ?? { ...PARAMETROS_VAZIOS, plan_id: planId ?? plans.find((x) => x.status === "A")?.id ?? 0 };
      setParams(atual); setParamsCarregados(true);
      if (atual.plan_id) setContasDoParametro(await listAccounts(atual.plan_id));
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function trocarPlanoDosParametros(id: number) {
    setParams((p) => ({ ...p, plan_id: id }));
    setContasDoParametro(id ? await listAccounts(id).catch(() => []) : []);
  }
  async function salvarParametros() {
    if (!params.plan_id || !params.fornecedores_account_id) { setFeedback({ type: "error", message: "Informe o plano contábil e a conta de Fornecedores." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const salvo = await salvarParametrosContabilizacao(params);
      if (salvo) setParams(salvo);
      const ligados = FLAGS_CONTABILIZACAO.filter((f) => params[f.campo]).map((f) => f.rotulo.toLowerCase());
      setFeedback({ type: "success", message: ligados.length ? `Parâmetros gravados. Contabilização automática ligada para: ${ligados.join("; ")}.` : "Parâmetros gravados (contabilização automática desligada)." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function vincular(plano: PlanoConta, contaId: number | null) {
    setBusy(true); setFeedback(null);
    try {
      await vincularPlanoContaContabil(plano.id, contaId);
      setPlanosFinanceiros((ps) => ps.map((x) => (x.id === plano.id ? { ...x, accounting_account_id: contaId ?? undefined } : x)));
      setFeedback({ type: "success", message: `Plano ${plano.codigo} ${contaId ? "vinculado" : "desvinculado"}.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function vincularBanco(cb: ContaBancaria, contaId: number | null) {
    setBusy(true); setFeedback(null);
    try {
      await vincularContaBancariaContabil(cb.id, contaId);
      setContasBancarias((cs) => cs.map((x) => (x.id === cb.id ? { ...x, accounting_account_id: contaId ?? undefined } : x)));
      setFeedback({ type: "success", message: `Conta bancária ${cb.descricao || cb.conta} ${contaId ? "vinculada" : "desvinculada"}.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const analiticasDoParametro = contasDoParametro.filter((a) => a.is_analytic);
  const selectConta = (valor: number | undefined, onChange: (id: number | undefined) => void, contas: AccountDTO[], vazio = "— nenhuma —") => (
    <select className="erp-input" value={valor ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}>
      <option value="">{vazio}</option>
      {contas.map((a) => <option key={a.id} value={a.id}>{rotuloConta(a)}</option>)}
    </select>
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Contabilidade</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Contabilidade (SPED ECD)</span><span className="erp-crumb-code">VCTB0200</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Competência</span>
          <input className="erp-input" style={{ width: 110, height: 32 }} value={period} placeholder="AAAA-MM" onChange={(e) => setPeriod(e.target.value)} /></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Plano aberto</span>
          <span style={{ fontWeight: 600 }}>{planId ? plans.find((p) => p.id === planId)?.description ?? planId : "nenhum"}</span></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VCTB0200 — Contabilidade" filename="vctb0200" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs" role="tablist" aria-label="Áreas da contabilidade">
            <button role="tab" aria-selected={tab === "plans"} className={`erp-tab ${tab === "plans" ? "active" : ""}`} onClick={() => setTab("plans")}>Planos</button>
            <button role="tab" aria-selected={tab === "accounts"} className={`erp-tab ${tab === "accounts" ? "active" : ""}`} onClick={() => setTab("accounts")}>Contas</button>
            <button role="tab" aria-selected={tab === "journal"} className={`erp-tab ${tab === "journal" ? "active" : ""}`} onClick={() => { setTab("journal"); void loadJournal(); }}>Lançamentos</button>
            <button role="tab" aria-selected={tab === "balancete"} className={`erp-tab ${tab === "balancete" ? "active" : ""}`} onClick={() => setTab("balancete")}>Balancete</button>
            <button role="tab" aria-selected={tab === "entrada"} className={`erp-tab ${tab === "entrada" ? "active" : ""}`} onClick={() => void abrirEntrada()}>Contabilização automática</button>
          </div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset">

          {tab === "plans" && (
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Número</label><input className="erp-input num" type="number" min={1} value={pForm.plan_number} onChange={(e) => setPForm((p) => ({ ...p, plan_number: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c4"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={pForm.description} onChange={(e) => setPForm((p) => ({ ...p, description: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Vigência desde</label><input className="erp-input" type="date" value={pForm.valid_from} onChange={(e) => setPForm((p) => ({ ...p, valid_from: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
                <select className="erp-input" value={pForm.status} onChange={(e) => setPForm((p) => ({ ...p, status: e.target.value as PlanStatus }))}>
                  <option value="A">Ativo</option><option value="I">Em montagem</option><option value="X">Inativo</option>
                </select></div>
              <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void savePlan()} disabled={busy}>Criar plano</button></div>

              <div className="erp-field erp-c12" style={{ marginTop: 16 }}><table className="erp-grid">
                <thead><tr><th>ID</th><th>Número</th><th>Descrição</th><th>Vigência</th><th>Situação</th><th style={{ width: 90 }}>Ações</th></tr></thead>
                <tbody>{plans.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum plano.</td></tr>}
                  {plans.map((p) => <tr key={p.id}><td>{p.id}</td><td>{p.plan_number}</td><td>{p.description}</td><td>{p.valid_from}{p.valid_to ? ` a ${p.valid_to}` : ""}</td><td>{ROTULO_STATUS[p.status] ?? p.status}</td>
                    <td><button className="erp-btn erp-btn-sm" onClick={() => { if (p.id) void loadAccounts(p.id); setTab("accounts"); }}>Abrir</button></td></tr>)}
                </tbody></table></div>
            </div>
          )}

          {tab === "accounts" && (
            <div className="erp-fieldset-body">
              {!planId && <div className="erp-field erp-c12"><div className="erp-feedback info">Abra um plano na aba Planos.</div></div>}
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Número</label><input className="erp-input" value={aForm.account_number} placeholder="1.1.1.01" onChange={(e) => setAForm((p) => ({ ...p, account_number: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={aForm.description} onChange={(e) => setAForm((p) => ({ ...p, description: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Conta superior</label>
                <select className="erp-input" value={aForm.parent_id ?? ""} onChange={(e) => setAForm((p) => ({ ...p, parent_id: e.target.value ? Number(e.target.value) : undefined }))}>
                  <option value="">—</option>
                  {accounts.filter((a) => !a.is_analytic).map((a) => <option key={a.id} value={a.id}>{rotuloConta(a)}</option>)}
                </select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Tipo</label>
                <select className="erp-input" value={aForm.is_analytic ? "A" : "S"} onChange={(e) => setAForm((p) => ({ ...p, is_analytic: e.target.value === "A" }))}><option value="A">Analítica (recebe lançamento)</option><option value="S">Sintética (agrupa)</option></select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Natureza</label>
                <select className="erp-input" value={aForm.nature_code} onChange={(e) => setAForm((p) => ({ ...p, nature_code: e.target.value as AccountNature }))}><option value="D">Devedora</option><option value="C">Credora</option></select></div>
              <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void saveAccount()} disabled={busy || !planId}>+</button></div>

              <div className="erp-field erp-c12" style={{ marginTop: 16 }}><table className="erp-grid">
                <thead><tr><th>ID</th><th>Número</th><th>Descrição</th><th>Tipo</th><th>Natureza</th><th>Superior</th></tr></thead>
                <tbody>{accounts.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma conta.</td></tr>}
                  {accounts.map((a) => <tr key={a.id}><td>{a.id}</td><td style={{ fontWeight: 600 }}>{a.account_number}</td><td>{a.description}</td><td>{a.is_analytic ? "Analítica" : "Sintética"}</td><td>{a.nature_code === "C" ? "Credora" : "Devedora"}</td><td>{a.parent_id ? nomeConta(a.parent_id) : "—"}</td></tr>)}
                </tbody></table></div>
            </div>
          )}

          {tab === "journal" && (
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Data</label><input className="erp-input" type="date" value={jForm.entry_date} onChange={(e) => setJForm((p) => ({ ...p, entry_date: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Número</label><input className="erp-input" maxLength={20} placeholder="automático" value={jForm.entry_number} onChange={(e) => setJForm((p) => ({ ...p, entry_number: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Débito</label>{selectConta(jForm.debit_account_id || undefined, (id) => setJForm((p) => ({ ...p, debit_account_id: id ?? 0 })), analiticas, "— selecione —")}</div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Crédito</label>{selectConta(jForm.credit_account_id || undefined, (id) => setJForm((p) => ({ ...p, credit_account_id: id ?? 0 })), analiticas, "— selecione —")}</div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Valor</label><input className="erp-input num" type="number" step="0.01" min="0" value={jForm.value || ""} onChange={(e) => setJForm((p) => ({ ...p, value: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c10"><label className="erp-label erp-req">Histórico</label><input className="erp-input" value={jForm.description} onChange={(e) => setJForm((p) => ({ ...p, description: e.target.value }))} /></div>
              <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void saveJournal()} disabled={busy || !planId}>Lançar</button></div>

              <div className="erp-field erp-c12" style={{ marginTop: 16 }}><table className="erp-grid">
                <thead><tr><th>Data</th><th>Número</th><th>Histórico</th><th>Débito</th><th>Crédito</th><th style={{ textAlign: "right" }}>Valor</th></tr></thead>
                <tbody>{journal.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum lançamento no período.</td></tr>}
                  {journal.map((j) => <tr key={j.id}><td>{j.entry_date}</td><td>{j.entry_number}</td><td>{j.description}</td><td>{nomeConta(j.debit_account_id)}</td><td>{nomeConta(j.credit_account_id)}</td><td style={{ textAlign: "right" }}>{money(j.value)}</td></tr>)}
                </tbody></table></div>
            </div>
          )}

          {tab === "balancete" && (
            <div className="erp-fieldset-body">
              <button className="erp-btn erp-btn-primary" onClick={() => void loadBalancete()} disabled={busy}>Gerar balancete ({period})</button>
              {balancete && (
                <>
                  <div className="erp-metrics" style={{ marginTop: 14 }}>
                    <div className="erp-metric"><div className="erp-metric-label">Total débitos</div><div className="erp-metric-value">{money(balancete.total_debit)}</div></div>
                    <div className="erp-metric"><div className="erp-metric-label">Total créditos</div><div className="erp-metric-value">{money(balancete.total_credit)}</div></div>
                    <div className="erp-metric"><div className="erp-metric-label">Partidas dobradas</div><div className="erp-metric-value">{balancete.balanced ? "✓ OK" : "✗"}</div></div>
                  </div>
                  <div className="erp-field erp-c12" style={{ marginTop: 14 }}><table className="erp-grid">
                    <thead><tr><th>Conta</th><th>Descrição</th><th style={{ textAlign: "right" }}>Débito</th><th style={{ textAlign: "right" }}>Crédito</th><th style={{ textAlign: "right" }}>Saldo</th></tr></thead>
                    <tbody>{balancete.rows.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Sem movimento.</td></tr>}
                      {balancete.rows.map((r, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{r.account_code}</td><td>{r.account_name}</td><td style={{ textAlign: "right" }}>{money(r.debit)}</td><td style={{ textAlign: "right" }}>{money(r.credit)}</td><td style={{ textAlign: "right" }}>{money(r.balance)}</td></tr>)}
                    </tbody></table></div>
                </>
              )}
            </div>
          )}

          {tab === "entrada" && paramsCarregados && (
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c12"><div className="erp-feedback info"><div>
                <div>Com a contabilização ligada, cada etapa grava os seus lançamentos na mesma transação da operação:</div>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  <li>débito na conta do plano de contas do item (ou na despesa padrão) × crédito em Fornecedores, pelo custo;</li>
                  <li>débito no imposto a recuperar × crédito em Fornecedores, para cada crédito (sem conta &quot;a recuperar&quot;, o imposto vai ao custo);</li>
                  <li>débito em Fornecedores × crédito no imposto retido a recolher, para cada retenção;</li>
                  <li>pagamento: Fornecedores (ou a retenção recolhida) × Banco, com juros/multa em despesa e desconto obtido em receita;</li>
                  <li>recebimento: Banco × Clientes, com juros recebidos e desconto concedido;</li>
                  <li>NF-e de saída: Clientes × Receita; impostos sobre a venda × impostos a recolher; CMV × Estoque pelo custo médio.</li>
                </ul>
                <div style={{ marginTop: 4 }}>Cancelamentos (de nota, de baixa) lançam o estorno. O banco de cada lançamento é a conta contábil da conta bancária (tabela abaixo) ou o banco padrão.</div>
              </div></div></div>
              <div className="erp-field erp-c4"><label className="erp-label erp-req">Plano contábil</label>
                <select className="erp-input" value={params.plan_id || ""} onChange={(e) => void trocarPlanoDosParametros(Number(e.target.value) || 0)}>
                  <option value="">— selecione —</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.plan_number} — {p.description}{p.status !== "A" ? ` (${ROTULO_STATUS[p.status]})` : ""}</option>)}
                </select></div>
              <div className="erp-field erp-c4" style={{ alignSelf: "end" }}>
                <button className="erp-btn erp-btn-primary" onClick={() => void salvarParametros()} disabled={busy}>Gravar parâmetros</button>
              </div>
              <div className="erp-field erp-c12">
                <div className="erp-fieldset-head" style={{ marginTop: 8 }}>Contabilizar automaticamente</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 6 }}>
                  {FLAGS_CONTABILIZACAO.map((f) => (
                    <label key={f.campo}><input type="checkbox" checked={params[f.campo]} onChange={(e) => setParams((p) => ({ ...p, [f.campo]: e.target.checked }))} /> {f.rotulo}</label>
                  ))}
                </div>
              </div>
              {GRUPOS_CONTA_PARAMETRO.map((grupo) => (
                <div key={grupo} className="erp-field erp-c12">
                  <div className="erp-fieldset-head" style={{ marginTop: 8 }}>{grupo}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
                    {CAMPOS_CONTA_PARAMETRO.filter((c) => c.grupo === grupo).map((c) => (
                      <div key={c.campo}>
                        <label className={`erp-label ${c.campo === "fornecedores_account_id" ? "erp-req" : ""}`}>{c.rotulo}</label>
                        {selectConta((params[c.campo] as number | undefined) || undefined, (id) => setParams((p) => ({ ...p, [c.campo]: id ?? (c.campo === "fornecedores_account_id" ? 0 : undefined) })), analiticasDoParametro)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="erp-field erp-c12">
                <div className="erp-fieldset-head" style={{ marginTop: 12 }}>Plano de contas financeiro × conta contábil</div>
                <table className="erp-grid">
                  <thead><tr><th>Plano financeiro</th><th>Tipo</th><th style={{ minWidth: 320 }}>Conta contábil (débito na entrada)</th></tr></thead>
                  <tbody>
                    {planosFinanceiros.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhum plano de contas financeiro.</td></tr>}
                    {planosFinanceiros.map((pf) => (
                      <tr key={pf.id}>
                        <td>{pf.codigo} — {pf.descricao}</td>
                        <td>{pf.tipo}</td>
                        <td>{params.plan_id
                          ? selectConta(pf.accounting_account_id, (id) => void vincular(pf, id ?? null), analiticasDoParametro, "— usa a despesa padrão —")
                          : <em>escolha o plano contábil acima</em>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="erp-field erp-c12">
                <div className="erp-fieldset-head" style={{ marginTop: 12 }}>Conta bancária × conta contábil</div>
                <table className="erp-grid">
                  <thead><tr><th>Conta bancária</th><th>Banco / agência / conta</th><th style={{ minWidth: 320 }}>Conta contábil (o caixa da baixa)</th></tr></thead>
                  <tbody>
                    {contasBancarias.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhuma conta bancária.</td></tr>}
                    {contasBancarias.map((cb) => (
                      <tr key={cb.id}>
                        <td>{cb.descricao || `#${cb.id}`}</td>
                        <td>{cb.banco} / {cb.agencia} / {cb.conta}{cb.digito ? `-${cb.digito}` : ""}</td>
                        <td>{params.plan_id
                          ? selectConta(cb.accounting_account_id, (id) => void vincularBanco(cb, id ?? null), analiticasDoParametro, "— usa o banco padrão —")
                          : <em>escolha o plano contábil acima</em>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Planos: <strong>{plans.length}</strong></div><div className="erp-status-item">Competência: <strong>{period}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
