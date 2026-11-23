import { useCallback, useEffect, useState } from "react";
import { indicadores, type Indicadores } from "@/services/gestaoService";
import { ExportButton } from "@/components/ui/ExportButton";
import { Abas, Aviso, Cabecalho, Kpis, Painel, Progresso, Rodape, Vazio, type Aba } from "../planejamento/planUi";
import { data, hojeISO, num, pct } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";
import { abrirTela, diasAtras, reais } from "./gestaoFmt";

/**
 * Indicadores Gerenciais (VIND0100): OEE por máquina, giro do estoque e
 * pontualidade de fornecedores e da promessa de entrega, com a receita e a
 * margem do período no topo. O detalhe da margem por item e cliente é da VCUS0200.
 */
type AbaInd = "oee" | "fornecedores";

export function Vind0100Page(): JSX.Element {
  const { busy, feedback, run } = useAcao();
  const [periodo, setPeriodo] = useState({ de: diasAtras(90), ate: hojeISO() });
  const [ind, setInd] = useState<Indicadores | null>(null);
  const [aba, setAba] = useState<AbaInd>("oee");

  const carregar = useCallback(async () => { setInd(await indicadores(periodo.de, periodo.ate)); }, [periodo]);
  useEffect(() => { void run(carregar); }, [run]); // eslint-disable-line react-hooks/exhaustive-deps

  const ABAS: Aba<AbaInd>[] = [
    { id: "oee", label: "OEE por máquina", contador: ind?.oee.length },
    { id: "fornecedores", label: "Pontualidade de fornecedores", contador: ind?.supplier_on_time.length },
  ];
  const receita = ind?.sales?.revenue ?? 0;
  const margem = ind?.sales?.margin ?? 0;
  const cmv = ind?.sales?.cogs ?? 0;
  const oeeMedio = ind?.oee.length ? ind.oee.reduce((t, m) => t + m.oee_pct, 0) / ind.oee.length : undefined;

  const exportar = () => {
    if (!ind) return { columns: [], rows: [] };
    if (aba === "oee") return { columns: ["Máquina", "Horas apontadas", "Horas disponíveis", "Boas", "Refugo", "Disponibilidade %", "Desempenho %", "Qualidade %", "OEE %"],
      rows: ind.oee.map((m) => [`${m.code} ${m.name}`, num(m.worked_hours), num(m.available_hours), num(m.good_qty), num(m.scrap_qty), num(m.availability_pct, 1), m.performance_pct === undefined ? "—" : num(m.performance_pct, 1), num(m.quality_pct, 1), num(m.oee_pct, 1)]) };
    if (aba === "fornecedores") return { columns: ["Fornecedor", "Linhas recebidas", "No prazo", "No prazo %", "Atraso médio (dias)"],
      rows: ind.supplier_on_time.map((p) => [`${p.code} ${p.name}`, String(p.lines), String(p.on_time), num(p.on_time_pct, 1), num(p.avg_delay_days, 1)]) };
    return { columns: [], rows: [] };
  };

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Custos" titulo="Indicadores Gerenciais" codigo="VIND0100" meta={ind ? `${data(ind.from)} a ${data(ind.to)}` : undefined} />
      <div className="erp-toolbar vpl-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">De</span><input className="erp-input" type="date" value={periodo.de} onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))} aria-label="De" /></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Até</span><input className="erp-input" type="date" value={periodo.ate} onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))} aria-label="Até" /></div>
        <div className="erp-tgroup"><button className="erp-btn erp-btn-primary" onClick={() => void run(carregar)} disabled={busy}>Calcular</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title={`VIND0100 — ${ABAS.find((a) => a.id === aba)?.label}`} filename={`vind0100-${aba}`} build={exportar} /></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            <Aviso feedback={feedback} busy={busy} />
            {!ind ? <Vazio titulo="Calculando…" /> : (<>
              <Kpis itens={[
                { label: "Receita líquida", value: reais(receita), hint: "detalhe por item e cliente na VCUS0200", tom: "info", onClick: () => abrirTela("VCUS0200"), title: "Abrir a Margem de Contribuição" },
                cmv === 0 && receita > 0
                  ? { label: "Margem bruta (receita − CMV)", value: "—", hint: "as notas do período não baixaram custo do estoque", tom: "warn" }
                  : { label: "Margem bruta (receita − CMV)", value: reais(margem), hint: receita ? pct((margem / receita) * 100) : "—", tom: margem < 0 ? "danger" : "ok" },
                { label: "OEE médio", value: oeeMedio === undefined ? "—" : pct(oeeMedio), hint: "disponibilidade × desempenho × qualidade", tom: oeeMedio === undefined ? "muted" : oeeMedio < 60 ? "warn" : "ok" },
                { label: "Giro do estoque", value: ind.inventory_turnover ? `${num(ind.inventory_turnover.annual_turnover, 1)}×/ano` : "—", hint: ind.inventory_turnover ? `cobertura de ${num(ind.inventory_turnover.coverage_days, 0)} dias · estoque ${reais(ind.inventory_turnover.stock_value)}` : undefined, tom: "info" },
                { label: "Promessa cumprida", value: ind.delivery_promise?.lines ? pct(ind.delivery_promise.on_time_pct) : "—", hint: ind.delivery_promise ? `${ind.delivery_promise.on_time} de ${ind.delivery_promise.lines} linhas · atraso médio ${num(ind.delivery_promise.avg_delay_days, 1)} d` : undefined, tom: !ind.delivery_promise?.lines ? "muted" : ind.delivery_promise.on_time_pct < 85 ? "warn" : "ok" },
              ]} />
              <Abas abas={ABAS} ativa={aba} onChange={setAba} />
              <Painel titulo={ABAS.find((a) => a.id === aba)?.label} flush>
                {aba === "oee" && (ind.oee.length === 0 ? <Vazio titulo="Sem apontamento de máquina no período" /> : (
                  <table className="erp-grid">
                    <thead><tr><th>Máquina</th><th className="num">Horas apontadas</th><th className="num">Disponíveis</th><th className="num">Boas</th><th className="num">Refugo</th><th className="num">Disp.</th><th className="num">Desemp.</th><th className="num">Qualid.</th><th style={{ width: 150 }}>OEE</th></tr></thead>
                    <tbody>{ind.oee.map((m) => (
                      <tr key={m.machine_id}>
                        <td><strong>{m.code}</strong> {m.name}</td><td className="num">{num(m.worked_hours)}</td><td className="num">{num(m.available_hours)}</td>
                        <td className="num">{num(m.good_qty)}</td><td className="num">{num(m.scrap_qty)}</td><td className="num">{pct(m.availability_pct)}</td>
                        <td className="num" title={m.performance_pct === undefined ? "Sem tempo padrão no roteiro: o desempenho entra como 100%" : undefined}>{m.performance_pct === undefined ? "—" : pct(m.performance_pct)}</td>
                        <td className="num">{pct(m.quality_pct)}</td>
                        <td><Progresso valor={m.oee_pct} total={100} tom={m.oee_pct < 40 ? "danger" : m.oee_pct < 65 ? "warn" : undefined} /></td>
                      </tr>
                    ))}</tbody>
                  </table>))}
                {aba === "fornecedores" && (ind.supplier_on_time.length === 0 ? <Vazio titulo="Sem recebimento no período" /> : (
                  <table className="erp-grid">
                    <thead><tr><th>Fornecedor</th><th className="num">Linhas recebidas</th><th className="num">No prazo</th><th className="num">Atraso médio</th><th style={{ width: 160 }}>Pontualidade</th></tr></thead>
                    <tbody>{ind.supplier_on_time.map((p) => (
                      <tr key={p.code}>
                        <td><strong>{p.code}</strong> {p.name}</td><td className="num">{p.lines}</td><td className="num">{p.on_time}</td><td className="num">{num(p.avg_delay_days, 1)} d</td>
                        <td><Progresso valor={p.on_time_pct} total={100} tom={p.on_time_pct < 70 ? "danger" : p.on_time_pct < 90 ? "warn" : undefined} /></td>
                      </tr>
                    ))}</tbody>
                  </table>))}
              </Painel>
            </>)}
          </div>
        </section>
      </div>
      <Rodape><div className="erp-status-item">Período: <strong>{data(periodo.de)} a {data(periodo.ate)}</strong></div></Rodape>
    </div>
  );
}
