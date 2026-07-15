import { useState, useCallback } from "react";
import { type GrupoPDM, type ModificadorPDM, listarGrupos, listarModificadores } from "@/services/pdmService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Attr = { name: string; value: string };

/**
 * VITE0116 — Atributos (PDM). No backend, atributos NÃO têm cadastro próprio: são pares
 * `{name, value}` gravados no objeto `pdm` do **item** (VITE cadastro de item). Esta tela
 * é o **montador**: escolhe Grupo + Modificador (cadastros reais) e os atributos do item,
 * pré-visualizando o payload `pdm` e a descrição técnica composta.
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

  const carregar = () => run(async () => {
    const [g, m] = await Promise.all([listarGrupos(), listarModificadores()]);
    setGrupos(g); setMods(m);
    setFeedback({ type: "info", message: `${g.length} grupo(s) e ${m.length} modificador(es) carregados.` });
  });

  const addAttr = () => {
    if (!attrForm.name.trim() || !attrForm.value.trim()) { setFeedback({ type: "error", message: "Nome e valor do atributo são obrigatórios." }); return; }
    setAttrs((a) => [...a, { name: attrForm.name.trim().toUpperCase(), value: attrForm.value.trim() }]);
    setAttrForm({ name: "", value: "" });
  };
  const removeAttr = (i: number) => setAttrs((a) => a.filter((_, idx) => idx !== i));

  const grupo = grupos.find((g) => g.code === Number(groupCode));
  const mod = mods.find((m) => m.id === Number(modifierId));
  const descricao = [grupo?.description, mod?.description, ...attrs.map((a) => `${a.name}:${a.value}`)].filter(Boolean).join(" ");
  const pdmPayload = {
    group_code: Number(groupCode) || null,
    modifier_code: Number(modifierId) || null,
    attributes: attrs,
    description_technique: descricao,
  };

  const copiar = () => { void navigator.clipboard?.writeText(JSON.stringify(pdmPayload, null, 2)); setFeedback({ type: "success", message: "Payload `pdm` copiado — cole no cadastro do item (VITE)." }); };

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VITE0116 — Atributos (PDM) — montador do item</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Cadastros</span>
          <button className="fsc-btn fsc-btn-primary" onClick={carregar} disabled={busy}>Carregar grupos/modificadores</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VITE0116 — Atributos PDM" filename="vite0116" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-feedback info" style={{ marginBottom: 12 }}>
          Atributos não têm cadastro próprio no ERP — eles são gravados no objeto <strong>pdm</strong> do <strong>item</strong> (VITE — cadastro de item).
          Aqui você monta e pré-visualiza esse objeto a partir dos cadastros reais de Grupo e Modificador.
        </div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Grupo &amp; Modificador</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-6"><label className="fsc-label">Grupo</label>
            <select className="fsc-input" value={groupCode} onChange={(e) => setGroupCode(e.target.value)}>
              <option value="">— selecione —</option>
              {grupos.map((g) => <option key={g.code} value={g.code}>{g.code} — {g.description}</option>)}
            </select></div>
          <div className="fsc-field fsc-col-6"><label className="fsc-label">Modificador</label>
            <select className="fsc-input" value={modifierId} onChange={(e) => setModifierId(e.target.value)}>
              <option value="">— selecione —</option>
              {mods.map((m) => <option key={m.id} value={m.id}>{m.id} — {m.description}</option>)}
            </select></div>
        </div></div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Atributos do item ({attrs.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-4"><label className="fsc-label">Nome (ex.: COR)</label><input className="fsc-input" value={attrForm.name} onChange={(e) => setAttrForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-6"><label className="fsc-label">Valor (ex.: PRETO)</label><input className="fsc-input" value={attrForm.value} onChange={(e) => setAttrForm((f) => ({ ...f, value: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={addAttr}>Adicionar</button></div>
        </div>
        {attrs.length > 0 && (
          <table className="fsc-table" style={{ marginTop: 10 }}>
            <thead><tr><th>Nome</th><th>Valor</th><th></th></tr></thead>
            <tbody>{attrs.map((a, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{a.name}</td><td>{a.value}</td><td><button className="fsc-btn fsc-btn-ghost" onClick={() => removeAttr(i)}>Remover</button></td></tr>)}</tbody>
          </table>
        )}
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Pré-visualização</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">cole o objeto `pdm` no cadastro do item</span></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-12"><label className="fsc-label">Descrição técnica composta</label><input className="fsc-input" value={descricao} readOnly /></div>
          <div className="fsc-field fsc-col-12"><label className="fsc-label">Objeto pdm (item)</label>
            <textarea className="fsc-input" style={{ minHeight: 140, fontFamily: "monospace" }} value={JSON.stringify(pdmPayload, null, 2)} readOnly /></div>
          <div className="fsc-field fsc-col-3"><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={copiar}>Copiar pdm</button></div>
        </div></div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Atributos: <strong>{attrs.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
