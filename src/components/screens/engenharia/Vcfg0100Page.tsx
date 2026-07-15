import { useState, useCallback } from "react";
import {
  type CfgSet, type CfgVariable, type CfgCharacteristic, type CfgMaskAnswer, CHAR_TYPES,
  listSets, createSet, deleteSet, listSetVariables, createVariable, deleteVariable,
  listCharacteristics, createCharacteristic, deleteCharacteristic,
  listItemCharacteristics, addItemCharacteristic, generateMask,
} from "@/services/configuratorCfgService";
import { errMessage, parseStr, parseNum, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "conjuntos" | "caracteristicas" | "item";

export function Vcfg0100Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("conjuntos");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  // conjuntos & variáveis
  const [sets, setSets] = useState<CfgSet[]>([]);
  const [selSet, setSelSet] = useState<CfgSet | null>(null);
  const [vars, setVars] = useState<CfgVariable[]>([]);
  const [newSet, setNewSet] = useState("");
  const [varForm, setVarForm] = useState({ code: "", description: "", mask_composition: "" });
  // características
  const [chars, setChars] = useState<CfgCharacteristic[]>([]);
  const [charForm, setCharForm] = useState<CfgCharacteristic>({ code: "", description: "", type: "ESCOLHA", is_required: true });
  // item & máscara
  const [item, setItem] = useState("");
  const [itemChars, setItemChars] = useState<Obj[]>([]);
  const [answers, setAnswers] = useState<CfgMaskAnswer[]>([]);
  const [ansForm, setAnsForm] = useState({ characteristic_id: "", variable_id: "", value: "" });
  const [maskResult, setMaskResult] = useState<Obj | null>(null);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  // conjuntos
  const carSets = () => run(async () => { setSets(await listSets()); });
  const crSet = () => run(async () => { if (!newSet.trim()) return; await createSet(newSet.trim()); setNewSet(""); setSets(await listSets()); });
  const abrirSet = (s: CfgSet) => { setSelSet(s); void run(async () => { setVars(await listSetVariables(s.id!)); }); };
  const crVar = () => run(async () => { if (!selSet?.id || !varForm.code.trim()) { setFeedback({ type: "error", message: "Selecione o conjunto e informe o código." }); return; } await createVariable(selSet.id, varForm); setVarForm({ code: "", description: "", mask_composition: "" }); setVars(await listSetVariables(selSet.id)); });
  // características
  const carChars = () => run(async () => { setChars(await listCharacteristics()); });
  const crChar = () => run(async () => { if (!charForm.code.trim() || !charForm.description.trim()) { setFeedback({ type: "error", message: "Código e descrição obrigatórios." }); return; } await createCharacteristic(charForm); setCharForm({ code: "", description: "", type: "ESCOLHA", is_required: true }); setChars(await listCharacteristics()); setFeedback({ type: "success", message: "Característica criada." }); });
  // item
  const carItemChars = () => run(async () => { const it = Number(item); if (!it) { setFeedback({ type: "error", message: "Informe o item." }); return; } setItemChars(await listItemCharacteristics(it)); });
  const addItemChar = (charId: number) => run(async () => { const it = Number(item); if (!it) return; await addItemCharacteristic(it, charId, (itemChars.length + 1) * 10); setItemChars(await listItemCharacteristics(it)); });
  const addAns = () => { const cid = Number(ansForm.characteristic_id); if (!cid) return; setAnswers((a) => [...a, { characteristic_id: cid, variable_id: Number(ansForm.variable_id) || undefined, value: ansForm.value || undefined }]); setAnsForm({ characteristic_id: "", variable_id: "", value: "" }); };
  const gerar = (persist: boolean) => run(async () => { const it = Number(item); if (!it) { setFeedback({ type: "error", message: "Informe o item." }); return; } setMaskResult(await generateMask(it, answers, persist)); setFeedback({ type: "success", message: persist ? "Máscara gerada e persistida." : "Máscara gerada (prévia)." }); });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Configurador de Produto</span><span className="erp-crumb-code">VCFG0100</span>
        </nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">conjuntos · variáveis · características · máscara</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className={`erp-btn ${tab === "conjuntos" ? "erp-btn-primary" : ""}`} onClick={() => setTab("conjuntos")}>Conjuntos &amp; Variáveis</button>
          <button className={`erp-btn ${tab === "caracteristicas" ? "erp-btn-primary" : ""}`} onClick={() => setTab("caracteristicas")}>Características</button>
          <button className={`erp-btn ${tab === "item" ? "erp-btn-primary" : ""}`} onClick={() => setTab("item")}>Item &amp; Máscara</button>
        </div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VCFG0100 — Configurador de Produto" filename="vcfg0100" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        {tab === "conjuntos" && (
          <div className="erp-main">
            <aside className="erp-list-panel">
              <div className="erp-panel-head"><span className="erp-panel-title">Conjuntos</span><span className="erp-count">{sets.length}</span></div>
              <div style={{ display: "flex", gap: 6, padding: 8 }}>
                <input className="erp-input" placeholder="novo conjunto" value={newSet} onChange={(e) => setNewSet(e.target.value)} />
                <button className="erp-btn erp-btn-primary erp-btn-sm" onClick={crSet} disabled={busy}>+</button>
                <button className="erp-btn erp-btn-sm" onClick={carSets} disabled={busy}>⟳</button>
              </div>
              <div className="erp-list">
                {sets.map((s) => (
                  <div key={s.id} className={`erp-list-row${selSet?.id === s.id ? " erp-row-sel" : ""}`} onClick={() => abrirSet(s)}>
                    <span className="erp-list-code">#{s.id}</span><span className="erp-list-sub">{s.description}</span>
                    <div className="erp-list-meta"><button className="erp-btn erp-btn-danger erp-btn-sm" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); void run(async () => { await deleteSet(s.id!); setSets(await listSets()); }); }}>×</button></div>
                  </div>
                ))}
              </div>
            </aside>
            <section className="erp-detail-panel">
              <div className="erp-tabs"><button className="erp-tab active">Variáveis {selSet ? `do conjunto ${selSet.description}` : ""}</button></div>
              <div className="erp-detail-body">
                <div className="erp-fieldset"><div className="erp-fieldset-head">Nova variável</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Código</label><input className="erp-input" value={varForm.code} onChange={(e) => setVarForm((f) => ({ ...f, code: e.target.value }))} /></div>
                  <div className="erp-field erp-c5"><label className="erp-label">Descrição</label><input className="erp-input" value={varForm.description} onChange={(e) => setVarForm((f) => ({ ...f, description: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Máscara</label><input className="erp-input" value={varForm.mask_composition} onChange={(e) => setVarForm((f) => ({ ...f, mask_composition: e.target.value }))} /></div>
                  <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={crVar} disabled={busy || !selSet}>Criar</button></div>
                  <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>#</th><th>Código</th><th>Descrição</th><th>Máscara</th><th></th></tr></thead>
                    <tbody>{vars.length === 0 ? <tr><td colSpan={5} className="erp-grid-empty">selecione um conjunto</td></tr> : vars.map((v) => <tr key={v.id}><td>#{v.id}</td><td>{v.code}</td><td>{v.description}</td><td>{v.mask_composition || "—"}</td><td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => void run(async () => { await deleteVariable(v.id!); setVars(await listSetVariables(selSet!.id!)); })}>×</button></td></tr>)}</tbody>
                  </table></div>
                </div></div>
              </div>
            </section>
          </div>
        )}

        {tab === "caracteristicas" && (
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Características <button className="erp-btn erp-btn-sm" style={{ marginLeft: 8 }} onClick={carChars} disabled={busy}>Carregar</button></button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset"><div className="erp-fieldset-head">Nova característica</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input" value={charForm.code} onChange={(e) => setCharForm((f) => ({ ...f, code: e.target.value }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Descrição (pergunta)</label><input className="erp-input" value={charForm.description} onChange={(e) => setCharForm((f) => ({ ...f, description: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Tipo</label><select className="erp-input" value={charForm.type} onChange={(e) => setCharForm((f) => ({ ...f, type: e.target.value }))}>{CHAR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                <div className="erp-field erp-c1"><label className="erp-label">Conjunto</label><input className="erp-input num" type="number" value={charForm.set_id ?? ""} onChange={(e) => setCharForm((f) => ({ ...f, set_id: Number(e.target.value) || undefined }))} /></div>
                <div className="erp-field erp-c2" style={{ alignSelf: "flex-end" }}><label className="erp-check"><input type="checkbox" checked={!!charForm.affects_price} onChange={(e) => setCharForm((f) => ({ ...f, affects_price: e.target.checked }))} /> Afeta preço</label></div>
                <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={crChar} disabled={busy}>Criar característica</button></div>
                <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>#</th><th>Código</th><th>Descrição</th><th>Tipo</th><th>Conjunto</th><th></th></tr></thead>
                  <tbody>{chars.length === 0 ? <tr><td colSpan={6} className="erp-grid-empty">clique em Carregar</td></tr> : chars.map((c) => <tr key={c.id}><td>#{c.id}</td><td>{c.code}</td><td>{c.description}</td><td>{c.type}</td><td>{c.set_id ?? "—"}</td><td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => void run(async () => { await deleteCharacteristic(c.id!); setChars(await listCharacteristics()); })}>×</button></td></tr>)}</tbody>
                </table></div>
              </div></div>
            </div>
          </section>
        )}

        {tab === "item" && (
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Item &amp; máscara</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset"><div className="erp-fieldset-head">Características do item</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={item} onChange={(e) => setItem(e.target.value)} /></div>
                <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }}><button className="erp-btn erp-btn-dark" onClick={carItemChars} disabled={busy}>Carregar características</button></div>
                <div className="erp-field erp-c3"><label className="erp-label">Vincular característica (id)</label><div style={{ display: "flex", gap: 6 }}><input className="erp-input num" type="number" value={ansForm.characteristic_id} onChange={(e) => setAnsForm((f) => ({ ...f, characteristic_id: e.target.value }))} /><button className="erp-btn erp-btn-sm" onClick={() => addItemChar(Number(ansForm.characteristic_id))} disabled={busy}>+ vincular</button></div></div>
                <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>Seq</th><th>Característica</th><th>Default</th></tr></thead>
                  <tbody>{itemChars.length === 0 ? <tr><td colSpan={3} className="erp-grid-empty">informe o item e carregue</td></tr> : itemChars.map((c, i) => <tr key={i}><td>{parseNum(c, "sequence", "Sequence")}</td><td>{parseNum(c, "characteristic_id", "CharacteristicID")}</td><td>{parseStr(c, "description", "Description") || "—"}</td></tr>)}</tbody>
                </table></div>
              </div></div>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Gerar máscara (respostas)</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label">Característica (id)</label><input className="erp-input num" type="number" value={ansForm.characteristic_id} onChange={(e) => setAnsForm((f) => ({ ...f, characteristic_id: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Variável (id)</label><input className="erp-input num" type="number" value={ansForm.variable_id} onChange={(e) => setAnsForm((f) => ({ ...f, variable_id: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Valor (livre)</label><input className="erp-input" value={ansForm.value} onChange={(e) => setAnsForm((f) => ({ ...f, value: e.target.value }))} /></div>
                <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={addAns}>+ resposta</button></div>
                <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>Característica</th><th>Variável</th><th>Valor</th></tr></thead>
                  <tbody>{answers.length === 0 ? <tr><td colSpan={3} className="erp-grid-empty">sem respostas</td></tr> : answers.map((a, i) => <tr key={i}><td>{a.characteristic_id}</td><td>{a.variable_id ?? "—"}</td><td>{a.value ?? "—"}</td></tr>)}</tbody>
                </table></div>
                <div className="erp-field erp-c6" style={{ gap: 8 }}><button className="erp-btn" onClick={() => gerar(false)} disabled={busy}>Gerar (prévia)</button><button className="erp-btn erp-btn-primary" onClick={() => gerar(true)} disabled={busy}>Gerar &amp; persistir</button></div>
                {maskResult && <div className="erp-field erp-c12"><pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>{JSON.stringify(maskResult, null, 2)}</pre></div>}
              </div></div>
            </div>
          </section>
        )}
      </div>

      <footer className="erp-statusbar"><div className="erp-status-item">Conjuntos: <strong>{sets.length}</strong></div><div className="erp-status-item">Características: <strong>{chars.length}</strong></div><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}
