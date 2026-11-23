import { useState } from "react";
import { dreGerencial, type DREGerencial } from "@/services/gestaoService";
import { ExportButton } from "@/components/ui/ExportButton";
import { Aviso, Kpis, Painel, Vazio } from "../planejamento/planUi";
import { num, pct } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";
import { periodoDoMes, reais } from "../gestao/gestaoFmt";

/**
 * Aba "DRE pelo plano de contas" da VFIN0500: a DRE dos lançamentos contábeis
 * do período, conta a conta e com os subtotais do plano (a R05 é a DRE pelas notas).
 */
export function DrePeloPlanoAba(): JSX.Element {
  const { busy, feedback, run } = useAcao();
  const [periodo, setPeriodo] = useState(periodoDoMes());
  const [dre, setDre] = useState<DREGerencial | null>(null);
  const gerar = () => void run(async () => { setDre(await dreGerencial(periodo.de, periodo.ate)); });

  return (<>
    <Aviso feedback={feedback} busy={busy} />
    <div className="erp-fieldset"><div className="erp-fieldset-body">
      <div className="erp-field erp-c3"><label className="erp-label" htmlFor="dre-de">De</label>
        <input id="dre-de" className="erp-input" type="date" value={periodo.de} onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label" htmlFor="dre-ate">Até</label>
        <input id="dre-ate" className="erp-input" type="date" value={periodo.ate} onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))} /></div>
      <div className="erp-field erp-c6" style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <button className="erp-btn erp-btn-primary" onClick={gerar} disabled={busy}>Gerar DRE</button>
        <ExportButton title="VFIN0500 — DRE pelo plano de contas" filename="vfin0500-dre-plano" build={() => ({
          columns: ["Conta", "Descrição", "Valor", "% da receita"],
          rows: (dre?.lines ?? []).map((l) => [l.account_number, l.description, num(l.value), num(l.pct_of_revenue, 1)]),
        })} /></div>
    </div></div>
    {!dre ? <Vazio titulo="Escolha o período e gere a DRE" texto="Lê os lançamentos contábeis das contas de resultado (grupos 3 e 4) do plano configurado nos parâmetros contábeis (VCTB0200). A R05 é a DRE montada pelas notas fiscais." /> : (<>
      <Kpis itens={[
        { label: "Receita", value: reais(dre.revenue), tom: "info" },
        { label: "Resultado", value: reais(dre.result), hint: dre.revenue ? pct((dre.result / dre.revenue) * 100) : undefined, tom: dre.result < 0 ? "danger" : "ok" },
      ]} />
      {dre.lines.length === 0 ? <Vazio titulo="Sem lançamentos no período" /> : (
        <Painel titulo="Demonstração do resultado" flush>
          <table className="erp-grid">
            <thead><tr><th>Conta</th><th>Descrição</th><th className="num">Valor</th><th className="num">% receita</th></tr></thead>
            <tbody>{dre.lines.map((l) => (
              <tr key={l.account_number} style={l.analytic ? undefined : { fontWeight: 600, background: "var(--v-surface-2)" }}>
                <td style={{ fontFamily: "var(--font-mono)" }}>{l.account_number}</td>
                <td style={{ paddingLeft: 8 + (l.level - 1) * 14 }}>{l.description}</td>
                <td className={`num${l.value < 0 ? " erp-cell-danger" : ""}`}>{reais(l.value)}</td><td className="num">{pct(l.pct_of_revenue)}</td>
              </tr>
            ))}</tbody>
          </table>
        </Painel>)}
    </>)}
  </>);
}
