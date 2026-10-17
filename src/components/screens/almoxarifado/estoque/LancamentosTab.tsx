import { Fragment, useEffect, useMemo, useState } from "react";
import {
  createMovement, estornarMovimento, listMovements, listMovementsByItem, listMovementTypes,
  type MovementDTO, type MovementTypeDTO,
} from "@/services/stockService";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadCostCenters, loadItems, loadWarehouseAddresses, loadWarehouses } from "@/services/lookups";
import { MOVEMENT_LABEL, REFERENCE_LABEL, estornavel, qtd, reais, useAcao, useUnidadeDoItem } from "./comum";
import { FeedbackBox } from "./ui";

type Form = { item_code: string; warehouse_id: number; movement_type_code: string; movement_type: string; quantity: string; unit_price: string; lot: string; address: string; cost_center_code?: number; notes: string };
const VAZIO: Form = { item_code: "", warehouse_id: 0, movement_type_code: "", movement_type: "IN", quantity: "", unit_price: "", lot: "", address: "", notes: "" };

/**
 * Lançamento manual. O tipo vem do cadastro de tipos de movimento (VEST0200):
 * é ele que diz se é entrada ou saída, se exige centro de custo e se a entrada
 * mexe no custo médio. Sem tipo, vale o IN/OUT/ajuste de sempre.
 */
export function LancamentosTab({ itemCode }: { itemCode: string }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [form, setForm] = useState<Form>({ ...VAZIO, item_code: itemCode });
  const [tipos, setTipos] = useState<MovementTypeDTO[]>([]);
  const [movs, setMovs] = useState<MovementDTO[]>([]);
  const [estornando, setEstornando] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");
  const uom = useUnidadeDoItem(form.item_code);

  useEffect(() => { setForm((p) => ({ ...p, item_code: itemCode || p.item_code })); }, [itemCode]);
  useEffect(() => { listMovementTypes().then((t) => setTipos(t.filter((x) => x.is_active !== false && x.allows_manual !== false))).catch(() => setTipos([])); }, []);

  const tipo = useMemo(() => tipos.find((t) => t.sigla === form.movement_type_code), [tipos, form.movement_type_code]);
  const direcaoFixa = tipo && (tipo.entry_exit === "ENTRADA" || tipo.entry_exit === "SAIDA");
  const ehSaida = direcaoFixa ? tipo?.entry_exit === "SAIDA" : form.movement_type === "OUT";
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const carregar = () => run(async () => { setMovs(form.item_code ? await listMovementsByItem(form.item_code) : await listMovements()); });
  const lancar = () => run(async () => {
    const q = Number(form.quantity.replace(",", "."));
    if (!form.item_code || !form.warehouse_id || !(q !== 0)) { setFeedback({ type: "error", message: "Item, almoxarifado e quantidade são obrigatórios." }); return; }
    if (tipo?.requires_cost_center && !form.cost_center_code) { setFeedback({ type: "error", message: `O tipo ${tipo.sigla} exige centro de custo.` }); return; }
    await createMovement({
      item_code: form.item_code, warehouse_id: form.warehouse_id, movement_type: form.movement_type, quantity: q,
      unit_price: Number(form.unit_price.replace(",", ".")) || 0, lot: form.lot || undefined, address: form.address || undefined,
      movement_type_code: form.movement_type_code || undefined, cost_center_code: form.cost_center_code, notes: form.notes || undefined,
    });
    setFeedback({ type: "success", message: "Movimento lançado: saldo e custo médio atualizados." });
    setForm((p) => ({ ...p, quantity: "", unit_price: "", lot: "", notes: "" }));
    setMovs(await listMovementsByItem(form.item_code));
  });
  const estornar = (id: number) => run(async () => {
    if (!motivo.trim()) { setFeedback({ type: "error", message: "Informe o motivo do estorno." }); return; }
    await estornarMovimento(id, motivo.trim());
    setEstornando(null); setMotivo("");
    setFeedback({ type: "success", message: `Movimento ${id} estornado.` });
    setMovs(form.item_code ? await listMovementsByItem(form.item_code) : await listMovements());
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Lançar movimento</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Item</label>
        <LookupField value={form.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => set("item_code", String(c ?? ""))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Almoxarifado</label>
        <LookupField value={form.warehouse_id || undefined} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(c) => set("warehouse_id", c ? Number(c) : 0)} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Tipo de movimento (VEST0200)</label>
        <select className="erp-input" value={form.movement_type_code} onChange={(e) => set("movement_type_code", e.target.value)}>
          <option value="">— sem tipo (entrada/saída simples) —</option>
          {tipos.map((t) => <option key={t.sigla} value={t.sigla}>{t.sigla} — {t.description}</option>)}
        </select>
        {tipo && <small className="erp-hint">{tipo.entry_exit === "ENTRADA" ? "Entrada" : tipo.entry_exit === "SAIDA" ? "Saída" : "Entrada ou saída"}{tipo.requires_cost_center ? " · exige centro de custo" : ""}{tipo.updates_avg_cost === false ? " · entra pelo custo médio atual" : ""}</small>}
      </div>
      {!direcaoFixa && (
        <div className="erp-field erp-c3"><label className="erp-label">Direção</label>
          <select className="erp-input" value={form.movement_type} onChange={(e) => set("movement_type", e.target.value)}>
            <option value="IN">Entrada</option><option value="OUT">Saída</option><option value="ADJUSTMENT">Ajuste (+/−)</option>
          </select></div>
      )}
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade{uom ? ` (${uom})` : ""}</label>
        <input className="erp-input num" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder={form.movement_type === "ADJUSTMENT" ? "−3 ou 5" : "0"} /></div>
      {!ehSaida && (
        <div className="erp-field erp-c2"><label className="erp-label">Preço unitário{uom ? ` (por ${uom})` : ""}</label>
          <input className="erp-input num" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} disabled={tipo?.updates_avg_cost === false} /></div>
      )}
      <div className="erp-field erp-c2"><label className="erp-label">Lote</label><input className="erp-input" value={form.lot} onChange={(e) => set("lot", e.target.value)} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Endereço</label>
        <LookupField value={form.address || undefined} loader={loadWarehouseAddresses(form.warehouse_id || undefined)} entityLabel="endereço" placeholder="Sem endereço" clearable onChange={(c) => set("address", c ? String(c) : "")} /></div>
      <div className="erp-field erp-c2"><label className={`erp-label${tipo?.requires_cost_center ? " erp-req" : ""}`}>Centro de custo</label>
        <LookupField value={form.cost_center_code} loader={loadCostCenters} entityLabel="centro de custo" placeholder="—" clearable onChange={(c) => set("cost_center_code", c ? Number(c) : undefined)} /></div>
      <div className="erp-field erp-c4"><label className="erp-label">Observação</label><input className="erp-input" value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <button className="erp-btn erp-btn-primary" onClick={lancar} disabled={busy}>Lançar movimento</button>
        <span className="erp-hint">Saída sem preço é valorizada pelo custo médio. Saída maior que o saldo é recusada, salvo no almoxarifado que permite saldo negativo (VENT0800).</span>
      </div>
    </div></div>

    <div className="erp-fieldset"><div className="erp-fieldset-head">Movimentos ({movs.length})</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c12"><button className="erp-btn" onClick={carregar} disabled={busy}>{form.item_code ? "Movimentos do item" : "Últimos movimentos"}</button></div>
      <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
        <table className="erp-grid">
          <thead><tr><th>Mov.</th><th>Data</th><th>Item</th><th>Almoxarifado</th><th>Tipo</th><th className="num">Qtd</th><th className="num">Valor</th><th>Lote</th><th>Origem</th><th></th></tr></thead>
          <tbody>
            {movs.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">Clique para carregar os movimentos.</td></tr>}
            {movs.slice(0, 200).map((m) => (
              <Fragment key={m.id}>
                <tr style={{ opacity: m.reversed_by_movement_id ? 0.55 : 1 }}>
                  <td>{m.id}</td><td>{m.created_at?.slice(0, 10) ?? "—"}</td>
                  <td><EntityName code={m.item_code} loader={loadItems} prefix="Item" /></td>
                  <td><EntityName code={m.warehouse_id} loader={loadWarehouses} prefix="Almox." /></td>
                  <td>{MOVEMENT_LABEL[m.movement_type] ?? m.movement_type}{m.movement_type_code ? ` · ${m.movement_type_code}` : ""}</td>
                  <td className="num">{qtd(m.quantity)}</td><td className="num">{reais(m.total_price)}</td><td>{m.lot || "—"}</td>
                  <td>{m.reference_type ? `${REFERENCE_LABEL[m.reference_type] ?? m.reference_type} ${m.reference_code ?? ""}` : "Manual"}{m.cost_center_code ? ` · CC ${m.cost_center_code}` : ""}</td>
                  <td>{estornavel(m) && m.id && <button className="erp-btn erp-btn-sm" onClick={() => { setEstornando(m.id!); setMotivo(""); }} disabled={busy}>Estornar</button>}
                    {m.reversed_by_movement_id && <span className="erp-badge erp-badge-gray">estornado</span>}
                    {m.reverses_movement_id && <span className="erp-badge erp-badge-blue">estorno de {m.reverses_movement_id}</span>}</td>
                </tr>
                {estornando === m.id && (
                  <tr><td colSpan={10}>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <span>Motivo do estorno do movimento {m.id}:</span>
                      <input className="erp-input" style={{ maxWidth: 360 }} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                      <button className="erp-btn erp-btn-danger" onClick={() => estornar(m.id!)} disabled={busy}>Confirmar estorno</button>
                      <button className="erp-btn" onClick={() => setEstornando(null)} disabled={busy}>Cancelar</button>
                    </div>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div></div>
  </>);
}
