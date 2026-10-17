import { useMemo, useState } from "react";
import { apurarCurvaABC, getAnaliseEstoque, getLotesAVencer, type AnaliseDTO, type LoteAVencerDTO, type ResumoABCDTO } from "@/services/stockService";
import { EntityName } from "@/components/ui/EntityName";
import { loadWarehouses } from "@/services/lookups";
import { dataBR, num, qtd, reais, useAcao } from "./comum";
import { FeedbackBox, Resumo } from "./ui";

type Filtro = "todos" | "parados" | "sem_cobertura" | "cobertura_alta";

/**
 * Análises: giro (consumo anualizado ÷ valor em estoque), cobertura (meses que
 * o saldo dura no consumo médio), itens parados, curva ABC e lotes a vencer —
 * o que o MC44/MC46 do SAP e os relatórios de estoque do Protheus respondem.
 */
export function AnaliseTab() {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [meses, setMeses] = useState(6);
  const [diasParado, setDiasParado] = useState(90);
  const [lista, setLista] = useState<AnaliseDTO[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [abc, setAbc] = useState<ResumoABCDTO | null>(null);
  const [dias, setDias] = useState(30);
  const [lotes, setLotes] = useState<LoteAVencerDTO[] | null>(null);

  const visiveis = useMemo(() => (lista ?? []).filter((a) =>
    filtro === "parados" ? a.idle : filtro === "sem_cobertura" ? a.quantity > 0 && a.consumed_qty === 0 : filtro === "cobertura_alta" ? (a.coverage_months ?? 0) > 12 : true,
  ), [lista, filtro]);
  const valorParado = (lista ?? []).filter((a) => a.idle).reduce((s, a) => s + a.value, 0);
  const valorTotal = (lista ?? []).reduce((s, a) => s + a.value, 0);

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Giro, cobertura e itens parados</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label">Janela (meses)</label><input className="erp-input num" type="number" min={1} value={meses} onChange={(e) => setMeses(Number(e.target.value) || 6)} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Parado após (dias)</label><input className="erp-input num" type="number" min={1} value={diasParado} onChange={(e) => setDiasParado(Number(e.target.value) || 90)} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={() => run(async () => setLista(await getAnaliseEstoque(meses, diasParado)))} disabled={busy}>Analisar</button></div>
      <div className="erp-field erp-c3"><label className="erp-label">Mostrar</label>
        <select className="erp-input" value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)}>
          <option value="todos">Todos</option><option value="parados">Parados</option><option value="sem_cobertura">Com saldo e sem consumo</option><option value="cobertura_alta">Cobertura acima de 12 meses</option>
        </select></div>
      {lista && <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><Resumo>Estoque {reais(valorTotal)} · parado <strong>{reais(valorParado)}</strong></Resumo></div>}
      {lista && (
        <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
          <table className="erp-grid">
            <thead><tr><th>Item</th><th>Descrição</th><th>ABC</th><th className="num">Saldo</th><th className="num">Valor</th><th className="num">Consumo</th><th className="num">Consumo/mês</th><th className="num">Cobertura</th><th className="num">Giro/ano</th><th>Último mov.</th></tr></thead>
            <tbody>
              {visiveis.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhum item nesse filtro.</td></tr>}
              {visiveis.map((a) => (
                <tr key={a.item_code} style={{ background: a.idle ? "var(--v-warn-bg, #fff7e6)" : undefined }}>
                  <td><strong>{a.business_code}</strong></td><td>{a.name}</td><td>{a.abc_class ?? "—"}</td>
                  <td className="num">{qtd(a.quantity)} {a.uom}</td><td className="num">{reais(a.value)}</td>
                  <td className="num">{qtd(a.consumed_qty)}</td><td className="num">{qtd(a.avg_monthly_consumption)}</td>
                  <td className="num">{a.coverage_months != null ? `${num(a.coverage_months, 1)} m` : "—"}</td>
                  <td className="num">{a.turnover != null ? num(a.turnover, 2) : "—"}</td>
                  <td>{a.last_movement_at ? `${dataBR(a.last_movement_at)}${a.idle ? ` · parado ${a.idle_days} d` : ""}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div></div>

    <div className="erp-fieldset"><div className="erp-fieldset-head">Curva ABC (valor consumido)</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <button className="erp-btn" onClick={() => run(async () => { const r = await apurarCurvaABC(); setAbc(r); setFeedback({ type: "success", message: `${r.classified} item(ns) classificados.` }); })} disabled={busy}>Recalcular curva ABC</button>
        <span className="erp-hint">A classe governa a frequência da contagem cíclica (VEST0500). Transferências e estornos não contam como consumo.</span>
      </div>
      {abc && (
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Item</th><th className="num">Valor consumido</th><th className="num">Participação</th><th className="num">Acumulado</th><th>Classe</th></tr></thead>
            <tbody>{abc.items.map((i) => <tr key={i.item_code}><td>{i.item_code}</td><td className="num">{reais(i.consumption_value)}</td><td className="num">{i.share_pct.toFixed(2)}%</td><td className="num">{i.cumulative_pct.toFixed(2)}%</td><td><strong>{i.abc_class}</strong></td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div></div>

    <div className="erp-fieldset"><div className="erp-fieldset-head">Lotes vencidos ou a vencer</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label">Vencendo em (dias)</label><input className="erp-input num" type="number" min={1} value={dias} onChange={(e) => setDias(Number(e.target.value) || 30)} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={() => run(async () => setLotes(await getLotesAVencer(dias)))} disabled={busy}>Consultar lotes</button></div>
      {lotes && (
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Item</th><th>Descrição</th><th>Lote</th><th>Almoxarifado</th><th className="num">Saldo</th><th>Validade</th><th>Situação</th></tr></thead>
            <tbody>
              {lotes.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum lote vencendo no período.</td></tr>}
              {lotes.map((l, i) => (
                <tr key={`${l.item_code}-${l.lot}-${i}`}>
                  <td><strong>{l.business_code}</strong></td><td>{l.name}</td><td>{l.lot}</td>
                  <td><EntityName code={l.warehouse_id} loader={loadWarehouses} prefix="Almox." /></td>
                  <td className="num">{qtd(l.quantity)}</td><td>{dataBR(l.expires_at)}</td>
                  <td>{l.expired ? <span className="erp-badge erp-badge-red">vencido há {-l.days_to_expire} d</span> : <span className="erp-badge erp-badge-amber">vence em {l.days_to_expire} d</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div></div>
  </>);
}
