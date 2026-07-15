import { useState, useCallback } from "react";
import { type Drawing, type DrawingRevision, listDrawings, getDrawing, createDrawing, deleteDrawing, listRevisions, addRevision } from "@/services/drawingsService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: Drawing = { code: "", digit: "", format: "", model: "", description: "", uom: "" };

export function Vdes0100Page(): JSX.Element {
  const [list, setList] = useState<Drawing[]>([]);
  const [sel, setSel] = useState<Drawing | null>(null);
  const [revs, setRevs] = useState<DrawingRevision[]>([]);
  const [form, setForm] = useState<Drawing>({ ...EMPTY });
  const [revForm, setRevForm] = useState<DrawingRevision>({ revision: "", start_date: "", reason: "", approved_by: "", is_current: true });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => { setBusy(true); setFeedback(null); try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); } }, []);
  const setF = <K extends keyof Drawing>(k: K, v: Drawing[K]) => setForm((p) => ({ ...p, [k]: v }));

  const carregar = () => run(async () => { setList(await listDrawings()); });
  const abrir = (id?: number) => { if (!id) return; void run(async () => { setSel(await getDrawing(id)); setRevs(await listRevisions(id)); }); };
  const criar = () => run(async () => { if (!form.code.trim() || !form.description.trim()) { setFeedback({ type: "error", message: "Código e descrição obrigatórios." }); return; } const d = await createDrawing(form); setForm({ ...EMPTY }); setList(await listDrawings()); setSel(d); setFeedback({ type: "success", message: `Desenho ${d.code} criado.` }); });
  const remover = (id?: number) => { if (!id) return; void run(async () => { await deleteDrawing(id); setList(await listDrawings()); setSel(null); }); };
  const addRev = () => { if (!sel?.id) return; void run(async () => { await addRevision(sel.id!, revForm); setRevs(await listRevisions(sel.id!)); setRevForm({ revision: "", start_date: "", reason: "", approved_by: "", is_current: true }); setFeedback({ type: "success", message: "Revisão adicionada." }); }); };

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Desenhos Técnicos</span><span className="erp-crumb-code">VDES0100</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{list.length} desenho(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Desenhos</span><button className="erp-btn erp-btn-dark" onClick={carregar} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VDES0100 — Desenhos Técnicos" filename="vdes0100" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Desenhos</span><span className="erp-count">{list.length}</span></div>
            <div className="erp-list">
              {list.length === 0 && <div className="erp-list-empty">Clique em <strong>Carregar</strong>.</div>}
              {list.map((d) => (
                <div key={d.id} className={`erp-list-row${sel?.id === d.id ? " erp-row-sel" : ""}`} onClick={() => abrir(d.id)}>
                  <span className="erp-list-code">{d.code}{d.digit ? `-${d.digit}` : ""}</span><span className="erp-list-sub">{d.description}</span>
                  <div className="erp-list-meta"><button className="erp-btn erp-btn-danger erp-btn-sm" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); remover(d.id); }}>×</button></div>
                </div>
              ))}
            </div>
          </aside>
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Desenho &amp; revisões</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset"><div className="erp-fieldset-head">Novo desenho</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input" value={form.code} onChange={(e) => setF("code", e.target.value)} /></div>
                <div className="erp-field erp-c1"><label className="erp-label">Dígito</label><input className="erp-input" value={form.digit} onChange={(e) => setF("digit", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Formato</label><input className="erp-input" value={form.format} onChange={(e) => setF("format", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Item</label><input className="erp-input num" type="number" value={form.item_code ?? ""} onChange={(e) => setF("item_code", Number(e.target.value) || undefined)} /></div>
                <div className="erp-field erp-c1"><label className="erp-label">UM</label><input className="erp-input" value={form.uom} onChange={(e) => setF("uom", e.target.value)} /></div>
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
                <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>Criar desenho</button></div>
              </div></div>
              {sel && (
                <div className="erp-fieldset"><div className="erp-fieldset-head">Revisões de {sel.code}</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Revisão</label><input className="erp-input" value={revForm.revision} onChange={(e) => setRevForm((f) => ({ ...f, revision: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Início</label><input className="erp-input" type="date" value={revForm.start_date} onChange={(e) => setRevForm((f) => ({ ...f, start_date: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Motivo</label><input className="erp-input" value={revForm.reason} onChange={(e) => setRevForm((f) => ({ ...f, reason: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Aprovador</label><input className="erp-input" value={revForm.approved_by} onChange={(e) => setRevForm((f) => ({ ...f, approved_by: e.target.value }))} /></div>
                  <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={addRev} disabled={busy}>+ revisão</button></div>
                  <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>Revisão</th><th>Início</th><th>Motivo</th><th>Aprovador</th><th>Atual</th></tr></thead>
                    <tbody>{revs.length === 0 ? <tr><td colSpan={5} className="erp-grid-empty">sem revisões</td></tr> : revs.map((r) => <tr key={r.id}><td>{r.revision}</td><td>{r.start_date?.slice(0, 10) ?? "—"}</td><td>{r.reason ?? "—"}</td><td>{r.approved_by ?? "—"}</td><td>{r.is_current ? "✓" : ""}</td></tr>)}</tbody>
                  </table></div>
                </div></div>
              )}
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar"><div className="erp-status-item">Desenhos: <strong>{list.length}</strong></div><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}
