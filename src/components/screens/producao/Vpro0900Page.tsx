import { errMessage } from "@/services/fiscalShared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ehNaoEncontrado } from "@/utils/erroHttp";
import {
  type AppointmentDTO, type ConsumptionDTO, type CostDTO, type MaterialAvailability, type MaterialDTO, type OperationDTO, type ProductionOrderDTO, type ProductionScanToken,
  addConsumption, addMaterial, addScrapDestination, advanceOperation, allocateLots, appointProduction, cancelProductionOrder, closeProductionOrder,
  completeProductionOrder, createProductionOrder, createProductionScanToken, explodeOperations, getCost, getMaterialAvailability, getMaterialAvailabilitySummary,
  getProductionOrder, listAppointments,
  listConsumptions, listMaterials, listOperations, listProductionOrders, scanProductionOrder, scrapReturn, settleCost, startProductionOrder,
} from "@/services/productionOrderService";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { loadItems, loadMachinesById, loadWarehouses } from "@/services/lookups";
import { type Aba, Abas, Aviso, Cabecalho, Progresso, Rodape, Selo, Vazio } from "../planejamento/planUi";
import { data, normalizar, num, situacaoOF } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";
import {
  ApontamentoTab, ConsumosTab, CustoTab, EtapasTab, MateriaisTab, ResumoTab, type EntregaForm, type LeituraForm, type MaterialForm,
} from "./of/OfTabs";
import { OPERACAO, SITUACAO_FALTA } from "./of/operacao";
import { hojeLocal } from "@/utils/dataLocal";

/**
 * Ordem de Produção (OF).
 *
 * A tela era uma lista que só aparecia depois de "Listar" e uma capa que
 * repetia em toda aba. Agora é o padrão das outras telas de cadastro: a lista
 * fica à esquerda (com busca, situação e o quanto já foi produzido), a ordem
 * aberta à direita, e as abas seguem o trabalho com a ordem: resumo → apontar
 * → etapas do roteiro → materiais → consumos → custo.
 */
type AbaOF = "resumo" | "apontamento" | "etapas" | "materiais" | "consumos" | "custo";
type FiltroSituacao = "ativas" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "todas";
const FILTROS: { id: FiltroSituacao; rotulo: string }[] = [
  { id: "ativas", rotulo: "Em aberto" }, { id: "OPEN", rotulo: "Abertas" }, { id: "IN_PROGRESS", rotulo: "Em produção" },
  { id: "COMPLETED", rotulo: "Concluídas" }, { id: "todas", rotulo: "Todas" },
];
const CICLO = [
  { status: "OPEN", rotulo: "Aberta" }, { status: "IN_PROGRESS", rotulo: "Em produção" },
  { status: "COMPLETED", rotulo: "Concluída" }, { status: "CLOSED", rotulo: "Encerrada" },
];

const NOVA_OF: ProductionOrderDTO = { item_code: "", planned_qty: 0, priority: "NORMAL" };
const APONTAMENTO_VAZIO: AppointmentDTO = { production_order_id: 0, produced_qty: 0, scrapped_qty: 0 };
const CONSUMO_VAZIO: ConsumptionDTO = { production_order_id: 0, item_code: "", consumed_qty: 0 };
const MATERIAL_VAZIO: MaterialForm = { item_code: "", quantity: "", automatic_issue: true, substituted_item_code: "" };
const LEITURA_VAZIA: LeituraForm = { token: "", action: "RESOLVER", device_id: "terminal-producao", employee_id: "", good_quantity: "", scrap_quantity: "", hours: "", scrap_reason: "", complete_operation: false };

export function Vpro0900Page(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [ordens, setOrdens] = useState<ProductionOrderDTO[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroSituacao>("ativas");
  const [of, setOf] = useState<ProductionOrderDTO | null>(null);
  const [aba, setAba] = useState<AbaOF>("resumo");
  const [apontamentos, setApontamentos] = useState<AppointmentDTO[]>([]);
  const [consumos, setConsumos] = useState<ConsumptionDTO[]>([]);
  const [operacoes, setOperacoes] = useState<OperationDTO[]>([]);
  const [materiais, setMateriais] = useState<MaterialDTO[]>([]);
  const [custo, setCusto] = useState<CostDTO | null>(null);
  const [app, setApp] = useState<AppointmentDTO>(APONTAMENTO_VAZIO);
  const [cons, setCons] = useState<ConsumptionDTO>(CONSUMO_VAZIO);
  const [conclusao, setConclusao] = useState<EntregaForm>({ lote: "", quantidade: "", final: true });
  const [etapa, setEtapa] = useState({ horas: "", pecas: "", motivo: "" });
  const [matForm, setMatForm] = useState<MaterialForm>(MATERIAL_VAZIO);
  const [token, setToken] = useState<ProductionScanToken | null>(null);
  const [leitura, setLeitura] = useState<LeituraForm>(LEITURA_VAZIA);
  const [novaAberta, setNovaAberta] = useState(false);
  const [nova, setNova] = useState<ProductionOrderDTO>(NOVA_OF);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const [sucata, setSucata] = useState<{ material: MaterialDTO; quantidade: string; deposito?: number } | null>(null);

  const [faltas, setFaltas] = useState<MaterialAvailability | null>(null);
  const [faltasLista, setFaltasLista] = useState<Record<number, MaterialAvailability>>({});
  const [confirmarInicio, setConfirmarInicio] = useState(false);

  const listar = useCallback(async () => {
    const l = await listProductionOrders();
    setOrdens(l);
    // Selo de falta só para as ordens que ainda vão consumir material. Se a
    // conferência falhar, a lista abre sem o selo — e a tela diz isso, para
    // ninguém achar que "sem selo" quer dizer "sem falta".
    const ativas = l.filter((o) => o.id && (o.status === "OPEN" || o.status === "IN_PROGRESS")).map((o) => o.id as number).slice(0, 500);
    try { setFaltasLista(await getMaterialAvailabilitySummary(ativas)); }
    catch (e) {
      setFaltasLista({});
      setFeedback({ type: "error", message: `Lista carregada, mas não foi possível conferir as faltas de material: ${errMessage(e)}` });
    }
  }, [setFeedback]);
  useEffect(() => { void run(listar); }, [run, listar]);

  const carregarOF = useCallback(async (id: number) => {
    const [o, ap, co, ops] = await Promise.all([getProductionOrder(id), listAppointments(id), listConsumptions(id), listOperations(id)]);
    setOf(o); setApontamentos(ap); setConsumos(co); setOperacoes(ops);
    setApp({ ...APONTAMENTO_VAZIO, production_order_id: id }); setCons({ ...CONSUMO_VAZIO, production_order_id: id });
    // Custo e materiais podem não existir ainda (404): a falta deles não impede
    // abrir a ordem. Qualquer outra falha abre a ordem e avisa o que não carregou.
    const naoCarregou: string[] = [];
    const parte = async <T,>(nome: string, f: () => Promise<T>, vazio: T): Promise<T> => {
      try { return await f(); }
      catch (e) { if (!ehNaoEncontrado(e)) naoCarregou.push(`${nome} (${errMessage(e)})`); return vazio; }
    };
    setCusto(await parte("custo", () => getCost(id), null));
    setMateriais(await parte("materiais", () => listMaterials(id), [] as MaterialDTO[]));
    setFaltas(await parte("faltas de material", () => getMaterialAvailability(id), null));
    if (naoCarregou.length) setFeedback({ type: "error", message: `Ordem aberta, mas não foi possível carregar: ${naoCarregou.join("; ")}.` });
  }, [setFeedback]);

  const abrir = (id?: number) => { if (id) void run(async () => { setToken(null); await carregarOF(id); }); };
  const recarregar = async () => { if (of?.id) { await carregarOF(of.id); await listar(); } };

  const contagem = useMemo(() => {
    const c: Record<FiltroSituacao, number> = { ativas: 0, OPEN: 0, IN_PROGRESS: 0, COMPLETED: 0, todas: ordens.length };
    for (const o of ordens) {
      if (o.status === "OPEN" || o.status === "IN_PROGRESS") c.ativas += 1;
      if (o.status === "OPEN" || o.status === "IN_PROGRESS" || o.status === "COMPLETED") c[o.status as "OPEN"] += 1;
    }
    return c;
  }, [ordens]);
  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    return ordens
      .filter((o) => filtro === "todas" || (filtro === "ativas" ? o.status === "OPEN" || o.status === "IN_PROGRESS" : o.status === filtro))
      .filter((o) => !q || normalizar(`${o.id} ${o.order_number ?? ""} ${o.item_code} ${o.mask ?? ""}`).includes(q))
      .sort((a, b) => (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999") || (a.id ?? 0) - (b.id ?? 0));
  }, [ordens, busca, filtro]);

  // ── Ações da ordem ──
  const criar = () => run(async () => {
    if (!nova.item_code) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    if (!(nova.planned_qty > 0)) { setFeedback({ type: "error", message: "Informe a quantidade a produzir." }); return; }
    const criada = await createProductionOrder(nova);
    setNovaAberta(false); setNova(NOVA_OF);
    await listar();
    if (criada.id) { await carregarOF(criada.id); setAba("resumo"); }
    setFeedback({ type: "success", message: `OF ${criada.id} criada.` });
  });
  const transicao = (rotulo: string, fn: (id: number) => Promise<unknown>) => { const id = of?.id; if (!id) return; void run(async () => {
    await fn(id); await recarregar(); setFeedback({ type: "success", message: `OF ${id}: ${rotulo}.` });
  }); };
  // O encerramento vale mesmo se a apuração do custo falhar: aí a OF fica com
  // "custo pendente" e a tela diz o motivo.
  const encerrar = () => { const id = of?.id; if (!id) return; void run(async () => {
    const r = await closeProductionOrder(id); await recarregar();
    setFeedback(r.cost_pending
      ? { type: "error", message: `OF ${id} encerrada, mas ${r.cost_pending}. Use "Apurar custo" depois de corrigir.` }
      : { type: "success", message: `OF ${id}: encerrada.` });
  }); };
  const explodir = () => { const id = of?.id; if (!id) return; void run(async () => {
    const ops = await explodeOperations(id); setOperacoes(ops);
    setFeedback({ type: ops.length ? "success" : "info", message: ops.length ? `${ops.length} etapa(s) criada(s) a partir do roteiro.` : "O item não tem roteiro padrão: nenhuma etapa criada." });
    if (ops.length) setAba("etapas");
  }); };
  const apurarCusto = () => { const id = of?.id; if (!id) return; void run(async () => { setCusto(await settleCost(id)); await recarregar(); setFeedback({ type: "success", message: "Custo real apurado." }); setAba("custo"); }); };

  const apontar = () => { const id = of?.id; if (!id) return; void run(async () => {
    if (!app.produced_qty && !app.scrapped_qty) { setFeedback({ type: "error", message: "Informe a quantidade boa e/ou o refugo." }); return; }
    if (!app.employee_id) { setFeedback({ type: "error", message: "Informe o operador que produziu." }); return; }
    await appointProduction({ ...app, production_order_id: id });
    await recarregar(); setFeedback({ type: "success", message: "Apontamento registrado." });
  }); };
  const consumir = () => { const id = of?.id; if (!id) return; void run(async () => {
    if (!cons.item_code || !cons.consumed_qty) { setFeedback({ type: "error", message: "Escolha o insumo e a quantidade." }); return; }
    if (!cons.warehouse_id) { setFeedback({ type: "error", message: "Escolha o depósito de onde o insumo sai." }); return; }
    await addConsumption({ ...cons, production_order_id: id });
    await recarregar(); setFeedback({ type: "success", message: "Consumo registrado: saída do estoque para a ordem." });
  }); };
  // Antes caía no depósito 2 quando nenhum era escolhido — sucata entrava num
  // depósito que a pessoa nem viu. Agora o depósito é obrigatório.
  const retornarSucata = () => { const id = of?.id; if (!id) return; void run(async () => {
    if (!cons.item_code || !cons.consumed_qty || !cons.warehouse_id) { setFeedback({ type: "error", message: "Para retornar sucata, preencha insumo, quantidade e depósito no bloco de consumo." }); return; }
    await scrapReturn(id, { scrap_item_code: cons.item_code, warehouse_id: cons.warehouse_id, quantity: cons.consumed_qty, unit_value: 0, notes: "Retorno de sucata" });
    setFeedback({ type: "success", message: "Sucata devolvida ao estoque." });
  }); };
  const concluir = () => { const id = of?.id; if (!id || !of) return; void run(async () => {
    if (!conclusao.deposito) { setFeedback({ type: "error", message: "Escolha o depósito de entrada do produto acabado." }); return; }
    const saldo = Math.max(0, (of.planned_qty || 0) - (of.produced_qty || 0));
    const qtd = conclusao.quantidade.trim() ? Number(conclusao.quantidade) : saldo;
    if (!(qtd >= 0) || (!conclusao.final && qtd <= 0)) { setFeedback({ type: "error", message: "Informe a quantidade entregue." }); return; }
    await completeProductionOrder(id, { warehouseId: conclusao.deposito, lot: conclusao.lote || undefined, quantity: qtd, final: conclusao.final });
    setConclusao((c) => ({ ...c, lote: "", quantidade: "" })); await recarregar();
    const lote = conclusao.lote ? ` no lote ${conclusao.lote}` : "";
    setFeedback({ type: "success", message: conclusao.final
      ? `OF ${id} concluída: ${num(qtd)} peça(s) entraram no estoque${lote}.`
      : `Entrega parcial registrada: ${num(qtd)} peça(s) entraram no estoque${lote}.` });
  }); };

  const alterarEtapa = (opId: number, status: string) => run(async () => {
    if ((status === "PAUSED" || status === "INTERRUPTED") && !etapa.motivo.trim()) { setFeedback({ type: "error", message: "Informe o motivo da pausa ou da interrupção." }); return; }
    const horas = Number(etapa.horas) || 0, pecas = Number(etapa.pecas) || 0;
    if (status === "DONE" && horas <= 0 && pecas <= 0) { setFeedback({ type: "error", message: "Informe as horas trabalhadas ou as peças produzidas para concluir a etapa — é o que desconta a vida útil da ferramenta." }); return; }
    const enviado = etapa;
    const r = await advanceOperation(opId, status, horas, etapa.motivo.trim(), pecas);
    // Limpa só o que foi enviado: o operador pode ter digitado o próximo motivo
    // enquanto esta etapa salvava, e esse texto não pode sumir.
    setEtapa((s) => ({
      horas: s.horas === enviado.horas ? "" : s.horas,
      pecas: s.pecas === enviado.pecas ? "" : s.pecas,
      motivo: s.motivo === enviado.motivo ? "" : s.motivo,
    }));
    await recarregar();
    // Ferramenta no limite não é notícia boa: sai como aviso, não como sucesso.
    const alertas = Array.isArray(r.tool_alerts) ? r.tool_alerts.join(" · ") : "";
    setFeedback({ type: alertas ? "error" : "success", message: `Etapa ${OPERACAO[status]?.rotulo.toLowerCase() ?? status}.${alertas ? ` Atenção: ${alertas}` : ""}` });
  });
  const gerarCodigo = (opId?: number) => { const id = of?.id; if (!id) return; void run(async () => {
    const t = await createProductionScanToken({ production_order_id: id, operation_id: opId });
    setToken(t); setLeitura((s) => ({ ...s, token: t.token }));
    setFeedback({ type: "success", message: "Código de barras gerado para a etapa." });
  }); };
  const ler = () => run(async () => {
    if (!leitura.token.trim() || !leitura.device_id.trim()) { setFeedback({ type: "error", message: "Leia o código de barras e informe o dispositivo." }); return; }
    const r = await scanProductionOrder({
      token: leitura.token.trim(), action: leitura.action, idempotency_key: `${leitura.device_id}-${crypto.randomUUID()}`, device_id: leitura.device_id.trim(),
      employee_id: leitura.employee_id ? Number(leitura.employee_id) : undefined, good_quantity: leitura.good_quantity || undefined,
      scrap_quantity: leitura.scrap_quantity || undefined, hours: leitura.hours || undefined, scrap_reason: leitura.scrap_reason || undefined,
      complete_operation: leitura.complete_operation,
    });
    if (r.production_order_id) { await carregarOF(r.production_order_id); await listar(); }
    setFeedback({ type: "success", message: r.message || (r.replayed ? "Leitura já processada antes." : "Leitura registrada.") });
  });

  const incluirMaterial = () => { const id = of?.id; if (!id) return; void run(async () => {
    if (!matForm.item_code || !(Number(matForm.quantity) > 0)) { setFeedback({ type: "error", message: "Escolha o item e a quantidade do material." }); return; }
    await addMaterial({ production_order_id: id, kind: "DEMAND", item_code: matForm.item_code.trim(), quantity: matForm.quantity, warehouse_id: matForm.warehouse_id, automatic_issue: matForm.automatic_issue, substituted_item_code: matForm.substituted_item_code || undefined });
    setMatForm(MATERIAL_VAZIO); setMateriais(await listMaterials(id)); setFeedback({ type: "success", message: "Material incluído na ordem." });
  }); };
  const alocar = (m: MaterialDTO) => { const id = of?.id; if (!id || !m.id) return; void run(async () => {
    await allocateLots(m.id!, "REQUISITION", []); // lista vazia = seleção automática por data e código do lote
    setMateriais(await listMaterials(id)); setFeedback({ type: "success", message: `Lotes alocados para ${m.item_code}.` });
  }); };
  const destinarSucata = () => { const id = of?.id; if (!id || !sucata) return; void run(async () => {
    const qtd = Number(sucata.quantidade);
    if (!(qtd > 0) || !sucata.deposito) { setFeedback({ type: "error", message: "Informe a quantidade de sucata e o depósito." }); return; }
    await addScrapDestination({ production_order_id: id, destination_kind: "DEMAND", production_order_material_id: sucata.material.id, scrap_item_code: sucata.material.item_code, warehouse_id: sucata.deposito, scrap_quantity: qtd, destination_date: hojeLocal() });
    setSucata(null); setFeedback({ type: "success", message: `Destino de sucata registrado para ${sucata.material.item_code}.` });
  }); };

  const st = of?.status;
  const pendentes = operacoes.filter((op) => op.status !== "DONE" && op.status !== "SKIPPED").length;
  const ABAS: Aba<AbaOF>[] = [
    { id: "resumo", label: "Resumo" },
    { id: "apontamento", label: "Apontamento", contador: apontamentos.length, hint: "Produção, refugo, consumo de insumo e conclusão" },
    { id: "etapas", label: "Etapas", contador: operacoes.length, hint: "Etapas do roteiro e leitura por código de barras" },
    { id: "materiais", label: "Materiais", contador: materiais.length, alerta: !!faltas && (faltas.status === "PARCIAL" || faltas.status === "SEM_SALDO"), hint: "Materiais da ordem, lotes e sucata" },
    { id: "consumos", label: "Consumos", contador: consumos.length },
    { id: "custo", label: "Custo", hint: "Custo real × padrão" },
  ];
  const sit = situacaoOF(st);
  const passo = CICLO.findIndex((c) => c.status === st);

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Produção" titulo="Ordem de Produção" codigo="VPRO0900" />

      <div className="erp-toolbar vpl-toolbar">
        <button className="erp-btn erp-btn-new" onClick={() => { setNova(NOVA_OF); setNovaAberta(true); }} disabled={busy}>+ Nova OF</button>
        <div className="erp-tgroup"><button className="erp-btn" onClick={() => void run(async () => { await listar(); if (of?.id) await carregarOF(of.id); })} disabled={busy}>Atualizar</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPRO0900 — Ordem de Produção" filename="vpro0900" build={() => ({
          columns: ["OF", "Item", "Planejada", "Produzida", "Refugo", "Situação", "Início", "Término"],
          rows: visiveis.map((o) => [String(o.id), o.item_code, num(o.planned_qty), num(o.produced_qty ?? 0), num(o.scrapped_qty ?? 0), situacaoOF(o.status).rotulo, data(o.start_date), data(o.end_date)]),
        })} /></div>
      </div>

      <div className="erp-content">
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Ordens</span><span className="erp-count">{visiveis.length}</span>
              <div className="erp-panel-head-spacer" />
              <input className="erp-search" placeholder="OF ou item…" aria-label="Buscar ordem" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <div className="vpl-list-filters">
              {FILTROS.map((f) => <button key={f.id} type="button" className={`erp-chip${filtro === f.id ? " active" : ""}`} onClick={() => setFiltro(f.id)}>{f.rotulo} · {contagem[f.id]}</button>)}
            </div>
            <div className="erp-list">
              {visiveis.length === 0 && <div className="erp-list-empty">{ordens.length ? "Nenhuma ordem com esse filtro." : "Nenhuma ordem de produção ainda."}</div>}
              {visiveis.map((o) => {
                const s = situacaoOF(o.status);
                const f = o.id ? faltasLista[o.id] : undefined;
                const comFalta = f && (f.status === "PARCIAL" || f.status === "SEM_SALDO");
                return (
                  <div key={o.id} className={`erp-list-row${of?.id === o.id ? " sel" : ""}`} onClick={() => abrir(o.id)} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") abrir(o.id); }}>
                    <span className="erp-list-code">OF {o.id}</span>
                    <span className="erp-list-sub">{o.item_code}</span>
                    <span className="vpl-list-row-right">
                      {comFalta && <Selo tom={SITUACAO_FALTA[f.status].tom} title={`${f.missing_items} de ${f.items} material(is) sem saldo suficiente`}>Falta material</Selo>}
                      <Selo tom={s.tom}>{s.rotulo}</Selo></span>
                    <div className="erp-list-meta" style={{ width: "100%" }}>
                      <span className="erp-text-muted" style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>{data(o.start_date)} → {data(o.end_date)}</span>
                      <div style={{ flex: 1 }} title="Entregue ao estoque"><Progresso valor={o.produced_qty ?? 0} total={o.planned_qty || 0} /></div>
                      <span className="erp-list-money">{num(o.produced_qty ?? 0)}/{num(o.planned_qty)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="erp-detail-panel">
            {!of ? (
              <div className="erp-detail-body"><Aviso feedback={feedback} busy={busy} />
                <Vazio titulo="Escolha uma ordem na lista" texto="Ou crie uma ordem nova. As ordens geradas pelo MRP já aparecem aqui ao serem firmadas."
                  acao={<button className="erp-btn erp-btn-primary" onClick={() => setNovaAberta(true)}>+ Nova OF</button>} />
              </div>
            ) : (<>
              <div style={{ padding: "14px 16px 0" }}>
                <div className="vpl-record">
                  <div className="vpl-record-main">
                    <div className="vpl-record-title">OF {of.id} <Selo tom={sit.tom}>{sit.rotulo}</Selo></div>
                    <div className="vpl-record-sub">{of.item_code}{of.mask ? ` · ${of.mask}` : ""} · {num(of.planned_qty)} a produzir · {data(of.start_date)} → {data(of.end_date)}</div>
                    {of.cost_pending && <div style={{ marginTop: 6 }}><Selo tom="danger">Custo não apurado</Selo> <span className="erp-hint">{of.cost_pending}</span></div>}
                  </div>
                  <div className="vpl-record-actions">
                    {st === "OPEN" && <button className="erp-btn erp-btn-primary" disabled={busy}
                      onClick={() => (faltas && (faltas.status === "PARCIAL" || faltas.status === "SEM_SALDO") ? setConfirmarInicio(true) : transicao("produção iniciada", startProductionOrder))}>Iniciar produção</button>}
                    {operacoes.length === 0 && (st === "OPEN" || st === "IN_PROGRESS") && <button className="erp-btn" onClick={explodir} disabled={busy}>Explodir roteiro</button>}
                    <button className="erp-btn" onClick={apurarCusto} disabled={busy}>Apurar custo</button>
                    {st === "COMPLETED" && <button className="erp-btn erp-btn-primary" onClick={encerrar} disabled={busy}>Encerrar</button>}
                    {st !== "CLOSED" && st !== "CANCELLED" && <button className="erp-btn erp-btn-danger" onClick={() => setConfirmarCancelamento(true)} disabled={busy}>Cancelar OF</button>}
                  </div>
                </div>
                {(st === "OPEN" || st === "IN_PROGRESS") && faltas && (faltas.status === "PARCIAL" || faltas.status === "SEM_SALDO") && (
                  <div className="erp-feedback info" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <span>Falta material: {faltas.missing_items} de {faltas.items} item(ns) sem saldo suficiente no depósito, contando as ordens que estão na frente.</span>
                    <button className="erp-btn erp-btn-sm" onClick={() => setAba("materiais")}>Ver faltas</button>
                  </div>
                )}
                {st !== "CANCELLED" && (
                  <div className="vpl-steps" style={{ marginTop: 10 }}>
                    {CICLO.map((c, i) => (
                      <div key={c.status} className={`vpl-step${i < passo ? " done" : i === passo ? " current" : ""}`}>
                        <span className="vpl-step-dot">{i < passo ? "✓" : i + 1}</span>{c.rotulo}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10 }}><Abas abas={ABAS} ativa={aba} onChange={setAba} /></div>
              <div className="erp-detail-body">
                <Aviso feedback={feedback} busy={busy} />
                {aba === "resumo" && <ResumoTab of={of} operacoes={operacoes} apontamentos={apontamentos} consumos={consumos} />}
                {aba === "apontamento" && <ApontamentoTab of={of} busy={busy} app={app} setApp={setApp} cons={cons} setCons={setCons} apontamentos={apontamentos}
                  operacoesPendentes={pendentes} conclusao={conclusao} setConclusao={setConclusao}
                  onApontar={apontar} onConsumir={consumir} onRetornarSucata={retornarSucata} onConcluir={concluir} />}
                {aba === "etapas" && <EtapasTab of={of} busy={busy} operacoes={operacoes} etapa={etapa} setEtapa={setEtapa} onAlterar={(i, s) => void alterarEtapa(i, s)}
                  onGerarCodigo={gerarCodigo} token={token} leitura={leitura} setLeitura={setLeitura} onLer={() => void ler()} onExplodir={explodir} />}
                {aba === "materiais" && <MateriaisTab busy={busy} materiais={materiais} disponibilidade={faltas} form={matForm} setForm={setMatForm} onIncluir={incluirMaterial} onAlocar={alocar}
                  onSucata={(m) => setSucata({ material: m, quantidade: "", deposito: m.warehouse_id })} />}
                {aba === "consumos" && <ConsumosTab consumos={consumos} />}
                {aba === "custo" && <CustoTab custo={custo} busy={busy} onApurar={apurarCusto} />}
              </div>
            </>)}
          </section>
        </div>
      </div>

      <Rodape>
        <div className="erp-status-item">Ordens: <strong>{ordens.length}</strong></div>
        <div className="erp-status-item">Em produção: <strong>{contagem.IN_PROGRESS}</strong></div>
        {of && <div className="erp-status-item">Aberta: <strong>OF {of.id}</strong></div>}
      </Rodape>

      {novaAberta && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="nova-of-titulo" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setNovaAberta(false); }}>
          <div className="erp-modal" style={{ width: "min(640px, 94vw)" }}>
            <div className="erp-modal-head"><div><strong id="nova-of-titulo">Nova ordem de produção</strong><div className="erp-field-hint">A ordem nasce aberta; inicie a produção quando for para o chão de fábrica.</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setNovaAberta(false)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              <div className="erp-fieldset-body" style={{ padding: 0 }}>
                <div className="erp-field erp-c8"><label className="erp-label erp-req">Item</label>
                  <LookupField value={nova.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setNova((p) => ({ ...p, item_code: String(c ?? "") }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label erp-req" htmlFor="nova-qtd">Quantidade</label>
                  <input id="nova-qtd" className="erp-input num" type="number" min={0} value={nova.planned_qty || ""} onChange={(e) => setNova((p) => ({ ...p, planned_qty: Number(e.target.value) }))} /></div>
                <div className="erp-field erp-c6"><label className="erp-label">Máquina</label>
                  <LookupField value={nova.machine_id || undefined} loader={loadMachinesById} entityLabel="máquina" clearable onChange={(c) => setNova((p) => ({ ...p, machine_id: c ? Number(c) : undefined }))} /></div>
                <div className="erp-field erp-c6"><label className="erp-label" htmlFor="nova-prio">Prioridade</label>
                  <select id="nova-prio" className="erp-input" value={nova.priority ?? "NORMAL"} onChange={(e) => setNova((p) => ({ ...p, priority: e.target.value }))}>
                    <option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENTE">Urgente</option>
                  </select></div>
                <div className="erp-field erp-c12"><label className="erp-label" htmlFor="nova-obs">Observações</label>
                  <input id="nova-obs" className="erp-input" value={nova.notes ?? ""} onChange={(e) => setNova((p) => ({ ...p, notes: e.target.value }))} /></div>
              </div>
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setNovaAberta(false)} disabled={busy}>Cancelar</button>
              <button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy}>{busy && <span className="erp-spin" />}Criar OF</button>
            </div>
          </div>
        </div>
      )}

      {sucata && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sucata-titulo" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setSucata(null); }}>
          <div className="erp-modal" style={{ width: "min(520px, 94vw)" }}>
            <div className="erp-modal-head"><div><strong id="sucata-titulo">Destinar sucata de {sucata.material.item_code}</strong><div className="erp-field-hint">Registra quanto do material virou sucata e para onde vai.</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setSucata(null)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              <div className="erp-fieldset-body" style={{ padding: 0 }}>
                <div className="erp-field erp-c5"><label className="erp-label erp-req" htmlFor="suc-qtd">Quantidade</label>
                  <input id="suc-qtd" className="erp-input num" type="number" min={0} value={sucata.quantidade} autoFocus onChange={(e) => setSucata((s) => s && ({ ...s, quantidade: e.target.value }))} /></div>
                <div className="erp-field erp-c7"><label className="erp-label erp-req">Depósito</label>
                  <LookupField value={sucata.deposito} loader={loadWarehouses} entityLabel="depósito" onChange={(c) => setSucata((s) => s && ({ ...s, deposito: c ? Number(c) : undefined }))} /></div>
              </div>
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setSucata(null)} disabled={busy}>Cancelar</button>
              <button className="erp-btn erp-btn-primary" onClick={destinarSucata} disabled={busy}>Registrar destino</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog aberto={confirmarInicio} titulo="Iniciar a produção com falta de material?"
        mensagem="Há material sem saldo suficiente no depósito para esta ordem (já contando as ordens que estão na frente). A produção pode parar na etapa que consome esse material."
        assunto={faltas ? `${faltas.missing_items} de ${faltas.items} item(ns) com falta` : undefined} rotuloConfirmar="Iniciar mesmo assim"
        onCancelar={() => setConfirmarInicio(false)}
        onConfirmar={() => { setConfirmarInicio(false); transicao("produção iniciada", startProductionOrder); }} />
      <ConfirmDialog aberto={confirmarCancelamento} titulo="Cancelar a ordem de produção?"
        mensagem="A ordem deixa de valer para produção e planejamento. Apontamentos e consumos já lançados continuam registrados."
        assunto={of ? `OF ${of.id} · ${of.item_code} · ${num(of.planned_qty)} peça(s)` : undefined} rotuloConfirmar="Cancelar OF"
        onCancelar={() => setConfirmarCancelamento(false)}
        onConfirmar={() => { setConfirmarCancelamento(false); transicao("cancelada", cancelProductionOrder); }} />
    </div>
  );
}
