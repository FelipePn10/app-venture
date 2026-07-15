import { useState } from "react";
import { type ItemConversionDTO, listItemConversions, upsertItemConversion, deleteItemConversion, convertItem } from "@/services/purchasingMasterService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: ItemConversionDTO = { item_code: 0, from_uom: "", to_uom: "", factor: 1 };

export function Vsup0110Page(): JSX.Element {
  const [item, setItem] = useState<number | undefined>(undefined);
  const [list, setList] = useState<ItemConversionDTO[]>([]);
  const [form, setForm] = useState<ItemConversionDTO>(EMPTY);
  const [conv, setConv] = useState({ from: "", to: "", qty: "1", result: "" });
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  async function carregar() {
    if (!item) { setFeedback({ type: "error", message: "Selecione o item." }); return; }
    setBusy(true); setFeedback(null);
    try { setList(await listItemConversions(item)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const setF = <K extends keyof ItemConversionDTO>(k: K, v: ItemConversionDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  async function salvar() {
    if (!item || !form.from_uom.trim() || !form.to_uom.trim() || !form.factor) { setFeedback({ type: "error", message: "Item, UMs e fator são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await upsertItemConversion({ ...form, item_code: item }); setForm(EMPTY); setFeedback({ type: "success", message: "Conversão salva." }); await carregar(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function remover(id: number) {
    setBusy(true); setFeedback(null);
    try { await deleteItemConversion(id); await carregar(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function converter() {
    if (!item || !conv.from || !conv.to) { setFeedback({ type: "error", message: "Informe item, de e para." }); return; }
    setBusy(true); setFeedback(null);
    try { const r = await convertItem(item, conv.from, conv.to, Number(conv.qty) || 1); setConv((p) => ({ ...p, result: JSON.stringify(r) })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimento</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Conversão de UM por Item</span>
          <span className="erp-crumb-code">VSUP0110</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">1 {form.from_uom || "UM"} = {form.factor} {form.to_uom || "UM"}</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Item</span>
          <div style={{ width: 260 }}><LookupField value={item} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => setItem(c)} /></div>
          <button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VSUP0110 — Conversão de UM por Item" filename="vsup0110" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Conversões do item</span>
              <span className="erp-count">{list.length}</span>
            </div>
            <div className="erp-list">
              {list.length === 0 && <div className="erp-list-empty">Selecione um item e clique em <strong>Carregar</strong>.</div>}
              {list.map((c) => (
                <div key={c.id} className="erp-list-row" style={{ cursor: "default" }}>
                  <span className="erp-list-code">{c.from_uom}→{c.to_uom}</span>
                  <span className="erp-list-sub">fator {c.factor}</span>
                  <div className="erp-list-meta">
                    <button className="erp-btn erp-btn-danger erp-btn-sm" style={{ marginLeft: "auto" }} onClick={() => c.id && void remover(c.id)} disabled={busy}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Conversões de unidade</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Nova conversão</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">De (UM)</label><input className="erp-input" value={form.from_uom} placeholder="CX" onChange={(e) => setF("from_uom", e.target.value.toUpperCase())} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Para (UM)</label><input className="erp-input" value={form.to_uom} placeholder="UN" onChange={(e) => setF("to_uom", e.target.value.toUpperCase())} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Fator</label><input className="erp-input num" type="number" step="0.0001" value={form.factor} onChange={(e) => setF("factor", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>Salvar conversão</button></div>
                </div>
              </div>
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Resolver conversão</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label className="erp-label">De</label><input className="erp-input" value={conv.from} onChange={(e) => setConv((p) => ({ ...p, from: e.target.value.toUpperCase() }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Para</label><input className="erp-input" value={conv.to} onChange={(e) => setConv((p) => ({ ...p, to: e.target.value.toUpperCase() }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Qtde</label><input className="erp-input num" type="number" value={conv.qty} onChange={(e) => setConv((p) => ({ ...p, qty: e.target.value }))} /></div>
                  <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={() => void converter()} disabled={busy}>Converter</button></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Resultado</label><input className="erp-input" readOnly value={conv.result} /></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Conversões: <strong>{list.length}</strong></div>
        {item ? <div className="erp-status-item">Item: <strong>#{item}</strong></div> : null}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
