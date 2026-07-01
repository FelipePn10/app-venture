import { useState, useCallback, useEffect } from "react";
import { type Cte, type CreateCteDTO, type TipoRateio, listCtes, createCte } from "@/services/nfeService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY: CreateCteDTO = {
  numero_cte: 0, serie: "001", data_emissao: today(), data_entrada: today(),
  cnpj_emitente: "", razao_social_emitente: "", uf_emitente: "", cfop: "1352",
  valor_frete: 0, valor_seguro: 0, valor_outros: 0, valor_total: 0,
  valor_icms: 0, base_icms: 0, aliq_icms: 0, cst_icms: "00", tipo_rateio: "VALOR",
};

export function Vfis0220Page(): JSX.Element {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [list, setList] = useState<Cte[]>([]);
  const [form, setForm] = useState<CreateCteDTO>(EMPTY);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listCtes()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar CT-e.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof CreateCteDTO>(k: K, v: CreateCteDTO[K]) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      next.valor_total = Number((next.valor_frete + next.valor_seguro + next.valor_outros).toFixed(2));
      return next;
    });
    setFeedback(null);
  };

  function novo() { setForm(EMPTY); setMode("create"); setFeedback(null); }

  async function salvar() {
    if (!form.numero_cte || !form.cnpj_emitente.trim() || !form.uf_emitente.trim()) {
      setFeedback({ type: "error", message: "Número, CNPJ e UF do emitente são obrigatórios." }); return;
    }
    setBusy(true); setFeedback(null);
    try {
      const c = await createCte(form);
      setFeedback({ type: "success", message: `CT-e ${c?.numero_cte ?? form.numero_cte} registrado.` });
      setMode("list"); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar">
        <div className="fsc-topbar-left">
          <div className="fsc-logo">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
              <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>
          <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
          <span className="fsc-screen-title">VFIS0220 — CT-e (Conhecimento de Transporte)</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Novo CT-e</button>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => { setMode("list"); void reload(); }} disabled={busy}>Listagem</button>
        </div>
        {mode === "create" && (
          <div className="fsc-action-group">
            <span className="fsc-action-label">Ações</span>
            <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : "Registrar CT-e"}</button>
          </div>
        )}
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0220 — CT-e (Conhecimento de Transporte)" filename="vfis0220" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode === "list" ? (
          <>
            <div className="fsc-section-banner">
              <span className="fsc-section-banner-pill">Conhecimentos</span>
              <div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">{list.length} CT-e • registro local (sem SEFAZ)</span>
            </div>
            <div className="fsc-card">
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead><tr><th>#</th><th>Série</th><th>Transportadora</th><th>UF</th><th>Rateio</th><th className="fsc-num">Frete</th><th className="fsc-num">Total</th><th>Emissão</th></tr></thead>
                  <tbody>
                    {list.length === 0 && <tr><td colSpan={8} className="fsc-empty">Nenhum CT-e registrado.</td></tr>}
                    {list.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.numero_cte}</td>
                        <td>{c.serie || "—"}</td>
                        <td>{c.razao_social_emitente}<br /><small style={{ color: "#8aa894" }}>{c.cnpj_emitente}</small></td>
                        <td>{c.uf_emitente || "—"}</td>
                        <td>{c.tipo_rateio || "—"}</td>
                        <td className="fsc-num">{money(c.valor_frete)}</td>
                        <td className="fsc-num">{money(c.valor_total)}</td>
                        <td>{c.data_emissao?.slice(0, 10) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="fsc-section-banner">
              <span className="fsc-section-banner-pill">Dados do CT-e</span>
              <div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">Total: R$ {money(form.valor_total)}</span>
            </div>
            <div className="fsc-card">
              <div className="fsc-card-body">
                <div className="fsc-grid">
                  <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Número CT-e</label>
                    <input className="fsc-input fsc-input-right" type="number" value={form.numero_cte || ""} onChange={(e) => setF("numero_cte", Number(e.target.value))} /></div>
                  <div className="fsc-field fsc-col-1"><label className="fsc-label">Série</label>
                    <input className="fsc-input" value={form.serie} onChange={(e) => setF("serie", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">CFOP</label>
                    <input className="fsc-input" value={form.cfop} onChange={(e) => setF("cfop", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Emissão</label>
                    <input className="fsc-input" type="date" value={form.data_emissao} onChange={(e) => setF("data_emissao", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Entrada</label>
                    <input className="fsc-input" type="date" value={form.data_entrada} onChange={(e) => setF("data_entrada", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">CNPJ Emitente</label>
                    <input className="fsc-input" value={form.cnpj_emitente} onChange={(e) => setF("cnpj_emitente", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-5"><label className="fsc-label">Razão Social (Transportadora)</label>
                    <input className="fsc-input" value={form.razao_social_emitente} onChange={(e) => setF("razao_social_emitente", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">UF Emitente</label>
                    <input className="fsc-input" maxLength={2} value={form.uf_emitente} onChange={(e) => setF("uf_emitente", e.target.value.toUpperCase())} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo Rateio</label>
                    <select className="fsc-select" value={form.tipo_rateio} onChange={(e) => setF("tipo_rateio", e.target.value as TipoRateio)}>
                      <option value="VALOR">VALOR</option><option value="PESO">PESO</option></select></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Frete</label>
                    <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.valor_frete} onChange={(e) => setF("valor_frete", Number(e.target.value))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Seguro</label>
                    <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.valor_seguro} onChange={(e) => setF("valor_seguro", Number(e.target.value))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Outros</label>
                    <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.valor_outros} onChange={(e) => setF("valor_outros", Number(e.target.value))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Base ICMS</label>
                    <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.base_icms} onChange={(e) => setF("base_icms", Number(e.target.value))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Alíq. ICMS</label>
                    <input className="fsc-input fsc-input-right" type="number" step="0.0001" value={form.aliq_icms} onChange={(e) => setF("aliq_icms", Number(e.target.value))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Valor ICMS</label>
                    <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.valor_icms} onChange={(e) => setF("valor_icms", Number(e.target.value))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">CST ICMS</label>
                    <input className="fsc-input" value={form.cst_icms} onChange={(e) => setF("cst_icms", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">NF-e Entrada vinculada (ID)</label>
                    <input className="fsc-input fsc-input-right" type="number" value={form.fiscal_entry_id ?? ""} onChange={(e) => setF("fiscal_entry_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">CT-e: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
