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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Condições de Pagamento</span><span className="erp-crumb-code">VFIN0110</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={() => { setForm(EMPTY); setFeedback(null); }} disabled={busy}>+ Nova Condição</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIN0110 — Condições de Pagamento" filename="condicoes-pagamento" disabled={busy} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Condições de Pagamento</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Dados</div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c4"><label className="erp-label erp-req">Nome</label>
              <input className="erp-input" value={form.nome} placeholder="30/60/90" onChange={(e) => { setForm((p) => ({ ...p, nome: e.target.value })); setFeedback(null); }} /></div>
            <div className="erp-field erp-c8"><label className="erp-label erp-req">Parcelas (dias separados por vírgula)</label>
              <input className="erp-input" value={form.parcelas} placeholder="30,60,90  •  0 = à vista" onChange={(e) => { setForm((p) => ({ ...p, parcelas: e.target.value })); setFeedback(null); }} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Condições — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th style={{ width: 80 }}>ID</th><th>Nome</th><th>Parcelas (dias)</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhuma condição cadastrada.</td></tr>}
              {list.map((c) => <tr key={c.id}><td>{c.id}</td><td style={{ fontWeight: 600 }}>{c.nome}</td><td>{c.parcelas}</td></tr>)}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Condições: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
