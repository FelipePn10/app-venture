import { useCallback, useEffect, useState } from "react";
import { consumeReservation, createReservation, listReservations, releaseReservation, type ReservationDTO } from "@/services/stockService";
import { EntityName } from "@/components/ui/EntityName";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadWarehouses } from "@/services/lookups";
import { dataBR, qtd, REFERENCE_LABEL, RESERVA_LABEL, useAcao, useUnidadeDoItem } from "./comum";
import { FeedbackBox } from "./ui";

/** Reservas encerradas pelo próprio documento, não por aqui. */
const DO_DOCUMENTO = new Set(["ONDA_SEPARACAO", "DEMANDA_INDEPENDENTE", "REQUISICAO_MATERIAL"]);

/** Reservas de saldo (ATP): ver as existentes, criar, liberar e consumir. */
export function ReservasTab({ itemCode }: { itemCode: string }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [f, setF] = useState({ item_code: itemCode, warehouse_id: 0, quantity: "", reference_type: "MANUAL", reference_code: 0, reference_item_code: "", reservation_date: "", expiration_date: "", notes: "" });
  const [reservas, setReservas] = useState<ReservationDTO[]>([]);
  const [soAtivas, setSoAtivas] = useState(true);
  const uom = useUnidadeDoItem(f.item_code || itemCode);

  const carregar = useCallback(() => run(async () => {
    setReservas(await listReservations({ itemCode: itemCode || undefined, soAtivas }));
  }), [run, itemCode, soAtivas]);
  useEffect(() => { void carregar(); }, [carregar]);

  const criar = () => run(async () => {
    const q = Number(f.quantity.replace(",", "."));
    const item = f.item_code || itemCode;
    if (!item || !f.warehouse_id || !(q > 0)) { setFeedback({ type: "error", message: "Item, almoxarifado e quantidade são obrigatórios." }); return; }
    const r = await createReservation({
      item_code: item, warehouse_id: f.warehouse_id, quantity: q, reference_type: f.reference_type, reference_code: f.reference_code,
      reference_item_code: Number(f.reference_item_code) || undefined, reservation_date: f.reservation_date || undefined,
      expiration_date: f.expiration_date || undefined, notes: f.notes.trim() || undefined,
    });
    setReservas(await listReservations({ itemCode: itemCode || undefined, soAtivas }));
    setFeedback({ type: "success", message: `Reserva ${r.id} criada: o disponível para promessa diminuiu.` });
  });
  const encerrar = (id: number, acao: (id: number) => Promise<void>, feito: string) => run(async () => {
    await acao(id);
    setReservas(await listReservations({ itemCode: itemCode || undefined, soAtivas }));
    setFeedback({ type: "success", message: `Reserva ${id} ${feito}.` });
  });

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
    <div className="erp-fieldset"><div className="erp-fieldset-head">Reservas{itemCode ? " do item escolhido" : ""}</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c12" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={soAtivas} onChange={(e) => setSoAtivas(e.target.checked)} /> Só as ativas</label>
      </div>
      <div className="erp-field erp-c12"><div className="erp-grid-wrap"><table className="erp-grid">
        <thead><tr><th>Reserva</th><th>Item</th><th>Almoxarifado</th><th className="num">Quantidade</th><th>Origem</th><th>Expira em</th><th>Situação</th><th>Ações</th></tr></thead>
        <tbody>
          {reservas.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhuma reserva encontrada.</td></tr>}
          {reservas.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td><EntityName code={r.item_code} loader={loadItems} prefix="Item" /></td>
              <td><EntityName code={r.warehouse_id} loader={loadWarehouses} prefix="Almox." /></td>
              <td className="num">{qtd(r.quantity)}</td>
              <td>{REFERENCE_LABEL[r.reference_type ?? ""] ?? "Documento"} {r.reference_code || ""}</td>
              <td>{dataBR(r.expiration_date)}</td>
              <td>{RESERVA_LABEL[r.status ?? ""] ?? r.status}</td>
              <td>{r.status === "ACTIVE" && r.id != null && !DO_DOCUMENTO.has(r.reference_type ?? "") && <div style={{ display: "flex", gap: 4 }}>
                <button className="erp-btn erp-btn-sm" onClick={() => void encerrar(r.id as number, releaseReservation, "liberada")} disabled={busy}>Liberar</button>
                <button className="erp-btn erp-btn-sm" onClick={() => void encerrar(r.id as number, consumeReservation, "consumida")} disabled={busy}>Consumir</button>
              </div>}</td>
            </tr>
          ))}
        </tbody>
      </table></div></div>
    </div></div>
  </>);
}
