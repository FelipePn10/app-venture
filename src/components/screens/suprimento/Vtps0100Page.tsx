import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type ServicePrice, type ServiceOrder, type ServiceMovement, type GlobalConversion, type PriceHistoryEntry,
  FREIGHT_TYPES, ORDER_STATUSES, MOVEMENT_TYPES,
  listServicePrices, createServicePrice, updateServicePrice, deleteServicePrice, servicePriceHistory,
  readjustServicePrices, copyMoveServicePrices, resolveServiceCost,
  listServiceOrders, updateServiceOrderStatus, getServiceOrderMovements, addServiceOrderMovement,
  listGlobalConversions, upsertGlobalConversion, deleteGlobalConversion,
} from "@/services/thirdPartyServicesService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { enumLabel } from "@/utils/enumLabels";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadSuppliers, loadOperations } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

/**
 * As quatro abas são as quatro perguntas de quem manda peça para fora:
 * quanto custa, o que está lá fora agora, o que saiu e voltou de cada ordem, e
 * como converter a unidade do fornecedor para a nossa.
 */
type Aba = "precos" | "ordens" | "movimentos" | "conversoes";

const ABAS: { id: Aba; label: string }[] = [
  { id: "precos", label: "Preços de serviço" },
  { id: "ordens", label: "Ordens de serviço" },
  { id: "movimentos", label: "Remessa e retorno" },
  { id: "conversoes", label: "Conversões de unidade" },
];

const PRECO_VAZIO: ServicePrice = {
  item_code: "", mask: "", supplier_code: 0, operation_id: 0, uom: "UN",
  unit_price: "0", preferred: true, freight_type: "FIXED", freight_value: "0", tax_percent: "0",
};

const hoje = () => new Date().toISOString().slice(0, 10);
const brl = (v: string | number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 4 });
const num = (v: string | number, casas = 4) =>
  Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: casas });
const dia = (v?: string) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");

/** Vencida = ainda tem peça no terceiro e a data prometida já passou. */
function atrasada(o: ServiceOrder): boolean {
  if (Number(o.pending_quantity) <= 0) return false;
  if (o.status === "DONE" || o.status === "CANCELLED") return false;
  return !!o.due_date && o.due_date.slice(0, 10) < hoje();
}

export function Vtps0100Page(): JSX.Element {
  const [aba, setAba] = useState<Aba>("precos");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [confirmacao, setConfirmacao] = useState<
    { titulo: string; mensagem: string; assunto?: string; rotulo: string; acao: () => Promise<void> } | null
  >(null);

  // Preços
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [form, setForm] = useState<ServicePrice>({ ...PRECO_VAZIO });
  const [editId, setEditId] = useState<number | null>(null);
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [reajuste, setReajuste] = useState({ percent: "", reason: "" });
  const [destino, setDestino] = useState({ supplier_code: 0, operation_id: 0, move: false });
  const [historico, setHistorico] = useState<PriceHistoryEntry[]>([]);
  const [custo, setCusto] = useState<{ bruto: string; frete: string; recuperavel: string; efetivo: string } | null>(null);

  // Ordens
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [ordemSel, setOrdemSel] = useState<ServiceOrder | null>(null);

  // Movimentos
  const [movs, setMovs] = useState<ServiceMovement[]>([]);
  const [movForm, setMovForm] = useState({ movement_type: "REMITTANCE", quantity: "", reference_code: "", lot: "", notes: "" });

  // Conversões globais
  const [conversoes, setConversoes] = useState<GlobalConversion[]>([]);
  const [convForm, setConvForm] = useState<GlobalConversion>({ from_uom: "", to_uom: "", factor: "1" });

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  const setF = <K extends keyof ServicePrice>(k: K, v: ServicePrice[K]) => setForm((p) => ({ ...p, [k]: v }));

  const carregarPrecos = useCallback(() => run(async () => { setPrices(await listServicePrices()); }), [run]);
  const carregarOrdens = useCallback(() => run(async () => {
    setOrders(await listServiceOrders(filtroStatus ? { status: filtroStatus } : undefined));
  }), [run, filtroStatus]);
  const carregarConversoes = useCallback(() => run(async () => { setConversoes(await listGlobalConversions()); }), [run]);

  useEffect(() => { void carregarPrecos(); }, [carregarPrecos]);
  useEffect(() => { if (aba === "ordens") void carregarOrdens(); }, [aba, carregarOrdens]);
  useEffect(() => { if (aba === "conversoes") void carregarConversoes(); }, [aba, carregarConversoes]);

  // ── preços ─────────────────────────────────────────────────────────────────
  const novoPreco = () => { setForm({ ...PRECO_VAZIO }); setEditId(null); setHistorico([]); setCusto(null); setFeedback(null); };

  const editarPreco = (p: ServicePrice) => {
    setForm({ ...p }); setEditId(p.id ?? null); setCusto(null); setFeedback(null);
    if (p.id) void run(async () => { setHistorico(await servicePriceHistory(p.id!)); });
  };

  const salvarPreco = () => run(async () => {
    if (!form.item_code || !form.supplier_code || !form.operation_id) {
      setFeedback({ type: "error", message: "Informe o item, o fornecedor e a operação — os três definem o preço." });
      return;
    }
    if (editId !== null) { await updateServicePrice(editId, form); setFeedback({ type: "success", message: "Preço atualizado." }); }
    else { await createServicePrice(form); setFeedback({ type: "success", message: "Preço de serviço criado." }); }
    novoPreco();
    setPrices(await listServicePrices());
  });

  const pedirRemocaoPreco = (p: ServicePrice) => setConfirmacao({
    titulo: "Desativar preço de serviço",
    mensagem: "O preço deixa de ser usado no cálculo de custo e na geração de ordens. As ordens já emitidas mantêm o preço que receberam.",
    assunto: `${p.item_description || p.item_code} · ${p.supplier_name || `fornecedor ${p.supplier_code}`} · ${p.operation_name || `operação ${p.operation_id}`}`,
    rotulo: "Desativar",
    acao: async () => { await deleteServicePrice(p.id!); setPrices(await listServicePrices()); setFeedback({ type: "success", message: "Preço desativado." }); },
  });

  const marcar = (id?: number) => {
    if (!id) return;
    setMarcados((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const aplicarReajuste = () => run(async () => {
    if (marcados.size === 0) { setFeedback({ type: "error", message: "Marque os preços a reajustar." }); return; }
    if (!reajuste.percent) { setFeedback({ type: "error", message: "Informe o percentual do reajuste." }); return; }
    await readjustServicePrices([...marcados], reajuste.percent, reajuste.reason);
    setMarcados(new Set()); setReajuste({ percent: "", reason: "" });
    setPrices(await listServicePrices());
    setFeedback({ type: "success", message: "Reajuste aplicado — o histórico guarda o motivo e o valor anterior." });
  });

  const aplicarCopia = () => run(async () => {
    if (marcados.size === 0) { setFeedback({ type: "error", message: "Marque os preços a copiar." }); return; }
    if (!destino.supplier_code || !destino.operation_id) { setFeedback({ type: "error", message: "Escolha o fornecedor e a operação de destino." }); return; }
    await copyMoveServicePrices([...marcados], destino.supplier_code, destino.operation_id, destino.move);
    setMarcados(new Set()); setDestino({ supplier_code: 0, operation_id: 0, move: false });
    setPrices(await listServicePrices());
    setFeedback({ type: "success", message: destino.move ? "Preços movidos." : "Preços copiados." });
  });

  const conferirCusto = () => run(async () => {
    if (!form.item_code || !form.operation_id) { setFeedback({ type: "error", message: "Informe o item e a operação para calcular o custo." }); return; }
    const c = await resolveServiceCost({
      item_code: form.item_code, operation_id: form.operation_id,
      supplier_code: form.supplier_code || undefined, mask: form.mask || undefined,
    });
    setCusto({
      bruto: c.gross_unit_cost, frete: c.freight,
      recuperavel: c.recoverable_taxes, efetivo: c.effective_unit_cost,
    });
  });

  // ── ordens ─────────────────────────────────────────────────────────────────
  const mudarStatus = (o: ServiceOrder, status: string) => run(async () => {
    await updateServiceOrderStatus(o.id, status);
    setOrders(await listServiceOrders(filtroStatus ? { status: filtroStatus } : undefined));
    setFeedback({ type: "success", message: `Ordem ${o.code}: ${enumLabel(status)}.` });
  });

  const abrirMovimentos = (o: ServiceOrder) => {
    setOrdemSel(o); setAba("movimentos"); setMovForm({ movement_type: "REMITTANCE", quantity: "", reference_code: "", lot: "", notes: "" });
    void run(async () => { setMovs(await getServiceOrderMovements(o.id)); });
  };

  const lancarMovimento = () => run(async () => {
    if (!ordemSel) return;
    if (!movForm.quantity || Number(movForm.quantity) <= 0) {
      setFeedback({ type: "error", message: "Informe a quantidade movimentada." });
      return;
    }
    await addServiceOrderMovement(ordemSel.id, { ...movForm, quantity: String(movForm.quantity) });
    setMovForm((m) => ({ ...m, quantity: "", reference_code: "", lot: "", notes: "" }));
    setMovs(await getServiceOrderMovements(ordemSel.id));
    setOrders(await listServiceOrders(filtroStatus ? { status: filtroStatus } : undefined));
    setFeedback({ type: "success", message: "Movimento registrado." });
  });

  /** Quanto está fisicamente no terceiro agora, pelos movimentos lançados. */
  const saldoNoTerceiro = useMemo(() => movs.reduce((acc, m) => {
    const entrada = MOVEMENT_TYPES.find((t) => t.value === m.movement_type)?.entrada;
    return entrada ? acc - Number(m.quantity) : acc + Number(m.quantity);
  }, 0), [movs]);

  // ── conversões ─────────────────────────────────────────────────────────────
  const salvarConversao = () => run(async () => {
    if (!convForm.from_uom || !convForm.to_uom) { setFeedback({ type: "error", message: "Informe as duas unidades." }); return; }
    await upsertGlobalConversion(convForm);
    setConvForm({ from_uom: "", to_uom: "", factor: "1" });
    setConversoes(await listGlobalConversions());
    setFeedback({ type: "success", message: "Conversão gravada." });
  });

  const atrasadas = orders.filter(atrasada).length;
  const emPoderDeTerceiros = orders.reduce((a, o) => a + Number(o.pending_quantity || 0), 0);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimento</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Serviços de Terceiros</span><span className="erp-crumb-code">VTPS0100</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">o outro lado da operação externa do roteiro</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Atualizar</span>
          <button className="erp-btn erp-btn-dark" disabled={busy}
            onClick={() => { if (aba === "precos") void carregarPrecos(); else if (aba === "conversoes") void carregarConversoes(); else void carregarOrdens(); }}>
            {busy && <span className="erp-spin" />}Carregar
          </button>
        </div>
        {aba === "precos" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Preço</span>
            <button className="erp-btn erp-btn-new" onClick={novoPreco} disabled={busy}>+ Novo</button>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvarPreco()} disabled={busy}>
              {editId !== null ? "Atualizar" : "Salvar"}
            </button>
          </div>
        )}
        {aba === "ordens" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Situação</span>
            <select className="erp-input" style={{ width: 170 }} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="">Todas</option>
              {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        )}
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VTPS0100 — Serviços de Terceiros" filename="vtps0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            {ABAS.map((a) => (
              <button key={a.id} className={`erp-tab ${aba === a.id ? "active" : ""}`} onClick={() => setAba(a.id)}>{a.label}</button>
            ))}
          </div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {/* ═══ PREÇOS ═══ */}
            {aba === "precos" && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    {editId !== null ? `Editando preço #${editId}` : "Novo preço"} — <span style={{ fontWeight: 400, opacity: .65 }}>
                      item × fornecedor × operação × data definem qual preço vale
                    </span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label htmlFor="tps-item" className="erp-label erp-req">Item</label>
                      <LookupField value={form.item_code || undefined} loader={loadItems} entityLabel="item"
                        onChange={(c) => setF("item_code", String(c ?? ""))} clearable /></div>
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Fornecedor</label>
                      <LookupField value={form.supplier_code || undefined} loader={loadSuppliers} entityLabel="fornecedor"
                        onChange={(c) => setF("supplier_code", Number(c ?? 0))} clearable /></div>
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Operação</label>
                      <LookupField value={form.operation_id || undefined} loader={loadOperations} entityLabel="operação"
                        onChange={(c) => setF("operation_id", Number(c ?? 0))} clearable /></div>
                    <div className="erp-field erp-c2"><label htmlFor="tps-mascara" className="erp-label">Máscara</label>
                      <input id="tps-mascara" className="erp-input" value={form.mask ?? ""} placeholder="Todas"
                        onChange={(e) => setF("mask", e.target.value)} /></div>
                    <div className="erp-field erp-c1"><label htmlFor="tps-um" className="erp-label">UM</label>
                      <input id="tps-um" className="erp-input" value={form.uom ?? ""} onChange={(e) => setF("uom", e.target.value)} /></div>

                    <div className="erp-field erp-c2"><label htmlFor="tps-preco" className="erp-label erp-req">Preço unitário</label>
                      <input id="tps-preco" className="erp-input num" type="number" step="0.0001" value={String(form.unit_price)}
                        onChange={(e) => setF("unit_price", e.target.value)} /></div>
                    <div className="erp-field erp-c2"><label htmlFor="tps-vigencia" className="erp-label">Vigente a partir de</label>
                      <input id="tps-vigencia" className="erp-input" type="date"
                        value={(form.reference_date ?? hoje()).slice(0, 10)}
                        onChange={(e) => setF("reference_date", e.target.value)} />
                      <span className="erp-field-hint">Vale o preço mais recente até a data da ordem.</span></div>
                    <div className="erp-field erp-c2"><label htmlFor="tps-tipofrete" className="erp-label">Frete</label>
                      <select id="tps-tipofrete" className="erp-input" value={form.freight_type ?? "FIXED"}
                        onChange={(e) => setF("freight_type", e.target.value)}>
                        {FREIGHT_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select></div>
                    <div className="erp-field erp-c2"><label htmlFor="tps-frete" className="erp-label">Valor do frete</label>
                      <input id="tps-frete" className="erp-input num" type="number" step="0.0001" value={String(form.freight_value ?? "0")}
                        onChange={(e) => setF("freight_value", e.target.value)} /></div>
                    <div className="erp-field erp-c2"><label htmlFor="tps-imposto" className="erp-label">Imposto (%)</label>
                      <input id="tps-imposto" className="erp-input num" type="number" step="0.0001" value={String(form.tax_percent ?? "0")}
                        onChange={(e) => setF("tax_percent", e.target.value)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Preferencial</label>
                      <div className="erp-toggle-row">
                        <label className="erp-toggle">
                          <input type="checkbox" checked={!!form.preferred} onChange={(e) => setF("preferred", e.target.checked)} />
                          <div className="erp-toggle-track" /><div className="erp-toggle-thumb" />
                        </label>
                        <span className="erp-toggle-label">{form.preferred ? "É o escolhido" : "Alternativo"}</span>
                      </div>
                      <span className="erp-field-hint">Só um preferencial por item/operação/data.</span></div>

                    <div className="erp-field erp-c3"><label htmlFor="tps-fator" className="erp-label">Fator de conversão</label>
                      <input id="tps-fator" className="erp-input num" type="number" step="0.00000001" value={String(form.conversion_factor ?? "")}
                        placeholder="Mesma unidade" onChange={(e) => setF("conversion_factor", e.target.value)} />
                      <span className="erp-field-hint">Quando o fornecedor cobra por quilo e estocamos por peça.</span></div>
                    <div className="erp-field erp-c6"><label htmlFor="tps-formula" className="erp-label">Fórmula do preço</label>
                      <input id="tps-formula" className="erp-input" value={form.formula ?? ""} placeholder="Opcional — sobrepõe o preço fixo"
                        onChange={(e) => setF("formula", e.target.value)} /></div>
                    <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn" style={{ width: "100%" }} onClick={() => void conferirCusto()} disabled={busy}>
                        Conferir custo final
                      </button></div>

                    {custo && (
                      <div className="erp-field erp-c12">
                        <div className="erp-feedback info">
                          Custo por peça: bruto {brl(custo.bruto)} + frete {brl(custo.frete)} − imposto recuperável{" "}
                          {brl(custo.recuperavel)} = <strong>{brl(custo.efetivo)}</strong>.
                          {" "}O imposto recuperável volta para a empresa, por isso <b>abate</b> do custo em vez de somar.
                          É o valor efetivo que entra no custo do item.
                        </div>
                      </div>
                    )}

                    {historico.length > 0 && (
                      <div className="erp-field erp-c12">
                        <div className="fsc-rot-sec">Histórico deste preço</div>
                        <table className="erp-grid">
                          <thead><tr><th>Quando</th><th>O que houve</th><th>Motivo</th><th>Quem</th></tr></thead>
                          <tbody>
                            {historico.map((h) => (
                              <tr key={h.id}>
                                <td>{dia(h.changed_at)}</td><td>{enumLabel(h.action)}</td>
                                <td>{h.reason || "—"}</td><td>{h.changed_by || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Preços cadastrados — <span style={{ fontWeight: 400, opacity: .65 }}>
                      {prices.length} · {marcados.size} marcado(s) para reajuste ou cópia
                    </span>
                  </div>
                  <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr>
                        <th style={{ width: 34 }}></th><th>Item</th><th>Fornecedor</th><th>Operação</th>
                        <th>UM</th><th className="num">Preço</th><th className="num">Frete</th><th className="num">Imposto</th>
                        <th>Vigência</th><th>Pref.</th><th style={{ width: 150 }}>Ações</th>
                      </tr></thead>
                      <tbody>
                        {prices.length === 0 && <tr><td colSpan={11} className="erp-grid-empty">Nenhum preço cadastrado.</td></tr>}
                        {prices.map((p) => (
                          <tr key={p.id} style={editId === p.id ? { background: "var(--v-green-soft)" } : undefined}>
                            <td><input type="checkbox" checked={!!p.id && marcados.has(p.id)} onChange={() => marcar(p.id)}
                              aria-label={`Marcar preço ${p.id}`} /></td>
                            <td style={{ fontWeight: 600 }}>{p.item_description || p.item_code}</td>
                            <td>{p.supplier_name || p.supplier_code}</td>
                            <td>{p.operation_name || p.operation_id}</td>
                            <td>{p.uom}</td>
                            <td className="num">{brl(p.unit_price)}</td>
                            <td className="num">{p.freight_type === "PERCENT" ? `${num(p.freight_value ?? 0, 2)}%` : brl(p.freight_value ?? 0)}</td>
                            <td className="num">{num(p.tax_percent ?? 0, 2)}%</td>
                            <td>{dia(p.reference_date)}</td>
                            <td>{p.preferred ? <span className="erp-badge ok">Sim</span> : ""}</td>
                            <td>
                              <button className="erp-btn erp-btn-sm" onClick={() => editarPreco(p)}>Editar</button>{" "}
                              <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => p.id && pedirRemocaoPreco(p)}>Desativar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div></div>
                </div>

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Ações em lote — <span style={{ fontWeight: 400, opacity: .65 }}>
                      valem sobre os {marcados.size} preço(s) marcados acima
                    </span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12"><div className="fsc-rot-sec">Reajustar</div></div>
                    <div className="erp-field erp-c2"><label htmlFor="tps-reaj" className="erp-label">Percentual</label>
                      <input id="tps-reaj" className="erp-input num" type="number" step="0.01" value={reajuste.percent}
                        placeholder="5 ou -3" onChange={(e) => setReajuste((r) => ({ ...r, percent: e.target.value }))} /></div>
                    <div className="erp-field erp-c6"><label htmlFor="tps-motivo" className="erp-label">Motivo</label>
                      <input id="tps-motivo" className="erp-input" value={reajuste.reason} placeholder="Negociação anual, reajuste de insumo…"
                        onChange={(e) => setReajuste((r) => ({ ...r, reason: e.target.value }))} />
                      <span className="erp-field-hint">Fica no histórico junto com o valor anterior.</span></div>
                    <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void aplicarReajuste()}
                        disabled={busy || marcados.size === 0}>Reajustar</button></div>

                    <div className="erp-field erp-c12"><div className="fsc-rot-sec">Copiar ou mover para outro terceirizado</div></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Fornecedor de destino</label>
                      <LookupField value={destino.supplier_code || undefined} loader={loadSuppliers} entityLabel="fornecedor"
                        onChange={(c) => setDestino((d) => ({ ...d, supplier_code: Number(c ?? 0) }))} clearable /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Operação de destino</label>
                      <LookupField value={destino.operation_id || undefined} loader={loadOperations} entityLabel="operação"
                        onChange={(c) => setDestino((d) => ({ ...d, operation_id: Number(c ?? 0) }))} clearable /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Mover em vez de copiar</label>
                      <div className="erp-toggle-row">
                        <label className="erp-toggle">
                          <input type="checkbox" checked={destino.move} onChange={(e) => setDestino((d) => ({ ...d, move: e.target.checked }))} />
                          <div className="erp-toggle-track" /><div className="erp-toggle-thumb" />
                        </label>
                        <span className="erp-toggle-label">{destino.move ? "O preço original sai" : "O original fica"}</span>
                      </div></div>
                    <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn" style={{ width: "100%" }} onClick={() => void aplicarCopia()}
                        disabled={busy || marcados.size === 0}>{destino.move ? "Mover" : "Copiar"}</button></div>
                  </div>
                </div>
              </>
            )}

            {/* ═══ ORDENS ═══ */}
            {aba === "ordens" && (
              <>
                <div className="fsc-rot-cascata">
                  <span>Em poder de terceiros: <strong>{num(emPoderDeTerceiros, 2)}</strong> peças</span>
                  <span>Ordens: <strong>{orders.length}</strong></span>
                  {atrasadas > 0 && <span style={{ color: "var(--v-warn)" }}>Vencidas: <strong>{atrasadas}</strong></span>}
                  <span style={{ flex: 1 }} />
                  <span className="erp-field-hint">As ordens nascem das operações externas do roteiro quando a OF é criada.</span>
                </div>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Ordens de serviço</div>
                  <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr>
                        <th style={{ width: 70 }}>Ordem</th><th>Item</th><th>Operação</th><th>Fornecedor</th>
                        <th className="num">Enviado</th><th className="num">Voltou</th><th className="num">Está lá</th>
                        <th>Prometido</th><th>Situação</th><th style={{ width: 200 }}>Ações</th>
                      </tr></thead>
                      <tbody>
                        {orders.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhuma ordem de serviço.</td></tr>}
                        {orders.map((o) => (
                          <tr key={o.id} className={atrasada(o) ? "fsc-rot-terceiro" : undefined}>
                            <td style={{ fontWeight: 600 }}>{o.code}</td>
                            <td>{o.item_description || o.item_code}</td>
                            <td>{o.operation_name}</td>
                            <td>{o.supplier_name || o.supplier_code || "—"}</td>
                            <td className="num">{num(o.quantity, 2)}</td>
                            <td className="num">{num(o.fulfilled_quantity, 2)}</td>
                            <td className="num"><strong>{num(o.pending_quantity, 2)}</strong></td>
                            <td>{dia(o.due_date)}{atrasada(o) && <span className="fsc-rot-flag" style={{ marginLeft: 6 }}>VENCIDA</span>}</td>
                            <td><span className="erp-badge info">{enumLabel(o.status)}</span></td>
                            <td>
                              <button className="erp-btn erp-btn-sm" onClick={() => abrirMovimentos(o)}>Remessa/retorno</button>{" "}
                              <select className="erp-input" style={{ width: 120, display: "inline-block" }} value={o.status}
                                onChange={(e) => void mudarStatus(o, e.target.value)} aria-label={`Situação da ordem ${o.code}`}>
                                {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div></div>
                </div>
              </>
            )}

            {/* ═══ MOVIMENTOS ═══ */}
            {aba === "movimentos" && (
              !ordemSel ? (
                <div className="erp-fieldset"><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <span className="erp-field-hint">
                    Escolha uma ordem na aba “Ordens de serviço” (botão Remessa/retorno) para lançar o que saiu e o que voltou.
                  </span>
                </div></div></div>
              ) : (
                <>
                  <div className="fsc-rot-cascata">
                    <span>Ordem <strong>{ordemSel.code}</strong> · {ordemSel.item_description || ordemSel.item_code}</span>
                    <span>{ordemSel.supplier_name}</span>
                    <span style={{ flex: 1 }} />
                    <span>no terceiro agora: <strong>{num(saldoNoTerceiro, 2)} {ordemSel.uom}</strong></span>
                    <button className="erp-btn erp-btn-sm" onClick={() => setAba("ordens")}>Voltar às ordens</button>
                  </div>

                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      Lançar movimento — <span style={{ fontWeight: 400, opacity: .65 }}>
                        remessa tira da fábrica; retorno traz de volta
                      </span>
                    </div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c3"><label htmlFor="tps-mov-tipo" className="erp-label">Tipo</label>
                        <select id="tps-mov-tipo" className="erp-input" value={movForm.movement_type}
                          onChange={(e) => setMovForm((m) => ({ ...m, movement_type: e.target.value }))}>
                          {MOVEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select></div>
                      <div className="erp-field erp-c2"><label htmlFor="tps-mov-qtd" className="erp-label erp-req">Quantidade</label>
                        <input id="tps-mov-qtd" className="erp-input num" type="number" min="0" step="0.0001" value={movForm.quantity}
                          onChange={(e) => setMovForm((m) => ({ ...m, quantity: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label htmlFor="tps-mov-doc" className="erp-label">Documento</label>
                        <input id="tps-mov-doc" className="erp-input" value={movForm.reference_code} placeholder="NF de remessa"
                          onChange={(e) => setMovForm((m) => ({ ...m, reference_code: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label htmlFor="tps-mov-lote" className="erp-label">Lote</label>
                        <input id="tps-mov-lote" className="erp-input" value={movForm.lot}
                          onChange={(e) => setMovForm((m) => ({ ...m, lot: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label htmlFor="tps-mov-obs" className="erp-label">Observação</label>
                        <input id="tps-mov-obs" className="erp-input" value={movForm.notes}
                          onChange={(e) => setMovForm((m) => ({ ...m, notes: e.target.value }))} /></div>
                      <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}>
                        <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void lancarMovimento()} disabled={busy}>+</button></div>
                      <div className="erp-field erp-c12"><span className="erp-field-hint">
                        Cada lançamento carrega uma chave própria: clicar duas vezes não registra a mesma remessa duas vezes.
                      </span></div>
                    </div>
                  </div>

                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Movimentos desta ordem — <span style={{ fontWeight: 400, opacity: .65 }}>{movs.length}</span></div>
                    <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead><tr><th>Quando</th><th>Tipo</th><th className="num">Quantidade</th><th>Documento</th><th>Lote</th><th>Observação</th></tr></thead>
                        <tbody>
                          {movs.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nada remetido ainda.</td></tr>}
                          {movs.map((m) => {
                            const tipo = MOVEMENT_TYPES.find((t) => t.value === m.movement_type);
                            return (
                              <tr key={m.id}>
                                <td>{dia(m.occurred_at)}</td>
                                <td>{tipo?.label ?? enumLabel(m.movement_type)}</td>
                                <td className="num">{tipo?.entrada ? "+" : "−"}{num(m.quantity, 2)}</td>
                                <td>{m.reference_code || "—"}</td>
                                <td>{m.lot || "—"}</td>
                                <td>{m.notes || "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div></div>
                  </div>
                </>
              )
            )}

            {/* ═══ CONVERSÕES ═══ */}
            {aba === "conversoes" && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">
                  Conversões de unidade — <span style={{ fontWeight: 400, opacity: .65 }}>
                    valem para qualquer item; a conversão por item, quando existe, tem prioridade
                  </span>
                </div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label htmlFor="tps-conv-de" className="erp-label erp-req">De</label>
                    <input id="tps-conv-de" className="erp-input" value={convForm.from_uom} placeholder="KG"
                      onChange={(e) => setConvForm((c) => ({ ...c, from_uom: e.target.value.toUpperCase() }))} /></div>
                  <div className="erp-field erp-c2"><label htmlFor="tps-conv-para" className="erp-label erp-req">Para</label>
                    <input id="tps-conv-para" className="erp-input" value={convForm.to_uom} placeholder="TONELADA"
                      onChange={(e) => setConvForm((c) => ({ ...c, to_uom: e.target.value.toUpperCase() }))} /></div>
                  <div className="erp-field erp-c3"><label htmlFor="tps-conv-fator" className="erp-label">Fator</label>
                    <input id="tps-conv-fator" className="erp-input num" type="number" step="0.00000001" value={convForm.factor}
                      onChange={(e) => setConvForm((c) => ({ ...c, factor: e.target.value }))} />
                    <span className="erp-field-hint">1 «De» equivale a este tanto de «Para».</span></div>
                  <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                    <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void salvarConversao()} disabled={busy}>Gravar</button></div>
                  <div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th>De</th><th>Para</th><th className="num">Fator</th><th style={{ width: 90 }}>Ações</th></tr></thead>
                      <tbody>
                        {conversoes.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma conversão global.</td></tr>}
                        {conversoes.map((c) => (
                          <tr key={c.id}>
                            <td>{enumLabel(c.from_uom)}</td><td>{enumLabel(c.to_uom)}</td>
                            <td className="num">{num(c.factor, 8)}</td>
                            <td><button className="erp-btn erp-btn-danger erp-btn-sm"
                              onClick={() => c.id && void run(async () => { await deleteGlobalConversion(c.id!); setConversoes(await listGlobalConversions()); })}>
                              Remover</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        aberto={confirmacao !== null}
        titulo={confirmacao?.titulo ?? ""}
        mensagem={confirmacao?.mensagem ?? ""}
        assunto={confirmacao?.assunto}
        rotuloConfirmar={confirmacao?.rotulo ?? "Confirmar"}
        onCancelar={() => setConfirmacao(null)}
        onConfirmar={() => { const p = confirmacao; setConfirmacao(null); if (p) void run(p.acao); }}
      />

      <footer className="erp-statusbar">
        <div className="erp-status-item">Preços: <strong>{prices.length}</strong></div>
        <div className="erp-status-item">Ordens: <strong>{orders.length}</strong></div>
        {emPoderDeTerceiros > 0 && <div className="erp-status-item">Em poder de terceiros: <strong>{num(emPoderDeTerceiros, 2)}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
