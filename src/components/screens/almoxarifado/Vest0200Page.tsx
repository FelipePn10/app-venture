import { useState, useCallback } from "react";
import {
  type InventoryDTO, type MovementTypeDTO,
  listInventories, getInventory, createInventory, closeInventory,
  countInventoryItem, adjustInventoryItem, listInventoryItems,
  listMovementTypes, createMovementType,
} from "@/services/stockService";
import { errMessage, type Obj, parseNum, parseStr } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

export function Vest0200Page(): JSX.Element {
  const [invs, setInvs] = useState<InventoryDTO[]>([]);
  const [selected, setSelected] = useState<InventoryDTO | null>(null);
  const [items, setItems] = useState<Obj[]>([]);
  const [types, setTypes] = useState<MovementTypeDTO[]>([]);
  const [newInv, setNewInv] = useState({ warehouse_id: 0, description: "" });
  const [countForm, setCountForm] = useState({ item_code: 0, warehouse_id: 0, counted_qty: 0 });
  const [typeForm, setTypeForm] = useState<MovementTypeDTO>({ sigla: "", description: "", tipo: "IN" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = () => run(async () => { const [i, t] = await Promise.all([listInventories(), listMovementTypes()]); setInvs(i); setTypes(t); });
  const abrir = (id?: number) => { if (id) void run(async () => { setSelected(await getInventory(id)); setItems(await listInventoryItems(id)); setCountForm((p) => ({ ...p, warehouse_id: 0 })); }); };

  const criarInv = () => run(async () => {
    if (!newInv.warehouse_id) { setFeedback({ type: "error", message: "Depósito é obrigatório." }); return; }
    const inv = await createInventory(newInv);
    setFeedback({ type: "success", message: `Inventário ${inv.id} criado (OPEN).` });
    setInvs(await listInventories());
    if (inv.id) abrir(inv.id);
  });
  const contar = () => { const id = selected?.id; if (!id) return; void run(async () => {
    if (!countForm.item_code || !countForm.warehouse_id) { setFeedback({ type: "error", message: "Item e depósito são obrigatórios." }); return; }
    await countInventoryItem({ inventory_id: id, ...countForm });
    setItems(await listInventoryItems(id));
    setFeedback({ type: "success", message: "Contagem registrada." });
  }); };
  const ajustar = (itemCode: number, warehouseId: number) => { const id = selected?.id; if (!id) return; void run(async () => {
    await adjustInventoryItem({ inventory_id: id, item_code: itemCode, warehouse_id: warehouseId });
    setItems(await listInventoryItems(id));
    setFeedback({ type: "success", message: "Ajuste aplicado (movimento de acerto gerado)." });
  }); };
  const fechar = () => { const id = selected?.id; if (!id) return; void run(async () => {
    await closeInventory(id); setSelected(await getInventory(id)); setInvs(await listInventories());
    setFeedback({ type: "success", message: `Inventário ${id} fechado.` });
  }); };

  const criarTipo = () => run(async () => {
    if (!typeForm.sigla.trim() || !typeForm.description.trim()) { setFeedback({ type: "error", message: "Sigla e descrição são obrigatórias." }); return; }
    await createMovementType(typeForm);
    setTypeForm({ sigla: "", description: "", tipo: "IN" });
    setTypes(await listMovementTypes());
    setFeedback({ type: "success", message: "Tipo de movimento criado." });
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Almoxarifado</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Inventário e Tipos de Movimento</span><span className="erp-crumb-code">VEST0200</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Dados</span>
          <button className="erp-btn" onClick={carregar} disabled={busy}>Carregar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VEST0200 — Inventário" filename="vest0200" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Inventário e Tipos de Movi</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* Novo inventário */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Novo inventário</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Depósito</label><input className="erp-input num" type="number" value={newInv.warehouse_id || ""} onChange={(e) => setNewInv((p) => ({ ...p, warehouse_id: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c6"><label className="erp-label">Descrição</label><input className="erp-input" value={newInv.description} onChange={(e) => setNewInv((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="erp-field erp-c4" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={criarInv} disabled={busy}>Criar inventário</button></div>
        </div></div>

        {/* Lista de inventários */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Inventários ({invs.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>ID</th><th>Depósito</th><th>Descrição</th><th>Status</th><th>Itens</th><th></th></tr></thead>
            <tbody>
              {invs.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum inventário. Clique em Carregar.</td></tr>}
              {invs.map((iv) => <tr key={iv.id} className={selected?.id === iv.id ? "erp-row-sel" : ""}><td>{iv.id}</td><td>{iv.warehouse_id}</td><td>{iv.description || "—"}</td><td>{iv.status}</td><td>{iv.counted_items ?? 0}/{iv.total_items ?? 0}</td><td><button className="erp-btn" onClick={() => abrir(iv.id)} disabled={busy}>Abrir</button></td></tr>)}
            </tbody>
          </table>
        </div></div>
        </div>

        {selected && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Inventário {selected.id} — {selected.status}</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={countForm.item_code || ""} onChange={(e) => setCountForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Depósito</label><input className="erp-input num" type="number" value={countForm.warehouse_id || ""} onChange={(e) => setCountForm((p) => ({ ...p, warehouse_id: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Qtd contada</label><input className="erp-input num" type="number" value={countForm.counted_qty || ""} onChange={(e) => setCountForm((p) => ({ ...p, counted_qty: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c3" style={{ alignSelf: "end", display: "flex", gap: 8 }}>
                <button className="erp-btn erp-btn-primary" onClick={contar} disabled={busy || selected.status !== "OPEN"}>Registrar contagem</button>
                <button className="erp-btn erp-btn-danger" onClick={fechar} disabled={busy || selected.status !== "OPEN"}>Fechar</button>
              </div>
            </div></div>
            <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Item</th><th>Depósito</th><th>Saldo sist.</th><th>Contado</th><th>Diferença</th><th></th></tr></thead>
                <tbody>
                  {items.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Sem contagens.</td></tr>}
                  {items.map((it, i) => {
                    const item_code = parseNum(it, "item_code", "ItemCode");
                    const wh = parseNum(it, "warehouse_id", "WarehouseID");
                    const sys = parseNum(it, "system_qty", "SystemQty", "balance_qty");
                    const counted = parseNum(it, "counted_qty", "CountedQty");
                    const diff = parseNum(it, "difference", "Difference") || counted - sys;
                    return <tr key={i}><td>{item_code}</td><td>{wh}</td><td>{sys}</td><td>{counted}</td><td>{diff}</td><td><button className="erp-btn" onClick={() => ajustar(item_code, wh)} disabled={busy || selected.status !== "OPEN" || !parseStr(it, "status")}>Ajustar</button></td></tr>;
                  })}
                </tbody>
              </table>
            </div></div>
            </div>
          </>
        )}

        {/* Tipos de movimento */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Tipos de movimento ({types.length})</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Sigla</label><input className="erp-input" value={typeForm.sigla} onChange={(e) => setTypeForm((p) => ({ ...p, sigla: e.target.value }))} /></div>
          <div className="erp-field erp-c5"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={typeForm.description} onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Tipo (IN/OUT)</label><input className="erp-input" value={typeForm.tipo ?? ""} onChange={(e) => setTypeForm((p) => ({ ...p, tipo: e.target.value }))} /></div>
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={criarTipo} disabled={busy}>Criar tipo</button></div>
        </div></div>
        <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Sigla</th><th>Descrição</th><th>Tipo</th></tr></thead>
            <tbody>
              {types.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhum tipo cadastrado.</td></tr>}
              {types.map((t, i) => <tr key={i}><td>{t.sigla}</td><td>{t.description}</td><td>{t.tipo ?? "—"}</td></tr>)}
            </tbody>
          </table>
        </div></div>
        </div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Inventários: <strong>{invs.length}</strong></div><div className="erp-status-item">Tipos: <strong>{types.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
