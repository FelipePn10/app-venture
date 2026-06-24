import { useState, useCallback, useEffect } from "react";
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

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Mode = "list" | "edit";
type Folder = "dados" | "endereco" | "telefones" | "emails" | "vencimentos" | "contatos" | "empresas";
const SYS_USER = "00000000-0000-0000-0000-000000000000";
const MA_RE = /^[A-Z]{2}-\d{5}-\d$/;

const EMPTY: SupplierDTO = {
  name: "", trade_name: "", person_type: "JURIDICA", document_type: "CNPJ", document_number: "",
  state_registration: "", supplier_type_code: undefined, freight_type: "CIF", icms_contributor: "CONTRIBUINTE",
  is_representative: false, is_customer: false, is_mei: false, viticola_obligation: "NUNCA", tracking_platform: "NENHUM",
};

const NO_IE_KINDS = ["TRANSPORTADORA", "TRANSP_REDESP", "REDESPACHO"];

export function Vsup0500Page(): JSX.Element {
  const [mode, setMode] = useState<Mode>("list");
  const [folder, setFolder] = useState<Folder>("dados");
  const [onlyActive, setOnlyActive] = useState(true);
  const [list, setList] = useState<SupplierDTO[]>([]);
  const [types, setTypes] = useState<SupplierTypeDTO[]>([]);
  const [form, setForm] = useState<SupplierDTO>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [detail, setDetail] = useState<Obj | null>(null);
  const [enterprises, setEnterprises] = useState<EnterpriseLinkDTO[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  // sub-forms das pastas
  const [addrForm, setAddrForm] = useState({ zip_code: "", street: "", number: "", complement: "", district: "", city: "", uf: "", country: "BR" });
  const [phoneForm, setPhoneForm] = useState({ number: "", ranking: 1 });
  const [emailForm, setEmailForm] = useState({ email: "", ranking: 1 });
  const [dueForm, setDueForm] = useState({ description: "", ranking: 1, payment_condition_code: "", payment_type: "MENSAL", subsequent_month: false });
  const [contactForm, setContactForm] = useState({ name: "", role: "", department: "", purchase_order_tag: "", observation: "" });
  const [entForm, setEntForm] = useState({ enterprise_code: "", financial_account: "", ipi: false, default_invoice_type_id: "", purchase_price_table_id: "" });
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

  function novo() { setForm(EMPTY); setEditing(false); setDetail(null); setEnterprises([]); setFolder("dados"); setMode("edit"); setFeedback(null); }

  async function abrir(code: number) {
    setBusy(true); setFeedback(null);
    try {
      const raw = await getSupplier(code);
      setDetail(raw);
      const parsed = raw as Obj;
      setForm({
        ...EMPTY,
        code,
        name: parseStr(parsed, "name", "Name"),
        trade_name: parseStr(parsed, "trade_name", "TradeName"),
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
        is_customer: (parsed.is_customer as boolean) ?? false,
        is_mei: (parsed.is_mei as boolean) ?? false,
        homologated: (parsed.homologated as boolean) ?? false,
        billing_receipt_status: (parseStr(parsed, "billing_receipt_status", "BillingReceiptStatus") || undefined) as SupplierDTO["billing_receipt_status"],
        last_sefaz_query: parseStr(parsed, "last_sefaz_query", "LastSefazQuery") || undefined,
      });
      setEditing(true); setFolder("dados"); setMode("edit");
      setEnterprises(await listEnterprises(code).catch(() => []));
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  function validar(): string | null {
    if (!form.name.trim()) return "Razão social (nome) é obrigatória.";
    if (!form.document_number.trim()) return "Documento é obrigatório.";
    if ((form.document_type === "CNPJ" || form.document_type === "CPF") && !validateCNPJOrCPF(form.document_number))
      return "CNPJ/CPF inválido (dígito verificador não confere).";
    const kind = kindOf(form.supplier_type_code);
    if (!NO_IE_KINDS.includes(kind ?? "") && !form.state_registration?.trim())
      return "Inscrição Estadual é obrigatória (exceto transportadoras/redespacho).";
    if (form.is_mei && form.person_type === "FISICA") return "MEI não é permitido para Pessoa Física.";
    if (form.agriculture_ministry_registration?.trim() && !MA_RE.test(form.agriculture_ministry_registration.trim()))
      return "Registro M.A. deve seguir o formato AA-99999-9.";
    return null;
  }

  async function salvar() {
    const err = validar();
    if (err) { setFeedback({ type: "error", message: err }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editing) { await updateSupplier(form); setFeedback({ type: "success", message: "Fornecedor atualizado." }); }
      else {
        const created = await createSupplier({ ...form, created_by: SYS_USER });
        if (created?.code) { setFeedback({ type: "success", message: `Fornecedor ${created.code} criado.` }); await abrir(created.code); await reload(); return; }
        setFeedback({ type: "success", message: "Fornecedor criado." });
      }
      await reload();
    } catch (e) {
      const msg = errMessage(e);
      setFeedback({ type: "error", message: /409|conflit|duplicad|exist/i.test(msg) ? `Documento já cadastrado. ${msg}` : msg });
    } finally { setBusy(false); }
  }

  async function toggleBlock(s: SupplierDTO) {
    if (!s.code) return;
    const blocked = (s.billing_receipt_status ?? "").toUpperCase() === "BLOQUEADO";
    setBusy(true); setFeedback(null);
    try { if (blocked) await unblockSupplier(s.code); else await blockSupplier(s.code); setFeedback({ type: "success", message: `Fornecedor ${blocked ? "liberado" : "bloqueado"}.` }); if (mode === "edit") await abrir(s.code); else await reload(); }
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

  // pastas — add helpers
  async function run(fn: () => Promise<void>, ok: string) {
    if (!form.code) { setFeedback({ type: "error", message: "Salve o fornecedor antes de editar as pastas." }); return; }
    setBusy(true); setFeedback(null);
    try { await fn(); setFeedback({ type: "success", message: ok }); await abrir(form.code); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const folderRows = (key: string): Obj[] => {
    if (!detail) return [];
    const want = key.toLowerCase().replace(/_/g, "");
    for (const k of Object.keys(detail)) {
      if (k.toLowerCase().replace(/_/g, "") === want && Array.isArray(detail[k])) return detail[k] as Obj[];
    }
    return [];
  };

  const folders: Folder[] = ["dados", "endereco", "telefones", "emails", "vencimentos", "contatos", "empresas"];
  const folderLabel: Record<Folder, string> = { dados: "Dados", endereco: "Endereço", telefones: "Telefones", emails: "E-mails", vencimentos: "Vencimentos", contatos: "Contatos", empresas: "Empresas" };

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VSUP0500 — Cadastro de Fornecedor</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Novo</button>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => { setMode("list"); void reload(); }} disabled={busy}>Listagem</button></div>
        {mode === "edit" && (
          <div className="fsc-action-group"><span className="fsc-action-label">Ações</span>
            <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : editing ? "Atualizar" : "Salvar"}</button>
            {form.code && <button className="fsc-btn fsc-btn-ghost" onClick={() => void consultarSefaz()} disabled={busy}>Consultar SEFAZ</button>}
            {form.code && <button className="fsc-btn fsc-btn-ghost" onClick={() => void verDefaults()} disabled={busy}>Defaults</button>}
            {form.code && <button className="fsc-btn fsc-btn-ghost" onClick={() => void toggleBlock(form)} disabled={busy}>{(form.billing_receipt_status ?? "").toUpperCase() === "BLOQUEADO" ? "Liberar" : "Bloquear"}</button>}
          </div>
        )}
        {mode === "list" && (
          <div className="fsc-action-group"><span className="fsc-action-label">Inativos</span>
            <label className="fsc-toggle"><input type="checkbox" checked={!onlyActive} onChange={(e) => setOnlyActive(!e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label></div>
        )}
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VSUP0500 — Cadastro de Fornecedor" filename="vsup0500" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode === "list" && (
          <div className="fsc-card"><div className="fsc-results-wrap">
            <table className="fsc-table">
              <thead><tr><th>Código</th><th>Razão social</th><th>Documento</th><th>Tipo</th><th>Situação</th><th style={{ width: 90 }}>Ações</th></tr></thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhum fornecedor.</td></tr>}
                {list.map((s) => (
                  <tr key={s.code}>
                    <td style={{ fontWeight: 600 }}>{s.code}</td><td>{s.name}<br /><small style={{ color: "#8aa894" }}>{s.trade_name}</small></td>
                    <td>{s.document_number}</td><td>{types.find((t) => t.code === s.supplier_type_code)?.description ?? "—"}</td>
                    <td>{(s.billing_receipt_status ?? "").toUpperCase() === "BLOQUEADO" ? <span className="fsc-pill fsc-pill-red">Bloqueado</span> : <span className="fsc-pill fsc-pill-green">Liberado</span>}</td>
                    <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => s.code && void abrir(s.code)}>Abrir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        )}

        {mode === "edit" && (
          <>
            <div className="fsc-card">
              <div className="fsc-tabs">
                {folders.map((f) => (
                  <button key={f} className={`fsc-tab ${folder === f ? "active" : ""}`} onClick={() => setFolder(f)} disabled={f !== "dados" && !form.code}>{folderLabel[f]}</button>
                ))}
              </div>

              {folder === "dados" && (
                <div className="fsc-card-body"><div className="fsc-grid">
                  <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Razão social</label><input className="fsc-input" value={form.name} onChange={(e) => setF("name", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-4"><label className="fsc-label">Fantasia</label><input className="fsc-input" value={form.trade_name ?? ""} onChange={(e) => setF("trade_name", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Pessoa</label>
                    <select className="fsc-select" value={form.person_type} onChange={(e) => setF("person_type", e.target.value as PersonType)}>{PERSON_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo doc.</label>
                    <select className="fsc-select" value={form.document_type} onChange={(e) => setF("document_type", e.target.value as DocumentType)}>{DOCUMENT_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">CNPJ/CPF</label><input className="fsc-input" value={form.document_number} onChange={(e) => setF("document_number", e.target.value)} />
                    {form.document_number.trim() && (form.document_type === "CNPJ" || form.document_type === "CPF") && (
                      <span className="fsc-field-hint" style={{ color: validateCNPJOrCPF(form.document_number) ? "#1e6030" : "#b91c1c" }}>{validateCNPJOrCPF(form.document_number) ? "✓ válido" : "✗ inválido"}</span>)}</div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Inscr. Estadual</label><input className="fsc-input" value={form.state_registration ?? ""} onChange={(e) => setF("state_registration", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Insc. Municipal</label><input className="fsc-input" value={form.municipal_registration ?? ""} onChange={(e) => setF("municipal_registration", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-4"><label className="fsc-label">Tipo de Fornecedor</label>
                    <select className="fsc-select" value={form.supplier_type_code ?? ""} onChange={(e) => setF("supplier_type_code", e.target.value ? Number(e.target.value) : undefined)}>
                      <option value="">—</option>{types.map((t) => <option key={t.code} value={t.code}>{t.description} ({t.kind})</option>)}</select></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Tipo Frete</label>
                    <select className="fsc-select" value={form.freight_type} onChange={(e) => setF("freight_type", e.target.value as FreightType)}>{FREIGHT_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Contrib. ICMS</label>
                    <select className="fsc-select" value={form.icms_contributor} onChange={(e) => setF("icms_contributor", e.target.value as IcmsContributor)}>{ICMS_CONTRIBUTORS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Obr. Vitícola</label>
                    <select className="fsc-select" value={form.viticola_obligation} onChange={(e) => setF("viticola_obligation", e.target.value as ViticolaObligation)}>{VITICOLA.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Plataforma Rastreio</label>
                    <select className="fsc-select" value={form.tracking_platform} onChange={(e) => setF("tracking_platform", e.target.value as TrackingPlatform)}>{TRACKING_PLATFORMS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Código GLN</label><input className="fsc-input" value={form.gln_code ?? ""} onChange={(e) => setF("gln_code", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Registro M.A. (AA-99999-9)</label><input className="fsc-input" value={form.agriculture_ministry_registration ?? ""} onChange={(e) => setF("agriculture_ministry_registration", e.target.value.toUpperCase())} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Código Pai</label><input className="fsc-input fsc-input-right" type="number" value={form.corporate_code ?? ""} onChange={(e) => setF("corporate_code", e.target.value ? Number(e.target.value) : undefined)} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Representante</label><div className="fsc-toggle-row"><label className="fsc-toggle"><input type="checkbox" checked={!!form.is_representative} onChange={(e) => setF("is_representative", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label><span className="fsc-toggle-label">{form.is_representative ? "Sim" : "Não"}</span></div></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Cliente</label><div className="fsc-toggle-row"><label className="fsc-toggle"><input type="checkbox" checked={!!form.is_customer} onChange={(e) => setF("is_customer", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label><span className="fsc-toggle-label">{form.is_customer ? "Sim" : "Não"}</span></div></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">MEI</label><div className="fsc-toggle-row"><label className="fsc-toggle"><input type="checkbox" checked={!!form.is_mei} onChange={(e) => setF("is_mei", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label><span className="fsc-toggle-label">{form.is_mei ? "Sim" : "Não"}</span></div></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Homologado</label><div className="fsc-toggle-row"><label className="fsc-toggle"><input type="checkbox" checked={!!form.homologated} onChange={(e) => setF("homologated", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label><span className="fsc-toggle-label">{form.homologated ? "Sim" : "Não"}</span></div></div>
                </div></div>
              )}

              {folder === "endereco" && (
                <div className="fsc-card-body"><div className="fsc-grid">
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">CEP</label><input className="fsc-input" value={addrForm.zip_code} onChange={(e) => setAddrForm((p) => ({ ...p, zip_code: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-5"><label className="fsc-label">Logradouro</label><input className="fsc-input" value={addrForm.street} onChange={(e) => setAddrForm((p) => ({ ...p, street: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Número</label><input className="fsc-input" value={addrForm.number} onChange={(e) => setAddrForm((p) => ({ ...p, number: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Complemento</label><input className="fsc-input" value={addrForm.complement} onChange={(e) => setAddrForm((p) => ({ ...p, complement: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-4"><label className="fsc-label">Bairro</label><input className="fsc-input" value={addrForm.district} onChange={(e) => setAddrForm((p) => ({ ...p, district: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-4"><label className="fsc-label">Cidade</label><input className="fsc-input" value={addrForm.city} onChange={(e) => setAddrForm((p) => ({ ...p, city: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">UF</label><input className="fsc-input" maxLength={2} value={addrForm.uf} onChange={(e) => setAddrForm((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">País</label><input className="fsc-input" value={addrForm.country} onChange={(e) => setAddrForm((p) => ({ ...p, country: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={() => void run(() => addAddress({ supplier_code: form.code!, ...addrForm }), "Endereço salvo.")} disabled={busy}>Salvar endereço</button></div>
                </div>
                  {folderRows("addresses").length > 0 && <div className="fsc-results-wrap"><table className="fsc-table"><thead><tr><th>Logradouro</th><th>Cidade</th><th>UF</th></tr></thead><tbody>
                    {folderRows("addresses").map((a, i) => <tr key={i}><td>{parseStr(a, "street", "Street")}, {parseStr(a, "number", "Number")}</td><td>{parseStr(a, "city", "City")}</td><td>{parseStr(a, "uf", "UF")}</td></tr>)}
                  </tbody></table></div>}
                </div>
              )}

              {folder === "telefones" && (
                <div className="fsc-card-body"><div className="fsc-grid">
                  <div className="fsc-field fsc-col-6"><label className="fsc-label">Telefone</label><input className="fsc-input" value={phoneForm.number} onChange={(e) => setPhoneForm((p) => ({ ...p, number: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Ranking</label><input className="fsc-input fsc-input-right" type="number" value={phoneForm.ranking} onChange={(e) => setPhoneForm((p) => ({ ...p, ranking: Number(e.target.value) }))} /></div>
                  <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void run(() => addPhone({ supplier_code: form.code!, ...phoneForm }), "Telefone salvo.")} disabled={busy}>+ Telefone</button></div>
                </div>
                  <div className="fsc-results-wrap"><table className="fsc-table"><thead><tr><th>Telefone</th><th className="fsc-num">Ranking</th></tr></thead><tbody>
                    {folderRows("phones").length === 0 && <tr><td colSpan={2} className="fsc-empty">Nenhum telefone.</td></tr>}
                    {folderRows("phones").map((p, i) => <tr key={i}><td>{parseStr(p, "number", "Number")}</td><td className="fsc-num">{parseNum(p, "ranking", "Ranking") ?? "—"}</td></tr>)}
                  </tbody></table></div>
                </div>
              )}

              {folder === "emails" && (
                <div className="fsc-card-body"><div className="fsc-grid">
                  <div className="fsc-field fsc-col-6"><label className="fsc-label">E-mail</label><input className="fsc-input" value={emailForm.email} onChange={(e) => setEmailForm((p) => ({ ...p, email: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Ranking</label><input className="fsc-input fsc-input-right" type="number" value={emailForm.ranking} onChange={(e) => setEmailForm((p) => ({ ...p, ranking: Number(e.target.value) }))} /></div>
                  <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void run(() => addEmail({ supplier_code: form.code!, ...emailForm }), "E-mail salvo.")} disabled={busy}>+ E-mail</button></div>
                </div>
                  <div className="fsc-results-wrap"><table className="fsc-table"><thead><tr><th>E-mail</th><th className="fsc-num">Ranking</th></tr></thead><tbody>
                    {folderRows("emails").length === 0 && <tr><td colSpan={2} className="fsc-empty">Nenhum e-mail.</td></tr>}
                    {folderRows("emails").map((m, i) => <tr key={i}><td>{parseStr(m, "email", "Email")}</td><td className="fsc-num">{parseNum(m, "ranking", "Ranking") ?? "—"}</td></tr>)}
                  </tbody></table></div>
                </div>
              )}

              {folder === "vencimentos" && (
                <div className="fsc-card-body"><div className="fsc-grid">
                  <div className="fsc-field fsc-col-4"><label className="fsc-label">Descrição</label><input className="fsc-input" value={dueForm.description} onChange={(e) => setDueForm((p) => ({ ...p, description: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Cond. pagto (cód.)</label><input className="fsc-input fsc-input-right" type="number" value={dueForm.payment_condition_code} onChange={(e) => setDueForm((p) => ({ ...p, payment_condition_code: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo pagto</label><select className="fsc-select" value={dueForm.payment_type} onChange={(e) => setDueForm((p) => ({ ...p, payment_type: e.target.value }))}><option value="MENSAL">MENSAL</option><option value="SEMANAL">SEMANAL</option></select></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Mês subsequente</label><div className="fsc-toggle-row"><label className="fsc-toggle"><input type="checkbox" checked={dueForm.subsequent_month} onChange={(e) => setDueForm((p) => ({ ...p, subsequent_month: e.target.checked }))} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label></div></div>
                  <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void run(() => addDueDate({ supplier_code: form.code!, description: dueForm.description, ranking: dueForm.ranking, payment_condition_code: dueForm.payment_condition_code ? Number(dueForm.payment_condition_code) : undefined, payment_type: dueForm.payment_type, subsequent_month: dueForm.subsequent_month }), "Vencimento salvo.")} disabled={busy}>+ Venc.</button></div>
                </div>
                  <div className="fsc-results-wrap"><table className="fsc-table"><thead><tr><th>Descrição</th><th>Tipo</th><th>Subseq.</th></tr></thead><tbody>
                    {folderRows("due_dates").length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhum vencimento.</td></tr>}
                    {folderRows("due_dates").map((d, i) => <tr key={i}><td>{parseStr(d, "description", "Description")}</td><td>{parseStr(d, "payment_type", "PaymentType")}</td><td>{(d.subsequent_month ?? d.SubsequentMonth) ? "Sim" : "Não"}</td></tr>)}
                  </tbody></table></div>
                </div>
              )}

              {folder === "contatos" && (
                <div className="fsc-card-body"><div className="fsc-grid">
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Nome</label><input className="fsc-input" value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Cargo</label><input className="fsc-input" value={contactForm.role} onChange={(e) => setContactForm((p) => ({ ...p, role: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Departamento</label><input className="fsc-input" value={contactForm.department} onChange={(e) => setContactForm((p) => ({ ...p, department: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Tag do Pedido de Compra</label><input className="fsc-input" value={contactForm.purchase_order_tag} onChange={(e) => setContactForm((p) => ({ ...p, purchase_order_tag: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void run(() => addContact({ supplier_code: form.code!, ...contactForm }), "Contato salvo.")} disabled={busy}>+ Contato</button></div>
                </div>
                  <div className="fsc-results-wrap"><table className="fsc-table"><thead><tr><th>Nome</th><th>Cargo</th><th>Depto</th><th>Tag PC</th></tr></thead><tbody>
                    {folderRows("contacts").length === 0 && <tr><td colSpan={4} className="fsc-empty">Nenhum contato.</td></tr>}
                    {folderRows("contacts").map((c, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{parseStr(c, "name", "Name")}</td><td>{parseStr(c, "role", "Role")}</td><td>{parseStr(c, "department", "Department")}</td><td>{parseStr(c, "purchase_order_tag", "PurchaseOrderTag")}</td></tr>)}
                  </tbody></table></div>
                </div>
              )}

              {folder === "empresas" && (
                <div className="fsc-card-body"><div className="fsc-grid">
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Empresa</label><input className="fsc-input fsc-input-right" type="number" value={entForm.enterprise_code} onChange={(e) => setEntForm((p) => ({ ...p, enterprise_code: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Conta financeira</label><input className="fsc-input fsc-input-right" type="number" value={entForm.financial_account} onChange={(e) => setEntForm((p) => ({ ...p, financial_account: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo NF default</label><input className="fsc-input fsc-input-right" type="number" value={entForm.default_invoice_type_id} onChange={(e) => setEntForm((p) => ({ ...p, default_invoice_type_id: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Tab. preço compra</label><input className="fsc-input fsc-input-right" type="number" value={entForm.purchase_price_table_id} onChange={(e) => setEntForm((p) => ({ ...p, purchase_price_table_id: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-1"><label className="fsc-label">IPI</label><div className="fsc-toggle-row"><label className="fsc-toggle"><input type="checkbox" checked={entForm.ipi} onChange={(e) => setEntForm((p) => ({ ...p, ipi: e.target.checked }))} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label></div></div>
                  <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void run(async () => { await addEnterprise({ supplier_code: form.code!, enterprise_code: Number(entForm.enterprise_code), financial_account: entForm.financial_account ? Number(entForm.financial_account) : undefined, ipi: entForm.ipi, default_invoice_type_id: entForm.default_invoice_type_id ? Number(entForm.default_invoice_type_id) : undefined, purchase_price_table_id: entForm.purchase_price_table_id ? Number(entForm.purchase_price_table_id) : undefined }); setEnterprises(await listEnterprises(form.code!)); }, "Vínculo de empresa salvo.")} disabled={busy}>+ Empresa</button></div>
                </div>
                  <div className="fsc-results-wrap"><table className="fsc-table"><thead><tr><th>Empresa</th><th className="fsc-num">Conta fin.</th><th>IPI</th><th className="fsc-num">Tipo NF</th><th className="fsc-num">Tab. preço</th></tr></thead><tbody>
                    {enterprises.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhum vínculo.</td></tr>}
                    {enterprises.map((e2, i) => <tr key={e2.id ?? i}><td style={{ fontWeight: 600 }}>{e2.enterprise_code}</td><td className="fsc-num">{e2.financial_account ?? "—"}</td><td>{e2.ipi ? "Sim" : "Não"}</td><td className="fsc-num">{e2.default_invoice_type_id ?? "—"}</td><td className="fsc-num">{e2.purchase_price_table_id ?? "—"}</td></tr>)}
                  </tbody></table></div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Fornecedores: <strong>{list.length}</strong></div>{form.code && <div className="fsc-footer-stat">Editando: <strong>{form.code}</strong></div>}</div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
