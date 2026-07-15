import { useState, useCallback, useMemo, useEffect } from "react";
import {
  type ConsumerDTO,
  type ConsumerCallDTO,
  type CallTypeDTO,
  type KnowledgeSourceDTO,
  listConsumers, getConsumer, createConsumer, addConsumerPhone, addConsumerEmail,
  listCalls, getCall, createCall, updateCall, addCallReturn,
  listCallTypes, createCallType, listKnowledgeSources, createKnowledgeSource,
  getCallsReport,
} from "@/services/consumerServiceService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadEstablishments } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type View = "consumers" | "calls" | "support";
const today = () => new Date().toISOString().slice(0, 10);

const POSITION_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "warn" }, SCHEDULED: { label: "Agendado", cls: "info" }, RESOLVED: { label: "Resolvido", cls: "ok" },
};
const EMPTY_CONSUMER: ConsumerDTO = { name: "", person_type: "F", is_active: true };
const EMPTY_CALL: ConsumerCallDTO = { enterprise_code: 1, consumer_code: 0, call_type_code: 0, direction: "RECEIVED", position: "PENDING", situation: "OTHER", subject: "", opened_at: today() };

export function Vsac0100Page(): JSX.Element {
  const [view, setView] = useState<View>("consumers");
  const [consumers, setConsumers] = useState<ConsumerDTO[]>([]);
  const [calls, setCalls] = useState<ConsumerCallDTO[]>([]);
  const [callTypes, setCallTypes] = useState<CallTypeDTO[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeSourceDTO[]>([]);
  const [selConsumer, setSelConsumer] = useState<ConsumerDTO | null>(null);
  const [selCall, setSelCall] = useState<ConsumerCallDTO | null>(null);
  const [consumerForm, setConsumerForm] = useState<ConsumerDTO>(EMPTY_CONSUMER);
  const [callForm, setCallForm] = useState<ConsumerCallDTO>(EMPTY_CALL);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ret, setRet] = useState({ contact_type: "PHONE", description: "" });
  const [typeForm, setTypeForm] = useState<CallTypeDTO>({ description: "", is_complaint: false });
  const [knowForm, setKnowForm] = useState<KnowledgeSourceDTO>({ description: "" });
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [creatingConsumer, setCreatingConsumer] = useState(true);
  const [creatingCall, setCreatingCall] = useState(true);

  const setC = useCallback(<K extends keyof ConsumerDTO>(k: K, v: ConsumerDTO[K]) => setConsumerForm((p) => ({ ...p, [k]: v })), []);
  const setK = useCallback(<K extends keyof ConsumerCallDTO>(k: K, v: ConsumerCallDTO[K]) => setCallForm((p) => ({ ...p, [k]: v })), []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregarApoio = useCallback(() => run(async () => { setCallTypes(await listCallTypes()); setKnowledge(await listKnowledgeSources()); }), [run]);
  useEffect(() => { void carregarApoio(); }, [carregarApoio]);

  const listarConsumidores = () => run(async () => { setConsumers(await listConsumers({ search: search || undefined })); });
  const listarChamados = () => run(async () => { setCalls(await listCalls()); });

  const novoConsumidor = () => { setCreatingConsumer(true); setSelConsumer(null); setConsumerForm(EMPTY_CONSUMER); setFeedback(null); };
  const abrirConsumidor = (code?: number) => { if (!code) return; setCreatingConsumer(false); void run(async () => { setSelConsumer(await getConsumer(code)); }); };
  const novoChamado = () => { setCreatingCall(true); setSelCall(null); setCallForm(EMPTY_CALL); setFeedback(null); };
  const abrirChamado = (code?: number) => { if (!code) return; setCreatingCall(false); void run(async () => { setSelCall(await getCall(code)); }); };

  const criarConsumidor = () => run(async () => {
    if (!consumerForm.name.trim()) { setFeedback({ type: "error", message: "Nome é obrigatório." }); return; }
    if (consumerForm.person_type === "F" && consumerForm.cnpj) { setFeedback({ type: "error", message: "Pessoa física não aceita CNPJ." }); return; }
    if (consumerForm.person_type === "J" && consumerForm.cpf) { setFeedback({ type: "error", message: "Pessoa jurídica não aceita CPF." }); return; }
    const created = await createConsumer(consumerForm);
    setConsumerForm(EMPTY_CONSUMER); await listarConsumidores();
    if (created.code) { setCreatingConsumer(false); setSelConsumer(await getConsumer(created.code)); }
    setFeedback({ type: "success", message: `Consumidor ${created.code} cadastrado.` });
  });
  const addTel = () => { const code = selConsumer?.code; if (!code) return; void run(async () => {
    if (!phone.trim()) return; await addConsumerPhone(code, { phone_type: "MOBILE", number: phone, is_primary: true });
    setPhone(""); setFeedback({ type: "success", message: "Telefone adicionado." });
  }); };
  const addMail = () => { const code = selConsumer?.code; if (!code) return; void run(async () => {
    if (!email.trim()) return; await addConsumerEmail(code, { email, is_primary: true });
    setEmail(""); setFeedback({ type: "success", message: "E-mail adicionado." });
  }); };

  const criarChamado = () => run(async () => {
    if (!callForm.consumer_code) { setFeedback({ type: "error", message: "Consumidor é obrigatório." }); return; }
    if (!callForm.call_type_code) { setFeedback({ type: "error", message: "Tipo de chamado é obrigatório." }); return; }
    if (!callForm.subject.trim()) { setFeedback({ type: "error", message: "Assunto é obrigatório." }); return; }
    if (callForm.situation === "TECHNICAL_VISIT" && !callForm.visit_requested_date) { setFeedback({ type: "error", message: "Visita técnica exige data solicitada." }); return; }
    const created = await createCall(callForm);
    setCallForm(EMPTY_CALL); await listarChamados();
    if (created.code) { setCreatingCall(false); setSelCall(await getCall(created.code)); }
    setFeedback({ type: "success", message: `Chamado ${created.code} aberto.` });
  });
  const mudarPosicao = (pos: ConsumerCallDTO["position"]) => { const c = selCall; if (!c?.code) return; void run(async () => {
    await updateCall(c.code!, { ...c, position: pos }); setSelCall(await getCall(c.code!));
    setFeedback({ type: "success", message: `Chamado marcado como ${POSITION_META[pos].label}.` });
  }); };
  const registrarRetorno = () => { const c = selCall; if (!c?.code) return; void run(async () => {
    if (!ret.description.trim()) { setFeedback({ type: "error", message: "Descreva o retorno." }); return; }
    await addCallReturn(c.code!, { contacted_at: today(), contact_type: ret.contact_type, description: ret.description });
    setRet({ contact_type: "PHONE", description: "" });
    setFeedback({ type: "success", message: "Retorno registrado no chamado." });
  }); };

  const criarTipo = () => run(async () => {
    if (!typeForm.description.trim()) return; await createCallType(typeForm); setTypeForm({ description: "", is_complaint: false }); await carregarApoio();
    setFeedback({ type: "success", message: "Tipo de chamado criado." });
  });
  const criarKnow = () => run(async () => {
    if (!knowForm.description.trim()) return; await createKnowledgeSource(knowForm); setKnowForm({ description: "" }); await carregarApoio();
    setFeedback({ type: "success", message: "Local/meio de conhecimento criado." });
  });
  const relatorio = () => run(async () => {
    const r = await getCallsReport();
    setSummary(`Indicadores de chamados: ${Object.keys(r).length} métrica(s) consolidada(s).`);
    setFeedback({ type: "info", message: "Relatório de chamados gerado (veja a barra de status)." });
  });

  const consumerName = (code?: number) => consumers.find((c) => c.code === code)?.name ?? (code ? `#${code}` : "—");
  const isComplaint = useMemo(() => callTypes.find((t) => t.code === callForm.call_type_code)?.is_complaint, [callTypes, callForm.call_type_code]);
  const visibleConsumers = useMemo(() => { const q = search.trim().toLowerCase(); return q ? consumers.filter((c) => (c.name ?? "").toLowerCase().includes(q) || String(c.code ?? "").includes(q)) : consumers; }, [consumers, search]);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Atendimento ao Consumidor (SAC)</span>
          <span className="erp-crumb-code">VSAC0100</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Consumidores · chamados · reclamações</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className={`erp-btn${view === "consumers" ? " erp-btn-dark" : ""}`} onClick={() => setView("consumers")} disabled={busy}>Consumidores</button>
          <button className={`erp-btn${view === "calls" ? " erp-btn-dark" : ""}`} onClick={() => setView("calls")} disabled={busy}>Chamados</button>
          <button className={`erp-btn${view === "support" ? " erp-btn-dark" : ""}`} onClick={() => setView("support")} disabled={busy}>Apoio</button>
        </div>
        <div className="erp-tspacer" />
        {view === "consumers" && <div className="erp-tgroup">
          <button className="erp-btn erp-btn-primary" onClick={novoConsumidor} disabled={busy}>Novo consumidor</button>
          <input className="erp-tinput" style={{ width: 150 }} placeholder="Buscar nome…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="erp-btn" onClick={listarConsumidores} disabled={busy}>Listar</button>
        </div>}
        {view === "calls" && <div className="erp-tgroup">
          <button className="erp-btn erp-btn-primary" onClick={novoChamado} disabled={busy}>Novo chamado</button>
          <button className="erp-btn" onClick={listarChamados} disabled={busy}>Listar</button>
          <button className="erp-btn" onClick={relatorio} disabled={busy}>Relatório</button>
        </div>}
        <div className="erp-tgroup"><ExportButton title="VSAC0100 — SAC" filename="vsac0100" /></div>
      </div>

      <div className="erp-content">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

      {view === "support" ? (
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Tipos de chamado</span><span className="erp-count">{callTypes.length}</span></div>
            <div className="erp-list">
              {callTypes.length === 0 && <div className="erp-list-empty">Nenhum tipo cadastrado.</div>}
              {callTypes.map((t) => (
                <div key={t.code} className="erp-list-row" style={{ cursor: "default" }}>
                  <span className="erp-list-code">#{t.code}</span><span className="erp-list-sub">{t.description}</span>
                  <div className="erp-list-meta">{t.is_complaint && <span className="erp-badge warn">Reclamação</span>}</div>
                </div>
              ))}
            </div>
          </aside>
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Cadastros de apoio</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Novo tipo de chamado</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={typeForm.description} onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))} /></div>
                  <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="iscompl" className="erp-check" type="checkbox" checked={!!typeForm.is_complaint} onChange={(e) => setTypeForm((p) => ({ ...p, is_complaint: e.target.checked }))} /><label htmlFor="iscompl" className="erp-label" style={{ margin: 0 }}>É reclamação</label></div>
                  <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={criarTipo} disabled={busy}>Criar tipo</button></div>
                </div>
              </div>
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Novo local/meio de conhecimento ({knowledge.length})</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c8"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={knowForm.description} onChange={(e) => setKnowForm({ description: e.target.value })} /></div>
                  <div className="erp-field erp-c4" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={criarKnow} disabled={busy}>Criar</button></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : view === "consumers" ? (
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Consumidores</span><span className="erp-count">{visibleConsumers.length}</span></div>
            <div className="erp-list">
              {visibleConsumers.length === 0 && <div className="erp-list-empty">Nenhum consumidor.<br />Use <strong>Listar</strong>.</div>}
              {visibleConsumers.map((c) => (
                <div key={c.code} className={`erp-list-row${selConsumer?.code === c.code ? " sel" : ""}`} onClick={() => abrirConsumidor(c.code)}>
                  <span className="erp-list-code">#{c.code}</span><span className="erp-list-sub">{c.name}</span>
                  <div className="erp-list-meta"><span className="erp-badge info">{c.person_type === "F" ? "Física" : "Jurídica"}</span>{c.state && <span className="erp-badge">{c.state}</span>}</div>
                </div>
              ))}
            </div>
          </aside>
          <section className="erp-detail-panel">
            {creatingConsumer ? (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Novo consumidor</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Identificação</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c6"><label className="erp-label erp-req">Nome</label><input className="erp-input" value={consumerForm.name} onChange={(e) => setC("name", e.target.value)} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Pessoa</label><select className="erp-input" value={consumerForm.person_type} onChange={(e) => setC("person_type", e.target.value as ConsumerDTO["person_type"])}><option value="F">Física</option><option value="J">Jurídica</option></select></div>
                      {consumerForm.person_type === "F"
                        ? <div className="erp-field erp-c4"><label className="erp-label">CPF</label><input className="erp-input" value={consumerForm.cpf ?? ""} onChange={(e) => setC("cpf", e.target.value)} /></div>
                        : <div className="erp-field erp-c4"><label className="erp-label">CNPJ</label><input className="erp-input" value={consumerForm.cnpj ?? ""} onChange={(e) => setC("cnpj", e.target.value)} /></div>}
                      <div className="erp-field erp-c2"><label className="erp-label">UF</label><input className="erp-input" maxLength={2} value={consumerForm.state ?? ""} onChange={(e) => setC("state", e.target.value.toUpperCase())} /></div>
                      <div className="erp-field erp-c4"><label className="erp-label">Cidade</label><input className="erp-input" value={consumerForm.city ?? ""} onChange={(e) => setC("city", e.target.value)} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Local de conhecimento</label><select className="erp-input" value={consumerForm.knowledge_code ?? ""} onChange={(e) => setC("knowledge_code", e.target.value ? Number(e.target.value) : undefined)}><option value="">—</option>{knowledge.map((k) => <option key={k.code} value={k.code}>{k.description}</option>)}</select></div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}><button className="erp-btn erp-btn-primary" onClick={criarConsumidor} disabled={busy}>{busy && <span className="erp-spin" />}Cadastrar consumidor</button><button className="erp-btn" onClick={() => setConsumerForm(EMPTY_CONSUMER)} disabled={busy}>Limpar</button></div>
                </div>
              </>
            ) : selConsumer ? (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Consumidor #{selConsumer.code}</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">{selConsumer.name} <span className="erp-badge info" style={{ marginLeft: 4 }}>{selConsumer.person_type === "F" ? "Física" : "Jurídica"}</span></div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c3"><label className="erp-label">Documento</label><input className="erp-input" value={selConsumer.cpf || selConsumer.cnpj || "—"} readOnly /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">UF</label><input className="erp-input" value={selConsumer.state ?? "—"} readOnly /></div>
                      <div className="erp-field erp-c4"><label className="erp-label">Cidade</label><input className="erp-input" value={selConsumer.city ?? "—"} readOnly /></div>
                    </div>
                  </div>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Adicionar contato</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label">Telefone</label><input className="erp-input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={addTel} disabled={busy}>Add telefone</button></div>
                      <div className="erp-field erp-c4"><label className="erp-label">E-mail</label><input className="erp-input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={addMail} disabled={busy}>Add e-mail</button></div>
                    </div>
                  </div>
                </div>
              </>
            ) : <div className="erp-detail-empty"><div className="erp-detail-empty-title">Nenhum consumidor selecionado</div><div className="erp-detail-empty-sub">Selecione na lista ou clique em <strong>Novo consumidor</strong>.</div></div>}
          </section>
        </div>
      ) : (
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Chamados</span><span className="erp-count">{calls.length}</span></div>
            <div className="erp-list">
              {calls.length === 0 && <div className="erp-list-empty">Nenhum chamado.<br />Use <strong>Listar</strong>.</div>}
              {calls.map((c) => { const m = POSITION_META[c.position] ?? { label: c.position, cls: "draft" }; return (
                <div key={c.code} className={`erp-list-row${selCall?.code === c.code ? " sel" : ""}`} onClick={() => abrirChamado(c.code)}>
                  <span className="erp-list-code">#{c.code}</span><span className="erp-list-sub">{c.subject}</span>
                  <div className="erp-list-meta"><span className={`erp-badge ${m.cls}`}>{m.label}</span>{c.situation === "TECHNICAL_VISIT" && <span className="erp-badge info">Visita</span>}</div>
                </div>
              ); })}
            </div>
          </aside>
          <section className="erp-detail-panel">
            {creatingCall ? (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Novo chamado</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Abertura do chamado</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c3"><label className="erp-label erp-req">Estabelecimento</label><LookupField value={callForm.enterprise_code} loader={loadEstablishments} entityLabel="estabelecimento" clearable={false} onChange={(c) => setK("enterprise_code", c ?? 1)} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label erp-req">Consumidor (código)</label><input className="erp-input num" type="number" value={callForm.consumer_code || ""} onChange={(e) => setK("consumer_code", Number(e.target.value))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label erp-req">Tipo</label><select className="erp-input" value={callForm.call_type_code || ""} onChange={(e) => setK("call_type_code", Number(e.target.value))}><option value="">Selecionar…</option>{callTypes.map((t) => <option key={t.code} value={t.code}>{t.description}</option>)}</select></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Direção</label><select className="erp-input" value={callForm.direction} onChange={(e) => setK("direction", e.target.value as ConsumerCallDTO["direction"])}><option value="RECEIVED">Recebido</option><option value="MADE">Efetuado</option><option value="WARRANTY">Garantia</option></select></div>
                      <div className="erp-field erp-c6"><label className="erp-label erp-req">Assunto</label><input className="erp-input" value={callForm.subject} onChange={(e) => setK("subject", e.target.value)} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Posição</label><select className="erp-input" value={callForm.position} onChange={(e) => setK("position", e.target.value as ConsumerCallDTO["position"])}>{Object.entries(POSITION_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Situação</label><select className="erp-input" value={callForm.situation} onChange={(e) => setK("situation", e.target.value as ConsumerCallDTO["situation"])}><option value="OTHER">Outro</option><option value="ORDER">Pedido</option><option value="DISCONTINUED_ORDER">Pedido descont.</option><option value="TECHNICAL_VISIT">Visita técnica</option></select></div>
                      {callForm.situation === "TECHNICAL_VISIT" && <div className="erp-field erp-c3"><label className="erp-label erp-req">Data da visita</label><input className="erp-input" type="date" value={callForm.visit_requested_date ?? ""} onChange={(e) => setK("visit_requested_date", e.target.value)} /></div>}
                      {isComplaint && <div className="erp-field erp-c12"><label className="erp-label erp-req">Sintomas (reclamação)</label><input className="erp-input" value={callForm.symptoms ?? ""} onChange={(e) => setK("symptoms", e.target.value)} /></div>}
                      <div className="erp-field erp-c12"><label className="erp-label">Descrição</label><input className="erp-input" value={callForm.description ?? ""} onChange={(e) => setK("description", e.target.value)} /></div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}><button className="erp-btn erp-btn-primary" onClick={criarChamado} disabled={busy}>{busy && <span className="erp-spin" />}Abrir chamado</button></div>
                </div>
              </>
            ) : selCall ? (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Chamado #{selCall.code}</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">{selCall.subject} <span className={`erp-badge ${(POSITION_META[selCall.position] ?? { cls: "draft" }).cls}`} style={{ marginLeft: 4 }}>{(POSITION_META[selCall.position] ?? { label: selCall.position }).label}</span></div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label">Consumidor</label><input className="erp-input" value={consumerName(selCall.consumer_code)} readOnly /></div>
                      <div className="erp-field erp-c4"><label className="erp-label">Situação</label><input className="erp-input" value={selCall.situation} readOnly /></div>
                      <div className="erp-field erp-c4"><label className="erp-label">Aberto em</label><input className="erp-input" value={selCall.opened_at?.slice(0, 10) ?? "—"} readOnly /></div>
                      <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                        <button className="erp-btn" onClick={() => mudarPosicao("SCHEDULED")} disabled={busy}>Agendar</button>
                        <button className="erp-btn erp-btn-dark" onClick={() => mudarPosicao("RESOLVED")} disabled={busy}>Resolver</button>
                      </div>
                    </div>
                  </div>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Registrar retorno / contato</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c3"><label className="erp-label">Tipo</label><input className="erp-input" value={ret.contact_type} onChange={(e) => setRet((p) => ({ ...p, contact_type: e.target.value }))} /></div>
                      <div className="erp-field erp-c7"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={ret.description} onChange={(e) => setRet((p) => ({ ...p, description: e.target.value }))} /></div>
                      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={registrarRetorno} disabled={busy}>Registrar</button></div>
                    </div>
                  </div>
                </div>
              </>
            ) : <div className="erp-detail-empty"><div className="erp-detail-empty-title">Nenhum chamado selecionado</div><div className="erp-detail-empty-sub">Selecione na lista ou clique em <strong>Novo chamado</strong>.</div></div>}
          </section>
        </div>
      )}
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Consumidores: <strong>{consumers.length}</strong></div>
        <div className="erp-status-item">Chamados: <strong>{calls.length}</strong></div>
        {summary && <div className="erp-status-item">{summary}</div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
