import { Fragment, useState } from "react";
import { atenderRequisicao, cancelarRequisicao, criarRequisicao, listarRequisicoes, type RequisicaoDTO } from "@/services/stockService";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadCostCenters, loadItems, loadWarehouseAddresses, loadWarehouses } from "@/services/lookups";
import { dataBR, qtd, useAcao } from "./comum";
import { FeedbackBox } from "./ui";

type Linha = { item_code: string; quantity: string };
const STATUS_COR: Record<string, string> = { PENDENTE_APROVACAO: "erp-badge-amber", ABERTA: "erp-badge-blue", PARCIAL: "erp-badge-amber", ATENDIDA: "erp-badge-green", CANCELADA: "erp-badge-gray", REPROVADA: "erp-badge-gray" };
const STATUS_NOME: Record<string, string> = { PENDENTE_APROVACAO: "Aguardando aprovação", ABERTA: "Aberta", PARCIAL: "Atendida em parte", ATENDIDA: "Atendida", CANCELADA: "Cancelada", REPROVADA: "Reprovada" };

/**
 * Requisição ao almoxarifado: quem pede, para qual centro de custo e o quê; o
 * almoxarife entrega (total ou em parte) e cada entrega é uma saída no centro
 * de custo da requisição — o consumo interno deixa de ser um "OUT" sem dono.
 * Com destino, é uma ordem de reposição: a entrega transfere entre almoxarifados.
 * Ao abrir, reserva o que houver livre; com alçada, só depois de aprovada.
 */
export function RequisicoesTab() {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lista, setLista] = useState<RequisicaoDTO[]>([]);
  const [status, setStatus] = useState("");
  const [nova, setNova] = useState({ warehouse_id: 0, destination_warehouse_id: undefined as number | undefined, requester_name: "", cost_center_code: undefined as number | undefined, needed_date: "", notes: "" });
  const [linhas, setLinhas] = useState<Linha[]>([{ item_code: "", quantity: "" }]);
  const [aberta, setAberta] = useState<number | null>(null);
  const [entrega, setEntrega] = useState<Record<number, string>>({});
  const [viaTransito, setViaTransito] = useState(false);
  const [almoxTransito, setAlmoxTransito] = useState<number | undefined>();
  const [origem, setOrigem] = useState<Record<number, { lot: string; address: string; destination: string }>>({});

  const carregar = () => run(async () => { setLista(await listarRequisicoes(status || undefined)); });
  const criar = () => run(async () => {
    const itens = linhas.filter((l) => l.item_code && Number(l.quantity.replace(",", ".")) > 0);
    if (!nova.warehouse_id || itens.length === 0) { setFeedback({ type: "error", message: "Informe o almoxarifado e ao menos um item com quantidade." }); return; }
    const r = await criarRequisicao({
      warehouse_id: nova.warehouse_id, destination_warehouse_id: nova.destination_warehouse_id, requester_name: nova.requester_name || undefined, cost_center_code: nova.cost_center_code,
      needed_date: nova.needed_date || undefined, notes: nova.notes || undefined,
      items: itens.map((l) => ({ item_code: l.item_code, quantity: Number(l.quantity.replace(",", ".")) })),
    });
    const reservado = r.items.reduce((t, i) => t + (i.reserved_qty ?? 0), 0);
    const pedido = r.items.reduce((t, i) => t + i.quantity, 0);
    const situacao = r.status === "PENDENTE_APROVACAO" ? "Aguardando aprovação: o material será reservado depois dela."
      : reservado < pedido ? "O saldo livre não cobre tudo: o que faltou ficou pendente sem reserva." : "Material reservado.";
    setFeedback({ type: "success", message: `Requisição ${r.code} criada com ${r.items.length} item(ns). ${situacao}` });
    setLinhas([{ item_code: "", quantity: "" }]);
    setLista(await listarRequisicoes(status || undefined));
  });
  const atender = (r: RequisicaoDTO) => run(async () => {
    const ls = r.items.map((i) => ({
      item_id: i.id!, quantity: Number((entrega[i.id!] ?? "").replace(",", ".")) || 0,
      lot: origem[i.id!]?.lot.trim() || undefined, address: origem[i.id!]?.address || undefined,
      destination_address: origem[i.id!]?.destination || undefined,
      via_transit: r.destination_warehouse_id ? viaTransito : undefined,
      transit_warehouse_id: r.destination_warehouse_id && viaTransito ? almoxTransito : undefined,
    })).filter((l) => l.quantity > 0);
    if (ls.length === 0) { setFeedback({ type: "error", message: "Informe quanto entregar de ao menos uma linha." }); return; }
    const out = await atenderRequisicao(r.id!, ls);
    setFeedback({ type: "success", message: `Requisição ${out.code}: ${out.status === "ATENDIDA" ? "atendida" : "atendida em parte"}. ${out.kind !== "TRANSFERENCIA" ? "Saídas lançadas no centro de custo." : viaTransito ? "Material em trânsito: receba na aba Transferências." : "Material transferido ao destino."}` });
    setEntrega({}); setOrigem({}); setAberta(null);
    setLista(await listarRequisicoes(status || undefined));
  });
  const cancelar = (r: RequisicaoDTO) => run(async () => {
    await cancelarRequisicao(r.id!);
    setFeedback({ type: "success", message: `Requisição ${r.code} cancelada: a reserva foi devolvida e o já entregue continua lançado.` });
    setLista(await listarRequisicoes(status || undefined));
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Nova requisição</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Almoxarifado que atende</label>
        <LookupField value={nova.warehouse_id || undefined} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(c) => setNova((p) => ({ ...p, warehouse_id: c ? Number(c) : 0 }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Transferir para</label>
        <LookupField value={nova.destination_warehouse_id} loader={loadWarehouses} entityLabel="almoxarifado de destino" placeholder="Consumo no centro de custo" clearable onChange={(c) => setNova((p) => ({ ...p, destination_warehouse_id: c ? Number(c) : undefined }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Solicitante</label><input className="erp-input" value={nova.requester_name} onChange={(e) => setNova((p) => ({ ...p, requester_name: e.target.value }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Centro de custo</label>
        <LookupField value={nova.cost_center_code} loader={loadCostCenters} entityLabel="centro de custo" clearable onChange={(c) => setNova((p) => ({ ...p, cost_center_code: c ? Number(c) : undefined }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Necessário em</label><input className="erp-input" type="date" value={nova.needed_date} onChange={(e) => setNova((p) => ({ ...p, needed_date: e.target.value }))} /></div>
      {linhas.map((l, i) => (
        <Fragment key={i}>
          <div className="erp-field erp-c6"><label className="erp-label">{i === 0 ? "Item" : ""}</label>
            <LookupField value={l.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setLinhas((p) => p.map((x, j) => (j === i ? { ...x, item_code: String(c ?? "") } : x)))} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">{i === 0 ? "Quantidade" : ""}</label>
            <input className="erp-input num" value={l.quantity} onChange={(e) => setLinhas((p) => p.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} /></div>
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}>
            {linhas.length > 1 && <button className="erp-btn erp-btn-sm" onClick={() => setLinhas((p) => p.filter((_, j) => j !== i))}>Remover</button>}
          </div>
        </Fragment>
      ))}
      <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <button className="erp-btn" onClick={() => setLinhas((p) => [...p, { item_code: "", quantity: "" }])}>+ Item</button>
        <input className="erp-input" style={{ maxWidth: 380 }} placeholder="Observação" value={nova.notes} onChange={(e) => setNova((p) => ({ ...p, notes: e.target.value }))} />
        <button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>Criar requisição</button>
      </div>
    </div></div>

    <div className="erp-fieldset"><div className="erp-fieldset-head">Requisições ({lista.length})</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c3"><label className="erp-label">Situação</label>
        <select className="erp-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todas</option><option value="PENDENTE_APROVACAO">Aguardando aprovação</option><option value="ABERTA">Abertas</option><option value="PARCIAL">Atendidas em parte</option><option value="ATENDIDA">Atendidas</option><option value="CANCELADA">Canceladas</option><option value="REPROVADA">Reprovadas</option>
        </select></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={carregar} disabled={busy}>Consultar</button></div>
      <div className="erp-field erp-c12">
        <table className="erp-grid">
          <thead><tr><th>Nº</th><th>Situação</th><th>Almoxarifado</th><th>Destino</th><th>Solicitante</th><th>CC</th><th>Necessário</th><th>Itens</th><th></th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Clique em Consultar.</td></tr>}
            {lista.map((r) => (
              <Fragment key={r.id}>
                <tr>
                  <td><strong>{r.code}</strong></td><td><span className={`erp-badge ${STATUS_COR[r.status ?? ""] ?? ""}`}>{STATUS_NOME[r.status ?? ""] ?? r.status}</span></td>
                  <td><EntityName code={r.warehouse_id} loader={loadWarehouses} prefix="Almox." /></td>
                  <td>{r.destination_warehouse_id ? <EntityName code={r.destination_warehouse_id} loader={loadWarehouses} prefix="Almox." /> : "Consumo"}</td>
                  <td>{r.requester_name || "—"}</td><td>{r.cost_center_code ?? "—"}</td><td>{dataBR(r.needed_date)}</td><td>{r.items.length}</td>
                  <td style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <button className="erp-btn erp-btn-sm" onClick={() => setAberta(aberta === r.id ? null : r.id!)}>{aberta === r.id ? "Fechar" : "Itens / atender"}</button>
                    {(r.status === "PENDENTE_APROVACAO" || r.status === "ABERTA" || r.status === "PARCIAL") && <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => cancelar(r)} disabled={busy}>Cancelar</button>}
                  </td>
                </tr>
                {aberta === r.id && (
                  <tr><td colSpan={9}>
                    <table className="erp-grid">
                      <thead><tr><th>#</th><th>Item</th><th className="num">Pedido</th><th className="num">Entregue</th><th className="num">Pendente</th><th className="num">Reservado</th><th className="num">Entregar agora</th><th>Lote</th><th>Endereço</th>{r.destination_warehouse_id && <th>Endereço de destino</th>}</tr></thead>
                      <tbody>{r.items.map((i) => {
                        const pend = i.quantity - (i.issued_qty ?? 0);
                        return (
                          <tr key={i.id}>
                            <td>{i.sequence}</td><td><EntityName code={i.item_code} loader={loadItems} prefix="Item" /></td>
                            <td className="num">{qtd(i.quantity)}</td><td className="num">{qtd(i.issued_qty)}</td><td className="num">{qtd(pend)}</td><td className="num">{qtd(i.reserved_qty)}</td>
                            <td className="num">{pend > 0 && (r.status === "ABERTA" || r.status === "PARCIAL")
                              ? <input className="erp-input num" style={{ maxWidth: 120 }} value={entrega[i.id!] ?? ""} placeholder={qtd(pend)} onChange={(e) => setEntrega((p) => ({ ...p, [i.id!]: e.target.value }))} />
                              : "—"}</td>
                            <td>{pend > 0 && (r.status === "ABERTA" || r.status === "PARCIAL")
                              ? <input className="erp-input" style={{ maxWidth: 120 }} aria-label="Lote" value={origem[i.id!]?.lot ?? ""} onChange={(e) => setOrigem((p) => ({ ...p, [i.id!]: { lot: e.target.value, address: p[i.id!]?.address ?? "", destination: p[i.id!]?.destination ?? "" } }))} />
                              : "—"}</td>
                            <td>{pend > 0 && (r.status === "ABERTA" || r.status === "PARCIAL")
                              ? <LookupField value={origem[i.id!]?.address || undefined} loader={loadWarehouseAddresses(r.warehouse_id)} entityLabel="endereço" placeholder="Sem endereço" clearable onChange={(c) => setOrigem((p) => ({ ...p, [i.id!]: { lot: p[i.id!]?.lot ?? "", address: c ? String(c) : "", destination: p[i.id!]?.destination ?? "" } }))} />
                              : "—"}</td>
                            {r.destination_warehouse_id && <td>{pend > 0 && (r.status === "ABERTA" || r.status === "PARCIAL")
                              ? <LookupField value={origem[i.id!]?.destination || undefined} loader={loadWarehouseAddresses(r.destination_warehouse_id)} entityLabel="endereço de destino" placeholder="Sem endereço" clearable onChange={(c) => setOrigem((p) => ({ ...p, [i.id!]: { lot: p[i.id!]?.lot ?? "", address: p[i.id!]?.address ?? "", destination: c ? String(c) : "" } }))} />
                              : "—"}</td>}
                          </tr>
                        );
                      })}</tbody>
                    </table>
                    {(r.status === "ABERTA" || r.status === "PARCIAL") && (
                      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                        <button className="erp-btn" onClick={() => setEntrega(Object.fromEntries(r.items.map((i) => [i.id!, String(Math.max(0, i.quantity - (i.issued_qty ?? 0)))])))}>Entregar tudo o pendente</button>
                        <button className="erp-btn erp-btn-primary" onClick={() => atender(r)} disabled={busy}>Confirmar entrega</button>
                        {r.destination_warehouse_id && <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={viaTransito} onChange={(e) => setViaTransito(e.target.checked)} /> Enviar pelo trânsito (entra no destino só ao receber)</label>}
                        {r.destination_warehouse_id && viaTransito && <div style={{ minWidth: 260 }}><LookupField value={almoxTransito} loader={loadWarehouses} entityLabel="almoxarifado de trânsito" placeholder="O único da empresa" clearable onChange={(c) => setAlmoxTransito(c ? Number(c) : undefined)} /></div>}
                      </div>
                    )}
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div></div>
  </>);
}
