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
    <div className="erp-field erp-c4"><label className="erp-label">{label}</label>
      <label className="erp-check"><input type="checkbox" checked={!!params[k]} onChange={(e) => setP(k, e.target.checked as never)} /><span>{params[k] ? "Sim" : "Não"}</span></label></div>
  );
  const numField = (label: string, k: keyof SupplierParametersDTO) => (
    <div className="erp-field erp-c4"><label className="erp-label">{label}</label>
      <input className="erp-input num" type="number" value={(params[k] as number | undefined) ?? ""} onChange={(e) => setP(k, (e.target.value ? Number(e.target.value) : undefined) as never)} /></div>
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimento</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Apoio de Fornecedores</span>
          <span className="erp-crumb-code">VSUP0510</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Tipos, contatos e parâmetros de compras</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Dados</span>
          <button className="erp-btn erp-btn-dark" onClick={() => void reload()} disabled={busy}>{busy && <span className="erp-spin" />}Atualizar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VSUP0510 — Apoio de Fornecedores" filename="vsup0510" disabled={busy} /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-tabs">
          <button className={`erp-tab${tab === "tipos" ? " active" : ""}`} onClick={() => setTab("tipos")}>Tipos de fornecedor</button>
          <button className={`erp-tab${tab === "contatos" ? " active" : ""}`} onClick={() => setTab("contatos")}>Tipos de contato</button>
          <button className={`erp-tab${tab === "parametros" ? " active" : ""}`} onClick={() => setTab("parametros")}>Parâmetros</button>
        </div>
        <div className="erp-detail-body">
          {tab === "tipos" && (<>
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">{typeEdit !== null ? `Editando tipo #${typeEdit}` : "Novo tipo de fornecedor"}</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c7"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={typeForm.description} onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Kind</label><select className="erp-input" value={typeForm.kind} onChange={(e) => setTypeForm((p) => ({ ...p, kind: e.target.value as SupplierKind }))}>{SUPPLIER_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void salvarTipo()} disabled={busy}>{typeEdit !== null ? "Atualizar" : "Salvar"}</button></div>
                <div className="erp-field erp-c12"><span style={{ fontSize: 11.5, color: "var(--v-text-3)" }}>kind TRANSPORTADORA/TRANSP_REDESP/REDESPACHO dispensa a Inscrição Estadual do fornecedor.</span></div>
              </div>
            </div>
            <div className="erp-grid-wrap">
              <table className="erp-grid">
                <thead><tr><th className="num">Código</th><th>Descrição</th><th>Kind</th><th style={{ width: 90 }}></th></tr></thead>
                <tbody>
                  {types.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum tipo.</td></tr>}
                  {types.map((t) => (
                    <tr key={t.code}><td className="num" style={{ fontWeight: 600 }}>{t.code}</td><td>{t.description}</td><td><span className="erp-badge draft">{t.kind}</span></td>
                      <td><button className="erp-btn erp-btn-sm" onClick={() => { setTypeForm({ ...t }); setTypeEdit(t.code ?? null); }}>Editar</button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>)}

          {tab === "contatos" && (<>
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Novo tipo de contato</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c9"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={contactForm.description} onChange={(e) => setContactForm({ description: e.target.value })} /></div>
                <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void salvarContato()} disabled={busy}>Salvar</button></div>
              </div>
            </div>
            <div className="erp-grid-wrap">
              <table className="erp-grid">
                <thead><tr><th className="num">Código</th><th>Descrição</th></tr></thead>
                <tbody>
                  {contacts.length === 0 && <tr><td colSpan={2} className="erp-grid-empty">Nenhum tipo de contato.</td></tr>}
                  {contacts.map((c) => <tr key={c.code}><td className="num" style={{ fontWeight: 600 }}>{c.code}</td><td>{c.description}</td></tr>)}
                </tbody>
              </table>
            </div>
          </>)}

          {tab === "parametros" && (
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Parâmetros de compras por empresa</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label">Empresa</label><input className="erp-input num" type="number" value={entCode} onChange={(e) => setEntCode(e.target.value)} /></div>
                <div className="erp-field erp-c6" style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                  <button className="erp-btn erp-btn-dark" onClick={() => void carregarParams()} disabled={busy}>Carregar</button>
                  <button className="erp-btn erp-btn-primary" onClick={() => void salvarParams()} disabled={busy}>Salvar parâmetros</button>
                </div>
                <div className="erp-field erp-c3" />
                {numField("1 · Conta financeira default", "default_financial_account")}
                {toggle("2 · Cód. item único por fornecedor", "unique_item_code_per_supplier")}
                {toggle("3 · Obriga conta financeira", "requires_financial_account")}
                {numField("4 · Tipo fornecedor p/ comprar", "purchase_supplier_type_id")}
                {toggle("5 · Obs → pedido de compra", "copy_obs_to_purchase_order")}
                {toggle("6 · Obs → NF de entrada", "copy_obs_to_entry_invoice")}
                {toggle("7 · Homologação default", "homologation_default")}
                {toggle("8 · Usa UM de estoque", "use_stock_uom")}
                {numField("9 · Fornecedor genérico (NFe)", "generic_supplier_code")}
                <div className="erp-field erp-c4"><label className="erp-label">10 · Data base p/ vencimentos</label>
                  <select className="erp-input" value={params.default_due_base_date ?? ""} onChange={(e) => setP("default_due_base_date", e.target.value || undefined)}>
                    <option value="">—</option><option value="EMISSAO">EMISSAO</option><option value="ENTRADA">ENTRADA</option><option value="DIGITACAO">DIGITACAO</option></select></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Tipos: <strong>{types.length}</strong></div>
        <div className="erp-status-item">Contatos: <strong>{contacts.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
