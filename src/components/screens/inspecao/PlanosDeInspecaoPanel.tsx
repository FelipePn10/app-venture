import { useCallback, useState } from "react";
import {
  type CharacteristicDTO, type InspectionPlanDTO, type PointType,
  addCharacteristic, createPlan, deactivatePlan, getPlan, listPlansByItem,
} from "@/services/qualityService";
import { errMessage } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { confirmar } from "@/components/ui/dialogos";
import { loadItems } from "@/services/lookups";

/*
 * Planos de inspeção de processo e final por item (aba da VINS0200). O lote de
 * inspeção (VINS0300) copia as características do plano ao abrir. O plano de
 * uma etapa do roteiro continua na própria etapa (VENT0202). Vieram da VPRO0400,
 * que ficava na pasta Produção e também gravava registros e não conformidades
 * nas tabelas antigas — hoje são o lote (VINS0300) e a VINS0500.
 */

const MOMENTOS: { value: PointType; label: string }[] = [
  { value: "PROCESSO", label: "Processo" }, { value: "EXPEDICAO", label: "Final (expedição)" }, { value: "RECEBIMENTO", label: "Recebimento" },
];
const rotuloMomento = (v?: string) => MOMENTOS.find((m) => m.value === v)?.label ?? v ?? "—";
const PLANO_VAZIO = (item = ""): InspectionPlanDTO => ({ item_code: item, point_type: "PROCESSO", description: "", sample_size: 1, acceptance_level: 0 });
const CARAC_VAZIA: CharacteristicDTO = { name: "", is_critical: false };
const numOuNulo = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

export function PlanosDeInspecaoPanel(): JSX.Element {
  const [item, setItem] = useState("");
  const [planos, setPlanos] = useState<InspectionPlanDTO[]>([]);
  const [form, setForm] = useState<InspectionPlanDTO>(PLANO_VAZIO());
  const [sel, setSel] = useState<InspectionPlanDTO | null>(null);
  const [carac, setCarac] = useState<CharacteristicDTO>(CARAC_VAZIA);
  const [tol, setTol] = useState({ nominal: "", inf: "", sup: "" });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const escolherItem = (c?: string) => {
    const it = c ?? ""; setItem(it); setSel(null); setForm(PLANO_VAZIO(it));
    if (it) void run(async () => { setPlanos(await listPlansByItem(it)); }); else setPlanos([]);
  };
  const criar = () => run(async () => {
    if (!item) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Descreva o plano (ex.: inspeção final de solda)." }); return; }
    const p = await createPlan({ ...form, item_code: item, description: form.description.trim() });
    setForm(PLANO_VAZIO(item)); setPlanos(await listPlansByItem(item));
    if (p.id) setSel(await getPlan(p.id));
    setFeedback({ type: "success", message: "Plano criado. Cadastre as características." });
  });
  const desativar = async (p: InspectionPlanDTO) => {
    if (!p.id || !(await confirmar({ titulo: "Desativar plano", mensagem: "Lotes novos deixam de usar este plano. Os lotes já abertos ficam como estão.", assunto: p.description, rotulo: "Desativar", tom: "perigo" }))) return;
    void run(async () => { await deactivatePlan(p.id!); setSel(null); setPlanos(await listPlansByItem(item)); setFeedback({ type: "success", message: "Plano desativado." }); });
  };
  const incluirCarac = () => run(async () => {
    if (!sel?.id) return;
    if (!carac.name.trim()) { setFeedback({ type: "error", message: "Dê nome à característica (ex.: diâmetro externo)." }); return; }
    const [n, i, s] = [numOuNulo(tol.nominal), numOuNulo(tol.inf), numOuNulo(tol.sup)];
    if ([n, i, s].some((v) => v !== null && Number.isNaN(v))) { setFeedback({ type: "error", message: "Nominal e tolerâncias têm de ser números." }); return; }
    await addCharacteristic({ ...carac, name: carac.name.trim(), plan_id: sel.id, nominal: n, tolerance_lower: i, tolerance_upper: s });
    setCarac(CARAC_VAZIA); setTol({ nominal: "", inf: "", sup: "" }); setSel(await getPlan(sel.id));
  });

  return (
    <>
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-fieldset"><div className="erp-fieldset-head">Planos de processo e final</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c6"><label className="erp-label erp-req">Item</label><LookupField value={item || undefined} loader={loadItems} entityLabel="item" onChange={(c) => escolherItem(c ? String(c) : undefined)} /></div>
        <div className="erp-field erp-c6"><span className="erp-field-hint">O plano de uma etapa do roteiro é cadastrado na própria etapa (VENT0202). A inspeção de recebimento usa o roteiro da aba ao lado.</span></div>
        {item && <>
          <div className="erp-field erp-c3"><label className="erp-label">Momento</label>
            <select className="erp-input" value={form.point_type} onChange={(e) => setForm((f) => ({ ...f, point_type: e.target.value as PointType }))}>{MOMENTOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
          <div className="erp-field erp-c5"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Amostra</label><input className="erp-input num" type="number" min={1} value={form.sample_size} onChange={(e) => setForm((f) => ({ ...f, sample_size: Number(e.target.value) || 1 }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Aceita até (defeitos)</label><input className="erp-input num" type="number" min={0} value={form.acceptance_level} onChange={(e) => setForm((f) => ({ ...f, acceptance_level: Number(e.target.value) || 0 }))} /></div>
          <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy}>Criar plano</button></div>
          <div className="erp-field erp-c12"><table className="erp-grid">
            <thead><tr><th>Plano</th><th>Momento</th><th>Descrição</th><th className="num">Amostra</th><th>Etapa do roteiro</th><th style={{ width: 170 }} /></tr></thead>
            <tbody>
              {planos.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">O item não tem plano de inspeção.</td></tr>}
              {planos.map((p) => (
                <tr key={p.id} className={sel?.id === p.id ? "erp-row-sel" : undefined}>
                  <td>{p.id}</td><td>{rotuloMomento(p.point_type)}</td><td>{p.description}{p.is_active === false ? " · desativado" : ""}</td><td className="num">{p.sample_size}</td><td>{p.route_operation_id ? "Sim (VENT0202)" : "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void run(async () => { setSel(await getPlan(p.id!)); })}>Características</button>{" "}
                    {p.is_active !== false && <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={() => void desativar(p)}>Desativar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>}
      </div></div>

      {sel && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">Características — {sel.description}</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c4"><label className="erp-label erp-req">Característica</label><input className="erp-input" value={carac.name} onChange={(e) => setCarac((c) => ({ ...c, name: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Nominal</label><input className="erp-input num" inputMode="decimal" value={tol.nominal} onChange={(e) => setTol((t) => ({ ...t, nominal: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Tol. inferior</label><input className="erp-input num" inputMode="decimal" value={tol.inf} onChange={(e) => setTol((t) => ({ ...t, inf: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Tol. superior</label><input className="erp-input num" inputMode="decimal" value={tol.sup} onChange={(e) => setTol((t) => ({ ...t, sup: e.target.value }))} /></div>
          <div className="erp-field erp-c1"><label className="erp-label">Unid.</label><input className="erp-input" value={carac.unit ?? ""} onChange={(e) => setCarac((c) => ({ ...c, unit: e.target.value }))} /></div>
          <div className="erp-field erp-c1"><label className="erp-check" style={{ marginTop: 22 }}><input type="checkbox" checked={!!carac.is_critical} onChange={(e) => setCarac((c) => ({ ...c, is_critical: e.target.checked }))} /> Crítica</label></div>
          <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void incluirCarac()} disabled={busy}>+ Característica</button></div>
          <div className="erp-field erp-c12"><table className="erp-grid">
            <thead><tr><th>Característica</th><th className="num">Nominal</th><th className="num">Tol. − / +</th><th>Unid.</th><th>Crítica</th></tr></thead>
            <tbody>
              {(sel.characteristics ?? []).length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Sem características: o lote abre só com a contagem de defeitos.</td></tr>}
              {(sel.characteristics ?? []).map((c) => <tr key={c.id}><td>{c.name}</td><td className="num">{c.nominal ?? "—"}</td><td className="num">{c.tolerance_lower ?? "—"} / {c.tolerance_upper ?? "—"}</td><td>{c.unit || "—"}</td><td>{c.is_critical ? "Sim" : ""}</td></tr>)}
            </tbody>
          </table></div>
        </div></div>
      )}
    </>
  );
}
