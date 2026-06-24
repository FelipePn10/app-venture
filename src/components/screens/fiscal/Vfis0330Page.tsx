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
          <span className="fsc-screen-title">VFIS0330 — Redução / Substituição / Diferimento de ICMS</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Nova Regra</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Filtro UF</span>
          <input className="fsc-input" style={{ width: 70, height: 32 }} maxLength={2} value={ufFilter}
            onChange={(e) => setUfFilter(e.target.value.toUpperCase())} />
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void reload(ufFilter)} disabled={busy}>Filtrar</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0330 — Redução / Substituição / Diferimento de ICMS" filename="vfis0330" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Identificação</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">{editId !== null ? `Editando #${editId}` : "Nova regra"}</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">UF</label>
              <input className="fsc-input" maxLength={2} value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase())} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Tipo Operação</label>
              <select className="fsc-select" value={form.operation_type} onChange={(e) => setF("operation_type", e.target.value as IcmsOpType)}>
                {OPS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">NCM</label>
              <input className="fsc-input" value={form.ncm_code ?? ""} onChange={(e) => setF("ncm_code", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Item (ID)</label>
              <input className="fsc-input fsc-input-right" type="number" value={form.item_id ?? ""} onChange={(e) => setOptNum("item_id", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Preferencial</label>
              <div className="fsc-toggle-row">
                <label className="fsc-toggle"><input type="checkbox" checked={!!form.is_preferential} onChange={(e) => setF("is_preferential", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label>
                <span className="fsc-toggle-label">{form.is_preferential ? "Sim" : "Não"}</span></div></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Cliente (ID)</label>
              <input className="fsc-input fsc-input-right" type="number" value={form.customer_id ?? ""} onChange={(e) => setOptNum("customer_id", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Fornecedor (ID)</label>
              <input className="fsc-input fsc-input-right" type="number" value={form.supplier_id ?? ""} onChange={(e) => setOptNum("supplier_id", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Estabelecimento (ID)</label>
              <input className="fsc-input fsc-input-right" type="number" value={form.establishment_id ?? ""} onChange={(e) => setOptNum("establishment_id", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Seg. Mercado (ID)</label>
              <input className="fsc-input fsc-input-right" type="number" value={form.market_segment_id ?? ""} onChange={(e) => setOptNum("market_segment_id", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Alíquotas &amp; CST</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-3"><label className="fsc-label">% ICMS Contrib.</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.icms_pct_contrib} onChange={(e) => setF("icms_pct_contrib", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">% ICMS Não-Contrib.</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.icms_pct_non_contrib} onChange={(e) => setF("icms_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">CST Contrib.</label>
              <input className="fsc-input" value={form.cst_icms_contrib} onChange={(e) => setF("cst_icms_contrib", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">CST Não-Contrib.</label>
              <input className="fsc-input" value={form.cst_icms_non_contrib} onChange={(e) => setF("cst_icms_non_contrib", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">% Redução Contrib.</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.icms_red_pct_contrib ?? ""} onChange={(e) => setOptNum("icms_red_pct_contrib", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Alvo Redução</label>
              <select className="fsc-select" value={form.icms_red_target_contrib ?? ""} onChange={(e) => setF("icms_red_target_contrib", (e.target.value || undefined) as RedTarget | undefined)}>
                <option value="">—</option>{TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">% Diferimento</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.icms_deferral_pct ?? ""} onChange={(e) => setOptNum("icms_deferral_pct", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">% Substituição</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.icms_subst_pct_contrib ?? ""} onChange={(e) => setOptNum("icms_subst_pct_contrib", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Busca da regra prioritária</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">Simula a hierarquia do motor para um cenário</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">UF</label>
              <input className="fsc-input" maxLength={2} value={findForm.uf} onChange={(e) => setFind("uf", e.target.value.toUpperCase())} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Item (ID)</label>
              <input className="fsc-input fsc-input-right" type="number" value={findForm.item_id} onChange={(e) => setFind("item_id", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Cliente (ID)</label>
              <input className="fsc-input fsc-input-right" type="number" value={findForm.customer_id} onChange={(e) => setFind("customer_id", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Operação</label>
              <select className="fsc-select" value={findForm.op_type} onChange={(e) => setFind("op_type", e.target.value as IcmsOpType)}>
                {OPS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
            <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}>
              <button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void buscarPrioritaria()} disabled={busy}>Buscar</button></div>
          </div>
          {findDone && (
            findResult ? (
              <div className="fsc-results-wrap" style={{ marginTop: 12 }}>
                <table className="fsc-table">
                  <thead><tr><th>#</th><th>UF</th><th>Operação</th><th>Escopo</th><th className="fsc-num">% Contrib.</th><th>CST</th></tr></thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>{findResult.id ?? "—"}</td><td>{findResult.uf}</td><td>{findResult.operation_type}</td>
                      <td>{findResult.is_preferential && <span className="fsc-pill fsc-pill-blue" style={{ marginRight: 4 }}>PREF</span>}{scopeLabel(findResult)}</td>
                      <td className="fsc-num">{findResult.icms_pct_contrib}</td><td>{findResult.cst_icms_contrib}/{findResult.cst_icms_non_contrib}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : <div className="fsc-empty" style={{ marginTop: 12 }}>Nenhuma regra casa com o cenário.</div>
          )}
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Regras</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>#</th><th>UF</th><th>Operação</th><th>Escopo</th><th className="fsc-num">% Contrib.</th><th>CST</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="fsc-empty">Nenhuma regra cadastrada.</td></tr>}
              {list.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td><td style={{ fontWeight: 600 }}>{r.uf}</td><td>{r.operation_type}</td>
                  <td>{r.is_preferential && <span className="fsc-pill fsc-pill-blue" style={{ marginRight: 4 }}>PREF</span>}{scopeLabel(r)}</td>
                  <td className="fsc-num">{r.icms_pct_contrib}</td><td>{r.cst_icms_contrib}/{r.cst_icms_non_contrib}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => edit(r)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Regras: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
