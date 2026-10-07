import { useCallback, useEffect, useState } from "react";
import {
  type EntradaDocumento, type NFeRecebida, type TipoManifestacao, type StatusRecebidas,
  listarRecebidas, sincronizarRecebidas, manifestarRecebida, importarRecebida, statusRecebidas, definirSincronizacaoAutomatica,
  ROTULO_MANIFESTACAO,
} from "@/services/nfeEntradaService";
import { errMessage } from "@/services/fiscalShared";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const dataHora = (iso?: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca");
const cnpjFmt = (d: string) => (d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : d);

interface Props {
  onAbrirEntrada: (id: number) => void;
  onImportada: (d: EntradaDocumento) => void;
  onFeedback: (f: FeedbackState) => void;
  /** Avisa a página quando o resumo dos prazos muda (alerta na aba). */
  onStatus?: (s: StatusRecebidas) => void;
}

/**
 * Notas emitidas contra o CNPJ da empresa (distribuição DF-e da SEFAZ, via
 * Focus NF-e). O comprador vê a nota antes de a mercadoria chegar, manifesta
 * (a confirmação encerra o prazo; o desconhecimento protege contra nota fria)
 * e importa como entrada sem depender do XML do fornecedor.
 */
export function NotasRecebidasPanel({ onAbrirEntrada, onImportada, onFeedback, onStatus }: Props): JSX.Element {
  const [lista, setLista] = useState<NFeRecebida[]>([]);
  const [pendentes, setPendentes] = useState(true);
  const [soPrazo, setSoPrazo] = useState(false);
  const [status, setStatus] = useState<StatusRecebidas | null>(null);
  const [busca, setBusca] = useState("");
  const [busy, setBusy] = useState(false);
  const [manifestando, setManifestando] = useState<{ chave: string; tipo: TipoManifestacao; justificativa: string } | null>(null);

  const atualizarStatus = useCallback(async () => {
    try { const s = await statusRecebidas(); setStatus(s); onStatus?.(s); }
    catch { /* sem configuração fiscal: o painel mostra o erro na sincronização */ }
  }, [onStatus]);

  const carregar = useCallback(async () => {
    setBusy(true);
    try { setLista(await listarRecebidas({ pendentes, prazo: soPrazo, q: busca })); }
    catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }, [pendentes, soPrazo, busca, onFeedback]);

  useEffect(() => { void carregar(); }, [pendentes, soPrazo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void atualizarStatus(); }, [atualizarStatus]);

  async function alternarAutomatico(ativo: boolean) {
    setBusy(true); onFeedback(null);
    try {
      await definirSincronizacaoAutomatica(ativo);
      onFeedback({ type: "success", message: ativo ? "Sincronização automática ligada: a SEFAZ é consultada a cada hora." : "Sincronização automática desligada." });
      await atualizarStatus();
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  async function sincronizar() {
    setBusy(true); onFeedback(null);
    try {
      const r = await sincronizarRecebidas();
      onFeedback({ type: "success", message: r.novas ? `${r.novas} nota(s) nova(s) recebida(s) da SEFAZ.` : "Nenhuma nota nova na SEFAZ." });
      setLista(await listarRecebidas({ pendentes, prazo: soPrazo, q: busca }));
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); void atualizarStatus(); }
  }

  async function confirmarManifestacao() {
    if (!manifestando) return;
    const exigeJustificativa = manifestando.tipo === "desconhecimento" || manifestando.tipo === "nao_realizada";
    if (exigeJustificativa && manifestando.justificativa.trim().length < 15) {
      onFeedback({ type: "error", message: "Informe a justificativa (pelo menos 15 caracteres, exigência da SEFAZ)." });
      return;
    }
    setBusy(true); onFeedback(null);
    try {
      await manifestarRecebida(manifestando.chave, manifestando.tipo, manifestando.justificativa.trim());
      onFeedback({ type: "success", message: `${ROTULO_MANIFESTACAO[manifestando.tipo]} registrada.` });
      setManifestando(null);
      setLista(await listarRecebidas({ pendentes, prazo: soPrazo, q: busca }));
      void atualizarStatus();
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  async function importar(n: NFeRecebida) {
    setBusy(true); onFeedback(null);
    try {
      const d = await importarRecebida(n.chave_acesso);
      onImportada(d);
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Notas recebidas na SEFAZ — <span style={{ fontWeight: 400, opacity: 0.65 }}>NF-e emitidas contra o CNPJ da empresa</span></div>
      <div className="erp-fieldset-body">
        {status && (
          <div className="erp-field erp-c12">
            <div className={`erp-feedback ${status.ultimo_erro ? "error" : "info"}`}><div>
              <div>
                Última sincronização: <strong>{dataHora(status.sincronizado_em)}</strong>
                {status.ultima_tentativa && status.ultima_tentativa !== status.sincronizado_em ? <> · última tentativa {dataHora(status.ultima_tentativa)}</> : null}
                {" · "}
                <label style={{ fontWeight: 400 }}>
                  <input type="checkbox" checked={status.automatico} disabled={busy} onChange={(e) => void alternarAutomatico(e.target.checked)} />
                  {" "}buscar automaticamente a cada {status.intervalo_minutos} min
                </label>
              </div>
              {status.ultimo_erro && <div style={{ marginTop: 4 }}>A última consulta falhou: {status.ultimo_erro}</div>}
            </div></div>
          </div>
        )}
        {status && (status.prazo_vencido > 0 || status.prazo_proximo > 0) && (
          <div className="erp-field erp-c12">
            <div className="erp-feedback error" style={{ cursor: "pointer" }} onClick={() => { setPendentes(false); setSoPrazo(true); }}>
              <div>
                <strong>Prazo de manifestação:</strong>
                {status.prazo_vencido > 0 && <> {status.prazo_vencido} nota(s) com o prazo de 180 dias <strong>vencido</strong>.</>}
                {status.prazo_proximo > 0 && <> {status.prazo_proximo} nota(s) vencem em até {status.alerta_prazo_dias} dias.</>}
                {" "}Confirme a operação ou registre o desconhecimento. <u>Ver as notas</u>
              </div>
            </div>
          </div>
        )}
        <div className="erp-field erp-c5"><label className="erp-label">Buscar</label>
          <input className="erp-input" value={busca} placeholder="Emitente, CNPJ, número ou chave" onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void carregar(); }} /></div>
        <div className="erp-field erp-c3" style={{ alignSelf: "end" }}>
          <label><input type="checkbox" checked={pendentes} onChange={(e) => setPendentes(e.target.checked)} /> Só as ainda não lançadas</label>
          <label style={{ display: "block" }}><input type="checkbox" checked={soPrazo} onChange={(e) => setSoPrazo(e.target.checked)} /> Só com prazo de manifestação vencendo</label></div>
        <div className="erp-field erp-c4" style={{ alignSelf: "end", display: "flex", gap: 6 }}>
          <button className="erp-btn" onClick={() => void carregar()} disabled={busy}>Filtrar</button>
          <button className="erp-btn erp-btn-primary" onClick={() => void sincronizar()} disabled={busy}>{busy ? "Consultando…" : "Buscar na SEFAZ"}</button>
        </div>

        {manifestando && (
          <div className="erp-field erp-c12">
            <div className="erp-feedback info" style={{ display: "grid", gap: 6 }}>
              <div><strong>Manifestar</strong> a nota {manifestando.chave}</div>
              <select className="erp-input" style={{ maxWidth: 320 }} value={manifestando.tipo}
                onChange={(e) => setManifestando({ ...manifestando, tipo: e.target.value as TipoManifestacao })}>
                {Object.entries(ROTULO_MANIFESTACAO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {(manifestando.tipo === "desconhecimento" || manifestando.tipo === "nao_realizada") && (
                <input className="erp-input" placeholder="Justificativa (mínimo 15 caracteres)" maxLength={255} value={manifestando.justificativa}
                  onChange={(e) => setManifestando({ ...manifestando, justificativa: e.target.value })} />
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <button className="erp-btn erp-btn-primary" onClick={() => void confirmarManifestacao()} disabled={busy}>Enviar à SEFAZ</button>
                <button className="erp-btn" onClick={() => setManifestando(null)} disabled={busy}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
          <table className="erp-grid">
            <thead><tr><th>Nº</th><th>Emitente</th><th>Emissão</th><th style={{ textAlign: "right" }}>Valor</th><th>Situação</th><th>Manifestação</th><th>Prazo</th><th style={{ width: 220 }}>Ações</th></tr></thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">{busy ? "Carregando…" : "Nenhuma nota recebida. Use \"Buscar na SEFAZ\" para consultar."}</td></tr>}
              {lista.map((n) => {
                const cancelada = n.situacao === "cancelada";
                return (
                  <tr key={n.chave_acesso} style={cancelada ? { opacity: 0.6 } : undefined}>
                    <td style={{ fontWeight: 600 }}>{n.numero_nf ?? "—"}{n.serie ? `/${n.serie}` : ""}</td>
                    <td>{n.nome_emitente || "—"}<br /><small style={{ color: "var(--v-text-muted)" }}>{cnpjFmt(n.cnpj_emitente)}</small></td>
                    <td>{dataBR(n.data_emissao)}</td>
                    <td style={{ textAlign: "right" }}>{money(n.valor_total)}</td>
                    <td><span className={`erp-badge ${cancelada ? "erp-badge-red" : "erp-badge-green"}`}>{n.situacao || "—"}</span></td>
                    <td>{n.manifestacao ? ROTULO_MANIFESTACAO[n.manifestacao] ?? n.manifestacao : <span style={{ color: "#b45309" }}>pendente</span>}</td>
                    <td>{n.prazo_manifestacao === undefined ? "—" : (
                      <span className={`erp-badge ${n.dias_para_prazo !== undefined && n.dias_para_prazo < 0 ? "erp-badge-red" : n.alerta_prazo ? "erp-badge-amber" : "erp-badge-gray"}`}
                        title={`Manifestação conclusiva até ${dataBR(n.prazo_manifestacao)}`}>
                        {n.dias_para_prazo !== undefined && n.dias_para_prazo < 0 ? `vencido há ${-n.dias_para_prazo} d` : `${n.dias_para_prazo} d`}
                      </span>
                    )}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {n.fiscal_entry_id
                        ? <button className="erp-btn erp-btn-sm" onClick={() => onAbrirEntrada(n.fiscal_entry_id!)}>Abrir entrada</button>
                        : !cancelada && <button className="erp-btn erp-btn-sm erp-btn-primary" onClick={() => void importar(n)} disabled={busy}
                            title={n.xml_completo ? "Importa o XML completo" : "Registra a ciência (exigida pela SEFAZ para liberar o XML) e importa"}>Importar</button>}
                      {!cancelada && <button className="erp-btn erp-btn-sm" onClick={() => setManifestando({ chave: n.chave_acesso, tipo: n.manifestacao === "ciencia" ? "confirmacao" : "ciencia", justificativa: "" })} disabled={busy}>Manifestar</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="erp-field erp-c12"><small style={{ color: "var(--v-text-muted)" }}>
          Requer o token da Focus NF-e e o CNPJ da empresa na Configuração Fiscal (VFIS0100). A SEFAZ só libera o XML completo depois da ciência da operação;
          a confirmação (ou o desconhecimento) deve ser registrada em até 180 dias da emissão.
        </small></div>
      </div>
    </div>
  );
}
