import { useState, useCallback, useEffect } from "react";
import {
  type EntryOperationDTO, type StateGroupDTO,
  listEntryOperations, createEntryOperation, updateEntryOperation, validateEntryOperation,
  listStateGroups, createStateGroup, addUfToStateGroup,
} from "@/services/fiscalAdvancedService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "operacoes" | "grupos";
const EMPTY: EntryOperationDTO = {
  code: "", description: "", invoice_type_code: "", nature_operation: "", state_group_code: "", supplier_type_code: "",
};

export function Vfis0360Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("operacoes");
  const [form, setForm] = useState<EntryOperationDTO>(EMPTY);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [list, setList] = useState<EntryOperationDTO[]>([]);
  const [groups, setGroups] = useState<StateGroupDTO[]>([]);
  const [groupForm, setGroupForm] = useState({ code: "", description: "" });
  const [ufAdd, setUfAdd] = useState<{ code: string; uf: string }>({ code: "", uf: "" });
  const [validUf, setValidUf] = useState<{ code: string; uf: string }>({ code: "", uf: "" });
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      const [ops, gs] = await Promise.all([listEntryOperations(), listStateGroups().catch(() => [] as StateGroupDTO[])]);
      setList(ops); setGroups(gs);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar tipos de operação.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof EntryOperationDTO>(k: K, v: EntryOperationDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() { setForm(EMPTY); setEditCode(null); setFeedback(null); }
  function edit(o: EntryOperationDTO) { setForm({ ...o }); setEditCode(o.code ?? null); setFeedback(null); }

  async function salvar() {
    if (!form.description.trim() || !form.nature_operation.trim()) { setFeedback({ type: "error", message: "Descrição e Natureza de Operação são obrigatórias." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editCode !== null) { await updateEntryOperation({ ...form, code: editCode }); setFeedback({ type: "success", message: `Tipo ${editCode} atualizado.` }); }
      else { await createEntryOperation(form); setFeedback({ type: "success", message: "Tipo de operação cadastrado." }); }
      novo(); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function validar() {
    if (!validUf.code.trim() || !validUf.uf.trim()) { setFeedback({ type: "error", message: "Informe o código do tipo e a UF." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const r = await validateEntryOperation(validUf.code.trim(), validUf.uf.trim().toUpperCase());
      setFeedback({ type: r.valid ? "success" : "error", message: `UF ${validUf.uf.toUpperCase()} ${r.valid ? "válida" : "inválida"} para ${validUf.code}${r.reason ? ` — ${r.reason}` : ""}.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function salvarGrupo() {
    if (!groupForm.code.trim()) { setFeedback({ type: "error", message: "Código do grupo é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    try { await createStateGroup(groupForm); setGroupForm({ code: "", description: "" }); setFeedback({ type: "success", message: "Grupo de estado criado." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function addUf() {
    if (!ufAdd.code.trim() || !ufAdd.uf.trim()) { setFeedback({ type: "error", message: "Informe o grupo e a UF." }); return; }
    setBusy(true); setFeedback(null);
    try { await addUfToStateGroup(ufAdd.code.trim(), ufAdd.uf.trim().toUpperCase()); setUfAdd({ code: "", uf: "" }); setFeedback({ type: "success", message: "UF adicionada ao grupo." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Tipos de Operação de Entrada</span><span className="erp-crumb-code">VFIS0360</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        {tab === "operacoes" && (
          <>
            <div className="erp-tgroup">
              <span className="erp-tgroup-label">Cadastro</span>
              <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo Tipo</button>
            </div>
            <div className="erp-tgroup">
              <span className="erp-tgroup-label">Ações</span>
              <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editCode !== null ? "Atualizar" : "Salvar"}</button>
            </div>
          </>
        )}
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0360 — Tipos de Operação de Entrada" filename="vfis0360" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Tipos de Operação de Entra</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="erp-fieldset">
          <div className="erp-tabs">
            <button className={`erp-tab ${tab === "operacoes" ? "active" : ""}`} onClick={() => setTab("operacoes")}>Tipos de Operação</button>
            <button className={`erp-tab ${tab === "grupos" ? "active" : ""}`} onClick={() => setTab("grupos")}>Grupos de Estado</button>
          </div>

          {tab === "operacoes" && (
            <div className="erp-fieldset-body">
              
                <div className="erp-field erp-c2"><label className="erp-label">Código</label>
                  <input className="erp-input" value={form.code ?? ""} disabled={editCode !== null} onChange={(e) => setF("code", e.target.value)} /></div>
                <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label>
                  <input className="erp-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Natureza Op.</label>
                  <input className="erp-input" value={form.nature_operation} placeholder="1xxx / 2xxx / 3xxx" onChange={(e) => setF("nature_operation", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Tipo Nota</label>
                  <input className="erp-input" value={form.invoice_type_code ?? ""} onChange={(e) => setF("invoice_type_code", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Grupo Estado</label>
                  <input className="erp-input" value={form.state_group_code ?? ""} onChange={(e) => setF("state_group_code", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Tipo Fornecedor</label>
                  <input className="erp-input" value={form.supplier_type_code ?? ""} onChange={(e) => setF("supplier_type_code", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Classif. (tipo)</label>
                  <input className="erp-input" value={form.classification_type ?? ""} onChange={(e) => setF("classification_type", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Classif. (código)</label>
                  <input className="erp-input" value={form.classification_code ?? ""} onChange={(e) => setF("classification_code", e.target.value)} /></div>
              

              <div className="erp-results-bar" style={{ marginTop: 12 }}>
                <div className="erp-results-bar-left"><span className="erp-results-bar-label">Validar UF × Natureza</span></div>
                <input className="erp-input" style={{ width: 90, height: 30 }} placeholder="código" value={validUf.code} onChange={(e) => setValidUf((p) => ({ ...p, code: e.target.value }))} />
                <input className="erp-input" style={{ width: 60, height: 30 }} maxLength={2} placeholder="UF" value={validUf.uf} onChange={(e) => setValidUf((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} />
                <button className="erp-btn" onClick={() => void validar()} disabled={busy}>Validar</button>
              </div>

              <div className="erp-fieldset-body" style={{ marginTop: 12 }}>
                <table className="erp-grid">
                  <thead><tr><th>Código</th><th>Descrição</th><th>Natureza</th><th>Grupo</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                  <tbody>
                    {list.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum tipo de operação cadastrado.</td></tr>}
                    {list.map((o) => (
                      <tr key={o.code}>
                        <td style={{ fontWeight: 600 }}>{o.code}</td><td>{o.description}</td><td>{o.nature_operation}</td><td>{o.state_group_code || "—"}</td>
                        <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(o)}>Editar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "grupos" && (
            <div className="erp-fieldset-body">
              
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Código Grupo</label>
                  <input className="erp-input" value={groupForm.code} onChange={(e) => setGroupForm((p) => ({ ...p, code: e.target.value }))} /></div>
                <div className="erp-field erp-c6"><label className="erp-label">Descrição</label>
                  <input className="erp-input" value={groupForm.description} onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                  <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void salvarGrupo()} disabled={busy}>+ Grupo</button></div>
              
              <div className="erp-results-bar" style={{ marginTop: 12 }}>
                <div className="erp-results-bar-left"><span className="erp-results-bar-label">Adicionar UF ao grupo</span></div>
                <input className="erp-input" style={{ width: 90, height: 30 }} placeholder="grupo" value={ufAdd.code} onChange={(e) => setUfAdd((p) => ({ ...p, code: e.target.value }))} />
                <input className="erp-input" style={{ width: 60, height: 30 }} maxLength={2} placeholder="UF" value={ufAdd.uf} onChange={(e) => setUfAdd((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} />
                <button className="erp-btn" onClick={() => void addUf()} disabled={busy}>Adicionar</button>
              </div>
              <div className="erp-fieldset-body" style={{ marginTop: 12 }}>
                <table className="erp-grid">
                  <thead><tr><th>Código</th><th>Descrição</th><th>UFs</th></tr></thead>
                  <tbody>
                    {groups.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhum grupo de estado.</td></tr>}
                    {groups.map((g) => (
                      <tr key={g.code}><td style={{ fontWeight: 600 }}>{g.code}</td><td>{g.description || "—"}</td><td>{g.ufs?.join(", ") || "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}>
          <div className="erp-status-item">Tipos: <strong>{list.length}</strong></div>
          <div className="erp-status-item">Grupos: <strong>{groups.length}</strong></div>
        </div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
