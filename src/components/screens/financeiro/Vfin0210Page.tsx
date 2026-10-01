import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type ContaReceber, type ContaReceberDTO, type AgingBucket, type BaixaRecebimentoDTO, type ListFilters,
  listContasReceber, createContaReceber, baixarContaReceber, cancelContaReceber, agingReceber, agingTotal,
  STATUS_TITULO_RECEBER, FORMAS_DE_PAGAMENTO, FORMA_PAGAMENTO_LABELS, diasDeAtraso, estaEmAberto,
  temFiltroAtivo,
} from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadCustomers, loadSalesOrders, loadBankAccounts, loadFiscalExits } from "@/services/lookups";
import { CarteiraFiltros } from "./CarteiraFiltros";

/**
 * VFIN0210 — Contas a Receber.
 *
 * ── O que mudou ──
 * **Filtros.** A tela tinha um único seletor de situação, e ele não funcionava: o
 * backend lia o filtro do CORPO de uma rota GET (nada chegava) e comparava
 * "pendente" com a coluna que grava "PENDENTE". Agora há cliente, situação,
 * período por emissão ou vencimento, documento, faixa de valor e "só vencidos".
 *
 * **NF de saída.** O campo era "NF Saída (ID)": um número para digitar o id
 * interno da nota no banco de dados. Ninguém sabe esse número, e o campo aceitava
 * qualquer valor — gravando vínculo com a nota errada sem acusar nada. Agora é uma
 * busca por número e série da nota, que devolve o id por baixo.
 *
 * **Conta bancária na baixa.** Era um `select` com a lista inteira; virou busca,
 * como o resto do sistema.
 *
 * **Forma de pagamento.** Era texto livre — "boleto", "Boleto" e "BOL" viravam três
 * formas diferentes no relatório. Agora é domínio fechado.
 */

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY: ContaReceberDTO = {
  numero_documento: "", data_emissao: today(), data_vencimento: today(),
  valor_bruto: 0, desconto: 0, parcela_numero: 1, parcela_total: 1,
  forma_pagamento: "BOLETO", observacao: "",
};

/** Rótulo da situação em português, a partir do valor que o banco grava. */
function rotuloDaSituacao(s: string): string {
  const achado = STATUS_TITULO_RECEBER.find((o) => o.valor === (s || "").toUpperCase());
  return achado ? achado.rotulo : (s || "—");
}

function statusPill(s: string): JSX.Element {
  const x = (s || "").toUpperCase();
  const cls = x.includes("PAGO") || x.includes("RECEBID") || x.includes("QUITAD") ? "erp-badge-green"
    : x.includes("PARCIAL") ? "erp-badge-blue"
    : x.includes("CANCEL") ? "erp-badge-red" : "erp-badge-amber";
  return <span className={`erp-badge ${cls}`}>{rotuloDaSituacao(s)}</span>;
}

/** Vencimento com o atraso ao lado: o número de dias é o que decide a cobrança. */
function celulaDeVencimento(c: ContaReceber): JSX.Element {
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

export function Vfin0210Page(): JSX.Element {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [form, setForm] = useState<ContaReceberDTO>(EMPTY);
  const [list, setList] = useState<ContaReceber[]>([]);
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [filtros, setFiltros] = useState<ListFilters>({});
  const [baixa, setBaixa] = useState<{ alvo: ContaReceber; dto: BaixaRecebimentoDTO } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (f?: ListFilters) => {
    setBusy(true);
    try {
      const [items, ag] = await Promise.all([
        listContasReceber(f ?? {}),
        // O aging é da carteira INTEIRA de propósito: responde "quanto está vencido
        // no total". Recortá-lo pelo filtro da tela o transformaria numa soma do que
        // já está na grade — que a grade mostra sozinha.
        agingReceber().catch(() => null),
      ]);
      setList(items); setAging(ag ?? []);
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao listar contas a receber.") });
    } finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof ContaReceberDTO>(k: K, v: ContaReceberDTO[K]) => {
    setForm((p) => ({ ...p, [k]: v })); setFeedback(null);
  };

  const totais = useMemo(() => {
    const bruto = list.reduce((s, c) => s + c.valor_bruto, 0);
    const recebido = list.reduce((s, c) => s + (c.valor_recebido ?? 0), 0);
    const emAberto = list.filter((c) => estaEmAberto(c.status));
    const vencidos = emAberto.filter((c) => (diasDeAtraso(c.data_vencimento) ?? -1) > 0);
    return {
      bruto, recebido, saldo: bruto - recebido,
      emAberto: emAberto.length,
      vencidos: vencidos.length,
      valorVencido: vencidos.reduce((s, c) => s + (c.valor_bruto - (c.valor_recebido ?? 0)), 0),
    };
  }, [list]);

  async function salvar() {
    if (!form.numero_documento.trim()) { setFeedback({ type: "error", message: "Informe o número do documento." }); return; }
    if (!form.valor_bruto || form.valor_bruto <= 0) { setFeedback({ type: "error", message: "O valor bruto tem de ser maior que zero." }); return; }
    // Vencimento antes da emissão é erro de digitação que só aparece na cobrança,
    // meses depois. Barrar aqui custa nada.
    if (form.data_vencimento < form.data_emissao) {
      setFeedback({ type: "error", message: "O vencimento é anterior à emissão." }); return;
    }
    if ((form.desconto ?? 0) > form.valor_bruto) {
      setFeedback({ type: "error", message: "O desconto é maior que o valor bruto do título." }); return;
    }
    if ((form.parcela_numero ?? 1) > (form.parcela_total ?? 1)) {
      setFeedback({ type: "error", message: `Parcela ${form.parcela_numero} de ${form.parcela_total}: o número da parcela não pode passar do total.` });
      return;
    }
    setBusy(true); setFeedback(null);
    try {
      await createContaReceber(form);
      setFeedback({ type: "success", message: `Título ${form.numero_documento} criado.` });
      setMode("list"); await reload(filtros);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  function abrirBaixa(c: ContaReceber) {
    const saldo = c.valor_bruto - (c.valor_recebido ?? 0);
    setBaixa({
      alvo: c,
      // A conta bancária NÃO vem pré-escolhida: antes assumia a primeira da lista, e
      // confirmar sem olhar creditava o recebimento na conta errada.
      dto: { conta_bancaria_id: 0, valor_recebido: Number(saldo.toFixed(2)), data_recebimento: today(), observacao: "" },
    });
    setFeedback(null);
  }
  const setBaixaF = <K extends keyof BaixaRecebimentoDTO>(k: K, v: BaixaRecebimentoDTO[K]) =>
    setBaixa((p) => (p ? { ...p, dto: { ...p.dto, [k]: v } } : p));

  async function confirmarBaixa() {
    if (!baixa) return;
    if (!baixa.dto.conta_bancaria_id) { setFeedback({ type: "error", message: "Escolha a conta bancária que recebeu o valor." }); return; }
    if (!baixa.dto.valor_recebido || baixa.dto.valor_recebido <= 0) { setFeedback({ type: "error", message: "Informe o valor recebido." }); return; }
    const saldo = baixa.alvo.valor_bruto - (baixa.alvo.valor_recebido ?? 0);
    if (baixa.dto.valor_recebido > saldo + 0.005) {
      setFeedback({ type: "error", message: `O valor recebido (${money(baixa.dto.valor_recebido)}) passa do saldo do título (${money(saldo)}).` });
      return;
    }
    setBusy(true); setFeedback(null);
    try {
      await baixarContaReceber(baixa.alvo.id, baixa.dto);
      const parcial = baixa.dto.valor_recebido < saldo - 0.005;
      setFeedback({
        type: "success",
        message: parcial
          ? `Recebimento parcial do título ${baixa.alvo.numero_documento} registrado. Saldo restante: ${money(saldo - baixa.dto.valor_recebido)}.`
          : `Título ${baixa.alvo.numero_documento} quitado.`,
      });
      setBaixa(null); await reload(filtros);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function cancelar(c: ContaReceber) {
    if (!window.confirm(`Cancelar o título ${c.numero_documento} de ${money(c.valor_bruto)}?\n\nO título sai da carteira e do fluxo projetado.`)) return;
    setBusy(true); setFeedback(null);
    try {
      await cancelContaReceber(c.id);
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
          <span className="erp-crumb-cur">Contas a Receber</span>
          <span className="erp-crumb-code">VFIN0210</span>
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
            <ExportButton title="VFIN0210 — Contas a Receber" filename="contas-receber" disabled={busy}
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
          <div className="erp-tabs" role="tablist" aria-label="Contas a receber">
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
                            <div className="erp-metric-label">Total a receber</div>
                            <div className="erp-metric-value">{money(agingTotal(aging))}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <CarteiraFiltros
                  filtros={filtros} onChange={setFiltros} onAplicar={() => void reload(filtros)}
                  busy={busy} situacoes={STATUS_TITULO_RECEBER}
                  parceiroLabel="Cliente" parceiroLoader={loadCustomers} parceiroCampo="cliente_id"
                  totalEncontrado={list.length} />

                {baixa && (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      Baixar o título {baixa.alvo.numero_documento}
                      <span style={{ fontWeight: 400, opacity: 0.65 }}>
                        {` — saldo ${money(baixa.alvo.valor_bruto - (baixa.alvo.valor_recebido ?? 0))}`}
                      </span>
                    </div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4">
                        <label className="erp-label erp-req">Conta bancária que recebeu</label>
                        <LookupField value={baixa.dto.conta_bancaria_id || undefined} loader={loadBankAccounts}
                          entityLabel="conta bancária" placeholder="Escolher a conta" allowManualCode={false}
                          onChange={(c) => setBaixaF("conta_bancaria_id", c ? Number(c) : 0)} />
                        <span className="erp-hint">O crédito entra no saldo desta conta e no fluxo de caixa.</span>
                      </div>
                      <div className="erp-field erp-c3">
                        <label className="erp-label erp-req">Valor recebido</label>
                        <input className="erp-input num" type="number" step="0.01" min="0"
                          value={baixa.dto.valor_recebido}
                          onChange={(e) => setBaixaF("valor_recebido", Number(e.target.value))} />
                        <span className="erp-hint">Menor que o saldo registra recebimento parcial.</span>
                      </div>
                      <div className="erp-field erp-c2">
                        <label className="erp-label erp-req">Data do recebimento</label>
                        <input className="erp-input" type="date" value={baixa.dto.data_recebimento}
                          onChange={(e) => setBaixaF("data_recebimento", e.target.value)} />
                      </div>
                      <div className="erp-field erp-c3" style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                        <button className="erp-btn erp-btn-primary" onClick={() => void confirmarBaixa()} disabled={busy}>
                          {busy ? "…" : "Confirmar baixa"}
                        </button>
                        <button className="erp-btn" onClick={() => setBaixa(null)} disabled={busy}>Desistir</button>
                      </div>
                      <div className="erp-field erp-c12">
                        <label className="erp-label">Observação</label>
                        <input className="erp-input" value={baixa.dto.observacao ?? ""}
                          placeholder="Nº do comprovante, conciliação, acordo"
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
                            <th>Documento</th><th>Cliente</th><th>Emissão</th><th>Vencimento</th>
                            <th className="num">Valor</th><th className="num">Recebido</th><th className="num">Saldo</th>
                            <th>Situação</th><th style={{ width: 170 }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.length === 0 && (
                            <tr><td colSpan={9} className="erp-grid-empty">
                              {temFiltroAtivo(filtros)
                                ? "Nenhum título corresponde ao filtro. Limpe o filtro para ver a carteira inteira."
                                : "Nenhum título a receber."}
                            </td></tr>
                          )}
                          {list.map((c) => {
                            const saldo = c.valor_bruto - (c.valor_recebido ?? 0);
                            const aberto = estaEmAberto(c.status);
                            return (
                              <tr key={c.id}>
                                <td style={{ fontWeight: 600 }}>
                                  {c.numero_documento}
                                  {c.parcela_total && c.parcela_total > 1 && (
                                    <span className="erp-hint" style={{ display: "block" }}>
                                      parcela {c.parcela_numero}/{c.parcela_total}
                                    </span>
                                  )}
                                </td>
                                <td>{c.cliente_id
                                  ? <EntityName code={c.cliente_id} loader={loadCustomers} />
                                  : "—"}</td>
                                <td>{c.data_emissao?.slice(0, 10) || "—"}</td>
                                {celulaDeVencimento(c)}
                                <td className="num">{money(c.valor_bruto)}</td>
                                <td className="num">{money(c.valor_recebido)}</td>
                                <td className="num">{aberto ? money(saldo) : "—"}</td>
                                <td>{statusPill(c.status)}</td>
                                <td style={{ display: "flex", gap: 6 }}>
                                  {aberto && <button className="erp-btn erp-btn-sm" onClick={() => abrirBaixa(c)} disabled={busy}>Baixar</button>}
                                  {aberto && <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => void cancelar(c)} disabled={busy}>Cancelar</button>}
                                  {!aberto && <span className="erp-hint">{c.data_recebimento?.slice(0, 10) ?? "encerrado"}</span>}
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
                              <td className="num">{money(totais.recebido)}</td>
                              <td className="num">{money(totais.saldo)}</td>
                              <td colSpan={2} />
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
                    <input className="erp-input" value={form.numero_documento} placeholder="NF-1001"
                      onChange={(e) => setF("numero_documento", e.target.value)} />
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label">Cliente</label>
                    <LookupField value={form.cliente_id} loader={loadCustomers} entityLabel="cliente"
                      placeholder="Escolher cliente" clearable
                      onChange={(c) => setF("cliente_id", c ? Number(c) : undefined)} />
                  </div>
                  <div className="erp-field erp-c3">
                    {/* Era "NF Saída (ID)": um campo numérico para digitar o id
                        interno da nota. Ninguém sabe esse número, e qualquer valor
                        era aceito — vinculando o título à nota errada em silêncio. */}
                    <label className="erp-label">Nota fiscal de saída</label>
                    <LookupField value={form.fiscal_exit_id} loader={loadFiscalExits}
                      entityLabel="nota fiscal de saída" placeholder="Buscar por número da nota"
                      allowManualCode={false} clearable
                      onChange={(c) => setF("fiscal_exit_id", c ? Number(c) : undefined)} />
                    <span className="erp-hint">Busca pelo número e série; o vínculo interno é resolvido pelo sistema.</span>
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label">Pedido de venda</label>
                    <LookupField value={form.sales_order_id} loader={loadSalesOrders}
                      entityLabel="pedido de venda" placeholder="Opcional" clearable
                      onChange={(c) => setF("sales_order_id", c ? Number(c) : undefined)} />
                    <span className="erp-hint">Fecha o ciclo pedido → nota → recebimento.</span>
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
                    <label className="erp-label">Forma de recebimento</label>
                    <select className="erp-input" value={form.forma_pagamento}
                      onChange={(e) => setF("forma_pagamento", e.target.value)}>
                      {FORMAS_DE_PAGAMENTO.map((f) => (
                        <option key={f} value={f}>{FORMA_PAGAMENTO_LABELS[f]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="erp-field erp-c2">
                    <label className="erp-label">Valor líquido</label>
                    <input className="erp-input num" readOnly
                      value={money(Math.max(0, form.valor_bruto - (form.desconto ?? 0)))} />
                    <span className="erp-hint">Bruto menos desconto.</span>
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
                  <div className="erp-field erp-c10">
                    <label className="erp-label">Observação</label>
                    <input className="erp-input" value={form.observacao ?? ""}
                      onChange={(e) => setF("observacao", e.target.value)} />
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
        {aging.length > 0 && <div className="erp-status-item">Carteira: <strong>{money(agingTotal(aging))}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
