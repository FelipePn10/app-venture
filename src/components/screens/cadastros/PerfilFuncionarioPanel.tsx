import { useEffect, useState } from "react";
import { type EmployeeProfile, getEmployeeProfile, saveEmployeeProfile } from "@/services/employeeService";
import { errMessage } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadCostCentersById } from "@/services/lookups";
import { useAuthStore } from "@/store/authStore";

/*
 * Contatos, funções (com centro de custo, supervisor e gestor) e limite de
 * crédito do funcionário em edição na VFUN0100. Era a rotina genérica VAPS0400
 * ("Perfil de operadores APS"), que pedia o id interno do funcionário.
 */
export function PerfilFuncionarioPanel({ employeeId }: { employeeId: number }): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const [p, setP] = useState<EmployeeProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let vivo = true; setP(null);
    getEmployeeProfile(employeeId).then((x) => { if (vivo) setP(x); }).catch((e) => { if (vivo) setFeedback({ type: "error", message: errMessage(e) }); });
    return () => { vivo = false; };
  }, [employeeId]);

  if (!p) return <div className="erp-fieldset"><div className="erp-fieldset-body">{feedback ? <div className="erp-feedback error">{feedback.message}</div> : <span className="erp-spin" />}</div></div>;

  const gravar = async () => {
    if (p.contacts.some((c) => !c.value.trim()) || p.functions.some((f) => !f.function_name.trim())) { setFeedback({ type: "error", message: "Preencha o contato e o nome de cada função, ou remova a linha." }); return; }
    setBusy(true); setFeedback(null);
    try { await saveEmployeeProfile(employeeId, p); setP(await getEmployeeProfile(employeeId)); setFeedback({ type: "success", message: "Contatos e funções gravados." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  };

  return (
    <div className="erp-fieldset"><div className="erp-fieldset-head">Contatos e funções</div><div className="erp-fieldset-body">
      {feedback && <div className={`erp-field erp-c12 erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-field erp-c6"><label className="erp-label">Contatos</label>
        <table className="erp-grid">
          <thead><tr><th style={{ width: 110 }}>Tipo</th><th>Telefone / e-mail</th><th style={{ width: 70 }}>Principal</th><th style={{ width: 40 }} /></tr></thead>
          <tbody>
            {p.contacts.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum contato.</td></tr>}
            {p.contacts.map((c, i) => {
              const muda = (patch: Partial<typeof c>) => setP({ ...p, contacts: p.contacts.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <tr key={i}>
                  <td><select className="erp-input" value={c.contact_type} onChange={(e) => muda({ contact_type: e.target.value as "PHONE" | "EMAIL" })}><option value="PHONE">Telefone</option><option value="EMAIL">E-mail</option></select></td>
                  <td><input className="erp-input" value={c.value} onChange={(e) => muda({ value: e.target.value })} /></td>
                  <td style={{ textAlign: "center" }}><input type="checkbox" checked={c.is_primary} onChange={(e) => muda({ is_primary: e.target.checked })} aria-label="Principal" /></td>
                  <td><button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => setP({ ...p, contacts: p.contacts.filter((_, j) => j !== i) })}>×</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className="erp-btn erp-btn-sm" style={{ marginTop: 6 }} onClick={() => setP({ ...p, contacts: [...p.contacts, { contact_type: "PHONE", value: "", is_primary: p.contacts.length === 0 }] })}>+ Contato</button>
      </div>
      <div className="erp-field erp-c6"><label className="erp-label">Funções</label>
        <table className="erp-grid">
          <thead><tr><th>Função</th><th>Centro de custo</th><th style={{ width: 70 }}>Supervisor</th><th style={{ width: 60 }}>Gestor</th><th style={{ width: 40 }} /></tr></thead>
          <tbody>
            {p.functions.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma função.</td></tr>}
            {p.functions.map((f, i) => {
              const muda = (patch: Partial<typeof f>) => setP({ ...p, functions: p.functions.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <tr key={i}>
                  <td><input className="erp-input" placeholder="Ex.: operador de dobra" value={f.function_name} onChange={(e) => muda({ function_name: e.target.value })} /></td>
                  <td><LookupField value={f.cost_center_id} loader={loadCostCentersById} entityLabel="centro de custo" clearable onChange={(c) => muda({ cost_center_id: c ? Number(c) : undefined })} /></td>
                  <td style={{ textAlign: "center" }}><input type="checkbox" checked={f.is_supervisor} onChange={(e) => muda({ is_supervisor: e.target.checked })} aria-label="Supervisor" /></td>
                  <td style={{ textAlign: "center" }}><input type="checkbox" checked={f.is_manager} onChange={(e) => muda({ is_manager: e.target.checked })} aria-label="Gestor" /></td>
                  <td><button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => setP({ ...p, functions: p.functions.filter((_, j) => j !== i) })}>×</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className="erp-btn erp-btn-sm" style={{ marginTop: 6 }} onClick={() => setP({ ...p, functions: [...p.functions, { function_name: "", is_supervisor: false, is_manager: false }] })}>+ Função</button>
      </div>
      <div className="erp-field erp-c3"><label className="erp-label">Limite de crédito (R$)</label><input className="erp-input num" inputMode="decimal" value={p.credit_limit} onChange={(e) => setP({ ...p, credit_limit: e.target.value.replace(",", ".") })} /></div>
      <div className="erp-field erp-c9" style={{ justifyContent: "flex-end" }}>
        <button className="erp-btn erp-btn-primary" disabled={busy || !isAdmin} title={isAdmin ? undefined : "Somente o administrador altera contatos e funções"} onClick={() => void gravar()}>Gravar contatos e funções</button>
      </div>
    </div></div>
  );
}
