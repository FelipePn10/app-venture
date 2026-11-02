import { useState, useCallback, useEffect, useMemo } from "react";
import { rotuloDaNota,
  type FiscalExit, type PreviaNFe, type ExitStatus,
  listExits, authorizeExit, cancelExit, cartaCorrecaoExit, getExitStatus, listCartasCorrecao, getExitPendencias, reprocessarEfeitos, type PendenciaNFe,
  previewExit, getExitDocumentos,
} from "@/services/nfeService";
import { errMessage, type Obj, parseStr, parseNum } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { FaturarPedidoPanel } from "./FaturarPedidoPanel";
import { NovaNotaForm } from "./NovaNotaForm";
import { SeriesDaNotaPanel } from "./SeriesDaNotaPanel";
import { definirClassTribDaLinha } from "@/services/reformaTributariaService";
import { confirmar, pedirTexto } from "@/components/ui/dialogos";
import { abrirDocumento } from "@/utils/abrirDocumento";
import { chaveEmGrupos, documentoComMascara } from "@/utils/documentoFiscal";
import { DanfePrevia } from "./DanfePrevia";

type FeedbackState = { type: "success" | "error" | "info" | "warn"; message: string } | null;
type Mode = "list" | "create" | "pedido";
const ORIGEM_CLASSTRIB: Record<string, string> = {
  ITEM_DA_NOTA: "da linha", CFOP: "do CFOP", CLASSIFICACAO_FISCAL: "da classificação", PADRAO: "padrão",
};

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Situação da nota. O backend responde o enum em inglês (DRAFT, AUTHORIZED,
 * CANCELLED, REJECTED, AGUARDANDO_AUTORIZACAO); a tela lia só o texto em
 * português e por isso o botão "Autorizar" nunca aparecia em nota nova, e uma
 * nota apenas AGUARDANDO_AUTORIZACAO já era tratada como autorizada (com
 * cancelamento e CC-e liberados).
 */
type SituacaoNF = "rascunho" | "aguardando" | "autorizada" | "cancelada" | "rejeitada" | "outra";

function situacaoDaNota(status: string): SituacaoNF {
  const s = (status || "").trim().toUpperCase();
  if (s === "DRAFT" || s.includes("RASCUNHO")) return "rascunho";
  if (s.startsWith("AGUARDANDO")) return "aguardando";
  if (s === "AUTHORIZED" || s.includes("AUTORIZADA")) return "autorizada";
  if (s === "CANCELLED" || s === "CANCELED" || s.includes("CANCELAD")) return "cancelada";
  if (s === "REJECTED" || s.includes("REJEIT")) return "rejeitada";
  return "outra";
}

const ROTULO_SITUACAO: Record<SituacaoNF, string> = {
  rascunho: "Rascunho",
  aguardando: "Aguardando autorização",
  autorizada: "Autorizada",
  cancelada: "Cancelada",
  rejeitada: "Rejeitada",
  outra: "—",
};

function statusPill(status: string): JSX.Element {
  const sit = situacaoDaNota(status);
  const cls = sit === "autorizada" ? "erp-badge-green"
    : sit === "cancelada" ? "erp-badge-red"
    : sit === "rejeitada" ? "erp-badge-amber"
    : sit === "aguardando" ? "erp-badge-blue" : "erp-badge-gray";
  return <span className={`erp-badge ${cls}`}>{sit === "outra" ? (status || "—") : ROTULO_SITUACAO[sit]}</span>;
}

const dataBR = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

/** Situação devolvida pela consulta à SEFAZ, na língua de quem opera. */
const SITUACAO_SEFAZ: Record<string, { rotulo: string; badge: string }> = {
  autorizado: { rotulo: "Autorizada", badge: "erp-badge-green" },
  autorizada: { rotulo: "Autorizada", badge: "erp-badge-green" },
  cancelado: { rotulo: "Cancelada", badge: "erp-badge-red" },
  cancelada: { rotulo: "Cancelada", badge: "erp-badge-red" },
  processando_autorizacao: { rotulo: "Em processamento na SEFAZ", badge: "erp-badge-blue" },
  rejeitado: { rotulo: "Rejeitada", badge: "erp-badge-amber" },
  erro_autorizacao: { rotulo: "Rejeitada", badge: "erp-badge-amber" },
  denegado: { rotulo: "Denegada", badge: "erp-badge-red" },
  denegada: { rotulo: "Denegada", badge: "erp-badge-red" },
  nao_encontrado: { rotulo: "Não chegou à SEFAZ", badge: "erp-badge-amber" },
};

/** Carta de correção só é gravada depois de a SEFAZ registrar o evento. */
function rotuloDaCce(status: string): string {
  const s = (status || "").trim().toUpperCase();
  if (s === "ENVIADA" || s === "AUTORIZADO" || s === "AUTORIZADA") return "Registrada na SEFAZ";
  if (s === "CANCELADA") return "Cancelada";
  return status ? "Em análise" : "—";
}

type VisaoStatus = { nota: FiscalExit; resultado: ExitStatus | null };

export function Vfis0200Page(): JSX.Element {
  const [mode, setMode] = useState<Mode>("list");
  const [list, setList] = useState<FiscalExit[]>([]);
  const [lastCreated, setLastCreated] = useState<FiscalExit | null>(null);
  const [cceView, setCceView] = useState<{ id: number; list: Obj[] } | null>(null);
  const [statusView, setStatusView] = useState<VisaoStatus | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState<"" | SituacaoNF>("");
  const [pendView, setPendView] = useState<{ id: number; list: PendenciaNFe[] } | null>(null);
  const [previa, setPrevia] = useState<PreviaNFe | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listExits()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar NF-e de saída.") }); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  function novo() { setMode("create"); setFeedback(null); }

  async function verCces(id: number) {
    setBusy(true); setFeedback(null);
    try { setCceView({ id, list: await listCartasCorrecao(id) }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  // cClassTrib próprio da linha, corrigido na prévia (nota em rascunho/rejeitada).
  const [classTribEdit, setClassTribEdit] = useState<Record<number, string>>({});
  async function aplicarClassTrib(notaId: number, linhaId: number, valor: string) {
    setBusy(true); setFeedback(null);
    try {
      await definirClassTribDaLinha(notaId, linhaId, valor.trim() || null);
      setClassTribEdit((p) => { const n = { ...p }; delete n[linhaId]; return n; });
      setPrevia(await previewExit(notaId));
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function abrirPrevia(id: number) {
    setBusy(true); setFeedback(null);
    try { setPrevia(await previewExit(id)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  /**
   * Autorizar transmite a nota de verdade. Antes de mandar, a tela roda a
   * conferência: com pendência que impede, a emissão nem sai; com pendência de
   * atenção, o usuário confirma sabendo o que está aceitando.
   *
   * Nota autorizada não se corrige — só cancelamento (com prazo e justificativa)
   * ou carta de correção. É por isso que a confirmação é explícita.
   */
  async function autorizar(code: number) {
    setBusy(true); setFeedback(null);
    try {
      const conferida = await previewExit(code);
      if (!conferida.pode_autorizar) {
        setPrevia(conferida);
        setFeedback({
          type: "error",
          message: `${rotuloDaNota(conferida)} não pode ser emitida: ${conferida.pendencias.filter((p) => p.nivel === "IMPEDE").length} pendência(s) impedem a transmissão. Veja a prévia.`,
        });
        return;
      }
      const atencoes = conferida.pendencias.filter((p) => p.nivel === "ATENCAO" && p.campo !== "ambiente");
      const producao = conferida.ambiente.toLowerCase().startsWith("prod");
      const ok = await confirmar({
        titulo: "Transmitir nota à SEFAZ",
        assunto: `NF-e ${conferida.numero_nf > 0 ? `${conferida.numero_nf}/${conferida.serie}` : "(número atribuído na emissão)"} · ${conferida.destinatario.nome} · R$ ${money(conferida.totais.valor_total_nf)}`,
        mensagem: `Ambiente: ${producao ? "PRODUÇÃO, nota com valor fiscal" : "HOMOLOGAÇÃO, nota de teste sem valor fiscal"}.\nNota autorizada só se desfaz por cancelamento.`
          + (atencoes.length ? `\n\nAtenção:\n${atencoes.map((p) => `• ${p.mensagem}`).join("\n")}` : ""),
        rotulo: "Transmitir", tom: producao ? "aviso" : "neutro",
      });
      if (!ok) return;
      const r = await authorizeExit(code);
      setPrevia(null);
      const nome = r.numero_nf > 0 ? `NF-e ${r.numero_nf}` : "A nota";
      setFeedback(comAvisos(situacaoDaNota(r.status) === "autorizada" ? `${nome} autorizada pela SEFAZ.` : `${nome} enviada para autorização.`, r.warnings, code));
      await reload();
    }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const resumoDaNota = (nf: FiscalExit) => `NF-e ${nf.numero_nf > 0 ? `${nf.numero_nf}/${nf.serie}` : "sem número"} · ${nf.razao_social_destinatario} · R$ ${money(nf.valor_total)}`;

  async function cancelar(nf: FiscalExit) {
    const j = await pedirTexto({
      titulo: "Cancelar nota fiscal",
      assunto: resumoDaNota(nf),
      mensagem: "O cancelamento vai à SEFAZ e não se desfaz. A nota deixa de valer; títulos, estoque e pedido voltam. O prazo legal é de 24 horas a partir da autorização.",
      rotulo: "Justificativa do cancelamento",
      dica: "Fica registrada na SEFAZ.",
      multilinha: true, minimo: 15, maximo: 255,
      rotuloConfirmar: "Cancelar nota", rotuloVoltar: "Voltar", tom: "perigo",
    });
    if (j === null) return;
    setBusy(true); setFeedback(null);
    try { const r = await cancelExit(nf.id, j); setFeedback(comAvisos(`NF-e ${nf.numero_nf} cancelada.`, r.warnings, nf.id)); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function cce(nf: FiscalExit) {
    const t = await pedirTexto({
      titulo: "Nova carta de correção",
      assunto: resumoDaNota(nf),
      mensagem: "A carta corrige dados da nota já autorizada. Ela não pode alterar valores, impostos, quantidade, CFOP, destinatário nem a data de emissão ou de saída. Vale a última carta registrada, então repita nela o que continua valendo.",
      rotulo: "O que está sendo corrigido",
      multilinha: true, minimo: 15, maximo: 1000,
      rotuloConfirmar: "Enviar carta", rotuloVoltar: "Voltar",
    });
    if (t === null) return;
    setBusy(true); setFeedback(null);
    try {
      await cartaCorrecaoExit(nf.id, t);
      setFeedback({ type: "success", message: `Carta de correção da ${rotuloDaNota(nf)} registrada na SEFAZ.` });
      if (cceView?.id === nf.id) setCceView({ id: nf.id, list: await listCartasCorrecao(nf.id) });
    }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function abrirDanfe(nf: FiscalExit) {
    setBusy(true); setFeedback(null);
    try {
      const { danfe_url } = await getExitDocumentos(nf.id);
      if (!danfe_url) { setFeedback({ type: "info", message: `O DANFE da ${rotuloDaNota(nf, "nota")} ainda não está disponível. Consulte o Status em instantes.` }); return; }
      await abrirDocumento(danfe_url);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  // Nota autorizada/cancelada cujos títulos, estoque ou pedido não entraram: o
  // backend reprocessa sozinho, mas quem emitiu precisa saber — e poder ver.
  function comAvisos(ok: string, avisos: string[] | undefined, id: number): FeedbackState {
    if (!avisos?.length) return { type: "success", message: ok };
    void verPendencias(id);
    return { type: "warn", message: `${ok} Atenção: ${avisos.join(" ")}` };
  }

  // A tela fala o número da nota (o que está no DANFE), não o id interno.
  const numeroDa = (id: number) => list.find((n) => n.id === id)?.numero_nf || "sem número";

  async function verPendencias(id: number) {
    try { setPendView({ id, list: await getExitPendencias(id) }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
  }

  async function reprocessar(id: number) {
    setBusy(true); setFeedback(null);
    try {
      const list = await reprocessarEfeitos(id);
      setPendView({ id, list });
      setFeedback({ type: "success", message: `Efeitos da NF-e ${numeroDa(id)} aplicados (títulos, estoque e pedido).` });
      await reload();
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e) });
      await verPendencias(id);
    } finally { setBusy(false); }
  }

  async function consultarStatus(nf: FiscalExit) {
    setFeedback(null);
    // Sem envio registrado não há o que perguntar à SEFAZ: a janela já diz isso.
    if (!nf.focus_ref && situacaoDaNota(nf.status) !== "rejeitada") { setStatusView({ nota: nf, resultado: null }); return; }
    setBusy(true);
    try {
      const resultado = await getExitStatus(nf.id);
      setStatusView({ nota: nf, resultado });
      const atual = await listExits();
      setList(atual);
      const fresca = atual.find((n) => n.id === nf.id);
      if (fresca) setStatusView({ nota: fresca, resultado });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const notasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const digitos = termo.replace(/\D/g, "");
    return list.filter((n) => {
      if (filtroSituacao && situacaoDaNota(n.status) !== filtroSituacao) return false;
      if (!termo) return true;
      return n.razao_social_destinatario.toLowerCase().includes(termo)
        || (digitos !== "" && (String(n.numero_nf).includes(digitos) || n.cnpj_destinatario.replace(/\D/g, "").includes(digitos)));
    });
  }, [list, busca, filtroSituacao]);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">NF-e de Saída</span><span className="erp-crumb-code">VFIS0200</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Nova NF-e</button>
          <button className="erp-btn erp-btn-primary" onClick={() => { setMode("pedido"); setFeedback(null); }} disabled={busy}>Faturar pedido de venda</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Visão</span>
          <button className="erp-btn" onClick={() => { setMode("list"); void reload(); }} disabled={busy}>Listagem</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0200 — NF-e de Saída" filename="vfis0200" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">NF-e de Saída</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode === "pedido" && (
          <FaturarPedidoPanel
            onFeedback={setFeedback}
            onCriada={(nf) => {
              setLastCreated(nf);
              setMode("list");
              // Abrir a prévia limpa o aviso: a mensagem vem depois, e aparece dentro dela.
              void reload().then(() => abrirPrevia(nf.id)).then(() => setFeedback({
                type: "success",
                message: `Nota criada em rascunho a partir do pedido (total R$ ${money(nf.valor_total)}). Confira a prévia e autorize.`,
              }));
            }}
          />
        )}

        {mode === "list" && (
          <>
            {lastCreated && (
              <div className="erp-metrics">
                <div className="erp-metric"><div className="erp-metric-label">Última nota criada</div><div className="erp-metric-value">{money(lastCreated.valor_total)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">ICMS</div><div className="erp-metric-value">{money(lastCreated.valor_icms)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">IPI</div><div className="erp-metric-value">{money(lastCreated.valor_ipi)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">PIS</div><div className="erp-metric-value">{money(lastCreated.valor_pis)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">COFINS</div><div className="erp-metric-value">{money(lastCreated.valor_cofins)}</div></div>
              </div>
            )}
            <div className="erp-fieldset"><div className="erp-fieldset-head">Notas Fiscais   — <span style={{fontWeight:400,opacity:0.65}}>{notasFiltradas.length === list.length ? `${list.length} NF-e` : `${notasFiltradas.length} de ${list.length} NF-e`}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c6"><label className="erp-label" htmlFor="vfis-busca">Buscar</label>
                <input id="vfis-busca" className="erp-input" placeholder="Número, destinatário ou CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label" htmlFor="vfis-situacao">Situação</label>
                <select id="vfis-situacao" className="erp-input" value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value as "" | SituacaoNF)}>
                  <option value="">Todas</option>
                  {(["rascunho", "aguardando", "autorizada", "rejeitada", "cancelada"] as const).map((v) => <option key={v} value={v}>{ROTULO_SITUACAO[v]}</option>)}
                </select></div>
              <div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead>
                    <tr><th>Número</th><th>Série</th><th>Destinatário</th><th>Situação</th><th className="num">Total</th><th>Emissão</th><th style={{ width: 430 }}>Ações</th></tr>
                  </thead>
                  <tbody>
                    {notasFiltradas.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">{list.length === 0 ? "Nenhuma NF-e de saída." : "Nenhuma nota com este filtro."}</td></tr>}
                    {notasFiltradas.map((nf) => {
                      const sit = situacaoDaNota(nf.status);
                      const isAuth = sit === "autorizada";
                      const transmitida = !!nf.focus_ref;
                      return (
                        <tr key={nf.id}>
                          <td style={{ fontWeight: 600 }}>{nf.numero_nf > 0 ? nf.numero_nf : "—"}{nf.finalidade === 4 && <><br /><span className="erp-badge erp-badge-amber" title={nf.nfe_referenciada ? `Devolução da NF-e ${nf.nfe_referenciada}` : "Devolução de compra"}>Devolução</span></>}</td>
                          <td>{nf.serie}</td>
                          <td>{nf.razao_social_destinatario}<br /><small style={{ color: "var(--v-text-muted)" }}>{documentoComMascara(nf.cnpj_destinatario)}</small></td>
                          <td>{statusPill(nf.status)}</td>
                          <td className="num">{money(nf.valor_total)}</td>
                          <td>{dataBR(nf.data_emissao)}</td>
                          <td>
                            <div className="erp-row-actions">
                              {(sit === "rascunho" || sit === "rejeitada" || sit === "aguardando") && <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy} onClick={() => void abrirPrevia(nf.id)}
                                title="Confira a nota antes de transmitir">Prévia</button>}
                              {sit === "rascunho" && <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void autorizar(nf.id)}>Autorizar</button>}
                              {(sit === "rejeitada" || sit === "aguardando") && <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void autorizar(nf.id)}
                                title={sit === "rejeitada" ? "Transmite de novo depois da correção" : "Consulte o Status antes: a nota pode já ter chegado à SEFAZ"}>Reenviar</button>}
                              {(isAuth || sit === "cancelada") && transmitida && <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy} title="Abre o PDF da nota" onClick={() => void abrirDanfe(nf)}>DANFE</button>}
                              {isAuth && transmitida && <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void cce(nf)}>Nova CC-e</button>}
                              {(isAuth || sit === "cancelada") && <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void verCces(nf.id)}>Ver CC-e</button>}
                              {sit !== "rascunho" && <button className="erp-btn erp-btn-sm" disabled={busy} title="Consulta a situação da nota na SEFAZ" onClick={() => void consultarStatus(nf)}>Status</button>}
                              {(isAuth || sit === "cancelada") && <button className="erp-btn erp-btn-sm" disabled={busy} title="Títulos, estoque e pedido desta nota" onClick={() => void verPendencias(nf.id)}>Efeitos</button>}
                              {isAuth && <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={() => void cancelar(nf)}>Cancelar</button>}
                            </div>
                          </td>
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

        {mode === "create" && (
          <NovaNotaForm
            onCancelar={() => setMode("list")}
            onCriada={(nf) => {
              setLastCreated(nf);
              setMode("list");
              // Abrir a prévia limpa o aviso: a mensagem vem depois, e aparece dentro dela.
              void reload().then(() => abrirPrevia(nf.id)).then(() => setFeedback({
                type: "success",
                message: `Nota criada em rascunho. Impostos calculados: ICMS R$ ${money(nf.valor_icms)}, IPI R$ ${money(nf.valor_ipi)}, `
                  + `PIS R$ ${money(nf.valor_pis)}, COFINS R$ ${money(nf.valor_cofins)}. Total R$ ${money(nf.valor_total)}. Confira a prévia e transmita.`,
              }));
            }}
          />
        )}
      </div></section></div>

      {previa && (
        <div className="erp-modal-backdrop" onClick={() => setPrevia(null)}>
          <div className="erp-modal erp-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-head">
              <div>
                <strong>
                  Prévia da NF-e{" "}
                  {previa.numero_nf > 0
                    ? `${previa.numero_nf}${previa.serie ? `/${previa.serie}` : ""}`
                    : "— ainda sem número"}
                </strong>
                <div className="erp-hint" style={{ marginTop: 2 }}>
                  {previa.natureza_operacao} · CFOP {previa.cfop} · {previa.tipo_operacao}
                  {previa.consumidor_final ? " · consumidor final" : ""}
                  {" · emissão "}{dataBR(previa.data_emissao)}
                  {previa.sales_order_code ? ` · pedido ${previa.sales_order_code}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className={`erp-badge ${previa.ambiente.toLowerCase().startsWith("prod") ? "erp-badge-green" : "erp-badge-amber"}`}>
                  {previa.ambiente.toLowerCase().startsWith("prod") ? "PRODUÇÃO" : "HOMOLOGAÇÃO"}
                </span>
                <button className="erp-btn" onClick={() => setPrevia(null)}>Fechar</button>
              </div>
            </div>

            <div className="erp-modal-body">
              {/* O aviso da página fica atrás do modal: repete aqui o que importa agora. */}
              {feedback && <div className={`erp-feedback ${feedback.type}`} style={{ marginBottom: 12 }}>{feedback.message}</div>}
              {/* Conferência primeiro: é o que decide se dá para emitir. */}
              <div className="erp-fieldset" style={{ marginBottom: 12 }}>
                <div className="erp-fieldset-head">
                  Conferência   — <span style={{ fontWeight: 400, opacity: 0.65 }}>
                    {previa.pendencias.length === 0
                      ? "nenhuma pendência: a nota está pronta para emitir"
                      : `${previa.pendencias.filter((p) => p.nivel === "IMPEDE").length} impedem · ${previa.pendencias.filter((p) => p.nivel === "ATENCAO").length} de atenção`}
                  </span>
                </div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12">
                    {previa.pendencias.length === 0 && (
                      <div className="erp-feedback success">
                        Emitente, destinatário, itens, impostos e pagamento conferidos. Nada impede a emissão.
                      </div>
                    )}
                    {previa.pendencias.length > 0 && (
                      <table className="erp-grid">
                        <thead><tr><th style={{ width: 110 }}>Nível</th><th>O que está pendente</th><th>Como resolver</th></tr></thead>
                        <tbody>
                          {previa.pendencias.map((p, i) => (
                            <tr key={i}>
                              <td>
                                <span className={`erp-badge ${p.nivel === "IMPEDE" ? "erp-badge-red" : "erp-badge-amber"}`}>
                                  {p.nivel === "IMPEDE" ? "Impede" : "Atenção"}
                                </span>
                              </td>
                              <td>{p.mensagem}</td>
                              <td style={{ opacity: 0.8 }}>{p.como_resolver}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              <div className="erp-fieldset" style={{ marginBottom: 12 }}>
                <div className="erp-fieldset-head">
                  Itens   — <span style={{ fontWeight: 400, opacity: 0.65 }}>{previa.itens.length} linha(s)</span>
                </div>
                <div className="erp-fieldset-body"><div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid">
                    <thead>
                      <tr>
                        <th style={{ width: 34 }}>#</th><th>Produto</th>
                        <th className="num">Qtd</th><th className="num">Total</th>
                        <th title="CST (ou CSOSN no Simples), regra de ICMS/IPI que tributou a linha e valor do ICMS">ICMS</th>
                        <th className="num">IPI</th>
                        <th className="num" title="ICMS-ST e, na venda a não contribuinte de outro estado, o DIFAL com o FCP">ST / DIFAL</th>
                        <th className="num">PIS / COFINS</th>
                        <th>IBS / CBS (cClassTrib)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previa.itens.length === 0 && (
                        <tr><td colSpan={9} className="erp-grid-empty">Esta nota não tem itens — inclua os produtos antes de emitir.</td></tr>
                      )}
                      {previa.itens.map((it) => (
                        <tr key={it.sequence}>
                          <td>{it.sequence}</td>
                          <td>
                            {it.descricao || `Item ${it.item_code ?? ""}`}
                            <br /><small style={{ opacity: 0.75 }}>
                              NCM {it.ncm || <span className="erp-badge erp-badge-red">sem NCM</span>} · CFOP {it.cfop || <span className="erp-badge erp-badge-red">sem CFOP</span>}
                            </small>
                          </td>
                          <td className="num">{it.quantidade}{it.um ? ` ${it.um}` : ""}</td>
                          <td className="num">{money(it.valor_total)}<br /><small style={{ opacity: 0.75 }}>unit. {money(it.valor_unitario)}</small></td>
                          <td>
                            <strong>{it.cst_icms || "—"}</strong> · {money(it.valor_icms)}
                            <br /><small style={{ opacity: 0.75 }}>
                              {it.regra_icms_ipi_id ? `regra nº ${it.regra_icms_ipi_id}` : <span title="Sem regra de ICMS/IPI: alíquota interna da empresa">regra geral da empresa</span>}
                              {it.valor_credito_simples > 0 && ` · crédito SN ${money(it.valor_credito_simples)}`}
                            </small>
                          </td>
                          <td className="num">{money(it.valor_ipi)}{it.cst_ipi ? <><br /><small style={{ opacity: 0.75 }}>CST {it.cst_ipi}</small></> : null}</td>
                          <td className="num">
                            {it.valor_icms_st > 0 ? <>ST {money(it.valor_icms_st)}</> : "—"}
                            {it.valor_difal + it.valor_fcp_uf_dest > 0 && <><br /><small style={{ opacity: 0.75 }}>DIFAL {money(it.valor_difal + it.valor_fcp_uf_dest)}</small></>}
                          </td>
                          <td className="num">{money(it.valor_pis)}<br /><small style={{ opacity: 0.75 }}>{money(it.valor_cofins)}</small></td>
                          <td>
                            <input className="erp-input num" style={{ width: 82 }} maxLength={6}
                              value={classTribEdit[it.id] ?? it.cclass_trib}
                              disabled={busy || !["DRAFT", "REJECTED"].includes(previa.status.toUpperCase())}
                              title="cClassTrib desta linha; vazio volta ao padrão do CFOP ou da classificação fiscal"
                              onChange={(e) => setClassTribEdit((p) => ({ ...p, [it.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") void aplicarClassTrib(previa.fiscal_exit_id, it.id, classTribEdit[it.id] ?? it.cclass_trib); }} />
                            {classTribEdit[it.id] !== undefined && classTribEdit[it.id] !== it.cclass_trib && (
                              <button className="erp-btn erp-btn-sm" onClick={() => void aplicarClassTrib(previa.fiscal_exit_id, it.id, classTribEdit[it.id])}>Aplicar</button>
                            )}
                            <br /><small style={{ opacity: 0.75 }}>
                              IBS {money(it.valor_ibs)} · CBS {money(it.valor_cbs)}{it.aliquota_efetiva_cbs > 0 ? ` (${it.aliquota_efetiva_cbs}%)` : ""}
                              {(ORIGEM_CLASSTRIB[it.cclass_trib_origem] || it.cst_ibs_cbs) && <><br />{ORIGEM_CLASSTRIB[it.cclass_trib_origem] ?? ""}{it.cst_ibs_cbs ? ` · CST ${it.cst_ibs_cbs}` : ""}</>}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div></div>
              </div>

              <SeriesDaNotaPanel key={previa.fiscal_exit_id} exitId={previa.fiscal_exit_id}
                editavel={["DRAFT", "REJECTED"].includes(previa.status.toUpperCase())}
                onMudou={() => { void previewExit(previa.fiscal_exit_id).then(setPrevia).catch(() => undefined); }} />

              <div className="erp-fieldset" style={{ marginBottom: 12 }}>
                <div className="erp-fieldset-head">Totais</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12">
                    <div className="erp-metrics">
                      <div className="erp-metric"><div className="erp-metric-label">Produtos</div><div className="erp-metric-value">{money(previa.totais.valor_produtos)}</div></div>
                      <div className="erp-metric"><div className="erp-metric-label">IPI</div><div className="erp-metric-value">{money(previa.totais.valor_ipi)}</div></div>
                      <div className="erp-metric"><div className="erp-metric-label">ICMS-ST</div><div className="erp-metric-value">{money(previa.totais.valor_icms_st)}</div></div>
                      <div className="erp-metric"><div className="erp-metric-label">Frete</div><div className="erp-metric-value">{money(previa.totais.valor_frete)}</div></div>
                      <div className="erp-metric"><div className="erp-metric-label">Desconto</div><div className="erp-metric-value">{money(previa.totais.valor_desconto)}</div></div>
                      <div className="erp-metric"><div className="erp-metric-label">Total da NF-e</div><div className="erp-metric-value">{money(previa.totais.valor_total_nf)}</div></div>
                    </div>
                  </div>
                  <div className="erp-field erp-c12">
                    <p className="erp-note">{previa.totais.conferencia}</p>
                  </div>
                </div>
              </div>

              <div className="erp-fieldset" style={{ marginBottom: 12 }}>
                <div className="erp-fieldset-head">
                  Pagamento   — <span style={{ fontWeight: 400, opacity: 0.65 }}>
                    {previa.pagamento.condicao_descricao || previa.pagamento.origem}
                  </span>
                </div>
                <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead><tr><th style={{ width: 50 }}>Parc.</th><th>Descrição</th><th className="num">%</th><th className="num">Valor</th><th>Vencimento</th><th>Forma na NF-e</th></tr></thead>
                    <tbody>
                      {previa.pagamento.parcelas.map((parc) => (
                        <tr key={parc.numero}>
                          <td>{parc.numero}</td>
                          <td>{parc.descricao}{parc.estimado ? " (vencimento projetado)" : ""}</td>
                          <td className="num">{parc.percentual.toFixed(2)}</td>
                          <td className="num">{money(parc.valor)}</td>
                          <td>{dataBR(parc.vencimento)}</td>
                          <td>{parc.forma_pagamento_nf}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="erp-note" style={{ marginTop: 8 }}>
                    Estas parcelas viram as duplicatas da NF-e e os títulos do contas a receber —
                    origem: {previa.pagamento.origem}.
                    {previa.pagamento.aviso ? ` ${previa.pagamento.aviso}` : ""}
                  </p>
                </div></div>
              </div>

              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Documento que será transmitido   — <span style={{ fontWeight: 400, opacity: 0.65 }}>a nota como o cliente vai receber</span></div>
                <div className="erp-fieldset-body"><div className="erp-field erp-c12"><DanfePrevia previa={previa} /></div></div>
              </div>
            </div>

            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setPrevia(null)}>Fechar</button>
              <button
                className="erp-btn erp-btn-primary"
                disabled={busy || !previa.pode_autorizar}
                title={previa.pode_autorizar ? "" : "Resolva as pendências que impedem a emissão"}
                onClick={() => void autorizar(previa.fiscal_exit_id)}
              >
                {busy ? <><div className="erp-spin" />Emitindo...</> : "Emitir NF-e"}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusView && (() => {
        const { nota, resultado } = statusView;
        const situacao = resultado ? SITUACAO_SEFAZ[(resultado.status || "").toLowerCase()] : undefined;
        const chave = resultado?.chave_nfe || nota.chave_nfe;
        const protocolo = resultado?.protocolo || nota.protocolo;
        return (
          <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="vfis-status" onMouseDown={(e) => { if (e.target === e.currentTarget) setStatusView(null); }}>
            <div className="erp-modal erp-confirm-dialog">
              <div className="erp-modal-head"><strong id="vfis-status">Situação da NF-e {nota.numero_nf > 0 ? `${nota.numero_nf}/${nota.serie}` : "sem número"}</strong></div>
              <div className="erp-modal-body">
                {!resultado && <div className="erp-feedback info" style={{ marginBottom: 12 }}>Esta nota não tem envio registrado à SEFAZ por este sistema. A situação abaixo é a que está gravada aqui, e não há o que consultar.</div>}
                <dl className="erp-dados">
                  <dt>Situação</dt>
                  <dd>{resultado && situacao ? <span className={`erp-badge ${situacao.badge}`}>{situacao.rotulo}</span> : statusPill(nota.status)}</dd>
                  <dt>Destinatário</dt><dd>{nota.razao_social_destinatario}</dd>
                  <dt>Valor total</dt><dd>R$ {money(nota.valor_total)}</dd>
                  {chave && <><dt>Chave de acesso</dt><dd className="erp-dados-chave">{chaveEmGrupos(chave)}</dd></>}
                  {protocolo && <><dt>Protocolo</dt><dd>{protocolo}</dd></>}
                  {resultado?.motivo && <><dt>Motivo</dt><dd>{resultado.motivo}</dd></>}
                </dl>
                {!!resultado?.avisos?.length && <div className="erp-feedback warn" style={{ marginTop: 12 }}>{resultado.avisos.join(" ")}</div>}
              </div>
              <div className="erp-modal-actions">
                {resultado?.xml_url && <button className="erp-btn" onClick={() => void abrirDocumento(resultado.xml_url!)}>Baixar XML</button>}
                {resultado?.danfe_url && <button className="erp-btn" onClick={() => void abrirDocumento(resultado.danfe_url!)}>Abrir DANFE</button>}
                <button className="erp-btn erp-btn-primary" onClick={() => setStatusView(null)}>Fechar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {pendView && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="vfis-efeitos" onMouseDown={(e) => { if (e.target === e.currentTarget) setPendView(null); }}>
          <div className="erp-modal erp-modal-lg" style={{ width: "min(860px, 96vw)" }}>
            <div className="erp-modal-head"><div><strong id="vfis-efeitos">Efeitos da NF-e {numeroDa(pendView.id)}</strong>
              <div className="erp-field-hint">O que a nota move depois da SEFAZ: títulos a receber, estoque e pedido de venda.</div></div></div>
            <div className="erp-modal-body">
              {feedback && <div className={`erp-feedback ${feedback.type}`} style={{ marginBottom: 12 }}>{feedback.message}</div>}
              {pendView.list.length === 0
                ? <div className="erp-feedback success">Tudo em dia: títulos, estoque e pedido desta nota já foram atualizados.</div>
                : (
                  <table className="erp-grid">
                    <thead><tr><th>Etapa</th><th>Situação</th><th className="num">Tentativas</th><th>O que aconteceu</th><th>Próxima tentativa</th></tr></thead>
                    <tbody>
                      {pendView.list.map((p, i) => (
                        <tr key={i}>
                          <td>{p.etapa === "CANCELAMENTO" ? "Cancelamento" : "Autorização"}</td>
                          <td>{p.situacao === "PENDENTE" ? <span className="erp-badge erp-badge-amber">Pendente</span> : <span className="erp-badge erp-badge-green">Concluída</span>}</td>
                          <td className="num">{p.tentativas}</td>
                          <td>{p.ultimo_erro || "—"}</td>
                          <td>{p.situacao === "PENDENTE" && p.proxima_tentativa ? new Date(p.proxima_tentativa).toLocaleString("pt-BR") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
            <div className="erp-modal-actions">
              {pendView.list.some((p) => p.situacao === "PENDENTE") && (
                <button className="erp-btn" disabled={busy} onClick={() => void reprocessar(pendView.id)}>Reprocessar agora</button>
              )}
              <button className="erp-btn erp-btn-primary" onClick={() => setPendView(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {cceView && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="vfis-cce" onMouseDown={(e) => { if (e.target === e.currentTarget) setCceView(null); }}>
          <div className="erp-modal erp-modal-lg" style={{ width: "min(860px, 96vw)" }}>
            <div className="erp-modal-head"><strong id="vfis-cce">Cartas de correção da NF-e {numeroDa(cceView.id)}</strong></div>
            <div className="erp-modal-body">
              {cceView.list.length === 0
                ? <div className="erp-grid-empty">Nenhuma carta de correção emitida para esta nota.</div>
                : (
                  <table className="erp-grid">
                    <thead><tr><th style={{ width: 50 }}>Nº</th><th>Texto da correção</th><th style={{ width: 170 }}>Situação</th><th style={{ width: 100 }}>Data</th></tr></thead>
                    <tbody>
                      {cceView.list.map((c, i) => (
                        <tr key={i}>
                          <td>{parseNum(c, "numero_seq", "NumeroSeq") || i + 1}</td>
                          <td style={{ whiteSpace: "pre-wrap" }}>{parseStr(c, "texto_correcao", "TextoCorrecao")}</td>
                          <td><span className="erp-badge erp-badge-green">{rotuloDaCce(parseStr(c, "status", "Status"))}</span></td>
                          <td>{dataBR(parseStr(c, "created_at", "CreatedAt"))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
            <div className="erp-modal-actions"><button className="erp-btn erp-btn-primary" onClick={() => setCceView(null)}>Fechar</button></div>
          </div>
        </div>
      )}

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}>
          <div className="erp-status-item">NF-e: <strong>{list.length}</strong></div>
          <div className="erp-status-item">Autorizadas: <strong>{list.filter((n) => situacaoDaNota(n.status) === "autorizada").length}</strong></div>
        </div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
