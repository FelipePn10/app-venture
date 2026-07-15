import { useState } from "react";
import { type ItemSupplierDTO, listItemSuppliers, upsertItemSupplier, deleteItemSupplier } from "@/services/purchasingMasterService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadSuppliers } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: ItemSupplierDTO = { item_code: 0, supplier_code: 0, ranking: 1, supplier_item_code: "", supplier_item_desc: "", supplier_uom: "", lead_time_days: undefined };

export function Vsup0130Page(): JSX.Element {
  const [item, setItem] = useState<number | undefined>(undefined);
  const [list, setList] = useState<ItemSupplierDTO[]>([]);
  const [form, setForm] = useState<ItemSupplierDTO>(EMPTY);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  async function carregar() {
    if (!item) { setFeedback({ type: "error", message: "Selecione o item." }); return; }
    setBusy(true); setFeedback(null);
    try { setList(await listItemSuppliers(item)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const setF = <K extends keyof ItemSupplierDTO>(k: K, v: ItemSupplierDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  async function salvar() {
    if (!item || !form.supplier_code) { setFeedback({ type: "error", message: "Item e fornecedor são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await upsertItemSupplier({ ...form, item_code: item }); setForm(EMPTY); setFeedback({ type: "success", message: "Vínculo salvo." }); await carregar(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function remover(id: number) {
    setBusy(true); setFeedback(null);
    try { await deleteItemSupplier(id); await carregar(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimento</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Fornecedor Preferencial por Item</span>
          <span className="erp-crumb-code">VSUP0130</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Menor ranking = fornecedor preferencial</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Item</span>
          <div style={{ width: 260 }}><LookupField value={item} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => setItem(c)} /></div>
          <button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VSUP0130 — Fornecedor Preferencial por Item" filename="vsup0130" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Fornecedores do item</span>
              <span className="erp-count">{list.length}</span>
            </div>
            <div className="erp-list">
              {list.length === 0 && <div className="erp-list-empty">Selecione um item e clique em <strong>Carregar</strong>.</div>}
              {[...list].sort((a, b) => a.ranking - b.ranking).map((s) => (
                <div key={s.id} className="erp-list-row" style={{ cursor: "default" }}>
                  <span className="erp-list-code">#{s.supplier_code}</span>
                  <span className="erp-list-sub">{s.supplier_item_desc || s.supplier_item_code || "—"}</span>
                  <div className="erp-list-meta">
                    <span className="erp-badge ok">Ranking {s.ranking}</span>
                    {s.lead_time_days != null && <span className="erp-badge draft">{s.lead_time_days}d lead</span>}
                    <button className="erp-btn erp-btn-danger erp-btn-sm" style={{ marginLeft: "auto" }} onClick={() => s.id && void remover(s.id)} disabled={busy}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Vincular fornecedor</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Vínculo item × fornecedor</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c6"><label className="erp-label erp-req">Fornecedor</label><LookupField value={form.supplier_code} loader={loadSuppliers} entityLabel="fornecedor" placeholder="Selecionar fornecedor" onChange={(c) => setF("supplier_code", c ?? 0)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Ranking</label><input className="erp-input num" type="number" value={form.ranking} onChange={(e) => setF("ranking", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Lead time (dias)</label><input className="erp-input num" type="number" value={form.lead_time_days ?? ""} onChange={(e) => setF("lead_time_days", e.target.value ? Number(e.target.value) : undefined)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Cód. no fornecedor</label><input className="erp-input" value={form.supplier_item_code ?? ""} onChange={(e) => setF("supplier_item_code", e.target.value)} /></div>
                  <div className="erp-field erp-c7"><label className="erp-label">Descrição no fornecedor</label><input className="erp-input" value={form.supplier_item_desc ?? ""} onChange={(e) => setF("supplier_item_desc", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">UM</label><input className="erp-input" value={form.supplier_uom ?? ""} onChange={(e) => setF("supplier_uom", e.target.value.toUpperCase())} /></div>
                  <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy && <span className="erp-spin" />}Salvar vínculo</button></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Fornecedores: <strong>{list.length}</strong></div>
        {item ? <div className="erp-status-item">Item: <strong>#{item}</strong></div> : null}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
