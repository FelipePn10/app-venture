import { useState, useCallback, useEffect } from "react";
import {
  type TACallDTO, type TACallItemDTO, type DefectGroupDTO, type DefectReasonDTO, type WarrantyResponsibleDTO,
  listCalls, getCall, createCall, addCallItem, addReturnNote, generateOrders, updateCallStatus,
  listDefectGroups, createDefectGroup, listDefectReasons, createDefectReason,
  listWarrantyResponsibles, createWarrantyResponsible,
} from "@/services/technicalAssistanceService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadCustomers, loadEstablishments } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type View = "calls" | "aux";
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_META: Record<string, { label: string; badge: string }> = {
  PENDING: { label: "Pendente", badge: "draft" },
  IN_ANALYSIS: { label: "Em análise", badge: "info" },
  WAITING_RETURN: { label: "Aguard. devolução", badge: "warn" },
  WAITING_ORDER: { label: "Aguard. pedido/ordem", badge: "warn" },
  ATTENDED: { label: "Atendido", badge: "ok" },
  CLOSED: { label: "Encerrado", badge: "ok" },
  CANCELLED: { label: "Cancelado", badge: "err" },
};
const badge = (s?: string) => { const m = STATUS_META[s ?? ""]; return <span className={`erp-badge ${m?.badge ?? "info"}`}>{m?.label ?? s ?? "—"}</span>; };

const EMPTY_CALL: TACallDTO = { enterprise_code: 0, customer_code: 0, subject: "", priority: "NORMAL", opened_at: today(), promised_date: today() };
const EMPTY_ITEM: TACallItemDTO = { sequence: 1, item_code: 0, quantity: 1, warranty_days: 0, purchase_invoice_date: today(), requested_action: "REPAIR" };

export function Vatc0280Page(): JSX.Element {
  const [view, setView] = useState<View>("calls");
  const [calls, setCalls] = useState<TACallDTO[]>([]);
  const [selected, setSelected] = useState<TACallDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TACallDTO>(EMPTY_CALL);
  const [pendingItems, setPendingItems] = useState<TACallItemDTO[]>([]);
  const [itemForm, setItemForm] = useState<TACallItemDTO>(EMPTY_ITEM);

  // status change
  const [newStatus, setNewStatus] = useState("IN_ANALYSIS");
  const [diagnosis, setDiagnosis] = useState("");
  const [solution, setSolution] = useState("");

  // aux
  const [groups, setGroups] = useState<DefectGroupDTO[]>([]);
  const [reasons, setReasons] = useState<DefectReasonDTO[]>([]);
  const [responsibles, setResponsibles] = useState<WarrantyResponsibleDTO[]>([]);
  const [groupDesc, setGroupDesc] = useState("");
  const [reasonForm, setReasonForm] = useState<DefectReasonDTO>({ group_code: 0, description: "" });
  const [respForm, setRespForm] = useState<WarrantyResponsibleDTO>({ name: "" });

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregarChamados = useCallback(() => run(async () => { setCalls(await listCalls()); }), [run]);
  const carregarAux = useCallback(() => run(async () => {
    const [g, r, w] = await Promise.all([listDefectGroups(), listDefectReasons(), listWarrantyResponsibles()]);
    setGroups(g); setReasons(r); setResponsibles(w);
  }), [run]);

  useEffect(() => { void carregarChamados(); void carregarAux(); }, [carregarChamados, carregarAux]);

  const abrirDetalhe = (code?: number) => { if (!code) return; void run(async () => {
    const c = await getCall(code); setSelected(c); setCreating(false);
    setNewStatus(c.status && STATUS_META[c.status] ? c.status : "IN_ANALYSIS");
    setDiagnosis(c.diagnosis ?? ""); setSolution(c.solution ?? "");
  }); };

  const novoChamado = () => { setCreating(true); setSelected(null); setForm(EMPTY_CALL); setPendingItems([]); setItemForm(EMPTY_ITEM); };

  const addPendingItem = () => {
    if (!itemForm.item_code) { setFeedback({ type: "error", message: "Selecione o item." }); return; }
    setPendingItems((p) => [...p, { ...itemForm, sequence: p.length + 1 }]);
    setItemForm({ ...EMPTY_ITEM });
  };
  const removePendingItem = (i: number) => setPendingItems((p) => p.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, sequence: idx + 1 })));

  const gravarChamado = () => run(async () => {
    if (!form.enterprise_code) { setFeedback({ type: "error", message: "Informe a empresa." }); return; }
    if (!form.customer_code) { setFeedback({ type: "error", message: "Informe o cliente." }); return; }
    if (!form.subject.trim()) { setFeedback({ type: "error", message: "Informe o assunto." }); return; }
    if (pendingItems.length === 0) { setFeedback({ type: "error", message: "Inclua ao menos um item no chamado." }); return; }
    const created = await createCall({ ...form, items: pendingItems });
    setFeedback({ type: "success", message: `Chamado ${created.call_number ?? created.code} aberto.` });
    setCreating(false); await carregarChamados();
    if (created.code) abrirDetalhe(created.code);
  });

  const incluirItem = () => run(async () => {
    if (!selected?.code) return;
    if (!itemForm.item_code) { setFeedback({ type: "error", message: "Selecione o item." }); return; }
    await addCallItem(selected.code, { ...itemForm, sequence: (selected.items?.length ?? 0) + 1 });
    setItemForm({ ...EMPTY_ITEM });
    setFeedback({ type: "success", message: "Item incluído no chamado." });
    abrirDetalhe(selected.code);
  });

  const alterarStatus = () => run(async () => {
    if (!selected?.code) return;
    await updateCallStatus(selected.code, { status: newStatus, diagnosis: diagnosis || undefined, solution: solution || undefined });
    setFeedback({ type: "success", message: `Status alterado para ${STATUS_META[newStatus]?.label ?? newStatus}.` });
    abrirDetalhe(selected.code);
  });

  const gerarOrdens = () => run(async () => {
    if (!selected?.code) return;
    await generateOrders(selected.code, {});
    setFeedback({ type: "success", message: "Pedido/ordem de assistência gerado e vinculado ao chamado." });
    abrirDetalhe(selected.code);
  });

  const anexarNota = () => run(async () => {
    if (!selected?.code) return;
    await addReturnNote(selected.code, { note_number: `DEV-${Date.now() % 100000}`, emission_date: today(), operation_type: "RETURN", total_value: 0 });
    setFeedback({ type: "success", message: "Nota de devolução/remessa vinculada (ajuste número/série na integração fiscal)." });
    abrirDetalhe(selected.code);
  });

  const criarGrupo = () => run(async () => {
    if (!groupDesc.trim()) { setFeedback({ type: "error", message: "Informe a descrição do grupo." }); return; }
    await createDefectGroup({ description: groupDesc }); setGroupDesc("");
    setFeedback({ type: "success", message: "Grupo de defeito criado." }); await carregarAux();
  });
  const criarMotivo = () => run(async () => {
    if (!reasonForm.group_code) { setFeedback({ type: "error", message: "Selecione o grupo." }); return; }
    if (!reasonForm.description.trim()) { setFeedback({ type: "error", message: "Informe a descrição do motivo." }); return; }
    await createDefectReason(reasonForm); setReasonForm({ group_code: 0, description: "" });
    setFeedback({ type: "success", message: "Motivo de defeito criado." }); await carregarAux();
  });
  const criarResponsavel = () => run(async () => {
    if (!respForm.name.trim()) { setFeedback({ type: "error", message: "Informe o nome." }); return; }
    await createWarrantyResponsible(respForm); setRespForm({ name: "" });
    setFeedback({ type: "success", message: "Responsável pela garantia criado." }); await carregarAux();
  });

  const itemRows = (items: TACallItemDTO[], removable: boolean) => (
    <div className="erp-grid-wrap">
      <table className="erp-grid">
        <thead><tr><th className="num">#</th><th className="num">Item</th><th>Série</th><th className="num">Qtd</th><th className="num">Motivo</th><th className="num">Garantia (dias)</th><th>Ação</th><th>Situação</th>{removable && <th style={{ width: 70 }}></th>}</tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={removable ? 9 : 8} className="erp-grid-empty">Nenhum item.</td></tr>}
          {items.map((it, i) => (
            <tr key={i}>
              <td className="num">{it.sequence}</td><td className="num">{it.item_code}</td><td>{it.serial_number || "—"}</td>
              <td className="num">{it.quantity}</td><td className="num">{it.defect_reason_code ?? "—"}</td><td className="num">{it.warranty_days ?? 0}</td>
              <td>{it.requested_action || "—"}</td><td>{it.in_warranty ? <span className="erp-badge ok">Em garantia</span> : (it.warranty_until ? <span className="erp-badge warn">Fora</span> : "—")}</td>
              {removable && <td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => removePendingItem(i)} disabled={busy}>Remover</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const itemFormFields = (onAdd: () => void) => (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Incluir item</div>
      <div className="erp-fieldset-body">
        <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label><LookupField value={itemForm.item_code} loader={loadItems} entityLabel="item" onChange={(c) => setItemForm((p) => ({ ...p, item_code: c ?? 0 }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label erp-req">Qtd</label><input className="erp-input num" type="number" value={itemForm.quantity || ""} onChange={(e) => setItemForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Nº série</label><input className="erp-input" value={itemForm.serial_number ?? ""} onChange={(e) => setItemForm((p) => ({ ...p, serial_number: e.target.value }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Motivo de defeito</label>
          <select className="erp-tselect" value={itemForm.defect_reason_code ?? ""} onChange={(e) => setItemForm((p) => ({ ...p, defect_reason_code: e.target.value ? Number(e.target.value) : null }))}>
            <option value="">—</option>{reasons.map((r) => <option key={r.code} value={r.code}>{r.code} · {r.description}</option>)}
          </select>
        </div>
        <div className="erp-field erp-c4"><label className="erp-label">Complemento do defeito</label><input className="erp-input" value={itemForm.defect_complement ?? ""} onChange={(e) => setItemForm((p) => ({ ...p, defect_complement: e.target.value }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">NF compra</label><input className="erp-input" value={itemForm.purchase_invoice_number ?? ""} onChange={(e) => setItemForm((p) => ({ ...p, purchase_invoice_number: e.target.value }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Data NF compra</label><input className="erp-input" type="date" value={itemForm.purchase_invoice_date ?? ""} onChange={(e) => setItemForm((p) => ({ ...p, purchase_invoice_date: e.target.value }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label">Garantia (dias)</label><input className="erp-input num" type="number" value={itemForm.warranty_days ?? 0} onChange={(e) => setItemForm((p) => ({ ...p, warranty_days: Number(e.target.value) }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Ação solicitada</label>
          <select className="erp-tselect" value={itemForm.requested_action ?? "REPAIR"} onChange={(e) => setItemForm((p) => ({ ...p, requested_action: e.target.value }))}>
            <option value="REPAIR">Reparo</option><option value="REPLACE">Troca</option><option value="ANALYSIS">Análise</option><option value="CREDIT">Crédito</option>
          </select>
        </div>
        <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn" onClick={onAdd} disabled={busy}>Adicionar item</button></div>
      </div>
    </div>
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Cadastro de Chamados de Assistência Técnica</span>
          <span className="erp-crumb-code">VATC0280</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Chamados · itens · notas · geração de pedido/ordem · cadastros de apoio</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className={`erp-btn${view === "calls" ? " erp-btn-dark" : ""}`} onClick={() => setView("calls")} disabled={busy}>Chamados</button>
          <button className={`erp-btn${view === "aux" ? " erp-btn-dark" : ""}`} onClick={() => setView("aux")} disabled={busy}>Grupos · Motivos · Responsáveis</button>
        </div>
        {view === "calls" && <><span style={{ color: "var(--v-text-3)" }}>|</span><div className="erp-tgroup"><button className="erp-btn erp-btn-primary" onClick={novoChamado} disabled={busy}>Novo chamado</button><button className="erp-btn" onClick={() => carregarChamados()} disabled={busy}>Atualizar</button></div></>}
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VATC0280 — Chamados de Assistência" filename="vatc0280" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        {view === "calls" && (
          <div className="erp-main">
            <div className="erp-list-panel">
              <div className="erp-grid-wrap">
                <table className="erp-grid">
                  <thead><tr><th className="num">Nº</th><th className="num">Cliente</th><th>Assunto</th><th>Status</th></tr></thead>
                  <tbody>
                    {calls.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum chamado.</td></tr>}
                    {calls.map((c) => (
                      <tr key={c.code} onClick={() => abrirDetalhe(c.code)} className={selected?.code === c.code ? "erp-row-sel" : ""} style={{ cursor: "pointer" }}>
                        <td className="num">{c.call_number ?? c.code}</td><td className="num">{c.customer_code}</td><td>{c.subject}</td><td>{badge(c.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="erp-detail-panel">
              {creating ? (
                <>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Novo chamado</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label erp-req">Empresa</label><LookupField value={form.enterprise_code || undefined} loader={loadEstablishments} entityLabel="empresa" onChange={(c) => setForm((p) => ({ ...p, enterprise_code: c ?? 0 }))} /></div>
                      <div className="erp-field erp-c4"><label className="erp-label erp-req">Cliente</label><LookupField value={form.customer_code || undefined} loader={loadCustomers} entityLabel="cliente" onChange={(c) => setForm((p) => ({ ...p, customer_code: c ?? 0 }))} /></div>
                      <div className="erp-field erp-c4"><label className="erp-label">Responsável garantia</label>
                        <select className="erp-tselect" value={form.warranty_responsible_code ?? ""} onChange={(e) => setForm((p) => ({ ...p, warranty_responsible_code: e.target.value ? Number(e.target.value) : null }))}>
                          <option value="">—</option>{responsibles.map((r) => <option key={r.code} value={r.code}>{r.code} · {r.name}</option>)}
                        </select>
                      </div>
                      <div className="erp-field erp-c6"><label className="erp-label erp-req">Assunto</label><input className="erp-input" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Prioridade</label>
                        <select className="erp-tselect" value={form.priority ?? "NORMAL"} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                          <option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option>
                        </select>
                      </div>
                      <div className="erp-field erp-c3"><label className="erp-label">Prometido p/</label><input className="erp-input" type="date" value={form.promised_date ?? ""} onChange={(e) => setForm((p) => ({ ...p, promised_date: e.target.value }))} /></div>
                      <div className="erp-field erp-c6"><label className="erp-label">Consumidor (nome)</label><input className="erp-input" value={form.consumer_name ?? ""} onChange={(e) => setForm((p) => ({ ...p, consumer_name: e.target.value }))} /></div>
                      <div className="erp-field erp-c6"><label className="erp-label">Descrição</label><input className="erp-input" value={form.description ?? ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
                    </div>
                  </div>
                  {itemFormFields(addPendingItem)}
                  {itemRows(pendingItems, true)}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="erp-btn erp-btn-primary" onClick={gravarChamado} disabled={busy}>{busy && <span className="erp-spin" />}Abrir chamado</button>
                    <button className="erp-btn" onClick={() => setCreating(false)} disabled={busy}>Cancelar</button>
                  </div>
                </>
              ) : selected ? (
                <>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Chamado {selected.call_number ?? selected.code} — {badge(selected.status)}</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c3"><label className="erp-label">Empresa</label><input className="erp-input" readOnly value={selected.enterprise_code} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Cliente</label><input className="erp-input" readOnly value={selected.customer_code} /></div>
                      <div className="erp-field erp-c6"><label className="erp-label">Assunto</label><input className="erp-input" readOnly value={selected.subject} /></div>
                      <div className="erp-field erp-c6"><label className="erp-label">Consumidor</label><input className="erp-input" readOnly value={selected.consumer_name ?? "—"} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Prioridade</label><input className="erp-input" readOnly value={selected.priority ?? "—"} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Prometido</label><input className="erp-input" readOnly value={selected.promised_date?.slice(0, 10) ?? "—"} /></div>
                    </div>
                  </div>
                  {itemRows(selected.items ?? [], false)}
                  {itemFormFields(incluirItem)}
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Andamento — status, diagnóstico e solução</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c3"><label className="erp-label">Status</label>
                        <select className="erp-tselect" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>{Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
                      </div>
                      <div className="erp-field erp-c9" />
                      <div className="erp-field erp-c6"><label className="erp-label">Diagnóstico</label><input className="erp-input" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} /></div>
                      <div className="erp-field erp-c6"><label className="erp-label">Solução</label><input className="erp-input" value={solution} onChange={(e) => setSolution(e.target.value)} /></div>
                      <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                        <button className="erp-btn erp-btn-primary" onClick={alterarStatus} disabled={busy}>Alterar status</button>
                        <button className="erp-btn" onClick={anexarNota} disabled={busy}>Vincular nota de devolução</button>
                        <button className="erp-btn" onClick={gerarOrdens} disabled={busy}>Gerar pedido/ordem</button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="erp-fieldset"><div className="erp-fieldset-body"><p style={{ padding: 12, color: "var(--v-text-3)" }}>Selecione um chamado na lista ou clique em <strong>Novo chamado</strong>.</p></div></div>
              )}
            </div>
          </div>
        )}

        {view === "aux" && (
          <>
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Grupos de defeito</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c8"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} /></div>
                <div className="erp-field erp-c4" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={criarGrupo} disabled={busy}>Criar grupo</button></div>
                <div className="erp-field erp-c12">
                  <div className="erp-grid-wrap"><table className="erp-grid"><thead><tr><th className="num">Código</th><th>Descrição</th></tr></thead>
                    <tbody>{groups.length === 0 ? <tr><td colSpan={2} className="erp-grid-empty">Nenhum grupo.</td></tr> : groups.map((g) => <tr key={g.code}><td className="num">{g.code}</td><td>{g.description}</td></tr>)}</tbody>
                  </table></div>
                </div>
              </div>
            </div>

            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Motivos de defeito</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Grupo</label>
                  <select className="erp-tselect" value={reasonForm.group_code || ""} onChange={(e) => setReasonForm((p) => ({ ...p, group_code: Number(e.target.value) }))}>
                    <option value="">—</option>{groups.map((g) => <option key={g.code} value={g.code}>{g.code} · {g.description}</option>)}
                  </select>
                </div>
                <div className="erp-field erp-c5"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={reasonForm.description} onChange={(e) => setReasonForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="erp-field erp-c4" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={criarMotivo} disabled={busy}>Criar motivo</button></div>
                {([
                  ["allows_complement", "Exige complemento"], ["requires_return_note", "Exige nota devolução"],
                  ["generates_sales_order", "Gera pedido de venda"], ["generates_production_order", "Gera ordem de produção"],
                  ["generates_revenue", "Gera receita"], ["is_replacement", "É reposição"], ["is_service", "É serviço"], ["available_web", "Disponível web"],
                ] as [keyof DefectReasonDTO, string][]).map(([k, label]) => (
                  <div key={k} className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <input id={`rf-${k}`} className="erp-check" type="checkbox" checked={!!reasonForm[k]} onChange={(e) => setReasonForm((p) => ({ ...p, [k]: e.target.checked }))} />
                    <label htmlFor={`rf-${k}`} className="erp-label" style={{ margin: 0 }}>{label}</label>
                  </div>
                ))}
                <div className="erp-field erp-c12">
                  <div className="erp-grid-wrap"><table className="erp-grid"><thead><tr><th className="num">Código</th><th className="num">Grupo</th><th>Descrição</th><th>Regras</th></tr></thead>
                    <tbody>{reasons.length === 0 ? <tr><td colSpan={4} className="erp-grid-empty">Nenhum motivo.</td></tr> : reasons.map((r) => <tr key={r.code}><td className="num">{r.code}</td><td className="num">{r.group_code}</td><td>{r.description}</td>
                      <td>{[r.allows_complement && "complemento", r.requires_return_note && "nota", r.generates_sales_order && "pedido", r.generates_production_order && "ordem"].filter(Boolean).join(", ") || "—"}</td></tr>)}</tbody>
                  </table></div>
                </div>
              </div>
            </div>

            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Responsáveis pela garantia</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Nome</label><input className="erp-input" value={respForm.name} onChange={(e) => setRespForm((p) => ({ ...p, name: e.target.value }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">E-mail</label><input className="erp-input" value={respForm.email ?? ""} onChange={(e) => setRespForm((p) => ({ ...p, email: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Telefone</label><input className="erp-input" value={respForm.phone ?? ""} onChange={(e) => setRespForm((p) => ({ ...p, phone: e.target.value }))} /></div>
                <div className="erp-field erp-c2" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={criarResponsavel} disabled={busy}>Criar</button></div>
                <div className="erp-field erp-c12">
                  <div className="erp-grid-wrap"><table className="erp-grid"><thead><tr><th className="num">Código</th><th>Nome</th><th>E-mail</th><th>Telefone</th></tr></thead>
                    <tbody>{responsibles.length === 0 ? <tr><td colSpan={4} className="erp-grid-empty">Nenhum responsável.</td></tr> : responsibles.map((r) => <tr key={r.code}><td className="num">{r.code}</td><td>{r.name}</td><td>{r.email || "—"}</td><td>{r.phone || "—"}</td></tr>)}</tbody>
                  </table></div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Chamados: <strong>{calls.length}</strong>{selected && <> · Selecionado: <strong>{selected.call_number ?? selected.code}</strong></>}</div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
