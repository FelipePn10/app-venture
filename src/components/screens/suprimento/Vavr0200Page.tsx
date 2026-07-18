import { useState, useCallback } from "react";
import {
  type ReceivingNotice, type NoticeItem, type ReceivingDivergence, type NoticeStatus, type DivergenceType, type DivergenceResolution,
  NOTICE_STATUSES, DIVERGENCE_TYPES, DIVERGENCE_RESOLUTIONS,
  listReceivingNotices, getReceivingNotice, createReceivingNotice, updateNoticeStatus,
  listReceivingDivergences, createReceivingDivergence, resolveDivergence,
} from "@/services/procurementService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const dt = (s?: string) => (s ? s.replace("T", " ").slice(0, 16) : "—");
const CAPA_INI = { enterprise_code: "1", supplier_code: "", purchase_order_code: "", carrier_code: "", dock: "", scheduled_at: "", invoice_number: "", notes: "" };
const ITEM_INI = { item_code: "", mask: "", expected_qty: "", unit: "" };
const DIV_INI = { item_code: "", divergence_type: "SHORTAGE" as DivergenceType, expected_qty: "", actual_qty: "", affects_supplier_score: true };

export function Vavr0200Page(): JSX.Element {
  const [notices, setNotices] = useState<ReceivingNotice[]>([]);
  const [capa, setCapa] = useState({ ...CAPA_INI });
  const [itemForm, setItemForm] = useState({ ...ITEM_INI });
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [detalhe, setDetalhe] = useState<ReceivingNotice | null>(null);
  const [novoStatus, setNovoStatus] = useState<NoticeStatus>("ARRIVED");
  const [divs, setDivs] = useState<ReceivingDivergence[]>([]);
  const [divForm, setDivForm] = useState({ ...DIV_INI });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  const setC = useCallback(<K extends keyof typeof capa>(k: K, v: string) => setCapa((c) => ({ ...c, [k]: v })), []);

  const carregar = () => run(async () => { setNotices(await listReceivingNotices()); });

  const addItem = () => {
    const item_code = Number(itemForm.item_code), expected_qty = Number(itemForm.expected_qty);
    if (!item_code || !expected_qty) { setFeedback({ type: "error", message: "Item e quantidade esperada são obrigatórios." }); return; }
    setItems((a) => [...a, { item_code, mask: itemForm.mask.trim(), expected_qty, unit: itemForm.unit.trim() || undefined }]);
    setItemForm({ ...ITEM_INI }); setFeedback(null);
  };
  const criar = () => run(async () => {
    if (!capa.supplier_code && !capa.purchase_order_code) { setFeedback({ type: "error", message: "Informe fornecedor ou pedido de compra." }); return; }
    if (items.length === 0) { setFeedback({ type: "error", message: "Inclua ao menos um item esperado." }); return; }
    const n = await createReceivingNotice({
      enterprise_code: Number(capa.enterprise_code) || 1,
      supplier_code: Number(capa.supplier_code) || undefined,
      purchase_order_code: Number(capa.purchase_order_code) || undefined,
      carrier_code: Number(capa.carrier_code) || undefined,
      dock: capa.dock.trim() || undefined,
      scheduled_at: capa.scheduled_at ? new Date(capa.scheduled_at).toISOString() : undefined,
      invoice_number: capa.invoice_number.trim() || undefined,
      notes: capa.notes.trim() || undefined,
      items,
    });
    setFeedback({ type: "success", message: `Aviso ${n.notice_number ?? n.id} criado (${n.status}).` });
    setCapa({ ...CAPA_INI }); setItems([]);
    setNotices(await listReceivingNotices());
  });

  const abrir = (id?: number) => { if (!id) return; void run(async () => { setDetalhe(await getReceivingNotice(id)); setDivs(await listReceivingDivergences({ notice_id: id })); }); };
  const avancar = () => { if (!detalhe?.id) return; void run(async () => {
    const n = await updateNoticeStatus(detalhe.id!, novoStatus, novoStatus === "BLOCKED");
    setDetalhe(n); setNotices(await listReceivingNotices());
    setFeedback({ type: "success", message: `Aviso ${n.notice_number ?? n.id} → ${n.status}${n.blocked ? " (bloqueado)" : ""}.` });
  }); };
  const addDiv = () => { if (!detalhe?.id) return; const item_code = Number(divForm.item_code); const eq = Number(divForm.expected_qty), aq = Number(divForm.actual_qty);
    void run(async () => {
      await createReceivingDivergence({ notice_id: detalhe.id, supplier_code: detalhe.supplier_code, item_code: item_code || undefined, divergence_type: divForm.divergence_type, expected_qty: eq, actual_qty: aq, affects_supplier_score: divForm.affects_supplier_score });
      setDivForm({ ...DIV_INI }); setDivs(await listReceivingDivergences({ notice_id: detalhe.id }));
      setFeedback({ type: "success", message: "Divergência registrada." });
    }); };
  const resolver = (id: number | undefined, resolution: DivergenceResolution) => { if (!id) return; void run(async () => {
    await resolveDivergence(id, resolution); if (detalhe?.id) setDivs(await listReceivingDivergences({ notice_id: detalhe.id }));
    setFeedback({ type: "success", message: `Divergência ${id} → ${resolution}.` });
  }); };

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Suprimento</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Aviso de Recebimento</span><span className="erp-crumb-code">VAVR0200</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Avisos</span>
          <button className="erp-btn erp-btn-primary" onClick={carregar} disabled={busy}>Listar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VAVR0200 — Avisos de Recebimento" filename="vavr0200" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Aviso de Recebimento</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="erp-fieldset"><div className="erp-fieldset-head">Novo aviso — <span style={{fontWeight:400,opacity:0.65}}>agenda de doca e conferência antes da NF</span></div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label">Empresa</label><input className="erp-input num" type="number" value={capa.enterprise_code} onChange={(e) => setC("enterprise_code", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Fornecedor</label><input className="erp-input num" type="number" value={capa.supplier_code} onChange={(e) => setC("supplier_code", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Pedido de compra</label><input className="erp-input num" type="number" value={capa.purchase_order_code} onChange={(e) => setC("purchase_order_code", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Transportadora</label><input className="erp-input num" type="number" value={capa.carrier_code} onChange={(e) => setC("carrier_code", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Doca</label><input className="erp-input" value={capa.dock} onChange={(e) => setC("dock", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Nº NF</label><input className="erp-input" value={capa.invoice_number} onChange={(e) => setC("invoice_number", e.target.value)} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">Agendado para</label><input className="erp-input" type="datetime-local" value={capa.scheduled_at} onChange={(e) => setC("scheduled_at", e.target.value)} /></div>
          <div className="erp-field erp-c9"><label className="erp-label">Observações</label><input className="erp-input" value={capa.notes} onChange={(e) => setC("notes", e.target.value)} /></div>
        
        <div className="erp-fieldset-body" style={{ marginTop: 8 }}>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={itemForm.item_code} onChange={(e) => setItemForm((f) => ({ ...f, item_code: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Máscara</label><input className="erp-input" value={itemForm.mask} onChange={(e) => setItemForm((f) => ({ ...f, mask: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Qtd esperada</label><input className="erp-input num" type="number" value={itemForm.expected_qty} onChange={(e) => setItemForm((f) => ({ ...f, expected_qty: e.target.value }))} /></div>
          <div className="erp-field erp-c1"><label className="erp-label">UM</label><input className="erp-input" value={itemForm.unit} onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))} /></div>
          <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={addItem}>+ item</button></div>
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={criar} disabled={busy}>Criar aviso</button></div>
        </div>
        {items.length > 0 && (
          <table className="erp-grid" style={{ marginTop: 10 }}>
            <thead><tr><th>Item</th><th>Máscara</th><th>Qtd esperada</th><th>UM</th><th></th></tr></thead>
            <tbody>{items.map((it, i) => <tr key={i}><td>{it.item_code}</td><td>{it.mask || "—"}</td><td>{it.expected_qty}</td><td>{it.unit || "—"}</td><td><button className="erp-btn" onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}>Remover</button></td></tr>)}</tbody>
          </table>
        )}
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Avisos ({notices.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Nº</th><th>Fornecedor</th><th>Pedido</th><th>Doca</th><th>Agendado</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {notices.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum aviso. Clique em Listar.</td></tr>}
              {notices.map((n) => (
                <tr key={n.id} className={detalhe?.id === n.id ? "erp-row-sel" : ""}>
                  <td style={{ fontWeight: 600 }}>{n.notice_number ?? n.id}</td><td>{n.supplier_code ?? "—"}</td><td>{n.purchase_order_code ?? "—"}</td>
                  <td>{n.dock || "—"}</td><td>{dt(n.scheduled_at)}</td><td>{n.status}{n.blocked ? " 🔒" : ""}</td>
                  <td><button className="erp-btn" onClick={() => abrir(n.id)} disabled={busy}>Abrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
        </div>

        {detalhe && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Aviso {detalhe.notice_number ?? detalhe.id} — {detalhe.status} <span className="erp-tgroup-label">Avançar</span> <select className="erp-input" style={{ height: 28, width: 150 }} value={novoStatus} onChange={(e) => setNovoStatus(e.target.value as NoticeStatus)}>{NOTICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select> <button className="erp-btn erp-btn-primary erp-btn-sm" onClick={avancar} disabled={busy}>Aplicar</button></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Item</th><th>Máscara</th><th>Esperada</th><th>Recebida</th><th>UM</th></tr></thead>
                <tbody>{(detalhe.items ?? []).map((it, i) => <tr key={i}><td>{it.item_code}</td><td>{it.mask || "—"}</td><td>{it.expected_qty}</td><td>{it.received_qty ?? 0}</td><td>{it.unit || "—"}</td></tr>)}</tbody>
              </table>
            </div></div>
            </div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Divergências ({divs.length}) — <span style={{fontWeight:400,opacity:0.65}}>falta/sobra/avaria/preço… alimentam o IQF do fornecedor</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label">Item</label><input className="erp-input num" type="number" value={divForm.item_code} onChange={(e) => setDivForm((f) => ({ ...f, item_code: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Tipo</label><select className="erp-input" value={divForm.divergence_type} onChange={(e) => setDivForm((f) => ({ ...f, divergence_type: e.target.value as DivergenceType }))}>{DIVERGENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Esperada</label><input className="erp-input num" type="number" value={divForm.expected_qty} onChange={(e) => setDivForm((f) => ({ ...f, expected_qty: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Real</label><input className="erp-input num" type="number" value={divForm.actual_qty} onChange={(e) => setDivForm((f) => ({ ...f, actual_qty: e.target.value }))} /></div>
              <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><label className="erp-label" style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={divForm.affects_supplier_score} onChange={(e) => setDivForm((f) => ({ ...f, affects_supplier_score: e.target.checked }))} />Afeta IQF</label></div>
              <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={addDiv} disabled={busy}>Registrar</button></div>
            
            {divs.length > 0 && (
              <table className="erp-grid" style={{ marginTop: 10 }}>
                <thead><tr><th>Item</th><th>Tipo</th><th>Esperada</th><th>Real</th><th>Resolução</th><th></th></tr></thead>
                <tbody>{divs.map((d) => (
                  <tr key={d.id}><td>{d.item_code ?? "—"}</td><td>{d.divergence_type}</td><td>{d.expected_qty}</td><td>{d.actual_qty}</td><td>{d.resolution}</td>
                    <td>{d.resolution === "PENDING" && (
                      <select className="erp-input" style={{ height: 26 }} defaultValue="" onChange={(e) => { if (e.target.value) resolver(d.id, e.target.value as DivergenceResolution); }}>
                        <option value="">resolver…</option>{DIVERGENCE_RESOLUTIONS.filter((r) => r !== "PENDING").map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>)}</td></tr>
                ))}</tbody>
              </table>
            )}
            </div></div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Avisos: <strong>{notices.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
