import { useState, useCallback, useEffect } from "react";
import {
  type RequisitionDTO, type RequisitionItemDTO, type GenerateSelection,
  listRequisitions, getRequisition, createRequisition, addRequisitionItem, generateOrders,
} from "@/services/purchaseRequisitionService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadEstablishments } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const saldo = (it: RequisitionItemDTO) => it.quantity - (it.attended_qty ?? 0) - (it.cancelled_qty ?? 0);
const EMPTY_ROW: RequisitionItemDTO = { item_code: 0, quantity: 1, uom: "UN", suggested_price: 0 };

export function Vsup0300Page(): JSX.Element {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [list, setList] = useState<RequisitionDTO[]>([]);
  const [head, setHead] = useState<{ enterprise_code?: number; requester_employee_code: string; notes: string }>({ enterprise_code: 1, requester_employee_code: "", notes: "" });
  const [newItems, setNewItems] = useState<RequisitionItemDTO[]>([{ ...EMPTY_ROW }]);
  const [detail, setDetail] = useState<RequisitionDTO | null>(null);
  const [itemForm, setItemForm] = useState<RequisitionItemDTO>({ ...EMPTY_ROW });
  const [gen, setGen] = useState<Record<number, { qty: string; supplier: string }>>({});
  const [creating, setCreating] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listRequisitions(onlyOpen)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, [onlyOpen]);
  useEffect(() => { void reload(); }, [reload]);

  function setNI(i: number, patch: Partial<RequisitionItemDTO>) { setNewItems((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it))); }
  function nova() { setCreating(true); setDetail(null); setHead({ enterprise_code: 1, requester_employee_code: "", notes: "" }); setNewItems([{ ...EMPTY_ROW }]); setFeedback(null); }

  async function criar() {
    if (!head.enterprise_code) { setFeedback({ type: "error", message: "Estabelecimento é obrigatório." }); return; }
    const items = newItems.filter((it) => it.item_code && it.quantity);
    if (items.length === 0) { setFeedback({ type: "error", message: "Inclua ao menos um item." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createRequisition({ enterprise_code: head.enterprise_code, requester_employee_code: head.requester_employee_code ? Number(head.requester_employee_code) : undefined, notes: head.notes || undefined, items });
      nova(); setFeedback({ type: "success", message: "Solicitação criada." }); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const abrir = useCallback(async (code: number) => {
    setBusy(true); setGen({}); setCreating(false);
    try { setDetail(await getRequisition(code)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  async function addItem() {
    if (!detail?.code) return;
    if (!itemForm.item_code || !itemForm.quantity) { setFeedback({ type: "error", message: "Item e quantidade obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await addRequisitionItem(detail.code, itemForm); setItemForm({ ...EMPTY_ROW }); await abrir(detail.code); setFeedback({ type: "success", message: "Item adicionado." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function gerarPedidos() {
    if (!detail?.items) return;
    const selections: GenerateSelection[] = [];
    for (const it of detail.items) {
      const g = gen[it.id ?? -1]; const qty = Number(g?.qty || 0);
      if (it.id && qty > 0) selections.push({ requisition_item_id: it.id, qty_to_attend: qty, supplier_code: g?.supplier ? Number(g.supplier) : undefined });
    }
    if (selections.length === 0) { setFeedback({ type: "error", message: "Informe quantidade a atender em ao menos um item." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const r = await generateOrders(selections);
      setFeedback({ type: "success", message: `Pedidos gerados. ${JSON.stringify(r).slice(0, 160)}` });
      if (detail.code) await abrir(detail.code); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimento</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Solicitação de Compra</span>
          <span className="erp-crumb-code">VSUP0300</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Requisição → geração de pedidos de compra</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className="erp-btn erp-btn-primary" onClick={nova} disabled={busy}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Nova solicitação
          </button>
        </div>
        <div className="erp-tgroup">
          <label className="erp-check"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /><span>Só abertas</span></label>
          <button className="erp-btn" onClick={() => void reload()} disabled={busy}>Atualizar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VSUP0300 — Solicitação de Compra" filename="vsup0300" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Solicitações</span><span className="erp-count">{list.length}</span></div>
            <div className="erp-list">
              {list.length === 0 && <div className="erp-list-empty">Nenhuma solicitação.</div>}
              {list.map((r) => (
                <div key={r.code} className={`erp-list-row${!creating && detail?.code === r.code ? " sel" : ""}`} onClick={() => r.code && void abrir(r.code)}>
                  <span className="erp-list-code">#{r.code}</span>
                  <span className="erp-list-sub">Estab. {r.enterprise_code} · {(r.emission_date ?? "").slice(0, 10)}</span>
                  <div className="erp-list-meta">
                    <span className="erp-badge draft">{r.status}</span>
                    {r.items?.length != null && <span className="erp-badge ok">{r.items.length} itens</span>}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            {creating ? (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Nova solicitação</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Dados</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label erp-req">Estabelecimento</label><LookupField value={head.enterprise_code} loader={loadEstablishments} entityLabel="estabelecimento" placeholder="Selecionar" onChange={(c) => setHead((p) => ({ ...p, enterprise_code: c }))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Solicitante (cód.)</label><input className="erp-input num" type="number" value={head.requester_employee_code} onChange={(e) => setHead((p) => ({ ...p, requester_employee_code: e.target.value }))} /></div>
                      <div className="erp-field erp-c5"><label className="erp-label">Observação</label><input className="erp-input" value={head.notes} onChange={(e) => setHead((p) => ({ ...p, notes: e.target.value }))} /></div>
                    </div>
                  </div>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Itens da solicitação</div>
                    <div className="erp-fieldset-body">
                      {newItems.map((it, i) => (
                        <div key={i} className="erp-field erp-c12" style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
                          <div style={{ flex: 3, minWidth: 0 }}><label className="erp-label erp-req">Item</label><LookupField value={it.item_code || undefined} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => setNI(i, { item_code: c ?? 0 })} /></div>
                          <div style={{ width: 90 }}><label className="erp-label">Qtde</label><input className="erp-input num" type="number" value={it.quantity} onChange={(e) => setNI(i, { quantity: Number(e.target.value) })} /></div>
                          <div style={{ width: 70 }}><label className="erp-label">UM</label><input className="erp-input" value={it.uom ?? ""} onChange={(e) => setNI(i, { uom: e.target.value.toUpperCase() })} /></div>
                          <div style={{ width: 120 }}><label className="erp-label">Valor sugerido</label><input className="erp-input num" type="number" step="0.01" value={it.suggested_price ?? 0} onChange={(e) => setNI(i, { suggested_price: Number(e.target.value) })} /></div>
                          <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => setNewItems((p) => p.filter((_, idx) => idx !== i))} disabled={newItems.length === 1}>✕</button>
                        </div>
                      ))}
                      <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                        <button className="erp-btn" onClick={() => setNewItems((p) => [...p, { ...EMPTY_ROW }])}>+ Linha</button>
                        <button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy}>{busy && <span className="erp-spin" />}Criar solicitação</button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : detail?.code ? (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Itens · solicitação #{detail.code}</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Adicionar item</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c6"><label className="erp-label erp-req">Item</label><LookupField value={itemForm.item_code || undefined} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => setItemForm((p) => ({ ...p, item_code: c ?? 0 }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Qtde</label><input className="erp-input num" type="number" value={itemForm.quantity} onChange={(e) => setItemForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">UM</label><input className="erp-input" value={itemForm.uom ?? ""} onChange={(e) => setItemForm((p) => ({ ...p, uom: e.target.value.toUpperCase() }))} /></div>
                      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void addItem()} disabled={busy}>+ Item</button></div>
                    </div>
                  </div>
                  <div className="erp-grid-wrap">
                    <table className="erp-grid">
                      <thead><tr><th className="num">Item</th><th className="num">Qtde</th><th className="num">Atend.</th><th className="num">Saldo</th><th>Status</th><th className="num">Atender</th><th>Fornecedor</th></tr></thead>
                      <tbody>
                        {(detail.items ?? []).length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum item.</td></tr>}
                        {(detail.items ?? []).map((it) => {
                          const sld = saldo(it); const g = gen[it.id ?? -1] ?? { qty: "", supplier: "" };
                          return (
                            <tr key={it.id}>
                              <td className="num" style={{ fontWeight: 600 }}>{it.item_code}</td>
                              <td className="num">{it.quantity}</td><td className="num">{it.attended_qty ?? 0}</td>
                              <td className="num" style={{ fontWeight: 700 }}>{sld}</td>
                              <td><span className="erp-badge draft">{it.status}</span></td>
                              <td><input className="erp-input num" style={{ height: 28, width: 74 }} type="number" value={g.qty} disabled={sld <= 0} onChange={(e) => setGen((p) => ({ ...p, [it.id!]: { ...g, qty: e.target.value } }))} /></td>
                              <td><input className="erp-input num" style={{ height: 28, width: 90 }} type="number" placeholder="preferencial" value={g.supplier} disabled={sld <= 0} onChange={(e) => setGen((p) => ({ ...p, [it.id!]: { ...g, supplier: e.target.value } }))} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div><button className="erp-btn erp-btn-primary" onClick={() => void gerarPedidos()} disabled={busy}>{busy && <span className="erp-spin" />}Gerar pedidos de compra</button></div>
                </div>
              </>
            ) : (
              <div className="erp-detail-empty">
                <div className="erp-detail-empty-title">Nenhuma solicitação selecionada</div>
                <div className="erp-detail-empty-sub">Selecione uma solicitação à esquerda ou clique em <strong>Nova solicitação</strong>.</div>
              </div>
            )}
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Solicitações: <strong>{list.length}</strong></div>
        {!creating && detail?.code ? <div className="erp-status-item">Solicitação: <strong>#{detail.code}</strong></div> : null}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
