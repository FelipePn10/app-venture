import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type OperationDTO, type RouteDTO, type RouteOperationDTO, type RouteDetail, type RouteReadiness,
  listOperations, listRoutes, listRouteTemplates, createRoute, updateRoute, deleteRoute, reactivateRoute,
  getRouteDetail, removeRouteOperation, getLeadTime, getRouteReadiness, copyRoute,
} from "@/services/manufacturingRoutingService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { RoteiroCustoPanel } from "./roteiro/RoteiroCustoPanel";
import { BibliotecaOperacoes } from "./roteiro/BibliotecaOperacoes";
import { EtapaEditor } from "./roteiro/EtapaEditor";
import { FluxoDoRoteiro } from "./roteiro/FluxoDoRoteiro";
import { RedeDeDependencias, MateriaisPorEtapa, PadraoVersusReal } from "./roteiro/AbasDoRoteiro";
import { type Feedback, pecas, num, duracao } from "./roteiro/roteiroUtils";

/**
 * Roteiro de fabricação — VENT0202, a única tela de roteiro. Três modos, na
 * ordem em que a engenharia trabalha:
 *
 *   Roteiros do item   o processo de UM item: alternativas, vigência, faixa de
 *                      lote, etapas, dependências, materiais por etapa, tempo,
 *                      custo e o tempo real apontado.
 *   Modelos            roteiros sem item ("chapa cortada, dobrada e pintada"),
 *                      que viram o roteiro de um item novo por cópia.
 *   Biblioteca         o vocabulário de operações reaproveitado em tudo.
 *
 * O roteiro descreve como UM item é feito. A cadeia de itens (a balança precisa
 * da bucha) é da estrutura; o MRP junta as duas.
 */
type Modo = "item" | "modelos" | "biblioteca";
type Aba = "etapas" | "rede" | "materiais" | "custo" | "real";
type Confirmacao = { titulo: string; mensagem: string; assunto?: string; rotulo: string; acao: () => Promise<void> };

const ROTEIRO_VAZIO: RouteDTO = { item_code: "", description: "", alternative: 1, is_standard: true };

export function RoteiroFabricacaoPage(): JSX.Element {
  const [modo, setModo] = useState<Modo>("item");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);

  const [ops, setOps] = useState<OperationDTO[]>([]);
  const [itemCode, setItemCode] = useState("");
  const [rotas, setRotas] = useState<RouteDTO[]>([]);
  const [modelos, setModelos] = useState<RouteDTO[]>([]);
  const [detail, setDetail] = useState<RouteDetail | null>(null);
  const [cab, setCab] = useState<RouteDTO>(ROTEIRO_VAZIO);
  const [aba, setAba] = useState<Aba>("etapas");
  const [lote, setLote] = useState("100");
  const [prontidao, setProntidao] = useState<RouteReadiness | null>(null);
  /** Pendências recolhidas: a lista longa empurrava as etapas para fora da tela. */
  const [verTudo, setVerTudo] = useState(false);
  const [prazo, setPrazo] = useState<{ horas: number; dias: number; caminho: string } | null>(null);

  const [editor, setEditor] = useState<{ etapa?: RouteOperationDTO } | null>(null);
  const [novoRoteiro, setNovoRoteiro] = useState<"vazio" | "modelo" | null>(null);
  const [copiar, setCopiar] = useState(false);

  const loteNum = Math.max(1, Number(lote) || 1);
  const ehModelo = !!detail?.route.is_template;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  };

  const carregarOps = useCallback(async () => { setOps(await listOperations()); }, []);
  const carregarModelos = useCallback(async () => { setModelos(await listRouteTemplates(true)); }, []);
  useEffect(() => { void run(async () => { await Promise.all([carregarOps(), carregarModelos()]); }); }, [carregarOps, carregarModelos]); // eslint-disable-line react-hooks/exhaustive-deps

  const carregarRotas = useCallback(async (codigo: string) => {
    if (!codigo) { setRotas([]); return; }
    setRotas(await listRoutes(codigo, true));
  }, []);

  const abrir = useCallback(async (id: number, manterAba = false) => {
    const d = await getRouteDetail(id);
    setDetail(d);
    setCab({ ...d.route });
    setPrazo(null);
    if (!manterAba) { setAba("etapas"); setVerTudo(false); }
    try { setProntidao(await getRouteReadiness(id)); } catch { setProntidao(null); }
  }, []);
  const recarregar = useCallback(async () => { if (detail?.route.id) await abrir(detail.route.id, true); }, [detail?.route.id, abrir]);

  const trocarModo = (m: Modo) => { setModo(m); setDetail(null); setFeedback(null); setEditor(null); };

  const etapas = useMemo(() => [...(detail?.operations ?? [])].sort((a, b) => a.sequence - b.sequence), [detail]);
  const temRefugo = etapas.some((o) => (o.effective_scrap_pct ?? 0) > 0);
  const soltar = (detail?.release_qty ?? 1) * loteNum;
  const proximaSeq = (etapas[etapas.length - 1]?.sequence ?? 0) + 10;

  // ── Cabeçalho do roteiro ─────────────────────────────────────────────────
  const salvarCabecalho = () => run(async () => {
    if (!detail?.route.id) return;
    if (ehModelo && !cab.description?.trim()) { setFeedback({ type: "error", message: "Dê um nome ao modelo." }); return; }
    if (cab.lot_min && cab.lot_max && cab.lot_max < cab.lot_min) { setFeedback({ type: "error", message: "O lote máximo não pode ser menor que o mínimo." }); return; }
    await updateRoute(detail.route.id, {
      description: cab.description, situation: cab.situation || "APROVADA", is_standard: ehModelo ? false : cab.is_standard,
      valid_from: cab.valid_from?.slice(0, 10) || undefined, valid_to: cab.valid_to?.slice(0, 10) || undefined,
      lot_min: cab.lot_min || undefined, lot_max: cab.lot_max || undefined,
    });
    await abrir(detail.route.id, true);
    if (ehModelo) await carregarModelos(); else await carregarRotas(itemCode);
    setFeedback({ type: "success", message: cab.is_standard && !ehModelo
      ? "Roteiro salvo como padrão. Outro padrão com vigência sobreposta deixa de ser o padrão."
      : "Roteiro salvo." });
  });

  const desativar = (r: RouteDTO) => setConfirmacao({
    titulo: r.is_template ? "Desativar modelo" : "Desativar roteiro",
    mensagem: r.is_template
      ? "O modelo sai da lista de modelos. Roteiros já criados a partir dele não mudam."
      : "O roteiro deixa de ser usado pelo MRP e pelo CRP no próximo planejamento. Ordens já geradas mantêm as etapas que receberam.",
    assunto: `${r.description || "Roteiro"}${r.is_template ? "" : ` · alternativa ${r.alternative}`}`,
    rotulo: "Desativar",
    acao: async () => {
      await deleteRoute(r.id!);
      if (detail?.route.id === r.id) setDetail(null);
      if (r.is_template) await carregarModelos(); else await carregarRotas(itemCode);
      setFeedback({ type: "success", message: "Desativado." });
    },
  });

  const reativar = (r: RouteDTO) => run(async () => {
    const volta = await reactivateRoute(r.id!);
    if (r.is_template) await carregarModelos(); else await carregarRotas(itemCode);
    setFeedback({ type: "success", message: r.is_standard && !volta.is_standard
      ? "Reativado como alternativo: outro roteiro do item já é o padrão." : "Reativado." });
  });

  const removerEtapa = (ro: RouteOperationDTO) => setConfirmacao({
    titulo: "Remover etapa do roteiro",
    mensagem: "A etapa sai do roteiro e do cálculo de prazo, custo e capacidade. Quem dependia dela passa a depender da etapa anterior a ela — a rede não se parte.",
    assunto: `${ro.sequence} · ${ro.operation_name}`,
    rotulo: "Remover",
    acao: async () => { await removeRouteOperation(detail!.route.id!, ro.id!); await recarregar(); setFeedback({ type: "success", message: "Etapa removida." }); },
  });

  const calcularPrazo = () => run(async () => {
    if (!detail?.route.id) return;
    const r = await getLeadTime(detail.route.id, loteNum);
    const caminho = r.critical_path.map((id) => etapas.find((o) => o.id === id)?.sequence ?? `#${id}`).join(" → ");
    setPrazo({ horas: r.lead_time_hours, dias: r.subcontract_days, caminho });
  });

  const lista = modo === "modelos" ? modelos : rotas;
  const abasVisiveis: { id: Aba; label: string }[] = [
    { id: "etapas", label: `Etapas${etapas.length ? ` (${etapas.length})` : ""}` },
    { id: "rede", label: "Dependências" },
    ...(!ehModelo ? [{ id: "materiais" as Aba, label: "Materiais por etapa" }] : []),
    { id: "custo", label: "Tempo e custo" },
    ...(!ehModelo ? [{ id: "real" as Aba, label: "Padrão × real" }] : []),
  ];

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Roteiro de Fabricação</span><span className="erp-crumb-code">VENT0202</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        {detail?.route && (
          <span className="erp-titlebar-meta">
            {ehModelo ? `modelo ${detail.route.code ?? detail.route.id}` : `roteiro ${detail.route.code ?? detail.route.id} · item ${detail.route.item_code}`}
          </span>
        )}
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup rot-modos" role="tablist" aria-label="O que você quer fazer">
          <button role="tab" aria-selected={modo === "item"} className={`erp-chip${modo === "item" ? " active" : ""}`} onClick={() => trocarModo("item")}>Roteiros do item</button>
          <button role="tab" aria-selected={modo === "modelos"} className={`erp-chip${modo === "modelos" ? " active" : ""}`} onClick={() => trocarModo("modelos")}>Modelos</button>
          <button role="tab" aria-selected={modo === "biblioteca"} className={`erp-chip${modo === "biblioteca" ? " active" : ""}`} onClick={() => trocarModo("biblioteca")}>Biblioteca de operações</button>
        </div>
        {modo === "item" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Item</span>
            <div className="erp-tlookup" style={{ minWidth: 320 }}>
              <LookupField value={itemCode || undefined} loader={loadItems} entityLabel="item" placeholder="Buscar o item pelo código ou nome"
                onChange={(c) => { const v = String(c ?? ""); setItemCode(v); setDetail(null); void run(() => carregarRotas(v)); }} />
            </div>
          </div>
        )}
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VENT0202 — Roteiro de Fabricação" filename="vent0202" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`} style={{ margin: "8px 12px 0" }}>{feedback.message}</div>}

        {modo === "biblioteca" ? (
          <BibliotecaOperacoes ops={ops} recarregar={carregarOps} setFeedback={setFeedback} pedirConfirmacao={setConfirmacao} />
        ) : (
          <div className="erp-main">
            <aside className="erp-list-panel">
              <div className="erp-panel-head">
                <span className="erp-panel-title">{modo === "modelos" ? "Modelos" : "Roteiros do item"}</span>
                <span className="erp-count">{lista.filter((r) => r.is_active !== false).length}</span>
                <span className="erp-panel-head-spacer" />
              </div>
              {(modo === "modelos" || itemCode) && (
                <div className="rot-lista-acoes">
                  {modo === "modelos" ? (
                    <button className="erp-btn erp-btn-new erp-btn-sm" disabled={busy} onClick={() => void run(async () => {
                      // Modelo não tem item: o corpo vai sem item_code (vazio é recusado).
                      const m = await createRoute({ alternative: 1, is_template: true, is_standard: false, description: "Novo modelo" } as RouteDTO);
                      await carregarModelos(); if (m.id) await abrir(m.id);
                      setFeedback({ type: "info", message: "Modelo criado. Dê um nome a ele no cabeçalho e inclua as etapas." });
                    })}>+ Novo modelo</button>
                  ) : (
                    <>
                      <button className="erp-btn erp-btn-new erp-btn-sm" disabled={busy} onClick={() => setNovoRoteiro("vazio")}>+ Novo roteiro</button>
                      <button className="erp-btn erp-btn-sm" disabled={busy || modelos.filter((m) => m.is_active !== false).length === 0}
                        title={modelos.length === 0 ? "Nenhum modelo cadastrado ainda" : undefined}
                        onClick={() => setNovoRoteiro("modelo")}>A partir de modelo</button>
                    </>
                  )}
                </div>
              )}
              <div className="erp-list">
                {modo === "item" && !itemCode && <div className="erp-list-empty">Escolha o item na barra acima para ver e criar os roteiros dele.</div>}
                {(modo === "modelos" || itemCode) && lista.length === 0 && (
                  <div className="erp-list-empty">
                    {modo === "modelos"
                      ? <>Nenhum modelo.<br />Um modelo é a sequência típica de uma família de peças, usada para criar roteiros por cópia.</>
                      : <>Este item ainda não tem roteiro.<br />Crie do zero ou a partir de um modelo.</>}
                  </div>
                )}
                {lista.map((r) => (
                  <div key={r.id} className={`erp-list-row${detail?.route.id === r.id ? " sel" : ""}`} style={r.is_active === false ? { opacity: 0.55 } : undefined}
                    role="button" tabIndex={0} onClick={() => r.id && void run(() => abrir(r.id!))}
                    onKeyDown={(e) => { if (e.key === "Enter" && r.id) void run(() => abrir(r.id!)); }}>
                    <span className="erp-list-code">{r.is_template ? (r.code ?? r.id) : `Alt. ${r.alternative}`}</span>
                    <span style={{ fontWeight: 600, fontSize: 12.5 }}>{r.description || "Sem descrição"}</span>
                    <span>
                      {r.is_active === false ? <span className="erp-badge erp-badge-gray">Desativado</span>
                        : r.is_standard ? <span className="erp-badge erp-badge-green">Padrão</span> : null}
                    </span>
                    {!r.is_template && (
                      <div className="erp-list-meta">
                        <span className="erp-list-sub">
                          {r.mask ? `máscara ${r.mask} · ` : ""}
                          {r.valid_from || r.valid_to ? `vigência ${r.valid_from?.slice(0, 10) ?? "…"} a ${r.valid_to?.slice(0, 10) ?? "sem fim"}` : "sempre vigente"}
                          {r.lot_min || r.lot_max ? ` · lote ${r.lot_min ? `≥ ${num(r.lot_min)}` : ""}${r.lot_min && r.lot_max ? " e " : ""}${r.lot_max ? `≤ ${num(r.lot_max)}` : ""}` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </aside>

            <section className="erp-detail-panel">
              {!detail ? (
                <div className="erp-list-empty" style={{ paddingTop: 80 }}>
                  {modo === "modelos" ? "Abra um modelo à esquerda ou crie um novo." : itemCode ? "Abra um roteiro à esquerda." : "Comece escolhendo o item."}
                </div>
              ) : (
                <>
                  <div className="rot-cabecalho">
                    <div className="erp-fieldset" style={{ margin: 0 }}>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c5"><label htmlFor="rot-desc" className={`erp-label${ehModelo ? " erp-req" : ""}`}>{ehModelo ? "Nome do modelo" : "Descrição"}</label>
                          <input id="rot-desc" className="erp-input" value={cab.description ?? ""} placeholder={ehModelo ? "Chapa cortada, dobrada e pintada" : "Processo padrão"}
                            onChange={(e) => setCab((c) => ({ ...c, description: e.target.value }))} /></div>
                        {!ehModelo && (
                          <>
                            <div className="erp-field erp-c2"><label className="erp-label">
                                Padrão (MRP/CRP) <span className="rot-ajuda" tabIndex={0} role="img" aria-label="O que é o roteiro padrão"
                                  title="O roteiro padrão é o que a ordem de produção, o MRP, o CRP e o custo padrão usam para este item quando ninguém escolhe outro. Ele só perde para um roteiro mais específico: o da máscara da ordem ou o alternativo cuja faixa de lote contém a quantidade. Há um padrão por período — marcar este tira o “padrão” do outro roteiro com vigência sobreposta.">?</span></label>
                              <div className="erp-toggle-row">
                                <label className="erp-toggle">
                                  <input type="checkbox" checked={!!cab.is_standard} onChange={(e) => setCab((c) => ({ ...c, is_standard: e.target.checked }))} />
                                  <div className="erp-toggle-track" /><div className="erp-toggle-thumb" />
                                </label>
                                <span className="erp-toggle-label">{cab.is_standard ? "Sim — usado quando ninguém escolhe" : "Não — alternativo"}</span>
                              </div></div>
                            <div className="erp-field erp-c2"><label className="erp-label">Vigente de</label>
                              <input className="erp-input" type="date" value={(cab.valid_from ?? "").slice(0, 10)} onChange={(e) => setCab((c) => ({ ...c, valid_from: e.target.value || undefined }))} /></div>
                            <div className="erp-field erp-c2"><label className="erp-label">até</label>
                              <input className="erp-input" type="date" value={(cab.valid_to ?? "").slice(0, 10)} onChange={(e) => setCab((c) => ({ ...c, valid_to: e.target.value || undefined }))} /></div>
                            <div className="erp-field erp-c1"><label className="erp-label">Alt.</label>
                              <input className="erp-input num" value={cab.alternative} disabled /></div>
                            <div className="erp-field erp-c2"><label className="erp-label">Lote a partir de</label>
                              <input className="erp-input num" type="number" min={0} step="any" value={cab.lot_min ?? ""} placeholder="qualquer"
                                onChange={(e) => setCab((c) => ({ ...c, lot_min: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                            <div className="erp-field erp-c2"><label className="erp-label">Lote até</label>
                              <input className="erp-input num" type="number" min={0} step="any" value={cab.lot_max ?? ""} placeholder="qualquer"
                                onChange={(e) => setCab((c) => ({ ...c, lot_max: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                            <div className="erp-field erp-c4"><span className="erp-field-hint">
                              {cab.mask ? <>Máscara <strong>{cab.mask}</strong>. </> : "Vale para todas as máscaras do item que não têm roteiro próprio. "}
                              Com faixa de lote, o alternativo cuja faixa contém a quantidade da ordem vence o padrão.
                            </span></div>
                          </>
                        )}
                        <div className="erp-field" style={{ gridColumn: ehModelo ? "span 7" : "span 4", justifyContent: "flex-end", flexDirection: "row", alignItems: "flex-end", gap: 6, display: "flex" }}>
                          <button className="erp-btn erp-btn-primary" onClick={() => void salvarCabecalho()} disabled={busy}>Salvar</button>
                          <button className="erp-btn" onClick={() => setCopiar(true)} disabled={busy || etapas.length === 0}
                            title={etapas.length === 0 ? "Inclua etapas antes de copiar" : undefined}>{ehModelo ? "Usar em um item" : "Copiar"}</button>
                          {detail.route.is_active === false
                            ? <button className="erp-btn" onClick={() => void reativar(detail.route)} disabled={busy}>Reativar</button>
                            : <button className="erp-btn erp-btn-danger" onClick={() => desativar(detail.route)} disabled={busy}>Desativar</button>}
                        </div>
                      </div>
                    </div>

                    {prontidao && (
                      <div className={`fsc-rot-prontidao${!prontidao.ready ? " falha" : prontidao.warnings.length ? " atencao" : ""}`}>
                        <strong>
                          {ehModelo ? "Modelo: não é planejado — vale como ponto de partida"
                            : prontidao.ready ? (prontidao.warnings.length ? "Pode ser planejado, com ressalvas" : "Pronto para o planejamento")
                              : `Ainda não pode ser planejado — ${prontidao.issues.length} pendência(s)`}
                        </strong>
                        {(() => {
                          const avisos = prontidao.warnings.filter((w) => !ehModelo || !w.startsWith("roteiro-modelo"));
                          const total = prontidao.issues.length + avisos.length;
                          const pend = verTudo ? prontidao.issues : prontidao.issues.slice(0, 2);
                          const avs = verTudo ? avisos : prontidao.issues.length >= 2 ? [] : avisos.slice(0, 2 - prontidao.issues.length);
                          return (
                            <>
                              {pend.length > 0 && <ul>{pend.map((t) => <li key={t}>{t}</li>)}</ul>}
                              {avs.length > 0 && <ul className="aviso">{avs.map((t) => <li key={t}>{t}</li>)}</ul>}
                              {total > pend.length + avs.length && (
                                <button className="erp-btn erp-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setVerTudo(true)}>
                                  Ver todas ({total})
                                </button>
                              )}
                              {verTudo && total > 2 && (
                                <button className="erp-btn erp-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setVerTudo(false)}>Recolher</button>
                              )}
                            </>
                          );
                        })()}
                        {verTudo && prontidao.work_centers.length > 0 && (
                          <div className="fsc-rot-centros">
                            {prontidao.work_centers.map((c) => (
                              <span key={c.work_center_id} className={c.has_machine && c.has_rate ? "ok" : "pendente"}>
                                {c.work_center_name || `Centro ${c.work_center_id}`} · {c.has_machine ? "máquina apta" : "sem máquina apta"} · {c.has_rate ? `${c.hourly_rate.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/h` : "sem tarifa"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="erp-tabs">
                    {abasVisiveis.map((a) => (
                      <button key={a.id} className={`erp-tab ${aba === a.id ? "active" : ""}`} onClick={() => setAba(a.id)}>{a.label}</button>
                    ))}
                    <span style={{ flex: 1 }} />
                    <span className="rot-lote">
                      Lote <input className="erp-input num" style={{ width: 80, height: 26 }} type="number" min={1} value={lote}
                        onChange={(e) => setLote(e.target.value)} aria-label="Tamanho do lote para simular" /> peças boas
                      {temRefugo && <> · soltar <strong>{pecas(soltar)}</strong></>}
                    </span>
                  </div>

                  <div className="erp-detail-body">
                    {aba === "etapas" && (
                      <FluxoDoRoteiro detail={detail} etapas={etapas} ops={ops} lote={loteNum}
                        onAbrir={(ro) => setEditor({ etapa: ro })} onNova={() => setEditor({})} onRemover={removerEtapa} />
                    )}
                    {aba === "rede" && <RedeDeDependencias detail={detail} etapas={etapas} recarregar={recarregar} setFeedback={setFeedback} />}
                    {aba === "materiais" && detail.route.id && <MateriaisPorEtapa routeId={detail.route.id} etapas={etapas} setFeedback={setFeedback} />}
                    {aba === "real" && detail.route.id && <PadraoVersusReal routeId={detail.route.id} etapas={etapas} ops={ops} recarregar={recarregar} setFeedback={setFeedback} />}
                    {aba === "custo" && (
                      etapas.length === 0 ? <div className="erp-list-empty">Inclua etapas para calcular prazo e custo.</div> : (
                        <>
                          <div className="fsc-rot-cascata">
                            <button className="erp-btn erp-btn-primary erp-btn-sm" onClick={() => void calcularPrazo()} disabled={busy}>Calcular prazo de {num(loteNum, 0)} peça(s)</button>
                            {prazo && (
                              <>
                                <span>trabalho nosso: <strong>{duracao(prazo.horas)}</strong> ≈ {num(prazo.horas / 8, 1)} dias úteis</span>
                                {prazo.dias > 0 && <span>no terceiro: <strong>{prazo.dias} dias corridos</strong></span>}
                                <span>caminho crítico: <strong>{prazo.caminho || "—"}</strong></span>
                              </>
                            )}
                          </div>
                          {prazo && prazo.dias > 0 && (
                            <p className="erp-note">São dois relógios: as horas são de trabalho nosso (8 h por dia útil) e os {prazo.dias} dias correm no calendário do fornecedor. O item só fica pronto depois dos dois — e o MRP já soma os dois no prazo.</p>
                          )}
                          <RoteiroCustoPanel operacoes={detail.operations} nomeDaOperacao={(id) => ops.find((o) => o.id === id)?.name ?? `Op ${id}`} embutido />
                        </>
                      )
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>

      {editor && detail?.route.id && (
        <EtapaEditor routeId={detail.route.id} etapa={editor.etapa} proximaSequencia={proximaSeq} ops={ops}
          documentos={detail.documents} inspecoes={detail.inspections} ehModelo={ehModelo}
          onClose={() => setEditor(null)}
          onSaved={async (mensagem, id) => {
            const d = await getRouteDetail(detail.route.id!);
            setDetail(d);
            try { setProntidao(await getRouteReadiness(detail.route.id!)); } catch { /* conferência é complemento */ }
            setFeedback({ type: "success", message: mensagem });
            // Só atualiza o painel se ele ainda estiver aberto: quem salva e
            // fecha logo em seguida não pode ver o painel reabrir sozinho
            // quando o recarregamento termina.
            if (id) setEditor((atual) => (atual ? { etapa: d.operations.find((o) => o.id === id) } : null));
          }} />
      )}

      {novoRoteiro && (
        <NovoRoteiroDialog modo={novoRoteiro} itemCode={itemCode} rotas={rotas} modelos={modelos.filter((m) => m.is_active !== false)}
          onClose={() => setNovoRoteiro(null)}
          onCriado={async (id, msg) => { setNovoRoteiro(null); await carregarRotas(itemCode); await abrir(id); setFeedback({ type: "success", message: msg }); }} />
      )}

      {copiar && detail?.route.id && (
        <CopiarDialog origem={detail.route} onClose={() => setCopiar(false)}
          onCopiado={async (msg) => { setCopiar(false); await carregarModelos(); if (itemCode) await carregarRotas(itemCode); setFeedback({ type: "success", message: msg }); }} />
      )}

      <ConfirmDialog
        aberto={confirmacao !== null}
        titulo={confirmacao?.titulo ?? ""}
        mensagem={confirmacao?.mensagem ?? ""}
        assunto={confirmacao?.assunto}
        rotuloConfirmar={confirmacao?.rotulo ?? "Confirmar"}
        onCancelar={() => setConfirmacao(null)}
        onConfirmar={() => { const p = confirmacao; setConfirmacao(null); if (p) void run(p.acao); }}
      />

      <footer className="erp-statusbar">
        <div className="erp-status-item">Operações: <strong>{ops.filter((o) => o.is_active !== false).length}</strong></div>
        <div className="erp-status-item">Modelos: <strong>{modelos.filter((m) => m.is_active !== false).length}</strong></div>
        {detail?.route && <div className="erp-status-item">Etapas: <strong>{etapas.length}</strong></div>}
        {detail?.route && temRefugo && <div className="erp-status-item">Soltar {pecas(soltar)} para entregar {loteNum}</div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

const resumoCopia = (c: { steps: number; dependencies: number; resources: number; tools: number; documents: number; inspections: number }) =>
  [`${c.steps} etapa(s)`, c.dependencies && `${c.dependencies} dependência(s)`, c.resources && `${c.resources} centro(s)`,
    c.tools && `${c.tools} ferramenta(s)`, c.documents && `${c.documents} documento(s)`, c.inspections && `${c.inspections} plano(s) de inspeção`]
    .filter(Boolean).join(", ");

/** Novo roteiro do item: do zero ou a partir de um modelo. */
function NovoRoteiroDialog({ modo, itemCode, rotas, modelos, onClose, onCriado }: {
  modo: "vazio" | "modelo"; itemCode: string; rotas: RouteDTO[]; modelos: RouteDTO[];
  onClose: () => void; onCriado: (id: number, msg: string) => Promise<void>;
}): JSX.Element {
  useEscapeToClose(onClose);
  const livre = Math.max(0, ...rotas.map((r) => r.alternative)) + 1;
  const [f, setF] = useState({ description: "", alternative: livre, mask: "", is_standard: rotas.filter((r) => r.is_active !== false).length === 0, modelo: modelos[0]?.id ?? 0 });
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const criar = async () => {
    setBusy(true); setErro("");
    try {
      if (modo === "modelo") {
        if (!f.modelo) { setErro("Escolha o modelo."); return; }
        const r = await copyRoute(f.modelo, { item_code: itemCode, alternative: f.alternative, mask: f.mask || undefined, description: f.description || undefined, is_standard: f.is_standard });
        await onCriado(r.route.id!, `Roteiro criado a partir do modelo: ${resumoCopia(r.copied)}. Ajuste o que for diferente neste item.`);
      } else {
        const r = await createRoute({ item_code: itemCode, description: f.description || "Processo padrão", alternative: f.alternative, mask: f.mask || undefined, is_standard: f.is_standard });
        await onCriado(r.id!, "Roteiro criado. Agora inclua as etapas.");
      }
    } catch (e) { setErro(errMessage(e)); } finally { setBusy(false); }
  };
  return (
    <div className="erp-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="erp-modal" style={{ width: "min(720px, 96vw)" }} role="dialog" aria-modal="true" aria-label="Novo roteiro">
        <div className="erp-modal-head"><strong>{modo === "modelo" ? "Novo roteiro a partir de um modelo" : "Novo roteiro"}</strong></div>
        <div className="erp-modal-body">
          {erro && <div className="erp-feedback error">{erro}</div>}
          <div className="erp-fieldset"><div className="erp-fieldset-body">
            {modo === "modelo" && (
              <div className="erp-field erp-c12"><label className="erp-label erp-req">Modelo</label>
                <select className="erp-input" value={f.modelo} onChange={(e) => setF((x) => ({ ...x, modelo: Number(e.target.value) }))}>
                  {modelos.map((m) => <option key={m.id} value={m.id}>{m.description}</option>)}
                </select>
                <span className="erp-field-hint">Vão as etapas com tempos, base de tempo, refugo e terceirização, a rede, os centros, as ferramentas e os documentos.</span></div>
            )}
            <div className="erp-field erp-c6"><label className="erp-label">Descrição</label>
              <input className="erp-input" value={f.description} placeholder={modo === "modelo" ? "A do modelo" : "Processo padrão"} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Alternativa</label>
              <input className="erp-input num" type="number" min={1} value={f.alternative} onChange={(e) => setF((x) => ({ ...x, alternative: Number(e.target.value) || 1 }))} /></div>
            <div className="erp-field erp-c4"><label className="erp-label">Máscara (opcional)</label>
              <input className="erp-input" value={f.mask} placeholder="Todas" onChange={(e) => setF((x) => ({ ...x, mask: e.target.value }))} />
              <span className="erp-field-hint">Em branco: vale para qualquer variação do item.</span></div>
            <div className="erp-field erp-c12">
              <label className="erp-toggle-row" style={{ gap: 8 }}>
                <input type="checkbox" checked={f.is_standard} onChange={(e) => setF((x) => ({ ...x, is_standard: e.target.checked }))} />
                <span>É o roteiro padrão do item: o que a OP, o MRP, o CRP e o custo usam quando ninguém escolhe outro (máscara própria e faixa de lote vencem o padrão)</span>
              </label></div>
          </div></div>
        </div>
        <div className="erp-modal-actions">
          <button className="erp-btn" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy}>{busy && <span className="erp-spin" />}Criar</button>
        </div>
      </div>
    </div>
  );
}

/** Copia o roteiro aberto para outro item ou para um modelo novo. */
function CopiarDialog({ origem, onClose, onCopiado }: { origem: RouteDTO; onClose: () => void; onCopiado: (msg: string) => Promise<void> }): JSX.Element {
  useEscapeToClose(onClose);
  const [destino, setDestino] = useState<"item" | "modelo">(origem.is_template ? "item" : "item");
  const [item, setItem] = useState("");
  const [f, setF] = useState({ alternative: 1, mask: "", description: "", is_standard: false });
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const copiarAgora = async () => {
    setBusy(true); setErro("");
    try {
      if (destino === "item" && !item) { setErro("Escolha o item de destino."); return; }
      if (destino === "modelo" && !f.description.trim()) { setErro("Dê um nome ao modelo."); return; }
      const r = await copyRoute(origem.id!, destino === "modelo"
        ? { to_template: true, description: f.description }
        : { item_code: item, alternative: f.alternative, mask: f.mask || undefined, description: f.description || undefined, is_standard: f.is_standard });
      await onCopiado(destino === "modelo"
        ? `Modelo "${f.description}" criado: ${resumoCopia(r.copied)}.`
        : `Roteiro copiado para o item ${item} (alternativa ${f.alternative}): ${resumoCopia(r.copied)}.`);
    } catch (e) { setErro(errMessage(e)); } finally { setBusy(false); }
  };
  return (
    <div className="erp-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="erp-modal" style={{ width: "min(720px, 96vw)" }} role="dialog" aria-modal="true" aria-label="Copiar roteiro">
        <div className="erp-modal-head"><strong>{origem.is_template ? `Usar o modelo "${origem.description}"` : "Copiar roteiro"}</strong></div>
        <div className="erp-modal-body">
          {erro && <div className="erp-feedback error">{erro}</div>}
          {!origem.is_template && (
            <div className="erp-chips" style={{ marginBottom: 10 }}>
              <button className={`erp-chip${destino === "item" ? " active" : ""}`} onClick={() => setDestino("item")}>Para outro item</button>
              <button className={`erp-chip${destino === "modelo" ? " active" : ""}`} onClick={() => setDestino("modelo")}>Transformar em modelo</button>
            </div>
          )}
          <div className="erp-fieldset"><div className="erp-fieldset-body">
            {destino === "item" ? (
              <>
                <div className="erp-field erp-c6"><label className="erp-label erp-req">Item de destino</label>
                  <LookupField value={item || undefined} onChange={(c) => setItem(c ? String(c) : "")} loader={loadItems} entityLabel="item" clearable placeholder="Item que recebe o roteiro" /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Alternativa</label>
                  <input className="erp-input num" type="number" min={1} value={f.alternative} onChange={(e) => setF((x) => ({ ...x, alternative: Number(e.target.value) || 1 }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Máscara (opcional)</label>
                  <input className="erp-input" value={f.mask} placeholder="Todas" onChange={(e) => setF((x) => ({ ...x, mask: e.target.value }))} /></div>
                <div className="erp-field erp-c8"><label className="erp-label">Descrição</label>
                  <input className="erp-input" value={f.description} placeholder={origem.description ?? "A da origem"} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} /></div>
                <div className="erp-field erp-c4" style={{ justifyContent: "flex-end" }}>
                  <label className="erp-toggle-row" style={{ gap: 8 }}>
                    <input type="checkbox" checked={f.is_standard} onChange={(e) => setF((x) => ({ ...x, is_standard: e.target.checked }))} />
                    <span>Padrão do item de destino</span>
                  </label></div>
                <div className="erp-field erp-c12"><span className="erp-field-hint">
                  Vão as etapas, a rede, os centros alternativos, as ferramentas, os documentos e os planos de inspeção. A vigência e a faixa de lote não vão: são decisões do destino.
                </span></div>
              </>
            ) : (
              <div className="erp-field erp-c12"><label className="erp-label erp-req">Nome do modelo</label>
                <input className="erp-input" value={f.description} placeholder="Chapa cortada, dobrada e pintada" onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} />
                <span className="erp-field-hint">Os planos de inspeção não vão para o modelo: plano é do item.</span></div>
            )}
          </div></div>
        </div>
        <div className="erp-modal-actions">
          <button className="erp-btn" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="erp-btn erp-btn-primary" onClick={() => void copiarAgora()} disabled={busy}>{busy && <span className="erp-spin" />}Copiar</button>
        </div>
      </div>
    </div>
  );
}
