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
          <span className="fsc-screen-title">VFIN0130 — Centros de Custo</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={() => { setForm(EMPTY); setFeedback(null); }} disabled={busy}>+ Novo Centro</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIN0130 — Centros de Custo" filename="centros-de-custo" disabled={busy} />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Dados</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Código</label>
              <input className="fsc-input" value={form.codigo} placeholder="CC-001" onChange={(e) => setF("codigo", e.target.value)} /></div>
            <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Descrição</label>
              <input className="fsc-input" value={form.descricao} onChange={(e) => setF("descricao", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Tipo</label>
              <select className="fsc-select" value={form.tipo} onChange={(e) => setF("tipo", e.target.value)}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Centros de custo</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>Código</th><th>Descrição</th><th>Tipo</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhum centro cadastrado.</td></tr>}
              {list.map((c) => <tr key={c.id}><td style={{ fontWeight: 600 }}>{c.codigo}</td><td>{c.descricao}</td><td><span className="fsc-pill fsc-pill-gray">{c.tipo}</span></td></tr>)}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Centros: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
