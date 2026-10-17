import { useState } from "react";
import { listarSaldoPorEndereco, transferirEntreAlmoxarifados, transferirEntreEnderecos, type SaldoEnderecoDTO } from "@/services/stockService";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadItems, loadWarehouseAddresses, loadWarehouses } from "@/services/lookups";
import { qtd, reais, useAcao, useUnidadeDoItem } from "./comum";
import { FeedbackBox } from "./ui";

/**
 * Transferências. Entre almoxarifados é UMA operação: saída da origem ao custo
 * médio e entrada no destino pelo mesmo custo — antes eram dois lançamentos
 * soltos, e a entrada levava o preço que a pessoa digitasse. Entre endereços
 * do mesmo almoxarifado continua a rotina própria.
 */
export function TransferenciasTab({ itemCode }: { itemCode: string }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [t, setT] = useState({ item_code: itemCode, from: 0, to: 0, quantity: "", lot: "", from_address: "", to_address: "", notes: "" });
  const [e, setE] = useState({ warehouse: 0, address_from: "", address_to: "", quantity: "", lot: "" });
  const [saldos, setSaldos] = useState<SaldoEnderecoDTO[]>([]);
  const uom = useUnidadeDoItem(t.item_code || itemCode);

  const transferir = () => run(async () => {
    if (!t.item_code || !t.from || !t.to || !t.quantity) { setFeedback({ type: "error", message: "Informe item, origem, destino e quantidade." }); return; }
    const r = await transferirEntreAlmoxarifados({
      item_code: t.item_code, from_warehouse_id: t.from, to_warehouse_id: t.to, quantity: t.quantity.replace(",", "."),
      lot: t.lot || undefined, from_address: t.from_address || undefined, to_address: t.to_address || undefined, notes: t.notes || undefined,
    });
    setFeedback({ type: "success", message: `Transferido: ${qtd(r.saida.quantity)} ${uom} a ${reais(r.saida.unit_price)} (movimentos ${r.saida.id} e ${r.entrada.id}).` });
    setT((p) => ({ ...p, quantity: "", lot: "", notes: "" }));
  });
  const transferirEndereco = () => run(async () => {
    const item = t.item_code || itemCode;
    const q = Number(e.quantity.replace(",", "."));
    if (!item || !e.warehouse || !e.address_from || !e.address_to || !(q > 0)) { setFeedback({ type: "error", message: "Informe item, almoxarifado, origem, destino e quantidade." }); return; }
    await transferirEntreEnderecos({ item_code: item, warehouse_id: e.warehouse, address_from: e.address_from, address_to: e.address_to, quantity: q, lot: e.lot || undefined });
    setFeedback({ type: "success", message: `${qtd(q)} ${uom} de ${e.address_from} para ${e.address_to}.` });
    setSaldos(await listarSaldoPorEndereco(e.warehouse, item));
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Entre almoxarifados</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Item</label>
        <LookupField value={t.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setT((p) => ({ ...p, item_code: String(c ?? "") }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Origem</label>
        <LookupField value={t.from || undefined} loader={loadWarehouses} entityLabel="almoxarifado de origem" onChange={(c) => setT((p) => ({ ...p, from: c ? Number(c) : 0 }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Destino</label>
        <LookupField value={t.to || undefined} loader={loadWarehouses} entityLabel="almoxarifado de destino" onChange={(c) => setT((p) => ({ ...p, to: c ? Number(c) : 0 }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Quantidade{uom ? ` (${uom})` : ""}</label>
        <input className="erp-input num" value={t.quantity} onChange={(ev) => setT((p) => ({ ...p, quantity: ev.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Lote</label><input className="erp-input" value={t.lot} onChange={(ev) => setT((p) => ({ ...p, lot: ev.target.value }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Endereço de origem</label>
        <LookupField value={t.from_address || undefined} loader={loadWarehouseAddresses(t.from || undefined)} entityLabel="endereço" placeholder="Sem endereço" clearable onChange={(c) => setT((p) => ({ ...p, from_address: c ? String(c) : "" }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Endereço de destino</label>
        <LookupField value={t.to_address || undefined} loader={loadWarehouseAddresses(t.to || undefined)} entityLabel="endereço" placeholder="Sem endereço" clearable onChange={(c) => setT((p) => ({ ...p, to_address: c ? String(c) : "" }))} /></div>
      <div className="erp-field erp-c4"><label className="erp-label">Observação</label><input className="erp-input" value={t.notes} onChange={(ev) => setT((p) => ({ ...p, notes: ev.target.value }))} /></div>
      <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <button className="erp-btn erp-btn-primary" onClick={transferir} disabled={busy}>Transferir</button>
        <span className="erp-hint">Para estoque em trânsito, transfira para um almoxarifado de localização TRÂNSITO e, na chegada, dele para o destino. O estorno (no extrato) desfaz as duas pernas.</span>
      </div>
    </div></div>

    <div className="erp-fieldset"><div className="erp-fieldset-head">Entre endereços do mesmo almoxarifado</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Almoxarifado</label>
        <LookupField value={e.warehouse || undefined} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(c) => setE((p) => ({ ...p, warehouse: c ? Number(c) : 0 }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Origem</label>
        <LookupField value={e.address_from || undefined} loader={loadWarehouseAddresses(e.warehouse || undefined)} entityLabel="endereço de origem" placeholder="Selecionar…" clearable onChange={(c) => setE((p) => ({ ...p, address_from: c ? String(c) : "" }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Destino</label>
        <LookupField value={e.address_to || undefined} loader={loadWarehouseAddresses(e.warehouse || undefined)} entityLabel="endereço de destino" placeholder="Selecionar…" clearable onChange={(c) => setE((p) => ({ ...p, address_to: c ? String(c) : "" }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label><input className="erp-input num" value={e.quantity} onChange={(ev) => setE((p) => ({ ...p, quantity: ev.target.value }))} /></div>
      <div className="erp-field erp-c1"><label className="erp-label">Lote</label><input className="erp-input" value={e.lot} onChange={(ev) => setE((p) => ({ ...p, lot: ev.target.value }))} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end", display: "flex", flexDirection: "row", gap: 6 }}>
        <button className="erp-btn" onClick={transferirEndereco} disabled={busy}>Transferir</button>
        <button className="erp-btn" onClick={() => run(async () => setSaldos(await listarSaldoPorEndereco(e.warehouse || undefined, t.item_code || itemCode || undefined)))} disabled={busy}>Saldos</button>
      </div>
      {saldos.length > 0 && (
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Endereço</th><th>Item</th><th>Lote</th><th className="num">Quantidade</th></tr></thead>
            <tbody>{saldos.map((b, i) => <tr key={`${b.address}-${b.lot}-${i}`}><td>{b.address || "—"}</td><td><EntityName code={b.item_code} loader={loadItems} prefix="Item" /></td><td>{b.lot || "—"}</td><td className="num">{qtd(b.quantity)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div></div>
  </>);
}
