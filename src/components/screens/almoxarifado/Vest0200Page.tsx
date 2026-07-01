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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VEST0200 — Inventário e Tipos de Movimento</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Dados</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={carregar} disabled={busy}>Carregar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VEST0200 — Inventário" filename="vest0200" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* Novo inventário */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Novo inventário</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Depósito</label><input className="fsc-input fsc-input-right" type="number" value={newInv.warehouse_id || ""} onChange={(e) => setNewInv((p) => ({ ...p, warehouse_id: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-6"><label className="fsc-label">Descrição</label><input className="fsc-input" value={newInv.description} onChange={(e) => setNewInv((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-4" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={criarInv} disabled={busy}>Criar inventário</button></div>
        </div></div></div>

        {/* Lista de inventários */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Inventários ({invs.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">ID</th><th className="fsc-num">Depósito</th><th>Descrição</th><th>Status</th><th className="fsc-num">Itens</th><th></th></tr></thead>
            <tbody>
              {invs.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhum inventário. Clique em Carregar.</td></tr>}
              {invs.map((iv) => <tr key={iv.id} className={selected?.id === iv.id ? "fsc-row-selected" : ""}><td className="fsc-num">{iv.id}</td><td className="fsc-num">{iv.warehouse_id}</td><td>{iv.description || "—"}</td><td>{iv.status}</td><td className="fsc-num">{iv.counted_items ?? 0}/{iv.total_items ?? 0}</td><td><button className="fsc-btn fsc-btn-ghost" onClick={() => abrir(iv.id)} disabled={busy}>Abrir</button></td></tr>)}
            </tbody>
          </table>
        </div></div>

        {selected && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Inventário {selected.id} — {selected.status}</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
              <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={countForm.item_code || ""} onChange={(e) => setCountForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Depósito</label><input className="fsc-input fsc-input-right" type="number" value={countForm.warehouse_id || ""} onChange={(e) => setCountForm((p) => ({ ...p, warehouse_id: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Qtd contada</label><input className="fsc-input fsc-input-right" type="number" value={countForm.counted_qty || ""} onChange={(e) => setCountForm((p) => ({ ...p, counted_qty: Number(e.target.value) }))} /></div>
              <div className="fsc-field fsc-col-3" style={{ alignSelf: "end", display: "flex", gap: 8 }}>
                <button className="fsc-btn fsc-btn-primary" onClick={contar} disabled={busy || selected.status !== "OPEN"}>Registrar contagem</button>
                <button className="fsc-btn fsc-btn-danger" onClick={fechar} disabled={busy || selected.status !== "OPEN"}>Fechar</button>
              </div>
            </div></div></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th className="fsc-num">Item</th><th className="fsc-num">Depósito</th><th className="fsc-num">Saldo sist.</th><th className="fsc-num">Contado</th><th className="fsc-num">Diferença</th><th></th></tr></thead>
                <tbody>
                  {items.length === 0 && <tr><td colSpan={6} className="fsc-empty">Sem contagens.</td></tr>}
                  {items.map((it, i) => {
                    const item_code = parseNum(it, "item_code", "ItemCode");
                    const wh = parseNum(it, "warehouse_id", "WarehouseID");
                    const sys = parseNum(it, "system_qty", "SystemQty", "balance_qty");
                    const counted = parseNum(it, "counted_qty", "CountedQty");
                    const diff = parseNum(it, "difference", "Difference") || counted - sys;
                    return <tr key={i}><td className="fsc-num">{item_code}</td><td className="fsc-num">{wh}</td><td className="fsc-num">{sys}</td><td className="fsc-num">{counted}</td><td className="fsc-num">{diff}</td><td><button className="fsc-btn fsc-btn-ghost" onClick={() => ajustar(item_code, wh)} disabled={busy || selected.status !== "OPEN" || !parseStr(it, "status")}>Ajustar</button></td></tr>;
                  })}
                </tbody>
              </table>
            </div></div>
          </>
        )}

        {/* Tipos de movimento */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Tipos de movimento ({types.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Sigla</label><input className="fsc-input" value={typeForm.sigla} onChange={(e) => setTypeForm((p) => ({ ...p, sigla: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-5"><label className="fsc-label fsc-label-req">Descrição</label><input className="fsc-input" value={typeForm.description} onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo (IN/OUT)</label><input className="fsc-input" value={typeForm.tipo ?? ""} onChange={(e) => setTypeForm((p) => ({ ...p, tipo: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-3" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={criarTipo} disabled={busy}>Criar tipo</button></div>
        </div></div></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>Sigla</th><th>Descrição</th><th>Tipo</th></tr></thead>
            <tbody>
              {types.length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhum tipo cadastrado.</td></tr>}
              {types.map((t, i) => <tr key={i}><td>{t.sigla}</td><td>{t.description}</td><td>{t.tipo ?? "—"}</td></tr>)}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Inventários: <strong>{invs.length}</strong></div><div className="fsc-footer-stat">Tipos: <strong>{types.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
