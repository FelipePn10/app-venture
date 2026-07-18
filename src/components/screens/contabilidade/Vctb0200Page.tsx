import { useState, useEffect, useCallback } from "react";
import {
  type AccountingPlanDTO, type AccountDTO, type JournalEntryDTO, type Balancete, type AccountType, type AccountNature,
  listPlans, createPlan, listAccounts, createAccount, listJournalEntries, createJournalEntry, getBalancete,
} from "@/services/accountingService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "plans" | "accounts" | "journal" | "balancete";
const EMPRESA = 1;
const money = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  const [pForm, setPForm] = useState<AccountingPlanDTO>({ empresa_id: EMPRESA, name: "", year: new Date().getFullYear(), is_active: true });
  const [aForm, setAForm] = useState<AccountDTO>({ plan_id: 0, code: "", name: "", account_type: "ANALITICA", nature: "DEVEDORA" });
  const [jForm, setJForm] = useState<JournalEntryDTO>({ empresa_id: EMPRESA, entry_date: new Date().toISOString().slice(0, 10), period, history: "", debit_account_id: 0, credit_account_id: 0, value: 0 });

  const reloadPlans = useCallback(async () => {
    setBusy(true);
    try { setPlans(await listPlans(EMPRESA)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar planos.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reloadPlans(); }, [reloadPlans]);

  async function savePlan() {
    if (!pForm.name.trim()) { setFeedback({ type: "error", message: "Nome do plano é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    try { await createPlan(pForm); setFeedback({ type: "success", message: "Plano criado." }); setPForm((p) => ({ ...p, name: "" })); await reloadPlans(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function loadAccounts(id: number) {
    setPlanId(id); setAForm((p) => ({ ...p, plan_id: id })); setBusy(true);
    try { setAccounts(await listAccounts(id)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function saveAccount() {
    if (!planId) { setFeedback({ type: "error", message: "Selecione um plano (aba Contas)." }); return; }
    if (!aForm.code.trim() || !aForm.name.trim()) { setFeedback({ type: "error", message: "Código e nome da conta são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await createAccount({ ...aForm, plan_id: planId }); setFeedback({ type: "success", message: "Conta criada." }); setAForm((p) => ({ ...p, code: "", name: "" })); await loadAccounts(planId); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function loadJournal() {
    setBusy(true);
    try { setJournal(await listJournalEntries(EMPRESA, period)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function saveJournal() {
    if (!jForm.history.trim() || !jForm.debit_account_id || !jForm.credit_account_id || !jForm.value) { setFeedback({ type: "error", message: "Preencha histórico, contas débito/crédito e valor." }); return; }
    setBusy(true); setFeedback(null);
    try { await createJournalEntry({ ...jForm, period }); setFeedback({ type: "success", message: "Lançamento criado." }); setJForm((p) => ({ ...p, history: "", value: 0 })); await loadJournal(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function loadBalancete() {
    if (!planId) { setFeedback({ type: "error", message: "Selecione um plano (aba Contas) primeiro." }); return; }
    setBusy(true); setFeedback(null);
    try { setBalancete(await getBalancete(planId, EMPRESA, `${period}-01`, `${period}-28`)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Contabilidade</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Contabilidade (SPED ECD)</span><span className="erp-crumb-code">VCTB0200</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Competência</span>
          <input className="erp-input" style={{ width: 110, height: 32 }} value={period} placeholder="YYYY-MM" onChange={(e) => setPeriod(e.target.value)} /></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VCTB0200 — Contabilidade" filename="vctb0200" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Contabilidade</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset">
          <div className="erp-tabs">
            <button className={`erp-tab ${tab === "plans" ? "active" : ""}`} onClick={() => setTab("plans")}>Planos</button>
            <button className={`erp-tab ${tab === "accounts" ? "active" : ""}`} onClick={() => setTab("accounts")}>Contas</button>
            <button className={`erp-tab ${tab === "journal" ? "active" : ""}`} onClick={() => { setTab("journal"); void loadJournal(); }}>Lançamentos</button>
            <button className={`erp-tab ${tab === "balancete" ? "active" : ""}`} onClick={() => setTab("balancete")}>Balancete</button>
          </div>

          {tab === "plans" && (
            <div className="erp-fieldset-body">
              
                <div className="erp-field erp-c7"><label className="erp-label erp-req">Nome do plano</label><input className="erp-input" value={pForm.name} onChange={(e) => setPForm((p) => ({ ...p, name: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Ano</label><input className="erp-input num" type="number" value={pForm.year} onChange={(e) => setPForm((p) => ({ ...p, year: Number(e.target.value) }))} /></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void savePlan()} disabled={busy}>Criar plano</button></div>
              
              <div className="erp-fieldset-body" style={{ marginTop: 16 }}><table className="erp-grid">
                <thead><tr><th>ID</th><th>Nome</th><th>Ano</th><th style={{ width: 90 }}>Ações</th></tr></thead>
                <tbody>{plans.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum plano.</td></tr>}
                  {plans.map((p) => <tr key={p.id}><td>{p.id}</td><td>{p.name}</td><td>{p.year}</td>
                    <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => { p.id && void loadAccounts(p.id); setTab("accounts"); }}>Abrir</button></td></tr>)}
                </tbody></table></div>
            </div>
          )}

          {tab === "accounts" && (
            <div className="erp-fieldset-body">
              
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Código</label><input className="erp-input" value={aForm.code} placeholder="1.1.1.01" onChange={(e) => setAForm((p) => ({ ...p, code: e.target.value }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Nome</label><input className="erp-input" value={aForm.name} onChange={(e) => setAForm((p) => ({ ...p, name: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Tipo</label><select className="erp-input" value={aForm.account_type} onChange={(e) => setAForm((p) => ({ ...p, account_type: e.target.value as AccountType }))}><option value="ANALITICA">Analítica</option><option value="SINTETICA">Sintética</option></select></div>
                <div className="erp-field erp-c2"><label className="erp-label">Natureza</label><select className="erp-input" value={aForm.nature} onChange={(e) => setAForm((p) => ({ ...p, nature: e.target.value as AccountNature }))}><option value="DEVEDORA">Devedora</option><option value="CREDORA">Credora</option></select></div>
                <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void saveAccount()} disabled={busy}>+</button></div>
              
              <div className="erp-fieldset-body" style={{ marginTop: 16 }}><table className="erp-grid">
                <thead><tr><th>ID</th><th>Código</th><th>Nome</th><th>Tipo</th><th>Natureza</th></tr></thead>
                <tbody>{accounts.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma conta.</td></tr>}
                  {accounts.map((a) => <tr key={a.id}><td>{a.id}</td><td style={{ fontWeight: 600 }}>{a.code}</td><td>{a.name}</td><td>{a.account_type}</td><td>{a.nature}</td></tr>)}
                </tbody></table></div>
            </div>
          )}

          {tab === "journal" && (
            <div className="erp-fieldset-body">
              
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Histórico</label><input className="erp-input" value={jForm.history} onChange={(e) => setJForm((p) => ({ ...p, history: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Débito (conta ID)</label><input className="erp-input num" type="number" value={jForm.debit_account_id || ""} onChange={(e) => setJForm((p) => ({ ...p, debit_account_id: Number(e.target.value) }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Crédito (conta ID)</label><input className="erp-input num" type="number" value={jForm.credit_account_id || ""} onChange={(e) => setJForm((p) => ({ ...p, credit_account_id: Number(e.target.value) }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Valor</label><input className="erp-input num" type="number" step="0.01" value={jForm.value || ""} onChange={(e) => setJForm((p) => ({ ...p, value: Number(e.target.value) }))} /></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void saveJournal()} disabled={busy}>Lançar</button></div>
              
              <div className="erp-fieldset-body" style={{ marginTop: 16 }}><table className="erp-grid">
                <thead><tr><th>Data</th><th>Histórico</th><th>Débito</th><th>Crédito</th><th>Valor</th></tr></thead>
                <tbody>{journal.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum lançamento no período.</td></tr>}
                  {journal.map((j) => <tr key={j.id}><td>{j.entry_date?.slice(0, 10)}</td><td>{j.history}</td><td>{j.debit_account_id}</td><td>{j.credit_account_id}</td><td>{money(j.value)}</td></tr>)}
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
                  <div className="erp-fieldset-body" style={{ marginTop: 14 }}><table className="erp-grid">
                    <thead><tr><th>Conta</th><th>Nome</th><th>Débito</th><th>Crédito</th><th>Saldo</th></tr></thead>
                    <tbody>{balancete.rows.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Sem movimento.</td></tr>}
                      {balancete.rows.map((r, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{r.account_code}</td><td>{r.account_name}</td><td>{money(r.debit)}</td><td>{money(r.credit)}</td><td>{money(r.balance)}</td></tr>)}
                    </tbody></table></div>
                </>
              )}
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
