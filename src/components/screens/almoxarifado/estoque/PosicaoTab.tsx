import { useState } from "react";
import { getAtp, getConsumptionAverage, getPosicaoEmData, recalcConsumptionAverage, type AtpDTO, type ConsumptionAvgDTO, type PosicaoDTO } from "@/services/stockService";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadWarehouses } from "@/services/lookups";
import { hoje, qtd, reais, useAcao, useUnidadeDoItem } from "./comum";
import { FeedbackBox, SituacaoBadge, Resumo } from "./ui";

/**
 * Posição do estoque. Duas perguntas diferentes:
 *  - "quanto posso prometer deste item?" — o ATP, que agora separa o saldo em
 *    inspeção/rejeição (existe, mas não é prometível);
 *  - "quanto havia de tudo numa data?" — a posição em data, valorizada, com a
 *    segunda unidade quando o item tem conversão (ex.: metros e quilos).
 */
export function PosicaoTab({ itemCode }: { itemCode: string }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const uom = useUnidadeDoItem(itemCode);
  const [atp, setAtp] = useState<AtpDTO | null>(null);
  const [consumo, setConsumo] = useState<ConsumptionAvgDTO | null>(null);
  const [data, setData] = useState(hoje());
  const [almox, setAlmox] = useState<number | undefined>();
  const [posicao, setPosicao] = useState<PosicaoDTO[] | null>(null);

  const consultarItem = () => run(async () => {
    if (!itemCode) { setFeedback({ type: "error", message: "Selecione o item na barra superior." }); return; }
    setAtp(await getAtp(itemCode));
    try { setConsumo(await getConsumptionAverage(itemCode)); } catch { setConsumo(null); }
  });
  const recalcular = () => run(async () => {
    if (!itemCode) return;
    await recalcConsumptionAverage(itemCode);
    setConsumo(await getConsumptionAverage(itemCode));
    setFeedback({ type: "success", message: "Consumo médio recalculado (transferências e estornos não contam como consumo)." });
  });
  const consultarPosicao = () => run(async () => { setPosicao(await getPosicaoEmData(data, almox)); });
  const totalValor = (posicao ?? []).reduce((s, p) => s + p.value, 0);

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Disponível para promessa (ATP){itemCode ? ` — item ${itemCode}` : ""}</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <button className="erp-btn erp-btn-primary" onClick={consultarItem} disabled={busy || !itemCode}>Consultar item</button>
        <button className="erp-btn" onClick={recalcular} disabled={busy || !itemCode}>Recalcular consumo médio</button>
        {!itemCode && <span className="erp-hint">Selecione o item na barra superior.</span>}
      </div>
      {atp && <>
        <div className="erp-field erp-c2"><label className="erp-label">Em mãos</label><input className="erp-input num" value={`${qtd(atp.total_on_hand)} ${uom}`} readOnly /></div>
        <div className="erp-field erp-c2"><label className="erp-label">Reservado</label><input className="erp-input num" value={`${qtd(atp.total_reserved)} ${uom}`} readOnly /></div>
        <div className="erp-field erp-c2"><label className="erp-label">Disponível (ATP)</label><input className="erp-input num" style={{ fontWeight: 700 }} value={`${qtd(atp.total_available)} ${uom}`} readOnly /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Não prometível</label><input className="erp-input num" value={`${qtd(atp.total_not_available)} ${uom}`} readOnly title="Saldo em inspeção, rejeição ou almoxarifado indisponível" /></div>
        {consumo && <div className="erp-field erp-c3"><label className="erp-label">Consumo médio/mês</label><input className="erp-input num" value={`${qtd(consumo.avg_monthly_consumption)} ${uom} (${consumo.window_months} meses)`} readOnly /></div>}
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Almoxarifado</th><th>Situação</th><th className="num">Saldo</th><th className="num">Reservado</th><th className="num">Disponível</th><th className="num">Custo médio</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {atp.warehouses.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Sem saldo em nenhum almoxarifado.</td></tr>}
              {atp.warehouses.map((w, i) => (
                <tr key={i} style={{ opacity: w["available_to_promise"] === false ? 0.7 : 1 }}>
                  <td><EntityName code={Number(w["warehouse_id"])} loader={loadWarehouses} prefix="Almox." /></td>
                  <td><SituacaoBadge situacao={String(w["stock_status"] ?? "")} /></td>
                  <td className="num">{qtd(Number(w["quantity"]))}</td>
                  <td className="num">{qtd(Number(w["reserved_qty"]))}</td>
                  <td className="num">{qtd(Number(w["available_qty"]))}</td>
                  <td className="num">{reais(Number(w["avg_cost"]))}</td>
                  <td className="num">{reais(Number(w["total_cost"]))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}
    </div></div>

    <div className="erp-fieldset"><div className="erp-fieldset-head">Posição em data (valorizada)</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label">Data</label><input className="erp-input" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Almoxarifado</label>
        <LookupField value={almox} loader={loadWarehouses} entityLabel="almoxarifado" placeholder="Todos" clearable onChange={(c) => setAlmox(c ? Number(c) : undefined)} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={consultarPosicao} disabled={busy}>Consultar posição</button></div>
      {posicao && <div className="erp-field erp-c5" style={{ alignSelf: "end" }}><Resumo>{posicao.length} item(ns) · valor total <strong>{reais(totalValor)}</strong></Resumo></div>}
      {posicao && (
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Item</th><th>Descrição</th><th>Almoxarifado</th><th className="num">Quantidade</th><th>UM</th><th className="num">2ª unidade</th><th className="num">Custo médio</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {posicao.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum saldo nessa data.</td></tr>}
              {posicao.map((p) => (
                <tr key={`${p.item_code}-${p.warehouse_id}`} style={{ color: p.quantity < 0 ? "var(--v-err)" : undefined }}>
                  <td><strong>{p.business_code}</strong></td><td>{p.name}</td>
                  <td><EntityName code={p.warehouse_id} loader={loadWarehouses} prefix="Almox." /></td>
                  <td className="num">{qtd(p.quantity)}</td><td>{p.uom}</td>
                  <td className="num">{p.alt_quantity != null ? `${qtd(p.alt_quantity)} ${p.alt_uom}` : "—"}</td>
                  <td className="num">{reais(p.avg_cost)}</td><td className="num">{reais(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div></div>
  </>);
}
