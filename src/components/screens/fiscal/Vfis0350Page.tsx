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
          <span className="fsc-screen-title">VFIS0350 — Classificações Fiscais</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Nova Classificação</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editCode !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0350 — Classificações Fiscais" filename="vfis0350" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Identificação</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">{editCode !== null ? `Editando ${editCode}` : "Código gerado pelo sistema"}</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Descrição</label>
              <input className="fsc-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">NCM</label>
              <input className="fsc-input" value={form.ncm ?? ""} placeholder="84714900" onChange={(e) => setF("ncm", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">CEST</label>
              <input className="fsc-input" value={form.cest ?? ""} onChange={(e) => setF("cest", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Ex Tarifário</label>
              <input className="fsc-input" value={form.ex_tarifario ?? ""} onChange={(e) => setF("ex_tarifario", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Tributos</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Alíq. IPI</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.ipi_rate ?? 0} onChange={(e) => setF("ipi_rate", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Indicador IPI</label>
              <select className="fsc-select" value={form.ipi_indicator ?? "PERCENTUAL"} onChange={(e) => setF("ipi_indicator", e.target.value as IpiIndicator)}>
                {INDS.map((i) => <option key={i} value={i}>{i}</option>)}</select></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Alíq. PIS</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.0001" value={form.pis_rate ?? 0} onChange={(e) => setF("pis_rate", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Alíq. COFINS</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.0001" value={form.cofins_rate ?? 0} onChange={(e) => setF("cofins_rate", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Mod. BC ICMS</label>
              <input className="fsc-input" value={form.mod_bc_icms ?? ""} onChange={(e) => setF("mod_bc_icms", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Mod. BC ICMS ST</label>
              <input className="fsc-input" value={form.mod_bc_icms_st ?? ""} onChange={(e) => setF("mod_bc_icms_st", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Cód. Clas. Trib (CBS/IBS)</label>
              <input className="fsc-input" value={form.cod_clas_trib ?? ""} onChange={(e) => setF("cod_clas_trib", e.target.value)} /></div>
            <div className="fsc-field fsc-col-12"><label className="fsc-label">Obs. Fiscal (infAdFisco)</label>
              <input className="fsc-input" value={form.obs_fiscal ?? ""} onChange={(e) => setF("obs_fiscal", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Classificações</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>Código</th><th>Descrição</th><th>NCM</th><th className="fsc-num">IPI</th><th>Ativo</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhuma classificação cadastrada.</td></tr>}
              {list.map((c) => (
                <tr key={c.code}>
                  <td style={{ fontWeight: 600 }}>{c.code}</td><td>{c.description}</td><td>{c.ncm || "—"}</td>
                  <td className="fsc-num">{c.ipi_rate ?? 0}</td>
                  <td>{c.is_active === false ? <span className="fsc-pill fsc-pill-red">Não</span> : <span className="fsc-pill fsc-pill-green">Sim</span>}</td>
                  <td>
                    <button className="fsc-action-btn fsc-edit-btn" onClick={() => edit(c)}>Editar</button>
                    <button className="fsc-action-btn fsc-edit-btn" onClick={() => void abrir(c)} disabled={!c.code}>Idiomas/Atrib.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
        {selected && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Idiomas — {selected.code}</span><div className="fsc-section-banner-line" />
              <button className="fsc-btn fsc-btn-ghost" onClick={() => setSelected(null)}>Fechar</button></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Idioma</label>
                  <input className="fsc-input" value={langForm.language} placeholder="en, es..." onChange={(e) => setLangForm((p) => ({ ...p, language: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-8"><label className="fsc-label fsc-label-req">Descrição</label>
                  <input className="fsc-input" value={langForm.description} onChange={(e) => setLangForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}>
                  <button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void addLang()} disabled={busy}>+ Idioma</button></div>
              </div>
            </div>
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead><tr><th>Idioma</th><th>Descrição</th></tr></thead>
                  <tbody>
                    {langs.length === 0 && <tr><td colSpan={2} className="fsc-empty">Nenhum idioma.</td></tr>}
                    {langs.map((l, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{parseStr(l, "language", "Language")}</td><td>{parseStr(l, "description", "Description")}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Atributos de Exportação</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Código</label>
                  <input className="fsc-input" value={attrForm.code} onChange={(e) => setAttrForm((p) => ({ ...p, code: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">NCM</label>
                  <input className="fsc-input" value={attrForm.ncm} onChange={(e) => setAttrForm((p) => ({ ...p, ncm: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-4"><label className="fsc-label">Descrição</label>
                  <input className="fsc-input" value={attrForm.description} onChange={(e) => setAttrForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Domínio</label>
                  <input className="fsc-input" value={attrForm.domain} onChange={(e) => setAttrForm((p) => ({ ...p, domain: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}>
                  <button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void addAttr()} disabled={busy}>+ Atributo</button></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Vigência início</label>
                  <input className="fsc-input" type="date" value={attrForm.start_date} onChange={(e) => setAttrForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Vigência fim</label>
                  <input className="fsc-input" type="date" value={attrForm.end_date} onChange={(e) => setAttrForm((p) => ({ ...p, end_date: e.target.value }))} /></div>
              </div>
            </div>
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead><tr><th>Código</th><th>Descrição</th><th>Domínio</th><th>Início</th><th>Fim</th></tr></thead>
                  <tbody>
                    {attrs.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhum atributo.</td></tr>}
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
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Classificações: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
