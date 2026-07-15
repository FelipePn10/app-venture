import { useState, useCallback } from "react";
import { type BomHeader, listBomHeaders, createBomHeader, updateBomHeaderStatus } from "@/services/bomHeaderService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const STATUSES = ["DRAFT", "APPROVED", "OBSOLETE"];

/** VBOM0100 — Cabeçalhos de Estrutura (BOM). Versão/status/tipo por item (linhas em VENT0210). */
export function Vbom0100Page(): JSX.Element {
  const [item, setItem] = useState("");
  const [headers, setHeaders] = useState<BomHeader[]>([]);
  const [form, setForm] = useState({ mask: "", bom_type: "MBOM", valid_from: "" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = () => run(async () => { const it = Number(item); if (!it) { setFeedback({ type: "error", message: "Informe o item." }); return; } setHeaders(await listBomHeaders(it)); });
  const criar = () => run(async () => {
    const it = Number(item); if (!it) { setFeedback({ type: "error", message: "Informe o item." }); return; }
    await createBomHeader({ item_code: it, mask: form.mask.trim() || undefined, bom_type: form.bom_type, valid_from: form.valid_from || undefined });
    setForm({ mask: "", bom_type: "MBOM", valid_from: "" }); setHeaders(await listBomHeaders(it)); setFeedback({ type: "success", message: "Cabeçalho criado (nova versão)." });
  });
  const mudarStatus = (id: number | undefined, status: string) => { if (!id) return; void run(async () => { await updateBomHeaderStatus(id, status); setHeaders(await listBomHeaders(Number(item))); setFeedback({ type: "success", message: `Cabeçalho ${id} → ${status}.` }); }); };

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Cabeçalhos de Estrutura (BOM)</span><span className="erp-crumb-code">VBOM0100</span>
        </nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">EBOM / MBOM · versão + status</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Item</span><input className="erp-tinput" style={{ width: 110 }} type="number" value={item} onChange={(e) => setItem(e.target.value)} />
          <button className="erp-btn erp-btn-dark" onClick={carregar} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VBOM0100 — Cabeçalhos de Estrutura" filename="vbom0100" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Cabeçalhos do item</button></div>
          <div className="erp-detail-body">
            <div className="erp-fieldset"><div className="erp-fieldset-head">Novo cabeçalho (versão auto-incrementada)</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">Máscara</label><input className="erp-input" value={form.mask} onChange={(e) => setForm((f) => ({ ...f, mask: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Tipo</label><select className="erp-input" value={form.bom_type} onChange={(e) => setForm((f) => ({ ...f, bom_type: e.target.value }))}><option value="MBOM">MBOM</option><option value="EBOM">EBOM</option></select></div>
              <div className="erp-field erp-c3"><label className="erp-label">Vigência de</label><input className="erp-input" type="date" value={form.valid_from} onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))} /></div>
              <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>Criar cabeçalho</button></div>
            </div></div>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Cabeçalhos ({headers.length})</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c12"><table className="erp-grid">
                <thead><tr><th>#</th><th>Máscara</th><th>Tipo</th><th>Versão</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {headers.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Informe o item e carregue.</td></tr>}
                  {headers.map((h) => (
                    <tr key={h.id}><td><strong>#{h.id}</strong></td><td>{h.mask || "—"}</td><td>{h.bom_type}</td><td>{h.version ?? "—"}</td>
                      <td><span className={`erp-badge ${h.status === "APPROVED" ? "ok" : h.status === "OBSOLETE" ? "err" : "draft"}`}>{h.status}</span></td>
                      <td style={{ display: "flex", gap: 4 }}>{STATUSES.filter((s) => s !== h.status).map((s) => <button key={s} className="erp-btn erp-btn-sm" onClick={() => mudarStatus(h.id, s)} disabled={busy}>{s}</button>)}</td></tr>
                  ))}
                </tbody>
              </table></div>
            </div></div>
          </div>
        </section>
      </div>

      <footer className="erp-statusbar"><div className="erp-status-item">Cabeçalhos: <strong>{headers.length}</strong></div><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}
