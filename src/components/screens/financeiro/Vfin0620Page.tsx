import { useState, useCallback, useEffect, useRef } from "react";
import {
  type ImportacaoOFX, type ConferenciaDoOFX, type ContaBancaria,
  importarOFX, conferirArquivoOFX, listContasBancarias,
} from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadBankAccounts } from "@/services/lookups";

/**
 * VFIN0620 — Conciliação Bancária por OFX.
 *
 * Importa o extrato da conta e casa cada lançamento com o pagamento ou recebimento
 * já registrado no sistema.
 *
 * ── O defeito que esta tela corrige ──
 * A rotina anterior era um formulário JSON genérico: aceitava QUALQUER conteúdo e
 * respondia sucesso. Importar um JSON dava "sucesso" com zero lançamento — e quem
 * importava concluía que o extrato do mês estava vazio, não que tinha mandado o
 * arquivo errado.
 *
 * Agora o arquivo é conferido em dois pontos: aqui, ao escolher (resposta
 * imediata, sem subir megabytes para levar recusa), e no servidor, que é a
 * validação que vale. A checagem é por ESTRUTURA, não por extensão — `.ofx` é só um
 * nome, e um PDF renomeado passaria por qualquer filtro de extensão.
 */

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

export function Vfin0620Page(): JSX.Element {
  const [contaID, setContaID] = useState<number | undefined>();
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [arquivo, setArquivo] = useState<{ nome: string; tamanho: number; conteudo: string } | null>(null);
  const [conferencia, setConferencia] = useState<ConferenciaDoOFX | null>(null);
  const [resultado, setResultado] = useState<ImportacaoOFX | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listContasBancarias().then(setContas).catch(() => setContas([]));
  }, []);

  const contaEscolhida = contas.find((c) => c.id === contaID);

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
      if (!conf.valido) {
        setFeedback({ type: "error", message: conf.motivo ?? "O arquivo não é um extrato OFX." });
      } else {
        setFeedback(null);
      }
    } catch (e) {
      setArquivo(null); setConferencia(null);
      setFeedback({ type: "error", message: errMessage(e, "Não foi possível ler o arquivo.") });
    }
  }, []);

  /** Conta do arquivo × conta escolhida: o erro mais caro desta tela é conciliar o
   *  extrato de uma conta contra os pagamentos de outra. */
  const contaDivergente = !!(conferencia?.valido && conferencia.conta && contaEscolhida
    && somenteDigitos(conferencia.conta) !== somenteDigitos(contaEscolhida.conta)
    && !somenteDigitos(contaEscolhida.conta).endsWith(somenteDigitos(conferencia.conta))
    && !somenteDigitos(conferencia.conta).endsWith(somenteDigitos(contaEscolhida.conta)));

  async function importar() {
    if (!contaID) { setFeedback({ type: "error", message: "Escolha a conta bancária do extrato." }); return; }
    if (!arquivo || !conferencia?.valido) {
      setFeedback({ type: "error", message: "Escolha um arquivo OFX válido antes de importar." }); return;
    }
    if (contaDivergente && !window.confirm(
      `O arquivo é da conta ${conferencia.conta} e a conta escolhida é ${contaEscolhida?.conta}.\n\n`
      + "Importar o extrato de uma conta em outra concilia pagamentos com movimentos que nunca existiram ali.\n\n"
      + "Importar mesmo assim?")) {
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
      setFeedback({
        type: r.importados === 0 && r.duplicados > 0 ? "info" : "success",
        message: `${partes.join(", ")}.`,
      });
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e) });
    } finally { setBusy(false); }
  }

  function limpar() {
    setArquivo(null); setConferencia(null); setResultado(null); setFeedback(null);
    if (inputRef.current) inputRef.current.value = "";
  }

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
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Importação</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void importar()}
            disabled={busy || !contaID || !conferencia?.valido}>
            {busy ? <><span className="erp-spin" />Importando…</> : "Importar extrato"}
          </button>
          <button className="erp-btn" onClick={limpar} disabled={busy || !arquivo}>Limpar</button>
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Importar e conciliar</button></div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            <div className="erp-fieldset">
              <div className="erp-fieldset-head">1. Conta bancária do extrato</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c5">
                  <label className="erp-label erp-req">Conta bancária</label>
                  <LookupField value={contaID} loader={loadBankAccounts} entityLabel="conta bancária"
                    placeholder="Escolher a conta" allowManualCode={false}
                    onChange={(c) => { setContaID(c ? Number(c) : undefined); setResultado(null); }} />
                  <span className="erp-hint">
                    Os lançamentos do arquivo entram no extrato DESTA conta e são casados com os títulos baixados nela.
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

                  {resultado.avisos && resultado.avisos.length > 0 && (
                    <div className="erp-field erp-c12">
                      <label className="erp-label">O que a importação deixou de fora</label>
                      <table className="erp-grid">
                        <thead><tr><th>Aviso</th></tr></thead>
                        <tbody>
                          {resultado.avisos.map((a, i) => <tr key={i}><td>{a}</td></tr>)}
                        </tbody>
                      </table>
                      <span className="erp-hint">
                        Estas linhas NÃO entraram no extrato. Antes eram descartadas em silêncio, e o total
                        importado parecia certo com lançamentos faltando.
                      </span>
                    </div>
                  )}

                  {resultado.duplicados > 0 && resultado.importados === 0 && (
                    <div className="erp-field erp-c12">
                      <span className="erp-hint">
                        Todos os lançamentos já estavam importados: reimportar o mesmo arquivo não duplica nada.
                      </span>
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
                    Cada lançamento do extrato é identificado pelo código único que o banco atribui (FITID) somado à
                    conta, à data e ao valor. É esse identificador que permite reimportar o mesmo arquivo — ou um
                    período que se sobrepõe — sem duplicar movimento.
                    <br />Depois de importar, o sistema procura automaticamente um pagamento ou recebimento já
                    registrado com o mesmo valor e data para casar. O que não casar fica pendente para conferência
                    manual, e aparece como não conciliado no fluxo de caixa (VFIN0300).
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Conta: <strong>{contaEscolhida ? `${contaEscolhida.banco} ${contaEscolhida.conta}` : "—"}</strong></div>
        <div className="erp-status-item">Arquivo: <strong>{conferencia?.valido ? `${conferencia.lancamentos} lançamento(s)` : arquivo ? "recusado" : "—"}</strong></div>
        {resultado && <div className="erp-status-item">Importados: <strong>{resultado.importados}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

/** Só os dígitos: o cadastro guarda "12345-6" e o arquivo do banco manda "123456". */
function somenteDigitos(s: string): string {
  return (s || "").replace(/\D/g, "");
}
