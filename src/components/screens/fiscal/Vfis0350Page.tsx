import { useState, useCallback, useEffect } from "react";
import {
  type FiscalClassificationDTO, type ClassificationExportAttrDTO,
  listFiscalClassifications, createFiscalClassification, updateFiscalClassification,
  addClassificationLanguage, addClassificationExportAttribute, getClassificationDetail,
} from "@/services/fiscalAdvancedService";
import { errMessage, type Obj, parseStr } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { type ClassificacaoIBSCBS, listarClassificacoes } from "@/services/reformaTributariaService";
import { listNcmTaxes } from "@/services/taxTableService";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
// Dia LOCAL: toISOString() dá o dia em UTC, que já é amanhã depois das 21h.
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const EMPTY_LANG = { language: "", description: "" };
const EMPTY_ATTR = { ncm: "", code: "", description: "", domain: "", start_date: today(), end_date: "" };
const EMPTY: FiscalClassificationDTO = {
  description: "", ncm: "", cest: "", ex_tarifario: "", ipi_rate: 0, ipi_indicator: "PERCENTUAL",
  pis_rate: 0, cofins_rate: 0, mod_bc_icms: "", mod_bc_icms_st: "", cod_clas_trib: "", obs_fiscal: "",
  valid_from: today(), valid_until: "", default_origin: "0", default_icms_rate: 0,
  default_calculate_pis_cofins: false, un_ipi: "", un_tributacao: "",
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
  // Tabela oficial de cClassTrib (só os admitidos na NF-e) para escolher o
  // tratamento de IBS/CBS do produto; o backend recusa código fora dela.
  const [classTrib, setClassTrib] = useState<ClassificacaoIBSCBS[]>([]);
  useEffect(() => { listarClassificacoes().then(setClassTrib).catch(() => setClassTrib([])); }, []);
  // IPI pela tabela tributária: é o que a nota e o pedido de compra usam.
  const [tabelaNcm, setTabelaNcm] = useState<Map<string, number>>(new Map());
  useEffect(() => { listNcmTaxes().then((l) => setTabelaNcm(new Map(l.filter((n) => n.is_active !== false).map((n) => [n.ncm.replace(/\D/g, ""), n.aliq_ipi])))).catch(() => setTabelaNcm(new Map())); }, []);
  const ipiDoNcm = (ncm?: string | null): string | null => {
    const v = tabelaNcm.get((ncm ?? "").replace(/\D/g, ""));
    return v === undefined ? null : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
  };
  const descricaoClassTrib = classTrib.find((c) => c.cclass_trib === (form.cod_clas_trib ?? "").trim());

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
      <style>{`
        .cls-sec { font-size: 10.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #2f7d47; border-bottom: 1px solid #dbe8d5; padding-bottom: 4px; margin-top: 4px; }
      `}</style>
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
            <div className="erp-field erp-c2"><label className="erp-label" title="O NCM liga a classificação à tabela tributária (VFIS0110), de onde a nota tira o IPI e as exceções de PIS/COFINS.">NCM</label>
              <input className="erp-input" value={form.ncm ?? ""} placeholder="84714900" onChange={(e) => setF("ncm", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">CEST</label>
              <input className="erp-input" value={form.cest ?? ""} onChange={(e) => setF("cest", e.target.value)} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Padrões herdados pelos itens</div><div className="erp-fieldset-body">
            <div className="erp-field erp-c3"><label className="erp-label">Vigência inicial</label>
              <input className="erp-input" type="date" value={(form.valid_from ?? "").slice(0, 10)} onChange={(e) => setF("valid_from", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Vigência final</label>
              <input className="erp-input" type="date" value={(form.valid_until ?? "").slice(0, 10)} onChange={(e) => setF("valid_until", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label" title="O item sem origem própria herda esta na nota.">Origem padrão</label>
              <select className="erp-input" value={form.default_origin ?? ""} onChange={(e) => setF("default_origin", e.target.value)}>
                <option value="">Não definida</option><option value="0">0 — Nacional</option><option value="1">1 — Importação direta</option><option value="2">2 — Adquirida no mercado interno</option>
                <option value="3">3 — Nacional, importação &gt; 40% e ≤ 70%</option><option value="4">4 — Nacional, PPB</option><option value="5">5 — Nacional, importação ≤ 40%</option>
                <option value="6">6 — Importação direta, sem similar</option><option value="7">7 — Mercado interno, sem similar</option><option value="8">8 — Nacional, importação &gt; 70%</option>
              </select></div>
            <div className="erp-field erp-c3"><label className="erp-label" title="Unidade tributável padrão do item que não informa a sua.">UM de tributação</label>
              <input className="erp-input" value={form.un_tributacao ?? ""} onChange={(e) => setF("un_tributacao", e.target.value.toUpperCase())} /></div>
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Impostos da nota</div><div className="erp-fieldset-body">
            <div className="erp-field erp-c12" id="classificacao-impostos-origem"><small className="erp-hint">
              As alíquotas não ficam na classificação. Na nota, o <strong>IPI</strong> e as exceções de <strong>PIS/COFINS</strong> (monofásico, alíquota zero, suspensão) vêm do NCM na tabela tributária (VFIS0110); o <strong>ICMS</strong>, a redução, a ST e o diferimento vêm da UF e da regra de ICMS/IPI (VFIS0320); o PIS/COFINS normal, do regime da empresa. O pedido de compra sugere o mesmo IPI da tabela.
            </small></div>
            <div className="erp-field erp-c3"><label className="erp-label">IPI do NCM (VFIS0110)</label>
              <input className="erp-input num" id="classificacao-ipi-tabela" readOnly value={ipiDoNcm(form.ncm) ?? ""} placeholder={form.ncm ? "NCM fora da tabela" : "informe o NCM"} /></div>
            <div className="erp-field erp-c3"><label className="erp-label" title="Regime de apuração usado na EFD e na devolução de compra.">Apuração</label>
              <input className="erp-input" value={form.apuracao ?? ""} onChange={(e) => setF("apuracao", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">cClassTrib (IBS/CBS)</label>
              <input className="erp-input num" list="vfis0350-classtrib" maxLength={6} placeholder="000001" value={form.cod_clas_trib ?? ""} onChange={(e) => setF("cod_clas_trib", e.target.value)} />
              <datalist id="vfis0350-classtrib">{classTrib.filter((c) => c.suportado_emissao).map((c) => <option key={c.cclass_trib} value={c.cclass_trib}>{c.descricao.slice(0, 90)}</option>)}</datalist>
              <small>{(form.cod_clas_trib ?? "").trim() === "" ? "Vazio: tributação integral (000001), salvo CFOP com padrão em VFIS0670." : descricaoClassTrib ? `CST ${descricaoClassTrib.cst} — ${descricaoClassTrib.descricao.slice(0, 120)}` : "Código fora da tabela oficial."}</small></div>
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Classificações — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Código</th><th>Descrição</th><th>NCM</th><th title="Da tabela tributária (VFIS0110)">IPI do NCM</th><th>Ativo</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma classificação cadastrada.</td></tr>}
              {list.map((c) => (
                <tr key={c.code}>
                  <td style={{ fontWeight: 600 }}>{c.code}</td><td>{c.description}</td><td>{c.ncm || "—"}</td>
                  <td>{ipiDoNcm(c.ncm) ?? "—"}</td>
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
