import { useCallback, useEffect, useState } from "react";
import { type ContasPagarPorPlano, type ListFilters, listContasPagarPorPlano } from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Contas a pagar por plano de contas. Título com rateio entra pela parte de
 * cada plano: a nota de 100 mil com 50 mil de matéria-prima e 50 mil de EPI
 * aparece como 50 mil em cada um, com o pago de cada parte proporcional ao
 * pagamento do título.
 */
export function ContasPagarPorPlanoView({ filtros }: { filtros: ListFilters }): JSX.Element {
  const [linhas, setLinhas] = useState<ContasPagarPorPlano[]>([]);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    setBusy(true); setErro("");
    try {
      setLinhas(await listContasPagarPorPlano({
        start_date: filtros.start_date, end_date: filtros.end_date, date_field: filtros.date_field,
        status: filtros.status, fornecedor_id: filtros.fornecedor_id ? Number(filtros.fornecedor_id) : undefined,
      }));
    } catch (e) { setErro(errMessage(e)); } finally { setBusy(false); }
  }, [filtros]);

  useEffect(() => { void carregar(); }, [carregar]);

  const tot = linhas.reduce((s, l) => ({
    total: s.total + l.valor_total, pago: s.pago + l.valor_pago, aberto: s.aberto + l.valor_aberto, vencido: s.vencido + l.valor_vencido,
  }), { total: 0, pago: 0, aberto: 0, vencido: 0 });

  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Contas a pagar por plano de contas
        <span style={{ fontWeight: 400, opacity: 0.65 }}> — usa o período, a situação e o fornecedor do filtro da carteira</span></div>
      <div className="erp-fieldset-body">
        {erro && <div className="erp-field erp-c12"><div className="erp-feedback error">{erro}</div></div>}
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr>
              <th>Plano de contas</th><th>Centro de custo</th><th className="num">Títulos</th>
              <th className="num">Total</th><th className="num">Pago</th><th className="num">Em aberto</th><th className="num">Vencido</th><th className="num">%</th>
            </tr></thead>
            <tbody>
              {busy && <tr><td colSpan={8} className="erp-grid-empty">Carregando…</td></tr>}
              {!busy && linhas.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum título no período.</td></tr>}
              {!busy && linhas.map((l, i) => (
                <tr key={i}>
                  <td>{l.plano_contas_codigo ? `${l.plano_contas_codigo} — ` : ""}{l.plano_contas_nome}</td>
                  <td>{l.centro_custo_nome || "—"}</td>
                  <td className="num">{l.qtd_titulos}</td>
                  <td className="num">{money(l.valor_total)}</td>
                  <td className="num">{money(l.valor_pago)}</td>
                  <td className="num">{money(l.valor_aberto)}</td>
                  <td className={`num${l.valor_vencido > 0 ? " erp-cell-danger" : ""}`}>{money(l.valor_vencido)}</td>
                  <td className="num">{tot.total ? ((l.valor_total * 100) / tot.total).toFixed(1) : "0"}%</td>
                </tr>
              ))}
            </tbody>
            {linhas.length > 0 && (
              <tfoot><tr>
                <td colSpan={3}>Total</td>
                <td className="num">{money(tot.total)}</td><td className="num">{money(tot.pago)}</td>
                <td className="num">{money(tot.aberto)}</td><td className="num">{money(tot.vencido)}</td><td />
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
