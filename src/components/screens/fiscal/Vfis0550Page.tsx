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
          <span className="fsc-screen-title">VFIS0550 — Restituição / Ressarcimento de ICMS ST</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Novo Pedido</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Filtro período</span>
          <input className="fsc-input" style={{ width: 110, height: 32 }} value={periodFilter} placeholder="2024-01" onChange={(e) => setPeriodFilter(e.target.value)} />
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void reload(periodFilter)} disabled={busy}>Filtrar</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0550 — Restituição / Ressarcimento de ICMS ST" filename="vfis0550" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Documento de origem</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">SPED C180/C181/C185/C186/1250/1251</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Empresa (ID)</label>
              <input className="fsc-input fsc-input-right" type="number" value={form.empresa_id || ""} onChange={(e) => setF("empresa_id", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Período</label>
              <input className="fsc-input" value={form.period} placeholder="2024-01" onChange={(e) => setF("period", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Tipo</label>
              <select className="fsc-select" value={form.restitution_type} onChange={(e) => setF("restitution_type", e.target.value as RestituicaoTipo)}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">UF</label>
              <input className="fsc-input" maxLength={2} value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase())} /></div>
            <div className="fsc-field fsc-col-1"><label className="fsc-label">Modelo</label>
              <input className="fsc-input" value={form.orig_doc_model ?? ""} onChange={(e) => setF("orig_doc_model", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Nº Doc.</label>
              <input className="fsc-input" value={form.orig_doc_number ?? ""} onChange={(e) => setF("orig_doc_number", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">CNPJ Emitente</label>
              <input className="fsc-input" value={form.orig_emitter_cnpj ?? ""} onChange={(e) => setF("orig_emitter_cnpj", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Item</label>
              <input className="fsc-input" value={form.item_code ?? ""} onChange={(e) => setF("item_code", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">CFOP</label>
              <input className="fsc-input" value={form.cfop ?? ""} onChange={(e) => setF("cfop", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">CST</label>
              <input className="fsc-input" value={form.cst_icms ?? ""} onChange={(e) => setF("cst_icms", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Valores ICMS ST</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Base ST</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.icms_st_base ?? 0} onChange={(e) => setF("icms_st_base", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Alíq. ST (%)</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.icms_st_aliq ?? 0} onChange={(e) => setF("icms_st_aliq", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Valor ST</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.icms_st_value ?? 0} onChange={(e) => setF("icms_st_value", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Base Restituição</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.icms_st_base_restitution ?? 0} onChange={(e) => setF("icms_st_base_restitution", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Valor Restituição</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.icms_st_value_restitution ?? 0} onChange={(e) => setF("icms_st_value_restitution", Number(e.target.value))} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Pedidos</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>#</th><th>Período</th><th>Tipo</th><th>UF</th><th>Doc.</th><th>Item</th><th className="fsc-num">Valor Restit.</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={8} className="fsc-empty">Nenhum pedido cadastrado.</td></tr>}
              {list.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td><td style={{ fontWeight: 600 }}>{r.period}</td><td><span className="fsc-pill fsc-pill-gray">{r.restitution_type}</span></td>
                  <td>{r.uf}</td><td>{r.orig_doc_number || "—"}</td><td>{r.item_code || "—"}</td>
                  <td className="fsc-num">{money(r.icms_st_value_restitution)}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => edit(r)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Pedidos: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
