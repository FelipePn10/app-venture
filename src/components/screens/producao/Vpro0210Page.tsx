import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type GanttBar, type GanttBoard, type GanttEntry, type GanttGroupBy, type RescheduleResult,
  SEQUENCE_DIRECTIONS, exportGanttMonth, ganttByOrder, ganttByWorkCenter, ganttMonth, rescheduleGantt, sequenceAps,
} from "@/services/apsService";
import { downloadBlob } from "@/services/fileDownload";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadProductionOrders, loadWorkCenters } from "@/services/lookups";
import { ApsGanttBoard } from "./crp/ApsGanttBoard";
import { type Aba, Abas, Aviso, Cabecalho, Kpis, Painel, Rodape, Selo, Vazio } from "../planejamento/planUi";
import { dataHora, horas, num } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";

/**
 * APS — sequenciamento das ordens nos centros e o quadro (Gantt).
 *
 * A tela antiga misturava três modos num botão da barra e pedia o ID da ordem,
 * do centro e da sequência digitados. Agora o quadro do mês abre direto, com
 * navegação de mês; ordem e centro vêm de listas; e o remanejamento escolhe a
 * operação na lista das barras do quadro, não por um número decorado.
 */
type AbaAps = "quadro" | "ordem" | "centro" | "remanejar";
const nomeMes = (m: number) => MESES[m - 1].charAt(0).toUpperCase() + MESES[m - 1].slice(1);
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function situacaoOperacao(s?: string): JSX.Element {
  const x = (s ?? "").toUpperCase();
  if (x.includes("DONE") || x.includes("COMPLET")) return <Selo tom="ok">Concluída</Selo>;
  if (x.includes("PROGRESS")) return <Selo tom="warn">Em andamento</Selo>;
  if (x.includes("SCHEDULED")) return <Selo tom="info">Programada</Selo>;
  return <Selo tom="muted">{s || "—"}</Selo>;
}

/** Dia no fuso do usuário — `toISOString` daria o dia anterior a leste de Greenwich. */
function diaLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** datetime-local espera "AAAA-MM-DDTHH:MM" no fuso do usuário. */
function paraCampoDataHora(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function Vpro0210Page(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const hoje = new Date();
  const [aba, setAba] = useState<AbaAps>("quadro");
  const [sentido, setSentido] = useState("FORWARD");
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [agrupar, setAgrupar] = useState<GanttGroupBy>("work_center");
  const [quadro, setQuadro] = useState<GanttBoard | null>(null);
  const [ordem, setOrdem] = useState<number | undefined>();
  const [linhasOrdem, setLinhasOrdem] = useState<GanttEntry[] | null>(null);
  const [centro, setCentro] = useState<number | undefined>();
  const [de, setDe] = useState(() => diaLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
  const [ate, setAte] = useState(() => diaLocal(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)));
  const [linhasCentro, setLinhasCentro] = useState<GanttEntry[] | null>(null);
  const [rem, setRem] = useState({ sequencia: "", inicio: "", centro: undefined as number | undefined, cascata: true });
  const [resultadoRem, setResultadoRem] = useState<RescheduleResult | null>(null);
  const [centros, setCentros] = useState<Map<number, string>>(new Map());

  const nomeCentro = useCallback((id?: number) => (id ? centros.get(id) ?? `Centro ${id}` : "—"), [centros]);

  const carregarQuadro = useCallback(async () => { setQuadro(await ganttMonth(ano, mes, agrupar)); }, [ano, mes, agrupar]);
  useEffect(() => { void run(carregarQuadro); }, [run, carregarQuadro]);
  useEffect(() => { loadWorkCenters().then((l) => setCentros(new Map(l.map((c) => [Number(c.code), c.label])))).catch(() => { /* sem nome, mostra o código */ }); }, []);

  const barras: (GanttBar & { linha: string })[] = useMemo(
    () => (quadro ? quadro.rows.flatMap((r) => r.bars.map((b) => ({ ...b, linha: r.label }))) : []).sort((a, b) => a.start.localeCompare(b.start)),
    [quadro],
  );
  const sequenciaveis = barras.filter((b) => b.sequence_id);

  const navegar = (delta: number) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setAno(d.getFullYear()); setMes(d.getMonth() + 1);
  };

  const sequenciar = () => run(async () => {
    const r = await sequenceAps(sentido);
    await carregarQuadro();
    const base = `${r.scheduled_operations} operação(ões) sequenciada(s) em ${r.orders_processed} ordem(ns).`;
    // Programando para trás, ordem que precisaria começar no passado não cabe
    // no prazo: é a informação que o PCP procura, não pode virar só uma barra.
    setFeedback(r.late_orders.length
      ? { type: "info", message: `${base} ${r.late_orders.length} ordem(ns) não cabe(m) no prazo e foram reprogramadas para frente: OF ${r.late_orders.join(", ")}.` }
      : { type: "success", message: base });
  });

  const exportar = (formato: "svg" | "pdf") => run(async () => {
    downloadBlob(await exportGanttMonth(ano, mes, formato, agrupar), `aps-quadro-${ano}-${String(mes).padStart(2, "0")}.${formato}`);
    setFeedback({ type: "success", message: `Quadro exportado em ${formato.toUpperCase()}.` });
  });

  const consultarOrdem = () => run(async () => {
    if (!ordem) { setFeedback({ type: "error", message: "Escolha a ordem de produção." }); return; }
    setLinhasOrdem(await ganttByOrder(ordem));
  });
  const consultarCentro = () => run(async () => {
    if (!centro) { setFeedback({ type: "error", message: "Escolha o centro de trabalho." }); return; }
    if (!de || !ate || ate < de) { setFeedback({ type: "error", message: "Informe um período válido." }); return; }
    setLinhasCentro(await ganttByWorkCenter(centro, de, ate));
  });

  const escolherParaRemanejar = (b: GanttBar) => {
    setRem({ sequencia: String(b.sequence_id ?? ""), inicio: paraCampoDataHora(b.start), centro: b.work_center_id, cascata: true });
    setResultadoRem(null);
    setAba("remanejar");
  };
  const barraEscolhida = sequenciaveis.find((b) => String(b.sequence_id) === rem.sequencia);
  const remanejar = () => run(async () => {
    const id = Number(rem.sequencia);
    if (!id || !rem.inicio) { setFeedback({ type: "error", message: "Escolha a operação e o novo início." }); return; }
    const novoCentro = rem.centro && rem.centro !== barraEscolhida?.work_center_id ? rem.centro : undefined;
    const r = await rescheduleGantt(id, new Date(rem.inicio).toISOString(), { newWorkCenterId: novoCentro, cascade: rem.cascata });
    setResultadoRem(r);
    await carregarQuadro();
    setFeedback(r.capacityCheckError
      ? { type: "error", message: `${r.capacityCheckError}. Confira a carga do centro no quadro.` }
      : r.warnings.length
      ? { type: "info", message: `Operação remanejada; ${r.shifted.length} operação(ões) movida(s). ${r.warnings.length} aviso(s) de capacidade — confira abaixo.` }
      : { type: "success", message: `Operação remanejada; ${r.shifted.length} operação(ões) movida(s).` });
  });

  const ABAS: Aba<AbaAps>[] = [
    { id: "quadro", label: "Quadro do mês", contador: barras.length, hint: "Linha do tempo das operações sequenciadas" },
    { id: "ordem", label: "Por ordem", hint: "Operações de uma ordem de produção" },
    { id: "centro", label: "Por centro", hint: "Fila de um centro de trabalho num período" },
    { id: "remanejar", label: "Remanejar", hint: "Mudar o início ou o centro de uma operação" },
  ];

  const tabelaOperacoes = (linhas: GanttEntry[]) => (
    <table className="erp-grid">
      <thead><tr><th>OF</th><th className="num">Posição</th><th>Centro</th><th>Início</th><th>Fim</th><th className="num">Duração</th><th>Situação</th></tr></thead>
      <tbody>
        {linhas.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma operação sequenciada. Rode o sequenciamento na barra acima.</td></tr>}
        {linhas.map((r) => (
          <tr key={r.sequence_id}>
            <td className="vpl-strong">OF {r.production_order_id}</td><td className="num">{r.sequence_position}</td><td>{nomeCentro(r.work_center_id)}</td>
            <td>{dataHora(r.scheduled_start)}</td><td>{dataHora(r.scheduled_end)}</td><td className="num">{horas(r.duration_hours)}</td><td>{situacaoOperacao(r.status)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Produção" titulo="APS (Sequenciamento e Gantt)" codigo="VPRO0210" />

      <div className="erp-toolbar vpl-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Sequenciar</span>
          <select className="erp-tselect" style={{ width: 250 }} aria-label="Sentido da programação" value={sentido} onChange={(e) => setSentido(e.target.value)}
            title="Para trás parte da data de entrega e revela as ordens que já nascem atrasadas">
            {SEQUENCE_DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <button className="erp-btn erp-btn-primary" onClick={() => void sequenciar()} disabled={busy}>{busy && <span className="erp-spin" />}Sequenciar ordens</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPRO0210 — APS (Sequenciamento e Gantt)" filename="vpro0210" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <Abas abas={ABAS} ativa={aba} onChange={setAba} />
          <div className="erp-detail-body">
            <Aviso feedback={feedback} busy={busy} />

            {aba === "quadro" && (<>
              <Painel titulo="Período">
                <div className="vpl-filters">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button className="erp-btn" onClick={() => navegar(-1)} disabled={busy} aria-label="Mês anterior">‹</button>
                    <strong style={{ minWidth: 150, textAlign: "center" }}>{nomeMes(mes)} de {ano}</strong>
                    <button className="erp-btn" onClick={() => navegar(1)} disabled={busy} aria-label="Próximo mês">›</button>
                    <button className="erp-btn erp-btn-ghost" onClick={() => { setAno(hoje.getFullYear()); setMes(hoje.getMonth() + 1); }} disabled={busy}>Hoje</button>
                  </div>
                  <div className="erp-field"><label className="erp-label" htmlFor="aps-agrupar">Linhas do quadro</label>
                    <select id="aps-agrupar" className="erp-input" value={agrupar} onChange={(e) => setAgrupar(e.target.value as GanttGroupBy)}>
                      <option value="work_center">Por centro de trabalho</option><option value="order">Por ordem de produção</option>
                    </select></div>
                  <span className="vpl-grow" />
                  <button className="erp-btn" style={{ alignSelf: "flex-end" }} onClick={() => void exportar("pdf")} disabled={busy || !quadro}>Baixar PDF</button>
                  <button className="erp-btn" style={{ alignSelf: "flex-end" }} onClick={() => void exportar("svg")} disabled={busy || !quadro}>Baixar SVG</button>
                </div>
              </Painel>

              {quadro && (<>
                <Kpis itens={[
                  { label: "Operações no mês", value: num(barras.length, 0), hint: `${quadro.rows.length} ${agrupar === "order" ? "ordem(ns)" : "centro(s)"}` },
                  { label: "Atrasadas", value: num(quadro.late_bars, 0), hint: "terminam depois da entrega", tom: quadro.late_bars ? "danger" : "ok" },
                  { label: "Dias sobrecarregados", value: num(quadro.overloaded_days, 0), hint: "centro acima da capacidade", tom: quadro.overloaded_days ? "warn" : "ok" },
                  { label: "Dependências", value: num(quadro.dependencies.length, 0), hint: "uma operação espera a outra" },
                ]} />
                {barras.length === 0 ? (
                  <Painel titulo="Quadro"><Vazio titulo={`Nada programado em ${MESES[mes - 1]}`} texto="Sequencie as ordens na barra acima ou navegue para outro mês." /></Painel>
                ) : (<>
                  <Painel titulo="Linha do tempo" sub={`${quadro.rows.length} linha(s) · ${quadro.days.length} dia(s)`}><ApsGanttBoard board={quadro} /></Painel>
                  <Painel titulo="Operações do mês" sub={`${barras.length} operação(ões)`} flush>
                    <div className="vpl-grid-scroll">
                      <table className="erp-grid">
                        <thead><tr><th>OF</th><th>Item · operação</th><th>Centro</th><th>Início</th><th>Fim</th><th className="num">Duração</th><th className="num">Feito</th><th>Situação</th><th /></tr></thead>
                        <tbody>{barras.map((b, i) => (
                          <tr key={`${b.sequence_id ?? "f"}-${i}`} className={b.is_late ? "vpl-late" : undefined}>
                            <td className="vpl-strong">OF {b.order_number ?? b.production_order_id ?? "—"}</td>
                            <td>{b.item_code ?? b.label}{b.operation_name && <span className="vpl-sub">{b.operation_name}</span>}</td>
                            <td>{b.work_center_name ?? nomeCentro(b.work_center_id)}</td>
                            <td>{dataHora(b.start)}</td><td>{dataHora(b.end)}</td>
                            <td className="num">{horas(b.duration_hours)}</td>
                            <td className="num">{b.percent_done != null ? `${Math.round(b.percent_done)}%` : "—"}</td>
                            <td>{b.is_late ? <Selo tom="danger">Atrasada</Selo> : situacaoOperacao(b.status)}</td>
                            <td className="vpl-actions">{b.sequence_id ? <button className="erp-btn erp-btn-sm" onClick={() => escolherParaRemanejar(b)} disabled={busy}>Remanejar</button> : null}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </Painel>
                </>)}
              </>)}
            </>)}

            {aba === "ordem" && (<>
              <Painel titulo="Ordem de produção">
                <div className="vpl-filters">
                  <div className="erp-field vpl-grow"><label className="erp-label erp-req">Ordem</label>
                    <LookupField value={ordem} loader={loadProductionOrders} entityLabel="ordem de produção" onChange={(c) => { setOrdem(c ? Number(c) : undefined); setLinhasOrdem(null); }} /></div>
                  <button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-end" }} onClick={() => void consultarOrdem()} disabled={busy}>Ver operações</button>
                </div>
              </Painel>
              {linhasOrdem && <Painel titulo={`Operações da OF ${ordem}`} sub={`${linhasOrdem.length} operação(ões)`} flush>{tabelaOperacoes(linhasOrdem)}</Painel>}
            </>)}

            {aba === "centro" && (<>
              <Painel titulo="Centro e período">
                <div className="vpl-filters">
                  <div className="erp-field vpl-grow"><label className="erp-label erp-req" htmlFor="aps-centro">Centro de trabalho</label>
                    <select id="aps-centro" className="erp-input" value={centro ?? ""} onChange={(e) => { setCentro(Number(e.target.value) || undefined); setLinhasCentro(null); }}>
                      <option value="">Selecionar…</option>
                      {[...centros.entries()].map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                    </select></div>
                  <div className="erp-field"><label className="erp-label" htmlFor="aps-de">De</label><input id="aps-de" className="erp-input" type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
                  <div className="erp-field"><label className="erp-label" htmlFor="aps-ate">Até</label><input id="aps-ate" className="erp-input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
                  <button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-end" }} onClick={() => void consultarCentro()} disabled={busy}>Ver fila</button>
                </div>
              </Painel>
              {linhasCentro && (
                <Painel titulo={`Fila de ${nomeCentro(centro)}`} sub={`${linhasCentro.length} operação(ões) · ${horas(linhasCentro.reduce((t, l) => t + (l.duration_hours || 0), 0))}`} flush>
                  {tabelaOperacoes(linhasCentro)}
                </Painel>
              )}
            </>)}

            {aba === "remanejar" && (<>
              <Painel titulo="Remanejar operação" sub="muda o início ou o centro, mantendo a duração">
                {sequenciaveis.length === 0 ? (
                  <p className="erp-hint">Nenhuma operação sequenciada em {MESES[mes - 1]} de {ano}. Sequencie as ordens ou navegue no quadro até o mês da operação.</p>
                ) : (
                  <div className="erp-fieldset-body" style={{ padding: 0 }}>
                    <div className="erp-field erp-c12"><label className="erp-label erp-req" htmlFor="rem-seq">Operação</label>
                      <select id="rem-seq" className="erp-input" value={rem.sequencia} onChange={(e) => {
                        const b = sequenciaveis.find((x) => String(x.sequence_id) === e.target.value);
                        setRem((s) => ({ ...s, sequencia: e.target.value, inicio: paraCampoDataHora(b?.start), centro: b?.work_center_id }));
                      }}>
                        <option value="">Selecionar…</option>
                        {sequenciaveis.map((b) => (
                          <option key={b.sequence_id} value={b.sequence_id}>
                            OF {b.order_number ?? b.production_order_id} · {b.item_code ?? b.label}{b.operation_name ? ` · ${b.operation_name}` : ""} · {b.work_center_name ?? nomeCentro(b.work_center_id)} · {dataHora(b.start)}
                          </option>
                        ))}
                      </select>
                      <span className="erp-hint">A lista mostra as operações de {MESES[mes - 1]} de {ano}, do quadro.</span></div>
                    <div className="erp-field erp-c4"><label className="erp-label erp-req" htmlFor="rem-inicio">Novo início</label>
                      <input id="rem-inicio" className="erp-input" type="datetime-local" value={rem.inicio} onChange={(e) => setRem((s) => ({ ...s, inicio: e.target.value }))} /></div>
                    <div className="erp-field erp-c4"><label className="erp-label" htmlFor="rem-centro">Centro</label>
                      <select id="rem-centro" className="erp-input" value={rem.centro ?? ""} onChange={(e) => setRem((s) => ({ ...s, centro: Number(e.target.value) || undefined }))}>
                        {[...centros.entries()].map(([id, nome]) => <option key={id} value={id}>{nome}{id === barraEscolhida?.work_center_id ? " (atual)" : ""}</option>)}
                      </select></div>
                    <div className="erp-field erp-c4" style={{ justifyContent: "flex-end" }}>
                      <label className="erp-check"><input type="checkbox" checked={rem.cascata} onChange={(e) => setRem((s) => ({ ...s, cascata: e.target.checked }))} />Empurrar as operações seguintes da OF</label></div>
                    {barraEscolhida && <div className="erp-field erp-c12"><p className="erp-note">Atualmente: {dataHora(barraEscolhida.start)} até {dataHora(barraEscolhida.end)} em {barraEscolhida.work_center_name ?? nomeCentro(barraEscolhida.work_center_id)}. A duração ({horas(barraEscolhida.duration_hours)}) é mantida.</p></div>}
                    <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => void remanejar()} disabled={busy || !rem.sequencia}>Remanejar</button></div>
                  </div>
                )}
              </Painel>
              {resultadoRem && (
                <Painel titulo="Resultado" sub={`${resultadoRem.shifted.length} operação(ões) movida(s)`}>
                  {resultadoRem.warnings.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                      {resultadoRem.warnings.map((w, i) => <div key={i}><Selo tom="warn">Capacidade</Selo> {w}</div>)}
                    </div>
                  )}
                  <p className="erp-hint">O aviso de capacidade não bloqueia: o planejador pode decidir passar da capacidade do dia.</p>
                </Painel>
              )}
            </>)}
          </div>
        </section>
      </div>

      <Rodape>
        <div className="erp-status-item">Mês: <strong>{nomeMes(mes)}/{ano}</strong></div>
        <div className="erp-status-item">Operações: <strong>{barras.length}</strong></div>
        {quadro && quadro.late_bars > 0 && <div className="erp-status-item">Atrasadas: <strong>{quadro.late_bars}</strong></div>}
      </Rodape>
    </div>
  );
}
