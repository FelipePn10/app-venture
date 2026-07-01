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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VEXP0100 — Romaneio de Expedição</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Status</span>
          <select className="fsc-input" style={{ width: 130, height: 32 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos</option>{Object.keys(STATUS_LABEL).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button className="fsc-btn fsc-btn-ghost" onClick={listar} disabled={busy}>Listar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Auto-fill (pedido venda)</span>
          <input className="fsc-input fsc-input-right" style={{ width: 100, height: 32 }} type="number" value={autoFillCode} placeholder="cód." onChange={(e) => setAutoFillCode(e.target.value)} />
          <button className="fsc-btn fsc-btn-ghost" onClick={autoFill} disabled={busy}>Gerar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VEXP0100 — Romaneio" filename="vexp0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Novo romaneio</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Tipo</label>
            <select className="fsc-input" value={newForm.reference_type} onChange={(e) => setNewForm((p) => ({ ...p, reference_type: e.target.value as never }))}>
              <option value="SALES_ORDER">Pedido de Venda</option><option value="PURCHASE_ORDER">Pedido de Compra</option><option value="PRODUCTION_ORDER">Ordem de Produção</option>
            </select></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Código do pedido</label><input className="fsc-input fsc-input-right" type="number" value={newForm.sales_order_code || ""} onChange={(e) => setNewForm((p) => ({ ...p, sales_order_code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Transportadora</label><input className="fsc-input fsc-input-right" type="number" value={newForm.carrier_code || ""} onChange={(e) => setNewForm((p) => ({ ...p, carrier_code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-4" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={criar} disabled={busy}>Criar romaneio</button></div>
        </div></div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Romaneios ({list.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Código</th><th>Tipo</th><th className="fsc-num">Pedido</th><th>Status</th><th className="fsc-num">Volumes</th><th></th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhum romaneio. Use Listar ou Auto-fill.</td></tr>}
              {list.map((s) => (
                <tr key={s.code} className={selected?.code === s.code ? "fsc-row-selected" : ""}>
                  <td className="fsc-num">{s.code}</td><td>{s.reference_type ?? "—"}</td>
                  <td className="fsc-num">{s.sales_order_code ?? s.purchase_order_code ?? s.production_order_code ?? "—"}</td>
                  <td>{statusLabel(s.status)}</td><td className="fsc-num">{s.total_volumes ?? 0}</td>
                  <td><button className="fsc-btn fsc-btn-ghost" onClick={() => abrir(s.code)} disabled={busy}>Abrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {selected && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Romaneio {selected.code} — {statusLabel(st)}{hasDivergence ? " · ⚠️ divergência" : ""}</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-action-group" style={{ flexWrap: "wrap", gap: 8 }}>
                <button className="fsc-btn fsc-btn-primary" onClick={() => step(separateShipment, "Romaneio separado (estoque reservado).")} disabled={busy || st !== "OPEN"}>Separar (reserva)</button>
                <button className="fsc-btn fsc-btn-primary" onClick={() => step(conferShipment, "Romaneio conferido.")} disabled={busy || st !== "SEPARATED"}>Conferir</button>
                <label className="fsc-action-label" style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" checked={acceptDiv} onChange={(e) => setAcceptDiv(e.target.checked)} /> aceitar divergência</label>
                <button className="fsc-btn fsc-btn-primary" onClick={() => step((c) => shipShipment(c, acceptDiv), "Romaneio despachado (SHIPPED).")} disabled={busy || st !== "CONFERRED"}>Despachar</button>
                <button className="fsc-btn fsc-btn-danger" onClick={() => step((c) => cancelShipment(c, "Cancelado na tela"), "Romaneio cancelado (reservas liberadas).")} disabled={busy || st === "SHIPPED" || st === "CANCELLED"}>Cancelar</button>
                <button className="fsc-btn fsc-btn-ghost" onClick={() => void run(async () => { await exportShipmentPdf(selected.code!); })} disabled={busy}>PDF</button>
                <button className="fsc-btn fsc-btn-ghost" onClick={() => void run(async () => { await exportShipmentXlsx(selected.code!); })} disabled={busy}>Excel</button>
              </div>
            </div></div>

            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Itens ({items.length})</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
              <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.item_code || ""} onChange={(e) => setItemForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Qtd</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.quantity || ""} onChange={(e) => setItemForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Depósito</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.warehouse_id || ""} onChange={(e) => setItemForm((p) => ({ ...p, warehouse_id: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Peso líq. unit.</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={itemForm.unit_net_weight || ""} onChange={(e) => setItemForm((p) => ({ ...p, unit_net_weight: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Peso bruto unit.</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={itemForm.unit_gross_weight || ""} onChange={(e) => setItemForm((p) => ({ ...p, unit_gross_weight: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-2" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={adicionarItem} disabled={busy || (st !== "OPEN" && st !== "SEPARATED")}>Adicionar</button></div>
            </div></div></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th className="fsc-num">Item</th><th className="fsc-num">Planej.</th><th className="fsc-num">Conferido</th><th>Diverg.?</th><th className="fsc-num">Depósito</th><th></th></tr></thead>
                <tbody>
                  {items.length === 0 && <tr><td colSpan={6} className="fsc-empty">Sem itens.</td></tr>}
                  {items.map((it) => (
                    <tr key={it.id ?? it.item_code}>
                      <td className="fsc-num">{it.item_code}</td><td className="fsc-num">{it.quantity}</td>
                      <td className="fsc-num">{it.is_conferred ? it.conferred_qty : "—"}</td>
                      <td>{it.has_divergence ? "⚠️ Sim" : it.is_conferred ? "Não" : "—"}</td>
                      <td className="fsc-num">{it.warehouse_id ?? "—"}</td>
                      <td><button className="fsc-btn fsc-btn-ghost" onClick={() => conferirItem(it)} disabled={busy || st === "SHIPPED" || st === "CANCELLED"}>Conferir</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>

            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Volumes / packing ({volumes.length})</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
              <div className="fsc-field fsc-col-1"><label className="fsc-label">Nº</label><input className="fsc-input fsc-input-right" type="number" value={volForm.volume_number || ""} onChange={(e) => setVolForm((p) => ({ ...p, volume_number: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Espécie</label>
                <select className="fsc-input" value={volForm.package_type} onChange={(e) => setVolForm((p) => ({ ...p, package_type: e.target.value as never }))}>{PACKAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Peso bruto</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={volForm.gross_weight || ""} onChange={(e) => setVolForm((p) => ({ ...p, gross_weight: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-1"><label className="fsc-label">Compr.</label><input className="fsc-input fsc-input-right" type="number" value={volForm.length_cm || ""} onChange={(e) => setVolForm((p) => ({ ...p, length_cm: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-1"><label className="fsc-label">Larg.</label><input className="fsc-input fsc-input-right" type="number" value={volForm.width_cm || ""} onChange={(e) => setVolForm((p) => ({ ...p, width_cm: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-1"><label className="fsc-label">Alt.</label><input className="fsc-input fsc-input-right" type="number" value={volForm.height_cm || ""} onChange={(e) => setVolForm((p) => ({ ...p, height_cm: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Marca</label><input className="fsc-input" value={volForm.marking ?? ""} onChange={(e) => setVolForm((p) => ({ ...p, marking: e.target.value }))} /></div>
              <div className="fsc-field fsc-col-2" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={adicionarVolume} disabled={busy}>Adicionar volume</button></div>
            </div></div></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th className="fsc-num">Nº</th><th>Espécie</th><th className="fsc-num">Peso bruto</th><th className="fsc-num">Cubagem m³</th><th>Marca</th><th></th></tr></thead>
                <tbody>
                  {volumes.length === 0 && <tr><td colSpan={6} className="fsc-empty">Sem volumes.</td></tr>}
                  {volumes.map((v) => <tr key={v.id ?? v.volume_number}><td className="fsc-num">{v.volume_number}</td><td>{v.package_type}</td><td className="fsc-num">{v.gross_weight ?? "—"}</td><td className="fsc-num">{v.cubage_m3 ?? "—"}</td><td>{v.marking ?? "—"}</td><td><button className="fsc-btn fsc-btn-ghost" onClick={() => removerVolume(v.id)} disabled={busy}>Remover</button></td></tr>)}
                </tbody>
              </table>
            </div></div>

            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Transporte &amp; NF-e</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Modalidade frete</label>
                <select className="fsc-input" value={transport.freight_modality} onChange={(e) => setTransport((p) => ({ ...p, freight_modality: e.target.value }))}>{FREIGHT_MODALITIES.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Valor frete</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={transport.freight_value || ""} onChange={(e) => setTransport((p) => ({ ...p, freight_value: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Placa</label><input className="fsc-input" value={transport.vehicle_plate} onChange={(e) => setTransport((p) => ({ ...p, vehicle_plate: e.target.value }))} /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Motorista</label><input className="fsc-input" value={transport.driver_name} onChange={(e) => setTransport((p) => ({ ...p, driver_name: e.target.value }))} /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">ANTT / Lacres</label><input className="fsc-input" placeholder="ANTT / lacres" value={transport.seals} onChange={(e) => setTransport((p) => ({ ...p, seals: e.target.value }))} /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Previsão de entrega</label><input className="fsc-input" type="date" value={transport.estimated_delivery} onChange={(e) => setTransport((p) => ({ ...p, estimated_delivery: e.target.value }))} /></div>
              <div className="fsc-field fsc-col-3" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={salvarTransporte} disabled={busy}>Salvar transporte</button></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">NF-e nº</label><input className="fsc-input" value={nfe.nfe_number} onChange={(e) => setNfe((p) => ({ ...p, nfe_number: e.target.value }))} /></div>
              <div className="fsc-field fsc-col-4"><label className="fsc-label">Chave NF-e</label><input className="fsc-input" value={nfe.nfe_key} onChange={(e) => setNfe((p) => ({ ...p, nfe_key: e.target.value }))} /></div>
              <div className="fsc-field fsc-col-2" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-ghost" onClick={ligarNfe} disabled={busy}>Vincular NF-e</button></div>
            </div></div></div>

            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Trilha de auditoria ({events.length})</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th>Evento</th><th>Nota</th><th>Quando</th></tr></thead>
                <tbody>
                  {events.length === 0 && <tr><td colSpan={3} className="fsc-empty">Sem eventos (ou endpoint indisponível nesta build).</td></tr>}
                  {events.map((e, i) => <tr key={i}><td>{e.event}</td><td>{e.note ?? "—"}</td><td>{e.created_at?.slice(0, 19).replace("T", " ") ?? "—"}</td></tr>)}
                </tbody>
              </table>
            </div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Romaneios: <strong>{list.length}</strong></div>{selected && <div className="fsc-footer-stat">Aberto: <strong>{selected.code}</strong></div>}</div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
