import { Fragment, useState } from "react";
import { estornarMovimento, getKardex, type KardexDTO } from "@/services/stockService";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadWarehouses } from "@/services/lookups";
import { MOVEMENT_LABEL, REFERENCE_LABEL, estornavel, hoje, inicioDoMes, qtd, reais, useAcao } from "./comum";
import { FeedbackBox, Resumo } from "./ui";

/**
 * Extrato do item (kardex): saldo anterior, cada movimento com o saldo
 * acumulado em quantidade e valor, e o saldo final — como o FEST0401 do Focco e
 * o MB51/MB5B do SAP. O estorno de um movimento manual ou de uma transferência
 * é feito aqui mesmo, com motivo.
 */
export function KardexTab({ itemCode }: { itemCode: string }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [almox, setAlmox] = useState<number | undefined>();
  const [de, setDe] = useState(inicioDoMes());
  const [ate, setAte] = useState(hoje());
  const [k, setK] = useState<KardexDTO | null>(null);
  const [estornando, setEstornando] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");

  const consultar = () => run(async () => {
    if (!itemCode) { setFeedback({ type: "error", message: "Selecione o item na barra superior." }); return; }
    setK(await getKardex(itemCode, { warehouse_id: almox, from: de, to: ate }));
  });
  const estornar = (id: number) => run(async () => {
    if (!motivo.trim()) { setFeedback({ type: "error", message: "Informe o motivo do estorno." }); return; }
    const r = await estornarMovimento(id, motivo.trim());
    setEstornando(null); setMotivo("");
    setFeedback({ type: "success", message: `Movimento ${id} estornado (${r.length} lançamento(s) contrário(s)).` });
    setK(await getKardex(itemCode, { warehouse_id: almox, from: de, to: ate }));
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Extrato do item</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c3"><label className="erp-label">Almoxarifado</label>
        <LookupField value={almox} loader={loadWarehouses} entityLabel="almoxarifado" placeholder="Todos" clearable onChange={(c) => setAlmox(c ? Number(c) : undefined)} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">De</label><input className="erp-input" type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Até</label><input className="erp-input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={consultar} disabled={busy || !itemCode}>Consultar extrato</button></div>
      {!itemCode && <div className="erp-field erp-c12"><span className="erp-hint">Selecione o item na barra superior.</span></div>}
    </div></div>

    {k && (
      <div className="erp-fieldset"><div className="erp-fieldset-head">{k.business_code} — {k.name} ({k.uom})</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <Resumo>Saldo anterior: <strong>{qtd(k.opening_qty)} {k.uom}</strong> ({reais(k.opening_value)})</Resumo>
          <Resumo>Entradas: <strong>{qtd(k.total_in)}</strong></Resumo>
          <Resumo>Saídas: <strong>{qtd(k.total_out)}</strong></Resumo>
          <Resumo>Saldo final: <strong>{qtd(k.closing_qty)} {k.uom}</strong> ({reais(k.closing_value)})</Resumo>
        </div>
        <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
          <table className="erp-grid">
            <thead><tr><th>Data</th><th>Mov.</th><th>Tipo</th><th>Origem</th><th>Almox.</th><th>Lote</th><th className="num">Entrada</th><th className="num">Saída</th><th className="num">Saldo</th><th className="num">Custo un.</th><th className="num">Valor</th><th className="num">Valor do saldo</th><th></th></tr></thead>
            <tbody>
              {k.lines.length === 0 && <tr><td colSpan={13} className="erp-grid-empty">Nenhum movimento no período.</td></tr>}
              {k.lines.map((l) => {
                const podeEstornar = estornavel({ reference_type: l.reference_type, reversed_by_movement_id: l.reversed ? 1 : undefined, reverses_movement_id: l.is_reversal ? 1 : undefined, movement_type: l.movement_type });
                return (<Fragment key={l.movement_id}>
                  <tr style={{ opacity: l.reversed ? 0.55 : 1, textDecoration: l.reversed ? "line-through" : undefined }}>
                    <td>{new Date(l.date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td>{l.movement_id}</td>
                    <td>{MOVEMENT_LABEL[l.movement_type] ?? l.movement_type}{l.movement_type_code ? ` · ${l.movement_type_code}` : ""}</td>
                    <td title={l.notes}>{l.reference_type ? `${REFERENCE_LABEL[l.reference_type] ?? l.reference_type} ${l.reference_code ?? ""}` : "Manual"}{l.cost_center_code ? ` · CC ${l.cost_center_code}` : ""}</td>
                    <td><EntityName code={l.warehouse_id} loader={loadWarehouses} prefix="" /></td>
                    <td>{l.lot || "—"}</td>
                    <td className="num">{l.in_qty ? qtd(l.in_qty) : ""}</td>
                    <td className="num">{l.out_qty ? qtd(l.out_qty) : ""}</td>
                    <td className="num"><strong>{qtd(l.balance_qty)}</strong></td>
                    <td className="num">{reais(l.unit_cost)}</td>
                    <td className="num">{reais(l.value)}</td>
                    <td className="num">{reais(l.balance_value)}</td>
                    <td>{podeEstornar && <button className="erp-btn erp-btn-sm" onClick={() => { setEstornando(l.movement_id); setMotivo(""); }} disabled={busy}>Estornar</button>}
                      {l.reversed && <span className="erp-badge erp-badge-gray">estornado</span>}
                      {l.is_reversal && <span className="erp-badge erp-badge-blue">estorno</span>}</td>
                  </tr>
                  {estornando === l.movement_id && (
                    <tr><td colSpan={13}>
                      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <span>Estornar o movimento {l.movement_id}{l.reference_type === "TRANSFERENCIA" ? " (as duas pernas da transferência)" : ""}. Motivo:</span>
                        <input className="erp-input" style={{ maxWidth: 360 }} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: lançado no almoxarifado errado" />
                        <button className="erp-btn erp-btn-danger" onClick={() => estornar(l.movement_id)} disabled={busy}>Confirmar estorno</button>
                        <button className="erp-btn" onClick={() => setEstornando(null)} disabled={busy}>Cancelar</button>
                      </div>
                    </td></tr>
                  )}
                </Fragment>);
              })}
            </tbody>
          </table>
        </div>
      </div></div>
    )}
  </>);
}
