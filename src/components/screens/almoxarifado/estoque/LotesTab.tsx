import { useState } from "react";
import { getLotGenealogy, listLotsByItem, registerLot, type LotBalanceDTO } from "@/services/stockService";
import { type Obj } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { ReadableRecord } from "@/components/ui/ReadableRecord";
import { loadSuppliers, loadWarehouses } from "@/services/lookups";
import { qtd, useAcao } from "./comum";
import { FeedbackBox } from "./ui";

/** Lotes: registro (corrida, certificado, validade), saldo por lote e genealogia. */
export function LotesTab({ itemCode }: { itemCode: string }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lots, setLots] = useState<LotBalanceDTO[]>([]);
  const [genealogy, setGenealogy] = useState<Obj | null>(null);
  const [f, setF] = useState({ lot: "", heat_number: "", certificate: "", supplier_code: "", received_at: "", expires_at: "" });

  const consultar = () => run(async () => {
    if (!itemCode) { setFeedback({ type: "error", message: "Selecione o item na barra superior." }); return; }
    setLots(await listLotsByItem(itemCode)); setGenealogy(null);
  });
  const registrar = () => run(async () => {
    if (!itemCode || !f.lot.trim()) { setFeedback({ type: "error", message: "Item (barra superior) e lote são obrigatórios." }); return; }
    await registerLot({ item_code: itemCode, lot: f.lot.trim(), heat_number: f.heat_number || undefined, certificate: f.certificate || undefined,
      supplier_code: f.supplier_code ? Number(f.supplier_code) : undefined, received_at: f.received_at || undefined, expires_at: f.expires_at || undefined });
    setFeedback({ type: "success", message: `Lote ${f.lot} registrado.` });
    setLots(await listLotsByItem(itemCode));
  });
  const verGenealogia = (lot: string) => run(async () => { setGenealogy(await getLotGenealogy(itemCode, lot)); });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Registrar lote{itemCode ? ` do item ${itemCode}` : ""}</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Lote</label><input className="erp-input" value={f.lot} onChange={(e) => setF((p) => ({ ...p, lot: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Corrida</label><input className="erp-input" value={f.heat_number} onChange={(e) => setF((p) => ({ ...p, heat_number: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Certificado</label><input className="erp-input" value={f.certificate} onChange={(e) => setF((p) => ({ ...p, certificate: e.target.value }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Fornecedor</label>
        <LookupField value={Number(f.supplier_code) || undefined} loader={loadSuppliers} entityLabel="fornecedor" clearable onChange={(c) => setF((p) => ({ ...p, supplier_code: c ? String(c) : "" }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Recebido em</label><input className="erp-input" type="date" value={f.received_at} onChange={(e) => setF((p) => ({ ...p, received_at: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Validade</label><input className="erp-input" type="date" value={f.expires_at} onChange={(e) => setF((p) => ({ ...p, expires_at: e.target.value }))} /><small className="erp-hint">Ordena o FEFO.</small></div>
      <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <button className="erp-btn erp-btn-primary" onClick={registrar} disabled={busy}>Registrar lote</button>
        <button className="erp-btn" onClick={consultar} disabled={busy}>Saldos por lote</button>
      </div>
    </div></div>
    <div className="erp-fieldset"><div className="erp-fieldset-head">Saldos por lote ({lots.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
      <table className="erp-grid">
        <thead><tr><th>Lote</th><th>Almoxarifado</th><th className="num">Quantidade</th><th></th></tr></thead>
        <tbody>
          {lots.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Sem lotes. Lotes vencidos ou a vencer estão em Análises.</td></tr>}
          {lots.map((l, i) => <tr key={i}><td>{l.lot}</td><td>{l.warehouse_id ? <EntityName code={l.warehouse_id} loader={loadWarehouses} prefix="Almox." /> : "—"}</td><td className="num">{qtd(l.quantity)}</td>
            <td><button className="erp-btn erp-btn-sm" onClick={() => verGenealogia(l.lot)} disabled={busy}>Genealogia</button></td></tr>)}
        </tbody>
      </table>
    </div></div></div>
    {genealogy && <div className="erp-fieldset"><div className="erp-fieldset-head">Genealogia</div><div className="erp-fieldset-body"><ReadableRecord value={genealogy} emptyLabel="Sem genealogia para este lote." /></div></div>}
  </>);
}
