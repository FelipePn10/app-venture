import { useState, useCallback } from "react";
import {
  type LotMask, type LotMaskPart, PART_TYPES, APPLICATIONS,
  listLotMasks, getLotMask, createLotMask, updateLotMask, deleteLotMask,
  addLotMaskPart, updateLotMaskPart, deleteLotMaskPart, generateLot, generateLotByContext,
} from "@/services/lotMaskService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { enumLabel } from "@/utils/enumLabels";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Capa = { application: string; description: string; item_code: string; customer_code: string; zero_on_year_change: boolean };
type Parte = { id?: number; sequence: string; part_type: string; value: string; size: string; date_format: string; zero_on_year_change: boolean };

const CAPA: Capa = { application: "SUPRIMENTOS", description: "", item_code: "", customer_code: "", zero_on_year_change: false };
const PARTE: Parte = { sequence: "", part_type: "CARACTER", value: "", size: "1", date_format: "", zero_on_year_change: false };
const CONTEXTO = { application: "SUPRIMENTOS", item_code: "", customer_code: "" };

const capaDe = (m: LotMask): Capa => ({
  application: m.application || "SUPRIMENTOS", description: m.description, item_code: m.item_code ?? "",
  customer_code: m.customer_code ? String(m.customer_code) : "", zero_on_year_change: !!m.zero_on_year_change,
});
const parteDe = (p: LotMaskPart): Parte => ({
  id: p.id, sequence: String(p.sequence), part_type: p.part_type, value: p.value, size: String(p.size),
  date_format: p.date_format ?? "", zero_on_year_change: !!p.zero_on_year_change,
});

/**
 * VLOT0100 — Máscaras de Lote/Série. Compõe o número por partes e gera o próximo
 * lote. Também abre pelo código antigo VEST0300, que era uma rotina genérica sobre
 * o mesmo cadastro: o que só ela fazia (alterar máscara e parte, desativar parte,
 * gerar pelo contexto do item) está aqui.
 */
export function Vlot0100Page(): JSX.Element {
  const [masks, setMasks] = useState<LotMask[]>([]);
  const [sel, setSel] = useState<LotMask | null>(null);
  const [capa, setCapa] = useState<Capa>({ ...CAPA });
  const [parte, setParte] = useState<Parte>({ ...PARTE });
  const [contexto, setContexto] = useState({ ...CONTEXTO });
  const [gerado, setGerado] = useState("");
  const [inativas, setInativas] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const listar = (comInativas = inativas) => listLotMasks(!comInativas);
  const carregar = () => run(async () => { setMasks(await listar()); });
  const abrir = (id?: number) => { if (!id) return; void run(async () => {
    const m = await getLotMask(id);
    setSel(m); setCapa(capaDe(m)); setParte({ ...PARTE }); setGerado("");
  }); };
  const nova = () => { setSel(null); setCapa({ ...CAPA }); setParte({ ...PARTE }); setGerado(""); setFeedback(null); };

  const capaDto = (): LotMask => ({
    application: capa.application, description: capa.description.trim(),
    item_code: capa.item_code.trim() || undefined, customer_code: Number(capa.customer_code) || undefined,
    zero_on_year_change: capa.zero_on_year_change,
  });
  const salvarCapa = () => run(async () => {
    if (!capa.description.trim()) { setFeedback({ type: "error", message: "Informe a descrição da máscara." }); return; }
    const m = sel?.id ? await updateLotMask(sel.id, capaDto()) : await createLotMask(capaDto());
    const aberta = await getLotMask(m.id ?? sel?.id ?? 0);
    setSel(aberta); setCapa(capaDe(aberta)); setMasks(await listar());
    setFeedback({ type: "success", message: sel?.id ? `Máscara #${aberta.id} alterada.` : `Máscara criada (#${aberta.id}). Agora adicione as partes.` });
  });
  const desativarMascara = (id?: number) => { if (!id) return; void run(async () => {
    await deleteLotMask(id); setMasks(await listar());
    if (sel?.id === id) nova();
    setFeedback({ type: "success", message: `Máscara #${id} desativada.` });
  }); };

  const salvarParte = () => { if (!sel?.id) return; void run(async () => {
    if (parte.part_type === "DATA" && !parte.date_format.trim()) { setFeedback({ type: "error", message: "Parte do tipo data precisa do formato (ex.: DDMMYYYY, YYMM)." }); return; }
    const proxima = Math.max(0, ...(sel.parts ?? []).map((p) => p.sequence)) + 10;
    const p: LotMaskPart = {
      sequence: Number(parte.sequence) || proxima, part_type: parte.part_type, value: parte.value,
      size: Number(parte.size) || 1, date_format: parte.date_format.trim(), zero_on_year_change: parte.zero_on_year_change,
    };
    if (parte.id) await updateLotMaskPart(parte.id, p); else await addLotMaskPart(sel.id!, p);
    setSel(await getLotMask(sel.id!)); setParte({ ...PARTE });
    setFeedback({ type: "success", message: parte.id ? "Parte alterada." : "Parte adicionada." });
  }); };
  const desativarParte = (id?: number) => { if (!id || !sel?.id) return; void run(async () => {
    await deleteLotMaskPart(id); setSel(await getLotMask(sel.id!));
    if (parte.id === id) setParte({ ...PARTE });
    setFeedback({ type: "success", message: "Parte desativada: ela deixa de compor o lote." });
  }); };

  const gerar = () => { if (!sel?.id) return; void run(async () => {
    const r = await generateLot(sel.id!); setGerado(r.code);
    setFeedback({ type: "success", message: `Lote gerado pela máscara #${r.lot_mask_id}: ${r.code}` });
  }); };
  const gerarPeloContexto = () => run(async () => {
    const r = await generateLotByContext(contexto.application, contexto.item_code.trim() || undefined, Number(contexto.customer_code) || undefined);
    setGerado(r.code);
    setFeedback({ type: "success", message: `Lote gerado pela máscara #${r.lot_mask_id}: ${r.code}` });
  });

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
        <div className="erp-tgroup"><span className="erp-tgroup-label">Máscaras</span>
          <button className="erp-btn erp-btn-dark" onClick={carregar} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button>
          <button className="erp-btn" onClick={nova} disabled={busy}>Nova máscara</button>
          <label className="erp-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={inativas} onChange={(e) => { const v = e.target.checked; setInativas(v); void run(async () => { setMasks(await listar(v)); }); }} /> Incluir desativadas
          </label>
        </div>
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
                  <span className="erp-list-code">#{m.id} · {enumLabel(m.application)}</span><span className="erp-list-sub">{m.description}</span>
                  <div className="erp-list-meta">
                    {m.is_active === false
                      ? <span className="erp-badge erp-badge-gray" style={{ marginLeft: "auto" }}>desativada</span>
                      : <button className="erp-btn erp-btn-danger erp-btn-sm" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); desativarMascara(m.id); }} disabled={busy}>Desativar</button>}
                  </div>
                </div>
              ))}
            </div>
          </aside>
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Máscara &amp; partes</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset"><div className="erp-fieldset-head">{sel?.id ? `Máscara #${sel.id}` : "Nova máscara"}</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Aplicação</label>
                  <select className="erp-input" value={capa.application} onChange={(e) => setCapa((c) => ({ ...c, application: e.target.value }))}>
                    {APPLICATIONS.map((a) => <option key={a} value={a}>{enumLabel(a)}</option>)}
                  </select></div>
                <div className="erp-field erp-c5"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={capa.description} onChange={(e) => setCapa((c) => ({ ...c, description: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Item</label><input className="erp-input num" value={capa.item_code} onChange={(e) => setCapa((c) => ({ ...c, item_code: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Cliente</label><input className="erp-input num" value={capa.customer_code} onChange={(e) => setCapa((c) => ({ ...c, customer_code: e.target.value }))} /></div>
                <div className="erp-field erp-c6"><label className="erp-label"><input type="checkbox" checked={capa.zero_on_year_change} onChange={(e) => setCapa((c) => ({ ...c, zero_on_year_change: e.target.checked }))} /> Reiniciar a sequência na virada do ano</label></div>
                <div className="erp-field erp-c6" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={salvarCapa} disabled={busy}>{sel?.id ? "Salvar alterações" : "Criar"}</button></div>
              </div></div>

              {sel && (
                <div className="erp-fieldset"><div className="erp-fieldset-head">Partes de #{sel.id} — {sel.description}
                  <button className="erp-btn erp-btn-sm" style={{ float: "right" }} onClick={gerar} disabled={busy}>Gerar próximo lote</button></div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c2"><label className="erp-label">Sequência</label><input className="erp-input num" type="number" placeholder="auto" value={parte.sequence} onChange={(e) => setParte((p) => ({ ...p, sequence: e.target.value }))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Tipo</label><select className="erp-input" value={parte.part_type} onChange={(e) => setParte((p) => ({ ...p, part_type: e.target.value }))}>{PART_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
                    <div className="erp-field erp-c3"><label className="erp-label">{parte.part_type.startsWith("SEQ_") ? "Valor inicial" : "Valor"}</label><input className="erp-input" placeholder={parte.part_type === "SEQ_NUMERICA" ? "ex.: 1" : parte.part_type === "SEQ_CARACTER" ? "ex.: A" : ""} value={parte.value} onChange={(e) => setParte((p) => ({ ...p, value: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Tamanho</label><input className="erp-input num" type="number" value={parte.size} onChange={(e) => setParte((p) => ({ ...p, size: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Formato de data</label><input className="erp-input" placeholder="DDMMYYYY" disabled={parte.part_type !== "DATA"} value={parte.date_format} onChange={(e) => setParte((p) => ({ ...p, date_format: e.target.value }))} /></div>
                    <div className="erp-field erp-c6"><label className="erp-label"><input type="checkbox" checked={parte.zero_on_year_change} onChange={(e) => setParte((p) => ({ ...p, zero_on_year_change: e.target.checked }))} /> Zerar esta sequência na virada do ano</label></div>
                    <div className="erp-field erp-c6" style={{ justifyContent: "flex-end", flexDirection: "row", gap: 8 }}>
                      {parte.id && <button className="erp-btn" onClick={() => setParte({ ...PARTE })} disabled={busy}>Cancelar edição</button>}
                      <button className="erp-btn erp-btn-primary" onClick={salvarParte} disabled={busy}>{parte.id ? "Salvar parte" : "+ parte"}</button>
                    </div>
                    <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>Seq</th><th>Tipo</th><th>Valor</th><th>Tam.</th><th>Formato</th><th /></tr></thead>
                      <tbody>{(sel.parts ?? []).length === 0
                        ? <tr><td colSpan={6} className="erp-grid-empty">sem partes</td></tr>
                        : (sel.parts ?? []).map((p) => (
                          <tr key={p.id ?? p.sequence} className={parte.id === p.id ? "erp-row-sel" : undefined}>
                            <td>{p.sequence}</td><td>{enumLabel(p.part_type)}</td><td>{p.value || "—"}</td><td>{p.size}</td><td>{p.date_format || "—"}</td>
                            <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                              <button className="erp-btn erp-btn-sm" onClick={() => setParte(parteDe(p))} disabled={busy || !p.id}>Alterar</button>{" "}
                              <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => desativarParte(p.id)} disabled={busy || !p.id}>Desativar</button>
                            </td>
                          </tr>
                        ))}</tbody>
                    </table></div>
                  </div>
                </div>
              )}

              <div className="erp-fieldset"><div className="erp-fieldset-head">Gerar pelo contexto</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c12"><span className="erp-label">Como o recebimento e a produção fazem: o sistema escolhe a máscara mais específica da aplicação (do item, do cliente ou a geral).</span></div>
                <div className="erp-field erp-c3"><label className="erp-label">Aplicação</label>
                  <select className="erp-input" value={contexto.application} onChange={(e) => setContexto((c) => ({ ...c, application: e.target.value }))}>
                    {APPLICATIONS.map((a) => <option key={a} value={a}>{enumLabel(a)}</option>)}
                  </select></div>
                <div className="erp-field erp-c3"><label className="erp-label">Item</label><input className="erp-input num" value={contexto.item_code} onChange={(e) => setContexto((c) => ({ ...c, item_code: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Cliente</label><input className="erp-input num" value={contexto.customer_code} onChange={(e) => setContexto((c) => ({ ...c, customer_code: e.target.value }))} /></div>
                <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={gerarPeloContexto} disabled={busy}>Gerar código de lote</button></div>
                {gerado && <div className="erp-field erp-c12"><label className="erp-label">Último lote gerado</label><input className="erp-input" value={gerado} readOnly /></div>}
              </div></div>
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar"><div className="erp-status-item">Máscaras: <strong>{masks.length}</strong></div><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}
