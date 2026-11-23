import { useCallback, useEffect, useState } from "react";
import { variacoesDeCusto, type Variacoes } from "@/services/gestaoService";
import { ExportButton } from "@/components/ui/ExportButton";
import { Aviso, Kpis, Painel, Selo, Vazio } from "../planejamento/planUi";
import { data, num, pct } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";
import { periodoDoMes, reais } from "../gestao/gestaoFmt";

const sinal = (v: number) => (v > 0 ? " erp-cell-danger" : "");

/**
 * Aba "Variações das OFs" da VCUS0100: custo-padrão × real de cada OF encerrada,
 * aberto em material, mão de obra, máquina, indiretos e terceiros.
 */
export function VariacoesOFAba(): JSX.Element {
  const { busy, feedback, run } = useAcao();
  const [periodo, setPeriodo] = useState(periodoDoMes());
  const [vars, setVars] = useState<Variacoes | null>(null);
  // OF sem custo apurado (padrão e real zerados) só polui a lista.
  const [soComCusto, setSoComCusto] = useState(true);

  const carregar = useCallback(async () => { setVars(await variacoesDeCusto(periodo.de, periodo.ate)); }, [periodo]);
  useEffect(() => { void run(carregar); }, [run]); // eslint-disable-line react-hooks/exhaustive-deps
  const ordens = (vars?.orders ?? []).filter((v) => !soComCusto || v.standard_cost !== 0 || v.actual_cost !== 0);

  return (<>
    <Aviso feedback={feedback} busy={busy} />
    <div className="erp-fieldset"><div className="erp-fieldset-body">
      <div className="erp-field erp-c3"><label className="erp-label" htmlFor="var-de">OFs encerradas de</label>
        <input id="var-de" className="erp-input" type="date" value={periodo.de} onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label" htmlFor="var-ate">até</label>
        <input id="var-ate" className="erp-input" type="date" value={periodo.ate} onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))} /></div>
      <div className="erp-field erp-c6" style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <button className="erp-btn erp-btn-primary" onClick={() => void run(carregar)} disabled={busy}>Consultar</button>
        <ExportButton title="VCUS0100 — Variações das OFs" filename="vcus0100-variacoes" build={() => ({
          columns: ["OF", "Item", "Produzido", "Padrão", "Real", "Material", "Mão de obra", "Máquina", "Indiretos", "Terceiros", "Variação", "%", "Apurada em"],
          rows: ordens.map((v) => [String(v.order_number), `${v.item_code} ${v.item_name}`, num(v.produced_qty), num(v.standard_cost), num(v.actual_cost), num(v.material_variance), num(v.labor_variance), num(v.machine_variance), num(v.overhead_variance), num(v.subcontract_variance), num(v.total_variance), num(v.variance_pct, 1), data(v.settled_at)]),
        })} /></div>
    </div></div>
    {!vars ? <Vazio titulo="Consultando…" /> : (<>
      <Kpis itens={[
        { label: "Custo-padrão", value: reais(vars.standard_cost), tom: "info" },
        { label: "Custo real", value: reais(vars.actual_cost), tom: "info" },
        { label: "Variação líquida", value: reais(vars.total_variance), hint: pct(vars.variance_pct), tom: vars.total_variance > 0 ? "danger" : "ok" },
        { label: "Desfavorável", value: reais(vars.unfavorable_variance), hint: "só as OFs que custaram mais que o padrão", tom: vars.unfavorable_variance > 0 ? "warn" : "ok" },
      ]} />
      {ordens.length === 0 ? <Vazio titulo="Nenhuma OF encerrada com custo apurado no período" /> : (
        <Painel titulo="Por OF" sub="positivo = gastou mais que o padrão" flush
          acoes={<label className="erp-check"><input type="checkbox" checked={soComCusto} onChange={(e) => setSoComCusto(e.target.checked)} /> Só OFs com custo ({ordens.length} de {vars.orders.length})</label>}>
          <table className="erp-grid">
            <thead><tr><th>OF</th><th>Item</th><th className="num">Produzido</th><th className="num">Padrão</th><th className="num">Real</th><th className="num">Material</th><th className="num">M. obra</th><th className="num">Máquina</th><th className="num">Indiretos</th><th className="num">Terceiros</th><th className="num">Variação</th></tr></thead>
            <tbody>{ordens.map((v) => (
              <tr key={v.production_order_id}>
                <td><strong>{v.order_number}</strong></td><td>{v.item_code} {v.item_name}</td><td className="num">{num(v.produced_qty)}</td>
                <td className="num">{reais(v.standard_cost)}</td><td className="num">{reais(v.actual_cost)}</td>
                {[v.material_variance, v.labor_variance, v.machine_variance, v.overhead_variance, v.subcontract_variance].map((x, i) => <td key={i} className={`num${sinal(x)}`}>{reais(x)}</td>)}
                <td className={`num${sinal(v.total_variance)}`}><strong>{reais(v.total_variance)}</strong> {v.standard_cost === 0
                  ? <Selo tom="warn" title="O item não tinha custo-padrão quando a OF encerrou: a variação é o custo real inteiro.">sem padrão</Selo>
                  : <span className="erp-text-muted">({pct(v.variance_pct)})</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </Painel>)}
    </>)}
  </>);
}
