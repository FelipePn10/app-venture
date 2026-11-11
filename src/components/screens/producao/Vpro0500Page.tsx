import { useState, useCallback, useEffect } from "react";
import { confirmar, pedirTexto } from "@/components/ui/dialogos";
import { textoLegivel } from "@/utils/textoLegivel";
import {
  type MaintPlanDTO, type MaintFrequency, type MaintOrderDTO, type MaintOrderStatus,
  FREQUENCIES,
  listPlans, createPlan, deletePlan, listPlanOrders, listOrdersByWorkCenter, createOrder, advanceOrder, generateOrders,
} from "@/services/preventiveMaintenanceService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadMachinesById, loadWorkCenters } from "@/services/lookups";
import { enumLabel } from "@/utils/enumLabels";
import { hojeLocal } from "@/utils/dataLocal";

/*
 * VPRO0500 — Manutenção Preventiva (pasta Manutenção).
 *
 * Planos por máquina, geração das ordens do horizonte e o ciclo da ordem
 * (iniciar → concluir com as horas reais de parada, que descontam a capacidade
 * no CRP). Recebeu as rotinas genéricas VMAN0202 (apontamento) e VMAN0401
 * (consulta por plano ou por centro), que pediam o id interno da máquina, do
 * plano e do centro.
 */

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Visao = "planos" | "centro";
const today = () => hojeLocal();
const somarDias = (dias: number) => { const d = new Date(`${today()}T12:00:00`); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); };
const EMPTY_PLAN: MaintPlanDTO = { machine_id: 0, work_center_id: undefined, frequency: "MONTHLY", frequency_days: 30, estimated_hours: 1 };

const ROTULO_SITUACAO_ORDEM: Record<MaintOrderStatus, string> = { PLANNED: "Planejada", IN_PROGRESS: "Em andamento", DONE: "Concluída", CANCELLED: "Cancelada" };
function orderPill(s?: string): JSX.Element {
  const x = (s ?? "").toUpperCase() as MaintOrderStatus;
  const cls = x === "DONE" ? "erp-badge-green" : x === "IN_PROGRESS" ? "erp-badge-blue" : x === "CANCELLED" ? "erp-badge-red" : "erp-badge-amber";
  return <span className={`erp-badge ${cls}`}>{ROTULO_SITUACAO_ORDEM[x] ?? (s || "—")}</span>;
}

export function Vpro0500Page(): JSX.Element {
  const [visao, setVisao] = useState<Visao>("planos");
  const [plans, setPlans] = useState<MaintPlanDTO[]>([]);
  const [form, setForm] = useState<MaintPlanDTO>(EMPTY_PLAN);
  const [selected, setSelected] = useState<MaintPlanDTO | null>(null);
  const [orders, setOrders] = useState<MaintOrderDTO[]>([]);
  const [centro, setCentro] = useState<number | undefined>();
  const [periodo, setPeriodo] = useState({ de: today(), ate: somarDias(30) });
  const [ordensCentro, setOrdensCentro] = useState<MaintOrderDTO[] | null>(null);
  const [horizon, setHorizon] = useState("30");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  const reload = useCallback(() => run(async () => { setPlans(await listPlans(false)); }), [run]);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof MaintPlanDTO>(k: K, v: MaintPlanDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  const consultarCentro = useCallback(async (id = centro) => {
    if (!id) { setOrdensCentro(null); return; }
    setOrdensCentro(await listOrdersByWorkCenter(id, periodo.de || undefined, periodo.ate || undefined));
  }, [centro, periodo]);

  const salvarPlano = () => run(async () => {
    if (!form.machine_id) { setFeedback({ type: "error", message: "Escolha a máquina do plano." }); return; }
    if (!form.description?.trim()) { setFeedback({ type: "error", message: "Descreva o que a manutenção faz." }); return; }
    await createPlan(form); setForm(EMPTY_PLAN);
    setPlans(await listPlans(false));
    setFeedback({ type: "success", message: "Plano de manutenção criado. Use Gerar para criar as ordens do horizonte." });
  });
  async function removerPlano(p: MaintPlanDTO) {
    if (!p.id || !(await confirmar({ titulo: "Desativar plano", mensagem: "As próximas gerações de ordens deixam de considerar este plano. As ordens já geradas continuam.", assunto: p.description, rotulo: "Desativar", tom: "perigo" }))) return;
    void run(async () => { await deletePlan(p.id!); if (selected?.id === p.id) setSelected(null); setPlans(await listPlans(false)); setFeedback({ type: "success", message: "Plano desativado." }); });
  }
  const abrir = (p: MaintPlanDTO) => { if (!p.id) return; setSelected(p); void run(async () => { setOrders(await listPlanOrders(p.id!)); }); };

  const novaOrdem = () => { if (!selected?.id) return; void run(async () => {
    await createOrder({ plan_id: selected.id, scheduled_date: today() });
    setOrders(await listPlanOrders(selected.id!));
    setFeedback({ type: "success", message: "Ordem manual criada para hoje." });
  }); };

  async function avancar(o: MaintOrderDTO, status: MaintOrderStatus) {
    if (!o.id) return;
    let actual: number | undefined;
    if (status === "DONE") {
      const v = await pedirTexto({ titulo: "Concluir manutenção", mensagem: "Informe quanto tempo o equipamento ficou parado. Essas horas saem da capacidade da máquina no planejamento.", rotulo: "Horas reais de parada", tipo: "number", valorInicial: String(o.estimated_hours ?? selected?.estimated_hours ?? 1), rotuloConfirmar: "Concluir" });
      if (v === null) return;
      actual = Number(v);
    }
    if (status === "CANCELLED" && !(await confirmar({ titulo: "Cancelar ordem", mensagem: "A ordem deixa de reservar a máquina no planejamento.", assunto: `Ordem ${o.id} — ${o.scheduled_date?.slice(0, 10)}`, rotulo: "Cancelar ordem", tom: "perigo" }))) return;
    void run(async () => {
      await advanceOrder(o.id, status, actual);
      setFeedback({ type: "success", message: `Ordem ${o.id}: ${ROTULO_SITUACAO_ORDEM[status].toLowerCase()}.` });
      if (selected?.id) setOrders(await listPlanOrders(selected.id));
      if (visao === "centro") await consultarCentro();
    });
  }
  const gerar = () => run(async () => {
    const r = await generateOrders(Number(horizon) || 30);
    setFeedback({ type: "success", message: `Geração concluída (horizonte de ${horizon} dias). ${textoLegivel(r)}` });
    if (selected?.id) setOrders(await listPlanOrders(selected.id));
    setPlans(await listPlans(false));
  });

  const tabelaOrdens = (lista: MaintOrderDTO[], comMaquina: boolean) => (
    <table className="erp-grid">
      <thead><tr><th>Ordem</th>{comMaquina && <th>Máquina</th>}<th>Data</th><th>Situação</th><th className="num">Horas previstas</th><th className="num">Horas reais</th><th style={{ width: 220 }} /></tr></thead>
      <tbody>
        {lista.length === 0 && <tr><td colSpan={comMaquina ? 7 : 6} className="erp-grid-empty">Nenhuma ordem.</td></tr>}
        {lista.map((o) => {
          const s = (o.status ?? "").toUpperCase();
          return (
            <tr key={o.id}>
              <td>{o.id}</td>
              {comMaquina && <td>{o.machine_id ? <EntityName code={o.machine_id} loader={loadMachinesById} showCode={false} /> : "—"}</td>}
              <td>{o.scheduled_date?.slice(0, 10).split("-").reverse().join("/")}</td><td>{orderPill(o.status)}</td>
              <td className="num">{o.estimated_hours ?? "—"}</td><td className="num">{o.actual_hours ?? "—"}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                {s === "PLANNED" && <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void avancar(o, "IN_PROGRESS")}>Iniciar</button>}{" "}
                {s === "IN_PROGRESS" && <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy} onClick={() => void avancar(o, "DONE")}>Concluir</button>}{" "}
                {(s === "PLANNED" || s === "IN_PROGRESS") && <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={() => void avancar(o, "CANCELLED")}>Cancelar</button>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Manutenção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Manutenção Preventiva</span><span className="erp-crumb-code">VPRO0500</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{plans.length} plano(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Gerar ordens</span>
          <input className="erp-input" style={{ width: 70, height: 32 }} type="number" min={1} value={horizon} onChange={(e) => setHorizon(e.target.value)} />
          <span className="erp-tgroup-label">dias</span>
          <button className="erp-btn erp-btn-dark" onClick={() => void gerar()} disabled={busy}>{busy && <span className="erp-spin" />}Gerar</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPRO0500 — Manutenção Preventiva" filename="vpro0500" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            <button className={`erp-tab${visao === "planos" ? " active" : ""}`} onClick={() => setVisao("planos")}>Planos e ordens</button>
            <button className={`erp-tab${visao === "centro" ? " active" : ""}`} onClick={() => setVisao("centro")}>Ordens por centro de trabalho</button>
          </div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {visao === "planos" && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Novo plano</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c4"><label className="erp-label erp-req">Máquina</label><LookupField value={form.machine_id || undefined} loader={loadMachinesById} entityLabel="máquina" onChange={(c) => setF("machine_id", Number(c) || 0)} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Centro de trabalho</label><LookupField value={form.work_center_id} loader={loadWorkCenters} entityLabel="centro de trabalho" clearable onChange={(c) => setF("work_center_id", c ? Number(c) : undefined)} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label erp-req">O que é feito</label><input className="erp-input" placeholder="Ex.: troca de óleo e lubrificação" value={form.description ?? ""} onChange={(e) => setF("description", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Frequência</label>
                    <select className="erp-input" value={form.frequency} onChange={(e) => setF("frequency", e.target.value as MaintFrequency)}>{FREQUENCIES.map((f) => <option key={f} value={f}>{enumLabel(f)}</option>)}</select></div>
                  <div className="erp-field erp-c2"><label className="erp-label">A cada (dias)</label><input className="erp-input num" type="number" min={1} value={form.frequency_days ?? ""} onChange={(e) => setF("frequency_days", e.target.value ? Number(e.target.value) : undefined)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Horas previstas</label><input className="erp-input num" type="number" step="0.1" min={0} value={form.estimated_hours} onChange={(e) => setF("estimated_hours", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c5" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void salvarPlano()} disabled={busy}>Criar plano</button></div>
                </div></div>

                <div className="erp-fieldset"><div className="erp-fieldset-head">Planos <span className="erp-count">{plans.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead><tr><th>Plano</th><th>Máquina</th><th>Centro</th><th>O que é feito</th><th>Frequência</th><th className="num">Horas</th><th>Próxima</th><th style={{ width: 170 }} /></tr></thead>
                    <tbody>
                      {plans.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum plano cadastrado.</td></tr>}
                      {plans.map((p) => (
                        <tr key={p.id} className={selected?.id === p.id ? "erp-row-sel" : undefined}>
                          <td>{p.id}</td>
                          <td style={{ fontWeight: 600 }}><EntityName code={p.machine_id} loader={loadMachinesById} showCode={false} /></td>
                          <td>{p.work_center_id ? <EntityName code={p.work_center_id} loader={loadWorkCenters} showCode={false} /> : "—"}</td>
                          <td>{p.description || "—"}{p.is_active === false ? " · desativado" : ""}</td>
                          <td>{enumLabel(p.frequency)}{p.frequency_days ? ` (${p.frequency_days} d)` : ""}</td><td className="num">{p.estimated_hours}</td>
                          <td>{(p.next_scheduled_at ?? "").slice(0, 10).split("-").reverse().join("/") || "—"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => abrir(p)}>Ordens</button>{" "}
                            {p.is_active !== false && <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={() => void removerPlano(p)}>Desativar</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div></div></div>

                {selected && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">
                    Ordens do plano {selected.id}{selected.description ? ` — ${selected.description}` : ""}
                    <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <button className="erp-btn erp-btn-sm" onClick={novaOrdem} disabled={busy}>+ Ordem manual</button>
                      <button className="erp-btn erp-btn-sm" onClick={() => setSelected(null)}>Fechar</button>
                    </span>
                  </div><div className="erp-fieldset-body"><div className="erp-field erp-c12">{tabelaOrdens(orders, false)}</div></div></div>
                )}
              </>
            )}

            {visao === "centro" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Ordens de manutenção do centro</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c5"><label className="erp-label erp-req">Centro de trabalho</label><LookupField value={centro} loader={loadWorkCenters} entityLabel="centro de trabalho" onChange={(c) => { const id = c ? Number(c) : undefined; setCentro(id); void run(() => consultarCentro(id)); }} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">De</label><input className="erp-input" type="date" value={periodo.de} onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Até</label><input className="erp-input" type="date" value={periodo.ate} onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))} /></div>
                <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-dark" disabled={busy || !centro} onClick={() => void run(() => consultarCentro())}>Consultar</button></div>
                <div className="erp-field erp-c12">{ordensCentro === null ? <div className="erp-list-empty">Escolha o centro de trabalho para ver as ordens do período.</div> : tabelaOrdens(ordensCentro, true)}</div>
              </div></div>
            )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Planos: <strong>{plans.length}</strong></div>
        {selected && <div className="erp-status-item">Ordens do plano: <strong>{orders.length}</strong></div>}
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
