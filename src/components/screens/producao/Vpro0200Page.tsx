import { useCallback, useEffect, useMemo, useState } from "react";
import { type CrpEntry, type CrpPlanOption, calculateCrp, listCrpPlan, listCrpPlans } from "@/services/crpService";
import { ExportButton } from "@/components/ui/ExportButton";
import { loadWorkCenters } from "@/services/lookups";
import { CrpCargaChart } from "./crp/CrpCargaChart";
import { type Aba, Abas, Aviso, Cabecalho, Kpis, Painel, Progresso, Rodape, Selo, Vazio } from "../planejamento/planUi";
import { data, dataHora, horas, num, pct } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";

/**
 * CRP — Capacity Requirements Planning: quanto de máquina o plano pede, por
 * centro e por dia, contra o que cada centro tem.
 *
 * A tela antiga pedia o plano, calculava e mostrava uma grade com o ID do
 * centro. Agora o plano vem da lista (com a data do último cálculo), a carga já
 * aparece ao abrir, e cada aba responde uma pergunta: onde aperta (visão
 * geral), quando aperta (mapa), o que estoura (sobrecargas) e o número exato
 * (registros).
 */
type AbaCrp = "geral" | "mapa" | "sobrecargas" | "registros";
const CHAVE_PLANO = "vpro0200.plano";

type ResumoCentro = { id: number; necessarias: number; disponiveis: number; pico: number; diaPico: string; estouros: number; dias: number };

export function Vpro0200Page(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [aba, setAba] = useState<AbaCrp>("geral");
  const [planos, setPlanos] = useState<CrpPlanOption[]>([]);
  const [plano, setPlano] = useState<number | undefined>(() => { try { return Number(localStorage.getItem(CHAVE_PLANO)) || undefined; } catch { return undefined; } });
  const [linhas, setLinhas] = useState<CrpEntry[]>([]);
  const [centros, setCentros] = useState<Map<number, string>>(new Map());
  const [filtroCentro, setFiltroCentro] = useState<number | "">("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const nomeCentro = useCallback((id: number) => centros.get(id) ?? `Centro ${id}`, [centros]);

  const carregarPlanos = useCallback(async () => {
    const l = await listCrpPlans();
    setPlanos(l);
    setPlano((atual) => (atual && l.some((p) => p.plan_code === atual) ? atual : (l.find((p) => p.calculated) ?? l[0])?.plan_code));
  }, []);

  useEffect(() => {
    void run(carregarPlanos);
    loadWorkCenters().then((l) => setCentros(new Map(l.map((c) => [Number(c.code), c.label])))).catch(() => { /* sem nome, mostra o código */ });
  }, [run, carregarPlanos]);

  useEffect(() => {
    if (!plano) { setLinhas([]); return; }
    try { localStorage.setItem(CHAVE_PLANO, String(plano)); } catch { /* preferência local */ }
    void run(async () => { setLinhas(await listCrpPlan(plano)); });
  }, [plano, run]);

  const planoAtual = planos.find((p) => p.plan_code === plano);

  const calcular = () => run(async () => {
    if (!plano) { setFeedback({ type: "error", message: "Escolha o plano." }); return; }
    const s = await calculateCrp(plano);
    setLinhas(await listCrpPlan(plano));
    await carregarPlanos();
    setFeedback({ type: s.overload_count ? "info" : "success", message: `CRP calculado: ${s.total_entries} registro(s) de carga, ${s.overload_count} dia(s) em sobrecarga.` });
  });

  const resumo = useMemo<ResumoCentro[]>(() => {
    const m = new Map<number, ResumoCentro>();
    for (const l of linhas) {
      const r = m.get(l.work_center_id) ?? { id: l.work_center_id, necessarias: 0, disponiveis: 0, pico: 0, diaPico: "", estouros: 0, dias: 0 };
      r.necessarias += l.required_hours || 0; r.disponiveis += l.available_hours || 0; r.dias += 1;
      if ((l.load_pct || 0) > r.pico) { r.pico = l.load_pct || 0; r.diaPico = l.req_date; }
      if (l.is_overloaded) r.estouros += 1;
      m.set(l.work_center_id, r);
    }
    return [...m.values()].sort((a, b) => b.estouros - a.estouros || b.pico - a.pico);
  }, [linhas]);

  const dias = useMemo(() => [...new Set(linhas.map((l) => l.req_date.slice(0, 10)))].sort(), [linhas]);
  const sobrecargas = useMemo(() => linhas.filter((l) => l.is_overloaded).sort((a, b) => a.req_date.localeCompare(b.req_date) || b.load_pct - a.load_pct), [linhas]);
  const filtradas = useMemo(() => linhas
    .filter((l) => (filtroCentro === "" || l.work_center_id === filtroCentro) && (!de || l.req_date.slice(0, 10) >= de) && (!ate || l.req_date.slice(0, 10) <= ate))
    .sort((a, b) => a.req_date.localeCompare(b.req_date) || a.work_center_id - b.work_center_id), [linhas, filtroCentro, de, ate]);

  const totalNec = resumo.reduce((t, r) => t + r.necessarias, 0);
  const totalDisp = resumo.reduce((t, r) => t + r.disponiveis, 0);
  const pico = resumo[0] ? resumo.reduce((p, r) => (r.pico > p.pico ? r : p), resumo[0]) : null;

  const ABAS: Aba<AbaCrp>[] = [
    { id: "geral", label: "Visão geral", hint: "Carga por centro e onde ela aperta" },
    { id: "mapa", label: "Mapa de carga", hint: "Centro × dia, em % da capacidade" },
    { id: "sobrecargas", label: "Sobrecargas", contador: sobrecargas.length, alerta: true, hint: "Dias em que o centro precisa de mais horas do que tem" },
    { id: "registros", label: "Registros", contador: linhas.length, hint: "Todos os registros, com filtro por centro e período" },
  ];

  const semCalculo = plano && linhas.length === 0 && !busy;

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Produção" titulo="CRP (Planejamento de Capacidade)" codigo="VPRO0200"
        meta={planoAtual?.last_calculated_at ? `Plano calculado em ${dataHora(planoAtual.last_calculated_at)}` : undefined} />

      <div className="erp-toolbar vpl-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Plano MRP</span>
          <select className="erp-tselect" style={{ width: 260 }} aria-label="Plano MRP" value={plano ?? ""} onChange={(e) => setPlano(Number(e.target.value) || undefined)}>
            {planos.length === 0 && <option value="">Nenhum plano</option>}
            {planos.map((p) => <option key={p.plan_code} value={p.plan_code}>{p.plan_code} · {p.name ?? "Plano"}{p.calculated ? "" : " — sem CRP"}</option>)}
          </select>
          <button className="erp-btn erp-btn-primary" onClick={() => void calcular()} disabled={busy || !plano}>{busy && <span className="erp-spin" />}Calcular CRP</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup">
          <ExportButton title="VPRO0200 — CRP (Planejamento de Capacidade)" filename="vpro0200" build={() => ({
            columns: ["Centro", "Data", "Necessário (h)", "Disponível (h)", "Carga %", "Sobrecarga"],
            rows: filtradas.map((r) => [nomeCentro(r.work_center_id), data(r.req_date), num(r.required_hours), num(r.available_hours), num(r.load_pct), r.is_overloaded ? "Sim" : "Não"]),
            subtitle: planoAtual ? `Plano ${planoAtual.plan_code} · ${filtradas.length} registro(s)` : undefined,
          })} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <Abas abas={ABAS} ativa={aba} onChange={setAba} />
          <div className="erp-detail-body">
            <Aviso feedback={feedback} busy={busy} />

            {semCalculo ? (
              <Painel titulo="Carga do plano"><Vazio titulo="Este plano ainda não tem CRP calculado"
                texto="Rode o MRP do plano e depois clique em Calcular CRP. A carga sai das ordens sugeridas e planejadas de fabricação."
                acao={<button className="erp-btn erp-btn-primary" onClick={() => void calcular()} disabled={busy}>Calcular CRP</button>} /></Painel>
            ) : (<>
              {aba === "geral" && (<>
                <Kpis itens={[
                  { label: "Centros com carga", value: num(resumo.length, 0), hint: `${dias.length} dia(s) no horizonte` },
                  { label: "Horas necessárias", value: horas(totalNec), hint: `de ${horas(totalDisp)} disponíveis` },
                  { label: "Ocupação média", value: pct(totalDisp ? (totalNec / totalDisp) * 100 : 0), hint: "das horas disponíveis no horizonte" },
                  pico ? { label: "Pico de carga", value: pct(pico.pico), hint: `${nomeCentro(pico.id)} em ${data(pico.diaPico)}`, tom: pico.pico > 100 ? "danger" : pico.pico > 85 ? "warn" : "ok" } : { label: "Pico de carga", value: "—" },
                  { label: "Dias em sobrecarga", value: num(sobrecargas.length, 0), tom: sobrecargas.length ? "danger" : "ok", onClick: () => setAba("sobrecargas") },
                ]} />
                <Painel titulo="Carga por centro" sub="horas pedidas pelo plano contra as horas que o centro tem" flush>
                  <table className="erp-grid">
                    <thead><tr><th>Centro</th><th className="num">Dias</th><th className="num">Necessário</th><th className="num">Disponível</th><th style={{ width: 220 }}>Ocupação</th><th>Pico</th><th>Situação</th></tr></thead>
                    <tbody>{resumo.map((r) => {
                      const ocup = r.disponiveis ? (r.necessarias / r.disponiveis) * 100 : 0;
                      return (
                        <tr key={r.id} className="vpl-click" onClick={() => { setFiltroCentro(r.id); setAba("registros"); }} title="Ver os registros do centro">
                          <td className="vpl-strong">{nomeCentro(r.id)}</td>
                          <td className="num">{r.dias}</td>
                          <td className="num">{horas(r.necessarias)}</td>
                          <td className="num">{horas(r.disponiveis)}</td>
                          <td><Progresso valor={r.necessarias} total={r.disponiveis} tom={ocup > 100 ? "danger" : ocup > 85 ? "warn" : undefined} /></td>
                          <td>{pct(r.pico)} <span className="erp-text-muted">em {data(r.diaPico)}</span></td>
                          <td>{r.estouros ? <Selo tom="danger">{r.estouros} dia(s) acima</Selo> : <Selo tom="ok">Dentro da capacidade</Selo>}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </Painel>
                <Painel titulo="Carga diária por centro"><CrpCargaChart rows={linhas} /></Painel>
              </>)}

              {aba === "mapa" && (
                <Painel titulo="Mapa de carga" sub="% da capacidade do centro em cada dia">
                  {dias.length === 0 ? <Vazio titulo="Sem carga calculada" /> : (<>
                    <div className="vpl-heat-wrap">
                      <table className="vpl-heat">
                        <thead><tr><th className="row">Centro</th>{dias.map((d) => <th key={d} title={data(d)}>{data(d).slice(0, 5)}</th>)}</tr></thead>
                        <tbody>{resumo.map((r) => (
                          <tr key={r.id}>
                            <th className="row">{nomeCentro(r.id)}</th>
                            {dias.map((d) => {
                              const l = linhas.find((x) => x.work_center_id === r.id && x.req_date.slice(0, 10) === d);
                              if (!l) return <td key={d} />;
                              const p = l.load_pct || 0;
                              const nivel = p > 120 ? "l5" : p > 100 ? "l4" : p > 70 ? "l3" : p > 35 ? "l2" : "l1";
                              return <td key={d} className={nivel} title={`${nomeCentro(r.id)} · ${data(d)}: ${horas(l.required_hours)} de ${horas(l.available_hours)}`}>{Math.round(p)}</td>;
                            })}
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <div className="vpl-legend">
                      <span><i style={{ background: "#e3f0f4" }} />até 35%</span>
                      <span><i style={{ background: "#bfdde8" }} />35–70%</span>
                      <span><i style={{ background: "#8cc3d6" }} />70–100%</span>
                      <span><i style={{ background: "#f3d0cd" }} />100–120%</span>
                      <span><i style={{ background: "var(--v-err)" }} />acima de 120%</span>
                      <span>Célula vazia: o centro não tem carga no dia.</span>
                    </div>
                  </>)}
                </Painel>
              )}

              {aba === "sobrecargas" && (sobrecargas.length === 0
                ? <Painel titulo="Sobrecargas"><Vazio titulo="Nenhum centro passa da capacidade" texto="Todos os dias do plano cabem nas horas disponíveis dos centros." /></Painel>
                : (
                  <Painel titulo="Dias em sobrecarga" sub={`${sobrecargas.length} registro(s)`} flush>
                    <table className="erp-grid">
                      <thead><tr><th>Data</th><th>Centro</th><th className="num">Necessário</th><th className="num">Disponível</th><th className="num">Excedente</th><th className="num">Carga</th></tr></thead>
                      <tbody>{sobrecargas.map((l, i) => (
                        <tr key={i}>
                          <td>{data(l.req_date)}</td><td className="vpl-strong">{nomeCentro(l.work_center_id)}</td>
                          <td className="num">{horas(l.required_hours)}</td><td className="num">{horas(l.available_hours)}</td>
                          <td className="num erp-cell-danger">{horas(l.required_hours - l.available_hours)}</td>
                          <td className="num"><Selo tom="danger">{pct(l.load_pct)}</Selo></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </Painel>
                ))}

              {aba === "registros" && (<>
                <Painel titulo="Filtros">
                  <div className="vpl-filters">
                    <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="crp-centro">Centro</label>
                      <select id="crp-centro" className="erp-input" value={filtroCentro} onChange={(e) => setFiltroCentro(e.target.value ? Number(e.target.value) : "")}>
                        <option value="">Todos os centros</option>
                        {resumo.map((r) => <option key={r.id} value={r.id}>{nomeCentro(r.id)}</option>)}
                      </select></div>
                    <div className="erp-field"><label className="erp-label" htmlFor="crp-de">De</label><input id="crp-de" className="erp-input" type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
                    <div className="erp-field"><label className="erp-label" htmlFor="crp-ate">Até</label><input id="crp-ate" className="erp-input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
                    {(filtroCentro !== "" || de || ate) && <button className="erp-btn" style={{ alignSelf: "flex-end" }} onClick={() => { setFiltroCentro(""); setDe(""); setAte(""); }}>Limpar filtros</button>}
                  </div>
                </Painel>
                <Painel titulo="Registros de carga" sub={`${filtradas.length} de ${linhas.length}`} flush>
                  <div className="vpl-grid-scroll">
                    <table className="erp-grid">
                      <thead><tr><th>Data</th><th>Centro</th><th className="num">Necessário</th><th className="num">Disponível</th><th style={{ width: 200 }}>Carga</th><th>Situação</th></tr></thead>
                      <tbody>
                        {filtradas.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum registro com esses filtros.</td></tr>}
                        {filtradas.map((l, i) => (
                          <tr key={i}>
                            <td>{data(l.req_date)}</td><td className="vpl-strong">{nomeCentro(l.work_center_id)}</td>
                            <td className="num">{horas(l.required_hours)}</td><td className="num">{horas(l.available_hours)}</td>
                            <td><Progresso valor={l.required_hours} total={l.available_hours} tom={l.is_overloaded ? "danger" : l.load_pct > 85 ? "warn" : undefined} /></td>
                            <td>{l.is_overloaded ? <Selo tom="danger">Sobrecarga</Selo> : <Selo tom="ok">Dentro da capacidade</Selo>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Painel>
              </>)}
            </>)}
          </div>
        </section>
      </div>

      <Rodape>
        <div className="erp-status-item">Plano: <strong>{planoAtual ? `${planoAtual.plan_code} · ${planoAtual.name ?? ""}` : "—"}</strong></div>
        <div className="erp-status-item">Registros: <strong>{linhas.length}</strong></div>
        <div className="erp-status-item">Sobrecargas: <strong>{sobrecargas.length}</strong></div>
      </Rodape>
    </div>
  );
}
