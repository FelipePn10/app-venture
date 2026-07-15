import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type PriceTableDTO, type PriceTableItemDTO,
  listPriceTables, createPriceTable, listPriceTableItems, upsertPriceTableItem, deletePriceTableItem,
} from "@/services/purchasingMasterService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadSuppliers } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_TABLE: PriceTableDTO = { description: "", currency: "BRL", valid_from: today(), valid_to: "" };
const EMPTY_ITEM: PriceTableItemDTO = { item_code: 0, price: 0, uom: "UN", min_qty: 0, supplier_code: undefined };

export function Vsup0120Page(): JSX.Element {
  const [tables, setTables] = useState<PriceTableDTO[]>([]);
  const [form, setForm] = useState<PriceTableDTO>(EMPTY_TABLE);
  const [selected, setSelected] = useState<PriceTableDTO | null>(null);
  const [items, setItems] = useState<PriceTableItemDTO[]>([]);
  const [itemForm, setItemForm] = useState<PriceTableItemDTO>(EMPTY_ITEM);
  const [creating, setCreating] = useState(true);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setTables(await listPriceTables()); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const codeOf = (t: PriceTableDTO) => t.code ?? t.id ?? 0;
  const setF = <K extends keyof PriceTableDTO>(k: K, v: PriceTableDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  const setIF = <K extends keyof PriceTableItemDTO>(k: K, v: PriceTableItemDTO[K]) => setItemForm((p) => ({ ...p, [k]: v }));

  function nova() { setCreating(true); setSelected(null); setForm(EMPTY_TABLE); setFeedback(null); }
  async function salvarTabela() {
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try { await createPriceTable(form); setForm(EMPTY_TABLE); setFeedback({ type: "success", message: "Tabela criada." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function abrir(t: PriceTableDTO) {
    setSelected(t); setCreating(false); setItemForm(EMPTY_ITEM); setBusy(true); setFeedback(null);
    try { setItems(await listPriceTableItems(codeOf(t))); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function addItem() {
    if (!selected) return;
    if (!itemForm.item_code || !itemForm.price) { setFeedback({ type: "error", message: "Item e preço são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await upsertPriceTableItem({ ...itemForm, table_code: codeOf(selected) }); setItemForm(EMPTY_ITEM); setItems(await listPriceTableItems(codeOf(selected))); setFeedback({ type: "success", message: "Preço salvo." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function removeItem(id: number) {
    if (!selected) return;
    setBusy(true); setFeedback(null);
    try { await deletePriceTableItem(id); setItems(await listPriceTableItems(codeOf(selected))); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => String(codeOf(t)).includes(q) || t.description.toLowerCase().includes(q));
  }, [tables, search]);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimento</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Tabela de Preço de Compra</span>
          <span className="erp-crumb-code">VSUP0120</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Preços de compra por item / fornecedor</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className="erp-btn erp-btn-primary" onClick={nova} disabled={busy}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Nova tabela
          </button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VSUP0120 — Tabela de Preço de Compra" filename="vsup0120" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Tabelas</span>
              <span className="erp-count">{visible.length}</span>
              <div className="erp-panel-head-spacer" />
              <input className="erp-search" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="erp-list">
              {visible.length === 0 && <div className="erp-list-empty">Nenhuma tabela cadastrada.</div>}
              {visible.map((t) => (
                <div key={codeOf(t)} className={`erp-list-row${!creating && selected && codeOf(selected) === codeOf(t) ? " sel" : ""}`} onClick={() => void abrir(t)}>
                  <span className="erp-list-code">#{codeOf(t)}</span>
                  <span className="erp-list-sub">{t.description}</span>
                  <div className="erp-list-meta">
                    <span className="erp-badge draft">{t.currency || "—"}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--v-text-3)" }}>{(t.valid_from ?? "").slice(0, 10)}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            {creating ? (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Nova tabela</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Dados da tabela</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder="Ex.: Tabela padrão 2026" /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Moeda</label><input className="erp-input" value={form.currency ?? ""} onChange={(e) => setF("currency", e.target.value.toUpperCase())} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Vigência início</label><input className="erp-input" type="date" value={(form.valid_from ?? "").slice(0, 10)} onChange={(e) => setF("valid_from", e.target.value)} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Vigência fim</label><input className="erp-input" type="date" value={(form.valid_to ?? "").slice(0, 10)} onChange={(e) => setF("valid_to", e.target.value)} /></div>
                      <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={() => void salvarTabela()} disabled={busy}>{busy && <span className="erp-spin" />}Criar tabela</button></div>
                    </div>
                  </div>
                </div>
              </>
            ) : selected ? (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Preços · tabela #{codeOf(selected)}</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Adicionar preço — {selected.description}</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label><LookupField value={itemForm.item_code} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => setIF("item_code", c ?? 0)} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label erp-req">Preço</label><input className="erp-input num" type="number" step="0.01" value={itemForm.price} onChange={(e) => setIF("price", Number(e.target.value))} /></div>
                      <div className="erp-field erp-c1"><label className="erp-label">UM</label><input className="erp-input" value={itemForm.uom ?? ""} onChange={(e) => setIF("uom", e.target.value.toUpperCase())} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Qtd mín.</label><input className="erp-input num" type="number" value={itemForm.min_qty ?? 0} onChange={(e) => setIF("min_qty", Number(e.target.value))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Fornecedor</label><LookupField value={itemForm.supplier_code} loader={loadSuppliers} entityLabel="fornecedor" placeholder="Genérico" onChange={(c) => setIF("supplier_code", c)} /></div>
                      <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={() => void addItem()} disabled={busy}>{busy && <span className="erp-spin" />}Adicionar preço</button></div>
                    </div>
                  </div>
                  <div className="erp-grid-wrap">
                    <table className="erp-grid">
                      <thead><tr><th className="num">Item</th><th className="num">Preço</th><th>UM</th><th className="num">Qtd mín.</th><th>Fornecedor</th><th style={{ width: 90 }}></th></tr></thead>
                      <tbody>
                        {items.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum preço nesta tabela.</td></tr>}
                        {items.map((it) => (
                          <tr key={it.id}>
                            <td className="num" style={{ fontWeight: 600 }}>{it.item_code}</td>
                            <td className="num">{money(it.price)}</td><td>{it.uom || "—"}</td>
                            <td className="num">{it.min_qty ?? 0}</td><td>{it.supplier_code ?? "genérico"}</td>
                            <td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => it.id && void removeItem(it.id)} disabled={busy}>Excluir</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="erp-detail-empty">
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M3 9h18" stroke="currentColor" strokeWidth="1.4"/></svg>
                <div className="erp-detail-empty-title">Selecione uma tabela</div>
                <div className="erp-detail-empty-sub">Escolha uma tabela à esquerda para gerir seus preços, ou clique em <strong>Nova tabela</strong>.</div>
              </div>
            )}
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Tabelas: <strong>{tables.length}</strong></div>
        {!creating && selected && <div className="erp-status-item">Tabela: <strong>#{codeOf(selected)}</strong> · {items.length} preço(s)</div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
