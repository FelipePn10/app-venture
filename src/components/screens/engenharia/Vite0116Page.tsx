import { useState, useCallback } from "react";
import { type GrupoPDM, type ModificadorPDM, listarGrupos, listarModificadores } from "@/services/pdmService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Attr = { name: string; value: string };

/**
 * VITE0116 — Atributos (PDM). No backend, atributos NÃO têm cadastro próprio: são pares
 * `{name, value}` gravados no objeto `pdm` do **item**. Esta tela é o **montador**:
 * escolhe Grupo + Modificador reais e os atributos, pré-visualizando o payload `pdm`.
 */
export function Vite0116Page(): JSX.Element {
  const [grupos, setGrupos] = useState<GrupoPDM[]>([]);
  const [mods, setMods] = useState<ModificadorPDM[]>([]);
  const [groupCode, setGroupCode] = useState("");
  const [modifierId, setModifierId] = useState("");
  const [attrs, setAttrs] = useState<Attr[]>([]);
  const [attrForm, setAttrForm] = useState<Attr>({ name: "", value: "" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = () => run(async () => { const [g, m] = await Promise.all([listarGrupos(), listarModificadores()]); setGrupos(g); setMods(m); setFeedback({ type: "info", message: `${g.length} grupo(s) e ${m.length} modificador(es) carregados.` }); });
  const addAttr = () => { if (!attrForm.name.trim() || !attrForm.value.trim()) { setFeedback({ type: "error", message: "Nome e valor do atributo são obrigatórios." }); return; } setAttrs((a) => [...a, { name: attrForm.name.trim().toUpperCase(), value: attrForm.value.trim() }]); setAttrForm({ name: "", value: "" }); };
  const removeAttr = (i: number) => setAttrs((a) => a.filter((_, idx) => idx !== i));

  const grupo = grupos.find((g) => g.code === Number(groupCode));
  const mod = mods.find((m) => m.id === Number(modifierId));
  const descricao = [grupo?.description, mod?.description, ...attrs.map((a) => `${a.name}:${a.value}`)].filter(Boolean).join(" ");
  const pdmPayload = { group_code: Number(groupCode) || null, modifier_code: Number(modifierId) || null, attributes: attrs, description_technique: descricao };
  const copiar = () => { void navigator.clipboard?.writeText(JSON.stringify(pdmPayload, null, 2)); setFeedback({ type: "success", message: "Payload `pdm` copiado — cole no cadastro do item." }); };

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Atributos (PDM) — montador do item</span><span className="erp-crumb-code">VITE0116</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{attrs.length} atributo(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Cadastros</span><button className="erp-btn erp-btn-dark" onClick={carregar} disabled={busy}>{busy && <span className="erp-spin" />}Carregar grupos/modificadores</button></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VITE0116 — Atributos PDM" filename="vite0116" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Montador do objeto pdm do item</button></div>
          <div className="erp-detail-body">
            <div className="erp-feedback info" style={{ marginBottom: 12 }}>Atributos não têm cadastro próprio — são gravados no objeto <strong>pdm</strong> do <strong>item</strong> (VENT0200). Aqui você monta e pré-visualiza esse objeto.</div>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Grupo &amp; Modificador</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c6"><label className="erp-label">Grupo</label><select className="erp-input" value={groupCode} onChange={(e) => setGroupCode(e.target.value)}><option value="">— selecione —</option>{grupos.map((g) => <option key={g.code} value={g.code}>{g.code} — {g.description}</option>)}</select></div>
              <div className="erp-field erp-c6"><label className="erp-label">Modificador</label><select className="erp-input" value={modifierId} onChange={(e) => setModifierId(e.target.value)}><option value="">— selecione —</option>{mods.map((m) => <option key={m.id} value={m.id}>{m.id} — {m.description}</option>)}</select></div>
            </div></div>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Atributos do item ({attrs.length})</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c4"><label className="erp-label">Nome (ex.: COR)</label><input className="erp-input" value={attrForm.name} onChange={(e) => setAttrForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div className="erp-field erp-c6"><label className="erp-label">Valor (ex.: PRETO)</label><input className="erp-input" value={attrForm.value} onChange={(e) => setAttrForm((f) => ({ ...f, value: e.target.value }))} /></div>
              <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={addAttr}>Adicionar</button></div>
              {attrs.length > 0 && <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>Nome</th><th>Valor</th><th></th></tr></thead>
                <tbody>{attrs.map((a, i) => <tr key={i}><td><strong>{a.name}</strong></td><td>{a.value}</td><td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => removeAttr(i)}>×</button></td></tr>)}</tbody></table></div>}
            </div></div>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Pré-visualização</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c12"><label className="erp-label">Descrição técnica composta</label><input className="erp-input" value={descricao} readOnly /></div>
              <div className="erp-field erp-c12"><label className="erp-label">Objeto pdm (item)</label><textarea className="erp-input" style={{ minHeight: 130, fontFamily: "monospace" }} value={JSON.stringify(pdmPayload, null, 2)} readOnly /></div>
              <div className="erp-field erp-c3"><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={copiar}>Copiar pdm</button></div>
            </div></div>
          </div>
        </section>
      </div>

      <footer className="erp-statusbar"><div className="erp-status-item">Atributos: <strong>{attrs.length}</strong></div><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}
