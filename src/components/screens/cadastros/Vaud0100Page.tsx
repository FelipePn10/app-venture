import { useState } from "react";
import { listAuditLog } from "@/services/auditLogService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const fmt = (v: unknown): string => { if (v == null) return "—"; if (typeof v === "object") return JSON.stringify(v); const s = String(v); return /^\d{4}-\d{2}-\d{2}T/.test(s) ? s.replace("T", " ").slice(0, 19) : s; };

/** VAUD0100 — Log de Auditoria (somente ADMIN, leitura). Colunas dinâmicas conforme o payload. */
export function Vaud0100Page(): JSX.Element {
  const [rows, setRows] = useState<Obj[]>([]);
  const [filtros, setFiltros] = useState({ entity: "", action: "", user: "" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  async function carregar() {
    setBusy(true); setFeedback(null);
    try {
      const params: Obj = {};
      if (filtros.entity) params.entity = filtros.entity;
      if (filtros.action) params.action = filtros.action;
      if (filtros.user) params.user = filtros.user;
      setRows(await listAuditLog(params));
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const cols = rows.length ? Array.from(rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set<string>())) : [];

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Cadastros &amp; Plataforma</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Log de Auditoria</span><span className="erp-crumb-code">VAUD0100</span>
        </nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{rows.length} evento(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Entidade</span><input className="erp-tinput" value={filtros.entity} onChange={(e) => setFiltros((f) => ({ ...f, entity: e.target.value }))} />
          <span className="erp-tgroup-label">Ação</span><input className="erp-tinput" value={filtros.action} onChange={(e) => setFiltros((f) => ({ ...f, action: e.target.value }))} />
          <button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Consultar</button></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VAUD0100 — Log de Auditoria" filename="vaud0100" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Eventos de auditoria</button></div>
          <div className="erp-detail-body">
            <div style={{ overflowX: "auto" }}><table className="erp-grid">
              <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td className="erp-grid-empty">Nenhum evento. Clique em Consultar.</td></tr>}
                {rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{fmt(r[c])}</td>)}</tr>)}
              </tbody>
            </table></div>
          </div>
        </section>
      </div>

      <footer className="erp-statusbar"><div className="erp-status-item">Eventos: <strong>{rows.length}</strong></div><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}
