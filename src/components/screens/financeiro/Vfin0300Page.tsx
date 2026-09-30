import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type FluxoCaixaItem, type FluxoProjetadoItem, type SaldoConta, type ContaBancaria,
  getFluxoCaixa, getFluxoProjetado, getSaldoContas, listContasBancarias,
} from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadBankAccounts } from "@/services/lookups";

/**
 * VFIN0300 — Fluxo de Caixa & Saldos.
 *
 * Três visões: o REALIZADO (o que entrou e saiu), o PROJETADO (o que vence a
 * partir de uma data) e o SALDO de cada conta bancária.
 *
 * ── O que estava quebrado ──
 * `erp-fieldset-body` é uma grade de 12 colunas, e a tela punha o gráfico, os
 * indicadores e as TABELAS diretamente dentro dela sem `erp-cN`. Cada um virava um
 * item de uma coluna de doze: gráfico e tabelas apareciam comprimidos numa faixa
 * estreita. Havia ainda duas barras de abas empilhadas, e o rodapé mostrava o
 * identificador interno da aba ("realizado") em vez do nome dela.
 *
 * ── O que faltava ──
 * Filtro por conta bancária (a empresa tem mais de uma, e "o caixa" sozinho não
 * responde nada), filtro por tipo de movimento, e totais na visão projetada.
 */

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "realizado" | "projetado" | "saldos";
type Grouping = "dia" | "semana" | "mes";

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ROTULO_DA_ABA: Record<Tab, string> = {
  realizado: "Realizado",
  projetado: "Projetado",
  saldos: "Saldos das contas",
};

/** Entrada × saída pelo tipo do movimento, num só lugar: a regra estava repetida
 *  em quatro pontos da tela e bastava divergir num deles para o total mentir. */
function ehEntrada(tipo: string): boolean {
  const t = (tipo || "").toUpperCase();
  return t.includes("ENTRADA") || t.includes("RECEBER") || t.includes("CREDIT") || t.includes("RECEBIMENTO");
}

type ChartPoint = { label: string; entradas: number; saidas: number; saldo: number };

function dateKey(raw: string, grouping: Grouping): string {
  const date = new Date(`${raw.slice(0, 10)}T12:00:00`);
  if (grouping === "mes") return raw.slice(0, 7);
  if (grouping === "semana") {
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
    return date.toISOString().slice(0, 10);
  }
  return raw.slice(0, 10);
}

/**
 * Agrupa os movimentos e acumula o saldo. Soma em CENTAVOS e divide no fim: somar
 * float real acumula erro de arredondamento e o saldo do último dia sai com
 * centavo que não existe em nenhum lançamento.
 */
function chartData(items: Array<{ date: string; type: string; value: number }>, grouping: Grouping): ChartPoint[] {
  const groups = new Map<string, { entradas: number; saidas: number }>();
  items.forEach((item) => {
    const key = dateKey(item.date, grouping);
    const current = groups.get(key) ?? { entradas: 0, saidas: 0 };
    const cents = Math.round(item.value * 100);
    if (ehEntrada(item.type)) current.entradas += cents;
    else current.saidas += cents;
    groups.set(key, current);
  });
  let balance = 0;
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, amounts]) => {
      balance += amounts.entradas - amounts.saidas;
      return { label, entradas: amounts.entradas / 100, saidas: amounts.saidas / 100, saldo: balance / 100 };
    });
}

function CashChart({ points }: { points: ChartPoint[] }): JSX.Element {
  if (!points.length) {
    return <div className="erp-grid-empty">Sem movimento no período para montar o gráfico.</div>;
  }
  const maximum = Math.max(1, ...points.flatMap((p) => [p.entradas, p.saidas, Math.abs(p.saldo)]));
  return (
    <div className="erp-cash-chart" role="img" aria-label="Gráfico de entradas, saídas e saldo acumulado">
      {points.map((point) => (
        <div className="erp-cash-column" key={point.label}
          title={`${point.label}: entradas ${money(point.entradas)}, saídas ${money(point.saidas)}, saldo acumulado ${money(point.saldo)}`}>
          <div className="erp-cash-bars">
            <span className="erp-cash-bar in" style={{ height: `${Math.max(3, (point.entradas / maximum) * 100)}%` }} />
            <span className="erp-cash-bar out" style={{ height: `${Math.max(3, (point.saidas / maximum) * 100)}%` }} />
          </div>
          <strong>{point.label.length > 7 ? point.label.slice(5) : point.label}</strong>
          <small>Saldo {money(point.saldo)}</small>
        </div>
      ))}
    </div>
  );
}

function firstDayOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function lastDayOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); }

function tipoPill(t: string): JSX.Element {
  return <span className={`erp-badge ${ehEntrada(t) ? "erp-badge-green" : "erp-badge-red"}`}>{t || "—"}</span>;
}

export function Vfin0300Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("realizado");
  const [start, setStart] = useState(firstDayOfMonth());
  const [end, setEnd] = useState(lastDayOfMonth());
  const [realizado, setRealizado] = useState<FluxoCaixaItem[]>([]);
  const [projetado, setProjetado] = useState<FluxoProjetadoItem[]>([]);
  const [saldos, setSaldos] = useState<SaldoConta[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [grouping, setGrouping] = useState<Grouping>("dia");

  // Filtros que a tela não tinha. A conta bancária é o principal: com duas ou mais
  // contas, "o caixa" somado não responde se há saldo NA conta de onde o pagamento
  // vai sair.
  const [contaFiltro, setContaFiltro] = useState<number | undefined>();
  const [tipoFiltro, setTipoFiltro] = useState<"" | "entrada" | "saida">("");
  const [busca, setBusca] = useState("");

  const reload = useCallback(async () => {
    setBusy(true); setFeedback(null);
    try {
      if (tab === "realizado") setRealizado(await getFluxoCaixa(start, end));
      else if (tab === "projetado") setProjetado(await getFluxoProjetado(start));
      else setSaldos(await getSaldoContas());
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar o fluxo de caixa.") });
    } finally { setBusy(false); }
  }, [tab, start, end]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    // O cadastro das contas serve ao filtro e a nomear a conta na listagem. Falha
    // aqui não impede consultar o fluxo — só deixa o filtro sem opções.
    void listContasBancarias().then(setContas).catch(() => setContas([]));
  }, []);

  const nomeDaConta = useCallback((id?: number) => {
    if (!id) return "—";
    const c = contas.find((x) => x.id === id);
    return c ? (c.descricao || `${c.banco} ${c.conta}`) : `Conta ${id}`;
  }, [contas]);

  /** O filtro é aplicado na tela: o endpoint de fluxo não recebe conta nem tipo,
   *  e trazer tudo para filtrar aqui responde na hora sem mudar o contrato. */
  const realizadoFiltrado = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return realizado.filter((r) => {
      if (contaFiltro && r.conta_bancaria_id !== contaFiltro) return false;
      if (tipoFiltro === "entrada" && !ehEntrada(r.tipo)) return false;
      if (tipoFiltro === "saida" && ehEntrada(r.tipo)) return false;
      if (termo && !(r.descricao ?? "").toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [realizado, contaFiltro, tipoFiltro, busca]);

  const projetadoFiltrado = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return projetado.filter((r) => {
      if (tipoFiltro === "entrada" && !ehEntrada(r.tipo)) return false;
      if (tipoFiltro === "saida" && ehEntrada(r.tipo)) return false;
      if (termo && !(r.descricao ?? "").toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [projetado, tipoFiltro, busca]);

  const entradas = realizadoFiltrado.filter((r) => ehEntrada(r.tipo)).reduce((s, r) => s + r.valor, 0);
  const saidas = realizadoFiltrado.filter((r) => !ehEntrada(r.tipo)).reduce((s, r) => s + r.valor, 0);
  const entradasPrev = projetadoFiltrado.filter((r) => ehEntrada(r.tipo)).reduce((s, r) => s + r.valor, 0);
  const saidasPrev = projetadoFiltrado.filter((r) => !ehEntrada(r.tipo)).reduce((s, r) => s + r.valor, 0);
  const totalSaldos = saldos.reduce((s, c) => s + c.saldo_atual, 0);

  const points = chartData(
    tab === "realizado"
      ? realizadoFiltrado.map((i) => ({ date: i.data, type: i.tipo, value: i.valor }))
      : projetadoFiltrado.map((i) => ({ date: i.data_vencimento, type: i.tipo, value: i.valor })),
    grouping,
  );

  const temFiltro = !!contaFiltro || !!tipoFiltro || !!busca.trim();

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Fluxo de Caixa &amp; Saldos</span>
          <span className="erp-crumb-code">VFIN0300</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{ROTULO_DA_ABA[tab]}</span>
      </header>

      <div className="erp-toolbar">
        {tab !== "saldos" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">{tab === "realizado" ? "Início" : "A partir de"}</span>
            <input className="erp-input" style={{ width: 150, height: 32 }} type="date"
              value={start} onChange={(e) => setStart(e.target.value)} />
            {tab === "realizado" && (
              <>
                <span className="erp-tgroup-label">Fim</span>
                <input className="erp-input" style={{ width: 150, height: 32 }} type="date"
                  value={end} onChange={(e) => setEnd(e.target.value)} />
              </>
            )}
          </div>
        )}
        {tab !== "saldos" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Agrupar</span>
            <select className="erp-input" style={{ width: 110, height: 32 }} value={grouping}
              onChange={(e) => setGrouping(e.target.value as Grouping)}>
              <option value="dia">Dia</option><option value="semana">Semana</option><option value="mes">Mês</option>
            </select>
          </div>
        )}
        <div className="erp-tspacer" />
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void reload()} disabled={busy}>
            {busy ? <><span className="erp-spin" />Carregando…</> : "Consultar"}
          </button>
          <ExportButton title="VFIN0300 — Fluxo de Caixa & Saldos" filename="fluxo-de-caixa" disabled={busy}
            subtitle={tab === "saldos" ? "Saldos das contas" : `Período: ${start}${tab === "realizado" ? ` a ${end}` : " em diante"}`}
            meta={{
              visao: ROTULO_DA_ABA[tab],
              conta: contaFiltro ? nomeDaConta(contaFiltro) : "todas",
              tipo: tipoFiltro || "todos",
            }} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs" role="tablist" aria-label="Visões do fluxo de caixa">
            {(Object.keys(ROTULO_DA_ABA) as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t}
                className={`erp-tab${tab === t ? " active" : ""}`}
                onClick={() => { setTab(t); setFeedback(null); }}>
                {ROTULO_DA_ABA[t]}
              </button>
            ))}
          </div>

          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {tab !== "saldos" && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">
                  Recortes
                  {temFiltro && <span style={{ fontWeight: 400, opacity: 0.65 }}> — filtro aplicado</span>}
                </div>
                <div className="erp-fieldset-body">
                  {tab === "realizado" && (
                    <div className="erp-field erp-c4">
                      <label className="erp-label">Conta bancária</label>
                      <LookupField value={contaFiltro} loader={loadBankAccounts} entityLabel="conta bancária"
                        placeholder="Todas as contas" clearable
                        onChange={(c) => setContaFiltro(c ? Number(c) : undefined)} />
                      <span className="erp-hint">Com mais de uma conta, o caixa somado não diz se há saldo onde o pagamento sai.</span>
                    </div>
                  )}
                  <div className="erp-field erp-c3">
                    <label className="erp-label">Tipo de movimento</label>
                    <select className="erp-input" value={tipoFiltro}
                      onChange={(e) => setTipoFiltro(e.target.value as typeof tipoFiltro)}>
                      <option value="">Entradas e saídas</option>
                      <option value="entrada">Só entradas</option>
                      <option value="saida">Só saídas</option>
                    </select>
                  </div>
                  <div className="erp-field erp-c4">
                    <label className="erp-label">Buscar no histórico</label>
                    <input className="erp-input" value={busca} placeholder="cliente, fornecedor, documento"
                      onChange={(e) => setBusca(e.target.value)} />
                  </div>
                  {temFiltro && (
                    <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn" style={{ width: "100%" }}
                        onClick={() => { setContaFiltro(undefined); setTipoFiltro(""); setBusca(""); }}>Limpar</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "realizado" && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Entradas e saídas no período</div>
                  <div className="erp-fieldset-body">
                    {/* erp-c12: sem o span o gráfico é comprimido em 1/12 da grade. */}
                    <div className="erp-field erp-c12">
                      <CashChart points={points} />
                      <div className="erp-chart-legend">
                        <span><i className="in" />Entradas</span>
                        <span><i className="out" />Saídas</span>
                        <span>Saldo acumulado no rótulo de cada coluna</span>
                      </div>
                    </div>
                    <div className="erp-field erp-c12">
                      <div className="erp-metrics">
                        <div className="erp-metric">
                          <div className="erp-metric-label">Entradas</div>
                          <div className="erp-metric-value erp-metric-ok">{money(entradas)}</div>
                        </div>
                        <div className="erp-metric">
                          <div className="erp-metric-label">Saídas</div>
                          <div className="erp-metric-value erp-metric-danger">{money(saidas)}</div>
                        </div>
                        <div className="erp-metric">
                          <div className="erp-metric-label">Saldo do período</div>
                          <div className={`erp-metric-value ${entradas - saidas < 0 ? "erp-metric-danger" : "erp-metric-ok"}`}>
                            {money(entradas - saidas)}
                          </div>
                        </div>
                        <div className="erp-metric">
                          <div className="erp-metric-label">Lançamentos</div>
                          <div className="erp-metric-value">{realizadoFiltrado.length}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Lançamentos
                    <span style={{ fontWeight: 400, opacity: 0.65 }}>
                      {` — ${realizadoFiltrado.length}${temFiltro ? ` de ${realizado.length}` : ""}`}
                    </span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead>
                          <tr>
                            <th>Data</th><th>Tipo</th><th>Histórico</th><th>Conta</th>
                            <th>Conciliado</th><th className="num">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {realizadoFiltrado.length === 0 && (
                            <tr><td colSpan={6} className="erp-grid-empty">
                              {realizado.length === 0 ? "Nenhum lançamento no período." : "Nenhum lançamento corresponde ao filtro."}
                            </td></tr>
                          )}
                          {realizadoFiltrado.map((r, i) => (
                            <tr key={`${r.data}-${i}`}>
                              <td>{r.data?.slice(0, 10)}</td>
                              <td>{tipoPill(r.tipo)}</td>
                              <td>{r.descricao || "—"}</td>
                              <td>{nomeDaConta(r.conta_bancaria_id)}</td>
                              <td>{r.conciliado
                                ? <span className="erp-badge erp-badge-green">Sim</span>
                                : <span className="erp-badge erp-badge-gray">Não</span>}</td>
                              <td className={`num ${ehEntrada(r.tipo) ? "" : "erp-cell-danger"}`}>{money(r.valor)}</td>
                            </tr>
                          ))}
                        </tbody>
                        {realizadoFiltrado.length > 0 && (
                          <tfoot>
                            <tr>
                              <td colSpan={5}>Saldo do período</td>
                              <td className="num">{money(entradas - saidas)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === "projetado" && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Previsão a partir de {start}</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12">
                      <CashChart points={points} />
                      <div className="erp-chart-legend">
                        <span><i className="in" />Entradas previstas</span>
                        <span><i className="out" />Saídas previstas</span>
                        <span>Saldo projetado acumulado</span>
                      </div>
                    </div>
                    {/* A visão projetada não tinha totais: o gráfico mostrava a
                        curva e ninguém sabia o número. */}
                    <div className="erp-field erp-c12">
                      <div className="erp-metrics">
                        <div className="erp-metric">
                          <div className="erp-metric-label">A receber</div>
                          <div className="erp-metric-value erp-metric-ok">{money(entradasPrev)}</div>
                        </div>
                        <div className="erp-metric">
                          <div className="erp-metric-label">A pagar</div>
                          <div className="erp-metric-value erp-metric-danger">{money(saidasPrev)}</div>
                        </div>
                        <div className="erp-metric">
                          <div className="erp-metric-label">Saldo projetado</div>
                          <div className={`erp-metric-value ${entradasPrev - saidasPrev < 0 ? "erp-metric-danger" : "erp-metric-ok"}`}>
                            {money(entradasPrev - saidasPrev)}
                          </div>
                        </div>
                        <div className="erp-metric">
                          <div className="erp-metric-label">Títulos</div>
                          <div className="erp-metric-value">{projetadoFiltrado.length}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Títulos previstos
                    <span style={{ fontWeight: 400, opacity: 0.65 }}>
                      {` — ${projetadoFiltrado.length}${temFiltro ? ` de ${projetado.length}` : ""}`}
                    </span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead><tr><th>Vencimento</th><th>Tipo</th><th>Histórico</th><th className="num">Valor</th></tr></thead>
                        <tbody>
                          {projetadoFiltrado.length === 0 && (
                            <tr><td colSpan={4} className="erp-grid-empty">
                              {projetado.length === 0 ? "Nenhum título a vencer a partir da data." : "Nenhum título corresponde ao filtro."}
                            </td></tr>
                          )}
                          {projetadoFiltrado.map((r, i) => (
                            <tr key={`${r.data_vencimento}-${i}`}>
                              <td>{r.data_vencimento?.slice(0, 10)}</td>
                              <td>{tipoPill(r.tipo)}</td>
                              <td>{r.descricao || "—"}</td>
                              <td className={`num ${ehEntrada(r.tipo) ? "" : "erp-cell-danger"}`}>{money(r.valor)}</td>
                            </tr>
                          ))}
                        </tbody>
                        {projetadoFiltrado.length > 0 && (
                          <tfoot>
                            <tr><td colSpan={3}>Saldo projetado</td><td className="num">{money(entradasPrev - saidasPrev)}</td></tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === "saldos" && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Saldo por conta bancária</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12">
                    <div className="erp-metrics">
                      <div className="erp-metric">
                        <div className="erp-metric-label">Contas</div>
                        <div className="erp-metric-value">{saldos.length}</div>
                      </div>
                      <div className="erp-metric">
                        <div className="erp-metric-label">Saldo total</div>
                        <div className={`erp-metric-value ${totalSaldos < 0 ? "erp-metric-danger" : "erp-metric-ok"}`}>
                          {money(totalSaldos)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th>Banco</th><th>Descrição</th><th className="num">Saldo atual</th></tr></thead>
                      <tbody>
                        {saldos.length === 0 && (
                          <tr><td colSpan={3} className="erp-grid-empty">
                            Nenhuma conta bancária cadastrada. Cadastre em VFIN0100 para conciliar e baixar títulos.
                          </td></tr>
                        )}
                        {saldos.map((c) => (
                          <tr key={c.id}>
                            <td style={{ fontWeight: 600 }}>{c.banco}</td>
                            <td>{c.descricao || "—"}</td>
                            <td className={`num ${c.saldo_atual < 0 ? "erp-cell-danger" : ""}`}>{money(c.saldo_atual)}</td>
                          </tr>
                        ))}
                      </tbody>
                      {saldos.length > 0 && (
                        <tfoot><tr><td colSpan={2}>Total</td><td className="num">{money(totalSaldos)}</td></tr></tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Visão: <strong>{ROTULO_DA_ABA[tab]}</strong></div>
        {tab === "realizado" && <div className="erp-status-item">Saldo do período: <strong>{money(entradas - saidas)}</strong></div>}
        {tab === "projetado" && <div className="erp-status-item">Saldo projetado: <strong>{money(entradasPrev - saidasPrev)}</strong></div>}
        {tab === "saldos" && <div className="erp-status-item">Saldo total: <strong>{money(totalSaldos)}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
