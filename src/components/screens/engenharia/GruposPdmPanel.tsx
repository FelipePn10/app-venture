import { useState, useCallback, useEffect } from "react";
import { type GrupoPDM, type UsoPDM, listarGrupos, criarGrupo, atualizarGrupo, usoDoPDM } from "@/services/pdmService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { ResponsaveisDoGrupo } from "./ResponsaveisDoGrupo";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

export function GruposPdmPanel({ aoMudar }: { aoMudar: () => void }): JSX.Element {
  const [grupos, setGrupos] = useState<GrupoPDM[]>([]);
  const [form, setForm] = useState({ code: "", description: "", is_active: true });
  const [uso, setUso] = useState<UsoPDM | null>(null);
  const [editing, setEditing] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = () => run(async () => {
    const lista = await listarGrupos();
    setGrupos(lista);
    setUso(await usoDoPDM());
    if (!editing) setForm((f) => ({ ...f, code: String(lista.reduce((max, g) => Math.max(max, g.code), 0) + 1) }));
  });
  useEffect(() => {
    void listarGrupos().then((lista) => {
      setGrupos(lista);
      setForm((f) => ({ ...f, code: String(lista.reduce((max, g) => Math.max(max, g.code), 0) + 1) }));
    }).catch((e) => setFeedback({ type: "error", message: errMessage(e) }));
    void usoDoPDM().then(setUso).catch(() => setUso(null));
  }, []);
  const proximoCodigo = () => String(grupos.reduce((max, g) => Math.max(max, g.code), 0) + 1);
  const limpar = () => { setForm({ code: proximoCodigo(), description: "", is_active: true }); setEditing(false); };
  const selecionar = (g: GrupoPDM) => { setForm({ code: String(g.code), description: g.description, is_active: g.is_active !== false }); setEditing(true); };
  const salvar = () => run(async () => {
    const code = Number(form.code);
    if (!code) { setFeedback({ type: "error", message: "Código do grupo é obrigatório (inteiro)." }); return; }
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    if (editing) { await atualizarGrupo(code, { description: form.description.trim(), is_active: form.is_active }); setFeedback({ type: "success", message: `Grupo ${code} atualizado.` }); aoMudar(); }
    else { await criarGrupo({ code, description: form.description.trim() }); setFeedback({ type: "success", message: `Grupo ${code} criado.` }); aoMudar(); }
    const lista = await listarGrupos();
    setGrupos(lista);
    setForm({ code: String(lista.reduce((max, g) => Math.max(max, g.code), 0) + 1), description: "", is_active: true });
    setEditing(false);
  });

  const filtrados = filtro.trim() ? grupos.filter((g) => String(g.code).includes(filtro) || g.description.toLowerCase().includes(filtro.toLowerCase())) : grupos;

  return (
    <div className="erp-aba-corpo">

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Grupos</span>
          <button className="erp-btn erp-btn-dark" onClick={carregar} disabled={busy}>{busy && <span className="erp-spin" />}Listar</button>
          <button className="erp-btn" onClick={limpar} disabled={busy}>Novo</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Filtrar</span><input className="erp-tinput" style={{ width: 180 }} placeholder="código ou descrição" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VITE0116 — Grupos PDM" filename="vite0116-grupos" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Grupos ({filtrados.length})</span><span className="erp-count">{grupos.length}</span></div>
            <div className="erp-list">
              {filtrados.length === 0 && <div className="erp-list-empty">{grupos.length ? "Nenhum grupo com este filtro." : "Nenhum grupo cadastrado."}</div>}
              {filtrados.map((g) => (
                <div key={g.code} className={`erp-list-row${editing && Number(form.code) === g.code ? " erp-row-sel" : ""}`} onClick={() => selecionar(g)}>
                  <span className="erp-list-code">#{g.code}</span><span className="erp-list-sub">{g.description}{g.is_active === false ? " · inativo" : ""} · {uso?.groups[String(g.code)] ?? 0} item(ns)</span>
                </div>
              ))}
            </div>
          </aside>
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">{editing ? `Editar grupo ${form.code}` : "Novo grupo"}</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset"><div className="erp-fieldset-head">Grupo PDM (o código não muda depois de criado)</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label">Código</label><input className="erp-input num" type="number" min={1} readOnly={editing} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder={proximoCodigo()} disabled={editing} /><span className="erp-field-hint">Deixe vazio para gerar automaticamente na sequência.</span></div>
                <div className="erp-field erp-c7"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
                {editing && <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><label className="erp-check"><input type="checkbox" id="grupo-ativo" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> Ativo</label></div>}
                {editing && !form.is_active && <div className="erp-field erp-c12"><small>Inativo não aparece para item novo. Os {uso?.groups[form.code] ?? 0} item(ns) do grupo seguem como estão.</small></div>}
                <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>{editing ? "Atualizar" : "Criar"}</button></div>
              </div></div>
              {editing && Number(form.code) > 0 && <ResponsaveisDoGrupo grupo={Number(form.code)} />}
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}
