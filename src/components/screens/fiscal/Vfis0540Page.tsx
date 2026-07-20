import { useState, useCallback, useEffect } from "react";
import {
  type LancamentoResumoDTO, type NotaResumoDTO,
  listLancamentosResumoIcms, createLancamentoResumoIcms, updateLancamentoResumoIcms,
  addNotaResumoIcms, listNotasResumoIcms,
} from "@/services/fiscalSupportService";
import {
  type ResumoAdicionalDTO, type ArrecadacaoIndicator,
  createResumoAdicional, listResumoAdicionais,
} from "@/services/fiscalAdvancedService";
import { errMessage, type Obj, parseStr, parseNum } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currentPeriod = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);
const INDS: ArrecadacaoIndicator[] = ["SEFAZ", "JUSTICA_FEDERAL", "JUSTICA_ESTADUAL", "OUTROS"];

const EMPTY: LancamentoResumoDTO = { period: currentPeriod(), uf: "", cfop_id: 0, icms_base: 0, icms_value: 0 };
const EMPTY_NOTA: NotaResumoDTO = { note_number: "", note_series: "", emitter_cnpj: "", issue_date: today(), item_value: 0, icms_base: 0, icms_value: 0 };
const EMPTY_ADIC: Omit<ResumoAdicionalDTO, "summary_entry_id"> = { arrecadacao_indicator: "SEFAZ", processo: "", description: "" };

export function Vfis0540Page(): JSX.Element {
  const [form, setForm] = useState<LancamentoResumoDTO>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [list, setList] = useState<LancamentoResumoDTO[]>([]);
  const [selected, setSelected] = useState<LancamentoResumoDTO | null>(null);
  const [notas, setNotas] = useState<Obj[]>([]);
  const [adicionais, setAdicionais] = useState<Obj[]>([]);
  const [notaForm, setNotaForm] = useState<NotaResumoDTO>(EMPTY_NOTA);
  const [adicForm, setAdicForm] = useState(EMPTY_ADIC);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listLancamentosResumoIcms(false)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar lançamentos.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof LancamentoResumoDTO>(k: K, v: LancamentoResumoDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  const setN = <K extends keyof NotaResumoDTO>(k: K, v: NotaResumoDTO[K]) => setNotaForm((p) => ({ ...p, [k]: v }));
  function novo() { setForm({ ...EMPTY, period: currentPeriod() }); setEditId(null); setFeedback(null); }
  function edit(l: LancamentoResumoDTO) { setForm({ ...l }); setEditId(l.id ?? null); setFeedback(null); }

  async function salvar() {
    if (!/^\d{4}-\d{2}$/.test(form.period)) { setFeedback({ type: "error", message: "Período deve estar no formato YYYY-MM." }); return; }
    if (!form.uf.trim() || !form.cfop_id) { setFeedback({ type: "error", message: "UF e CFOP (ID) são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editId !== null) { await updateLancamentoResumoIcms({ ...form, id: editId }); setFeedback({ type: "success", message: "Lançamento atualizado." }); }
      else { await createLancamentoResumoIcms(form); setFeedback({ type: "success", message: "Lançamento cadastrado." }); }
      novo(); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function abrir(l: LancamentoResumoDTO) {
    if (!l.id) return;
    setSelected(l); setNotaForm(EMPTY_NOTA); setAdicForm(EMPTY_ADIC); setBusy(true); setFeedback(null);
    try {
      const [ns, ad] = await Promise.all([listNotasResumoIcms(l.id), listResumoAdicionais(l.id).catch(() => [] as Obj[])]);
      setNotas(ns); setAdicionais(ad);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function addNota() {
    if (!selected?.id) return;
    if (!notaForm.note_number.trim() || !notaForm.emitter_cnpj.trim()) { setFeedback({ type: "error", message: "Número e CNPJ do emitente são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await addNotaResumoIcms(selected.id, notaForm);
      setNotaForm(EMPTY_NOTA); setNotas(await listNotasResumoIcms(selected.id));
      setFeedback({ type: "success", message: "Nota adicionada ao lançamento." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function addAdic() {
    if (!selected?.id) return;
    setBusy(true); setFeedback(null);
    try {
      await createResumoAdicional({ ...adicForm, summary_entry_id: selected.id });
      setAdicForm(EMPTY_ADIC); setAdicionais(await listResumoAdicionais(selected.id));
      setFeedback({ type: "success", message: "Registro adicional incluído." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Lançamentos Resumo de ICMS</span><span className="erp-crumb-code">VFIS0540</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo Lançamento</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0540 — Lançamentos Resumo de ICMS" filename="vfis0540" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Lançamentos Resumo de ICMS</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Lançamento  — <span style={{fontWeight:400,opacity:0.65}}>Par (período, UF, CFOP) é único</span></div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Período</label>
              <input className="erp-input" value={form.period} placeholder="2024-01" onChange={(e) => setF("period", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">UF</label>
              <input className="erp-input" maxLength={2} value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase())} /></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">CFOP (ID)</label>
              <input className="erp-input num" type="number" value={form.cfop_id || ""} onChange={(e) => setF("cfop_id", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Base ICMS</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_base} onChange={(e) => setF("icms_base", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Valor ICMS</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_value} onChange={(e) => setF("icms_value", Number(e.target.value))} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Lançamentos — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>#</th><th>Período</th><th>UF</th><th>CFOP</th><th>Base</th><th>ICMS</th><th style={{ width: 150 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum lançamento cadastrado.</td></tr>}
              {list.map((l) => (
                <tr key={l.id ?? `${l.period}-${l.uf}-${l.cfop_id}`}>
                  <td>{l.id ?? "—"}</td><td style={{ fontWeight: 600 }}>{l.period}</td><td>{l.uf}</td><td>{l.cfop_id}</td>
                  <td>{money(l.icms_base)}</td><td>{money(l.icms_value)}</td>
                  <td>
                    <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(l)}>Editar</button>
                    <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void abrir(l)} disabled={!l.id}>Notas/Adic.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
        </div>

        {selected && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Notas — Lançamento {selected.id} <button className="erp-btn" onClick={() => setSelected(null)}>Fechar</button></div><div className="erp-fieldset-body">
              
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Nº Nota</label>
                  <input className="erp-input" value={notaForm.note_number} onChange={(e) => setN("note_number", e.target.value)} /></div>
                <div className="erp-field erp-c1"><label className="erp-label">Série</label>
                  <input className="erp-input" value={notaForm.note_series ?? ""} onChange={(e) => setN("note_series", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label erp-req">CNPJ Emitente</label>
                  <input className="erp-input" value={notaForm.emitter_cnpj} onChange={(e) => setN("emitter_cnpj", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Emissão</label>
                  <input className="erp-input" type="date" value={notaForm.issue_date} onChange={(e) => setN("issue_date", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Valor Item</label>
                  <input className="erp-input num" type="number" step="0.01" value={notaForm.item_value} onChange={(e) => setN("item_value", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                  <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addNota()} disabled={busy}>+ Nota</button></div>
                <div className="erp-field erp-c3"><label className="erp-label">Base ICMS</label>
                  <input className="erp-input num" type="number" step="0.01" value={notaForm.icms_base} onChange={(e) => setN("icms_base", Number(e.target.value))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Valor ICMS</label>
                  <input className="erp-input num" type="number" step="0.01" value={notaForm.icms_value} onChange={(e) => setN("icms_value", Number(e.target.value))} /></div>
              
            </div>
              <div className="erp-fieldset-body">
                <table className="erp-grid">
                  <thead><tr><th>Nota</th><th>Série</th><th>CNPJ</th><th>Emissão</th><th>Valor</th><th>ICMS</th></tr></thead>
                  <tbody>
                    {notas.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma nota.</td></tr>}
                    {notas.map((n, i) => (
                      <tr key={i}>
                        <td>{parseStr(n, "note_number", "NoteNumber")}</td><td>{parseStr(n, "note_series", "NoteSeries") || "—"}</td>
                        <td>{parseStr(n, "emitter_cnpj", "EmitterCnpj")}</td><td>{(parseStr(n, "issue_date", "IssueDate") || "").slice(0, 10)}</td>
                        <td>{money(parseNum(n, "item_value", "ItemValue"))}</td><td>{money(parseNum(n, "icms_value", "IcmsValue"))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Adicionais (C197 / processos)</div><div className="erp-fieldset-body">
              
                <div className="erp-field erp-c3"><label className="erp-label">Indicador</label>
                  <select className="erp-input" value={adicForm.arrecadacao_indicator} onChange={(e) => setAdicForm((p) => ({ ...p, arrecadacao_indicator: e.target.value as ArrecadacaoIndicator }))}>
                    {INDS.map((i) => <option key={i} value={i}>{i}</option>)}</select></div>
                <div className="erp-field erp-c3"><label className="erp-label">Processo</label>
                  <input className="erp-input" value={adicForm.processo ?? ""} onChange={(e) => setAdicForm((p) => ({ ...p, processo: e.target.value }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Descrição</label>
                  <input className="erp-input" value={adicForm.description ?? ""} onChange={(e) => setAdicForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                  <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addAdic()} disabled={busy}>+ Adicional</button></div>
              
            </div>
              <div className="erp-fieldset-body">
                <table className="erp-grid">
                  <thead><tr><th>Indicador</th><th>Processo</th><th>Descrição</th></tr></thead>
                  <tbody>
                    {adicionais.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhum adicional.</td></tr>}
                    {adicionais.map((a, i) => (
                      <tr key={i}>
                        <td><span className="erp-badge erp-badge-gray">{parseStr(a, "arrecadacao_indicator", "ArrecadacaoIndicator")}</span></td>
                        <td>{parseStr(a, "processo", "Processo") || "—"}</td><td>{parseStr(a, "description", "Description")}</td>
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
        <div style={{display:"contents"}}><div className="erp-status-item">Lançamentos: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
