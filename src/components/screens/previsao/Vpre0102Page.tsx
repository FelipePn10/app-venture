import { useState, useCallback } from "react";
import {
  type ForecastBlockDTO,
  createBlock, listBlocks,
} from "@/services/salesForecastService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);

export function Vpre0102Page(): JSX.Element {
  const [rows, setRows] = useState<ForecastBlockDTO[]>([]);
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const listar = () => run(async () => {
    setRows(await listBlocks());
    setFeedback({ type: "info", message: "Bloqueios carregados." });
  });

  const gravar = () => run(async () => {
    if (!start || !end) { setFeedback({ type: "error", message: "Informe início e fim do período." }); return; }
    if (end < start) { setFeedback({ type: "error", message: "A data final não pode ser anterior à inicial." }); return; }
    await createBlock({ start_date: start, end_date: end, reason: reason || undefined });
    setReason("");
    setFeedback({ type: "success", message: "Período de previsão bloqueado. Semanas cuja segunda-feira cair no período serão recusadas na gravação." });
    setRows(await listBlocks());
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Bloqueio de Previsão de Vendas</span>
          <span className="erp-crumb-code">VPRE0102</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Períodos em que a gravação de previsão fica bloqueada</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><button className="erp-btn" onClick={listar} disabled={busy}>{busy && <span className="erp-spin" />}Atualizar lista</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPRE0102 — Bloqueio de Previsão" filename="vpre0102" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Novo bloqueio de período</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Início</label><input className="erp-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Fim</label><input className="erp-input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            <div className="erp-field erp-c6"><label className="erp-label">Motivo</label><input className="erp-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: fechamento de planejamento" /></div>
            <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn erp-btn-primary" onClick={gravar} disabled={busy}>{busy && <span className="erp-spin" />}Bloquear período</button></div>
          </div>
        </div>

        <div className="erp-grid-wrap">
          <table className="erp-grid">
            <thead><tr><th className="num">ID</th><th>Início</th><th>Fim</th><th>Motivo</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum bloqueio. Clique em <strong>Atualizar lista</strong>.</td></tr>}
              {rows.map((r, i) => (
                <tr key={i}><td className="num">{r.id ?? "—"}</td><td>{r.start_date?.slice(0, 10)}</td><td>{r.end_date?.slice(0, 10)}</td><td>{r.reason || "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Bloqueios: <strong>{rows.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
