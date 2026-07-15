import { useState, useCallback, useMemo } from "react";
import {
  type RecurringSaleDTO,
  listRecurringSales, getRecurringSale, createRecurringSale,
  generateRecurringOrder, cancelRecurringSale, getMonthlyRevenue,
} from "@/services/recurringSalesService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers, loadEstablishments, loadItems } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const oneYearFromToday = () => { const date = new Date(); date.setFullYear(date.getFullYear() + 1); return date.toISOString().slice(0, 10); };
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MOV_META: Record<string, { label: string; cls: string }> = {
  SALE: { label: "Venda", cls: "ok" }, UPGRADE: { label: "Upgrade", cls: "info" },
  DOWNGRADE: { label: "Downgrade", cls: "warn" }, ADJUSTMENT: { label: "Reajuste", cls: "info" },
  RECALCULATION: { label: "Recálculo", cls: "draft" }, CANCELLATION: { label: "Cancelamento", cls: "err" },
};
const movMeta = (s?: string) => (s && MOV_META[s]) || { label: s ?? "—", cls: "draft" };

const EMPTY: RecurringSaleDTO = {
  enterprise_code: 1, customer_code: 0, item_code: 0, movement_type: "SALE", term_type: "INDEFINITE",
  sale_date: today(), next_adjustment_date: today(), quantity: 1, unit_value: 0, grace_months: 0,
};

export function Vvre0200Page(): JSX.Element {
  const [rows, setRows] = useState<RecurringSaleDTO[]>([]);
  const [selected, setSelected] = useState<RecurringSaleDTO | null>(null);
  const [form, setForm] = useState<RecurringSaleDTO>(EMPTY);
  const [filterMov, setFilterMov] = useState("");
  const [filterActive, setFilterActive] = useState(true);
  const [revenue, setRevenue] = useState<Obj[] | null>(null);
  const [projectionFrom, setProjectionFrom] = useState(today());
  const [projectionTo, setProjectionTo] = useState(oneYearFromToday());
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(true);

  const setF = useCallback(<K extends keyof RecurringSaleDTO>(k: K, v: RecurringSaleDTO[K]) => setForm((p) => ({ ...p, [k]: v })), []);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const refreshSelected = useCallback(async (code: number) => { setSelected(await getRecurringSale(code)); }, []);
  const listar = () => run(async () => { setRows(await listRecurringSales({ movement_type: filterMov || undefined, active: filterActive })); });

  const novo = () => { setCreating(true); setSelected(null); setForm(EMPTY); setFeedback(null); };
  const abrir = (code?: number) => { if (!code) return; setCreating(false); void run(async () => { await refreshSelected(code); }); };

  const criar = () => run(async () => {
    if (!form.customer_code) { setFeedback({ type: "error", message: "Cliente é obrigatório." }); return; }
    if (!form.item_code) { setFeedback({ type: "error", message: "Item é obrigatório." }); return; }
    if (form.term_type === "INDEFINITE" && !form.next_adjustment_date) { setFeedback({ type: "error", message: "Vigência indeterminada exige data do próximo reajuste." }); return; }
    if (form.term_type === "FIXED" && (!form.months_quantity || !form.payments_quantity || !form.payment_value)) { setFeedback({ type: "error", message: "Vigência determinada exige meses, parcelas e valor da parcela." }); return; }
    const rep = { representative_code: 0, is_primary: true, commission_percent: 0, commission_base: "ORIGINAL" as const, is_lifetime: true };
    const created = await createRecurringSale({ ...form, representatives: [rep] });
    setForm(EMPTY); await listar();
    if (created.code) { setCreating(false); await refreshSelected(created.code); }
    setFeedback({ type: "success", message: `Recorrência ${created.code} criada.` });
  });

  const gerarPedido = (code?: number) => { if (code) void run(async () => {
    await generateRecurringOrder(code); await refreshSelected(code);
    setFeedback({ type: "success", message: "Pedido de venda gerado e vinculado à recorrência." });
  }); };
  const cancelar = (code?: number) => { if (!code) return; const reason = window.prompt("Motivo do cancelamento:") ?? undefined;
    void run(async () => { await cancelRecurringSale(code, reason); await refreshSelected(code); setFeedback({ type: "success", message: `Recorrência ${code} cancelada.` }); });
  };
  const receitaMensal = () => run(async () => {
    if (!projectionFrom || !projectionTo) { setFeedback({ type: "error", message: "Informe o início e o fim da projeção." }); return; }
    if (projectionFrom > projectionTo) { setFeedback({ type: "error", message: "A data inicial não pode ser posterior à data final." }); return; }
    const r = await getMonthlyRevenue({ from: projectionFrom, to: projectionTo });
    setRevenue(r);
    setFeedback({ type: "info", message: `Projeção de receita: ${r.length} linha(s) mês a mês (veja a barra de status).` });
  });

  const isPrimaryRep = selected?.representatives?.find((r) => r.is_primary);
  const totalValue = useMemo(() => rows.reduce((s, r) => s + (r.quantity * r.unit_value), 0), [rows]);
  const isActive = selected?.is_active !== false;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Console de Vendas Recorrentes</span>
          <span className="erp-crumb-code">VVRE0200</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Cobrança mensal · reajuste · geração de pedido</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className="erp-btn erp-btn-primary" onClick={novo} disabled={busy}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Nova recorrência
          </button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Recorrência</span>
          <button className="erp-btn erp-btn-dark" onClick={() => gerarPedido(selected?.code)} disabled={busy || !selected || !!selected?.order_code}>Gerar pedido</button>
          <button className="erp-btn erp-btn-danger" onClick={() => cancelar(selected?.code)} disabled={busy || !selected || !isActive}>Cancelar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Filtrar</span>
          <select className="erp-tselect" style={{ width: 140 }} value={filterMov} onChange={(e) => setFilterMov(e.target.value)}>
            <option value="">Todos movimentos</option>
            {Object.entries(MOV_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <label className="erp-check-inline" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><input className="erp-check" type="checkbox" checked={filterActive} onChange={(e) => setFilterActive(e.target.checked)} />Só ativas</label>
          <button className="erp-btn" onClick={listar} disabled={busy}>Listar</button>
          <input className="erp-tinput" type="date" aria-label="Início da projeção" value={projectionFrom} onChange={(e) => setProjectionFrom(e.target.value)} />
          <input className="erp-tinput" type="date" aria-label="Fim da projeção" value={projectionTo} onChange={(e) => setProjectionTo(e.target.value)} />
          <button className="erp-btn" onClick={receitaMensal} disabled={busy}>Receita mensal</button>
        </div>
        <div className="erp-tgroup"><ExportButton title="VVRE0200 — Vendas Recorrentes" filename="vvre0200" /></div>
      </div>

      <div className="erp-content">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

      <div className="erp-main">
        <aside className="erp-list-panel">
          <div className="erp-panel-head"><span className="erp-panel-title">Recorrências</span><span className="erp-count">{rows.length}</span></div>
          <div className="erp-list">
            {rows.length === 0 && <div className="erp-list-empty">Nenhuma recorrência carregada.<br />Use <strong>Listar</strong> na barra acima.</div>}
            {rows.map((r) => { const m = movMeta(r.movement_type); return (
              <div key={r.code} className={`erp-list-row${selected?.code === r.code ? " sel" : ""}`} onClick={() => abrir(r.code)}>
                <span className="erp-list-code">#{r.code}</span>
                <span className="erp-list-sub">Cliente {r.customer_code} · item {r.item_code}</span>
                <span className="erp-list-money">R$ {money(r.quantity * r.unit_value)}</span>
                <div className="erp-list-meta">
                  <span className={`erp-badge ${m.cls}`}>{m.label}</span>
                  {r.order_code && <span className="erp-badge ok">Pedido {r.order_code}</span>}
                  {r.is_active === false && <span className="erp-badge err">Inativa</span>}
                </div>
              </div>
            ); })}
          </div>
        </aside>

        <section className="erp-detail-panel">
          {creating ? (
            <>
              <div className="erp-tabs"><button className="erp-tab active">Nova recorrência</button></div>
              <div className="erp-detail-body">
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Recorrência (apenas Venda/Upgrade por cadastro direto)</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Estabelecimento</label><LookupField value={form.enterprise_code} loader={loadEstablishments} entityLabel="estabelecimento" clearable={false} onChange={(c) => setF("enterprise_code", c ?? 1)} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Cliente</label><LookupField value={form.customer_code} loader={loadCustomers} entityLabel="cliente" onChange={(c) => setF("customer_code", c ?? 0)} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Item</label><LookupField value={form.item_code} loader={loadItems} entityLabel="item" onChange={(c) => setF("item_code", c ?? 0)} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Movimento</label><select className="erp-input" value={form.movement_type} onChange={(e) => setF("movement_type", e.target.value as RecurringSaleDTO["movement_type"])}><option value="SALE">Venda</option><option value="UPGRADE">Upgrade</option></select></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Vigência</label><select className="erp-input" value={form.term_type} onChange={(e) => setF("term_type", e.target.value as RecurringSaleDTO["term_type"])}><option value="INDEFINITE">Indeterminada</option><option value="FIXED">Determinada</option></select></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Qtd</label><input className="erp-input num" type="number" value={form.quantity || ""} onChange={(e) => setF("quantity", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label erp-req">Valor unit.</label><input className="erp-input num" type="number" value={form.unit_value || ""} onChange={(e) => setF("unit_value", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Venda</label><input className="erp-input" type="date" value={form.sale_date ?? ""} onChange={(e) => setF("sale_date", e.target.value)} /></div>
                  </div>
                </div>
                {form.term_type === "INDEFINITE" ? (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Vigência indeterminada</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label erp-req">Próximo reajuste</label><input className="erp-input" type="date" value={form.next_adjustment_date ?? ""} onChange={(e) => setF("next_adjustment_date", e.target.value)} /></div>
                    </div>
                  </div>
                ) : (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Vigência determinada</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c3"><label className="erp-label erp-req">Meses</label><input className="erp-input num" type="number" value={form.months_quantity || ""} onChange={(e) => setF("months_quantity", Number(e.target.value))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label erp-req">Parcelas</label><input className="erp-input num" type="number" value={form.payments_quantity || ""} onChange={(e) => setF("payments_quantity", Number(e.target.value))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Carência (meses)</label><input className="erp-input num" type="number" value={form.grace_months || ""} onChange={(e) => setF("grace_months", Number(e.target.value))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label erp-req">Valor da parcela</label><input className="erp-input num" type="number" value={form.payment_value || ""} onChange={(e) => setF("payment_value", Number(e.target.value))} /></div>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}><button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>{busy && <span className="erp-spin" />}Criar recorrência</button><button className="erp-btn" onClick={() => setForm(EMPTY)} disabled={busy}>Limpar</button></div>
                <p style={{ fontSize: 12, color: "var(--v-text-3)" }}>Ao gerar pedido, o ERP cria a capa e as linhas mensais usando o módulo de Pedido de Venda (VVND0200).</p>
              </div>
            </>
          ) : selected ? (
            <>
              <div className="erp-tabs"><button className="erp-tab active">Recorrência #{selected.code}</button></div>
              <div className="erp-detail-body">
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Recorrência #{selected.code}
                    <span className={`erp-badge ${movMeta(selected.movement_type).cls}`} style={{ marginLeft: 4 }}>{movMeta(selected.movement_type).label}</span>
                    {selected.order_code && <span className="erp-badge ok">Pedido {selected.order_code}</span>}
                    {selected.is_active === false && <span className="erp-badge err">Inativa</span>}
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label">Cliente</label><input className="erp-input num" value={selected.customer_code} readOnly /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Item</label><input className="erp-input num" value={selected.item_code} readOnly /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Vigência</label><input className="erp-input" value={selected.term_type === "INDEFINITE" ? "Indeterminada" : "Determinada"} readOnly /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Próx. reajuste</label><input className="erp-input" value={selected.next_adjustment_date?.slice(0, 10) ?? "—"} readOnly /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Qtd × valor</label><input className="erp-input num" value={`${selected.quantity} × ${money(selected.unit_value)}`} readOnly /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Valor mensal</label><input className="erp-input strong num" value={money(selected.quantity * selected.unit_value)} readOnly /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Parcelas</label><input className="erp-input num" value={selected.payments_quantity ?? "—"} readOnly /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Representante princ.</label><input className="erp-input num" value={isPrimaryRep?.representative_code ?? "—"} readOnly /></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="erp-detail-empty">
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div className="erp-detail-empty-title">Nenhuma recorrência selecionada</div>
              <div className="erp-detail-empty-sub">Selecione uma recorrência na lista, ou clique em <strong>Nova recorrência</strong>.</div>
            </div>
          )}
        </section>
      </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Recorrências: <strong>{rows.length}</strong></div>
        <div className="erp-status-item">Valor mensal total: <strong>R$ {money(totalValue)}</strong></div>
        {revenue && <div className="erp-status-item">Receita projetada: <strong>{revenue.length}</strong> linha(s)</div>}
        {selected && <div className="erp-status-item">Selecionada: <strong>#{selected.code}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
