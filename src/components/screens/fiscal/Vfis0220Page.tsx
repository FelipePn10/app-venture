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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">CT-e (Conhecimento de Transporte)</span><span className="erp-crumb-code">VFIS0220</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo CT-e</button>
          <button className="erp-btn" onClick={() => { setMode("list"); void reload(); }} disabled={busy}>Listagem</button>
        </div>
        {mode === "create" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : "Registrar CT-e"}</button>
          </div>
        )}
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0220 — CT-e (Conhecimento de Transporte)" filename="vfis0220" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">CT-e</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode === "list" ? (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Conhecimentos   — <span style={{fontWeight:400,opacity:0.65}}>{list.length} CT-e • registro local (sem SEFAZ)</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>#</th><th>Série</th><th>Transportadora</th><th>UF</th><th>Rateio</th><th>Frete</th><th>Total</th><th>Emissão</th></tr></thead>
                  <tbody>
                    {list.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum CT-e registrado.</td></tr>}
                    {list.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.numero_cte}</td>
                        <td>{c.serie || "—"}</td>
                        <td>{c.razao_social_emitente}<br /><small style={{ color: "#8aa894" }}>{c.cnpj_emitente}</small></td>
                        <td>{c.uf_emitente || "—"}</td>
                        <td>{c.tipo_rateio || "—"}</td>
                        <td>{money(c.valor_frete)}</td>
                        <td>{money(c.valor_total)}</td>
                        <td>{c.data_emissao?.slice(0, 10) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </>
        ) : (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Dados do CT-e   — <span style={{fontWeight:400,opacity:0.65}}>Total: R$ {money(form.valor_total)}</span></div><div className="erp-fieldset-body">
                
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Número CT-e</label>
                    <input className="erp-input num" type="number" value={form.numero_cte || ""} onChange={(e) => setF("numero_cte", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Série</label>
                    <input className="erp-input" value={form.serie} onChange={(e) => setF("serie", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">CFOP</label>
                    <input className="erp-input" value={form.cfop} onChange={(e) => setF("cfop", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Emissão</label>
                    <input className="erp-input" type="date" value={form.data_emissao} onChange={(e) => setF("data_emissao", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Entrada</label>
                    <input className="erp-input" type="date" value={form.data_entrada} onChange={(e) => setF("data_entrada", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">CNPJ Emitente</label>
                    <input className="erp-input" value={form.cnpj_emitente} onChange={(e) => setF("cnpj_emitente", e.target.value)} /></div>
                  <div className="erp-field erp-c5"><label className="erp-label">Razão Social (Transportadora)</label>
                    <input className="erp-input" value={form.razao_social_emitente} onChange={(e) => setF("razao_social_emitente", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">UF Emitente</label>
                    <input className="erp-input" maxLength={2} value={form.uf_emitente} onChange={(e) => setF("uf_emitente", e.target.value.toUpperCase())} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Tipo Rateio</label>
                    <select className="erp-input" value={form.tipo_rateio} onChange={(e) => setF("tipo_rateio", e.target.value as TipoRateio)}>
                      <option value="VALOR">VALOR</option><option value="PESO">PESO</option></select></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Frete</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_frete} onChange={(e) => setF("valor_frete", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Seguro</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_seguro} onChange={(e) => setF("valor_seguro", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Outros</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_outros} onChange={(e) => setF("valor_outros", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Base ICMS</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.base_icms} onChange={(e) => setF("base_icms", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Alíq. ICMS</label>
                    <input className="erp-input num" type="number" step="0.0001" value={form.aliq_icms} onChange={(e) => setF("aliq_icms", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Valor ICMS</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_icms} onChange={(e) => setF("valor_icms", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">CST ICMS</label>
                    <input className="erp-input" value={form.cst_icms} onChange={(e) => setF("cst_icms", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">NF-e Entrada vinculada (ID)</label>
                    <input className="erp-input num" type="number" value={form.fiscal_entry_id ?? ""} onChange={(e) => setF("fiscal_entry_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
                
              </div>
            </div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">CT-e: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
