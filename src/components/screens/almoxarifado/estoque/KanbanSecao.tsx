import { useCallback, useEffect, useState } from "react";
import { acionarCartaoKanban, listarCartoesKanban, salvarCartaoKanban, type CartaoKanbanDTO } from "@/services/stockService";
import { EntityName } from "@/components/ui/EntityName";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadWarehouses } from "@/services/lookups";
import { qtd, useAcao } from "./comum";
import { FeedbackBox } from "./ui";

interface Form { id?: number; item_code: string; warehouse_id: number; card_count: string; quantity_per_card: string; reorder_point: string; container_type: string; ativo: boolean }
const VAZIO: Form = { item_code: "", warehouse_id: 0, card_count: "1", quantity_per_card: "", reorder_point: "0", container_type: "", ativo: true };

/**
 * Circuitos kanban: o cartão vazio pede reposição do que ele guarda. Item comprado
 * vira requisição de compra; item fabricado, ordem planejada. O MRP do método
 * Kanban lê estes mesmos cartões.
 */
export function KanbanSecao() {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lista, setLista] = useState<CartaoKanbanDTO[]>([]);
  const [f, setF] = useState<Form>({ ...VAZIO });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  const carregar = useCallback(() => run(async () => { setLista(await listarCartoesKanban()); }), [run]);
  useEffect(() => { void carregar(); }, [carregar]);

  const salvar = () => run(async () => {
    if (!f.item_code) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    await salvarCartaoKanban({
      id: f.id, item_code: f.item_code, warehouse_id: f.warehouse_id || undefined, card_count: Number(f.card_count),
      quantity_per_card: f.quantity_per_card.replace(",", "."), reorder_point: f.reorder_point.replace(",", ".") || "0",
      container_type: f.container_type.trim() || undefined, status: f.ativo ? "ACTIVE" : "INACTIVE",
    });
    setF({ ...VAZIO }); setLista(await listarCartoesKanban());
    setFeedback({ type: "success", message: "Cartão salvo." });
  });
  const acionar = (c: CartaoKanbanDTO) => run(async () => {
    await acionarCartaoKanban(c.id, 1);
    setFeedback({ type: "success", message: `Reposição gerada: ${qtd(c.quantity_per_card)} de ${c.name} (${c.manufactured ? "ordem planejada" : "requisição de compra"}).` });
  });
  const editar = (c: CartaoKanbanDTO) => setF({
    id: c.id, item_code: c.item_code, warehouse_id: c.warehouse_id ?? 0, card_count: String(c.card_count), quantity_per_card: String(c.quantity_per_card).replace(".", ","),
    reorder_point: String(c.reorder_point).replace(".", ","), container_type: c.container_type ?? "", ativo: c.status === "ACTIVE",
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Kanban ({lista.length})</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label>
        <LookupField value={f.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => set("item_code", String(c ?? ""))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Almoxarifado</label>
        <LookupField value={f.warehouse_id || undefined} loader={loadWarehouses} entityLabel="almoxarifado" clearable onChange={(c) => set("warehouse_id", c ? Number(c) : 0)} /></div>
      <div className="erp-field erp-c1"><label className="erp-label erp-req">Cartões</label><input className="erp-input num" value={f.card_count} onChange={(e) => set("card_count", e.target.value)} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade por cartão</label><input className="erp-input num" value={f.quantity_per_card} onChange={(e) => set("quantity_per_card", e.target.value)} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Ponto de acionamento</label><input className="erp-input num" value={f.reorder_point} onChange={(e) => set("reorder_point", e.target.value)} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Contenedor</label><input className="erp-input" maxLength={50} value={f.container_type} onChange={(e) => set("container_type", e.target.value)} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={f.ativo} onChange={(e) => set("ativo", e.target.checked)} /> Ativo</label></div>
      <div className="erp-field erp-c4" style={{ alignSelf: "end", display: "flex", flexDirection: "row", gap: 8 }}>
        <button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>Salvar cartão</button>
        <button className="erp-btn" onClick={() => setF({ ...VAZIO })} disabled={busy}>Limpar</button>
      </div>
      <div className="erp-field erp-c12" style={{ overflowX: "auto" }}><table className="erp-grid">
        <thead><tr><th>Item</th><th>Almoxarifado</th><th className="num">Cartões</th><th className="num">Por cartão</th><th className="num">Acionamento</th><th className="num">Disponível</th><th>Situação</th><th></th></tr></thead>
        <tbody>
          {lista.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum cartão cadastrado.</td></tr>}
          {lista.map((c) => (
            <tr key={c.id}>
              <td><EntityName code={c.item_code} loader={loadItems} prefix="Item" /></td>
              <td>{c.warehouse_id ? <EntityName code={c.warehouse_id} loader={loadWarehouses} prefix="Almox." /> : "Todos"}</td>
              <td className="num">{c.card_count}</td><td className="num">{qtd(c.quantity_per_card)}</td><td className="num">{qtd(c.reorder_point)}</td><td className="num">{qtd(c.available_qty)}</td>
              <td>{c.status === "ACTIVE" ? (c.available_qty <= c.reorder_point ? <span className="erp-badge erp-badge-amber">Acionar</span> : "Ativo") : "Inativo"}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="erp-btn erp-btn-sm" onClick={() => editar(c)}>Editar</button>{" "}
                {c.status === "ACTIVE" && <button className="erp-btn erp-btn-sm erp-btn-primary" onClick={() => acionar(c)} disabled={busy}>Acionar cartão</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div></div>
  </>);
}
