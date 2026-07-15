import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type SupplierDTO, type SupplierTypeDTO, type EnterpriseLinkDTO,
  type PersonType, type DocumentType, type FreightType, type IcmsContributor, type ViticolaObligation, type TrackingPlatform,
  PERSON_TYPES, DOCUMENT_TYPES, FREIGHT_TYPES, ICMS_CONTRIBUTORS, VITICOLA, TRACKING_PLATFORMS,
  listSuppliers, getSupplier, createSupplier, updateSupplier, blockSupplier, unblockSupplier,
  listSupplierTypes, addAddress, addPhone, addEmail, addDueDate, addContact,
  listEnterprises, addEnterprise, sefazQuery, getPurchasingDefaults,
} from "@/services/supplierService";
import { errMessage, type Obj, parseStr, parseNum } from "@/services/fiscalShared";
import { validateCNPJOrCPF } from "@/utils/validation";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadEstablishments } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Folder = "dados" | "endereco" | "telefones" | "emails" | "vencimentos" | "contatos" | "empresas";
const SYS_USER = "00000000-0000-0000-0000-000000000000";
const MA_RE = /^[A-Z]{2}-\d{5}-\d$/;

const EMPTY: SupplierDTO = {
  name: "", trade_name: "", person_type: "JURIDICA", document_type: "CNPJ", document_number: "",
  state_registration: "", supplier_type_code: undefined, freight_type: "CIF", icms_contributor: "CONTRIBUINTE",
  is_representative: false, is_customer: false, is_mei: false, viticola_obligation: "NUNCA", tracking_platform: "NENHUM",
};
const NO_IE_KINDS = ["TRANSPORTADORA", "TRANSP_REDESP", "REDESPACHO"];
const FOLDERS: Folder[] = ["dados", "endereco", "telefones", "emails", "vencimentos", "contatos", "empresas"];
const FOLDER_LABEL: Record<Folder, string> = { dados: "Dados", endereco: "Endereço", telefones: "Telefones", emails: "E-mails", vencimentos: "Vencimentos", contatos: "Contatos", empresas: "Empresas" };
const isBlocked = (s?: SupplierDTO | null) => (s?.billing_receipt_status ?? "").toUpperCase() === "BLOQUEADO";

export function Vsup0500Page(): JSX.Element {
  const [editMode, setEditMode] = useState(false);
  const [folder, setFolder] = useState<Folder>("dados");
  const [onlyActive, setOnlyActive] = useState(true);
  const [search, setSearch] = useState("");
  const [list, setList] = useState<SupplierDTO[]>([]);
  const [types, setTypes] = useState<SupplierTypeDTO[]>([]);
  const [form, setForm] = useState<SupplierDTO>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [detail, setDetail] = useState<Obj | null>(null);
  const [enterprises, setEnterprises] = useState<EnterpriseLinkDTO[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const [addrForm, setAddrForm] = useState({ zip_code: "", street: "", number: "", complement: "", district: "", city: "", uf: "", country: "BR" });
  const [phoneForm, setPhoneForm] = useState({ number: "", ranking: 1 });
  const [emailForm, setEmailForm] = useState({ email: "", ranking: 1 });
  const [dueForm, setDueForm] = useState({ description: "", ranking: 1, payment_condition_code: "", payment_type: "MENSAL", subsequent_month: false });
  const [contactForm, setContactForm] = useState({ name: "", role: "", department: "", purchase_order_tag: "", observation: "" });
  const [entForm, setEntForm] = useState<{ enterprise_code?: number; financial_account: string; ipi: boolean; default_invoice_type_id: string; purchase_price_table_id: string }>({ enterprise_code: undefined, financial_account: "", ipi: false, default_invoice_type_id: "", purchase_price_table_id: "" });
  const [entCode] = useState("1");

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      const [s, t] = await Promise.all([listSuppliers(onlyActive), listSupplierTypes().catch(() => [] as SupplierTypeDTO[])]);
      setList(s); setTypes(t);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar fornecedores.") }); }
    finally { setBusy(false); }
  }, [onlyActive]);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof SupplierDTO>(k: K, v: SupplierDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  const kindOf = (code?: number) => types.find((t) => t.code === code)?.kind;

  function novo() { setForm(EMPTY); setEditing(false); setDetail(null); setEnterprises([]); setFolder("dados"); setEditMode(true); setFeedback(null); }

  async function abrir(code: number) {
    setBusy(true); setFeedback(null);
    try {
      const raw = await getSupplier(code); setDetail(raw); const parsed = raw as Obj;
      setForm({
        ...EMPTY, code,
        name: parseStr(parsed, "name", "Name"), trade_name: parseStr(parsed, "trade_name", "TradeName"),
        person_type: (parseStr(parsed, "person_type", "PersonType") || "JURIDICA") as PersonType,
        document_type: (parseStr(parsed, "document_type", "DocumentType") || "CNPJ") as DocumentType,
        document_number: parseStr(parsed, "document_number", "DocumentNumber"),
        state_registration: parseStr(parsed, "state_registration", "StateRegistration"),
        municipal_registration: parseStr(parsed, "municipal_registration", "MunicipalRegistration"),
        supplier_type_code: parseNum(parsed, "supplier_type_id", "SupplierTypeID", "supplier_type_code"),
        freight_type: (parseStr(parsed, "freight_type", "FreightType") || "CIF") as FreightType,
        icms_contributor: (parseStr(parsed, "icms_contributor", "IcmsContributor") || "CONTRIBUINTE") as IcmsContributor,
        viticola_obligation: (parseStr(parsed, "viticola_obligation", "ViticolaObligation") || "NUNCA") as ViticolaObligation,
        tracking_platform: (parseStr(parsed, "tracking_platform", "TrackingPlatform") || "NENHUM") as TrackingPlatform,
        gln_code: parseStr(parsed, "gln_code", "GlnCode"),
        agriculture_ministry_registration: parseStr(parsed, "agriculture_ministry_registration", "AgricultureMinistryRegistration"),
        corporate_code: parseNum(parsed, "corporate_code", "CorporateCode"),
        is_representative: !!parseStr(parsed, "is_representative") || (parsed.is_representative as boolean) || false,
        is_customer: (parsed.is_customer as boolean) ?? false, is_mei: (parsed.is_mei as boolean) ?? false,
        homologated: (parsed.homologated as boolean) ?? false,
        billing_receipt_status: (parseStr(parsed, "billing_receipt_status", "BillingReceiptStatus") || undefined) as SupplierDTO["billing_receipt_status"],
        last_sefaz_query: parseStr(parsed, "last_sefaz_query", "LastSefazQuery") || undefined,
      });
      setEditing(true); setFolder("dados"); setEditMode(true);
      setEnterprises(await listEnterprises(code).catch(() => []));
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  function validar(): string | null {
    if (!form.name.trim()) return "Razão social (nome) é obrigatória.";
    if (!form.document_number.trim()) return "Documento é obrigatório.";
    if ((form.document_type === "CNPJ" || form.document_type === "CPF") && !validateCNPJOrCPF(form.document_number)) return "CNPJ/CPF inválido (dígito verificador não confere).";
    const kind = kindOf(form.supplier_type_code);
    if (!NO_IE_KINDS.includes(kind ?? "") && !form.state_registration?.trim()) return "Inscrição Estadual é obrigatória (exceto transportadoras/redespacho).";
    if (form.is_mei && form.person_type === "FISICA") return "MEI não é permitido para Pessoa Física.";
    if (form.agriculture_ministry_registration?.trim() && !MA_RE.test(form.agriculture_ministry_registration.trim())) return "Registro M.A. deve seguir o formato AA-99999-9.";
    return null;
  }
  async function salvar() {
    const err = validar(); if (err) { setFeedback({ type: "error", message: err }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editing) { await updateSupplier(form); setFeedback({ type: "success", message: "Fornecedor atualizado." }); }
      else {
        const created = await createSupplier({ ...form, created_by: SYS_USER });
        if (created?.code) { setFeedback({ type: "success", message: `Fornecedor ${created.code} criado.` }); await abrir(created.code); await reload(); return; }
        setFeedback({ type: "success", message: "Fornecedor criado." });
      }
      await reload();
    } catch (e) { const msg = errMessage(e); setFeedback({ type: "error", message: /409|conflit|duplicad|exist/i.test(msg) ? `Documento já cadastrado. ${msg}` : msg }); }
    finally { setBusy(false); }
  }
  async function toggleBlock(s: SupplierDTO) {
    if (!s.code) return;
    setBusy(true); setFeedback(null);
    try { if (isBlocked(s)) await unblockSupplier(s.code); else await blockSupplier(s.code); setFeedback({ type: "success", message: `Fornecedor ${isBlocked(s) ? "liberado" : "bloqueado"}.` }); await abrir(s.code); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function consultarSefaz() {
    if (!form.code) return;
    setBusy(true); setFeedback(null);
    try { const r = await sefazQuery(form.code); setFeedback({ type: "info", message: `SEFAZ: ${JSON.stringify(r).slice(0, 200)}` }); await abrir(form.code); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function verDefaults() {
    if (!form.code) return;
    setBusy(true); setFeedback(null);
    try { const r = await getPurchasingDefaults(form.code, Number(entCode) || 1); setFeedback({ type: "info", message: `Defaults (emp ${entCode}): ${JSON.stringify(r).slice(0, 240)}` }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function run(fn: () => Promise<void>, ok: string) {
    if (!form.code) { setFeedback({ type: "error", message: "Salve o fornecedor antes de editar as pastas." }); return; }
    setBusy(true); setFeedback(null);
    try { await fn(); setFeedback({ type: "success", message: ok }); await abrir(form.code); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const folderRows = (key: string): Obj[] => {
    if (!detail) return [];
    const want = key.toLowerCase().replace(/_/g, "");
    for (const k of Object.keys(detail)) if (k.toLowerCase().replace(/_/g, "") === want && Array.isArray(detail[k])) return detail[k] as Obj[];
    return [];
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => String(s.code ?? "").includes(q) || s.name.toLowerCase().includes(q) || (s.document_number ?? "").includes(q));
  }, [list, search]);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimento</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Cadastro de Fornecedor</span>
          <span className="erp-crumb-code">VSUP0500</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Dados, endereços, contatos e vínculos por empresa</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className="erp-btn erp-btn-primary" onClick={novo} disabled={busy}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Novo fornecedor
          </button>
        </div>
        {editMode && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-dark" onClick={() => void salvar()} disabled={busy}>{busy && <span className="erp-spin" />}{editing ? "Atualizar" : "Salvar"}</button>
            {form.code && <button className="erp-btn" onClick={() => void consultarSefaz()} disabled={busy}>Consultar SEFAZ</button>}
            {form.code && <button className="erp-btn" onClick={() => void verDefaults()} disabled={busy}>Defaults</button>}
            {form.code && <button className={`erp-btn${isBlocked(form) ? " erp-btn-primary" : " erp-btn-danger"}`} onClick={() => void toggleBlock(form)} disabled={busy}>{isBlocked(form) ? "Liberar" : "Bloquear"}</button>}
          </div>
        )}
        <div className="erp-tgroup">
          <label className="erp-check"><input type="checkbox" checked={!onlyActive} onChange={(e) => setOnlyActive(!e.target.checked)} /><span>Incluir inativos</span></label>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VSUP0500 — Cadastro de Fornecedor" filename="vsup0500" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Fornecedores</span><span className="erp-count">{visible.length}</span>
              <div className="erp-panel-head-spacer" />
              <input className="erp-search" placeholder="Nome / doc…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="erp-list">
              {visible.length === 0 && <div className="erp-list-empty">Nenhum fornecedor.</div>}
              {visible.map((s) => (
                <div key={s.code} className={`erp-list-row${editMode && form.code === s.code ? " sel" : ""}`} onClick={() => s.code && void abrir(s.code)}>
                  <span className="erp-list-code">#{s.code}</span>
                  <span className="erp-list-sub">{s.name}</span>
                  <div className="erp-list-meta">
                    {isBlocked(s) ? <span className="erp-badge err">Bloqueado</span> : <span className="erp-badge ok">Liberado</span>}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--v-text-3)" }}>{s.document_number}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            {!editMode ? (
              <div className="erp-detail-empty">
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M4 20v-1a5 5 0 015-5h6a5 5 0 015 5v1" stroke="currentColor" strokeWidth="1.4"/><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.4"/></svg>
                <div className="erp-detail-empty-title">Nenhum fornecedor selecionado</div>
                <div className="erp-detail-empty-sub">Selecione um fornecedor à esquerda ou clique em <strong>Novo fornecedor</strong>.</div>
              </div>
            ) : (
              <>
                <div className="erp-tabs">
                  {FOLDERS.map((f) => <button key={f} className={`erp-tab${folder === f ? " active" : ""}`} onClick={() => setFolder(f)} disabled={f !== "dados" && !form.code}>{FOLDER_LABEL[f]}</button>)}
                </div>
                <div className="erp-detail-body">
                  {folder === "dados" && (
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">{editing ? `Fornecedor #${form.code}` : "Novo fornecedor"}{form.code ? (isBlocked(form) ? <span className="erp-badge err" style={{ marginLeft: 6 }}>Bloqueado</span> : <span className="erp-badge ok" style={{ marginLeft: 6 }}>Liberado</span>) : null}</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c6"><label className="erp-label erp-req">Razão social</label><input className="erp-input" value={form.name} onChange={(e) => setF("name", e.target.value)} /></div>
                        <div className="erp-field erp-c4"><label className="erp-label">Fantasia</label><input className="erp-input" value={form.trade_name ?? ""} onChange={(e) => setF("trade_name", e.target.value)} /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Pessoa</label><select className="erp-input" value={form.person_type} onChange={(e) => setF("person_type", e.target.value as PersonType)}>{PERSON_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Tipo doc.</label><select className="erp-input" value={form.document_type} onChange={(e) => setF("document_type", e.target.value as DocumentType)}>{DOCUMENT_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
                        <div className="erp-field erp-c3"><label className="erp-label erp-req">CNPJ/CPF</label><input className="erp-input" value={form.document_number} onChange={(e) => setF("document_number", e.target.value)} />
                          {form.document_number.trim() && (form.document_type === "CNPJ" || form.document_type === "CPF") && <span style={{ fontSize: 11, marginTop: 3, color: validateCNPJOrCPF(form.document_number) ? "var(--v-ok)" : "var(--v-err)" }}>{validateCNPJOrCPF(form.document_number) ? "✓ válido" : "✗ inválido"}</span>}</div>
                        <div className="erp-field erp-c3"><label className="erp-label">Inscr. Estadual</label><input className="erp-input" value={form.state_registration ?? ""} onChange={(e) => setF("state_registration", e.target.value)} /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Insc. Municipal</label><input className="erp-input" value={form.municipal_registration ?? ""} onChange={(e) => setF("municipal_registration", e.target.value)} /></div>
                        <div className="erp-field erp-c4"><label className="erp-label">Tipo de fornecedor</label><select className="erp-input" value={form.supplier_type_code ?? ""} onChange={(e) => setF("supplier_type_code", e.target.value ? Number(e.target.value) : undefined)}><option value="">—</option>{types.map((t) => <option key={t.code} value={t.code}>{t.description} ({t.kind})</option>)}</select></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Tipo frete</label><select className="erp-input" value={form.freight_type} onChange={(e) => setF("freight_type", e.target.value as FreightType)}>{FREIGHT_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Contrib. ICMS</label><select className="erp-input" value={form.icms_contributor} onChange={(e) => setF("icms_contributor", e.target.value as IcmsContributor)}>{ICMS_CONTRIBUTORS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Obr. vitícola</label><select className="erp-input" value={form.viticola_obligation} onChange={(e) => setF("viticola_obligation", e.target.value as ViticolaObligation)}>{VITICOLA.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Plataforma rastreio</label><select className="erp-input" value={form.tracking_platform} onChange={(e) => setF("tracking_platform", e.target.value as TrackingPlatform)}>{TRACKING_PLATFORMS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Código GLN</label><input className="erp-input" value={form.gln_code ?? ""} onChange={(e) => setF("gln_code", e.target.value)} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Registro M.A. (AA-99999-9)</label><input className="erp-input" value={form.agriculture_ministry_registration ?? ""} onChange={(e) => setF("agriculture_ministry_registration", e.target.value.toUpperCase())} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Código pai</label><input className="erp-input num" type="number" value={form.corporate_code ?? ""} onChange={(e) => setF("corporate_code", e.target.value ? Number(e.target.value) : undefined)} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Flags</label>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                            <label className="erp-check"><input type="checkbox" checked={!!form.is_representative} onChange={(e) => setF("is_representative", e.target.checked)} /><span>Representante</span></label>
                            <label className="erp-check"><input type="checkbox" checked={!!form.is_customer} onChange={(e) => setF("is_customer", e.target.checked)} /><span>Cliente</span></label>
                            <label className="erp-check"><input type="checkbox" checked={!!form.is_mei} onChange={(e) => setF("is_mei", e.target.checked)} /><span>MEI</span></label>
                            <label className="erp-check"><input type="checkbox" checked={!!form.homologated} onChange={(e) => setF("homologated", e.target.checked)} /><span>Homologado</span></label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {folder === "endereco" && (<>
                    <div className="erp-fieldset"><div className="erp-fieldset-head">Novo endereço</div><div className="erp-fieldset-body">
                      <div className="erp-field erp-c2"><label className="erp-label">CEP</label><input className="erp-input" value={addrForm.zip_code} onChange={(e) => setAddrForm((p) => ({ ...p, zip_code: e.target.value }))} /></div>
                      <div className="erp-field erp-c5"><label className="erp-label">Logradouro</label><input className="erp-input" value={addrForm.street} onChange={(e) => setAddrForm((p) => ({ ...p, street: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Número</label><input className="erp-input" value={addrForm.number} onChange={(e) => setAddrForm((p) => ({ ...p, number: e.target.value }))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Complemento</label><input className="erp-input" value={addrForm.complement} onChange={(e) => setAddrForm((p) => ({ ...p, complement: e.target.value }))} /></div>
                      <div className="erp-field erp-c4"><label className="erp-label">Bairro</label><input className="erp-input" value={addrForm.district} onChange={(e) => setAddrForm((p) => ({ ...p, district: e.target.value }))} /></div>
                      <div className="erp-field erp-c4"><label className="erp-label">Cidade</label><input className="erp-input" value={addrForm.city} onChange={(e) => setAddrForm((p) => ({ ...p, city: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">UF</label><input className="erp-input" maxLength={2} value={addrForm.uf} onChange={(e) => setAddrForm((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">País</label><input className="erp-input" value={addrForm.country} onChange={(e) => setAddrForm((p) => ({ ...p, country: e.target.value }))} /></div>
                      <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={() => void run(() => addAddress({ supplier_code: form.code!, ...addrForm }), "Endereço salvo.")} disabled={busy}>Salvar endereço</button></div>
                    </div></div>
                    <div className="erp-grid-wrap"><table className="erp-grid"><thead><tr><th>Logradouro</th><th>Cidade</th><th>UF</th></tr></thead><tbody>
                      {folderRows("addresses").length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhum endereço.</td></tr>}
                      {folderRows("addresses").map((a, i) => <tr key={i}><td>{parseStr(a, "street", "Street")}, {parseStr(a, "number", "Number")}</td><td>{parseStr(a, "city", "City")}</td><td>{parseStr(a, "uf", "UF")}</td></tr>)}
                    </tbody></table></div>
                  </>)}

                  {folder === "telefones" && (<>
                    <div className="erp-fieldset"><div className="erp-fieldset-head">Novo telefone</div><div className="erp-fieldset-body">
                      <div className="erp-field erp-c8"><label className="erp-label">Telefone</label><input className="erp-input" value={phoneForm.number} onChange={(e) => setPhoneForm((p) => ({ ...p, number: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Ranking</label><input className="erp-input num" type="number" value={phoneForm.ranking} onChange={(e) => setPhoneForm((p) => ({ ...p, ranking: Number(e.target.value) }))} /></div>
                      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void run(() => addPhone({ supplier_code: form.code!, ...phoneForm }), "Telefone salvo.")} disabled={busy}>+ Telefone</button></div>
                    </div></div>
                    <div className="erp-grid-wrap"><table className="erp-grid"><thead><tr><th>Telefone</th><th className="num">Ranking</th></tr></thead><tbody>
                      {folderRows("phones").length === 0 && <tr><td colSpan={2} className="erp-grid-empty">Nenhum telefone.</td></tr>}
                      {folderRows("phones").map((p, i) => <tr key={i}><td>{parseStr(p, "number", "Number")}</td><td className="num">{parseNum(p, "ranking", "Ranking") ?? "—"}</td></tr>)}
                    </tbody></table></div>
                  </>)}

                  {folder === "emails" && (<>
                    <div className="erp-fieldset"><div className="erp-fieldset-head">Novo e-mail</div><div className="erp-fieldset-body">
                      <div className="erp-field erp-c8"><label className="erp-label">E-mail</label><input className="erp-input" value={emailForm.email} onChange={(e) => setEmailForm((p) => ({ ...p, email: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Ranking</label><input className="erp-input num" type="number" value={emailForm.ranking} onChange={(e) => setEmailForm((p) => ({ ...p, ranking: Number(e.target.value) }))} /></div>
                      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void run(() => addEmail({ supplier_code: form.code!, ...emailForm }), "E-mail salvo.")} disabled={busy}>+ E-mail</button></div>
                    </div></div>
                    <div className="erp-grid-wrap"><table className="erp-grid"><thead><tr><th>E-mail</th><th className="num">Ranking</th></tr></thead><tbody>
                      {folderRows("emails").length === 0 && <tr><td colSpan={2} className="erp-grid-empty">Nenhum e-mail.</td></tr>}
                      {folderRows("emails").map((m, i) => <tr key={i}><td>{parseStr(m, "email", "Email")}</td><td className="num">{parseNum(m, "ranking", "Ranking") ?? "—"}</td></tr>)}
                    </tbody></table></div>
                  </>)}

                  {folder === "vencimentos" && (<>
                    <div className="erp-fieldset"><div className="erp-fieldset-head">Novo vencimento</div><div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label">Descrição</label><input className="erp-input" value={dueForm.description} onChange={(e) => setDueForm((p) => ({ ...p, description: e.target.value }))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Cond. pagto (cód.)</label><input className="erp-input num" type="number" value={dueForm.payment_condition_code} onChange={(e) => setDueForm((p) => ({ ...p, payment_condition_code: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Tipo pagto</label><select className="erp-input" value={dueForm.payment_type} onChange={(e) => setDueForm((p) => ({ ...p, payment_type: e.target.value }))}><option value="MENSAL">MENSAL</option><option value="SEMANAL">SEMANAL</option></select></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Mês subsequente</label><label className="erp-check"><input type="checkbox" checked={dueForm.subsequent_month} onChange={(e) => setDueForm((p) => ({ ...p, subsequent_month: e.target.checked }))} /><span>Sim</span></label></div>
                      <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={() => void run(() => addDueDate({ supplier_code: form.code!, description: dueForm.description, ranking: dueForm.ranking, payment_condition_code: dueForm.payment_condition_code ? Number(dueForm.payment_condition_code) : undefined, payment_type: dueForm.payment_type, subsequent_month: dueForm.subsequent_month }), "Vencimento salvo.")} disabled={busy}>+ Vencimento</button></div>
                    </div></div>
                    <div className="erp-grid-wrap"><table className="erp-grid"><thead><tr><th>Descrição</th><th>Tipo</th><th>Subseq.</th></tr></thead><tbody>
                      {folderRows("due_dates").length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhum vencimento.</td></tr>}
                      {folderRows("due_dates").map((d, i) => <tr key={i}><td>{parseStr(d, "description", "Description")}</td><td>{parseStr(d, "payment_type", "PaymentType")}</td><td>{(d.subsequent_month ?? d.SubsequentMonth) ? "Sim" : "Não"}</td></tr>)}
                    </tbody></table></div>
                  </>)}

                  {folder === "contatos" && (<>
                    <div className="erp-fieldset"><div className="erp-fieldset-head">Novo contato</div><div className="erp-fieldset-body">
                      <div className="erp-field erp-c3"><label className="erp-label">Nome</label><input className="erp-input" value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Cargo</label><input className="erp-input" value={contactForm.role} onChange={(e) => setContactForm((p) => ({ ...p, role: e.target.value }))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Departamento</label><input className="erp-input" value={contactForm.department} onChange={(e) => setContactForm((p) => ({ ...p, department: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Tag do PC</label><input className="erp-input" value={contactForm.purchase_order_tag} onChange={(e) => setContactForm((p) => ({ ...p, purchase_order_tag: e.target.value }))} /></div>
                      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void run(() => addContact({ supplier_code: form.code!, ...contactForm }), "Contato salvo.")} disabled={busy}>+ Contato</button></div>
                    </div></div>
                    <div className="erp-grid-wrap"><table className="erp-grid"><thead><tr><th>Nome</th><th>Cargo</th><th>Depto</th><th>Tag PC</th></tr></thead><tbody>
                      {folderRows("contacts").length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum contato.</td></tr>}
                      {folderRows("contacts").map((c, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{parseStr(c, "name", "Name")}</td><td>{parseStr(c, "role", "Role")}</td><td>{parseStr(c, "department", "Department")}</td><td>{parseStr(c, "purchase_order_tag", "PurchaseOrderTag")}</td></tr>)}
                    </tbody></table></div>
                  </>)}

                  {folder === "empresas" && (<>
                    <div className="erp-fieldset"><div className="erp-fieldset-head">Vincular empresa</div><div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label">Estabelecimento</label><LookupField value={entForm.enterprise_code} loader={loadEstablishments} entityLabel="estabelecimento" placeholder="Selecionar" onChange={(c) => setEntForm((p) => ({ ...p, enterprise_code: c }))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Conta financeira</label><input className="erp-input num" type="number" value={entForm.financial_account} onChange={(e) => setEntForm((p) => ({ ...p, financial_account: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Tipo NF default</label><input className="erp-input num" type="number" value={entForm.default_invoice_type_id} onChange={(e) => setEntForm((p) => ({ ...p, default_invoice_type_id: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Tab. preço compra</label><input className="erp-input num" type="number" value={entForm.purchase_price_table_id} onChange={(e) => setEntForm((p) => ({ ...p, purchase_price_table_id: e.target.value }))} /></div>
                      <div className="erp-field erp-c1"><label className="erp-label">IPI</label><label className="erp-check"><input type="checkbox" checked={entForm.ipi} onChange={(e) => setEntForm((p) => ({ ...p, ipi: e.target.checked }))} /></label></div>
                      <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={() => void run(async () => { await addEnterprise({ supplier_code: form.code!, enterprise_code: Number(entForm.enterprise_code), financial_account: entForm.financial_account ? Number(entForm.financial_account) : undefined, ipi: entForm.ipi, default_invoice_type_id: entForm.default_invoice_type_id ? Number(entForm.default_invoice_type_id) : undefined, purchase_price_table_id: entForm.purchase_price_table_id ? Number(entForm.purchase_price_table_id) : undefined }); setEnterprises(await listEnterprises(form.code!)); }, "Vínculo de empresa salvo.")} disabled={busy}>+ Vincular empresa</button></div>
                    </div></div>
                    <div className="erp-grid-wrap"><table className="erp-grid"><thead><tr><th className="num">Empresa</th><th className="num">Conta fin.</th><th>IPI</th><th className="num">Tipo NF</th><th className="num">Tab. preço</th></tr></thead><tbody>
                      {enterprises.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum vínculo.</td></tr>}
                      {enterprises.map((e2, i) => <tr key={e2.id ?? i}><td className="num" style={{ fontWeight: 600 }}>{e2.enterprise_code}</td><td className="num">{e2.financial_account ?? "—"}</td><td>{e2.ipi ? "Sim" : "Não"}</td><td className="num">{e2.default_invoice_type_id ?? "—"}</td><td className="num">{e2.purchase_price_table_id ?? "—"}</td></tr>)}
                    </tbody></table></div>
                  </>)}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Fornecedores: <strong>{list.length}</strong></div>
        {form.code ? <div className="erp-status-item">Editando: <strong>#{form.code}</strong></div> : null}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
