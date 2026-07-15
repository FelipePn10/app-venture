import { useState, useCallback } from "react";
import { type LotMask, type LotMaskPart, PART_TYPES, listLotMasks, getLotMask, createLotMask, deleteLotMask, addLotMaskPart, generateLot } from "@/services/lotMaskService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const CAPA = { application: "", description: "", item_code: "", customer_code: "" };
const PART = { part_type: "CARACTER", value: "", size: "1", date_format: "" };

/** VLOT0100 — Máscaras de Lote/Série. Compõe o nº por partes e gera o próximo lote. */
export function Vlot0100Page(): JSX.Element {
  const [masks, setMasks] = useState<LotMask[]>([]);
  const [sel, setSel] = useState<LotMask | null>(null);
  const [capa, setCapa] = useState({ ...CAPA });
  const [part, setPart] = useState({ ...PART });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = () => run(async () => { setMasks(await listLotMasks()); });
  const abrir = (id?: number) => { if (!id) return; void run(async () => { setSel(await getLotMask(id)); }); };
  const criar = () => run(async () => {
    if (!capa.application.trim() || !capa.description.trim()) { setFeedback({ type: "error", message: "Aplicação e descrição são obrigatórias." }); return; }
    const m = await createLotMask({ application: capa.application.trim(), description: capa.description.trim(), item_code: Number(capa.item_code) || undefined, customer_code: Number(capa.customer_code) || undefined });
    setCapa({ ...CAPA }); setMasks(await listLotMasks()); setSel(m); setFeedback({ type: "success", message: `Máscara criada (#${m.id}).` });
  });
  const addParte = () => { if (!sel?.id) return; void run(async () => {
    const p: LotMaskPart = { sequence: (sel.parts?.length ?? 0) * 10 + 10, part_type: part.part_type, value: part.value, size: Number(part.size) || 1, date_format: part.date_format };
    await addLotMaskPart(sel.id!, p); setSel(await getLotMask(sel.id!)); setPart({ ...PART }); setFeedback({ type: "success", message: "Parte adicionada." });
  }); };
  const gerar = () => { if (!sel?.id) return; void run(async () => { const r: Obj = await generateLot(sel.id!); setFeedback({ type: "success", message: `Lote gerado: ${JSON.stringify(r)}` }); }); };
  const remover = (id?: number) => { if (!id) return; void run(async () => { await deleteLotMask(id); setMasks(await listLotMasks()); setSel(null); }); };

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Almoxarifado</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Máscaras de Lote/Série</span><span className="erp-crumb-code">VLOT0100</span>
        </nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{masks.length} máscara(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Máscaras</span><button className="erp-btn erp-btn-dark" onClick={carregar} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VLOT0100 — Máscaras de Lote/Série" filename="vlot0100" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Máscaras</span><span className="erp-count">{masks.length}</span></div>
            <div className="erp-list">
              {masks.length === 0 && <div className="erp-list-empty">Clique em <strong>Carregar</strong>.</div>}
              {masks.map((m) => (
                <div key={m.id} className={`erp-list-row${sel?.id === m.id ? " erp-row-sel" : ""}`} onClick={() => abrir(m.id)}>
                  <span className="erp-list-code">#{m.id} · {m.application}</span><span className="erp-list-sub">{m.description}</span>
                  <div className="erp-list-meta"><button className="erp-btn erp-btn-danger erp-btn-sm" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); remover(m.id); }} disabled={busy}>Excluir</button></div>
                </div>
              ))}
            </div>
          </aside>
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Máscara &amp; partes</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset"><div className="erp-fieldset-head">Nova máscara</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Aplicação</label><input className="erp-input" value={capa.application} onChange={(e) => setCapa((c) => ({ ...c, application: e.target.value }))} /></div>
                <div className="erp-field erp-c5"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={capa.description} onChange={(e) => setCapa((c) => ({ ...c, description: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Item</label><input className="erp-input num" type="number" value={capa.item_code} onChange={(e) => setCapa((c) => ({ ...c, item_code: e.target.value }))} /></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>Criar</button></div>
              </div></div>
              {sel && (
                <div className="erp-fieldset"><div className="erp-fieldset-head">Partes de #{sel.id} — {sel.application}
                  <button className="erp-btn erp-btn-sm" style={{ float: "right" }} onClick={gerar} disabled={busy}>Gerar próximo lote</button></div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label">Tipo</label><select className="erp-input" value={part.part_type} onChange={(e) => setPart((p) => ({ ...p, part_type: e.target.value }))}>{PART_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="erp-field erp-c4"><label className="erp-label">Valor / formato</label><input className="erp-input" value={part.value} onChange={(e) => setPart((p) => ({ ...p, value: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Tamanho</label><input className="erp-input num" type="number" value={part.size} onChange={(e) => setPart((p) => ({ ...p, size: e.target.value }))} /></div>
                    <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={addParte} disabled={busy}>+ parte</button></div>
                    <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>Seq</th><th>Tipo</th><th>Valor</th><th>Tam.</th></tr></thead>
                      <tbody>{(sel.parts ?? []).length === 0 ? <tr><td colSpan={4} className="erp-grid-empty">sem partes</td></tr> : (sel.parts ?? []).map((p, i) => <tr key={i}><td>{p.sequence}</td><td>{p.part_type}</td><td>{p.value || "—"}</td><td>{p.size}</td></tr>)}</tbody>
                    </table></div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar"><div className="erp-status-item">Máscaras: <strong>{masks.length}</strong></div><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}
