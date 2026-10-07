import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { type FiscalEntry, listEntries } from "@/services/nfeService";
import {
  type EntradaDocumento, type UploadXmlResultado,
  getEntradaDocumento, uploadEntradaXml, importarEntradaPorChave, aprovarEntrada, statusRecebidas, type StatusRecebidas,
  ROTULO_STATUS_ENTRADA,
} from "@/services/nfeEntradaService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { EntradaDocumentoView } from "./EntradaDocumentoView";
import { EntradaManualForm } from "./EntradaManualForm";
import { NotasRecebidasPanel } from "./NotasRecebidasPanel";
import { FretesCompraPanel } from "./FretesCompraPanel";

/**
 * VFIS0210 — NF-e de Entrada.
 *
 * O fluxo segue o dos ERPs de mercado (Importador XML do Protheus, IntegraNF-e
 * do Focco, Fiscal Document Capture da Oracle):
 *   1. o ARQUIVO XML do fornecedor é importado (um ou vários de uma vez) e vira
 *      uma pré-nota com tudo o que a nota diz — itens, impostos, duplicatas;
 *   2. cada item é conciliado com o cadastro (o vínculo produto × fornecedor
 *      concilia sozinho; os demais vêm com sugestões) e recebe o plano de
 *      contas;
 *   3. as parcelas são distribuídas por plano de contas;
 *   4. a aprovação gera um título no contas a pagar por duplicata, com o rateio,
 *      dá entrada no estoque (descontado o que o pedido já recebeu) e contabiliza.
 * As notas emitidas contra o CNPJ também chegam pela SEFAZ (aba "Recebidas").
 * O CT-e do frete dessas compras entra na aba "Fretes (CT-e)" e vai ao custo.
 */

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Mode = "list" | "doc" | "manual" | "chave" | "recebidas" | "fretes";

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const cnpjFmt = (d: string) => (d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : d);

function statusEntradaPill(status: string): JSX.Element {
  const s = (status || "").toUpperCase();
  const cls = s === "APPROVED" ? "erp-badge-green" : s === "CONFERRED" ? "erp-badge-blue"
    : s === "PENDING" ? "erp-badge-amber" : s === "CANCELLED" ? "erp-badge-red" : "erp-badge-gray";
  return <span className={`erp-badge ${cls}`}>{ROTULO_STATUS_ENTRADA[s] ?? (status || "—")}</span>;
}

export function Vfis0210Page(): JSX.Element {
  const [mode, setMode] = useState<Mode>("list");
  const [list, setList] = useState<FiscalEntry[]>([]);
  const [doc, setDoc] = useState<EntradaDocumento | null>(null);
  const [resultados, setResultados] = useState<UploadXmlResultado[]>([]);
  const [accessKey, setAccessKey] = useState("");
  const [filtro, setFiltro] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [statusSefaz, setStatusSefaz] = useState<StatusRecebidas | null>(null);
  // Alerta de prazo de manifestação na aba, já ao abrir a tela.
  useEffect(() => { statusRecebidas().then(setStatusSefaz).catch(() => undefined); }, []);
  const alertasPrazo = (statusSefaz?.prazo_vencido ?? 0) + (statusSefaz?.prazo_proximo ?? 0);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listEntries()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar NF-e de entrada.") }); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function abrir(id: number) {
    setBusy(true); setFeedback(null);
    try { setDoc(await getEntradaDocumento(id)); setMode("doc"); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  async function enviarArquivos(files: FileList | File[] | null) {
    const arquivos = Array.from(files ?? []);
    if (!arquivos.length) return;
    const naoXml = arquivos.filter((f) => !/\.xml$/i.test(f.name));
    if (naoXml.length === arquivos.length) {
      setFeedback({ type: "error", message: "Selecione arquivos .xml (o DANFE em PDF não serve para importar a nota)." });
      return;
    }
    setBusy(true); setFeedback(null); setResultados([]);
    try {
      const res = await uploadEntradaXml(arquivos);
      setResultados(res);
      const ok = res.filter((r) => r.entrada);
      const erros = res.length - ok.length;
      if (ok.length === 1 && erros === 0 && ok[0].entrada) {
        setDoc(ok[0].entrada); setMode("doc");
        setFeedback({ type: "success", message: `NF-e ${ok[0].entrada.numero_nf} importada do arquivo ${ok[0].arquivo}. Confira a conciliação, o plano de contas e as parcelas.` });
      } else {
        setMode("list");
        setFeedback({
          type: erros ? (ok.length ? "info" : "error") : "success",
          message: `${ok.length} nota(s) importada(s)${erros ? `, ${erros} arquivo(s) com problema — veja abaixo` : ""}.`,
        });
      }
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function importarChave() {
    const chave = accessKey.replace(/\D/g, "");
    if (chave.length !== 44) { setFeedback({ type: "error", message: "A chave de acesso deve ter exatamente 44 dígitos." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const d = await importarEntradaPorChave(chave);
      setAccessKey(""); setDoc(d); setMode("doc");
      setFeedback({ type: "success", message: `NF-e ${d.numero_nf} baixada pela chave. Confira a conciliação e as parcelas.` });
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  async function aprovarDaLista(id: number) {
    setBusy(true); setFeedback(null);
    try {
      const d = await aprovarEntrada(id);
      setFeedback({ type: "success", message: `Nota ${d.numero_nf} aprovada: ${d.parcelas.length} título(s) gerado(s) no contas a pagar.` });
      await reload();
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e) });
    } finally { setBusy(false); }
  }

  const filtrada = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return list.filter((nf) => {
      if (filtroStatus && (nf.status || "").toUpperCase() !== filtroStatus) return false;
      if (!q) return true;
      return String(nf.numero_nf).includes(q) || nf.razao_social_emitente.toLowerCase().includes(q) || nf.cnpj_emitente.includes(q.replace(/\D/g, "") || "§");
    });
  }, [list, filtro, filtroStatus]);

  const pendentes = list.filter((n) => ["PENDING", "CONFERRED"].includes((n.status || "").toUpperCase())).length;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">NF-e de Entrada</span><span className="erp-crumb-code">VFIS0210</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Importar</span>
          <button className="erp-btn erp-btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>Arquivo(s) XML…</button>
          <input ref={fileRef} type="file" accept=".xml,application/xml,text/xml" multiple hidden
            onChange={(e) => void enviarArquivos(e.target.files)} />
          <button className="erp-btn" onClick={() => { setMode("chave"); setFeedback(null); }} disabled={busy}>Pela chave</button>
          <button className="erp-btn" onClick={() => { setMode("recebidas"); setDoc(null); setFeedback(null); }} disabled={busy}>Recebidas na SEFAZ</button>
          <button className="erp-btn" onClick={() => { setMode("fretes"); setDoc(null); setFeedback(null); }} disabled={busy}>CT-e de frete</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={() => { setMode("manual"); setFeedback(null); }} disabled={busy}>+ Lançamento manual</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Visão</span>
          <button className="erp-btn" onClick={() => { setMode("list"); setDoc(null); void reload(); }} disabled={busy}>Listagem</button>
        </div>
        {mode === "chave" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void importarChave()} disabled={busy}>{busy ? "Baixando..." : "Baixar NF-e"}</button>
          </div>
        )}
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0210 — NF-e de Entrada" filename="vfis0210" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            <button className={`erp-tab ${mode !== "recebidas" && mode !== "fretes" ? "active" : ""}`} onClick={() => { setMode("list"); setDoc(null); void reload(); }}>NF-e de Entrada</button>
            <button className={`erp-tab ${mode === "recebidas" ? "active" : ""}`} onClick={() => { setMode("recebidas"); setDoc(null); setFeedback(null); }}
              title={alertasPrazo ? `${alertasPrazo} nota(s) com o prazo de manifestação vencendo ou vencido` : undefined}>
              Recebidas na SEFAZ{alertasPrazo > 0 && <span className="erp-badge erp-badge-red" style={{ marginLeft: 6 }}>⚠ {alertasPrazo}</span>}
            </button>
            <button className={`erp-tab ${mode === "fretes" ? "active" : ""}`} onClick={() => { setMode("fretes"); setDoc(null); setFeedback(null); }}>Fretes (CT-e)</button>
          </div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {mode === "list" && (
              <>
                <div
                  className="erp-fieldset"
                  onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                  onDragLeave={() => setArrastando(false)}
                  onDrop={(e) => { e.preventDefault(); setArrastando(false); void enviarArquivos(e.dataTransfer.files); }}
                  style={{ borderStyle: "dashed", borderWidth: 2, borderColor: arrastando ? "var(--v-primary, #2563eb)" : undefined, cursor: "pointer" }}
                  onClick={() => fileRef.current?.click()}
                >
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12" style={{ textAlign: "center", padding: "10px 0", display: "block" }}>
                      <strong>Arraste aqui os arquivos XML das notas</strong> ou clique para escolher.
                      <div className="erp-field-hint">Pode enviar várias notas de uma vez. Os dados fiscais, itens, impostos e duplicatas são lidos do próprio XML.</div>
                    </div>
                  </div>
                </div>

                {resultados.length > 0 && (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Resultado da importação</div>
                    <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead><tr><th>Arquivo</th><th>Nota</th><th>Situação</th><th style={{ width: 90 }}></th></tr></thead>
                        <tbody>
                          {resultados.map((r, i) => (
                            <tr key={i}>
                              <td>{r.arquivo}</td>
                              <td>{r.entrada ? `${r.entrada.numero_nf}/${r.entrada.serie} — ${r.entrada.razao_social_emitente}` : "—"}</td>
                              <td>{r.entrada
                                ? <>{statusEntradaPill(r.entrada.status)} <small>{r.entrada.itens_conciliados}/{r.entrada.itens.length} itens conciliados</small></>
                                : <span style={{ color: "#b91c1c" }}>{r.erro}</span>}</td>
                              <td>{r.entrada && <button className="erp-btn erp-btn-sm" onClick={() => void abrir(r.entrada!.id)}>Abrir</button>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div></div>
                  </div>
                )}

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Entradas — <span style={{ fontWeight: 400, opacity: 0.65 }}>{filtrada.length} de {list.length} NF-e</span></div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c6"><label className="erp-label">Buscar</label>
                      <input className="erp-input" value={filtro} placeholder="Número, emitente ou CNPJ" onChange={(e) => setFiltro(e.target.value)} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Situação</label>
                      <select className="erp-input" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                        <option value="">Todas</option>
                        {Object.entries(ROTULO_STATUS_ENTRADA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select></div>
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead><tr><th>Nº</th><th>Emitente</th><th>Emissão</th><th>Entrada</th><th style={{ textAlign: "right" }}>Total</th><th>Situação</th><th style={{ width: 170 }}>Ações</th></tr></thead>
                        <tbody>
                          {filtrada.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma NF-e de entrada.</td></tr>}
                          {filtrada.map((nf) => {
                            const st = (nf.status || "").toUpperCase();
                            return (
                              <tr key={nf.id} onDoubleClick={() => void abrir(nf.id)}>
                                <td style={{ fontWeight: 600 }}>{nf.numero_nf}{nf.serie ? `/${nf.serie}` : ""}</td>
                                <td>{nf.razao_social_emitente}<br /><small style={{ color: "var(--v-text-muted)" }}>{cnpjFmt(nf.cnpj_emitente)}</small></td>
                                <td>{dataBR(nf.data_emissao)}</td>
                                <td>{dataBR(nf.data_entrada)}</td>
                                <td style={{ textAlign: "right" }}>{money(nf.valor_total)}</td>
                                <td>{statusEntradaPill(nf.status)}</td>
                                <td>
                                  <button className="erp-btn erp-btn-sm" onClick={() => void abrir(nf.id)}>{st === "PENDING" || st === "CONFERRED" ? "Conferir" : "Abrir"}</button>
                                  {st === "CONFERRED" && <button className="erp-btn erp-btn-sm erp-btn-primary" onClick={() => void aprovarDaLista(nf.id)}>Aprovar</button>}
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

            {mode === "chave" && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Importar pela chave — <span style={{ fontWeight: 400, opacity: 0.65 }}>baixa o XML da nota recebida na Focus NF-e e segue o mesmo fluxo da importação do arquivo</span></div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12">
                    <label className="erp-label erp-req">Chave de acesso (44 dígitos)</label>
                    <input className="erp-input" value={accessKey} maxLength={54}
                      placeholder="4126 1012 3456 7800 0190 5500 1000 0123 4510 0012 3459"
                      onChange={(e) => setAccessKey(e.target.value.replace(/[^\d ]/g, ""))}
                      onKeyDown={(e) => { if (e.key === "Enter") void importarChave(); }} />
                    <span className="erp-field-hint">{accessKey.replace(/\D/g, "").length}/44 dígitos. Requer o token da Focus NF-e (VFIS0100) e a manifestação do destinatário ativa.</span>
                  </div>
                </div>
              </div>
            )}

            {mode === "recebidas" && (
              <NotasRecebidasPanel
                onAbrirEntrada={(id) => void abrir(id)}
                onImportada={(d) => {
                  setDoc(d); setMode("doc"); void reload();
                  setFeedback({ type: "success", message: `NF-e ${d.numero_nf} importada da SEFAZ. Confira a conciliação, o plano de contas e as parcelas.` });
                }}
                onFeedback={setFeedback}
                onStatus={setStatusSefaz}
              />
            )}

            {mode === "fretes" && (
              <FretesCompraPanel entradas={list} onFeedback={setFeedback} onAbrirEntrada={(id) => void abrir(id)} />
            )}

            {mode === "doc" && doc && (
              <EntradaDocumentoView
                doc={doc}
                onChange={(d) => { setDoc(d); void reload(); }}
                onFeedback={setFeedback}
                onFechar={() => { setMode("list"); setDoc(null); void reload(); }}
              />
            )}

            {mode === "manual" && (
              <EntradaManualForm
                onCriada={(d) => { setDoc(d); setMode("doc"); void reload(); setFeedback({ type: "success", message: `Entrada ${d.numero_nf} lançada. Confira a conciliação e as parcelas antes de aprovar.` }); }}
                onFeedback={setFeedback}
                onCancelar={() => setMode("list")}
              />
            )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div style={{ display: "contents" }}>
          <div className="erp-status-item">Entradas: <strong>{list.length}</strong></div>
          <div className="erp-status-item">A conferir/aprovar: <strong>{pendentes}</strong></div>
        </div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
