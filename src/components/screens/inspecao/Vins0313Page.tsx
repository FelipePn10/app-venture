import { useState } from "react";
import { listInspectionOrders } from "@/services/procurementService";
import { errMessage, parseStr, parseNum, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const d10 = (s?: string) => s?.slice(0, 10) ?? "—";

/** VINS0313 — Consulta de Inspeções de Recebimento (somente leitura sobre as ordens de inspeção). */
export function Vins0313Page(): JSX.Element {
  const [orders, setOrders] = useState<Obj[]>([]);
  const [status, setStatus] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  async function carregar() {
    setBusy(true); setFeedback(null);
    try { setOrders(await listInspectionOrders(status ? { status } : undefined)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Consulta de Inspeções de Recebimento</span><span className="erp-crumb-code">VINS0313</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{orders.length} ordem(ns)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Status</span>
          <input className="erp-tinput" style={{ width: 160 }} placeholder="ex.: PENDING_INSPECTION" value={status} onChange={(e) => setStatus(e.target.value)} />
          <button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Consultar</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VINS0313 — Consulta de Inspeções de Recebimento" filename="vins0313" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Ordens de inspeção</button></div>
          <div className="erp-detail-body">
            <table className="erp-grid">
              <thead><tr><th>#</th><th>Item</th><th>Máscara</th><th>Qtde</th><th>Origem</th><th>Fornecedor</th><th>Status</th><th>Data</th></tr></thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Sem ordens. Clique em Consultar.</td></tr>}
                {orders.map((o, i) => (
                  <tr key={i}>
                    <td><strong>#{parseNum(o, "id", "ID")}</strong></td><td>{parseNum(o, "item_code", "ItemCode")}</td><td>{parseStr(o, "mask", "Mask") || "—"}</td>
                    <td>{parseNum(o, "quantity", "Quantity")}</td><td>{parseStr(o, "source", "Source")}</td><td>{parseNum(o, "supplier_code", "SupplierCode") || "—"}</td>
                    <td><span className="erp-badge info">{parseStr(o, "status", "Status")}</span></td><td>{d10(parseStr(o, "created_at", "CreatedAt"))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Ordens: <strong>{orders.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
