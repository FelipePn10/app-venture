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
    <div className="fsc-root">
      <header className="fsc-topbar">
        <div className="fsc-topbar-left">
          <div className="fsc-logo">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
              <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>
          <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
          <span className="fsc-screen-title">VFIS0360 — Tipos de Operação de Entrada</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        {tab === "operacoes" && (
          <>
            <div className="fsc-action-group">
              <span className="fsc-action-label">Cadastro</span>
              <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Novo Tipo</button>
            </div>
            <div className="fsc-action-group">
              <span className="fsc-action-label">Ações</span>
              <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editCode !== null ? "Atualizar" : "Salvar"}</button>
            </div>
          </>
        )}
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0360 — Tipos de Operação de Entrada" filename="vfis0360" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-card">
          <div className="fsc-tabs">
            <button className={`fsc-tab ${tab === "operacoes" ? "active" : ""}`} onClick={() => setTab("operacoes")}>Tipos de Operação</button>
            <button className={`fsc-tab ${tab === "grupos" ? "active" : ""}`} onClick={() => setTab("grupos")}>Grupos de Estado</button>
          </div>

          {tab === "operacoes" && (
            <div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Código</label>
                  <input className="fsc-input" value={form.code ?? ""} disabled={editCode !== null} onChange={(e) => setF("code", e.target.value)} /></div>
                <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Descrição</label>
                  <input className="fsc-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Natureza Op.</label>
                  <input className="fsc-input" value={form.nature_operation} placeholder="1xxx / 2xxx / 3xxx" onChange={(e) => setF("nature_operation", e.target.value)} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo Nota</label>
                  <input className="fsc-input" value={form.invoice_type_code ?? ""} onChange={(e) => setF("invoice_type_code", e.target.value)} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Grupo Estado</label>
                  <input className="fsc-input" value={form.state_group_code ?? ""} onChange={(e) => setF("state_group_code", e.target.value)} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Tipo Fornecedor</label>
                  <input className="fsc-input" value={form.supplier_type_code ?? ""} onChange={(e) => setF("supplier_type_code", e.target.value)} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Classif. (tipo)</label>
                  <input className="fsc-input" value={form.classification_type ?? ""} onChange={(e) => setF("classification_type", e.target.value)} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Classif. (código)</label>
                  <input className="fsc-input" value={form.classification_code ?? ""} onChange={(e) => setF("classification_code", e.target.value)} /></div>
              </div>

              <div className="fsc-results-bar" style={{ marginTop: 12 }}>
                <div className="fsc-results-bar-left"><span className="fsc-results-bar-label">Validar UF × Natureza</span></div>
                <input className="fsc-input" style={{ width: 90, height: 30 }} placeholder="código" value={validUf.code} onChange={(e) => setValidUf((p) => ({ ...p, code: e.target.value }))} />
                <input className="fsc-input" style={{ width: 60, height: 30 }} maxLength={2} placeholder="UF" value={validUf.uf} onChange={(e) => setValidUf((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} />
                <button className="fsc-btn fsc-btn-ghost" onClick={() => void validar()} disabled={busy}>Validar</button>
              </div>

              <div className="fsc-results-wrap" style={{ marginTop: 12 }}>
                <table className="fsc-table">
                  <thead><tr><th>Código</th><th>Descrição</th><th>Natureza</th><th>Grupo</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                  <tbody>
                    {list.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhum tipo de operação cadastrado.</td></tr>}
                    {list.map((o) => (
                      <tr key={o.code}>
                        <td style={{ fontWeight: 600 }}>{o.code}</td><td>{o.description}</td><td>{o.nature_operation}</td><td>{o.state_group_code || "—"}</td>
                        <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => edit(o)}>Editar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "grupos" && (
            <div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Código Grupo</label>
                  <input className="fsc-input" value={groupForm.code} onChange={(e) => setGroupForm((p) => ({ ...p, code: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-6"><label className="fsc-label">Descrição</label>
                  <input className="fsc-input" value={groupForm.description} onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}>
                  <button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void salvarGrupo()} disabled={busy}>+ Grupo</button></div>
              </div>
              <div className="fsc-results-bar" style={{ marginTop: 12 }}>
                <div className="fsc-results-bar-left"><span className="fsc-results-bar-label">Adicionar UF ao grupo</span></div>
                <input className="fsc-input" style={{ width: 90, height: 30 }} placeholder="grupo" value={ufAdd.code} onChange={(e) => setUfAdd((p) => ({ ...p, code: e.target.value }))} />
                <input className="fsc-input" style={{ width: 60, height: 30 }} maxLength={2} placeholder="UF" value={ufAdd.uf} onChange={(e) => setUfAdd((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} />
                <button className="fsc-btn fsc-btn-ghost" onClick={() => void addUf()} disabled={busy}>Adicionar</button>
              </div>
              <div className="fsc-results-wrap" style={{ marginTop: 12 }}>
                <table className="fsc-table">
                  <thead><tr><th>Código</th><th>Descrição</th><th>UFs</th></tr></thead>
                  <tbody>
                    {groups.length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhum grupo de estado.</td></tr>}
                    {groups.map((g) => (
                      <tr key={g.code}><td style={{ fontWeight: 600 }}>{g.code}</td><td>{g.description || "—"}</td><td>{g.ufs?.join(", ") || "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left">
          <div className="fsc-footer-stat">Tipos: <strong>{list.length}</strong></div>
          <div className="fsc-footer-stat">Grupos: <strong>{groups.length}</strong></div>
        </div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
