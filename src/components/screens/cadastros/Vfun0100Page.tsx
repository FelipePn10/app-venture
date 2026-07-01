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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VFUN0100 — Cadastro de Funcionário</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Novo</button>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : editing ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFUN0100 — Funcionários" filename="vfun0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Código</label>
            <input className="fsc-input fsc-input-right" type="number" value={form.code || ""} disabled={editing} onChange={(e) => setF("code", Number(e.target.value))} /></div>
          <div className="fsc-field fsc-col-5"><label className="fsc-label fsc-label-req">Nome</label>
            <input className="fsc-input" value={form.name} onChange={(e) => setF("name", e.target.value)} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Função / Cargo</label>
            <input className="fsc-input" value={form.role ?? ""} onChange={(e) => setF("role", e.target.value)} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Situação</label>
            <select className="fsc-select" value={form.situation} onChange={(e) => setF("situation", e.target.value as EmployeeSituation)}>
              <option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Participa do orçamento</label>
            <div className="fsc-toggle-row"><label className="fsc-toggle"><input type="checkbox" checked={!!form.participates_budget} onChange={(e) => setF("participates_budget", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label><span className="fsc-toggle-label">{form.participates_budget ? "Sim" : "Não"}</span></div></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Assistente técnico</label>
            <div className="fsc-toggle-row"><label className="fsc-toggle"><input type="checkbox" checked={!!form.technical_assistant} onChange={(e) => setF("technical_assistant", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label><span className="fsc-toggle-label">{form.technical_assistant ? "Sim" : "Não"}</span></div></div>
        </div></div></div>

        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Código</th><th>Nome</th><th>Função</th><th>Situação</th><th style={{ width: 130 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhum funcionário.</td></tr>}
              {list.map((e) => (
                <tr key={e.code}>
                  <td className="fsc-num" style={{ fontWeight: 600 }}>{e.code}</td><td>{e.name}</td><td>{e.role || "—"}</td>
                  <td>{e.situation === "ACTIVE" ? <span className="fsc-pill fsc-pill-green">Ativo</span> : <span className="fsc-pill fsc-pill-gray">Inativo</span>}</td>
                  <td>
                    <button className="fsc-action-btn fsc-edit-btn" onClick={() => edit(e)}>Editar</button>
                    <button className="fsc-action-btn fsc-delete-btn" onClick={() => void desativar(e.code)}>Desativar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Funcionários: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
