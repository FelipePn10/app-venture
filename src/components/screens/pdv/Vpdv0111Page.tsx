import { useState, useCallback, useEffect } from "react";
import {
  type CommercialPolicyDTO, type CommercialPolicyLineDTO, type CalcType,
  listCommercialPolicies, createCommercialPolicy, getCommercialPolicy,
  listPolicyLines, addPolicyLine, evaluatePolicies,
} from "@/services/commercialPolicyService";
import { errMessage, parseNum, unwrapObject } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type View = "policies" | "evaluate";
const iso = (d: string) => (d ? `${d}T00:00:00Z` : undefined);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_POLICY: CommercialPolicyDTO = {
  description: "", kind: "FREIGHT", choice_type: "INFORMATION", calc_type: "PERCENT",
  percent_value: 0, priority: 1, sequence: 10, stackable: false, requires_approval: false, applies_on_net_value: false,
};

export function Vpdv0111Page(): JSX.Element {
  const [view, setView] = useState<View>("policies");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const [policies, setPolicies] = useState<CommercialPolicyDTO[]>([]);
  const [form, setForm] = useState<CommercialPolicyDTO>(EMPTY_POLICY);
  const [vFrom, setVFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [vTo, setVTo] = useState(`${new Date().getFullYear()}-12-31`);
  const [sel, setSel] = useState<CommercialPolicyDTO | null>(null);
  const [lines, setLines] = useState<CommercialPolicyLineDTO[]>([]);
  const [lineForm, setLineForm] = useState<CommercialPolicyLineDTO>({ line_number: 1, sequence_number: 1, calc_type: "VALUE", fixed_value: 0 });

  const [ev, setEv] = useState({ gross_value: "1000", quantity: "10", carrier_id: "", customer_code: "" });
  const [evResult, setEvResult] = useState<Record<string, unknown> | null>(null);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = useCallback(() => run(async () => { setPolicies(await listCommercialPolicies("FREIGHT")); }), [run]);
  useEffect(() => { void carregar(); }, [carregar]);

  const gravar = () => run(async () => {
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Informe a descrição." }); return; }
    await createCommercialPolicy({ ...form, kind: "FREIGHT", validity_start: iso(vFrom), validity_end: iso(vTo) });
    setForm(EMPTY_POLICY); setFeedback({ type: "success", message: "Política de frete criada." });
    await carregar();
  });
  const abrir = (code?: number) => { if (!code) return; void run(async () => {
    const [p, ls] = await Promise.all([getCommercialPolicy(code), listPolicyLines(code)]);
    setSel(p); setLines(ls);
  }); };
  const gravarLinha = () => run(async () => {
    if (!sel?.code) return;
    await addPolicyLine(sel.code, { ...lineForm, validity_start: iso(vFrom), validity_end: iso(vTo) });
    setFeedback({ type: "success", message: "Faixa de frete adicionada." });
    setLines(await listPolicyLines(sel.code));
  });
  const simular = () => run(async () => {
    const r = await evaluatePolicies({ gross_value: Number(ev.gross_value), quantity: Number(ev.quantity), carrier_id: ev.carrier_id ? Number(ev.carrier_id) : undefined, customer_code: ev.customer_code ? Number(ev.customer_code) : undefined });
    const o = unwrapObject(r); setEvResult(o as Record<string, unknown>);
    setFeedback({ type: "success", message: `Frete R$ ${money(parseNum(o, "freight_value", "FreightValue"))} · líquido R$ ${money(parseNum(o, "net_value", "NetValue"))}.` });
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Política Comercial de Fretes</span>
          <span className="erp-crumb-code">VPDV0111</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Políticas de frete · faixas · simulador</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className={`erp-btn${view === "policies" ? " erp-btn-dark" : ""}`} onClick={() => setView("policies")} disabled={busy}>Políticas</button>
          <button className={`erp-btn${view === "evaluate" ? " erp-btn-dark" : ""}`} onClick={() => setView("evaluate")} disabled={busy}>Simulador</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPDV0111 — Política de Fretes" filename="vpdv0111" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        {view === "policies" && (
          <div className="erp-main">
            <div className="erp-list-panel">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Nova política de frete</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c8"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Cálculo</label><select className="erp-tselect" value={form.calc_type} onChange={(e) => setForm((p) => ({ ...p, calc_type: e.target.value as CalcType }))}><option value="PERCENT">Percentual</option><option value="VALUE">Valor fixo</option></select></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Valor / %</label><input className="erp-input num" type="number" value={form.percent_value} onChange={(e) => setForm((p) => ({ ...p, percent_value: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Valor mín. bruto</label><input className="erp-input num" type="number" value={form.min_gross_value ?? ""} onChange={(e) => setForm((p) => ({ ...p, min_gross_value: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Prioridade</label><input className="erp-input num" type="number" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input id="stkf" className="erp-check" type="checkbox" checked={!!form.stackable} onChange={(e) => setForm((p) => ({ ...p, stackable: e.target.checked }))} /><label htmlFor="stkf" className="erp-label" style={{ margin: 0 }}>Acumulável</label></div>
                  <div className="erp-field erp-c6"><label className="erp-label">Válida de</label><input className="erp-input" type="date" value={vFrom} onChange={(e) => setVFrom(e.target.value)} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label">Válida até</label><input className="erp-input" type="date" value={vTo} onChange={(e) => setVTo(e.target.value)} /></div>
                  <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn erp-btn-primary" onClick={gravar} disabled={busy}>Criar política</button><button className="erp-btn" style={{ marginLeft: 8 }} onClick={() => carregar()} disabled={busy}>Atualizar</button></div>
                </div>
              </div>
              <div className="erp-grid-wrap">
                <table className="erp-grid">
                  <thead><tr><th className="num">Cód.</th><th>Descrição</th><th>Cálculo</th><th className="num">Valor</th></tr></thead>
                  <tbody>
                    {policies.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma política.</td></tr>}
                    {policies.map((p) => (
                      <tr key={p.code} onClick={() => abrir(p.code)} className={sel?.code === p.code ? "erp-row-sel" : ""} style={{ cursor: "pointer" }}>
                        <td className="num">{p.code}</td><td>{p.description}</td><td>{p.calc_type}</td><td className="num">{p.percent_value ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="erp-detail-panel">
              {sel ? (
                <>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Política {sel.code} — {sel.description} · faixas de frete</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c2"><label className="erp-label">Nº faixa</label><input className="erp-input num" type="number" value={lineForm.line_number} onChange={(e) => setLineForm((l) => ({ ...l, line_number: Number(e.target.value) }))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Cálculo</label><select className="erp-tselect" value={lineForm.calc_type} onChange={(e) => setLineForm((l) => ({ ...l, calc_type: e.target.value as CalcType }))}><option value="VALUE">Valor</option><option value="PERCENT">%</option></select></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Valor fixo</label><input className="erp-input num" type="number" value={lineForm.fixed_value ?? ""} onChange={(e) => setLineForm((l) => ({ ...l, fixed_value: Number(e.target.value) }))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">%</label><input className="erp-input num" type="number" value={lineForm.percent_value ?? ""} onChange={(e) => setLineForm((l) => ({ ...l, percent_value: Number(e.target.value) }))} /></div>
                      <div className="erp-field erp-c1" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-sm" onClick={gravarLinha} disabled={busy}>+</button></div>
                    </div>
                  </div>
                  <div className="erp-grid-wrap">
                    <table className="erp-grid">
                      <thead><tr><th className="num">Faixa</th><th>Cálculo</th><th className="num">Valor fixo</th><th className="num">%</th><th className="num">Mín/Máx</th></tr></thead>
                      <tbody>
                        {lines.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Sem faixas.</td></tr>}
                        {lines.map((l) => <tr key={l.id}><td className="num">{l.line_number}</td><td>{l.calc_type}</td><td className="num">{money(l.fixed_value)}</td><td className="num">{l.percent_value ?? 0}%</td><td className="num">{money(l.min_value)} / {money(l.max_value)}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <div className="erp-fieldset"><div className="erp-fieldset-body"><p style={{ padding: 12, color: "var(--v-text-3)" }}>Selecione uma política para gerenciar as faixas de frete.</p></div></div>}
            </div>
          </div>
        )}

        {view === "evaluate" && (
          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Simular frete sobre um pedido</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Valor bruto</label><input className="erp-input num" type="number" value={ev.gross_value} onChange={(e) => setEv((s) => ({ ...s, gross_value: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Quantidade</label><input className="erp-input num" type="number" value={ev.quantity} onChange={(e) => setEv((s) => ({ ...s, quantity: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Transportadora (id)</label><input className="erp-input num" type="number" value={ev.carrier_id} onChange={(e) => setEv((s) => ({ ...s, carrier_id: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Cliente (cód.)</label><input className="erp-input num" type="number" value={ev.customer_code} onChange={(e) => setEv((s) => ({ ...s, customer_code: e.target.value }))} /></div>
              <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn erp-btn-primary" onClick={simular} disabled={busy}>Avaliar</button></div>
              {evResult && (
                <div className="erp-field erp-c12">
                  <div className="erp-grid-wrap"><table className="erp-grid">
                    <tbody>{Object.entries(evResult).filter(([k]) => k !== "effects").map(([k, v]) => <tr key={k}><td style={{ fontWeight: 600 }}>{k}</td><td>{typeof v === "object" ? JSON.stringify(v) : String(v)}</td></tr>)}</tbody>
                  </table></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Políticas de frete: <strong>{policies.length}</strong>{sel && <> · Faixas: <strong>{lines.length}</strong></>}</div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
