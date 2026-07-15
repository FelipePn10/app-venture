import { useState, useCallback, useMemo } from "react";
import {
  type SalesQuotationDTO,
  type SalesQuotationItemDTO,
  type SalesQuotationReportDTO,
  listSalesQuotations,
  getSalesQuotation,
  getSalesQuotationReport,
  createSalesQuotation,
  cancelSalesQuotation,
  uncancelSalesQuotation,
  attendSalesQuotation,
  convertSalesQuotationToOrder,
  createSalesQuotationItem,
  cancelSalesQuotationItem,
} from "@/services/salesQuotationService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers, loadEstablishments, loadItems } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type DetailTab = "dados" | "itens";
const today = () => new Date().toISOString().slice(0, 10);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Status do orçamento → rótulo + classe de badge. */
const STATUS_META: Record<string, { label: string; cls: string }> = {
  R: { label: "Rascunho", cls: "draft" },
  P: { label: "Registro externo", cls: "info" },
  A: { label: "Em análise", cls: "warn" },
  OA: { label: "Orçam. em análise", cls: "warn" },
  F: { label: "Pedido confirmado", cls: "ok" },
  OF: { label: "Orçam. confirmado", cls: "info" },
  ATTENDED: { label: "Atendido", cls: "ok" },
  EXPIRED: { label: "Expirado", cls: "err" },
  CANCELLED: { label: "Cancelado", cls: "err" },
};
const statusMeta = (s?: string) => (s && STATUS_META[s]) || { label: s ?? "—", cls: "draft" };

/** Tipos de orçamento aceitos pelo backend. */
const QUOTATION_TYPES = ["VENDA", "NEGOCIACAO", "CONSULTA", "API_TERCEIROS", "FOCCOPORTAL", "IMPORTADO"];
const FREIGHT_TYPES = ["", "CIF", "FOB", "TERCEIROS", "SEM_FRETE"];

const EMPTY_QUOTATION: SalesQuotationDTO = {
  enterprise_code: 1, customer_code: 0, currency_code: "BRL", quotation_type: "VENDA",
  payment_term_code: 0, emission_date: today(), valid_until: today(), commission_pct: 0,
  probability_pct: 100, is_nfce: false,
};
const EMPTY_ITEM: SalesQuotationItemDTO = {
  item_code: 0, requested_qty: 1, unit_price: 0, sales_uom: "UN", discount_pct: 0,
};

export function Vvnd0300Page(): JSX.Element {
  const [quotations, setQuotations] = useState<SalesQuotationDTO[]>([]);
  const [selected, setSelected] = useState<SalesQuotationDTO | null>(null);
  const [newQuo, setNewQuo] = useState<SalesQuotationDTO>(EMPTY_QUOTATION);
  const [newItem, setNewItem] = useState<SalesQuotationItemDTO>(EMPTY_ITEM);
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [report, setReport] = useState<SalesQuotationReportDTO | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<DetailTab>("dados");
  const [creating, setCreating] = useState(true);

  const setQ = useCallback(<K extends keyof SalesQuotationDTO>(k: K, v: SalesQuotationDTO[K]) => setNewQuo((p) => ({ ...p, [k]: v })), []);
  const setI = useCallback(<K extends keyof SalesQuotationItemDTO>(k: K, v: SalesQuotationItemDTO[K]) => setNewItem((p) => ({ ...p, [k]: v })), []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const refreshSelected = useCallback(async (code: number) => { setSelected(await getSalesQuotation(code)); }, []);

  const listar = () => run(async () => {
    setQuotations(await listSalesQuotations({
      customer_code: filterCustomer ? Number(filterCustomer) : undefined,
      status: filterStatus || undefined,
    }));
  });
  const gerarRelatorio = () => run(async () => {
    setReport(await getSalesQuotationReport({
      customer_code: filterCustomer ? Number(filterCustomer) : undefined,
      status: filterStatus || undefined,
    }));
    setFeedback({ type: "info", message: "Relatório consolidado atualizado (veja a barra de status)." });
  });

  const novo = () => { setCreating(true); setSelected(null); setNewQuo(EMPTY_QUOTATION); setTab("dados"); setFeedback(null); };
  const abrir = (code?: number) => { if (!code) return; setCreating(false); setTab("dados"); void run(async () => { await refreshSelected(code); }); };

  const criar = () => run(async () => {
    if (!newQuo.customer_code) { setFeedback({ type: "error", message: "Cliente é obrigatório." }); return; }
    if (!newQuo.enterprise_code) { setFeedback({ type: "error", message: "Estabelecimento é obrigatório." }); return; }
    const created = await createSalesQuotation(newQuo);
    setNewQuo(EMPTY_QUOTATION);
    await listar();
    if (created.code) { setCreating(false); await refreshSelected(created.code); }
    setFeedback({ type: "success", message: `Orçamento ${created.code} criado como rascunho.` });
  });

  const converter = (code?: number) => { if (code) void run(async () => {
    await convertSalesQuotationToOrder(code); await refreshSelected(code);
    setFeedback({ type: "success", message: "Convertido em pedido de venda — o saldo aberto foi copiado. Acompanhe no VVND0200." });
  }); };
  const cancelar = (code?: number) => { if (!code) return; const reason = window.prompt("Motivo do cancelamento:"); if (!reason) return;
    void run(async () => {
      await cancelSalesQuotation(code, reason); await refreshSelected(code);
      setFeedback({ type: "success", message: `Orçamento ${code} cancelado.` });
    });
  };
  const descancelar = (code?: number) => { if (code) void run(async () => {
    await uncancelSalesQuotation(code); await refreshSelected(code);
    setFeedback({ type: "success", message: `Orçamento ${code} reaberto.` });
  }); };
  const atender = (code?: number) => { if (code) void run(async () => {
    await attendSalesQuotation(code, "Atendimento manual"); await refreshSelected(code);
    setFeedback({ type: "success", message: `Orçamento ${code} atendido manualmente.` });
  }); };

  const adicionarItem = () => { const code = selected?.code; if (!code) return; void run(async () => {
    if (!newItem.item_code) { setFeedback({ type: "error", message: "Informe o código do item." }); return; }
    await createSalesQuotationItem({ ...newItem, sales_quotation_code: code });
    setNewItem(EMPTY_ITEM); await refreshSelected(code);
    setFeedback({ type: "success", message: "Item adicionado ao orçamento." });
  }); };
  const cancelarItem = (itemCode?: number) => { const code = selected?.code; if (!code || !itemCode) return; void run(async () => {
    await cancelSalesQuotationItem(itemCode); await refreshSelected(code);
    setFeedback({ type: "success", message: `Item ${itemCode} cancelado.` });
  }); };

  const items = useMemo(() => selected?.items ?? [], [selected?.items]);
  const itemsTotal = useMemo(() => items.reduce((s, it) => s + (it.total_net ?? 0), 0), [items]);
  const isDraft = selected?.status === "R";
  const isCancelled = selected?.status === "CANCELLED";
  const isConverted = !!selected?.converted_sales_order_code;

  const visible = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return quotations;
    return quotations.filter((o) => String(o.code ?? "").includes(q) || String(o.customer_code ?? "").includes(q) || (o.purchase_order_number ?? "").toLowerCase().includes(q));
  }, [quotations, listSearch]);

  const sm = statusMeta(selected?.status);

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
        <span className="erp-titlebar-meta">Proposta → aprovação → conversão em pedido</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className="erp-btn erp-btn-primary" onClick={novo} disabled={busy}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Novo orçamento
          </button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Orçamento</span>
          <button className="erp-btn erp-btn-dark" onClick={() => converter(selected?.code)} disabled={busy || !selected || isCancelled || isConverted || selected?.status === "EXPIRED" || selected?.status === "ATTENDED"}>Converter em pedido</button>
          <button className="erp-btn" onClick={() => atender(selected?.code)} disabled={busy || !selected || isCancelled || isConverted}>Atender</button>
          {isCancelled
            ? <button className="erp-btn" onClick={() => descancelar(selected?.code)} disabled={busy}>Descancelar</button>
            : <button className="erp-btn erp-btn-danger" onClick={() => cancelar(selected?.code)} disabled={busy || !selected}>Cancelar</button>}
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Filtrar</span>
          <input className="erp-tinput num" style={{ width: 96 }} type="number" placeholder="Cliente" value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} />
          <select className="erp-tselect" style={{ width: 150 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos status</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="erp-btn" onClick={listar} disabled={busy}>Listar</button>
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
                  <span className="erp-list-code">#{o.code}</span>
                  <span className="erp-list-sub">Cliente {o.customer_code}</span>
                  <span className="erp-list-money">R$ {money(o.total_net)}</span>
                  <div className="erp-list-meta">
                    <span className={`erp-badge ${m.cls}`}>{m.label}</span>
                    {o.converted_sales_order_code && <span className="erp-badge ok">→ Pedido {o.converted_sales_order_code}</span>}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--v-text-3)" }}>{o.valid_until?.slice(0, 10)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="erp-detail-panel">
          {creating ? (
            <>
              <div className="erp-tabs"><button className="erp-tab active">Novo orçamento</button></div>
              <div className="erp-detail-body">
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Identificação</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Nº do orçamento</label>
                      <input className="erp-input" value="(gerado automaticamente)" readOnly />
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label erp-req">Estabelecimento</label>
                      <LookupField value={newQuo.enterprise_code} loader={loadEstablishments} entityLabel="estabelecimento" placeholder="Selecionar estabelecimento" clearable={false} onChange={(code) => setQ("enterprise_code", code ?? 0)} />
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label erp-req">Cliente</label>
                      <LookupField value={newQuo.customer_code} loader={loadCustomers} entityLabel="cliente" placeholder="Selecionar cliente" onChange={(code) => setQ("customer_code", code ?? 0)} />
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Tipo</label>
                      <select className="erp-input" value={newQuo.quotation_type ?? "VENDA"} onChange={(e) => setQ("quotation_type", e.target.value)}>
                        {QUOTATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Condições comerciais</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label">Cond. pagamento</label><input className="erp-input num" type="number" value={newQuo.payment_term_code || ""} onChange={(e) => setQ("payment_term_code", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Ordem de compra</label><input className="erp-input" value={newQuo.purchase_order_number ?? ""} onChange={(e) => setQ("purchase_order_number", e.target.value)} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Comissão %</label><input className="erp-input num" type="number" value={newQuo.commission_pct || ""} onChange={(e) => setQ("commission_pct", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Probabilidade %</label><input className="erp-input num" type="number" value={newQuo.probability_pct ?? ""} onChange={(e) => setQ("probability_pct", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Emissão</label><input className="erp-input" type="date" value={newQuo.emission_date ?? ""} onChange={(e) => setQ("emission_date", e.target.value)} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Válido até</label><input className="erp-input" type="date" value={newQuo.valid_until ?? ""} onChange={(e) => setQ("valid_until", e.target.value)} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Tipo de frete</label><select className="erp-input" value={newQuo.freight_type ?? ""} onChange={(e) => setQ("freight_type", e.target.value)}>{FREIGHT_TYPES.map((t) => <option key={t} value={t}>{t || "—"}</option>)}</select></div>
                    <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="nfce" className="erp-check" type="checkbox" checked={!!newQuo.is_nfce} onChange={(e) => setQ("is_nfce", e.target.checked)} /><label htmlFor="nfce" className="erp-label" style={{ margin: 0 }}>Venda NFC-e</label></div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>{busy && <span className="erp-spin" />}Criar orçamento</button>
                  <button className="erp-btn" onClick={() => setNewQuo(EMPTY_QUOTATION)} disabled={busy}>Limpar</button>
                </div>
              </div>
            </>
          ) : selected ? (
            <>
              <div className="erp-tabs">
                <button className={`erp-tab${tab === "dados" ? " active" : ""}`} onClick={() => setTab("dados")}>Dados gerais</button>
                <button className={`erp-tab${tab === "itens" ? " active" : ""}`} onClick={() => setTab("itens")}>Itens ({items.length})</button>
              </div>
              <div className="erp-detail-body">
                {tab === "dados" ? (
                  <>
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">
                        Orçamento #{selected.code}
                        <span className={`erp-badge ${sm.cls}`} style={{ marginLeft: 4 }}>{sm.label}</span>
                        {isConverted && <span className="erp-badge ok">→ Pedido {selected.converted_sales_order_code}</span>}
                      </div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c3"><label className="erp-label">Nº do orçamento</label><input className="erp-input strong" value={selected.quotation_number ?? selected.code ?? ""} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Estabelecimento</label><input className="erp-input num" value={selected.enterprise_code ?? ""} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Cliente</label><input className="erp-input num" value={selected.customer_code ?? ""} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Tipo</label><input className="erp-input" value={selected.quotation_type ?? "—"} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Emissão</label><input className="erp-input" value={selected.emission_date?.slice(0, 10) ?? "—"} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Válido até</label><input className="erp-input" value={selected.valid_until?.slice(0, 10) ?? "—"} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Probabilidade %</label><input className="erp-input num" value={selected.probability_pct ?? 0} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Ordem de compra</label><input className="erp-input" value={selected.purchase_order_number ?? "—"} readOnly /></div>
                      </div>
                    </div>
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Totais</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c3"><label className="erp-label">Total bruto</label><input className="erp-input num" value={money(selected.total_gross)} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Retenções</label><input className="erp-input num" value={money(selected.retention_value)} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Valor ponderado</label><input className="erp-input num" value={money(selected.weighted_value)} readOnly /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Total líquido</label><input className="erp-input strong num" value={money(selected.total_net)} readOnly /></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {isDraft && (
                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">Adicionar item</div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label><LookupField value={newItem.item_code} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(code) => setI("item_code", code ?? 0)} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label erp-req">Qtd</label><input className="erp-input num" type="number" value={newItem.requested_qty || ""} onChange={(e) => setI("requested_qty", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c1"><label className="erp-label">UM</label><input className="erp-input" value={newItem.sales_uom ?? ""} onChange={(e) => setI("sales_uom", e.target.value)} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label erp-req">Preço unit.</label><input className="erp-input num" type="number" value={newItem.unit_price || ""} onChange={(e) => setI("unit_price", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c1"><label className="erp-label">Desc.%</label><input className="erp-input num" type="number" value={newItem.discount_pct || ""} onChange={(e) => setI("discount_pct", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Entrega</label><input className="erp-input" type="date" value={newItem.delivery_date ?? ""} onChange={(e) => setI("delivery_date", e.target.value)} /></div>
                          <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn erp-btn-primary" onClick={adicionarItem} disabled={busy}>{busy && <span className="erp-spin" />}Adicionar item ao orçamento</button></div>
                        </div>
                      </div>
                    )}
                    <div className="erp-grid-wrap">
                      <table className="erp-grid">
                        <thead>
                          <tr>
                            <th className="num">Seq</th><th className="num">Item</th><th className="num">Qtd</th><th className="num">Atend.</th>
                            <th className="num">Saldo</th><th>UM</th><th className="num">Preço unit.</th><th className="num">Desc. %</th>
                            <th className="num">Total líq.</th><th>Status</th><th style={{ width: 90 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 && (
                            <tr><td colSpan={11} className="erp-grid-empty">Nenhum item neste orçamento{isDraft ? " — use a barra acima para adicionar" : ""}.</td></tr>
                          )}
                          {items.map((it) => (
                            <tr key={it.code}>
                              <td className="num">{it.sequence}</td>
                              <td className="num">{it.item_code}</td>
                              <td className="num">{it.requested_qty}</td>
                              <td className="num">{it.attended_qty ?? 0}</td>
                              <td className="num">{it.balance ?? it.requested_qty}</td>
                              <td>{it.sales_uom ?? "—"}</td>
                              <td className="num">{money(it.unit_price)}</td>
                              <td className="num">{it.discount_pct ?? 0}</td>
                              <td className="num">{money(it.total_net)}</td>
                              <td>{it.status ?? "—"}</td>
                              <td>{isDraft && <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => cancelarItem(it.code)} disabled={busy}>Cancelar</button>}</td>
                            </tr>
                          ))}
                        </tbody>
                        {items.length > 0 && (
                          <tfoot>
                            <tr><td colSpan={8} className="num">Total líquido dos itens</td><td className="num">{money(itemsTotal)}</td><td colSpan={2}></td></tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                    {!isDraft && <p style={{ fontSize: 12, color: "var(--v-text-3)" }}>Itens só podem ser adicionados/cancelados enquanto o orçamento está em <strong>Rascunho</strong>.</p>}
                  </>
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
        {report && <div className="erp-status-item">Relatório: <strong>{report.total_quotations ?? 0}</strong> propostas · líq. R$ <strong>{money(report.total_net)}</strong> · ponderado R$ <strong>{money(report.weighted_value)}</strong></div>}
        {selected && <div className="erp-status-item">Selecionado: <strong>#{selected.code}</strong> ({sm.label})</div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
