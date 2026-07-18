import { useState, useCallback, useEffect } from "react";
import {
  type IcmsReducaoDTO, type IcmsOpType, type RedTarget,
  listIcmsReducao, createIcmsReducao, updateIcmsReducao, findIcmsReducao,
} from "@/services/fiscalAdvancedService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FindForm = { uf: string; item_id: string; customer_id: string; op_type: IcmsOpType };
const EMPTY_FIND: FindForm = { uf: "", item_id: "", customer_id: "", op_type: "SAIDA" };

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const OPS: IcmsOpType[] = ["AMBAS", "ENTRADA", "SAIDA", "CUSTOS"];
const TARGETS: RedTarget[] = ["BASE", "PERCENTUAL"];

const EMPTY: IcmsReducaoDTO = {
  uf: "", operation_type: "SAIDA", icms_pct_contrib: 0, icms_pct_non_contrib: 0,
  cst_icms_contrib: "00", cst_icms_non_contrib: "00", ncm_code: "", is_preferential: false,
};

export function Vfis0330Page(): JSX.Element {
  const [form, setForm] = useState<IcmsReducaoDTO>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [list, setList] = useState<IcmsReducaoDTO[]>([]);
  const [ufFilter, setUfFilter] = useState("");
  const [findForm, setFindForm] = useState<FindForm>(EMPTY_FIND);
  const [findResult, setFindResult] = useState<IcmsReducaoDTO | null>(null);
  const [findDone, setFindDone] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (uf?: string) => {
    setBusy(true);
    try { setList(await listIcmsReducao(uf ? { uf } : undefined)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar regras.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof IcmsReducaoDTO>(k: K, v: IcmsReducaoDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  const setOptNum = (k: keyof IcmsReducaoDTO, raw: string) => setF(k, (raw === "" ? undefined : Number(raw)) as IcmsReducaoDTO[typeof k]);
  function novo() { setForm(EMPTY); setEditId(null); setFeedback(null); }
  function edit(r: IcmsReducaoDTO) { setForm({ ...r }); setEditId(r.id ?? null); setFeedback(null); }

  async function salvar() {
    if (!form.uf.trim()) { setFeedback({ type: "error", message: "UF é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    const payload: IcmsReducaoDTO = { ...form, ncm_code: form.ncm_code?.trim() || undefined };
    try {
      if (editId !== null) { await updateIcmsReducao({ ...payload, id: editId }); setFeedback({ type: "success", message: `Regra #${editId} atualizada.` }); }
      else { await createIcmsReducao(payload); setFeedback({ type: "success", message: "Regra cadastrada." }); }
      novo(); await reload(ufFilter);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const setFind = <K extends keyof FindForm>(k: K, v: FindForm[K]) => { setFindForm((p) => ({ ...p, [k]: v })); };

  async function buscarPrioritaria() {
    if (!findForm.uf.trim()) { setFeedback({ type: "error", message: "UF é obrigatória para a busca." }); return; }
    setBusy(true); setFeedback(null); setFindResult(null); setFindDone(false);
    try {
      const r = await findIcmsReducao({
        uf: findForm.uf.trim().toUpperCase(),
        item_id: findForm.item_id.trim(),
        customer_id: findForm.customer_id.trim(),
        op_type: findForm.op_type,
      });
      setFindResult(r); setFindDone(true);
      setFeedback(r ? { type: "success", message: `Regra #${r.id ?? "?"} é a prioritária para o cenário.` }
                     : { type: "info", message: "Nenhuma regra casa com o cenário informado." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  function scopeLabel(r: IcmsReducaoDTO): string {
    const parts: string[] = [];
    if (r.is_preferential) parts.push("PREF");
    if (r.item_id) parts.push(`Item ${r.item_id}`);
    if (r.ncm_code) parts.push(`NCM ${r.ncm_code}`);
    if (r.customer_id) parts.push(`Cli ${r.customer_id}`);
    if (r.supplier_id) parts.push(`Forn ${r.supplier_id}`);
    return parts.join(" • ") || "Geral (UF)";
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Redução / Substituição / Diferimento de ICMS</span><span className="erp-crumb-code">VFIS0330</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Nova Regra</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Filtro UF</span>
          <input className="erp-input" style={{ width: 70, height: 32 }} maxLength={2} value={ufFilter}
            onChange={(e) => setUfFilter(e.target.value.toUpperCase())} />
          <button className="erp-btn" onClick={() => void reload(ufFilter)} disabled={busy}>Filtrar</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0330 — Redução / Substituição / Diferimento de ICMS" filename="vfis0330" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Redução</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Identificação  — <span style={{fontWeight:400,opacity:0.65}}>{editId !== null ? `Editando #${editId}` : "Nova regra"}</span></div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label erp-req">UF</label>
              <input className="erp-input" maxLength={2} value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase())} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Tipo Operação</label>
              <select className="erp-input" value={form.operation_type} onChange={(e) => setF("operation_type", e.target.value as IcmsOpType)}>
                {OPS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
            <div className="erp-field erp-c3"><label className="erp-label">NCM</label>
              <input className="erp-input" value={form.ncm_code ?? ""} onChange={(e) => setF("ncm_code", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Item (ID)</label>
              <input className="erp-input num" type="number" value={form.item_id ?? ""} onChange={(e) => setOptNum("item_id", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Preferencial</label>
              <div className="erp-toggle-row">
                <label className="erp-toggle"><input type="checkbox" checked={!!form.is_preferential} onChange={(e) => setF("is_preferential", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label>
                <span className="erp-toggle-label">{form.is_preferential ? "Sim" : "Não"}</span></div></div>
            <div className="erp-field erp-c3"><label className="erp-label">Cliente (ID)</label>
              <input className="erp-input num" type="number" value={form.customer_id ?? ""} onChange={(e) => setOptNum("customer_id", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Fornecedor (ID)</label>
              <input className="erp-input num" type="number" value={form.supplier_id ?? ""} onChange={(e) => setOptNum("supplier_id", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Estabelecimento (ID)</label>
              <input className="erp-input num" type="number" value={form.establishment_id ?? ""} onChange={(e) => setOptNum("establishment_id", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Seg. Mercado (ID)</label>
              <input className="erp-input num" type="number" value={form.market_segment_id ?? ""} onChange={(e) => setOptNum("market_segment_id", e.target.value)} /></div>
          </div>
        </div>

        <div className="erp-fieldset-head">Alíquotas &amp; CST</div>
        <div className="erp-fieldset"><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c3"><label className="erp-label">% ICMS Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_pct_contrib} onChange={(e) => setF("icms_pct_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">% ICMS Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_pct_non_contrib} onChange={(e) => setF("icms_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">CST Contrib.</label>
              <input className="erp-input" value={form.cst_icms_contrib} onChange={(e) => setF("cst_icms_contrib", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">CST Não-Contrib.</label>
              <input className="erp-input" value={form.cst_icms_non_contrib} onChange={(e) => setF("cst_icms_non_contrib", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">% Redução Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_red_pct_contrib ?? ""} onChange={(e) => setOptNum("icms_red_pct_contrib", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Alvo Redução</label>
              <select className="erp-input" value={form.icms_red_target_contrib ?? ""} onChange={(e) => setF("icms_red_target_contrib", (e.target.value || undefined) as RedTarget | undefined)}>
                <option value="">—</option>{TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="erp-field erp-c3"><label className="erp-label">% Diferimento</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_deferral_pct ?? ""} onChange={(e) => setOptNum("icms_deferral_pct", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">% Substituição</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_subst_pct_contrib ?? ""} onChange={(e) => setOptNum("icms_subst_pct_contrib", e.target.value)} /></div>
          
        </div></div>

        <div className="erp-fieldset-head">Busca da regra prioritária — <span style={{fontWeight:400,opacity:0.65}}>Simula a hierarquia do motor para um cenário</span></div>
        <div className="erp-fieldset"><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label erp-req">UF</label>
              <input className="erp-input" maxLength={2} value={findForm.uf} onChange={(e) => setFind("uf", e.target.value.toUpperCase())} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Item (ID)</label>
              <input className="erp-input num" type="number" value={findForm.item_id} onChange={(e) => setFind("item_id", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Cliente (ID)</label>
              <input className="erp-input num" type="number" value={findForm.customer_id} onChange={(e) => setFind("customer_id", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Operação</label>
              <select className="erp-input" value={findForm.op_type} onChange={(e) => setFind("op_type", e.target.value as IcmsOpType)}>
                {OPS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
            <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
              <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void buscarPrioritaria()} disabled={busy}>Buscar</button></div>
          
          {findDone && (
            findResult ? (
              <div className="erp-fieldset-body" style={{ marginTop: 12 }}>
                <table className="erp-grid">
                  <thead><tr><th>#</th><th>UF</th><th>Operação</th><th>Escopo</th><th>% Contrib.</th><th>CST</th></tr></thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>{findResult.id ?? "—"}</td><td>{findResult.uf}</td><td>{findResult.operation_type}</td>
                      <td>{findResult.is_preferential && <span className="erp-badge info" style={{ marginRight: 4 }}>PREF</span>}{scopeLabel(findResult)}</td>
                      <td>{findResult.icms_pct_contrib}</td><td>{findResult.cst_icms_contrib}/{findResult.cst_icms_non_contrib}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : <div className="erp-grid-empty" style={{ marginTop: 12 }}>Nenhuma regra casa com o cenário.</div>
          )}
        </div></div>

        <div className="erp-fieldset-head">Regras — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div>
        <div className="erp-fieldset"><div className="erp-fieldset-body">
          <table className="erp-grid">
            <thead><tr><th>#</th><th>UF</th><th>Operação</th><th>Escopo</th><th>% Contrib.</th><th>CST</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma regra cadastrada.</td></tr>}
              {list.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td><td style={{ fontWeight: 600 }}>{r.uf}</td><td>{r.operation_type}</td>
                  <td>{r.is_preferential && <span className="erp-badge info" style={{ marginRight: 4 }}>PREF</span>}{scopeLabel(r)}</td>
                  <td>{r.icms_pct_contrib}</td><td>{r.cst_icms_contrib}/{r.cst_icms_non_contrib}</td>
                  <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(r)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Regras: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
