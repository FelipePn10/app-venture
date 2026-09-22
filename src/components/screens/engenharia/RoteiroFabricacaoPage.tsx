import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type OperationDTO, type OpOrigin, type RouteDTO, type RouteOperationDTO, type EdgeDTO, type RouteDetail,
  type OperationDocumentDTO, type DocumentKind, type InspectionPoint,
  OP_ORIGINS, DOCUMENT_KINDS, INSPECTION_POINTS,
  listOperations, createOperation, updateOperation, deleteOperation,
  listRoutes, createRoute, deleteRoute,
  getRouteDetail, addRouteOperation, removeRouteOperation,
  createEdge, deleteEdge, getLeadTime,
  type RouteOpResourceDTO, type TimeUnit,
  TIME_UNITS, THIRD_PARTY_REMITTANCES,
  listRouteOpResources, addRouteOpResource, setRouteOpResourcePrimary, removeRouteOpResource,
  listRouteOpTools, addRouteOpTool, removeRouteOpTool,
  addOperationDocument, removeOperationDocument, listOperationDocuments,
  addRouteInspection, removeRouteInspection,
} from "@/services/manufacturingRoutingService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { enumLabel } from "@/utils/enumLabels";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadWorkCenters, loadSuppliers, loadTools } from "@/services/lookups";
import { RoteiroCustoPanel } from "./roteiro/RoteiroCustoPanel";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

/**
 * As seis abas são as seis coisas que alguém faz ao desenhar um processo, na
 * ordem em que faz: monta o vocabulário de operações, cria o roteiro do item,
 * encadeia as etapas, diz com o que cada etapa é feita, define o que depende de
 * quê e, no fim, confere quanto custa e quanto demora.
 */
type Aba = "biblioteca" | "roteiros" | "etapas" | "recursos" | "rede" | "custo";

const ABAS: { id: Aba; label: string }[] = [
  { id: "biblioteca", label: "Operação / Biblioteca" },
  { id: "roteiros", label: "Roteiros do item" },
  { id: "etapas", label: "Etapas do roteiro" },
  { id: "recursos", label: "Recursos e ferramentas" },
  { id: "rede", label: "Rede de dependências" },
  { id: "custo", label: "Tempo e custo do lote" },
];

const EMPTY_OP: OperationDTO = {
  name: "", origin: "INTERNA", standard_time: 0, setup_time: 0,
  run_time: 0, labor_time: 0, run_base_qty: 1, queue_time: 0, wait_time: 0, move_time: 0,
  crew_size: 1, time_unit: "HORA", third_party_remittance: "DEMAND_ITEMS", scrap_pct: 0,
};
const EMPTY_ROUTE: RouteDTO = { item_code: "", description: "", alternative: 1, is_standard: true };
const EMPTY_RO: RouteOperationDTO = {
  operation_id: 0, sequence: 10, work_center_id: undefined,
  standard_time: undefined, setup_time: undefined, notes: "", inspection_required: false,
};
const EMPTY_EDGE: EdgeDTO = { predecessor_id: 0, successor_id: 0, overlap_pct: 0 };
const EMPTY_DOC = { kind: "DESENHO" as DocumentKind, title: "", reference: "", revision: "" };
const EMPTY_INSP = { point_type: "PROCESSO" as InspectionPoint, description: "", sample_size: "1", acceptance_level: "0" };

/** Uma etapa que sai da fábrica corre em outro relógio e em outro CNPJ. */
const ehTerceiro = (ro: RouteOperationDTO, origem?: OpOrigin) =>
  origem === "EXTERNA" || origem === "TERCEIROS" || !!ro.supplier_id || !!ro.lead_time_days;

function originPill(o: string): JSX.Element {
  const cls = o === "INTERNA" ? "erp-badge-green" : o === "EXTERNA" ? "erp-badge-amber" : "erp-badge-blue";
  return <span className={`erp-badge ${cls}`}>{enumLabel(o)}</span>;
}

/** 106,7987 → "106,80" — a tela mostra peças, não a precisão interna. */
const pecas = (n: number | undefined, casas = 2) =>
  typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) : "—";

/**
 * Roteiro de fabricação — o processo pelo qual um item passa na empresa.
 *
 * Seis abas, uma por pergunta: que operações existem, que roteiros este item
 * tem, que etapas compõem o roteiro, com que recursos cada etapa é feita, o que
 * depende de quê, e quanto isso custa e demora.
 *
 * O roteiro descreve UM item. A cadeia de itens ("a balança precisa da bucha")
 * é da estrutura de produto; o roteiro de cada um diz como aquele item é feito.
 * Uma bucha que vai ao terceiro tem esse passo no roteiro DELA — e o MRP, que
 * lê os dois, ordena a bucha antes da balança e soma o prazo do terceiro.
 *
 * É a implementação única do roteiro: antes existia também na VPRO0100, que
 * chamava os mesmos endpoints de `/api/routing`. A rotina foi centralizada nas
 * telas de engenharia — VENT0115 (modelos padrão) e VENT0202 (roteiro efetivo
 * do item) —, que é onde o roteiro conversa com a OF, o CRP e o APS.
 */
export function RoteiroFabricacaoPage({ code = "VENT0202" }: { code?: "VENT0115" | "VENT0202" }): JSX.Element {
  const titulo = code === "VENT0115" ? "Roteiros Padrão" : "Roteiro de Fabricação por Item";
  const [aba, setAba] = useState<Aba>("biblioteca");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  /** Confirmação em tela: guarda o que fazer quando o usuário disser sim. */
  const [confirmacao, setConfirmacao] = useState<
    { titulo: string; mensagem: string; assunto?: string; rotulo: string; acao: () => Promise<void> } | null
  >(null);

  // Operações da biblioteca
  const [ops, setOps] = useState<OperationDTO[]>([]);
  const [opForm, setOpForm] = useState<OperationDTO>(EMPTY_OP);
  const [opEditId, setOpEditId] = useState<number | null>(null);
  const [docsBiblioteca, setDocsBiblioteca] = useState<OperationDocumentDTO[]>([]);

  // Roteiros
  const [itemCode, setItemCode] = useState("");
  const [routes, setRoutes] = useState<RouteDTO[]>([]);
  const [routeForm, setRouteForm] = useState<RouteDTO>(EMPTY_ROUTE);
  const [itemDestino, setItemDestino] = useState("");
  const [detail, setDetail] = useState<RouteDetail | null>(null);
  const [roForm, setRoForm] = useState<RouteOperationDTO>(EMPTY_RO);
  const [edgeForm, setEdgeForm] = useState<EdgeDTO>(EMPTY_EDGE);
  /** Tamanho do lote usado para ler a cascata de refugo em peças. */
  const [lote, setLote] = useState("100");

  // Detalhe da etapa selecionada: recursos, ferramentas, documentos, inspeção
  const [selOpId, setSelOpId] = useState<number | null>(null);
  const [resources, setResources] = useState<RouteOpResourceDTO[]>([]);
  const [resForm, setResForm] = useState({ work_center_id: "", priority: "1", time_factor: "1", is_primary: false });
  const [opTools, setOpTools] = useState<Obj[]>([]);
  const [toolIdInput, setToolIdInput] = useState("");
  const [toolQtyInput, setToolQtyInput] = useState("1");
  const [docForm, setDocForm] = useState(EMPTY_DOC);
  const [inspForm, setInspForm] = useState(EMPTY_INSP);

  const [leadTime, setLeadTime] = useState<{ horas: number; diasTerceiro: number } | null>(null);

  const opName = useCallback((id: number) => ops.find((o) => o.id === id)?.name ?? `Op ${id}`, [ops]);
  const opOrigem = useCallback((id: number) => ops.find((o) => o.id === id)?.origin, [ops]);
  const loteNum = Math.max(1, Number(lote) || 1);

  const loadOps = useCallback(async () => {
    setBusy(true);
    try { setOps(await listOperations()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar operações.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void loadOps(); }, [loadOps]);

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  };

  // ── Biblioteca de operações ────────────────────────────────────────────────
  const setOpF = <K extends keyof OperationDTO>(k: K, v: OperationDTO[K]) => { setOpForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novaOp() { setOpForm(EMPTY_OP); setOpEditId(null); setDocsBiblioteca([]); setFeedback(null); }
  function editOp(o: OperationDTO) {
    setOpForm({ ...o }); setOpEditId(o.id ?? null); setFeedback(null); setDocsBiblioteca([]);
    if (o.id) void wrap(async () => { setDocsBiblioteca(await listOperationDocuments(o.id!)); });
  }

  const salvarOp = () => wrap(async () => {
    if (!opForm.name.trim()) { setFeedback({ type: "error", message: "Informe o nome da operação." }); return; }
    if (opEditId !== null) { await updateOperation(opEditId, opForm); setFeedback({ type: "success", message: `Operação "${opForm.name}" atualizada.` }); }
    else { await createOperation(opForm); setFeedback({ type: "success", message: `Operação "${opForm.name}" criada.` }); }
    novaOp(); await loadOps();
  });

  const pedirDesativacaoOp = (o: OperationDTO) => setConfirmacao({
    titulo: "Desativar operação da biblioteca",
    mensagem: "A operação sai da lista de escolha, mas os roteiros que já a usam continuam funcionando — nada é apagado e nenhuma ordem em andamento muda.",
    assunto: `${o.code ? `${o.code} · ` : ""}${o.name}`,
    rotulo: "Desativar",
    acao: async () => { await deleteOperation(o.id!); setFeedback({ type: "success", message: "Operação desativada." }); await loadOps(); },
  });

  const addDocBiblioteca = () => wrap(async () => {
    if (!opEditId) return;
    if (!docForm.title.trim()) { setFeedback({ type: "error", message: "Informe o título do documento." }); return; }
    await addOperationDocument({ operation_id: opEditId, ...docForm });
    setDocForm(EMPTY_DOC);
    setDocsBiblioteca(await listOperationDocuments(opEditId));
    setFeedback({ type: "success", message: "Documento vinculado à operação — vale em todo roteiro que a usa." });
  });

  const removerDocBiblioteca = (id: number) => wrap(async () => {
    await removeOperationDocument(id);
    if (opEditId) setDocsBiblioteca(await listOperationDocuments(opEditId));
  });

  // ── Roteiros do item ───────────────────────────────────────────────────────
  const setRF = <K extends keyof RouteDTO>(k: K, v: RouteDTO[K]) => { setRouteForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  const carregarRoteiros = useCallback(async (codigo?: string) => {
    const alvo = (codigo ?? itemCode).trim();
    if (!alvo) { setFeedback({ type: "error", message: "Informe o código do item." }); return; }
    setBusy(true); setFeedback(null); setDetail(null); setLeadTime(null);
    try { setRoutes(await listRoutes(alvo)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar roteiros.") }); }
    finally { setBusy(false); }
  }, [itemCode]);

  const salvarRoteiro = () => wrap(async () => {
    const alvo = itemCode.trim();
    if (!alvo) { setFeedback({ type: "error", message: "Escolha o item antes de criar o roteiro." }); return; }
    await createRoute({ ...routeForm, item_code: alvo });
    setRouteForm(EMPTY_ROUTE);
    setFeedback({ type: "success", message: "Roteiro criado." });
    await carregarRoteiros();
  });

  const pedirDesativacaoRoteiro = (r: RouteDTO) => setConfirmacao({
    titulo: "Desativar roteiro",
    mensagem: "O roteiro deixa de ser usado pelo MRP e pelo CRP no próximo planejamento. Ordens já geradas mantêm as etapas que receberam.",
    assunto: `${r.description || "Roteiro"} · alternativa ${r.alternative}${r.is_standard ? " · padrão" : ""}`,
    rotulo: "Desativar",
    acao: async () => {
      await deleteRoute(r.id!);
      if (detail?.route?.id === r.id) setDetail(null);
      setFeedback({ type: "success", message: "Roteiro desativado." });
      await carregarRoteiros();
    },
  });

  const reloadDetail = useCallback(async (routeId: number) => {
    setBusy(true);
    try { setDetail(await getRouteDetail(routeId)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }, []);

  async function abrirRoteiro(r: RouteDTO) {
    if (!r.id) return;
    setRoForm(EMPTY_RO); setEdgeForm(EMPTY_EDGE); setLeadTime(null); setFeedback(null); setSelOpId(null);
    await reloadDetail(r.id);
    setAba("etapas");
  }

  // ── Etapas do roteiro ──────────────────────────────────────────────────────
  const setRoF = <K extends keyof RouteOperationDTO>(k: K, v: RouteOperationDTO[K]) => setRoForm((p) => ({ ...p, [k]: v }));

  /**
   * Quando a operação escolhida é externa, os campos de terceirização aparecem
   * já preenchidos com o que a biblioteca traz — o usuário ajusta só o que é
   * diferente NESTE roteiro (um fornecedor mais rápido, um preço negociado).
   */
  function escolherOperacao(id: number) {
    const lib = ops.find((o) => o.id === id);
    setRoForm((p) => ({
      ...p, operation_id: id,
      work_center_id: p.work_center_id ?? lib?.default_work_center_id,
      supplier_id: lib?.supplier_id, service_item_code: lib?.service_item_code,
      cost_per_unit: lib?.cost_per_unit, lead_time_days: lib?.lead_time_days,
      third_party_remittance: lib?.third_party_remittance,
    }));
  }

  const addRO = () => wrap(async () => {
    const rid = detail?.route?.id; if (!rid) return;
    if (!roForm.operation_id) { setFeedback({ type: "error", message: "Selecione a operação." }); return; }
    await addRouteOperation(rid, roForm);
    setRoForm((p) => ({ ...EMPTY_RO, sequence: p.sequence + 10 }));
    await reloadDetail(rid);
    setFeedback({ type: "success", message: "Etapa adicionada ao roteiro." });
  });

  const pedirRemocaoEtapa = (ro: RouteOperationDTO) => setConfirmacao({
    titulo: "Remover etapa do roteiro",
    mensagem: "A etapa sai deste roteiro e deixa de entrar no cálculo de tempo, custo e capacidade. As dependências que apontavam para ela também deixam de valer.",
    assunto: `seq ${ro.sequence} · ${ro.operation_name || opName(ro.operation_id)}`,
    rotulo: "Remover",
    acao: async () => {
      const rid = detail?.route?.id; if (!rid) return;
      await removeRouteOperation(rid, ro.id!);
      if (selOpId === ro.id) setSelOpId(null);
      await reloadDetail(rid);
      setFeedback({ type: "success", message: "Etapa removida." });
    },
  });

  // ── Detalhe da etapa: recursos, ferramentas, documentos, inspeção ──────────
  const abrirDetalheDaEtapa = (opId?: number) => {
    const rid = detail?.route?.id; if (!rid || !opId) return;
    setSelOpId(opId); setAba("recursos"); setDocForm(EMPTY_DOC); setInspForm(EMPTY_INSP);
    void wrap(async () => {
      const [rs, ts] = await Promise.all([listRouteOpResources(rid, opId), listRouteOpTools(rid, opId)]);
      setResources(rs); setOpTools(ts);
    });
  };

  const addResource = () => wrap(async () => {
    const rid = detail?.route?.id; if (!rid || !selOpId) return;
    if (!resForm.work_center_id) { setFeedback({ type: "error", message: "Informe o centro de trabalho." }); return; }
    await addRouteOpResource(rid, selOpId, {
      work_center_id: Number(resForm.work_center_id), priority: Number(resForm.priority) || 1,
      time_factor: Number(resForm.time_factor) || 1, is_primary: resForm.is_primary,
    });
    setResForm({ work_center_id: "", priority: "1", time_factor: "1", is_primary: false });
    setResources(await listRouteOpResources(rid, selOpId));
    setFeedback({ type: "success", message: "Centro alternativo adicionado." });
  });

  const tornarPrimario = (r: RouteOpResourceDTO) => wrap(async () => {
    const rid = detail?.route?.id; if (!rid || !selOpId || !r.id) return;
    await setRouteOpResourcePrimary(rid, selOpId, r.id);
    setResources(await listRouteOpResources(rid, selOpId));
    setFeedback({ type: "success", message: `Centro ${r.work_center_name || r.work_center_id} passa a ser o usado por custo, CRP e lead time.` });
  });

  const removeResource = (r: RouteOpResourceDTO) => wrap(async () => {
    const rid = detail?.route?.id; if (!rid || !selOpId || !r.id) return;
    await removeRouteOpResource(rid, selOpId, r.id);
    setResources(await listRouteOpResources(rid, selOpId));
  });

  const addTool = () => wrap(async () => {
    const rid = detail?.route?.id; if (!rid || !selOpId) return;
    if (!toolIdInput) { setFeedback({ type: "error", message: "Escolha a ferramenta." }); return; }
    await addRouteOpTool(rid, selOpId, Number(toolIdInput), Number(toolQtyInput) || 1);
    setToolIdInput(""); setToolQtyInput("1");
    setOpTools(await listRouteOpTools(rid, selOpId));
    setFeedback({ type: "success", message: "Ferramenta vinculada à etapa." });
  });

  const removeTool = (linkId: number) => wrap(async () => {
    const rid = detail?.route?.id; if (!rid || !selOpId) return;
    await removeRouteOpTool(rid, selOpId, linkId);
    setOpTools(await listRouteOpTools(rid, selOpId));
  });

  const addDocEtapa = () => wrap(async () => {
    const rid = detail?.route?.id; if (!rid || !selOpId) return;
    if (!docForm.title.trim()) { setFeedback({ type: "error", message: "Informe o título do documento." }); return; }
    await addOperationDocument({ route_operation_id: selOpId, ...docForm });
    setDocForm(EMPTY_DOC);
    await reloadDetail(rid);
    setFeedback({ type: "success", message: "Documento vinculado a esta etapa." });
  });

  const removerDoc = (id: number) => wrap(async () => {
    const rid = detail?.route?.id; if (!rid) return;
    await removeOperationDocument(id);
    await reloadDetail(rid);
  });

  const addInspecao = () => wrap(async () => {
    const rid = detail?.route?.id; if (!rid || !selOpId) return;
    if (!inspForm.description.trim()) { setFeedback({ type: "error", message: "Descreva o que será inspecionado." }); return; }
    await addRouteInspection(rid, selOpId, {
      point_type: inspForm.point_type, description: inspForm.description,
      sample_size: Number(inspForm.sample_size) || 1, acceptance_level: Number(inspForm.acceptance_level) || 0,
    });
    setInspForm(EMPTY_INSP);
    await reloadDetail(rid);
    setFeedback({ type: "success", message: "Ponto de inspeção criado. A ordem de produção abrirá o registro ao chegar nesta etapa." });
  });

  const removerInspecao = (id: number) => wrap(async () => {
    const rid = detail?.route?.id; if (!rid || !selOpId) return;
    await removeRouteInspection(rid, selOpId, id);
    await reloadDetail(rid);
  });

  // ── Rede de dependências ───────────────────────────────────────────────────
  const setEF = <K extends keyof EdgeDTO>(k: K, v: EdgeDTO[K]) => setEdgeForm((p) => ({ ...p, [k]: v }));

  const addEdgeFn = () => wrap(async () => {
    const rid = detail?.route?.id; if (!rid) return;
    if (!edgeForm.predecessor_id || !edgeForm.successor_id) { setFeedback({ type: "error", message: "Selecione a predecessora e a sucessora." }); return; }
    if (edgeForm.predecessor_id === edgeForm.successor_id) { setFeedback({ type: "error", message: "Uma etapa não pode depender de si mesma." }); return; }
    await createEdge(rid, edgeForm);
    setEdgeForm(EMPTY_EDGE);
    await reloadDetail(rid);
    setFeedback({ type: "success", message: "Dependência criada." });
  });

  const removeEdgeFn = (ed: EdgeDTO) => wrap(async () => {
    const rid = detail?.route?.id; if (!rid) return;
    await deleteEdge(rid, { predecessor_id: ed.predecessor_id, successor_id: ed.successor_id });
    await reloadDetail(rid);
    setFeedback({ type: "success", message: "Dependência removida." });
  });

  // ── Tempo e custo ──────────────────────────────────────────────────────────
  const calcularLeadTime = () => wrap(async () => {
    const rid = detail?.route?.id; if (!rid) return;
    const r = await getLeadTime(rid, loteNum);
    setLeadTime({ horas: r.lead_time_hours, diasTerceiro: r.subcontract_days });
    const cp = r.critical_path
      .map((id) => { const ro = detail?.operations.find((o) => o.id === id); return ro ? `seq ${ro.sequence}` : `#${id}`; })
      .join(" → ");
    setFeedback({ type: "info", message: `Caminho crítico: ${cp || "—"}.` });
  });

  /**
   * Copia o roteiro aberto para outro item.
   *
   * É o que faz um roteiro padrão valer a pena: em vez de redigitar quinze
   * etapas para cada peça parecida, copia-se o modelo e ajusta-se o que é
   * diferente. Vão junto as etapas — com tempos, refugo e terceirização — e a
   * rede de dependências, que é o que define o caminho crítico.
   */
  const copiarRoteiro = () => wrap(async () => {
    const atual = detail; const origem = atual?.route;
    if (!atual || !origem?.id) return;
    const destino = itemDestino.trim();
    if (!destino) { setFeedback({ type: "error", message: "Escolha o item de destino." }); return; }
    if (destino === origem.item_code) { setFeedback({ type: "error", message: "O destino é o mesmo item de origem." }); return; }

    const novo = await createRoute({
      item_code: destino, alternative: origem.alternative,
      description: `${origem.description ?? "Roteiro"} (cópia de ${origem.item_code})`,
      is_standard: false, valid_from: origem.valid_from, valid_to: origem.valid_to,
    });
    if (!novo.id) throw new Error("o roteiro de destino não foi criado");

    // As etapas precisam ser recriadas antes das dependências: a rede aponta
    // para os ids novos, não para os do roteiro de origem.
    const equivalencia = new Map<number, number>();
    for (const ro of [...atual.operations].sort((a, b) => a.sequence - b.sequence)) {
      const criada = await addRouteOperation(novo.id, {
        sequence: ro.sequence, operation_id: ro.operation_id, work_center_id: ro.work_center_id,
        standard_time: ro.standard_time, setup_time: ro.setup_time,
        run_time: ro.run_time, labor_time: ro.labor_time, run_base_qty: ro.run_base_qty,
        queue_time: ro.queue_time, wait_time: ro.wait_time, move_time: ro.move_time,
        crew_size: ro.crew_size, time_unit: ro.time_unit,
        supplier_id: ro.supplier_id, service_item_code: ro.service_item_code,
        cost_per_unit: ro.cost_per_unit, lead_time_days: ro.lead_time_days,
        third_party_remittance: ro.third_party_remittance,
        scrap_pct: ro.scrap_pct, inspection_required: ro.inspection_required,
        notes: ro.notes,
      });
      if (ro.id && criada.id) equivalencia.set(ro.id, criada.id);
    }
    let redeCopiada = 0;
    for (const ed of atual.edges) {
      const p = equivalencia.get(ed.predecessor_id);
      const su = equivalencia.get(ed.successor_id);
      if (!p || !su) continue;
      await createEdge(novo.id, { predecessor_id: p, successor_id: su, overlap_pct: ed.overlap_pct });
      redeCopiada += 1;
    }
    setItemDestino("");
    setFeedback({ type: "success", message: `Roteiro copiado para ${destino}: ${equivalencia.size} etapa(s) e ${redeCopiada} dependência(s).` });
  });

  const roLabel = (ro: RouteOperationDTO) => `seq ${ro.sequence} · ${ro.operation_name || opName(ro.operation_id)}`;
  const etapasOrdenadas = useMemo(
    () => [...(detail?.operations ?? [])].sort((a, b) => a.sequence - b.sequence),
    [detail],
  );
  const etapaSelecionada = etapasOrdenadas.find((o) => o.id === selOpId);
  const docsDaEtapa = (detail?.documents ?? []).filter((d) => d.route_operation_id === selOpId);
  const inspDaEtapa = (detail?.inspections ?? []).filter((i) => i.route_operation_id === selOpId);
  const temRefugo = etapasOrdenadas.some((o) => (o.effective_scrap_pct ?? 0) > 0);
  const soltar = (detail?.release_qty ?? 1) * loteNum;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">{titulo}</span><span className="erp-crumb-code">{code}</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        {detail?.route && (
          <span className="erp-titlebar-meta">
            roteiro {detail.route.code ?? detail.route.id} · item {detail.route.item_code}
          </span>
        )}
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Item</span>
          <div style={{ width: 230 }}>
            <LookupField
              value={itemCode || undefined}
              onChange={(c) => { setItemCode(String(c ?? "")); if (c) void carregarRoteiros(String(c)); }}
              loader={loadItems} entityLabel="item" placeholder="Buscar item" />
          </div>
          <button className="erp-btn erp-btn-primary" onClick={() => void carregarRoteiros()} disabled={busy}>
            {busy && <span className="erp-spin" />}Carregar roteiros
          </button>
        </div>
        {aba === "biblioteca" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Operação</span>
            <button className="erp-btn erp-btn-new" onClick={novaOp} disabled={busy}>+ Nova</button>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvarOp()} disabled={busy}>
              {opEditId !== null ? "Atualizar" : "Salvar"}
            </button>
          </div>
        )}
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title={`${code} — ${titulo}`} filename={code.toLowerCase()} /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            {ABAS.map((a) => (
              <button key={a.id} className={`erp-tab ${aba === a.id ? "active" : ""}`} onClick={() => setAba(a.id)}>
                {a.label}
              </button>
            ))}
          </div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {/* ═══ 1. OPERAÇÃO / BIBLIOTECA ═══ */}
            {aba === "biblioteca" && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Operação — <span style={{ fontWeight: 400, opacity: .65 }}>
                      {opEditId !== null ? `editando #${opEditId}` : "o vocabulário reutilizável de processos da fábrica"}
                    </span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c5"><label htmlFor="rot-op-nome" className="erp-label erp-req">Nome</label>
                      <input id="rot-op-nome" className="erp-input" value={opForm.name} placeholder="Corte a laser"
                        onChange={(e) => setOpF("name", e.target.value)} /></div>
                    <div className="erp-field erp-c3"><label htmlFor="rot-op-origem" className="erp-label">Origem</label>
                      <select id="rot-op-origem" className="erp-input" value={opForm.origin} onChange={(e) => setOpF("origin", e.target.value as OpOrigin)}>
                        {OP_ORIGINS.map((o) => <option key={o} value={o}>{enumLabel(o)}</option>)}
                      </select>
                      <span className="erp-field-hint">Interna gera ordem de fabricação; externa e terceiros geram ordem de serviço.</span></div>
                    <div className="erp-field erp-c2"><label htmlFor="rot-op-unidade" className="erp-label">Unidade dos tempos</label>
                      <select id="rot-op-unidade" className="erp-input" value={opForm.time_unit ?? "HORA"} onChange={(e) => setOpF("time_unit", e.target.value as TimeUnit)}>
                        {TIME_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Centro padrão</label>
                      <LookupField value={opForm.default_work_center_id ?? undefined}
                        onChange={(c) => setOpF("default_work_center_id", c ? Number(c) : undefined)}
                        loader={loadWorkCenters} allowManualCode={false} entityLabel="centro de trabalho" placeholder="Opcional" clearable /></div>

                    <div className="erp-field erp-c12"><div className="fsc-rot-sec">Modelo de tempo</div></div>
                    <div className="erp-field erp-c2"><label htmlFor="rot-op-setup" className="erp-label">Preparação (por lote)</label>
                      <input id="rot-op-setup" className="erp-input num" type="number" step="0.001" value={opForm.setup_time ?? 0}
                        onChange={(e) => setOpF("setup_time", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c2"><label htmlFor="rot-op-maquina" className="erp-label">Máquina</label>
                      <input id="rot-op-maquina" className="erp-input num" type="number" step="0.001" value={opForm.run_time ?? 0}
                        onChange={(e) => setOpF("run_time", Number(e.target.value))} />
                      <span className="erp-field-hint">Por lote-base.</span></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Mão de obra</label>
                      <input className="erp-input num" type="number" step="0.001" value={opForm.labor_time ?? 0}
                        onChange={(e) => setOpF("labor_time", Number(e.target.value))} />
                      <span className="erp-field-hint">Zero = igual à máquina.</span></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Peças por ciclo</label>
                      <input className="erp-input num" type="number" min={1} step="1" value={opForm.run_base_qty ?? 1}
                        onChange={(e) => setOpF("run_base_qty", Number(e.target.value) || 1)} />
                      <span className="erp-field-hint">Quantas peças saem no tempo acima.</span></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Operadores</label>
                      <input className="erp-input num" type="number" min={1} step="1" value={opForm.crew_size ?? 1}
                        onChange={(e) => setOpF("crew_size", Number(e.target.value) || 1)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Tempo padrão (legado)</label>
                      <input className="erp-input num" type="number" step="0.001" value={opForm.standard_time}
                        onChange={(e) => setOpF("standard_time", Number(e.target.value))} />
                      <span className="erp-field-hint">Usado só quando máquina é zero.</span></div>

                    <div className="erp-field erp-c2"><label className="erp-label">Fila</label>
                      <input className="erp-input num" type="number" step="0.001" value={opForm.queue_time ?? 0}
                        onChange={(e) => setOpF("queue_time", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Espera</label>
                      <input className="erp-input num" type="number" step="0.001" value={opForm.wait_time ?? 0}
                        onChange={(e) => setOpF("wait_time", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Movimentação</label>
                      <input className="erp-input num" type="number" step="0.001" value={opForm.move_time ?? 0}
                        onChange={(e) => setOpF("move_time", Number(e.target.value))} /></div>
                    <div className="erp-field erp-c2"><label htmlFor="rot-op-refugo" className="erp-label">Refugo padrão (%)</label>
                      <input id="rot-op-refugo" className="erp-input num" type="number" min={0} max={99.9} step="0.1" value={opForm.scrap_pct ?? 0}
                        onChange={(e) => setOpF("scrap_pct", Number(e.target.value))} />
                      <span className="erp-field-hint">Quanto do que entra não sai bom.</span></div>
                    <div className="erp-field erp-c4"><span className="erp-field-hint">
                      Fila, espera e movimentação são fixos por lote: entram no prazo mas não ocupam a máquina.
                      O refugo é diferente da perda da estrutura — aqui é a peça que está sendo feita que se perde,
                      e é ele que diz quanto soltar para o pedido fechar.
                    </span></div>

                    {opForm.origin !== "INTERNA" && (
                      <>
                        <div className="erp-field erp-c12"><div className="fsc-rot-sec">Terceirização</div></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Fornecedor</label>
                          <LookupField value={opForm.supplier_id ?? undefined}
                            onChange={(c) => setOpF("supplier_id", c ? Number(c) : undefined)}
                            loader={loadSuppliers} entityLabel="fornecedor" placeholder="Quem executa" clearable /></div>
                        <div className="erp-field erp-c3"><label className="erp-label">Item de serviço</label>
                          <LookupField value={opForm.service_item_code ?? undefined}
                            onChange={(c) => setOpF("service_item_code", c ? String(c) : undefined)}
                            loader={loadItems} entityLabel="item" placeholder="Serviço comprado" clearable /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Custo por peça</label>
                          <input className="erp-input num" type="number" step="0.0001" value={opForm.cost_per_unit ?? ""}
                            onChange={(e) => setOpF("cost_per_unit", e.target.value ? Number(e.target.value) : undefined)} /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Prazo (dias)</label>
                          <input className="erp-input num" type="number" min={0} step="1" value={opForm.lead_time_days ?? ""}
                            onChange={(e) => setOpF("lead_time_days", e.target.value ? Number(e.target.value) : undefined)} />
                          <span className="erp-field-hint">Dias corridos fora da fábrica.</span></div>
                        <div className="erp-field erp-c2"><label className="erp-label">O que remeter</label>
                          <select className="erp-input" value={opForm.third_party_remittance ?? "DEMAND_ITEMS"}
                            onChange={(e) => setOpF("third_party_remittance", e.target.value)}>
                            {THIRD_PARTY_REMITTANCES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
                          </select></div>
                      </>
                    )}
                  </div>
                </div>

                {opEditId !== null && (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      Documentos da operação — <span style={{ fontWeight: 400, opacity: .65 }}>
                        valem em todo roteiro que usar esta operação
                      </span>
                    </div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c2"><label className="erp-label">Tipo</label>
                        <select className="erp-input" value={docForm.kind} onChange={(e) => setDocForm((d) => ({ ...d, kind: e.target.value as DocumentKind }))}>
                          {DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                        </select></div>
                      <div className="erp-field erp-c4"><label className="erp-label erp-req">Título</label>
                        <input id="rot-doc-bib-titulo" className="erp-input" value={docForm.title} placeholder="Instrução de rebarbação"
                          onChange={(e) => setDocForm((d) => ({ ...d, title: e.target.value }))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Referência</label>
                        <input className="erp-input" value={docForm.reference} placeholder="IT-REB-01 ou caminho/URL"
                          onChange={(e) => setDocForm((d) => ({ ...d, reference: e.target.value }))} /></div>
                      <div className="erp-field erp-c1"><label className="erp-label">Revisão</label>
                        <input className="erp-input" value={docForm.revision}
                          onChange={(e) => setDocForm((d) => ({ ...d, revision: e.target.value }))} /></div>
                      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                        <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addDocBiblioteca()} disabled={busy}>+ Documento</button></div>
                      <div className="erp-field erp-c12">
                        <table className="erp-grid">
                          <thead><tr><th>Tipo</th><th>Título</th><th>Referência</th><th>Rev.</th><th style={{ width: 90 }}>Ações</th></tr></thead>
                          <tbody>
                            {docsBiblioteca.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum documento nesta operação.</td></tr>}
                            {docsBiblioteca.map((d) => (
                              <tr key={d.id}>
                                <td>{DOCUMENT_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind}</td>
                                <td style={{ fontWeight: 600 }}>{d.title}</td>
                                <td>{d.reference || "—"}</td><td>{d.revision || "—"}</td>
                                <td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => d.id && void removerDocBiblioteca(d.id)}>Remover</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Biblioteca — <span style={{ fontWeight: 400, opacity: .65 }}>{ops.length} operação(ões)</span></div>
                  <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr>
                        <th style={{ width: 60 }}>#</th><th>Nome</th><th>Origem</th>
                        <th className="num">Prep.</th><th className="num">Máquina</th><th className="num">Peças/ciclo</th>
                        <th className="num">Equipe</th><th className="num">Refugo</th><th>Un.</th><th style={{ width: 150 }}>Ações</th>
                      </tr></thead>
                      <tbody>
                        {ops.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhuma operação cadastrada.</td></tr>}
                        {ops.map((o) => (
                          <tr key={o.id}>
                            <td>{o.code ?? o.id}</td><td style={{ fontWeight: 600 }}>{o.name}</td><td>{originPill(o.origin)}</td>
                            <td className="num">{o.setup_time ?? 0}</td>
                            <td className="num">{o.run_time || o.standard_time}</td>
                            <td className="num">{o.run_base_qty ?? 1}</td>
                            <td className="num">{o.crew_size ?? 1}</td>
                            <td className="num">{(o.scrap_pct ?? 0) > 0 ? `${o.scrap_pct}%` : "—"}</td>
                            <td>{enumLabel(o.time_unit ?? "HORA")}</td>
                            <td>
                              <button className="erp-btn erp-btn-sm" onClick={() => editOp(o)}>Editar</button>{" "}
                              <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => o.id && pedirDesativacaoOp(o)}>Desativar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div></div>
                </div>
              </>
            )}

            {/* ═══ 2. ROTEIROS DO ITEM ═══ */}
            {aba === "roteiros" && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Novo roteiro — <span style={{ fontWeight: 400, opacity: .65 }}>
                      {itemCode ? `item ${itemCode}` : "escolha o item na barra acima"}
                    </span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c6"><label className="erp-label">Descrição</label>
                      <input className="erp-input" value={routeForm.description ?? ""} placeholder="Processo padrão"
                        onChange={(e) => setRF("description", e.target.value)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Alternativa</label>
                      <input className="erp-input num" type="number" min={1} value={routeForm.alternative}
                        onChange={(e) => setRF("alternative", Number(e.target.value))} />
                      <span className="erp-field-hint">Outro jeito de fazer o mesmo item.</span></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Máscara</label>
                      <input className="erp-input" value={routeForm.mask ?? ""} onChange={(e) => setRF("mask", e.target.value)} />
                      <span className="erp-field-hint">Variação configurada do item.</span></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Padrão (MRP/CRP)</label>
                      <div className="erp-toggle-row">
                        <label className="erp-toggle">
                          <input type="checkbox" checked={routeForm.is_standard} onChange={(e) => setRF("is_standard", e.target.checked)} />
                          <div className="erp-toggle-track" /><div className="erp-toggle-thumb" />
                        </label>
                        <span className="erp-toggle-label">{routeForm.is_standard ? "Sim" : "Não"}</span>
                      </div></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Início da vigência</label>
                      <input className="erp-input" type="date" value={(routeForm.valid_from ?? "").slice(0, 10)}
                        onChange={(e) => setRF("valid_from", e.target.value || undefined)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Fim da vigência</label>
                      <input className="erp-input" type="date" value={(routeForm.valid_to ?? "").slice(0, 10)}
                        onChange={(e) => setRF("valid_to", e.target.value || undefined)} />
                      <span className="erp-field-hint">Em branco = sem prazo.</span></div>
                    <div className="erp-field erp-c8" style={{ justifyContent: "flex-end", alignItems: "flex-end" }}>
                      <button className="erp-btn erp-btn-new" onClick={() => void salvarRoteiro()} disabled={busy || !itemCode}>+ Criar roteiro</button></div>
                  </div>
                </div>

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Roteiros do item — <span style={{ fontWeight: 400, opacity: .65 }}>{routes.length}</span></div>
                  <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th style={{ width: 60 }}>#</th><th>Descrição</th><th>Alt.</th><th>Máscara</th><th>Vigência</th><th>Padrão</th><th style={{ width: 170 }}>Ações</th></tr></thead>
                      <tbody>
                        {routes.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum roteiro. Escolha um item na barra acima.</td></tr>}
                        {routes.map((r) => (
                          <tr key={r.id} style={detail?.route?.id === r.id ? { background: "var(--v-green-soft)" } : undefined}>
                            <td>{r.code ?? r.id}</td>
                            <td style={{ fontWeight: 600 }}>{r.description || "—"}</td>
                            <td>{r.alternative}</td>
                            <td>{r.mask || "—"}</td>
                            <td>{r.valid_from ? `${r.valid_from.slice(0, 10)} → ${r.valid_to ? r.valid_to.slice(0, 10) : "sem fim"}` : "sempre"}</td>
                            <td>{r.is_standard ? <span className="erp-badge ok">Sim</span> : <span className="erp-badge erp-badge-gray">Não</span>}</td>
                            <td>
                              <button className="erp-btn erp-btn-sm" onClick={() => void abrirRoteiro(r)}>Abrir</button>{" "}
                              <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => r.id && pedirDesativacaoRoteiro(r)}>Desativar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div></div>
                </div>

                {detail?.route && (
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Copiar roteiro para outro item</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label">Item de destino</label>
                        <LookupField value={itemDestino || undefined} onChange={(c) => setItemDestino(c ? String(c) : "")}
                          loader={loadItems} entityLabel="item" placeholder="Item de destino…" clearable /></div>
                      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                        <button className="erp-btn" style={{ width: "100%" }} onClick={() => void copiarRoteiro()} disabled={busy || !itemDestino}>Copiar</button></div>
                      <div className="erp-field erp-c6"><span className="erp-field-hint">
                        Leva as etapas com tempos, refugo e terceirização, e a rede de dependências.
                        É assim que um roteiro padrão vira o ponto de partida de uma peça nova.
                      </span></div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ═══ 3. ETAPAS DO ROTEIRO ═══ */}
            {aba === "etapas" && (
              !detail?.route ? (
                <div className="erp-fieldset"><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <span className="erp-field-hint">Abra um roteiro na aba “Roteiros do item” para montar as etapas.</span>
                </div></div></div>
              ) : (
                <>
                  <div className="fsc-rot-cascata">
                    <span>Lote de referência</span>
                    <input id="rot-lote" className="erp-input num" style={{ width: 90 }} type="number" min={1} value={lote}
                      onChange={(e) => setLote(e.target.value)} aria-label="Tamanho do lote" />
                    <span>peças boas a entregar</span>
                    <span style={{ flex: 1 }} />
                    {temRefugo ? (
                      <>
                        <span>soltar na primeira etapa: <strong>{pecas(soltar)}</strong></span>
                        <span>perda no roteiro: <strong>{pecas(soltar - loteNum)}</strong> peças</span>
                      </>
                    ) : (
                      <span>sem refugo cadastrado — toda etapa processa as {loteNum} peças</span>
                    )}
                  </div>

                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Incluir etapa</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label erp-req">Operação</label>
                        <select id="rot-et-operacao" className="erp-input" value={roForm.operation_id} onChange={(e) => escolherOperacao(Number(e.target.value))}>
                          <option value={0}>— selecione —</option>
                          {ops.filter((o) => o.is_active !== false).map((o) => (
                            <option key={o.id} value={o.id}>{o.name} ({enumLabel(o.origin)})</option>
                          ))}
                        </select></div>
                      <div className="erp-field erp-c1"><label htmlFor="rot-et-seq" className="erp-label">Seq</label>
                        <input id="rot-et-seq" className="erp-input num" type="number" value={roForm.sequence}
                          onChange={(e) => setRoF("sequence", Number(e.target.value))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Centro de trabalho</label>
                        <LookupField value={roForm.work_center_id ?? undefined}
                          onChange={(c) => setRoF("work_center_id", c ? Number(c) : undefined)}
                          loader={loadWorkCenters} allowManualCode={false} entityLabel="centro de trabalho" placeholder="Herda da operação" clearable /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Máquina</label>
                        <input className="erp-input num" type="number" step="0.001" value={roForm.standard_time ?? ""} placeholder="herda"
                          onChange={(e) => setRoF("standard_time", e.target.value ? Number(e.target.value) : undefined)} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Preparação</label>
                        <input className="erp-input num" type="number" step="0.001" value={roForm.setup_time ?? ""} placeholder="herda"
                          onChange={(e) => setRoF("setup_time", e.target.value ? Number(e.target.value) : undefined)} /></div>

                      <div className="erp-field erp-c2"><label htmlFor="rot-et-refugo" className="erp-label">Refugo desta etapa (%)</label>
                        <input id="rot-et-refugo" className="erp-input num" type="number" min={0} max={99.9} step="0.1" value={roForm.scrap_pct ?? ""} placeholder="herda"
                          onChange={(e) => setRoF("scrap_pct", e.target.value ? Number(e.target.value) : undefined)} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Ponto de inspeção</label>
                        <div className="erp-toggle-row">
                          <label className="erp-toggle">
                            <input type="checkbox" checked={!!roForm.inspection_required}
                              onChange={(e) => setRoF("inspection_required", e.target.checked)} />
                            <div className="erp-toggle-track" /><div className="erp-toggle-thumb" />
                          </label>
                          <span className="erp-toggle-label">{roForm.inspection_required ? "A peça para para ser conferida" : "Segue direto"}</span>
                        </div></div>
                      <div className="erp-field erp-c6"><label className="erp-label">Observação</label>
                        <input className="erp-input" value={roForm.notes ?? ""} placeholder="O que esta etapa tem de particular neste item"
                          onChange={(e) => setRoF("notes", e.target.value)} /></div>
                      <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}>
                        <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addRO()} disabled={busy}>+ Etapa</button></div>

                      {ehTerceiro(roForm, opOrigem(roForm.operation_id)) && (
                        <>
                          <div className="erp-field erp-c12"><div className="fsc-rot-sec">Terceirização desta etapa</div></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Fornecedor</label>
                            <LookupField value={roForm.supplier_id ?? undefined}
                              onChange={(c) => setRoF("supplier_id", c ? Number(c) : undefined)}
                              loader={loadSuppliers} entityLabel="fornecedor" placeholder="Herda da operação" clearable /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Item de serviço</label>
                            <LookupField value={roForm.service_item_code ?? undefined}
                              onChange={(c) => setRoF("service_item_code", c ? String(c) : undefined)}
                              loader={loadItems} entityLabel="item" placeholder="Serviço comprado" clearable /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Custo por peça</label>
                            <input className="erp-input num" type="number" step="0.0001" value={roForm.cost_per_unit ?? ""} placeholder="herda"
                              onChange={(e) => setRoF("cost_per_unit", e.target.value ? Number(e.target.value) : undefined)} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Prazo (dias)</label>
                            <input id="rot-et-prazo" className="erp-input num" type="number" min={0} step="1" value={roForm.lead_time_days ?? ""} placeholder="herda"
                              onChange={(e) => setRoF("lead_time_days", e.target.value ? Number(e.target.value) : undefined)} />
                            <span className="erp-field-hint">Dias corridos fora da fábrica.</span></div>
                          <div className="erp-field erp-c2"><label className="erp-label">O que remeter</label>
                            <select className="erp-input" value={roForm.third_party_remittance ?? "DEMAND_ITEMS"}
                              onChange={(e) => setRoF("third_party_remittance", e.target.value)}>
                              {THIRD_PARTY_REMITTANCES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
                            </select></div>
                          <div className="erp-field erp-c12"><span className="erp-field-hint">
                            Enquanto a peça está no terceiro nenhuma máquina nossa fica ocupada — o MRP só atrasa a
                            etapa seguinte pelo prazo. Em branco, cada campo herda o que está na operação da biblioteca.
                          </span></div>
                        </>
                      )}

                      <div className="erp-field erp-c12"><span className="erp-field-hint">
                        Campos em branco herdam a operação da biblioteca — preencha só o que é diferente neste roteiro.
                      </span></div>
                    </div>
                  </div>

                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      Etapas — <span style={{ fontWeight: 400, opacity: .65 }}>
                        {etapasOrdenadas.length} · a quantidade cresce para trás quando há refugo
                      </span>
                    </div>
                    <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead><tr>
                          <th style={{ width: 50 }}>Seq</th><th>Operação</th><th>Centro / Fornecedor</th>
                          <th className="num">Preparação</th><th className="num">Máquina</th>
                          <th className="num">Refugo</th><th className="num">Entra</th>
                          <th style={{ width: 90 }}>Marcas</th><th style={{ width: 170 }}>Ações</th>
                        </tr></thead>
                        <tbody>
                          {etapasOrdenadas.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhuma etapa. Inclua a primeira acima.</td></tr>}
                          {etapasOrdenadas.map((ro) => {
                            const terceiro = ehTerceiro(ro, opOrigem(ro.operation_id));
                            return (
                              <tr key={ro.id ?? `${ro.sequence}-${ro.operation_id}`} className={terceiro ? "fsc-rot-terceiro" : undefined}>
                                <td style={{ fontWeight: 600 }}>{ro.sequence}</td>
                                <td>{ro.operation_name || opName(ro.operation_id)}</td>
                                <td>{terceiro
                                  ? <>fornecedor {ro.supplier_id ?? "—"}{ro.lead_time_days ? ` · ${ro.lead_time_days} dias` : ""}</>
                                  : (ro.work_center_name || ro.work_center_id || "—")}</td>
                                <td className="num">{ro.eff_time?.setup_hours ?? ro.effective_setup ?? "—"}</td>
                                <td className="num">{ro.eff_time?.run_hours ?? ro.effective_std_time ?? "—"}</td>
                                <td className="num">{(ro.effective_scrap_pct ?? 0) > 0 ? `${ro.effective_scrap_pct}%` : "—"}</td>
                                <td className="num">{pecas((ro.input_qty ?? 1) * loteNum)}</td>
                                <td>
                                  {terceiro && <span className="fsc-rot-flag">TERCEIRO</span>}{" "}
                                  {ro.inspection_required && <span className="fsc-rot-flag insp">INSP</span>}
                                </td>
                                <td>
                                  <button className="erp-btn erp-btn-sm" onClick={() => abrirDetalheDaEtapa(ro.id)} disabled={!ro.id}>Detalhar</button>{" "}
                                  <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => ro.id && pedirRemocaoEtapa(ro)} disabled={!ro.id}>Remover</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div></div>
                  </div>
                </>
              )
            )}

            {/* ═══ 4. RECURSOS E FERRAMENTAS (detalhe da etapa) ═══ */}
            {aba === "recursos" && (
              !etapaSelecionada ? (
                <div className="erp-fieldset"><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <span className="erp-field-hint">
                    Escolha uma etapa na aba “Etapas do roteiro” (botão Detalhar) para definir com que recursos
                    ela é feita: centros alternativos, ferramentas, documentos e inspeção.
                  </span>
                </div></div></div>
              ) : (
                <>
                  <div className="fsc-rot-cascata">
                    <span>Etapa</span>
                    <strong>seq {etapaSelecionada.sequence} · {etapaSelecionada.operation_name || opName(etapaSelecionada.operation_id)}</strong>
                    <span style={{ flex: 1 }} />
                    <button className="erp-btn erp-btn-sm" onClick={() => setAba("etapas")}>Voltar às etapas</button>
                  </div>

                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      Centros de trabalho alternativos — <span style={{ fontWeight: 400, opacity: .65 }}>
                        onde mais esta etapa pode rodar quando o centro principal está cheio
                      </span>
                    </div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c3"><label className="erp-label erp-req">Centro</label>
                        <LookupField value={Number(resForm.work_center_id) || undefined}
                          onChange={(c) => setResForm((r) => ({ ...r, work_center_id: c ? String(c) : "" }))}
                          loader={loadWorkCenters} allowManualCode={false} entityLabel="centro de trabalho" placeholder="Escolher centro…" clearable /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Prioridade</label>
                        <input className="erp-input num" type="number" min={1} value={resForm.priority}
                          onChange={(e) => setResForm((r) => ({ ...r, priority: e.target.value }))} />
                        <span className="erp-field-hint">1 = primeira escolha.</span></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Fator de tempo</label>
                        <input className="erp-input num" type="number" step="0.1" min="0.1" value={resForm.time_factor}
                          onChange={(e) => setResForm((r) => ({ ...r, time_factor: e.target.value }))} />
                        <span className="erp-field-hint">1,2 = 20% mais lento aqui.</span></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Principal</label>
                        <div className="erp-toggle-row">
                          <label className="erp-toggle">
                            <input type="checkbox" checked={resForm.is_primary}
                              onChange={(e) => setResForm((r) => ({ ...r, is_primary: e.target.checked }))} />
                            <div className="erp-toggle-track" /><div className="erp-toggle-thumb" />
                          </label>
                          <span className="erp-toggle-label">{resForm.is_primary ? "Usado por custo e CRP" : "Alternativo"}</span>
                        </div></div>
                      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                        <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addResource()} disabled={busy}>+ Centro</button></div>
                      <div className="erp-field erp-c12">
                        <table className="erp-grid">
                          <thead><tr><th>Centro</th><th className="num">Prioridade</th><th className="num">Fator</th><th>Principal</th><th style={{ width: 170 }}>Ações</th></tr></thead>
                          <tbody>
                            {resources.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Sem alternativas — a etapa só roda no centro da operação.</td></tr>}
                            {resources.map((r) => (
                              <tr key={r.id}>
                                <td>{r.work_center_name || r.work_center_id}</td>
                                <td className="num">{r.priority}</td>
                                <td className="num">{r.time_factor ?? 1}</td>
                                <td>{r.is_primary ? <span className="erp-badge ok">Sim</span> : ""}</td>
                                <td>
                                  {!r.is_primary && <><button className="erp-btn erp-btn-sm" onClick={() => void tornarPrimario(r)}>Tornar principal</button>{" "}</>}
                                  <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => void removeResource(r)}>Remover</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      Ferramentas — <span style={{ fontWeight: 400, opacity: .65 }}>a vida útil é consumida quando a etapa é concluída</span>
                    </div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label">Ferramenta</label>
                        <LookupField value={Number(toolIdInput) || undefined}
                          onChange={(c) => setToolIdInput(c ? String(c) : "")}
                          loader={loadTools} entityLabel="ferramenta" placeholder="Escolher ferramenta…" clearable /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Quantidade</label>
                        <input className="erp-input num" type="number" min="1" step="1" value={toolQtyInput}
                          onChange={(e) => setToolQtyInput(e.target.value)} />
                        <span className="erp-field-hint">Jogo de insertos, por exemplo.</span></div>
                      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                        <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addTool()} disabled={busy}>+ Ferramenta</button></div>
                      <div className="erp-field erp-c12">
                        <table className="erp-grid">
                          <thead><tr><th>Ferramenta</th><th>Descrição</th><th className="num">Qtd</th><th style={{ width: 90 }}>Ações</th></tr></thead>
                          <tbody>
                            {opTools.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma ferramenta vinculada.</td></tr>}
                            {opTools.map((t, i) => {
                              const lid = Number(t.id ?? t.ID ?? 0);
                              return (
                                <tr key={i}>
                                  <td>{String(t.tool_id ?? t.ToolID ?? "—")}</td>
                                  <td>{String(t.tool_name ?? t.name ?? "—")}</td>
                                  <td className="num">{String(t.qty_required ?? t.QtyRequired ?? 1)}</td>
                                  <td>{lid ? <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => void removeTool(lid)}>Remover</button> : "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      Documentos desta etapa — <span style={{ fontWeight: 400, opacity: .65 }}>
                        o desenho é do item; a instrução genérica fica na operação da biblioteca
                      </span>
                    </div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c2"><label className="erp-label">Tipo</label>
                        <select className="erp-input" value={docForm.kind} onChange={(e) => setDocForm((d) => ({ ...d, kind: e.target.value as DocumentKind }))}>
                          {DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                        </select></div>
                      <div className="erp-field erp-c4"><label className="erp-label erp-req">Título</label>
                        <input id="rot-doc-etapa-titulo" className="erp-input" value={docForm.title} placeholder="Desenho da bucha Ø50"
                          onChange={(e) => setDocForm((d) => ({ ...d, title: e.target.value }))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Referência</label>
                        <input className="erp-input" value={docForm.reference} placeholder="DES-BU-050 ou caminho/URL"
                          onChange={(e) => setDocForm((d) => ({ ...d, reference: e.target.value }))} /></div>
                      <div className="erp-field erp-c1"><label className="erp-label">Revisão</label>
                        <input className="erp-input" value={docForm.revision}
                          onChange={(e) => setDocForm((d) => ({ ...d, revision: e.target.value }))} /></div>
                      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                        <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addDocEtapa()} disabled={busy}>+ Documento</button></div>
                      <div className="erp-field erp-c12">
                        <table className="erp-grid">
                          <thead><tr><th>Tipo</th><th>Título</th><th>Referência</th><th>Rev.</th><th>Origem</th><th style={{ width: 90 }}>Ações</th></tr></thead>
                          <tbody>
                            {docsDaEtapa.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum documento nesta etapa.</td></tr>}
                            {docsDaEtapa.map((d) => (
                              <tr key={d.id}>
                                <td>{DOCUMENT_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind}</td>
                                <td style={{ fontWeight: 600 }}>{d.title}</td>
                                <td>{d.reference || "—"}</td><td>{d.revision || "—"}</td>
                                <td>{d.is_step_level
                                  ? <span className="erp-badge erp-badge-green">Desta etapa</span>
                                  : <span className="erp-badge erp-badge-gray">Da operação</span>}</td>
                                <td>{d.is_step_level
                                  ? <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => d.id && void removerDoc(d.id)}>Remover</button>
                                  : <span className="erp-field-hint">edite na biblioteca</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">
                      Inspeção nesta etapa — <span style={{ fontWeight: 400, opacity: .65 }}>
                        {etapaSelecionada.inspection_required
                          ? "a etapa está marcada: a ordem abre o registro de inspeção ao chegar aqui"
                          : "marque a etapa como ponto de inspeção para a ordem abrir o registro"}
                      </span>
                    </div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c2"><label className="erp-label">Onde</label>
                        <select className="erp-input" value={inspForm.point_type}
                          onChange={(e) => setInspForm((f) => ({ ...f, point_type: e.target.value as InspectionPoint }))}>
                          {INSPECTION_POINTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select></div>
                      <div className="erp-field erp-c5"><label htmlFor="rot-insp-desc" className="erp-label erp-req">O que inspecionar</label>
                        <input id="rot-insp-desc" className="erp-input" value={inspForm.description} placeholder="Dureza superficial após cementação"
                          onChange={(e) => setInspForm((f) => ({ ...f, description: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label htmlFor="rot-insp-amostra" className="erp-label">Amostra</label>
                        <input id="rot-insp-amostra" className="erp-input num" type="number" min="1" step="1" value={inspForm.sample_size}
                          onChange={(e) => setInspForm((f) => ({ ...f, sample_size: e.target.value }))} />
                        <span className="erp-field-hint">Peças por lote.</span></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Aceitação (%)</label>
                        <input className="erp-input num" type="number" min="0" max="100" step="0.1" value={inspForm.acceptance_level}
                          onChange={(e) => setInspForm((f) => ({ ...f, acceptance_level: e.target.value }))} />
                        <span className="erp-field-hint">Defeituosas toleradas.</span></div>
                      <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}>
                        <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addInspecao()} disabled={busy}>+</button></div>
                      <div className="erp-field erp-c12">
                        <table className="erp-grid">
                          <thead><tr><th>Onde</th><th>O que inspecionar</th><th className="num">Amostra</th><th className="num">Aceitação</th><th className="num">Características</th><th style={{ width: 90 }}>Ações</th></tr></thead>
                          <tbody>
                            {inspDaEtapa.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum plano de inspeção nesta etapa.</td></tr>}
                            {inspDaEtapa.map((i) => (
                              <tr key={i.id}>
                                <td>{INSPECTION_POINTS.find((p) => p.value === i.point_type)?.label ?? i.point_type}</td>
                                <td style={{ fontWeight: 600 }}>{i.description}</td>
                                <td className="num">{i.sample_size}</td>
                                <td className="num">{i.acceptance_level}%</td>
                                <td className="num">{i.characteristic_count ?? 0}</td>
                                <td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => i.id && void removerInspecao(i.id)}>Remover</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {etapaSelecionada.inspection_required && inspDaEtapa.length === 0 && (
                        <div className="erp-field erp-c12"><span className="erp-field-hint" style={{ color: "var(--v-warn)" }}>
                          A etapa está marcada como ponto de inspeção mas ainda não tem plano.
                          Sem plano a ordem não abre registro — não há o que conferir.
                        </span></div>
                      )}
                    </div>
                  </div>
                </>
              )
            )}

            {/* ═══ 5. REDE DE DEPENDÊNCIAS ═══ */}
            {aba === "rede" && (
              !detail?.route ? (
                <div className="erp-fieldset"><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <span className="erp-field-hint">Abra um roteiro para definir o que depende de quê.</span>
                </div></div></div>
              ) : (
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Rede de dependências — <span style={{ fontWeight: 400, opacity: .65 }}>
                      sem nenhuma, as etapas rodam em sequência (10 → 20 → 30)
                    </span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c4"><label className="erp-label erp-req">Predecessora</label>
                      <select className="erp-input" value={edgeForm.predecessor_id} onChange={(e) => setEF("predecessor_id", Number(e.target.value))}>
                        <option value={0}>— selecione —</option>
                        {etapasOrdenadas.map((ro) => <option key={ro.id} value={ro.id}>{roLabel(ro)}</option>)}
                      </select></div>
                    <div className="erp-field erp-c4"><label className="erp-label erp-req">Sucessora</label>
                      <select className="erp-input" value={edgeForm.successor_id} onChange={(e) => setEF("successor_id", Number(e.target.value))}>
                        <option value={0}>— selecione —</option>
                        {etapasOrdenadas.map((ro) => <option key={ro.id} value={ro.id}>{roLabel(ro)}</option>)}
                      </select></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Sobreposição (%)</label>
                      <input className="erp-input num" type="number" min={0} max={100} value={edgeForm.overlap_pct}
                        onChange={(e) => setEF("overlap_pct", Number(e.target.value))} />
                      <span className="erp-field-hint">Quanto da sucessora começa antes da predecessora terminar.</span></div>
                    <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addEdgeFn()} disabled={busy}>+</button></div>
                    <div className="erp-field erp-c12"><span className="erp-field-hint">
                      A sobreposição só vale em centro automático. Onde o operador fica na máquina até o fim,
                      o cálculo ignora a sobreposição — ele não larga a peça no meio.
                    </span></div>
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead><tr><th>Predecessora</th><th>Sucessora</th><th className="num">Sobreposição</th><th style={{ width: 90 }}>Ações</th></tr></thead>
                        <tbody>
                          {detail.edges.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma dependência — as etapas seguem a ordem das sequências.</td></tr>}
                          {detail.edges.map((ed, i) => {
                            const p = etapasOrdenadas.find((o) => o.id === ed.predecessor_id);
                            const s = etapasOrdenadas.find((o) => o.id === ed.successor_id);
                            return (
                              <tr key={ed.id ?? i}>
                                <td>{p ? roLabel(p) : ed.predecessor_id}</td>
                                <td>{s ? roLabel(s) : ed.successor_id}</td>
                                <td className="num">{ed.overlap_pct}%</td>
                                <td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => void removeEdgeFn(ed)}>Remover</button></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* ═══ 6. TEMPO E CUSTO DO LOTE ═══ */}
            {aba === "custo" && (
              !detail?.route || etapasOrdenadas.length === 0 ? (
                <div className="erp-fieldset"><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <span className="erp-field-hint">Abra um roteiro com etapas para calcular tempo e custo.</span>
                </div></div></div>
              ) : (
                <>
                  <div className="fsc-rot-cascata">
                    <span>Lote</span>
                    <input id="rot-lote" className="erp-input num" style={{ width: 90 }} type="number" min={1} value={lote}
                      onChange={(e) => setLote(e.target.value)} aria-label="Tamanho do lote" />
                    <span>peças boas</span>
                    <button className="erp-btn erp-btn-primary erp-btn-sm" onClick={() => void calcularLeadTime()} disabled={busy}>Calcular prazo</button>
                    <span style={{ flex: 1 }} />
                    {leadTime && (
                      <>
                        <span>trabalho interno: <strong>{pecas(leadTime.horas, 1)} h</strong> ≈ {pecas(leadTime.horas / 8, 1)} dias úteis</span>
                        {leadTime.diasTerceiro > 0 && <span>no terceiro: <strong>{leadTime.diasTerceiro} dias corridos</strong></span>}
                      </>
                    )}
                  </div>
                  {leadTime && leadTime.diasTerceiro > 0 && (
                    <div className="erp-feedback info">
                      São dois relógios. As horas são de trabalho nosso (8 h por dia útil); os {leadTime.diasTerceiro} dias
                      correm no calendário do fornecedor, fim de semana incluído. O item só fica pronto depois dos dois.
                    </div>
                  )}
                  <RoteiroCustoPanel
                    operacoes={detail.operations}
                    nomeDaOperacao={opName}
                    embutido />
                </>
              )
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        aberto={confirmacao !== null}
        titulo={confirmacao?.titulo ?? ""}
        mensagem={confirmacao?.mensagem ?? ""}
        assunto={confirmacao?.assunto}
        rotuloConfirmar={confirmacao?.rotulo ?? "Confirmar"}
        onCancelar={() => setConfirmacao(null)}
        onConfirmar={() => {
          const pendente = confirmacao;
          setConfirmacao(null);
          if (pendente) void wrap(pendente.acao);
        }}
      />

      <footer className="erp-statusbar">
        <div className="erp-status-item">Operações: <strong>{ops.length}</strong></div>
        <div className="erp-status-item">Roteiros: <strong>{routes.length}</strong></div>
        {detail?.route && <div className="erp-status-item">Etapas: <strong>{etapasOrdenadas.length}</strong></div>}
        {detail?.route && temRefugo && <div className="erp-status-item">Soltar {pecas(soltar)} para entregar {loteNum}</div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
