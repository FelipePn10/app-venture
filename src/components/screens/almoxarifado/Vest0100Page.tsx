import { useState, useCallback } from "react";
import {
  type MovementDTO, type BalanceDTO, type AtpDTO, type LotBalanceDTO, type ConsumptionAvgDTO,
  MOVEMENT_TYPES,
  listMovements, listMovementsByItem, createMovement,
  listBalancesByItem, getAtp,
  createReservation, releaseReservation, consumeReservation,
  registerLot, listLotsByItem, getLotGenealogy,
  recalcConsumptionAverage, getConsumptionAverage,
} from "@/services/stockService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const num = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const EMPTY_MOV: MovementDTO = { item_code: 0, warehouse_id: 0, movement_type: "IN", quantity: 0, unit_price: 0, lot: "" };

export function Vest0100Page(): JSX.Element {
  const [itemCode, setItemCode] = useState("");
  const [movements, setMovements] = useState<MovementDTO[]>([]);
  const [balances, setBalances] = useState<BalanceDTO[]>([]);
  const [atp, setAtp] = useState<AtpDTO | null>(null);
  const [lots, setLots] = useState<LotBalanceDTO[]>([]);
  const [genealogy, setGenealogy] = useState<Obj | null>(null);
  const [consumption, setConsumption] = useState<ConsumptionAvgDTO | null>(null);
  const [movForm, setMovForm] = useState<MovementDTO>({ ...EMPTY_MOV });
  const [resForm, setResForm] = useState({ item_code: 0, warehouse_id: 0, quantity: 0, reference_type: "MANUAL", reference_code: 0 });
  const [lotForm, setLotForm] = useState({ item_code: 0, lot: "", heat_number: "", certificate: "" });
  const [resId, setResId] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const consultarItem = () => run(async () => {
    const c = Number(itemCode);
    if (!c) { setFeedback({ type: "error", message: "Informe o código do item." }); return; }
    const [mv, bl, at, lt] = await Promise.all([listMovementsByItem(c), listBalancesByItem(c), getAtp(c), listLotsByItem(c)]);
    setMovements(mv); setBalances(bl); setAtp(at); setLots(lt); setGenealogy(null);
    try { setConsumption(await getConsumptionAverage(c)); } catch { setConsumption(null); }
    setMovForm((p) => ({ ...p, item_code: c })); setResForm((p) => ({ ...p, item_code: c })); setLotForm((p) => ({ ...p, item_code: c }));
  });
  const listarTodos = () => run(async () => { setMovements(await listMovements()); });

  const lancarMovimento = () => run(async () => {
    if (!movForm.item_code || !movForm.warehouse_id || !movForm.quantity) { setFeedback({ type: "error", message: "Item, depósito e quantidade são obrigatórios." }); return; }
    await createMovement(movForm);
    setFeedback({ type: "success", message: "Movimento lançado (saldo/custo atualizados)." });
    if (itemCode) await Promise.all([listMovementsByItem(Number(itemCode)).then(setMovements), listBalancesByItem(Number(itemCode)).then(setBalances), getAtp(Number(itemCode)).then(setAtp)]);
  });

  const criarReserva = () => run(async () => {
    if (!resForm.item_code || !resForm.warehouse_id || !resForm.quantity) { setFeedback({ type: "error", message: "Item, depósito e quantidade são obrigatórios." }); return; }
    const r = await createReservation(resForm);
    setResId(String(r.id ?? ""));
    setFeedback({ type: "success", message: `Reserva ${r.id} criada (ACTIVE) — ATP reduzido.` });
    if (itemCode) await getAtp(Number(itemCode)).then(setAtp);
  });
  const liberar = () => run(async () => { const id = Number(resId); if (!id) return; await releaseReservation(id); setFeedback({ type: "success", message: `Reserva ${id} liberada.` }); if (itemCode) await getAtp(Number(itemCode)).then(setAtp); });
  const consumir = () => run(async () => { const id = Number(resId); if (!id) return; await consumeReservation(id); setFeedback({ type: "success", message: `Reserva ${id} consumida.` }); if (itemCode) await getAtp(Number(itemCode)).then(setAtp); });

  const registrarLote = () => run(async () => {
    if (!lotForm.item_code || !lotForm.lot.trim()) { setFeedback({ type: "error", message: "Item e lote são obrigatórios." }); return; }
    await registerLot(lotForm);
    setFeedback({ type: "success", message: `Lote ${lotForm.lot} registrado.` });
    if (itemCode) await listLotsByItem(Number(itemCode)).then(setLots);
  });
  const verGenealogia = (lot: string) => run(async () => {
    const c = Number(itemCode); if (!c) return;
    setGenealogy(await getLotGenealogy(c, lot));
    setFeedback({ type: "info", message: `Genealogia do lote ${lot} carregada.` });
  });

  const recalcConsumo = () => run(async () => {
    const c = Number(itemCode); if (!c) { setFeedback({ type: "error", message: "Informe o item." }); return; }
    await recalcConsumptionAverage(c);
    setConsumption(await getConsumptionAverage(c));
    setFeedback({ type: "success", message: "Consumo médio recalculado." });
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Almoxarifado</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Estoque (movimentos, saldos, ATP, reservas, lotes)</span><span className="erp-crumb-code">VEST0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Item</span>
          <input className="erp-input num" style={{ width: 110, height: 32 }} type="number" value={itemCode} placeholder="código" onChange={(e) => setItemCode(e.target.value)} />
          <button className="erp-btn" onClick={consultarItem} disabled={busy}>Consultar</button>
          <button className="erp-btn" onClick={listarTodos} disabled={busy}>Últimos movimentos</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VEST0100 — Estoque" filename="vest0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Estoque</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* ATP + saldos */}
        {atp && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Disponível para promessa (ATP) — item {atp.item_code}</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">Em mãos</label><input className="erp-input num" value={num(atp.total_on_hand)} readOnly /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Reservado</label><input className="erp-input num" value={num(atp.total_reserved)} readOnly /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Disponível (ATP)</label><input className="erp-input num" value={num(atp.total_available)} readOnly /></div>
              {consumption && <div className="erp-field erp-c3"><label className="erp-label">Consumo médio/mês</label><input className="erp-input num" value={num(consumption.avg_monthly_consumption)} readOnly /></div>}
            </div></div>
          </>
        )}
        {balances.length > 0 && (
          <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
            <table className="erp-grid">
              <thead><tr><th>Depósito</th><th>Saldo</th><th>Reservado</th><th>Disponível</th><th>Custo médio</th></tr></thead>
              <tbody>{balances.map((b, i) => <tr key={i}><td>{b.warehouse_id}</td><td>{num(b.quantity)}</td><td>{num(b.reserved_qty)}</td><td>{num(b.available_qty)}</td><td>{num(b.avg_cost)}</td></tr>)}</tbody>
            </table>
          </div></div></div>
        )}

        {/* Lançar movimento */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Lançar movimento</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={movForm.item_code || ""} onChange={(e) => setMovForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Depósito</label><input className="erp-input num" type="number" value={movForm.warehouse_id || ""} onChange={(e) => setMovForm((p) => ({ ...p, warehouse_id: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Tipo</label>
            <select className="erp-input" value={movForm.movement_type} onChange={(e) => setMovForm((p) => ({ ...p, movement_type: e.target.value }))}>{MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label><input className="erp-input num" type="number" value={movForm.quantity || ""} onChange={(e) => setMovForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Preço unit.</label><input className="erp-input num" type="number" step="0.01" value={movForm.unit_price || ""} onChange={(e) => setMovForm((p) => ({ ...p, unit_price: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Lote</label><input className="erp-input" value={movForm.lot ?? ""} onChange={(e) => setMovForm((p) => ({ ...p, lot: e.target.value }))} /></div>
          <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={lancarMovimento} disabled={busy}>Lançar movimento</button></div>
        </div></div>

        {/* Movimentos */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Movimentos ({movements.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>ID</th><th>Item</th><th>Depósito</th><th>Tipo</th><th>Qtd</th><th>Lote</th><th>Origem</th><th>Data</th></tr></thead>
            <tbody>
              {movements.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum movimento. Consulte um item ou carregue os últimos.</td></tr>}
              {movements.slice(0, 100).map((m) => <tr key={m.id}><td>{m.id}</td><td>{m.item_code}</td><td>{m.warehouse_id}</td><td>{m.movement_type}</td><td>{num(m.quantity)}</td><td>{m.lot || "—"}</td><td>{m.reference_type ? `${m.reference_type} ${m.reference_code ?? ""}` : "—"}</td><td>{m.created_at?.slice(0, 10) ?? "—"}</td></tr>)}
            </tbody>
          </table>
        </div></div></div>

        {/* Reservas */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Reservas (ATP)</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={resForm.item_code || ""} onChange={(e) => setResForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Depósito</label><input className="erp-input num" type="number" value={resForm.warehouse_id || ""} onChange={(e) => setResForm((p) => ({ ...p, warehouse_id: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label><input className="erp-input num" type="number" value={resForm.quantity || ""} onChange={(e) => setResForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={criarReserva} disabled={busy}>Criar reserva</button></div>
          <div className="erp-field erp-c2"><label className="erp-label">Reserva (ID)</label><input className="erp-input num" type="number" value={resId} onChange={(e) => setResId(e.target.value)} /></div>
          <div className="erp-field erp-c2" style={{ alignSelf: "end", display: "flex", gap: 8 }}>
            <button className="erp-btn" onClick={liberar} disabled={busy}>Liberar</button>
            <button className="erp-btn" onClick={consumir} disabled={busy}>Consumir</button></div>
        </div></div>

        {/* Lotes / genealogia */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Lotes / rastreabilidade ({lots.length})</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={lotForm.item_code || ""} onChange={(e) => setLotForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Lote</label><input className="erp-input" value={lotForm.lot} onChange={(e) => setLotForm((p) => ({ ...p, lot: e.target.value }))} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">Corrida (heat)</label><input className="erp-input" value={lotForm.heat_number} onChange={(e) => setLotForm((p) => ({ ...p, heat_number: e.target.value }))} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">Certificado</label><input className="erp-input" value={lotForm.certificate} onChange={(e) => setLotForm((p) => ({ ...p, certificate: e.target.value }))} /></div>
          <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={registrarLote} disabled={busy}>Registrar lote</button></div>
        </div></div>
        <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Lote</th><th>Depósito</th><th>Quantidade</th><th></th></tr></thead>
            <tbody>
              {lots.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Sem lotes.</td></tr>}
              {lots.map((l, i) => <tr key={i}><td>{l.lot}</td><td>{l.warehouse_id ?? "—"}</td><td>{num(l.quantity)}</td><td><button className="erp-btn" onClick={() => verGenealogia(l.lot)} disabled={busy}>Genealogia</button></td></tr>)}
            </tbody>
          </table>
        </div></div></div>
        {genealogy && (
          <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body">
            <pre style={{ margin: 0, fontSize: 11, maxHeight: 240, overflow: "auto", whiteSpace: "pre-wrap" }}>{JSON.stringify(genealogy, null, 2)}</pre>
          </div></div>
        )}

        {/* Consumo médio */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Consumo médio mensal (ROP)</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={recalcConsumo} disabled={busy}>Recalcular consumo do item</button></div>
          {consumption && <>
            <div className="erp-field erp-c3"><label className="erp-label">Consumo médio/mês</label><input className="erp-input num" value={num(consumption.avg_monthly_consumption)} readOnly /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Total consumido</label><input className="erp-input num" value={num(consumption.total_consumed)} readOnly /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Janela (meses)</label><input className="erp-input num" value={consumption.window_months} readOnly /></div>
          </>}
        </div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Movimentos: <strong>{movements.length}</strong></div>{atp && <div className="erp-status-item">ATP: <strong>{num(atp.total_available)}</strong></div>}</div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
