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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VEST0100 — Estoque (movimentos, saldos, ATP, reservas, lotes)</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Item</span>
          <input className="fsc-input fsc-input-right" style={{ width: 110, height: 32 }} type="number" value={itemCode} placeholder="código" onChange={(e) => setItemCode(e.target.value)} />
          <button className="fsc-btn fsc-btn-ghost" onClick={consultarItem} disabled={busy}>Consultar</button>
          <button className="fsc-btn fsc-btn-ghost" onClick={listarTodos} disabled={busy}>Últimos movimentos</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VEST0100 — Estoque" filename="vest0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* ATP + saldos */}
        {atp && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Disponível para promessa (ATP) — item {atp.item_code}</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Em mãos</label><input className="fsc-input fsc-input-right" value={num(atp.total_on_hand)} readOnly /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Reservado</label><input className="fsc-input fsc-input-right" value={num(atp.total_reserved)} readOnly /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Disponível (ATP)</label><input className="fsc-input fsc-input-right" value={num(atp.total_available)} readOnly /></div>
              {consumption && <div className="fsc-field fsc-col-3"><label className="fsc-label">Consumo médio/mês</label><input className="fsc-input fsc-input-right" value={num(consumption.avg_monthly_consumption)} readOnly /></div>}
            </div></div></div>
          </>
        )}
        {balances.length > 0 && (
          <div className="fsc-card"><div className="fsc-results-wrap">
            <table className="fsc-table">
              <thead><tr><th className="fsc-num">Depósito</th><th className="fsc-num">Saldo</th><th className="fsc-num">Reservado</th><th className="fsc-num">Disponível</th><th className="fsc-num">Custo médio</th></tr></thead>
              <tbody>{balances.map((b, i) => <tr key={i}><td className="fsc-num">{b.warehouse_id}</td><td className="fsc-num">{num(b.quantity)}</td><td className="fsc-num">{num(b.reserved_qty)}</td><td className="fsc-num">{num(b.available_qty)}</td><td className="fsc-num">{num(b.avg_cost)}</td></tr>)}</tbody>
            </table>
          </div></div>
        )}

        {/* Lançar movimento */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Lançar movimento</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={movForm.item_code || ""} onChange={(e) => setMovForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Depósito</label><input className="fsc-input fsc-input-right" type="number" value={movForm.warehouse_id || ""} onChange={(e) => setMovForm((p) => ({ ...p, warehouse_id: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo</label>
            <select className="fsc-input" value={movForm.movement_type} onChange={(e) => setMovForm((p) => ({ ...p, movement_type: e.target.value }))}>{MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Quantidade</label><input className="fsc-input fsc-input-right" type="number" value={movForm.quantity || ""} onChange={(e) => setMovForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Preço unit.</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={movForm.unit_price || ""} onChange={(e) => setMovForm((p) => ({ ...p, unit_price: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Lote</label><input className="fsc-input" value={movForm.lot ?? ""} onChange={(e) => setMovForm((p) => ({ ...p, lot: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={lancarMovimento} disabled={busy}>Lançar movimento</button></div>
        </div></div></div>

        {/* Movimentos */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Movimentos ({movements.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">ID</th><th className="fsc-num">Item</th><th className="fsc-num">Depósito</th><th>Tipo</th><th className="fsc-num">Qtd</th><th>Lote</th><th>Origem</th><th>Data</th></tr></thead>
            <tbody>
              {movements.length === 0 && <tr><td colSpan={8} className="fsc-empty">Nenhum movimento. Consulte um item ou carregue os últimos.</td></tr>}
              {movements.slice(0, 100).map((m) => <tr key={m.id}><td className="fsc-num">{m.id}</td><td className="fsc-num">{m.item_code}</td><td className="fsc-num">{m.warehouse_id}</td><td>{m.movement_type}</td><td className="fsc-num">{num(m.quantity)}</td><td>{m.lot || "—"}</td><td>{m.reference_type ? `${m.reference_type} ${m.reference_code ?? ""}` : "—"}</td><td>{m.created_at?.slice(0, 10) ?? "—"}</td></tr>)}
            </tbody>
          </table>
        </div></div>

        {/* Reservas */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Reservas (ATP)</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={resForm.item_code || ""} onChange={(e) => setResForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Depósito</label><input className="fsc-input fsc-input-right" type="number" value={resForm.warehouse_id || ""} onChange={(e) => setResForm((p) => ({ ...p, warehouse_id: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Quantidade</label><input className="fsc-input fsc-input-right" type="number" value={resForm.quantity || ""} onChange={(e) => setResForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={criarReserva} disabled={busy}>Criar reserva</button></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Reserva (ID)</label><input className="fsc-input fsc-input-right" type="number" value={resId} onChange={(e) => setResId(e.target.value)} /></div>
          <div className="fsc-field fsc-col-2" style={{ alignSelf: "end", display: "flex", gap: 8 }}>
            <button className="fsc-btn fsc-btn-ghost" onClick={liberar} disabled={busy}>Liberar</button>
            <button className="fsc-btn fsc-btn-ghost" onClick={consumir} disabled={busy}>Consumir</button></div>
        </div></div></div>

        {/* Lotes / genealogia */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Lotes / rastreabilidade ({lots.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={lotForm.item_code || ""} onChange={(e) => setLotForm((p) => ({ ...p, item_code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Lote</label><input className="fsc-input" value={lotForm.lot} onChange={(e) => setLotForm((p) => ({ ...p, lot: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Corrida (heat)</label><input className="fsc-input" value={lotForm.heat_number} onChange={(e) => setLotForm((p) => ({ ...p, heat_number: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Certificado</label><input className="fsc-input" value={lotForm.certificate} onChange={(e) => setLotForm((p) => ({ ...p, certificate: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={registrarLote} disabled={busy}>Registrar lote</button></div>
        </div></div></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>Lote</th><th className="fsc-num">Depósito</th><th className="fsc-num">Quantidade</th><th></th></tr></thead>
            <tbody>
              {lots.length === 0 && <tr><td colSpan={4} className="fsc-empty">Sem lotes.</td></tr>}
              {lots.map((l, i) => <tr key={i}><td>{l.lot}</td><td className="fsc-num">{l.warehouse_id ?? "—"}</td><td className="fsc-num">{num(l.quantity)}</td><td><button className="fsc-btn fsc-btn-ghost" onClick={() => verGenealogia(l.lot)} disabled={busy}>Genealogia</button></td></tr>)}
            </tbody>
          </table>
        </div></div>
        {genealogy && (
          <div className="fsc-card"><div className="fsc-card-body">
            <pre style={{ margin: 0, fontSize: 11, maxHeight: 240, overflow: "auto", whiteSpace: "pre-wrap" }}>{JSON.stringify(genealogy, null, 2)}</pre>
          </div></div>
        )}

        {/* Consumo médio */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Consumo médio mensal (ROP)</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-3" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-ghost" onClick={recalcConsumo} disabled={busy}>Recalcular consumo do item</button></div>
          {consumption && <>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Consumo médio/mês</label><input className="fsc-input fsc-input-right" value={num(consumption.avg_monthly_consumption)} readOnly /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Total consumido</label><input className="fsc-input fsc-input-right" value={num(consumption.total_consumed)} readOnly /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Janela (meses)</label><input className="fsc-input fsc-input-right" value={consumption.window_months} readOnly /></div>
          </>}
        </div></div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Movimentos: <strong>{movements.length}</strong></div>{atp && <div className="fsc-footer-stat">ATP: <strong>{num(atp.total_available)}</strong></div>}</div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
