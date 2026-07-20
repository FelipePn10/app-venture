import { useState, useCallback, useEffect } from "react";
import {
  type IcmsStRestituicaoDTO, type RestituicaoTipo,
  listIcmsStRestituicao, createIcmsStRestituicao, updateIcmsStRestituicao,
} from "@/services/fiscalAdvancedService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currentPeriod = () => new Date().toISOString().slice(0, 7);
const TIPOS: RestituicaoTipo[] = ["RESTITUICAO", "RESSARCIMENTO", "COMPLEMENTACAO"];

const EMPTY: IcmsStRestituicaoDTO = {
  empresa_id: 1, period: currentPeriod(), restitution_type: "RESTITUICAO", uf: "",
  orig_doc_model: "55", orig_doc_number: "", orig_emitter_cnpj: "", item_code: "", cfop: "", cst_icms: "10",
  icms_st_base: 0, icms_st_aliq: 0, icms_st_value: 0, icms_st_base_restitution: 0, icms_st_value_restitution: 0,
};

export function Vfis0550Page(): JSX.Element {
  const [form, setForm] = useState<IcmsStRestituicaoDTO>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [list, setList] = useState<IcmsStRestituicaoDTO[]>([]);
  const [periodFilter, setPeriodFilter] = useState(currentPeriod());
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  // O endpoint de listagem exige period=YYYY-MM.
  const reload = useCallback(async (period: string) => {
    if (!/^\d{4}-\d{2}$/.test(period)) { setFeedback({ type: "error", message: "Informe um período YYYY-MM para listar." }); return; }
    setBusy(true);
    try { setList(await listIcmsStRestituicao({ period })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar pedidos.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(currentPeriod()); }, [reload]);

  const setF = <K extends keyof IcmsStRestituicaoDTO>(k: K, v: IcmsStRestituicaoDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() { setForm({ ...EMPTY, period: currentPeriod() }); setEditId(null); setFeedback(null); }
  function edit(r: IcmsStRestituicaoDTO) { setForm({ ...r }); setEditId(r.id ?? null); setFeedback(null); }

  async function salvar() {
    if (!/^\d{4}-\d{2}$/.test(form.period)) { setFeedback({ type: "error", message: "Período deve estar no formato YYYY-MM." }); return; }
    if (!form.uf.trim() || !form.empresa_id) { setFeedback({ type: "error", message: "Empresa e UF são obrigatórias." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editId !== null) { await updateIcmsStRestituicao({ ...form, id: editId }); setFeedback({ type: "success", message: `Pedido #${editId} atualizado.` }); }
      else { await createIcmsStRestituicao(form); setFeedback({ type: "success", message: "Pedido cadastrado." }); }
      novo(); await reload(periodFilter);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Restituição / Ressarcimento de ICMS ST</span><span className="erp-crumb-code">VFIS0550</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo Pedido</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Filtro período</span>
          <input className="erp-input" style={{ width: 110, height: 32 }} value={periodFilter} placeholder="2024-01" onChange={(e) => setPeriodFilter(e.target.value)} />
          <button className="erp-btn" onClick={() => void reload(periodFilter)} disabled={busy}>Filtrar</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0550 — Restituição / Ressarcimento de ICMS ST" filename="vfis0550" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Restituição</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Documento de origem  — <span style={{fontWeight:400,opacity:0.65}}>SPED C180/C181/C185/C186/1250/1251</span></div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Empresa (ID)</label>
              <input className="erp-input num" type="number" value={form.empresa_id || ""} onChange={(e) => setF("empresa_id", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Período</label>
              <input className="erp-input" value={form.period} placeholder="2024-01" onChange={(e) => setF("period", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Tipo</label>
              <select className="erp-input" value={form.restitution_type} onChange={(e) => setF("restitution_type", e.target.value as RestituicaoTipo)}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">UF</label>
              <input className="erp-input" maxLength={2} value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase())} /></div>
            <div className="erp-field erp-c1"><label className="erp-label">Modelo</label>
              <input className="erp-input" value={form.orig_doc_model ?? ""} onChange={(e) => setF("orig_doc_model", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Nº Doc.</label>
              <input className="erp-input" value={form.orig_doc_number ?? ""} onChange={(e) => setF("orig_doc_number", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">CNPJ Emitente</label>
              <input className="erp-input" value={form.orig_emitter_cnpj ?? ""} onChange={(e) => setF("orig_emitter_cnpj", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Item</label>
              <input className="erp-input" value={form.item_code ?? ""} onChange={(e) => setF("item_code", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">CFOP</label>
              <input className="erp-input" value={form.cfop ?? ""} onChange={(e) => setF("cfop", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">CST</label>
              <input className="erp-input" value={form.cst_icms ?? ""} onChange={(e) => setF("cst_icms", e.target.value)} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Valores ICMS ST</div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c3"><label className="erp-label">Base ST</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_st_base ?? 0} onChange={(e) => setF("icms_st_base", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Alíq. ST (%)</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_st_aliq ?? 0} onChange={(e) => setF("icms_st_aliq", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Valor ST</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_st_value ?? 0} onChange={(e) => setF("icms_st_value", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"></div>
            <div className="erp-field erp-c3"><label className="erp-label">Base Restituição</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_st_base_restitution ?? 0} onChange={(e) => setF("icms_st_base_restitution", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Valor Restituição</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_st_value_restitution ?? 0} onChange={(e) => setF("icms_st_value_restitution", Number(e.target.value))} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Pedidos — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>#</th><th>Período</th><th>Tipo</th><th>UF</th><th>Doc.</th><th>Item</th><th>Valor Restit.</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum pedido cadastrado.</td></tr>}
              {list.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td><td style={{ fontWeight: 600 }}>{r.period}</td><td><span className="erp-badge erp-badge-gray">{r.restitution_type}</span></td>
                  <td>{r.uf}</td><td>{r.orig_doc_number || "—"}</td><td>{r.item_code || "—"}</td>
                  <td>{money(r.icms_st_value_restitution)}</td>
                  <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(r)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Pedidos: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
