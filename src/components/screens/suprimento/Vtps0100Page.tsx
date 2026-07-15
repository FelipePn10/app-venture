import { useState, useCallback } from "react";
import { type ServicePrice, listServicePrices, createServicePrice, deleteServicePrice, listServiceOrders, updateServiceOrderStatus } from "@/services/thirdPartyServicesService";
import { errMessage, parseStr, parseNum, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "precos" | "ordens";
const PRICE: ServicePrice = { item_code: 0, mask: "", supplier_code: 0, operation_id: 0, uom: "UN", unit_price: "0", preferred: true, freight_type: "CIF" };

export function Vtps0100Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("precos");
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [orders, setOrders] = useState<Obj[]>([]);
  const [form, setForm] = useState<ServicePrice>({ ...PRICE });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => { setBusy(true); setFeedback(null); try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); } }, []);
  const setF = <K extends keyof ServicePrice>(k: K, v: ServicePrice[K]) => setForm((p) => ({ ...p, [k]: v }));

  const carPrecos = () => run(async () => { setPrices(await listServicePrices()); });
  const crPreco = () => run(async () => { if (!form.item_code || !form.supplier_code || !form.operation_id) { setFeedback({ type: "error", message: "Item, fornecedor e operação obrigatórios." }); return; } await createServicePrice(form); setForm({ ...PRICE }); setPrices(await listServicePrices()); setFeedback({ type: "success", message: "Preço de serviço criado." }); });
  const rmPreco = (id?: number) => { if (!id) return; void run(async () => { await deleteServicePrice(id); setPrices(await listServicePrices()); }); };
  const carOrdens = () => run(async () => { setOrders(await listServiceOrders()); });
  const mudarStatus = (id: number, status: string) => run(async () => { await updateServiceOrderStatus(id, status); setOrders(await listServiceOrders()); setFeedback({ type: "success", message: `OS ${id} → ${status}.` }); });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Suprimento</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Serviços de Terceiros</span><span className="erp-crumb-code">VTPS0100</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">preços &amp; ordens de serviço</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className={`erp-btn ${tab === "precos" ? "erp-btn-primary" : ""}`} onClick={() => setTab("precos")}>Preços</button>
          <button className={`erp-btn ${tab === "ordens" ? "erp-btn-primary" : ""}`} onClick={() => setTab("ordens")}>Ordens de serviço</button>
        </div>
        <div className="erp-tgroup"><button className="erp-btn erp-btn-dark" onClick={tab === "precos" ? carPrecos : carOrdens} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VTPS0100 — Serviços de Terceiros" filename="vtps0100" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        {tab === "precos" ? (
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Preços de serviço</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset"><div className="erp-fieldset-head">Novo preço</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={form.item_code || ""} onChange={(e) => setF("item_code", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Fornecedor</label><input className="erp-input num" type="number" value={form.supplier_code || ""} onChange={(e) => setF("supplier_code", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Operação</label><input className="erp-input num" type="number" value={form.operation_id || ""} onChange={(e) => setF("operation_id", Number(e.target.value))} /></div>
                <div className="erp-field erp-c1"><label className="erp-label">UM</label><input className="erp-input" value={form.uom} onChange={(e) => setF("uom", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Preço unit.</label><input className="erp-input num" type="number" value={String(form.unit_price)} onChange={(e) => setF("unit_price", e.target.value)} /></div>
                <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={crPreco} disabled={busy}>Criar preço</button></div>
                <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>#</th><th>Item</th><th>Fornecedor</th><th>Operação</th><th>UM</th><th>Preço</th><th></th></tr></thead>
                  <tbody>{prices.length === 0 ? <tr><td colSpan={7} className="erp-grid-empty">clique em Carregar</td></tr> : prices.map((p) => <tr key={p.id}><td>#{p.id}</td><td>{p.item_code}</td><td>{p.supplier_code}</td><td>{p.operation_id}</td><td>{p.uom}</td><td>{String(p.unit_price)}</td><td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => rmPreco(p.id)}>×</button></td></tr>)}</tbody>
                </table></div>
              </div></div>
            </div>
          </section>
        ) : (
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Ordens de serviço</button></div>
            <div className="erp-detail-body">
              <table className="erp-grid"><thead><tr><th>#</th><th>Fornecedor</th><th>Item</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>{orders.length === 0 ? <tr><td colSpan={5} className="erp-grid-empty">clique em Carregar</td></tr> : orders.map((o, i) => { const id = parseNum(o, "id", "ID"); return (
                  <tr key={i}><td><strong>#{id}</strong></td><td>{parseNum(o, "supplier_code", "SupplierCode") || "—"}</td><td>{parseNum(o, "item_code", "ItemCode") || "—"}</td>
                    <td><span className="erp-badge info">{parseStr(o, "status", "Status")}</span></td>
                    <td style={{ display: "flex", gap: 4 }}>{["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"].map((s) => <button key={s} className="erp-btn erp-btn-sm" onClick={() => mudarStatus(id, s)} disabled={busy}>{s}</button>)}</td></tr>
                ); })}</tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <footer className="erp-statusbar"><div className="erp-status-item">Preços: <strong>{prices.length}</strong></div><div className="erp-status-item">Ordens: <strong>{orders.length}</strong></div><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}
