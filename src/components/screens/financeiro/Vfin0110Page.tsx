import { useState, useCallback, useEffect } from "react";
import { type CondicaoPagamento, type CondicaoPagamentoDTO, listCondicoesPagamento, createCondicaoPagamento } from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: CondicaoPagamentoDTO = { nome: "", parcelas: "" };

export function Vfin0110Page(): JSX.Element {
  const [form, setForm] = useState<CondicaoPagamentoDTO>(EMPTY);
  const [list, setList] = useState<CondicaoPagamento[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listCondicoesPagamento()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar condições.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function salvar() {
    if (!form.nome.trim() || !form.parcelas.trim()) { setFeedback({ type: "error", message: "Nome e parcelas são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createCondicaoPagamento({ nome: form.nome.trim(), parcelas: form.parcelas.replace(/\s/g, "") });
      setFeedback({ type: "success", message: `Condição "${form.nome}" cadastrada.` });
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
          <span className="fsc-screen-title">VFIN0110 — Condições de Pagamento</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={() => { setForm(EMPTY); setFeedback(null); }} disabled={busy}>+ Nova Condição</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIN0110 — Condições de Pagamento" filename="condicoes-pagamento" disabled={busy} />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Dados</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-4"><label className="fsc-label fsc-label-req">Nome</label>
              <input className="fsc-input" value={form.nome} placeholder="30/60/90" onChange={(e) => { setForm((p) => ({ ...p, nome: e.target.value })); setFeedback(null); }} /></div>
            <div className="fsc-field fsc-col-8"><label className="fsc-label fsc-label-req">Parcelas (dias separados por vírgula)</label>
              <input className="fsc-input" value={form.parcelas} placeholder="30,60,90  •  0 = à vista" onChange={(e) => { setForm((p) => ({ ...p, parcelas: e.target.value })); setFeedback(null); }} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Condições</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th style={{ width: 80 }}>ID</th><th>Nome</th><th>Parcelas (dias)</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhuma condição cadastrada.</td></tr>}
              {list.map((c) => <tr key={c.id}><td>{c.id}</td><td style={{ fontWeight: 600 }}>{c.nome}</td><td>{c.parcelas}</td></tr>)}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Condições: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
