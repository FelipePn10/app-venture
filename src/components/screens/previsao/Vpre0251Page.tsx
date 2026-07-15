import { useState, useCallback } from "react";
import {
  type GenerateForecastDTO,
  generateForecast,
} from "@/services/salesForecastService";
import { errMessage, unwrapObject } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Source = "ORDERS" | "INVOICING" | "BOTH";

export function Vpre0251Page(): JSX.Element {
  const thisYear = new Date().getFullYear();
  const [item, setItem] = useState<number | undefined>(undefined);
  const [mask, setMask] = useState("");
  const [source, setSource] = useState<Source>("ORDERS");
  const [from, setFrom] = useState(`${thisYear - 1}-01-01`);
  const [to, setTo] = useState(`${thisYear - 1}-12-31`);
  const [startWeek, setStartWeek] = useState("1");
  const [startYear, setStartYear] = useState(String(thisYear));
  const [endWeek, setEndWeek] = useState("52");
  const [endYear, setEndYear] = useState(String(thisYear));
  const [projection, setProjection] = useState("0");
  const [fraction, setFraction] = useState(true);
  const [update, setUpdate] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const gerar = () => run(async () => {
    if (!item) { setFeedback({ type: "error", message: "Selecione ao menos um item." }); return; }
    const dto: GenerateForecastDTO = {
      item_code: item,
      mask: mask || undefined,
      history_source: source,
      history_from: from,
      history_to: to,
      start_week: Number(startWeek),
      start_year: Number(startYear),
      target_end_week: Number(endWeek),
      target_end_year: Number(endYear),
      projection_pct: Number(projection),
      accepts_fraction: fraction,
      update_existing: update,
    };
    const r = await generateForecast(dto);
    setResult(unwrapObject(r) as Record<string, unknown>);
    setFeedback({ type: "success", message: "Previsão gerada a partir do histórico e gravada no cadastro." });
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Geração de Previsão de Vendas</span>
          <span className="erp-crumb-code">VPRE0251</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Média de histórico (pedidos/faturamento) com índice de projeção</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Gerar previsão por histórico do ERP</span></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPRE0251 — Geração de Previsão" filename="vpre0251" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Item e fonte do histórico</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c5"><label className="erp-label erp-req">Item</label><LookupField value={item} loader={loadItems} entityLabel="item" onChange={setItem} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Máscara</label><input className="erp-input" value={mask} onChange={(e) => setMask(e.target.value)} placeholder="Config. do item" /></div>
            <div className="erp-field erp-c4"><label className="erp-label erp-req">Fonte do histórico</label>
              <select className="erp-tselect" value={source} onChange={(e) => setSource(e.target.value as Source)}>
                <option value="ORDERS">Pedidos liberados (ORDERS)</option>
                <option value="INVOICING">Faturamento autorizado (INVOICING)</option>
                <option value="BOTH">Pedidos + faturamento (BOTH)</option>
              </select>
            </div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Histórico de</label><input className="erp-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Histórico até</label><input className="erp-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
        </div>

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Período gerado e projeção</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Semana inicial</label><input className="erp-input num" type="number" min={1} max={53} value={startWeek} onChange={(e) => setStartWeek(e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Ano inicial</label><input className="erp-input num" type="number" value={startYear} onChange={(e) => setStartYear(e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Semana final</label><input className="erp-input num" type="number" min={1} max={53} value={endWeek} onChange={(e) => setEndWeek(e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Ano final</label><input className="erp-input num" type="number" value={endYear} onChange={(e) => setEndYear(e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Projeção (%)</label><input className="erp-input num" type="number" value={projection} onChange={(e) => setProjection(e.target.value)} placeholder="+10 aumenta, -5 reduz" /></div>
            <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="gfrac" className="erp-check" type="checkbox" checked={fraction} onChange={(e) => setFraction(e.target.checked)} /><label htmlFor="gfrac" className="erp-label" style={{ margin: 0 }}>Aceita fração</label></div>
            <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="gupd" className="erp-check" type="checkbox" checked={update} onChange={(e) => setUpdate(e.target.checked)} /><label htmlFor="gupd" className="erp-label" style={{ margin: 0 }}>Atualizar existente</label></div>
            <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn erp-btn-primary" onClick={gerar} disabled={busy}>{busy && <span className="erp-spin" />}Gerar previsão</button></div>
          </div>
        </div>

        {result && (
          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Resultado da geração</div>
            <div className="erp-fieldset-body">
              <div className="erp-grid-wrap" style={{ width: "100%" }}>
                <table className="erp-grid">
                  <tbody>{Object.entries(result).map(([k, v]) => (<tr key={k}><td style={{ fontWeight: 600 }}>{k}</td><td>{typeof v === "object" ? JSON.stringify(v) : String(v)}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Fonte: <strong>{source}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
