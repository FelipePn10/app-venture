import { useState, useCallback } from "react";
import { type PipelineResult, type PlanningParam, runPipeline, listPlanningParams, updatePlanningParam } from "@/services/planningService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

export function Vpln0100Page(): JSX.Element {
  const [planCode, setPlanCode] = useState("1");
  const [initialOrder, setInitialOrder] = useState("10000");
  const [startFrom, setStartFrom] = useState("");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [params, setParams] = useState<PlanningParam[]>([]);
  const [edit, setEdit] = useState<{ num: string; value: string }>({ num: "", value: "" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const rodar = () => run(async () => {
    const c = Number(planCode); if (!c) { setFeedback({ type: "error", message: "Informe o plano." }); return; }
    const r = await runPipeline(c, Number(initialOrder) || 10000, true, startFrom ? new Date(startFrom).toISOString() : undefined);
    setResult(r);
    setFeedback({ type: r.viable ? "success" : "info", message: `Pipeline executado — viável: ${r.viable ? "sim" : "não"}. ${r.notes ?? ""}` });
  });
  const carregarParams = () => run(async () => { setParams(await listPlanningParams()); });
  const salvarParam = () => run(async () => {
    const n = Number(edit.num); if (!n) { setFeedback({ type: "error", message: "Informe o número do parâmetro." }); return; }
    await updatePlanningParam(n, edit.value); setParams(await listPlanningParams()); setEdit({ num: "", value: "" });
    setFeedback({ type: "success", message: `Parâmetro ${n} atualizado.` });
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Planejamento</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Pipeline de Planejamento (MRP→CRP→APS)</span><span className="erp-crumb-code">VPLN0100</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{result ? (result.viable ? "viável" : "inviável") : "—"}</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Plano</span>
          <input className="erp-tinput" style={{ width: 70 }} type="number" value={planCode} onChange={(e) => setPlanCode(e.target.value)} />
          <span className="erp-tgroup-label">Nº ordem</span>
          <input className="erp-tinput" style={{ width: 90 }} type="number" value={initialOrder} onChange={(e) => setInitialOrder(e.target.value)} />
          <span className="erp-tgroup-label">A partir de</span>
          <input className="erp-tinput" type="date" value={startFrom} onChange={(e) => setStartFrom(e.target.value)} />
          <button className="erp-btn erp-btn-primary" onClick={rodar} disabled={busy}>{busy && <span className="erp-spin" />}Rodar pipeline</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPLN0100 — Pipeline de Planejamento" filename="vpln0100" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Pipeline &amp; parâmetros</button></div>
          <div className="erp-detail-body">
            {result && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Resultado do pipeline — {result.viable ? "VIÁVEL" : "INVIÁVEL"}</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12"><pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>{JSON.stringify(result.raw, null, 2)}</pre></div>
                </div>
              </div>
            )}
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Parâmetros de planejamento <button className="erp-btn erp-btn-sm" style={{ float: "right" }} onClick={carregarParams} disabled={busy}>Carregar</button></div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label">Nº</label><input className="erp-input num" type="number" value={edit.num} onChange={(e) => setEdit((s) => ({ ...s, num: e.target.value }))} /></div>
                <div className="erp-field erp-c6"><label className="erp-label">Valor</label><input className="erp-input" value={edit.value} onChange={(e) => setEdit((s) => ({ ...s, value: e.target.value }))} /></div>
                <div className="erp-field erp-c4" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={salvarParam} disabled={busy}>Atualizar parâmetro</button></div>
                {params.length > 0 && (
                  <div className="erp-field erp-c12"><table className="erp-grid">
                    <thead><tr><th>Nº</th><th>Valor</th><th>Descrição</th><th></th></tr></thead>
                    <tbody>{params.map((p) => <tr key={p.param_number}><td>{p.param_number}</td><td>{p.value}</td><td>{p.description ?? "—"}</td><td><button className="erp-btn erp-btn-sm" onClick={() => setEdit({ num: String(p.param_number), value: p.value })}>Editar</button></td></tr>)}</tbody>
                  </table></div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Parâmetros: <strong>{params.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
