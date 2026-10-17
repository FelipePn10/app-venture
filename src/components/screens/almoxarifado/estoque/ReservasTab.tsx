import { useState } from "react";
import { consumeReservation, createReservation, releaseReservation } from "@/services/stockService";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadWarehouses } from "@/services/lookups";
import { useAcao, useUnidadeDoItem } from "./comum";
import { FeedbackBox } from "./ui";

/** Reservas de saldo (ATP): criar, liberar e consumir. */
export function ReservasTab({ itemCode }: { itemCode: string }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [f, setF] = useState({ item_code: itemCode, warehouse_id: 0, quantity: "", reference_type: "MANUAL", reference_code: 0, reference_item_code: "", reservation_date: "", expiration_date: "", notes: "" });
  const [resId, setResId] = useState("");
  const uom = useUnidadeDoItem(f.item_code || itemCode);

  const criar = () => run(async () => {
    const q = Number(f.quantity.replace(",", "."));
    const item = f.item_code || itemCode;
    if (!item || !f.warehouse_id || !(q > 0)) { setFeedback({ type: "error", message: "Item, almoxarifado e quantidade são obrigatórios." }); return; }
    const r = await createReservation({
      item_code: item, warehouse_id: f.warehouse_id, quantity: q, reference_type: f.reference_type, reference_code: f.reference_code,
      reference_item_code: Number(f.reference_item_code) || undefined, reservation_date: f.reservation_date || undefined,
      expiration_date: f.expiration_date || undefined, notes: f.notes.trim() || undefined,
    });
    setResId(String(r.id ?? ""));
    setFeedback({ type: "success", message: `Reserva ${r.id} criada: o disponível para promessa diminuiu.` });
  });
  const liberar = () => run(async () => { const id = Number(resId); if (!id) return; await releaseReservation(id); setFeedback({ type: "success", message: `Reserva ${id} liberada.` }); });
  const consumir = () => run(async () => { const id = Number(resId); if (!id) return; await consumeReservation(id); setFeedback({ type: "success", message: `Reserva ${id} consumida.` }); });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Nova reserva</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Item</label>
        <LookupField value={(f.item_code || itemCode) || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setF((p) => ({ ...p, item_code: String(c ?? "") }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Almoxarifado</label>
        <LookupField value={f.warehouse_id || undefined} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(c) => setF((p) => ({ ...p, warehouse_id: c ? Number(c) : 0 }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade{uom ? ` (${uom})` : ""}</label><input className="erp-input num" value={f.quantity} onChange={(e) => setF((p) => ({ ...p, quantity: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Linha do documento</label><input className="erp-input num" value={f.reference_item_code} onChange={(e) => setF((p) => ({ ...p, reference_item_code: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Vale a partir de</label><input className="erp-input" type="date" value={f.reservation_date} onChange={(e) => setF((p) => ({ ...p, reservation_date: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Expira em</label><input className="erp-input" type="date" value={f.expiration_date} onChange={(e) => setF((p) => ({ ...p, expiration_date: e.target.value }))} />
        <span className="erp-field-hint">Sem data, segura o saldo até alguém liberar.</span></div>
      <div className="erp-field erp-c6"><label className="erp-label">Observações</label><input className="erp-input" value={f.notes} onChange={(e) => setF((p) => ({ ...p, notes: e.target.value }))} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>Criar reserva</button></div>
    </div></div>
    <div className="erp-fieldset"><div className="erp-fieldset-head">Liberar ou consumir</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label">Reserva (ID)</label><input className="erp-input num" value={resId} onChange={(e) => setResId(e.target.value)} /></div>
      <div className="erp-field erp-c4" style={{ alignSelf: "end", display: "flex", flexDirection: "row", gap: 8 }}>
        <button className="erp-btn" onClick={liberar} disabled={busy}>Liberar</button>
        <button className="erp-btn" onClick={consumir} disabled={busy}>Consumir</button></div>
    </div></div>
  </>);
}
