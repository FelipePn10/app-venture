import { useState } from "react";
import { RECORD_TYPES, listRecords, listInspectionOrders } from "@/services/procurementService";
import { errMessage, parseStr, parseNum, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "ocorrencias" | "ordens";

/** VINS0400 — Consulta de Ocorrências (records) e Ordens de Inspeção (somente leitura). */
export function Vins0400Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("ocorrencias");
  const [type, setType] = useState("");
  const [records, setRecords] = useState<Obj[]>([]);
  const [orders, setOrders] = useState<Obj[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  async function carregar() {
    setBusy(true); setFeedback(null);
    try {
      if (tab === "ocorrencias") setRecords(await listRecords(type ? { type } : undefined));
      else setOrders(await listInspectionOrders());
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Consulta de Ocorrências / Ordens de Inspeção</span><span className="erp-crumb-code">VINS0400</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{tab === "ocorrencias" ? records.length : orders.length} registro(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className={`erp-btn ${tab === "ocorrencias" ? "erp-btn-primary" : ""}`} onClick={() => setTab("ocorrencias")}>Ocorrências</button>
          <button className={`erp-btn ${tab === "ordens" ? "erp-btn-primary" : ""}`} onClick={() => setTab("ordens")}>Ordens de inspeção</button>
        </div>
        {tab === "ocorrencias" && <div className="erp-tgroup"><span className="erp-tgroup-label">Tipo</span>
          <select className="erp-tselect" value={type} onChange={(e) => setType(e.target.value)}><option value="">todos</option>{RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>}
        <div className="erp-tgroup"><button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Consultar</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VINS0400 — Consulta de Ocorrências / Ordens" filename="vins0400" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">{tab === "ocorrencias" ? "Ocorrências" : "Ordens de inspeção"}</button></div>
          <div className="erp-detail-body">
            {tab === "ocorrencias" ? (
              <table className="erp-grid">
                <thead><tr><th>#</th><th>Tipo</th><th>Fornecedor</th><th>Item</th><th>Referência</th><th>Status</th></tr></thead>
                <tbody>
                  {records.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Sem ocorrências. Clique em Consultar.</td></tr>}
                  {records.map((r, i) => <tr key={i}><td><strong>#{parseNum(r, "id", "ID")}</strong></td><td>{parseStr(r, "record_type", "RecordType")}</td><td>{parseNum(r, "supplier_code", "SupplierCode") || "—"}</td><td>{parseNum(r, "item_code", "ItemCode") || "—"}</td><td>{parseStr(r, "reference", "Reference") || "—"}</td><td><span className="erp-badge info">{parseStr(r, "status", "Status")}</span></td></tr>)}
                </tbody>
              </table>
            ) : (
              <table className="erp-grid">
                <thead><tr><th>#</th><th>Item</th><th>Qtde</th><th>Origem</th><th>Status</th></tr></thead>
                <tbody>
                  {orders.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Sem ordens. Clique em Consultar.</td></tr>}
                  {orders.map((o, i) => <tr key={i}><td><strong>#{parseNum(o, "id", "ID")}</strong></td><td>{parseNum(o, "item_code", "ItemCode")}</td><td>{parseNum(o, "quantity", "Quantity")}</td><td>{parseStr(o, "source", "Source")}</td><td><span className="erp-badge info">{parseStr(o, "status", "Status")}</span></td></tr>)}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">{tab === "ocorrencias" ? "Ocorrências" : "Ordens"}: <strong>{tab === "ocorrencias" ? records.length : orders.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
