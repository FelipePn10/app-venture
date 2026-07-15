import { useState, useCallback, useMemo } from "react";
import {
  type TankReservationLine,
  getOccupation, reserveTank, cancelTankReservation, expireTankReservations, rescheduleBatch,
} from "@/services/deliveryPromiseService";
import { errMessage, parseNum, parseStr, unwrapObject, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadCustomers } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type View = "occupation" | "reservation" | "reschedule";
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n?: number) => `${(n ?? 0).toFixed(1)}%`;

export function Vdpr0100Page(): JSX.Element {
  const [view, setView] = useState<View>("occupation");
  // ocupação
  const [occFrom, setOccFrom] = useState(today());
  const [occTo, setOccTo] = useState(plusDays(30));
  const [capacity, setCapacity] = useState("50");
  const [occupation, setOccupation] = useState<Obj[]>([]);
  // reserva
  const [resDate, setResDate] = useState(plusDays(15));
  const [firmDays, setFirmDays] = useState("7");
  const [verifyStock, setVerifyStock] = useState(true);
  const [commit, setCommit] = useState(false);
  const [lines, setLines] = useState<TankReservationLine[]>([]);
  const [lineForm, setLineForm] = useState<TankReservationLine>({ item_code: 0, quantity: 1, unit_price: 0 });
  const [reservationResult, setReservationResult] = useState<Obj | null>(null);
  const [cancelCode, setCancelCode] = useState("");
  // reprogramação
  const [rsFrom, setRsFrom] = useState("");
  const [rsTo, setRsTo] = useState("");
  const [rsCustomer, setRsCustomer] = useState<number | undefined>(undefined);
  const [rsNewDate, setRsNewDate] = useState(plusDays(20));
  const [rescheduleResult, setRescheduleResult] = useState<Obj | null>(null);

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregarOcupacao = () => run(async () => {
    setOccupation(await getOccupation({ from_date: occFrom, to_date: occTo, daily_capacity: capacity ? Number(capacity) : undefined }));
    setFeedback({ type: "info", message: "Ocupação diária carregada." });
  });

  const addLine = () => { if (!lineForm.item_code) { setFeedback({ type: "error", message: "Selecione o item." }); return; }
    setLines((p) => [...p, lineForm]); setLineForm({ item_code: 0, quantity: 1, unit_price: 0 });
  };
  const removeLine = (i: number) => setLines((p) => p.filter((_, idx) => idx !== i));

  const reservar = () => run(async () => {
    if (lines.length === 0) { setFeedback({ type: "error", message: "Adicione ao menos uma linha." }); return; }
    const r = await reserveTank({ requested_delivery_date: resDate, firm_days: firmDays ? Number(firmDays) : undefined, daily_capacity: capacity ? Number(capacity) : undefined, verify_stock: verifyStock, commit, lines });
    setReservationResult(r);
    setFeedback({ type: "success", message: commit ? "Reserva gravada em delivery_tank_reservations." : "Simulação concluída (nada gravado — marque Gravar para confirmar)." });
  });
  const cancelarReserva = () => { const c = Number(cancelCode); if (!c) return; void run(async () => {
    await cancelTankReservation(c); setCancelCode("");
    setFeedback({ type: "success", message: `Reserva ${c} cancelada.` });
  }); };
  const expirar = () => run(async () => {
    const r = await expireTankReservations(today());
    setFeedback({ type: "success", message: `Reservas vencidas expiradas: ${parseNum(unwrapObject(r), "expired", "Expired") ?? Object.keys(r).length}.` });
  });

  const reprogramar = () => run(async () => {
    const r = await rescheduleBatch({ from: rsFrom || undefined, to: rsTo || undefined, customer_code: rsCustomer, new_date: rsNewDate });
    setRescheduleResult(r);
    const o = unwrapObject(r);
    setFeedback({ type: "success", message: `Reprogramação: ${parseNum(o, "rescheduled_orders", "RescheduledOrders") ?? 0} pedido(s) / ${parseNum(o, "rescheduled_items", "RescheduledItems") ?? 0} item(ns) alterados.` });
  });

  const linesTotal = useMemo(() => lines.reduce((s, l) => s + l.quantity * (l.unit_price ?? 0), 0), [lines]);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Promessa de Entrega — Ocupação e Reservas</span>
          <span className="erp-crumb-code">VDPR0100</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Ocupação de tanque · reserva comercial · reprogramação</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className={`erp-btn${view === "occupation" ? " erp-btn-dark" : ""}`} onClick={() => setView("occupation")} disabled={busy}>Ocupação</button>
          <button className={`erp-btn${view === "reservation" ? " erp-btn-dark" : ""}`} onClick={() => setView("reservation")} disabled={busy}>Reserva de tanque</button>
          <button className={`erp-btn${view === "reschedule" ? " erp-btn-dark" : ""}`} onClick={() => setView("reschedule")} disabled={busy}>Reprogramação em lote</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VDPR0100 — Promessa de Entrega" filename="vdpr0100" /></div>
      </div>

      <div className="erp-content">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

      {view === "occupation" && (
        <>
          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Ocupação diária por tanque de planejamento</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label erp-req">De</label><input className="erp-input" type="date" value={occFrom} onChange={(e) => setOccFrom(e.target.value)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Até</label><input className="erp-input" type="date" value={occTo} onChange={(e) => setOccTo(e.target.value)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Capacidade diária</label><input className="erp-input num" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
              <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={carregarOcupacao} disabled={busy}>{busy && <span className="erp-spin" />}Calcular ocupação</button></div>
            </div>
          </div>
          <div className="erp-grid-wrap">
            <table className="erp-grid">
              <thead><tr><th>Data</th><th className="num">Tanque</th><th className="num">Alocado</th><th className="num">Capacidade</th><th className="num">Livre</th><th className="num">Ocupação</th><th className="num">Valor previsto</th></tr></thead>
              <tbody>
                {occupation.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Sem dados. Defina o período e clique em <strong>Calcular ocupação</strong>.</td></tr>}
                {occupation.map((raw, i) => { const o = unwrapObject(raw); const occ = parseNum(o, "occupation_pct", "OccupationPct"); return (
                  <tr key={i}>
                    <td>{parseStr(o, "date", "Date")?.slice(0, 10) || "—"}</td>
                    <td className="num">{parseNum(o, "planning_tank_code", "PlanningTankCode") ?? "—"}</td>
                    <td className="num">{parseNum(o, "allocated_qty", "AllocatedQty") ?? 0}</td>
                    <td className="num">{parseNum(o, "capacity", "Capacity") ?? "—"}</td>
                    <td className="num">{parseNum(o, "free_qty", "FreeQty") ?? "—"}</td>
                    <td className="num">{occ !== undefined ? pct(occ) : "—"}</td>
                    <td className="num">{money(parseNum(o, "expected_value", "ExpectedValue"))}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === "reservation" && (
        <>
          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Parâmetros da reserva comercial</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Data prometida</label><input className="erp-input" type="date" value={resDate} onChange={(e) => setResDate(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Validade (dias)</label><input className="erp-input num" type="number" value={firmDays} onChange={(e) => setFirmDays(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Capac. diária</label><input className="erp-input num" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
              <div className="erp-field erp-c2" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="vstock" className="erp-check" type="checkbox" checked={verifyStock} onChange={(e) => setVerifyStock(e.target.checked)} /><label htmlFor="vstock" className="erp-label" style={{ margin: 0 }}>Descontar ATP</label></div>
              <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="commit" className="erp-check" type="checkbox" checked={commit} onChange={(e) => setCommit(e.target.checked)} /><label htmlFor="commit" className="erp-label" style={{ margin: 0 }}>Gravar (senão, só simula)</label></div>
            </div>
          </div>
          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Linhas da reserva</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c5"><label className="erp-label erp-req">Item</label><LookupField value={lineForm.item_code} loader={loadItems} entityLabel="item" onChange={(c) => setLineForm((p) => ({ ...p, item_code: c ?? 0 }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Qtd</label><input className="erp-input num" type="number" value={lineForm.quantity || ""} onChange={(e) => setLineForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Preço unit.</label><input className="erp-input num" type="number" value={lineForm.unit_price || ""} onChange={(e) => setLineForm((p) => ({ ...p, unit_price: Number(e.target.value) }))} /></div>
              <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={addLine} disabled={busy}>Adicionar linha</button></div>
            </div>
          </div>
          <div className="erp-grid-wrap">
            <table className="erp-grid">
              <thead><tr><th className="num">Item</th><th className="num">Qtd</th><th className="num">Preço unit.</th><th className="num">Total</th><th style={{ width: 70 }}></th></tr></thead>
              <tbody>
                {lines.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma linha. Adicione itens acima.</td></tr>}
                {lines.map((l, i) => (
                  <tr key={i}><td className="num">{l.item_code}</td><td className="num">{l.quantity}</td><td className="num">{money(l.unit_price)}</td><td className="num">{money(l.quantity * (l.unit_price ?? 0))}</td>
                    <td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => removeLine(i)} disabled={busy}>Remover</button></td></tr>
                ))}
              </tbody>
              {lines.length > 0 && <tfoot><tr><td colSpan={3} className="num">Total</td><td className="num">{money(linesTotal)}</td><td></td></tr></tfoot>}
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <button className="erp-btn erp-btn-primary" onClick={reservar} disabled={busy}>{busy && <span className="erp-spin" />}{commit ? "Gravar reserva" : "Simular reserva"}</button>
            <span style={{ color: "var(--v-text-3)" }}>|</span>
            <input className="erp-input num" style={{ width: 120 }} type="number" placeholder="Cód. reserva" value={cancelCode} onChange={(e) => setCancelCode(e.target.value)} />
            <button className="erp-btn erp-btn-danger" onClick={cancelarReserva} disabled={busy || !cancelCode}>Cancelar reserva</button>
            <button className="erp-btn" onClick={expirar} disabled={busy}>Expirar vencidas</button>
          </div>
          {reservationResult && <div className="erp-feedback info" style={{ marginTop: 10 }}>Resultado: {Object.entries(unwrapObject(reservationResult)).slice(0, 5).map(([k, v]) => `${k}=${String(v)}`).join(" · ")}</div>}
        </>
      )}

      {view === "reschedule" && (
        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Reprogramação em lote (ignora pedidos/itens com data firme)</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c3"><label className="erp-label">Entrega de</label><input className="erp-input" type="date" value={rsFrom} onChange={(e) => setRsFrom(e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Entrega até</label><input className="erp-input" type="date" value={rsTo} onChange={(e) => setRsTo(e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Cliente</label><LookupField value={rsCustomer} loader={loadCustomers} entityLabel="cliente" placeholder="Todos" onChange={(c) => setRsCustomer(c)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Nova data</label><input className="erp-input" type="date" value={rsNewDate} onChange={(e) => setRsNewDate(e.target.value)} /></div>
            <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn erp-btn-primary" onClick={reprogramar} disabled={busy}>{busy && <span className="erp-spin" />}Reprogramar em lote</button></div>
          </div>
          {rescheduleResult && <p style={{ fontSize: 12, color: "var(--v-text-3)", padding: "0 14px 12px" }}>{Object.entries(unwrapObject(rescheduleResult)).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</p>}
        </div>
      )}
      </div>

      <footer className="erp-statusbar">
        {view === "occupation" && <div className="erp-status-item">Dias na grade: <strong>{occupation.length}</strong></div>}
        {view === "reservation" && <div className="erp-status-item">Linhas: <strong>{lines.length}</strong> · Total R$ <strong>{money(linesTotal)}</strong> · {commit ? "GRAVA" : "simula"}</div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
