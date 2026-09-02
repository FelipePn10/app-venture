import { useState, useCallback, useEffect, useMemo } from "react";
import { getFutureCommissions } from "@/services/recurringSalesService";
import { errMessage, parseNum, parseStr, unwrapObject, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadRepresentatives } from "@/services/lookups";
import { getCommercialCommissionSettings, listCommercialCommissions, saveCommercialCommissionSettings, transitionCommercialCommission, type CommercialCommissionEntryDTO, type CommercialCommissionSettingsDTO } from "@/services/commercialCommissionService";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const plusMonths = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Vre0203Page(): JSX.Element {
  const [rows, setRows] = useState<Obj[]>([]);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(plusMonths(12));
  const [representative, setRepresentative] = useState<number | undefined>(undefined);
  const [adjustment, setAdjustment] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"projection" | "ledger" | "settings">("projection");
  const [ledger, setLedger] = useState<CommercialCommissionEntryDTO[]>([]);
  const [ledgerStatus, setLedgerStatus] = useState("");
  const [settings, setSettings] = useState<CommercialCommissionSettingsDTO>({ competence_event: "FATURAMENTO", invoice_share_pct: "100", receipt_share_pct: "0" });

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  useEffect(() => {
    if (view !== "settings") return;
    void getCommercialCommissionSettings().then(setSettings).catch((error) => setFeedback({ type: "error", message: errMessage(error) }));
  }, [view]);

  const consultar = () => run(async () => {
    if (view === "projection") {
      const r = await getFutureCommissions({ from, to, representative_code: representative, adjustment_percent: adjustment ? Number(adjustment) : undefined });
      setRows(r);
      setFeedback({ type: r.length ? "success" : "info", message: `${r.length} projeção(ões) de comissão no período.` });
    } else if (view === "ledger") {
      const r = await listCommercialCommissions({ from, to, representative_code: representative, status: ledgerStatus || undefined, limit: 500 });
      setLedger(r);
      setFeedback({ type: r.length ? "success" : "info", message: `${r.length} lançamento(s) de comissão no período.` });
    } else {
      setSettings(await getCommercialCommissionSettings());
      setFeedback({ type: "success", message: "Configuração de competência carregada." });
    }
  });

  const saveSettings = () => run(async () => {
    if (Number(settings.invoice_share_pct) + Number(settings.receipt_share_pct) !== 100) { setFeedback({ type: "error", message: "Os percentuais de faturamento e recebimento devem totalizar 100%." }); return; }
    setSettings(await saveCommercialCommissionSettings(settings));
    setFeedback({ type: "success", message: "Configuração de comissões salva." });
  });

  const transition = (entry: CommercialCommissionEntryDTO, action: "CONCILIADA" | "PAGA") => run(async () => {
    const reason = window.prompt(action === "CONCILIADA" ? "Motivo da conciliação:" : "Motivo do pagamento:");
    if (!reason?.trim()) return;
    const paymentReference = action === "PAGA" ? window.prompt("Referência do pagamento (opcional):") ?? undefined : undefined;
    await transitionCommercialCommission(entry.code, action, reason.trim(), paymentReference);
    setLedger(await listCommercialCommissions({ from, to, representative_code: representative, status: ledgerStatus || undefined, limit: 500 }));
    setFeedback({ type: "success", message: action === "CONCILIADA" ? "Comissão conciliada." : "Comissão marcada como paga." });
  });

  const total = useMemo(() => rows.reduce((s, o) => s + (parseNum(unwrapObject(o), "commission_value", "CommissionValue") || 0), 0), [rows]);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Consulta de Comissões Futuras</span>
          <span className="erp-crumb-code">VRE0203</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Projeção de comissões de vendas recorrentes</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><button className={`erp-btn${view === "projection" ? " erp-btn-dark" : ""}`} onClick={() => setView("projection")}>Projeção</button><button className={`erp-btn${view === "ledger" ? " erp-btn-dark" : ""}`} onClick={() => setView("ledger")}>Razão de comissões</button><button className={`erp-btn${view === "settings" ? " erp-btn-dark" : ""}`} onClick={() => setView("settings")}>Configuração</button></div>
        {view !== "settings" && <div className="erp-tgroup">
          <span className="erp-tgroup-label">Período</span>
          <input className="erp-tinput" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span style={{ color: "var(--v-text-3)" }}>→</span>
          <input className="erp-tinput" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>}
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Representante</span>
          <div style={{ width: 220 }}><LookupField value={representative} loader={loadRepresentatives} entityLabel="representante" placeholder="Todos" onChange={(c) => setRepresentative(c)} /></div>
          <span className="erp-tgroup-label">Reajuste %</span>
          <input className="erp-tinput num" style={{ width: 80 }} type="number" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} />
          {view === "ledger" && <select className="erp-tselect" value={ledgerStatus} onChange={(e) => setLedgerStatus(e.target.value)}><option value="">Todas situações</option><option value="ABERTO">Em aberto</option><option value="CONCILIADO">Conciliadas</option><option value="PAGO">Pagas</option><option value="ESTORNADO">Estornadas</option></select>}
          <button className="erp-btn erp-btn-dark" onClick={consultar} disabled={busy}>{busy && <span className="erp-spin" />}Consultar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VRE0203 — Comissões Futuras" filename="vre0203" /></div>
      </div>

      <div className="erp-content">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

      {view === "projection" ? <div className="erp-grid-wrap">
        <table className="erp-grid">
          <thead>
            <tr><th>Mês</th><th className="num">Representante</th><th className="num">Cliente</th><th>Base</th><th className="num">Valor base</th><th className="num">Comissão %</th><th className="num">Comissão</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma projeção. Defina o período e clique em <strong>Consultar</strong>.</td></tr>}
            {rows.map((raw, i) => { const o = unwrapObject(raw); return (
              <tr key={i}>
                <td>{parseStr(o, "month", "Month") || parseStr(o, "period", "reference_month") || "—"}</td>
                <td className="num">{parseNum(o, "representative_code", "RepresentativeCode") || "—"}</td>
                <td className="num">{parseNum(o, "customer_code", "CustomerCode") || "—"}</td>
                <td>{parseStr(o, "commission_base", "CommissionBase") || "—"}</td>
                <td className="num">{money(parseNum(o, "base_value", "BaseValue"))}</td>
                <td className="num">{parseNum(o, "commission_percent", "CommissionPercent") || 0}</td>
                <td className="num">{money(parseNum(o, "commission_value", "CommissionValue"))}</td>
              </tr>
            ); })}
          </tbody>
          {rows.length > 0 && <tfoot><tr><td colSpan={6} className="num">Total de comissão projetada</td><td className="num">{money(total)}</td></tr></tfoot>}
        </table>
      </div> : view === "ledger" ? <div className="erp-grid-wrap"><table className="erp-grid"><thead><tr><th>Código</th><th>Competência</th><th>Representante</th><th>Pedido</th><th>Evento</th><th className="num">Base</th><th className="num">%</th><th className="num">Comissão</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{ledger.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhum lançamento. Defina os filtros e clique em <strong>Consultar</strong>.</td></tr>}{ledger.map((entry) => <tr key={entry.code}><td>{entry.code}</td><td>{entry.competence_date?.slice(0, 10)}</td><td>{entry.representative_code}</td><td>{entry.sales_order_code}</td><td>{entry.event_type}</td><td className="num">{money(Number(entry.base_amount))}</td><td className="num">{Number(entry.commission_pct).toLocaleString("pt-BR")}</td><td className="num">{money(Number(entry.amount))}</td><td>{entry.status}</td><td><div style={{ display: "flex", gap: 4 }}>{entry.status === "ABERTO" && <button className="erp-btn erp-btn-sm" onClick={() => void transition(entry, "CONCILIADA")} disabled={busy}>Conciliar</button>}{entry.status === "CONCILIADO" && <button className="erp-btn erp-btn-sm erp-btn-primary" onClick={() => void transition(entry, "PAGA")} disabled={busy}>Pagar</button>}</div></td></tr>)}</tbody></table></div> : <div className="erp-fieldset"><div className="erp-fieldset-head">Competência e rateio das comissões</div><div className="erp-fieldset-body"><div className="erp-field erp-c4"><label className="erp-label">Evento de competência</label><select className="erp-input" value={settings.competence_event} onChange={(e) => setSettings((current) => ({ ...current, competence_event: e.target.value as CommercialCommissionSettingsDTO['competence_event'] }))}><option value="FATURAMENTO">Faturamento</option><option value="RECEBIMENTO">Recebimento</option><option value="RATEIO">Rateio entre faturamento e recebimento</option></select></div><div className="erp-field erp-c3"><label className="erp-label">Parcela no faturamento %</label><input className="erp-input num" type="number" value={settings.invoice_share_pct} onChange={(e) => setSettings((current) => ({ ...current, invoice_share_pct: e.target.value }))} /></div><div className="erp-field erp-c3"><label className="erp-label">Parcela no recebimento %</label><input className="erp-input num" type="number" value={settings.receipt_share_pct} onChange={(e) => setSettings((current) => ({ ...current, receipt_share_pct: e.target.value }))} /></div><div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={saveSettings} disabled={busy}>Salvar configuração</button></div></div></div>}
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Linhas: <strong>{rows.length}</strong></div>
        <div className="erp-status-item">Comissão projetada: <strong>R$ {money(total)}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
