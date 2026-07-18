import { useState, useCallback, useEffect } from "react";
import {
  type FiscalClassificationDTO, type IpiIndicator, type ClassificationExportAttrDTO,
  listFiscalClassifications, createFiscalClassification, updateFiscalClassification,
  addClassificationLanguage, addClassificationExportAttribute, getClassificationDetail,
} from "@/services/fiscalAdvancedService";
import { errMessage, type Obj, parseStr } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_LANG = { language: "", description: "" };
const EMPTY_ATTR = { ncm: "", code: "", description: "", domain: "", start_date: today(), end_date: "" };
const INDS: IpiIndicator[] = ["PERCENTUAL", "VALOR"];
const EMPTY: FiscalClassificationDTO = {
  description: "", ncm: "", cest: "", ex_tarifario: "", ipi_rate: 0, ipi_indicator: "PERCENTUAL",
  pis_rate: 0, cofins_rate: 0, mod_bc_icms: "", mod_bc_icms_st: "", cod_clas_trib: "", obs_fiscal: "",
};

export function Vfis0350Page(): JSX.Element {
  const [form, setForm] = useState<FiscalClassificationDTO>(EMPTY);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [list, setList] = useState<FiscalClassificationDTO[]>([]);
  const [selected, setSelected] = useState<FiscalClassificationDTO | null>(null);
  const [langs, setLangs] = useState<Obj[]>([]);
  const [attrs, setAttrs] = useState<Obj[]>([]);
  const [langForm, setLangForm] = useState(EMPTY_LANG);
  const [attrForm, setAttrForm] = useState(EMPTY_ATTR);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listFiscalClassifications(false)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar classificações.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof FiscalClassificationDTO>(k: K, v: FiscalClassificationDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() { setForm(EMPTY); setEditCode(null); setFeedback(null); }
  function edit(c: FiscalClassificationDTO) { setForm({ ...c }); setEditCode(c.code ?? null); setFeedback(null); }

  async function salvar() {
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editCode !== null) { await updateFiscalClassification({ ...form, code: editCode }); setFeedback({ type: "success", message: `Classificação ${editCode} atualizada.` }); }
      else { await createFiscalClassification(form); setFeedback({ type: "success", message: "Classificação cadastrada." }); }
      novo(); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function abrir(c: FiscalClassificationDTO) {
    if (!c.code) return;
    setSelected(c); setLangForm(EMPTY_LANG); setAttrForm(EMPTY_ATTR); setBusy(true); setFeedback(null);
    try {
      const d = await getClassificationDetail(c.code);
      setLangs(d.languages); setAttrs(d.exportAttributes);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function addLang() {
    if (!selected?.code) return;
    if (!langForm.language.trim() || !langForm.description.trim()) { setFeedback({ type: "error", message: "Idioma e descrição são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await addClassificationLanguage({ classification_code: selected.code, ...langForm });
      setLangForm(EMPTY_LANG); setLangs((await getClassificationDetail(selected.code)).languages);
      setFeedback({ type: "success", message: "Idioma adicionado." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function addAttr() {
    if (!selected?.code) return;
    if (!attrForm.code.trim()) { setFeedback({ type: "error", message: "Código do atributo é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const dto: ClassificationExportAttrDTO = { classification_code: selected.code, ...attrForm };
      await addClassificationExportAttribute(dto);
      setAttrForm(EMPTY_ATTR); setAttrs((await getClassificationDetail(selected.code)).exportAttributes);
      setFeedback({ type: "success", message: "Atributo de exportação adicionado." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Classificações Fiscais</span><span className="erp-crumb-code">VFIS0350</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Nova Classificação</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editCode !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0350 — Classificações Fiscais" filename="vfis0350" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Classificações Fiscais</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Identificação  — <span style={{fontWeight:400,opacity:0.65}}>{editCode !== null ? `Editando ${editCode}` : "Código gerado pelo sistema"}</span></div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label>
              <input className="erp-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">NCM</label>
              <input className="erp-input" value={form.ncm ?? ""} placeholder="84714900" onChange={(e) => setF("ncm", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">CEST</label>
              <input className="erp-input" value={form.cest ?? ""} onChange={(e) => setF("cest", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Ex Tarifário</label>
              <input className="erp-input" value={form.ex_tarifario ?? ""} onChange={(e) => setF("ex_tarifario", e.target.value)} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Tributos</div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c3"><label className="erp-label">Alíq. IPI</label>
              <input className="erp-input num" type="number" step="0.01" value={form.ipi_rate ?? 0} onChange={(e) => setF("ipi_rate", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Indicador IPI</label>
              <select className="erp-input" value={form.ipi_indicator ?? "PERCENTUAL"} onChange={(e) => setF("ipi_indicator", e.target.value as IpiIndicator)}>
                {INDS.map((i) => <option key={i} value={i}>{i}</option>)}</select></div>
            <div className="erp-field erp-c3"><label className="erp-label">Alíq. PIS</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.pis_rate ?? 0} onChange={(e) => setF("pis_rate", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Alíq. COFINS</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.cofins_rate ?? 0} onChange={(e) => setF("cofins_rate", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Mod. BC ICMS</label>
              <input className="erp-input" value={form.mod_bc_icms ?? ""} onChange={(e) => setF("mod_bc_icms", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Mod. BC ICMS ST</label>
              <input className="erp-input" value={form.mod_bc_icms_st ?? ""} onChange={(e) => setF("mod_bc_icms_st", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Cód. Clas. Trib (CBS/IBS)</label>
              <input className="erp-input" value={form.cod_clas_trib ?? ""} onChange={(e) => setF("cod_clas_trib", e.target.value)} /></div>
            <div className="erp-field erp-c12"><label className="erp-label">Obs. Fiscal (infAdFisco)</label>
              <input className="erp-input" value={form.obs_fiscal ?? ""} onChange={(e) => setF("obs_fiscal", e.target.value)} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Classificações — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Código</th><th>Descrição</th><th>NCM</th><th>IPI</th><th>Ativo</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma classificação cadastrada.</td></tr>}
              {list.map((c) => (
                <tr key={c.code}>
                  <td style={{ fontWeight: 600 }}>{c.code}</td><td>{c.description}</td><td>{c.ncm || "—"}</td>
                  <td>{c.ipi_rate ?? 0}</td>
                  <td>{c.is_active === false ? <span className="erp-badge err">Não</span> : <span className="erp-badge ok">Sim</span>}</td>
                  <td>
                    <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(c)}>Editar</button>
                    <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void abrir(c)} disabled={!c.code}>Idiomas/Atrib.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
        </div>
        {selected && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Idiomas — {selected.code} <button className="erp-btn" onClick={() => setSelected(null)}>Fechar</button></div><div className="erp-fieldset-body">
              
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Idioma</label>
                  <input className="erp-input" value={langForm.language} placeholder="en, es..." onChange={(e) => setLangForm((p) => ({ ...p, language: e.target.value }))} /></div>
                <div className="erp-field erp-c8"><label className="erp-label erp-req">Descrição</label>
                  <input className="erp-input" value={langForm.description} onChange={(e) => setLangForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                  <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addLang()} disabled={busy}>+ Idioma</button></div>
              
            </div>
              <div className="erp-fieldset-body">
                <table className="erp-grid">
                  <thead><tr><th>Idioma</th><th>Descrição</th></tr></thead>
                  <tbody>
                    {langs.length === 0 && <tr><td colSpan={2} className="erp-grid-empty">Nenhum idioma.</td></tr>}
                    {langs.map((l, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{parseStr(l, "language", "Language")}</td><td>{parseStr(l, "description", "Description")}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Atributos de Exportação</div><div className="erp-fieldset-body">
              
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label>
                  <input className="erp-input" value={attrForm.code} onChange={(e) => setAttrForm((p) => ({ ...p, code: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">NCM</label>
                  <input className="erp-input" value={attrForm.ncm} onChange={(e) => setAttrForm((p) => ({ ...p, ncm: e.target.value }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Descrição</label>
                  <input className="erp-input" value={attrForm.description} onChange={(e) => setAttrForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Domínio</label>
                  <input className="erp-input" value={attrForm.domain} onChange={(e) => setAttrForm((p) => ({ ...p, domain: e.target.value }))} /></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                  <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addAttr()} disabled={busy}>+ Atributo</button></div>
                <div className="erp-field erp-c3"><label className="erp-label">Vigência início</label>
                  <input className="erp-input" type="date" value={attrForm.start_date} onChange={(e) => setAttrForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Vigência fim</label>
                  <input className="erp-input" type="date" value={attrForm.end_date} onChange={(e) => setAttrForm((p) => ({ ...p, end_date: e.target.value }))} /></div>
              
            </div>
              <div className="erp-fieldset-body">
                <table className="erp-grid">
                  <thead><tr><th>Código</th><th>Descrição</th><th>Domínio</th><th>Início</th><th>Fim</th></tr></thead>
                  <tbody>
                    {attrs.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum atributo.</td></tr>}
                    {attrs.map((a, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{parseStr(a, "code", "Code")}</td><td>{parseStr(a, "description", "Description")}</td>
                        <td>{parseStr(a, "domain", "Domain") || "—"}</td>
                        <td>{(parseStr(a, "start_date", "StartDate") || "").slice(0, 10) || "—"}</td>
                        <td>{(parseStr(a, "end_date", "EndDate") || "").slice(0, 10) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Classificações: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
