import { useCallback, useEffect, useState } from "react";
import { fluxoComPedidos, type SemanaFluxo } from "@/services/gestaoService";
import { ExportButton } from "@/components/ui/ExportButton";
import { Aviso, Kpis, Painel, Vazio } from "../planejamento/planUi";
import { data, num } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";
import { reais } from "../gestao/gestaoFmt";

/**
 * Aba "Projetado com pedidos" da VFIN0300: o caixa semana a semana somando os
 * títulos E os pedidos ainda não faturados (venda a receber, compra a pagar).
 */
export function FluxoComPedidosAba(): JSX.Element {
  const { busy, feedback, run } = useAcao();
  const [dias, setDias] = useState(90);
  const [fluxo, setFluxo] = useState<SemanaFluxo[] | null>(null);

  const carregar = useCallback(async () => { setFluxo(await fluxoComPedidos(dias)); }, [dias]);
  useEffect(() => { void run(carregar); }, [run, carregar]);

  const pior = fluxo?.reduce<SemanaFluxo | null>((m, s) => (!m || s.cumulative < m.cumulative ? s : m), null);
  const fim = fluxo?.[fluxo.length - 1]?.cumulative ?? 0;
  const maxBarra = Math.max(1, ...(fluxo ?? []).map((s) => Math.max(s.receivable_titles + s.receivable_orders, s.payable_titles + s.payable_orders)));

  return (<>
    <Aviso feedback={feedback} busy={busy} />
    <div className="erp-fieldset"><div className="erp-fieldset-body">
      <div className="erp-field erp-c3"><label className="erp-label" htmlFor="fx-dias">Horizonte</label>
        <select id="fx-dias" className="erp-input" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
          {[30, 60, 90, 120, 180].map((d) => <option key={d} value={d}>{d} dias</option>)}
        </select></div>
      <div className="erp-field erp-c9" style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "flex-end" }}>
        <ExportButton title="VFIN0300 — Projetado com pedidos" filename="vfin0300-projetado-pedidos" build={() => ({
          columns: ["Semana", "Receber (títulos)", "Receber (pedidos)", "Pagar (títulos)", "Pagar (pedidos)", "Saldo da semana", "Acumulado"],
          rows: (fluxo ?? []).map((s) => [data(s.week_start), num(s.receivable_titles), num(s.receivable_orders), num(s.payable_titles), num(s.payable_orders), num(s.net), num(s.cumulative)]),
        })} /></div>
    </div></div>
    {!fluxo ? <Vazio titulo="Projetando…" /> : (<>
      <Kpis itens={[
        { label: "A receber", value: reais(fluxo.reduce((t, s) => t + s.receivable_titles + s.receivable_orders, 0)), hint: `dos quais ${reais(fluxo.reduce((t, s) => t + s.receivable_orders, 0))} em pedidos`, tom: "ok" },
        { label: "A pagar", value: reais(fluxo.reduce((t, s) => t + s.payable_titles + s.payable_orders, 0)), hint: `dos quais ${reais(fluxo.reduce((t, s) => t + s.payable_orders, 0))} em pedidos`, tom: "warn" },
        { label: "Saldo projetado no fim", value: reais(fim), tom: fim < 0 ? "danger" : "ok" },
        { label: "Pior semana", value: pior ? reais(pior.cumulative) : "—", hint: pior ? `semana de ${data(pior.week_start)}` : undefined, tom: pior && pior.cumulative < 0 ? "danger" : "info" },
      ]} />
      <Painel titulo="Semana a semana" sub="verde = entra · vermelho = sai" flush>
        <table className="erp-grid">
          <thead><tr><th>Semana</th><th style={{ width: "30%" }}>Movimento</th><th className="num">Receber</th><th className="num">Pagar</th><th className="num">Saldo</th><th className="num">Acumulado</th></tr></thead>
          <tbody>{fluxo.map((s) => {
            const ent = s.receivable_titles + s.receivable_orders, sai = s.payable_titles + s.payable_orders;
            return (
              <tr key={s.week_start}>
                <td>{data(s.week_start)}</td>
                <td>
                  <div title={`Títulos ${reais(s.receivable_titles)} · pedidos ${reais(s.receivable_orders)}`} style={{ height: 6, borderRadius: 3, background: "var(--v-green, #3d7a3d)", width: `${(ent / maxBarra) * 100}%`, marginBottom: 3 }} />
                  <div title={`Títulos ${reais(s.payable_titles)} · pedidos ${reais(s.payable_orders)}`} style={{ height: 6, borderRadius: 3, background: "var(--v-err, #ef4444)", width: `${(sai / maxBarra) * 100}%` }} />
                </td>
                <td className="num">{reais(ent)}</td><td className="num">{reais(sai)}</td>
                <td className={`num${s.net < 0 ? " erp-cell-danger" : ""}`}>{reais(s.net)}</td>
                <td className={`num${s.cumulative < 0 ? " erp-cell-danger" : ""}`}><strong>{reais(s.cumulative)}</strong></td>
              </tr>
            );
          })}</tbody>
        </table>
      </Painel>
      <p className="erp-note">Pedido de venda entra pelo saldo ainda não faturado, na data de entrega mais o prazo médio da condição de pagamento; pedido de compra, pelo saldo ainda não recebido do fornecedor, do mesmo jeito. Título vencido entra nesta semana. O acumulado soma só o que entra e sai a partir de hoje — não inclui o saldo atual dos bancos (veja a aba Saldos).</p>
    </>)}
  </>);
}
