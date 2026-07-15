import { useState, useCallback } from "react";
import { type PurchaseTolerance, TOLERANCE_TYPES, APPLIES_TO, VALUE_TYPES, ACTIONS, listTolerances, upsertTolerance, deleteTolerance, evaluateTolerance } from "@/services/purchaseTolerancesService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: PurchaseTolerance = { tolerance_type: "QUANTITY", applies_to: "ALL", interval_min: "0", interval_max: "", tolerance_value: "0", value_type: "PERCENT", action: "WARN", is_active: true };

export function Vpct0100Page(): JSX.Element {
  const [list, setList] = useState<PurchaseTolerance[]>([]);
  const [form, setForm] = useState<PurchaseTolerance>({ ...EMPTY });
  const [ev, setEv] = useState({ expected: "", actual: "" });
  const [evResult, setEvResult] = useState<Obj | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => { setBusy(true); setFeedback(null); try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); } }, []);
  const setF = <K extends keyof PurchaseTolerance>(k: K, v: PurchaseTolerance[K]) => setForm((p) => ({ ...p, [k]: v }));

  const carregar = () => run(async () => { setList(await listTolerances()); });
  const novo = () => setForm({ ...EMPTY });
  const salvar = () => run(async () => { await upsertTolerance(form); setForm({ ...EMPTY }); setList(await listTolerances()); setFeedback({ type: "success", message: "Tolerância salva." }); });
  const remover = (id?: number) => { if (!id) return; void run(async () => { await deleteTolerance(id); setList(await listTolerances()); }); };
  const avaliar = () => run(async () => { setEvResult(await evaluateTolerance(form.tolerance_type, form.applies_to, Number(ev.expected) || 0, Number(ev.actual) || 0, form.supplier_code)); });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Suprimento</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Tolerâncias de Pedido de Compra</span><span className="erp-crumb-code">VPCT0100</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{list.length} regra(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Tolerâncias</span><button className="erp-btn erp-btn-dark" onClick={carregar} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button><button className="erp-btn" onClick={novo} disabled={busy}>Nova</button></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VPCT0100 — Tolerâncias de Compra" filename="vpct0100" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Regras</span><span className="erp-count">{list.length}</span></div>
            <div className="erp-list">
              {list.length === 0 && <div className="erp-list-empty">Clique em <strong>Carregar</strong>.</div>}
              {list.map((t) => (
                <div key={t.id} className="erp-list-row" onClick={() => setForm({ ...t })}>
                  <span className="erp-list-code">{t.tolerance_type}</span><span className="erp-list-sub">{t.applies_to} · {t.tolerance_value}{t.value_type === "PERCENT" ? "%" : ""} · {t.action}</span>
                  <div className="erp-list-meta"><button className="erp-btn erp-btn-danger erp-btn-sm" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); remover(t.id); }}>×</button></div>
                </div>
              ))}
            </div>
          </aside>
          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">{form.id ? `Editar tolerância ${form.id}` : "Nova tolerância"}</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset"><div className="erp-fieldset-head">Regra de tolerância</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c4"><label className="erp-label">Tipo</label><select className="erp-input" value={form.tolerance_type} onChange={(e) => setF("tolerance_type", e.target.value)}>{TOLERANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                <div className="erp-field erp-c4"><label className="erp-label">Aplica-se a</label><select className="erp-input" value={form.applies_to} onChange={(e) => setF("applies_to", e.target.value)}>{APPLIES_TO.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
                <div className="erp-field erp-c4"><label className="erp-label">Fornecedor (opc.)</label><input className="erp-input num" type="number" value={form.supplier_code ?? ""} onChange={(e) => setF("supplier_code", Number(e.target.value) || undefined)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Intervalo mín</label><input className="erp-input num" type="number" value={String(form.interval_min)} onChange={(e) => setF("interval_min", e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Intervalo máx</label><input className="erp-input num" type="number" value={String(form.interval_max ?? "")} onChange={(e) => setF("interval_max", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Limite</label><input className="erp-input num" type="number" value={String(form.tolerance_value)} onChange={(e) => setF("tolerance_value", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Un.</label><select className="erp-input" value={form.value_type} onChange={(e) => setF("value_type", e.target.value)}>{VALUE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
                <div className="erp-field erp-c2"><label className="erp-label">Ação</label><select className="erp-input" value={form.action} onChange={(e) => setF("action", e.target.value)}>{ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
                <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>{form.id ? "Atualizar" : "Criar"}</button></div>
              </div></div>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Avaliar (esperado × real)</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label">Esperado</label><input className="erp-input num" type="number" value={ev.expected} onChange={(e) => setEv((s) => ({ ...s, expected: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Real</label><input className="erp-input num" type="number" value={ev.actual} onChange={(e) => setEv((s) => ({ ...s, actual: e.target.value }))} /></div>
                <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }}><button className="erp-btn" onClick={avaliar} disabled={busy}>Avaliar</button></div>
                {evResult && <div className="erp-field erp-c12"><pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>{JSON.stringify(evResult, null, 2)}</pre></div>}
              </div></div>
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar"><div className="erp-status-item">Regras: <strong>{list.length}</strong></div><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}
