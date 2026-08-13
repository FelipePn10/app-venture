import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  type SalesQuotationDTO,
  type SalesQuotationItemDTO,
  type SalesQuotationReportDTO,
  type SalesQuotationParametersDTO,
  type CancellationReasonDTO,
  type QuotationEventDTO,
  type QuotationAttachmentDTO,
  QUOTATION_STATUS,
  QUOTATION_STATUS_TRANSITIONS,
  QUOTATION_TYPES,
  RELEASE_STATUS,
  FREIGHT_TYPES,
  FREIGHT_TYPES_WITHOUT_CHARGE,
  ITEM_STATUS_LABEL,
  EVENT_TYPE_LABEL,
  MAX_ATTACHMENT_BYTES,
  listSalesQuotations,
  getSalesQuotation,
  getSalesQuotationReport,
  createSalesQuotation,
  updateSalesQuotation,
  cancelSalesQuotation,
  uncancelSalesQuotation,
  attendSalesQuotation,
  changeSalesQuotationStatus,
  changeSalesQuotationRelease,
  listSalesQuotationEvents,
  convertSalesQuotationToOrder,
  generateSalesQuotationDAV,
  createSalesQuotationItem,
  updateSalesQuotationItem,
  cancelSalesQuotationItem,
  listSalesQuotationAttachments,
  uploadSalesQuotationAttachment,
  downloadSalesQuotationAttachment,
  deleteSalesQuotationAttachment,
  getSalesQuotationParameters,
  listCancellationReasons,
  findReasonByDescription,
  isDuplicateSequenceError,
} from "@/services/salesQuotationService";
import { errMessage } from "@/services/fiscalShared";
import { downloadBlob } from "@/services/fileDownload";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import {
  loadCustomers, loadEstablishments, loadItems, loadWarehouses, loadRepresentatives,
  loadCarriers, loadPaymentConditions, loadSalesTables, loadSalesDivisions,
} from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type DetailTab = "dados" | "itens" | "anexos" | "historico";
/** Ações que exigem motivo/complemento antes de executar. */
type PendingAction =
  | { kind: "cancel" }
  | { kind: "uncancel" }
  | { kind: "cancel-item"; itemCode: number; sequence?: number }
  | { kind: "attend" }
  | { kind: "release"; target: string }
  | null;

const today = () => new Date().toISOString().slice(0, 10);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const dateTime = (s?: string) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
const fileSize = (n?: number) => (!n ? "—" : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);

const statusMeta = (s?: string) => QUOTATION_STATUS.find((x) => x.value === s) ?? { value: s ?? "", label: s ?? "—", cls: "draft" };
const releaseMeta = (s?: string) => RELEASE_STATUS.find((x) => x.value === s) ?? { value: s ?? "", label: s ?? "—", cls: "draft" };

const EMPTY_QUOTATION: SalesQuotationDTO = {
  enterprise_code: 0, currency_code: "BRL", quotation_type: "VENDA", status: "OV",
  release_status: "RELEASED", emission_date: today(), valid_until: today(),
  commission_pct: 0, probability_pct: 100, is_nfce: false, delivery_with_receipt: false,
  verify_freight: false, freight_value: 0, redelivery_freight_value: 0, insurance_value: 0,
  discount_value: 0, surcharge_value: 0, retained_tax_value: 0,
};
const EMPTY_ITEM: SalesQuotationItemDTO = {
  item_code: "", requested_qty: 1, unit_price: 0, sales_uom: "UN",
  discount_pct: 0, ipi_pct: 0, st_pct: 0, delivery_date_firm: false,
};

/**
 * VVND0300 — Orçamento de Venda.
 *
 * Cobre o ciclo completo do backend v1.1.0: capa editável, itens com saldo,
 * motivos cadastrados de cancelamento (indicadores D/C), liberação comercial,
 * histórico de eventos, anexos (10 MB), DAV/Pré-Venda e conversão atômica em
 * pedido de venda.
 */
export function Vvnd0300Page(): JSX.Element {
  const [quotations, setQuotations] = useState<SalesQuotationDTO[]>([]);
  const [selected, setSelected] = useState<SalesQuotationDTO | null>(null);
  const [form, setForm] = useState<SalesQuotationDTO>(EMPTY_QUOTATION);
  const [newItem, setNewItem] = useState<SalesQuotationItemDTO>(EMPTY_ITEM);
  const [editItem, setEditItem] = useState<SalesQuotationItemDTO | null>(null);
  const [events, setEvents] = useState<QuotationEventDTO[]>([]);
  const [attachments, setAttachments] = useState<QuotationAttachmentDTO[]>([]);
  const [parameters, setParameters] = useState<SalesQuotationParametersDTO | null>(null);
  const [reasons, setReasons] = useState<CancellationReasonDTO[]>([]);
  const [report, setReport] = useState<SalesQuotationReportDTO | null>(null);

  const [filters, setFilters] = useState({ quotation_number: "", customer: "", status: "", division: "", type: "", from: "", to: "", purchase_order: "" });
  const [page, setPage] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<DetailTab>("dados");
  const [creating, setCreating] = useState(true);
  const [pending, setPending] = useState<PendingAction>(null);
  const [reasonCode, setReasonCode] = useState(0);
  const [reasonText, setReasonText] = useState("");
  const [complement, setComplement] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const PAGE_SIZE = 100;

  const setQ = useCallback(<K extends keyof SalesQuotationDTO>(k: K, v: SalesQuotationDTO[K]) => setForm((p) => ({ ...p, [k]: v })), []);
  const setI = useCallback(<K extends keyof SalesQuotationItemDTO>(k: K, v: SalesQuotationItemDTO[K]) => setNewItem((p) => ({ ...p, [k]: v })), []);
  const setEI = useCallback(<K extends keyof SalesQuotationItemDTO>(k: K, v: SalesQuotationItemDTO[K]) => setEditItem((p) => (p ? { ...p, [k]: v } : p)), []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  // Parâmetros (rótulos configuráveis) e motivos de cancelamento são cadastros
  // de apoio da tela — carregam uma vez e falham em silêncio (a tela segue útil).
  useEffect(() => {
    void getSalesQuotationParameters().then(setParameters).catch(() => setParameters(null));
    void listCancellationReasons().then(setReasons).catch(() => setReasons([]));
  }, []);

  const purchaseOrderLabel = parameters?.purchase_order_prompt || "Ordem de Compra";
  const deliveryAuthLabel = parameters?.delivery_authorization_prompt || "Autorização de Entr.";

  const loadDetail = useCallback(async (code: number) => {
    const q = await getSalesQuotation(code);
    setSelected(q); setForm({ ...q });
    const [ev, at] = await Promise.all([
      listSalesQuotationEvents(code).catch(() => [] as QuotationEventDTO[]),
      listSalesQuotationAttachments(code).catch(() => [] as QuotationAttachmentDTO[]),
    ]);
    setEvents(ev); setAttachments(at);
  }, []);

  /** Filtros da barra, sem paginação (o relatório consolida a carteira inteira). */
  const buildFilters = useCallback(() => ({
    quotation_number: filters.quotation_number ? Number(filters.quotation_number) : undefined,
    customer_code: filters.customer ? Number(filters.customer) : undefined,
    status: filters.status || undefined,
    sales_division_code: filters.division ? Number(filters.division) : undefined,
    quotation_type: filters.type || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    purchase_order_number: filters.purchase_order || undefined,
  }), [filters]);

  /** Busca crua — usada dentro de outras ações para não aninhar o controle de `busy`. */
  const fetchList = useCallback(async (targetPage: number) => {
    const f = { ...buildFilters(), limit: PAGE_SIZE, offset: targetPage * PAGE_SIZE };
    setQuotations(await listSalesQuotations(f));
    setPage(targetPage);
  }, [buildFilters]);

  const listar = useCallback((targetPage = page) => run(() => fetchList(targetPage)), [fetchList, page, run]);

  const gerarRelatorio = () => run(async () => {
    setReport(await getSalesQuotationReport(buildFilters()));
    setFeedback({ type: "info", message: "Relatório consolidado atualizado (veja a barra de status)." });
  });

  const novo = () => {
    setCreating(true); setSelected(null); setEvents([]); setAttachments([]); setPending(null);
    setForm({ ...EMPTY_QUOTATION, is_nfce: !!parameters?.default_nfce });
    setTab("dados"); setFeedback(null);
  };
  const abrir = (code?: number) => {
    if (!code) return;
    setCreating(false); setTab("dados"); setPending(null); setEditItem(null);
    void run(async () => { await loadDetail(code); });
  };

  const salvar = () => run(async () => {
    if (!form.customer_code) { setFeedback({ type: "error", message: "Cliente é obrigatório." }); return; }
    if (creating) {
      const created = await createSalesQuotation(form);
      await fetchList(page);
      if (created.code) { setCreating(false); await loadDetail(created.code); }
      setFeedback({ type: "success", message: `Orçamento ${created.quotation_number || created.code} criado.` });
      return;
    }
    if (!selected?.code) return;
    await updateSalesQuotation(selected.code, form);
    await loadDetail(selected.code);
    setFeedback({ type: "success", message: "Capa do orçamento atualizada — totais e políticas comerciais recalculados." });
  });

  const mudarStatus = (status: string) => { const code = selected?.code; if (!code || !status) return; void run(async () => {
    await changeSalesQuotationStatus(code, status);
    await loadDetail(code); await fetchList(page);
    setFeedback({ type: "success", message: `Status alterado para ${statusMeta(status).label}.` });
  }); };

  const converter = () => { const code = selected?.code; if (!code) return; void run(async () => {
    const order = await convertSalesQuotationToOrder(code);
    await loadDetail(code); await fetchList(page);
    const orderNumber = Number(order["order_number"] ?? order["OrderNumber"] ?? order["code"] ?? order["Code"] ?? 0);
    setFeedback({ type: "success", message: `Convertido no pedido de venda ${orderNumber || ""} — o saldo aberto foi copiado. Acompanhe no VVND0200.` });
  }); };

  const gerarDAV = () => { const code = selected?.code; if (!code) return; void run(async () => {
    await generateSalesQuotationDAV(code);
    await loadDetail(code);
    setFeedback({ type: "info", message: "DAV/Pré-Venda registrado. A partir de agora só o relatório DAV fica liberado neste orçamento." });
  }); };

  // ─── Ações com motivo ──────────────────────────────────────────────────────
  const selectedReason = useMemo(() => reasons.find((r) => r.code === reasonCode), [reasons, reasonCode]);
  const reasonOptions = useMemo(
    () => (pending?.kind === "uncancel" ? reasons.filter((r) => r.allow_uncancel) : reasons),
    [reasons, pending],
  );
  /**
   * Motivo com que ESTE orçamento foi cancelado. O backend só descancela quando
   * recebe o mesmo código (`AND cancellation_reason_code=$3`), então ele é
   * fixado — e não escolhido — no painel de descancelamento.
   */
  const cancelledWith = useMemo(
    () => findReasonByDescription(reasons, selected?.cancel_reason),
    [reasons, selected?.cancel_reason],
  );
  const canUncancel = !!cancelledWith?.allow_uncancel;

  const abrirAcao = (action: PendingAction) => {
    setPending(action); setReasonText(""); setComplement(""); setFeedback(null);
    setReasonCode(action?.kind === "uncancel" ? (cancelledWith?.code ?? 0) : 0);
    if (action?.kind === "cancel-item" || action?.kind === "cancel" || action?.kind === "uncancel") setTab(action.kind === "cancel-item" ? "itens" : "dados");
  };

  const confirmarAcao = () => { const code = selected?.code; if (!code || !pending) return; void run(async () => {
    if (pending.kind === "attend") {
      if (!reasonText.trim()) { setFeedback({ type: "error", message: "Informe o motivo do atendimento." }); return; }
      await attendSalesQuotation(code, reasonText.trim(), today(), complement.trim() || undefined);
    } else if (pending.kind === "release") {
      if (!reasonText.trim()) { setFeedback({ type: "error", message: "Informe o motivo do bloqueio/liberação." }); return; }
      await changeSalesQuotationRelease(code, pending.target, reasonText.trim());
    } else {
      if (!reasonCode) { setFeedback({ type: "error", message: "Selecione um motivo cadastrado." }); return; }
      if (selectedReason?.require_complement && !complement.trim()) {
        setFeedback({ type: "error", message: "Este motivo exige complemento." }); return;
      }
      const comp = complement.trim() || undefined;
      if (pending.kind === "cancel") await cancelSalesQuotation(code, reasonCode, comp);
      else if (pending.kind === "uncancel") await uncancelSalesQuotation(code, reasonCode, comp);
      else await cancelSalesQuotationItem(pending.itemCode, reasonCode, comp);
    }
    const done = pending;
    setPending(null); setReasonCode(0); setReasonText(""); setComplement("");
    await loadDetail(code); await fetchList(page);
    const messages: Record<string, string> = {
      cancel: `Orçamento ${code} cancelado.`,
      uncancel: `Orçamento ${code} reaberto.`,
      "cancel-item": "Item cancelado.",
      attend: `Orçamento ${code} atendido — encerrado sem gerar pedido.`,
      release: `Situação de liberação alterada para ${releaseMeta(done.kind === "release" ? done.target : "").label}.`,
    };
    setFeedback({ type: "success", message: messages[done.kind] });
  }); };

  // ─── Itens ─────────────────────────────────────────────────────────────────
  const adicionarItem = () => { const code = selected?.code; if (!code) return; void run(async () => {
    if (!newItem.item_code) { setFeedback({ type: "error", message: "Informe o item." }); return; }
    // A sequência é UNIQUE por orçamento e itens cancelados somem da listagem sem
    // liberar o número — então tenta o próximo livre até achar um que o banco aceite.
    let sequence = newItem.sequence || nextSequence;
    for (let attempt = 0; ; attempt++) {
      try {
        await createSalesQuotationItem({ ...newItem, sales_quotation_code: code, sequence });
        break;
      } catch (e) {
        if (attempt >= 25 || !isDuplicateSequenceError(e)) throw e;
        sequence += 1;
      }
    }
    setNewItem(EMPTY_ITEM); await loadDetail(code);
    setFeedback({ type: "success", message: `Item adicionado na sequência ${sequence} — totais do orçamento recalculados.` });
  }); };
  const salvarItem = () => { const code = selected?.code; const it = editItem; if (!code || !it?.code) return; void run(async () => {
    await updateSalesQuotationItem(it.code!, it);
    setEditItem(null); await loadDetail(code);
    setFeedback({ type: "success", message: `Item ${it.code} atualizado.` });
  }); };

  // ─── Anexos ────────────────────────────────────────────────────────────────
  const enviarAnexo = (file?: File | null) => { const code = selected?.code; if (!code || !file) return; void run(async () => {
    if (file.size > MAX_ATTACHMENT_BYTES) { setFeedback({ type: "error", message: "O anexo não pode passar de 10 MB." }); return; }
    await uploadSalesQuotationAttachment(code, file);
    setAttachments(await listSalesQuotationAttachments(code));
    if (fileInput.current) fileInput.current.value = "";
    setFeedback({ type: "success", message: `Anexo "${file.name}" incluído.` });
  }); };
  const baixarAnexo = (a: QuotationAttachmentDTO) => { const code = selected?.code; if (!code) return; void run(async () => {
    const blob = await downloadSalesQuotationAttachment(code, a.id);
    downloadBlob(blob, a.file_name || `anexo-${a.id}`);
  }); };
  const excluirAnexo = (a: QuotationAttachmentDTO) => { const code = selected?.code; if (!code) return; void run(async () => {
    await deleteSalesQuotationAttachment(code, a.id);
    setAttachments(await listSalesQuotationAttachments(code));
    setFeedback({ type: "success", message: `Anexo "${a.file_name}" excluído.` });
  }); };

  // ─── Estado derivado ───────────────────────────────────────────────────────
  const items = useMemo(() => selected?.items ?? [], [selected?.items]);
  const nextSequence = useMemo(() => items.reduce((max, it) => Math.max(max, it.sequence ?? 0), 0) + 1, [items]);
  const itemsTotal = useMemo(() => items.reduce((s, it) => s + (it.total_net ?? 0), 0), [items]);
  const openBalance = useMemo(() => items.filter((it) => it.status !== "CANCELLED").reduce((s, it) => s + (it.balance ?? 0), 0), [items]);

  const isCancelled = selected?.status === "CANCELLED";
  const isAttended = selected?.status === "ATTENDED";
  const isExpired = selected?.status === "EXPIRED";
  const isConverted = !!selected?.converted_sales_order_code;
  const isBlocked = !!selected?.commercial_blocked || selected?.release_status === "BLOCKED";
  const hasDAV = !!selected?.dav_generated_at;
  /** O backend recusa alterações em orçamento encerrado ou já convertido. */
  const locked = isCancelled || isAttended || isExpired || isConverted;
  const canConvert = !!selected && !locked && !isBlocked && selected.quotation_type !== "CONSULTA" && items.length > 0;
  const nextStatuses = QUOTATION_STATUS_TRANSITIONS[selected?.status ?? ""] ?? [];
  /**
   * Trocar status/liberação recarrega o registro e descartaria edições não
   * salvas da capa — por isso essas ações ficam travadas enquanto houver
   * alteração pendente.
   */
  const dirty = useMemo(() => {
    if (creating || !selected) return false;
    const strip = (q: SalesQuotationDTO) => { const copy = { ...q }; delete copy.items; return copy; };
    return JSON.stringify(strip(form)) !== JSON.stringify(strip(selected));
  }, [creating, form, selected]);
  const freightDisabled = FREIGHT_TYPES_WITHOUT_CHARGE.includes(form.freight_type ?? "");

  const visible = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return quotations;
    return quotations.filter((o) =>
      String(o.quotation_number ?? "").includes(q) || String(o.code ?? "").includes(q) ||
      String(o.customer_code ?? "").includes(q) || (o.purchase_order_number ?? "").toLowerCase().includes(q));
  }, [quotations, listSearch]);

  const sm = statusMeta(selected?.status);
  const rm = releaseMeta(selected?.release_status);
  const editable = creating || !locked;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Orçamento de Venda</span>
          <span className="erp-crumb-code">VVND0300</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Proposta → liberação → conversão em pedido</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className="erp-btn erp-btn-primary" onClick={novo} disabled={busy}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Novo orçamento
          </button>
          <button className="erp-btn erp-btn-dark" onClick={salvar} disabled={busy || (!creating && !selected) || (!creating && locked)}>
            {busy && <span className="erp-spin" />}{creating ? "Criar orçamento" : "Salvar capa"}
          </button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Situação</span>
          <select className="erp-tselect" style={{ width: 168 }} value="" disabled={busy || !selected || locked || dirty || nextStatuses.length === 0}
            title={dirty ? "Salve a capa antes de trocar o status" : undefined}
            onChange={(e) => mudarStatus(e.target.value)}>
            <option value="">Alterar status…</option>
            {nextStatuses.map((s) => <option key={s} value={s}>{statusMeta(s).label}</option>)}
          </select>
          {selected?.release_status === "BLOCKED"
            ? <button className="erp-btn" onClick={() => abrirAcao({ kind: "release", target: "MANUAL_RELEASED" })} disabled={busy || locked || dirty}>Liberar</button>
            : <button className="erp-btn" onClick={() => abrirAcao({ kind: "release", target: "BLOCKED" })} disabled={busy || !selected || locked || dirty}>Bloquear</button>}
          {dirty && <span className="erp-tgroup-label">capa alterada — salve primeiro</span>}
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Orçamento</span>
          <button className="erp-btn erp-btn-dark" onClick={converter} disabled={busy || !canConvert}
            title={canConvert ? undefined : "Converte só orçamento ativo, liberado, com itens e fora do tipo CONSULTA"}>Converter em pedido</button>
          <button className="erp-btn" onClick={() => abrirAcao({ kind: "attend" })} disabled={busy || !selected || locked}>Atender</button>
          <button className="erp-btn" onClick={gerarDAV} disabled={busy || !selected || locked || hasDAV}
            title={hasDAV ? "DAV já gerado neste orçamento" : "Registra a geração do DAV/Pré-Venda"}>Gerar DAV</button>
          {isCancelled
            ? <button className="erp-btn" onClick={() => abrirAcao({ kind: "uncancel" })} disabled={busy || (!!cancelledWith && !canUncancel)}
                title={cancelledWith && !canUncancel ? `O motivo "${cancelledWith.description}" não permite descancelamento` : undefined}>Descancelar</button>
            : <button className="erp-btn erp-btn-danger" onClick={() => abrirAcao({ kind: "cancel" })} disabled={busy || !selected || isAttended || isConverted}>Cancelar</button>}
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Filtrar</span>
          <input className="erp-tinput num" style={{ width: 84 }} type="number" placeholder="Nº orç." value={filters.quotation_number} onChange={(e) => setFilters((f) => ({ ...f, quotation_number: e.target.value }))} />
          <input className="erp-tinput num" style={{ width: 84 }} type="number" placeholder="Cliente" value={filters.customer} onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))} />
          <select className="erp-tselect" style={{ width: 150 }} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">Todos status</option>
            {QUOTATION_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="erp-tselect" style={{ width: 130 }} value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
            <option value="">Todos tipos</option>
            {QUOTATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="erp-tinput num" style={{ width: 84 }} type="number" placeholder="Divisão" value={filters.division} onChange={(e) => setFilters((f) => ({ ...f, division: e.target.value }))} />
          <input className="erp-tinput" style={{ width: 110 }} placeholder={purchaseOrderLabel} title={purchaseOrderLabel} value={filters.purchase_order} onChange={(e) => setFilters((f) => ({ ...f, purchase_order: e.target.value }))} />
          <input className="erp-tinput" style={{ width: 128 }} type="date" title="Emissão de" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          <input className="erp-tinput" style={{ width: 128 }} type="date" title="Emissão até" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          <button className="erp-btn" onClick={() => void listar(0)} disabled={busy}>Listar</button>
          <button className="erp-btn" onClick={gerarRelatorio} disabled={busy}>Relatório</button>
        </div>
        <div className="erp-tgroup">
          <ExportButton title="VVND0300 — Orçamento de Venda" filename="vvnd0300" />
        </div>
      </div>

      <div className="erp-content">
      {feedback && (
        <div className={`erp-feedback ${feedback.type}`}>
          {busy && <span className="erp-spin" />}{feedback.message}
        </div>
      )}

      <div className="erp-main">
        <aside className="erp-list-panel">
          <div className="erp-panel-head">
            <span className="erp-panel-title">Orçamentos</span>
            <span className="erp-count">{visible.length}</span>
            <div className="erp-panel-head-spacer" />
            <input className="erp-search" placeholder="Buscar…" value={listSearch} onChange={(e) => setListSearch(e.target.value)} />
          </div>
          <div className="erp-list">
            {visible.length === 0 && (
              <div className="erp-list-empty">Nenhum orçamento carregado.<br />Use <strong>Listar</strong> na barra acima.</div>
            )}
            {visible.map((o) => {
              const m = statusMeta(o.status);
              return (
                <div key={o.code} className={`erp-list-row${selected?.code === o.code ? " sel" : ""}`} onClick={() => abrir(o.code)}>
                  <span className="erp-list-code">#{o.quotation_number || o.code}</span>
                  <span className="erp-list-sub">Cliente {o.customer_code ?? "—"}</span>
                  <span className="erp-list-money">R$ {money(o.total_net)}</span>
                  <div className="erp-list-meta">
                    <span className={`erp-badge ${m.cls}`}>{m.label}</span>
                    {o.release_status === "BLOCKED" && <span className="erp-badge err">Bloqueado</span>}
                    {o.dav_generated_at && <span className="erp-badge warn">DAV</span>}
                    {o.converted_sales_order_code && <span className="erp-badge ok">→ Pedido {o.converted_sales_order_code}</span>}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--v-text-3)" }}>{o.valid_until ?? ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {(page > 0 || quotations.length === PAGE_SIZE) && (
            <div className="erp-results-bar">
              <span className="erp-results-bar-label">Página {page + 1}</span>
              <div className="erp-panel-head-spacer" />
              <button className="erp-btn erp-btn-sm" onClick={() => void listar(page - 1)} disabled={busy || page === 0}>Anterior</button>
              <button className="erp-btn erp-btn-sm" onClick={() => void listar(page + 1)} disabled={busy || quotations.length < PAGE_SIZE}>Próxima</button>
            </div>
          )}
        </aside>

        <section className="erp-detail-panel">
          {creating || selected ? (
            <>
              <div className="erp-tabs">
                <button className={`erp-tab${tab === "dados" ? " active" : ""}`} onClick={() => setTab("dados")}>
                  {creating ? "Novo orçamento" : "Dados gerais"}
                </button>
                {!creating && <button className={`erp-tab${tab === "itens" ? " active" : ""}`} onClick={() => setTab("itens")}>Itens ({items.length})</button>}
                {!creating && <button className={`erp-tab${tab === "anexos" ? " active" : ""}`} onClick={() => setTab("anexos")}>Anexos ({attachments.length})</button>}
                {!creating && <button className={`erp-tab${tab === "historico" ? " active" : ""}`} onClick={() => setTab("historico")}>Histórico ({events.length})</button>}
              </div>
              <div className="erp-detail-body">

                {pending && (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      {pending.kind === "cancel" && "Cancelar orçamento"}
                      {pending.kind === "uncancel" && "Descancelar orçamento"}
                      {pending.kind === "cancel-item" && `Cancelar item ${pending.sequence ?? pending.itemCode}`}
                      {pending.kind === "attend" && "Atender orçamento (encerra sem gerar pedido)"}
                      {pending.kind === "release" && (pending.target === "BLOCKED" ? "Bloquear comercialmente" : "Liberar comercialmente")}
                    </div>
                    <div className="erp-fieldset-body">
                      {pending.kind === "attend" || pending.kind === "release" ? (
                        <div className="erp-field erp-c8">
                          <label className="erp-label erp-req">Motivo</label>
                          <input className="erp-input" value={reasonText} onChange={(e) => setReasonText(e.target.value)} placeholder="Descreva o motivo" autoFocus />
                        </div>
                      ) : pending.kind === "uncancel" && cancelledWith ? (
                        <div className="erp-field erp-c8">
                          <label className="erp-label">Motivo do cancelamento</label>
                          <input className="erp-input" value={`${cancelledWith.code} — ${cancelledWith.description}`} readOnly />
                          <span className="erp-field-hint">O backend só descancela com o mesmo motivo do cancelamento — por isso ele não é editável.</span>
                        </div>
                      ) : (
                        <div className="erp-field erp-c8">
                          <label className="erp-label erp-req">Motivo cadastrado</label>
                          <select className="erp-input" value={reasonCode || ""} onChange={(e) => setReasonCode(Number(e.target.value))} autoFocus>
                            <option value="">Selecione o motivo…</option>
                            {reasonOptions.map((r) => (
                              <option key={r.code} value={r.code}>
                                {r.code} — {r.description}{r.require_complement ? " (exige complemento)" : ""}
                              </option>
                            ))}
                          </select>
                          {pending.kind === "uncancel" && (
                            <span className="erp-field-hint">
                              Não foi possível identificar o motivo original deste cancelamento
                              {selected?.cancel_reason ? ` ("${selected.cancel_reason}")` : ""} entre os motivos ativos.
                              Escolha o mesmo motivo usado no cancelamento — qualquer outro é recusado pelo backend.
                            </span>
                          )}
                          {reasonOptions.length === 0 && (
                            <span className="erp-field-hint">
                              Nenhum motivo {pending.kind === "uncancel" ? "com permissão de descancelamento " : ""}cadastrado — cadastre em <strong>VVND0310</strong>.
                            </span>
                          )}
                        </div>
                      )}
                      {pending.kind !== "release" && (
                        <div className="erp-field erp-c12">
                          <label className={`erp-label${selectedReason?.require_complement ? " erp-req" : ""}`}>Complemento</label>
                          <textarea className="erp-textarea" rows={2} value={complement} onChange={(e) => setComplement(e.target.value)}
                            placeholder={selectedReason?.require_complement ? "Obrigatório para este motivo" : "Opcional"} />
                        </div>
                      )}
                      <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                        <button className="erp-btn erp-btn-primary" onClick={confirmarAcao} disabled={busy}>{busy && <span className="erp-spin" />}Confirmar</button>
                        <button className="erp-btn" onClick={() => setPending(null)} disabled={busy}>Desistir</button>
                      </div>
                    </div>
                  </div>
                )}

                {tab === "dados" && (
                  <>
                    {!creating && selected && (
                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">
                          Orçamento #{selected.quotation_number || selected.code}
                          <span className={`erp-badge ${sm.cls}`} style={{ marginLeft: 4 }}>{sm.label}</span>
                          <span className={`erp-badge ${rm.cls}`}>{rm.label}</span>
                          {selected.commercial_blocked && <span className="erp-badge err">Bloqueio comercial</span>}
                          {hasDAV && <span className="erp-badge warn">DAV gerado</span>}
                          {isConverted && <span className="erp-badge ok">→ Pedido {selected.converted_sales_order_code}</span>}
                        </div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c3"><label className="erp-label">Total bruto</label><input className="erp-input num" value={money(selected.total_gross)} readOnly /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Total líquido</label><input className="erp-input strong num" value={money(selected.total_net)} readOnly /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Retenções</label><input className="erp-input num" value={money(selected.retained_tax_value)} readOnly /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Saldo aberto (itens)</label><input className="erp-input num" value={qty(openBalance)} readOnly /></div>
                          {selected.commercial_block_reason && (
                            <div className="erp-field erp-c12"><label className="erp-label">Motivo do bloqueio</label><input className="erp-input" value={selected.commercial_block_reason} readOnly /></div>
                          )}
                          {selected.cancel_reason && (
                            <div className="erp-field erp-c6"><label className="erp-label">Motivo do cancelamento</label><input className="erp-input" value={`${selected.cancel_reason}${selected.cancel_complement ? ` — ${selected.cancel_complement}` : ""}`} readOnly /></div>
                          )}
                          {selected.attended_reason && (
                            <div className="erp-field erp-c6"><label className="erp-label">Atendimento</label><input className="erp-input" value={`${selected.attended_reason} (${dateTime(selected.attended_at)})`} readOnly /></div>
                          )}
                          {hasDAV && (
                            <div className="erp-field erp-c12">
                              <span className="erp-field-hint">
                                DAV gerado em {dateTime(selected.dav_generated_at)}. Documentos liberados:{" "}
                                {[selected.can_print_dav_report && "relatório DAV", selected.can_print_fiscal_receipt && "cupom fiscal",
                                  selected.can_print_sales_order && "impressão de pedido", selected.can_send_email && "envio por e-mail"]
                                  .filter(Boolean).join(", ") || "nenhum"}.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Identificação</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c3">
                          <label className="erp-label">Nº do orçamento</label>
                          <input className="erp-input strong" value={creating ? "(gerado automaticamente)" : String(form.quotation_number ?? "")} readOnly />
                        </div>
                        <div className="erp-field erp-c3">
                          <label className="erp-label">Estabelecimento</label>
                          <LookupField value={form.enterprise_code} loader={loadEstablishments} entityLabel="estabelecimento" placeholder="Assumido do login" disabled={!creating} onChange={(code) => setQ("enterprise_code", code ?? 0)} />
                          {creating && <span className="erp-field-hint">Em branco assume a empresa do seu login; o backend recusa um estabelecimento diferente.</span>}
                        </div>
                        <div className="erp-field erp-c3">
                          <label className="erp-label erp-req">Cliente</label>
                          <LookupField value={form.customer_code} loader={loadCustomers} entityLabel="cliente" placeholder="Selecionar cliente" disabled={!editable} onChange={(code) => setQ("customer_code", code ?? undefined)} />
                        </div>
                        <div className="erp-field erp-c3">
                          <label className="erp-label">Tipo</label>
                          <select className="erp-input" value={form.quotation_type ?? "VENDA"} disabled={!editable} onChange={(e) => setQ("quotation_type", e.target.value)}>
                            {QUOTATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          {form.quotation_type === "CONSULTA" && <span className="erp-field-hint">Orçamento de consulta não pode ser convertido em pedido.</span>}
                        </div>
                        <div className="erp-field erp-c3">
                          <label className="erp-label">Representante</label>
                          <LookupField value={form.representative_code} loader={loadRepresentatives} entityLabel="representante" placeholder="Selecionar representante" disabled={!editable} onChange={(code) => setQ("representative_code", code ?? undefined)} />
                        </div>
                        <div className="erp-field erp-c3">
                          <label className="erp-label">Divisão de vendas</label>
                          <LookupField value={form.sales_division_code} loader={loadSalesDivisions} entityLabel="divisão" placeholder="Selecionar divisão" disabled={!editable} onChange={(code) => setQ("sales_division_code", code ?? undefined)} />
                          <span className="erp-field-hint">Condição de pagamento diferente da do cliente exige divisão com condição livre (VVND0100).</span>
                        </div>
                        <div className="erp-field erp-c3"><label className="erp-label">{purchaseOrderLabel}</label><input className="erp-input" value={form.purchase_order_number ?? ""} disabled={!editable} onChange={(e) => setQ("purchase_order_number", e.target.value)} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">{deliveryAuthLabel}</label><input className="erp-input" value={form.delivery_authorization ?? ""} disabled={!editable} onChange={(e) => setQ("delivery_authorization", e.target.value)} /></div>
                      </div>
                    </div>

                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Condições comerciais</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c3">
                          <label className="erp-label">Cond. pagamento</label>
                          <LookupField value={form.payment_term_code} loader={loadPaymentConditions} entityLabel="condição de pagamento" placeholder="Padrão do cliente" disabled={!editable} onChange={(code) => setQ("payment_term_code", code ?? undefined)} />
                        </div>
                        <div className="erp-field erp-c3">
                          <label className="erp-label">Tabela de preço</label>
                          <LookupField value={form.price_table_code} loader={loadSalesTables} entityLabel="tabela de preço" placeholder="Padrão do cliente" disabled={!editable} onChange={(code) => setQ("price_table_code", code ?? undefined)} />
                        </div>
                        <div className="erp-field erp-c3"><label className="erp-label">Moeda</label><input className="erp-input" value={form.currency_code ?? "BRL"} disabled={!editable} onChange={(e) => setQ("currency_code", e.target.value.toUpperCase())} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Comissão %</label><input className="erp-input num" type="number" step="0.01" value={form.commission_pct ?? 0} disabled={!editable} onChange={(e) => setQ("commission_pct", Number(e.target.value))} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Probabilidade %</label><input className="erp-input num" type="number" step="0.01" value={form.probability_pct ?? 0} disabled={!editable} onChange={(e) => setQ("probability_pct", Number(e.target.value))} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Emissão</label><input className="erp-input" type="date" value={form.emission_date ?? ""} disabled={!creating} onChange={(e) => setQ("emission_date", e.target.value)} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Válido até</label><input className="erp-input" type="date" value={form.valid_until ?? ""} disabled={!editable} onChange={(e) => setQ("valid_until", e.target.value)} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Entrega prevista</label><input className="erp-input" type="date" value={form.delivery_date ?? ""} disabled={!editable} onChange={(e) => setQ("delivery_date", e.target.value)} /></div>
                        <div className="erp-field erp-c3">
                          <label className="erp-label">Data firme</label>
                          <label className="erp-check"><input type="checkbox" checked={!!form.delivery_date_firm} disabled={!editable} onChange={(e) => setQ("delivery_date_firm", e.target.checked)} /><span>Entrega é data firme</span></label>
                        </div>
                        <div className="erp-field erp-c3">
                          <label className="erp-label">NFC-e</label>
                          <label className="erp-check"><input type="checkbox" checked={!!form.is_nfce} disabled={!editable || !!form.delivery_with_receipt} onChange={(e) => setQ("is_nfce", e.target.checked)} /><span>Venda com NFC-e</span></label>
                        </div>
                        <div className="erp-field erp-c3">
                          <label className="erp-label">Entrega com recibo</label>
                          <label className="erp-check"><input type="checkbox" checked={!!form.delivery_with_receipt} disabled={!editable} onChange={(e) => { setQ("delivery_with_receipt", e.target.checked); if (e.target.checked) setQ("is_nfce", true); }} /><span>Força NFC-e e zera IPI</span></label>
                        </div>
                        <div className="erp-field erp-c3"><label className="erp-label">Documento estrangeiro</label><input className="erp-input" value={form.foreign_document ?? ""} disabled={!editable} onChange={(e) => setQ("foreign_document", e.target.value)} placeholder="Só p/ consumidor final" /></div>
                      </div>
                    </div>

                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Transporte e valores</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c3">
                          <label className="erp-label">Transportadora</label>
                          <LookupField value={form.carrier_code} loader={loadCarriers} entityLabel="transportadora" placeholder="Padrão do cliente" disabled={!editable} onChange={(code) => setQ("carrier_code", code ?? undefined)} />
                        </div>
                        <div className="erp-field erp-c3">
                          <label className="erp-label">Tipo de frete</label>
                          <select className="erp-input" value={form.freight_type ?? ""} disabled={!editable} onChange={(e) => setQ("freight_type", e.target.value)}>
                            <option value="">—</option>
                            {FREIGHT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          {freightDisabled && <span className="erp-field-hint">Este tipo zera frete e seguro na gravação.</span>}
                        </div>
                        <div className="erp-field erp-c3">
                          <label className="erp-label">Conferir frete</label>
                          <label className="erp-check"><input type="checkbox" checked={!!form.verify_freight} disabled={!editable} onChange={(e) => setQ("verify_freight", e.target.checked)} /><span>Aplica frete CIF mínimo</span></label>
                        </div>
                        <div className="erp-field erp-c3"><label className="erp-label">Frete</label><input className="erp-input num" type="number" step="0.01" value={form.freight_value ?? 0} disabled={!editable || freightDisabled} onChange={(e) => setQ("freight_value", Number(e.target.value))} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Redespacho</label><input className="erp-input num" type="number" step="0.01" value={form.redelivery_freight_value ?? 0} disabled={!editable} onChange={(e) => setQ("redelivery_freight_value", Number(e.target.value))} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Seguro</label><input className="erp-input num" type="number" step="0.01" value={form.insurance_value ?? 0} disabled={!editable || freightDisabled} onChange={(e) => setQ("insurance_value", Number(e.target.value))} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Desconto</label><input className="erp-input num" type="number" step="0.01" value={form.discount_value ?? 0} disabled={!editable} onChange={(e) => setQ("discount_value", Number(e.target.value))} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Acréscimo</label><input className="erp-input num" type="number" step="0.01" value={form.surcharge_value ?? 0} disabled={!editable} onChange={(e) => setQ("surcharge_value", Number(e.target.value))} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Retenções</label><input className="erp-input num" type="number" step="0.01" value={form.retained_tax_value ?? 0} disabled={!editable} onChange={(e) => setQ("retained_tax_value", Number(e.target.value))} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Logradouro (NFC-e)</label><input className="erp-input" value={form.street ?? ""} disabled={!editable} onChange={(e) => setQ("street", e.target.value)} /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Número</label><input className="erp-input" value={form.street_number ?? ""} disabled={!editable} onChange={(e) => setQ("street_number", e.target.value)} /></div>
                      </div>
                    </div>

                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Observações</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c6"><label className="erp-label">Observações internas</label><textarea className="erp-textarea" rows={2} value={form.notes ?? ""} disabled={!editable} onChange={(e) => setQ("notes", e.target.value)} /></div>
                        <div className="erp-field erp-c6"><label className="erp-label">Observações ao cliente</label><textarea className="erp-textarea" rows={2} value={form.obs_customer ?? ""} disabled={!editable} onChange={(e) => setQ("obs_customer", e.target.value)} /></div>
                      </div>
                    </div>

                    {locked && !creating && (
                      <p style={{ fontSize: 12, color: "var(--v-text-3)" }}>
                        Orçamento encerrado ({sm.label}{isConverted ? ", já convertido" : ""}) — a capa e os itens ficam somente para consulta.
                      </p>
                    )}
                  </>
                )}

                {tab === "itens" && !creating && (
                  <>
                    {!locked && (
                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">Adicionar item</div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c1">
                            <label className="erp-label">Seq.</label>
                            <input className="erp-input num" type="number" min={1} placeholder={String(nextSequence)} value={newItem.sequence || ""} onChange={(e) => setI("sequence", e.target.value ? Number(e.target.value) : undefined)} />
                          </div>
                          <div className="erp-field erp-c3"><label className="erp-label erp-req">Item</label><LookupField value={newItem.item_code} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(code) => setI("item_code", String(code ?? ""))} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label erp-req">Qtd</label><input className="erp-input num" type="number" step="0.0001" value={newItem.requested_qty || ""} onChange={(e) => setI("requested_qty", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c1"><label className="erp-label">UM</label><input className="erp-input" value={newItem.sales_uom ?? ""} onChange={(e) => setI("sales_uom", e.target.value)} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label erp-req">Preço unit.</label><input className="erp-input num" type="number" step="0.0001" value={newItem.unit_price || ""} onChange={(e) => setI("unit_price", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c1"><label className="erp-label">Desc.%</label><input className="erp-input num" type="number" step="0.01" value={newItem.discount_pct || ""} onChange={(e) => setI("discount_pct", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c1"><label className="erp-label">IPI %</label><input className="erp-input num" type="number" step="0.01" value={newItem.ipi_pct || ""} disabled={!!selected?.delivery_with_receipt} onChange={(e) => setI("ipi_pct", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c1"><label className="erp-label">ST %</label><input className="erp-input num" type="number" step="0.01" value={newItem.st_pct || ""} onChange={(e) => setI("st_pct", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Depósito</label><LookupField value={newItem.warehouse_code} loader={loadWarehouses} entityLabel="depósito" placeholder="Selecionar depósito" onChange={(code) => setI("warehouse_code", code ?? undefined)} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Entrega</label><input className="erp-input" type="date" value={newItem.delivery_date ?? ""} onChange={(e) => setI("delivery_date", e.target.value)} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Máscara</label><input className="erp-input" value={newItem.mask ?? ""} onChange={(e) => setI("mask", e.target.value)} /></div>
                          <div className="erp-field erp-c12" style={{ flexDirection: "row" }}>
                            <button className="erp-btn erp-btn-primary" onClick={adicionarItem} disabled={busy}>{busy && <span className="erp-spin" />}Adicionar item ao orçamento</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {editItem && (
                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">Editar item {editItem.sequence ?? editItem.code}</div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c2"><label className="erp-label">Qtd solicitada</label><input className="erp-input num" type="number" step="0.0001" value={editItem.requested_qty} onChange={(e) => setEI("requested_qty", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Preço unit.</label><input className="erp-input num" type="number" step="0.0001" value={editItem.unit_price} onChange={(e) => setEI("unit_price", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Qtd atendida</label><input className="erp-input num" type="number" step="0.0001" value={editItem.attended_qty ?? 0} onChange={(e) => setEI("attended_qty", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Qtd cancelada</label><input className="erp-input num" type="number" step="0.0001" value={editItem.cancelled_qty ?? 0} onChange={(e) => setEI("cancelled_qty", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c1"><label className="erp-label">Desc.%</label><input className="erp-input num" type="number" step="0.01" value={editItem.discount_pct ?? 0} onChange={(e) => setEI("discount_pct", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c1"><label className="erp-label">IPI %</label><input className="erp-input num" type="number" step="0.01" value={editItem.ipi_pct ?? 0} disabled={!!selected?.delivery_with_receipt} onChange={(e) => setEI("ipi_pct", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c1"><label className="erp-label">ST %</label><input className="erp-input num" type="number" step="0.01" value={editItem.st_pct ?? 0} onChange={(e) => setEI("st_pct", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Entrega</label><input className="erp-input" type="date" value={editItem.delivery_date ?? ""} onChange={(e) => setEI("delivery_date", e.target.value)} /></div>
                          <div className="erp-field erp-c9"><label className="erp-label">Observações</label><input className="erp-input" value={editItem.notes ?? ""} onChange={(e) => setEI("notes", e.target.value)} /></div>
                          <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                            <button className="erp-btn erp-btn-primary" onClick={salvarItem} disabled={busy}>{busy && <span className="erp-spin" />}Salvar item</button>
                            <button className="erp-btn" onClick={() => setEditItem(null)} disabled={busy}>Desistir</button>
                          </div>
                          <span className="erp-field-hint">Atendida + cancelada não pode passar da quantidade solicitada; o status do item é recalculado pelo backend.</span>
                        </div>
                      </div>
                    )}

                    <div className="erp-grid-wrap">
                      <table className="erp-grid">
                        <thead>
                          <tr>
                            <th className="num">Seq</th><th className="num">Item</th><th className="num">Qtd</th><th className="num">Atend.</th>
                            <th className="num">Canc.</th><th className="num">Saldo</th><th>UM</th><th className="num">Preço unit.</th>
                            <th className="num">Desc. %</th><th className="num">IPI %</th><th className="num">ST %</th>
                            <th className="num">Total líq.</th><th className="num">Líq. c/ IPI</th><th>Status</th><th style={{ width: 140 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 && (
                            <tr><td colSpan={15} className="erp-grid-empty">Nenhum item neste orçamento{locked ? "" : " — use a barra acima para adicionar"}.</td></tr>
                          )}
                          {items.map((it) => (
                            <tr key={it.code}>
                              <td className="num">{it.sequence}</td>
                              <td className="num">{it.item_code}</td>
                              <td className="num">{qty(it.requested_qty)}</td>
                              <td className="num">{qty(it.attended_qty)}</td>
                              <td className="num">{qty(it.cancelled_qty)}</td>
                              <td className="num">{qty(it.balance ?? it.requested_qty)}</td>
                              <td>{it.sales_uom ?? "—"}</td>
                              <td className="num">{money(it.unit_price)}</td>
                              <td className="num">{it.discount_pct ?? 0}</td>
                              <td className="num">{it.ipi_pct ?? 0}</td>
                              <td className="num">{it.st_pct ?? 0}</td>
                              <td className="num">{money(it.total_net)}</td>
                              <td className="num">{money(it.total_net_with_ipi)}</td>
                              <td>{ITEM_STATUS_LABEL[it.status ?? ""] ?? it.status ?? "—"}</td>
                              <td>
                                {!locked && it.status !== "CANCELLED" && (
                                  <>
                                    <button className="erp-btn erp-btn-sm" onClick={() => setEditItem({ ...it })} disabled={busy}>Editar</button>{" "}
                                    <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => abrirAcao({ kind: "cancel-item", itemCode: it.code!, sequence: it.sequence })} disabled={busy}>Cancelar</button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {items.length > 0 && (
                          <tfoot>
                            <tr><td colSpan={11} className="num">Total líquido dos itens</td><td className="num">{money(itemsTotal)}</td><td colSpan={3}></td></tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </>
                )}

                {tab === "anexos" && !creating && (
                  <>
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Incluir anexo</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c8">
                          <label className="erp-label">Arquivo (até 10 MB)</label>
                          <input ref={fileInput} className="erp-input" type="file" disabled={busy || locked}
                            onChange={(e) => enviarAnexo(e.target.files?.[0])} />
                          <span className="erp-field-hint">O arquivo é enviado assim que selecionado.</span>
                        </div>
                      </div>
                    </div>
                    <div className="erp-grid-wrap">
                      <table className="erp-grid">
                        <thead>
                          <tr><th className="num">ID</th><th>Arquivo</th><th>Tipo</th><th className="num">Tamanho</th><th>Enviado em</th><th style={{ width: 150 }}></th></tr>
                        </thead>
                        <tbody>
                          {attachments.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum anexo neste orçamento.</td></tr>}
                          {attachments.map((a) => (
                            <tr key={a.id}>
                              <td className="num">{a.id}</td>
                              <td>{a.file_name}</td>
                              <td>{a.content_type || "—"}</td>
                              <td className="num">{fileSize(a.file_size)}</td>
                              <td>{dateTime(a.uploaded_at)}</td>
                              <td>
                                <button className="erp-btn erp-btn-sm" onClick={() => baixarAnexo(a)} disabled={busy}>Baixar</button>{" "}
                                <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => excluirAnexo(a)} disabled={busy || locked}>Excluir</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {tab === "historico" && !creating && (
                  <div className="erp-grid-wrap">
                    <table className="erp-grid">
                      <thead>
                        <tr><th>Data</th><th>Evento</th><th className="num">Item</th><th>Motivo</th><th>Complemento</th></tr>
                      </thead>
                      <tbody>
                        {events.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum evento registrado.</td></tr>}
                        {events.map((ev) => (
                          <tr key={ev.id}>
                            <td>{dateTime(ev.event_date || ev.created_at)}</td>
                            <td>{EVENT_TYPE_LABEL[ev.event_type ?? ""] ?? ev.event_type ?? "—"}</td>
                            <td className="num">{ev.sales_quotation_item_code ?? "—"}</td>
                            <td>{ev.reason || "—"}</td>
                            <td>{ev.complement || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="erp-detail-empty">
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M3 9h18M8 4v16" stroke="currentColor" strokeWidth="1.4"/></svg>
              <div className="erp-detail-empty-title">Nenhum orçamento selecionado</div>
              <div className="erp-detail-empty-sub">Selecione um orçamento na lista à esquerda, ou clique em <strong>Novo orçamento</strong> para começar uma proposta.</div>
            </div>
          )}
        </section>
      </div>

      </div>
      <footer className="erp-statusbar">
        <div className="erp-status-item">Orçamentos na lista: <strong>{visible.length}</strong></div>
        {report && (
          <div className="erp-status-item">
            Relatório: <strong>{report.total_quotations ?? 0}</strong> propostas · líq. R$ <strong>{money(report.total_net)}</strong> ·
            ponderado R$ <strong>{money(report.weighted_net)}</strong> · retenções R$ <strong>{money(report.retained_tax)}</strong> ·
            abertos {report.open_count ?? 0} / convertidos {report.converted_count ?? 0} / cancelados {report.cancelled_count ?? 0}
          </div>
        )}
        {selected && <div className="erp-status-item">Selecionado: <strong>#{selected.quotation_number || selected.code}</strong> ({sm.label} · {rm.label})</div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
