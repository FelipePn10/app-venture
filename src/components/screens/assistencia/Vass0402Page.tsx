import { useState, useCallback } from "react";
import {
  type TACallDTO,
  getCall,
} from "@/services/technicalAssistanceService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const STATUS_META: Record<string, { label: string; badge: string }> = {
  PENDING: { label: "Pendente", badge: "draft" }, IN_ANALYSIS: { label: "Em análise", badge: "info" },
  WAITING_RETURN: { label: "Aguard. devolução", badge: "warn" }, WAITING_ORDER: { label: "Aguard. pedido/ordem", badge: "warn" },
  ATTENDED: { label: "Atendido", badge: "ok" }, CLOSED: { label: "Encerrado", badge: "ok" }, CANCELLED: { label: "Cancelado", badge: "err" },
};
const badge = (s?: string) => { const m = STATUS_META[s ?? ""]; return <span className={`erp-badge ${m?.badge ?? "info"}`}>{m?.label ?? s ?? "—"}</span>; };

/**
 * VASS0402 — consulta detalhada de um chamado pelo número/código.
 * A listagem ampla com filtros fica em VATC0480.
 */
export function Vass0402Page(): JSX.Element {
  const [code, setCode] = useState("");
  const [call, setCall] = useState<TACallDTO | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const consultar = () => run(async () => {
    const c = Number(code);
    if (!c) { setFeedback({ type: "error", message: "Informe o código do chamado." }); return; }
    const data = await getCall(c); setCall(data);
    setFeedback({ type: "info", message: `Chamado ${data.call_number ?? data.code} carregado.` });
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Consulta de Assistência Técnica</span>
          <span className="erp-crumb-code">VASS0402</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Consulta detalhada de um chamado pelo código</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Código do chamado</span>
          <input className="erp-tinput num" style={{ width: 120 }} type="number" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") consultar(); }} />
          <button className="erp-btn erp-btn-primary" onClick={consultar} disabled={busy}>{busy && <span className="erp-spin" />}Consultar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VASS0402 — Consulta de Assistência" filename="vass0402" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        {call ? (
          <>
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Chamado {call.call_number ?? call.code} — {badge(call.status)}</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label">Empresa</label><input className="erp-input" readOnly value={call.enterprise_code} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Cliente</label><input className="erp-input" readOnly value={call.customer_code} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Prioridade</label><input className="erp-input" readOnly value={call.priority ?? "—"} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Prometido</label><input className="erp-input" readOnly value={call.promised_date?.slice(0, 10) ?? "—"} /></div>
                <div className="erp-field erp-c6"><label className="erp-label">Assunto</label><input className="erp-input" readOnly value={call.subject} /></div>
                <div className="erp-field erp-c6"><label className="erp-label">Consumidor</label><input className="erp-input" readOnly value={call.consumer_name ?? "—"} /></div>
                <div className="erp-field erp-c12"><label className="erp-label">Descrição</label><input className="erp-input" readOnly value={call.description ?? "—"} /></div>
                <div className="erp-field erp-c6"><label className="erp-label">Diagnóstico</label><input className="erp-input" readOnly value={call.diagnosis ?? "—"} /></div>
                <div className="erp-field erp-c6"><label className="erp-label">Solução</label><input className="erp-input" readOnly value={call.solution ?? "—"} /></div>
              </div>
            </div>
            <div className="erp-grid-wrap">
              <table className="erp-grid">
                <thead><tr><th className="num">#</th><th className="num">Item</th><th>Série</th><th className="num">Qtd</th><th className="num">Motivo</th><th>Complemento</th><th className="num">Garantia</th><th>Situação</th></tr></thead>
                <tbody>
                  {(call.items ?? []).length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Sem itens.</td></tr>}
                  {(call.items ?? []).map((it, i) => (
                    <tr key={i}><td className="num">{it.sequence}</td><td className="num">{it.item_code}</td><td>{it.serial_number || "—"}</td><td className="num">{it.quantity}</td><td className="num">{it.defect_reason_code ?? "—"}</td><td>{it.defect_complement || "—"}</td><td className="num">{it.warranty_days ?? 0}</td>
                      <td>{it.in_warranty ? <span className="erp-badge ok">Em garantia</span> : (it.warranty_until ? <span className="erp-badge warn">Fora</span> : "—")}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="erp-fieldset"><div className="erp-fieldset-body"><p style={{ padding: 12, color: "var(--v-text-3)" }}>Informe o código do chamado e clique em <strong>Consultar</strong>.</p></div></div>
        )}
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">{call ? <>Chamado <strong>{call.call_number ?? call.code}</strong> · {call.items?.length ?? 0} item(ns)</> : "Nenhum chamado carregado"}</div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
