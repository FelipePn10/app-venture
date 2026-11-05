import { useState } from "react";
import { acertarInconsistencia, listInconsistencias, type InconsistenciaDTO, type InconsistenciaTipo } from "@/services/stockService";
import { pedirTexto } from "@/components/ui";
import { EntityName } from "@/components/ui/EntityName";
import { LookupField } from "@/components/ui/LookupField";
import { loadWarehouses } from "@/services/lookups";
import { qtd, useAcao } from "./comum";
import { FeedbackBox, Resumo } from "./ui";

const TIPOS: Record<InconsistenciaTipo, { rotulo: string; gravado: string; esperado: string }> = {
  SALDO_X_MOVIMENTOS: { rotulo: "Saldo diferente dos movimentos", gravado: "Saldo", esperado: "Pelos movimentos" },
  LOTE_X_SALDO: { rotulo: "Lotes acima do saldo", gravado: "Nos lotes", esperado: "Cabe no saldo" },
  RESERVADO_X_RESERVAS: { rotulo: "Reservado diferente das reservas", gravado: "Reservado", esperado: "Reservas ativas" },
};

/**
 * Confere o saldo gravado contra a sua origem. Os movimentos são a verdade: o
 * acerto refaz o saldo sem criar movimento e fica registrado com autor e motivo.
 * Rode antes de um inventário, para não contar sobre um saldo errado.
 */
export function ConferenciaTab({ itemCode }: { itemCode: string }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [almox, setAlmox] = useState(0);
  const [lista, setLista] = useState<InconsistenciaDTO[] | null>(null);

  const consultar = () => run(async () => { setLista(await listInconsistencias({ warehouseId: almox || undefined, itemCode: itemCode || undefined })); });
  const acertar = async (i: InconsistenciaDTO) => {
    const motivo = await pedirTexto({ titulo: "Acertar saldo", assunto: `${TIPOS[i.kind].rotulo} — ${i.name || i.business_code}`, rotulo: "Motivo do acerto", minimo: 5 });
    if (!motivo) return;
    await run(async () => {
      await acertarInconsistencia({ kind: i.kind, item_code: i.item_code, mask: i.mask, warehouse_id: i.warehouse_id, reason: motivo });
      setLista(await listInconsistencias({ warehouseId: almox || undefined, itemCode: itemCode || undefined }));
      setFeedback({ type: "success", message: "Saldo acertado. O acerto ficou registrado com o seu nome e o motivo." });
    });
  };

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Conferência do saldo</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c4"><label className="erp-label">Almoxarifado</label>
        <LookupField value={almox || undefined} loader={loadWarehouses} entityLabel="almoxarifado" placeholder="Todos" onChange={(c) => setAlmox(c ? Number(c) : 0)} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={consultar} disabled={busy}>Conferir</button></div>
      <div className="erp-field erp-c6" style={{ alignSelf: "end" }}><span className="erp-hint">Boa prática antes de abrir um inventário.{itemCode ? " Somente o item escolhido na barra." : ""}</span></div>
      {lista && lista.length === 0 && <div className="erp-field erp-c12"><Resumo>Nenhuma inconsistência: o saldo bate com os movimentos, os lotes e as reservas.</Resumo></div>}
      {lista && lista.length > 0 && <div className="erp-field erp-c12"><div className="erp-grid-wrap"><table className="erp-grid">
        <thead><tr><th>Divergência</th><th>Item</th><th>Almoxarifado</th><th className="num">Gravado</th><th className="num">Esperado</th><th className="num">Diferença</th><th></th></tr></thead>
        <tbody>{lista.map((i) => (
          <tr key={`${i.kind}-${i.item_code}-${i.mask}-${i.warehouse_id}`}>
            <td>{TIPOS[i.kind]?.rotulo ?? "Divergência de saldo"}</td>
            <td>{i.name || i.business_code}{i.name ? ` (${i.business_code})` : ""}{i.mask ? ` · ${i.mask}` : ""}</td>
            <td><EntityName code={i.warehouse_id} loader={loadWarehouses} prefix="Almox." /></td>
            <td className="num">{qtd(i.recorded_qty)}</td><td className="num">{qtd(i.expected_qty)}</td><td className="num">{qtd(i.difference_qty)}</td>
            <td><button className="erp-btn erp-btn-sm" onClick={() => void acertar(i)} disabled={busy}>Acertar</button></td>
          </tr>))}</tbody>
      </table></div></div>}
    </div></div>
  </>);
}
