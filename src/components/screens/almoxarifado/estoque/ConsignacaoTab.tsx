import { useCallback, useEffect, useState } from "react";
import { consumirConsignacao, devolverConsignacao, listarConsignacoes, listarTransferenciasCnpj, receberConsignacao, type ConsignacaoDTO, type TransferenciaCnpjDTO } from "@/services/stockService";
import { LookupField } from "@/components/ui/LookupField";
import { loadItemMasks, loadItems, loadSuppliers, loadWarehouses } from "@/services/lookups";
import { dataBR, hoje, qtd, reais, useAcao } from "./comum";
import { FeedbackBox } from "./ui";

const SITUACAO: Record<string, string> = { EM_TRANSITO: "Em trânsito", RECEBIDA: "Recebida", CANCELADA: "Cancelada" };
const RECEBER_VAZIO = { supplier_code: "", item_code: "", mask: "", lot: "", quantity: "", unit_value: "", document: "", issue_date: hoje(), due_date: "" };
/** Seis casas, como no banco: a sobra do ponto flutuante passaria do saldo na baixa. */
const saldoDe = (c: ConsignacaoDTO) => Number((c.quantity - c.settled_qty - c.returned_qty).toFixed(6));
const vencida = (c: ConsignacaoDTO) => Boolean(c.due_date && c.due_date.slice(0, 10) < hoje());

/**
 * Consignação nos dois sentidos. A remessa e a venda ao cliente nascem na NF-e, pelo
 * tipo de nota; aqui ficam o saldo, a devolução e o material recebido do fornecedor.
 */
export function ConsignacaoTab() {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [direcao, setDirecao] = useState<"SAIDA" | "ENTRADA">("SAIDA");
  const [abertas, setAbertas] = useState(true);
  const [lista, setLista] = useState<ConsignacaoDTO[]>([]);
  const [transferencias, setTransferencias] = useState<TransferenciaCnpjDTO[]>([]);
  const [f, setF] = useState({ ...RECEBER_VAZIO });
  const [baixa, setBaixa] = useState<{ id: number; tipo: "devolver" | "consumir"; quantity: string; document: string; warehouse: string } | null>(null);

  const carregar = useCallback(() => run(async () => {
    setLista(await listarConsignacoes(direcao, abertas));
    setTransferencias(await listarTransferenciasCnpj());
  }), [run, direcao, abertas]);
  useEffect(() => { void carregar(); }, [carregar]);

  const receber = () => run(async () => {
    if (!f.supplier_code || !f.item_code || !f.quantity || !f.unit_value) { setFeedback({ type: "error", message: "Informe fornecedor, item, quantidade e valor." }); return; }
    await receberConsignacao({ supplier_code: Number(f.supplier_code), item_code: f.item_code, quantity: f.quantity.replace(",", "."), unit_value: f.unit_value.replace(",", "."),
      mask: f.mask.trim() || undefined, lot: f.lot.trim() || undefined, document: f.document || undefined, issue_date: f.issue_date, due_date: f.due_date || undefined });
    setF({ ...RECEBER_VAZIO });
    setLista(await listarConsignacoes(direcao, abertas));
    setFeedback({ type: "success", message: "Material registrado. Ele só entra no estoque ao ser consumido." });
  });
  const baixar = () => run(async () => {
    if (!baixa) return;
    const q = baixa.quantity.replace(",", ".");
    if (baixa.tipo === "consumir") {
      if (!baixa.warehouse) { setFeedback({ type: "error", message: "Escolha o almoxarifado que recebe." }); return; }
      await consumirConsignacao(baixa.id, q, Number(baixa.warehouse), baixa.document || undefined);
    } else {
      await devolverConsignacao(baixa.id, q, baixa.document || undefined);
    }
    setBaixa(null);
    setLista(await listarConsignacoes(direcao, abertas));
    setFeedback({ type: "success", message: "Baixa registrada." });
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Consignação</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c4"><label className="erp-label">Sentido</label>
        <select className="erp-input" value={direcao} onChange={(e) => setDirecao(e.target.value as "SAIDA" | "ENTRADA")}>
          <option value="SAIDA">Nossa mercadoria com clientes</option><option value="ENTRADA">Material de fornecedores conosco</option></select></div>
      <div className="erp-field erp-c4" style={{ alignSelf: "end" }}><label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={abertas} onChange={(e) => setAbertas(e.target.checked)} /> Só com saldo</label></div>
      {direcao === "SAIDA" && <div className="erp-field erp-c12"><span className="erp-hint">A remessa e a venda saem pela NF-e, nos tipos de nota Remessa em consignação e Venda em consignação. Configure o almoxarifado em Parâmetros.</span></div>}
      <div className="erp-field erp-c12"><table className="erp-grid">
        <thead><tr><th>{direcao === "SAIDA" ? "Cliente" : "Fornecedor"}</th><th>Item</th><th>Documento</th><th>Emissão</th><th>Vence</th><th className="num">Quantidade</th><th className="num">Baixado</th><th className="num">Devolvido</th><th className="num">Saldo</th><th className="num">Valor unit.</th><th></th></tr></thead>
        <tbody>
          {lista.length === 0 && <tr><td colSpan={11} className="erp-grid-empty">Nada em consignação.</td></tr>}
          {lista.map((c) => (
            <tr key={c.id}>
              <td>{c.partner_name || c.partner_code}</td><td>{c.business_code || c.item_code} {c.item_name}{c.mask ? ` · ${c.mask}` : ""}{c.lot ? ` · lote ${c.lot}` : ""}</td>
              <td>{c.document ?? "—"}</td><td>{dataBR(c.issue_date)}</td>
              <td style={vencida(c) && c.status === "ABERTA" ? { color: "var(--erp-danger, #b42318)", fontWeight: 600 } : undefined}>{c.due_date ? dataBR(c.due_date) : "—"}</td>
              <td className="num">{qtd(c.quantity)}</td><td className="num">{qtd(c.settled_qty)}</td><td className="num">{qtd(c.returned_qty)}</td>
              <td className="num"><strong>{qtd(saldoDe(c))}</strong></td><td className="num">{reais(c.unit_value)}</td>
              <td style={{ display: "flex", gap: 6 }}>{c.status === "ABERTA" && <>
                <button className="erp-btn erp-btn-sm" onClick={() => setBaixa({ id: c.id, tipo: "devolver", quantity: String(saldoDe(c)), document: "", warehouse: "" })}>Devolver</button>
                {c.direction === "ENTRADA" && <button className="erp-btn erp-btn-sm" onClick={() => setBaixa({ id: c.id, tipo: "consumir", quantity: String(saldoDe(c)), document: "", warehouse: "" })}>Consumir</button>}
              </>}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {baixa && (<>
        <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label><input className="erp-input num" value={baixa.quantity} onChange={(e) => setBaixa({ ...baixa, quantity: e.target.value })} /></div>
        <div className="erp-field erp-c4"><label className="erp-label">Nota de {baixa.tipo === "consumir" ? "faturamento" : "devolução"}</label><input className="erp-input" maxLength={60} value={baixa.document} onChange={(e) => setBaixa({ ...baixa, document: e.target.value })} /></div>
        {baixa.tipo === "consumir" && <div className="erp-field erp-c4"><label className="erp-label erp-req">Almoxarifado</label>
          <LookupField value={baixa.warehouse || undefined} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(c) => setBaixa({ ...baixa, warehouse: String(c ?? "") })} /></div>}
        <div className="erp-field erp-c2" style={{ alignSelf: "end", flexDirection: "row", gap: 6 }}>
          <button className="erp-btn erp-btn-primary" onClick={() => void baixar()} disabled={busy}>Confirmar</button>
          <button className="erp-btn" onClick={() => setBaixa(null)}>Cancelar</button></div>
      </>)}
    </div></div>
    {direcao === "ENTRADA" && <div className="erp-fieldset"><div className="erp-fieldset-head">Registrar material recebido</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c4"><label className="erp-label erp-req">Fornecedor</label>
        <LookupField value={f.supplier_code || undefined} loader={loadSuppliers} entityLabel="fornecedor" onChange={(c) => setF((p) => ({ ...p, supplier_code: String(c ?? "") }))} /></div>
      <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label>
        <LookupField value={f.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setF((p) => ({ ...p, item_code: String(c ?? "") }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Máscara</label><LookupField value={f.mask || undefined} loader={loadItemMasks} entityLabel="máscara" onChange={(c) => setF((p) => ({ ...p, mask: String(c ?? "") }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Lote</label><input className="erp-input" maxLength={50} value={f.lot} onChange={(e) => setF((p) => ({ ...p, lot: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label><input className="erp-input num" value={f.quantity} onChange={(e) => setF((p) => ({ ...p, quantity: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Valor unitário</label><input className="erp-input num" value={f.unit_value} onChange={(e) => setF((p) => ({ ...p, unit_value: e.target.value }))} /></div>
      <div className="erp-field erp-c4"><label className="erp-label">Nota do fornecedor</label><input className="erp-input" maxLength={60} value={f.document} onChange={(e) => setF((p) => ({ ...p, document: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Emissão</label><input className="erp-input" type="date" value={f.issue_date} onChange={(e) => setF((p) => ({ ...p, issue_date: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Vencimento</label><input className="erp-input" type="date" value={f.due_date} onChange={(e) => setF((p) => ({ ...p, due_date: e.target.value }))} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={() => void receber()} disabled={busy}>Registrar</button></div>
    </div></div>}
    <div className="erp-fieldset"><div className="erp-fieldset-head">Transferências entre CNPJs ({transferencias.length})</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c12"><span className="erp-hint">Saem pela NF-e com o tipo de nota Transferência para outro estabelecimento da mesma raiz de CNPJ. O destino recebe ao aprovar a nota de entrada.</span></div>
      <div className="erp-field erp-c12"><table className="erp-grid">
        <thead><tr><th>Origem</th><th>Destino</th><th>Chave</th><th>Enviada</th><th>Recebida</th><th>Situação</th></tr></thead>
        <tbody>
          {transferencias.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma transferência.</td></tr>}
          {transferencias.map((t) => <tr key={t.id}><td>{t.origin_name}</td><td>{t.destination_name}</td><td>{t.nfe_key}</td><td>{dataBR(t.created_at)}</td><td>{t.received_at ? dataBR(t.received_at) : "—"}</td><td>{SITUACAO[t.status] ?? t.status}</td></tr>)}
        </tbody>
      </table></div>
    </div></div>
  </>);
}
