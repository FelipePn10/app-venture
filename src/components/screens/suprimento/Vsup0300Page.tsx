import { useState, useCallback, useEffect } from "react";
import {
  type RequisitionDTO, type RequisitionItemDTO, type GenerateSelection,
  listRequisitions, getRequisition, createRequisition, addRequisitionItem, generateOrders,
} from "@/services/purchaseRequisitionService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const saldo = (it: RequisitionItemDTO) => it.quantity - (it.attended_qty ?? 0) - (it.cancelled_qty ?? 0);

export function Vsup0300Page(): JSX.Element {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [list, setList] = useState<RequisitionDTO[]>([]);
  const [head, setHead] = useState({ enterprise_code: "1", requester_employee_code: "", notes: "" });
  const [newItems, setNewItems] = useState<RequisitionItemDTO[]>([{ item_code: 0, quantity: 1, uom: "UN", suggested_price: 0 }]);
  const [detail, setDetail] = useState<RequisitionDTO | null>(null);
  const [itemForm, setItemForm] = useState<RequisitionItemDTO>({ item_code: 0, quantity: 1, uom: "UN", suggested_price: 0 });
  const [gen, setGen] = useState<Record<number, { qty: string; supplier: string }>>({});
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listRequisitions(onlyOpen)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, [onlyOpen]);
  useEffect(() => { void reload(); }, [reload]);

  function setNI(i: number, patch: Partial<RequisitionItemDTO>) { setNewItems((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it))); }
  async function criar() {
    const ec = Number(head.enterprise_code); if (!ec) { setFeedback({ type: "error", message: "Empresa é obrigatória." }); return; }
    const items = newItems.filter((it) => it.item_code && it.quantity);
    if (items.length === 0) { setFeedback({ type: "error", message: "Inclua ao menos um item." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createRequisition({ enterprise_code: ec, requester_employee_code: head.requester_employee_code ? Number(head.requester_employee_code) : undefined, notes: head.notes || undefined, items });
      setHead({ enterprise_code: "1", requester_employee_code: "", notes: "" }); setNewItems([{ item_code: 0, quantity: 1, uom: "UN", suggested_price: 0 }]);
      setFeedback({ type: "success", message: "Solicitação criada." }); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const abrir = useCallback(async (code: number) => {
    setBusy(true); setGen({});
    try { setDetail(await getRequisition(code)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  async function addItem() {
    if (!detail?.code) return;
    if (!itemForm.item_code || !itemForm.quantity) { setFeedback({ type: "error", message: "Item e quantidade obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await addRequisitionItem(detail.code, itemForm); setItemForm({ item_code: 0, quantity: 1, uom: "UN", suggested_price: 0 }); await abrir(detail.code); setFeedback({ type: "success", message: "Item adicionado." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function gerarPedidos() {
    if (!detail?.items) return;
    const selections: GenerateSelection[] = [];
    for (const it of detail.items) {
      const g = gen[it.id ?? -1];
      const qty = Number(g?.qty || 0);
      if (it.id && qty > 0) selections.push({ requisition_item_id: it.id, qty_to_attend: qty, supplier_code: g?.supplier ? Number(g.supplier) : undefined });
    }
    if (selections.length === 0) { setFeedback({ type: "error", message: "Informe quantidade a atender em ao menos um item." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const r = await generateOrders(selections);
      setFeedback({ type: "success", message: `Pedidos gerados. ${JSON.stringify(r).slice(0, 200)}` });
      if (detail.code) await abrir(detail.code); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VSUP0300 — Solicitação de Compra</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Visão</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void reload()} disabled={busy}>Atualizar</button>
          <span className="fsc-action-label">Só abertas</span>
          <label className="fsc-toggle"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label></div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VSUP0300 — Solicitação de Compra" filename="vsup0300" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Nova solicitação</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Empresa</label><input className="fsc-input fsc-input-right" type="number" value={head.enterprise_code} onChange={(e) => setHead((p) => ({ ...p, enterprise_code: e.target.value }))} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Solicitante (cód.)</label><input className="fsc-input fsc-input-right" type="number" value={head.requester_employee_code} onChange={(e) => setHead((p) => ({ ...p, requester_employee_code: e.target.value }))} /></div>
            <div className="fsc-field fsc-col-8"><label className="fsc-label">Observação</label><input className="fsc-input" value={head.notes} onChange={(e) => setHead((p) => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <div className="fsc-results-wrap" style={{ marginTop: 10 }}>
            <table className="fsc-table">
              <thead><tr><th>Item</th><th className="fsc-num">Qtde</th><th>UM</th><th className="fsc-num">Valor sugerido</th><th style={{ width: 50 }}></th></tr></thead>
              <tbody>
                {newItems.map((it, i) => (
                  <tr key={i}>
                    <td><input className="fsc-input fsc-input-right" style={{ height: 30, width: 90 }} type="number" value={it.item_code || ""} onChange={(e) => setNI(i, { item_code: Number(e.target.value) })} /></td>
                    <td><input className="fsc-input fsc-input-right" style={{ height: 30, width: 80 }} type="number" value={it.quantity} onChange={(e) => setNI(i, { quantity: Number(e.target.value) })} /></td>
                    <td><input className="fsc-input" style={{ height: 30, width: 60 }} value={it.uom ?? ""} onChange={(e) => setNI(i, { uom: e.target.value.toUpperCase() })} /></td>
                    <td><input className="fsc-input fsc-input-right" style={{ height: 30, width: 100 }} type="number" step="0.01" value={it.suggested_price ?? 0} onChange={(e) => setNI(i, { suggested_price: Number(e.target.value) })} /></td>
                    <td><button className="fsc-action-btn fsc-delete-btn" onClick={() => setNewItems((p) => p.filter((_, idx) => idx !== i))} disabled={newItems.length === 1}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button className="fsc-btn fsc-btn-ghost" onClick={() => setNewItems((p) => [...p, { item_code: 0, quantity: 1, uom: "UN", suggested_price: 0 }])}>+ Linha</button>
            <button className="fsc-btn fsc-btn-primary" onClick={() => void criar()} disabled={busy}>Criar solicitação</button>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Solicitações</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>#</th><th>Empresa</th><th>Emissão</th><th>Status</th><th className="fsc-num">Itens</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhuma solicitação.</td></tr>}
              {list.map((r) => (
                <tr key={r.code}><td style={{ fontWeight: 600 }}>{r.code}</td><td>{r.enterprise_code}</td><td>{(r.emission_date ?? "").slice(0, 10)}</td>
                  <td><span className="fsc-pill fsc-pill-gray">{r.status}</span></td><td className="fsc-num">{r.items?.length ?? "—"}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => r.code && void abrir(r.code)}>Abrir</button></td></tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {detail?.code && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Itens da solicitação {detail.code}</span><div className="fsc-section-banner-line" />
              <button className="fsc-btn fsc-btn-primary" onClick={() => void gerarPedidos()} disabled={busy}>Gerar pedidos</button>
              <button className="fsc-btn fsc-btn-ghost" onClick={() => setDetail(null)}>Fechar</button></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Item</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.item_code || ""} onChange={(e) => setItemForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Qtde</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.quantity} onChange={(e) => setItemForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">UM</label><input className="fsc-input" value={itemForm.uom ?? ""} onChange={(e) => setItemForm((p) => ({ ...p, uom: e.target.value.toUpperCase() }))} /></div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void addItem()} disabled={busy}>+ Item</button></div>
              </div>
            </div>
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead><tr><th>Item</th><th className="fsc-num">Qtde</th><th className="fsc-num">Atend.</th><th className="fsc-num">Saldo</th><th>Status</th><th className="fsc-num">Atender</th><th>Fornecedor</th></tr></thead>
                  <tbody>
                    {(detail.items ?? []).length === 0 && <tr><td colSpan={7} className="fsc-empty">Nenhum item.</td></tr>}
                    {(detail.items ?? []).map((it) => {
                      const sld = saldo(it);
                      const g = gen[it.id ?? -1] ?? { qty: "", supplier: "" };
                      return (
                        <tr key={it.id}>
                          <td style={{ fontWeight: 600 }}>{it.item_code}</td><td className="fsc-num">{it.quantity}</td><td className="fsc-num">{it.attended_qty ?? 0}</td>
                          <td className="fsc-num" style={{ fontWeight: 600 }}>{sld}</td><td><span className="fsc-pill fsc-pill-gray">{it.status}</span></td>
                          <td><input className="fsc-input fsc-input-right" style={{ height: 30, width: 80 }} type="number" value={g.qty} disabled={sld <= 0} onChange={(e) => setGen((p) => ({ ...p, [it.id!]: { ...g, qty: e.target.value } }))} /></td>
                          <td><input className="fsc-input fsc-input-right" style={{ height: 30, width: 90 }} type="number" placeholder="preferencial" value={g.supplier} disabled={sld <= 0} onChange={(e) => setGen((p) => ({ ...p, [it.id!]: { ...g, supplier: e.target.value } }))} /></td>
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
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Solicitações: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
