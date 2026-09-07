import { useState, useCallback } from "react";
import {
  type InspectionBasis, type InspectionStepKind, type InspectionAppointmentMode,
  createInspectionRoute, getInspectionRoute,
} from "@/services/procurementService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { enumLabel } from "@/utils/enumLabels";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadItemMasks, loadItemClassifications, loadEstablishments, loadWarehouses } from "@/services/lookups";
import { ReadableRecord } from "@/components/ui/ReadableRecord";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const BASES: InspectionBasis[] = ["ITEM", "CLASSIFICATION"];
const KINDS: InspectionStepKind[] = ["VALUE", "ATTRIBUTE", "STRUCTURE"];
const MODES: InspectionAppointmentMode[] = ["ALL_MEASUREMENTS", "SINGLE_INTERVAL", "MULTIPLE_INTERVAL", "STATUS_ONLY"];

type Step = {
  sequence: number; inspection_name: string; kind: InspectionStepKind; appointment_mode: InspectionAppointmentMode;
  is_required: boolean; emits_label: boolean;
  sample_qty: number; acceptance_qty: number; rejection_qty: number;
  nominal_value?: number; min_value?: number; max_value?: number;
  instrument_group?: string; sample_type?: string; sample_unit?: string;
  norm?: string; reference?: string;
  attributes: { description: string; is_approved: boolean }[];
};

/**
 * Instrumento com que a medida é tomada. Registrar isso no roteiro é o que
 * permite cobrar calibração e repetir a medição do mesmo jeito na próxima vez —
 * exigência de qualquer auditoria de qualidade em metalúrgica.
 */
const INSTRUMENTOS = ["PAQUIMETRO", "MICROMETRO", "RELOGIO_COMPARADOR", "GONIOMETRO", "DUROMETRO", "BALANCA", "TRENA", "VISUAL", "GABARITO", "OUTRO"];

/** Como a amostra é tomada do lote. */
const TIPOS_AMOSTRA = ["UNIDADE", "PERCENTUAL", "LOTE_INTEIRO", "PRIMEIRA_PECA"];
const CAPA_INI = { enterprise_code: "1", basis: "ITEM" as InspectionBasis, item_code: "", classification_code: "", mask: "", inspection_warehouse_id: "", handling_type: "", storage_type: "", route_type: "", inspection_type: "", market_type: "", valid_from: "", valid_to: "" };
const STEP_INI = {
  inspection_name: "", kind: "VALUE" as InspectionStepKind, appointment_mode: "ALL_MEASUREMENTS" as InspectionAppointmentMode,
  is_required: true, emits_label: false,
  sample_qty: "1", acceptance_qty: "0", rejection_qty: "1",
  nominal_value: "", min_value: "", max_value: "",
  instrument_group: "", sample_type: "UNIDADE", sample_unit: "",
  norm: "", reference: "", atributos: "",
};

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

  /**
   * Confere a etapa antes de entrar na lista.
   *
   * Um plano de amostragem incoerente — tolerância invertida, aceita maior que
   * rejeita — só aparece no chão de fábrica, com a peça na mão do inspetor.
   * Aqui ele é barrado no cadastro.
   */
  function problemasDaEtapa(): string | null {
    if (!stepForm.inspection_name.trim()) return "Nome da inspeção é obrigatório.";
    const nominal = stepForm.nominal_value ? Number(stepForm.nominal_value) : undefined;
    const minimo = stepForm.min_value ? Number(stepForm.min_value) : undefined;
    const maximo = stepForm.max_value ? Number(stepForm.max_value) : undefined;
    if (minimo != null && maximo != null && minimo > maximo) {
      return "A tolerância está invertida: o mínimo é maior que o máximo.";
    }
    if (nominal != null && minimo != null && nominal < minimo) {
      return "O valor nominal está abaixo do mínimo da tolerância.";
    }
    if (nominal != null && maximo != null && nominal > maximo) {
      return "O valor nominal está acima do máximo da tolerância.";
    }
    const amostra = Number(stepForm.sample_qty) || 0;
    const aceita = Number(stepForm.acceptance_qty) || 0;
    const rejeita = Number(stepForm.rejection_qty) || 0;
    if (amostra <= 0) return "A amostra deve ser maior que zero.";
    if (rejeita > 0 && aceita >= rejeita) {
      return "No plano de amostragem, o número de aceitação deve ser menor que o de rejeição.";
    }
    if (aceita > amostra) return "O número de aceitação não pode ser maior que a amostra.";
    if (stepForm.kind === "VALUE" && minimo == null && maximo == null) {
      return "Uma inspeção por valor precisa de pelo menos um limite (mínimo ou máximo).";
    }
    if (stepForm.kind === "ATTRIBUTE" && !stepForm.atributos.trim()) {
      return "Uma inspeção por atributo precisa da lista de atributos a conferir.";
    }
    return null;
  }

  const addStep = () => {
    const problema = problemasDaEtapa();
    if (problema) { setFeedback({ type: "error", message: problema }); return; }
    const texto = (v: string) => v.trim() || undefined;
    setSteps((a) => [...a, {
      sequence: (a.length + 1) * 10,
      inspection_name: stepForm.inspection_name.trim(),
      kind: stepForm.kind,
      appointment_mode: stepForm.appointment_mode,
      is_required: stepForm.is_required,
      emits_label: stepForm.emits_label,
      sample_qty: Number(stepForm.sample_qty) || 0,
      acceptance_qty: Number(stepForm.acceptance_qty) || 0,
      rejection_qty: Number(stepForm.rejection_qty) || 0,
      nominal_value: stepForm.nominal_value ? Number(stepForm.nominal_value) : undefined,
      min_value: stepForm.min_value ? Number(stepForm.min_value) : undefined,
      max_value: stepForm.max_value ? Number(stepForm.max_value) : undefined,
      instrument_group: texto(stepForm.instrument_group),
      sample_type: texto(stepForm.sample_type),
      sample_unit: texto(stepForm.sample_unit),
      norm: texto(stepForm.norm),
      reference: texto(stepForm.reference),
      // Cada atributo numa linha: "sem rebarba", "solda contínua"…
      attributes: stepForm.atributos.split("\n").map((d) => d.trim()).filter(Boolean)
        .map((description) => ({ description, is_approved: false })),
    }]);
    setStepForm({ ...STEP_INI }); setFeedback(null);
  };

  /** Move a etapa e renumera a sequência de 10 em 10. */
  function moverEtapa(indice: number, direcao: -1 | 1) {
    setSteps((atual) => {
      const destino = indice + direcao;
      if (destino < 0 || destino >= atual.length) return atual;
      const copia = [...atual];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia.map((e, i) => ({ ...e, sequence: (i + 1) * 10 }));
    });
  }

  /** O plano de amostragem contado em português, do jeito que o inspetor lê. */
  function planoEmPalavras(e: Step): string {
    const partes = [`medir ${e.sample_qty}`];
    if (e.sample_type === "PERCENTUAL") partes[0] = `medir ${e.sample_qty}% do lote`;
    if (e.sample_type === "LOTE_INTEIRO") partes[0] = "medir o lote inteiro";
    if (e.sample_type === "PRIMEIRA_PECA") partes[0] = "medir a primeira peça";
    if (e.rejection_qty > 0) {
      partes.push(`aceita com até ${e.acceptance_qty} defeito(s), rejeita a partir de ${e.rejection_qty}`);
    }
    if (e.min_value != null || e.max_value != null) {
      partes.push(`tolerância ${e.min_value ?? "—"} a ${e.max_value ?? "—"}`);
    }
    return partes.join(" · ");
  }

  const salvar = () => run(async () => {
    if (capa.basis === "ITEM" && !capa.item_code) { setFeedback({ type: "error", message: "Base ITEM exige o item." }); return; }
    if (capa.basis === "CLASSIFICATION" && !capa.classification_code) { setFeedback({ type: "error", message: "Base CLASSIFICATION exige a classificação." }); return; }
    if (!capa.inspection_warehouse_id) { setFeedback({ type: "error", message: "Almoxarifado de inspeção é obrigatório." }); return; }
    if (!capa.valid_from) { setFeedback({ type: "error", message: "Início de vigência é obrigatório." }); return; }
    if (steps.length === 0) { setFeedback({ type: "error", message: "Inclua ao menos uma etapa de inspeção." }); return; }
    const dto: Obj = {
      enterprise_code: Number(capa.enterprise_code) || 1, basis: capa.basis,
      item_code: capa.basis === "ITEM" ? capa.item_code.trim() : null,
      classification_code: capa.basis === "CLASSIFICATION" ? capa.classification_code.trim() : null,
      mask: capa.mask.trim(), inspection_warehouse_id: Number(capa.inspection_warehouse_id),
      handling_type: capa.handling_type.trim() || null, storage_type: capa.storage_type.trim() || null,
      route_type: capa.route_type.trim() || null, inspection_type: capa.inspection_type.trim() || null, market_type: capa.market_type.trim() || null,
      valid_from: capa.valid_from, valid_to: capa.valid_to || null,
      steps,
    };
    const r = await createInspectionRoute(dto);
    setCriado(r);
    setFeedback({ type: "success", message: `Roteiro de inspeção criado (${steps.length} etapa(s)).` });
    setCapa({ ...CAPA_INI }); setSteps([]);
  });

  const consultar = () => run(async () => { const id = Number(consultaId); if (!id) { setFeedback({ type: "error", message: "Informe o id do roteiro." }); return; } setCriado(await getInspectionRoute(id)); });

  return (
    <div className="erp-screen">
      <style>{`
        .ins-sec { font-size: 10.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #2f7d47; border-bottom: 1px solid #dbe8d5; padding-bottom: 4px; margin-top: 4px; }
        .ins-rowactions { display: flex; gap: 4px; }
      `}</style>
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
          <span className="erp-tgroup-label">Consultar pelo código</span>
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
                <div className="erp-field erp-c2"><label className="erp-label">Empresa</label><LookupField value={capa.enterprise_code ? Number(capa.enterprise_code) : undefined} loader={loadEstablishments} entityLabel="empresa" onChange={(code) => setC("enterprise_code", code ? String(code) : "")} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Base</label><select className="erp-input" value={capa.basis} onChange={(e) => setC("basis", e.target.value)}>{BASES.map((b) => <option key={b} value={b}>{enumLabel(b)}</option>)}</select></div>
                {capa.basis === "ITEM"
                  ? <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><LookupField value={capa.item_code} loader={loadItems} entityLabel="item" onChange={(code) => setC("item_code", String(code ?? ""))} /></div>
                  : <div className="erp-field erp-c2"><label className="erp-label erp-req">Classificação</label><LookupField value={capa.classification_code} loader={loadItemClassifications} entityLabel="classificação" onChange={(code) => setC("classification_code", code ? String(code) : "")} /></div>}
                <div className="erp-field erp-c2"><label className="erp-label">Máscara</label><LookupField value={capa.mask} loader={loadItemMasks} entityLabel="máscara" onChange={(code) => setC("mask", code ? String(code) : "")} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Almox. inspeção</label><LookupField value={capa.inspection_warehouse_id ? Number(capa.inspection_warehouse_id) : undefined} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(code) => setC("inspection_warehouse_id", code ? String(code) : "")} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Manuseio</label><input className="erp-input" value={capa.handling_type} placeholder="Ex.: com luva" onChange={(e) => setC("handling_type", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Armazenagem</label><input className="erp-input" value={capa.storage_type} placeholder="Ex.: coberto e seco" onChange={(e) => setC("storage_type", e.target.value)} /></div>
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
                <div className="erp-field erp-c2"><label className="erp-label">Espécie</label><select className="erp-input" value={stepForm.kind} onChange={(e) => setStepForm((f) => ({ ...f, kind: e.target.value as InspectionStepKind }))}>{KINDS.map((k) => <option key={k} value={k}>{enumLabel(k)}</option>)}</select></div>
                <div className="erp-field erp-c3"><label className="erp-label">Apontamento</label><select className="erp-input" value={stepForm.appointment_mode} onChange={(e) => setStepForm((f) => ({ ...f, appointment_mode: e.target.value as InspectionAppointmentMode }))}>{MODES.map((m) => <option key={m} value={m}>{enumLabel(m)}</option>)}</select></div>
                <div className="erp-field erp-c2"><label className="erp-label">Instrumento</label>
                  <select className="erp-input" value={stepForm.instrument_group} onChange={(e) => setStepForm((f) => ({ ...f, instrument_group: e.target.value }))}>
                    <option value="">— não definido —</option>
                    {INSTRUMENTOS.map((i) => <option key={i} value={i}>{enumLabel(i)}</option>)}
                  </select></div>

                <div className="erp-field erp-c12"><div className="ins-sec">Plano de amostragem</div></div>
                <div className="erp-field erp-c2"><label className="erp-label">Como amostrar</label>
                  <select className="erp-input" value={stepForm.sample_type} onChange={(e) => setStepForm((f) => ({ ...f, sample_type: e.target.value }))}>
                    {TIPOS_AMOSTRA.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
                  </select></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Amostra</label><input className="erp-input num" type="number" min={0} value={stepForm.sample_qty} onChange={(e) => setStepForm((f) => ({ ...f, sample_qty: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Aceita até</label><input className="erp-input num" type="number" min={0} value={stepForm.acceptance_qty} onChange={(e) => setStepForm((f) => ({ ...f, acceptance_qty: e.target.value }))} />
                  <span className="erp-field-hint">Defeitos tolerados.</span></div>
                <div className="erp-field erp-c2"><label className="erp-label">Rejeita a partir de</label><input className="erp-input num" type="number" min={0} value={stepForm.rejection_qty} onChange={(e) => setStepForm((f) => ({ ...f, rejection_qty: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Unidade</label><input className="erp-input" value={stepForm.sample_unit} placeholder="mm, kg, un" onChange={(e) => setStepForm((f) => ({ ...f, sample_unit: e.target.value }))} /></div>

                {stepForm.kind === "VALUE" && (
                  <>
                    <div className="erp-field erp-c12"><div className="ins-sec">Tolerância</div></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Nominal</label><input className="erp-input num" type="number" step="any" value={stepForm.nominal_value} onChange={(e) => setStepForm((f) => ({ ...f, nominal_value: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Mínimo</label><input className="erp-input num" type="number" step="any" value={stepForm.min_value} onChange={(e) => setStepForm((f) => ({ ...f, min_value: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Máximo</label><input className="erp-input num" type="number" step="any" value={stepForm.max_value} onChange={(e) => setStepForm((f) => ({ ...f, max_value: e.target.value }))} /></div>
                    <div className="erp-field erp-c6"><span className="erp-field-hint">
                      A medida fora destes limites reprova a peça. O nominal é a cota de projeto e precisa cair dentro da faixa.
                    </span></div>
                  </>
                )}

                {stepForm.kind === "ATTRIBUTE" && (
                  <div className="erp-field erp-c6">
                    <label className="erp-label erp-req">Atributos a conferir</label>
                    <textarea className="erp-input" rows={3} value={stepForm.atributos}
                      placeholder={"sem rebarba\nsolda contínua\npintura sem escorrimento"}
                      onChange={(e) => setStepForm((f) => ({ ...f, atributos: e.target.value }))} />
                    <span className="erp-field-hint">Um atributo por linha. O inspetor aprova ou reprova cada um.</span>
                  </div>
                )}

                <div className="erp-field erp-c12"><div className="ins-sec">Referência</div></div>
                <div className="erp-field erp-c3"><label className="erp-label">Norma</label><input className="erp-input" value={stepForm.norm} placeholder="NBR 6158, ISO 2768-m" onChange={(e) => setStepForm((f) => ({ ...f, norm: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Referência</label><input className="erp-input" value={stepForm.reference} placeholder="Desenho DES-1042 rev. C" onChange={(e) => setStepForm((f) => ({ ...f, reference: e.target.value }))} /></div>
                <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }}>
                  <label className="erp-check"><input type="checkbox" checked={stepForm.is_required} onChange={(e) => setStepForm((f) => ({ ...f, is_required: e.target.checked }))} /> Obrigatória</label>
                  <label className="erp-check"><input type="checkbox" checked={stepForm.emits_label} onChange={(e) => setStepForm((f) => ({ ...f, emits_label: e.target.checked }))} /> Emite etiqueta</label>
                </div>
                <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={addStep}>+ etapa</button></div>
                {steps.length > 0 && (
                  <div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th>Seq</th><th>Inspeção</th><th>Espécie</th><th>Instrumento</th><th>O que o inspetor faz</th><th>Norma</th><th>Obrig.</th><th style={{ width: 130 }}></th></tr></thead>
                      <tbody>{steps.map((s, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{s.sequence}</td>
                          <td>{s.inspection_name}</td>
                          <td>{enumLabel(s.kind)}</td>
                          <td>{s.instrument_group ? enumLabel(s.instrument_group) : "—"}</td>
                          <td>{planoEmPalavras(s)}{s.attributes.length > 0 ? ` · ${s.attributes.length} atributo(s)` : ""}</td>
                          <td>{s.norm || "—"}</td>
                          <td>{s.is_required ? "Sim" : "Não"}</td>
                          <td className="ins-rowactions">
                            <button className="erp-btn erp-btn-sm" title="Subir" disabled={i === 0} onClick={() => moverEtapa(i, -1)}>↑</button>
                            <button className="erp-btn erp-btn-sm" title="Descer" disabled={i === steps.length - 1} onClick={() => moverEtapa(i, 1)}>↓</button>
                            <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => setSteps((a) => a.filter((_, idx) => idx !== i).map((e, k) => ({ ...e, sequence: (k + 1) * 10 })))}>×</button>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {criado && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Roteiro {String(criado.id ?? criado.ID ?? "")}</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12"><ReadableRecord value={criado} emptyLabel="Nenhuma inspeção criada." /></div>
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
