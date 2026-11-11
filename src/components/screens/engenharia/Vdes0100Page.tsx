import { useState, useCallback, useEffect, useMemo } from "react";
import { SelectUnidade } from "@/components/ui/SelectUnidade";
import { LookupField } from "@/components/ui/LookupField";
import { confirmar } from "@/components/ui/dialogos";
import { ExportButton } from "@/components/ui/ExportButton";
import {
  type Drawing, type DrawingRevision, type DrawingDistribution, type DrawingCharacteristicLink,
  OPERADORES_CARACTERISTICA,
  listDrawings, getDrawing, createDrawing, updateDrawing, deleteDrawing,
  listRevisions, addRevision, updateRevision, deleteRevision, addDistribution, deleteDistribution,
  listDrawingCharacteristics, addDrawingCharacteristic, deleteDrawingCharacteristic,
  getItemDrawingCode, saveItemDrawingCode, getDrawingParameters, saveDrawingParameters,
} from "@/services/drawingsService";
import { type CfgCharacteristic, type CfgVariable, listCharacteristics, listSetVariables } from "@/services/configuratorCfgService";
import { loadCharacteristics, loadItems } from "@/services/lookups";
import { errMessage } from "@/services/fiscalShared";
import { hojeLocal } from "@/utils/dataLocal";

/*
 * VDES0100 — Desenhos Técnicos.
 *
 * Tela única do desenho: cadastro, revisões com vigência e aprovação, cópias
 * controladas (distribuição), características do configurador que escolhem o
 * desenho, código de desenho por item e o parâmetro de replicação da revisão.
 * Substitui a VENG0400, que fazia o mesmo pedindo o id interno de cada registro.
 */

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "desenho" | "revisoes" | "caracteristicas" | "item";

const NOVO: Drawing = { code: "", digit: "", format: "", model: "", description: "", uom: "", material_spec: "", item_code: undefined, creation_date: "" };
const NOVA_REV = (): DrawingRevision => ({ revision: "", start_date: hojeLocal(), end_date: "", reason: "", approved_by: "", approval_date: "", material_spec: "", is_current: true });
const NOVA_DIST = (): DrawingDistribution => ({ recipient: "", distributed_at: hojeLocal(), notes: "" });
const NOVO_VINCULO: DrawingCharacteristicLink = { characteristic_id: 0, operator: "EQUAL", variable_id: undefined };
const rotuloOperador = (op: string) => OPERADORES_CARACTERISTICA.find((o) => o.value === op)?.label ?? op;
const data = (d?: string) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");

export function Vdes0100Page(): JSX.Element {
  const [lista, setLista] = useState<Drawing[]>([]);
  const [busca, setBusca] = useState("");
  const [inativos, setInativos] = useState(false);
  const [sel, setSel] = useState<Drawing | null>(null);
  const [form, setForm] = useState<Drawing>({ ...NOVO });
  const [aba, setAba] = useState<Aba>("desenho");
  const [revs, setRevs] = useState<DrawingRevision[]>([]);
  const [revForm, setRevForm] = useState<DrawingRevision>(NOVA_REV());
  const [revEdit, setRevEdit] = useState<number | null>(null);
  const [distRev, setDistRev] = useState<number | null>(null);
  const [distForm, setDistForm] = useState<DrawingDistribution>(NOVA_DIST());
  const [vinculos, setVinculos] = useState<DrawingCharacteristicLink[]>([]);
  const [vinculo, setVinculo] = useState<DrawingCharacteristicLink>({ ...NOVO_VINCULO });
  const [caracteristicas, setCaracteristicas] = useState<CfgCharacteristic[]>([]);
  const [respostas, setRespostas] = useState<Record<number, CfgVariable[]>>({});
  const [itemCod, setItemCod] = useState({ item: "", mask: "", codigo: "", carregado: false });
  const [replicar, setReplicar] = useState<boolean | null>(null);
  const [verParametros, setVerParametros] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  const setF = <K extends keyof Drawing>(k: K, v: Drawing[K]) => setForm((p) => ({ ...p, [k]: v }));

  const recarregarLista = useCallback(async () => {
    setLista(await listDrawings({ only_active: inativos ? undefined : "true", q: busca.trim() || undefined }));
  }, [busca, inativos]);
  useEffect(() => { void run(recarregarLista); }, [run, recarregarLista]);

  /** Respostas do conjunto da característica, para escolher pelo nome e não pelo id. */
  const respostasDe = useCallback(async (charId: number, todas: CfgCharacteristic[]) => {
    const setId = todas.find((c) => c.id === charId)?.set_id;
    if (!setId || respostas[setId]) return;
    const vars = await listSetVariables(setId);
    setRespostas((r) => ({ ...r, [setId]: vars }));
  }, [respostas]);
  const respostasDaCaracteristica = (charId: number) => respostas[caracteristicas.find((c) => c.id === charId)?.set_id ?? -1] ?? [];

  const abrir = (id?: number) => {
    if (!id) return;
    void run(async () => {
      const [d, rs, vs, cs] = await Promise.all([getDrawing(id), listRevisions(id), listDrawingCharacteristics(id), caracteristicas.length ? Promise.resolve(caracteristicas) : listCharacteristics()]);
      setSel(d); setForm({ ...NOVO, ...d }); setRevs(rs); setVinculos(vs); setCaracteristicas(cs);
      setRevEdit(null); setRevForm(NOVA_REV()); setDistRev(null); setVinculo({ ...NOVO_VINCULO });
      setItemCod({ item: d.item_code ?? "", mask: "", codigo: "", carregado: false });
      for (const charId of new Set(vs.map((v) => v.characteristic_id))) await respostasDe(charId, cs);
    });
  };
  const novo = () => { setSel(null); setForm({ ...NOVO }); setRevs([]); setVinculos([]); setAba("desenho"); };

  const salvar = () => run(async () => {
    if (!form.code.trim() || !form.description.trim()) { setFeedback({ type: "error", message: "Informe o código e a descrição do desenho." }); return; }
    const d = sel?.id ? await updateDrawing(sel.id, form) : await createDrawing(form);
    await recarregarLista();
    setSel(d); setForm({ ...NOVO, ...d });
    setFeedback({ type: "success", message: sel?.id ? `Desenho ${d.code} atualizado.` : `Desenho ${d.code} criado. Cadastre a primeira revisão na aba Revisões.` });
  });
  const desativar = async (d: Drawing) => {
    if (!d.id || !(await confirmar({ titulo: "Desativar desenho", mensagem: "O desenho sai das listas de escolha. Revisões e vínculos ficam guardados.", assunto: `${d.code}${d.digit ? `-${d.digit}` : ""} — ${d.description}`, rotulo: "Desativar" }))) return;
    void run(async () => { await deleteDrawing(d.id!); await recarregarLista(); if (sel?.id === d.id) novo(); setFeedback({ type: "success", message: `Desenho ${d.code} desativado.` }); });
  };

  const salvarRev = () => {
    if (!sel?.id) return;
    void run(async () => {
      if (!revForm.revision.trim()) { setFeedback({ type: "error", message: "Informe a revisão (ex.: A, 01)." }); return; }
      if (revEdit) await updateRevision(revEdit, revForm); else await addRevision(sel.id!, revForm);
      setRevs(await listRevisions(sel.id!)); setRevForm(NOVA_REV()); setRevEdit(null);
      setFeedback({ type: "success", message: revEdit ? "Revisão atualizada." : "Revisão cadastrada." });
    });
  };
  const excluirRev = async (r: DrawingRevision) => {
    if (!r.id || !sel?.id || !(await confirmar({ titulo: "Excluir revisão", mensagem: "A revisão e as cópias distribuídas dela são apagadas.", assunto: `${sel.code} — revisão ${r.revision}`, rotulo: "Excluir" }))) return;
    void run(async () => { await deleteRevision(r.id!); setRevs(await listRevisions(sel.id!)); if (revEdit === r.id) { setRevEdit(null); setRevForm(NOVA_REV()); } setFeedback({ type: "success", message: `Revisão ${r.revision} excluída.` }); });
  };
  const distribuir = () => {
    if (!distRev || !sel?.id) return;
    void run(async () => {
      if (!distForm.recipient.trim()) { setFeedback({ type: "error", message: "Informe quem recebeu a cópia (setor ou pessoa)." }); return; }
      await addDistribution(distRev, distForm); setRevs(await listRevisions(sel.id!)); setDistForm(NOVA_DIST());
      setFeedback({ type: "success", message: "Cópia controlada registrada." });
    });
  };
  const excluirDist = (id?: number) => {
    if (!id || !sel?.id) return;
    void run(async () => { await deleteDistribution(id); setRevs(await listRevisions(sel.id!)); });
  };

  const vincular = () => {
    if (!sel?.id) return;
    void run(async () => {
      if (!vinculo.characteristic_id) { setFeedback({ type: "error", message: "Escolha a característica." }); return; }
      await addDrawingCharacteristic(sel.id!, vinculo); setVinculos(await listDrawingCharacteristics(sel.id!)); setVinculo({ ...NOVO_VINCULO });
      setFeedback({ type: "success", message: "Característica vinculada ao desenho." });
    });
  };
  const desvincular = (id?: number) => {
    if (!id || !sel?.id) return;
    void run(async () => { await deleteDrawingCharacteristic(id); setVinculos(await listDrawingCharacteristics(sel.id!)); });
  };

  const consultarItem = () => run(async () => {
    if (!itemCod.item) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    const codigo = await getItemDrawingCode(itemCod.item, itemCod.mask.trim());
    setItemCod((c) => ({ ...c, codigo: codigo ?? (sel ? `${sel.code}${sel.digit ?? ""}` : ""), carregado: true }));
    if (!codigo) setFeedback({ type: "info", message: "O item ainda não tem código de desenho nesta configuração. Confira o código sugerido e grave." });
  });
  const gravarItem = () => run(async () => {
    if (!itemCod.item || !itemCod.codigo.trim()) { setFeedback({ type: "error", message: "Informe o item e o código de desenho." }); return; }
    await saveItemDrawingCode(itemCod.item, itemCod.mask.trim(), itemCod.codigo);
    setFeedback({ type: "success", message: `Código de desenho do item ${itemCod.item} gravado.` });
  });

  const abrirParametros = () => run(async () => { setReplicar((await getDrawingParameters()).replicate_drawing_revision); setVerParametros(true); });
  const gravarParametros = (v: boolean) => run(async () => { await saveDrawingParameters(v); setReplicar(v); setFeedback({ type: "success", message: "Parâmetro de desenho gravado." }); });

  const rotuloCaracteristica = useMemo(() => {
    const m = new Map(caracteristicas.map((c) => [c.id, `${c.code} — ${c.description}`]));
    return (id: number) => m.get(id) ?? `Característica ${id}`;
  }, [caracteristicas]);
  const revAtual = revs.find((r) => r.is_current);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Desenhos Técnicos</span><span className="erp-crumb-code">VDES0100</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{lista.length} desenho(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Desenhos</span>
          <input className="erp-input" style={{ width: 220 }} placeholder="Código ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void run(recarregarLista); }} />
          <label className="erp-check"><input type="checkbox" checked={inativos} onChange={(e) => setInativos(e.target.checked)} /> Mostrar desativados</label>
          <button className="erp-btn erp-btn-dark" onClick={() => void run(recarregarLista)} disabled={busy}>{busy && <span className="erp-spin" />}Atualizar</button>
          <button className="erp-btn" onClick={novo} disabled={busy}>Novo desenho</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup">
          <button className="erp-btn" onClick={() => void abrirParametros()} disabled={busy}>Parâmetros</button>
          <ExportButton title="VDES0100 — Desenhos Técnicos" filename="vdes0100" />
        </div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        {verParametros && replicar !== null && (
          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Parâmetros de desenho da empresa</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c9">
                <label className="erp-check"><input type="checkbox" checked={replicar} disabled={busy} onChange={(e) => void gravarParametros(e.target.checked)} /> Nova revisão do desenho replica para o item vinculado</label>
                <span className="erp-field-hint">Ligado: ao cadastrar a revisão vigente, o código composto (desenho + dígito + formato + revisão) passa a ser o código de desenho do item.</span>
              </div>
              <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={() => setVerParametros(false)}>Fechar</button></div>
            </div>
          </div>
        )}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Desenhos</span><span className="erp-count">{lista.length}</span></div>
            <div className="erp-list">
              {lista.length === 0 && <div className="erp-list-empty">Nenhum desenho {busca ? "encontrado" : "cadastrado"}. Use <strong>Novo desenho</strong>.</div>}
              {lista.map((d) => (
                <div key={d.id} className={`erp-list-row${sel?.id === d.id ? " erp-row-sel" : ""}`} onClick={() => abrir(d.id)}>
                  <span className="erp-list-code">{d.code}{d.digit ? `-${d.digit}` : ""}{d.format ? ` · ${d.format}` : ""}</span>
                  <span className="erp-list-sub">{d.description}{d.is_active === false ? " · desativado" : ""}</span>
                  {d.is_active !== false && (
                    <div className="erp-list-meta"><button className="erp-btn erp-btn-danger erp-btn-sm" style={{ marginLeft: "auto" }} disabled={busy} onClick={(e) => { e.stopPropagation(); void desativar(d); }}>Desativar</button></div>
                  )}
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-tabs">
              <button className={`erp-tab${aba === "desenho" ? " active" : ""}`} onClick={() => setAba("desenho")}>{sel ? `Desenho ${sel.code}` : "Novo desenho"}</button>
              <button className={`erp-tab${aba === "revisoes" ? " active" : ""}`} disabled={!sel} onClick={() => setAba("revisoes")}>Revisões ({revs.length})</button>
              <button className={`erp-tab${aba === "caracteristicas" ? " active" : ""}`} disabled={!sel} onClick={() => setAba("caracteristicas")}>Características ({vinculos.length})</button>
              <button className={`erp-tab${aba === "item" ? " active" : ""}`} disabled={!sel} onClick={() => setAba("item")}>Código por item</button>
            </div>
            <div className="erp-detail-body">
              {aba === "desenho" && (
                <div className="erp-fieldset"><div className="erp-fieldset-head">Identificação</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Código</label><input className="erp-input" value={form.code} onChange={(e) => setF("code", e.target.value)} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Dígito</label><input className="erp-input" maxLength={2} value={form.digit ?? ""} onChange={(e) => setF("digit", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Formato</label><input className="erp-input" placeholder="A3, A4…" value={form.format ?? ""} onChange={(e) => setF("format", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Modelo</label><input className="erp-input" placeholder="2D, 3D…" value={form.model ?? ""} onChange={(e) => setF("model", e.target.value)} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Item</label><LookupField value={form.item_code || undefined} loader={loadItems} entityLabel="item" clearable onChange={(c) => setF("item_code", c ? String(c) : undefined)} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">UM</label><SelectUnidade aria-label="Unidade" vazio="—" value={form.uom ?? ""} onChange={(u) => setF("uom", u)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Peso (kg)</label><input className="erp-input num" type="number" min={0} step="0.001" value={form.weight ?? ""} onChange={(e) => setF("weight", e.target.value === "" ? undefined : Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Criado em</label><input className="erp-input" type="date" value={form.creation_date ?? ""} onChange={(e) => setF("creation_date", e.target.value)} /></div>
                  <div className="erp-field erp-c12"><label className="erp-label">Especificação do material</label><input className="erp-input" value={form.material_spec ?? ""} onChange={(e) => setF("material_spec", e.target.value)} /></div>
                  {sel && revAtual && <div className="erp-field erp-c12"><span className="erp-field-hint">Revisão vigente: <strong>{revAtual.revision}</strong>{revAtual.composite_code ? ` · código composto ${revAtual.composite_code}` : ""}</span></div>}
                  <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{sel ? "Gravar alterações" : "Criar desenho"}</button></div>
                </div></div>
              )}

              {aba === "revisoes" && sel && (
                <>
                  <div className="erp-fieldset"><div className="erp-fieldset-head">{revEdit ? "Alterar revisão" : "Nova revisão"}</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c2"><label className="erp-label erp-req">Revisão</label><input className="erp-input" value={revForm.revision} onChange={(e) => setRevForm((f) => ({ ...f, revision: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Vigente de</label><input className="erp-input" type="date" value={revForm.start_date ?? ""} onChange={(e) => setRevForm((f) => ({ ...f, start_date: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Até</label><input className="erp-input" type="date" value={revForm.end_date ?? ""} onChange={(e) => setRevForm((f) => ({ ...f, end_date: e.target.value }))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Aprovado por</label><input className="erp-input" value={revForm.approved_by ?? ""} onChange={(e) => setRevForm((f) => ({ ...f, approved_by: e.target.value }))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Aprovado em</label><input className="erp-input" type="date" value={revForm.approval_date ?? ""} onChange={(e) => setRevForm((f) => ({ ...f, approval_date: e.target.value }))} /></div>
                    <div className="erp-field erp-c6"><label className="erp-label">Motivo da revisão</label><input className="erp-input" value={revForm.reason ?? ""} onChange={(e) => setRevForm((f) => ({ ...f, reason: e.target.value }))} /></div>
                    <div className="erp-field erp-c4"><label className="erp-label">Material desta revisão</label><input className="erp-input" value={revForm.material_spec ?? ""} onChange={(e) => setRevForm((f) => ({ ...f, material_spec: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-check" style={{ marginTop: 22 }}><input type="checkbox" checked={!!revForm.is_current} onChange={(e) => setRevForm((f) => ({ ...f, is_current: e.target.checked }))} /> Vigente</label></div>
                    <div className="erp-field erp-c12" style={{ justifyContent: "flex-end", gap: 8 }}>
                      {revEdit && <button className="erp-btn" onClick={() => { setRevEdit(null); setRevForm(NOVA_REV()); }} disabled={busy}>Cancelar alteração</button>}
                      <button className="erp-btn erp-btn-primary" onClick={salvarRev} disabled={busy}>{revEdit ? "Gravar revisão" : "+ Revisão"}</button>
                    </div>
                  </div></div>

                  <div className="erp-fieldset"><div className="erp-fieldset-head">Revisões de {sel.code}</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th>Revisão</th><th>Código composto</th><th>Vigência</th><th>Motivo</th><th>Aprovação</th><th>Vigente</th><th>Cópias</th><th style={{ width: 230 }} /></tr></thead>
                      <tbody>
                        {revs.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Sem revisões. Cadastre a primeira acima.</td></tr>}
                        {revs.map((r) => (
                          <tr key={r.id} className={distRev === r.id ? "erp-row-sel" : undefined}>
                            <td style={{ fontWeight: 600 }}>{r.revision}</td><td>{r.composite_code ?? "—"}</td>
                            <td>{data(r.start_date)}{r.end_date ? ` a ${data(r.end_date)}` : ""}</td><td>{r.reason || "—"}</td>
                            <td>{r.approved_by || "—"}{r.approval_date ? ` · ${data(r.approval_date)}` : ""}</td><td>{r.is_current ? "✓" : ""}</td>
                            <td className="num">{r.distributions?.length ?? 0}</td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => { setRevEdit(r.id ?? null); setRevForm({ ...NOVA_REV(), ...r, start_date: r.start_date?.slice(0, 10) ?? "", end_date: r.end_date?.slice(0, 10) ?? "", approval_date: r.approval_date?.slice(0, 10) ?? "" }); }}>Alterar</button>{" "}
                              <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => setDistRev(distRev === r.id ? null : r.id ?? null)}>Cópias</button>{" "}
                              <button className="erp-btn erp-btn-danger erp-btn-sm" disabled={busy} onClick={() => void excluirRev(r)}>Excluir</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div></div></div>

                  {distRev && (() => {
                    const r = revs.find((x) => x.id === distRev);
                    return (
                      <div className="erp-fieldset"><div className="erp-fieldset-head">Cópias controladas da revisão {r?.revision}</div><div className="erp-fieldset-body">
                        <div className="erp-field erp-c4"><label className="erp-label erp-req">Entregue a</label><input className="erp-input" placeholder="Setor ou pessoa" value={distForm.recipient} onChange={(e) => setDistForm((f) => ({ ...f, recipient: e.target.value }))} /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Em</label><input className="erp-input" type="date" value={distForm.distributed_at ?? ""} onChange={(e) => setDistForm((f) => ({ ...f, distributed_at: e.target.value }))} /></div>
                        <div className="erp-field erp-c4"><label className="erp-label">Observação</label><input className="erp-input" value={distForm.notes ?? ""} onChange={(e) => setDistForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                        <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={distribuir} disabled={busy}>+ Cópia</button></div>
                        <div className="erp-field erp-c12"><table className="erp-grid">
                          <thead><tr><th>Entregue a</th><th>Em</th><th>Observação</th><th style={{ width: 90 }} /></tr></thead>
                          <tbody>
                            {(r?.distributions ?? []).length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma cópia distribuída.</td></tr>}
                            {(r?.distributions ?? []).map((d) => <tr key={d.id}><td>{d.recipient}</td><td>{data(d.distributed_at)}</td><td>{d.notes || "—"}</td><td><button className="erp-btn erp-btn-danger erp-btn-sm" disabled={busy} onClick={() => excluirDist(d.id)}>Excluir</button></td></tr>)}
                          </tbody>
                        </table></div>
                      </div></div>
                    );
                  })()}
                </>
              )}

              {aba === "caracteristicas" && sel && (
                <div className="erp-fieldset"><div className="erp-fieldset-head">Quando o produto configurado usa este desenho</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c4"><label className="erp-label erp-req">Característica</label>
                    <LookupField value={vinculo.characteristic_id || undefined} loader={loadCharacteristics} entityLabel="característica"
                      onChange={(c) => { const id = Number(c) || 0; setVinculo((v) => ({ ...v, characteristic_id: id, variable_id: undefined })); if (id) void run(async () => { const cs = caracteristicas.length ? caracteristicas : await listCharacteristics(); setCaracteristicas(cs); await respostasDe(id, cs); }); }} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Condição</label>
                    <select className="erp-input" value={vinculo.operator} onChange={(e) => setVinculo((v) => ({ ...v, operator: e.target.value }))}>{OPERADORES_CARACTERISTICA.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Resposta</label>
                    <select className="erp-input" value={vinculo.variable_id ?? ""} disabled={!vinculo.characteristic_id} onChange={(e) => setVinculo((v) => ({ ...v, variable_id: Number(e.target.value) || undefined }))}>
                      <option value="">Qualquer resposta</option>
                      {respostasDaCaracteristica(vinculo.characteristic_id).map((v) => <option key={v.id} value={v.id}>{v.code} — {v.description}</option>)}
                    </select></div>
                  <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={vincular} disabled={busy}>+ Vincular</button></div>
                  <div className="erp-field erp-c12"><table className="erp-grid">
                    <thead><tr><th>Característica</th><th>Condição</th><th>Resposta</th><th style={{ width: 90 }} /></tr></thead>
                    <tbody>
                      {vinculos.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">O desenho vale para qualquer configuração do item.</td></tr>}
                      {vinculos.map((v) => {
                        const resp = respostasDaCaracteristica(v.characteristic_id).find((x) => x.id === v.variable_id);
                        return <tr key={v.id}><td>{rotuloCaracteristica(v.characteristic_id)}</td><td>{rotuloOperador(v.operator)}</td><td>{v.variable_id ? (resp ? `${resp.code} — ${resp.description}` : `Resposta ${v.variable_id}`) : "Qualquer"}</td><td><button className="erp-btn erp-btn-danger erp-btn-sm" disabled={busy} onClick={() => desvincular(v.id)}>Remover</button></td></tr>;
                      })}
                    </tbody>
                  </table></div>
                </div></div>
              )}

              {aba === "item" && sel && (
                <div className="erp-fieldset"><div className="erp-fieldset-head">Código de desenho do item</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label><LookupField value={itemCod.item || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setItemCod({ item: c ? String(c) : "", mask: itemCod.mask, codigo: "", carregado: false })} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Máscara (item configurado)</label><input className="erp-input" placeholder="vazio = item sem configuração" value={itemCod.mask} onChange={(e) => setItemCod((c) => ({ ...c, mask: e.target.value, carregado: false }))} /></div>
                  <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={() => void consultarItem()} disabled={busy}>Consultar</button></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Código de desenho</label><input className="erp-input" disabled={!itemCod.carregado} value={itemCod.codigo} onChange={(e) => setItemCod((c) => ({ ...c, codigo: e.target.value }))} /></div>
                  <div className="erp-field erp-c12"><span className="erp-field-hint">É o código impresso na ordem e na estrutura para este item (e esta configuração). Com o parâmetro de replicação ligado, a revisão vigente atualiza o código sozinha.</span></div>
                  <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void gravarItem()} disabled={busy || !itemCod.carregado}>Gravar código</button></div>
                </div></div>
              )}
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Desenhos: <strong>{lista.length}</strong></div>
        {sel && <div className="erp-status-item">Aberto: <strong>{sel.code}</strong>{revAtual ? ` rev. ${revAtual.revision}` : ""}</div>}
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
