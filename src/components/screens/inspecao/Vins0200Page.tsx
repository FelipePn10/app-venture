import { useState, useCallback } from "react";
import {
  type InspectionBasis, type InspectionStepKind, type InspectionAppointmentMode,
  createInspectionRoute, getInspectionRoute,
} from "@/services/procurementService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const BASES: InspectionBasis[] = ["ITEM", "CLASSIFICATION"];
const KINDS: InspectionStepKind[] = ["VALUE", "ATTRIBUTE", "STRUCTURE"];
const MODES: InspectionAppointmentMode[] = ["ALL_MEASUREMENTS", "SINGLE_INTERVAL", "MULTIPLE_INTERVAL", "STATUS_ONLY"];

type Step = { sequence: number; inspection_name: string; kind: InspectionStepKind; appointment_mode: InspectionAppointmentMode; is_required: boolean; sample_qty: number; acceptance_qty: number; rejection_qty: number; nominal_value?: number; min_value?: number; max_value?: number };
const CAPA_INI = { enterprise_code: "1", basis: "ITEM" as InspectionBasis, item_code: "", classification_code: "", mask: "", inspection_warehouse_id: "", route_type: "", inspection_type: "", market_type: "", valid_from: "", valid_to: "" };
const STEP_INI = { inspection_name: "", kind: "VALUE" as InspectionStepKind, appointment_mode: "ALL_MEASUREMENTS" as InspectionAppointmentMode, is_required: true, sample_qty: "1", acceptance_qty: "0", rejection_qty: "0", nominal_value: "", min_value: "", max_value: "" };

export function Vins0200Page(): JSX.Element {
  const [capa, setCapa] = useState({ ...CAPA_INI });
  const [stepForm, setStepForm] = useState({ ...STEP_INI });
  const [steps, setSteps] = useState<Step[]>([]);
  const [criado, setCriado] = useState<Obj | null>(null);
  const [consultaId, setConsultaId] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const setC = useCallback(<K extends keyof typeof capa>(k: K, v: string) => setCapa((c) => ({ ...c, [k]: v })), []);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const addStep = () => {
    if (!stepForm.inspection_name.trim()) { setFeedback({ type: "error", message: "Nome da inspeção é obrigatório." }); return; }
    setSteps((a) => [...a, {
      sequence: (a.length + 1) * 10, inspection_name: stepForm.inspection_name.trim(), kind: stepForm.kind, appointment_mode: stepForm.appointment_mode,
      is_required: stepForm.is_required, sample_qty: Number(stepForm.sample_qty) || 0, acceptance_qty: Number(stepForm.acceptance_qty) || 0, rejection_qty: Number(stepForm.rejection_qty) || 0,
      nominal_value: stepForm.nominal_value ? Number(stepForm.nominal_value) : undefined, min_value: stepForm.min_value ? Number(stepForm.min_value) : undefined, max_value: stepForm.max_value ? Number(stepForm.max_value) : undefined,
    }]);
    setStepForm({ ...STEP_INI }); setFeedback(null);
  };

  const salvar = () => run(async () => {
    if (capa.basis === "ITEM" && !capa.item_code) { setFeedback({ type: "error", message: "Base ITEM exige o item." }); return; }
    if (capa.basis === "CLASSIFICATION" && !capa.classification_code) { setFeedback({ type: "error", message: "Base CLASSIFICATION exige a classificação." }); return; }
    if (!capa.inspection_warehouse_id) { setFeedback({ type: "error", message: "Almoxarifado de inspeção é obrigatório." }); return; }
    if (!capa.valid_from) { setFeedback({ type: "error", message: "Início de vigência é obrigatório." }); return; }
    if (steps.length === 0) { setFeedback({ type: "error", message: "Inclua ao menos uma etapa de inspeção." }); return; }
    const dto: Obj = {
      enterprise_code: Number(capa.enterprise_code) || 1, basis: capa.basis,
      item_code: capa.basis === "ITEM" ? Number(capa.item_code) : null,
      classification_code: capa.basis === "CLASSIFICATION" ? capa.classification_code.trim() : null,
      mask: capa.mask.trim(), inspection_warehouse_id: Number(capa.inspection_warehouse_id),
      route_type: capa.route_type.trim() || null, inspection_type: capa.inspection_type.trim() || null, market_type: capa.market_type.trim() || null,
      valid_from: capa.valid_from, valid_to: capa.valid_to || null,
      steps: steps.map((s) => ({ ...s, attributes: [] })),
    };
    const r = await createInspectionRoute(dto);
    setCriado(r);
    setFeedback({ type: "success", message: `Roteiro de inspeção criado (${steps.length} etapa(s)).` });
    setCapa({ ...CAPA_INI }); setSteps([]);
  });

  const consultar = () => run(async () => { const id = Number(consultaId); if (!id) { setFeedback({ type: "error", message: "Informe o id do roteiro." }); return; } setCriado(await getInspectionRoute(id)); });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Cadastro do Roteiro de Inspeção</span><span className="erp-crumb-code">VINS0200</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{steps.length} etapa(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Roteiro</span>
          <button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>{busy && <span className="erp-spin" />}Criar roteiro</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Consultar (id)</span>
          <input className="erp-tinput" style={{ width: 80 }} type="number" value={consultaId} onChange={(e) => setConsultaId(e.target.value)} />
          <button className="erp-btn erp-btn-dark" onClick={consultar} disabled={busy}>Abrir</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VINS0200 — Roteiro de Inspeção" filename="vins0200" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Roteiro de inspeção</button></div>
          <div className="erp-detail-body">
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Capa do roteiro (por item ou classificação)</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label">Empresa</label><input className="erp-input num" type="number" value={capa.enterprise_code} onChange={(e) => setC("enterprise_code", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Base</label><select className="erp-input" value={capa.basis} onChange={(e) => setC("basis", e.target.value)}>{BASES.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
                {capa.basis === "ITEM"
                  ? <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={capa.item_code} onChange={(e) => setC("item_code", e.target.value)} /></div>
                  : <div className="erp-field erp-c2"><label className="erp-label erp-req">Classificação</label><input className="erp-input" value={capa.classification_code} onChange={(e) => setC("classification_code", e.target.value)} /></div>}
                <div className="erp-field erp-c2"><label className="erp-label">Máscara</label><input className="erp-input" value={capa.mask} onChange={(e) => setC("mask", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Almox. inspeção</label><input className="erp-input num" type="number" value={capa.inspection_warehouse_id} onChange={(e) => setC("inspection_warehouse_id", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Tipo roteiro</label><input className="erp-input" value={capa.route_type} onChange={(e) => setC("route_type", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Tipo inspeção</label><input className="erp-input" value={capa.inspection_type} onChange={(e) => setC("inspection_type", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Tipo mercado</label><input className="erp-input" value={capa.market_type} onChange={(e) => setC("market_type", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Vigência de</label><input className="erp-input" type="date" value={capa.valid_from} onChange={(e) => setC("valid_from", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Vigência até</label><input className="erp-input" type="date" value={capa.valid_to} onChange={(e) => setC("valid_to", e.target.value)} /></div>
              </div>
            </div>

            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Etapas de inspeção ({steps.length})</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Inspeção</label><input className="erp-input" value={stepForm.inspection_name} onChange={(e) => setStepForm((f) => ({ ...f, inspection_name: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Espécie</label><select className="erp-input" value={stepForm.kind} onChange={(e) => setStepForm((f) => ({ ...f, kind: e.target.value as InspectionStepKind }))}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></div>
                <div className="erp-field erp-c3"><label className="erp-label">Apontamento</label><select className="erp-input" value={stepForm.appointment_mode} onChange={(e) => setStepForm((f) => ({ ...f, appointment_mode: e.target.value as InspectionAppointmentMode }))}>{MODES.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
                <div className="erp-field erp-c2"><label className="erp-label">Amostra</label><input className="erp-input num" type="number" value={stepForm.sample_qty} onChange={(e) => setStepForm((f) => ({ ...f, sample_qty: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Nominal</label><input className="erp-input num" type="number" value={stepForm.nominal_value} onChange={(e) => setStepForm((f) => ({ ...f, nominal_value: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Mín</label><input className="erp-input num" type="number" value={stepForm.min_value} onChange={(e) => setStepForm((f) => ({ ...f, min_value: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Máx</label><input className="erp-input num" type="number" value={stepForm.max_value} onChange={(e) => setStepForm((f) => ({ ...f, max_value: e.target.value }))} /></div>
                <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }}><label className="erp-check"><input type="checkbox" checked={stepForm.is_required} onChange={(e) => setStepForm((f) => ({ ...f, is_required: e.target.checked }))} /> Obrigatória</label></div>
                <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={addStep}>+ etapa</button></div>
                {steps.length > 0 && (
                  <div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th>Seq</th><th>Inspeção</th><th>Espécie</th><th>Apontamento</th><th>Obrig.</th><th>Amostra</th><th></th></tr></thead>
                      <tbody>{steps.map((s, i) => <tr key={i}><td>{s.sequence}</td><td>{s.inspection_name}</td><td>{s.kind}</td><td>{s.appointment_mode}</td><td>{s.is_required ? "Sim" : "Não"}</td><td>{s.sample_qty}</td><td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => setSteps((a) => a.filter((_, idx) => idx !== i))}>Remover</button></td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {criado && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Roteiro {String(criado.id ?? criado.ID ?? "")}</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12"><pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>{JSON.stringify(criado, null, 2)}</pre></div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Etapas: <strong>{steps.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
