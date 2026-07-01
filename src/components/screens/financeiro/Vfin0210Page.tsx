import { useState, useCallback, useEffect } from "react";
import {
  type ContaReceber, type ContaReceberDTO, type Aging, type ContaBancaria, type BaixaRecebimentoDTO,
  listContasReceber, createContaReceber, baixarContaReceber, cancelContaReceber, agingReceber, listContasBancarias,
} from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_FILTERS = ["", "pendente", "pago", "parcial", "cancelado"];
const EMPTY: ContaReceberDTO = {
  numero_documento: "", data_emissao: today(), data_vencimento: today(),
  valor_bruto: 0, desconto: 0, parcela_numero: 1, parcela_total: 1, forma_pagamento: "boleto", observacao: "",
};

function statusPill(s: string): JSX.Element {
  const x = s.toLowerCase();
  const cls = x.includes("pago") || x.includes("recebid") ? "fsc-pill-green" : x.includes("parcial") ? "fsc-pill-blue"
    : x.includes("cancel") ? "fsc-pill-red" : "fsc-pill-amber";
  return <span className={`fsc-pill ${cls}`}>{s || "—"}</span>;
}

export function Vfin0210Page(): JSX.Element {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [form, setForm] = useState<ContaReceberDTO>(EMPTY);
  const [list, setList] = useState<ContaReceber[]>([]);
  const [aging, setAging] = useState<Aging | null>(null);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [baixa, setBaixa] = useState<{ alvo: ContaReceber; dto: BaixaRecebimentoDTO } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (status?: string) => {
    setBusy(true);
    try {
      const filters = status ? { status } : undefined;
      const [items, ag, cbs] = await Promise.all([
        listContasReceber(filters),
        agingReceber().catch(() => null),
        listContasBancarias().catch(() => [] as ContaBancaria[]),
      ]);
      setList(items); if (ag) setAging(ag); setContas(cbs);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar contas a receber.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof ContaReceberDTO>(k: K, v: ContaReceberDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  async function salvar() {
    if (!form.numero_documento.trim() || !form.valor_bruto) { setFeedback({ type: "error", message: "Documento e Valor bruto são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createContaReceber(form);
      setFeedback({ type: "success", message: `Conta a receber "${form.numero_documento}" criada.` });
      setMode("list"); await reload(statusFilter);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  function abrirBaixa(c: ContaReceber) {
    const saldo = c.valor_bruto - (c.valor_recebido ?? 0);
    setBaixa({ alvo: c, dto: { conta_bancaria_id: contas[0]?.id ?? 0, valor_recebido: Number(saldo.toFixed(2)), data_recebimento: today(), observacao: "" } });
    setFeedback(null);
  }
  const setBaixaF = <K extends keyof BaixaRecebimentoDTO>(k: K, v: BaixaRecebimentoDTO[K]) => setBaixa((p) => (p ? { ...p, dto: { ...p.dto, [k]: v } } : p));

  async function confirmarBaixa() {
    if (!baixa) return;
    if (!baixa.dto.conta_bancaria_id) { setFeedback({ type: "error", message: "Selecione a conta bancária." }); return; }
    if (!baixa.dto.valor_recebido) { setFeedback({ type: "error", message: "Informe o valor recebido." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await baixarContaReceber(baixa.alvo.id, baixa.dto);
      setFeedback({ type: "success", message: `Recebimento da conta ${baixa.alvo.numero_documento} registrado.` });
      setBaixa(null); await reload(statusFilter);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function cancelar(c: ContaReceber) {
    if (!window.confirm(`Cancelar a conta a receber ${c.numero_documento}?`)) return;
    setBusy(true); setFeedback(null);
    try { await cancelContaReceber(c.id); setFeedback({ type: "success", message: `Conta ${c.numero_documento} cancelada.` }); await reload(statusFilter); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar">
        <div className="fsc-topbar-left">
          <div className="fsc-logo">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
              <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>
          <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
          <span className="fsc-screen-title">VFIN0210 — Contas a Receber</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={() => { setForm(EMPTY); setMode("create"); setFeedback(null); }} disabled={busy}>+ Nova Conta</button>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => { setMode("list"); void reload(statusFilter); }} disabled={busy}>Listagem</button>
        </div>
        {mode === "list" && (
          <div className="fsc-action-group">
            <span className="fsc-action-label">Filtro</span>
            <select className="fsc-select" style={{ width: 150, height: 32 }} value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); void reload(e.target.value); }}>
              {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s ? s : "Todos"}</option>)}
            </select>
            <ExportButton title="VFIN0210 — Contas a Receber" filename="contas-receber" disabled={busy}
              meta={{ filtro: statusFilter ? `Status: ${statusFilter}` : "Todos" }} />
          </div>
        )}
        {mode === "create" && (
          <div className="fsc-action-group">
            <span className="fsc-action-label">Ações</span>
            <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
          </div>
        )}
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode === "list" ? (
          <>
            {aging && (
              <div className="fsc-metrics">
                <div className="fsc-metric"><div className="fsc-metric-label">A Vencer</div><div className="fsc-metric-value">{money(aging.a_vencer)}</div></div>
                <div className="fsc-metric"><div className="fsc-metric-label">Venc. até 30d</div><div className="fsc-metric-value">{money(aging.vencido_ate_30)}</div></div>
                <div className="fsc-metric"><div className="fsc-metric-label">Venc. 31-60</div><div className="fsc-metric-value">{money(aging.vencido_31_60)}</div></div>
                <div className="fsc-metric"><div className="fsc-metric-label">Venc. 61-90</div><div className="fsc-metric-value">{money(aging.vencido_61_90)}</div></div>
                <div className="fsc-metric"><div className="fsc-metric-label">Venc. +90</div><div className="fsc-metric-value">{money(aging.vencido_acima_90)}</div></div>
                <div className="fsc-metric"><div className="fsc-metric-label">Total</div><div className="fsc-metric-value">{money(aging.total)}</div></div>
              </div>
            )}
            {baixa && (
              <div className="fsc-card" style={{ marginBottom: 12 }}>
                <div className="fsc-card-header">
                  <div className="fsc-card-header-left"><span className="fsc-card-title">Baixar título {baixa.alvo.numero_documento}</span></div>
                  <button className="fsc-btn fsc-btn-ghost" onClick={() => setBaixa(null)}>Cancelar</button>
                </div>
                <div className="fsc-card-body">
                  <div className="fsc-grid">
                    <div className="fsc-field fsc-col-4"><label className="fsc-label fsc-label-req">Conta Bancária</label>
                      <select className="fsc-select" value={baixa.dto.conta_bancaria_id} onChange={(e) => setBaixaF("conta_bancaria_id", Number(e.target.value))}>
                        <option value={0}>— selecione —</option>
                        {contas.map((cb) => <option key={cb.id} value={cb.id}>{cb.descricao || `${cb.banco} ${cb.conta}`}</option>)}
                      </select></div>
                    <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Valor Recebido</label>
                      <input className="fsc-input fsc-input-right" type="number" step="0.01" value={baixa.dto.valor_recebido} onChange={(e) => setBaixaF("valor_recebido", Number(e.target.value))} />
                      <span className="fsc-field-hint">Saldo: R$ {money(baixa.alvo.valor_bruto - (baixa.alvo.valor_recebido ?? 0))} • menor = recebimento parcial</span></div>
                    <div className="fsc-field fsc-col-3"><label className="fsc-label">Data Recebimento</label>
                      <input className="fsc-input" type="date" value={baixa.dto.data_recebimento} onChange={(e) => setBaixaF("data_recebimento", e.target.value)} /></div>
                    <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}>
                      <button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void confirmarBaixa()} disabled={busy}>{busy ? "..." : "Confirmar"}</button></div>
                    <div className="fsc-field fsc-col-12"><label className="fsc-label">Observação</label>
                      <input className="fsc-input" value={baixa.dto.observacao ?? ""} onChange={(e) => setBaixaF("observacao", e.target.value)} /></div>
                  </div>
                </div>
              </div>
            )}
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Títulos</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th>Documento</th><th>Vencimento</th><th className="fsc-num">Valor</th><th className="fsc-num">Recebido</th><th>Status</th><th style={{ width: 150 }}>Ações</th></tr></thead>
                <tbody>
                  {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhum título.</td></tr>}
                  {list.map((c) => {
                    const open = !["pago", "recebido", "cancelado"].includes(c.status.toLowerCase());
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.numero_documento}</td>
                        <td>{c.data_vencimento?.slice(0, 10)}</td>
                        <td className="fsc-num">{money(c.valor_bruto)}</td>
                        <td className="fsc-num">{money(c.valor_recebido)}</td>
                        <td>{statusPill(c.status)}</td>
                        <td>
                          {open && <button className="fsc-action-btn fsc-edit-btn" onClick={() => abrirBaixa(c)}>Baixar</button>}
                          {open && <button className="fsc-action-btn fsc-delete-btn" onClick={() => void cancelar(c)}>Cancelar</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div></div>
          </>
        ) : (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Dados do título</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Nº Documento</label>
                  <input className="fsc-input" value={form.numero_documento} placeholder="NF-1001" onChange={(e) => setF("numero_documento", e.target.value)} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Cliente (ID)</label>
                  <input className="fsc-input fsc-input-right" type="number" value={form.cliente_id ?? ""} onChange={(e) => setF("cliente_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">NF Saída (ID)</label>
                  <input className="fsc-input fsc-input-right" type="number" value={form.fiscal_exit_id ?? ""} onChange={(e) => setF("fiscal_exit_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Forma Pagamento</label>
                  <input className="fsc-input" value={form.forma_pagamento ?? ""} onChange={(e) => setF("forma_pagamento", e.target.value)} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Valor Bruto</label>
                  <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.valor_bruto} onChange={(e) => setF("valor_bruto", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Emissão</label>
                  <input className="fsc-input" type="date" value={form.data_emissao} onChange={(e) => setF("data_emissao", e.target.value)} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Vencimento</label>
                  <input className="fsc-input" type="date" value={form.data_vencimento} onChange={(e) => setF("data_vencimento", e.target.value)} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Desconto</label>
                  <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.desconto ?? 0} onChange={(e) => setF("desconto", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-1"><label className="fsc-label">Parc. nº</label>
                  <input className="fsc-input fsc-input-right" type="number" value={form.parcela_numero ?? 1} onChange={(e) => setF("parcela_numero", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-1"><label className="fsc-label">Parc. tot.</label>
                  <input className="fsc-input fsc-input-right" type="number" value={form.parcela_total ?? 1} onChange={(e) => setF("parcela_total", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-12"><label className="fsc-label">Observação</label>
                  <input className="fsc-input" value={form.observacao ?? ""} onChange={(e) => setF("observacao", e.target.value)} /></div>
              </div>
            </div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left">
          <div className="fsc-footer-stat">Títulos: <strong>{list.length}</strong></div>
          {aging && <div className="fsc-footer-stat">Total: <strong>{money(aging.total)}</strong></div>}
        </div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
