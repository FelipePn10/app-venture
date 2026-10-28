import { useCallback, useEffect, useState } from "react";
import {
  type DocumentoQ, type RevisaoDoc, aprovarDocumento, baixarArquivoRevisao, descartarRascunho, gravarRascunho, listarDocumentos, obterDocumento, salvarDocumento,
} from "@/services/qualidadeDocsService";
import { usuariosDaEmpresa } from "@/services/capaService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAcessoStore } from "@/store/acessoStore";
import { useAuthStore } from "@/store/authStore";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const TIPOS: [string, string][] = [["IT", "Instrução de trabalho"], ["PROCEDIMENTO", "Procedimento"], ["FORMULARIO", "Formulário"],
  ["PLANO_INSPECAO", "Plano de inspeção"], ["ESPECIFICACAO", "Especificação"], ["OUTRO", "Outro"]];
const ROTULO_TIPO = Object.fromEntries(TIPOS);
const dataBR = (s?: string) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

function lerBase64(f: File): Promise<string> {
  return new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => falha(r.error);
    r.readAsDataURL(f);
  });
}

export function Vins0800Page(): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const acesso = useAcessoStore((s) => s.acesso);
  const podeAprovar = !acesso?.restrito || isAdmin || acesso.permissoes.some((p) => p.modulo === "qualidade" && p.acao === "APROVAR");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [lista, setLista] = useState<DocumentoQ[]>([]);
  const [filtro, setFiltro] = useState({ tipo: "", busca: "" });
  const [cab, setCab] = useState({ id: null as number | null, codigo: "", titulo: "", tipo: "IT", item: "", area: "" });
  const [aberto, setAberto] = useState<DocumentoQ | null>(null);
  const [rasc, setRasc] = useState({ descricao: "", conteudo: "" });
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nomes, setNomes] = useState<Record<string, string>>({});

  const recarregar = useCallback(async () => {
    setBusy(true);
    try { setLista(await listarDocumentos({ tipo: filtro.tipo, busca: filtro.busca })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar os documentos.") }); }
    finally { setBusy(false); }
  }, [filtro]);
  useEffect(() => { void recarregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { usuariosDaEmpresa().then((u) => setNomes(Object.fromEntries(u.map((x) => [x.user_id, x.nome])))).catch(() => setNomes({})); }, []);

  function mostrar(d: DocumentoQ) {
    setAberto(d);
    setCab({ id: d.id, codigo: d.codigo, titulo: d.titulo, tipo: d.tipo, item: d.item_code ? String(d.item_code) : "", area: d.area ?? "" });
    setRasc({ descricao: d.rascunho?.descricao_mudanca ?? "", conteudo: d.rascunho?.conteudo ?? d.vigente?.conteudo ?? "" });
    setArquivo(null);
  }

  async function executar(fn: () => Promise<DocumentoQ>, msg: (d: DocumentoQ) => string) {
    setBusy(true); setFeedback(null);
    try {
      const d = await fn();
      mostrar(d); await recarregar();
      setFeedback({ type: "success", message: msg(d) });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function gravarCab() {
    await executar(() => salvarDocumento(cab.id, { codigo: cab.codigo, titulo: cab.titulo, tipo: cab.tipo, item_code: Number(cab.item) || undefined, area: cab.area || undefined }),
      (d) => `Documento ${d.codigo} gravado.`);
  }

  async function gravarRasc() {
    if (!aberto) return;
    const base = arquivo ? await lerBase64(arquivo) : undefined;
    await executar(() => gravarRascunho(aberto.id, {
      descricao_mudanca: rasc.descricao, conteudo: rasc.conteudo || undefined,
      arquivo_nome: arquivo?.name, arquivo_tipo: arquivo?.type || undefined, arquivo_base64: base,
    }), (d) => `Rascunho da revisão ${d.rascunho?.revisao ?? ""} gravado.`);
  }

  const linhaRev = (r: RevisaoDoc) => (
    <tr key={r.id}>
      <td style={{ fontWeight: 600 }}>{r.revisao}</td>
      <td><span className={`erp-badge ${r.status === "VIGENTE" ? "erp-badge-green" : r.status === "RASCUNHO" ? "erp-badge-amber" : "erp-badge-gray"}`}>{r.status.toLowerCase()}</span></td>
      <td>{r.descricao_mudanca}</td><td>{nomes[r.elaborado_por] ?? "—"}</td><td>{r.aprovado_por ? nomes[r.aprovado_por] ?? "—" : "—"}</td>
      <td>{dataBR(r.vigente_desde)}</td><td>{dataBR(r.obsoleta_em)}</td>
      <td>{r.tem_arquivo && <button className="erp-btn erp-btn-sm" onClick={() => void baixarArquivoRevisao(r).catch((e) => setFeedback({ type: "error", message: errMessage(e) }))}>Arquivo</button>}</td>
    </tr>
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Documentos da Qualidade</span><span className="erp-crumb-code">VINS0800</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Consulta</span><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Documento</span>
          <button className="erp-btn erp-btn-new" onClick={() => { setAberto(null); setCab({ id: null, codigo: "", titulo: "", tipo: "IT", item: "", area: "" }); }}>Novo documento</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VINS0800 — Documentos da Qualidade" filename="vins0800" /></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Documentos — <span style={{ fontWeight: 400, opacity: 0.65 }}>{lista.length}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">Tipo</label>
                <select className="erp-input" value={filtro.tipo} onChange={(e) => setFiltro((f) => ({ ...f, tipo: e.target.value }))}>
                  <option value="">Todos</option>{TIPOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div className="erp-field erp-c4"><label className="erp-label">Busca</label>
                <input className="erp-input" value={filtro.busca} onChange={(e) => setFiltro((f) => ({ ...f, busca: e.target.value }))} placeholder="código ou título" /></div>
              <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Consultar</button></div>
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid">
                  <thead><tr><th>Código</th><th>Título</th><th>Tipo</th><th>Item</th><th>Revisão vigente</th><th>Desde</th><th>Rascunho</th><th style={{ width: 80 }} /></tr></thead>
                  <tbody>
                    {lista.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum documento.</td></tr>}
                    {lista.map((d) => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600 }}>{d.codigo}</td><td>{d.titulo}</td><td>{ROTULO_TIPO[d.tipo]}</td><td>{d.item_code ?? "—"}</td>
                        <td>{d.vigente ? `rev. ${d.vigente.revisao}` : <span className="erp-badge erp-badge-amber">sem revisão vigente</span>}</td>
                        <td>{dataBR(d.vigente?.vigente_desde)}</td><td>{d.rascunho ? "em elaboração" : "—"}</td>
                        <td><button className="erp-btn erp-btn-sm" onClick={() => void obterDocumento(d.id).then(mostrar).catch((e) => setFeedback({ type: "error", message: errMessage(e) }))}>Abrir</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">{cab.id ? `Documento ${cab.codigo}` : "Novo documento"}</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input" value={cab.codigo} onChange={(e) => setCab((c) => ({ ...c, codigo: e.target.value }))} /></div>
              <div className="erp-field erp-c5"><label className="erp-label erp-req">Título</label><input className="erp-input" value={cab.titulo} onChange={(e) => setCab((c) => ({ ...c, titulo: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Tipo</label>
                <select className="erp-input" value={cab.tipo} onChange={(e) => setCab((c) => ({ ...c, tipo: e.target.value }))}>{TIPOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Item</label><input className="erp-input" value={cab.item} onChange={(e) => setCab((c) => ({ ...c, item: e.target.value }))} /></div>
              <div className="erp-field erp-c4"><label className="erp-label">Área</label><input className="erp-input" value={cab.area} onChange={(e) => setCab((c) => ({ ...c, area: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn erp-btn-primary" onClick={() => void gravarCab()} disabled={busy || !cab.codigo || !cab.titulo}>Gravar</button></div>
            </div></div>

            {aberto && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">{aberto.rascunho ? `Rascunho da revisão ${aberto.rascunho.revisao}` : `Nova revisão`}</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c12"><label className="erp-label erp-req">O que muda nesta revisão</label>
                    <input className="erp-input" value={rasc.descricao} onChange={(e) => setRasc((r) => ({ ...r, descricao: e.target.value }))} /></div>
                  <div className="erp-field erp-c12"><label className="erp-label">Texto</label>
                    <textarea className="erp-input" rows={8} value={rasc.conteudo} onChange={(e) => setRasc((r) => ({ ...r, conteudo: e.target.value }))} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label">Arquivo (até 10 MB){aberto.rascunho?.tem_arquivo ? ` — atual: ${aberto.rascunho.arquivo_nome ?? "arquivo"}` : ""}</label>
                    <input className="erp-input" type="file" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} /></div>
                  <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                    <button className="erp-btn erp-btn-primary" onClick={() => void gravarRasc()} disabled={busy || !rasc.descricao.trim()}>Gravar rascunho</button>
                    {aberto.rascunho && <>
                      <button className="erp-btn" onClick={() => void executar(() => aprovarDocumento(aberto.id), (d) => `Revisão ${d.vigente?.revisao} aprovada e vigente.`)} disabled={busy || !podeAprovar}>Aprovar revisão</button>
                      <button className="erp-btn erp-btn-danger" onClick={() => void executar(() => descartarRascunho(aberto.id), () => "Rascunho descartado.")} disabled={busy}>Descartar rascunho</button>
                    </>}
                  </div>
                  <div className="erp-field erp-c12"><small>Quem elaborou a revisão não pode aprová-la. Aprovar torna a revisão vigente e a anterior obsoleta; a revisão aprovada não muda mais.</small></div>
                </div></div>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Revisões</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead><tr><th>Rev.</th><th>Situação</th><th>Mudança</th><th>Elaborou</th><th>Aprovou</th><th>Vigente desde</th><th>Obsoleta em</th><th /></tr></thead>
                    <tbody>{(aberto.revisoes ?? []).map(linhaRev)}</tbody>
                  </table>
                  {aberto.vigente?.conteudo && <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{aberto.vigente.conteudo}</pre>}
                </div></div></div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
