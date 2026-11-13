import { useState, useCallback, useEffect, useRef } from "react";
import { confirmar, pedirTexto } from "@/components/ui/dialogos";
import {
  type ImportacaoOFX, type ConferenciaDoOFX, type ContaBancaria,
  type ExtratoDaConta, type LinhaExtrato, type SituacaoExtrato, type CandidatoConciliacao,
  importarOFX, conferirArquivoOFX, listContasBancarias,
  getExtratoDaConta, getCandidatosConciliacao, conciliarLinhaExtrato,
  lancarLinhaExtrato, desfazerConciliacao, autoConciliar,
} from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadBankAccounts } from "@/services/lookups";

/**
 * VFIN0620 — Conciliação Bancária por OFX.
 *
 * Duas etapas, uma aba cada: IMPORTAR o extrato da conta e CONCILIAR cada linha
 * com o movimento do caixa — o pagamento ou recebimento baixado na conta, ou um
 * movimento novo para o que não tem título (tarifa, IOF, aplicação, resgate).
 *
 * ── O defeito que esta tela corrige ──
 * Só existia a importação. As linhas entravam no sistema e nenhuma tela as
 * mostrava; o texto daqui dizia que os pendentes apareciam no fluxo de caixa
 * (VFIN0300), e não apareciam — o extrato nunca entra no fluxo sozinho. Quem
 * importava via "0 conciliados" e concluía que a importação tinha falhado.
 *
 * O arquivo é conferido em dois pontos: aqui, ao escolher (resposta imediata), e
 * no servidor, que é a validação que vale. A checagem é por ESTRUTURA, não por
 * extensão — `.ofx` é só um nome, e um PDF renomeado passaria.
 */

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "importar" | "extrato";

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (iso?: string) => (iso && iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");

export function Vfin0620Page(): JSX.Element {
  const [aba, setAba] = useState<Aba>("importar");
  const [contaID, setContaID] = useState<number | undefined>();
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [arquivo, setArquivo] = useState<{ nome: string; tamanho: number; conteudo: string } | null>(null);
  const [conferencia, setConferencia] = useState<ConferenciaDoOFX | null>(null);
  const [resultado, setResultado] = useState<ImportacaoOFX | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Aba do extrato
  const [situacao, setSituacao] = useState<SituacaoExtrato>("pendente");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [extrato, setExtrato] = useState<ExtratoDaConta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [emConciliacao, setEmConciliacao] = useState<LinhaExtrato | null>(null);

  useEffect(() => {
    void listContasBancarias().then(setContas).catch(() => setContas([]));
  }, []);

  const contaEscolhida = contas.find((c) => c.id === contaID);

  const carregarExtrato = useCallback(async (silencioso = false) => {
    if (!contaID) { setExtrato(null); return; }
    setCarregando(true);
    try {
      setExtrato(await getExtratoDaConta(contaID, { situacao, data_inicio: dataInicio, data_fim: dataFim }));
    } catch (e) {
      setExtrato(null);
      if (!silencioso) setFeedback({ type: "error", message: errMessage(e, "Não foi possível ler o extrato da conta.") });
    } finally { setCarregando(false); }
  }, [contaID, situacao, dataInicio, dataFim]);

  useEffect(() => {
    if (aba === "extrato") void carregarExtrato(true);
  }, [aba, carregarExtrato]);

  const escolherArquivo = useCallback(async (file: File | null) => {
    setResultado(null); setFeedback(null);
    if (!file) { setArquivo(null); setConferencia(null); return; }
    // 8 MB é o teto do servidor. Barrar aqui evita a espera do upload inteiro.
    if (file.size > 8 * 1024 * 1024) {
      setArquivo(null); setConferencia(null);
      setFeedback({ type: "error", message: `O arquivo tem ${(file.size / 1048576).toFixed(1)} MB; o limite é 8 MB. Baixe o extrato de um período menor.` });
      return;
    }
    try {
      const conteudo = await file.text();
      const conf = conferirArquivoOFX(conteudo);
      setArquivo({ nome: file.name, tamanho: file.size, conteudo });
      setConferencia(conf);
      setFeedback(conf.valido ? null : { type: "error", message: conf.motivo ?? "O arquivo não é um extrato OFX." });
    } catch (e) {
      setArquivo(null); setConferencia(null);
      setFeedback({ type: "error", message: errMessage(e, "Não foi possível ler o arquivo.") });
    }
  }, []);

  /** Conta do arquivo × conta escolhida: o erro mais caro desta tela é conciliar o
   *  extrato de uma conta contra os pagamentos de outra. */
  // O banco costuma mandar a conta com o dígito colado e zeros à esquerda (a Caixa
  // manda "0005795827335" para a conta 579582733 dígito 5): confere a conta sozinha
  // e a conta + dígito, senão a conta certa recebe aviso de conta trocada.
  const contaDivergente = !!(conferencia?.valido && conferencia.conta && contaEscolhida
    && !mesmaConta(contaEscolhida.conta, conferencia.conta)
    && !mesmaConta(`${contaEscolhida.conta}${contaEscolhida.digito ?? ""}`, conferencia.conta));

  async function importar() {
    if (!contaID) { setFeedback({ type: "error", message: "Escolha a conta bancária do extrato." }); return; }
    if (!arquivo || !conferencia?.valido) {
      setFeedback({ type: "error", message: "Escolha um arquivo OFX válido antes de importar." }); return;
    }
    if (contaDivergente && !(await confirmar({
      titulo: "Conta diferente da escolhida",
      assunto: `Arquivo: conta ${conferencia.conta} · Escolhida: conta ${contaEscolhida?.conta}`,
      mensagem: "Importar o extrato de uma conta em outra concilia pagamentos com movimentos que nunca existiram ali.",
      rotulo: "Importar mesmo assim", tom: "perigo",
    }))) {
      return;
    }
    setBusy(true); setFeedback(null);
    try {
      const r = await importarOFX(contaID, arquivo.conteudo);
      setResultado(r);
      const partes = [`${r.importados} lançamento(s) importado(s)`];
      if (r.duplicados) partes.push(`${r.duplicados} já estavam no sistema`);
      if (r.conciliados) partes.push(`${r.conciliados} conciliado(s) automaticamente`);
      if (r.ignorados) partes.push(`${r.ignorados} ignorado(s)`);
      const pendente = r.pendentes > 0
        ? ` ${r.pendentes} lançamento(s) da conta aguardam conciliação na aba "Extrato e conciliação".`
        : "";
      setFeedback({
        type: r.importados === 0 && r.duplicados > 0 ? "info" : "success",
        message: `${partes.join(", ")}.${pendente}`,
      });
      void carregarExtrato(true);
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e) });
    } finally { setBusy(false); }
  }

  function limpar() {
    setArquivo(null); setConferencia(null); setResultado(null); setFeedback(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function rodarAutomatico() {
    if (!contaID) return;
    setBusy(true); setFeedback(null);
    try {
      const r = await autoConciliar(contaID);
      setFeedback({
        type: r.conciliados ? "success" : "info",
        message: r.conciliados
          ? `${r.conciliados} lançamento(s) conciliado(s) automaticamente; ${r.pendentes} continuam pendentes.`
          : `Nenhum lançamento novo casou automaticamente; ${r.pendentes} continuam pendentes. `
            + "A conciliação automática procura movimento de mesmo valor e sentido até 3 dias da data do extrato.",
      });
      await carregarExtrato();
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e) });
    } finally { setBusy(false); }
  }

  async function lancar(l: LinhaExtrato) {
    const descricao = await pedirTexto({
      titulo: "Lançar no caixa",
      assunto: `${dataBR(l.data)} · ${l.tipo === "DEBIT" ? "Saída" : "Entrada"} de R$ ${money(l.valor)} · ${l.descricao || "sem histórico"}`,
      mensagem: "Cria o movimento no fluxo de caixa desta conta com a data e o valor do extrato, atualiza o saldo "
        + "e deixa a linha conciliada. Use para o que não tem título: tarifa, IOF, juros, aplicação, resgate, "
        + "transferência entre contas. Pagamento de fornecedor e recebimento de cliente se baixam no título "
        + "(VFIN0200 / VFIN0210) — lançados aqui, o título continua em aberto na carteira.",
      rotulo: "Histórico do movimento",
      valorInicial: l.descricao,
      maximo: 200,
      opcional: true,
      rotuloConfirmar: "Lançar e conciliar",
    });
    if (descricao === null) return;
    setBusy(true); setFeedback(null);
    try {
      await lancarLinhaExtrato(l.id, descricao);
      setEmConciliacao(null);
      setFeedback({ type: "success", message: `Movimento de R$ ${money(l.valor)} lançado no caixa e conciliado.` });
      await carregarExtrato();
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e) });
    } finally { setBusy(false); }
  }

  async function desfazer(l: LinhaExtrato) {
    const ok = await confirmar({
      titulo: "Desfazer conciliação",
      assunto: `${dataBR(l.data)} · R$ ${money(l.valor)} · ${l.descricao || "sem histórico"}`,
      mensagem: l.lancado_pelo_extrato
        ? "Este movimento foi lançado no caixa a partir do extrato. Desfazer APAGA o movimento e devolve o saldo da conta; a linha volta a ficar pendente."
        : "A linha volta a ficar pendente e o movimento do caixa volta a ficar não conciliado. A baixa do título não é desfeita.",
      rotulo: "Desfazer", tom: l.lancado_pelo_extrato ? "perigo" : "aviso",
    });
    if (!ok) return;
    setBusy(true); setFeedback(null);
    try {
      await desfazerConciliacao(l.id);
      setFeedback({ type: "info", message: "Conciliação desfeita." });
      await carregarExtrato();
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e) });
    } finally { setBusy(false); }
  }

  async function casar(l: LinhaExtrato, c: CandidatoConciliacao) {
    setBusy(true); setFeedback(null);
    try {
      await conciliarLinhaExtrato(l.id, c.fluxo_caixa_id);
      setEmConciliacao(null);
      setFeedback({ type: "success", message: `Lançamento de ${dataBR(l.data)} conciliado com o movimento de ${dataBR(c.data)}.` });
      await carregarExtrato();
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e) });
    } finally { setBusy(false); }
  }

  const resumo = extrato?.resumo;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Conciliação Bancária por OFX</span>
          <span className="erp-crumb-code">VFIN0620</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">extrato OFX</span>
      </header>

      <div className="erp-toolbar">
        {aba === "importar" ? (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Importação</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void importar()}
              disabled={busy || !contaID || !conferencia?.valido}>
              {busy ? <><span className="erp-spin" />Importando…</> : "Importar extrato"}
            </button>
            <button className="erp-btn" onClick={limpar} disabled={busy || !arquivo}>Limpar</button>
          </div>
        ) : (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Conciliação</span>
            <button className="erp-btn" onClick={() => void carregarExtrato()} disabled={busy || carregando || !contaID}>
              {carregando ? <><span className="erp-spin" />Atualizando…</> : "Atualizar"}
            </button>
            <button className="erp-btn erp-btn-primary" onClick={() => void rodarAutomatico()} disabled={busy || !contaID}>
              Conciliar automaticamente
            </button>
          </div>
        )}
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs" role="tablist" aria-label="Etapas da conciliação">
            <button role="tab" aria-selected={aba === "importar"} className={`erp-tab${aba === "importar" ? " active" : ""}`}
              onClick={() => { setAba("importar"); setFeedback(null); }}>Importar extrato</button>
            <button role="tab" aria-selected={aba === "extrato"} className={`erp-tab${aba === "extrato" ? " active" : ""}`}
              onClick={() => { setAba("extrato"); setFeedback(null); }}>
              Extrato e conciliação{resumo && resumo.pendentes > 0 && situacao !== "conciliado" ? ` (${resumo.pendentes} pendente${resumo.pendentes > 1 ? "s" : ""})` : ""}
            </button>
          </div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            <div className="erp-fieldset">
              <div className="erp-fieldset-head">{aba === "importar" ? "1. Conta bancária do extrato" : "Conta bancária"}</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c5">
                  <label className="erp-label erp-req">Conta bancária</label>
                  <LookupField value={contaID} loader={loadBankAccounts} entityLabel="conta bancária"
                    placeholder="Escolher a conta" allowManualCode={false}
                    onChange={(c) => { setContaID(c ? Number(c) : undefined); setResultado(null); setExtrato(null); }} />
                  <span className="erp-hint">
                    Os lançamentos do arquivo entram no extrato DESTA conta e são casados com os movimentos do caixa dela.
                  </span>
                </div>
                {contaEscolhida && (
                  <div className="erp-field erp-c7">
                    <label className="erp-label">Conta selecionada</label>
                    <input className="erp-input" readOnly
                      value={`Banco ${contaEscolhida.banco} · Agência ${contaEscolhida.agencia} · Conta ${contaEscolhida.conta}${contaEscolhida.digito ? `-${contaEscolhida.digito}` : ""}${contaEscolhida.descricao ? ` · ${contaEscolhida.descricao}` : ""}`} />
                  </div>
                )}
              </div>
            </div>

            {aba === "importar" && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">2. Arquivo do extrato</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c6">
                      <label className="erp-label erp-req">Extrato OFX</label>
                      {/* `accept` só filtra o diálogo do sistema — não valida nada. A
                          conferência de verdade é a da estrutura, abaixo. */}
                      <input ref={inputRef} className="erp-input" type="file" accept=".ofx,.OFX,text/plain,application/x-ofx"
                        onChange={(e) => void escolherArquivo(e.target.files?.[0] ?? null)} />
                      <span className="erp-hint">
                        No internet banking, procure "extrato para Money/OFX". CSV, PDF, planilha e comprovante não servem —
                        a conciliação precisa do identificador único de cada lançamento, que só o OFX traz.
                      </span>
                    </div>

                    {arquivo && (
                      <div className="erp-field erp-c6">
                        <label className="erp-label">Conferência do arquivo</label>
                        {conferencia?.valido ? (
                          <div className="erp-feedback success" style={{ margin: 0 }}>
                            <strong>{arquivo.nome}</strong> — {conferencia.lancamentos} lançamento(s)
                            {conferencia.banco && <> · banco {conferencia.banco}</>}
                            {conferencia.conta && <> · conta {conferencia.conta}</>}
                            {conferencia.periodo && <> · período {conferencia.periodo}</>}
                          </div>
                        ) : (
                          <div className="erp-feedback error" style={{ margin: 0 }}>
                            <strong>{arquivo.nome}</strong> — {conferencia?.motivo}
                          </div>
                        )}
                        <span className="erp-hint">{(arquivo.tamanho / 1024).toFixed(0)} KB</span>
                      </div>
                    )}

                    {contaDivergente && (
                      <div className="erp-field erp-c12">
                        <div className="erp-feedback warn" style={{ margin: 0 }}>
                          O arquivo é da conta <strong>{conferencia?.conta}</strong> e a conta escolhida é{" "}
                          <strong>{contaEscolhida?.conta}</strong>. Conciliar o extrato de uma conta contra os
                          pagamentos de outra casa lançamentos que nunca existiram ali. Confirme antes de importar.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {resultado && (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">3. Resultado da importação</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c12">
                        <div className="erp-metrics">
                          <div className="erp-metric">
                            <div className="erp-metric-label">Importados</div>
                            <div className="erp-metric-value erp-metric-ok">{resultado.importados}</div>
                          </div>
                          <div className="erp-metric">
                            <div className="erp-metric-label">Conciliados automaticamente</div>
                            <div className="erp-metric-value">{resultado.conciliados}</div>
                          </div>
                          <div className="erp-metric">
                            <div className="erp-metric-label">Aguardando conciliação</div>
                            <div className={`erp-metric-value ${resultado.pendentes ? "erp-metric-danger" : ""}`}>{resultado.pendentes}</div>
                          </div>
                          <div className="erp-metric">
                            <div className="erp-metric-label">Já existiam</div>
                            <div className="erp-metric-value">{resultado.duplicados}</div>
                          </div>
                          <div className="erp-metric">
                            <div className="erp-metric-label">Ignorados</div>
                            <div className={`erp-metric-value ${resultado.ignorados ? "erp-metric-danger" : ""}`}>
                              {resultado.ignorados}
                            </div>
                          </div>
                        </div>
                      </div>

                      {(resultado.banco_do_arquivo || resultado.periodo_inicio) && (
                        <div className="erp-field erp-c12">
                          <span className="erp-hint">
                            Arquivo lido: banco {resultado.banco_do_arquivo || "—"}, conta {resultado.conta_do_arquivo || "—"}
                            {resultado.periodo_inicio && `, período ${resultado.periodo_inicio} a ${resultado.periodo_fim}`}.
                          </span>
                        </div>
                      )}

                      {resultado.saldo_do_arquivo !== undefined && extrato && (
                        <div className="erp-field erp-c12">
                          <div className={`erp-feedback ${Math.abs(resultado.saldo_do_arquivo - extrato.saldo_sistema) < 0.005 ? "success" : "warn"}`} style={{ margin: 0 }}>
                            Saldo informado pelo banco{resultado.data_saldo_do_arquivo ? ` em ${resultado.data_saldo_do_arquivo}` : ""}:{" "}
                            <strong>R$ {money(resultado.saldo_do_arquivo)}</strong> · Saldo da conta no sistema:{" "}
                            <strong>R$ {money(extrato.saldo_sistema)}</strong>
                            {Math.abs(resultado.saldo_do_arquivo - extrato.saldo_sistema) >= 0.005 &&
                              " — a diferença costuma ser o que ainda não foi conciliado ou lançado no caixa."}
                          </div>
                        </div>
                      )}

                      {resultado.avisos && resultado.avisos.length > 0 && (
                        <div className="erp-field erp-c12">
                          <label className="erp-label">Avisos da importação</label>
                          <table className="erp-grid">
                            <thead><tr><th>Aviso</th></tr></thead>
                            <tbody>
                              {resultado.avisos.map((a, i) => <tr key={i}><td>{a}</td></tr>)}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {resultado.duplicados > 0 && resultado.importados === 0 && (
                        <div className="erp-field erp-c12">
                          <span className="erp-hint">
                            Todos os lançamentos já estavam importados: reimportar o mesmo arquivo não duplica nada.
                          </span>
                        </div>
                      )}

                      {resultado.pendentes > 0 && (
                        <div className="erp-field erp-c12">
                          <button className="erp-btn erp-btn-primary" onClick={() => { setSituacao("pendente"); setAba("extrato"); setFeedback(null); }}>
                            Conciliar os {resultado.pendentes} pendente(s)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Como a conciliação funciona</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12">
                      <span className="erp-hint">
                        Cada lançamento do extrato é identificado pelo código que o banco atribui (FITID) somado à
                        conta, à data e ao valor. É isso que permite reimportar o mesmo arquivo — ou um período que se
                        sobrepõe — sem duplicar movimento.
                        <br />Depois de importar, o sistema casa automaticamente cada lançamento com o pagamento ou
                        recebimento já baixado nesta conta, de mesmo valor e até 3 dias de diferença na data.
                        <br />O que não casar fica na aba <strong>Extrato e conciliação</strong>: lá você escolhe o
                        movimento correspondente, lança no caixa o que não tem título (tarifa, IOF, aplicação) ou,
                        se for um título ainda em aberto, baixa o título nesta conta (VFIN0200 / VFIN0210) e volta para
                        conciliar.
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {aba === "extrato" && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Filtro</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Situação</label>
                      <select className="erp-input" value={situacao} onChange={(e) => setSituacao(e.target.value as SituacaoExtrato)}>
                        <option value="pendente">Pendentes</option>
                        <option value="conciliado">Conciliados</option>
                        <option value="">Todos</option>
                      </select>
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label">De</label>
                      <input className="erp-input" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                    </div>
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Até</label>
                      <input className="erp-input" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                    </div>
                  </div>
                </div>

                {!contaID && <div className="erp-feedback info">Escolha a conta bancária para ver o extrato importado.</div>}

                {contaID && extrato && (
                  <>
                    <div className="erp-metrics">
                      <div className="erp-metric">
                        <div className="erp-metric-label">Pendentes</div>
                        <div className={`erp-metric-value ${extrato.resumo.pendentes ? "erp-metric-danger" : "erp-metric-ok"}`}>{extrato.resumo.pendentes}</div>
                      </div>
                      <div className="erp-metric">
                        <div className="erp-metric-label">Conciliados</div>
                        <div className="erp-metric-value erp-metric-ok">{extrato.resumo.conciliados}</div>
                      </div>
                      <div className="erp-metric">
                        <div className="erp-metric-label">Entradas pendentes</div>
                        <div className="erp-metric-value">{money(extrato.resumo.creditos_pendentes)}</div>
                      </div>
                      <div className="erp-metric">
                        <div className="erp-metric-label">Saídas pendentes</div>
                        <div className="erp-metric-value erp-metric-danger">{money(extrato.resumo.debitos_pendentes)}</div>
                      </div>
                      <div className="erp-metric">
                        <div className="erp-metric-label">Saldo da conta no sistema</div>
                        <div className={`erp-metric-value ${extrato.saldo_sistema < 0 ? "erp-metric-danger" : ""}`}>{money(extrato.saldo_sistema)}</div>
                      </div>
                    </div>

                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">
                        Lançamentos do extrato
                        <span style={{ fontWeight: 400, opacity: 0.65 }}>{` — ${extrato.linhas.length}`}</span>
                      </div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c12">
                          <table className="erp-grid">
                            <thead>
                              <tr>
                                <th>Data</th><th>Histórico do banco</th><th className="num">Valor</th>
                                <th>Situação</th><th>Movimento no caixa</th><th>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {extrato.linhas.length === 0 && (
                                <tr><td colSpan={6} className="erp-grid-empty">
                                  {situacao === "pendente"
                                    ? "Nenhum lançamento pendente: tudo o que foi importado está conciliado."
                                    : "Nenhum lançamento importado com este filtro. Importe o extrato OFX na primeira aba."}
                                </td></tr>
                              )}
                              {extrato.linhas.map((l) => (
                                <tr key={l.id}>
                                  <td>{dataBR(l.data)}</td>
                                  <td>{l.descricao || "—"}</td>
                                  <td className={`num ${l.tipo === "DEBIT" ? "erp-cell-danger" : ""}`}>
                                    {l.tipo === "DEBIT" ? "-" : ""}{money(l.valor)}
                                  </td>
                                  <td>{l.conciliado
                                    ? <span className="erp-badge erp-badge-green">Conciliado</span>
                                    : <span className="erp-badge erp-badge-amber">Pendente</span>}</td>
                                  <td>{l.conciliado
                                    ? <>{dataBR(l.movimento_data)} · {l.movimento_descricao || "—"}
                                      {l.lancado_pelo_extrato && <> <span className="erp-badge erp-badge-blue">lançado pelo extrato</span></>}</>
                                    : "—"}</td>
                                  <td style={{ whiteSpace: "nowrap" }}>
                                    {l.conciliado ? (
                                      <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void desfazer(l)}>Desfazer</button>
                                    ) : (
                                      <>
                                        <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy} onClick={() => setEmConciliacao(l)}>Conciliar…</button>{" "}
                                        <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void lancar(l)}>Lançar no caixa</button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {emConciliacao && (
        <DialogoCandidatos linha={emConciliacao} busy={busy}
          onFechar={() => setEmConciliacao(null)}
          onCasar={(c) => void casar(emConciliacao, c)}
          onLancar={() => void lancar(emConciliacao)} />
      )}

      <footer className="erp-statusbar">
        <div className="erp-status-item">Conta: <strong>{contaEscolhida ? `${contaEscolhida.banco} ${contaEscolhida.conta}` : "—"}</strong></div>
        {aba === "importar"
          ? <div className="erp-status-item">Arquivo: <strong>{conferencia?.valido ? `${conferencia.lancamentos} lançamento(s)` : arquivo ? "recusado" : "—"}</strong></div>
          : <div className="erp-status-item">Pendentes: <strong>{resumo ? resumo.pendentes : "—"}</strong></div>}
        {resultado && aba === "importar" && <div className="erp-status-item">Importados: <strong>{resultado.importados}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

/** Movimentos do caixa que podem casar com a linha: mesma conta, sentido e valor. */
function DialogoCandidatos({ linha, busy, onFechar, onCasar, onLancar }: {
  linha: LinhaExtrato; busy: boolean;
  onFechar: () => void; onCasar: (c: CandidatoConciliacao) => void; onLancar: () => void;
}): JSX.Element {
  const [cands, setCands] = useState<CandidatoConciliacao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    getCandidatosConciliacao(linha.id)
      .then((c) => { if (vivo) setCands(c); })
      .catch((e) => { if (vivo) setErro(errMessage(e, "Não foi possível buscar os movimentos do caixa.")); });
    return () => { vivo = false; };
  }, [linha.id]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const sentido = linha.tipo === "DEBIT" ? "saída" : "entrada";

  return (
    <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-label="Conciliar lançamento do extrato"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="erp-modal" style={{ width: "min(780px, 94vw)" }}>
        <div className="erp-modal-head">
          <strong>Conciliar lançamento do extrato</strong>
          <button className="erp-btn erp-btn-sm" onClick={onFechar}>Fechar</button>
        </div>
        <div className="erp-modal-body">
          <div className="erp-feedback info" style={{ marginTop: 0 }}>
            <strong>{dataBR(linha.data)}</strong> · {linha.descricao || "sem histórico"} ·{" "}
            <strong>{linha.tipo === "DEBIT" ? "-" : ""}R$ {money(linha.valor)}</strong> ({sentido})
          </div>
          {erro && <div className="erp-feedback error">{erro}</div>}
          {!cands && !erro && <div className="erp-hint"><span className="erp-spin" /> Procurando movimentos…</div>}
          {cands && cands.length === 0 && (
            <div className="erp-feedback warn">
              Nenhum movimento de {sentido} de R$ {money(linha.valor)} sem conciliação nesta conta.
              <br />Se é um pagamento ou recebimento de título, baixe o título nesta conta (VFIN0200 para pagar,
              VFIN0210 para receber) com a data e o valor do extrato e volte para conciliar.
              <br />Se não tem título por trás — tarifa, IOF, aplicação, resgate —, use <strong>Lançar no caixa</strong>.
            </div>
          )}
          {cands && cands.length > 0 && (
            <table className="erp-grid">
              <thead>
                <tr><th>Data</th><th>Histórico</th><th>Título</th><th className="num">Valor</th><th>Diferença</th><th /></tr>
              </thead>
              <tbody>
                {cands.map((c) => (
                  <tr key={c.fluxo_caixa_id}>
                    <td>{dataBR(c.data)}</td>
                    <td>{c.descricao || "—"}</td>
                    <td>{c.documento ?? (c.contas_pagar_id ? "a pagar" : c.contas_receber_id ? "a receber" : "—")}</td>
                    <td className="num">{money(c.valor)}</td>
                    <td>{c.diferenca_dias === 0 ? "mesmo dia" : `${c.diferenca_dias} dia(s)`}</td>
                    <td><button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy} onClick={() => onCasar(c)}>Conciliar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="erp-modal-actions">
          <button className="erp-btn" onClick={onLancar} disabled={busy}>Lançar no caixa</button>
          <button className="erp-btn" onClick={onFechar}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

/** Só os dígitos: o cadastro guarda "12345-6" e o arquivo do banco manda "123456". */
function somenteDigitos(s: string): string {
  return (s || "").replace(/\D/g, "");
}

/** Mesma regra do servidor: iguais, ou um é sufixo do outro com pelo menos 4 dígitos. */
function mesmaConta(cadastro: string, arquivo: string): boolean {
  const a = somenteDigitos(cadastro), b = somenteDigitos(arquivo);
  if (!a || !b) return true;
  if (a === b) return true;
  const [menor, maior] = a.length <= b.length ? [a, b] : [b, a];
  return menor.length >= 4 && maior.endsWith(menor);
}
