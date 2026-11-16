import { ApoioClientePanel } from "./ApoioClientePanel";
import { CreditoClientePanel, ExplicacaoDoLimite, DecisaoDoLimite } from "./CreditoClientePanel";
import { money, vencimentoDoCredito, problemaDoLimite } from "./formato";
import { nomeDoCliente, nomeClientePreferido } from "@/services/preferenciasService";
import { VisaoClientePanel } from "./VisaoClientePanel";
import { useState, useCallback, useEffect } from "react";
import { pedirTexto, confirmar } from "@/components/ui/dialogos";
import { LookupField } from "@/components/ui/LookupField";
import { enumLabel } from "@/utils/enumLabels";
import { useAuthStore } from "@/store/authStore";
import { loadRepresentatives, loadShippingCarriers } from "@/services/lookups";
import {
  type CustomerDTO, type SupportRef, type CustomerDocType, type AddressType, type FinalidadeCompra,
  type IEIndicator, type TaxRegime, type FreightType, type CreditSuggestion,
  DOC_TYPES, ADDRESS_TYPES, FINALIDADES_COMPRA, IE_INDICATORS, TAX_REGIMES, FREIGHT_TYPES,
  listRefs, listCustomers, getCustomer, createCustomer, updateCustomer, blockCustomer, unblockCustomer,
  addCustomerAddress, addCustomerContact, updateCustomerAddress, deleteCustomerAddress, updateCustomerContact, deleteCustomerContact,
  listEstablishments, lookupCnpj, exportCustomers, exportCustomerPDF, type CnpjLookup,
  suggestCredit, getCustomerUsage, inactivateCustomer, reactivateCustomer, deleteCustomer, refreshCustomerRegistration,
} from "@/services/customerService";
import { errMessage, type Obj, parseStr, parseNum, parseBool } from "@/services/fiscalShared";
import { validateCNPJOrCPF } from "@/utils/validation";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Mode = "list" | "edit" | "apoio";
type Folder = "dados" | "fiscal" | "comercial" | "credito" | "enderecos" | "contatos" | "visao";
const SYS = "00000000-0000-0000-0000-000000000000";
const EMPTY: CustomerDTO = { name: "", document_type: "CNPJ", document_number: "", is_corporate: false, allows_partial_billing: true };
const EMPTY_ADDR = { address_type: "COBRANCA" as AddressType, zip_code: "", street: "", number: "", complement: "", neighborhood: "", city: "", uf: "", country: "Brasil", is_default: true };
const EMPTY_CONTACT = { contact_type_code: "", name: "", email: "", phone: "", mobile: "", position: "", is_primary: true };

interface Refs { regions: SupportRef[]; segments: SupportRef[]; ctypes: SupportRef[]; contactTypes: SupportRef[]; carriers: SupportRef[]; taxtypes: SupportRef[]; }
const EMPTY_REFS: Refs = { regions: [], segments: [], ctypes: [], contactTypes: [], carriers: [], taxtypes: [] };

const ABAS: { id: Folder; label: string; precisaCodigo?: boolean }[] = [
  { id: "dados", label: "Dados gerais" }, { id: "fiscal", label: "Fiscal" }, { id: "comercial", label: "Comercial e logística" },
  { id: "credito", label: "Crédito" }, { id: "enderecos", label: "Endereços", precisaCodigo: true },
  { id: "contatos", label: "Contatos", precisaCodigo: true }, { id: "visao", label: "Visão 360", precisaCodigo: true },
];

const opt = (v?: string) => (v && v.trim() ? v.trim() : undefined);

export function Vcli0500Page(): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const [mode, setMode] = useState<Mode>("list");
  const [folder, setFolder] = useState<Folder>("dados");
  const [list, setList] = useState<CustomerDTO[]>([]);
  const [filtro, setFiltro] = useState("");
  const [soARevisar, setSoARevisar] = useState(false);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [refs, setRefs] = useState<Refs>(EMPTY_REFS);
  const [form, setForm] = useState<CustomerDTO>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [detail, setDetail] = useState<Obj | null>(null);
  const [estabs, setEstabs] = useState<CustomerDTO[]>([]);
  const [addr, setAddr] = useState(EMPTY_ADDR);
  const [addrId, setAddrId] = useState<number | null>(null);
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [contactId, setContactId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [cnpjData, setCnpjData] = useState<CnpjLookup | null>(null);
  const [sugestao, setSugestao] = useState<CreditSuggestion | null>(null);
  const [limiteTocado, setLimiteTocado] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      const [cs, regions, segments, ctypes, contactTypes, carriers, taxtypes] = await Promise.all([
        listCustomers({ includeInactive: true }),
        listRefs("regions").catch(() => []), listRefs("market-segments").catch(() => []), listRefs("customer-types").catch(() => []),
        listRefs("contact-types").catch(() => []), listRefs("carriers").catch(() => []), listRefs("tax-types").catch(() => []),
      ]);
      setList(cs); setRefs({ regions, segments, ctypes, contactTypes, carriers, taxtypes });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar clientes.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof CustomerDTO>(k: K, v: CustomerDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() {
    if (mode === "apoio") void reload();
    setForm(EMPTY); setEditing(false); setDetail(null); setEstabs([]); setCnpjData(null); setSugestao(null); setLimiteTocado(false);
    setAddr(EMPTY_ADDR); setAddrId(null); setContact(EMPTY_CONTACT); setContactId(null); setFolder("dados"); setMode("edit"); setFeedback(null);
  }

  /** Sugestão de limite para cliente novo: assim que o documento é válido. */
  async function calcularSugestao(docType = form.document_type, doc = form.document_number) {
    const digits = doc.replace(/\D/g, "");
    if (!((docType === "CNPJ" && digits.length === 14) || (docType === "CPF" && digits.length === 11)) || !validateCNPJOrCPF(digits)) return;
    try {
      const s = await suggestCredit({ document_type: docType, document: digits });
      setSugestao(s);
      if (!limiteTocado) setForm((p) => ({ ...p, credit_limit: s.suggested_limit, credit_limit_reason: "" }));
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Não foi possível calcular o limite sugerido.") }); }
  }

  async function buscarCnpj() {
    if (form.document_type !== "CNPJ") { setFeedback({ type: "error", message: "Auto-fill disponível apenas para CNPJ." }); return; }
    const digits = (form.document_number ?? "").replace(/\D/g, "");
    if (digits.length !== 14) { setFeedback({ type: "error", message: "Informe um CNPJ com 14 dígitos." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const c = await lookupCnpj(digits);
      setCnpjData(c);
      setForm((p) => ({
        ...p,
        name: c.legal_name || p.name,
        trade_name: c.trade_name || p.trade_name,
        state_registration: c.state_registration || p.state_registration,
        main_cnae: c.main_activity?.code?.replace(/\D/g, "") || p.main_cnae,
        tax_regime: (c.mei ? "MEI" : c.simples_optant ? "SIMPLES" : p.tax_regime || "NORMAL") as TaxRegime,
        ie_indicator: (p.ie_indicator || (c.state_registration ? "CONTRIBUINTE" : "")) as IEIndicator,
        nfe_email: p.nfe_email || c.email || undefined,
      }));
      setAddr((p) => ({
        ...p,
        zip_code: c.address?.zip_code || p.zip_code, street: c.address?.street || p.street, number: c.address?.number || p.number,
        complement: c.address?.complement || p.complement, neighborhood: c.address?.neighborhood || p.neighborhood,
        city: c.address?.city || p.city, uf: c.address?.uf || p.uf,
      }));
      setContact((p) => ({ ...p, email: c.email || p.email, phone: c.phone || p.phone }));
      const irregular = c.registration_status && c.registration_status.toUpperCase() !== "ATIVA";
      setFeedback({ type: irregular ? "error" : "success", message: irregular
        ? `Atenção: situação na Receita ${c.registration_status}. O crédito sugerido será zero.`
        : `Dados da Receita carregados (${c.registration_status ?? "OK"}). Confira antes de salvar.` });
      if (!editing) await calcularSugestao("CNPJ", digits);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function exportar(fmt: "xlsx" | "pdf" | "csv") {
    setBusy(true); setFeedback(null);
    try { await exportCustomers(fmt); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function runCustomerReport(code: number, name: string) {
    setBusy(true); setFeedback(null);
    try { await exportCustomerPDF(code, name); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Não foi possível gerar a ficha do cliente.") }); }
    finally { setBusy(false); }
  }

  async function abrir(code: number, targetFolder: Folder = "dados") {
    setBusy(true); setFeedback(null); setCnpjData(null); setSugestao(null);
    setAddr(EMPTY_ADDR); setAddrId(null); setContact(EMPTY_CONTACT); setContactId(null);
    try {
      const p = await getCustomer(code); setDetail(p);
      const s = (k: string) => parseStr(p, k) || undefined;
      const n = (k: string) => parseNum(p, k) || undefined;
      setForm({
        ...EMPTY, code,
        corporate_code: n("corporate_code"), is_corporate: parseBool(p, "is_corporate"),
        name: parseStr(p, "name"), trade_name: s("trade_name"),
        document_type: (s("document_type") || "CNPJ") as CustomerDocType, document_number: parseStr(p, "document_number"),
        state_registration: s("state_registration"), municipal_registration: s("municipal_registration"),
        suframa_code: s("suframa_code"), suframa_expiry: s("suframa_expiry")?.slice(0, 10),
        region_code: n("region_code"), market_segment_code: n("market_segment_code"), customer_type_code: n("customer_type_code"),
        carrier_code: n("carrier_code"), tax_type_code: n("tax_type_code"),
        finalidade_compra: (s("finalidade_compra") || "") as FinalidadeCompra, website: s("website"),
        ie_indicator: (s("ie_indicator") || "") as IEIndicator, tax_regime: (s("tax_regime") || "") as TaxRegime,
        main_cnae: s("main_cnae"), nfe_email: s("nfe_email"), billing_email: s("billing_email"),
        representative_code: n("representative_code"), shipping_carrier_id: n("shipping_carrier_id"),
        freight_type: (s("freight_type") || "") as FreightType,
        requires_customer_po: parseBool(p, "requires_customer_po"), requires_quality_cert: parseBool(p, "requires_quality_cert"),
        allows_partial_billing: p.allows_partial_billing !== false,
        receiving_notes: s("receiving_notes"), commercial_notes: s("commercial_notes"), financial_notes: s("financial_notes"),
        credit_limit: parseNum(p, "credit_limit"), credit_risk_class: s("credit_risk_class"),
        blocked: parseBool(p, "blocked"), is_active: p.is_active !== false,
      });
      setEditing(true); setFolder(targetFolder); setMode("edit");
      setEstabs(parseBool(p, "is_corporate") ? await listEstablishments(code).catch(() => []) : []);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  function validar(): string | null {
    if (!editing && !form.code) return "Código do cliente é obrigatório na criação.";
    if (!form.name.trim()) return "Razão social / nome é obrigatório.";
    if (!form.document_number.trim()) return "Documento é obrigatório.";
    if ((form.document_type === "CNPJ" || form.document_type === "CPF") && !validateCNPJOrCPF(form.document_number)) return "CNPJ/CPF inválido (dígito verificador não confere).";
    const ie = (form.state_registration ?? "").trim().toUpperCase();
    if (form.ie_indicator === "CONTRIBUINTE" && (!ie || ie === "ISENTO")) return "Cliente contribuinte precisa da inscrição estadual (pasta Fiscal).";
    if (form.ie_indicator === "NAO_CONTRIBUINTE" && ie && ie !== "ISENTO") return "Cliente não contribuinte não tem inscrição estadual.";
    if (form.suframa_code && !form.suframa_expiry) return "Informe a validade da inscrição SUFRAMA (pasta Fiscal).";
    if (!editing && sugestao && limiteTocado) {
      const p = problemaDoLimite({ sugerido: sugestao.suggested_limit, maxSemAdmin: sugestao.max_without_admin, hardStop: sugestao.hard_stop,
        isAdmin, valor: form.credit_limit ?? NaN, motivo: form.credit_limit_reason ?? "" });
      if (p) return `${p} (pasta Crédito)`;
    }
    return null;
  }

  function payload(): CustomerDTO {
    const p: CustomerDTO = {
      ...form,
      form_version: 2,
      trade_name: opt(form.trade_name), state_registration: opt(form.state_registration), municipal_registration: opt(form.municipal_registration),
      suframa_code: opt(form.suframa_code), suframa_expiry: form.suframa_expiry ? `${form.suframa_expiry.slice(0, 10)}T00:00:00Z` : undefined,
      website: opt(form.website), main_cnae: opt(form.main_cnae), nfe_email: opt(form.nfe_email), billing_email: opt(form.billing_email),
      receiving_notes: opt(form.receiving_notes), commercial_notes: opt(form.commercial_notes), financial_notes: opt(form.financial_notes),
      ie_indicator: form.ie_indicator || undefined, tax_regime: form.tax_regime || undefined, freight_type: form.freight_type || undefined,
    };
    delete p.blocked; delete p.is_active; delete p.credit_risk_class;
    if (editing || !limiteTocado) { delete p.credit_limit; delete p.credit_limit_reason; }
    return p;
  }

  async function salvar() {
    const err = validar(); if (err) { setFeedback({ type: "error", message: err }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editing) { await updateCustomer(payload()); setFeedback({ type: "success", message: "Cliente atualizado." }); await reload(); }
      else {
        const c = await createCustomer({ ...payload(), created_by: SYS });
        if (c?.code) {
          let addrWarn = "";
          if (addr.street || addr.city || addr.zip_code || addr.uf) {
            try { await addCustomerAddress(c.code, { customer_code: c.code, ...addr }); }
            catch { addrWarn = " (endereço não foi salvo)"; }
          }
          await reload(); await abrir(c.code);
          setFeedback({ type: "success", message: `Cliente ${c.code} criado com limite de ${money(c.credit_limit)}.${addrWarn}` });
          return;
        }
      }
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  async function toggleBlock() {
    if (!form.code) return;
    setBusy(true); setFeedback(null);
    try {
      if (form.blocked) { await unblockCustomer(form.code); setFeedback({ type: "success", message: "Cliente desbloqueado." }); }
      else {
        const r = await pedirTexto({ titulo: "Bloquear cliente", rotulo: "Motivo do bloqueio", assunto: form.name || undefined, multilinha: true, rotuloConfirmar: "Bloquear", tom: "aviso" });
        if (r === null) return;
        await blockCustomer(form.code, r); setFeedback({ type: "success", message: "Cliente bloqueado." });
      }
      await abrir(form.code, folder); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  /** Inativar/reativar/excluir conferem antes o que o cliente ainda tem no sistema. */
  async function toggleActive() {
    if (!form.code) return;
    setBusy(true); setFeedback(null);
    try {
      if (form.is_active === false) { await reactivateCustomer(form.code); setFeedback({ type: "success", message: "Cliente reativado." }); }
      else {
        const u = await getCustomerUsage(form.code);
        if (!u.can_inactivate) { setFeedback({ type: "error", message: u.inactivate_reason ?? "O cliente tem movimento em andamento." }); return; }
        const ok = await confirmar({ titulo: "Inativar cliente", mensagem: "O cliente deixa de aparecer em orçamentos e pedidos novos. O histórico continua consultável.", assunto: form.name, rotulo: "Inativar", tom: "aviso" });
        if (!ok) return;
        await inactivateCustomer(form.code); setFeedback({ type: "success", message: "Cliente inativado." });
      }
      await abrir(form.code, folder); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function excluir() {
    if (!form.code) return;
    setBusy(true); setFeedback(null);
    try {
      const u = await getCustomerUsage(form.code);
      if (!u.can_delete) { setFeedback({ type: "error", message: u.delete_reason ?? "O cliente tem histórico e não pode ser excluído." }); return; }
      const ok = await confirmar({ titulo: "Excluir cliente", mensagem: "O cadastro, os endereços e os contatos serão apagados. A trilha de crédito fica guardada.", assunto: `${form.code} — ${form.name}`, rotulo: "Excluir", tom: "perigo" });
      if (!ok) return;
      await deleteCustomer(form.code);
      setMode("list"); setForm(EMPTY); setEditing(false); await reload();
      setFeedback({ type: "success", message: "Cliente excluído." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function reconsultarReceita() {
    if (!form.code) return;
    setBusy(true); setFeedback(null);
    try {
      const r = await refreshCustomerRegistration(form.code);
      const st = parseStr(r, "registration_status");
      await abrir(form.code, folder); await reload();
      setFeedback({ type: st.toUpperCase() === "ATIVA" ? "success" : "error", message: st.toUpperCase() === "ATIVA" ? "Situação na Receita: ATIVA." : `Situação na Receita: ${st}. O cliente foi bloqueado.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function salvarEndereco() {
    if (!form.code) return;
    setBusy(true); setFeedback(null);
    try {
      if (addrId) await updateCustomerAddress(form.code, addrId, { customer_code: form.code, ...addr });
      else await addCustomerAddress(form.code, { customer_code: form.code, ...addr });
      await abrir(form.code, "enderecos"); setFeedback({ type: "success", message: addrId ? "Endereço alterado." : "Endereço incluído." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function excluirEndereco(id: number) {
    if (!form.code || !(await confirmar({ titulo: "Excluir endereço", mensagem: "O endereço sai do cadastro do cliente.", rotulo: "Excluir", tom: "perigo" }))) return;
    setBusy(true); setFeedback(null);
    try { await deleteCustomerAddress(form.code, id); await abrir(form.code, "enderecos"); setFeedback({ type: "success", message: "Endereço excluído." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function salvarContato() {
    if (!form.code) return;
    if (!contact.name.trim()) { setFeedback({ type: "error", message: "Nome do contato é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    const body = { customer_code: form.code, name: contact.name, email: opt(contact.email), phone: opt(contact.phone), mobile: opt(contact.mobile), position: opt(contact.position), is_primary: contact.is_primary, contact_type_code: contact.contact_type_code ? Number(contact.contact_type_code) : undefined };
    try {
      if (contactId) await updateCustomerContact(form.code, contactId, body); else await addCustomerContact(form.code, body);
      await abrir(form.code, "contatos"); setFeedback({ type: "success", message: contactId ? "Contato alterado." : "Contato incluído." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function excluirContato(id: number) {
    if (!form.code || !(await confirmar({ titulo: "Excluir contato", mensagem: "O contato sai do cadastro do cliente.", rotulo: "Excluir", tom: "perigo" }))) return;
    setBusy(true); setFeedback(null);
    try { await deleteCustomerContact(form.code, id); await abrir(form.code, "contatos"); setFeedback({ type: "success", message: "Contato excluído." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const rows = (key: string): Obj[] => (detail && Array.isArray(detail[key]) ? (detail[key] as Obj[]) : []);
  const refSelect = (label: string, k: keyof CustomerDTO, opts: SupportRef[], col = 4) => (
    <div className={`erp-field erp-c${col}`}><label className="erp-label">{label}</label>
      <select className="erp-input" value={(form[k] as number | undefined) ?? ""} onChange={(e) => setF(k, (e.target.value ? Number(e.target.value) : undefined) as CustomerDTO[typeof k])}>
        <option value="">—</option>{opts.map((o) => <option key={o.code} value={o.code}>{o.code} · {o.description}</option>)}</select></div>
  );
  const enumSelect = <T extends string>(label: string, k: keyof CustomerDTO, opts: { value: T; label: string }[], col = 4, hint?: string) => (
    <div className={`erp-field erp-c${col}`}><label className="erp-label">{label}</label>
      <select className="erp-input" value={(form[k] as string | undefined) ?? ""} onChange={(e) => setF(k, e.target.value as CustomerDTO[typeof k])}>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      {hint && <span className="erp-field-hint">{hint}</span>}</div>
  );
  const text = (label: string, k: keyof CustomerDTO, col = 4, extra?: { area?: boolean; placeholder?: string; hint?: string }) => (
    <div className={`erp-field erp-c${col}`}><label className="erp-label">{label}</label>
      {extra?.area
        ? <textarea className="erp-input" rows={2} value={(form[k] as string | undefined) ?? ""} placeholder={extra.placeholder} onChange={(e) => setF(k, e.target.value as CustomerDTO[typeof k])} />
        : <input className="erp-input" value={(form[k] as string | undefined) ?? ""} placeholder={extra?.placeholder} onChange={(e) => setF(k, e.target.value as CustomerDTO[typeof k])} />}
      {extra?.hint && <span className="erp-field-hint">{extra.hint}</span>}</div>
  );
  const toggle = (label: string, k: keyof CustomerDTO, col = 3) => (
    <div className={`erp-field erp-c${col}`}><label className="erp-label">{label}</label><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={!!form[k]} onChange={(e) => setF(k, e.target.checked as CustomerDTO[typeof k])} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">{form[k] ? "Sim" : "Não"}</span></div></div>
  );

  const termo = filtro.trim().toLowerCase();
  const visiveis = list.filter((c) => (mostrarInativos || c.is_active !== false) && (!soARevisar || vencimentoDoCredito(c) !== null) &&
    (!termo || `${c.code} ${c.name} ${c.trade_name ?? ""} ${c.document_number}`.toLowerCase().includes(termo) || c.document_number.replace(/\D/g, "").includes(termo.replace(/\D/g, "") || "#")));

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Comercial</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Cadastro de Cliente</span><span className="erp-crumb-code">VCLI0500</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{list.length} cliente(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-primary" onClick={novo} disabled={busy}>+ Novo</button>
          <button className="erp-btn" onClick={() => { setMode("list"); void reload(); }} disabled={busy}>Listagem</button>
          <button className={`erp-btn${mode === "apoio" ? " erp-btn-primary" : ""}`} onClick={() => { if (mode === "apoio") { setMode("list"); void reload(); } else { setMode("apoio"); setFeedback(null); } }} disabled={busy}
            title="Região, segmento, tipos, portadores, tipo de NF, tipo de imposto e política de crédito">Cadastros de apoio</button></div>
        {mode === "edit" && (
          <div className="erp-tgroup"><span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : editing ? "Atualizar" : "Salvar"}</button>
            {editing && <>
              <button className="erp-btn" onClick={() => void toggleBlock()} disabled={busy}>{form.blocked ? "Desbloquear" : "Bloquear"}</button>
              <button className="erp-btn" onClick={() => void toggleActive()} disabled={busy}>{form.is_active === false ? "Reativar" : "Inativar"}</button>
              {form.document_type === "CNPJ" && <button className="erp-btn" onClick={() => void reconsultarReceita()} disabled={busy} title="Confere a situação cadastral na Receita agora">Reconsultar Receita</button>}
              {isAdmin && <button className="erp-btn" onClick={() => void excluir()} disabled={busy} title="Só para cadastro sem nenhum movimento">Excluir</button>}
            </>}
          </div>
        )}
        {mode === "list" && <div className="erp-tgroup"><span className="erp-tgroup-label">Exportar lista</span>
          <button className="erp-btn" onClick={() => void exportar("xlsx")} disabled={busy}>Excel</button>
          <button className="erp-btn" onClick={() => void exportar("pdf")} disabled={busy}>PDF</button>
          <button className="erp-btn" onClick={() => void exportar("csv")} disabled={busy}>CSV</button></div>}
        <div className="erp-tspacer" />
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            {mode === "apoio"
              ? <button className="erp-tab active">Cadastros de apoio</button>
              : mode === "list"
              ? <button className="erp-tab active">Listagem</button>
              : ABAS.map((a) => <button key={a.id} className={`erp-tab ${folder === a.id ? "active" : ""}`} onClick={() => setFolder(a.id)} disabled={a.precisaCodigo && !editing}>{a.label}</button>)}
          </div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
            {mode === "edit" && editing && (form.blocked || form.is_active === false) && (
              <div className="erp-feedback error">{form.is_active === false ? "Cliente inativo: não aparece em orçamentos e pedidos novos." : `Cliente bloqueado: ${parseStr(detail ?? {}, "block_reason") || "sem motivo informado"}`}</div>
            )}
            {cnpjData && mode === "edit" && folder === "dados" && <div className="erp-note"><strong>Consulta cadastral:</strong> situação {cnpjData.registration_status || "não informada"}; abertura {cnpjData.opening_date || "não informada"}; natureza jurídica {cnpjData.legal_nature || "não informada"}; porte {cnpjData.size || "não informado"}; capital social {cnpjData.share_capital ? money(Number(cnpjData.share_capital)) : "não informado"}; CNAE principal {cnpjData.main_activity?.code || "não informado"} {cnpjData.main_activity?.description ? `— ${cnpjData.main_activity.description}` : ""}; IEs {cnpjData.state_registrations.map((item) => `${item.uf} ${item.number}${item.enabled ? " ativa" : " inativa"}`).join(", ") || cnpjData.state_registration || "não informadas"}; Simples Nacional {cnpjData.simples_optant ? "sim" : "não"}; MEI {cnpjData.mei ? "sim" : "não"}. Os campos foram preenchidos e continuam editáveis.</div>}

            {mode === "apoio" && <ApoioClientePanel />}

            {mode === "list" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Clientes ({visiveis.length})</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c6"><input className="erp-input" placeholder="Buscar por código, nome, fantasia ou documento" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></div>
                <div className="erp-field erp-c3"><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">Mostrar inativos</span></div></div>
                <div className="erp-field erp-c3"><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={soARevisar} onChange={(e) => setSoARevisar(e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">Só crédito a revisar (vencido ou em até 30 dias)</span></div></div>
                <div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead><tr><th>Código</th><th>{nomeClientePreferido() === "FANTASIA" ? "Nome fantasia" : "Razão social"}</th><th>Documento</th><th>Crédito</th><th>Situação</th><th style={{ width: 170 }}>Ações</th></tr></thead>
                    <tbody>
                      {visiveis.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum cliente.</td></tr>}
                      {visiveis.map((c) => (
                        <tr key={c.code}><td style={{ fontWeight: 600 }}>{c.code}</td><td>{nomeDoCliente(c).nome}<br /><small style={{ color: "#8aa894" }}>{nomeDoCliente(c).outro}</small></td>
                          <td>{c.document_number}</td>
                          <td>{money(c.credit_limit)}{c.credit_risk_class && <> <span className="erp-badge info">{c.credit_risk_class}</span></>}{vencimentoDoCredito(c) && <> <span className={`erp-badge ${c.credit_limit_expired ? "err" : "warn"}`}>{vencimentoDoCredito(c)}</span></>}</td>
                          <td>{c.is_active === false ? <span className="erp-badge gray">Inativo</span> : c.blocked ? <span className="erp-badge err">Bloqueado</span> : <span className="erp-badge ok">Ativo</span>}</td>
                          <td><div style={{ display: "flex", gap: 6 }}><button className="erp-btn erp-btn-sm" onClick={() => c.code && void abrir(c.code)}>Abrir</button><button className="erp-btn erp-btn-sm" onClick={() => c.code && void runCustomerReport(c.code, c.name)} disabled={busy}>Ficha PDF</button></div></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div></div>
            )}

            {mode === "edit" && folder === "dados" && (
              <>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Identificação</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input num" type="number" value={form.code ?? ""} disabled={editing} onChange={(e) => setF("code", e.target.value ? Number(e.target.value) : undefined)} /></div>
                <div className="erp-field erp-c6"><label className="erp-label erp-req">Razão social / Nome</label><input className="erp-input" value={form.name} onChange={(e) => setF("name", e.target.value)} /></div>
                {text("Fantasia", "trade_name", 4)}
                <div className="erp-field erp-c2"><label className="erp-label">Tipo doc.</label><select className="erp-input" value={form.document_type} disabled={editing} onChange={(e) => { setF("document_type", e.target.value as CustomerDocType); setSugestao(null); }}>{DOC_TYPES.map((d) => <option key={d} value={d}>{enumLabel(d)}</option>)}</select></div>
                <div className="erp-field erp-c4"><label className="erp-label erp-req">CNPJ/CPF</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input className="erp-input" value={form.document_number} disabled={editing} onChange={(e) => { setF("document_number", e.target.value); setSugestao(null); }} onBlur={() => { if (!editing && form.document_type === "CPF") void calcularSugestao(); }} />
                    {form.document_type === "CNPJ" && !editing && <button className="erp-btn" style={{ whiteSpace: "nowrap" }} onClick={() => void buscarCnpj()} disabled={busy} title="Preencher pela Receita e calcular o limite">Consultar CNPJ</button>}
                  </div>
                  {form.document_number.trim() && (form.document_type === "CNPJ" || form.document_type === "CPF") && (<span className="erp-field-hint" style={{ color: validateCNPJOrCPF(form.document_number) ? "#1e6030" : "#b91c1c" }}>{validateCNPJOrCPF(form.document_number) ? "✓ válido" : "✗ inválido"}</span>)}</div>
                <div className="erp-field erp-c2"><label className="erp-label">Matriz (cód.)</label><input className="erp-input num" type="number" value={form.corporate_code ?? ""} onChange={(e) => setF("corporate_code", e.target.value ? Number(e.target.value) : undefined)} /></div>
                {toggle("É matriz", "is_corporate", 2)}
                {text("Website", "website", 2)}
                {refSelect("Região", "region_code", refs.regions)}
                {refSelect("Segmento", "market_segment_code", refs.segments)}
                {refSelect("Tipo de Cliente", "customer_type_code", refs.ctypes)}
                {estabs.length > 0 && <div className="erp-field erp-c12"><span className="erp-field-hint">Filiais: {estabs.map((e) => `${e.code} ${e.name}`).join(" · ")}</span></div>}
                {editing && <div className="erp-field erp-c12"><span className="erp-field-hint">Situação na Receita: <strong>{parseStr(detail ?? {}, "registration_status") || "não conferida"}</strong>{parseStr(detail ?? {}, "registration_checked_at") ? ` (conferida em ${new Date(parseStr(detail ?? {}, "registration_checked_at")).toLocaleDateString("pt-BR")})` : ""} · Capital social {detail?.share_capital != null ? money(parseNum(detail, "share_capital")) : "não informado"} · Porte {parseStr(detail ?? {}, "company_size") || "—"}</span></div>}
              </div></div>
              {!editing && (
                <div className="erp-fieldset"><div className="erp-fieldset-head">Endereço principal</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label className="erp-label">CEP</label><input className="erp-input" value={addr.zip_code} onChange={(e) => setAddr((p) => ({ ...p, zip_code: e.target.value }))} /></div>
                  <div className="erp-field erp-c5"><label className="erp-label">Logradouro</label><input className="erp-input" value={addr.street} onChange={(e) => setAddr((p) => ({ ...p, street: e.target.value }))} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Nº</label><input className="erp-input" value={addr.number} onChange={(e) => setAddr((p) => ({ ...p, number: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Compl.</label><input className="erp-input" value={addr.complement} onChange={(e) => setAddr((p) => ({ ...p, complement: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Bairro</label><input className="erp-input" value={addr.neighborhood} onChange={(e) => setAddr((p) => ({ ...p, neighborhood: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Cidade</label><input className="erp-input" value={addr.city} onChange={(e) => setAddr((p) => ({ ...p, city: e.target.value }))} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">UF</label><input className="erp-input" maxLength={2} value={addr.uf} onChange={(e) => setAddr((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} /></div>
                  <div className="erp-field erp-c12"><span className="erp-field-hint">Preenchido ao consultar o CNPJ; salvo como endereço de cobrança padrão.</span></div>
                </div></div>
              )}
              </>
            )}

            {mode === "edit" && folder === "fiscal" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Dados fiscais</div><div className="erp-fieldset-body">
                {enumSelect("Indicador de IE", "ie_indicator", IE_INDICATORS, 4, "Vai para a NF-e (indIEDest). Contribuinte exige IE.")}
                {text("Inscrição estadual", "state_registration", 3, { placeholder: "número ou ISENTO" })}
                {text("Inscrição municipal", "municipal_registration", 3)}
                {enumSelect("Regime tributário", "tax_regime", TAX_REGIMES, 2)}
                {enumSelect("Finalidade da compra", "finalidade_compra", FINALIDADES_COMPRA, 4, "Uso, consumo ou ativo: consumidor final mesmo com IE (IPI na base do ICMS, sem diferimento).")}
                {refSelect("Tipo de imposto", "tax_type_code", refs.taxtypes)}
                {text("CNAE principal", "main_cnae", 2, { placeholder: "7 dígitos" })}
                {text("SUFRAMA", "suframa_code", 2)}
                <div className="erp-field erp-c3"><label className="erp-label">Validade SUFRAMA</label><input className="erp-input" type="date" value={form.suframa_expiry ?? ""} onChange={(e) => setF("suframa_expiry", e.target.value || undefined)} /></div>
                {text("E-mail para XML/DANFE", "nfe_email", 5, { placeholder: "nfe@cliente.com.br; outro@cliente.com.br", hint: "Separe vários com ponto e vírgula." })}
              </div></div>
            )}

            {mode === "edit" && folder === "comercial" && (
              <>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Comercial</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c4"><label className="erp-label">Representante</label><LookupField value={form.representative_code} loader={loadRepresentatives} entityLabel="representante" placeholder="Opcional" clearable onChange={(c) => setF("representative_code", c ? Number(c) : undefined)} /></div>
                {refSelect("Portador de cobrança", "carrier_code", refs.carriers)}
                {text("E-mail de cobrança", "billing_email", 4)}
                {toggle("Exige nº do pedido de compra", "requires_customer_po")}
                {toggle("Exige certificado de qualidade", "requires_quality_cert")}
                {toggle("Aceita faturamento parcial", "allows_partial_billing")}
                {text("Observação comercial", "commercial_notes", 12, { area: true, hint: "Aparece ao escolher o cliente no orçamento e no pedido." })}
                {text("Observação financeira", "financial_notes", 12, { area: true })}
                <div className="erp-field erp-c12"><span className="erp-field-hint">Condição de pagamento é negociada em cada orçamento/pedido e o preço vem da tabela de venda do item: por isso não ficam no cliente.</span></div>
              </div></div>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Logística</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c4"><label className="erp-label">Transportadora preferencial</label><LookupField value={form.shipping_carrier_id} loader={loadShippingCarriers} entityLabel="transportadora" placeholder="Opcional" clearable onChange={(c) => setF("shipping_carrier_id", c ? Number(c) : undefined)} /></div>
                {enumSelect("Tipo de frete", "freight_type", FREIGHT_TYPES, 3)}
                {text("Recebimento (horário, agendamento, restrições)", "receiving_notes", 12, { area: true, placeholder: "Ex.: recebe seg–sex 7h–16h; exige agendamento 24h antes; caminhão até 14 m" })}
              </div></div>
              </>
            )}

            {mode === "edit" && folder === "credito" && (editing && form.code
              ? <CreditoClientePanel code={form.code} currentLimit={form.credit_limit} riskClass={form.credit_risk_class}
                  expiresAt={parseStr(detail ?? {}, "credit_limit_expires_at")} expired={parseBool(detail ?? {}, "credit_limit_expired")}
                  isAdmin={isAdmin} pessoaFisica={form.document_type === "CPF"} onSaved={() => { if (form.code) void abrir(form.code, "credito"); void reload(); }} />
              : (
                <div className="erp-fieldset"><div className="erp-fieldset-head">Limite de crédito sugerido</div><div className="erp-fieldset-body">
                  {!sugestao && <div className="erp-field erp-c12"><div className="erp-note">Informe o CNPJ e clique em <strong>Consultar CNPJ</strong> (ou digite um CPF válido) para o sistema calcular o limite.</div>
                    <button className="erp-btn" style={{ marginTop: 8 }} onClick={() => void calcularSugestao()} disabled={busy}>Calcular agora</button></div>}
                  {sugestao && <div className="erp-field erp-c12">
                    <ExplicacaoDoLimite s={sugestao} pessoaFisica={form.document_type === "CPF"} />
                    <div style={{ marginTop: 14 }}>
                      <DecisaoDoLimite s={sugestao} isAdmin={isAdmin} seguir={!limiteTocado}
                        onSeguir={(v) => { setLimiteTocado(!v); if (v) setForm((p) => ({ ...p, credit_limit: sugestao.suggested_limit, credit_limit_reason: "" })); }}
                        valor={form.credit_limit == null ? "" : String(form.credit_limit)}
                        onValor={(v) => setF("credit_limit", v === "" ? undefined : Number(v))}
                        motivo={form.credit_limit_reason ?? ""} onMotivo={(v) => setF("credit_limit_reason", v)} />
                    </div>
                    <div className="erp-note" style={{ marginTop: 10 }}>O limite é gravado junto com o cadastro, ao clicar em Salvar.</div>
                  </div>}
                </div></div>
              ))}

            {mode === "edit" && folder === "enderecos" && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">{addrId ? `Alterar endereço ${addrId}` : "Novo endereço"}</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label className="erp-label">Tipo</label><select className="erp-input" value={addr.address_type} onChange={(e) => setAddr((p) => ({ ...p, address_type: e.target.value as AddressType }))}>{ADDRESS_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
                  <div className="erp-field erp-c2"><label className="erp-label">CEP</label><input className="erp-input" value={addr.zip_code} onChange={(e) => setAddr((p) => ({ ...p, zip_code: e.target.value }))} /></div>
                  <div className="erp-field erp-c5"><label className="erp-label">Logradouro</label><input className="erp-input" value={addr.street} onChange={(e) => setAddr((p) => ({ ...p, street: e.target.value }))} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Nº</label><input className="erp-input" value={addr.number} onChange={(e) => setAddr((p) => ({ ...p, number: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Compl.</label><input className="erp-input" value={addr.complement} onChange={(e) => setAddr((p) => ({ ...p, complement: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Bairro</label><input className="erp-input" value={addr.neighborhood} onChange={(e) => setAddr((p) => ({ ...p, neighborhood: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Cidade</label><input className="erp-input" value={addr.city} onChange={(e) => setAddr((p) => ({ ...p, city: e.target.value }))} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">UF</label><input className="erp-input" maxLength={2} value={addr.uf} onChange={(e) => setAddr((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Padrão</label><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={addr.is_default} onChange={(e) => setAddr((p) => ({ ...p, is_default: e.target.checked }))} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label></div></div>
                  <div className="erp-field erp-c12" style={{ display: "flex", gap: 6, flexDirection: "row" }}>
                    <button className="erp-btn erp-btn-primary" onClick={() => void salvarEndereco()} disabled={busy}>{addrId ? "Salvar alteração" : "Incluir endereço"}</button>
                    {addrId && <button className="erp-btn" onClick={() => { setAddrId(null); setAddr(EMPTY_ADDR); }}>Cancelar</button>}
                  </div>
                </div></div>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Endereços cadastrados</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <table className="erp-grid"><thead><tr><th>Tipo</th><th>Logradouro</th><th>Cidade</th><th>UF</th><th>Padrão</th><th style={{ width: 150 }} /></tr></thead><tbody>
                    {rows("addresses").length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum endereço.</td></tr>}
                    {rows("addresses").map((a) => {
                      const id = parseNum(a, "id");
                      return <tr key={id}><td>{enumLabel(parseStr(a, "address_type"))}</td><td>{parseStr(a, "street")}, {parseStr(a, "number")}</td><td>{parseStr(a, "city")}</td><td>{parseStr(a, "uf")}</td><td>{parseBool(a, "is_default") ? "Sim" : ""}</td>
                        <td><div style={{ display: "flex", gap: 6 }}>
                          <button className="erp-btn erp-btn-sm" onClick={() => { setAddrId(id); setAddr({ address_type: (parseStr(a, "address_type") || "COBRANCA") as AddressType, zip_code: parseStr(a, "zip_code"), street: parseStr(a, "street"), number: parseStr(a, "number"), complement: parseStr(a, "complement"), neighborhood: parseStr(a, "neighborhood"), city: parseStr(a, "city"), uf: parseStr(a, "uf"), country: parseStr(a, "country") || "Brasil", is_default: parseBool(a, "is_default") }); }}>Editar</button>
                          <button className="erp-btn erp-btn-sm" onClick={() => void excluirEndereco(id)} disabled={busy}>Excluir</button></div></td></tr>;
                    })}
                  </tbody></table>
                </div></div></div>
              </>
            )}

            {mode === "edit" && folder === "contatos" && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">{contactId ? `Alterar contato ${contactId}` : "Novo contato"}</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Nome</label><input className="erp-input" value={contact.name} onChange={(e) => setContact((p) => ({ ...p, name: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Tipo de contato</label><select className="erp-input" value={contact.contact_type_code} onChange={(e) => setContact((p) => ({ ...p, contact_type_code: e.target.value }))}><option value="">—</option>{refs.contactTypes.map((type) => <option key={type.code} value={type.code}>{type.code} · {type.description}</option>)}</select></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Cargo</label><input className="erp-input" value={contact.position} onChange={(e) => setContact((p) => ({ ...p, position: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">E-mail</label><input className="erp-input" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Telefone</label><input className="erp-input" value={contact.phone} onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Celular</label><input className="erp-input" value={contact.mobile} onChange={(e) => setContact((p) => ({ ...p, mobile: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Principal</label><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={contact.is_primary} onChange={(e) => setContact((p) => ({ ...p, is_primary: e.target.checked }))} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label></div></div>
                  <div className="erp-field erp-c4" style={{ display: "flex", gap: 6, flexDirection: "row", alignItems: "flex-end" }}>
                    <button className="erp-btn erp-btn-primary" onClick={() => void salvarContato()} disabled={busy}>{contactId ? "Salvar alteração" : "+ Contato"}</button>
                    {contactId && <button className="erp-btn" onClick={() => { setContactId(null); setContact(EMPTY_CONTACT); }}>Cancelar</button>}
                  </div>
                </div></div>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Contatos cadastrados</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <table className="erp-grid"><thead><tr><th>Nome</th><th>Cargo</th><th>E-mail</th><th>Telefone</th><th style={{ width: 150 }} /></tr></thead><tbody>
                    {rows("contacts").length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum contato.</td></tr>}
                    {rows("contacts").map((c) => {
                      const id = parseNum(c, "id");
                      const tipoCodigo = parseNum(c, "contact_type_code");
                      return <tr key={id}><td style={{ fontWeight: 600 }}>{parseStr(c, "name")}{parseBool(c, "is_primary") && <> <span className="erp-badge info">principal</span></>}</td><td>{parseStr(c, "position")}</td><td>{parseStr(c, "email")}</td><td>{parseStr(c, "phone") || parseStr(c, "mobile")}</td>
                        <td><div style={{ display: "flex", gap: 6 }}>
                          <button className="erp-btn erp-btn-sm" onClick={() => { setContactId(id); setContact({ contact_type_code: tipoCodigo ? String(tipoCodigo) : "", name: parseStr(c, "name"), email: parseStr(c, "email"), phone: parseStr(c, "phone"), mobile: parseStr(c, "mobile"), position: parseStr(c, "position"), is_primary: parseBool(c, "is_primary") }); }}>Editar</button>
                          <button className="erp-btn erp-btn-sm" onClick={() => void excluirContato(id)} disabled={busy}>Excluir</button></div></td></tr>;
                    })}
                  </tbody></table>
                </div></div></div>
              </>
            )}

            {mode === "edit" && folder === "visao" && form.code && <VisaoClientePanel code={form.code} />}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Clientes: <strong>{list.length}</strong></div>{form.code && mode === "edit" && <div className="erp-status-item">Editando: <strong>{form.code}</strong></div>}
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
