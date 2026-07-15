import { useState, useCallback } from "react";
import {
  type SalesForecastDTO,
  createForecast, createMonthlyForecast, listForecasts, getForecastByItem,
} from "@/services/salesForecastService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type View = "manual" | "monthly" | "list";
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function Vpre0201Page(): JSX.Element {
  const [view, setView] = useState<View>("manual");
  const thisYear = new Date().getFullYear();

  // manual (semanal)
  const [mItem, setMItem] = useState<number | undefined>(undefined);
  const [mMask, setMMask] = useState("");
  const [mWeek, setMWeek] = useState("1");
  const [mYear, setMYear] = useState(String(thisYear));
  const [mQty, setMQty] = useState("");

  // mensal
  const [nItem, setNItem] = useState<number | undefined>(undefined);
  const [nMask, setNMask] = useState("");
  const [nYear, setNYear] = useState(String(thisYear));
  const [nMonth, setNMonth] = useState("1");
  const [nQty, setNQty] = useState("");
  const [nFraction, setNFraction] = useState(true);
  const [nUpdate, setNUpdate] = useState(false);

  // listagem
  const [lYear, setLYear] = useState(String(thisYear));
  const [lItem, setLItem] = useState<number | undefined>(undefined);
  const [rows, setRows] = useState<SalesForecastDTO[]>([]);

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const gravarManual = () => run(async () => {
    if (!mItem) { setFeedback({ type: "error", message: "Selecione o item." }); return; }
    const week = Number(mWeek), year = Number(mYear), quantity = Number(mQty);
    if (week < 1 || week > 53) { setFeedback({ type: "error", message: "Semana deve estar entre 1 e 53." }); return; }
    if (quantity <= 0) { setFeedback({ type: "error", message: "Quantidade deve ser positiva." }); return; }
    await createForecast({ item_code: mItem, mask: mMask || undefined, week, year, quantity });
    setFeedback({ type: "success", message: `Previsão semanal gravada (item ${mItem}, semana ${week}/${year}).` });
    setMQty("");
  });

  const gravarMensal = () => run(async () => {
    if (!nItem) { setFeedback({ type: "error", message: "Selecione o item." }); return; }
    const quantity = Number(nQty);
    if (quantity <= 0) { setFeedback({ type: "error", message: "Quantidade deve ser positiva." }); return; }
    await createMonthlyForecast({ item_code: nItem, mask: nMask || undefined, year: Number(nYear), month: Number(nMonth), quantity, accepts_fraction: nFraction, update_existing: nUpdate });
    setFeedback({ type: "success", message: `Previsão mensal distribuída em semanas ISO (item ${nItem}, ${MONTHS[Number(nMonth) - 1]}/${nYear}).` });
    setNQty("");
  });

  const listar = () => run(async () => {
    const data = lItem ? await getForecastByItem(lItem) : await listForecasts(Number(lYear));
    setRows(data);
    setFeedback({ type: "info", message: `${data.length} previsão(ões) encontrada(s).` });
  });

  const yearInput = (v: string, set: (s: string) => void) => (
    <input className="erp-input num" type="number" value={v} onChange={(e) => set(e.target.value)} min={2001} />
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Cadastro da Previsão de Vendas</span>
          <span className="erp-crumb-code">VPRE0201</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Previsão semanal manual · distribuição mensal · manutenção</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className={`erp-btn${view === "manual" ? " erp-btn-dark" : ""}`} onClick={() => setView("manual")} disabled={busy}>Semanal</button>
          <button className={`erp-btn${view === "monthly" ? " erp-btn-dark" : ""}`} onClick={() => setView("monthly")} disabled={busy}>Mensal</button>
          <button className={`erp-btn${view === "list" ? " erp-btn-dark" : ""}`} onClick={() => setView("list")} disabled={busy}>Consultar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPRE0201 — Previsão de Vendas" filename="vpre0201" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        {view === "manual" && (
          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Previsão semanal (grava direto na semana ISO)</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c5"><label className="erp-label erp-req">Item</label><LookupField value={mItem} loader={loadItems} entityLabel="item" onChange={setMItem} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Máscara</label><input className="erp-input" value={mMask} onChange={(e) => setMMask(e.target.value)} placeholder="Config. do item" /></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Semana</label><input className="erp-input num" type="number" min={1} max={53} value={mWeek} onChange={(e) => setMWeek(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Ano</label>{yearInput(mYear, setMYear)}</div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Quantidade</label><input className="erp-input num" type="number" value={mQty} onChange={(e) => setMQty(e.target.value)} /></div>
              <div className="erp-field erp-c9" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={gravarManual} disabled={busy}>{busy && <span className="erp-spin" />}Gravar previsão semanal</button></div>
            </div>
          </div>
        )}

        {view === "monthly" && (
          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Previsão mensal (rateada em semanas pelos dias úteis do calendário industrial)</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c5"><label className="erp-label erp-req">Item</label><LookupField value={nItem} loader={loadItems} entityLabel="item" onChange={setNItem} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Máscara</label><input className="erp-input" value={nMask} onChange={(e) => setNMask(e.target.value)} placeholder="Config. do item" /></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Ano</label>{yearInput(nYear, setNYear)}</div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Mês</label>
                <select className="erp-tselect" value={nMonth} onChange={(e) => setNMonth(e.target.value)}>{MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select>
              </div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Quantidade mensal</label><input className="erp-input num" type="number" value={nQty} onChange={(e) => setNQty(e.target.value)} /></div>
              <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="nfrac" className="erp-check" type="checkbox" checked={nFraction} onChange={(e) => setNFraction(e.target.checked)} /><label htmlFor="nfrac" className="erp-label" style={{ margin: 0 }}>Aceita fração</label></div>
              <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="nupd" className="erp-check" type="checkbox" checked={nUpdate} onChange={(e) => setNUpdate(e.target.checked)} /><label htmlFor="nupd" className="erp-label" style={{ margin: 0 }}>Atualizar existente</label></div>
              <div className="erp-field erp-c6" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={gravarMensal} disabled={busy}>{busy && <span className="erp-spin" />}Distribuir em semanas</button></div>
            </div>
          </div>
        )}

        {view === "list" && (
          <>
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Consultar previsões (por ano, ou por item)</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Ano</label>{yearInput(lYear, setLYear)}</div>
                <div className="erp-field erp-c5"><label className="erp-label">Item (prevalece sobre o ano)</label><LookupField value={lItem} loader={loadItems} entityLabel="item" placeholder="Todos do ano" onChange={setLItem} /></div>
                <div className="erp-field erp-c5" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={listar} disabled={busy}>{busy && <span className="erp-spin" />}Consultar</button></div>
              </div>
            </div>
            <div className="erp-grid-wrap">
              <table className="erp-grid">
                <thead><tr><th className="num">Item</th><th>Máscara</th><th className="num">Semana</th><th className="num">Ano</th><th className="num">Quantidade</th></tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma previsão. Defina os filtros e clique em <strong>Consultar</strong>.</td></tr>}
                  {rows.map((r, i) => (
                    <tr key={i}><td className="num">{r.item_code}</td><td>{r.mask || "—"}</td><td className="num">{r.week}</td><td className="num">{r.year}</td><td className="num">{r.quantity}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <footer className="erp-statusbar">
        {view === "list" && <div className="erp-status-item">Linhas: <strong>{rows.length}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
