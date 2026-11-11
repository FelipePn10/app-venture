import { useMemo, useState } from "react";
import {
  type OperationDTO, type OpOrigin, type OperationDocumentDTO, type DocumentKind, type TimeUnit, type TimeBasis,
  OP_ORIGINS, DOCUMENT_KINDS, TIME_UNITS, TIME_BASES, THIRD_PARTY_REMITTANCES,
  createOperation, updateOperation, deleteOperation,
  addOperationDocument, removeOperationDocument, listOperationDocuments,
} from "@/services/manufacturingRoutingService";
import { errMessage } from "@/services/fiscalShared";
import { enumLabel } from "@/utils/enumLabels";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadItems, loadWorkCenters, loadSuppliers } from "@/services/lookups";
import { type Feedback, num, rotuloBase, rotuloUnidade, ehTerceiro } from "./roteiroUtils";
import { OriginPill } from "./OriginPill";

const VAZIA: OperationDTO = {
  name: "", origin: "INTERNA", standard_time: 0, setup_time: 0,
  run_time: 0, labor_time: 0, run_base_qty: 1, queue_time: 0, wait_time: 0, move_time: 0,
  crew_size: 1, time_unit: "MIN", third_party_remittance: "DEMAND_ITEMS", scrap_pct: 0, time_basis: "PECA",
};
const DOC_VAZIO = { kind: "INSTRUCAO" as DocumentKind, title: "", reference: "", revision: "" };

type Props = {
  ops: OperationDTO[];
  recarregar: () => Promise<void>;
  setFeedback: (f: Feedback) => void;
  pedirConfirmacao: (c: { titulo: string; mensagem: string; assunto?: string; rotulo: string; acao: () => Promise<void> }) => void;
};

/**
 * Biblioteca de operações: o vocabulário da fábrica ("Corte a laser", "Solda
 * MIG", "Cementar em terceiro"), cadastrado uma vez e reaproveitado em todo
 * roteiro. Tudo o que está aqui é o PADRÃO; a etapa do roteiro sobrepõe só o
 * que é diferente naquele item.
 */
export function BibliotecaOperacoes({ ops, recarregar, setFeedback, pedirConfirmacao }: Props): JSX.Element {
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<OperationDTO>(VAZIA);
  const [editId, setEditId] = useState<number | null>(null);
  const [docs, setDocs] = useState<OperationDocumentDTO[]>([]);
  const [docForm, setDocForm] = useState(DOC_VAZIO);
  const [busy, setBusy] = useState(false);
  /** A operação aberta só tinha o tempo legado (veio para o campo de máquina). */
  const [legado, setLegado] = useState(false);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return ops.filter((o) => !t || o.name.toLowerCase().includes(t) || String(o.code ?? "").includes(t));
  }, [ops, busca]);

  const set = <K extends keyof OperationDTO>(k: K, v: OperationDTO[K]) => setForm((p) => ({ ...p, [k]: v }));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  };

  function nova() { setForm(VAZIA); setEditId(null); setDocs([]); setDocForm(DOC_VAZIO); setLegado(false); }
  function abrir(o: OperationDTO) {
    // Operação antiga: só o tempo padrão legado preenchido. Ele É o tempo de
    // máquina (o cálculo usa o legado quando o de máquina é zero); trazê-lo para
    // o campo evita que salvar a operação o apague.
    const legado = !(o.run_time ?? 0) && (o.standard_time ?? 0) > 0;
    setForm({ ...VAZIA, ...o, run_time: legado ? o.standard_time : o.run_time });
    setLegado(legado);
    setEditId(o.id ?? null); setDocForm(DOC_VAZIO); setDocs([]);
    if (o.id) void run(async () => setDocs(await listOperationDocuments(o.id!)));
  }

  const salvar = () => run(async () => {
    if (!form.name.trim()) { setFeedback({ type: "error", message: "Dê um nome à operação (ex.: Corte a laser)." }); return; }
    if (form.time_basis === "ATRIBUTO" && !form.time_basis_attribute?.trim()) {
      setFeedback({ type: "error", message: "Informe o atributo do item que mede o tempo (ex.: FUROS)." }); return;
    }
    // O tempo achatado legado acompanha o tempo de máquina: quem ainda o lê
    // (relatórios antigos) vê o mesmo número.
    const corpo: OperationDTO = { ...form, standard_time: form.run_time ?? 0 };
    if (editId !== null) {
      await updateOperation(editId, corpo);
      setFeedback({ type: "success", message: `Operação "${form.name}" atualizada. Vale para todo roteiro que a usa, onde a etapa não sobrepõe.` });
    } else {
      const criada = await createOperation(corpo);
      setEditId(criada.id ?? null);
      setForm((f) => ({ ...f, id: criada.id, code: criada.code }));
      setFeedback({ type: "success", message: `Operação "${form.name}" criada. Agora ela pode ser usada nas etapas dos roteiros.` });
    }
    await recarregar();
  });

  const desativar = (o: OperationDTO) => pedirConfirmacao({
    titulo: "Desativar operação da biblioteca",
    mensagem: "A operação sai da lista de escolha, mas os roteiros que já a usam continuam funcionando — nada é apagado e nenhuma ordem em andamento muda.",
    assunto: `${o.code ? `${o.code} · ` : ""}${o.name}`,
    rotulo: "Desativar",
    acao: async () => { await deleteOperation(o.id!); nova(); await recarregar(); setFeedback({ type: "success", message: "Operação desativada." }); },
  });

  const addDoc = () => run(async () => {
    if (!editId) return;
    if (!docForm.title.trim()) { setFeedback({ type: "error", message: "Informe o título do documento." }); return; }
    await addOperationDocument({ operation_id: editId, ...docForm });
    setDocForm(DOC_VAZIO);
    setDocs(await listOperationDocuments(editId));
  });

  const unidade = form.time_unit ?? "MIN";
  const base = TIME_BASES.find((b) => b.value === (form.time_basis ?? "PECA"));
  const terceiro = ehTerceiro(form.origin);

  return (
    <div className="erp-main">
      <aside className="erp-list-panel">
        <div className="erp-panel-head">
          <span className="erp-panel-title">Operações</span>
          <span className="erp-count">{ops.length}</span>
          <span className="erp-panel-head-spacer" />
          <button className="erp-btn erp-btn-new erp-btn-sm" onClick={nova} disabled={busy}>+ Nova</button>
        </div>
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--v-border-soft)" }}>
          <input className="erp-search" style={{ width: "100%" }} placeholder="Buscar por nome ou código" value={busca}
            onChange={(e) => setBusca(e.target.value)} aria-label="Buscar operação" />
        </div>
        <div className="erp-list">
          {filtradas.length === 0 && (
            <div className="erp-list-empty">
              {ops.length === 0 ? <>Nenhuma operação ainda.<br />Comece por “+ Nova”: corte, dobra, solda, pintura, montagem…</> : "Nada encontrado."}
            </div>
          )}
          {filtradas.map((o) => (
            <div key={o.id} className={`erp-list-row${editId === o.id ? " sel" : ""}`} onClick={() => abrir(o)}
              role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") abrir(o); }}>
              <span className="erp-list-code">{o.code ?? o.id}</span>
              <span style={{ fontWeight: 600, fontSize: 12.5 }}>{o.name}</span>
              <OriginPill origem={o.origin} />
              <div className="erp-list-meta">
                <span className="erp-list-sub">
                  {num(o.run_time || o.standard_time)} {rotuloUnidade(o.time_unit)}
                  {(o.run_base_qty ?? 1) > 1 ? ` / ${num(o.run_base_qty)}` : ""} · {rotuloBase(o.time_basis, o.time_basis_attribute)}
                  {(o.scrap_pct ?? 0) > 0 ? ` · refugo ${num(o.scrap_pct)}%` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="erp-detail-panel">
        <div className="erp-panel-head">
          <span className="erp-panel-title">{editId !== null ? `Operação ${form.code ?? editId}` : "Nova operação"}</span>
          <span className="erp-panel-head-spacer" />
          {editId !== null && (
            <button className="erp-btn erp-btn-danger erp-btn-sm" disabled={busy}
              onClick={() => desativar({ ...form, id: editId })}>Desativar</button>
          )}
          <button className="erp-btn erp-btn-primary erp-btn-sm" onClick={() => void salvar()} disabled={busy}>
            {busy && <span className="erp-spin" />}{editId !== null ? "Salvar alterações" : "Criar operação"}
          </button>
        </div>
        <div className="erp-detail-body">
          <div className="erp-fieldset">
            <div className="erp-fieldset-head">1 · O que é</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c6"><label htmlFor="bib-nome" className="erp-label erp-req">Nome</label>
                <input id="bib-nome" className="erp-input" value={form.name} placeholder="Corte a laser"
                  onChange={(e) => set("name", e.target.value)} /></div>
              <div className="erp-field erp-c3"><label htmlFor="bib-origem" className="erp-label">Onde é feita</label>
                <select id="bib-origem" className="erp-input" value={form.origin} onChange={(e) => set("origin", e.target.value as OpOrigin)}>
                  {OP_ORIGINS.map((o) => <option key={o} value={o}>{enumLabel(o)}</option>)}
                </select>
                <span className="erp-field-hint">{terceiro ? "Sai da fábrica: gera ordem de serviço ao fornecedor." : "Na fábrica: gera etapa na ordem de produção."}</span></div>
              <div className="erp-field erp-c3"><label className="erp-label">Centro de trabalho padrão</label>
                <LookupField value={form.default_work_center_id ?? undefined}
                  onChange={(c) => set("default_work_center_id", c ? Number(c) : undefined)}
                  loader={loadWorkCenters} allowManualCode={false} entityLabel="centro de trabalho" placeholder="Opcional" clearable
                  disabled={terceiro} />
                <span className="erp-field-hint">A etapa pode trocar. A máquina sai da VMAQ0200.</span></div>
            </div>
          </div>

          {!terceiro && (
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">2 · Quanto tempo leva</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label htmlFor="bib-unidade" className="erp-label">Unidade dos tempos</label>
                  <select id="bib-unidade" className="erp-input" value={unidade} onChange={(e) => set("time_unit", e.target.value as TimeUnit)}>
                    {TIME_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                  <span className="erp-field-hint">A ficha vem em segundos? Lance em segundos.</span></div>
                <div className="erp-field erp-c3"><label htmlFor="bib-base" className="erp-label">O tempo é contado</label>
                  <select id="bib-base" className="erp-input" value={form.time_basis ?? "PECA"} onChange={(e) => set("time_basis", e.target.value as TimeBasis)}>
                    {TIME_BASES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                  <span className="erp-field-hint">{base?.hint}</span></div>
                {form.time_basis === "ATRIBUTO" ? (
                  <div className="erp-field erp-c3"><label htmlFor="bib-attr" className="erp-label erp-req">Atributo do item</label>
                    <input id="bib-attr" className="erp-input" value={form.time_basis_attribute ?? ""} placeholder="FUROS"
                      onChange={(e) => set("time_basis_attribute", e.target.value.toUpperCase())} />
                    <span className="erp-field-hint">Nome do atributo numérico no PDM do item.</span></div>
                ) : <div className="erp-field erp-c3" />}
                <div className="erp-field erp-c3" />

                <div className="erp-field erp-c3"><label htmlFor="bib-setup" className="erp-label">Preparação (setup)</label>
                  <input id="bib-setup" className="erp-input num" type="number" min={0} step="any" value={form.setup_time ?? 0}
                    onChange={(e) => set("setup_time", Number(e.target.value))} />
                  <span className="erp-field-hint">Uma vez por lote, em {rotuloUnidade(unidade)}.</span></div>
                <div className="erp-field erp-c3"><label htmlFor="bib-run" className="erp-label">Tempo de máquina</label>
                  <input id="bib-run" className="erp-input num" type="number" min={0} step="any" value={form.run_time ?? 0}
                    onChange={(e) => set("run_time", Number(e.target.value))} />
                  <span className="erp-field-hint">{legado ? "Veio do tempo padrão antigo da operação. Confira e salve." : `Por ciclo, em ${rotuloUnidade(unidade)}.`}</span></div>
                <div className="erp-field erp-c3"><label htmlFor="bib-ciclo" className="erp-label">Ciclo produz</label>
                  <input id="bib-ciclo" className="erp-input num" type="number" min={0.0001} step="any" value={form.run_base_qty ?? 1}
                    onChange={(e) => set("run_base_qty", Number(e.target.value) || 1)} />
                  <span className="erp-field-hint">{base?.unit === "peça" ? "Peças por ciclo." : `${base?.unit} por ciclo.`}</span></div>
                <div className="erp-field erp-c3"><label htmlFor="bib-refugo" className="erp-label">Refugo padrão (%)</label>
                  <input id="bib-refugo" className="erp-input num" type="number" min={0} max={99.9} step="0.1" value={form.scrap_pct ?? 0}
                    onChange={(e) => set("scrap_pct", Number(e.target.value))} />
                  <span className="erp-field-hint">Peças que entram e não saem boas.</span></div>

                <div className="erp-field erp-c3"><label className="erp-label">Mão de obra</label>
                  <input className="erp-input num" type="number" min={0} step="any" value={form.labor_time ?? 0}
                    onChange={(e) => set("labor_time", Number(e.target.value))} />
                  <span className="erp-field-hint">Por ciclo. Zero = o operador fica o ciclo todo.</span></div>
                <div className="erp-field erp-c3"><label className="erp-label">Operadores</label>
                  <input className="erp-input num" type="number" min={1} step="1" value={form.crew_size ?? 1}
                    onChange={(e) => set("crew_size", Number(e.target.value) || 1)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Fila</label>
                  <input className="erp-input num" type="number" min={0} step="any" value={form.queue_time ?? 0}
                    onChange={(e) => set("queue_time", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Espera</label>
                  <input className="erp-input num" type="number" min={0} step="any" value={form.wait_time ?? 0}
                    onChange={(e) => set("wait_time", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Movimentação</label>
                  <input className="erp-input num" type="number" min={0} step="any" value={form.move_time ?? 0}
                    onChange={(e) => set("move_time", Number(e.target.value))} /></div>
                <div className="erp-field erp-c12"><span className="erp-field-hint">
                  Fila, espera e movimentação são por lote: entram no <strong>prazo</strong>, não ocupam a máquina.
                </span></div>
              </div>
            </div>
          )}

          {terceiro && (
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">2 · Quem faz e em quanto tempo</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c4"><label className="erp-label">Fornecedor</label>
                  <LookupField value={form.supplier_id ?? undefined} onChange={(c) => set("supplier_id", c ? Number(c) : undefined)}
                    loader={loadSuppliers} entityLabel="fornecedor" placeholder="Quem executa" clearable /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Item de serviço</label>
                  <LookupField value={form.service_item_code ?? undefined} onChange={(c) => set("service_item_code", c ? String(c) : undefined)}
                    loader={loadItems} entityLabel="item" placeholder="Serviço comprado" clearable /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Prazo (dias)</label>
                  <input className="erp-input num" type="number" min={0} step="1" value={form.lead_time_days ?? ""}
                    onChange={(e) => set("lead_time_days", e.target.value ? Number(e.target.value) : undefined)} />
                  <span className="erp-field-hint">Dias corridos fora da fábrica.</span></div>
                <div className="erp-field erp-c2"><label className="erp-label">Refugo (%)</label>
                  <input className="erp-input num" type="number" min={0} max={99.9} step="0.1" value={form.scrap_pct ?? 0}
                    onChange={(e) => set("scrap_pct", Number(e.target.value))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Custo por peça (se faltar na VTPS0100)</label>
                  <input className="erp-input num" type="number" min={0} step="0.0001" value={form.cost_per_unit ?? ""}
                    onChange={(e) => set("cost_per_unit", e.target.value ? Number(e.target.value) : undefined)} />
                  <span className="erp-field-hint">O preço vigente da VTPS0100 tem prioridade no custo.</span></div>
                <div className="erp-field erp-c3"><label className="erp-label">O que remeter</label>
                  <select className="erp-input" value={form.third_party_remittance ?? "DEMAND_ITEMS"} onChange={(e) => set("third_party_remittance", e.target.value)}>
                    {THIRD_PARTY_REMITTANCES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
                  </select></div>
                <div className="erp-field erp-c6"><span className="erp-field-hint">
                  Enquanto a peça está no terceiro nenhuma máquina nossa fica ocupada: o planejamento só atrasa a etapa seguinte pelo prazo.
                  {form.supplier_id ? <> Fornecedor: <strong><EntityName code={form.supplier_id} loader={loadSuppliers} /></strong>.</> : null}
                </span></div>
              </div>
            </div>
          )}

          <div className="erp-fieldset">
            <div className="erp-fieldset-head">3 · Documentos — <span style={{ fontWeight: 400, opacity: .65 }}>valem em todo roteiro que usa a operação</span></div>
            <div className="erp-fieldset-body">
              {editId === null ? (
                <div className="erp-field erp-c12"><span className="erp-field-hint">Crie a operação para anexar instruções, normas e fichas.</span></div>
              ) : (
                <>
                  <div className="erp-field erp-c3"><label className="erp-label">Tipo</label>
                    <select className="erp-input" value={docForm.kind} onChange={(e) => setDocForm((d) => ({ ...d, kind: e.target.value as DocumentKind }))}>
                      {DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                    </select></div>
                  <div className="erp-field erp-c4"><label className="erp-label erp-req">Título</label>
                    <input className="erp-input" value={docForm.title} placeholder="Instrução de rebarbação"
                      onChange={(e) => setDocForm((d) => ({ ...d, title: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Referência</label>
                    <input className="erp-input" value={docForm.reference} placeholder="IT-REB-01 ou caminho/URL"
                      onChange={(e) => setDocForm((d) => ({ ...d, reference: e.target.value }))} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Rev.</label>
                    <input className="erp-input" value={docForm.revision} onChange={(e) => setDocForm((d) => ({ ...d, revision: e.target.value }))} /></div>
                  <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}>
                    <button className="erp-btn erp-btn-primary" onClick={() => void addDoc()} disabled={busy} title="Anexar documento">+</button></div>
                  <div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th>Tipo</th><th>Título</th><th>Referência</th><th>Rev.</th><th style={{ width: 90 }} /></tr></thead>
                      <tbody>
                        {docs.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum documento.</td></tr>}
                        {docs.map((d) => (
                          <tr key={d.id}>
                            <td>{DOCUMENT_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind}</td>
                            <td style={{ fontWeight: 600 }}>{d.title}</td><td>{d.reference || "—"}</td><td>{d.revision || "—"}</td>
                            <td><button className="erp-btn erp-btn-danger erp-btn-sm" disabled={busy}
                              onClick={() => d.id && void run(async () => { await removeOperationDocument(d.id!); setDocs(await listOperationDocuments(editId)); })}>Remover</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
