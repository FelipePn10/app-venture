import { useCallback, useEffect, useMemo, useState } from "react";
import { SupportCrud } from "./SupportCrud";
import {
  addPaymentConditionInstallment,
  deletePaymentConditionInstallment,
  listPaymentConditionInstallments,
  paymentBaseEventLabel,
  simulatePaymentCondition,
  PAYMENT_BASE_EVENTS,
  type InstallmentDTO,
  type PlanoSimuladoDTO,
} from "@/services/customerService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Tab = "condicao" | "tabela";

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "—");

export function Vcli0520Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("condicao");
  const [inst, setInst] = useState({
    payment_condition_code: "", installment_number: "1", due_days: "30", percentage: "",
    base_event: "EMISSAO", description: "", document_type: "DUPLICATA", carrier_code: "",
  });
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "warn"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [parcelas, setParcelas] = useState<InstallmentDTO[]>([]);
  const [plano, setPlano] = useState<PlanoSimuladoDTO | null>(null);
  const [simulacao, setSimulacao] = useState({ total: "10000", entrega: "" });
  const [excluir, setExcluir] = useState<InstallmentDTO | null>(null);

  const condicao = Number(inst.payment_condition_code) || 0;

  const carregarParcelas = useCallback(async (code: number) => {
    if (!code) { setParcelas([]); setPlano(null); return; }
    try {
      const lista = await listPaymentConditionInstallments(code);
      setParcelas(lista);
      // A próxima parcela já vem numerada: quem monta 30/20/25/25 não precisa
      // contar de cabeça.
      const ultima = lista.length > 0 ? lista[lista.length - 1].installment_number : 0;
      setInst((p) => ({ ...p, installment_number: String(ultima + 1) }));
    } catch { setParcelas([]); }
  }, []);

  useEffect(() => { void carregarParcelas(condicao); }, [condicao, carregarParcelas]);

  /** Soma dos percentuais já cadastrados: é o que diz se a condição fecha. */
  const somaPct = useMemo(
    () => parcelas.reduce((acc, p) => acc + (p.percentage ?? 0), 0),
    [parcelas],
  );
  const semPercentual = parcelas.length > 0 && parcelas.every((p) => p.percentage === undefined);

  async function addInstallment() {
    if (!condicao) { setFeedback({ type: "error", message: "Informe a condição de pagamento." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const criada = await addPaymentConditionInstallment({
        payment_condition_code: condicao,
        installment_number: Number(inst.installment_number),
        due_days: Number(inst.due_days),
        percentage: inst.percentage.trim() === "" ? undefined : Number(inst.percentage),
        base_event: inst.base_event,
        description: inst.description || undefined,
        document_type: inst.document_type,
        carrier_code: inst.carrier_code ? Number(inst.carrier_code) : undefined,
      });
      setInst((p) => ({ ...p, description: "", percentage: "" }));
      await carregarParcelas(condicao);
      setFeedback(criada.warning
        ? { type: "warn", message: criada.warning }
        : { type: "success", message: `Parcela ${criada.installment_number} gravada.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function confirmarExclusao() {
    const alvo = excluir;
    setExcluir(null);
    if (!alvo?.id || !condicao) return;
    setBusy(true); setFeedback(null);
    try {
      await deletePaymentConditionInstallment(condicao, alvo.id);
      await carregarParcelas(condicao);
      setFeedback({ type: "success", message: `Parcela ${alvo.installment_number} removida.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function simular() {
    if (!condicao) { setFeedback({ type: "error", message: "Informe a condição de pagamento." }); return; }
    setBusy(true); setFeedback(null);
    try {
      setPlano(await simulatePaymentCondition(condicao, {
        total: Number(simulacao.total) || undefined,
        deliveryDate: simulacao.entrega || undefined,
      }));
    } catch (e) { setPlano(null); setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  /** Entrada é pagamento no ato: prazo em dias não significa nada. */
  const prazoDesabilitado = inst.base_event === "ENTRADA";

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Cliente</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Apoio de Cliente (Comercial)</span><span className="erp-crumb-code">VCLI0520</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar"><div className="erp-tgroup"><span className="erp-tgroup-label">Condições &amp; Tabelas</span></div><div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VCLI0520 — Apoio de Cliente (Comercial)" filename="vcli0520" /></div></div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Apoio de Cliente</button></div>
          <div className="erp-detail-body">
        <div className="erp-fieldset">
          <div className="erp-tabs">
            <button className={`erp-tab ${tab === "condicao" ? "active" : ""}`} onClick={() => setTab("condicao")}>Condição de Pagamento</button>
            <button className={`erp-tab ${tab === "tabela" ? "active" : ""}`} onClick={() => setTab("tabela")}>Tabela de Vendas</button>
          </div>

          {tab === "condicao" && (
            <>
              <SupportCrud resource="payment-conditions"
                editable
                fields={[
                  { key: "description", label: "Descrição", col: 4, required: true },
                  { key: "carrier_code", label: "Portador (cód.)", kind: "number", col: 2 },
                  { key: "analysis_type", label: "Análise crédito", kind: "select", options: ["SEMPRE_ANALISA", "BLOQUEIA_SEMPRE", "LIBERA_SEM_ANALISE"], col: 3 },
                  { key: "parcel_start", label: "Início parcelas", kind: "select", options: ["EMISSAO", "PROXIMO_MES", "PROXIMA_QUINZENA"], col: 3 },
                  { key: "expenses", label: "Despesas", kind: "number", col: 2 },
                  { key: "average_term", label: "Prazo médio (d)", kind: "number", col: 2 },
                  { key: "is_special", label: "Especial", kind: "bool", col: 2 },
                  { key: "is_revenue", label: "Gera receita", kind: "bool", col: 2 },
                  { key: "is_at_sight", label: "À vista", kind: "bool", col: 2 },
                ]}
                columns={[{ key: "description", label: "Descrição" }, { key: "analysis_type", label: "Análise" }, { key: "average_term", label: "Prazo médio", kind: "number" }, { key: "is_revenue", label: "Receita", kind: "bool" }]} />
              <div className="erp-fieldset-body" style={{ borderTop: "1px solid #e2e8e4" }}>
                {feedback && <div className={`erp-feedback ${feedback.type}`} style={{ marginBottom: 10 }}>{feedback.message}</div>}

                <div className="erp-field erp-c12">
                  <span className="erp-label" style={{ fontWeight: 600 }}>Parcelas da condição</span>
                  <small className="erp-hint">
                    Informe o percentual de cada parcela e de que evento o prazo conta para montar
                    condições como <strong>30% de entrada, 20% na entrega e o restante em 28/56 dias</strong>.
                    Deixar todos os percentuais em branco mantém a divisão em partes iguais.
                  </small>
                </div>

                <div className="erp-field erp-c2"><label className="erp-label erp-req">Condição (cód.)</label><input className="erp-input num" type="number" value={inst.payment_condition_code} onChange={(e) => setInst((p) => ({ ...p, payment_condition_code: e.target.value }))} /></div>
                <div className="erp-field erp-c1"><label className="erp-label">Nº</label><input className="erp-input num" type="number" value={inst.installment_number} onChange={(e) => setInst((p) => ({ ...p, installment_number: e.target.value }))} /></div>
                <div className="erp-field erp-c2">
                  <label className="erp-label">% do total</label>
                  <input className="erp-input num" type="number" step="0.01" min="0" max="100" placeholder="em branco = igual"
                    value={inst.percentage} onChange={(e) => setInst((p) => ({ ...p, percentage: e.target.value }))} />
                </div>
                <div className="erp-field erp-c3">
                  <label className="erp-label">Prazo conta de</label>
                  <select className="erp-input" value={inst.base_event} onChange={(e) => setInst((p) => ({ ...p, base_event: e.target.value, due_days: e.target.value === "ENTRADA" ? "0" : p.due_days }))}>
                    {PAYMENT_BASE_EVENTS.map((ev) => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                  </select>
                </div>
                <div className="erp-field erp-c2">
                  <label className="erp-label">Dias venc.</label>
                  <input className="erp-input num" type="number" value={prazoDesabilitado ? "0" : inst.due_days} disabled={prazoDesabilitado}
                    title={prazoDesabilitado ? "Entrada é pagamento no ato: o prazo é sempre zero." : undefined}
                    onChange={(e) => setInst((p) => ({ ...p, due_days: e.target.value }))} />
                </div>
                <div className="erp-field erp-c2"><label className="erp-label">Documento</label><select className="erp-input" value={inst.document_type} onChange={(e) => setInst((p) => ({ ...p, document_type: e.target.value }))}><option>DUPLICATA</option><option>CHEQUE</option><option>PROMISSORIA</option></select></div>
                <div className="erp-field erp-c4"><label className="erp-label">Descrição</label><input className="erp-input" value={inst.description} onChange={(e) => setInst((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Portador (cód.)</label><input className="erp-input num" type="number" value={inst.carrier_code} onChange={(e) => setInst((p) => ({ ...p, carrier_code: e.target.value }))} /></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addInstallment()} disabled={busy || !condicao}>Gravar parcela</button></div>

                {condicao > 0 && (
                  <div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th style={{ width: 60 }}>Nº</th><th style={{ width: 110 }}>% do total</th><th>Prazo conta de</th><th style={{ width: 110 }}>Dias</th><th>Documento</th><th>Descrição</th><th style={{ width: 90 }} /></tr></thead>
                      <tbody>
                        {parcelas.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma parcela cadastrada — a condição será tratada como à vista.</td></tr>}
                        {parcelas.map((p) => (
                          <tr key={p.id ?? p.installment_number}>
                            <td className="num">{p.installment_number}</td>
                            <td className="num">{p.percentage === undefined ? "partes iguais" : `${p.percentage.toLocaleString("pt-BR")}%`}</td>
                            <td>{paymentBaseEventLabel(p.base_event)}</td>
                            <td className="num">{p.due_days}</td>
                            <td>{p.document_type || "—"}</td>
                            <td>{p.description || "—"}</td>
                            <td><button className="erp-btn erp-btn-ghost" onClick={() => setExcluir(p)} disabled={busy || !p.id}>Excluir</button></td>
                          </tr>
                        ))}
                      </tbody>
                      {parcelas.length > 0 && (
                        <tfoot>
                          <tr>
                            <td>Total</td>
                            <td className="num"><strong>{semPercentual ? "partes iguais" : `${somaPct.toLocaleString("pt-BR")}%`}</strong></td>
                            <td colSpan={5}>
                              {semPercentual
                                ? "Sem percentuais: o valor é dividido igualmente entre as parcelas."
                                : somaPct === 100
                                  ? "A condição fecha 100% — pronta para uso."
                                  : "Os percentuais ainda não fecham 100%: acerte antes de usar esta condição."}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}

                {condicao > 0 && (
                  <>
                    <div className="erp-field erp-c12" style={{ marginTop: 6 }}>
                      <span className="erp-label" style={{ fontWeight: 600 }}>Conferir em dinheiro</span>
                      <small className="erp-hint">Simula a condição sem gravar nada — é a conferência do cadastro antes de usá-la num pedido.</small>
                    </div>
                    <div className="erp-field erp-c2"><label className="erp-label">Valor de referência</label><input className="erp-input num" type="number" value={simulacao.total} onChange={(e) => setSimulacao((p) => ({ ...p, total: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Data de entrega</label><input className="erp-input" type="date" value={simulacao.entrega} onChange={(e) => setSimulacao((p) => ({ ...p, entrega: e.target.value }))} /></div>
                    <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" style={{ width: "100%" }} onClick={() => void simular()} disabled={busy}>Simular</button></div>

                    {plano && (
                      <div className="erp-field erp-c12">
                        {plano.aviso && <div className="erp-feedback warn" style={{ marginBottom: 8 }}>{plano.aviso}</div>}
                        <table className="erp-grid">
                          <thead><tr><th style={{ width: 60 }}>Nº</th><th style={{ width: 100 }}>%</th><th style={{ width: 140 }}>Valor</th><th style={{ width: 130 }}>Vencimento</th><th>Como foi contado</th></tr></thead>
                          <tbody>
                            {plano.parcelas.map((p) => (
                              <tr key={p.numero}>
                                <td className="num">{p.numero}</td>
                                <td className="num">{p.percentual.toLocaleString("pt-BR")}%</td>
                                <td className="num">{moeda(p.valor)}</td>
                                <td>{dataBR(p.vencimento)}{p.estimado ? " (estimado)" : ""}</td>
                                <td>{p.descricao}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot><tr><td colSpan={2}>Total</td><td className="num"><strong>{moeda(plano.total)}</strong></td><td colSpan={2}>{plano.condicao_descricao}</td></tr></tfoot>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {tab === "tabela" && <SupportCrud resource="sales-tables"
            editable
            fields={[
              { key: "description", label: "Descrição", col: 5, required: true },
              { key: "validity_start", label: "Vigência início (ISO)", col: 3, placeholder: "2025-01-01T00:00:00Z" },
              { key: "validity_end", label: "Vigência fim (ISO)", col: 3 },
              { key: "tolerance_min_pct", label: "Tol. mín %", kind: "number", col: 2 },
              { key: "tolerance_max_pct", label: "Tol. máx %", kind: "number", col: 2 },
              { key: "price_formation", label: "Formação de preço", kind: "select", options: ["INFORMADO", "CUSTO_MEDIO", "CUSTO_STANDARD_TOTAL", "CUSTO_STANDARD_MATERIAL", "INFORMADO_SEM_ICMS", "MAT_OPER", "TABELA_CUSTO", "TRANSFERENCIA_IPI", "TRANSFERENCIA_UF"], col: 4 },
              { key: "decimal_places", label: "Casas decimais", kind: "number", col: 2 },
              { key: "composition", label: "Incoterm", kind: "select", options: ["FOB", "CIF", "EXWORK"], col: 2 },
              { key: "table_type", label: "Tipo", kind: "select", options: ["NORMAL", "PROMOCIONAL"], col: 2 },
              { key: "base_date", label: "Data base", kind: "select", options: ["PEDIDO", "DATA_ATUAL"], col: 2 },
              { key: "allow_items_below_cent", label: "Permite < R$0,01", kind: "bool", col: 3 },
              { key: "icms_interestadual_por_dentro", label: "ICMS por dentro", kind: "bool", col: 3 },
              { key: "observation", label: "Observação", col: 6 },
            ]}
            columns={[{ key: "description", label: "Descrição" }, { key: "price_formation", label: "Formação" }, { key: "table_type", label: "Tipo" }, { key: "composition", label: "Incoterm" }]} />}
        </div>
      </div></section></div>

      <ConfirmDialog
        aberto={excluir !== null}
        titulo="Excluir parcela da condição"
        assunto={excluir ? `Parcela ${excluir.installment_number}` : ""}
        mensagem="A parcela sai da condição e os percentuais deixam de fechar 100% até você acertar o resto. Pedidos já gravados com esta condição não mudam."
        rotuloConfirmar="Excluir parcela"
        tom="aviso"
        onConfirmar={() => void confirmarExclusao()}
        onCancelar={() => setExcluir(null)}
      />

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Apoio: <strong>{tab}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
