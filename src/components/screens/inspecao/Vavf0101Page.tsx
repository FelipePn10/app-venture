import { useState } from "react";
import { getProcurementParameters, upsertProcurementParameter } from "@/services/procurementService";
import { errMessage, parseStr, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const DOMAINS = ["SUPPLIER_EVALUATION", "INSPECTION", "RECEIVING_NOTICE", "CONTRACT", "SUPPLIER", "PURCHASE_ORDER", "QUOTATION", "REQUISITION", "PURCHASE_TABLE", "NF_ENTRY"];
const VALUE_TYPES = ["STRING", "NUMBER", "BOOL", "DATE"];
const EMPTY = { param_key: "", param_value: "", value_type: "NUMBER", description: "" };

export function Vavf0101Page(): JSX.Element {
  const [domain, setDomain] = useState("SUPPLIER_EVALUATION");
  const [enterprise, setEnterprise] = useState("1");
  const [list, setList] = useState<Obj[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  async function carregar() {
    setBusy(true); setFeedback(null);
    try { setList(await getProcurementParameters({ domain, enterprise_code: Number(enterprise) || 1 })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function salvar() {
    if (!form.param_key.trim()) { setFeedback({ type: "error", message: "Chave do parâmetro é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await upsertProcurementParameter({ enterprise_code: Number(enterprise) || 1, domain, param_key: form.param_key.trim(), param_value: form.param_value, value_type: form.value_type, description: form.description.trim() || null });
      setForm({ ...EMPTY }); setFeedback({ type: "success", message: "Parâmetro salvo." }); await carregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Parâmetros de Avaliação de Fornecedores</span><span className="erp-crumb-code">VAVF0101</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{domain}</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Domínio</span>
          <select className="erp-tselect" value={domain} onChange={(e) => setDomain(e.target.value)}>{DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}</select>
          <span className="erp-tgroup-label">Empresa</span>
          <input className="erp-tinput" style={{ width: 70 }} type="number" value={enterprise} onChange={(e) => setEnterprise(e.target.value)} />
          <button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VAVF0101 — Parâmetros de Avaliação de Fornecedores" filename="vavf0101" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Parâmetros ({domain})</span><span className="erp-count">{list.length}</span></div>
            <div className="erp-list">
              {list.length === 0 && <div className="erp-list-empty">Escolha o domínio e clique em <strong>Carregar</strong>.</div>}
              {list.map((p, i) => (
                <div key={i} className="erp-list-row" style={{ cursor: "pointer" }} onClick={() => setForm({ param_key: parseStr(p, "param_key", "Key"), param_value: parseStr(p, "param_value", "Value"), value_type: parseStr(p, "value_type", "ValueType") || "STRING", description: parseStr(p, "description", "Description") })}>
                  <span className="erp-list-code">{parseStr(p, "param_key", "Key")}</span>
                  <span className="erp-list-sub">{parseStr(p, "param_value", "Value")} · {parseStr(p, "value_type", "ValueType")}</span>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Parâmetro</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Novo / editar parâmetro</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c4"><label className="erp-label erp-req">Chave</label><input className="erp-input" value={form.param_key} onChange={(e) => setForm((f) => ({ ...f, param_key: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Valor</label><input className="erp-input" value={form.param_value} onChange={(e) => setForm((f) => ({ ...f, param_value: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Tipo</label><select className="erp-input" value={form.value_type} onChange={(e) => setForm((f) => ({ ...f, value_type: e.target.value }))}>{VALUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="erp-field erp-c8"><label className="erp-label">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
                  <div className="erp-field erp-c4" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>Salvar parâmetro</button></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Parâmetros: <strong>{list.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
