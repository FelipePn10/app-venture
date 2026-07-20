import { useState, useEffect, useCallback } from "react";
import { type ParsedCalendarDay, getCalendarMonth, createCalendarDay } from "@/services/industrialCalendarService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function Vcal0100Page(): JSX.Element {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<ParsedCalendarDay[]>([]);
  const [newDay, setNewDay] = useState({ day: 1, is_workday: false, description: "" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setDays(await getCalendarMonth(year, month)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar o calendário.") }); }
    finally { setBusy(false); }
  }, [year, month]);
  useEffect(() => { void reload(); }, [reload]);

  async function addDay() {
    if (!newDay.day || newDay.day < 1 || newDay.day > 31) { setFeedback({ type: "error", message: "Dia inválido." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createCalendarDay({ year, month, day: newDay.day, is_workday: newDay.is_workday, description: newDay.description || undefined });
      setFeedback({ type: "success", message: `Dia ${newDay.day}/${month}/${year} registrado como ${newDay.is_workday ? "útil" : "não útil"}.` });
      setNewDay({ day: 1, is_workday: false, description: "" });
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const workdays = days.filter((d) => d.is_workday).length;
  const holidays = days.filter((d) => !d.is_workday).length;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Cadastros & Plataforma</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Calendário Industrial</span><span className="erp-crumb-code">VCAL0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Período</span>
          <input className="erp-input num" style={{ width: 80, height: 32 }} type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          <select className="erp-input" style={{ width: 90, height: 32 }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          <button className="erp-btn" onClick={() => void reload()} disabled={busy}>Ver</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VCAL0100 — Calendário Industrial" filename="vcal0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Calendário Industrial</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="erp-metrics">
          <div className="erp-metric"><div className="erp-metric-label">Dias úteis</div><div className="erp-metric-value">{workdays}</div></div>
          <div className="erp-metric"><div className="erp-metric-label">Dias não úteis</div><div className="erp-metric-value">{holidays}</div></div>
          <div className="erp-metric"><div className="erp-metric-label">Registrados</div><div className="erp-metric-value">{days.length}</div></div>
        </div>

        <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Dia</label><input className="erp-input num" type="number" min={1} max={31} value={newDay.day} onChange={(e) => setNewDay((p) => ({ ...p, day: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">Dia útil?</label>
            <div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={newDay.is_workday} onChange={(e) => setNewDay((p) => ({ ...p, is_workday: e.target.checked }))} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">{newDay.is_workday ? "Útil" : "Não útil"}</span></div></div>
          <div className="erp-field erp-c5"><label className="erp-label">Descrição</label><input className="erp-input" value={newDay.description} placeholder="Ex.: Feriado municipal" onChange={(e) => setNewDay((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addDay()} disabled={busy}>Registrar dia</button></div>
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Dia</th><th>Data</th><th>Situação</th></tr></thead>
            <tbody>
              {days.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhum dia especial registrado neste mês (todos considerados úteis).</td></tr>}
              {days.slice().sort((a, b) => a.day - b.day).map((d) => (
                <tr key={d.day}><td style={{ fontWeight: 600 }}>{d.day}</td>
                  <td>{String(d.day).padStart(2, "0")}/{String(d.month).padStart(2, "0")}/{d.year}</td>
                  <td>{d.is_workday ? <span className="erp-badge ok">Útil</span> : <span className="erp-badge warn">Não útil</span>}</td></tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Mês: <strong>{MONTHS[month - 1]}/{year}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
