import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type MrpException, type MrpExceptionAction, type MrpRunResult, type MrpSuggestion, type PlannedOrder, type PlannedTarget,
  firmSuggestion, getExceptions, handleException, listPlannedOrders, listSuggestions, runMrp, transitionPlannedOrders,
} from "@/services/mrpService";
import { type ProductionPlanDTO, listProductionPlans } from "@/services/productionPlanService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { type Aba, Abas, Aviso, Cabecalho, Detalhe, Kpis, Painel, Rodape, Selo, Vazio } from "./planUi";
import { dataHora, ehCompra, ehFabricacao, num } from "./planFormat";
import { useAcao } from "./planHooks";
import { SugestoesTab } from "./mrp/SugestoesTab";
import { PlanejadasTab } from "./mrp/PlanejadasTab";
import { ExcecoesTab } from "./mrp/ExcecoesTab";
import { PerfilTab } from "./mrp/PerfilTab";
import { PlanosTab } from "./mrp/PlanosTab";
import { abrangenciaDo, demandasIndependentes } from "./mrp/planos";
import { RelatoriosTab } from "./mrp/RelatoriosTab";
import { CoberturaTab } from "./mrp/CoberturaTab";
import { type AlvoRastreamento, RastreamentoTab } from "./mrp/RastreamentoTab";

/**
 * MRP — Planejamento das Necessidades de Materiais.
 *
 * O plano se escolhe uma vez, na barra, e vale para a tela inteira; cada aba é
 * um passo do trabalho do planejador: ver o quadro geral → revisar e firmar
 * sugestões → acompanhar as ordens planejadas → tratar exceções → investigar o
 * item. Planos, inter-fábrica e relatórios ficam nas últimas abas, porque são
 * cadastro e consulta, não a rotina diária.
 */
type AbaMrp = "geral" | "cobertura" | "sugestoes" | "planejadas" | "excecoes" | "rastreamento" | "perfil" | "planos" | "relatorios";
const CHAVE_PLANO = "vmrp0100.plano";

function planoLembrado(): number | undefined {
  try { return Number(localStorage.getItem(CHAVE_PLANO)) || undefined; } catch { return undefined; }
}

export function Vmrp0100Page(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [aba, setAba] = useState<AbaMrp>("geral");
  const [planos, setPlanos] = useState<ProductionPlanDTO[]>([]);
  const [plano, setPlano] = useState<number | undefined>(planoLembrado);
  const [ordemInicial, setOrdemInicial] = useState("");
  const [ultimaRodada, setUltimaRodada] = useState<MrpRunResult | null>(null);
  const [sugestoes, setSugestoes] = useState<MrpSuggestion[]>([]);
  const [excecoes, setExcecoes] = useState<MrpException[]>([]);
  const [planejadas, setPlanejadas] = useState<PlannedOrder[]>([]);
  const [itemPerfil, setItemPerfil] = useState<string | undefined>();
  // Sobe a cada releitura do resultado: a aba de cobertura relê junto.
  const [versao, setVersao] = useState(0);
  const [alvo, setAlvo] = useState<AlvoRastreamento | undefined>();
  const [carregado, setCarregado] = useState(false);

  const planoAtual = planos.find((p) => p.code === plano);

  const carregarPlanos = useCallback(async () => {
    const l = await listProductionPlans();
    setPlanos(l);
    // Sem plano lembrado (ou lembrado e apagado), começa pelo primeiro ativo.
    setPlano((atual) => (atual && l.some((p) => p.code === atual) ? atual : (l.find((p) => p.is_active) ?? l[0])?.code));
  }, []);

  const carregarResultado = useCallback(async (p?: number) => {
    if (!p) { setSugestoes([]); setExcecoes([]); return; }
    const [sg, ex, po] = await Promise.all([listSuggestions(p), getExceptions(p), listPlannedOrders()]);
    setSugestoes(sg); setExcecoes(ex); setPlanejadas(po);
    setCarregado(true);
    setVersao((v) => v + 1);
  }, []);

  useEffect(() => { void run(carregarPlanos); }, [run, carregarPlanos]);
  useEffect(() => {
    if (!plano) return;
    try { localStorage.setItem(CHAVE_PLANO, String(plano)); } catch { /* preferência local, opcional */ }
    setCarregado(false);
    void run(() => carregarResultado(plano));
  }, [plano, run, carregarResultado]);

  // Número inicial sugerido: depois da maior ordem planejada que já existe —
  // repetir 10000 a cada rodada gerava números que já estavam em uso.
  const proximaOrdem = useMemo(() => {
    const maior = Math.max(9999, ...planejadas.map((o) => o.order_number ?? 0), ...sugestoes.map((s) => s.order_number ?? 0));
    return maior + 1;
  }, [planejadas, sugestoes]);

  const rodar = () => run(async () => {
    if (!plano) { setFeedback({ type: "error", message: "Escolha o plano." }); return; }
    const inicial = Number(ordemInicial) || proximaOrdem;
    if (inicial <= 0) { setFeedback({ type: "error", message: "O número inicial das ordens deve ser positivo." }); return; }
    const r = await runMrp(plano, inicial);
    setUltimaRodada(r);
    setOrdemInicial("");
    await Promise.all([carregarResultado(plano), carregarPlanos()]);
    setFeedback({ type: "success", message: `MRP calculado: ${num(r.items_processed ?? 0, 0)} item(ns) processado(s), ${num(r.orders_generated ?? 0, 0)} sugestão(ões) gerada(s).` });
    setAba("geral");
  });

  const firmar = async (codes: number[]) => run(async () => {
    const falhas: string[] = [];
    let ok = 0, ofs = 0;
    // O backend firma uma sugestão por chamada; o lote segue e diz o que falhou.
    for (const c of codes) {
      try { const po = await firmSuggestion(c); ok += 1; if (po.order_type === "PRODUCTION") ofs += 1; }
      catch (e) { falhas.push(`sugestão ${c}: ${errMessage(e)}`); }
    }
    await carregarResultado(plano);
    const base = `${ok} sugestão(ões) firmada(s)${ofs ? ` — ${ofs} ordem(ns) de produção criada(s)` : ""}.`;
    setFeedback(falhas.length ? { type: "error", message: `${base} Não firmadas: ${falhas.join("; ")}` } : { type: "success", message: base });
  });

  const transicionar = async (codes: number[], alvo: PlannedTarget) => run(async () => {
    await transitionPlannedOrders(codes, alvo);
    await carregarResultado(plano);
    const verbo = alvo === "FIRM" ? "firmada(s)" : alvo === "RELEASED" ? "liberada(s)" : "devolvida(s) para planejada";
    setFeedback({ type: "success", message: `${codes.length} ordem(ns) ${verbo}.` });
  });

  const tratarExcecao = async (code: number, acao: MrpExceptionAction, opts: { newDate?: string; note?: string }) => {
    let ok = false;
    await run(async () => {
      const numero = excecoes.find((e) => e.code === code)?.source_order_number;
      await handleException(code, acao, opts);
      await carregarResultado(plano);
      ok = true;
      const feito = acao === "REPROGRAMAR" ? `reprogramada${opts.newDate ? ` para ${opts.newDate.split("-").reverse().join("/")}` : ""}` : acao === "CANCELAR" ? "cancelada" : "marcada como tratada";
      setFeedback({ type: "success", message: acao === "TRATAR" ? `Exceção ${feito}.` : `Ordem planejada ${numero ?? ""} ${feito}.` });
    });
    return ok;
  };

  const verOrigem = (a: AlvoRastreamento) => { setAlvo(a); setAba("rastreamento"); };
  const verPerfil = (item: string) => { setItemPerfil(item); setAba("perfil"); };

  // Sugestão firmada continua na lista do plano (firmar de novo devolve a mesma
  // ordem), mas não é mais trabalho pendente: os números contam só as abertas.
  const pendentes = sugestoes.filter((s) => !s.planned_order_code);
  const atrasadas = pendentes.filter((s) => s.capacity_late).length;
  const fab = pendentes.filter((s) => ehFabricacao(s.order_type)).length;
  const compra = pendentes.filter((s) => ehCompra(s.order_type)).length;
  const planejadasDoPlano = planejadas.filter((o) => !plano || o.plan_code === plano);
  const aguardando = planejadasDoPlano.filter((o) => o.status === "PLANNED").length;
  const itensDoPlano = useMemo(() => [...new Set(sugestoes.map((s) => s.item_code))].sort(), [sugestoes]);

  const ABAS: Aba<AbaMrp>[] = [
    { id: "geral", label: "Visão geral", hint: "Resumo do plano e do último cálculo" },
    { id: "cobertura", label: "Cobertura", hint: "Até quando o estoque e as ordens firmes cobrem cada item, com o farol" },
    { id: "sugestoes", label: "Sugestões", contador: pendentes.length, hint: "Revisar e firmar as ordens sugeridas" },
    { id: "planejadas", label: "Ordens planejadas", contador: planejadasDoPlano.length, hint: "Firmar, liberar ou voltar ordens planejadas" },
    { id: "excecoes", label: "Exceções", contador: excecoes.filter((e) => !e.handling_action).length, alerta: true, hint: "Atrasos, excessos e reprogramações apontados pelo cálculo" },
    { id: "rastreamento", label: "Rastreamento", hint: "De cada pedido/demanda até as compras dos componentes, e de uma ordem até quem depende dela" },
    { id: "perfil", label: "Perfil do item", hint: "Demanda e estoque projetado do item no tempo, e as regras dele" },
    { id: "planos", label: "Planos", contador: planos.length, hint: "Cadastro de planos e empresas inter-fábrica" },
    { id: "relatorios", label: "Relatórios", hint: "Perfil, disponibilidade, necessidades, explosão e ponto de reposição" },
  ];

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Planejamento" titulo="MRP (Planejamento de Materiais)" codigo="VMRP0100"
        meta={planoAtual?.last_calculated_at ? `Calculado em ${dataHora(planoAtual.last_calculated_at)}` : undefined} />

      <div className="erp-toolbar vpl-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Plano</span>
          <select className="erp-tselect" style={{ width: 240 }} aria-label="Plano" value={plano ?? ""} onChange={(e) => setPlano(Number(e.target.value) || undefined)} disabled={busy && planos.length === 0}>
            {planos.length === 0 && <option value="">Nenhum plano — crie na aba Planos</option>}
            {planos.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}{p.is_active ? "" : " (inativo)"}</option>)}
          </select>
        </div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Cálculo</span>
          <input className="erp-tinput" style={{ width: 110 }} type="number" min={1} aria-label="Número inicial das ordens"
            title="Número da primeira ordem que o cálculo vai gerar" placeholder={String(proximaOrdem)} value={ordemInicial} onChange={(e) => setOrdemInicial(e.target.value)} />
          <button className="erp-btn erp-btn-primary" onClick={() => void rodar()} disabled={busy || !plano}>{busy && <span className="erp-spin" />}Rodar MRP</button>
          <button className="erp-btn" onClick={() => void run(async () => { await Promise.all([carregarPlanos(), carregarResultado(plano)]); })} disabled={busy || !plano}>Atualizar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VMRP0100 — MRP" filename="vmrp0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <Abas abas={ABAS} ativa={aba} onChange={setAba} />
          <div className="erp-detail-body">
            <Aviso feedback={feedback} busy={busy} />

            {aba === "geral" && (!planoAtual ? (
              <Painel titulo="Plano"><Vazio titulo={planos.length ? "Escolha um plano na barra acima" : "Nenhum plano cadastrado"}
                acao={<button className="erp-btn erp-btn-primary" onClick={() => setAba("planos")}>Ir para Planos</button>} /></Painel>
            ) : (<>
              <Kpis itens={[
                { label: "Sugestões a firmar", value: num(pendentes.length, 0), hint: `${fab} fabricação · ${compra} compra`, onClick: () => setAba("sugestoes"), title: "Abrir sugestões" },
                { label: "Terminam atrasadas", value: num(atrasadas, 0), hint: "pela capacidade das máquinas", tom: atrasadas ? "danger" : "ok", onClick: () => setAba("sugestoes") },
                { label: "Exceções", value: num(excecoes.length, 0), hint: "apontadas pelo cálculo", tom: excecoes.length ? "warn" : "ok", onClick: () => setAba("excecoes") },
                { label: "Ordens planejadas", value: num(planejadasDoPlano.length, 0), hint: `${aguardando} aguardando liberação`, tom: "info", onClick: () => setAba("planejadas") },
              ]} />

              <div className="vpl-cols wide-left">
                <Painel titulo={`Plano ${planoAtual.code} · ${planoAtual.name}`} sub={planoAtual.is_active ? undefined : "inativo"}>
                  <Detalhe itens={[
                    { label: "Abrangência", value: abrangenciaDo(planoAtual) },
                    { label: "Demandas independentes", value: demandasIndependentes(planoAtual.independent_demands) },
                    { label: "Modos", value: (planoAtual.planning_types ?? []).join(", ") || "—" },
                    { label: "Agrupa ordens do mesmo dia", value: planoAtual.group_same_date_orders ? "Sim" : "Não" },
                    { label: "Último cálculo", value: planoAtual.last_calculated_at ? dataHora(planoAtual.last_calculated_at) : "Nunca calculado", forte: true },
                    { label: "Itens no último cálculo", value: ultimaRodada?.items_processed !== undefined ? num(ultimaRodada.items_processed, 0) : num(itensDoPlano.length, 0) },
                  ]} />
                </Painel>

                <Painel titulo="Próximos passos">
                  {!carregado ? <p className="erp-hint">Carregando o plano…</p> : !planoAtual.last_calculated_at ? (
                    <p className="erp-note">Este plano ainda não foi calculado. Clique em <strong>Rodar MRP</strong> na barra acima.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {atrasadas > 0 && <Passo tom="danger" texto={`${atrasadas} sugestão(ões) terminam depois da necessidade.`} botao="Ver atrasadas" onClick={() => setAba("sugestoes")} />}
                      {pendentes.length > 0 && <Passo tom="info" texto={`${pendentes.length} sugestão(ões) aguardando revisão.`} botao="Revisar sugestões" onClick={() => setAba("sugestoes")} />}
                      {excecoes.length > 0 && <Passo tom="warn" texto={`${excecoes.length} exceção(ões) para tratar.`} botao="Ver exceções" onClick={() => setAba("excecoes")} />}
                      {aguardando > 0 && <Passo tom="info" texto={`${aguardando} ordem(ns) planejada(s) ainda não liberada(s).`} botao="Ver ordens" onClick={() => setAba("planejadas")} />}
                      {atrasadas + pendentes.length + excecoes.length + aguardando === 0 && <p className="erp-note">Nada pendente: o plano está em dia. Rode o MRP de novo quando a demanda, o estoque ou a estrutura mudarem.</p>}
                    </div>
                  )}
                </Painel>
              </div>
            </>))}

            {aba === "cobertura" && <CoberturaTab plano={plano} versao={versao} sugestoes={sugestoes} busy={busy} onFirmar={firmar} onVerPerfil={verPerfil} />}
            {aba === "sugestoes" && <SugestoesTab sugestoes={sugestoes} busy={busy} onFirmar={firmar} onVerPerfil={verPerfil}
              onVerOrigem={(s) => verOrigem({ kind: "SUGESTAO", code: s.code, rotulo: `a sugestão ${s.order_number ?? s.code} (${s.item_code})` })} />}
            {aba === "rastreamento" && <RastreamentoTab plano={plano} versao={versao} alvo={alvo} onLimparAlvo={() => setAlvo(undefined)} />}
            {aba === "planejadas" && <PlanejadasTab ordens={planejadas} plano={plano} busy={busy} onTransicionar={transicionar}
              onVerOrigem={(o) => { const c = o.code ?? o.planned_code; if (c) verOrigem({ kind: "ORDEM_FIRME", code: c, rotulo: `a ordem ${o.order_number ?? c} (${o.item_code})` }); }} />}
            {aba === "excecoes" && <ExcecoesTab excecoes={excecoes} busy={busy} onVerPerfil={verPerfil} onTratar={tratarExcecao}
              onVerOrigem={(e) => e.source_code && verOrigem({ kind: "ORDEM_FIRME", code: e.source_code, rotulo: `a ordem ${e.source_order_number ?? e.source_code} (${e.item_code})` })} />}
            {aba === "perfil" && <PerfilTab plano={plano} itensDoPlano={itensDoPlano} itemInicial={itemPerfil} />}
            {aba === "planos" && <PlanosTab planos={planos} plano={plano} onEscolher={(c) => setPlano(c)} onRecarregar={carregarPlanos} />}
            {aba === "relatorios" && <RelatoriosTab plano={plano} />}
          </div>
        </section>
      </div>

      <Rodape>
        <div className="erp-status-item">Plano: <strong>{planoAtual ? `${planoAtual.code} · ${planoAtual.name}` : "—"}</strong></div>
        <div className="erp-status-item">Sugestões a firmar: <strong>{pendentes.length}</strong></div>
        <div className="erp-status-item">Ordens planejadas: <strong>{planejadasDoPlano.length}</strong></div>
      </Rodape>
    </div>
  );
}

function Passo({ tom, texto, botao, onClick }: { tom: "danger" | "warn" | "info"; texto: string; botao: string; onClick: () => void }): JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Selo tom={tom}>{tom === "danger" ? "Urgente" : tom === "warn" ? "Atenção" : "Pendente"}</Selo>{texto}</span>
      <button className="erp-btn erp-btn-sm" onClick={onClick}>{botao}</button>
    </div>
  );
}
