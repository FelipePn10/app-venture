import { useCallback, useEffect, useState } from "react";
import { baixarTransito, enviarParaTransito, listarTransitos, type TransitoDTO } from "@/services/stockService";
import { EntityName } from "@/components/ui/EntityName";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadWarehouseAddresses, loadWarehouses } from "@/services/lookups";
import { dataBR, qtd, useAcao } from "./comum";
import { FeedbackBox } from "./ui";

type Acao = "RECEBER" | "DEVOLVER" | "PERDA";
const VAZIO = { item_code: "", from: 0, to: 0, transit: 0, quantity: "", lot: "", from_address: "", expected_date: "", notes: "" };
const pendente = (t: TransitoDTO) => t.quantity - t.received_qty - t.returned_qty - t.lost_qty;

/**
 * Transferência em duas etapas: o material sai da origem, fica no almoxarifado
 * de trânsito e só entra no destino ao ser recebido. Enquanto isso conta como a
 * caminho na reposição e não conta para promessa.
 */
export function TransitoSecao({ itemCode }: { itemCode: string }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [f, setF] = useState({ ...VAZIO, item_code: itemCode });
  const [lista, setLista] = useState<TransitoDTO[]>([]);
  const [soAbertos, setSoAbertos] = useState(true);
  const [aberto, setAberto] = useState<number | null>(null);
  const [baixa, setBaixa] = useState({ action: "RECEBER" as Acao, quantity: "", address: "", reason: "" });
  const set = (k: keyof typeof VAZIO, v: string | number) => setF((p) => ({ ...p, [k]: v }));

  const carregar = useCallback(() => run(async () => { setLista(await listarTransitos(soAbertos)); }), [run, soAbertos]);
  useEffect(() => { void carregar(); }, [carregar]);

  const enviar = () => run(async () => {
    if (!f.item_code || !f.from || !f.to || !f.quantity) { setFeedback({ type: "error", message: "Informe item, origem, destino e quantidade." }); return; }
    const r = await enviarParaTransito({
      item_code: f.item_code, from_warehouse_id: f.from, to_warehouse_id: f.to, transit_warehouse_id: f.transit || undefined, quantity: f.quantity.replace(",", "."),
      lot: f.lot || undefined, from_address: f.from_address || undefined, expected_date: f.expected_date || undefined, notes: f.notes || undefined,
    });
    setF({ ...VAZIO, item_code: itemCode });
    setLista(await listarTransitos(soAbertos));
    setFeedback({ type: "success", message: `Envio ${r.code} em trânsito: receba quando o material chegar.` });
  });
  const abrir = (t: TransitoDTO) => {
    setAberto(aberto === t.id ? null : t.id);
    setBaixa({ action: "RECEBER", quantity: String(pendente(t)), address: "", reason: "" });
  };
  const confirmar = (t: TransitoDTO) => run(async () => {
    if (!(Number(baixa.quantity.replace(",", ".")) > 0)) { setFeedback({ type: "error", message: "Informe a quantidade." }); return; }
    const r = await baixarTransito(t.id, {
      action: baixa.action, quantity: baixa.quantity.replace(",", "."), address: baixa.address || undefined, reason: baixa.reason || undefined,
    });
    setAberto(null);
    setLista(await listarTransitos(soAbertos));
    setFeedback({ type: "success", message: r.status === "ENCERRADA" ? `Envio ${r.code} encerrado.` : `Envio ${r.code}: ainda há ${qtd(pendente(r))} em trânsito.` });
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Em duas etapas (estoque em trânsito)</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Item</label>
        <LookupField value={f.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => set("item_code", String(c ?? ""))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Origem</label>
        <LookupField value={f.from || undefined} loader={loadWarehouses} entityLabel="almoxarifado de origem" onChange={(c) => set("from", c ? Number(c) : 0)} /></div>
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Destino</label>
        <LookupField value={f.to || undefined} loader={loadWarehouses} entityLabel="almoxarifado de destino" onChange={(c) => set("to", c ? Number(c) : 0)} /></div>
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Quantidade</label>
        <input className="erp-input num" value={f.quantity} onChange={(e) => set("quantity", e.target.value)} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Lote</label><input className="erp-input" value={f.lot} onChange={(e) => set("lot", e.target.value)} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Endereço de origem</label>
        <LookupField value={f.from_address || undefined} loader={loadWarehouseAddresses(f.from || undefined)} entityLabel="endereço" placeholder="Sem endereço" clearable onChange={(c) => set("from_address", c ? String(c) : "")} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Almoxarifado de trânsito</label>
        <LookupField value={f.transit || undefined} loader={loadWarehouses} entityLabel="almoxarifado de trânsito" placeholder="O único da empresa" clearable onChange={(c) => set("transit", c ? Number(c) : 0)} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Previsão de chegada</label><input className="erp-input" type="date" value={f.expected_date} onChange={(e) => set("expected_date", e.target.value)} /></div>
      <div className="erp-field erp-c6"><label className="erp-label">Observação</label><input className="erp-input" value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <button className="erp-btn erp-btn-primary" onClick={enviar} disabled={busy}>Enviar para trânsito</button>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={soAbertos} onChange={(e) => setSoAbertos(e.target.checked)} /> Só o que está em trânsito</label>
        <span className="erp-hint">Precisa de um almoxarifado com localização Trânsito no cadastro.</span>
      </div>
      <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
        <table className="erp-grid">
          <thead><tr><th>Envio</th><th>Item</th><th>Lote</th><th>Origem</th><th>Destino</th><th>Previsão</th><th className="num">Enviado</th><th className="num">Em trânsito</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhum envio em trânsito.</td></tr>}
            {lista.flatMap((t) => [
              <tr key={t.id}>
                <td><strong>{t.code}</strong></td><td><EntityName code={t.item_code} loader={loadItems} prefix="Item" /></td><td>{t.lot || "—"}</td>
                <td><EntityName code={t.from_warehouse_id} loader={loadWarehouses} prefix="Almox." /></td>
                <td><EntityName code={t.to_warehouse_id} loader={loadWarehouses} prefix="Almox." /></td>
                <td>{dataBR(t.expected_date)}</td><td className="num">{qtd(t.quantity)}</td><td className="num">{qtd(pendente(t))}</td>
                <td>{t.status === "ENCERRADA" ? "Encerrado" : "Em trânsito"}</td>
                <td>{t.status !== "ENCERRADA" && <button className="erp-btn erp-btn-sm" onClick={() => abrir(t)}>{aberto === t.id ? "Fechar" : "Dar baixa"}</button>}</td>
              </tr>,
              ...(aberto === t.id ? [
                <tr key={`${t.id}-baixa`}><td colSpan={10}>
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "end", flexWrap: "wrap", gap: 8 }}>
                    <div><label className="erp-label">O que aconteceu</label>
                      <select className="erp-input" value={baixa.action} onChange={(e) => setBaixa((p) => ({ ...p, action: e.target.value as Acao }))}>
                        <option value="RECEBER">Chegou ao destino</option><option value="DEVOLVER">Voltou à origem</option><option value="PERDA">Perda no transporte</option>
                      </select></div>
                    <div><label className="erp-label">Quantidade</label><input className="erp-input num" style={{ maxWidth: 120 }} value={baixa.quantity} onChange={(e) => setBaixa((p) => ({ ...p, quantity: e.target.value }))} /></div>
                    {baixa.action !== "PERDA" && <div style={{ minWidth: 220 }}><label className="erp-label">Endereço de chegada</label>
                      <LookupField value={baixa.address || undefined} loader={loadWarehouseAddresses(baixa.action === "RECEBER" ? t.to_warehouse_id : t.from_warehouse_id)} entityLabel="endereço" placeholder="Sem endereço" clearable onChange={(c) => setBaixa((p) => ({ ...p, address: c ? String(c) : "" }))} /></div>}
                    {baixa.action !== "RECEBER" && <div style={{ minWidth: 260 }}><label className="erp-label erp-req">Motivo</label><input className="erp-input" value={baixa.reason} onChange={(e) => setBaixa((p) => ({ ...p, reason: e.target.value }))} /></div>}
                    <button className="erp-btn erp-btn-primary" onClick={() => confirmar(t)} disabled={busy}>Confirmar</button>
                  </div>
                </td></tr>,
              ] : []),
            ])}
          </tbody>
        </table>
      </div>
    </div></div>
  </>);
}
