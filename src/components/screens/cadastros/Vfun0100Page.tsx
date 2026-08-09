import { useState, useEffect, useCallback, useMemo } from "react";
import {
  type EmployeeDTO, type EmployeeSituation,
  listEmployees, createEmployee, updateEmployee, deactivateEmployee,
} from "@/services/employeeService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: EmployeeDTO = { code: 0, name: "", role: "", situation: "ACTIVE", participates_budget: false, technical_assistant: false };

/**
 * Próximo código livre = maior código cadastrado + 1 (mínimo 1, pois
 * `entity.NewEmployee` recusa `code <= 0`). O backend não expõe uma sequência
 * para funcionário, então o número é sugerido aqui e reconfirmado no salvamento:
 * se outro usuário gravar o mesmo código no intervalo, `salvar()` recarrega a
 * lista e tenta uma vez com o próximo livre.
 */
function nextFreeCode(list: EmployeeDTO[]): number {
  return list.reduce((max, e) => Math.max(max, e.code ?? 0), 0) + 1;
}

/** `true` quando o erro do backend indica código já usado (unique violation). */
function isDuplicateCode(e: unknown): boolean {
  return /duplicat|já (existe|cadastrad)|unique|23505/i.test(errMessage(e, ""));
}

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

  /** Código sugerido para o próximo cadastro; em edição vale o código gravado. */
  const suggestedCode = useMemo(() => nextFreeCode(list), [list]);
  const shownCode = editing ? form.code : suggestedCode;

  function setF<K extends keyof EmployeeDTO>(k: K, v: EmployeeDTO[K]) { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); }
  function novo() { setForm(EMPTY); setEditing(false); setFeedback(null); }
  function edit(e: EmployeeDTO) { setForm({ ...EMPTY, ...e }); setEditing(true); setFeedback(null); }

  async function salvar() {
    if (!form.name.trim()) { setFeedback({ type: "error", message: "Nome é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editing) {
        await updateEmployee(form);
        setFeedback({ type: "success", message: `Funcionário ${form.code} salvo.` });
      } else {
        let code = suggestedCode;
        try {
          await createEmployee({ ...form, code });
        } catch (e) {
          if (!isDuplicateCode(e)) throw e;
          // Alguém gravou esse código enquanto a tela estava aberta: recalcula e repete.
          code = nextFreeCode(await listEmployees());
          await createEmployee({ ...form, code });
        }
        setFeedback({ type: "success", message: `Funcionário ${code} salvo.` });
      }
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
          <div className="erp-field erp-c2"><label className="erp-label">Código</label>
            <input className="erp-input num" type="number" value={shownCode || ""} disabled readOnly title="Gerado automaticamente pelo sistema" />
            {!editing && <span className="erp-hint">Gerado automaticamente</span>}</div>
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
