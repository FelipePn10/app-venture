import { useState, useEffect, useCallback } from "react";
import {
  type EmployeeDTO, type EmployeeSituation,
  listEmployees, createEmployee, updateEmployee, deactivateEmployee,
} from "@/services/employeeService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: EmployeeDTO = { code: 0, name: "", role: "", situation: "ACTIVE", participates_budget: false, technical_assistant: false };

export function Vfun0100Page(): JSX.Element {
  const [list, setList] = useState<EmployeeDTO[]>([]);
  const [form, setForm] = useState<EmployeeDTO>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listEmployees()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar funcionários.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  function setF<K extends keyof EmployeeDTO>(k: K, v: EmployeeDTO[K]) { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); }
  function novo() { setForm(EMPTY); setEditing(false); setFeedback(null); }
  function edit(e: EmployeeDTO) { setForm({ ...EMPTY, ...e }); setEditing(true); setFeedback(null); }

  async function salvar() {
    if (!form.code) { setFeedback({ type: "error", message: "Código é obrigatório." }); return; }
    if (!form.name.trim()) { setFeedback({ type: "error", message: "Nome é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editing) await updateEmployee(form); else await createEmployee(form);
      setFeedback({ type: "success", message: `Funcionário ${form.code} salvo.` });
      novo(); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function desativar(code: number) {
    setBusy(true); setFeedback(null);
    try { await deactivateEmployee(code); setFeedback({ type: "success", message: `Funcionário ${code} desativado.` }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Cadastros & Plataforma</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Cadastro de Funcionário</span><span className="erp-crumb-code">VFUN0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo</button>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : editing ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFUN0100 — Funcionários" filename="vfun0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Cadastro de Funcionário</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label>
            <input className="erp-input num" type="number" value={form.code || ""} disabled={editing} onChange={(e) => setF("code", Number(e.target.value))} /></div>
          <div className="erp-field erp-c5"><label className="erp-label erp-req">Nome</label>
            <input className="erp-input" value={form.name} onChange={(e) => setF("name", e.target.value)} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">Função / Cargo</label>
            <input className="erp-input" value={form.role ?? ""} onChange={(e) => setF("role", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
            <select className="erp-input" value={form.situation} onChange={(e) => setF("situation", e.target.value as EmployeeSituation)}>
              <option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select></div>
          <div className="erp-field erp-c3"><label className="erp-label">Participa do orçamento</label>
            <div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={!!form.participates_budget} onChange={(e) => setF("participates_budget", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">{form.participates_budget ? "Sim" : "Não"}</span></div></div>
          <div className="erp-field erp-c3"><label className="erp-label">Assistente técnico</label>
            <div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={!!form.technical_assistant} onChange={(e) => setF("technical_assistant", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">{form.technical_assistant ? "Sim" : "Não"}</span></div></div>
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Código</th><th>Nome</th><th>Função</th><th>Situação</th><th style={{ width: 130 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum funcionário.</td></tr>}
              {list.map((e) => (
                <tr key={e.code}>
                  <td style={{ fontWeight: 600 }}>{e.code}</td><td>{e.name}</td><td>{e.role || "—"}</td>
                  <td>{e.situation === "ACTIVE" ? <span className="erp-badge ok">Ativo</span> : <span className="erp-badge erp-badge-gray">Inativo</span>}</td>
                  <td>
                    <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(e)}>Editar</button>
                    <button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => void desativar(e.code)}>Desativar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Funcionários: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
