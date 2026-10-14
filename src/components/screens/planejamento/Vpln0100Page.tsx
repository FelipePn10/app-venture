import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AutoRunSettings, type PipelineResult, type PlanningParam, type PlanningRun,
  getAutoRunSettings, listPlanningParams, listPlanningRuns, runAutoRunNow, runPipeline, updateAutoRunSettings, updatePlanningParam,
} from "@/services/planningService";
import { type ProductionPlanDTO, listProductionPlans } from "@/services/productionPlanService";
import { ExportButton } from "@/components/ui/ExportButton";
import { type Aba, Abas, Aviso, Cabecalho, Painel, Rodape, Selo, Vazio } from "./planUi";
import { type Tom, dataHora, duracao, normalizar, num } from "./planFormat";
import { useAcao } from "./planHooks";
import { CenariosTab } from "./pln/CenariosTab";

/**
 * Pipeline de planejamento: MRP → CRP → APS num disparo, e os parâmetros que o
 * planejamento usa.
 *
 * O resultado era um dump do JSON da API; agora cada etapa mostra o que fez e o
 * parecer de viabilidade vem em destaque. Os parâmetros só apareciam depois de
 * "Carregar" e eram editados digitando o número num campo à parte — agora a
 * lista abre carregada e cada linha se edita no lugar.
 */
type AbaPln = "executar" | "automatica" | "cenarios" | "parametros";
type Rodada = PipelineResult & { quando: string; plano: number };

/** Parâmetro de sim/não: o catálogo usa S/N. */
const ehSimNao = (v: string) => /^(S|N)$/i.test(v.trim());

const SITUACAO_RODADA: Record<string, { rotulo: string; tom: Tom }> = {
  RUNNING: { rotulo: "Em andamento", tom: "info" },
  SUCCESS: { rotulo: "Concluída", tom: "ok" },
  FAILED: { rotulo: "Falhou", tom: "danger" },
  SKIPPED: { rotulo: "Pulada", tom: "warn" },
};
const situacaoRodada = (s?: string) => (s ? SITUACAO_RODADA[s] ?? { rotulo: s, tom: "muted" as Tom } : { rotulo: "—", tom: "muted" as Tom });
const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** Formulário da janela noturna: a hora vai como "HH:MM" no campo de horário. */
type FormAuto = { ligada: boolean; horario: string; plano?: number; ordemInicial: string; llc: boolean };
const formDe = (s: AutoRunSettings): FormAuto => ({
  ligada: s.is_enabled, horario: `${doisDigitos(s.run_hour)}:${doisDigitos(s.run_minute)}`,
  plano: s.plan_code, ordemInicial: String(s.initial_order_number), llc: s.generate_llc,
});

/** Minutos entre o início e o fim de uma rodada (vazio enquanto roda). */
function minutosDe(r: PlanningRun): number | undefined {
  if (!r.started_at || !r.finished_at) return undefined;
  return Math.max(0, (new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 60000);
}

/** Datetime-local no fuso do usuário, "agora". */
function agoraLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function Vpln0100Page(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [aba, setAba] = useState<AbaPln>("executar");
  const [planos, setPlanos] = useState<ProductionPlanDTO[]>([]);
  const [plano, setPlano] = useState<number | undefined>();
  const [ordemInicial, setOrdemInicial] = useState("");
  const [inicio, setInicio] = useState(agoraLocal);
  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [params, setParams] = useState<PlanningParam[]>([]);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Record<number, string>>({});
  const [auto, setAuto] = useState<AutoRunSettings | undefined>();
  const [form, setForm] = useState<FormAuto | undefined>();
  const [historico, setHistorico] = useState<PlanningRun[]>([]);

  const carregarParams = useCallback(async () => { setParams(await listPlanningParams()); }, []);
  const carregarAuto = useCallback(async () => {
    const [s, h] = await Promise.all([getAutoRunSettings(), listPlanningRuns()]);
    setAuto(s); setForm(formDe(s)); setHistorico(h);
  }, []);
  useEffect(() => {
    void run(async () => {
      const [l] = await Promise.all([listProductionPlans(), carregarParams(), carregarAuto()]);
      setPlanos(l);
      setPlano((p) => p ?? (l.find((x) => x.is_active) ?? l[0])?.code);
    });
  }, [run, carregarParams, carregarAuto]);

  const alterouAuto = !!auto && !!form && JSON.stringify(formDe(auto)) !== JSON.stringify(form);
  const salvarAuto = () => run(async () => {
    if (!form) return;
    // Campo apagado vem vazio: "".split(":") dava hora 0 e minuto undefined, e
    // a janela era salva à meia-noite sem aviso.
    const hm = /^(\d{1,2}):(\d{2})$/.exec(form.horario.trim());
    const h = hm ? Number(hm[1]) : NaN, m = hm ? Number(hm[2]) : NaN;
    if (!hm || h > 23 || m > 59) { setFeedback({ type: "error", message: "Informe o horário da execução (hora e minuto)." }); return; }
    if (form.ligada && !form.plano) { setFeedback({ type: "error", message: "Escolha o plano que a execução automática vai calcular." }); return; }
    const s = await updateAutoRunSettings({
      is_enabled: form.ligada, run_hour: h, run_minute: m, plan_code: form.plano,
      initial_order_number: Math.max(1, Number(form.ordemInicial) || 1), generate_llc: form.llc,
    });
    setAuto(s); setForm(formDe(s));
    setFeedback({ type: "success", message: s.is_enabled ? `Execução automática ligada: todo dia às ${form.horario}, plano ${s.plan_code}.` : "Execução automática desligada." });
  });
  const rodarAgora = () => run(async () => {
    const r = await runAutoRunNow();
    await carregarAuto();
    setFeedback(r.viable ? { type: "success", message: `Rodada concluída: ${r.mrp_orders} ordem(ns), plano viável.` } : { type: "info", message: `Rodada concluída: ${r.mrp_orders} ordem(ns), ${r.crp_overload} sobrecarga(s) — plano inviável.` });
  });
  const falhasRecentes = historico.slice(0, 5).filter((r) => r.status === "FAILED").length;

  const rodar = () => run(async () => {
    if (!plano) { setFeedback({ type: "error", message: "Escolha o plano." }); return; }
    const r = await runPipeline(plano, Number(ordemInicial) || 10000, true, inicio ? new Date(inicio).toISOString() : undefined);
    setRodadas((rs) => [{ ...r, quando: new Date().toISOString(), plano }, ...rs].slice(0, 10));
    setFeedback(r.viable ? { type: "success", message: `Plano ${plano} viável.` } : { type: "info", message: `Plano ${plano} inviável — veja os pareceres abaixo.` });
  });

  const salvar = (p: PlanningParam) => run(async () => {
    const valor = editando[p.param_number];
    if (valor === undefined) return;
    await updatePlanningParam(p.param_number, valor);
    await carregarParams();
    setEditando((e) => { const n = { ...e }; delete n[p.param_number]; return n; });
    setFeedback({ type: "success", message: `Parâmetro ${p.param_number} atualizado.` });
  });

  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    return params.filter((p) => !q || normalizar(`${p.param_number} ${p.param_key ?? ""} ${p.description ?? ""} ${p.value}`).includes(q));
  }, [params, busca]);
  const ultima = rodadas[0];

  const ABAS: Aba<AbaPln>[] = [
    { id: "executar", label: "Executar pipeline", hint: "Roda MRP, CRP e APS em sequência e dá o parecer de viabilidade" },
    { id: "automatica", label: "Execução automática", contador: historico.length || undefined, alerta: falhasRecentes > 0,
      hint: "Janela noturna: o planejamento roda sozinho todo dia e guarda o histórico de cada rodada" },
    { id: "cenarios", label: "Cenários", hint: "Simule mudanças de demanda, estoque, prazo e capacidade sem tocar no plano real" },
    { id: "parametros", label: "Parâmetros de planejamento", contador: params.length, hint: "Valores usados pelo MRP e pelo planejamento" },
  ];

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Planejamento" titulo="Pipeline de Planejamento (MRP → CRP → APS)" codigo="VPLN0100"
        meta={ultima ? (ultima.viable ? "Último resultado: viável" : "Último resultado: inviável") : undefined} />

      <div className="erp-toolbar vpl-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Plano</span>
          <select className="erp-tselect" style={{ width: 240 }} aria-label="Plano" value={plano ?? ""} onChange={(e) => setPlano(Number(e.target.value) || undefined)}>
            {planos.length === 0 && <option value="">Nenhum plano</option>}
            {planos.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
          </select>
          <button className="erp-btn erp-btn-primary" onClick={() => void rodar()} disabled={busy || !plano}>{busy && <span className="erp-spin" />}Rodar pipeline</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPLN0100 — Pipeline de Planejamento" filename="vpln0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <Abas abas={ABAS} ativa={aba} onChange={setAba} />
          <div className="erp-detail-body">
            <Aviso feedback={feedback} busy={busy} />

            {aba === "executar" && (<>
              <Painel titulo="Execução" sub="as três etapas rodam em sequência sobre o mesmo plano">
                <div className="vpl-filters">
                  <div className="erp-field"><label className="erp-label" htmlFor="pln-ordem">Nº inicial das ordens</label>
                    <input id="pln-ordem" className="erp-input num" type="number" min={1} placeholder="10000" value={ordemInicial} onChange={(e) => setOrdemInicial(e.target.value)} /></div>
                  <div className="erp-field"><label className="erp-label" htmlFor="pln-inicio">Sequenciar a partir de</label>
                    <input id="pln-inicio" className="erp-input" type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
                  <button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-end" }} onClick={() => void rodar()} disabled={busy || !plano}>Rodar pipeline</button>
                </div>
              </Painel>

              {!ultima ? (
                <Painel titulo="Resultado"><Vazio titulo="O pipeline ainda não rodou nesta sessão" texto="Escolha o plano e clique em Rodar pipeline. O resultado mostra o que cada etapa fez e se o plano cabe na capacidade." /></Painel>
              ) : (<>
                <Painel titulo={`Resultado do plano ${ultima.plano}`} sub={dataHora(ultima.quando)}
                  acoes={ultima.viable ? <Selo tom="ok">Viável</Selo> : <Selo tom="danger">Inviável</Selo>}>
                  <div className="vpl-kpis">
                    <div className="vpl-kpi"><div className="vpl-kpi-label">1 · MRP</div><div className="vpl-kpi-value">{num(ultima.mrp_orders, 0)} ordem(ns)</div>
                      <div className="vpl-kpi-hint">{num(ultima.mrp_items, 0)} item(ns) · {ultima.mrp_status === "COMPLETED" ? "concluído" : ultima.mrp_status === "COMPLETED_WITH_ERRORS" ? "concluído com erros" : ultima.mrp_status ?? "—"}</div></div>
                    <div className={`vpl-kpi${ultima.crp_overload ? " danger" : ""}`}><div className="vpl-kpi-label">2 · CRP</div><div className="vpl-kpi-value">{num(ultima.crp_overload, 0)} sobrecarga(s)</div>
                      <div className="vpl-kpi-hint">{num(ultima.crp_entries, 0)} registro(s) de carga</div></div>
                    <div className="vpl-kpi"><div className="vpl-kpi-label">3 · APS</div><div className="vpl-kpi-value">{num(ultima.aps_operations, 0)} operação(ões)</div>
                      <div className="vpl-kpi-hint">{num(ultima.aps_orders, 0)} ordem(ns) sequenciada(s)</div></div>
                  </div>
                  {ultima.notes.length > 0 && (
                    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                      {ultima.notes.map((n, i) => <p key={i} className="erp-note" style={{ margin: 0 }}>{n}</p>)}
                    </div>
                  )}
                </Painel>
                {rodadas.length > 1 && (
                  <Painel titulo="Rodadas desta sessão" flush>
                    <table className="erp-grid">
                      <thead><tr><th>Quando</th><th>Plano</th><th className="num">Ordens (MRP)</th><th className="num">Sobrecargas (CRP)</th><th className="num">Operações (APS)</th><th>Parecer</th></tr></thead>
                      <tbody>{rodadas.map((r, i) => (
                        <tr key={i}><td>{dataHora(r.quando)}</td><td>{r.plano}</td><td className="num">{r.mrp_orders}</td><td className="num">{r.crp_overload}</td><td className="num">{r.aps_operations}</td>
                          <td>{r.viable ? <Selo tom="ok">Viável</Selo> : <Selo tom="danger">Inviável</Selo>}</td></tr>
                      ))}</tbody>
                    </table>
                  </Painel>
                )}
              </>)}
            </>)}

            {aba === "automatica" && form && (<>
              <Painel titulo="Janela noturna" sub="o MRP → CRP → APS roda sozinho, todo dia, na hora da empresa"
                acoes={auto?.is_enabled ? <Selo tom="ok">Ligada</Selo> : <Selo>Desligada</Selo>}>
                <div className="vpl-filters">
                  <label className="erp-field" style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-end" }}>
                    <input type="checkbox" aria-label="Ligar execução automática" checked={form.ligada} onChange={(e) => setForm({ ...form, ligada: e.target.checked })} />
                    <span>Rodar automaticamente</span>
                  </label>
                  <div className="erp-field"><label className="erp-label" htmlFor="auto-hora">Horário</label>
                    <input id="auto-hora" className="erp-input" type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} /></div>
                  <div className="erp-field"><label className="erp-label" htmlFor="auto-plano">Plano</label>
                    <select id="auto-plano" className="erp-input" style={{ minWidth: 220 }} value={form.plano ?? ""} onChange={(e) => setForm({ ...form, plano: Number(e.target.value) || undefined })}>
                      <option value="">Escolha o plano</option>
                      {planos.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
                    </select></div>
                  <div className="erp-field"><label className="erp-label" htmlFor="auto-ordem">Nº inicial das ordens</label>
                    <input id="auto-ordem" className="erp-input num" type="number" min={1} value={form.ordemInicial} onChange={(e) => setForm({ ...form, ordemInicial: e.target.value })} /></div>
                  <label className="erp-field" style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-end" }}>
                    <input type="checkbox" aria-label="Recalcular níveis da estrutura" checked={form.llc} onChange={(e) => setForm({ ...form, llc: e.target.checked })} />
                    <span>Recalcular níveis da estrutura</span>
                  </label>
                  <div style={{ display: "flex", gap: 8, alignSelf: "flex-end" }}>
                    {alterouAuto && <button className="erp-btn" onClick={() => auto && setForm(formDe(auto))} disabled={busy}>Desfazer</button>}
                    <button className="erp-btn erp-btn-primary" onClick={() => void salvarAuto()} disabled={busy || !alterouAuto}>Salvar</button>
                  </div>
                </div>
                <p className="erp-note" style={{ marginTop: 12 }}>
                  A rodada noturna grava as ordens planejadas em nome de quem salvou esta configuração. Números de ordem já usados são pulados —
                  o número inicial só define de onde a contagem começa.
                </p>
              </Painel>

              <Painel titulo="Situação" acoes={
                <button className="erp-btn" onClick={() => void rodarAgora()} disabled={busy || !auto?.plan_code || alterouAuto}
                  title={alterouAuto ? "Salve a configuração antes de rodar" : !auto?.plan_code ? "Escolha e salve o plano primeiro" : "Roda agora com a configuração salva"}>
                  {busy && <span className="erp-spin" />}Rodar agora</button>}>
                <div className="vpl-kpis">
                  <div className="vpl-kpi"><div className="vpl-kpi-label">Próxima rodada</div>
                    <div className="vpl-kpi-value">{auto?.is_enabled ? `Todo dia às ${doisDigitos(auto.run_hour)}:${doisDigitos(auto.run_minute)}` : "Desligada"}</div>
                    <div className="vpl-kpi-hint">{auto?.plan_code ? `plano ${auto.plan_code}` : "nenhum plano escolhido"}</div></div>
                  <div className={`vpl-kpi${auto?.last_run_status === "FAILED" ? " danger" : ""}`}><div className="vpl-kpi-label">Última rodada</div>
                    <div className="vpl-kpi-value">{auto?.last_run_at ? dataHora(auto.last_run_at) : "Nunca rodou"}</div>
                    <div className="vpl-kpi-hint">{auto?.last_run_status ? situacaoRodada(auto.last_run_status).rotulo : "—"}</div></div>
                  <div className="vpl-kpi"><div className="vpl-kpi-label">Dados lidos até</div>
                    <div className="vpl-kpi-value">{auto?.last_snapshot_at ? dataHora(auto.last_snapshot_at) : "—"}</div>
                    <div className="vpl-kpi-hint">o que mudou depois entra na próxima rodada</div></div>
                </div>
              </Painel>

              <Painel titulo="Histórico de execuções" sub={`últimas ${historico.length}`} flush>
                {historico.length === 0 ? <Vazio titulo="Nenhuma execução registrada" texto="As rodadas da janela noturna e as disparadas por Rodar agora aparecem aqui." /> : (
                  <table className="erp-grid">
                    <thead><tr><th>Início</th><th>Origem</th><th>Plano</th><th>Situação</th><th className="num">Itens alterados</th><th className="num">Ordens (MRP)</th><th className="num">Sobrecargas (CRP)</th><th>Parecer</th><th className="num">Duração</th><th>Observação</th></tr></thead>
                    <tbody>{historico.map((r) => {
                      const sit = situacaoRodada(r.status);
                      const min = minutosDe(r);
                      return (
                        <tr key={r.id}>
                          <td>{dataHora(r.started_at)}</td>
                          <td>{r.trigger === "AUTOMATICO" ? "Automática" : "Manual"}{r.triggered_by_name && <span className="vpl-sub">{r.triggered_by_name}</span>}</td>
                          <td>{r.plan_code}</td>
                          <td><Selo tom={sit.tom}>{sit.rotulo}</Selo></td>
                          <td className="num">{r.changed_items}</td>
                          <td className="num">{r.mrp_orders}</td>
                          <td className="num">{r.crp_overload}</td>
                          <td>{r.viable === undefined ? "—" : r.viable ? <Selo tom="ok">Viável</Selo> : <Selo tom="danger">Inviável</Selo>}</td>
                          <td className="num">{min === undefined ? "—" : min < 1 ? "< 1 min" : duracao(min)}</td>
                          <td className="erp-text-muted" style={{ maxWidth: 360 }}>{r.notes ?? ""}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                )}
              </Painel>
            </>)}

            {aba === "cenarios" && <CenariosTab planos={planos} planoAtual={plano} busy={busy} run={run} setFeedback={setFeedback} />}

            {aba === "parametros" && (<>
              <Painel titulo="Filtro">
                <div className="vpl-filters">
                  <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="pr-busca">Número, nome ou descrição</label>
                    <input id="pr-busca" className="erp-input" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
                </div>
              </Painel>
              <Painel titulo="Parâmetros de planejamento" sub={`${visiveis.length} de ${params.length}`} flush>
                {params.length === 0 ? <Vazio titulo="A empresa não tem parâmetros de planejamento" /> : (
                  <table className="erp-grid">
                    <thead><tr><th className="num">Nº</th><th>Parâmetro</th><th style={{ width: 260 }}>Valor</th><th>Última alteração</th><th /></tr></thead>
                    <tbody>{visiveis.map((p) => {
                      const valor = editando[p.param_number];
                      const alterado = valor !== undefined && valor !== p.value;
                      return (
                        <tr key={p.param_number}>
                          <td className="num">{p.param_number}</td>
                          <td className="vpl-strong">{p.description ?? p.param_key}{p.param_key && <span className="vpl-sub">{p.param_key}</span>}</td>
                          <td>{ehSimNao(p.value)
                            ? <select className="erp-cell-input" aria-label={`Valor do parâmetro ${p.param_number}`} value={(valor ?? p.value).toUpperCase()} onChange={(e) => setEditando((x) => ({ ...x, [p.param_number]: e.target.value }))}>
                                <option value="S">Sim</option><option value="N">Não</option></select>
                            : <input className="erp-cell-input" aria-label={`Valor do parâmetro ${p.param_number}`} value={valor ?? p.value} onChange={(e) => setEditando((x) => ({ ...x, [p.param_number]: e.target.value }))} />}</td>
                          <td className="erp-text-muted">{p.updated_at ? dataHora(p.updated_at) : "—"}</td>
                          <td className="vpl-actions">{alterado && <>
                            <button className="erp-btn erp-btn-sm" onClick={() => setEditando((e) => { const n = { ...e }; delete n[p.param_number]; return n; })} disabled={busy}>Desfazer</button>
                            <button className="erp-btn erp-btn-sm erp-btn-primary" onClick={() => void salvar(p)} disabled={busy}>Salvar</button>
                          </>}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                )}
              </Painel>
              <p className="erp-note">Os parâmetros valem para todos os planos da empresa. Mudar um parâmetro só afeta o próximo cálculo do MRP — rode o plano de novo para ver o efeito.</p>
            </>)}
          </div>
        </section>
      </div>

      <Rodape>
        <div className="erp-status-item">Plano: <strong>{plano ?? "—"}</strong></div>
        <div className="erp-status-item">Parâmetros: <strong>{params.length}</strong></div>
      </Rodape>
    </div>
  );
}
