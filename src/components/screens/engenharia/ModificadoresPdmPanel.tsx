import { useState, useCallback, useEffect } from "react";
import { type ModificadorPDM, type UsoPDM, listarModificadores, criarModificador, atualizarModificador, usoDoPDM } from "@/services/pdmService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

export function ModificadoresPdmPanel({ aoMudar }: { aoMudar: () => void }): JSX.Element {
  const [mods, setMods] = useState<ModificadorPDM[]>([]);
  const [form, setForm] = useState({ id: 0, description: "", is_active: true });
  const [uso, setUso] = useState<UsoPDM | null>(null);
  const [editing, setEditing] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = useCallback(() => run(async () => { setMods(await listarModificadores()); setUso(await usoDoPDM()); }), [run]);
  useEffect(() => { void carregar(); }, [carregar]);
  const limpar = () => { setForm({ id: 0, description: "", is_active: true }); setEditing(false); };
  const selecionar = (m: ModificadorPDM) => { setForm({ id: m.id ?? 0, description: m.description, is_active: m.is_active !== false }); setEditing(true); };
  const salvar = () => run(async () => {
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    if (editing) { await atualizarModificador(form.id, form.description.trim(), form.is_active); setFeedback({ type: "success", message: `Modificador ${form.id} atualizado.` }); aoMudar(); }
    else { const m = await criarModificador(form.description.trim()); setFeedback({ type: "success", message: `Modificador ${m.id ?? ""} criado.` }); aoMudar(); }
    setMods(await listarModificadores()); limpar();
  });

  const filtrados = filtro.trim() ? mods.filter((m) => String(m.id).includes(filtro) || m.description.toLowerCase().includes(filtro.toLowerCase())) : mods;

  return (
    <div className="erp-aba-corpo">

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Modificadores</span>
          <button className="erp-btn erp-btn-dark" onClick={carregar} disabled={busy}>{busy && <span className="erp-spin" />}Listar</button>
          <button className="erp-btn" onClick={limpar} disabled={busy}>Novo</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Filtrar</span><input className="erp-tinput" style={{ width: 180 }} placeholder="código ou descrição" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VITE0116 — Modificadores PDM" filename="vite0116-modificadores" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Modificadores ({filtrados.length})</span><span className="erp-count">{mods.length}</span></div>
            <div className="erp-list">
              {filtrados.length === 0 && <div className="erp-list-empty">{mods.length ? "Nenhum modificador com este filtro." : "Nenhum modificador cadastrado."}</div>}
              {filtrados.map((m) => (
                <div key={m.id} className={`erp-list-row${editing && form.id === m.id ? " erp-row-sel" : ""}`} onClick={() => selecionar(m)}>
                  <span className="erp-list-code">#{m.id}</span><span className="erp-list-sub">{m.description}{m.is_active === false ? " · inativo" : ""} · {uso?.modifiers[String(m.id)] ?? 0} item(ns)</span>
                </div>
              ))}
            </div>
          </aside>
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">{editing ? `Editar modificador ${form.id}` : "Novo modificador"}</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset"><div className="erp-fieldset-head">Modificador (código gerado pelo sistema; grupos e atributos em VITE0116)</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label">Código</label><input className="erp-input num" value={editing ? form.id : "Automático"} disabled /></div>
                <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>{editing && <label className="erp-check"><input type="checkbox" id="modificador-ativo" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> Ativo</label>}</div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>{editing ? "Atualizar" : "Criar"}</button></div>
              </div></div>
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}
