import { useCallback, useEffect, useState } from "react";
import {
  type Recuperacao, type SituacaoRecuperacao, ROTULO_FORMA, ROTULO_RECUPERACAO, listarRecuperacoes, mudarRecuperacao,
} from "@/services/posVendaService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadSuppliers } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const brl = (v?: string | number) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const COR: Record<SituacaoRecuperacao, string> = { RECLAMADA: "erp-badge-blue", ACEITA: "erp-badge-amber", RECUSADA: "erp-badge-gray", RECUPERADA: "erp-badge-green" };

/**
 * VATC0320 — Recuperação junto ao Fornecedor. O custo da garantia de uma falha
 * de componente comprado é cobrado do fornecedor: a reclamação nasce na OS
 * (VATC0300), o fornecedor aceita ou recusa, e o ressarcimento (nota de
 * crédito, débito, reposição ou desconto) abate o custo líquido da garantia
 * nos indicadores (VATC0400).
 */
export function Vatc0320Page(): JSX.Element {
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [filtro, setFiltro] = useState({ situacao: "", fornecedor: undefined as number | undefined });
  const [lista, setLista] = useState<Recuperacao[]>([]);
  const [aberta, setAberta] = useState<Recuperacao | null>(null);
  const [acao, setAcao] = useState({ resposta: "", valor: "", forma: "NOTA_CREDITO", documento: "", data: hojeISO() });

  const recarregar = useCallback(async () => {
    setBusy(true);
    try { setLista(await listarRecuperacoes({ situacao: filtro.situacao, fornecedor: filtro.fornecedor })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao consultar as reclamações.") }); }
    finally { setBusy(false); }
  }, [filtro]);
  useEffect(() => { void recarregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function abrir(r: Recuperacao) {
    setAberta(r);
    setAcao({ resposta: "", valor: String(r.valor_reclamado), forma: "NOTA_CREDITO", documento: "", data: hojeISO() });
  }

  async function mudar(situacao: SituacaoRecuperacao, ok: string) {
    if (!aberta) return;
    setBusy(true); setFeedback(null);
    try {
      const r = await mudarRecuperacao(aberta.id, situacao === "RECUPERADA"
        ? { situacao, valor_recuperado: acao.valor.replace(",", "."), forma: acao.forma, documento: acao.documento || undefined, recuperado_em: acao.data, resposta: acao.resposta || undefined }
        : { situacao, resposta: acao.resposta || undefined });
      setAberta(r); await recarregar(); setFeedback({ type: "success", message: ok });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const final = aberta && (aberta.situacao === "RECUSADA" || aberta.situacao === "RECUPERADA");
  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Assistência</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Recuperação junto ao Fornecedor</span><span className="erp-crumb-code">VATC0320</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Consulta</span><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VATC0320 — Recuperação junto ao Fornecedor" filename="vatc0320" /></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
            <div className="erp-fieldset"><div className="erp-fieldset-head">Reclamações — <span style={{ fontWeight: 400, opacity: 0.65 }}>{lista.length}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
                <select className="erp-input" value={filtro.situacao} onChange={(e) => setFiltro((f) => ({ ...f, situacao: e.target.value }))}>
                  <option value="">Todas</option>{(Object.keys(ROTULO_RECUPERACAO) as SituacaoRecuperacao[]).map((s) => <option key={s} value={s}>{ROTULO_RECUPERACAO[s]}</option>)}
                </select></div>
              <div className="erp-field erp-c4"><label className="erp-label">Fornecedor</label>
                <LookupField value={filtro.fornecedor} loader={loadSuppliers} entityLabel="fornecedor" placeholder="Todos" onChange={(c) => setFiltro((f) => ({ ...f, fornecedor: c ?? undefined }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Consultar</button></div>
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid" id="rec-lista">
                  <thead><tr><th>Nº</th><th>Fornecedor</th><th>OS / chamado</th><th>Item</th><th>Reclamado</th><th>Recuperado</th><th>Situação</th><th style={{ width: 80 }} /></tr></thead>
                  <tbody>
                    {lista.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhuma reclamação. Abra pela OS concluída (VATC0300).</td></tr>}
                    {lista.map((r) => (
                      <tr key={r.id}><td style={{ fontWeight: 600 }}>{r.numero}</td><td>{r.fornecedor_nome || r.supplier_code}</td>
                        <td>{r.os_numero ? `OS ${r.os_numero}` : "—"}{r.call_number ? ` · chamado ${r.call_number}` : ""}</td><td>{r.item_code ? `${r.item_code} · ${r.item_nome ?? ""}` : "—"}</td>
                        <td>{brl(r.valor_reclamado)}</td><td>{brl(r.valor_recuperado)}</td><td><span className={`erp-badge ${COR[r.situacao]}`}>{ROTULO_RECUPERACAO[r.situacao]}</span></td>
                        <td><button className="erp-btn erp-btn-sm" onClick={() => abrir(r)}>Abrir</button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div></div>

            {aberta && (
              <div className="erp-fieldset" id="rec-detalhe"><div className="erp-fieldset-head">Reclamação {aberta.numero} — {aberta.fornecedor_nome || aberta.supplier_code}</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c12" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <span><span className={`erp-badge ${COR[aberta.situacao]}`}>{ROTULO_RECUPERACAO[aberta.situacao]}</span></span>
                  <span>Reclamado: <strong>{brl(aberta.valor_reclamado)}</strong></span>
                  <span>Recuperado: <strong>{brl(aberta.valor_recuperado)}</strong>{aberta.forma ? ` · ${ROTULO_FORMA[aberta.forma] ?? aberta.forma}` : ""}{aberta.documento ? ` · ${aberta.documento}` : ""}</span>
                  {aberta.capa_id && <span>CAPA ligada: <strong>{aberta.capa_id}</strong> (VINS0500)</span>}
                </div>
                <div className="erp-field erp-c12"><strong>Motivo:</strong> {aberta.motivo}{aberta.resposta ? <><br /><strong>Resposta do fornecedor:</strong> {aberta.resposta}</> : null}</div>
                {!final && (<>
                  <div className="erp-field erp-c12"><label className="erp-label">Resposta do fornecedor</label><input className="erp-input" id="rec-resposta" value={acao.resposta} onChange={(e) => setAcao((a) => ({ ...a, resposta: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Valor recuperado</label><input className="erp-input" id="rec-valor" inputMode="decimal" value={acao.valor} onChange={(e) => setAcao((a) => ({ ...a, valor: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Forma</label>
                    <select className="erp-input" id="rec-forma" value={acao.forma} onChange={(e) => setAcao((a) => ({ ...a, forma: e.target.value }))}>{Object.entries(ROTULO_FORMA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Documento</label><input className="erp-input" id="rec-documento" value={acao.documento} onChange={(e) => setAcao((a) => ({ ...a, documento: e.target.value }))} placeholder="Ex.: NC 5521" /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Data</label><input className="erp-input" type="date" value={acao.data} onChange={(e) => setAcao((a) => ({ ...a, data: e.target.value }))} /></div>
                  <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                    {aberta.situacao === "RECLAMADA" && <button className="erp-btn" disabled={busy} onClick={() => void mudar("ACEITA", "Fornecedor aceitou a reclamação.")}>Fornecedor aceitou</button>}
                    <button className="erp-btn erp-btn-primary" id="rec-recuperar" disabled={busy || !acao.valor} onClick={() => void mudar("RECUPERADA", "Ressarcimento registrado.")}>Registrar ressarcimento</button>
                    <button className="erp-btn erp-btn-danger" disabled={busy || !acao.resposta.trim()} onClick={() => void mudar("RECUSADA", "Recusa do fornecedor registrada.")}>Fornecedor recusou</button>
                  </div>
                </>)}
              </div></div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
