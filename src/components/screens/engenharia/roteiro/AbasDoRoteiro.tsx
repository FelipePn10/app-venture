import { useCallback, useEffect, useState } from "react";
import {
  type EdgeDTO, type RouteDetail, type RouteOperationDTO, type RouteMaterialDTO, type StepPerformanceDTO, type OperationDTO, type TimeUnit,
  createEdge, deleteEdge, listRouteMaterials, setRouteMaterialStep, getRoutePerformance, updateRouteOperation, horasNaUnidade,
} from "@/services/manufacturingRoutingService";
import { errMessage } from "@/services/fiscalShared";
import { type Feedback, duracao, num, payloadDaEtapa, rotuloUnidade } from "./roteiroUtils";

const rotulo = (ro?: RouteOperationDTO) => (ro ? `${ro.sequence} · ${ro.operation_name}` : "—");

// ════════════════════════════════════════════════════════════════════════════
// Dependências
// ════════════════════════════════════════════════════════════════════════════

/**
 * O que depende de quê. Sem nenhuma dependência as etapas seguem a sequência;
 * com a rede dá para rodar em paralelo (pintar a porta enquanto a carcaça é
 * soldada) e sobrepor (a peça vai saindo da máquina e já segue).
 */
export function RedeDeDependencias({ detail, etapas, recarregar, setFeedback }: {
  detail: RouteDetail; etapas: RouteOperationDTO[]; recarregar: () => Promise<void>; setFeedback: (f: Feedback) => void;
}): JSX.Element {
  const vazia: EdgeDTO = { predecessor_id: 0, successor_id: 0, overlap_pct: 0 };
  const [form, setForm] = useState<EdgeDTO>(vazia);
  const [busy, setBusy] = useState(false);
  const routeId = detail.route.id!;
  const porId = (id: number) => etapas.find((e) => e.id === id);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  };

  // Etapas sem predecessora e sem sucessora: com rede, elas ficam soltas e
  // começam junto com a ordem — normalmente é esquecimento.
  const soltas = detail.edges.length === 0 ? [] : etapas.filter((e) =>
    !detail.edges.some((ed) => ed.predecessor_id === e.id || ed.successor_id === e.id));

  return (
    <>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Nova dependência</div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c4"><label className="erp-label erp-req">Esta etapa…</label>
            <select className="erp-input" value={form.predecessor_id} onChange={(e) => setForm((f) => ({ ...f, predecessor_id: Number(e.target.value) }))}>
              <option value={0}>— escolha —</option>
              {etapas.map((ro) => <option key={ro.id} value={ro.id}>{rotulo(ro)}</option>)}
            </select></div>
          <div className="erp-field erp-c4"><label className="erp-label erp-req">…precisa vir antes desta</label>
            <select className="erp-input" value={form.successor_id} onChange={(e) => setForm((f) => ({ ...f, successor_id: Number(e.target.value) }))}>
              <option value={0}>— escolha —</option>
              {etapas.filter((ro) => ro.id !== form.predecessor_id).map((ro) => <option key={ro.id} value={ro.id}>{rotulo(ro)}</option>)}
            </select></div>
          <div className="erp-field erp-c2"><label className="erp-label">Sobreposição (%)</label>
            <input className="erp-input num" type="number" min={0} max={100} value={form.overlap_pct}
              onChange={(e) => setForm((f) => ({ ...f, overlap_pct: Number(e.target.value) }))} />
            <span className="erp-field-hint">0 = espera terminar.</span></div>
          <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
            <button className="erp-btn erp-btn-primary" disabled={busy} onClick={() => void run(async () => {
              if (!form.predecessor_id || !form.successor_id) { setFeedback({ type: "error", message: "Escolha as duas etapas." }); return; }
              await createEdge(routeId, form); setForm(vazia); await recarregar();
              setFeedback({ type: "success", message: "Dependência criada." });
            })}>+ Dependência</button></div>
          <div className="erp-field erp-c12"><span className="erp-field-hint">
            A sobreposição só vale em centro automático: onde o operador fica na máquina até o fim, o cálculo a ignora.
            Ciclo (A depende de B que depende de A) é recusado.
          </span></div>
        </div>
      </div>

      {soltas.length > 0 && (
        <div className="fsc-rot-prontidao atencao">
          <strong>Etapas fora da rede</strong>
          <span>{soltas.map(rotulo).join(", ")} não dependem de nenhuma etapa nem são pré-requisito de nenhuma: com rede cadastrada, elas começam junto com a ordem.</span>
        </div>
      )}

      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Rede — <span style={{ fontWeight: 400, opacity: .65 }}>
          {detail.edges.length === 0 ? "sem dependências: as etapas seguem a sequência (10 → 20 → 30)" : `${detail.edges.length} dependência(s)`}
        </span></div>
        <div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Antes</th><th style={{ width: 40 }} /><th>Depois</th><th className="num">Sobreposição</th><th style={{ width: 90 }} /></tr></thead>
            <tbody>
              {detail.edges.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma dependência.</td></tr>}
              {detail.edges.map((ed, i) => (
                <tr key={ed.id ?? i}>
                  <td>{rotulo(porId(ed.predecessor_id))}</td><td style={{ textAlign: "center" }}>→</td><td>{rotulo(porId(ed.successor_id))}</td>
                  <td className="num">{ed.overlap_pct ? `${num(ed.overlap_pct)}%` : "—"}</td>
                  <td><button className="erp-btn erp-btn-danger erp-btn-sm" disabled={busy}
                    onClick={() => void run(async () => { await deleteEdge(routeId, ed); await recarregar(); })}>Remover</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Materiais por etapa
// ════════════════════════════════════════════════════════════════════════════

/**
 * Em que etapa cada componente da estrutura entra. O MRP passa a pedir o
 * componente para quando a etapa começa — a ferragem da montagem não precisa
 * estar na fábrica no dia do corte. Vazio = no início da ordem (como sempre).
 */
export function MateriaisPorEtapa({ routeId, etapas, setFeedback }: { routeId: number; etapas: RouteOperationDTO[]; setFeedback: (f: Feedback) => void }): JSX.Element {
  const [lista, setLista] = useState<RouteMaterialDTO[]>([]);
  const [carregando, setCarregando] = useState(true);
  const carregar = useCallback(async () => {
    setCarregando(true);
    try { setLista(await listRouteMaterials(routeId)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setCarregando(false); }
  }, [routeId, setFeedback]);
  useEffect(() => { void carregar(); }, [carregar]);

  const gravar = async (m: RouteMaterialDTO, seq: number | null) => {
    try {
      await setRouteMaterialStep(routeId, m.structure_id, seq);
      setLista((l) => l.map((x) => (x.structure_id === m.structure_id ? { ...x, step_sequence: seq ?? undefined, step_missing: false, step_name: etapas.find((e) => e.sequence === seq)?.operation_name } : x)));
      setFeedback({ type: "success", message: seq ? `${m.child_code} entra na etapa ${seq}.` : `${m.child_code} entra no início da ordem.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
  };

  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Componentes da estrutura — <span style={{ fontWeight: 400, opacity: .65 }}>em que etapa cada um é consumido</span></div>
      <div className="erp-fieldset-body"><div className="erp-field erp-c12">
        <p className="erp-note" style={{ marginTop: 0 }}>
          O planejamento pede o componente para o <strong>início da etapa</strong> escolhida (contado no caminho crítico),
          e a ordem de produção guarda a etapa de cada material. A estrutura continua sendo editada na VENT0210; aqui só se diz <em>quando</em> cada item entra.
        </p>
        <table className="erp-grid">
          <thead><tr><th>Componente</th><th className="num">Qtd</th><th>Un.</th><th style={{ width: 320 }}>Entra na etapa</th></tr></thead>
          <tbody>
            {carregando && <tr><td colSpan={4} className="erp-grid-empty">Carregando…</td></tr>}
            {!carregando && lista.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">O item não tem estrutura cadastrada (VENT0210).</td></tr>}
            {lista.filter((m) => !m.is_coproduct).map((m) => (
              <tr key={m.structure_id}>
                <td><strong>{m.child_code}</strong> {m.child_name}{m.parent_mask ? <span className="erp-badge erp-badge-gray" style={{ marginLeft: 6 }}>máscara {m.parent_mask}</span> : null}</td>
                <td className="num">{num(m.quantity)}</td><td>{m.unit}</td>
                <td>
                  <select className="erp-input" value={m.step_sequence ?? ""} onChange={(e) => void gravar(m, e.target.value ? Number(e.target.value) : null)}
                    aria-label={`Etapa do componente ${m.child_code}`}>
                    <option value="">No início da ordem</option>
                    {etapas.map((ro) => <option key={ro.id} value={ro.sequence}>{rotulo(ro)}</option>)}
                    {m.step_missing && m.step_sequence && <option value={m.step_sequence}>{m.step_sequence} · (etapa não existe neste roteiro)</option>}
                  </select>
                  {m.step_missing && <span className="erp-field-hint" style={{ color: "var(--v-warn)" }}>A etapa {m.step_sequence} não existe aqui: o planejamento pede no início da ordem.</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Padrão × real
// ════════════════════════════════════════════════════════════════════════════

/**
 * O tempo padrão envelhece sem ninguém ver: a máquina ficou mais rápida, o
 * operador novo é mais lento, o material mudou. Aqui o roteiro se compara com
 * o que as ordens concluídas apontaram e sugere o tempo que reproduz o real.
 */
export function PadraoVersusReal({ etapas, ops, routeId, recarregar, setFeedback }: {
  etapas: RouteOperationDTO[]; ops: OperationDTO[]; routeId: number; recarregar: () => Promise<void>; setFeedback: (f: Feedback) => void;
}): JSX.Element {
  const [dias, setDias] = useState(180);
  const [lista, setLista] = useState<StepPerformanceDTO[]>([]);
  const [carregando, setCarregando] = useState(true);
  const carregar = useCallback(async () => {
    setCarregando(true);
    try { setLista(await getRoutePerformance(routeId, dias)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setCarregando(false); }
  }, [routeId, dias, setFeedback]);
  useEffect(() => { void carregar(); }, [carregar]);

  const aplicar = async (p: StepPerformanceDTO) => {
    const ro = etapas.find((e) => e.id === p.route_operation_id);
    if (!ro?.id || p.suggested_run_hours === undefined) return;
    const unidade = (ro.time_unit ?? ops.find((o) => o.id === ro.operation_id)?.time_unit ?? "HORA") as TimeUnit;
    const novo = Math.round(horasNaUnidade(p.suggested_run_hours, unidade) * 10000) / 10000;
    try {
      await updateRouteOperation(routeId, ro.id, { ...payloadDaEtapa(ro), run_time: novo, time_unit: unidade });
      await recarregar(); await carregar();
      setFeedback({ type: "success", message: `Etapa ${ro.sequence}: tempo de máquina passa a ${num(novo)} ${rotuloUnidade(unidade)} por ciclo.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
  };

  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Tempo padrão × apontado nas ordens concluídas</div>
      <div className="erp-fieldset-body">
        <div className="erp-field erp-c3"><label className="erp-label">Período</label>
          <select className="erp-input" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
            <option value={90}>Últimos 90 dias</option><option value={180}>Últimos 180 dias</option><option value={365}>Último ano</option>
          </select></div>
        <div className="erp-field erp-c9"><span className="erp-field-hint">
          Compara o apontado com o que o padrão de hoje prevê para as mesmas peças. Sugestão só com 3 ordens ou mais e diferença acima de 10%; depois de aplicada, ela some.
          A preparação é descontada pelo valor padrão: o apontamento não a separa da produção.
        </span></div>
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr>
              <th>Etapa</th><th className="num">Ordens</th><th className="num" title="O que o tempo padrão de hoje prevê para as peças apontadas">Padrão atual</th><th className="num">Apontado</th>
              <th className="num">Desvio</th><th className="num">Real / peça</th><th>Sugestão</th>
            </tr></thead>
            <tbody>
              {carregando && <tr><td colSpan={7} className="erp-grid-empty">Carregando…</td></tr>}
              {!carregando && lista.map((p) => {
                const alto = Math.abs(p.deviation_pct) >= 10 && p.orders > 0;
                return (
                  <tr key={p.route_operation_id}>
                    <td><strong>{p.sequence}</strong> · {p.operation_name}</td>
                    <td className="num">{p.orders || "—"}</td>
                    <td className="num">{p.orders ? duracao(p.planned_hours) : "—"}</td>
                    <td className="num">{p.orders ? duracao(p.actual_hours) : "—"}</td>
                    <td className="num" style={alto ? { color: p.deviation_pct > 0 ? "var(--v-err)" : "var(--v-ok)", fontWeight: 700 } : undefined}>
                      {p.orders ? `${p.deviation_pct > 0 ? "+" : ""}${num(p.deviation_pct, 1)}%` : "—"}</td>
                    <td className="num">{p.orders ? duracao(p.actual_hours_per_piece) : "—"}</td>
                    <td>
                      {p.suggested_run_hours !== undefined
                        ? <>{duracao(p.current_run_hours)} → <strong>{duracao(p.suggested_run_hours)}</strong> por ciclo{" "}
                          <button className="erp-btn erp-btn-primary erp-btn-sm" onClick={() => void aplicar(p)}>Aplicar</button></>
                        : <span className="erp-field-hint">{p.reason}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
