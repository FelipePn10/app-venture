import { useState, useCallback } from "react";
import {
  type InspectionOrderSource, INSPECTION_TREATMENTS,
  listInspectionOrders, createInspectionOrder, analyzeInspectionOrder,
} from "@/services/procurementService";
import { errMessage, parseStr, parseNum, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const SOURCES: InspectionOrderSource[] = ["MANUAL", "PURCHASE_RECEIPT", "RECEIVING_NOTICE", "FISCAL_ENTRY"];
const GEN_INI = { source: "MANUAL" as InspectionOrderSource, item_code: "", mask: "", warehouse_id: "", quantity: "", supplier_code: "", lot: "" };
const AN_INI = { conform_qty: "", rejected_qty: "", rework_qty: "", restricted_qty: "", treatment: "ACCEPT", affects_supplier_score: true, move_stock: false, destination_warehouse_id: "", rejection_warehouse_id: "" };

export function Vins0201Page(): JSX.Element {
  const [orders, setOrders] = useState<Obj[]>([]);
  const [sel, setSel] = useState<Obj | null>(null);
  const [gen, setGen] = useState({ ...GEN_INI });
  const [an, setAn] = useState({ ...AN_INI });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = () => run(async () => { setOrders(await listInspectionOrders()); });
  const gerar = () => run(async () => {
    const item_code = Number(gen.item_code), warehouse_id = Number(gen.warehouse_id), quantity = Number(gen.quantity);
    if (!item_code || !warehouse_id || !quantity) { setFeedback({ type: "error", message: "Item, almoxarifado e quantidade são obrigatórios." }); return; }
    const o = await createInspectionOrder({ source: gen.source, item_code, mask: gen.mask.trim(), warehouse_id, quantity, supplier_code: Number(gen.supplier_code) || null, lot: gen.lot.trim() || null });
    setGen({ ...GEN_INI }); setFeedback({ type: "success", message: `Ordem de inspeção gerada (#${o.id ?? o.ID}).` }); setOrders(await listInspectionOrders());
  });
  const analisar = () => { const id = parseNum(sel ?? {}, "id", "ID"); if (!id) return; void run(async () => {
    await analyzeInspectionOrder(id, {
      conform_qty: Number(an.conform_qty) || 0, rejected_qty: Number(an.rejected_qty) || 0, rework_qty: Number(an.rework_qty) || 0, restricted_qty: Number(an.restricted_qty) || 0,
      treatment: an.treatment, affects_supplier_score: an.affects_supplier_score, move_stock: an.move_stock,
      destination_warehouse_id: Number(an.destination_warehouse_id) || null, rejection_warehouse_id: Number(an.rejection_warehouse_id) || null,
    });
    setAn({ ...AN_INI }); setFeedback({ type: "success", message: "Análise registrada." }); setOrders(await listInspectionOrders());
  }); };

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Manutenção das Ordens de Inspeções</span><span className="erp-crumb-code">VINS0201</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{orders.length} ordem(ns)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Ordens</span><button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VINS0201 — Manutenção das Ordens de Inspeções" filename="vins0201" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Ordens de inspeção</span><span className="erp-count">{orders.length}</span></div>
            <div className="erp-list">
              {orders.length === 0 && <div className="erp-list-empty">Clique em <strong>Carregar</strong>.</div>}
              {orders.map((o, i) => { const id = parseNum(o, "id", "ID"); return (
                <div key={i} className={`erp-list-row${parseNum(sel ?? {}, "id", "ID") === id ? " erp-row-sel" : ""}`} onClick={() => setSel(o)}>
                  <span className="erp-list-code">#{id} · item {parseNum(o, "item_code", "ItemCode")}</span>
                  <span className="erp-list-sub">{parseStr(o, "status", "Status")} · qtd {parseNum(o, "quantity", "Quantity")}</span>
                </div>
              ); })}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Gerar &amp; analisar</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Gerar ordem de inspeção</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label">Origem</label><select className="erp-input" value={gen.source} onChange={(e) => setGen((f) => ({ ...f, source: e.target.value as InspectionOrderSource }))}>{SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={gen.item_code} onChange={(e) => setGen((f) => ({ ...f, item_code: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Máscara</label><input className="erp-input" value={gen.mask} onChange={(e) => setGen((f) => ({ ...f, mask: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Almox.</label><input className="erp-input num" type="number" value={gen.warehouse_id} onChange={(e) => setGen((f) => ({ ...f, warehouse_id: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Qtde</label><input className="erp-input num" type="number" value={gen.quantity} onChange={(e) => setGen((f) => ({ ...f, quantity: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Fornecedor</label><input className="erp-input num" type="number" value={gen.supplier_code} onChange={(e) => setGen((f) => ({ ...f, supplier_code: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Lote</label><input className="erp-input" value={gen.lot} onChange={(e) => setGen((f) => ({ ...f, lot: e.target.value }))} /></div>
                  <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void gerar()} disabled={busy}>Gerar ordem</button></div>
                </div>
              </div>

              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Análise da ordem {sel ? `#${parseNum(sel, "id", "ID")}` : "(selecione na lista)"}</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label className="erp-label">Conforme</label><input className="erp-input num" type="number" value={an.conform_qty} onChange={(e) => setAn((f) => ({ ...f, conform_qty: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Rejeitada</label><input className="erp-input num" type="number" value={an.rejected_qty} onChange={(e) => setAn((f) => ({ ...f, rejected_qty: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Retrabalho</label><input className="erp-input num" type="number" value={an.rework_qty} onChange={(e) => setAn((f) => ({ ...f, rework_qty: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Restrita</label><input className="erp-input num" type="number" value={an.restricted_qty} onChange={(e) => setAn((f) => ({ ...f, restricted_qty: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Tratamento</label><select className="erp-input" value={an.treatment} onChange={(e) => setAn((f) => ({ ...f, treatment: e.target.value }))}>{INSPECTION_TREATMENTS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }}><label className="erp-check"><input type="checkbox" checked={an.affects_supplier_score} onChange={(e) => setAn((f) => ({ ...f, affects_supplier_score: e.target.checked }))} /> Afeta IQF</label></div>
                  <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }}><label className="erp-check"><input type="checkbox" checked={an.move_stock} onChange={(e) => setAn((f) => ({ ...f, move_stock: e.target.checked }))} /> Movimentar estoque</label></div>
                  {an.move_stock && <>
                    <div className="erp-field erp-c3"><label className="erp-label">Almox. destino</label><input className="erp-input num" type="number" value={an.destination_warehouse_id} onChange={(e) => setAn((f) => ({ ...f, destination_warehouse_id: e.target.value }))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Almox. rejeição</label><input className="erp-input num" type="number" value={an.rejection_warehouse_id} onChange={(e) => setAn((f) => ({ ...f, rejection_warehouse_id: e.target.value }))} /></div>
                  </>}
                  <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={analisar} disabled={busy || !sel}>Registrar análise</button></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Ordens: <strong>{orders.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
