import { useState, useCallback, useEffect } from "react";
import {
  type ContaPagar, type ContaPagarDTO, type Aging, type ContaBancaria, type BaixaPagamentoDTO,
  listContasPagar, createContaPagar, baixarContaPagar, cancelContaPagar, agingPagar, approveContaPagar, listContasBancarias,
} from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_FILTERS = ["", "pendente", "aprovado", "pago", "cancelado"];
const EMPTY: ContaPagarDTO = {
  numero_documento: "", tipo_documento: "NF-e", data_emissao: today(), data_vencimento: today(),
  valor_bruto: 0, desconto: 0, parcela_numero: 1, parcela_total: 1, forma_pagamento: "transferencia", observacao: "",
};

function statusPill(s: string): JSX.Element {
  const x = s.toLowerCase();
  const cls = x.includes("pago") ? "erp-badge-green" : x.includes("parcial") ? "erp-badge-blue"
    : x.includes("aprovad") ? "erp-badge-blue" : x.includes("cancel") ? "erp-badge-red" : "erp-badge-amber";
  return <span className={`erp-badge ${cls}`}>{s || "—"}</span>;
}

export function Vfin0200Page(): JSX.Element {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [form, setForm] = useState<ContaPagarDTO>(EMPTY);
  const [list, setList] = useState<ContaPagar[]>([]);
  const [aging, setAging] = useState<Aging | null>(null);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [baixa, setBaixa] = useState<{ alvo: ContaPagar; dto: BaixaPagamentoDTO } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (status?: string) => {
    setBusy(true);
    try {
      const filters = status ? { status } : undefined;
      const [items, ag, cbs] = await Promise.all([
        listContasPagar(filters),
        agingPagar().catch(() => null),
        listContasBancarias().catch(() => [] as ContaBancaria[]),
      ]);
      setList(items); if (ag) setAging(ag); setContas(cbs);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar contas a pagar.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof ContaPagarDTO>(k: K, v: ContaPagarDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  async function salvar() {
    if (!form.numero_documento.trim() || !form.valor_bruto) { setFeedback({ type: "error", message: "Documento e Valor bruto são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createContaPagar(form);
      setFeedback({ type: "success", message: `Conta a pagar "${form.numero_documento}" criada.` });
      setMode("list"); await reload(statusFilter);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  function abrirBaixa(c: ContaPagar) {
    const saldo = c.valor_bruto - (c.valor_pago ?? 0);
    setBaixa({ alvo: c, dto: { conta_bancaria_id: contas[0]?.id ?? 0, valor_pago: Number(saldo.toFixed(2)), data_pagamento: today(), observacao: "" } });
    setFeedback(null);
  }
  const setBaixaF = <K extends keyof BaixaPagamentoDTO>(k: K, v: BaixaPagamentoDTO[K]) => setBaixa((p) => (p ? { ...p, dto: { ...p.dto, [k]: v } } : p));

  async function confirmarBaixa() {
    if (!baixa) return;
    if (!baixa.dto.conta_bancaria_id) { setFeedback({ type: "error", message: "Selecione a conta bancária." }); return; }
    if (!baixa.dto.valor_pago) { setFeedback({ type: "error", message: "Informe o valor pago." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await baixarContaPagar(baixa.alvo.id, baixa.dto);
      setFeedback({ type: "success", message: `Pagamento da conta ${baixa.alvo.numero_documento} registrado.` });
      setBaixa(null); await reload(statusFilter);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function aprovar(c: ContaPagar) {
    setBusy(true); setFeedback(null);
    try { await approveContaPagar(c.id, null); setFeedback({ type: "success", message: `Conta ${c.numero_documento} aprovada.` }); await reload(statusFilter); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function rejeitar(c: ContaPagar) {
    const motivo = window.prompt(`Motivo da rejeição da conta ${c.numero_documento}:`);
    if (motivo === null) return;
    if (!motivo.trim()) { setFeedback({ type: "error", message: "Informe o motivo da rejeição." }); return; }
    setBusy(true); setFeedback(null);
    try { await approveContaPagar(c.id, motivo.trim()); setFeedback({ type: "success", message: `Conta ${c.numero_documento} rejeitada.` }); await reload(statusFilter); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function cancelar(c: ContaPagar) {
    if (!window.confirm(`Cancelar a conta a pagar ${c.numero_documento}?`)) return;
    setBusy(true); setFeedback(null);
    try { await cancelContaPagar(c.id); setFeedback({ type: "success", message: `Conta ${c.numero_documento} cancelada.` }); await reload(statusFilter); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Contas a Pagar</span><span className="erp-crumb-code">VFIN0200</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={() => { setForm(EMPTY); setMode("create"); setFeedback(null); }} disabled={busy}>+ Nova Conta</button>
          <button className="erp-btn" onClick={() => { setMode("list"); void reload(statusFilter); }} disabled={busy}>Listagem</button>
        </div>
        {mode === "list" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Filtro</span>
            <select className="erp-input" style={{ width: 150, height: 32 }} value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); void reload(e.target.value); }}>
              {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s ? s : "Todos"}</option>)}
            </select>
            <ExportButton title="VFIN0200 — Contas a Pagar" filename="contas-pagar" disabled={busy}
              meta={{ filtro: statusFilter ? `Status: ${statusFilter}` : "Todos" }} />
          </div>
        )}
        {mode === "create" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
          </div>
        )}
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Contas a Pagar</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode === "list" ? (
          <>
            {aging && (
              <div className="erp-metrics">
                <div className="erp-metric"><div className="erp-metric-label">A Vencer</div><div className="erp-metric-value">{money(aging.a_vencer)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">Venc. até 30d</div><div className="erp-metric-value">{money(aging.vencido_ate_30)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">Venc. 31-60</div><div className="erp-metric-value">{money(aging.vencido_31_60)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">Venc. 61-90</div><div className="erp-metric-value">{money(aging.vencido_61_90)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">Venc. +90</div><div className="erp-metric-value">{money(aging.vencido_acima_90)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">Total</div><div className="erp-metric-value">{money(aging.total)}</div></div>
              </div>
            )}
            {baixa && (
              <div className="erp-fieldset" style={{ marginBottom: 12 }}>
                <div className="erp-card-header">
                  <div className="erp-card-header-left"><span className="erp-card-title">Baixar título {baixa.alvo.numero_documento}</span></div>
                  <button className="erp-btn" onClick={() => setBaixa(null)}>Cancelar</button>
                </div>
                <div className="erp-fieldset-body">
                  
                    <div className="erp-field erp-c4"><label className="erp-label erp-req">Conta Bancária</label>
                      <select className="erp-input" value={baixa.dto.conta_bancaria_id} onChange={(e) => setBaixaF("conta_bancaria_id", Number(e.target.value))}>
                        <option value={0}>— selecione —</option>
                        {contas.map((cb) => <option key={cb.id} value={cb.id}>{cb.descricao || `${cb.banco} ${cb.conta}`}</option>)}
                      </select></div>
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Valor Pago</label>
                      <input className="erp-input num" type="number" step="0.01" value={baixa.dto.valor_pago} onChange={(e) => setBaixaF("valor_pago", Number(e.target.value))} />
                      <span className="erp-field-hint">Saldo: R$ {money(baixa.alvo.valor_bruto - (baixa.alvo.valor_pago ?? 0))} • menor = baixa parcial</span></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Data Pagamento</label>
                      <input className="erp-input" type="date" value={baixa.dto.data_pagamento} onChange={(e) => setBaixaF("data_pagamento", e.target.value)} /></div>
                    <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void confirmarBaixa()} disabled={busy}>{busy ? "..." : "Confirmar"}</button></div>
                    <div className="erp-field erp-c12"><label className="erp-label">Observação</label>
                      <input className="erp-input" value={baixa.dto.observacao ?? ""} onChange={(e) => setBaixaF("observacao", e.target.value)} /></div>
                  
                </div>
              </div>
            )}
            <div className="erp-fieldset"><div className="erp-fieldset-head">Títulos — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Documento</th><th>Vencimento</th><th>Valor</th><th>Pago</th><th>Status</th><th style={{ width: 150 }}>Ações</th></tr></thead>
                <tbody>
                  {list.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum título.</td></tr>}
                  {list.map((c) => {
                    const s = c.status.toLowerCase();
                    const open = !["pago", "cancelado"].includes(s);
                    const isPend = s.includes("pendente");
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.numero_documento}</td>
                        <td>{c.data_vencimento?.slice(0, 10)}</td>
                        <td>{money(c.valor_bruto)}</td>
                        <td>{money(c.valor_pago)}</td>
                        <td>{statusPill(c.status)}</td>
                        <td>
                          {isPend && <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void aprovar(c)}>Aprovar</button>}
                          {isPend && <button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => void rejeitar(c)}>Rejeitar</button>}
                          {open && !isPend && <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => abrirBaixa(c)}>Baixar</button>}
                          {open && <button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => void cancelar(c)}>Cancelar</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div></div></div>
          </>
        ) : (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Dados do título</div><div className="erp-fieldset-body">
              
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Nº Documento</label>
                  <input className="erp-input" value={form.numero_documento} placeholder="NF-5500" onChange={(e) => setF("numero_documento", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Tipo Doc.</label>
                  <input className="erp-input" value={form.tipo_documento ?? ""} onChange={(e) => setF("tipo_documento", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Fornecedor (ID)</label>
                  <input className="erp-input num" type="number" value={form.fornecedor_id ?? ""} onChange={(e) => setF("fornecedor_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">NF Entrada (ID)</label>
                  <input className="erp-input num" type="number" value={form.fiscal_entry_id ?? ""} onChange={(e) => setF("fiscal_entry_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Forma Pagamento</label>
                  <input className="erp-input" value={form.forma_pagamento ?? ""} onChange={(e) => setF("forma_pagamento", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Emissão</label>
                  <input className="erp-input" type="date" value={form.data_emissao} onChange={(e) => setF("data_emissao", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Vencimento</label>
                  <input className="erp-input" type="date" value={form.data_vencimento} onChange={(e) => setF("data_vencimento", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Valor Bruto</label>
                  <input className="erp-input num" type="number" step="0.01" value={form.valor_bruto} onChange={(e) => setF("valor_bruto", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Desconto</label>
                  <input className="erp-input num" type="number" step="0.01" value={form.desconto ?? 0} onChange={(e) => setF("desconto", Number(e.target.value))} /></div>
                <div className="erp-field erp-c1"><label className="erp-label">Parc. nº</label>
                  <input className="erp-input num" type="number" value={form.parcela_numero ?? 1} onChange={(e) => setF("parcela_numero", Number(e.target.value))} /></div>
                <div className="erp-field erp-c1"><label className="erp-label">Parc. tot.</label>
                  <input className="erp-input num" type="number" value={form.parcela_total ?? 1} onChange={(e) => setF("parcela_total", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Plano Contas (ID)</label>
                  <input className="erp-input num" type="number" value={form.plano_contas_id ?? ""} onChange={(e) => setF("plano_contas_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Centro Custo (ID)</label>
                  <input className="erp-input num" type="number" value={form.centro_custo_id ?? ""} onChange={(e) => setF("centro_custo_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
                <div className="erp-field erp-c12"><label className="erp-label">Observação</label>
                  <input className="erp-input" value={form.observacao ?? ""} onChange={(e) => setF("observacao", e.target.value)} /></div>
              
            </div></div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}>
          <div className="erp-status-item">Títulos: <strong>{list.length}</strong></div>
          {aging && <div className="erp-status-item">Total: <strong>{money(aging.total)}</strong></div>}
        </div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
