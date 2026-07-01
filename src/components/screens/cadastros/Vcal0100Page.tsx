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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VCAL0100 — Calendário Industrial</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Período</span>
          <input className="fsc-input fsc-input-right" style={{ width: 80, height: 32 }} type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          <select className="fsc-select" style={{ width: 90, height: 32 }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void reload()} disabled={busy}>Ver</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VCAL0100 — Calendário Industrial" filename="vcal0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-metrics">
          <div className="fsc-metric"><div className="fsc-metric-label">Dias úteis</div><div className="fsc-metric-value">{workdays}</div></div>
          <div className="fsc-metric"><div className="fsc-metric-label">Dias não úteis</div><div className="fsc-metric-value">{holidays}</div></div>
          <div className="fsc-metric"><div className="fsc-metric-label">Registrados</div><div className="fsc-metric-value">{days.length}</div></div>
        </div>

        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Dia</label><input className="fsc-input fsc-input-right" type="number" min={1} max={31} value={newDay.day} onChange={(e) => setNewDay((p) => ({ ...p, day: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Dia útil?</label>
            <div className="fsc-toggle-row"><label className="fsc-toggle"><input type="checkbox" checked={newDay.is_workday} onChange={(e) => setNewDay((p) => ({ ...p, is_workday: e.target.checked }))} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label><span className="fsc-toggle-label">{newDay.is_workday ? "Útil" : "Não útil"}</span></div></div>
          <div className="fsc-field fsc-col-5"><label className="fsc-label">Descrição</label><input className="fsc-input" value={newDay.description} placeholder="Ex.: Feriado municipal" onChange={(e) => setNewDay((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void addDay()} disabled={busy}>Registrar dia</button></div>
        </div></div></div>

        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Dia</th><th>Data</th><th>Situação</th></tr></thead>
            <tbody>
              {days.length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhum dia especial registrado neste mês (todos considerados úteis).</td></tr>}
              {days.slice().sort((a, b) => a.day - b.day).map((d) => (
                <tr key={d.day}><td className="fsc-num" style={{ fontWeight: 600 }}>{d.day}</td>
                  <td>{String(d.day).padStart(2, "0")}/{String(d.month).padStart(2, "0")}/{d.year}</td>
                  <td>{d.is_workday ? <span className="fsc-pill fsc-pill-green">Útil</span> : <span className="fsc-pill fsc-pill-amber">Não útil</span>}</td></tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Mês: <strong>{MONTHS[month - 1]}/{year}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
