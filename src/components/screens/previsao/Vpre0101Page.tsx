import { useState, useCallback, useMemo } from "react";
import {
  type AppropriationTableDTO,
  createAppropriation, listAppropriations, setDefaultAppropriation,
} from "@/services/salesForecastService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: AppropriationTableDTO = {
  description: "", monday_pct: 20, tuesday_pct: 20, wednesday_pct: 20, thursday_pct: 20, friday_pct: 20, saturday_pct: 0, sunday_pct: 0, is_default: false,
};
const DAYS: { key: keyof AppropriationTableDTO; label: string }[] = [
  { key: "monday_pct", label: "Seg" }, { key: "tuesday_pct", label: "Ter" }, { key: "wednesday_pct", label: "Qua" },
  { key: "thursday_pct", label: "Qui" }, { key: "friday_pct", label: "Sex" }, { key: "saturday_pct", label: "Sáb" }, { key: "sunday_pct", label: "Dom" },
];

export function Vpre0101Page(): JSX.Element {
  const [rows, setRows] = useState<AppropriationTableDTO[]>([]);
  const [form, setForm] = useState<AppropriationTableDTO>(EMPTY);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const listar = () => run(async () => {
    setRows(await listAppropriations());
    setFeedback({ type: "info", message: "Tabelas de apropriação carregadas." });
  });

  const total = useMemo(() => DAYS.reduce((s, d) => s + (Number(form[d.key]) || 0), 0), [form]);

  const gravar = () => run(async () => {
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Informe a descrição." }); return; }
    if (Math.abs(total - 100) > 0.01) { setFeedback({ type: "error", message: `A soma dos dias deve ser 100% (atual: ${total.toFixed(1)}%).` }); return; }
    await createAppropriation(form);
    setForm(EMPTY);
    setFeedback({ type: "success", message: "Tabela de apropriação criada." });
    setRows(await listAppropriations());
  });

  const definirPadrao = (id?: number) => { if (!id) return; void run(async () => {
    await setDefaultAppropriation(id);
    setFeedback({ type: "success", message: `Tabela ${id} definida como padrão.` });
    setRows(await listAppropriations());
  }); };

  const num = (k: keyof AppropriationTableDTO) => (
    <input className="erp-input num" type="number" value={String(form[k] ?? 0)} onChange={(e) => setForm((p) => ({ ...p, [k]: Number(e.target.value) }))} />
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Tabela de Apropriação</span>
          <span className="erp-crumb-code">VPRE0101</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Percentual de acomodação da previsão nos dias da semana</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><button className="erp-btn" onClick={listar} disabled={busy}>{busy && <span className="erp-spin" />}Atualizar lista</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPRE0101 — Tabela de Apropriação" filename="vpre0101" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Nova tabela — a soma dos sete dias deve fechar 100%</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="apdef" className="erp-check" type="checkbox" checked={!!form.is_default} onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))} /><label htmlFor="apdef" className="erp-label" style={{ margin: 0 }}>Definir como padrão</label></div>
            <div className="erp-field erp-c3"><label className="erp-label">Soma</label><input className="erp-input num" readOnly value={`${total.toFixed(1)}%`} style={{ color: Math.abs(total - 100) > 0.01 ? "var(--v-danger, #c0392b)" : undefined }} /></div>
            {DAYS.map((d) => (<div key={d.key} className="erp-field erp-c1"><label className="erp-label">{d.label}</label>{num(d.key)}</div>))}
            <div className="erp-field erp-c5" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={gravar} disabled={busy}>{busy && <span className="erp-spin" />}Gravar tabela</button></div>
          </div>
        </div>

        <div className="erp-grid-wrap">
          <table className="erp-grid">
            <thead><tr><th className="num">ID</th><th>Descrição</th>{DAYS.map((d) => <th key={d.key} className="num">{d.label}</th>)}<th>Padrão</th><th style={{ width: 110 }}></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={11} className="erp-grid-empty">Nenhuma tabela. Clique em <strong>Atualizar lista</strong>.</td></tr>}
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="num">{r.id ?? "—"}</td><td>{r.description}</td>
                  {DAYS.map((d) => <td key={d.key} className="num">{Number(r[d.key] ?? 0)}</td>)}
                  <td>{r.is_default ? <span className="erp-badge ok">Padrão</span> : ""}</td>
                  <td>{!r.is_default && <button className="erp-btn erp-btn-sm" onClick={() => definirPadrao(r.id)} disabled={busy}>Tornar padrão</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Tabelas: <strong>{rows.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
