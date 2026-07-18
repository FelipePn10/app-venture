import { useState, useCallback } from "react";
import {
  type ShipmentDTO, type ShipmentItemDTO, type ShipmentVolumeDTO, type ShipmentEventDTO,
  FREIGHT_MODALITIES, PACKAGE_TYPES,
  listShipments, getShipmentDetail, createShipment, addShipmentItem, conferItem,
  separateShipment, conferShipment, shipShipment, cancelShipment,
  updateTransport, addVolume, listVolumes, deleteVolume, linkNfe, listEvents,
  autoFillSalesOrder, exportShipmentPdf, exportShipmentXlsx,
} from "@/services/shipmentsService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const STATUS_LABEL: Record<string, string> = { OPEN: "Aberto", SEPARATED: "Separado", CONFERRED: "Conferido", SHIPPED: "Despachado", CANCELLED: "Cancelado" };
const statusLabel = (s?: string) => (s ? STATUS_LABEL[s] ?? s : "—");

const EMPTY_ITEM: ShipmentItemDTO = { item_code: 0, quantity: 1, warehouse_id: 0, unit_net_weight: 0, unit_gross_weight: 0 };
const EMPTY_VOL: ShipmentVolumeDTO = { volume_number: 1, package_type: "CAIXA", net_weight: 0, gross_weight: 0, length_cm: 0, width_cm: 0, height_cm: 0, marking: "" };

export function Vexp0100Page(): JSX.Element {
  const [list, setList] = useState<ShipmentDTO[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState<ShipmentDTO | null>(null);
  const [items, setItems] = useState<ShipmentItemDTO[]>([]);
  const [volumes, setVolumes] = useState<ShipmentVolumeDTO[]>([]);
  const [events, setEvents] = useState<ShipmentEventDTO[]>([]);
  const [newForm, setNewForm] = useState<ShipmentDTO>({ reference_type: "SALES_ORDER", sales_order_code: 0 });
  const [autoFillCode, setAutoFillCode] = useState("");
  const [itemForm, setItemForm] = useState<ShipmentItemDTO>({ ...EMPTY_ITEM });
  const [volForm, setVolForm] = useState<ShipmentVolumeDTO>({ ...EMPTY_VOL });
  const [transport, setTransport] = useState({ freight_modality: "CIF", freight_value: 0, insurance_value: 0, vehicle_plate: "", driver_name: "", antt_code: "", seals: "", estimated_delivery: "" });
  const [nfe, setNfe] = useState({ nfe_number: "", nfe_key: "", fiscal_exit_id: 0 });
  const [acceptDiv, setAcceptDiv] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const reload = useCallback(async (c: number) => {
    const d = await getShipmentDetail(c);
    setSelected(d.shipment); setItems(d.items);
    try { setVolumes(await listVolumes(c)); } catch { setVolumes(d.volumes); }
    try { setEvents(await listEvents(c)); } catch { setEvents([]); }
    setItemForm({ ...EMPTY_ITEM }); setVolForm({ ...EMPTY_VOL });
  }, []);

  const listar = () => run(async () => { setList(await listShipments(filterStatus ? { status: filterStatus } : undefined)); });
  const abrir = (c?: number) => { if (c) void run(async () => { await reload(c); }); };

  const criar = () => run(async () => {
    const created = await createShipment(newForm);
    setFeedback({ type: "success", message: `Romaneio ${created.code} criado (OPEN).` });
    setList(await listShipments());
    if (created.code) await reload(created.code);
  });
  const autoFill = () => run(async () => {
    const c = Number(autoFillCode);
    if (!c) { setFeedback({ type: "error", message: "Informe o código do pedido de venda." }); return; }
    const created = await autoFillSalesOrder(c);
    setFeedback({ type: "success", message: `Romaneio ${created.code} gerado do pedido ${c}.` });
    setList(await listShipments());
    if (created.code) await reload(created.code);
  });

  const code = () => selected?.code;
  const step = (fn: (c: number) => Promise<unknown>, msg: string) => { const c = code(); if (!c) return; void run(async () => { await fn(c); await reload(c); setList(await listShipments()); setFeedback({ type: "success", message: msg }); }); };

  const adicionarItem = () => { const c = code(); if (!c) return; void run(async () => {
    if (!itemForm.item_code || !itemForm.quantity) { setFeedback({ type: "error", message: "Item e quantidade são obrigatórios." }); return; }
    await addShipmentItem(c, itemForm); await reload(c); setFeedback({ type: "success", message: "Item adicionado." });
  }); };
  const conferirItem = (it: ShipmentItemDTO) => { const c = code(); if (!c || !it.id) return; void run(async () => {
    await conferItem(c, it.id!, it.quantity); await reload(c); setFeedback({ type: "success", message: `Item ${it.item_code} conferido.` });
  }); };
  const adicionarVolume = () => { const c = code(); if (!c) return; void run(async () => {
    await addVolume(c, volForm); await reload(c); setFeedback({ type: "success", message: "Volume adicionado." });
  }); };
  const removerVolume = (id?: number) => { const c = code(); if (!c || !id) return; void run(async () => {
    await deleteVolume(c, id); await reload(c); setFeedback({ type: "success", message: "Volume removido." });
  }); };
  const salvarTransporte = () => { const c = code(); if (!c) return; void run(async () => {
    await updateTransport(c, { ...transport, freight_modality: transport.freight_modality as never });
    await reload(c); setFeedback({ type: "success", message: "Dados de transporte salvos." });
  }); };
  const ligarNfe = () => { const c = code(); if (!c) return; void run(async () => {
    await linkNfe(c, { nfe_number: nfe.nfe_number || undefined, nfe_key: nfe.nfe_key || undefined, fiscal_exit_id: nfe.fiscal_exit_id || undefined });
    await reload(c); setFeedback({ type: "success", message: "NF-e vinculada ao romaneio." });
  }); };

  const st = selected?.status;
  const hasDivergence = items.some((i) => i.has_divergence);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Almoxarifado</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Romaneio de Expedição</span><span className="erp-crumb-code">VEXP0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Status</span>
          <select className="erp-input" style={{ width: 130, height: 32 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos</option>{Object.keys(STATUS_LABEL).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button className="erp-btn" onClick={listar} disabled={busy}>Listar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Auto-fill (pedido venda)</span>
          <input className="erp-input num" style={{ width: 100, height: 32 }} type="number" value={autoFillCode} placeholder="cód." onChange={(e) => setAutoFillCode(e.target.value)} />
          <button className="erp-btn" onClick={autoFill} disabled={busy}>Gerar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VEXP0100 — Romaneio" filename="vexp0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Romaneio de Expedição</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="erp-fieldset"><div className="erp-fieldset-head">Novo romaneio</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c3"><label className="erp-label">Tipo</label>
            <select className="erp-input" value={newForm.reference_type} onChange={(e) => setNewForm((p) => ({ ...p, reference_type: e.target.value as never }))}>
              <option value="SALES_ORDER">Pedido de Venda</option><option value="PURCHASE_ORDER">Pedido de Compra</option><option value="PRODUCTION_ORDER">Ordem de Produção</option>
            </select></div>
          <div className="erp-field erp-c3"><label className="erp-label erp-req">Código do pedido</label><input className="erp-input num" type="number" value={newForm.sales_order_code || ""} onChange={(e) => setNewForm((p) => ({ ...p, sales_order_code: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Transportadora</label><input className="erp-input num" type="number" value={newForm.carrier_code || ""} onChange={(e) => setNewForm((p) => ({ ...p, carrier_code: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c4" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>Criar romaneio</button></div>
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Romaneios ({list.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Código</th><th>Tipo</th><th>Pedido</th><th>Status</th><th>Volumes</th><th></th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum romaneio. Use Listar ou Auto-fill.</td></tr>}
              {list.map((s) => (
                <tr key={s.code} className={selected?.code === s.code ? "erp-row-sel" : ""}>
                  <td>{s.code}</td><td>{s.reference_type ?? "—"}</td>
                  <td>{s.sales_order_code ?? s.purchase_order_code ?? s.production_order_code ?? "—"}</td>
                  <td>{statusLabel(s.status)}</td><td>{s.total_volumes ?? 0}</td>
                  <td><button className="erp-btn" onClick={() => abrir(s.code)} disabled={busy}>Abrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
        </div>

        {selected && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Romaneio {selected.code} — {statusLabel(st)}{hasDivergence ? " · ⚠️ divergência" : ""}</div><div className="erp-fieldset-body">
              <div className="erp-tgroup" style={{ flexWrap: "wrap", gap: 8 }}>
                <button className="erp-btn erp-btn-primary" onClick={() => step(separateShipment, "Romaneio separado (estoque reservado).")} disabled={busy || st !== "OPEN"}>Separar (reserva)</button>
                <button className="erp-btn erp-btn-primary" onClick={() => step(conferShipment, "Romaneio conferido.")} disabled={busy || st !== "SEPARATED"}>Conferir</button>
                <label className="erp-tgroup-label" style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" checked={acceptDiv} onChange={(e) => setAcceptDiv(e.target.checked)} /> aceitar divergência</label>
                <button className="erp-btn erp-btn-primary" onClick={() => step((c) => shipShipment(c, acceptDiv), "Romaneio despachado (SHIPPED).")} disabled={busy || st !== "CONFERRED"}>Despachar</button>
                <button className="erp-btn erp-btn-danger" onClick={() => step((c) => cancelShipment(c, "Cancelado na tela"), "Romaneio cancelado (reservas liberadas).")} disabled={busy || st === "SHIPPED" || st === "CANCELLED"}>Cancelar</button>
                <button className="erp-btn" onClick={() => void run(async () => { await exportShipmentPdf(selected.code!); })} disabled={busy}>PDF</button>
                <button className="erp-btn" onClick={() => void run(async () => { await exportShipmentXlsx(selected.code!); })} disabled={busy}>Excel</button>
              </div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Itens ({items.length})</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={itemForm.item_code || ""} onChange={(e) => setItemForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Qtd</label><input className="erp-input num" type="number" value={itemForm.quantity || ""} onChange={(e) => setItemForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Depósito</label><input className="erp-input num" type="number" value={itemForm.warehouse_id || ""} onChange={(e) => setItemForm((p) => ({ ...p, warehouse_id: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Peso líq. unit.</label><input className="erp-input num" type="number" step="0.01" value={itemForm.unit_net_weight || ""} onChange={(e) => setItemForm((p) => ({ ...p, unit_net_weight: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Peso bruto unit.</label><input className="erp-input num" type="number" step="0.01" value={itemForm.unit_gross_weight || ""} onChange={(e) => setItemForm((p) => ({ ...p, unit_gross_weight: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={adicionarItem} disabled={busy || (st !== "OPEN" && st !== "SEPARATED")}>Adicionar</button></div>
            </div></div>
            <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Item</th><th>Planej.</th><th>Conferido</th><th>Diverg.?</th><th>Depósito</th><th></th></tr></thead>
                <tbody>
                  {items.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Sem itens.</td></tr>}
                  {items.map((it) => (
                    <tr key={it.id ?? it.item_code}>
                      <td>{it.item_code}</td><td>{it.quantity}</td>
                      <td>{it.is_conferred ? it.conferred_qty : "—"}</td>
                      <td>{it.has_divergence ? "⚠️ Sim" : it.is_conferred ? "Não" : "—"}</td>
                      <td>{it.warehouse_id ?? "—"}</td>
                      <td><button className="erp-btn" onClick={() => conferirItem(it)} disabled={busy || st === "SHIPPED" || st === "CANCELLED"}>Conferir</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
            </div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Volumes / packing ({volumes.length})</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c1"><label className="erp-label">Nº</label><input className="erp-input num" type="number" value={volForm.volume_number || ""} onChange={(e) => setVolForm((p) => ({ ...p, volume_number: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Espécie</label>
                <select className="erp-input" value={volForm.package_type} onChange={(e) => setVolForm((p) => ({ ...p, package_type: e.target.value as never }))}>{PACKAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Peso bruto</label><input className="erp-input num" type="number" step="0.01" value={volForm.gross_weight || ""} onChange={(e) => setVolForm((p) => ({ ...p, gross_weight: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c1"><label className="erp-label">Compr.</label><input className="erp-input num" type="number" value={volForm.length_cm || ""} onChange={(e) => setVolForm((p) => ({ ...p, length_cm: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c1"><label className="erp-label">Larg.</label><input className="erp-input num" type="number" value={volForm.width_cm || ""} onChange={(e) => setVolForm((p) => ({ ...p, width_cm: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c1"><label className="erp-label">Alt.</label><input className="erp-input num" type="number" value={volForm.height_cm || ""} onChange={(e) => setVolForm((p) => ({ ...p, height_cm: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Marca</label><input className="erp-input" value={volForm.marking ?? ""} onChange={(e) => setVolForm((p) => ({ ...p, marking: e.target.value }))} /></div>
              <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={adicionarVolume} disabled={busy}>Adicionar volume</button></div>
            </div></div>
            <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Nº</th><th>Espécie</th><th>Peso bruto</th><th>Cubagem m³</th><th>Marca</th><th></th></tr></thead>
                <tbody>
                  {volumes.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Sem volumes.</td></tr>}
                  {volumes.map((v) => <tr key={v.id ?? v.volume_number}><td>{v.volume_number}</td><td>{v.package_type}</td><td>{v.gross_weight ?? "—"}</td><td>{v.cubage_m3 ?? "—"}</td><td>{v.marking ?? "—"}</td><td><button className="erp-btn" onClick={() => removerVolume(v.id)} disabled={busy}>Remover</button></td></tr>)}
                </tbody>
              </table>
            </div></div>
            </div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Transporte &amp; NF-e</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label">Modalidade frete</label>
                <select className="erp-input" value={transport.freight_modality} onChange={(e) => setTransport((p) => ({ ...p, freight_modality: e.target.value }))}>{FREIGHT_MODALITIES.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Valor frete</label><input className="erp-input num" type="number" step="0.01" value={transport.freight_value || ""} onChange={(e) => setTransport((p) => ({ ...p, freight_value: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Placa</label><input className="erp-input" value={transport.vehicle_plate} onChange={(e) => setTransport((p) => ({ ...p, vehicle_plate: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Motorista</label><input className="erp-input" value={transport.driver_name} onChange={(e) => setTransport((p) => ({ ...p, driver_name: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">ANTT / Lacres</label><input className="erp-input" placeholder="ANTT / lacres" value={transport.seals} onChange={(e) => setTransport((p) => ({ ...p, seals: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Previsão de entrega</label><input className="erp-input" type="date" value={transport.estimated_delivery} onChange={(e) => setTransport((p) => ({ ...p, estimated_delivery: e.target.value }))} /></div>
              <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={salvarTransporte} disabled={busy}>Salvar transporte</button></div>
              <div className="erp-field erp-c2"><label className="erp-label">NF-e nº</label><input className="erp-input" value={nfe.nfe_number} onChange={(e) => setNfe((p) => ({ ...p, nfe_number: e.target.value }))} /></div>
              <div className="erp-field erp-c4"><label className="erp-label">Chave NF-e</label><input className="erp-input" value={nfe.nfe_key} onChange={(e) => setNfe((p) => ({ ...p, nfe_key: e.target.value }))} /></div>
              <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={ligarNfe} disabled={busy}>Vincular NF-e</button></div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Trilha de auditoria ({events.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Evento</th><th>Nota</th><th>Quando</th></tr></thead>
                <tbody>
                  {events.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Sem eventos (ou endpoint indisponível nesta build).</td></tr>}
                  {events.map((e, i) => <tr key={i}><td>{e.event}</td><td>{e.note ?? "—"}</td><td>{e.created_at?.slice(0, 19).replace("T", " ") ?? "—"}</td></tr>)}
                </tbody>
              </table>
            </div></div>
            </div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Romaneios: <strong>{list.length}</strong></div>{selected && <div className="erp-status-item">Aberto: <strong>{selected.code}</strong></div>}</div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
