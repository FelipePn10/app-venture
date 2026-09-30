import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type ContaPagar, type ContaPagarDTO, type AgingBucket, type BaixaPagamentoDTO, type ListFilters,
  listContasPagar, createContaPagar, baixarContaPagar, cancelContaPagar, agingPagar, approveContaPagar, agingTotal,
  STATUS_TITULO_PAGAR, FORMAS_DE_PAGAMENTO, FORMA_PAGAMENTO_LABELS, TIPOS_DE_DOCUMENTO,
  diasDeAtraso, estaEmAberto, temFiltroAtivo,
} from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import {
  loadSuppliers, loadPurchaseOrders, loadBankAccounts, loadFiscalEntries,
  loadChartOfAccounts, loadFinancialCostCenters,
} from "@/services/lookups";
import { CarteiraFiltros } from "./CarteiraFiltros";

/**
 * VFIN0200 — Contas a Pagar.
 *
 * ── O que mudou ──
 * **Filtros.** Havia só o seletor de situação, e ele não funcionava (o backend lia
 * o filtro do corpo de uma rota GET e comparava minúsculas com coluna em
 * maiúsculas). Agora: fornecedor, situação, situação de aprovação, período por
 * emissão ou vencimento, documento, faixa de valor, conta do plano, centro de custo
 * e "só vencidos".
 *
 * **Fim dos campos de ID.** "NF Entrada (ID)", "Plano Contas (ID)" e "Centro Custo
 * (ID)" eram campos numéricos para digitar o identificador do registro no banco.
 * Ninguém sabe esses números, e qualquer valor era aceito — o título ficava
 * vinculado ao documento ou à conta errada sem nenhum aviso. Os três viraram busca.
 *
 * **Aprovação.** O botão aprovava sem pedir nada e rejeitava sem motivo; agora a
 * rejeição exige justificativa, que é o que o parecer fiscal e a auditoria pedem.
 */

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY: ContaPagarDTO = {
  numero_documento: "", tipo_documento: "NF-e", data_emissao: today(), data_vencimento: today(),
  valor_bruto: 0, desconto: 0, parcela_numero: 1, parcela_total: 1,
  forma_pagamento: "TRANSFERENCIA", observacao: "",
};

function rotuloDaSituacao(s: string): string {
  const achado = STATUS_TITULO_PAGAR.find((o) => o.valor === (s || "").toUpperCase());
  return achado ? achado.rotulo : (s || "—");
}

function statusPill(s: string): JSX.Element {
  const x = (s || "").toUpperCase();
  const cls = x.includes("PAGO") ? "erp-badge-green"
    : x.includes("PARCIAL") || x.includes("APROVAD") ? "erp-badge-blue"
    : x.includes("CANCEL") ? "erp-badge-red" : "erp-badge-amber";
  return <span className={`erp-badge ${cls}`}>{rotuloDaSituacao(s)}</span>;
}

/** Situação da aprovação, separada da situação do título: um título pode estar
 *  pendente de aprovação e já vencido, e são dois problemas diferentes. */
function aprovacaoPill(s?: string): JSX.Element {
  const x = (s || "").toUpperCase();
  if (!x) return <span className="erp-hint">—</span>;
  const cls = x.includes("APROVAD") ? "erp-badge-green" : x.includes("REJEIT") ? "erp-badge-red" : "erp-badge-amber";
  const rotulo = x.includes("APROVAD") ? "Aprovado" : x.includes("REJEIT") ? "Rejeitado" : "Aguardando aprovação";
  return <span className={`erp-badge ${cls}`}>{rotulo}</span>;
}

function celulaDeVencimento(c: ContaPagar): JSX.Element {
  const dias = diasDeAtraso(c.data_vencimento);
  const aberto = estaEmAberto(c.status);
  const atrasado = aberto && dias !== undefined && dias > 0;
  return (
    <td className={atrasado ? "erp-cell-danger" : ""}>
      {c.data_vencimento?.slice(0, 10) || "—"}
      {aberto && dias !== undefined && (
        <span className="erp-hint" style={{ display: "block" }}>
          {dias > 0 ? `${dias} dia(s) em atraso` : dias === 0 ? "vence hoje" : `em ${Math.abs(dias)} dia(s)`}
        </span>
      )}
    </td>
  );
}

export function Vfin0200Page(): JSX.Element {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [form, setForm] = useState<ContaPagarDTO>(EMPTY);
  const [list, setList] = useState<ContaPagar[]>([]);
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [filtros, setFiltros] = useState<ListFilters>({});
  const [baixa, setBaixa] = useState<{ alvo: ContaPagar; dto: BaixaPagamentoDTO } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (f?: ListFilters) => {
    setBusy(true);
    try {
      const [items, ag] = await Promise.all([
        listContasPagar(f ?? {}),
        agingPagar().catch(() => null),
      ]);
      setList(items); setAging(ag ?? []);
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao listar contas a pagar.") });
    } finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof ContaPagarDTO>(k: K, v: ContaPagarDTO[K]) => {
    setForm((p) => ({ ...p, [k]: v })); setFeedback(null);
  };

  const totais = useMemo(() => {
    const bruto = list.reduce((s, c) => s + c.valor_bruto, 0);
    const pago = list.reduce((s, c) => s + (c.valor_pago ?? 0), 0);
    const emAberto = list.filter((c) => estaEmAberto(c.status));
    const vencidos = emAberto.filter((c) => (diasDeAtraso(c.data_vencimento) ?? -1) > 0);
    const aguardando = list.filter((c) => (c.status_aprovacao ?? "").toUpperCase().includes("PENDENTE"));
    return {
      bruto, pago, saldo: bruto - pago,
      emAberto: emAberto.length, vencidos: vencidos.length,
      valorVencido: vencidos.reduce((s, c) => s + (c.valor_bruto - (c.valor_pago ?? 0)), 0),
      aguardando: aguardando.length,
    };
  }, [list]);

  async function salvar() {
    if (!form.numero_documento.trim()) { setFeedback({ type: "error", message: "Informe o número do documento." }); return; }
    if (!form.valor_bruto || form.valor_bruto <= 0) { setFeedback({ type: "error", message: "O valor bruto tem de ser maior que zero." }); return; }
    if (form.data_vencimento < form.data_emissao) { setFeedback({ type: "error", message: "O vencimento é anterior à emissão." }); return; }
    if ((form.desconto ?? 0) > form.valor_bruto) { setFeedback({ type: "error", message: "O desconto é maior que o valor bruto do título." }); return; }
    if ((form.parcela_numero ?? 1) > (form.parcela_total ?? 1)) {
      setFeedback({ type: "error", message: `Parcela ${form.parcela_numero} de ${form.parcela_total}: o número da parcela não pode passar do total.` });
      return;
    }
    setBusy(true); setFeedback(null);
    try {
      await createContaPagar(form);
      setFeedback({ type: "success", message: `Título ${form.numero_documento} criado. Aguardando aprovação para pagamento.` });
      setMode("list"); await reload(filtros);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  function abrirBaixa(c: ContaPagar) {
    const saldo = c.valor_bruto - (c.valor_pago ?? 0);
    setBaixa({
      alvo: c,
      // Conta bancária sem valor inicial de propósito: antes assumia a primeira da
      // lista, e confirmar sem olhar debitava da conta errada.
      dto: { conta_bancaria_id: 0, valor_pago: Number(saldo.toFixed(2)), data_pagamento: today(), observacao: "" },
    });
    setFeedback(null);
  }
  const setBaixaF = <K extends keyof BaixaPagamentoDTO>(k: K, v: BaixaPagamentoDTO[K]) =>
    setBaixa((p) => (p ? { ...p, dto: { ...p.dto, [k]: v } } : p));

  async function confirmarBaixa() {
    if (!baixa) return;
    if (!baixa.dto.conta_bancaria_id) { setFeedback({ type: "error", message: "Escolha a conta bancária de onde sai o pagamento." }); return; }
    if (!baixa.dto.valor_pago || baixa.dto.valor_pago <= 0) { setFeedback({ type: "error", message: "Informe o valor pago." }); return; }
    const saldo = baixa.alvo.valor_bruto - (baixa.alvo.valor_pago ?? 0);
    if (baixa.dto.valor_pago > saldo + 0.005) {
      setFeedback({ type: "error", message: `O valor pago (${money(baixa.dto.valor_pago)}) passa do saldo do título (${money(saldo)}).` });
      return;
    }
    setBusy(true); setFeedback(null);
    try {
      await baixarContaPagar(baixa.alvo.id, baixa.dto);
      const parcial = baixa.dto.valor_pago < saldo - 0.005;
      setFeedback({
        type: "success",
        message: parcial
          ? `Pagamento parcial do título ${baixa.alvo.numero_documento} registrado. Saldo restante: ${money(saldo - baixa.dto.valor_pago)}.`
          : `Título ${baixa.alvo.numero_documento} quitado.`,
      });
      setBaixa(null); await reload(filtros);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function aprovar(c: ContaPagar) {
    setBusy(true); setFeedback(null);
    try {
      await approveContaPagar(c.id, null);
      setFeedback({ type: "success", message: `Título ${c.numero_documento} aprovado para pagamento.` });
      await reload(filtros);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function rejeitar(c: ContaPagar) {
    // Rejeição sem motivo é decisão que ninguém consegue explicar depois — e é o
    // fornecedor que cobra a explicação.
    const motivo = window.prompt(`Por que o título ${c.numero_documento} está sendo rejeitado?\n\nO motivo fica registrado e é o que se responde ao fornecedor.`);
    if (motivo === null) return;
    if (!motivo.trim()) { setFeedback({ type: "error", message: "A rejeição exige motivo." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await approveContaPagar(c.id, motivo.trim());
      setFeedback({ type: "success", message: `Título ${c.numero_documento} rejeitado.` });
      await reload(filtros);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function cancelar(c: ContaPagar) {
    if (!window.confirm(`Cancelar o título ${c.numero_documento} de ${money(c.valor_bruto)}?\n\nO título sai da carteira e do fluxo projetado.`)) return;
    setBusy(true); setFeedback(null);
    try {
      await cancelContaPagar(c.id);
      setFeedback({ type: "success", message: `Título ${c.numero_documento} cancelado.` });
      await reload(filtros);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Contas a Pagar</span>
          <span className="erp-crumb-code">VFIN0200</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{mode === "list" ? "Carteira" : "Novo título"}</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" disabled={busy}
            onClick={() => { setForm(EMPTY); setMode("create"); setFeedback(null); }}>+ Novo título</button>
          <button className="erp-btn" disabled={busy}
            onClick={() => { setMode("list"); void reload(filtros); }}>Carteira</button>
        </div>
        <div className="erp-tspacer" />
        {mode === "list" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Relatório</span>
            <ExportButton title="VFIN0200 — Contas a Pagar" filename="contas-pagar" disabled={busy}
              subtitle={`${list.length} título(s)`}
              meta={{
                situacao: filtros.status ? rotuloDaSituacao(filtros.status) : "todas",
                periodo: filtros.start_date || filtros.end_date
                  ? `${filtros.date_field === "EMISSAO" ? "emissão" : "vencimento"} ${filtros.start_date ?? "…"} a ${filtros.end_date ?? "…"}`
                  : "sem período",
                somente_vencidos: filtros.somente_vencidos ? "sim" : "não",
              }} />
          </div>
        )}
        {mode === "create" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>
              {busy ? <><span className="erp-spin" />Salvando…</> : "Salvar título"}
            </button>
          </div>
        )}
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs" role="tablist" aria-label="Contas a pagar">
            <button role="tab" aria-selected={mode === "list"} className={`erp-tab${mode === "list" ? " active" : ""}`}
              onClick={() => { setMode("list"); void reload(filtros); }}>Carteira</button>
            <button role="tab" aria-selected={mode === "create"} className={`erp-tab${mode === "create" ? " active" : ""}`}
              onClick={() => { setForm(EMPTY); setMode("create"); setFeedback(null); }}>Novo título</button>
          </div>

          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {mode === "list" ? (
              <>
                {aging.length > 0 && (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Composição por idade (carteira inteira)</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c12">
                        <div className="erp-metrics">
                          {aging.map((b) => (
                            <div className="erp-metric" key={b.period}>
                              <div className="erp-metric-label">{b.period}</div>
                              <div className="erp-metric-value">{money(b.total)}</div>
                            </div>
                          ))}
                          <div className="erp-metric">
                            <div className="erp-metric-label">Total a pagar</div>
                            <div className="erp-metric-value">{money(agingTotal(aging))}</div>
                          </div>
                          {totais.aguardando > 0 && (
                            <div className="erp-metric">
                              <div className="erp-metric-label">Aguardando aprovação</div>
                              <div className="erp-metric-value erp-metric-danger">{totais.aguardando}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <CarteiraFiltros
                  filtros={filtros} onChange={setFiltros} onAplicar={() => void reload(filtros)}
                  busy={busy} situacoes={STATUS_TITULO_PAGAR}
                  parceiroLabel="Fornecedor" parceiroLoader={loadSuppliers} parceiroCampo="fornecedor_id"
                  planoContasLoader={loadChartOfAccounts} centroCustoLoader={loadFinancialCostCenters}
                  totalEncontrado={list.length} />

                {baixa && (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      Pagar o título {baixa.alvo.numero_documento}
                      <span style={{ fontWeight: 400, opacity: 0.65 }}>
                        {` — saldo ${money(baixa.alvo.valor_bruto - (baixa.alvo.valor_pago ?? 0))}`}
                      </span>
                    </div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4">
                        <label className="erp-label erp-req">Conta bancária de onde sai</label>
                        <LookupField value={baixa.dto.conta_bancaria_id || undefined} loader={loadBankAccounts}
                          entityLabel="conta bancária" placeholder="Escolher a conta" allowManualCode={false}
                          onChange={(c) => setBaixaF("conta_bancaria_id", c ? Number(c) : 0)} />
                        <span className="erp-hint">O débito sai do saldo desta conta e entra no fluxo de caixa.</span>
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label erp-req">Valor pago</label>
                        <input className="erp-input num" type="number" step="0.01" min="0" value={baixa.dto.valor_pago}
                          onChange={(e) => setBaixaF("valor_pago", Number(e.target.value))} />
                        <span className="erp-hint">Menor que o saldo registra pagamento parcial.</span>
                      </div>
                      <div className="erp-field erp-c2">
                        <label className="erp-label erp-req">Data do pagamento</label>
                        <input className="erp-input" type="date" value={baixa.dto.data_pagamento}
                          onChange={(e) => setBaixaF("data_pagamento", e.target.value)} />
                      </div>
                      <div className="erp-field erp-c3" style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                        <button className="erp-btn erp-btn-primary" onClick={() => void confirmarBaixa()} disabled={busy}>
                          {busy ? "…" : "Confirmar pagamento"}
                        </button>
                        <button className="erp-btn" onClick={() => setBaixa(null)} disabled={busy}>Desistir</button>
                      </div>
                      <div className="erp-field erp-c12">
                        <label className="erp-label">Observação</label>
                        <input className="erp-input" value={baixa.dto.observacao ?? ""}
                          placeholder="Nº do comprovante, autenticação bancária"
                          onChange={(e) => setBaixaF("observacao", e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Títulos
                    <span style={{ fontWeight: 400, opacity: 0.65 }}>
                      {` — ${list.length}${temFiltroAtivo(filtros) ? " com o filtro atual" : ""}`}
                      {totais.vencidos > 0 && ` · ${totais.vencidos} vencido(s) somando ${money(totais.valorVencido)}`}
                    </span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead>
                          <tr>
                            <th>Documento</th><th>Fornecedor</th><th>Emissão</th><th>Vencimento</th>
                            <th className="num">Valor</th><th className="num">Pago</th><th className="num">Saldo</th>
                            <th>Situação</th><th>Aprovação</th><th style={{ width: 210 }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.length === 0 && (
                            <tr><td colSpan={10} className="erp-grid-empty">
                              {temFiltroAtivo(filtros)
                                ? "Nenhum título corresponde ao filtro. Limpe o filtro para ver a carteira inteira."
                                : "Nenhum título a pagar."}
                            </td></tr>
                          )}
                          {list.map((c) => {
                            const saldo = c.valor_bruto - (c.valor_pago ?? 0);
                            const aberto = estaEmAberto(c.status);
                            const pendenteDeAprovacao = (c.status_aprovacao ?? "").toUpperCase().includes("PENDENTE");
                            return (
                              <tr key={c.id}>
                                <td style={{ fontWeight: 600 }}>
                                  {c.numero_documento}
                                  <span className="erp-hint" style={{ display: "block" }}>
                                    {c.tipo_documento || "—"}
                                    {c.parcela_total && c.parcela_total > 1 && ` · parcela ${c.parcela_numero}/${c.parcela_total}`}
                                  </span>
                                </td>
                                <td>{c.fornecedor_id ? <EntityName code={c.fornecedor_id} loader={loadSuppliers} /> : "—"}</td>
                                <td>{c.data_emissao?.slice(0, 10) || "—"}</td>
                                {celulaDeVencimento(c)}
                                <td className="num">{money(c.valor_bruto)}</td>
                                <td className="num">{money(c.valor_pago)}</td>
                                <td className="num">{aberto ? money(saldo) : "—"}</td>
                                <td>{statusPill(c.status)}</td>
                                <td>{aprovacaoPill(c.status_aprovacao)}</td>
                                <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {pendenteDeAprovacao && (
                                    <>
                                      <button className="erp-btn erp-btn-sm" onClick={() => void aprovar(c)} disabled={busy}>Aprovar</button>
                                      <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => void rejeitar(c)} disabled={busy}>Rejeitar</button>
                                    </>
                                  )}
                                  {aberto && !pendenteDeAprovacao && (
                                    <button className="erp-btn erp-btn-sm" onClick={() => abrirBaixa(c)} disabled={busy}>Pagar</button>
                                  )}
                                  {aberto && <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => void cancelar(c)} disabled={busy}>Cancelar</button>}
                                  {!aberto && <span className="erp-hint">{c.data_pagamento?.slice(0, 10) ?? "encerrado"}</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {list.length > 0 && (
                          <tfoot>
                            <tr>
                              <td colSpan={4}>{list.length} título(s) · {totais.emAberto} em aberto</td>
                              <td className="num">{money(totais.bruto)}</td>
                              <td className="num">{money(totais.pago)}</td>
                              <td className="num">{money(totais.saldo)}</td>
                              <td colSpan={3} />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Dados do título</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c3">
                    <label className="erp-label erp-req">Nº do documento</label>
                    <input className="erp-input" value={form.numero_documento} placeholder="NF-5521"
                      onChange={(e) => setF("numero_documento", e.target.value)} />
                  </div>
                  <div className="erp-field erp-c2">
                    <label className="erp-label">Tipo de documento</label>
                    <select className="erp-input" value={form.tipo_documento}
                      onChange={(e) => setF("tipo_documento", e.target.value)}>
                      {TIPOS_DE_DOCUMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label">Fornecedor</label>
                    <LookupField value={form.fornecedor_id} loader={loadSuppliers} entityLabel="fornecedor"
                      placeholder="Escolher fornecedor" clearable
                      onChange={(c) => setF("fornecedor_id", c ? Number(c) : undefined)} />
                  </div>
                  <div className="erp-field erp-c4">
                    {/* Era "NF Entrada (ID)": digitar o id interno da nota. */}
                    <label className="erp-label">Nota fiscal de entrada</label>
                    <LookupField value={form.fiscal_entry_id} loader={loadFiscalEntries}
                      entityLabel="nota fiscal de entrada" placeholder="Buscar por número da nota"
                      allowManualCode={false} clearable
                      onChange={(c) => setF("fiscal_entry_id", c ? Number(c) : undefined)} />
                    <span className="erp-hint">Busca pelo número, série e emitente.</span>
                  </div>

                  <div className="erp-field erp-c3">
                    <label className="erp-label">Pedido de compra</label>
                    <LookupField value={form.purchase_order_id} loader={loadPurchaseOrders}
                      entityLabel="pedido de compra" placeholder="Opcional" clearable
                      onChange={(c) => setF("purchase_order_id", c ? Number(c) : undefined)} />
                    <span className="erp-hint">Fecha o ciclo pedido → nota → pagamento.</span>
                  </div>
                  <div className="erp-field erp-c3">
                    {/* Era "Plano Contas (ID)". */}
                    <label className="erp-label">Conta do plano</label>
                    <LookupField value={form.plano_contas_id} loader={loadChartOfAccounts}
                      entityLabel="conta do plano" placeholder="Classificação contábil"
                      allowManualCode={false} clearable
                      onChange={(c) => setF("plano_contas_id", c ? Number(c) : undefined)} />
                  </div>
                  <div className="erp-field erp-c3">
                    {/* Era "Centro Custo (ID)". */}
                    <label className="erp-label">Centro de custo</label>
                    <LookupField value={form.centro_custo_id} loader={loadFinancialCostCenters}
                      entityLabel="centro de custo" placeholder="Onde a despesa é apropriada"
                      allowManualCode={false} clearable
                      onChange={(c) => setF("centro_custo_id", c ? Number(c) : undefined)} />
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label">Forma de pagamento</label>
                    <select className="erp-input" value={form.forma_pagamento}
                      onChange={(e) => setF("forma_pagamento", e.target.value)}>
                      {FORMAS_DE_PAGAMENTO.map((f) => (
                        <option key={f} value={f}>{FORMA_PAGAMENTO_LABELS[f]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="erp-field erp-c2">
                    <label className="erp-label">Emissão</label>
                    <input className="erp-input" type="date" value={form.data_emissao}
                      onChange={(e) => setF("data_emissao", e.target.value)} />
                  </div>
                  <div className="erp-field erp-c2">
                    <label className="erp-label erp-req">Vencimento</label>
                    <input className={`erp-input${form.data_vencimento < form.data_emissao ? " erp-input-invalid" : ""}`}
                      type="date" value={form.data_vencimento}
                      onChange={(e) => setF("data_vencimento", e.target.value)} />
                  </div>
                  <div className="erp-field erp-c2">
                    <label className="erp-label erp-req">Valor bruto</label>
                    <input className="erp-input num" type="number" step="0.01" min="0" value={form.valor_bruto || ""}
                      onChange={(e) => setF("valor_bruto", Number(e.target.value))} />
                  </div>
                  <div className="erp-field erp-c2">
                    <label className="erp-label">Desconto</label>
                    <input className="erp-input num" type="number" step="0.01" min="0" value={form.desconto || ""}
                      onChange={(e) => setF("desconto", Number(e.target.value))} />
                  </div>
                  <div className="erp-field erp-c2">
                    <label className="erp-label">Valor líquido</label>
                    <input className="erp-input num" readOnly
                      value={money(Math.max(0, form.valor_bruto - (form.desconto ?? 0)))} />
                  </div>
                  <div className="erp-field erp-c1">
                    <label className="erp-label">Parcela</label>
                    <input className="erp-input num" type="number" min="1" value={form.parcela_numero || 1}
                      onChange={(e) => setF("parcela_numero", Number(e.target.value))} />
                  </div>
                  <div className="erp-field erp-c1">
                    <label className="erp-label">de</label>
                    <input className="erp-input num" type="number" min="1" value={form.parcela_total || 1}
                      onChange={(e) => setF("parcela_total", Number(e.target.value))} />
                  </div>
                  <div className="erp-field erp-c12">
                    <label className="erp-label">Observação</label>
                    <input className="erp-input" value={form.observacao ?? ""}
                      onChange={(e) => setF("observacao", e.target.value)} />
                  </div>
                  <div className="erp-field erp-c12">
                    <span className="erp-hint">
                      O título nasce aguardando aprovação. Só depois de aprovado o botão de pagamento aparece na carteira —
                      é o controle que impede pagar um documento que ninguém conferiu.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Títulos: <strong>{list.length}</strong></div>
        <div className="erp-status-item">Em aberto: <strong>{money(totais.saldo)}</strong></div>
        {totais.vencidos > 0 && (
          <div className="erp-status-item">Vencidos: <strong>{totais.vencidos}</strong> ({money(totais.valorVencido)})</div>
        )}
        {totais.aguardando > 0 && <div className="erp-status-item">Aguardando aprovação: <strong>{totais.aguardando}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
