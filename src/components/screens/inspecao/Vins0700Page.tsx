import { useCallback, useEffect, useState } from "react";
import {
  type Certificado, baixarPdfCertificado, cancelarCertificado, emitirCertificado, listarCertificados,
} from "@/services/qualidadeDocsService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const dataBR = (s?: string) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");
const br = (s?: string) => (s ? s.replace(".", ",") : "—");
const num = (s: string) => { const t = s.trim(); return t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t; };

export function Vins0700Page(): JSX.Element {
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [lista, setLista] = useState<Certificado[]>([]);
  const [filtro, setFiltro] = useState({ item: "", status: "EMITIDO" });
  const [form, setForm] = useState({ item: "", lote: "", quantidade: "", cliente: "", nf: "", lotesInspecao: "", obs: "" });
  const [aberto, setAberto] = useState<Certificado | null>(null);
  const [motivo, setMotivo] = useState("");

  const recarregar = useCallback(async () => {
    setBusy(true);
    try { setLista(await listarCertificados({ item: Number(filtro.item) || undefined, status: filtro.status })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar os certificados.") }); }
    finally { setBusy(false); }
  }, [filtro]);
  useEffect(() => { void recarregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function emitir() {
    setBusy(true); setFeedback(null);
    try {
      const lotes = form.lotesInspecao.split(/[\s,;]+/).map(Number).filter((x) => x > 0);
      const c = await emitirCertificado({
        item_code: Number(form.item), lote: form.lote.trim() || undefined, quantidade: num(form.quantidade),
        customer_code: Number(form.cliente) || undefined, fiscal_exit_id: Number(form.nf) || undefined,
        lotes_inspecao: lotes.length ? lotes : undefined, observacoes: form.obs.trim() || undefined,
      });
      await recarregar();
      setAberto(c);
      setFeedback({ type: "success", message: `Certificado ${c.numero} emitido.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function pdf(c: Certificado) {
    try { await baixarPdfCertificado(c.id, c.numero); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
  }

  async function cancelar() {
    if (!aberto) return;
    setBusy(true); setFeedback(null);
    try {
      const c = await cancelarCertificado(aberto.id, motivo);
      setAberto(c); setMotivo(""); await recarregar();
      setFeedback({ type: "success", message: `Certificado ${c.numero} cancelado.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const campo = (k: keyof typeof form, rotulo: string, cls = "erp-c2", req = false) => (
    <div className={`erp-field ${cls}`}><label className={`erp-label${req ? " erp-req" : ""}`}>{rotulo}</label>
      <input className="erp-input" value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} /></div>
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Certificados de Qualidade</span><span className="erp-crumb-code">VINS0700</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Consulta</span><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VINS0700 — Certificados de Qualidade" filename="vins0700" /></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Emitir certificado</div><div className="erp-fieldset-body">
              {campo("item", "Item", "erp-c2", true)}{campo("lote", "Lote / corrida")}{campo("quantidade", "Quantidade", "erp-c2", true)}
              {campo("cliente", "Cliente")}{campo("nf", "NF de saída (id)")}{campo("lotesInspecao", "Lotes de inspeção (opcional)")}
              {campo("obs", "Observações", "erp-c10")}
              <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label>
                <button className="erp-btn erp-btn-primary" onClick={() => void emitir()} disabled={busy || !form.item || !form.quantidade}>Emitir</button></div>
              <div className="erp-field erp-c12"><small>
                Sem lotes de inspeção informados, o sistema usa os lotes decididos do item com o mesmo lote/corrida. A corrida e o certificado da usina vêm do
                lote de estoque. O certificado só é emitido se houver inspeção aprovada que cubra a quantidade.
              </small></div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Certificados — <span style={{ fontWeight: 400, opacity: 0.65 }}>{lista.length}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label">Item</label>
                <input className="erp-input" value={filtro.item} onChange={(e) => setFiltro((f) => ({ ...f, item: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
                <select className="erp-input" value={filtro.status} onChange={(e) => setFiltro((f) => ({ ...f, status: e.target.value }))}>
                  <option value="">Todos</option><option value="EMITIDO">Emitidos</option><option value="CANCELADO">Cancelados</option>
                </select></div>
              <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Consultar</button></div>
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid">
                  <thead><tr><th>Nº</th><th>Item</th><th>Lote</th><th>Corrida</th><th className="num">Qtd</th><th>Cliente</th><th>Emitido</th><th>Situação</th><th style={{ width: 150 }} /></tr></thead>
                  <tbody>
                    {lista.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhum certificado.</td></tr>}
                    {lista.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.numero}</td><td>{c.item_code} — {c.conteudo.item_nome}</td><td>{c.lote ?? "—"}</td><td>{c.corrida ?? "—"}</td>
                        <td className="num">{Number(c.quantidade).toLocaleString("pt-BR")}</td><td>{c.conteudo.cliente?.nome ?? "—"}</td><td>{dataBR(c.emitido_em)}</td>
                        <td><span className={`erp-badge ${c.status === "EMITIDO" ? "erp-badge-green" : "erp-badge-gray"}`}>{c.status.toLowerCase()}</span></td>
                        <td style={{ display: "flex", gap: 4 }}>
                          <button className="erp-btn erp-btn-sm" onClick={() => setAberto(c)}>Abrir</button>
                          <button className="erp-btn erp-btn-sm" onClick={() => void pdf(c)}>PDF</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div></div>

            {aberto && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Certificado {aberto.numero}{aberto.status === "CANCELADO" ? " — CANCELADO" : ""}</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <p style={{ margin: "0 0 6px" }}>
                  Item {aberto.item_code} — {aberto.conteudo.item_nome} · quantidade {br(aberto.conteudo.quantidade)} · lote {aberto.conteudo.lote || "—"} · corrida {aberto.conteudo.corrida || "—"}
                  {aberto.conteudo.certificado_usina ? ` · certificado da usina ${aberto.conteudo.certificado_usina}` : ""}
                  {aberto.conteudo.cliente ? ` · cliente ${aberto.conteudo.cliente.nome}` : ""}{aberto.conteudo.nf ? ` · NF ${aberto.conteudo.nf.numero}/${aberto.conteudo.nf.serie}` : ""}
                </p>
                {aberto.motivo_cancelamento && <p style={{ margin: "0 0 6px" }}>Cancelado: {aberto.motivo_cancelamento}</p>}
                {aberto.conteudo.lotes.map((l) => (
                  <div key={l.id} style={{ marginBottom: 8 }}>
                    <b>Lote de inspeção {l.numero}</b> — {l.decisao.toLowerCase().replace(/_/g, " ")}{l.concessao ? " (sob concessão)" : ""}, {br(l.qtd_aproveitada)} aprovado · {l.amostra ?? ""}
                    <table className="erp-grid">
                      <thead><tr><th>Característica</th><th>Especificação</th><th className="num">n</th><th className="num">Mín.</th><th className="num">Máx.</th><th className="num">Média</th><th className="num">NC</th><th>Instrumento</th></tr></thead>
                      <tbody>
                        {l.caracteristicas.map((c) => (
                          <tr key={c.nome}><td>{c.nome}{c.critica ? " (crítica)" : ""}</td>
                            <td>{c.tipo === "VARIAVEL" ? `${br(c.minimo)} a ${br(c.maximo)} ${c.unidade ?? ""}` : "conforme"}</td>
                            <td className="num">{c.n}</td><td className="num">{br(c.medido_minimo)}</td><td className="num">{br(c.medido_maximo)}</td><td className="num">{br(c.media)}</td>
                            <td className="num">{c.nao_conformes}</td><td>{(c.instrumentos ?? []).join(", ") || "—"}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                {aberto.status === "EMITIDO" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="erp-input" placeholder="motivo do cancelamento" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                    <button className="erp-btn erp-btn-danger" disabled={busy || !motivo.trim()} onClick={() => void cancelar()}>Cancelar certificado</button>
                  </div>
                )}
              </div></div></div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
