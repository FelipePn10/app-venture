import { useState, useCallback, useEffect } from "react";
import {
  type CustomerDTO, type SupportRef, type CustomerDocType, type PaymentCondVisibility, type AddressType,
  DOC_TYPES, VISIBILITIES, ADDRESS_TYPES,
  listRefs, listCustomers, getCustomer, createCustomer, updateCustomer, blockCustomer, unblockCustomer,
  addCustomerAddress, addCustomerContact, listEstablishments, lookupCnpj, exportCustomers,
} from "@/services/customerService";
import { errMessage, type Obj, parseStr, parseNum } from "@/services/fiscalShared";
import { validateCNPJOrCPF } from "@/utils/validation";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Mode = "list" | "edit";
type Folder = "dados" | "enderecos" | "contatos";
const SYS = "00000000-0000-0000-0000-000000000000";
const EMPTY: CustomerDTO = { name: "", document_type: "CNPJ", document_number: "", payment_cond_visibility: "SOMENTE_VINCULADOS", is_corporate: false };

interface Refs { regions: SupportRef[]; segments: SupportRef[]; ctypes: SupportRef[]; payconds: SupportRef[]; tables: SupportRef[]; carriers: SupportRef[]; cgroups: SupportRef[]; invtypes: SupportRef[]; taxtypes: SupportRef[]; }
const EMPTY_REFS: Refs = { regions: [], segments: [], ctypes: [], payconds: [], tables: [], carriers: [], cgroups: [], invtypes: [], taxtypes: [] };

export function Vcli0500Page(): JSX.Element {
  const [mode, setMode] = useState<Mode>("list");
  const [folder, setFolder] = useState<Folder>("dados");
  const [list, setList] = useState<CustomerDTO[]>([]);
  const [refs, setRefs] = useState<Refs>(EMPTY_REFS);
  const [form, setForm] = useState<CustomerDTO>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [detail, setDetail] = useState<Obj | null>(null);
  const [estabs, setEstabs] = useState<CustomerDTO[]>([]);
  const [addr, setAddr] = useState({ address_type: "COBRANCA" as AddressType, zip_code: "", street: "", number: "", complement: "", neighborhood: "", city: "", uf: "", country: "Brasil", is_default: true });
  const [contact, setContact] = useState({ contact_type_code: "", name: "", email: "", phone: "", mobile: "", position: "", is_primary: true });
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      const [cs, regions, segments, ctypes, payconds, tables, carriers, cgroups, invtypes, taxtypes] = await Promise.all([
        listCustomers(),
        listRefs("regions").catch(() => []), listRefs("market-segments").catch(() => []), listRefs("customer-types").catch(() => []),
        listRefs("payment-conditions").catch(() => []), listRefs("sales-tables").catch(() => []), listRefs("carriers").catch(() => []),
        listRefs("carrier-groups").catch(() => []), listRefs("invoice-types").catch(() => []), listRefs("tax-types").catch(() => []),
      ]);
      setList(cs); setRefs({ regions, segments, ctypes, payconds, tables, carriers, cgroups, invtypes, taxtypes });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar clientes.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof CustomerDTO>(k: K, v: CustomerDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() { setForm(EMPTY); setEditing(false); setDetail(null); setEstabs([]); setFolder("dados"); setMode("edit"); setFeedback(null); }

  async function buscarCnpj() {
    if (form.document_type !== "CNPJ") { setFeedback({ type: "error", message: "Auto-fill disponível apenas para CNPJ." }); return; }
    const digits = (form.document_number ?? "").replace(/\D/g, "");
    if (digits.length !== 14) { setFeedback({ type: "error", message: "Informe um CNPJ com 14 dígitos." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const c = await lookupCnpj(digits);
      setForm((p) => ({
        ...p,
        name: c.legal_name || p.name,
        trade_name: c.trade_name || p.trade_name,
        state_registration: c.state_registration || p.state_registration,
        website: p.website,
      }));
      setFeedback({ type: "success", message: `Dados da Receita carregados (${c.registration_status ?? "OK"}). Confira antes de salvar.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function exportar(fmt: "xlsx" | "pdf" | "csv") {
    setBusy(true); setFeedback(null);
    try { await exportCustomers(fmt); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function abrir(code: number) {
    setBusy(true); setFeedback(null);
    try {
      const raw = await getCustomer(code); setDetail(raw);
      const p = raw as Obj;
      setForm({
        ...EMPTY, code,
        corporate_code: parseNum(p, "corporate_code", "CorporateCode"),
        is_corporate: (p.is_corporate ?? p.IsCorporate) as boolean ?? false,
        name: parseStr(p, "name", "Name"), trade_name: parseStr(p, "trade_name", "TradeName"),
        document_type: (parseStr(p, "document_type", "DocumentType") || "CNPJ") as CustomerDocType,
        document_number: parseStr(p, "document_number", "DocumentNumber"),
        state_registration: parseStr(p, "state_registration", "StateRegistration"),
        municipal_registration: parseStr(p, "municipal_registration", "MunicipalRegistration"),
        suframa_code: parseStr(p, "suframa_code", "SuframaCode"),
        region_code: parseNum(p, "region_code", "RegionCode", "region_id", "RegionID"), market_segment_code: parseNum(p, "market_segment_code", "MarketSegmentCode", "market_segment_id", "MarketSegmentID"),
        customer_type_code: parseNum(p, "customer_type_code", "CustomerTypeCode", "customer_type_id", "CustomerTypeID"), payment_condition_code: parseNum(p, "payment_condition_code", "PaymentConditionCode", "payment_condition_id", "PaymentConditionID"),
        sales_table_code: parseNum(p, "sales_table_code", "SalesTableCode", "sales_table_id", "SalesTableID"), carrier_code: parseNum(p, "carrier_code", "CarrierCode", "carrier_id", "CarrierID"),
        carrier_group_code: parseNum(p, "carrier_group_code", "CarrierGroupCode", "carrier_group_id", "CarrierGroupID"), invoice_type_code: parseNum(p, "invoice_type_code", "InvoiceTypeCode", "invoice_type_id", "InvoiceTypeID"),
        tax_type_code: parseNum(p, "tax_type_code", "TaxTypeCode", "tax_type_id", "TaxTypeID"),
        payment_cond_visibility: (parseStr(p, "payment_cond_visibility", "PaymentCondVisibility") || "SOMENTE_VINCULADOS") as PaymentCondVisibility,
        credit_limit: parseNum(p, "credit_limit", "CreditLimit"), website: parseStr(p, "website", "Website"),
        blocked: (p.blocked ?? p.Blocked) as boolean ?? false,
      });
      setEditing(true); setFolder("dados"); setMode("edit");
      const isCorp = (p.is_corporate ?? p.IsCorporate) as boolean;
      setEstabs(isCorp ? await listEstablishments(code).catch(() => []) : []);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  function validar(): string | null {
    if (!editing && !form.code) return "Código do cliente é obrigatório na criação.";
    if (!form.name.trim()) return "Razão social / nome é obrigatório.";
    if (!form.document_number.trim()) return "Documento é obrigatório.";
    if ((form.document_type === "CNPJ" || form.document_type === "CPF") && !validateCNPJOrCPF(form.document_number)) return "CNPJ/CPF inválido (dígito verificador não confere).";
    return null;
  }
  async function salvar() {
    const err = validar(); if (err) { setFeedback({ type: "error", message: err }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editing) { await updateCustomer(form); setFeedback({ type: "success", message: "Cliente atualizado." }); await reload(); }
      else { const c = await createCustomer({ ...form, created_by: SYS }); if (c?.code) { setFeedback({ type: "success", message: `Cliente ${c.code} criado.` }); await reload(); await abrir(c.code); return; } }
    } catch (e) {
      const msg = errMessage(e);
      setFeedback({ type: "error", message: /409|conflit|duplicad/i.test(msg) ? `Documento já cadastrado. ${msg}` : msg });
    } finally { setBusy(false); }
  }
  async function toggleBlock() {
    if (!form.code) return;
    setBusy(true); setFeedback(null);
    try {
      if (form.blocked) { await unblockCustomer(form.code); setFeedback({ type: "success", message: "Cliente desbloqueado." }); }
      else { const r = window.prompt("Motivo do bloqueio:"); if (r === null) { setBusy(false); return; } await blockCustomer(form.code, r); setFeedback({ type: "success", message: "Cliente bloqueado." }); }
      await abrir(form.code); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function salvarEndereco() {
    if (!form.code) return;
    setBusy(true); setFeedback(null);
    try { await addCustomerAddress(form.code, { customer_code: form.code, ...addr }); setFeedback({ type: "success", message: "Endereço salvo." }); await abrir(form.code); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function salvarContato() {
    if (!form.code) return;
    if (!contact.name.trim()) { setFeedback({ type: "error", message: "Nome do contato é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    try { await addCustomerContact(form.code, { customer_code: form.code, name: contact.name, email: contact.email, phone: contact.phone, mobile: contact.mobile, position: contact.position, is_primary: contact.is_primary, contact_type_code: contact.contact_type_code ? Number(contact.contact_type_code) : undefined }); setFeedback({ type: "success", message: "Contato salvo." }); await abrir(form.code); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const rows = (key: string): Obj[] => {
    if (!detail) return [];
    const want = key.toLowerCase().replace(/_/g, "");
    for (const k of Object.keys(detail)) if (k.toLowerCase().replace(/_/g, "") === want && Array.isArray(detail[k])) return detail[k] as Obj[];
    return [];
  };
  const refSelect = (label: string, k: keyof CustomerDTO, opts: SupportRef[], col = 4) => (
    <div className={`erp-field erp-c${col}`}><label className="erp-label">{label}</label>
      <select className="erp-input" value={(form[k] as number | undefined) ?? ""} onChange={(e) => setF(k, (e.target.value ? Number(e.target.value) : undefined) as CustomerDTO[typeof k])}>
        <option value="">—</option>{opts.map((o) => <option key={o.code} value={o.code}>{o.code} · {o.description}</option>)}</select></div>
  );

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
          <button className="erp-btn" onClick={() => { setMode("list"); void reload(); }} disabled={busy}>Listagem</button></div>
        {mode === "edit" && (
          <div className="erp-tgroup"><span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : editing ? "Atualizar" : "Salvar"}</button>
            {form.code && <button className="erp-btn" onClick={() => void toggleBlock()} disabled={busy}>{form.blocked ? "Desbloquear" : "Bloquear"}</button>}
          </div>
        )}
        <div className="erp-tgroup"><span className="erp-tgroup-label">Exportar lista</span>
          <button className="erp-btn" onClick={() => void exportar("xlsx")} disabled={busy}>Excel</button>
          <button className="erp-btn" onClick={() => void exportar("pdf")} disabled={busy}>PDF</button>
          <button className="erp-btn" onClick={() => void exportar("csv")} disabled={busy}>CSV</button></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VCLI0500 — Cadastro de Cliente" filename="vcli0500" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            {mode === "list"
              ? <button className="erp-tab active">Listagem</button>
              : <>
                  <button className={`erp-tab ${folder === "dados" ? "active" : ""}`} onClick={() => setFolder("dados")}>Dados</button>
                  <button className={`erp-tab ${folder === "enderecos" ? "active" : ""}`} onClick={() => setFolder("enderecos")} disabled={!form.code}>Endereços</button>
                  <button className={`erp-tab ${folder === "contatos" ? "active" : ""}`} onClick={() => setFolder("contatos")} disabled={!form.code}>Contatos</button>
                </>}
          </div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {mode === "list" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Clientes ({list.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>Código</th><th>Razão social</th><th>Documento</th><th>Situação</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                  <tbody>
                    {list.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum cliente.</td></tr>}
                    {list.map((c) => (
                      <tr key={c.code}><td style={{ fontWeight: 600 }}>{c.code}</td><td>{c.name}<br /><small style={{ color: "#8aa894" }}>{c.trade_name}</small></td>
                        <td>{c.document_number}</td><td>{c.blocked ? <span className="erp-badge err">Bloqueado</span> : <span className="erp-badge ok">Ativo</span>}</td>
                        <td><button className="erp-btn erp-btn-sm" onClick={() => c.code && void abrir(c.code)}>Abrir</button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div></div></div>
            )}

            {mode === "edit" && folder === "dados" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Dados do cliente</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label">Código</label><input className="erp-input num" type="number" value={form.code ?? ""} disabled={editing} onChange={(e) => setF("code", e.target.value ? Number(e.target.value) : undefined)} /></div>
                <div className="erp-field erp-c6"><label className="erp-label erp-req">Razão social / Nome</label><input className="erp-input" value={form.name} onChange={(e) => setF("name", e.target.value)} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Fantasia</label><input className="erp-input" value={form.trade_name ?? ""} onChange={(e) => setF("trade_name", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Tipo doc.</label><select className="erp-input" value={form.document_type} onChange={(e) => setF("document_type", e.target.value as CustomerDocType)}>{DOC_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
                <div className="erp-field erp-c3"><label className="erp-label erp-req">CNPJ/CPF</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input className="erp-input" value={form.document_number} onChange={(e) => setF("document_number", e.target.value)} />
                    {form.document_type === "CNPJ" && <button className="erp-btn" style={{ whiteSpace: "nowrap" }} onClick={() => void buscarCnpj()} disabled={busy} title="Preencher pela Receita">🔎 CNPJ</button>}
                  </div>
                  {form.document_number.trim() && (form.document_type === "CNPJ" || form.document_type === "CPF") && (<span className="erp-field-hint" style={{ color: validateCNPJOrCPF(form.document_number) ? "#1e6030" : "#b91c1c" }}>{validateCNPJOrCPF(form.document_number) ? "✓ válido" : "✗ inválido"}</span>)}</div>
                <div className="erp-field erp-c2"><label className="erp-label">Inscr. Estadual</label><input className="erp-input" value={form.state_registration ?? ""} onChange={(e) => setF("state_registration", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Insc. Municipal</label><input className="erp-input" value={form.municipal_registration ?? ""} onChange={(e) => setF("municipal_registration", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">SUFRAMA</label><input className="erp-input" value={form.suframa_code ?? ""} onChange={(e) => setF("suframa_code", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Matriz (cód.)</label><input className="erp-input num" type="number" value={form.corporate_code ?? ""} onChange={(e) => setF("corporate_code", e.target.value ? Number(e.target.value) : undefined)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">É matriz</label><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={!!form.is_corporate} onChange={(e) => setF("is_corporate", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">{form.is_corporate ? "Sim" : "Não"}</span></div></div>
                {refSelect("Região", "region_code", refs.regions)}
                {refSelect("Segmento", "market_segment_code", refs.segments)}
                {refSelect("Tipo de Cliente", "customer_type_code", refs.ctypes)}
                {refSelect("Cond. Pagamento", "payment_condition_code", refs.payconds)}
                {refSelect("Tabela de Vendas", "sales_table_code", refs.tables)}
                {refSelect("Portador", "carrier_code", refs.carriers)}
                {refSelect("Grupo Portadores", "carrier_group_code", refs.cgroups)}
                {refSelect("Tipo de NF", "invoice_type_code", refs.invtypes)}
                {refSelect("Tipo de Imposto", "tax_type_code", refs.taxtypes)}
                <div className="erp-field erp-c4"><label className="erp-label">Visib. cond. pagto</label><select className="erp-input" value={form.payment_cond_visibility} onChange={(e) => setF("payment_cond_visibility", e.target.value as PaymentCondVisibility)}>{VISIBILITIES.map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
                <div className="erp-field erp-c3"><label className="erp-label">Limite de crédito</label><input className="erp-input num" type="number" step="0.01" value={form.credit_limit ?? ""} onChange={(e) => setF("credit_limit", e.target.value ? Number(e.target.value) : undefined)} /></div>
                <div className="erp-field erp-c5"><label className="erp-label">Website</label><input className="erp-input" value={form.website ?? ""} onChange={(e) => setF("website", e.target.value)} /></div>
                {estabs.length > 0 && <div className="erp-field erp-c12"><span className="erp-field-hint">Filiais: {estabs.map((e) => `${e.code} ${e.name}`).join(" · ")}</span></div>}
              </div></div>
            )}

            {mode === "edit" && folder === "enderecos" && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Novo endereço</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label className="erp-label">Tipo</label><select className="erp-input" value={addr.address_type} onChange={(e) => setAddr((p) => ({ ...p, address_type: e.target.value as AddressType }))}>{ADDRESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="erp-field erp-c2"><label className="erp-label">CEP</label><input className="erp-input" value={addr.zip_code} onChange={(e) => setAddr((p) => ({ ...p, zip_code: e.target.value }))} /></div>
                  <div className="erp-field erp-c5"><label className="erp-label">Logradouro</label><input className="erp-input" value={addr.street} onChange={(e) => setAddr((p) => ({ ...p, street: e.target.value }))} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Nº</label><input className="erp-input" value={addr.number} onChange={(e) => setAddr((p) => ({ ...p, number: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Compl.</label><input className="erp-input" value={addr.complement} onChange={(e) => setAddr((p) => ({ ...p, complement: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Bairro</label><input className="erp-input" value={addr.neighborhood} onChange={(e) => setAddr((p) => ({ ...p, neighborhood: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Cidade</label><input className="erp-input" value={addr.city} onChange={(e) => setAddr((p) => ({ ...p, city: e.target.value }))} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">UF</label><input className="erp-input" maxLength={2} value={addr.uf} onChange={(e) => setAddr((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Padrão</label><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={addr.is_default} onChange={(e) => setAddr((p) => ({ ...p, is_default: e.target.checked }))} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label></div></div>
                  <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={() => void salvarEndereco()} disabled={busy}>Salvar endereço</button></div>
                </div></div>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Endereços cadastrados</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <table className="erp-grid"><thead><tr><th>Tipo</th><th>Logradouro</th><th>Cidade</th><th>UF</th></tr></thead><tbody>
                    {rows("addresses").length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum endereço.</td></tr>}
                    {rows("addresses").map((a, i) => <tr key={i}><td>{parseStr(a, "address_type", "AddressType")}</td><td>{parseStr(a, "street", "Street")}, {parseStr(a, "number", "Number")}</td><td>{parseStr(a, "city", "City")}</td><td>{parseStr(a, "uf", "UF")}</td></tr>)}
                  </tbody></table>
                </div></div></div>
              </>
            )}

            {mode === "edit" && folder === "contatos" && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Novo contato</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Nome</label><input className="erp-input" value={contact.name} onChange={(e) => setContact((p) => ({ ...p, name: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Tipo contato (cód.)</label><input className="erp-input num" type="number" value={contact.contact_type_code} onChange={(e) => setContact((p) => ({ ...p, contact_type_code: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Cargo</label><input className="erp-input" value={contact.position} onChange={(e) => setContact((p) => ({ ...p, position: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">E-mail</label><input className="erp-input" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Telefone</label><input className="erp-input" value={contact.phone} onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Celular</label><input className="erp-input" value={contact.mobile} onChange={(e) => setContact((p) => ({ ...p, mobile: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Principal</label><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={contact.is_primary} onChange={(e) => setContact((p) => ({ ...p, is_primary: e.target.checked }))} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label></div></div>
                  <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void salvarContato()} disabled={busy}>+ Contato</button></div>
                </div></div>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Contatos cadastrados</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <table className="erp-grid"><thead><tr><th>Nome</th><th>Cargo</th><th>E-mail</th><th>Telefone</th></tr></thead><tbody>
                    {rows("contacts").length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum contato.</td></tr>}
                    {rows("contacts").map((c, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{parseStr(c, "name", "Name")}</td><td>{parseStr(c, "position", "Position")}</td><td>{parseStr(c, "email", "Email")}</td><td>{parseStr(c, "phone", "Phone")}</td></tr>)}
                  </tbody></table>
                </div></div></div>
              </>
            )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Clientes: <strong>{list.length}</strong></div>{form.code && <div className="erp-status-item">Editando: <strong>{form.code}</strong></div>}
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
