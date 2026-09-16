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
  listMachineCalendars,
  upsertMachineCalendar,
  deleteMachineCalendar,
  listMachineDowntimes,
  createMachineDowntime,
  deleteMachineDowntime,
  shiftHours,
  WEEKDAYS,
  DOWNTIME_TYPES,
  type MachineCalendar,
  type MachineCalendarInterval,
  type MachineDowntime,
  listMachineConsumables,
  upsertMachineConsumable,
  deleteMachineConsumable,
  type MachineConsumable,
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
  listItemMachineTimes,
  type ItemMachineTime,
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
  capacity_per_unit: "PEÇAS", capacity_period: "HORA", efficiency_rate: 1, available_hours_per_day: 8 as number | null,
  is_active: true, is_critical: false, is_preferred: false,
  calendar_id: null as number | null, resource_group_id: null as number | null,
  location: "", usage_description: "", brand: "", acquired_on: "",
  preparation_time: 0, preparation_time_unit: "MINUTE",
  cost_center_code: 0, supplier_code: 0, maintenance_responsible_employee_id: 0,
};
const EMPTY_TIME: CreateItemMachineTimeDTO = { item_code: "", mask: "", machine_code: 0, production_time: 1, production_time_unit: "HORA", production_base_qty: 1, setup_time: 0, priority: 1, efficiency_rate: 1, time_basis: "PROPORTIONAL" };

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

/**
 * A tela reunia sete cadastros diferentes empilhados numa rolagem só — centro de
 * trabalho, máquina, produtividade, preparação, simulador e agenda. Cada aba
 * agora responde a uma pergunta do usuário, na ordem em que a fábrica cadastra.
 */
const ABAS = [
  { id: "centros", label: "Centros de trabalho", hint: "Agrupa recursos que fazem a mesma coisa" },
  { id: "maquinas", label: "Máquinas", hint: "Cadastro do recurso e jornada" },
  { id: "turnos", label: "Turnos", hint: "Calendários de turno, inclusive noturno" },
  { id: "paradas", label: "Paradas", hint: "Manutenção, quebra e indisponibilidades" },
  { id: "consumiveis", label: "Consumíveis", hint: "Gás, eletrodo, arame: autonomia e tempo de troca" },
  { id: "produtividade", label: "Produtividade", hint: "Quanto o item rende em cada máquina" },
  { id: "preparacao", label: "Preparação", hint: "Matriz de setup por transição" },
  { id: "simulador", label: "Simulador", hint: "Quanto tempo leva uma quantidade" },
  { id: "agenda", label: "Agenda", hint: "Fila da máquina (CRP/APS)" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

const HOJE = () => new Date().toISOString().slice(0, 10);

export function Vmaq0200Page(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [machines, setMachines] = useState<Machine[]>([]);
  const [calendars, setCalendars] = useState<MachineCalendar[]>([]);
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
  const [itemTimes, setItemTimes] = useState<ItemMachineTime[]>([]);
  useEffect(() => {
    let current = true;
    setItemTimes([]);
    if (tForm.item_code) void listItemMachineTimes(tForm.item_code).then((rows) => { if (current) setItemTimes(rows); }).catch((error) => { if (current) setFeedback({ type: "error", message: errMessage(error) }); });
    return () => { current = false; };
  }, [tForm.item_code]);
  const [calc, setCalc] = useState({ item_code: "", mask: "", machine_code: 0, demand_qty: 0 });
  const [calcResult, setCalcResult] = useState<ProductionCalcResult | null>(null);
  const [sched, setSched] = useState({ machine_code: 0, schedule_date: "", planned_qty: 0, sequence: 0 });
  const [fila, setFila] = useState<MachineScheduleDTO[]>([]);
  const [apontamento, setApontamento] = useState<Record<number, string>>({});
  const [aba, setAba] = useState<Aba>("maquinas");
  /** Calendário em edição na aba Turnos; null = cadastrando um novo. */
  const [calEdit, setCalEdit] = useState<number | null>(null);
  const [calForm, setCalForm] = useState<{ code: number; description: string; intervals: MachineCalendarInterval[] }>({ code: 0, description: "", intervals: [] });
  const [paradas, setParadas] = useState<MachineDowntime[]>([]);
  const [paradaFiltro, setParadaFiltro] = useState({ machine_id: 0, from: HOJE(), to: HOJE() });
  const [paradaForm, setParadaForm] = useState({ machine_id: 0, starts_at: "", ends_at: "", downtime_type: "UNPLANNED", reason: "" });
  const [consumiveis, setConsumiveis] = useState<MachineConsumable[]>([]);
  const [consForm, setConsForm] = useState({ machine_code: 0, code: "", description: "", unit: "m³", capacity_per_refill: 0, replacement_minutes: 0 });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const loadAll = useCallback(() => run(async () => {
    const [ms, ts, cs, cons] = await Promise.all([listMachines(), listMachineTypes(), listMachineCalendars(), listMachineConsumables()]);
    setCalendars(cs);
    setConsumiveis(cons);
    setMachines(ms); setTypes(ts);
  }), [run]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // ── Turnos ────────────────────────────────────────────────────────────────
  const novoCalendario = () => { setCalEdit(null); setCalForm({ code: 0, description: "", intervals: [] }); };

  const editarCalendario = (c: MachineCalendar) => {
    setCalEdit(c.id);
    setCalForm({ code: c.code, description: c.description, intervals: c.intervals.map((i) => ({ ...i })) });
  };

  const addTurno = () => setCalForm((p) => ({ ...p, intervals: [...p.intervals, { weekday: 1, start: "08:00", end: "17:00" }] }));

  const mudarTurno = (idx: number, campo: keyof MachineCalendarInterval, valor: string | number) =>
    setCalForm((p) => ({ ...p, intervals: p.intervals.map((i, n) => (n === idx ? { ...i, [campo]: valor } : i)) }));

  const removerTurno = (idx: number) =>
    setCalForm((p) => ({ ...p, intervals: p.intervals.filter((_, n) => n !== idx) }));

  const salvarCalendario = () => run(async () => {
    if (!calForm.code || !calForm.description.trim()) throw new Error("Informe o código e a descrição do calendário.");
    if (calForm.intervals.length === 0) throw new Error("Cadastre ao menos um turno — um calendário sem turno fecha a máquina todos os dias.");
    const degenerado = calForm.intervals.find((i) => i.start === i.end);
    if (degenerado) throw new Error("Um turno não pode começar e terminar no mesmo horário.");
    await upsertMachineCalendar({ code: calForm.code, description: calForm.description.trim(), intervals: calForm.intervals });
    setCalendars(await listMachineCalendars());
    novoCalendario();
    setFeedback({ type: "success", message: "Calendário gravado." });
  });

  const excluirCalendario = (c: MachineCalendar) => run(async () => {
    const emUso = machines.filter((m) => m.calendar_id === c.id);
    if (emUso.length > 0) throw new Error(`O calendário ${c.code} está em uso por ${emUso.length} máquina(s). Troque o calendário delas antes de excluir.`);
    await deleteMachineCalendar(c.id);
    setCalendars(await listMachineCalendars());
    if (calEdit === c.id) novoCalendario();
    setFeedback({ type: "success", message: `Calendário ${c.code} excluído.` });
  });

  // ── Consumíveis ───────────────────────────────────────────────────────────
  const salvarConsumivel = () => run(async () => {
    if (!consForm.machine_code) throw new Error("Escolha a máquina.");
    if (!consForm.code.trim() || !consForm.description.trim() || !consForm.unit.trim()) {
      throw new Error("Informe código, descrição e unidade do consumível.");
    }
    if (!(consForm.capacity_per_refill > 0)) {
      throw new Error("Informe quanto rende uma carga completa — sem isso o sistema não sabe quando a troca acontece.");
    }
    await upsertMachineConsumable({ ...consForm, code: consForm.code.trim(), description: consForm.description.trim(), unit: consForm.unit.trim() });
    setConsumiveis(await listMachineConsumables());
    setConsForm((p) => ({ ...p, code: "", description: "", capacity_per_refill: 0, replacement_minutes: 0 }));
    setFeedback({ type: "success", message: "Consumível gravado." });
  });

  const excluirConsumivel = (c: MachineConsumable) => run(async () => {
    await deleteMachineConsumable(c.id);
    setConsumiveis(await listMachineConsumables());
    setFeedback({ type: "success", message: `Consumível ${c.code} removido.` });
  });

  // ── Paradas ───────────────────────────────────────────────────────────────
  //
  // A API de paradas trabalha com o ID interno da máquina; o LookupField devolve
  // o CÓDIGO, que é o que o usuário conhece. Traduzir aqui evita mandar o código
  // como id e receber "registro não encontrado" sem explicação.
  const idDaMaquina = (code: number): number => machines.find((m) => m.code === code)?.id ?? 0;

  const buscarParadas = () => run(async () => {
    const id = idDaMaquina(paradaFiltro.machine_id);
    if (!id) throw new Error("Escolha a máquina.");
    setParadas(await listMachineDowntimes(id, `${paradaFiltro.from}T00:00:00Z`, `${paradaFiltro.to}T23:59:59Z`));
  });

  const gravarParada = () => run(async () => {
    if (!paradaForm.machine_id) throw new Error("Escolha a máquina.");
    if (!paradaForm.starts_at || !paradaForm.ends_at) throw new Error("Informe início e fim da parada.");
    if (paradaForm.ends_at <= paradaForm.starts_at) throw new Error("O fim da parada tem de ser depois do início.");
    if (!paradaForm.reason.trim()) throw new Error("Descreva a parada — é o que explica a indisponibilidade para quem consultar depois.");
    const id = idDaMaquina(paradaForm.machine_id);
    if (!id) throw new Error("Escolha a máquina.");
    await createMachineDowntime({
      machine_id: id,
      starts_at: new Date(paradaForm.starts_at).toISOString(),
      ends_at: new Date(paradaForm.ends_at).toISOString(),
      downtime_type: paradaForm.downtime_type,
      reason: paradaForm.reason.trim(),
    });
    setParadaForm((p) => ({ ...p, starts_at: "", ends_at: "", reason: "" }));
    setParadaFiltro((p) => ({ ...p, machine_id: paradaForm.machine_id }));
    setParadas(await listMachineDowntimes(id, `${paradaFiltro.from}T00:00:00Z`, `${paradaFiltro.to}T23:59:59Z`));
    setFeedback({ type: "success", message: "Parada registrada — o planejamento deixa de ocupar esse período." });
  });

  const excluirParada = (d: MachineDowntime) => run(async () => {
    await deleteMachineDowntime(d.id);
    setParadas((p) => p.filter((x) => x.id !== d.id));
    setFeedback({ type: "success", message: "Parada removida." });
  });

  /** Zero em campo de vínculo significa "não informado", não o código 0. */
  const vinculo = (v: number) => (v > 0 ? v : null);

  const corpoDaMaquina = () => ({
    code: mForm.code,
    name: mForm.name.trim(),
    machine_type_code: mForm.machine_type_code,
    capacity: mForm.capacity,
    available_hours_per_day: mForm.available_hours_per_day,
    inherit_work_center_hours: mForm.available_hours_per_day == null,
    calendar_id: mForm.calendar_id, resource_group_id: mForm.resource_group_id,
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
    if (mForm.capacity < 0 || !(mForm.capacity > 0) && !(Number(mForm.available_hours_per_day) > 0)) { setFeedback({ type: "error", message: "Informe a jornada diária da máquina ou sua produção nominal de referência." }); return; }
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
      available_hours_per_day: m.available_hours_per_day ?? null,
      calendar_id: m.calendar_id ?? null, resource_group_id: m.resource_group_id ?? null,
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
    setItemTimes(await listItemMachineTimes(tForm.item_code));
  });

  const calcular = () => run(async () => {
    if (!calc.item_code || !calc.machine_code || !calc.demand_qty) { setFeedback({ type: "error", message: "Item, máquina e quantidade são obrigatórios." }); return; }
    setCalcResult(null);
    const r = await calculateProductionTime({ item_code: calc.item_code, machine_code: calc.machine_code, mask: calc.mask || null, demand_qty: calc.demand_qty });
    setCalcResult(r);
    setFeedback({ type: "success", message: "Tempo calculado. A sobrecarga depende das demais ordens e do calendário; confira no planejamento de capacidade." });
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
          <div className="erp-tabs">
            {ABAS.map((a) => (
              <button key={a.id} type="button" className={`erp-tab${aba === a.id ? " active" : ""}`}
                onClick={() => setAba(a.id)} title={a.hint}>{a.label}</button>
            ))}
          </div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {aba === "centros" && (<>
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
        </>)}

        {aba === "maquinas" && (<>
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

            <div className="erp-field erp-c12"><div className="erp-sec">Disponibilidade e desempenho</div></div>
            <div className="erp-field erp-c4"><label className="erp-label">Calendário de turnos</label><select className="erp-input" value={mForm.calendar_id ?? ""} onChange={(e) => setMForm((p) => ({ ...p, calendar_id: e.target.value ? Number(e.target.value) : null }))}><option value="">Sem calendário — usar jornada diária</option>{calendars.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.description}</option>)}</select><span className="erp-hint">Com calendário, o planejamento respeita os turnos cadastrados. Dias sem turno ficam fechados.</span></div>
            <div className="erp-field erp-c3"><label className="erp-label">Horas disponíveis por dia</label><input className="erp-input num" type="number" min="0.01" max="24" step="0.25" value={mForm.available_hours_per_day ?? ""} onChange={(e) => setMForm((p) => ({ ...p, available_hours_per_day: e.target.value === "" ? null : Number(e.target.value) }))} /><span className="erp-hint">Sem calendário: jornada diária. Vazio herda o centro de trabalho.</span></div>
            <div className="erp-field erp-c2"><label className="erp-label">Produção nominal de referência</label>
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
            <div className="erp-field erp-c2"><label className="erp-label">Eficiência padrão (%)</label>
              <input className="erp-input num" type="number" step="0.1" min="0.1" max="100" value={mForm.efficiency_rate * 100}
                onChange={(e) => setMForm((p) => ({ ...p, efficiency_rate: Number(e.target.value) / 100 }))} />
              <span className="erp-hint">Usada apenas quando o item não possui eficiência própria.</span></div>
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
                  <th className="num">Setup</th><th>Jornada</th><th>Local</th><th>Marcadores</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {machines.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhum recurso cadastrado.</td></tr>}
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
                      <td>{(() => {
                        // A jornada é o que governa a capacidade. Sem ela na grade não dá
                        // para saber, de relance, qual recurso segue turno e qual usa
                        // jornada plana de segunda a sexta.
                        const cal = calendars.find((c) => c.id === m.calendar_id);
                        if (cal) {
                          const horas = cal.intervals.reduce((t, i) => t + shiftHours(i.start, i.end), 0);
                          return <>{cal.description}<br /><small style={{ color: "var(--v-text-muted)" }}>{cal.intervals.length} turno(s) · {horas.toFixed(1)} h/sem</small></>;
                        }
                        return m.available_hours_per_day
                          ? <>{m.available_hours_per_day} h/dia<br /><small style={{ color: "var(--v-text-muted)" }}>seg a sex, sem calendário</small></>
                          : <span style={{ color: "var(--v-text-muted)" }}>herda o centro</span>;
                      })()}</td>
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
        </>)}

        {aba === "turnos" && (<>
        <div className="erp-fieldset">
          <div className="erp-fieldset-head" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>{calEdit !== null ? `Calendário ${calForm.code} — alterando` : "Novo calendário de turnos"}</span>
            <span style={{ flex: 1 }} />
            {calEdit !== null && <button className="erp-btn erp-btn-sm" onClick={novoCalendario}>Cancelar alteração</button>}
          </div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c12">
              <p className="erp-note">
                O calendário diz <strong>quando a máquina pode produzir</strong>. Dia sem turno é dia fechado —
                o planejamento não agenda nada nele. Máquina sem calendário usa a jornada diária do cadastro,
                de segunda a sexta, a partir da meia-noite.
                <br />
                ⭐ <strong>Turno que vira o dia:</strong> informe o fim <em>menor</em> que o início. 22:00 às 06:00
                é uma janela contínua de oito horas que termina no dia seguinte, e um ciclo longo cabe nela inteiro.
              </p>
            </div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label>
              <input className="erp-input num" type="number" value={calForm.code || ""} disabled={calEdit !== null}
                onChange={(e) => setCalForm((p) => ({ ...p, code: Number(e.target.value) }))} /></div>
            <div className="erp-field erp-c5"><label className="erp-label erp-req">Descrição</label>
              <input className="erp-input" value={calForm.description}
                onChange={(e) => setCalForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="erp-field erp-c3" style={{ alignSelf: "end" }}>
              <button className="erp-btn" onClick={addTurno}>Adicionar turno</button></div>

            {calForm.intervals.length > 0 && (
              <div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>Dia</th><th>Início</th><th>Fim</th><th>Horas</th><th>Observação</th><th /></tr></thead>
                  <tbody>
                    {calForm.intervals.map((i, idx) => {
                      const viraODia = i.start !== "" && i.end !== "" && i.end <= i.start;
                      return (
                        <tr key={idx}>
                          <td>
                            <select className="erp-input" value={i.weekday} onChange={(e) => mudarTurno(idx, "weekday", Number(e.target.value))}>
                              {WEEKDAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                          </td>
                          <td><input className="erp-input" type="time" value={i.start} onChange={(e) => mudarTurno(idx, "start", e.target.value)} /></td>
                          <td><input className="erp-input" type="time" value={i.end} onChange={(e) => mudarTurno(idx, "end", e.target.value)} /></td>
                          <td className="num">{i.start && i.end ? shiftHours(i.start, i.end).toFixed(2) : "—"}</td>
                          <td>{i.start === i.end && i.start !== "" ? "⚠️ início igual ao fim" : viraODia ? "vira o dia seguinte" : ""}</td>
                          <td><button className="erp-btn erp-btn-sm" onClick={() => removerTurno(idx)}>Remover</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
              <button className="erp-btn erp-btn-primary" onClick={salvarCalendario} disabled={busy}>
                {calEdit !== null ? "Gravar alteração" : "Cadastrar calendário"}
              </button>
            </div>
          </div>
        </div>

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Calendários cadastrados ({calendars.length})</div>
          <div className="erp-fieldset-body"><div className="erp-field erp-c12">
            <table className="erp-grid">
              <thead><tr><th>Código</th><th>Descrição</th><th>Turnos</th><th>Horas/semana</th><th>Máquinas</th><th /></tr></thead>
              <tbody>
                {calendars.length === 0 && <tr><td colSpan={6}>Nenhum calendário cadastrado. Sem calendário, a máquina usa a jornada diária de segunda a sexta.</td></tr>}
                {calendars.map((c) => {
                  const horas = c.intervals.reduce((t, i) => t + shiftHours(i.start, i.end), 0);
                  const usos = machines.filter((m) => m.calendar_id === c.id).length;
                  return (
                    <tr key={c.id}>
                      <td className="num">{c.code}</td>
                      <td>{c.description}</td>
                      <td>{c.intervals.length === 0 ? "—" : c.intervals.map((i) => `${WEEKDAYS[i.weekday]?.label ?? i.weekday} ${i.start}–${i.end}`).join(" · ")}</td>
                      <td className="num">{horas.toFixed(2)}</td>
                      <td className="num">{usos}</td>
                      <td style={{ display: "flex", gap: 6 }}>
                        <button className="erp-btn erp-btn-sm" onClick={() => editarCalendario(c)}>Alterar</button>
                        <button className="erp-btn erp-btn-sm" onClick={() => excluirCalendario(c)} disabled={busy}>Excluir</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div></div>
        </div>
        </>)}

        {aba === "paradas" && (<>
        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Registrar parada de máquina</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c12">
              <p className="erp-note">
                Quebra, manutenção corretiva, troca de ferramenta ou de consumível. O período registrado
                <strong> deixa de existir como capacidade</strong>: o MRP não agenda dentro dele, o CRP não
                conta as horas e o APS desvia o sequenciamento. É assim que a parada sai do papel e entra na conta.
              </p>
            </div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Máquina</label>
              <LookupField value={paradaForm.machine_id || undefined} loader={loadMachines} entityLabel="máquina"
                onChange={(code) => setParadaForm((p) => ({ ...p, machine_id: Number(code ?? 0) }))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Início</label>
              <input className="erp-input" type="datetime-local" value={paradaForm.starts_at}
                onChange={(e) => setParadaForm((p) => ({ ...p, starts_at: e.target.value }))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Fim</label>
              <input className="erp-input" type="datetime-local" value={paradaForm.ends_at}
                onChange={(e) => setParadaForm((p) => ({ ...p, ends_at: e.target.value }))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Motivo</label>
              <select className="erp-input" value={paradaForm.downtime_type}
                onChange={(e) => setParadaForm((p) => ({ ...p, downtime_type: e.target.value }))}>
                {DOWNTIME_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select></div>
            <div className="erp-field erp-c8"><label className="erp-label erp-req">Descrição</label>
              <input className="erp-input" value={paradaForm.reason} placeholder="Ex.: troca do cilindro de oxigênio"
                onChange={(e) => setParadaForm((p) => ({ ...p, reason: e.target.value }))} /></div>
            <div className="erp-field erp-c4" style={{ alignSelf: "end" }}>
              <button className="erp-btn erp-btn-primary" onClick={gravarParada} disabled={busy}>Registrar parada</button></div>
          </div>
        </div>

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Paradas registradas</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Máquina</label>
              <LookupField value={paradaFiltro.machine_id || undefined} loader={loadMachines} entityLabel="máquina"
                onChange={(code) => setParadaFiltro((p) => ({ ...p, machine_id: Number(code ?? 0) }))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">De</label>
              <input className="erp-input" type="date" value={paradaFiltro.from}
                onChange={(e) => setParadaFiltro((p) => ({ ...p, from: e.target.value }))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Até</label>
              <input className="erp-input" type="date" value={paradaFiltro.to}
                onChange={(e) => setParadaFiltro((p) => ({ ...p, to: e.target.value }))} /></div>
            <div className="erp-field erp-c3" style={{ alignSelf: "end" }}>
              <button className="erp-btn" onClick={buscarParadas} disabled={busy}>Consultar</button></div>
            <div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Início</th><th>Fim</th><th>Horas</th><th>Motivo</th><th>Descrição</th><th /></tr></thead>
                <tbody>
                  {paradas.length === 0 && <tr><td colSpan={6}>Nenhuma parada no período consultado.</td></tr>}
                  {paradas.map((d) => {
                    const horas = (new Date(d.ends_at).getTime() - new Date(d.starts_at).getTime()) / 3600000;
                    return (
                      <tr key={d.id}>
                        <td>{new Date(d.starts_at).toLocaleString("pt-BR")}</td>
                        <td>{new Date(d.ends_at).toLocaleString("pt-BR")}</td>
                        <td className="num">{horas.toFixed(2)}</td>
                        <td>{DOWNTIME_TYPES.find((t) => t.value === d.downtime_type)?.label ?? d.downtime_type}</td>
                        <td>{d.reason}</td>
                        <td><button className="erp-btn erp-btn-sm" onClick={() => excluirParada(d)} disabled={busy}>Excluir</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </>)}

        {aba === "consumiveis" && (<>
        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Consumível da máquina</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c12">
              <p className="erp-note">
                Gás de corte, eletrodo, arame, óleo. Aqui vai a <strong>autonomia</strong> — quanto rende
                uma carga completa — e quanto a máquina fica parada para trocá-la.
                <br />
                ⭐ <strong>A taxa de consumo não é cadastrada aqui.</strong> Um cilindro não dura "N horas":
                dura conforme o que está sendo cortado. Chapa de 3 mm gasta uma vazão, chapa de 12 mm gasta
                outra. Por isso a taxa fica na aba <strong>Produtividade</strong>, junto do item — que é onde
                o sistema sabe o que está sendo feito.
              </p>
            </div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Máquina</label>
              <LookupField value={consForm.machine_code || undefined} loader={loadMachines} entityLabel="máquina"
                onChange={(c) => setConsForm((p) => ({ ...p, machine_code: Number(c ?? 0) }))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label>
              <input className="erp-input" value={consForm.code} placeholder="O2"
                onChange={(e) => setConsForm((p) => ({ ...p, code: e.target.value }))} /></div>
            <div className="erp-field erp-c4"><label className="erp-label erp-req">Descrição</label>
              <input className="erp-input" value={consForm.description} placeholder="Oxigênio de corte"
                onChange={(e) => setConsForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Unidade</label>
              <input className="erp-input" value={consForm.unit} placeholder="m³"
                onChange={(e) => setConsForm((p) => ({ ...p, unit: e.target.value }))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Rende por carga</label>
              <input className="erp-input num" type="number" step="any" min="0.000001" value={consForm.capacity_per_refill || ""}
                onChange={(e) => setConsForm((p) => ({ ...p, capacity_per_refill: Number(e.target.value) }))} />
              <span className="erp-hint">Ex.: um cilindro de 200 m³.</span></div>
            <div className="erp-field erp-c3"><label className="erp-label">Tempo de troca (min)</label>
              <input className="erp-input num" type="number" step="any" min="0" value={consForm.replacement_minutes || ""}
                onChange={(e) => setConsForm((p) => ({ ...p, replacement_minutes: Number(e.target.value) }))} />
              <span className="erp-hint">A máquina fica parada nesse tempo, e o planejamento conta isso.</span></div>
            <div className="erp-field erp-c3" style={{ alignSelf: "end" }}>
              <button className="erp-btn erp-btn-primary" onClick={salvarConsumivel} disabled={busy}>Gravar consumível</button></div>
          </div>
        </div>

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Consumíveis cadastrados ({consumiveis.length})</div>
          <div className="erp-fieldset-body"><div className="erp-field erp-c12">
            <table className="erp-grid">
              <thead><tr><th>Máquina</th><th>Código</th><th>Descrição</th><th>Rende</th><th>Troca (min)</th><th /></tr></thead>
              <tbody>
                {consumiveis.length === 0 && <tr><td colSpan={6}>Nenhum consumível cadastrado.</td></tr>}
                {consumiveis.map((c) => (
                  <tr key={c.id}>
                    <td>{machines.find((m) => m.code === c.machine_code)?.name ?? c.machine_code}</td>
                    <td><strong>{c.code}</strong></td>
                    <td>{c.description}</td>
                    <td className="num">{c.capacity_per_refill} {c.unit}</td>
                    <td className="num">{c.replacement_minutes}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => setConsForm({
                        machine_code: c.machine_code, code: c.code, description: c.description,
                        unit: c.unit, capacity_per_refill: c.capacity_per_refill, replacement_minutes: c.replacement_minutes,
                      })}>Alterar</button>
                      <button className="erp-btn erp-btn-sm" onClick={() => excluirConsumivel(c)} disabled={busy}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        </div>
        </>)}

        {aba === "produtividade" && (<>
        {/* ── Tempo item × máquina ───────────────────────────────────────── */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Produtividade por item e máquina</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><LookupField value={tForm.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(code) => setTForm((p) => ({ ...p, item_code: String(code ?? "") }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Máscara</label><LookupField value={tForm.mask || undefined} loader={loadItemMasks} entityLabel="máscara" onChange={(code) => setTForm((p) => ({ ...p, mask: code ? String(code) : null }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Máquina</label>
            <LookupField value={tForm.machine_code || undefined} loader={loadMachines} entityLabel="máquina" onChange={(code) => setTForm((p) => ({ ...p, machine_code: code ?? 0 }))} />
          </div>
          <div className="erp-field erp-c12"><p className="erp-hint">Informe a produção real esperada: 120 peças por hora = tempo 1, unidade hora, quantidade 120 e eficiência de 100%. Use a unidade do item. Para chapas/hora, converta pelo número de peças obtidas por chapa. A máscara distingue configurações como material e espessura.</p></div>
          <div className="erp-field erp-c3"><label className="erp-label">Forma de produção</label><select className="erp-input" value={tForm.time_basis ?? "CYCLE"} onChange={(e) => setTForm((p) => ({ ...p, time_basis: e.target.value as "CYCLE" | "PROPORTIONAL" }))}><option value="PROPORTIONAL">Contínua — proporcional à quantidade</option><option value="CYCLE">Ciclos fechados — ocupa o ciclo inteiro</option></select></div>
          <div className="erp-field erp-c3"><label className="erp-label">Eficiência deste item (%)</label><input className="erp-input num" type="number" min="0.1" max="100" step="0.1" value={tForm.efficiency_rate == null ? "" : tForm.efficiency_rate * 100} onChange={(e) => setTForm((p) => ({ ...p, efficiency_rate: e.target.value === "" ? null : Number(e.target.value) / 100 }))} /><span className="erp-hint">Vazio herda a máquina. Não é aplicada duas vezes.</span></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Tempo de produção</label><input className="erp-input num" type="number" step="any" min="0.000001" value={tForm.production_time || ""} onChange={(e) => setTForm((p) => ({ ...p, production_time: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Unidade tempo</label>
            <select className="erp-input" value={tForm.production_time_unit} onChange={(e) => setTForm((p) => ({ ...p, production_time_unit: e.target.value }))}>
              {TIME_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade nesse tempo</label><input className="erp-input num" type="number" step="1" min="1" value={tForm.production_base_qty || ""} onChange={(e) => setTForm((p) => ({ ...p, production_base_qty: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Preparação por ordem (min)</label><input className="erp-input num" type="number" step="any" min="0" value={tForm.setup_time || ""} onChange={(e) => setTForm((p) => ({ ...p, setup_time: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Prioridade (1=preferida)</label><input className="erp-input num" type="number" value={tForm.priority || ""} onChange={(e) => setTForm((p) => ({ ...p, priority: Number(e.target.value) }))} /></div>

          <div className="erp-field erp-c12"><div className="erp-sec">Consumo de consumível</div></div>
          <div className="erp-field erp-c12">
            <p className="erp-note">
              Opcional. Preenchido, o planejamento conta as <strong>trocas de carga</strong> que a ordem vai
              exigir e soma o tempo delas à ocupação da máquina — é o que impede a ordem de caber no turno
              no papel e estourar no chão.
            </p>
          </div>
          <div className="erp-field erp-c4"><label className="erp-label">Consumível</label>
            <select className="erp-input" value={tForm.consumable_id ?? ""}
              onChange={(e) => setTForm((p) => ({ ...p, consumable_id: e.target.value ? Number(e.target.value) : null }))}>
              <option value="">Não consome</option>
              {consumiveis.filter((c) => !tForm.machine_code || c.machine_code === tForm.machine_code)
                .map((c) => <option key={c.id} value={c.id}>{c.code} · {c.description} ({c.capacity_per_refill} {c.unit}/carga)</option>)}
            </select>
            <span className="erp-hint">Só aparecem os consumíveis da máquina escolhida acima.</span></div>
          <div className="erp-field erp-c3"><label className="erp-label">Consumo por hora de usinagem</label>
            <input className="erp-input num" type="number" step="any" min="0.000001"
              value={tForm.consumption_per_hour ?? ""} disabled={!tForm.consumable_id}
              onChange={(e) => setTForm((p) => ({ ...p, consumption_per_hour: e.target.value === "" ? null : Number(e.target.value) }))} />
            <span className="erp-hint">
              {tForm.consumable_id
                ? `Na unidade do consumível. Preparação não corta, então não consome.`
                : "Escolha o consumível primeiro."}
            </span></div>
          <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={criarTempo} disabled={busy}>Salvar produtividade</button></div>
          {itemTimes.length > 0 && <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>Máquina</th><th>Máscara</th><th>Produção</th><th>Eficiência</th><th>Preparação</th><th>Consumo</th><th></th></tr></thead><tbody>{itemTimes.map((row) => <tr key={`${row.machine_code}-${row.mask ?? ""}`}><td>{row.machine_code}</td><td>{row.mask || "Padrão"}</td><td>{row.production_base_qty} em {row.production_time} {row.production_time_unit.toLowerCase()}</td><td>{row.efficiency_rate == null ? "Da máquina" : `${row.efficiency_rate * 100}%`}</td><td>{row.setup_time} min</td><td>{row.consumable_id == null ? "—" : (() => {
            const c = consumiveis.find((x) => x.id === row.consumable_id);
            return `${row.consumption_per_hour}${c ? ` ${c.unit}/h · ${c.code}` : "/h"}`;
          })()}</td><td><button className="erp-btn" disabled={busy} onClick={() => setTForm({ ...row })}>Editar</button></td></tr>)}</tbody></table></div>}
        </div></div>
        </>)}

        {aba === "preparacao" && (<>
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
        </>)}

        {aba === "simulador" && (<>
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
            <div className="erp-field erp-c2"><label className="erp-label">Eficiência aplicada</label><input className="erp-input" value={`${(calcResult.efficiency_rate * 100).toFixed(1)}% (${calcResult.efficiency_source === "ITEM" ? "item" : "máquina"})`} readOnly /></div>
            {calcResult.consumable_refills > 0 && (
              <>
                <div className="erp-field erp-c3"><label className="erp-label">{calcResult.consumable_description || "Consumível"}</label>
                  <input className="erp-input" readOnly value={`${calcResult.consumable_used.toFixed(2)} ${calcResult.consumable_unit}`} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Trocas de carga</label>
                  <input className="erp-input num" readOnly value={calcResult.consumable_refills} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Parado na troca (min)</label>
                  <input className="erp-input num" readOnly value={calcResult.consumable_minutes} /></div>
              </>
            )}
          </div>
        )}
        </div></div>
        </>)}

        {aba === "agenda" && (<>
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
        </>)}

      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Máquinas: <strong>{machines.length}</strong></div><div className="erp-status-item">Tipos: <strong>{types.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
