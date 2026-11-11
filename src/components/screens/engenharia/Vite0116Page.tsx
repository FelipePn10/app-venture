import { GruposPdmPanel } from "./GruposPdmPanel";
import { ModificadoresPdmPanel } from "./ModificadoresPdmPanel";
import { useCallback, useEffect, useState } from "react";
import {
  type AtributoPDM, type GrupoPDM, type ModeloPDM, type ModificadorPDM, type PreviaPDM, type TipoAtributoPDM,
  inativarAtributoPDM, listarGrupos, listarModificadores, modificadoresDoGrupo, obterModeloPDM, previaDaDescricaoPDM,
  salvarAbreviacaoDoModificador, salvarAtributoPDM, salvarModificadoresDoGrupo,
} from "@/services/pdmService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const TIPOS: { value: TipoAtributoPDM; label: string }[] = [
  { value: "TEXTO", label: "Texto" }, { value: "NUMERO", label: "Número" }, { value: "LISTA", label: "Lista de valores" },
];

const atributoVazio = (group: number, modifier: number, position: number): AtributoPDM => ({
  group_code: group, modifier_id: modifier, name: "", position, value_type: "TEXTO", unit: "", prefix: "", decimal_places: 0,
  is_required: false, in_description: true, in_signature: true, is_active: true, values: [],
});

/**
 * VITE0116 — Padrão descritivo (PDM). Cada grupo diz quais modificadores aceita e
 * cada par grupo+modificador tem o seu modelo de atributos. A VENT0200 pede esses
 * atributos e gera a descrição técnica: dois cadastradores escrevem o mesmo item
 * do mesmo jeito, e o duplicado aparece pela combinação de atributos.
 */
export function Vite0116Page(): JSX.Element {
  const [grupos, setGrupos] = useState<GrupoPDM[]>([]);
  const [mods, setMods] = useState<ModificadorPDM[]>([]);
  const [grupo, setGrupo] = useState("");
  const [vinculados, setVinculados] = useState<number[]>([]);
  const [modificador, setModificador] = useState("");
  const [modelo, setModelo] = useState<ModeloPDM | null>(null);
  const [abreviacao, setAbreviacao] = useState("");
  const [edicao, setEdicao] = useState<AtributoPDM | null>(null);
  const [valoresTexto, setValoresTexto] = useState("");
  const [teste, setTeste] = useState<Record<string, string>>({});
  const [previa, setPrevia] = useState<PreviaPDM | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  // Cadastros de apoio (eram VITE0114 e VITE0115): grupos e modificadores.
  const [apoio, setApoio] = useState<"grupos" | "modificadores" | null>(null);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const recarregarCadastros = useCallback(() => run(async () => { const [g, m] = await Promise.all([listarGrupos(), listarModificadores()]); setGrupos(g); setMods(m); }), [run]);
  useEffect(() => { void recarregarCadastros(); }, [recarregarCadastros]);
  useEffect(() => {
    setVinculados([]); setModificador("");
    if (grupo) void run(async () => setVinculados(await modificadoresDoGrupo(Number(grupo))));
  }, [grupo, run]);

  const recarregarModelo = useCallback(async () => {
    if (!grupo || !modificador) { setModelo(null); return; }
    const m = await obterModeloPDM(Number(grupo), Number(modificador));
    setModelo(m); setAbreviacao(m.modifier_abbreviation ?? "");
  }, [grupo, modificador]);
  useEffect(() => { setEdicao(null); setTeste({}); setPrevia(null); void run(recarregarModelo); }, [recarregarModelo, run]);

  useEffect(() => {
    if (!modelo || !modelo.attributes.some((a) => a.is_active)) { setPrevia(null); return; }
    let vivo = true;
    const t = setTimeout(() => {
      previaDaDescricaoPDM({ group_code: modelo.group_code, modifier_id: modelo.modifier_id, attributes: Object.entries(teste).filter(([, v]) => v.trim()).map(([name, value]) => ({ name, value })) })
        .then((p) => { if (vivo) setPrevia(p); }).catch(() => { if (vivo) setPrevia(null); });
    }, 300);
    return () => { vivo = false; clearTimeout(t); };
  }, [modelo, teste]);

  const salvarVinculos = () => run(async () => {
    setVinculados(await salvarModificadoresDoGrupo(Number(grupo), vinculados));
    setFeedback({ type: "success", message: vinculados.length ? "Modificadores do grupo gravados." : "Grupo sem vínculo: aceita todos os modificadores." });
  });
  const editar = (a: AtributoPDM) => { setEdicao({ ...a }); setValoresTexto(a.values.filter((v) => v.is_active).map((v) => (v.abbreviation ? `${v.value}=${v.abbreviation}` : v.value)).join("\n")); };
  const novo = () => { if (modelo) { editar(atributoVazio(modelo.group_code, modelo.modifier_id, modelo.attributes.length)); } };
  const salvarAtributo = () => run(async () => {
    if (!edicao) return;
    const values = edicao.value_type !== "LISTA" ? [] : valoresTexto.split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => {
      const [value, abbreviation] = l.split("=").map((p) => p.trim());
      return { value, abbreviation: abbreviation || null, position: i, is_active: true };
    });
    await salvarAtributoPDM({ ...edicao, unit: edicao.unit?.trim() || null, prefix: edicao.prefix?.trim() || null, values });
    setEdicao(null); await recarregarModelo();
    setFeedback({ type: "success", message: "Atributo gravado." });
  });
  const inativar = (a: AtributoPDM) => run(async () => { await inativarAtributoPDM(a.id ?? 0); await recarregarModelo(); setFeedback({ type: "success", message: `Atributo ${a.name} inativado.` }); });
  const ativos = modelo?.attributes.filter((a) => a.is_active) ?? [];

  const cabecalho = (
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Padrão Descritivo (PDM)</span><span className="erp-crumb-code">VITE0116</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{ativos.length} atributo(s)</span>
      </header>
  );
  if (apoio) return (
    <div className="erp-screen">
      {cabecalho}
      <div className="erp-tabs">
        <button className={`erp-tab${apoio === "grupos" ? " active" : ""}`} onClick={() => setApoio("grupos")}>Grupos</button>
        <button className={`erp-tab${apoio === "modificadores" ? " active" : ""}`} onClick={() => setApoio("modificadores")}>Modificadores</button>
        <button className="erp-tab" onClick={() => setApoio(null)}>← Voltar ao padrão descritivo</button>
      </div>
      {apoio === "grupos" ? <GruposPdmPanel aoMudar={() => void recarregarCadastros()} /> : <ModificadoresPdmPanel aoMudar={() => void recarregarCadastros()} />}
      <footer className="erp-statusbar"><div className="erp-status-spacer" /><span className="erp-status-brand">VentureERP</span></footer>
    </div>
  );

  return (
    <div className="erp-screen">
      {cabecalho}
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Cadastros</span><button className="erp-btn" onClick={() => setApoio("grupos")}>Grupos e modificadores</button></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VITE0116 — Padrão descritivo" filename="vite0116" /></div>
      </div>
      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-detail-body">
          <div className="erp-fieldset"><div className="erp-fieldset-head">Grupo e modificadores</div><div className="erp-fieldset-body">
            <div className="erp-field erp-c6"><label className="erp-label erp-req">Grupo</label>
              <select className="erp-input" id="pdm-grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)}><option value="">— selecione —</option>{grupos.map((g) => <option key={g.code} value={g.code}>{g.code} — {g.description}</option>)}</select></div>
            {grupo && (<>
              <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 14, flexWrap: "wrap" }}>
                {mods.map((m) => (
                  <label key={m.id} className="erp-check"><input type="checkbox" checked={vinculados.includes(m.id ?? 0)} onChange={(e) => setVinculados((v) => (e.target.checked ? [...v, m.id ?? 0] : v.filter((x) => x !== m.id)))} /> {m.description}</label>
                ))}
              </div>
              <div className="erp-field erp-c12" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><button className="erp-btn erp-btn-primary" id="pdm-salvar-vinculos" disabled={busy} onClick={() => void salvarVinculos()}>Gravar modificadores do grupo</button>{" "}<small>Sem nenhum marcado, o grupo aceita todos.</small></div>
            </>)}
          </div></div>

          {grupo && (
            <div className="erp-fieldset"><div className="erp-fieldset-head">Modelo de atributos</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c6"><label className="erp-label erp-req">Modificador</label>
                <select className="erp-input" id="pdm-modificador" value={modificador} onChange={(e) => setModificador(e.target.value)}><option value="">— selecione —</option>{mods.filter((m) => vinculados.length === 0 || vinculados.includes(m.id ?? 0)).map((m) => <option key={m.id} value={m.id}>{m.description}</option>)}</select></div>
              {modelo && (<>
                <div className="erp-field erp-c3"><label className="erp-label">Abreviação na descrição</label><input className="erp-input" maxLength={20} value={abreviacao} onChange={(e) => setAbreviacao(e.target.value)} placeholder={modelo.modifier_description} /></div>
                <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn" disabled={busy} onClick={() => void run(async () => { await salvarAbreviacaoDoModificador(modelo.modifier_id, abreviacao); await recarregarModelo(); setFeedback({ type: "success", message: "Abreviação gravada." }); })}>Gravar abreviação</button></div>
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid" id="pdm-atributos">
                    <thead><tr><th>Ordem</th><th>Atributo</th><th>Tipo</th><th>Formato</th><th>Obrigatório</th><th>Na descrição</th><th>Identifica</th><th /></tr></thead>
                    <tbody>
                      {ativos.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Sem atributos: a descrição do item segue livre.</td></tr>}
                      {ativos.map((a) => (
                        <tr key={a.id}><td>{a.position}</td><td><strong>{a.name}</strong></td><td>{TIPOS.find((t) => t.value === a.value_type)?.label}</td>
                          <td>{[a.prefix, a.value_type === "LISTA" ? `${a.values.filter((v) => v.is_active).length} valores` : "valor", a.unit].filter(Boolean).join(" ")}</td>
                          <td>{a.is_required ? "Sim" : "Não"}</td><td>{a.in_description ? "Sim" : "Não"}</td><td>{a.in_signature ? "Sim" : "Não"}</td>
                          <td style={{ whiteSpace: "nowrap" }}><button className="erp-btn erp-btn-sm" onClick={() => editar(a)}>Editar</button>{" "}<button className="erp-btn erp-btn-danger erp-btn-sm" disabled={busy} onClick={() => void inativar(a)}>Inativar</button></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn" id="pdm-novo-atributo" disabled={busy} onClick={novo}>Novo atributo</button></div>
              </>)}
            </div></div>
          )}

          {edicao && (
            <div className="erp-fieldset"><div className="erp-fieldset-head">{edicao.id ? `Editar ${edicao.name}` : "Novo atributo"}</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c4"><label className="erp-label erp-req">Nome</label><input className="erp-input" id="pdm-atributo-nome" maxLength={60} value={edicao.name} onChange={(e) => setEdicao({ ...edicao, name: e.target.value })} placeholder="Ex.: DIÂMETRO" /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Ordem</label><input className="erp-input" type="number" value={edicao.position} onChange={(e) => setEdicao({ ...edicao, position: Number(e.target.value) })} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Tipo</label><select className="erp-input" value={edicao.value_type} onChange={(e) => setEdicao({ ...edicao, value_type: e.target.value as TipoAtributoPDM })}>{TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              {edicao.value_type === "NUMERO" && <div className="erp-field erp-c3"><label className="erp-label">Casas decimais</label><input className="erp-input" type="number" min={0} max={6} value={edicao.decimal_places} onChange={(e) => setEdicao({ ...edicao, decimal_places: Number(e.target.value) })} /></div>}
              <div className="erp-field erp-c3"><label className="erp-label">Prefixo</label><input className="erp-input" maxLength={12} value={edicao.prefix ?? ""} onChange={(e) => setEdicao({ ...edicao, prefix: e.target.value })} placeholder="Ex.: M" /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Unidade</label><input className="erp-input" maxLength={12} value={edicao.unit ?? ""} onChange={(e) => setEdicao({ ...edicao, unit: e.target.value })} placeholder="Ex.: MM" /></div>
              {edicao.value_type === "LISTA" && <div className="erp-field erp-c12"><label className="erp-label erp-req">Valores</label><textarea className="erp-input erp-textarea" id="pdm-atributo-valores" rows={4} value={valoresTexto} onChange={(e) => setValoresTexto(e.target.value)} placeholder={"Um por linha. Para abreviar: ZINCADO BRANCO=ZB"} /></div>}
              <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
                <label className="erp-check"><input type="checkbox" checked={edicao.is_required} onChange={(e) => setEdicao({ ...edicao, is_required: e.target.checked })} /> Obrigatório</label>
                <label className="erp-check"><input type="checkbox" checked={edicao.in_description} onChange={(e) => setEdicao({ ...edicao, in_description: e.target.checked })} /> Entra na descrição</label>
                <label className="erp-check" title="Dois itens com os mesmos valores destes atributos são apontados como duplicados."><input type="checkbox" checked={edicao.in_signature} onChange={(e) => setEdicao({ ...edicao, in_signature: e.target.checked })} /> Identifica o item</label>
              </div>
              <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}><button className="erp-btn erp-btn-primary" id="pdm-salvar-atributo" disabled={busy} onClick={() => void salvarAtributo()}>Gravar atributo</button>{" "}<button className="erp-btn" onClick={() => setEdicao(null)}>Cancelar</button></div>
            </div></div>
          )}

          {modelo && ativos.length > 0 && (
            <div className="erp-fieldset"><div className="erp-fieldset-head">Testar o padrão</div><div className="erp-fieldset-body">
              {ativos.map((a) => (
                <div key={a.id} className="erp-field erp-c3"><label className={`erp-label${a.is_required ? " erp-req" : ""}`}>{a.name}</label>
                  {a.value_type === "LISTA"
                    ? <select className="erp-input" value={teste[a.name] ?? ""} onChange={(e) => setTeste((t) => ({ ...t, [a.name]: e.target.value }))}><option value="">—</option>{a.values.filter((v) => v.is_active).map((v) => <option key={v.value}>{v.value}</option>)}</select>
                    : <input className="erp-input" value={teste[a.name] ?? ""} onChange={(e) => setTeste((t) => ({ ...t, [a.name]: e.target.value }))} />}
                </div>
              ))}
              <div className="erp-field erp-c12"><label className="erp-label">Descrição técnica gerada</label><input className="erp-input" id="pdm-previa" readOnly value={previa?.description ?? ""} />
                {previa && previa.errors.length > 0 && <span className="erp-field-hint">{previa.errors.join("; ")}.</span>}
                {previa?.exceeds_invoice_limit && <span className="erp-field-hint">Passa dos 120 caracteres da NF-e.</span>}
              </div>
            </div></div>
          )}
        </div>
      </div>
      <footer className="erp-statusbar"><div className="erp-status-item">Atributos ativos: <strong>{ativos.length}</strong></div><div className="erp-status-spacer" /></footer>
    </div>
  );
}
