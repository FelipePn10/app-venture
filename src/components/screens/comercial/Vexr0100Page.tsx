import { useState } from "react";
import { type RescheduleDTO, createReschedule, listReschedulesByOrder } from "@/services/deliveryRescheduleService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadSalesOrders, loadItems } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: RescheduleDTO = { sales_order_code: 0, item_code: 0, old_date: today(), new_date: today(), reason: "" };

export function Vexr0100Page(): JSX.Element {
  const [order, setOrder] = useState<number | undefined>(undefined);
  const [list, setList] = useState<RescheduleDTO[]>([]);
  const [form, setForm] = useState<RescheduleDTO>(EMPTY);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof RescheduleDTO>(k: K, v: RescheduleDTO[K]) => setForm((p) => ({ ...p, [k]: v }));

  async function consultar() {
    if (!order) { setFeedback({ type: "error", message: "Selecione o pedido para consultar." }); return; }
    setBusy(true); setFeedback(null);
    try { setList(await listReschedulesByOrder(order)); set("sales_order_code", order); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function registrar() {
    if (!form.sales_order_code || !form.item_code) { setFeedback({ type: "error", message: "Pedido e item são obrigatórios." }); return; }
    if (!form.reason?.trim()) { setFeedback({ type: "error", message: "Motivo da reprogramação é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createReschedule(form);
      setFeedback({ type: "success", message: "Reprogramação registrada." });
      setForm((p) => ({ ...EMPTY, sales_order_code: p.sales_order_code }));
      await listReschedulesByOrder(form.sales_order_code).then(setList);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Reprogramação de Entrega</span>
          <span className="erp-crumb-code">VEXR0100</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Data original × nova × motivo, por pedido</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Pedido</span>
          <div style={{ width: 240 }}><LookupField value={order} loader={loadSalesOrders} entityLabel="pedido" placeholder="Selecionar pedido" onChange={(code) => setOrder(code)} /></div>
          <button className="erp-btn erp-btn-dark" onClick={() => void consultar()} disabled={busy}>{busy && <span className="erp-spin" />}Consultar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VEXR0100 — Reprogramação de Entrega" filename="vexr0100" /></div>
      </div>

      <div className="erp-content">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

      <div className="erp-main">
        <aside className="erp-list-panel">
          <div className="erp-panel-head">
            <span className="erp-panel-title">Histórico {form.sales_order_code ? `· pedido #${form.sales_order_code}` : ""}</span>
            <span className="erp-count">{list.length}</span>
          </div>
          <div className="erp-list">
            {list.length === 0 && <div className="erp-list-empty">Selecione um pedido e clique em <strong>Consultar</strong> para ver as reprogramações.</div>}
            {list.map((r, i) => (
              <div key={i} className="erp-list-row" style={{ cursor: "default" }}>
                <span className="erp-list-code">Item {r.item_code}</span>
                <span className="erp-list-sub">{r.reason || "—"}</span>
                <div className="erp-list-meta">
                  <span className="erp-badge draft">{r.old_date?.slice(0, 10)}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--v-text-muted)" }}><path d="M2 7h9M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="erp-badge ok">{r.new_date?.slice(0, 10)}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Nova reprogramação</button></div>
          <div className="erp-detail-body">
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Reprogramação de entrega</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c6"><label className="erp-label erp-req">Pedido</label><LookupField value={form.sales_order_code} loader={loadSalesOrders} entityLabel="pedido" placeholder="Selecionar pedido" clearable={false} onChange={(code) => set("sales_order_code", code ?? 0)} /></div>
                <div className="erp-field erp-c6"><label className="erp-label erp-req">Item</label><LookupField value={form.item_code} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(code) => set("item_code", code ?? 0)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Data original</label><input className="erp-input" type="date" value={form.old_date} onChange={(e) => set("old_date", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Nova data</label><input className="erp-input" type="date" value={form.new_date} onChange={(e) => set("new_date", e.target.value)} /></div>
                <div className="erp-field erp-c12"><label className="erp-label erp-req">Motivo</label><input className="erp-input" value={form.reason ?? ""} onChange={(e) => set("reason", e.target.value)} placeholder="Motivo da reprogramação" /></div>
                <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={() => void registrar()} disabled={busy}>{busy && <span className="erp-spin" />}Registrar reprogramação</button></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      </div>
      <footer className="erp-statusbar">
        <div className="erp-status-item">Reprogramações: <strong>{list.length}</strong></div>
        {form.sales_order_code ? <div className="erp-status-item">Pedido: <strong>#{form.sales_order_code}</strong></div> : null}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
