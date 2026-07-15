import { useState } from "react";
import { type ImportStatus, listImportProcesses, updateImportProcessStatus } from "@/services/procurementService";
import { errMessage, parseStr, parseNum, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const STATUSES: ImportStatus[] = ["OPEN", "NATIONALIZED", "CANCELLED"];

/**
 * VIMP0101 — Status Logístico da Carga. Acompanhamento do status dos processos de
 * importação (`/api/procurement/import-processes`): OPEN (em trânsito/aberto) →
 * NATIONALIZED (nacionalizado) → CANCELLED. O cadastro/custeio fica no VIMP0200.
 */
export function Vimp0101Page(): JSX.Element {
  const [list, setList] = useState<Obj[]>([]);
  const [filtro, setFiltro] = useState<"" | ImportStatus>("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  async function carregar() {
    setBusy(true); setFeedback(null);
    try { setList(await listImportProcesses()); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function mudar(id: number, status: ImportStatus) {
    setBusy(true); setFeedback(null);
    try { await updateImportProcessStatus(id, status); await carregar(); setFeedback({ type: "success", message: `Processo #${id} → ${status}.` }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const filtrados = filtro ? list.filter((p) => parseStr(p, "status", "Status") === filtro) : list;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Importação</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Status Logístico da Carga</span><span className="erp-crumb-code">VIMP0101</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{filtrados.length} processo(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Processos</span><button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Status</span>
          <select className="erp-tselect" value={filtro} onChange={(e) => setFiltro(e.target.value as "" | ImportStatus)}><option value="">todos</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VIMP0101 — Status Logístico da Carga" filename="vimp0101" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Status logístico</button></div>
          <div className="erp-detail-body">
            <table className="erp-grid">
              <thead><tr><th>#</th><th>Fornecedor</th><th>Moeda</th><th>Referência</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {filtrados.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum processo. Clique em Carregar.</td></tr>}
                {filtrados.map((p, i) => { const id = parseNum(p, "id", "ID"); const st = parseStr(p, "status", "Status"); return (
                  <tr key={i}>
                    <td><strong>#{id}</strong></td><td>{parseNum(p, "supplier_code", "SupplierCode") || "—"}</td><td>{parseStr(p, "currency", "Currency")}</td>
                    <td>{parseStr(p, "reference", "Reference") || "—"}</td>
                    <td><span className={`erp-badge ${st === "NATIONALIZED" ? "ok" : st === "CANCELLED" ? "err" : "info"}`}>{st}</span></td>
                    <td style={{ display: "flex", gap: 4 }}>{STATUSES.filter((s) => s !== st).map((s) => <button key={s} className="erp-btn erp-btn-sm" onClick={() => void mudar(id, s)} disabled={busy}>{s}</button>)}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Processos: <strong>{filtrados.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
