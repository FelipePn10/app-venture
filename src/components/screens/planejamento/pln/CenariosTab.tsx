import { errMessage } from "@/services/fiscalShared";
import { useCallback, useEffect, useState } from "react";
import {
  type BaseDemand, type PlanningScenario, type ScenarioChange, type ScenarioChangeInput, type ScenarioChangeKind,
  type ScenarioComparison, type ScenarioDetail, addScenarioChange, calculateScenario, compareScenario, createScenario,
  deleteScenario, deleteScenarioChange, getScenario, listBaseDemands, listScenarios, promoteScenario,
} from "@/services/planningService";
import type { ProductionPlanDTO } from "@/services/productionPlanService";
import { LookupField } from "@/components/ui/LookupField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { loadItems, loadMachinesById } from "@/services/lookups";
import type { Feedback } from "../planFormat";
import { type Tom, data, dataHora, num, pct } from "../planFormat";
import { Painel, Selo, Vazio } from "../planUi";

type Run = (fn: () => Promise<void>) => Promise<void>;

const TIPOS: { id: ScenarioChangeKind; rotulo: string; dica: string }[] = [
  { id: "DEMANDA", rotulo: "Demanda", dica: "E se o cliente mudar a quantidade ou a data, ou entrar um pedido novo?" },
  { id: "ESTOQUE", rotulo: "Estoque", dica: "E se chegar um lote, ou perdermos parte do estoque?" },
  { id: "LEAD_TIME", rotulo: "Prazo", dica: "E se o fornecedor ou a fabricação passar a levar outro prazo?" },
  { id: "CAPACIDADE", rotulo: "Capacidade", dica: "E se a máquina trabalhar outro turno, ou parar alguns dias?" },
];
const FAROL: Record<string, { rotulo: string; tom: Tom }> = {
  CRITICO: { rotulo: "Crítico", tom: "danger" }, ATENCAO: { rotulo: "Atenção", tom: "warn" }, OK: { rotulo: "Coberto", tom: "ok" },
};
const farol = (s: string) => FAROL[s] ?? { rotulo: s ? s : "—", tom: "muted" as Tom };

/** Texto curto de um ajuste, para a lista. */
function descreve(c: ScenarioChange): string {
  switch (c.kind) {
    case "DEMANDA":
      if (c.demand_ref_kind === "NOVA") return `Demanda nova: ${num(c.quantity)} de ${c.item_code} em ${data(c.need_date)}`;
      if (c.quantity === 0) return `Retira ${c.demand_ref_label ?? "a demanda"}`;
      return `${c.demand_ref_label ?? "Demanda"}: ${c.quantity !== undefined ? `quantidade ${num(c.quantity)}` : ""}${c.quantity !== undefined && c.need_date ? " · " : ""}${c.need_date ? `data ${data(c.need_date)}` : ""}`;
    case "ESTOQUE":
      return `${(c.quantity ?? 0) > 0 ? "Entrada" : "Baixa"} de ${num(Math.abs(c.quantity ?? 0))} em ${c.item_code}`;
    case "LEAD_TIME":
      return `Prazo de ${c.item_code}: ${c.lead_time_days} dia(s)`;
    case "CAPACIDADE": {
      const partes = [];
      if (c.hours_per_day !== undefined) partes.push(`${num(c.hours_per_day)} h/dia`);
      if (c.stop_from) partes.push(`parada ${data(c.stop_from)}${c.stop_to && c.stop_to !== c.stop_from ? ` a ${data(c.stop_to)}` : ""}`);
      return `${c.machine_name ?? `Máquina ${c.machine_id}`}: ${partes.join(" · ")}`;
    }
  }
  return c.kind;
}

type Form = {
  kind: ScenarioChangeKind;
  modoDemanda: "existente" | "nova";
  ref?: string; // "KIND:CODE"
  item?: string;
  quantidade: string;
  data: string;
  dias: string;
  maquina?: number;
  horas: string;
  paradaDe: string;
  paradaAte: string;
};
const FORM_VAZIO: Form = { kind: "DEMANDA", modoDemanda: "existente", quantidade: "", data: "", dias: "", horas: "", paradaDe: "", paradaAte: "" };

/** Um número lado a lado, destacando o que piora (ou melhora). */
function Lado({ rotulo, base, cenario, formato = (v: number) => num(v, 0), maiorPior = true }: {
  rotulo: string; base: number; cenario: number; formato?: (v: number) => string; maiorPior?: boolean;
}): JSX.Element {
  const dif = cenario - base;
  const tom = dif === 0 ? undefined : (dif > 0) === maiorPior ? "vpl-tom-danger" : "vpl-tom-ok";
  return (
    <tr>
      <td>{rotulo}</td>
      <td className="num">{formato(base)}</td>
      <td className="num"><span className={tom}>{formato(cenario)}</span></td>
      <td className="num">{dif === 0 ? "—" : <span className={tom}>{dif > 0 ? "+" : ""}{formato(dif)}</span>}</td>
    </tr>
  );
}

/**
 * Cenários de simulação (what-if): ajusta demanda, estoque, prazo e capacidade,
 * calcula MRP + CRP sem tocar no plano real e compara lado a lado — o
 * long-term planning do SAP e os planos de simulação do Oracle. Só a demanda
 * pode ser aplicada ao plano real.
 */
export function CenariosTab({ planos, planoAtual, busy, run, setFeedback }: {
  planos: ProductionPlanDTO[];
  planoAtual?: number;
  busy: boolean;
  run: Run;
  setFeedback: (f: Feedback) => void;
}): JSX.Element {
  const [cenarios, setCenarios] = useState<PlanningScenario[]>([]);
  const [aberto, setAberto] = useState<ScenarioDetail | null>(null);
  const [comparacao, setComparacao] = useState<ScenarioComparison | null>(null);
  const [demandas, setDemandas] = useState<BaseDemand[]>([]);
  const [novo, setNovo] = useState<{ nome: string; plano?: number; descricao: string } | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [confirmar, setConfirmar] = useState<"promover" | "descartar" | null>(null);

  const carregar = useCallback(async () => { setCenarios(await listScenarios()); }, []);
  useEffect(() => { void run(carregar); }, [run, carregar]);

  const abrir = (id: number) => run(async () => {
    const d = await getScenario(id);
    setAberto(d); setComparacao(null); setForm(FORM_VAZIO);
    // O cenário abre mesmo se as demandas ou a comparação falharem — mas avisa,
    // para "sem comparação" não parecer "nada mudou".
    const naoCarregou: string[] = [];
    try { setDemandas(await listBaseDemands(id)); } catch (e) { setDemandas([]); naoCarregou.push(`demandas do plano (${errMessage(e)})`); }
    if (d.calculated_at) {
      try { setComparacao(await compareScenario(id)); } catch (e) { naoCarregou.push(`comparação (${errMessage(e)})`); }
    }
    if (naoCarregou.length) setFeedback({ type: "error", message: `Cenário aberto, mas não foi possível carregar: ${naoCarregou.join("; ")}.` });
  });
  const recarregarAberto = async (comparar = false) => {
    if (!aberto) return;
    const d = await getScenario(aberto.id);
    setAberto(d);
    await carregar();
    if (comparar) setComparacao(await compareScenario(aberto.id));
  };

  const criar = () => run(async () => {
    if (!novo?.nome.trim()) { setFeedback({ type: "error", message: "Dê um nome ao cenário." }); return; }
    if (!novo.plano) { setFeedback({ type: "error", message: "Escolha o plano base." }); return; }
    const d = await createScenario(novo.nome.trim(), novo.plano, novo.descricao.trim());
    setNovo(null);
    await carregar();
    setAberto(d); setComparacao(null); setForm(FORM_VAZIO);
    try { setDemandas(await listBaseDemands(d.id)); }
    catch (e) { setDemandas([]); setFeedback({ type: "error", message: `Cenário criado, mas não foi possível carregar as demandas do plano: ${errMessage(e)}` }); }
    setFeedback({ type: "success", message: `Cenário "${d.name}" criado sobre o plano ${d.base_plan_code}. Lance os ajustes e calcule.` });
  });

  const incluir = () => run(async () => {
    if (!aberto) return;
    const f = form;
    const c: ScenarioChangeInput = { kind: f.kind };
    if (f.kind === "DEMANDA") {
      if (f.modoDemanda === "nova") {
        Object.assign(c, { demand_ref_kind: "NOVA", item_code: f.item, quantity: f.quantidade, need_date: f.data });
      } else {
        if (!f.ref) { setFeedback({ type: "error", message: "Escolha a demanda a alterar." }); return; }
        const [kind, code] = f.ref.split(":");
        Object.assign(c, { demand_ref_kind: kind, demand_ref_code: Number(code), quantity: f.quantidade, need_date: f.data });
      }
    } else if (f.kind === "ESTOQUE") {
      Object.assign(c, { item_code: f.item, quantity: f.quantidade });
    } else if (f.kind === "LEAD_TIME") {
      Object.assign(c, { item_code: f.item, lead_time_days: f.dias === "" ? undefined : Number(f.dias) });
    } else {
      Object.assign(c, { machine_id: f.maquina, hours_per_day: f.horas, stop_from: f.paradaDe, stop_to: f.paradaAte });
    }
    await addScenarioChange(aberto.id, c);
    setForm({ ...FORM_VAZIO, kind: f.kind, modoDemanda: f.modoDemanda });
    await recarregarAberto();
    setFeedback({ type: "success", message: "Ajuste incluído. Calcule o cenário para ver o efeito." });
  });

  const remover = (c: ScenarioChange) => run(async () => {
    if (!aberto) return;
    await deleteScenarioChange(aberto.id, c.id);
    await recarregarAberto();
    setFeedback({ type: "success", message: "Ajuste removido." });
  });

  const calcular = () => run(async () => {
    if (!aberto) return;
    const r = await calculateScenario(aberto.id);
    await recarregarAberto(true);
    setFeedback({ type: r.notes.length ? "info" : "success", message: `Cenário calculado: ${r.mrp_orders} ordem(ns) sugerida(s)${r.notes.length ? ` — ${r.notes.join("; ")}` : ""}.` });
  });

  const promover = () => run(async () => {
    if (!aberto) return;
    const r = await promoteScenario(aberto.id);
    await recarregarAberto();
    const partes = [r.created && `${r.created} demanda(s) criada(s)`, r.updated && `${r.updated} alterada(s)`, r.removed && `${r.removed} retirada(s)`].filter(Boolean);
    setFeedback({ type: "success", message: `Demanda aplicada ao plano real: ${partes.join(", ") || "nada a aplicar"}${r.skipped ? ` (${r.skipped} ajuste(s) de pedido de venda não se aplicam — o pedido é do cliente)` : ""}. Rode o MRP do plano real.` });
  });

  const descartar = () => run(async () => {
    if (!aberto) return;
    await deleteScenario(aberto.id);
    setAberto(null); setComparacao(null);
    await carregar();
    setFeedback({ type: "success", message: "Cenário descartado." });
  });

  const promovido = !!aberto?.promoted_at;
  const temDemanda = !!aberto?.changes.some((c) => c.kind === "DEMANDA");
  const situacao = (s: PlanningScenario) => s.promoted_at ? <Selo tom="ok">Aplicado</Selo> : s.status === "CALCULADO" ? <Selo tom="info">Calculado</Selo> : <Selo>Rascunho</Selo>;
  const tipoAtual = TIPOS.find((t) => t.id === form.kind)!;

  return (
    <>
      <Painel titulo="Cenários de simulação" sub="simule mudanças sem tocar no plano real"
        acoes={<button className="erp-btn erp-btn-primary erp-btn-sm" onClick={() => setNovo({ nome: "", plano: planoAtual, descricao: "" })} disabled={busy}>+ Novo cenário</button>} flush>
        {novo && (
          <div className="vpl-filters" style={{ padding: 12 }}>
            <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="cen-nome">Nome</label>
              <input id="cen-nome" className="erp-input" maxLength={120} placeholder="Ex.: pedido grande da Usimac" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
            <div className="erp-field"><label className="erp-label" htmlFor="cen-plano">Plano base</label>
              <select id="cen-plano" className="erp-input" style={{ minWidth: 200 }} value={novo.plano ?? ""} onChange={(e) => setNovo({ ...novo, plano: Number(e.target.value) || undefined })}>
                <option value="">Escolha o plano</option>
                {planos.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
              </select></div>
            <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="cen-desc">Descrição</label>
              <input id="cen-desc" className="erp-input" value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} /></div>
            <div style={{ display: "flex", gap: 8, alignSelf: "flex-end" }}>
              <button className="erp-btn" onClick={() => setNovo(null)} disabled={busy}>Voltar</button>
              <button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy}>Criar cenário</button>
            </div>
          </div>
        )}
        {cenarios.length === 0 ? <Vazio titulo="Nenhum cenário ainda" texto="Crie um cenário sobre um plano, lance ajustes (demanda, estoque, prazo, capacidade) e compare com o plano real." /> : (
          <table className="erp-grid">
            <thead><tr><th>Cenário</th><th>Plano base</th><th className="num">Ajustes</th><th>Situação</th><th>Calculado em</th></tr></thead>
            <tbody>{cenarios.map((s) => (
              <tr key={s.id} className={`vpl-click${aberto?.id === s.id ? " erp-row-sel" : ""}`} onClick={() => void abrir(s.id)}>
                <td className="vpl-strong">{s.name}{s.description && <span className="vpl-sub">{s.description}</span>}</td>
                <td>{s.base_plan_code} · {s.base_plan_name}</td>
                <td className="num">{s.changes_count}</td>
                <td>{situacao(s)}</td>
                <td>{s.calculated_at ? dataHora(s.calculated_at) : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Painel>

      {aberto && (<>
        <Painel titulo={`Cenário: ${aberto.name}`} sub={`sobre o plano ${aberto.base_plan_code} · ${aberto.base_plan_name}`}
          acoes={<span style={{ display: "flex", gap: 8 }}>
            {situacao(aberto)}
            <button className="erp-btn erp-btn-sm erp-btn-primary" onClick={() => void calcular()} disabled={busy}>{busy && <span className="erp-spin" />}Calcular cenário</button>
            {!promovido && temDemanda && <button className="erp-btn erp-btn-sm" onClick={() => setConfirmar("promover")} disabled={busy}>Aplicar demanda ao plano real</button>}
            <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => setConfirmar("descartar")} disabled={busy}>Descartar</button>
          </span>}>
          {promovido && <p className="erp-note" style={{ marginTop: 0 }}>A demanda deste cenário foi aplicada ao plano real em {dataHora(aberto.promoted_at)}{aberto.promoted_by_name ? ` por ${aberto.promoted_by_name}` : ""}. Os ajustes não podem mais ser alterados.</p>}
          {aberto.changes.length === 0 ? <Vazio titulo="Nenhum ajuste" texto="Inclua abaixo o que quer simular." /> : (
            <table className="erp-grid">
              <thead><tr><th>Tipo</th><th>Ajuste</th><th /></tr></thead>
              <tbody>{aberto.changes.map((c) => (
                <tr key={c.id}>
                  <td><Selo>{TIPOS.find((t) => t.id === c.kind)?.rotulo ?? c.kind}</Selo></td>
                  <td>{descreve(c)}{c.item_description && c.kind !== "CAPACIDADE" && <span className="vpl-sub">{c.item_description}</span>}</td>
                  <td className="vpl-actions">{!promovido && <button className="erp-btn erp-btn-sm" onClick={() => void remover(c)} disabled={busy}>Remover</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Painel>

        {!promovido && (
          <Painel titulo="Incluir ajuste" sub={tipoAtual.dica}>
            <div className="erp-chips" style={{ marginBottom: 10 }}>
              {TIPOS.map((t) => <button key={t.id} type="button" className={`erp-chip${form.kind === t.id ? " active" : ""}`} onClick={() => setForm({ ...FORM_VAZIO, kind: t.id })}>{t.rotulo}</button>)}
            </div>
            <div className="vpl-filters">
              {form.kind === "DEMANDA" && (<>
                <div className="erp-field"><label className="erp-label" htmlFor="aj-modo">Demanda</label>
                  <select id="aj-modo" className="erp-input" value={form.modoDemanda} onChange={(e) => setForm({ ...form, modoDemanda: e.target.value as Form["modoDemanda"] })}>
                    <option value="existente">Alterar uma demanda do plano</option><option value="nova">Demanda nova</option>
                  </select></div>
                {form.modoDemanda === "existente" ? (
                  <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="aj-ref">Qual</label>
                    <select id="aj-ref" className="erp-input" value={form.ref ?? ""} onChange={(e) => setForm({ ...form, ref: e.target.value || undefined })}>
                      <option value="">{demandas.length ? "Escolha a demanda" : "Calcule o plano base para listar as demandas"}</option>
                      {demandas.map((d) => <option key={`${d.ref_kind}:${d.ref_code}`} value={`${d.ref_kind}:${d.ref_code}`}>{d.label} · {d.item_code} · {num(d.quantity)} em {data(d.need_date)}</option>)}
                    </select></div>
                ) : (
                  <div className="erp-field vpl-grow"><label className="erp-label">Item</label>
                    <LookupField<string> value={form.item} loader={loadItems} entityLabel="item" onChange={(v) => setForm({ ...form, item: v ? String(v) : undefined })} /></div>
                )}
                <div className="erp-field"><label className="erp-label" htmlFor="aj-qtd">{form.modoDemanda === "nova" ? "Quantidade" : "Nova quantidade"}</label>
                  <input id="aj-qtd" className="erp-input num" type="number" min={0} placeholder={form.modoDemanda === "nova" ? "" : "0 retira"} value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /></div>
                <div className="erp-field"><label className="erp-label" htmlFor="aj-data">{form.modoDemanda === "nova" ? "Data" : "Nova data"}</label>
                  <input id="aj-data" className="erp-input" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
              </>)}
              {(form.kind === "ESTOQUE" || form.kind === "LEAD_TIME") && (
                <div className="erp-field vpl-grow"><label className="erp-label">Item</label>
                  <LookupField<string> value={form.item} loader={loadItems} entityLabel="item" onChange={(v) => setForm({ ...form, item: v ? String(v) : undefined })} /></div>
              )}
              {form.kind === "ESTOQUE" && (
                <div className="erp-field"><label className="erp-label" htmlFor="aj-est">Entrada (+) ou baixa (−)</label>
                  <input id="aj-est" className="erp-input num" type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /></div>
              )}
              {form.kind === "LEAD_TIME" && (
                <div className="erp-field"><label className="erp-label" htmlFor="aj-dias">Prazo (dias)</label>
                  <input id="aj-dias" className="erp-input num" type="number" min={0} value={form.dias} onChange={(e) => setForm({ ...form, dias: e.target.value })} /></div>
              )}
              {form.kind === "CAPACIDADE" && (<>
                <div className="erp-field vpl-grow"><label className="erp-label">Máquina</label>
                  <LookupField value={form.maquina} loader={loadMachinesById} entityLabel="máquina" onChange={(v) => setForm({ ...form, maquina: v ? Number(v) : undefined })} /></div>
                <div className="erp-field"><label className="erp-label" htmlFor="aj-horas">Horas por dia</label>
                  <input id="aj-horas" className="erp-input num" type="number" min={0} max={24} step="0.5" value={form.horas} onChange={(e) => setForm({ ...form, horas: e.target.value })} /></div>
                <div className="erp-field"><label className="erp-label" htmlFor="aj-de">Parada de</label>
                  <input id="aj-de" className="erp-input" type="date" value={form.paradaDe} onChange={(e) => setForm({ ...form, paradaDe: e.target.value })} /></div>
                <div className="erp-field"><label className="erp-label" htmlFor="aj-ate">até</label>
                  <input id="aj-ate" className="erp-input" type="date" value={form.paradaAte} onChange={(e) => setForm({ ...form, paradaAte: e.target.value })} /></div>
              </>)}
              <button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-end" }} onClick={() => void incluir()} disabled={busy}>Incluir ajuste</button>
            </div>
          </Painel>
        )}

        {!aberto.calculated_at ? (
          <Painel titulo="Comparação"><Vazio titulo="Calcule o cenário para comparar" texto="O cálculo roda o MRP e o CRP do cenário sem mexer no plano real. O sequenciamento (APS) não roda: ele programa as ordens reais da fábrica." /></Painel>
        ) : comparacao && (<>
          {comparacao.notes.map((n, i) => <p key={i} className="erp-note">{n}</p>)}
          <Painel titulo="Plano real × cenário" sub={`real calculado em ${dataHora(comparacao.base.calculated_at)} · cenário em ${dataHora(comparacao.scenario.calculated_at)}`} flush>
            <table className="erp-grid">
              <thead><tr><th>Indicador</th><th className="num">Plano real</th><th className="num">Cenário</th><th className="num">Diferença</th></tr></thead>
              <tbody>
                <Lado rotulo="Ordens sugeridas" base={comparacao.base.suggestions} cenario={comparacao.scenario.suggestions} />
                <Lado rotulo="Quantidade a fabricar" base={comparacao.base.production_qty} cenario={comparacao.scenario.production_qty} formato={(v) => num(v)} />
                <Lado rotulo="Quantidade a comprar" base={comparacao.base.purchase_qty} cenario={comparacao.scenario.purchase_qty} formato={(v) => num(v)} />
                <Lado rotulo="Itens críticos" base={comparacao.base.coverage_critical} cenario={comparacao.scenario.coverage_critical} />
                <Lado rotulo="Itens em atenção" base={comparacao.base.coverage_warning} cenario={comparacao.scenario.coverage_warning} />
                <Lado rotulo="Mensagens de exceção" base={comparacao.base.exceptions} cenario={comparacao.scenario.exceptions} />
                <Lado rotulo="Dias de sobrecarga (centros)" base={comparacao.base.overload_days} cenario={comparacao.scenario.overload_days} />
                <Lado rotulo="Maior carga de um centro" base={comparacao.base.max_load_pct} cenario={comparacao.scenario.max_load_pct} formato={(v) => pct(v)} />
                <Lado rotulo="Pedidos/demandas com falta na cadeia" base={comparacao.base.roots_with_shortage} cenario={comparacao.scenario.roots_with_shortage} />
                <Lado rotulo="Pedidos/demandas com cadeia atrasada" base={comparacao.base.roots_late} cenario={comparacao.scenario.roots_late} />
              </tbody>
            </table>
          </Painel>
          <Painel titulo="Itens que mudam" sub={`${comparacao.items.length} item(ns)`} flush>
            {comparacao.items.length === 0 ? <Vazio titulo="Nenhum item muda" /> : (
              <div className="vpl-grid-scroll">
                <table className="erp-grid">
                  <thead><tr><th>Item</th><th className="num">Planejado real</th><th className="num">Planejado cenário</th><th>Cobertura real</th><th>Cobertura cenário</th><th className="num">Falta sem planejada</th></tr></thead>
                  <tbody>{comparacao.items.map((i) => (
                    <tr key={i.item_code}>
                      <td className="vpl-strong">{i.item_code}<span className="vpl-sub">{i.description}</span></td>
                      <td className="num">{num(i.base_planned)}</td>
                      <td className="num">{num(i.scenario_planned)}</td>
                      <td><Selo tom={farol(i.base_status).tom}>{farol(i.base_status).rotulo}</Selo></td>
                      <td><Selo tom={farol(i.scenario_status).tom}>{farol(i.scenario_status).rotulo}</Selo></td>
                      <td className="num">{num(i.base_shortage)} → {num(i.scenario_shortage)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Painel>
          <Painel titulo="Centros de trabalho que mudam" sub={`${comparacao.work_centers.length} centro(s)`} flush>
            {comparacao.work_centers.length === 0 ? <Vazio titulo="A carga dos centros não muda" /> : (
              <table className="erp-grid">
                <thead><tr><th>Centro</th><th className="num">Horas real</th><th className="num">Horas cenário</th><th className="num">Dias em sobrecarga</th><th className="num">Maior carga</th></tr></thead>
                <tbody>{comparacao.work_centers.map((w) => (
                  <tr key={w.work_center_id}>
                    <td className="vpl-strong">{w.name || `Centro ${w.work_center_id}`}</td>
                    <td className="num">{num(w.base_hours, 1)}</td>
                    <td className="num">{num(w.scenario_hours, 1)}</td>
                    <td className="num"><span className={w.scenario_overload_days > w.base_overload_days ? "vpl-tom-danger" : undefined}>{w.base_overload_days} → {w.scenario_overload_days}</span></td>
                    <td className="num">{pct(w.base_max_load_pct)} → {pct(w.scenario_max_load_pct)}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Painel>
          <p className="erp-note">O cenário não cria ordens: as sugestões dele não podem ser firmadas. Para seguir com a simulação, aplique a demanda ao plano real e rode o MRP; ajustes de estoque, prazo e capacidade são feitos nos próprios cadastros.</p>
        </>)}
      </>)}

      <ConfirmDialog aberto={confirmar === "promover"} titulo="Aplicar a demanda do cenário ao plano real?"
        mensagem="Demandas novas viram demandas independentes, e as demandas independentes ajustadas passam a ter a nova quantidade/data (quantidade 0 cancela; a que já teve saída é encerrada, e a quantidade não fica abaixo do que já saiu). Ajustes de pedido de venda, estoque, prazo e capacidade não são aplicados. Depois, rode o MRP do plano real."
        assunto={aberto ? `${aberto.name} · plano ${aberto.base_plan_code}` : undefined} rotuloConfirmar="Aplicar demanda"
        onCancelar={() => setConfirmar(null)} onConfirmar={() => { setConfirmar(null); void promover(); }} />
      <ConfirmDialog aberto={confirmar === "descartar"} titulo="Descartar o cenário?"
        mensagem="O cenário, os ajustes e tudo o que o cálculo dele gerou são apagados. O plano real não muda."
        assunto={aberto?.name} rotuloConfirmar="Descartar"
        onCancelar={() => setConfirmar(null)} onConfirmar={() => { setConfirmar(null); void descartar(); }} />
    </>
  );
}
