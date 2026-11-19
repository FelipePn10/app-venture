import { useCallback, useEffect, useMemo, useState } from "react";
import { type Project, SITUACAO_PROJETO, createProject, listProjects, updateProject } from "@/services/projectService";
import { LookupField } from "@/components/ui/LookupField";
import { ExportButton } from "@/components/ui/ExportButton";
import { loadCustomers } from "@/services/lookups";
import { Aviso, Cabecalho, Rodape, Selo, Vazio } from "./planUi";
import { data, normalizar } from "./planFormat";
import { useAcao } from "./planHooks";

/**
 * Projetos (VPLA0120): a obra, o contrato ou o desenvolvimento ao qual o
 * pedido de venda, a demanda independente e as ordens de fabricação
 * pertencem. O código é o que se digita no pedido e na demanda; a OF herda o
 * projeto da origem dela e as OFs dos componentes herdam da OF pai.
 */
type Filtro = "ATIVO" | "ENCERRADO" | "CANCELADO" | "todos";
const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "ATIVO", rotulo: "Ativos" }, { id: "ENCERRADO", rotulo: "Encerrados" }, { id: "CANCELADO", rotulo: "Cancelados" }, { id: "todos", rotulo: "Todos" },
];
const NOVO: Project = { code: "", name: "", status: "ATIVO" };

export function Vpla0120Page(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [projetos, setProjetos] = useState<Project[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("ATIVO");
  const [form, setForm] = useState<Project | null>(null);
  // Código com que o projeto foi aberto: a alteração acha o registro por ele (o código pode mudar).
  const [codigoAberto, setCodigoAberto] = useState<string | null>(null);

  const listar = useCallback(async () => { setProjetos(await listProjects()); }, []);
  useEffect(() => { void run(listar); }, [run, listar]);

  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    return projetos
      .filter((p) => filtro === "todos" || p.status === filtro)
      .filter((p) => !q || normalizar(`${p.code} ${p.name} ${p.customer_name ?? ""} ${p.customer_code ?? ""}`).includes(q));
  }, [projetos, busca, filtro]);
  const contagem = useMemo(() => {
    const c: Record<Filtro, number> = { ATIVO: 0, ENCERRADO: 0, CANCELADO: 0, todos: projetos.length };
    for (const p of projetos) c[p.status] += 1;
    return c;
  }, [projetos]);

  const abrir = (p: Project) => { setForm({ ...p }); setCodigoAberto(p.code); setFeedback(null); };
  const novo = () => { setForm({ ...NOVO }); setCodigoAberto(null); setFeedback(null); };
  const salvar = () => { if (!form) return; void run(async () => {
    if (!form.code.trim() || !form.name.trim()) { setFeedback({ type: "error", message: "Informe o código e o nome do projeto." }); return; }
    if (form.start_date && form.end_date && form.end_date < form.start_date) { setFeedback({ type: "error", message: "O término não pode ser antes do início." }); return; }
    const salvo = codigoAberto ? await updateProject(codigoAberto, form) : await createProject(form);
    await listar(); abrir(salvo);
    setFeedback({ type: "success", message: `Projeto ${salvo.code} ${codigoAberto ? "alterado" : "cadastrado"}.` });
  }); };

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Planejamento" titulo="Projetos" codigo="VPLA0120" />
      <div className="erp-toolbar vpl-toolbar">
        <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo projeto</button>
        <div className="erp-tgroup"><button className="erp-btn" onClick={() => void run(listar)} disabled={busy}>Atualizar</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPLA0120 — Projetos" filename="vpla0120" build={() => ({
          columns: ["Código", "Nome", "Cliente", "Situação", "Início", "Término", "OFs abertas", "OFs no total"],
          rows: visiveis.map((p) => [p.code, p.name, p.customer_name ?? "", SITUACAO_PROJETO[p.status].rotulo, data(p.start_date), data(p.end_date), String(p.open_orders ?? 0), String(p.total_orders ?? 0)]),
        })} /></div>
      </div>

      <div className="erp-content">
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Projetos</span><span className="erp-count">{visiveis.length}</span>
              <div className="erp-panel-head-spacer" />
              <input className="erp-search" placeholder="Código, nome ou cliente…" aria-label="Buscar projeto" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <div className="vpl-list-filters">
              {FILTROS.map((f) => <button key={f.id} type="button" className={`erp-chip${filtro === f.id ? " active" : ""}`} onClick={() => setFiltro(f.id)}>{f.rotulo} · {contagem[f.id]}</button>)}
            </div>
            <div className="erp-list">
              {visiveis.length === 0 && <div className="erp-list-empty">{projetos.length ? "Nenhum projeto com esse filtro." : "Nenhum projeto cadastrado ainda."}</div>}
              {visiveis.map((p) => {
                const s = SITUACAO_PROJETO[p.status];
                return (
                  <div key={p.code} className={`erp-list-row${codigoAberto === p.code ? " sel" : ""}`} onClick={() => abrir(p)} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") abrir(p); }}>
                    <span className="erp-list-code">{p.code}</span>
                    <span className="erp-list-sub">{p.name}</span>
                    <span className="vpl-list-row-right"><Selo tom={s.tom}>{s.rotulo}</Selo></span>
                    <div className="erp-list-meta" style={{ width: "100%" }}>
                      <span className="erp-text-muted" style={{ fontSize: 11.5 }}>{p.customer_name || "Sem cliente"}</span>
                      <span style={{ flex: 1 }} />
                      <span className="erp-text-muted" style={{ fontSize: 11.5 }} title="Ordens de fabricação abertas / no total">{p.open_orders ?? 0} OF aberta(s) · {p.total_orders ?? 0} no total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-detail-body">
              <Aviso feedback={feedback} busy={busy} />
              {!form ? (
                <Vazio titulo="Escolha um projeto na lista" texto="O projeto agrupa o pedido de venda, a demanda independente e as ordens de fabricação de uma obra, contrato ou desenvolvimento. A OF herda o projeto do pedido ou da demanda, e as OFs dos componentes herdam da OF pai — na VPRO0900 dá para buscar e acompanhar tudo pelo projeto."
                  acao={<button className="erp-btn erp-btn-primary" onClick={novo}>+ Novo projeto</button>} />
              ) : (<>
                <div className="erp-fieldset"><div className="erp-fieldset-head">{codigoAberto ? `Projeto ${codigoAberto}` : "Novo projeto"}</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="pj-cod">Código</label>
                      <input id="pj-cod" className="erp-input" maxLength={50} value={form.code} onChange={(e) => setForm((f) => f && ({ ...f, code: e.target.value }))} />
                      <span className="erp-hint">É o que se informa no pedido de venda e na demanda.</span></div>
                    <div className="erp-field erp-c9"><label className="erp-label erp-req" htmlFor="pj-nome">Nome</label>
                      <input id="pj-nome" className="erp-input" maxLength={200} value={form.name} onChange={(e) => setForm((f) => f && ({ ...f, name: e.target.value }))} /></div>
                    <div className="erp-field erp-c6"><label className="erp-label">Cliente</label>
                      <LookupField value={form.customer_code || undefined} loader={loadCustomers} entityLabel="cliente" clearable placeholder="Projeto interno (sem cliente)"
                        onChange={(c) => setForm((f) => f && ({ ...f, customer_code: c ? Number(c) : null }))} />
                      <span className="erp-hint">A OF ligada ao projeto leva este cliente quando não tem outro.</span></div>
                    <div className="erp-field erp-c6"><label className="erp-label" htmlFor="pj-sit">Situação</label>
                      <select id="pj-sit" className="erp-input" value={form.status} onChange={(e) => setForm((f) => f && ({ ...f, status: e.target.value as Project["status"] }))}>
                        <option value="ATIVO">Ativo</option><option value="ENCERRADO">Encerrado</option><option value="CANCELADO">Cancelado</option>
                      </select>
                      <span className="erp-hint">Encerrado ou cancelado não recebe OF nova; as que já estão ligadas continuam.</span></div>
                    <div className="erp-field erp-c3"><label className="erp-label" htmlFor="pj-ini">Início</label>
                      <input id="pj-ini" className="erp-input" type="date" value={form.start_date ?? ""} onChange={(e) => setForm((f) => f && ({ ...f, start_date: e.target.value || undefined }))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label" htmlFor="pj-fim">Término</label>
                      <input id="pj-fim" className="erp-input" type="date" value={form.end_date ?? ""} onChange={(e) => setForm((f) => f && ({ ...f, end_date: e.target.value || undefined }))} /></div>
                    <div className="erp-field erp-c12"><label className="erp-label" htmlFor="pj-obs">Observações</label>
                      <textarea id="pj-obs" className="erp-input" rows={3} value={form.notes ?? ""} onChange={(e) => setForm((f) => f && ({ ...f, notes: e.target.value }))} /></div>
                    <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                      <button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>{codigoAberto ? "Salvar alterações" : "Cadastrar projeto"}</button>
                      <button className="erp-btn" onClick={() => { setForm(null); setCodigoAberto(null); }} disabled={busy}>Fechar</button>
                    </div>
                  </div>
                </div>
                {codigoAberto && <p className="erp-note">Ordens de fabricação deste projeto: <strong>{form.open_orders ?? 0}</strong> aberta(s) de <strong>{form.total_orders ?? 0}</strong>. Para vê-las, busque <strong>{form.code}</strong> na VPRO0900.</p>}
              </>)}
            </div>
          </section>
        </div>
      </div>
      <Rodape>
        <div className="erp-status-item">Projetos: <strong>{projetos.length}</strong></div>
        <div className="erp-status-item">Ativos: <strong>{contagem.ATIVO}</strong></div>
      </Rodape>
    </div>
  );
}
