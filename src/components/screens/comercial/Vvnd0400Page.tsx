import { useState, useCallback, useMemo, useEffect } from "react";
import {
  type RepresentativeDTO,
  type RepresentativeTypeDTO,
  listRepresentatives,
  getRepresentative,
  createRepresentative,
  updateRepresentative,
  blockRepresentative,
  unblockRepresentative,
  getRepresentativeReport,
  getRepresentativeFollowUp,
  listRepresentativeTypes,
  createRepresentativeType,
  addRepresentativeFolder,
} from "@/services/representativeService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type View = "reps" | "types";
type DetailTab = "dados" | "empresas" | "contatos";
const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_REP: RepresentativeDTO = { name: "", document_number: "", register_date: today(), device_quantity: 0, is_active: true };
const EMPTY_TYPE: RepresentativeTypeDTO = { description: "", is_free: false, ignores_direct_billing: false };

export function Vvnd0400Page(): JSX.Element {
  const [view, setView] = useState<View>("reps");
  const [reps, setReps] = useState<RepresentativeDTO[]>([]);
  const [types, setTypes] = useState<RepresentativeTypeDTO[]>([]);
  const [selected, setSelected] = useState<RepresentativeDTO | null>(null);
  const [form, setForm] = useState<RepresentativeDTO>(EMPTY_REP);
  const [typeForm, setTypeForm] = useState<RepresentativeTypeDTO>(EMPTY_TYPE);
  const [phone, setPhone] = useState({ ddd: "", phone: "", phone_type: "COMMERCIAL" });
  const [email, setEmail] = useState("");
  const [enterprise, setEnterprise] = useState({ enterprise_code: "", commission_pct: "" });
  const [filterState, setFilterState] = useState("");
  const [filterActive, setFilterActive] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ALL");
  const [listSearch, setListSearch] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<DetailTab>("dados");
  const [creating, setCreating] = useState(true);

  const setR = useCallback(<K extends keyof RepresentativeDTO>(k: K, v: RepresentativeDTO[K]) => setForm((p) => ({ ...p, [k]: v })), []);
  const setT = useCallback(<K extends keyof RepresentativeTypeDTO>(k: K, v: RepresentativeTypeDTO[K]) => setTypeForm((p) => ({ ...p, [k]: v })), []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregarTipos = useCallback(() => run(async () => { setTypes(await listRepresentativeTypes()); }), [run]);
  useEffect(() => { void carregarTipos(); }, [carregarTipos]);

  const refreshSelected = useCallback(async (code: number) => { setSelected(await getRepresentative(code)); }, []);

  const listar = () => run(async () => {
    setReps(await listRepresentatives({ state: filterState || undefined, active_status: filterActive }));
  });
  const novo = () => { setCreating(true); setSelected(null); setForm(EMPTY_REP); setTab("dados"); setFeedback(null); };
  const abrir = (code?: number) => { if (!code) return; setCreating(false); setTab("dados"); void run(async () => { await refreshSelected(code); }); };

  const criar = () => run(async () => {
    if (!form.name.trim() || !form.document_number.trim()) { setFeedback({ type: "error", message: "Nome e documento são obrigatórios." }); return; }
    const created = await createRepresentative({ ...form, register_date: form.register_date || today(), state: form.state?.toUpperCase() });
    setForm(EMPTY_REP); await listar();
    if (created.code) { setCreating(false); await refreshSelected(created.code); }
    setFeedback({ type: "success", message: `Representante ${created.code} cadastrado.` });
  });
  const salvarEdicao = () => { const code = selected?.code; if (!code) return; void run(async () => {
    await updateRepresentative(code, { ...selected!, state: selected!.state?.toUpperCase() });
    await refreshSelected(code);
    setFeedback({ type: "success", message: "Cadastro atualizado." });
  }); };

  const bloquear = (code?: number) => { if (!code) return; const reason = window.prompt("Motivo do bloqueio:"); if (!reason) return;
    void run(async () => { await blockRepresentative(code, reason); await refreshSelected(code); setFeedback({ type: "success", message: `Representante ${code} bloqueado.` }); });
  };
  const desbloquear = (code?: number) => { if (code) void run(async () => { await unblockRepresentative(code); await refreshSelected(code); setFeedback({ type: "success", message: `Representante ${code} desbloqueado.` }); }); };

  const relatorio = () => run(async () => {
    const rows = await getRepresentativeReport({ state: filterState || undefined, active_status: filterActive, sort_by: "NAME", with_accounts: true });
    setSummary(`Relatório cadastral: ${rows.length} representante(s) na abrangência filtrada.`);
    setFeedback({ type: "info", message: "Relatório cadastral gerado (veja a barra de status)." });
  });
  const followUp = () => run(async () => {
    const code = selected?.code;
    const rows = await getRepresentativeFollowUp(code ? { representative_codes: String(code) } : {});
    setSummary(`Follow-up comercial: ${rows.length} linha(s) de acompanhamento (orçamentos/pedidos).`);
    setFeedback({ type: "info", message: "Ficha de acompanhamento carregada (veja a barra de status)." });
  });

  const criarTipo = () => run(async () => {
    if (!typeForm.description.trim()) { setFeedback({ type: "error", message: "Descrição do tipo é obrigatória." }); return; }
    await createRepresentativeType(typeForm); setTypeForm(EMPTY_TYPE); await carregarTipos();
    setFeedback({ type: "success", message: "Tipo de representante criado." });
  });

  const addTelefone = () => { const code = selected?.code; if (!code) return; void run(async () => {
    if (!phone.phone.trim()) { setFeedback({ type: "error", message: "Informe o número." }); return; }
    await addRepresentativeFolder("phones", { representative_code: code, ddd: phone.ddd || null, phone: phone.phone, phone_type: phone.phone_type, ranking: 1 } as Obj);
    setPhone({ ddd: "", phone: "", phone_type: "COMMERCIAL" }); await refreshSelected(code);
    setFeedback({ type: "success", message: "Telefone adicionado." });
  }); };
  const addEmail = () => { const code = selected?.code; if (!code) return; void run(async () => {
    if (!email.trim()) { setFeedback({ type: "error", message: "Informe o e-mail." }); return; }
    await addRepresentativeFolder("emails", { representative_code: code, email, ranking: 1 } as Obj);
    setEmail(""); await refreshSelected(code);
    setFeedback({ type: "success", message: "E-mail adicionado." });
  }); };
  const addEmpresa = () => { const code = selected?.code; if (!code) return; void run(async () => {
    if (!enterprise.enterprise_code) { setFeedback({ type: "error", message: "Informe o estabelecimento." }); return; }
    await addRepresentativeFolder("enterprises", { representative_code: code, enterprise_code: Number(enterprise.enterprise_code), commission_pct: Number(enterprise.commission_pct) || 0, is_default: false, is_active: true } as Obj);
    setEnterprise({ enterprise_code: "", commission_pct: "" }); await refreshSelected(code);
    setFeedback({ type: "success", message: "Empresa de atuação vinculada." });
  }); };

  const visible = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return reps;
    return reps.filter((r) => String(r.code ?? "").includes(q) || (r.name ?? "").toLowerCase().includes(q) || (r.document_number ?? "").includes(q));
  }, [reps, listSearch]);

  const typeLabel = (c?: number) => types.find((t) => t.code === c)?.description ?? (c ? `#${c}` : "—");

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Representantes</span>
          <span className="erp-crumb-code">VVND0400</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Cadastro · comissão · território · carteira</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className={`erp-btn${view === "reps" ? " erp-btn-dark" : ""}`} onClick={() => setView("reps")} disabled={busy}>Representantes</button>
          <button className={`erp-btn${view === "types" ? " erp-btn-dark" : ""}`} onClick={() => setView("types")} disabled={busy}>Tipos</button>
        </div>
        {view === "reps" && <>
          <div className="erp-tspacer" />
          <div className="erp-tgroup">
            <button className="erp-btn erp-btn-primary" onClick={novo} disabled={busy}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Novo representante
            </button>
          </div>
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Cadastro</span>
            {selected?.is_blocked
              ? <button className="erp-btn" onClick={() => desbloquear(selected?.code)} disabled={busy}>Desbloquear</button>
              : <button className="erp-btn erp-btn-danger" onClick={() => bloquear(selected?.code)} disabled={busy || !selected}>Bloquear</button>}
          </div>
          <div className="erp-tspacer" />
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Filtrar</span>
            <input className="erp-tinput" style={{ width: 56 }} placeholder="UF" maxLength={2} value={filterState} onChange={(e) => setFilterState(e.target.value.toUpperCase())} />
            <select className="erp-tselect" style={{ width: 120 }} value={filterActive} onChange={(e) => setFilterActive(e.target.value as "ACTIVE" | "INACTIVE" | "ALL")}>
              <option value="ALL">Todos</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option>
            </select>
            <button className="erp-btn" onClick={listar} disabled={busy}>Listar</button>
            <button className="erp-btn" onClick={relatorio} disabled={busy}>Relatório</button>
            <button className="erp-btn" onClick={followUp} disabled={busy}>Follow-up</button>
          </div>
        </>}
        <div className="erp-tgroup"><ExportButton title="VVND0400 — Representantes" filename="vvnd0400" /></div>
      </div>

      <div className="erp-content">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

      {view === "types" ? (
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Tipos de representante</span><span className="erp-count">{types.length}</span></div>
            <div className="erp-list">
              {types.length === 0 && <div className="erp-list-empty">Nenhum tipo cadastrado.</div>}
              {types.map((t) => (
                <div key={t.code} className="erp-list-row" style={{ cursor: "default" }}>
                  <span className="erp-list-code">#{t.code}</span>
                  <span className="erp-list-sub">{t.description}</span>
                  <div className="erp-list-meta">
                    {t.is_free && <span className="erp-badge info">Livre</span>}
                    {t.ignores_direct_billing && <span className="erp-badge warn">Ignora fat. direto</span>}
                  </div>
                </div>
              ))}
            </div>
          </aside>
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Novo tipo</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Tipo de representante</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={typeForm.description} onChange={(e) => setT("description", e.target.value)} /></div>
                  <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="tfree" className="erp-check" type="checkbox" checked={!!typeForm.is_free} onChange={(e) => setT("is_free", e.target.checked)} /><label htmlFor="tfree" className="erp-label" style={{ margin: 0 }}>Disponível sem restrição</label></div>
                  <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="tidb" className="erp-check" type="checkbox" checked={!!typeForm.ignores_direct_billing} onChange={(e) => setT("ignores_direct_billing", e.target.checked)} /><label htmlFor="tidb" className="erp-label" style={{ margin: 0 }}>Ignora faturamento direto</label></div>
                  <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn erp-btn-primary" onClick={criarTipo} disabled={busy}>{busy && <span className="erp-spin" />}Criar tipo</button></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Representantes</span>
              <span className="erp-count">{visible.length}</span>
              <div className="erp-panel-head-spacer" />
              <input className="erp-search" placeholder="Buscar…" value={listSearch} onChange={(e) => setListSearch(e.target.value)} />
            </div>
            <div className="erp-list">
              {visible.length === 0 && <div className="erp-list-empty">Nenhum representante carregado.<br />Use <strong>Listar</strong> na barra acima.</div>}
              {visible.map((r) => (
                <div key={r.code} className={`erp-list-row${selected?.code === r.code ? " sel" : ""}`} onClick={() => abrir(r.code)}>
                  <span className="erp-list-code">#{r.code}</span>
                  <span className="erp-list-sub">{r.name}</span>
                  <div className="erp-list-meta">
                    <span className="erp-badge info">{typeLabel(r.type_code)}</span>
                    {r.state && <span className="erp-badge">{r.state}</span>}
                    {r.is_blocked && <span className="erp-badge err">Bloqueado</span>}
                    {r.is_active === false && <span className="erp-badge warn">Inativo</span>}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            {creating ? (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Novo representante</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Identificação</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c5"><label className="erp-label erp-req">Nome</label><input className="erp-input" value={form.name} onChange={(e) => setR("name", e.target.value)} /></div>
                      <div className="erp-field erp-c4"><label className="erp-label">Nome fantasia</label><input className="erp-input" value={form.trade_name ?? ""} onChange={(e) => setR("trade_name", e.target.value)} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label erp-req">Documento (CPF/CNPJ)</label><input className="erp-input" value={form.document_number} onChange={(e) => setR("document_number", e.target.value)} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Tipo</label>
                        <select className="erp-input" value={form.type_code ?? ""} onChange={(e) => setR("type_code", e.target.value ? Number(e.target.value) : undefined)}>
                          <option value="">—</option>
                          {types.map((t) => <option key={t.code} value={t.code}>{t.description}</option>)}
                        </select>
                      </div>
                      <div className="erp-field erp-c3"><label className="erp-label erp-req">Data de cadastro</label><input className="erp-input" type="date" value={form.register_date ?? ""} onChange={(e) => setR("register_date", e.target.value)} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">UF</label><input className="erp-input" maxLength={2} value={form.state ?? ""} onChange={(e) => setR("state", e.target.value.toUpperCase())} /></div>
                      <div className="erp-field erp-c4"><label className="erp-label">Cidade</label><input className="erp-input" value={form.city ?? ""} onChange={(e) => setR("city", e.target.value)} /></div>
                    </div>
                  </div>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Vínculos (opcional)</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="iscust" className="erp-check" type="checkbox" checked={!!form.is_customer} onChange={(e) => setR("is_customer", e.target.checked)} /><label htmlFor="iscust" className="erp-label" style={{ margin: 0 }}>É cliente</label></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Cliente vinculado</label><LookupField value={form.customer_code} loader={loadCustomers} entityLabel="cliente" placeholder="Nenhum" onChange={(c) => setR("customer_code", c ?? undefined)} /></div>
                      <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="issupp" className="erp-check" type="checkbox" checked={!!form.is_supplier} onChange={(e) => setR("is_supplier", e.target.checked)} /><label htmlFor="issupp" className="erp-label" style={{ margin: 0 }}>É fornecedor</label></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Qtd. dispositivos</label><input className="erp-input num" type="number" min={0} value={form.device_quantity ?? 0} onChange={(e) => setR("device_quantity", Math.max(0, Number(e.target.value)))} /></div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>{busy && <span className="erp-spin" />}Cadastrar representante</button>
                    <button className="erp-btn" onClick={() => setForm(EMPTY_REP)} disabled={busy}>Limpar</button>
                  </div>
                </div>
              </>
            ) : selected ? (
              <>
                <div className="erp-tabs">
                  <button className={`erp-tab${tab === "dados" ? " active" : ""}`} onClick={() => setTab("dados")}>Dados gerais</button>
                  <button className={`erp-tab${tab === "empresas" ? " active" : ""}`} onClick={() => setTab("empresas")}>Empresas</button>
                  <button className={`erp-tab${tab === "contatos" ? " active" : ""}`} onClick={() => setTab("contatos")}>Contatos</button>
                </div>
                <div className="erp-detail-body">
                  {tab === "dados" ? (
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">
                        {selected.name} <span className="erp-badge info" style={{ marginLeft: 4 }}>{typeLabel(selected.type_code)}</span>
                        {selected.is_blocked && <span className="erp-badge err">Bloqueado</span>}
                      </div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c2"><label className="erp-label">Código</label><input className="erp-input num strong" value={selected.code ?? ""} readOnly /></div>
                        <div className="erp-field erp-c5"><label className="erp-label">Nome</label><input className="erp-input" value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} /></div>
                        <div className="erp-field erp-c5"><label className="erp-label">Nome fantasia</label><input className="erp-input" value={selected.trade_name ?? ""} onChange={(e) => setSelected({ ...selected, trade_name: e.target.value })} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Documento</label><input className="erp-input" value={selected.document_number} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Cadastro</label><input className="erp-input" value={selected.register_date?.slice(0, 10) ?? "—"} readOnly /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">UF</label><input className="erp-input" maxLength={2} value={selected.state ?? ""} onChange={(e) => setSelected({ ...selected, state: e.target.value.toUpperCase() })} /></div>
                        <div className="erp-field erp-c4"><label className="erp-label">Cidade</label><input className="erp-input" value={selected.city ?? ""} onChange={(e) => setSelected({ ...selected, city: e.target.value })} /></div>
                        <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn erp-btn-primary" onClick={salvarEdicao} disabled={busy}>{busy && <span className="erp-spin" />}Salvar alterações</button></div>
                      </div>
                    </div>
                  ) : tab === "empresas" ? (
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Empresa de atuação</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c4"><label className="erp-label erp-req">Estabelecimento</label><input className="erp-input num" type="number" value={enterprise.enterprise_code} onChange={(e) => setEnterprise((p) => ({ ...p, enterprise_code: e.target.value }))} /></div>
                        <div className="erp-field erp-c4"><label className="erp-label">Comissão padrão %</label><input className="erp-input num" type="number" value={enterprise.commission_pct} onChange={(e) => setEnterprise((p) => ({ ...p, commission_pct: e.target.value }))} /></div>
                        <div className="erp-field erp-c4" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={addEmpresa} disabled={busy}>Vincular empresa</button></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">Adicionar telefone</div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c2"><label className="erp-label">DDD</label><input className="erp-input num" value={phone.ddd} onChange={(e) => setPhone((p) => ({ ...p, ddd: e.target.value }))} /></div>
                          <div className="erp-field erp-c4"><label className="erp-label erp-req">Número</label><input className="erp-input" value={phone.phone} onChange={(e) => setPhone((p) => ({ ...p, phone: e.target.value }))} /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Tipo</label><input className="erp-input" value={phone.phone_type} onChange={(e) => setPhone((p) => ({ ...p, phone_type: e.target.value }))} /></div>
                          <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={addTelefone} disabled={busy}>Adicionar</button></div>
                        </div>
                      </div>
                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">Adicionar e-mail</div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c8"><label className="erp-label erp-req">E-mail</label><input className="erp-input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                          <div className="erp-field erp-c4" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={addEmail} disabled={busy}>Adicionar</button></div>
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--v-text-3)" }}>Ao adicionar, o sistema atualiza automaticamente o contato principal pelo menor ranking.</p>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="erp-detail-empty">
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.4"/></svg>
                <div className="erp-detail-empty-title">Nenhum representante selecionado</div>
                <div className="erp-detail-empty-sub">Selecione um representante na lista, ou clique em <strong>Novo representante</strong> para cadastrar.</div>
              </div>
            )}
          </section>
        </div>
      )}
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Representantes: <strong>{visible.length}</strong></div>
        <div className="erp-status-item">Tipos: <strong>{types.length}</strong></div>
        {summary && <div className="erp-status-item">{summary}</div>}
        {selected && <div className="erp-status-item">Selecionado: <strong>#{selected.code}</strong> — {selected.name}</div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
