import { useState } from "react";
import { margemDoPedido, type MargemPedido } from "@/services/gestaoService";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadSalesOrders } from "@/services/lookups";
import { Aviso, Kpis, Painel, Selo, Vazio } from "../planejamento/planUi";
import { num, pct } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";
import { reais } from "../gestao/gestaoFmt";

/**
 * Aba "Por pedido" da VCUS0200: a margem de um pedido de venda pelo custo-padrão
 * (pedido inteiro) e pelo custo que saiu do estoque nas notas já faturadas.
 */
export function MargemDoPedidoAba(): JSX.Element {
  const { busy, feedback, run } = useAcao();
  const [pedido, setPedido] = useState<number | undefined>();
  const [margem, setMargem] = useState<MargemPedido | null>(null);
  const faturou = (margem?.lines ?? []).some((l) => l.invoiced_qty > 0);
  const abrir = (c?: number) => { setPedido(c); setMargem(null); if (c) void run(async () => setMargem(await margemDoPedido(c))); };

  return (<>
    <Aviso feedback={feedback} busy={busy} />
    <div className="erp-fieldset"><div className="erp-fieldset-body">
      <div className="erp-field erp-c6"><label className="erp-label">Pedido de venda</label>
        <LookupField value={pedido} loader={loadSalesOrders} entityLabel="pedido de venda" onChange={(c) => abrir(c ? Number(c) : undefined)} /></div>
      <div className="erp-field erp-c6" style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "flex-end" }}>
        <ExportButton title="VCUS0200 — Margem do pedido" filename="vcus0200-pedido" build={() => ({
          columns: ["Linha", "Item", "Qtd", "Receita", "Custo padrão", "Custo real", "Margem padrão", "Margem real", "% padrão", "% real"],
          rows: (margem?.lines ?? []).map((l) => [String(l.line_code), `${l.item_code} ${l.item_name}`, num(l.quantity), num(l.revenue), num(l.standard_cost), num(l.actual_cost), num(l.standard_margin), num(l.actual_margin), num(l.standard_margin_pct, 1), num(l.actual_margin_pct, 1)]),
        })} /></div>
    </div></div>
    {!pedido ? <Vazio titulo="Escolha o pedido de venda" texto="A margem pelo padrão usa o custo-padrão do item sobre o pedido inteiro; a real usa o custo que saiu do estoque nas notas já faturadas, só sobre a parte faturada. A apuração do mês (aba Apuração) inclui impostos e despesas; esta é a margem bruta do pedido." />
      : !margem ? <Vazio titulo="Calculando…" /> : (<>
        <Kpis itens={[
          { label: "Receita", value: reais(margem.revenue), tom: "info" },
          margem.standard_cost === 0
            ? { label: "Margem pelo padrão", value: "—", hint: "itens sem custo-padrão: apure na VCUS0100", tom: "warn" }
            : { label: "Margem pelo padrão", value: reais(margem.standard_margin), hint: pct(margem.standard_margin_pct), tom: margem.standard_margin < 0 ? "danger" : "ok" },
          faturou
            ? { label: "Margem real", value: reais(margem.actual_margin), hint: `${pct(margem.actual_margin_pct)} da parte faturada`, tom: margem.actual_margin < 0 ? "danger" : margem.actual_margin_pct < margem.standard_margin_pct ? "warn" : "ok" }
            : { label: "Margem real", value: "—", hint: "nada faturado ainda", tom: "muted" },
        ]} />
        <Painel titulo={`Pedido ${margem.sales_order_code}`} flush>
          <table className="erp-grid">
            <thead><tr><th>Item</th><th className="num">Qtd</th><th className="num">Faturado</th><th className="num">Receita</th><th className="num">Custo padrão</th><th className="num">Custo real</th><th className="num">Margem padrão</th><th className="num">Margem real</th><th /></tr></thead>
            <tbody>{margem.lines.map((l) => (
              <tr key={l.line_code}>
                <td>{l.item_code} {l.item_name}</td><td className="num">{num(l.quantity)}</td><td className="num">{num(l.invoiced_qty)}</td><td className="num">{reais(l.revenue)}</td>
                <td className="num">{reais(l.standard_cost)}</td><td className="num">{l.invoiced_qty > 0 ? reais(l.actual_cost) : "—"}</td>
                <td className={`num${l.standard_margin < 0 ? " erp-cell-danger" : ""}`}>{reais(l.standard_margin)} <span className="erp-text-muted">({pct(l.standard_margin_pct)})</span></td>
                <td className={`num${l.actual_margin < 0 ? " erp-cell-danger" : ""}`}>{l.invoiced_qty > 0 ? <>{reais(l.actual_margin)} <span className="erp-text-muted">({pct(l.actual_margin_pct)})</span></> : "—"}</td>
                <td>{l.warning && <Selo tom="warn" title={l.warning}>Atenção</Selo>}</td>
              </tr>
            ))}</tbody>
          </table>
        </Painel>
      </>)}
  </>);
}
