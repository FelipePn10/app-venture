import { useState, useCallback, useEffect } from "react";
import {
  type ShipmentDTO, type ShipmentItemDTO,
  listShipments, createShipment, getShipment, addShipmentItem, conferItem, conferShipment, shipShipment, cancelShipment,
} from "@/services/shipmentsService";
import { errMessage, type Obj, parseStr, parseNum } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: ShipmentDTO = { sales_order_code: 0, carrier_code: undefined, volumes: 1, weight: 0 };
const EMPTY_ITEM: ShipmentItemDTO = { item_code: 0, quantity: 1 };

function statusPill(s?: string): JSX.Element {
  const x = (s ?? "").toUpperCase();
  const cls = x === "SHIPPED" ? "fsc-pill-green" : x === "CONFERRED" ? "fsc-pill-blue" : x === "SEPARATED" ? "fsc-pill-amber" : x === "CANCELLED" ? "fsc-pill-red" : "fsc-pill-gray";
  return <span className={`fsc-pill ${cls}`}>{s || "—"}</span>;
}

export function Vexp0100Page(): JSX.Element {
  const [list, setList] = useState<ShipmentDTO[]>([]);
  const [form, setForm] = useState<ShipmentDTO>(EMPTY);
  const [selCode, setSelCode] = useState<number | null>(null);
  const [detail, setDetail] = useState<Obj | null>(null);
  const [itemForm, setItemForm] = useState<ShipmentItemDTO>(EMPTY_ITEM);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listShipments()); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof ShipmentDTO>(k: K, v: ShipmentDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  const codeOf = (s: ShipmentDTO) => s.code ?? s.id ?? 0;

  async function criar() {
    if (!form.sales_order_code) { setFeedback({ type: "error", message: "Pedido de venda é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    try { await createShipment(form); setForm(EMPTY); setFeedback({ type: "success", message: "Romaneio criado." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const openDetail = useCallback(async (code: number) => {
    setBusy(true);
    try { setSelCode(code); setDetail(await getShipment(code)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  async function addItem() {
    if (!selCode) return;
    if (!itemForm.item_code || !itemForm.quantity) { setFeedback({ type: "error", message: "Item e quantidade obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await addShipmentItem(selCode, itemForm); setItemForm(EMPTY_ITEM); await openDetail(selCode); setFeedback({ type: "success", message: "Item adicionado." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function conferirItem(itemId: number, qty: number) {
    if (!selCode) return;
    const v = window.prompt("Quantidade conferida:", String(qty)); if (v === null) return;
    setBusy(true); setFeedback(null);
    try { await conferItem(itemId, Number(v)); await openDetail(selCode); setFeedback({ type: "success", message: "Item conferido." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function acao(fn: (c: number) => Promise<void>, msg: string) {
    if (!selCode) return;
    setBusy(true); setFeedback(null);
    try { await fn(selCode); setFeedback({ type: "success", message: msg }); await openDetail(selCode); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const detItems = (detail?.items ?? detail?.Items ?? []) as Obj[];
  const detStatus = detail ? parseStr(detail, "status", "Status") : "";

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VEXP0100 — Expedição / Romaneio</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Novo romaneio</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void criar()} disabled={busy}>{busy ? "..." : "Criar"}</button></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VEXP0100 — Expedição / Romaneio" filename="vexp0100" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Dados do romaneio</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Pedido de Venda</label><input className="fsc-input fsc-input-right" type="number" value={form.sales_order_code || ""} onChange={(e) => setF("sales_order_code", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Transportadora</label><input className="fsc-input fsc-input-right" type="number" value={form.carrier_code ?? ""} onChange={(e) => setF("carrier_code", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Volumes</label><input className="fsc-input fsc-input-right" type="number" value={form.volumes ?? 0} onChange={(e) => setF("volumes", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Peso (kg)</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.weight ?? 0} onChange={(e) => setF("weight", Number(e.target.value))} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Romaneios</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>#</th><th>Pedido</th><th>Transp.</th><th className="fsc-num">Vol.</th><th>Status</th><th style={{ width: 90 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhum romaneio.</td></tr>}
              {list.map((s) => (
                <tr key={codeOf(s)}><td style={{ fontWeight: 600 }}>{codeOf(s)}</td><td>{s.sales_order_code}</td><td>{s.carrier_code ?? "—"}</td>
                  <td className="fsc-num">{s.volumes ?? 0}</td><td>{statusPill(s.status)}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => void openDetail(codeOf(s))}>Abrir</button></td></tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {detail && selCode && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Romaneio {selCode} — {detStatus}</span><div className="fsc-section-banner-line" />
              <button className="fsc-btn fsc-btn-ghost" onClick={() => void acao(conferShipment, "Romaneio conferido.")} disabled={busy}>Conferir romaneio</button>
              <button className="fsc-btn fsc-btn-primary" onClick={() => void acao(shipShipment, "Romaneio despachado.")} disabled={busy}>Despachar</button>
              <button className="fsc-btn fsc-btn-danger" onClick={() => void acao(cancelShipment, "Romaneio cancelado.")} disabled={busy}>Cancelar</button>
              <button className="fsc-btn fsc-btn-ghost" onClick={() => { setSelCode(null); setDetail(null); }}>Fechar</button></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.item_code || ""} onChange={(e) => setItemForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Quantidade</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.quantity} onChange={(e) => setItemForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
                <div className="fsc-field fsc-col-3" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void addItem()} disabled={busy}>+ Item</button></div>
              </div>
            </div>
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead><tr><th>Item</th><th className="fsc-num">Qtd</th><th className="fsc-num">Conferido</th><th style={{ width: 100 }}>Ações</th></tr></thead>
                  <tbody>
                    {detItems.length === 0 && <tr><td colSpan={4} className="fsc-empty">Nenhum item.</td></tr>}
                    {detItems.map((it, i) => {
                      const id = parseNum(it, "id", "ID") ?? 0;
                      const qty = parseNum(it, "quantity", "Quantity") ?? 0;
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{parseNum(it, "item_code", "ItemCode") ?? "—"}</td>
                          <td className="fsc-num">{qty}</td><td className="fsc-num">{parseNum(it, "conferred_qty", "ConferredQty") ?? "—"}</td>
                          <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => id && void conferirItem(id, qty)} disabled={!id}>Conferir</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Romaneios: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
