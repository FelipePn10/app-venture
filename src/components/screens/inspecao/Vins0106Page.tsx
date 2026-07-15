import { useState } from "react";
import { RECORD_TYPES, listRecords, createRecord, updateRecordStatus } from "@/services/procurementService";
import { errMessage, parseStr, parseNum, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const STATUSES = ["DRAFT", "OPEN", "CLOSED", "CANCELLED"];
const EMPTY = { record_type: "RECEIVING_NOTICE", status: "OPEN", supplier_code: "", item_code: "", mask: "", quantity: "0", reference: "" };

export function Vins0106Page(): JSX.Element {
  const [filterType, setFilterType] = useState("");
  const [list, setList] = useState<Obj[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  async function carregar() {
    setBusy(true); setFeedback(null);
    try { setList(await listRecords(filterType ? { type: filterType } : undefined)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function salvar() {
    setBusy(true); setFeedback(null);
    try {
      await createRecord({ record_type: form.record_type, status: form.status, supplier_code: Number(form.supplier_code) || null, item_code: Number(form.item_code) || null, mask: form.mask.trim(), quantity: Number(form.quantity) || 0, reference: form.reference.trim() || null, payload: {} });
      setForm({ ...EMPTY }); setFeedback({ type: "success", message: "Ocorrência registrada." }); await carregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function mudarStatus(id: number, status: string) {
    setBusy(true); setFeedback(null);
    try { await updateRecordStatus(id, status); await carregar(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Cadastro de Ocorrências</span><span className="erp-crumb-code">VINS0106</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">registros operacionais de suprimento</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Tipo</span>
          <select className="erp-tselect" value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="">todos</option>{RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VINS0106 — Cadastro de Ocorrências" filename="vins0106" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Ocorrências</span><span className="erp-count">{list.length}</span></div>
            <div className="erp-list">
              {list.length === 0 && <div className="erp-list-empty">Clique em <strong>Carregar</strong>.</div>}
              {list.map((r, i) => {
                const id = parseNum(r, "id", "ID");
                return (
                  <div key={i} className="erp-list-row" style={{ cursor: "default" }}>
                    <span className="erp-list-code">{parseStr(r, "record_type", "RecordType")}</span>
                    <span className="erp-list-sub">#{id} · {parseStr(r, "status", "Status")}</span>
                    <div className="erp-list-meta">
                      {parseStr(r, "status", "Status") !== "CLOSED" && <button className="erp-btn erp-btn-sm" style={{ marginLeft: "auto" }} onClick={() => void mudarStatus(id, "CLOSED")} disabled={busy}>Encerrar</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Nova ocorrência</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Dados da ocorrência</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c4"><label className="erp-label erp-req">Tipo</label><select className="erp-input" value={form.record_type} onChange={(e) => setForm((f) => ({ ...f, record_type: e.target.value }))}>{RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Status</label><select className="erp-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Fornecedor</label><input className="erp-input num" type="number" value={form.supplier_code} onChange={(e) => setForm((f) => ({ ...f, supplier_code: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Item</label><input className="erp-input num" type="number" value={form.item_code} onChange={(e) => setForm((f) => ({ ...f, item_code: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Quantidade</label><input className="erp-input num" type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Referência</label><input className="erp-input" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} /></div>
                  <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>Registrar ocorrência</button></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Ocorrências: <strong>{list.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
