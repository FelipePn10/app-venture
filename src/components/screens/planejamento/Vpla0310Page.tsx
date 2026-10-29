import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type Escopo, type Estrategia, type Politica, type PoliticaDTO, type PoliticaEfetiva, ESTRATEGIAS, alterarPolitica, criarPolitica,
  estrategiaDe, excluirPolitica, listarClassificacoes, listarPoliticas, politicaEfetiva,
} from "@/services/politicaPlanejamentoService";
import { loadItems } from "@/services/lookups";
import { LookupField } from "@/components/ui/LookupField";
import { ExportButton } from "@/components/ui/ExportButton";
import { Aviso, Cabecalho, Detalhe, Kpis, Painel, Selo, Vazio } from "./planUi";
import { normalizar } from "./planFormat";
import { useAcao } from "./planHooks";

/**
 * VPLA0310 — Política de planejamento por item ou classificação: estratégia
 * (consumo pela venda ou sob encomenda), janela de consumo, horizonte firme e
 * tempo de segurança. Campo vazio herda: item → classificação mais profunda do
 * item → parâmetros da empresa (VPLA0300, 46 a 49).
 */

type Form = {
  id?: number; escopo: Escopo; item: string; classificacao?: number; estrategia: Estrategia | "";
  antes: string; depois: string; horizonte: string; seguranca: string; observacao: string;
};
const FORM_VAZIO = (): Form => ({ escopo: "ITEM", item: "", estrategia: "", antes: "", depois: "", horizonte: "", seguranca: "", observacao: "" });
const ESCOPOS: { id: Escopo | ""; rotulo: string }[] = [{ id: "", rotulo: "Todas" }, { id: "ITEM", rotulo: "Por item" }, { id: "CLASSIFICACAO", rotulo: "Por classificação" }];

/** "" herda (undefined); número de 0 a 365. */
function dias(t: string): number | undefined | "erro" {
  const v = t.trim();
  if (!v) return undefined;
  if (!/^\d+$/.test(v)) return "erro";
  const n = Number(v);
  return n > 365 ? "erro" : n;
}
const herda = (v?: number, sufixo = " dias") => (v == null ? <span className="erp-text-muted">herda</span> : `${v}${sufixo}`);
const escopoDe = (p: Politica) => (p.escopo === "ITEM" ? `${p.item_business_code} · ${p.item_name}` : `${p.classification_code} · ${p.classification_label}`);

export function Vpla0310Page(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lista, setLista] = useState<Politica[]>([]);
  const [escopo, setEscopo] = useState<Escopo | "">("");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<Politica | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [excluir, setExcluir] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [efetiva, setEfetiva] = useState<PoliticaEfetiva | null>(null);

  const listar = useCallback(async () => { setLista(await listarPoliticas({ escopo })); }, [escopo]);
  useEffect(() => { void run(listar); }, [run, listar]);

  const visiveis = useMemo(() => {
    const t = normalizar(busca.trim());
    if (!t) return lista;
    return lista.filter((p) => normalizar(`${escopoDe(p)} ${p.observacao ?? ""}`).includes(t));
  }, [lista, busca]);

  const novo = () => { setFeedback(null); setForm(FORM_VAZIO()); };
  const editar = (p: Politica) => {
    setFeedback(null);
    const t = (v?: number) => (v == null ? "" : String(v));
    setForm({
      id: p.id, escopo: p.escopo, item: p.item_business_code ?? "", classificacao: p.classification_id, estrategia: p.estrategia ?? "",
      antes: t(p.consumo_dias_antes), depois: t(p.consumo_dias_depois), horizonte: t(p.horizonte_firme_dias), seguranca: t(p.tempo_seguranca_dias),
      observacao: p.observacao ?? "",
    });
  };

  const salvar = () => {
    if (!form) return;
    if (!form.id && form.escopo === "ITEM" && !form.item) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    if (!form.id && form.escopo === "CLASSIFICACAO" && !form.classificacao) { setFeedback({ type: "error", message: "Escolha a classificação." }); return; }
    const campos = { antes: dias(form.antes), depois: dias(form.depois), horizonte: dias(form.horizonte), seguranca: dias(form.seguranca) };
    if (Object.values(campos).includes("erro")) { setFeedback({ type: "error", message: "Os dias vão de 0 a 365 (número inteiro). Deixe vazio para herdar." }); return; }
    if (!form.estrategia && Object.values(campos).every((v) => v === undefined)) {
      setFeedback({ type: "error", message: "Preencha ao menos um campo: os vazios seguem a classificação ou os parâmetros da empresa." });
      return;
    }
    const dto: PoliticaDTO = {
      estrategia: form.estrategia || undefined,
      consumo_dias_antes: campos.antes as number | undefined, consumo_dias_depois: campos.depois as number | undefined,
      horizonte_firme_dias: campos.horizonte as number | undefined, tempo_seguranca_dias: campos.seguranca as number | undefined,
      observacao: form.observacao.trim() || undefined,
    };
    void run(async () => {
      const salva = form.id
        ? await alterarPolitica(form.id, dto)
        : await criarPolitica({ ...dto, ...(form.escopo === "ITEM" ? { item_code: form.item } : { classification_id: form.classificacao }) });
      setForm(null); setSel(salva); await listar();
      setFeedback({ type: "success", message: `Política ${form.id ? "alterada" : "cadastrada"}. Vale a partir do próximo MRP.` });
    });
  };

  const confirmarExcluir = () => {
    if (!sel) return;
    void run(async () => {
      await excluirPolitica(sel.id);
      setExcluir(false); setSel(null); await listar();
      setFeedback({ type: "success", message: "Política excluída: o escopo volta a herdar." });
    });
  };

  const consultar = () => {
    if (!consulta) { setFeedback({ type: "error", message: "Escolha o item para ver a política que vale para ele." }); return; }
    void run(async () => { setEfetiva(await politicaEfetiva(consulta)); });
  };

  const est = form ? estrategiaDe(form.estrategia || undefined) : undefined;

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Planejamento" titulo="Política de Planejamento por Item" codigo="VPLA0310" />

      <div className="erp-toolbar vpl-toolbar">
        <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Nova política</button>
        <div className="erp-tgroup"><button className="erp-btn" onClick={() => void run(listar)} disabled={busy}>Atualizar</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPLA0310 — Política de Planejamento por Item" filename="vpla0310" build={() => ({
          columns: ["Escopo", "Item / classificação", "Estratégia", "Dias antes", "Dias depois", "Horizonte firme", "Tempo de segurança", "Observação"],
          rows: visiveis.map((p) => [p.escopo === "ITEM" ? "Item" : "Classificação", escopoDe(p), estrategiaDe(p.estrategia)?.rotulo ?? "herda",
            p.consumo_dias_antes ?? "herda", p.consumo_dias_depois ?? "herda", p.horizonte_firme_dias ?? "herda", p.tempo_seguranca_dias ?? "herda", p.observacao ?? ""].map(String)),
        })} /></div>
      </div>

      <div className="erp-content">
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Políticas</span><span className="erp-count">{visiveis.length}</span>
              <div className="erp-panel-head-spacer" />
              <input className="erp-search" placeholder="Item, classificação…" aria-label="Buscar política" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <div className="vpl-list-filters">
              {ESCOPOS.map((f) => <button key={f.id || "todas"} type="button" className={`erp-chip${escopo === f.id ? " active" : ""}`} onClick={() => setEscopo(f.id)}>{f.rotulo}</button>)}
            </div>
            <div className="erp-list">
              {visiveis.length === 0 && <div className="erp-list-empty">{lista.length ? "Nenhuma política com essa busca." : "Nenhuma política: todos os itens seguem os parâmetros da empresa."}</div>}
              {visiveis.map((p) => (
                <div key={p.id} className={`erp-list-row${sel?.id === p.id ? " sel" : ""}`} onClick={() => setSel(p)}
                  role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setSel(p); }}>
                  <span className="erp-list-code">{p.escopo === "ITEM" ? p.item_business_code : p.classification_code}</span>
                  <span className="erp-list-sub">{p.escopo === "ITEM" ? p.item_name : p.classification_label}</span>
                  <span className="vpl-list-row-right"><Selo tom={p.escopo === "ITEM" ? "info" : "muted"}>{p.escopo === "ITEM" ? "Item" : "Classificação"}</Selo></span>
                  <div className="erp-list-meta" style={{ width: "100%" }}>
                    <span className="erp-text-muted" style={{ fontSize: 11.5 }}>{estrategiaDe(p.estrategia)?.rotulo ?? "estratégia herdada"}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-detail-body">
              <Aviso feedback={feedback} busy={busy} />
              {sel ? (<>
                <div className="vpl-record">
                  <div className="vpl-record-main">
                    <div className="vpl-record-title">{escopoDe(sel)} <Selo tom={sel.escopo === "ITEM" ? "info" : "muted"}>{sel.escopo === "ITEM" ? "Item" : "Classificação"}</Selo></div>
                    <div className="vpl-record-sub">{sel.escopo === "ITEM" ? "Vale só para este item." : "Vale para os itens desta classificação e das que ficam abaixo dela, quando o item não tem política própria."}</div>
                  </div>
                  <div className="vpl-record-actions">
                    <button className="erp-btn" onClick={() => editar(sel)} disabled={busy}>Alterar</button>
                    <button className="erp-btn erp-btn-danger" onClick={() => setExcluir(true)} disabled={busy}>Excluir</button>
                  </div>
                </div>
                <Painel titulo="O que esta política define">
                  <Detalhe itens={[
                    { label: "Estratégia", value: estrategiaDe(sel.estrategia)?.rotulo ?? herda(undefined), forte: true },
                    { label: "Janela de consumo — dias antes da venda", value: herda(sel.consumo_dias_antes) },
                    { label: "Janela de consumo — dias depois da venda", value: herda(sel.consumo_dias_depois) },
                    { label: "Horizonte firme", value: herda(sel.horizonte_firme_dias, " dias corridos") },
                    { label: "Tempo de segurança", value: herda(sel.tempo_seguranca_dias, " dias úteis") },
                    { label: "Observação", value: sel.observacao || "—" },
                  ]} />
                  {sel.estrategia && <p className="erp-note">{estrategiaDe(sel.estrategia)?.ajuda}</p>}
                </Painel>
              </>) : (<>
                <Kpis itens={[
                  { label: "Políticas por item", value: lista.filter((p) => p.escopo === "ITEM").length, tom: "info" },
                  { label: "Políticas por classificação", value: lista.filter((p) => p.escopo === "CLASSIFICACAO").length },
                  { label: "Sob encomenda", value: lista.filter((p) => p.estrategia === "SOB_ENCOMENDA").length, hint: "só o pedido gera necessidade" },
                ]} />
                <Vazio titulo="Escolha uma política na lista" texto={<>Sem política, o item segue os <strong>parâmetros da empresa</strong> (VPLA0300: janela de consumo 46/47, horizonte firme 48 e tempo de segurança 49). Uma política por classificação vale para todos os itens dela; a do item vale por cima.</>}
                  acao={<button className="erp-btn erp-btn-primary" onClick={novo}>+ Nova política</button>} />
              </>)}

              <Painel titulo="Política que vale para um item" sub="Mostra o valor final de cada campo e de onde ele veio">
                <div className="erp-fieldset-body" style={{ padding: 0 }}>
                  <div className="erp-field erp-c8"><label className="erp-label">Item</label>
                    <LookupField<string> value={consulta || undefined} loader={loadItems} entityLabel="item" onChange={(c) => { setConsulta(String(c ?? "")); setEfetiva(null); }} /></div>
                  <div className="erp-field erp-c4"><button className="erp-btn erp-btn-primary" style={{ marginTop: 22 }} onClick={consultar} disabled={busy}>Consultar</button></div>
                </div>
                {efetiva && (<div style={{ marginTop: 12 }}>
                  <Detalhe itens={[
                    { label: "Item", value: `${efetiva.item_business_code} — ${efetiva.item_name}`, forte: true },
                    { label: "Estratégia", value: <>{estrategiaDe(efetiva.estrategia)?.rotulo} <span className="erp-text-muted">({efetiva.origem.estrategia})</span></> },
                    { label: "Janela de consumo", value: <>{efetiva.consumo_dias_antes} dias antes, {efetiva.consumo_dias_depois} depois <span className="erp-text-muted">({efetiva.origem.janela})</span></> },
                    { label: "Horizonte firme", value: <>{efetiva.horizonte_firme_dias ? `${efetiva.horizonte_firme_dias} dias corridos` : "desligado"} <span className="erp-text-muted">({efetiva.origem.horizonte_firme})</span></> },
                    { label: "Tempo de segurança", value: <>{efetiva.tempo_seguranca_dias ? `${efetiva.tempo_seguranca_dias} dias úteis` : "nenhum"} <span className="erp-text-muted">({efetiva.origem.tempo_seguranca})</span></> },
                  ]} />
                </div>)}
              </Painel>
            </div>
          </section>
        </div>
      </div>

      {form && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pol-titulo" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setForm(null); }}>
          <div className="erp-modal" style={{ width: "min(720px, 96vw)" }}>
            <div className="erp-modal-head"><div><strong id="pol-titulo">{form.id ? "Alterar política" : "Nova política de planejamento"}</strong>
              <div className="erp-field-hint">Campo vazio herda da classificação ou dos parâmetros da empresa. Vale a partir do próximo MRP.</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setForm(null)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              <Aviso feedback={feedback} busy={busy} />
              <div className="erp-fieldset-body" style={{ padding: 0 }}>
                <div className="erp-field erp-c4"><label className="erp-label erp-req" htmlFor="pol-escopo">Vale para</label>
                  <select id="pol-escopo" className="erp-input" value={form.escopo} disabled={!!form.id}
                    onChange={(e) => setForm((f) => f && ({ ...f, escopo: e.target.value as Escopo }))}>
                    <option value="ITEM">Um item</option><option value="CLASSIFICACAO">Uma classificação</option>
                  </select></div>
                {form.escopo === "ITEM" ? (
                  <div className="erp-field erp-c8"><label className="erp-label erp-req">Item</label>
                    <LookupField<string> value={form.item || undefined} loader={loadItems} entityLabel="item" disabled={!!form.id}
                      onChange={(c) => setForm((f) => f && ({ ...f, item: String(c ?? "") }))} /></div>
                ) : (
                  <div className="erp-field erp-c8"><label className="erp-label erp-req">Classificação</label>
                    <LookupField value={form.classificacao} loader={listarClassificacoes} entityLabel="classificação" disabled={!!form.id}
                      onChange={(c) => setForm((f) => f && ({ ...f, classificacao: c ? Number(c) : undefined }))} /></div>
                )}
                <div className="erp-field erp-c12"><label className="erp-label" htmlFor="pol-est">Estratégia</label>
                  <select id="pol-est" className="erp-input" value={form.estrategia} onChange={(e) => setForm((f) => f && ({ ...f, estrategia: e.target.value as Estrategia | "" }))}>
                    <option value="">Herdar</option>
                    {ESTRATEGIAS.map((x) => <option key={x.id} value={x.id}>{x.rotulo}</option>)}
                  </select>
                  {est && <span className="erp-field-hint">{est.ajuda}</span>}</div>
                <div className="erp-field erp-c3"><label className="erp-label" htmlFor="pol-antes">Consumo: dias antes</label>
                  <input id="pol-antes" className="erp-input num" inputMode="numeric" placeholder="herda" value={form.antes} onChange={(e) => setForm((f) => f && ({ ...f, antes: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label" htmlFor="pol-depois">Consumo: dias depois</label>
                  <input id="pol-depois" className="erp-input num" inputMode="numeric" placeholder="herda" value={form.depois} onChange={(e) => setForm((f) => f && ({ ...f, depois: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label" htmlFor="pol-hor">Horizonte firme (dias)</label>
                  <input id="pol-hor" className="erp-input num" inputMode="numeric" placeholder="herda" value={form.horizonte} onChange={(e) => setForm((f) => f && ({ ...f, horizonte: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label" htmlFor="pol-seg">Tempo de segurança (dias úteis)</label>
                  <input id="pol-seg" className="erp-input num" inputMode="numeric" placeholder="herda" value={form.seguranca} onChange={(e) => setForm((f) => f && ({ ...f, seguranca: e.target.value }))} /></div>
                <div className="erp-field erp-c12"><span className="erp-field-hint">
                  <strong>Janela de consumo:</strong> uma venda consome a previsão e a demanda de estoque com data entre tantos dias antes e tantos dias depois dela.{" "}
                  <strong>Horizonte firme:</strong> de hoje até hoje + esses dias, o MRP não cria ordem nova (a sugestão vai para o fim do horizonte e o MRP avisa).{" "}
                  <strong>Tempo de segurança:</strong> a ordem chega esses dias úteis antes da necessidade.</span></div>
                <div className="erp-field erp-c12"><label className="erp-label" htmlFor="pol-obs">Observação</label>
                  <input id="pol-obs" className="erp-input" value={form.observacao} onChange={(e) => setForm((f) => f && ({ ...f, observacao: e.target.value }))} /></div>
              </div>
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setForm(null)} disabled={busy}>Cancelar</button>
              <button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>{busy && <span className="erp-spin" />}{form.id ? "Salvar alteração" : "Cadastrar política"}</button>
            </div>
          </div>
        </div>
      )}

      {excluir && sel && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pol-excluir" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setExcluir(false); }}>
          <div className="erp-modal" style={{ width: "min(480px, 94vw)" }}>
            <div className="erp-modal-head"><div><strong id="pol-excluir">Excluir a política de {escopoDe(sel)}</strong>
              <div className="erp-field-hint">O escopo volta a herdar da classificação ou dos parâmetros da empresa no próximo MRP.</div></div></div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setExcluir(false)} disabled={busy}>Voltar</button>
              <button className="erp-btn erp-btn-danger" onClick={confirmarExcluir} disabled={busy}>{busy && <span className="erp-spin" />}Excluir política</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
