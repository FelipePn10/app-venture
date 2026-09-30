import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type Adiantamento, type AdiantamentoDTO, type AdiantamentoTipo,
  ADIANTAMENTO_TIPOS, ADIANTAMENTO_TIPO_LABELS, ADIANTAMENTO_STATUS_LABELS,
  listAdiantamentos, createAdiantamento, aplicarAdiantamento, tipoDeTituloDoAdiantamento,
} from "@/services/adiantamentoService";
import {
  type ContaPagar, type ContaReceber,
  listContasPagar, listContasReceber, estaEmAberto,
} from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadCustomers, loadSuppliers, loadBankAccounts } from "@/services/lookups";

/**
 * VFIN0600 — Adiantamentos de Clientes e Fornecedores.
 *
 * Um adiantamento é dinheiro que mudou de mãos ANTES de existir título: pagamento
 * antecipado a fornecedor ou recebimento antecipado de cliente. O caixa se move no
 * registro; o saldo fica guardado para abater títulos depois.
 *
 * ── O que esta tela substitui ──
 * A rotina anterior era um formulário JSON genérico: a pessoa digitava
 * `{"tipo":"PAGAR","conta_bancaria_id":1,...}` à mão, sem lista de saldos, sem
 * escolher a conta bancária numa busca e sem saber em qual título aplicar. Registrar
 * era possível; USAR o saldo, na prática, não.
 *
 * ── A regra que a tela protege ──
 * Adiantamento PAGO a fornecedor só abate conta a PAGAR; RECEBIDO de cliente só
 * abate conta a RECEBER. Cruzar os dois abateria a dívida com um parceiro usando o
 * crédito de outro — por isso a lista de títulos elegíveis já vem do lado certo.
 */

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY: AdiantamentoDTO = {
  tipo: "RECEBER", conta_bancaria_id: 0, data_adiantamento: today(), valor_original: 0,
};

function statusPill(s: string): JSX.Element {
  const x = (s || "").toUpperCase();
  const cls = x === "QUITADO" ? "erp-badge-gray" : x === "PARCIAL" ? "erp-badge-blue"
    : x === "CANCELADO" ? "erp-badge-red" : "erp-badge-green";
  return <span className={`erp-badge ${cls}`}>{ADIANTAMENTO_STATUS_LABELS[x as keyof typeof ADIANTAMENTO_STATUS_LABELS] ?? s}</span>;
}

/** Um título elegível para receber a aplicação, dos dois lados unificados. */
type TituloElegivel = {
  id: number;
  documento: string;
  vencimento: string;
  saldo: number;
  parceiroID?: number;
};

export function Vfin0600Page(): JSX.Element {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [form, setForm] = useState<AdiantamentoDTO>(EMPTY);
  const [lista, setLista] = useState<Adiantamento[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<"" | AdiantamentoTipo>("");
  const [parceiroFiltro, setParceiroFiltro] = useState<number | undefined>();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  // Aplicação: o adiantamento escolhido e os títulos do lado certo dele.
  const [aplicando, setAplicando] = useState<Adiantamento | null>(null);
  const [titulos, setTitulos] = useState<TituloElegivel[]>([]);
  const [tituloEscolhido, setTituloEscolhido] = useState<number>(0);
  const [valorAplicar, setValorAplicar] = useState("");
  const [dataAplicacao, setDataAplicacao] = useState(today());

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      setLista(await listAdiantamentos({
        tipo: tipoFiltro || undefined,
        parceiro_id: parceiroFiltro,
      }));
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao listar os adiantamentos.") });
    } finally { setBusy(false); }
  }, [tipoFiltro, parceiroFiltro]);
  useEffect(() => { void reload(); }, [reload]);

  const totais = useMemo(() => {
    const ativos = lista.filter((a) => a.is_active && a.status !== "CANCELADO");
    const pagar = ativos.filter((a) => a.tipo === "PAGAR");
    const receber = ativos.filter((a) => a.tipo === "RECEBER");
    return {
      saldoPagar: pagar.reduce((s, a) => s + a.saldo, 0),
      saldoReceber: receber.reduce((s, a) => s + a.saldo, 0),
      comSaldo: ativos.filter((a) => a.saldo > 0.005).length,
      total: ativos.length,
    };
  }, [lista]);

  const setF = <K extends keyof AdiantamentoDTO>(k: K, v: AdiantamentoDTO[K]) => {
    setForm((p) => ({ ...p, [k]: v })); setFeedback(null);
  };

  async function salvar() {
    if (!form.conta_bancaria_id) {
      setFeedback({ type: "error", message: form.tipo === "PAGAR"
        ? "Escolha a conta bancária de onde o valor saiu."
        : "Escolha a conta bancária onde o valor entrou." });
      return;
    }
    if (!form.valor_original || form.valor_original <= 0) {
      setFeedback({ type: "error", message: "O valor do adiantamento tem de ser maior que zero." }); return;
    }
    if (!form.parceiro_id) {
      setFeedback({ type: "error", message: form.tipo === "PAGAR"
        ? "Escolha o fornecedor que recebeu o adiantamento."
        : "Escolha o cliente que adiantou o valor." });
      return;
    }
    if (form.data_adiantamento > today()) {
      setFeedback({ type: "error", message: "A data do adiantamento está no futuro: o caixa se move no registro." }); return;
    }
    setBusy(true); setFeedback(null);
    try {
      const criado = await createAdiantamento(form);
      setFeedback({
        type: "success",
        message: `Adiantamento de ${money(criado.valor_original)} registrado. O saldo já está disponível para abater ${
          criado.tipo === "PAGAR" ? "contas a pagar" : "contas a receber"} deste parceiro.`,
      });
      setForm(EMPTY); setMode("list"); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  /**
   * Abre a aplicação e carrega SÓ os títulos do lado certo e do mesmo parceiro:
   * oferecer a carteira inteira convida a abater a dívida de um fornecedor com o
   * crédito de outro.
   */
  const abrirAplicacao = (a: Adiantamento) => {
    setAplicando(a);
    setTituloEscolhido(0);
    setValorAplicar(a.saldo.toFixed(2));
    setDataAplicacao(today());
    setFeedback(null);
    setBusy(true);
    const lado = tipoDeTituloDoAdiantamento(a.tipo);
    const carregar = lado === "PAGAR"
      ? listContasPagar({ fornecedor_id: a.parceiro_id }).then((rows: ContaPagar[]) =>
          rows.filter((c) => estaEmAberto(c.status)).map<TituloElegivel>((c) => ({
            id: c.id, documento: c.numero_documento, vencimento: c.data_vencimento,
            saldo: c.valor_bruto - (c.valor_pago ?? 0), parceiroID: c.fornecedor_id,
          })))
      : listContasReceber({ cliente_id: a.parceiro_id }).then((rows: ContaReceber[]) =>
          rows.filter((c) => estaEmAberto(c.status)).map<TituloElegivel>((c) => ({
            id: c.id, documento: c.numero_documento, vencimento: c.data_vencimento,
            saldo: c.valor_bruto - (c.valor_recebido ?? 0), parceiroID: c.cliente_id,
          })));
    void carregar
      .then((rows) => {
        setTitulos(rows.filter((t) => t.saldo > 0.005));
        if (rows.length === 0) {
          setFeedback({
            type: "info",
            message: `Este parceiro não tem título em aberto do lado ${lado === "PAGAR" ? "a pagar" : "a receber"}. O saldo do adiantamento continua guardado.`,
          });
        }
      })
      .catch((e) => setFeedback({ type: "error", message: errMessage(e, "Falha ao listar os títulos do parceiro.") }))
      .finally(() => setBusy(false));
  };

  async function confirmarAplicacao() {
    if (!aplicando) return;
    if (!tituloEscolhido) { setFeedback({ type: "error", message: "Escolha o título que o saldo vai abater." }); return; }
    const valor = Number(valorAplicar.replace(",", "."));
    if (!valor || valor <= 0) { setFeedback({ type: "error", message: "Informe o valor a aplicar." }); return; }
    if (valor > aplicando.saldo + 0.005) {
      setFeedback({ type: "error", message: `O valor (${money(valor)}) passa do saldo do adiantamento (${money(aplicando.saldo)}).` });
      return;
    }
    const titulo = titulos.find((t) => t.id === tituloEscolhido);
    if (titulo && valor > titulo.saldo + 0.005) {
      setFeedback({ type: "error", message: `O valor (${money(valor)}) passa do saldo do título ${titulo.documento} (${money(titulo.saldo)}).` });
      return;
    }
    setBusy(true); setFeedback(null);
    try {
      await aplicarAdiantamento(aplicando.id, {
        conta_tipo: tipoDeTituloDoAdiantamento(aplicando.tipo),
        conta_id: tituloEscolhido,
        valor,
        data_aplicacao: dataAplicacao,
      });
      const restante = aplicando.saldo - valor;
      setFeedback({
        type: "success",
        message: restante > 0.005
          ? `${money(valor)} aplicados no título ${titulo?.documento ?? tituloEscolhido}. Saldo restante do adiantamento: ${money(restante)}.`
          : `${money(valor)} aplicados no título ${titulo?.documento ?? tituloEscolhido}. O adiantamento foi todo utilizado.`,
      });
      setAplicando(null); setTitulos([]); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const parceiroLoader = form.tipo === "PAGAR" ? loadSuppliers : loadCustomers;
  const temFiltro = !!tipoFiltro || !!parceiroFiltro;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Adiantamentos</span>
          <span className="erp-crumb-code">VFIN0600</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{mode === "list" ? "Saldos" : "Novo adiantamento"}</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" disabled={busy}
            onClick={() => { setForm(EMPTY); setMode("create"); setFeedback(null); }}>+ Novo adiantamento</button>
          <button className="erp-btn" disabled={busy}
            onClick={() => { setMode("list"); void reload(); }}>Saldos</button>
        </div>
        {mode === "create" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>
              {busy ? <><span className="erp-spin" />Registrando…</> : "Registrar adiantamento"}
            </button>
          </div>
        )}
        <div className="erp-tspacer" />
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIN0600 — Adiantamentos" filename="adiantamentos" disabled={busy}
            subtitle={`${lista.length} adiantamento(s)`}
            meta={{ tipo: tipoFiltro ? ADIANTAMENTO_TIPO_LABELS[tipoFiltro] : "todos" }} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs" role="tablist" aria-label="Adiantamentos">
            <button role="tab" aria-selected={mode === "list"} className={`erp-tab${mode === "list" ? " active" : ""}`}
              onClick={() => { setMode("list"); void reload(); }}>Saldos disponíveis</button>
            <button role="tab" aria-selected={mode === "create"} className={`erp-tab${mode === "create" ? " active" : ""}`}
              onClick={() => { setForm(EMPTY); setMode("create"); setFeedback(null); }}>Novo adiantamento</button>
          </div>

          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {mode === "list" ? (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Saldos em aberto</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12">
                      <div className="erp-metrics">
                        <div className="erp-metric">
                          <div className="erp-metric-label">Adiantado a fornecedores</div>
                          <div className="erp-metric-value">{money(totais.saldoPagar)}</div>
                        </div>
                        <div className="erp-metric">
                          <div className="erp-metric-label">Recebido de clientes</div>
                          <div className="erp-metric-value">{money(totais.saldoReceber)}</div>
                        </div>
                        <div className="erp-metric">
                          <div className="erp-metric-label">Com saldo a aplicar</div>
                          <div className="erp-metric-value">{totais.comSaldo}</div>
                        </div>
                        <div className="erp-metric">
                          <div className="erp-metric-label">Registrados</div>
                          <div className="erp-metric-value">{totais.total}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Filtrar</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c4">
                      <label className="erp-label">Tipo</label>
                      <select className="erp-input" value={tipoFiltro}
                        onChange={(e) => setTipoFiltro(e.target.value as typeof tipoFiltro)}>
                        <option value="">Fornecedores e clientes</option>
                        {ADIANTAMENTO_TIPOS.map((t) => (
                          <option key={t} value={t}>{ADIANTAMENTO_TIPO_LABELS[t]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="erp-field erp-c4">
                      <label className="erp-label">Parceiro</label>
                      <LookupField value={parceiroFiltro}
                        loader={tipoFiltro === "PAGAR" ? loadSuppliers : loadCustomers}
                        entityLabel={tipoFiltro === "PAGAR" ? "fornecedor" : "cliente"}
                        placeholder="Todos" clearable
                        onChange={(c) => setParceiroFiltro(c ? Number(c) : undefined)} />
                      {!tipoFiltro && (
                        <span className="erp-hint">Escolha o tipo primeiro para buscar na lista certa.</span>
                      )}
                    </div>
                    <div className="erp-field erp-c4" style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" onClick={() => void reload()} disabled={busy}>
                        {busy ? <><span className="erp-spin" />Consultando…</> : "Aplicar filtro"}
                      </button>
                      <button className="erp-btn" disabled={busy || !temFiltro}
                        onClick={() => { setTipoFiltro(""); setParceiroFiltro(undefined); }}>Limpar</button>
                    </div>
                  </div>
                </div>

                {aplicando && (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      Aplicar o saldo do adiantamento #{aplicando.id}
                      <span style={{ fontWeight: 400, opacity: 0.65 }}>{` — saldo ${money(aplicando.saldo)}`}</span>
                    </div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c5">
                        <label className="erp-label erp-req">
                          Título a abater ({tipoDeTituloDoAdiantamento(aplicando.tipo) === "PAGAR" ? "contas a pagar" : "contas a receber"})
                        </label>
                        <select className="erp-input" value={tituloEscolhido}
                          onChange={(e) => {
                            const id = Number(e.target.value);
                            setTituloEscolhido(id);
                            // Propõe o menor entre o saldo do adiantamento e o do
                            // título: qualquer valor acima de um dos dois é recusado.
                            const t = titulos.find((x) => x.id === id);
                            if (t) setValorAplicar(Math.min(t.saldo, aplicando.saldo).toFixed(2));
                          }}>
                          <option value={0}>— escolha o título —</option>
                          {titulos.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.documento} · vence {t.vencimento?.slice(0, 10)} · saldo {money(t.saldo)}
                            </option>
                          ))}
                        </select>
                        <span className="erp-hint">
                          Só títulos em aberto deste parceiro e deste lado da operação aparecem aqui.
                        </span>
                      </div>
                      <div className="erp-field erp-c2">
                        <label className="erp-label erp-req">Valor a aplicar</label>
                        <input className="erp-input num" type="number" step="0.01" min="0" value={valorAplicar}
                          onChange={(e) => setValorAplicar(e.target.value)} />
                      </div>
                      <div className="erp-field erp-c2">
                        <label className="erp-label">Data</label>
                        <input className="erp-input" type="date" value={dataAplicacao}
                          onChange={(e) => setDataAplicacao(e.target.value)} />
                      </div>
                      <div className="erp-field erp-c3" style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                        <button className="erp-btn erp-btn-primary" onClick={() => void confirmarAplicacao()}
                          disabled={busy || !titulos.length}>Aplicar</button>
                        <button className="erp-btn" onClick={() => { setAplicando(null); setTitulos([]); setFeedback(null); }}
                          disabled={busy}>Desistir</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Adiantamentos
                    <span style={{ fontWeight: 400, opacity: 0.65 }}>{` — ${lista.length}`}</span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead>
                          <tr>
                            <th>#</th><th>Tipo</th><th>Parceiro</th><th>Documento</th><th>Data</th>
                            <th className="num">Valor</th><th className="num">Aplicado</th><th className="num">Saldo</th>
                            <th>Situação</th><th style={{ width: 120 }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lista.length === 0 && (
                            <tr><td colSpan={10} className="erp-grid-empty">
                              {temFiltro ? "Nenhum adiantamento corresponde ao filtro."
                                : "Nenhum adiantamento registrado. Registre quando o dinheiro mudar de mãos antes do título existir."}
                            </td></tr>
                          )}
                          {lista.map((a) => (
                            <tr key={a.id} className={a.status === "CANCELADO" ? "erp-row-muted" : undefined}>
                              <td style={{ fontWeight: 600 }}>{a.id}</td>
                              <td>{a.tipo === "PAGAR" ? "A fornecedor" : "De cliente"}</td>
                              <td>{a.parceiro_id
                                ? <EntityName code={a.parceiro_id} loader={a.tipo === "PAGAR" ? loadSuppliers : loadCustomers} />
                                : "—"}</td>
                              <td>{a.numero_documento || "—"}</td>
                              <td>{a.data_adiantamento?.slice(0, 10)}</td>
                              <td className="num">{money(a.valor_original)}</td>
                              <td className="num">{money(a.valor_utilizado)}</td>
                              <td className="num">{money(a.saldo)}</td>
                              <td>{statusPill(a.status)}</td>
                              <td>
                                {a.saldo > 0.005 && a.status !== "CANCELADO" && (
                                  <button className="erp-btn erp-btn-sm" disabled={busy}
                                    onClick={() => abrirAplicacao(a)}>Aplicar</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {lista.length > 0 && (
                          <tfoot>
                            <tr>
                              <td colSpan={5}>{lista.length} adiantamento(s)</td>
                              <td className="num">{money(lista.reduce((s, a) => s + a.valor_original, 0))}</td>
                              <td className="num">{money(lista.reduce((s, a) => s + a.valor_utilizado, 0))}</td>
                              <td className="num">{money(lista.reduce((s, a) => s + a.saldo, 0))}</td>
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
                <div className="erp-fieldset-head">Dados do adiantamento</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c5">
                    <label className="erp-label erp-req">Tipo de adiantamento</label>
                    <select className="erp-input" value={form.tipo}
                      onChange={(e) => {
                        // Trocar o tipo troca o lado da operação: o parceiro escolhido
                        // deixa de existir na lista certa e tem de ser limpo.
                        setForm((p) => ({ ...p, tipo: e.target.value as AdiantamentoTipo, parceiro_id: undefined }));
                        setFeedback(null);
                      }}>
                      {ADIANTAMENTO_TIPOS.map((t) => (
                        <option key={t} value={t}>{ADIANTAMENTO_TIPO_LABELS[t]}</option>
                      ))}
                    </select>
                    <span className="erp-hint">
                      {form.tipo === "PAGAR"
                        ? "O valor SAI da conta bancária agora e vira crédito com o fornecedor."
                        : "O valor ENTRA na conta bancária agora e vira obrigação com o cliente."}
                    </span>
                  </div>
                  <div className="erp-field erp-c4">
                    <label className="erp-label erp-req">{form.tipo === "PAGAR" ? "Fornecedor" : "Cliente"}</label>
                    <LookupField value={form.parceiro_id} loader={parceiroLoader}
                      entityLabel={form.tipo === "PAGAR" ? "fornecedor" : "cliente"}
                      placeholder={`Escolher ${form.tipo === "PAGAR" ? "fornecedor" : "cliente"}`} clearable
                      onChange={(c) => setF("parceiro_id", c ? Number(c) : undefined)} />
                    <span className="erp-hint">O saldo só abate títulos deste parceiro.</span>
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label erp-req">
                      {form.tipo === "PAGAR" ? "Conta bancária de onde sai" : "Conta bancária onde entra"}
                    </label>
                    <LookupField value={form.conta_bancaria_id || undefined} loader={loadBankAccounts}
                      entityLabel="conta bancária" placeholder="Escolher a conta" allowManualCode={false}
                      onChange={(c) => setF("conta_bancaria_id", c ? Number(c) : 0)} />
                  </div>

                  <div className="erp-field erp-c3">
                    <label className="erp-label erp-req">Valor do adiantamento</label>
                    <input className="erp-input num" type="number" step="0.01" min="0" value={form.valor_original || ""}
                      onChange={(e) => setF("valor_original", Number(e.target.value))} />
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label erp-req">Data</label>
                    <input className="erp-input" type="date" max={today()} value={form.data_adiantamento}
                      onChange={(e) => setF("data_adiantamento", e.target.value)} />
                    <span className="erp-hint">O movimento de caixa acontece nesta data.</span>
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label">Documento</label>
                    <input className="erp-input" value={form.numero_documento ?? ""} placeholder="Recibo, contrato, comprovante"
                      onChange={(e) => setF("numero_documento", e.target.value || undefined)} />
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label">Descrição</label>
                    <input className="erp-input" value={form.descricao ?? ""} placeholder="A que a antecipação se refere"
                      onChange={(e) => setF("descricao", e.target.value || undefined)} />
                  </div>
                  <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                    <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>
                      {busy ? <><span className="erp-spin" />Registrando…</> : "Registrar adiantamento"}
                    </button>
                    <button className="erp-btn" onClick={() => { setForm(EMPTY); setFeedback(null); }} disabled={busy}>Limpar</button>
                  </div>
                  <div className="erp-field erp-c12">
                    <span className="erp-hint">
                      Registrar move o caixa imediatamente. O saldo fica disponível na aba de saldos e é aplicado
                      em um ou mais títulos depois — um adiantamento grande pode abater vários títulos ao longo do tempo.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">A fornecedores: <strong>{money(totais.saldoPagar)}</strong></div>
        <div className="erp-status-item">De clientes: <strong>{money(totais.saldoReceber)}</strong></div>
        <div className="erp-status-item">Com saldo: <strong>{totais.comSaldo}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
