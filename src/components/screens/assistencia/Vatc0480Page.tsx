import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type TACallDTO,
  listCalls, getCall,
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

export function Vatc0480Page(): JSX.Element {
  const [calls, setCalls] = useState<TACallDTO[]>([]);
  const [selected, setSelected] = useState<TACallDTO | null>(null);
  const [fStatus, setFStatus] = useState("");
  const [fCustomer, setFCustomer] = useState("");
  const [fText, setFText] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = useCallback(() => run(async () => {
    setCalls(await listCalls());
  }), [run]);
  useEffect(() => { void carregar(); }, [carregar]);

  const abrir = (code?: number) => { if (!code) return; void run(async () => { setSelected(await getCall(code)); }); };

  const filtered = useMemo(() => calls.filter((c) => {
    if (fStatus && c.status !== fStatus) return false;
    if (fCustomer && String(c.customer_code) !== fCustomer.trim()) return false;
    if (fText && !`${c.subject} ${c.consumer_name ?? ""} ${c.call_number ?? ""}`.toLowerCase().includes(fText.toLowerCase())) return false;
    return true;
  }), [calls, fStatus, fCustomer, fText]);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Consulta de Chamados</span>
          <span className="erp-crumb-code">VATC0480</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Consulta somente leitura de chamados de assistência</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Status</span>
          <select className="erp-tselect" value={fStatus} onChange={(e) => setFStatus(e.target.value)}><option value="">Todos</option>{Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <input className="erp-tinput num" style={{ width: 90 }} placeholder="Cliente" value={fCustomer} onChange={(e) => setFCustomer(e.target.value)} />
          <input className="erp-tinput" style={{ width: 160 }} placeholder="Assunto/consumidor/nº" value={fText} onChange={(e) => setFText(e.target.value)} />
          <button className="erp-btn" onClick={() => carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Atualizar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VATC0480 — Consulta de Chamados" filename="vatc0480" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <div className="erp-list-panel">
            <div className="erp-grid-wrap">
              <table className="erp-grid">
                <thead><tr><th className="num">Nº</th><th className="num">Cliente</th><th>Assunto</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum chamado com os filtros atuais.</td></tr>}
                  {filtered.map((c) => (
                    <tr key={c.code} onClick={() => abrir(c.code)} className={selected?.code === c.code ? "erp-row-sel" : ""} style={{ cursor: "pointer" }}>
                      <td className="num">{c.call_number ?? c.code}</td><td className="num">{c.customer_code}</td><td>{c.subject}</td><td>{badge(c.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="erp-detail-panel">
            {selected ? (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Chamado {selected.call_number ?? selected.code} — {badge(selected.status)}</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label">Empresa</label><input className="erp-input" readOnly value={selected.enterprise_code} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Cliente</label><input className="erp-input" readOnly value={selected.customer_code} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Prioridade</label><input className="erp-input" readOnly value={selected.priority ?? "—"} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Prometido</label><input className="erp-input" readOnly value={selected.promised_date?.slice(0, 10) ?? "—"} /></div>
                    <div className="erp-field erp-c6"><label className="erp-label">Assunto</label><input className="erp-input" readOnly value={selected.subject} /></div>
                    <div className="erp-field erp-c6"><label className="erp-label">Consumidor</label><input className="erp-input" readOnly value={selected.consumer_name ?? "—"} /></div>
                    <div className="erp-field erp-c6"><label className="erp-label">Diagnóstico</label><input className="erp-input" readOnly value={selected.diagnosis ?? "—"} /></div>
                    <div className="erp-field erp-c6"><label className="erp-label">Solução</label><input className="erp-input" readOnly value={selected.solution ?? "—"} /></div>
                  </div>
                </div>
                <div className="erp-grid-wrap">
                  <table className="erp-grid">
                    <thead><tr><th className="num">#</th><th className="num">Item</th><th>Série</th><th className="num">Qtd</th><th className="num">Motivo</th><th className="num">Garantia</th><th>Situação</th></tr></thead>
                    <tbody>
                      {(selected.items ?? []).length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Sem itens.</td></tr>}
                      {(selected.items ?? []).map((it, i) => (
                        <tr key={i}><td className="num">{it.sequence}</td><td className="num">{it.item_code}</td><td>{it.serial_number || "—"}</td><td className="num">{it.quantity}</td><td className="num">{it.defect_reason_code ?? "—"}</td><td className="num">{it.warranty_days ?? 0}</td>
                          <td>{it.in_warranty ? <span className="erp-badge ok">Em garantia</span> : (it.warranty_until ? <span className="erp-badge warn">Fora</span> : "—")}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="erp-fieldset"><div className="erp-fieldset-body"><p style={{ padding: 12, color: "var(--v-text-3)" }}>Selecione um chamado para ver os detalhes.</p></div></div>
            )}
          </div>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Exibindo: <strong>{filtered.length}</strong> de {calls.length}</div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
