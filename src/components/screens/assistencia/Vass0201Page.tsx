import { useState, useCallback, useEffect } from "react";
import {
  type TACallDTO, type TACallItemDTO, type DefectReasonDTO,
  createCall, listDefectReasons,
} from "@/services/technicalAssistanceService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadCustomers, loadEstablishments } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_CALL: TACallDTO = { enterprise_code: 0, customer_code: 0, subject: "", priority: "NORMAL", opened_at: today(), promised_date: today() };
const EMPTY_ITEM: TACallItemDTO = { sequence: 1, item_code: 0, quantity: 1, warranty_days: 0, purchase_invoice_date: today(), requested_action: "REPAIR" };

/**
 * VASS0201 — abertura rápida de chamado de assistência técnica.
 * Fluxo enxuto sobre `/api/technical-assistance/calls`; a manutenção completa
 * (status, notas, geração de pedido/ordem, cadastros de apoio) fica em VATC0280.
 */
export function Vass0201Page(): JSX.Element {
  const [form, setForm] = useState<TACallDTO>(EMPTY_CALL);
  const [items, setItems] = useState<TACallItemDTO[]>([]);
  const [itemForm, setItemForm] = useState<TACallItemDTO>(EMPTY_ITEM);
  const [reasons, setReasons] = useState<DefectReasonDTO[]>([]);
  const [lastNumber, setLastNumber] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  useEffect(() => { void run(async () => { setReasons(await listDefectReasons()); }); }, [run]);

  const addItem = () => {
    if (!itemForm.item_code) { setFeedback({ type: "error", message: "Selecione o item." }); return; }
    setItems((p) => [...p, { ...itemForm, sequence: p.length + 1 }]);
    setItemForm({ ...EMPTY_ITEM });
  };
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, sequence: idx + 1 })));

  const abrir = () => run(async () => {
    if (!form.enterprise_code) { setFeedback({ type: "error", message: "Informe a empresa." }); return; }
    if (!form.customer_code) { setFeedback({ type: "error", message: "Informe o cliente." }); return; }
    if (!form.subject.trim()) { setFeedback({ type: "error", message: "Informe o assunto." }); return; }
    if (items.length === 0) { setFeedback({ type: "error", message: "Inclua ao menos um item." }); return; }
    const created = await createCall({ ...form, items });
    setLastNumber(created.call_number ?? created.code ?? null);
    setFeedback({ type: "success", message: `Chamado ${created.call_number ?? created.code} aberto. Acompanhe em VATC0280 / VATC0480.` });
    setForm(EMPTY_CALL); setItems([]);
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Cadastro de Chamado de Assistência Técnica</span>
          <span className="erp-crumb-code">VASS0201</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Abertura rápida de chamado — manutenção completa em VATC0280</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Novo chamado</span>{lastNumber && <span className="erp-badge ok">Último: {lastNumber}</span>}</div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VASS0201 — Abertura de Chamado" filename="vass0201" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Dados do chamado</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c4"><label className="erp-label erp-req">Empresa</label><LookupField value={form.enterprise_code || undefined} loader={loadEstablishments} entityLabel="empresa" onChange={(c) => setForm((p) => ({ ...p, enterprise_code: c ?? 0 }))} /></div>
            <div className="erp-field erp-c4"><label className="erp-label erp-req">Cliente</label><LookupField value={form.customer_code || undefined} loader={loadCustomers} entityLabel="cliente" onChange={(c) => setForm((p) => ({ ...p, customer_code: c ?? 0 }))} /></div>
            <div className="erp-field erp-c4"><label className="erp-label">Consumidor (nome)</label><input className="erp-input" value={form.consumer_name ?? ""} onChange={(e) => setForm((p) => ({ ...p, consumer_name: e.target.value }))} /></div>
            <div className="erp-field erp-c6"><label className="erp-label erp-req">Assunto</label><input className="erp-input" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Prioridade</label>
              <select className="erp-tselect" value={form.priority ?? "NORMAL"} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                <option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option>
              </select>
            </div>
            <div className="erp-field erp-c3"><label className="erp-label">Prometido p/</label><input className="erp-input" type="date" value={form.promised_date ?? ""} onChange={(e) => setForm((p) => ({ ...p, promised_date: e.target.value }))} /></div>
            <div className="erp-field erp-c12"><label className="erp-label">Descrição</label><input className="erp-input" value={form.description ?? ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
          </div>
        </div>

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Itens do chamado</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label><LookupField value={itemForm.item_code} loader={loadItems} entityLabel="item" onChange={(c) => setItemForm((p) => ({ ...p, item_code: c ?? 0 }))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Qtd</label><input className="erp-input num" type="number" value={itemForm.quantity || ""} onChange={(e) => setItemForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Nº série</label><input className="erp-input" value={itemForm.serial_number ?? ""} onChange={(e) => setItemForm((p) => ({ ...p, serial_number: e.target.value }))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Motivo</label>
              <select className="erp-tselect" value={itemForm.defect_reason_code ?? ""} onChange={(e) => setItemForm((p) => ({ ...p, defect_reason_code: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">—</option>{reasons.map((r) => <option key={r.code} value={r.code}>{r.code} · {r.description}</option>)}
              </select>
            </div>
            <div className="erp-field erp-c5"><label className="erp-label">Complemento</label><input className="erp-input" value={itemForm.defect_complement ?? ""} onChange={(e) => setItemForm((p) => ({ ...p, defect_complement: e.target.value }))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Garantia (dias)</label><input className="erp-input num" type="number" value={itemForm.warranty_days ?? 0} onChange={(e) => setItemForm((p) => ({ ...p, warranty_days: Number(e.target.value) }))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">NF compra</label><input className="erp-input" value={itemForm.purchase_invoice_number ?? ""} onChange={(e) => setItemForm((p) => ({ ...p, purchase_invoice_number: e.target.value }))} /></div>
            <div className="erp-field erp-c2" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn" onClick={addItem} disabled={busy}>Adicionar</button></div>
          </div>
        </div>

        <div className="erp-grid-wrap">
          <table className="erp-grid">
            <thead><tr><th className="num">#</th><th className="num">Item</th><th>Série</th><th className="num">Qtd</th><th className="num">Motivo</th><th className="num">Garantia</th><th style={{ width: 70 }}></th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum item adicionado.</td></tr>}
              {items.map((it, i) => (
                <tr key={i}><td className="num">{it.sequence}</td><td className="num">{it.item_code}</td><td>{it.serial_number || "—"}</td><td className="num">{it.quantity}</td><td className="num">{it.defect_reason_code ?? "—"}</td><td className="num">{it.warranty_days ?? 0}</td>
                  <td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => removeItem(i)} disabled={busy}>Remover</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10 }}>
          <button className="erp-btn erp-btn-primary" onClick={abrir} disabled={busy}>{busy && <span className="erp-spin" />}Abrir chamado</button>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Itens: <strong>{items.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
