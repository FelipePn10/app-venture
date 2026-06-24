import { useState, useCallback, useEffect } from "react";
import {
  type SupplierTypeDTO, type ContactTypeDTO, type SupplierParametersDTO, type SupplierKind,
  SUPPLIER_KINDS,
  listSupplierTypes, createSupplierType, updateSupplierType,
  listContactTypes, createContactType,
  getParameters, updateParameters,
} from "@/services/supplierService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "tipos" | "contatos" | "parametros";

const EMPTY_TYPE: SupplierTypeDTO = { description: "", kind: "NORMAL" };
const EMPTY_CONTACT: ContactTypeDTO = { description: "" };
const emptyParams = (ec: number): SupplierParametersDTO => ({ enterprise_code: ec });

export function Vsup0510Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("tipos");
  const [types, setTypes] = useState<SupplierTypeDTO[]>([]);
  const [typeForm, setTypeForm] = useState<SupplierTypeDTO>(EMPTY_TYPE);
  const [typeEdit, setTypeEdit] = useState<number | null>(null);
  const [contacts, setContacts] = useState<ContactTypeDTO[]>([]);
  const [contactForm, setContactForm] = useState<ContactTypeDTO>(EMPTY_CONTACT);
  const [entCode, setEntCode] = useState("1");
  const [params, setParams] = useState<SupplierParametersDTO>(emptyParams(1));
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      const [t, c] = await Promise.all([listSupplierTypes().catch(() => [] as SupplierTypeDTO[]), listContactTypes().catch(() => [] as ContactTypeDTO[])]);
      setTypes(t); setContacts(c);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function salvarTipo() {
    if (!typeForm.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (typeEdit !== null) { await updateSupplierType({ ...typeForm, code: typeEdit }); setFeedback({ type: "success", message: "Tipo atualizado." }); }
      else { await createSupplierType(typeForm); setFeedback({ type: "success", message: "Tipo criado." }); }
      setTypeForm(EMPTY_TYPE); setTypeEdit(null); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function salvarContato() {
    if (!contactForm.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try { await createContactType(contactForm); setContactForm(EMPTY_CONTACT); setFeedback({ type: "success", message: "Tipo de contato criado." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function carregarParams() {
    const ec = Number(entCode); if (!ec) { setFeedback({ type: "error", message: "Informe a empresa." }); return; }
    setBusy(true); setFeedback(null);
    try { setParams(await getParameters(ec)); setFeedback({ type: "info", message: `Parâmetros da empresa ${ec} carregados.` }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Parâmetros não encontrados.") }); setParams(emptyParams(ec)); } finally { setBusy(false); }
  }
  const setP = <K extends keyof SupplierParametersDTO>(k: K, v: SupplierParametersDTO[K]) => setParams((p) => ({ ...p, [k]: v }));
  async function salvarParams() {
    setBusy(true); setFeedback(null);
    try { await updateParameters({ ...params, enterprise_code: Number(entCode) }); setFeedback({ type: "success", message: "Parâmetros salvos." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const toggle = (label: string, k: keyof SupplierParametersDTO) => (
    <div className="fsc-field fsc-col-4"><label className="fsc-label">{label}</label>
      <div className="fsc-toggle-row">
        <label className="fsc-toggle"><input type="checkbox" checked={!!params[k]} onChange={(e) => setP(k, e.target.checked as never)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label>
        <span className="fsc-toggle-label">{params[k] ? "Sim" : "Não"}</span></div></div>
  );
  const numField = (label: string, k: keyof SupplierParametersDTO) => (
    <div className="fsc-field fsc-col-4"><label className="fsc-label">{label}</label>
      <input className="fsc-input fsc-input-right" type="number" value={(params[k] as number | undefined) ?? ""} onChange={(e) => setP(k, (e.target.value ? Number(e.target.value) : undefined) as never)} /></div>
  );

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VSUP0510 — Apoio de Fornecedores</span>
      </div></header>

      <div className="fsc-actionbar"><div className="fsc-action-group"><span className="fsc-action-label">Recarregar</span>
        <button className="fsc-btn fsc-btn-ghost" onClick={() => void reload()} disabled={busy}>Atualizar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VSUP0510 — Apoio de Fornecedores" filename="vsup0510" disabled={busy} /></div></div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-card">
          <div className="fsc-tabs">
            <button className={`fsc-tab ${tab === "tipos" ? "active" : ""}`} onClick={() => setTab("tipos")}>Tipos de Fornecedor</button>
            <button className={`fsc-tab ${tab === "contatos" ? "active" : ""}`} onClick={() => setTab("contatos")}>Tipos de Contato</button>
            <button className={`fsc-tab ${tab === "parametros" ? "active" : ""}`} onClick={() => setTab("parametros")}>Parâmetros</button>
          </div>

          {tab === "tipos" && (
            <div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Descrição</label><input className="fsc-input" value={typeForm.description} onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-4"><label className="fsc-label">Tipo (kind)</label>
                  <select className="fsc-select" value={typeForm.kind} onChange={(e) => setTypeForm((p) => ({ ...p, kind: e.target.value as SupplierKind }))}>
                    {SUPPLIER_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void salvarTipo()} disabled={busy}>{typeEdit !== null ? "Atualizar" : "Salvar"}</button></div>
              </div>
              <span className="fsc-field-hint">kind TRANSPORTADORA/TRANSP_REDESP/REDESPACHO dispensa a Inscrição Estadual do fornecedor.</span>
              <div className="fsc-results-wrap" style={{ marginTop: 12 }}>
                <table className="fsc-table">
                  <thead><tr><th>Código</th><th>Descrição</th><th>Kind</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                  <tbody>
                    {types.length === 0 && <tr><td colSpan={4} className="fsc-empty">Nenhum tipo.</td></tr>}
                    {types.map((t) => (
                      <tr key={t.code}><td style={{ fontWeight: 600 }}>{t.code}</td><td>{t.description}</td><td><span className="fsc-pill fsc-pill-gray">{t.kind}</span></td>
                        <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => { setTypeForm({ ...t }); setTypeEdit(t.code ?? null); }}>Editar</button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "contatos" && (
            <div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-8"><label className="fsc-label fsc-label-req">Descrição</label><input className="fsc-input" value={contactForm.description} onChange={(e) => setContactForm({ description: e.target.value })} /></div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void salvarContato()} disabled={busy}>Salvar</button></div>
              </div>
              <div className="fsc-results-wrap" style={{ marginTop: 12 }}>
                <table className="fsc-table">
                  <thead><tr><th>Código</th><th>Descrição</th></tr></thead>
                  <tbody>
                    {contacts.length === 0 && <tr><td colSpan={2} className="fsc-empty">Nenhum tipo de contato.</td></tr>}
                    {contacts.map((c) => <tr key={c.code}><td style={{ fontWeight: 600 }}>{c.code}</td><td>{c.description}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "parametros" && (
            <div className="fsc-card-body">
              <div className="fsc-results-bar">
                <div className="fsc-results-bar-left"><span className="fsc-results-bar-label">Empresa</span></div>
                <input className="fsc-input" style={{ width: 80, height: 30 }} type="number" value={entCode} onChange={(e) => setEntCode(e.target.value)} />
                <button className="fsc-btn fsc-btn-ghost" onClick={() => void carregarParams()} disabled={busy}>Carregar</button>
                <button className="fsc-btn fsc-btn-primary" onClick={() => void salvarParams()} disabled={busy}>Salvar</button>
              </div>
              <div className="fsc-grid" style={{ marginTop: 12 }}>
                {numField("1 · Conta financeira default", "default_financial_account")}
                {toggle("2 · Cód. item único por fornecedor", "unique_item_code_per_supplier")}
                {toggle("3 · Obriga conta financeira", "requires_financial_account")}
                {numField("4 · Tipo fornecedor p/ comprar", "purchase_supplier_type_id")}
                {toggle("5 · Obs → pedido de compra", "copy_obs_to_purchase_order")}
                {toggle("6 · Obs → NF de entrada", "copy_obs_to_entry_invoice")}
                {toggle("7 · Homologação default", "homologation_default")}
                {toggle("8 · Usa UM de estoque", "use_stock_uom")}
                {numField("9 · Fornecedor genérico (NFe)", "generic_supplier_code")}
                <div className="fsc-field fsc-col-4"><label className="fsc-label">10 · Data base p/ vencimentos</label>
                  <select className="fsc-select" value={params.default_due_base_date ?? ""} onChange={(e) => setP("default_due_base_date", e.target.value || undefined)}>
                    <option value="">—</option><option value="EMISSAO">EMISSAO</option><option value="ENTRADA">ENTRADA</option><option value="DIGITACAO">DIGITACAO</option></select></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Tipos: <strong>{types.length}</strong></div><div className="fsc-footer-stat">Contatos: <strong>{contacts.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
