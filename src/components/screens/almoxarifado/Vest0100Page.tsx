import { useState, useCallback } from "react";
import {
  type MovementDTO, type BalanceDTO, type AtpDTO, type LotBalanceDTO, type ConsumptionAvgDTO,
  MOVEMENT_TYPES,
  listMovements, listMovementsByItem, createMovement,
  listBalancesByItem, getAtp,
  createReservation, releaseReservation, consumeReservation,
  registerLot, listLotsByItem, getLotGenealogy,
  sugerirSeparacao, listarSaldoPorEndereco, transferirEntreEnderecos, sugerirGuarda, apurarCurvaABC,
  criarOndaSeparacao, confirmarOndaSeparacao, cancelarOndaSeparacao,
  type SugestaoSeparacaoDTO, type SaldoEnderecoDTO, type SugestaoGuardaDTO, type ResumoABCDTO, type OndaDTO,
  recalcConsumptionAverage, getConsumptionAverage,
} from "@/services/stockService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { enumLabel } from "@/utils/enumLabels";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadWarehouseAddresses, loadItems, loadWarehouses, loadSuppliers } from "@/services/lookups";
import { ReadableRecord } from "@/components/ui/ReadableRecord";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const num = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const MOVEMENT_LABEL: Record<string, string> = {
  IN: "Entrada", OUT: "Saída", TRANSFER_IN: "Transferência (entrada)", TRANSFER_OUT: "Transferência (saída)",
  ADJUSTMENT: "Ajuste", TRANSF_ENDERECO: "Transferência entre endereços",
  EP: "Entrada de produção", EPP: "Entrada de produção planejada", EPE: "Excedente de produção",
  REP: "Requisição planejada", ENTRADA: "Entrada", SAIDA: "Saída",
};
const REFERENCE_LABEL: Record<string, string> = { MANUAL: "Manual", SALES_ORDER: "Pedido de venda", PURCHASE_ORDER: "Pedido de compra", PRODUCTION_ORDER: "Ordem de produção", SHIPMENT: "Expedição" };

const EMPTY_MOV: MovementDTO = { item_code: "", warehouse_id: 0, movement_type: "IN", quantity: 0, unit_price: 0, lot: "" };

/**
 * A tela era uma rolagem única com oito assuntos: ATP, saldos, lançamento,
 * movimentos, reservas, separação, guarda, lotes e consumo. Quem ia lançar um
 * movimento passava por tudo. Cada assunto virou uma aba, e a barra de
 * ferramentas (item + consultar) continua valendo para todas.
 */
type AbaEstoque = "saldos" | "movimentos" | "reservas" | "separacao" | "lotes";

export function Vest0100Page(): JSX.Element {
  const [aba, setAba] = useState<AbaEstoque>("saldos");
  const [itemCode, setItemCode] = useState("");
  const [movements, setMovements] = useState<MovementDTO[]>([]);
  const [balances, setBalances] = useState<BalanceDTO[]>([]);
  const [atp, setAtp] = useState<AtpDTO | null>(null);
  const [lots, setLots] = useState<LotBalanceDTO[]>([]);
  const [genealogy, setGenealogy] = useState<Obj | null>(null);
  const [consumption, setConsumption] = useState<ConsumptionAvgDTO | null>(null);
  const [movForm, setMovForm] = useState<MovementDTO>({ ...EMPTY_MOV });
  const [resForm, setResForm] = useState({
    item_code: "", warehouse_id: 0, quantity: 0, reference_type: "MANUAL", reference_code: 0,
    reference_item_code: "", reservation_date: "", expiration_date: "", notes: "",
  });
  const [lotForm, setLotForm] = useState({ item_code: "", lot: "", heat_number: "", certificate: "", supplier_code: "", received_at: "", expires_at: "" });
  const [separacao, setSeparacao] = useState<SugestaoSeparacaoDTO | null>(null);
  const [sepQtd, setSepQtd] = useState("");
  const [sepRegra, setSepRegra] = useState<"FEFO" | "FIFO">("FEFO");
  const [saldoEndereco, setSaldoEndereco] = useState<SaldoEnderecoDTO[]>([]);
  const [transf, setTransf] = useState({ address_from: "", address_to: "", quantity: "", lot: "" });
  const [guarda, setGuarda] = useState<SugestaoGuardaDTO[]>([]);
  const [guardaQtd, setGuardaQtd] = useState("");
  const [abc, setAbc] = useState<ResumoABCDTO | null>(null);
  const [onda, setOnda] = useState<OndaDTO | null>(null);
  const [ondaForm, setOndaForm] = useState({ code: "", linhas: "" });
  const [resId, setResId] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const consultarItem = () => run(async () => {
    const c = itemCode.trim();
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
    if (itemCode) await Promise.all([listMovementsByItem(itemCode.trim()).then(setMovements), listBalancesByItem(itemCode.trim()).then(setBalances), getAtp(itemCode.trim()).then(setAtp)]);
  });

  const criarReserva = () => run(async () => {
    if (!resForm.item_code || !resForm.warehouse_id || !resForm.quantity) { setFeedback({ type: "error", message: "Item, depósito e quantidade são obrigatórios." }); return; }
    const r = await createReservation({
      ...resForm,
      reference_item_code: Number(resForm.reference_item_code) || undefined,
      reservation_date: resForm.reservation_date || undefined,
      expiration_date: resForm.expiration_date || undefined,
      notes: resForm.notes.trim() || undefined,
    });
    setResId(String(r.id ?? ""));
    setFeedback({ type: "success", message: `Reserva ${r.id} criada (Ativo) — ATP reduzido.` });
    if (itemCode) await getAtp(itemCode.trim()).then(setAtp);
  });
  const liberar = () => run(async () => { const id = Number(resId); if (!id) return; await releaseReservation(id); setFeedback({ type: "success", message: `Reserva ${id} liberada.` }); if (itemCode) await getAtp(itemCode.trim()).then(setAtp); });
  const consumir = () => run(async () => { const id = Number(resId); if (!id) return; await consumeReservation(id); setFeedback({ type: "success", message: `Reserva ${id} consumida.` }); if (itemCode) await getAtp(itemCode.trim()).then(setAtp); });

  const registrarLote = () => run(async () => {
    if (!lotForm.item_code || !lotForm.lot.trim()) { setFeedback({ type: "error", message: "Item e lote são obrigatórios." }); return; }
    await registerLot({
      ...lotForm,
      supplier_code: lotForm.supplier_code ? Number(lotForm.supplier_code) : undefined,
      received_at: lotForm.received_at || undefined,
      expires_at: lotForm.expires_at || undefined,
    });
    setFeedback({ type: "success", message: `Lote ${lotForm.lot} registrado.` });
    if (itemCode) await listLotsByItem(itemCode.trim()).then(setLots);
  });
  const sugerirSeparacaoDoItem = () => run(async () => {
    const c = itemCode.trim();
    const q = Number(sepQtd);
    if (!c || !(q > 0)) { setFeedback({ type: "error", message: "Informe o item e a quantidade a separar." }); return; }
    const r = await sugerirSeparacao(c, q, Number(movForm.warehouse_id) || undefined, sepRegra);
    setSeparacao(r);
    setFeedback(r.missing_qty > 0
      ? { type: "error", message: `Faltam ${num(r.missing_qty)} para completar a separação.` }
      : { type: "success", message: `Separação sugerida por ${r.rule}.` });
  });
  const gerarOnda = () => run(async () => {
    const code = Number(ondaForm.code);
    // Uma necessidade por linha: "ITEM;QUANTIDADE".
    const lines = ondaForm.linhas.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [item, qtd] = l.split(";").map((p) => p.trim());
      return { item_code: item, quantity: Number(qtd) };
    }).filter((l) => l.item_code && l.quantity > 0);
    if (!(code > 0) || !lines.length || !Number(movForm.warehouse_id)) {
      setFeedback({ type: "error", message: "Informe o número da onda, o almoxarifado e ao menos uma necessidade." }); return;
    }
    const r = await criarOndaSeparacao({ code, warehouse_id: Number(movForm.warehouse_id), rule: sepRegra, lines });
    setOnda(r);
    setFeedback(r.missing.length
      ? { type: "error", message: `Onda ${r.code} criada com falta em ${r.missing.length} item(ns).` }
      : { type: "success", message: `Onda ${r.code} criada: ${r.lines.length} parada(s) na caminhada.` });
  });
  const encerrarOnda = (confirmar: boolean) => run(async () => {
    if (!onda) return;
    const r = confirmar ? await confirmarOndaSeparacao(onda.code) : await cancelarOndaSeparacao(onda.code);
    setOnda({ ...onda, status: r.status });
    setFeedback({ type: "success", message: confirmar
      ? `Onda ${r.code} separada: estoque baixado e reservas liberadas.`
      : `Onda ${r.code} cancelada: o reservado voltou a ficar disponível.` });
  });
  const sugerirOndeGuardar = () => run(async () => {
    const c = itemCode.trim();
    const q = Number(guardaQtd);
    if (!c || !(q > 0) || !Number(movForm.warehouse_id)) {
      setFeedback({ type: "error", message: "Informe item, almoxarifado e quantidade a guardar." }); return;
    }
    const r = await sugerirGuarda(c, q, Number(movForm.warehouse_id));
    setGuarda(r);
    setFeedback(r.length
      ? { type: "success", message: `${r.length} endereço(s) sugerido(s).` }
      : { type: "error", message: "Nenhum endereço livre comporta essa quantidade." });
  });
  const recalcularABC = () => run(async () => {
    const r = await apurarCurvaABC();
    setAbc(r);
    setFeedback({ type: "success", message: `${r.classified} item(ns) classificados sobre ${num(r.total_value)} consumidos.` });
  });
  const transferirEndereco = () => run(async () => {
    const c = itemCode.trim();
    const q = Number(transf.quantity);
    if (!c || !transf.address_from.trim() || !transf.address_to.trim() || !(q > 0)) {
      setFeedback({ type: "error", message: "Informe item, origem, destino e quantidade." }); return;
    }
    await transferirEntreEnderecos({
      item_code: c, warehouse_id: Number(movForm.warehouse_id) || 0,
      address_from: transf.address_from.trim(), address_to: transf.address_to.trim(),
      quantity: q, lot: transf.lot.trim() || undefined,
    });
    setFeedback({ type: "success", message: `${num(q)} transferido de ${transf.address_from} para ${transf.address_to}.` });
    setSaldoEndereco(await listarSaldoPorEndereco(Number(movForm.warehouse_id) || undefined, c));
  });
  const carregarSaldoPorEndereco = () => run(async () => {
    setSaldoEndereco(await listarSaldoPorEndereco(Number(movForm.warehouse_id) || undefined, itemCode.trim() || undefined));
  });
  const verGenealogia = (lot: string) => run(async () => {
    const c = itemCode.trim(); if (!c) return;
    setGenealogy(await getLotGenealogy(c, lot));
    setFeedback({ type: "info", message: `Genealogia do lote ${lot} carregada.` });
  });

  const recalcConsumo = () => run(async () => {
    const c = itemCode.trim(); if (!c) { setFeedback({ type: "error", message: "Informe o item." }); return; }
    await recalcConsumptionAverage(c);
    setConsumption(await getConsumptionAverage(c));
    setFeedback({ type: "success", message: "Consumo médio recalculado." });
  });

  const ABAS: { id: AbaEstoque; label: string; hint: string; contador?: number }[] = [
    { id: "saldos", label: "Saldos e ATP", hint: "Disponível para promessa, saldo por depósito e consumo médio" },
    { id: "movimentos", label: "Movimentos", hint: "Lançar entrada/saída e ver o histórico", contador: movements.length },
    { id: "reservas", label: "Reservas", hint: "Reservar, liberar e consumir saldo" },
    { id: "separacao", label: "Separação e guarda", hint: "FEFO/FIFO, onda de separação, endereço sugerido, curva ABC e transferência" },
    { id: "lotes", label: "Lotes", hint: "Registro, rastreabilidade e genealogia", contador: lots.length },
  ];

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Almoxarifado</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Estoque (movimentos, saldos, ATP, reservas, lotes)</span><span className="erp-crumb-code">VEST0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Item</span>
          <div className="erp-tlookup"><LookupField value={itemCode || undefined} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(code) => setItemCode(String(code ?? ""))} /></div>
          <button className="erp-btn" onClick={consultarItem} disabled={busy}>Consultar</button>
          <button className="erp-btn" onClick={listarTodos} disabled={busy}>Últimos movimentos</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VEST0100 — Estoque" filename="vest0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            {ABAS.map((a) => (
              <button key={a.id} className={`erp-tab${aba === a.id ? " active" : ""}`} onClick={() => setAba(a.id)} title={a.hint}>
                {a.label}{a.contador !== undefined ? ` (${a.contador})` : ""}
              </button>
            ))}
          </div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {aba === "saldos" && (<>
        {!atp && balances.length === 0 && (
          <div className="erp-note">
            Selecione o item na barra e clique em <strong>Consultar</strong> para ver o disponível
            para promessa (ATP), o saldo de cada depósito e o consumo médio.
          </div>
        )}
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
              <tbody>{balances.map((b, i) => <tr key={i}><td><EntityName code={b.warehouse_id} loader={loadWarehouses} prefix="Depósito" /></td><td>{num(b.quantity)}</td><td>{num(b.reserved_qty)}</td><td>{num(b.available_qty)}</td><td>{num(b.avg_cost)}</td></tr>)}</tbody>
            </table>
          </div></div></div>
        )}

        {/* Consumo médio do item (ROP) */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Consumo médio mensal (ROP)</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={recalcConsumo} disabled={busy}>Recalcular consumo do item</button></div>
          {consumption && <>
            <div className="erp-field erp-c3"><label className="erp-label">Consumo médio/mês</label><input className="erp-input num" value={num(consumption.avg_monthly_consumption)} readOnly /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Total consumido</label><input className="erp-input num" value={num(consumption.total_consumed)} readOnly /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Janela (meses)</label><input className="erp-input num" value={consumption.window_months} readOnly /></div>
          </>}
        </div></div>
        </>)}

        {aba === "movimentos" && (<>
        {/* Lançar movimento */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Lançar movimento</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><LookupField value={movForm.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(code) => setMovForm((p) => ({ ...p, item_code: String(code ?? "") }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Depósito</label><LookupField value={movForm.warehouse_id || undefined} loader={loadWarehouses} entityLabel="depósito" onChange={(code) => setMovForm((p) => ({ ...p, warehouse_id: code ? Number(code) : 0 }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Tipo</label>
            <select className="erp-input" value={movForm.movement_type} onChange={(e) => setMovForm((p) => ({ ...p, movement_type: e.target.value }))}>{MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label><input className="erp-input num" type="number" value={movForm.quantity || ""} onChange={(e) => setMovForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Preço unit.</label><input className="erp-input num" type="number" step="0.01" value={movForm.unit_price || ""} onChange={(e) => setMovForm((p) => ({ ...p, unit_price: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Lote</label><input className="erp-input" value={movForm.lot ?? ""} onChange={(e) => setMovForm((p) => ({ ...p, lot: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Endereço</label>
            <LookupField value={movForm.address || undefined}
              onChange={(c) => setMovForm((p) => ({ ...p, address: c ? String(c) : "" }))}
              loader={loadWarehouseAddresses(Number(movForm.warehouse_id) || undefined)}
              entityLabel="endereço" placeholder="Selecionar…" clearable />
            <small className="erp-hint">Em branco = almoxarifado sem endereçamento.</small></div>
          <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={lancarMovimento} disabled={busy}>Lançar movimento</button></div>
        </div></div>

        {/* Movimentos */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Movimentos ({movements.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>ID</th><th>Item</th><th>Depósito</th><th>Endereço</th><th>Tipo</th><th>Qtd</th><th>Lote</th><th>Origem</th><th>Data</th></tr></thead>
            <tbody>
              {movements.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum movimento. Consulte um item ou carregue os últimos.</td></tr>}
              {movements.slice(0, 100).map((m) => <tr key={m.id}><td>{m.id}</td><td><EntityName code={m.item_code} loader={loadItems} prefix="Item" /></td><td><EntityName code={m.warehouse_id} loader={loadWarehouses} prefix="Depósito" /></td><td>{m.address ? (m.address_to ? `${m.address} → ${m.address_to}` : m.address) : "—"}</td><td>{MOVEMENT_LABEL[m.movement_type] ?? m.movement_type}</td><td>{num(m.quantity)}</td><td>{m.lot || "—"}</td><td>{m.reference_type ? `${REFERENCE_LABEL[m.reference_type] ?? m.reference_type} ${m.reference_code ?? ""}` : "—"}</td><td>{m.created_at?.slice(0, 10) ?? "—"}</td></tr>)}
            </tbody>
          </table>
        </div></div></div>

        </>)}

        {aba === "reservas" && (<>
        {/* Reservas */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Reservas (ATP)</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><input className="erp-input num"  value={resForm.item_code || ""} onChange={(e) => setResForm((p) => ({ ...p, item_code: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Depósito</label><input className="erp-input num" type="number" value={resForm.warehouse_id || ""} onChange={(e) => setResForm((p) => ({ ...p, warehouse_id: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label><input className="erp-input num" type="number" value={resForm.quantity || ""} onChange={(e) => setResForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Linha do documento</label><input className="erp-input num" type="number" value={resForm.reference_item_code} onChange={(e) => setResForm((p) => ({ ...p, reference_item_code: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Vale a partir de</label><input className="erp-input" type="date" value={resForm.reservation_date} onChange={(e) => setResForm((p) => ({ ...p, reservation_date: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Expira em</label><input className="erp-input" type="date" value={resForm.expiration_date} onChange={(e) => setResForm((p) => ({ ...p, expiration_date: e.target.value }))} />
            <span className="erp-field-hint">Sem data, a reserva segura o saldo até alguém liberar.</span></div>
          <div className="erp-field erp-c3"><label className="erp-label">Observações</label><input className="erp-input" value={resForm.notes} onChange={(e) => setResForm((p) => ({ ...p, notes: e.target.value }))} /></div>
          <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={criarReserva} disabled={busy}>Criar reserva</button></div>
          <div className="erp-field erp-c2"><label className="erp-label">Reserva (ID)</label><input className="erp-input num" type="number" value={resId} onChange={(e) => setResId(e.target.value)} /></div>
          <div className="erp-field erp-c2" style={{ alignSelf: "end", display: "flex", gap: 8 }}>
            <button className="erp-btn" onClick={liberar} disabled={busy}>Liberar</button>
            <button className="erp-btn" onClick={consumir} disabled={busy}>Consumir</button></div>
        </div></div>

        </>)}

        {aba === "separacao" && (<>
        {/* Separação por endereço (FEFO/FIFO) */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Separação — de onde tirar</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label">Quantidade</label>
            <input className="erp-input num" value={sepQtd} onChange={(e) => setSepQtd(e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Regra</label>
            <select className="erp-input" value={sepRegra} onChange={(e) => setSepRegra(e.target.value as "FEFO" | "FIFO")}>
              <option value="FEFO">FEFO — vence antes, sai antes</option>
              <option value="FIFO">FIFO — entrou antes, sai antes</option>
            </select></div>
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}>
            <button className="erp-btn erp-btn-primary" onClick={sugerirSeparacaoDoItem} disabled={busy}>Sugerir separação</button></div>
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}>
            <button className="erp-btn" onClick={carregarSaldoPorEndereco} disabled={busy}>Ver saldo por endereço</button></div>
          <div className="erp-field erp-c12"><div className="erp-subhead">Onda de separação (várias necessidades numa caminhada)</div></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Nº da onda</label>
            <input className="erp-input num" value={ondaForm.code} onChange={(e) => setOndaForm((p) => ({ ...p, code: e.target.value }))} /></div>
          <div className="erp-field erp-c5"><label className="erp-label erp-req">Necessidades</label>
            <textarea className="erp-input" rows={3} placeholder={"MP-CH-3MM;400\nMP-PERFIL-U;50"}
              value={ondaForm.linhas} onChange={(e) => setOndaForm((p) => ({ ...p, linhas: e.target.value }))} />
            <small className="erp-hint">Uma por linha, no formato item;quantidade. Usa a regra escolhida acima.</small></div>
          <div className="erp-field erp-c2" style={{ alignSelf: "end" }}>
            <button className="erp-btn erp-btn-primary" onClick={gerarOnda} disabled={busy}>Gerar onda</button></div>
          {onda && (
            <div className="erp-field erp-c12">
              <div className="erp-status-item">
                Onda <strong>{onda.code}</strong> · {onda.status} · regra {onda.rule} · {onda.lines.length} parada(s)
                {onda.missing.length > 0 && <> · <strong>falta:</strong> {onda.missing.map((m) => `${m.item_code} (${num(m.quantity)})`).join(", ")}</>}
              </div>
              <table className="erp-grid">
                <thead><tr><th>Rota</th><th>Endereço</th><th>Item</th><th>Lote</th><th>Corrida</th><th>Quantidade</th><th>Origem</th></tr></thead>
                <tbody>{onda.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="num">{l.pick_sequence || "—"}</td>
                    <td><strong>{l.address || "—"}</strong></td>
                    <td><EntityName code={l.item_code} loader={loadItems} prefix="Item" /></td>
                    <td>{l.lot || "—"}</td><td>{l.heat_number ?? "—"}</td>
                    <td className="num">{num(l.quantity)}</td>
                    <td>{l.reference_type ? `${l.reference_type} ${l.reference_code ?? ""}` : "—"}</td>
                  </tr>))}</tbody>
              </table>
              {onda.status === "ABERTA" && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="erp-btn erp-btn-primary" onClick={() => encerrarOnda(true)} disabled={busy}>Confirmar separação</button>
                  <button className="erp-btn" onClick={() => encerrarOnda(false)} disabled={busy}>Cancelar onda</button>
                </div>
              )}
            </div>
          )}

          <div className="erp-field erp-c12"><div className="erp-subhead">Guardar recebimento (onde colocar)</div></div>
          <div className="erp-field erp-c2"><label className="erp-label">Quantidade</label>
            <input className="erp-input num" value={guardaQtd} onChange={(e) => setGuardaQtd(e.target.value)} /></div>
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}>
            <button className="erp-btn" onClick={sugerirOndeGuardar} disabled={busy}>Sugerir endereço</button></div>
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}>
            <button className="erp-btn" onClick={recalcularABC} disabled={busy}>Recalcular curva ABC</button></div>
          {guarda.length > 0 && (
            <div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Endereço</th><th>Zona</th><th>Rota</th><th>Já tem</th><th>Capacidade</th><th>Por quê</th></tr></thead>
                <tbody>{guarda.map((g) => (
                  <tr key={g.address}>
                    <td><strong>{g.address}</strong></td><td>{g.zone || "—"}</td>
                    <td className="num">{g.pick_sequence || "—"}</td>
                    <td className="num">{num(g.current_qty)}</td>
                    <td className="num">{g.capacity == null ? "sem limite" : num(g.capacity)}</td>
                    <td>{g.reason}</td>
                  </tr>))}</tbody>
              </table>
            </div>
          )}
          {abc && (
            <div className="erp-field erp-c12">
              <div className="erp-status-item">
                Curva ABC — janela de {abc.window_months} meses · {num(abc.total_value)} consumidos ·
                cortes {abc.cut_a_pct}% / {abc.cut_b_pct}% · a classe governa a frequência da contagem cíclica
              </div>
              <table className="erp-grid">
                <thead><tr><th>Item</th><th>Valor consumido</th><th>Participação</th><th>Acumulado</th><th>Classe</th></tr></thead>
                <tbody>{abc.items.map((i) => (
                  <tr key={i.item_code}>
                    <td><EntityName code={i.item_code} loader={loadItems} prefix="Item" /></td>
                    <td className="num">{num(i.consumption_value)}</td>
                    <td className="num">{i.share_pct.toFixed(2)}%</td>
                    <td className="num">{i.cumulative_pct.toFixed(2)}%</td>
                    <td><strong>{i.abc_class}</strong></td>
                  </tr>))}</tbody>
              </table>
            </div>
          )}

          <div className="erp-field erp-c12"><div className="erp-subhead">Transferir entre endereços</div></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Origem</label>
            <LookupField value={transf.address_from || undefined}
              onChange={(c) => setTransf((p) => ({ ...p, address_from: c ? String(c) : "" }))}
              loader={loadWarehouseAddresses(Number(movForm.warehouse_id) || undefined)}
              entityLabel="endereço de origem" placeholder="Selecionar…" clearable /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Destino</label>
            <LookupField value={transf.address_to || undefined}
              onChange={(c) => setTransf((p) => ({ ...p, address_to: c ? String(c) : "" }))}
              loader={loadWarehouseAddresses(Number(movForm.warehouse_id) || undefined)}
              entityLabel="endereço de destino" placeholder="Selecionar…" clearable /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label>
            <input className="erp-input num" value={transf.quantity} onChange={(e) => setTransf((p) => ({ ...p, quantity: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Lote</label>
            <input className="erp-input" value={transf.lot} onChange={(e) => setTransf((p) => ({ ...p, lot: e.target.value }))} /></div>
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}>
            <button className="erp-btn" onClick={transferirEndereco} disabled={busy}>Transferir</button></div>

          {separacao && (
            <div className="erp-field erp-c12">
              <div className="erp-status-item">
                Necessário <strong>{num(separacao.required_qty)}</strong> · atendido <strong>{num(separacao.covered_qty)}</strong>
                {separacao.missing_qty > 0 && <> · <strong>faltam {num(separacao.missing_qty)}</strong></>}
                {separacao.expired_skipped > 0 && <> · {separacao.expired_skipped} lote(s) vencido(s) ignorado(s)</>}
                {separacao.blocked_skipped > 0 && <> · {separacao.blocked_skipped} em endereço bloqueado</>}
              </div>
              <table className="erp-grid">
                <thead><tr><th>Rota</th><th>Endereço</th><th>Zona</th><th>Lote</th><th>Corrida</th><th>Certificado</th><th>Validade</th><th>Disponível</th><th>Separar</th></tr></thead>
                <tbody>{separacao.lines.map((l, i) => (
                  <tr key={`${l.lot}-${l.address}-${i}`}>
                    <td className="num">{l.pick_sequence || "—"}</td>
                    <td><strong>{l.address || "—"}</strong></td><td>{l.zone || "—"}</td>
                    <td>{l.lot}</td><td>{l.heat_number ?? "—"}</td><td>{l.certificate ?? "—"}</td>
                    <td>{l.expires_at ? new Date(l.expires_at).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="num">{num(l.available_qty)}</td>
                    <td className="num"><strong>{num(l.suggested_qty)}</strong></td>
                  </tr>))}</tbody>
              </table>
            </div>
          )}
          {saldoEndereco.length > 0 && (
            <div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Endereço</th><th>Item</th><th>Lote</th><th>Quantidade</th></tr></thead>
                <tbody>{saldoEndereco.map((b, i) => (
                  <tr key={`${b.address}-${b.lot}-${i}`}>
                    <td>{b.address || "—"}</td><td><EntityName code={b.item_code} loader={loadItems} prefix="Item" /></td>
                    <td>{b.lot || "—"}</td><td className="num">{num(b.quantity)}</td>
                  </tr>))}</tbody>
              </table>
            </div>
          )}
        </div></div>

        </>)}

        {aba === "lotes" && (<>
        {/* Lotes / genealogia */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Lotes / rastreabilidade ({lots.length})</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><input className="erp-input num"  value={lotForm.item_code || ""} onChange={(e) => setLotForm((p) => ({ ...p, item_code: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Lote</label><input className="erp-input" value={lotForm.lot} onChange={(e) => setLotForm((p) => ({ ...p, lot: e.target.value }))} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">Corrida (heat)</label><input className="erp-input" value={lotForm.heat_number} onChange={(e) => setLotForm((p) => ({ ...p, heat_number: e.target.value }))} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">Certificado</label><input className="erp-input" value={lotForm.certificate} onChange={(e) => setLotForm((p) => ({ ...p, certificate: e.target.value }))} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">Fornecedor</label>
            <LookupField value={Number(lotForm.supplier_code) || undefined}
              onChange={(c) => setLotForm((p) => ({ ...p, supplier_code: c ? String(c) : "" }))}
              loader={loadSuppliers} entityLabel="fornecedor" placeholder="De quem veio o material" clearable /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Recebido em</label>
            <input className="erp-input" type="date" value={lotForm.received_at}
              onChange={(e) => setLotForm((p) => ({ ...p, received_at: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Validade</label>
            <input className="erp-input" type="date" value={lotForm.expires_at}
              onChange={(e) => setLotForm((p) => ({ ...p, expires_at: e.target.value }))} />
            <small className="erp-hint">Ordena o FEFO: vence antes, sai antes.</small></div>
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
            <ReadableRecord value={genealogy} emptyLabel="Sem genealogia para este lote." />
          </div></div>
        )}
        </>)}

      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Movimentos: <strong>{movements.length}</strong></div>{atp && <div className="erp-status-item">ATP: <strong>{num(atp.total_available)}</strong></div>}</div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
