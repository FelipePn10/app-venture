import { useState, useCallback, useEffect } from "react";
import { type CentroCusto, type CentroCustoDTO, listCentrosCusto, createCentroCusto } from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const TIPOS = ["PRODUTIVO", "ADMINISTRATIVO", "COMERCIAL", "AUXILIAR"];
const EMPTY: CentroCustoDTO = { codigo: "", descricao: "", tipo: "PRODUTIVO" };

export function Vfin0130Page(): JSX.Element {
  const [form, setForm] = useState<CentroCustoDTO>(EMPTY);
  const [list, setList] = useState<CentroCusto[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listCentrosCusto()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar centros de custo.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof CentroCustoDTO>(k: K, v: CentroCustoDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  async function salvar() {
    if (!form.codigo.trim() || !form.descricao.trim()) { setFeedback({ type: "error", message: "Código e Descrição são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createCentroCusto(form);
      setFeedback({ type: "success", message: `Centro de custo ${form.codigo} cadastrado.` });
      setForm(EMPTY); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Centros de Custo</span><span className="erp-crumb-code">VFIN0130</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={() => { setForm(EMPTY); setFeedback(null); }} disabled={busy}>+ Novo Centro</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIN0130 — Centros de Custo" filename="centros-de-custo" disabled={busy} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Centros de Custo</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Dados</div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Código</label>
              <input className="erp-input" value={form.codigo} placeholder="CC-001" onChange={(e) => setF("codigo", e.target.value)} /></div>
            <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label>
              <input className="erp-input" value={form.descricao} onChange={(e) => setF("descricao", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Tipo</label>
              <select className="erp-input" value={form.tipo} onChange={(e) => setF("tipo", e.target.value)}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Centros de custo — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Código</th><th>Descrição</th><th>Tipo</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhum centro cadastrado.</td></tr>}
              {list.map((c) => <tr key={c.id}><td style={{ fontWeight: 600 }}>{c.codigo}</td><td>{c.descricao}</td><td><span className="erp-badge erp-badge-gray">{c.tipo}</span></td></tr>)}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Centros: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
