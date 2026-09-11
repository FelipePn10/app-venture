import { useState, useCallback, useEffect } from "react";
import {
  type Machine,
  CAPACITY_UNITS,
  CAPACITY_PERIODS,
  capacityUnitLabel,
  capacityPeriodLabel,
  PREPARATION_TIME_UNITS,
  preparationUnitLabel,
  listMachines,
  createMachine,
  updateMachine,
  listMachinesByType,
} from "@/services/machineService";
import {
  type MachineType, MACHINE_TYPE_ENUMS,
  listMachineTypes, machineTypeLabel, createMachineType, updateMachineType,
} from "@/services/machineTypeService";
import {
  type CreateItemMachineTimeDTO,
  type ProductionCalcResult,
  createItemMachineTime,
  calculateProductionTime,
} from "@/services/itemMachineTimeService";
import {
  type MachineScheduleDTO,
  createMachineSchedule,
  listMachineSchedules,
  reorderMachineSchedule,
  updateMachineScheduleStatus,
  updateMachineScheduleTimes,
  deleteMachineSchedule,
} from "@/services/machineScheduleService";
import { enumLabel } from "@/utils/enumLabels";
import {
  type SetupTransitionDTO,
  listSetupMatrix, upsertSetupTransition, deleteSetupTransition,
} from "@/services/apsService";
import { errMessage } from "@/services/fiscalShared";
import { useAuthStore } from "@/store/authStore";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadItemMasks, loadMachines, loadCostCenters, loadSuppliers, loadWorkCenters, loadMaintenanceResponsibles } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

function resolveUserId(id: string | undefined, token: string | null): string {
  if (id) return id;
  if (!token) return "";
  try {
    const part = token.split(".")[1];
    if (!part) return "";
    const p = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    return String(p["sub"] ?? p["id"] ?? p["user_id"] ?? "");
  } catch { return ""; }
}

const TIME_UNITS = CAPACITY_PERIODS; // produção usa o mesmo enum de período (MINUTO/HORA/DIA)

/**
 * Cadastro completo do recurso. A tela pedia sete campos; a tabela guarda vinte.
 * Os que faltavam são os que o chão de fábrica usa para sequenciar: onde a
 * máquina fica, se é gargalo, quanto tempo leva para preparar, qual calendário
 * segue e quem responde pela manutenção.
 */
const EMPTY_MACHINE = {
  code: 0, name: "", machine_type_code: 0, capacity: 0,
  capacity_per_unit: "PEÇAS", capacity_period: "DIA", efficiency_rate: 0.9,
  is_active: true, is_critical: false, is_preferred: false,
  location: "", usage_description: "", brand: "", acquired_on: "",
  preparation_time: 0, preparation_time_unit: "MINUTE",
  cost_center_code: 0, supplier_code: 0, maintenance_responsible_employee_id: 0,
};
const EMPTY_TIME: CreateItemMachineTimeDTO = { item_code: "", mask: "", machine_code: 0, production_time: 0, production_time_unit: "MINUTO", production_base_qty: 1, setup_time: 0, priority: 1 };

/** Situações do slot na fila (`machine_schedules.status`). */
const SCHEDULE_STATUS = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

/** `HH:MM` do input de hora → `HH:MM:SS`, que é o formato que o backend converte. */
function comSegundos(hora: string): string | undefined {
  if (!hora) return undefined;
  return hora.length === 5 ? `${hora}:00` : hora;
}

/** `HH:MM:SS` ou ISO vindo do backend → `HH:MM` para o input. */
function semSegundos(valor: string | undefined): string {
  if (!valor) return "";
  const hora = valor.includes("T") ? (valor.split("T")[1] ?? "") : valor;
  return hora.slice(0, 5);
}

export function Vmaq0200Page(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [machines, setMachines] = useState<Machine[]>([]);
  const [types, setTypes] = useState<MachineType[]>([]);
  const [mForm, setMForm] = useState({ ...EMPTY_MACHINE });
  /** Código em edição; null = cadastrando um novo recurso. */
  const [mEdit, setMEdit] = useState<number | null>(null);
  const [tipoForm, setTipoForm] = useState({ code: 0, name: "", description: "", type: "CUT", requires_operator: false, is_active: true });
  const [tipoEdit, setTipoEdit] = useState<number | null>(null);
  /** Recursos que atendem o tipo aberto — o tipo deixa de ser só um rótulo. */
  const [maquinasDoTipo, setMaquinasDoTipo] = useState<Machine[]>([]);
  /**
   * Matriz de preparação: quanto custa trocar de um item (ou família) para
   * outro no centro. É o que permite ao sequenciamento agrupar itens parecidos
   * — sem ela, trocar de preto para preto custa o mesmo que de branco para preto.
   */
  const [setupCentro, setSetupCentro] = useState<number>(0);
  const [setupLinhas, setSetupLinhas] = useState<SetupTransitionDTO[]>([]);
  const [setupForm, setSetupForm] = useState({ from_family: "", to_family: "", from_item_code: "", to_item_code: "", setup_minutes: "" });
  const [tForm, setTForm] = useState<CreateItemMachineTimeDTO>({ ...EMPTY_TIME });
  const [calc, setCalc] = useState({ item_code: "", mask: "", machine_code: 0, demand_qty: 0 });
  const [calcResult, setCalcResult] = useState<ProductionCalcResult | null>(null);
  const [sched, setSched] = useState({ machine_code: 0, schedule_date: "", planned_qty: 0, sequence: 0 });
  const [fila, setFila] = useState<MachineScheduleDTO[]>([]);
  const [apontamento, setApontamento] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const loadAll = useCallback(() => run(async () => {
    const [ms, ts] = await Promise.all([listMachines(), listMachineTypes()]);
    setMachines(ms); setTypes(ts);
  }), [run]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  /** Zero em campo de vínculo significa "não informado", não o código 0. */
  const vinculo = (v: number) => (v > 0 ? v : null);

  const corpoDaMaquina = () => ({
    code: mForm.code,
    name: mForm.name.trim(),
    machine_type_code: mForm.machine_type_code,
    capacity: mForm.capacity,
    capacity_per_unit: mForm.capacity_per_unit,
    capacity_period: mForm.capacity_period,
    efficiency_rate: mForm.efficiency_rate,
    is_active: mForm.is_active,
    cost_center_code: vinculo(mForm.cost_center_code),
    supplier_code: vinculo(mForm.supplier_code),
    maintenance_responsible_employee_id: vinculo(mForm.maintenance_responsible_employee_id),
    location: mForm.location.trim() || null,
    usage_description: mForm.usage_description.trim() || null,
    brand: mForm.brand.trim() || null,
    acquired_on: mForm.acquired_on || null,
    preparation_time: Number(mForm.preparation_time) || 0,
    preparation_time_unit: mForm.preparation_time_unit,
    is_critical: mForm.is_critical,
    is_preferred: mForm.is_preferred,
  });

  const salvarMaquina = () => run(async () => {
    if (!mForm.code || !mForm.name.trim()) { setFeedback({ type: "error", message: "Código e nome são obrigatórios." }); return; }
    if (!mForm.machine_type_code) { setFeedback({ type: "error", message: "Tipo de máquina é obrigatório." }); return; }
    if (!(mForm.capacity > 0)) { setFeedback({ type: "error", message: "A capacidade deve ser maior que zero." }); return; }
    if (mEdit !== null) {
      await updateMachine(mEdit, corpoDaMaquina());
      setFeedback({ type: "success", message: `Máquina ${mEdit} alterada.` });
    } else {
      await createMachine({ ...corpoDaMaquina(), created_by: resolveUserId(user?.id, token) });
      setFeedback({ type: "success", message: `Máquina "${mForm.name.trim()}" criada.` });
    }
    novaMaquina();
    setMachines(await listMachines());
  });

  function novaMaquina() { setMEdit(null); setMForm({ ...EMPTY_MACHINE }); }

  function novoTipo() {
    setTipoEdit(null);
    setMaquinasDoTipo([]);
    setTipoForm({ code: 0, name: "", description: "", type: "CUT", requires_operator: false, is_active: true });
  }

  function abrirTipo(t: MachineType) {
    setTipoEdit(t.code);
    void listMachinesByType(t.code).then(setMaquinasDoTipo).catch(() => setMaquinasDoTipo([]));
    setTipoForm({
      code: t.code, name: t.name, description: t.description ?? "", type: t.type,
      requires_operator: t.requires_operator ?? false, is_active: t.is_active,
    });
    setFeedback(null);
  }

  const carregarSetup = (wc: number) => run(async () => {
    setSetupCentro(wc);
    setSetupLinhas(wc > 0 ? await listSetupMatrix(wc) : []);
  });

  const salvarSetup = () => run(async () => {
    if (!setupCentro) { setFeedback({ type: "error", message: "Escolha o centro de trabalho." }); return; }
    const minutos = Number(setupForm.setup_minutes);
    if (!(minutos >= 0)) { setFeedback({ type: "error", message: "Informe o tempo de preparação em minutos." }); return; }
    const temCriterio = setupForm.from_family.trim() || setupForm.to_family.trim()
      || setupForm.from_item_code || setupForm.to_item_code;
    if (!temCriterio) {
      setFeedback({ type: "error", message: "Informe ao menos o item ou a família de origem ou destino — sem critério a linha valeria para tudo." });
      return;
    }
    await upsertSetupTransition({
      work_center_id: setupCentro,
      from_family: setupForm.from_family.trim() || null,
      to_family: setupForm.to_family.trim() || null,
      from_item_code: setupForm.from_item_code ? Number(setupForm.from_item_code) : null,
      to_item_code: setupForm.to_item_code ? Number(setupForm.to_item_code) : null,
      setup_minutes: minutos,
      is_active: true,
    });
    setSetupForm({ from_family: "", to_family: "", from_item_code: "", to_item_code: "", setup_minutes: "" });
    setSetupLinhas(await listSetupMatrix(setupCentro));
    setFeedback({ type: "success", message: "Transição de preparação gravada." });
  });

  const excluirSetup = (id: number) => run(async () => {
    await deleteSetupTransition(id);
    setSetupLinhas(await listSetupMatrix(setupCentro));
    setFeedback({ type: "success", message: "Transição removida." });
  });

  const salvarTipo = () => run(async () => {
    if (!tipoForm.code || !tipoForm.name.trim()) { setFeedback({ type: "error", message: "Código e nome do tipo são obrigatórios." }); return; }
    const corpo = {
      code: tipoForm.code, name: tipoForm.name.trim(),
      description: tipoForm.description.trim() || null, type: tipoForm.type,
      requires_operator: tipoForm.requires_operator, is_active: tipoForm.is_active,
    };
    if (tipoEdit !== null) {
      await updateMachineType(tipoEdit, corpo);
      setFeedback({ type: "success", message: `Tipo ${tipoEdit} alterado.` });
    } else {
      await createMachineType({ ...corpo, created_by: resolveUserId(user?.id, token) });
      setFeedback({ type: "success", message: `Tipo "${corpo.name}" cadastrado.` });
    }
    novoTipo();
    setTypes(await listMachineTypes());
  });

  /** Abre o recurso para alteração, trazendo o cadastro completo. */
  function abrirMaquina(m: Machine) {
    setMEdit(m.code);
    setMForm({
      code: m.code, name: m.name, machine_type_code: m.machine_type_code,
      capacity: m.capacity, capacity_per_unit: m.capacity_per_unit,
      capacity_period: m.capacity_period, efficiency_rate: m.efficiency_rate,
      is_active: m.is_active, is_critical: m.is_critical ?? false, is_preferred: m.is_preferred ?? false,
      location: m.location ?? "", usage_description: m.usage_description ?? "", brand: m.brand ?? "",
      acquired_on: (m.acquired_on ?? "").slice(0, 10),
      preparation_time: m.preparation_time ?? 0,
      preparation_time_unit: m.preparation_time_unit ?? "MINUTE",
      cost_center_code: m.cost_center_code ?? 0,
      supplier_code: m.supplier_code ?? 0,
      maintenance_responsible_employee_id: m.maintenance_responsible_employee_id ?? 0,
    });
    setFeedback(null);
  }

  const criarTempo = () => run(async () => {
    if (!tForm.item_code || !tForm.machine_code) { setFeedback({ type: "error", message: "Item e máquina são obrigatórios." }); return; }
    if (!tForm.production_time || !tForm.production_base_qty) { setFeedback({ type: "error", message: "Tempo de ciclo e qtd base são obrigatórios." }); return; }
    await createItemMachineTime({ ...tForm, mask: tForm.mask || null });
    setFeedback({ type: "success", message: "Tempo item × máquina cadastrado." });
    setTForm({ ...EMPTY_TIME });
  });

  const calcular = () => run(async () => {
    if (!calc.item_code || !calc.machine_code || !calc.demand_qty) { setFeedback({ type: "error", message: "Item, máquina e quantidade são obrigatórios." }); return; }
    setCalcResult(null);
    const r = await calculateProductionTime({ item_code: calc.item_code, machine_code: calc.machine_code, mask: calc.mask || null, demand_qty: calc.demand_qty });
    setCalcResult(r);
    setFeedback({ type: r.is_bottleneck ? "info" : "success", message: r.is_bottleneck ? "Calculado — ⚠️ máquina em sobrecarga (gargalo)." : "Tempo de produção calculado." });
  });

  /**
   * A fila é a agenda daquela máquina naquele dia, ordenada pela sequência. É a
   * lista que o programador olha para dizer o que roda primeiro — sem ela o
   * cadastro de agenda era cego: dava para incluir, nunca para conferir.
   */
  const carregarFila = useCallback(async (machineCode: number, data: string) => {
    if (!machineCode) { setFila([]); return; }
    const linhas = await listMachineSchedules(machineCode, data || undefined);
    setFila([...linhas].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)));
  }, []);

  useEffect(() => {
    void carregarFila(sched.machine_code, sched.schedule_date).catch(() => setFila([]));
  }, [carregarFila, sched.machine_code, sched.schedule_date]);

  const criarAgenda = () => run(async () => {
    if (!sched.machine_code) { setFeedback({ type: "error", message: "Máquina é obrigatória." }); return; }
    await createMachineSchedule({
      machine_code: sched.machine_code,
      schedule_date: sched.schedule_date ? `${sched.schedule_date}T00:00:00Z` : undefined,
      planned_qty: sched.planned_qty || undefined,
      sequence: sched.sequence || undefined,
    });
    setFeedback({ type: "success", message: "Agenda registrada para a máquina." });
    await carregarFila(sched.machine_code, sched.schedule_date);
  });

  /**
   * Trocar de posição é trocar a sequência das duas linhas envolvidas — é o que
   * o sequenciador faz quando um pedido urgente precisa furar a fila sem
   * renumerar tudo.
   */
  const mover = (indice: number, direcao: -1 | 1) => run(async () => {
    const atual = fila[indice];
    const vizinho = fila[indice + direcao];
    if (!atual?.code || !vizinho?.code) return;
    const seqAtual = atual.sequence ?? indice + 1;
    const seqVizinho = vizinho.sequence ?? indice + 1 + direcao;
    await reorderMachineSchedule(atual.code, seqVizinho, atual.priority_override);
    await reorderMachineSchedule(vizinho.code, seqAtual, vizinho.priority_override);
    setFeedback({ type: "success", message: "Fila reordenada." });
    await carregarFila(sched.machine_code, sched.schedule_date);
  });

  /** Prioridade manual: fura a fila sem mexer na sequência das outras linhas. */
  const priorizar = (linha: MachineScheduleDTO, prioridade: string) => run(async () => {
    if (!linha.code) return;
    const valor = prioridade.trim() === "" ? undefined : Number(prioridade);
    await reorderMachineSchedule(linha.code, linha.sequence ?? 0, valor);
    setFeedback({ type: "success", message: "Prioridade manual atualizada." });
    await carregarFila(sched.machine_code, sched.schedule_date);
  });

  /** Apontamento: muda a situação e registra quanto realmente saiu da máquina. */
  const apontar = (linha: MachineScheduleDTO, status: string) => run(async () => {
    if (!linha.code) return;
    const digitado = apontamento[linha.code];
    const produzido = digitado !== undefined && digitado !== ""
      ? Number(digitado)
      : (status === "COMPLETED" ? (linha.planned_qty ?? 0) : (linha.produced_qty ?? 0));
    await updateMachineScheduleStatus(linha.code, status, produzido);
    setFeedback({ type: "success", message: `Situação alterada para ${enumLabel(status).toLowerCase()}.` });
    await carregarFila(sched.machine_code, sched.schedule_date);
  });

  const ajustarHorario = (linha: MachineScheduleDTO, campo: "start_time" | "end_time", valor: string) => run(async () => {
    if (!linha.code) return;
    const inicio = campo === "start_time" ? comSegundos(valor) : comSegundos(semSegundos(linha.start_time));
    const fim = campo === "end_time" ? comSegundos(valor) : comSegundos(semSegundos(linha.end_time));
    await updateMachineScheduleTimes(linha.code, inicio, fim);
    setFeedback({ type: "success", message: "Horários da fila atualizados." });
    await carregarFila(sched.machine_code, sched.schedule_date);
  });

  const removerDaFila = (linha: MachineScheduleDTO) => run(async () => {
    if (!linha.code) return;
    await deleteMachineSchedule(linha.code);
    setFeedback({ type: "success", message: "Slot removido da fila." });
    await carregarFila(sched.machine_code, sched.schedule_date);
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Máquinas, Tempos e Cálculo</span><span className="erp-crumb-code">VMAQ0200</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Dados</span>
          <button className="erp-btn" onClick={loadAll} disabled={busy}>Recarregar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VMAQ0200 — Máquinas e Tempos" filename="vmaq0200" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Máquinas, Tempos e Cálculo</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* ── Cálculo de tempo de produção (§3) ──────────────────────────── */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Cálculo de tempo de produção</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><LookupField value={calc.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(code) => setCalc((p) => ({ ...p, item_code: String(code ?? "") }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Máscara</label><LookupField value={calc.mask || undefined} loader={loadItemMasks} entityLabel="máscara" onChange={(code) => setCalc((p) => ({ ...p, mask: code ? String(code) : "" }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Máquina</label>
            <LookupField value={calc.machine_code || undefined} loader={loadMachines} entityLabel="máquina" onChange={(code) => setCalc((p) => ({ ...p, machine_code: code ?? 0 }))} />
          </div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label><input className="erp-input num" type="number" value={calc.demand_qty || ""} onChange={(e) => setCalc((p) => ({ ...p, demand_qty: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c4" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={calcular} disabled={busy}>Calcular tempo</button></div>
        
        {calcResult && (
          <div className="erp-fieldset-body" style={{ marginTop: 10 }}>
            <div className="erp-field erp-c2"><label className="erp-label">Ciclos</label><input className="erp-input num" value={calcResult.cycles} readOnly /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Setup (min)</label><input className="erp-input num" value={calcResult.setup_minutes} readOnly /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Produção (min)</label><input className="erp-input num" value={calcResult.production_minutes} readOnly /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Total (min)</label><input className="erp-input num" value={calcResult.total_minutes} readOnly /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Total (h)</label><input className="erp-input num" value={calcResult.total_hours} readOnly /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Gargalo?</label><input className="erp-input" value={calcResult.is_bottleneck ? "⚠️ Sim" : "Não"} readOnly /></div>
          </div>
        )}
        </div></div>

        {/* ── Tipos de máquina ───────────────────────────────────────────── */}
        <div className="erp-fieldset">
          <div className="erp-fieldset-head" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>{tipoEdit !== null ? `Tipo de máquina ${tipoEdit} — alterando` : "Tipos de máquina"}</span>
            <span style={{ flex: 1 }} />
            {tipoEdit !== null && <button className="erp-btn erp-btn-sm" onClick={novoTipo}>Cancelar alteração</button>}
          </div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c12">
              <p className="erp-note">
                O tipo agrupa recursos que fazem a mesma coisa — todas as serras, todas as dobradeiras.
                É por ele que o roteiro pede "uma serra" em vez de uma máquina específica, e
                <strong> exige operador</strong> diz se a operação consome mão de obra além da máquina.
              </p>
            </div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label>
              <input className="erp-input num" type="number" value={tipoForm.code || ""} disabled={tipoEdit !== null}
                onChange={(e) => setTipoForm((p) => ({ ...p, code: Number(e.target.value) }))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Nome</label>
              <input className="erp-input" value={tipoForm.name}
                onChange={(e) => setTipoForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Natureza</label>
              <select className="erp-input" value={tipoForm.type}
                onChange={(e) => setTipoForm((p) => ({ ...p, type: e.target.value }))}>
                {MACHINE_TYPE_ENUMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select></div>
            <div className="erp-field erp-c3"><label className="erp-label">Descrição</label>
              <input className="erp-input" value={tipoForm.description}
                onChange={(e) => setTipoForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
              <label className="erp-check"><input type="checkbox" checked={tipoForm.requires_operator}
                onChange={(e) => setTipoForm((p) => ({ ...p, requires_operator: e.target.checked }))} /> Exige operador</label>
              <label className="erp-check"><input type="checkbox" checked={tipoForm.is_active}
                onChange={(e) => setTipoForm((p) => ({ ...p, is_active: e.target.checked }))} /> Ativo</label>
            </div>
            <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
              <button className="erp-btn erp-btn-primary" onClick={salvarTipo} disabled={busy}>
                {tipoEdit !== null ? "Gravar alteração" : "Cadastrar tipo"}
              </button>
              {tipoEdit !== null && <button className="erp-btn" onClick={novoTipo} disabled={busy}>Novo tipo</button>}
            </div>
            {tipoEdit !== null && (
              <div className="erp-field erp-c12">
                <span className="erp-hint">
                  {maquinasDoTipo.length === 0
                    ? "Nenhum recurso usa este tipo ainda."
                    : `Recursos deste tipo: ${maquinasDoTipo.map((m) => `${m.code} · ${m.name}`).join(" · ")}`}
                </span>
              </div>
            )}
            <div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th style={{ width: 70 }}>Código</th><th>Nome</th><th>Natureza</th><th>Descrição</th><th>Marcadores</th><th style={{ width: 80 }} /></tr></thead>
                <tbody>
                  {types.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum tipo cadastrado.</td></tr>}
                  {types.map((t) => (
                    <tr key={t.code} className={tipoEdit === t.code ? "erp-row-sel" : ""}>
                      <td>{t.code}</td>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td>{machineTypeLabel(t.type)}</td>
                      <td>{t.description || "—"}</td>
                      <td>
                        {t.requires_operator && <span className="erp-tag">Exige operador</span>}
                        {!t.is_active && <span className="erp-tag erp-tag-off">Inativo</span>}
                        {!t.requires_operator && t.is_active && "—"}
                      </td>
                      <td><button className="erp-btn erp-btn-sm" onClick={() => abrirTipo(t)} disabled={busy}>Abrir</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Máquinas ───────────────────────────────────────────────────── */}
        <div className="erp-fieldset">
          <div className="erp-fieldset-head" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>{mEdit !== null ? `Recurso ${mEdit} — alterando` : "Novo recurso (máquina)"}</span>
            <span style={{ flex: 1 }} />
            {mEdit !== null && <button className="erp-btn erp-btn-sm" onClick={novaMaquina}>Cancelar alteração</button>}
          </div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c12">
              <p className="erp-note">
                O recurso é o que o roteiro aloca e o sequenciamento enxerga. Além da capacidade,
                o que decide a programação é o resto: <strong>grupo e calendário</strong> dizem quando
                ele pode rodar, <strong>gargalo</strong> marca quem limita a fábrica e o
                <strong> tempo de preparação</strong> é o que se paga toda vez que a produção troca de item.
              </p>
            </div>

            <div className="erp-field erp-c12"><div className="erp-sec">Identificação</div></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label>
              <input className="erp-input num" type="number" value={mForm.code || ""} disabled={mEdit !== null}
                onChange={(e) => setMForm((p) => ({ ...p, code: Number(e.target.value) }))} />
              {mEdit !== null && <span className="erp-hint">O código identifica o recurso e não muda.</span>}</div>
            <div className="erp-field erp-c4"><label className="erp-label erp-req">Nome</label>
              <input className="erp-input" value={mForm.name} onChange={(e) => setMForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Tipo</label>
              <select className="erp-input" value={mForm.machine_type_code || ""}
                onChange={(e) => setMForm((p) => ({ ...p, machine_type_code: Number(e.target.value) }))}>
                <option value="">—</option>
                {types.map((t) => <option key={t.code} value={t.code}>{t.code} · {t.name} ({machineTypeLabel(t.type)})</option>)}
              </select></div>
            <div className="erp-field erp-c3"><label className="erp-label">Marca</label>
              <input className="erp-input" value={mForm.brand} placeholder="Fabricante"
                onChange={(e) => setMForm((p) => ({ ...p, brand: e.target.value }))} /></div>

            <div className="erp-field erp-c12"><div className="erp-sec">Capacidade e desempenho</div></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Capacidade</label>
              <input className="erp-input num" type="number" value={mForm.capacity || ""}
                onChange={(e) => setMForm((p) => ({ ...p, capacity: Number(e.target.value) }))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Unidade</label>
              <select className="erp-input" value={mForm.capacity_per_unit}
                onChange={(e) => setMForm((p) => ({ ...p, capacity_per_unit: e.target.value }))}>
                {CAPACITY_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select></div>
            <div className="erp-field erp-c2"><label className="erp-label">Período</label>
              <select className="erp-input" value={mForm.capacity_period}
                onChange={(e) => setMForm((p) => ({ ...p, capacity_period: e.target.value }))}>
                {CAPACITY_PERIODS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select></div>
            <div className="erp-field erp-c2"><label className="erp-label">Eficiência</label>
              <input className="erp-input num" type="number" step="0.01" min="0" max="1" value={mForm.efficiency_rate}
                onChange={(e) => setMForm((p) => ({ ...p, efficiency_rate: Number(e.target.value) }))} />
              <span className="erp-hint">0 a 1. {(mForm.efficiency_rate * 100).toFixed(0)}% da capacidade nominal.</span></div>
            <div className="erp-field erp-c3">
              <label className="erp-label">Tempo de preparação</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="erp-input num" type="number" min="0" style={{ flex: 1 }} value={mForm.preparation_time || ""}
                  onChange={(e) => setMForm((p) => ({ ...p, preparation_time: Number(e.target.value) }))} />
                <select className="erp-input" style={{ width: 110 }} value={mForm.preparation_time_unit}
                  onChange={(e) => setMForm((p) => ({ ...p, preparation_time_unit: e.target.value }))}>
                  {PREPARATION_TIME_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              <span className="erp-hint">Setup: limpeza, troca de ferramenta, ajuste.</span></div>

            <div className="erp-field erp-c12"><div className="erp-sec">Chão de fábrica</div></div>
            <div className="erp-field erp-c3"><label className="erp-label">Centro de custo</label>
              <LookupField value={mForm.cost_center_code || undefined} loader={loadCostCenters} entityLabel="centro de custo"
                placeholder="Onde o custo é apropriado" clearable
                onChange={(c) => setMForm((p) => ({ ...p, cost_center_code: c ? Number(c) : 0 }))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Localização</label>
              <input className="erp-input" value={mForm.location} placeholder="Ex.: Galpão A · Linha 2"
                onChange={(e) => setMForm((p) => ({ ...p, location: e.target.value }))} /></div>
            <div className="erp-field erp-c6"><label className="erp-label">Uso do recurso</label>
              <input className="erp-input" value={mForm.usage_description} placeholder="O que esta máquina faz"
                onChange={(e) => setMForm((p) => ({ ...p, usage_description: e.target.value }))} /></div>
            <div className="erp-field erp-c3">
              <label className="erp-check"><input type="checkbox" checked={mForm.is_critical}
                onChange={(e) => setMForm((p) => ({ ...p, is_critical: e.target.checked }))} /> Gargalo</label>
              <span className="erp-hint">Único recurso capaz de fazer a operação — limita a fábrica.</span></div>
            <div className="erp-field erp-c3">
              <label className="erp-check"><input type="checkbox" checked={mForm.is_preferred}
                onChange={(e) => setMForm((p) => ({ ...p, is_preferred: e.target.checked }))} /> Preferencial</label>
              <span className="erp-hint">Alocado primeiro quando a operação aceita mais de um recurso.</span></div>
            <div className="erp-field erp-c3">
              <label className="erp-check"><input type="checkbox" checked={mForm.is_active}
                onChange={(e) => setMForm((p) => ({ ...p, is_active: e.target.checked }))} /> Ativo</label>
              <span className="erp-hint">Recurso inativo sai das listas e dos roteiros.</span></div>

            <div className="erp-field erp-c12"><div className="erp-sec">Aquisição e manutenção</div></div>
            <div className="erp-field erp-c3"><label className="erp-label">Fornecedor</label>
              <LookupField value={mForm.supplier_code || undefined} loader={loadSuppliers} entityLabel="fornecedor"
                placeholder="De quem foi comprada" clearable
                onChange={(c) => setMForm((p) => ({ ...p, supplier_code: c ? Number(c) : 0 }))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Data de aquisição</label>
              <input className="erp-input" type="date" value={mForm.acquired_on}
                onChange={(e) => setMForm((p) => ({ ...p, acquired_on: e.target.value }))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Responsável pela manutenção</label>
              <LookupField value={mForm.maintenance_responsible_employee_id || undefined} loader={loadMaintenanceResponsibles}
                entityLabel="mecânico" placeholder="Quem cuida do recurso" clearable
                onChange={(c) => setMForm((p) => ({ ...p, maintenance_responsible_employee_id: c ? Number(c) : 0 }))} /></div>

            <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
              <button className="erp-btn erp-btn-primary" onClick={salvarMaquina} disabled={busy}>
                {mEdit !== null ? "Gravar alteração" : "Criar máquina"}
              </button>
              {mEdit !== null && <button className="erp-btn" onClick={novaMaquina} disabled={busy}>Novo recurso</button>}
            </div>
          </div>
        </div>

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Recursos cadastrados ({machines.length})</div>
          <div className="erp-fieldset-body"><div className="erp-field erp-c12">
            <table className="erp-grid">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Código</th><th>Nome</th><th>Tipo</th>
                  <th className="num">Capacidade</th><th className="num">Efic.</th>
                  <th className="num">Setup</th><th>Local</th><th>Marcadores</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {machines.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhum recurso cadastrado.</td></tr>}
                {machines.map((m) => {
                  const tipo = types.find((t) => t.code === m.machine_type_code);
                  return (
                    <tr key={m.code} className={mEdit === m.code ? "erp-row-sel" : ""}>
                      <td>{m.code}</td>
                      <td style={{ fontWeight: 600 }}>{m.name}
                        {m.usage_description && <><br /><small style={{ color: "var(--v-text-muted)" }}>{m.usage_description}</small></>}
                      </td>
                      <td>{tipo ? tipo.name : m.machine_type_code}</td>
                      <td className="num">{m.capacity.toLocaleString("pt-BR")} {capacityUnitLabel(m.capacity_per_unit)}<br />
                        <small style={{ color: "var(--v-text-muted)" }}>{capacityPeriodLabel(m.capacity_period)}</small></td>
                      <td className="num">{(m.efficiency_rate * 100).toFixed(0)}%</td>
                      <td className="num">{m.preparation_time ? `${m.preparation_time} ${preparationUnitLabel(m.preparation_time_unit).toLowerCase()}` : "—"}</td>
                      <td>{m.location || "—"}</td>
                      <td>
                        {m.is_critical && <span className="erp-tag erp-tag-warn">Gargalo</span>}
                        {m.is_preferred && <span className="erp-tag">Preferencial</span>}
                        {!m.is_active && <span className="erp-tag erp-tag-off">Inativo</span>}
                        {!m.is_critical && !m.is_preferred && m.is_active && "—"}
                      </td>
                      <td><button className="erp-btn erp-btn-sm" onClick={() => abrirMaquina(m)} disabled={busy}>Abrir</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div></div>
        </div>

        {/* ── Matriz de preparação ───────────────────────────────────────── */}
        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Matriz de tempo de preparação (setup por transição)</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c12">
              <p className="erp-note">
                O setup real depende do que estava na máquina: trocar de preto para preto
                não custa o mesmo que de branco para preto. Cadastre aqui as transições que
                importam e o sequenciamento passa a <strong>agrupar itens parecidos</strong> para
                economizar preparação — é o principal ganho de um sequenciador de verdade.
                Sem nenhuma linha, vale o setup fixo da operação.
              </p>
            </div>
            <div className="erp-field erp-c4">
              <label className="erp-label erp-req">Centro de trabalho</label>
              <LookupField value={setupCentro || undefined} loader={loadWorkCenters} entityLabel="centro de trabalho"
                placeholder="Escolher centro" clearable
                onChange={(c) => carregarSetup(c ? Number(c) : 0)} />
            </div>

            {setupCentro > 0 && (<>
              <div className="erp-field erp-c12"><div className="erp-sec">Nova transição</div></div>
              <div className="erp-field erp-c2"><label className="erp-label">Família de origem</label>
                <input className="erp-input" value={setupForm.from_family} placeholder="Ex.: PRETO"
                  onChange={(e) => setSetupForm((p) => ({ ...p, from_family: e.target.value }))} />
                <span className="erp-hint">Em branco = qualquer.</span></div>
              <div className="erp-field erp-c2"><label className="erp-label">Família de destino</label>
                <input className="erp-input" value={setupForm.to_family} placeholder="Ex.: BRANCO"
                  onChange={(e) => setSetupForm((p) => ({ ...p, to_family: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Item de origem</label>
                <LookupField value={Number(setupForm.from_item_code) || undefined} loader={loadItems}
                  entityLabel="item" placeholder="Qualquer" clearable
                  onChange={(c) => setSetupForm((p) => ({ ...p, from_item_code: c ? String(c) : "" }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Item de destino</label>
                <LookupField value={Number(setupForm.to_item_code) || undefined} loader={loadItems}
                  entityLabel="item" placeholder="Qualquer" clearable
                  onChange={(c) => setSetupForm((p) => ({ ...p, to_item_code: c ? String(c) : "" }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Preparação (min)</label>
                <input className="erp-input num" type="number" min="0" value={setupForm.setup_minutes}
                  onChange={(e) => setSetupForm((p) => ({ ...p, setup_minutes: e.target.value }))} /></div>
              <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={salvarSetup} disabled={busy}>+ Transição</button>
              </div>

              <div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>De</th><th>Para</th><th className="num">Preparação</th><th style={{ width: 90 }} /></tr></thead>
                  <tbody>
                    {setupLinhas.length === 0 && (
                      <tr><td colSpan={4} className="erp-grid-empty">
                        Nenhuma transição cadastrada — o sequenciamento usa o setup fixo da operação.
                      </td></tr>
                    )}
                    {setupLinhas.map((l) => (
                      <tr key={l.id}>
                        <td>{l.from_item_code ? `Item ${l.from_item_code}` : (l.from_family || "Qualquer")}</td>
                        <td>{l.to_item_code ? `Item ${l.to_item_code}` : (l.to_family || "Qualquer")}</td>
                        <td className="num">{l.setup_minutes.toLocaleString("pt-BR")} min</td>
                        <td>{l.id && <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => excluirSetup(l.id!)} disabled={busy}>Excluir</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>)}
          </div>
        </div>

        {/* ── Tempo item × máquina ───────────────────────────────────────── */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Tempo por item × máquina (cadastro central do cálculo)</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><LookupField value={tForm.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(code) => setTForm((p) => ({ ...p, item_code: String(code ?? "") }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Máscara</label><LookupField value={tForm.mask || undefined} loader={loadItemMasks} entityLabel="máscara" onChange={(code) => setTForm((p) => ({ ...p, mask: code ? String(code) : null }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Máquina</label>
            <LookupField value={tForm.machine_code || undefined} loader={loadMachines} entityLabel="máquina" onChange={(code) => setTForm((p) => ({ ...p, machine_code: code ?? 0 }))} />
          </div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Tempo ciclo</label><input className="erp-input num" type="number" value={tForm.production_time || ""} onChange={(e) => setTForm((p) => ({ ...p, production_time: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Unidade tempo</label>
            <select className="erp-input" value={tForm.production_time_unit} onChange={(e) => setTForm((p) => ({ ...p, production_time_unit: e.target.value }))}>
              {TIME_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Qtd base</label><input className="erp-input num" type="number" value={tForm.production_base_qty || ""} onChange={(e) => setTForm((p) => ({ ...p, production_base_qty: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Setup</label><input className="erp-input num" type="number" value={tForm.setup_time || ""} onChange={(e) => setTForm((p) => ({ ...p, setup_time: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Prioridade (1=preferida)</label><input className="erp-input num" type="number" value={tForm.priority || ""} onChange={(e) => setTForm((p) => ({ ...p, priority: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={criarTempo} disabled={busy}>Cadastrar tempo</button></div>
        </div></div>

        {/* ── Agenda ─────────────────────────────────────────────────────── */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Agenda da máquina (CRP/APS)</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c3"><label className="erp-label erp-req">Máquina</label>
            <select className="erp-input" value={sched.machine_code || ""} onChange={(e) => setSched((p) => ({ ...p, machine_code: Number(e.target.value) }))}>
              <option value="">—</option>{machines.map((m) => <option key={m.code} value={m.code}>{m.code} · {m.name}</option>)}
            </select></div>
          <div className="erp-field erp-c3"><label className="erp-label">Data</label><input className="erp-input" type="date" value={sched.schedule_date} onChange={(e) => setSched((p) => ({ ...p, schedule_date: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Qtd planejada</label><input className="erp-input num" type="number" value={sched.planned_qty || ""} onChange={(e) => setSched((p) => ({ ...p, planned_qty: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Sequência</label><input className="erp-input num" type="number" value={sched.sequence || ""} onChange={(e) => setSched((p) => ({ ...p, sequence: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={criarAgenda} disabled={busy}>Registrar</button></div>
          <div className="erp-field erp-c12">
            <p className="erp-note">
              A fila abaixo é o que essa máquina roda no dia escolhido, na ordem em que vai rodar.
              Use <strong>↑</strong> e <strong>↓</strong> para trocar a ordem, a <strong>prioridade manual</strong>
              &nbsp;para furar a fila sem renumerar tudo, e o apontamento para registrar o que de fato saiu.
            </p>
          </div>
          <div className="erp-field erp-c12">
            <table className="erp-grid">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Ordem</th><th>Ordem de produção</th>
                  <th className="num">Planejado</th><th className="num">Produzido</th>
                  <th>Início</th><th>Fim</th>
                  <th className="num" style={{ width: 90 }}>Prior.</th>
                  <th>Situação</th><th style={{ width: 210 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {fila.length === 0 && (
                  <tr><td colSpan={9} className="erp-grid-empty">
                    {sched.machine_code ? "Nenhum slot programado para essa máquina no dia." : "Escolha a máquina para ver a fila."}
                  </td></tr>
                )}
                {fila.map((linha, indice) => (
                  <tr key={linha.code ?? indice}>
                    <td>
                      <button className="erp-btn erp-btn-sm" title="Subir na fila"
                        onClick={() => mover(indice, -1)} disabled={busy || indice === 0}>↑</button>
                      <button className="erp-btn erp-btn-sm" title="Descer na fila"
                        onClick={() => mover(indice, 1)} disabled={busy || indice === fila.length - 1}>↓</button>
                    </td>
                    <td>{linha.order_code ? `OP ${linha.order_code}` : "—"}</td>
                    <td className="num">{(linha.planned_qty ?? 0).toLocaleString("pt-BR")}</td>
                    <td className="num">
                      <input className="erp-input num" type="number" step="0.001"
                        style={{ maxWidth: 100 }}
                        placeholder={String(linha.produced_qty ?? 0)}
                        value={linha.code ? (apontamento[linha.code] ?? "") : ""}
                        onChange={(e) => {
                          const codigo = linha.code;
                          if (!codigo) return;
                          const valor = e.target.value;
                          setApontamento((p) => ({ ...p, [codigo]: valor }));
                        }} />
                    </td>
                    <td>
                      <input className="erp-input" type="time" value={semSegundos(linha.start_time)}
                        onChange={(e) => ajustarHorario(linha, "start_time", e.target.value)} disabled={busy} />
                    </td>
                    <td>
                      <input className="erp-input" type="time" value={semSegundos(linha.end_time)}
                        onChange={(e) => ajustarHorario(linha, "end_time", e.target.value)} disabled={busy} />
                    </td>
                    <td className="num">
                      <input className="erp-input num" type="number" style={{ maxWidth: 70 }}
                        defaultValue={linha.priority_override ?? ""}
                        title="Prioridade manual — vazio segue a sequência"
                        onBlur={(e) => priorizar(linha, e.target.value)} disabled={busy} />
                    </td>
                    <td>{enumLabel(linha.status)}</td>
                    <td>
                      <select className="erp-input" value="" disabled={busy}
                        onChange={(e) => { if (e.target.value) apontar(linha, e.target.value); }}>
                        <option value="">Apontar…</option>
                        {SCHEDULE_STATUS.map((st) => <option key={st} value={st}>{enumLabel(st)}</option>)}
                      </select>
                      <button className="erp-btn erp-btn-sm erp-btn-danger" title="Remover da fila"
                        onClick={() => removerDaFila(linha)} disabled={busy}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Máquinas: <strong>{machines.length}</strong></div><div className="erp-status-item">Tipos: <strong>{types.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
