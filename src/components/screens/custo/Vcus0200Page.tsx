import { useCallback, useEffect, useState } from "react";
import {
  type MarginParameters, type MarginLine, type MarginSummary,
  COST_BASES, getMarginParameters, saveMarginParameters,
  generateMargin, getMarginReport,
} from "@/services/marginService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadItems, loadCustomers } from "@/services/lookups";

/**
 * VCUS0200 — Margem de Contribuição.
 *
 * Responde a pergunta que faturamento e custo, isolados, não respondem: em quais
 * produtos e clientes a empresa ganha dinheiro. É a apuração do FoccoERP
 * (FCST0108 parâmetros, FCST0254 geração, FCST0320 análise), com uma diferença
 * que importa para quem vende a prazo: a despesa financeira do descasamento de
 * caixa entra na conta, então um pedido lucrativo no papel e ruim no caixa
 * aparece como ruim.
 */
type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "parametros" | "apuracao";

const hoje = new Date();
const primeiroDiaDoMes = () => `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
const hojeISO = () => hoje.toISOString().slice(0, 10);
const dinheiro = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Percentual no formato do país: vírgula decimal, não ponto. */
const pct = (n: number, casas = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

const PARAMS_VAZIOS: MarginParameters = {
  ano: hoje.getFullYear(), mes: hoje.getMonth() + 1,
  ir_pct: 0, admin_pct: 0, freight_pct: 0, financial_rate_monthly: 0,
  avg_sales_term_days: 0, avg_purchase_term_days: 0, production_cycle_days: 0,
  material_payment_days: 0, labor_payment_days: 0, ipi_payment_days: 0,
  icms_payment_days: 0, pis_payment_days: 0, cofins_payment_days: 0,
};

/** Verde ganha, vermelho perde — e a faixa neutra evita alarme por arredondamento. */
function corDaMargem(pct: number): string {
  if (pct < 0) return "var(--v-err)";
  if (pct < 5) return "#9a6a12";
  return "var(--v-primary)";
}

export function Vcus0200Page(): JSX.Element {
  const [aba, setAba] = useState<Aba>("apuracao");
  const [params, setParams] = useState<MarginParameters>({ ...PARAMS_VAZIOS });
  const [de, setDe] = useState(primeiroDiaDoMes());
  const [ate, setAte] = useState(hojeISO());
  const [base, setBase] = useState("PADRAO");
  const [ordem, setOrdem] = useState<"FATURAMENTO" | "MARGEM">("MARGEM");
  const [itemFiltro, setItemFiltro] = useState<number | undefined>(undefined);
  const [clienteFiltro, setClienteFiltro] = useState<number | undefined>(undefined);
  const [linhas, setLinhas] = useState<MarginLine[]>([]);
  const [resumo, setResumo] = useState<MarginSummary | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregarParams = useCallback((ano: number, mes: number) => run(async () => {
    const p = await getMarginParameters(ano, mes);
    setParams(p ?? { ...PARAMS_VAZIOS, ano, mes });
    if (!p) setFeedback({ type: "info", message: `Nenhum parâmetro cadastrado para ${String(mes).padStart(2, "0")}/${ano}. A apuração desse mês vai pedir o cadastro.` });
  }), [run]);

  useEffect(() => { void carregarParams(params.ano, params.mes); /* só na montagem */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setP = <K extends keyof MarginParameters>(k: K, v: MarginParameters[K]) =>
    setParams((p) => ({ ...p, [k]: v }));

  const gravarParams = () => run(async () => {
    const salvo = await saveMarginParameters(params);
    if (salvo) setParams(salvo);
    setFeedback({ type: "success", message: "Parâmetros do mês gravados." });
  });

  const apurar = () => run(async () => {
    const r = await generateMargin(de, ate, base);
    setResumo(r);
    setLinhas(await getMarginReport(de, ate, ordem, { item_code: itemFiltro, customer_code: clienteFiltro }));
    setFeedback(r.linhas_com_prejuizo > 0
      ? { type: "info", message: `${r.linhas_calculadas} linha(s) apurada(s) — ${r.linhas_com_prejuizo} com prejuízo.` }
      : { type: "success", message: `${r.linhas_calculadas} linha(s) apurada(s).` });
  });

  const consultar = () => run(async () => {
    setLinhas(await getMarginReport(de, ate, ordem, { item_code: itemFiltro, customer_code: clienteFiltro }));
  });

  const cicloNegativo = params.avg_sales_term_days - params.avg_purchase_term_days + params.production_cycle_days < 0;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Custos</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Margem de Contribuição</span>
          <span className="erp-crumb-code">VCUS0200</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        {resumo && (
          <span className="erp-titlebar-meta" style={{ color: corDaMargem(resumo.margem_pct) }}>
            Margem do período: R$ {dinheiro(resumo.margem_total)} ({pct(resumo.margem_pct, 2)}%)
          </span>
        )}
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Período</span>
          <input className="erp-input" type="date" style={{ width: 145, height: 32 }} value={de} onChange={(e) => setDe(e.target.value)} />
          <input className="erp-input" type="date" style={{ width: 145, height: 32 }} value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Custo</span>
          <select className="erp-input" style={{ width: 300, height: 32 }} value={base} onChange={(e) => setBase(e.target.value)}>
            {COST_BASES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          <button className="erp-btn erp-btn-primary" onClick={apurar} disabled={busy}>{busy ? "..." : "Apurar margem"}</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VCUS0200 — Margem de Contribuição" filename="vcus0200" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            <button className={`erp-tab ${aba === "apuracao" ? "active" : ""}`} onClick={() => setAba("apuracao")}>Apuração</button>
            <button className={`erp-tab ${aba === "parametros" ? "active" : ""}`} onClick={() => setAba("parametros")}>Parâmetros do mês</button>
          </div>
          <div className="erp-detail-body">

            {aba === "parametros" && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Parâmetros de {String(params.mes).padStart(2, "0")}/{params.ano}</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12">
                    <p className="erp-note">
                      Percentuais e prazos valem para todas as vendas do mês. O <strong>ciclo de caixa</strong> e a
                      <strong> taxa financeira real</strong> são calculados a partir deles — é o que transforma
                      "3% ao mês" no custo efetivo de financiar aquela venda.
                    </p>
                  </div>
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Ano</label>
                    <input className="erp-input num" type="number" value={params.ano}
                      onChange={(e) => { const v = Number(e.target.value); setP("ano", v); void carregarParams(v, params.mes); }} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Mês</label>
                    <input className="erp-input num" type="number" min="1" max="12" value={params.mes}
                      onChange={(e) => { const v = Number(e.target.value); setP("mes", v); void carregarParams(params.ano, v); }} /></div>

                  <div className="erp-field erp-c12"><div className="erp-sec">Percentuais sobre o faturamento</div></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Provisão de IR/CSLL (%)</label>
                    <input className="erp-input num" type="number" step="0.01" value={params.ir_pct} onChange={(e) => setP("ir_pct", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Incidência administrativa (%)</label>
                    <input className="erp-input num" type="number" step="0.01" value={params.admin_pct} onChange={(e) => setP("admin_pct", Number(e.target.value))} />
                    <span className="erp-hint">Despesa da estrutura rateada entre os itens.</span></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Frete médio (%)</label>
                    <input className="erp-input num" type="number" step="0.01" value={params.freight_pct} onChange={(e) => setP("freight_pct", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Taxa financeira (% ao mês)</label>
                    <input className="erp-input num" type="number" step="0.01" value={params.financial_rate_monthly} onChange={(e) => setP("financial_rate_monthly", Number(e.target.value))} /></div>

                  <div className="erp-field erp-c12"><div className="erp-sec">Ciclo de caixa</div></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Prazo médio de venda (dias)</label>
                    <input className="erp-input num" type="number" value={params.avg_sales_term_days} onChange={(e) => setP("avg_sales_term_days", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Prazo médio de compra (dias)</label>
                    <input className="erp-input num" type="number" value={params.avg_purchase_term_days} onChange={(e) => setP("avg_purchase_term_days", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Ciclo de produção (dias)</label>
                    <input className="erp-input num" type="number" value={params.production_cycle_days} onChange={(e) => setP("production_cycle_days", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Ciclo de caixa</label>
                    <input className="erp-input num" readOnly value={`${params.cash_cycle_days ?? 0} dias`} />
                    <span className="erp-hint">Venda − compra + produção. {cicloNegativo ? "Negativo: você recebe antes de pagar." : "É quanto tempo o dinheiro fica fora do caixa."}</span></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Taxa financeira real</label>
                    <input className="erp-input num" readOnly value={`${pct(params.real_financial_rate_pct ?? 0, 4)}%`} />
                    <span className="erp-hint">A taxa mensal capitalizada pelo ciclo de caixa.</span></div>

                  <div className="erp-field erp-c12"><div className="erp-sec">Prazos de pagamento (para trazer a valor presente)</div></div>
                  {([
                    ["material_payment_days", "Matéria-prima"],
                    ["labor_payment_days", "Mão de obra e terceiros"],
                    ["ipi_payment_days", "IPI"],
                    ["icms_payment_days", "ICMS"],
                    ["pis_payment_days", "PIS"],
                    ["cofins_payment_days", "COFINS"],
                  ] as const).map(([campo, rotulo]) => (
                    <div className="erp-field erp-c2" key={campo}>
                      <label className="erp-label">{rotulo} (dias)</label>
                      <input className="erp-input num" type="number" value={params[campo]}
                        onChange={(e) => setP(campo, Number(e.target.value))} />
                    </div>
                  ))}

                  <div className="erp-field erp-c12">
                    <button className="erp-btn erp-btn-primary" onClick={gravarParams} disabled={busy}>Gravar parâmetros do mês</button>
                  </div>
                </div>
              </div>
            )}

            {aba === "apuracao" && (
              <>
                {resumo && (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Resultado do período</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c3"><label className="erp-label">Linhas apuradas</label>
                        <input className="erp-input num" readOnly value={resumo.linhas_calculadas.toLocaleString("pt-BR")} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Faturamento da mercadoria</label>
                        <input className="erp-input num" readOnly value={`R$ ${dinheiro(resumo.faturamento_total)}`} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Margem</label>
                        <input className="erp-input num" readOnly style={{ color: corDaMargem(resumo.margem_pct), fontWeight: 600 }}
                          value={`R$ ${dinheiro(resumo.margem_total)} (${pct(resumo.margem_pct, 2)}%)`} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Linhas com prejuízo</label>
                        <input className="erp-input num" readOnly
                          style={{ color: resumo.linhas_com_prejuizo > 0 ? "var(--v-err)" : "inherit", fontWeight: 600 }}
                          value={resumo.linhas_com_prejuizo.toLocaleString("pt-BR")} />
                        <span className="erp-hint">Vendas que consumiram mais do que trouxeram.</span></div>
                    </div>
                  </div>
                )}

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Margem por linha de venda ({linhas.length})</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label">Ordenar por</label>
                      <select className="erp-input" value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)}>
                        <option value="MARGEM">Pior margem primeiro — onde agir</option>
                        <option value="FATURAMENTO">Maior faturamento — onde está o volume</option>
                      </select></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Item</label>
                      <LookupField value={itemFiltro} loader={loadItems} entityLabel="item" placeholder="Todos" clearable
                        onChange={(c) => setItemFiltro(c ? Number(c) : undefined)} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Cliente</label>
                      <LookupField value={clienteFiltro} loader={loadCustomers} entityLabel="cliente" placeholder="Todos" clearable
                        onChange={(c) => setClienteFiltro(c ? Number(c) : undefined)} /></div>
                    <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn" style={{ width: "100%" }} onClick={consultar} disabled={busy}>Consultar</button></div>

                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead>
                          <tr>
                            <th>Nota</th><th>Emissão</th><th>Item</th>
                            <th className="num">Faturamento</th>
                            <th className="num">Impostos</th>
                            <th className="num">Custo</th>
                            <th className="num">Despesas</th>
                            <th className="num">Margem</th>
                            <th className="num">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linhas.length === 0 && (
                            <tr><td colSpan={9} className="erp-grid-empty">
                              Nenhuma linha apurada no período. Cadastre os parâmetros do mês e clique em <strong>Apurar margem</strong>.
                            </td></tr>
                          )}
                          {linhas.map((l) => {
                            const impostos = l.ipi + l.icms + l.pis_cofins;
                            const custo = l.custo_materia_prima + l.custo_transformacao;
                            const despesas = l.despesa_administrativa + l.comissao + l.frete + l.outros + l.despesa_financeira + l.provisao_ir;
                            return (
                              <tr key={`${l.source_id}-${l.source_item}`}>
                                <td>{l.source_id}/{l.source_item}</td>
                                <td>{l.issue_date.slice(0, 10).split("-").reverse().join("/")}</td>
                                <td>{l.item_code ? <EntityName code={l.item_code} loader={loadItems} prefix="Item" /> : "—"}</td>
                                <td className="num">{dinheiro(l.faturamento_mercadoria)}</td>
                                <td className="num">{dinheiro(impostos)}</td>
                                <td className="num">{dinheiro(custo)}</td>
                                <td className="num">{dinheiro(despesas)}</td>
                                <td className="num" style={{ color: corDaMargem(l.margem_pct), fontWeight: 600 }}>{dinheiro(l.margem)}</td>
                                <td className="num" style={{ color: corDaMargem(l.margem_pct), fontWeight: 600 }}>{pct(l.margem_pct)}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Linhas: <strong>{linhas.length}</strong></div>
        {resumo && <div className="erp-status-item">Base de custo: <strong>{resumo.cost_basis === "MEDIO" ? "Custo médio" : "Custo padrão"}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
