import { useState } from "react";
import { listSupplierScorecards, computeScorecard } from "@/services/procurementService";
import { errMessage, parseStr, parseNum, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const pct = (n?: number) => `${(n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/**
 * VAVF0204 — Envio de IQF aos Fornecedores. O IQF (Índice de Qualificação de Fornecedores)
 * é calculado do histórico real (`/api/procurement/supplier-scorecards/compute`): qualidade
 * 40% + entrega 30% + comercial 20% + atendimento 10%. `persist` grava o snapshot.
 */
export function Vavf0204Page(): JSX.Element {
  const [supplier, setSupplier] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [commercial, setCommercial] = useState("100");
  const [service, setService] = useState("100");
  const [list, setList] = useState<Obj[]>([]);
  const [computed, setComputed] = useState<Obj | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  async function guard(fn: () => Promise<void>) { setBusy(true); setFeedback(null); try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); } }

  const carregar = () => guard(async () => { const s = Number(supplier); if (!s) { setFeedback({ type: "error", message: "Informe o fornecedor." }); return; } setList(await listSupplierScorecards(s)); });
  const computar = (persist: boolean) => guard(async () => {
    const s = Number(supplier); if (!s || !periodStart || !periodEnd) { setFeedback({ type: "error", message: "Fornecedor e período são obrigatórios." }); return; }
    const r = await computeScorecard({ supplier_code: s, period_start: periodStart, period_end: periodEnd, commercial_score: Number(commercial) || 100, service_score: Number(service) || 100, persist });
    setComputed(r);
    setFeedback({ type: "success", message: persist ? "IQF calculado e enviado (persistido)." : "IQF calculado (prévia)." });
    if (persist) setList(await listSupplierScorecards(s));
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Envio de IQF aos Fornecedores</span><span className="erp-crumb-code">VAVF0204</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">qualidade 40 · entrega 30 · comercial 20 · atendimento 10</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Fornecedor</span>
          <input className="erp-tinput" style={{ width: 90 }} type="number" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          <button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Histórico</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VAVF0204 — Envio de IQF aos Fornecedores" filename="vavf0204" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Scorecards do fornecedor</span><span className="erp-count">{list.length}</span></div>
            <div className="erp-list">
              {list.length === 0 && <div className="erp-list-empty">Informe o fornecedor e clique em <strong>Histórico</strong>.</div>}
              {list.map((s, i) => (
                <div key={i} className="erp-list-row" style={{ cursor: "default" }}>
                  <span className="erp-list-code">{parseStr(s, "period_start", "PeriodStart").slice(0, 10)} → {parseStr(s, "period_end", "PeriodEnd").slice(0, 10)}</span>
                  <span className="erp-list-sub">IQF {pct(parseNum(s, "iqf", "IQF", "total_score", "TotalScore"))}</span>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Calcular &amp; enviar IQF</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Período e notas manuais</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Período de</label><input className="erp-input" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Período até</label><input className="erp-input" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Comercial (0-100)</label><input className="erp-input num" type="number" value={commercial} onChange={(e) => setCommercial(e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Atendimento (0-100)</label><input className="erp-input num" type="number" value={service} onChange={(e) => setService(e.target.value)} /></div>
                  <div className="erp-field erp-c6" style={{ gap: 8 }}>
                    <button className="erp-btn" onClick={() => void computar(false)} disabled={busy}>Calcular (prévia)</button>
                    <button className="erp-btn erp-btn-primary" onClick={() => void computar(true)} disabled={busy}>Enviar IQF (persistir)</button>
                  </div>
                </div>
              </div>

              {computed && (
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Resultado do cálculo</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label">Qualidade</label><input className="erp-input num" readOnly value={pct(parseNum(computed, "quality_score", "QualityScore"))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Entrega</label><input className="erp-input num" readOnly value={pct(parseNum(computed, "delivery_score", "DeliveryScore"))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Comercial</label><input className="erp-input num" readOnly value={pct(parseNum(computed, "commercial_score", "CommercialScore"))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Atendimento</label><input className="erp-input num" readOnly value={pct(parseNum(computed, "service_score", "ServiceScore"))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">IQF final</label><input className="erp-input num" readOnly value={pct(parseNum(computed, "iqf", "IQF", "total_score", "TotalScore"))} /></div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Scorecards: <strong>{list.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
