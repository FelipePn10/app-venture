import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type Demanda, type DemandaDTO, type Motivo, MOTIVOS, alterarDemanda, atenderDemanda, cancelarDemanda, criarDemanda,
  type ConsumoDoItem, consumoDoItem, decimalParaApi, encerrarDemanda, gerarOFDaDemanda, listarDemandas, motivoDe, obterDemanda,
} from "@/services/demandaService";
import { type MovementTypeDTO, listMovementTypes } from "@/services/stockService";
import { loadCostCenters, loadCustomers, loadItems, loadWarehouses } from "@/services/lookups";
import { LookupField } from "@/components/ui/LookupField";
import { ExportButton } from "@/components/ui/ExportButton";
import { hojeLocal } from "@/utils/dataLocal";
import { type Aba, Abas, Aviso, Cabecalho, Detalhe, Kpis, Painel, Rodape, Selo, Vazio } from "./planUi";
import { type Tom, data, normalizar, num, situacaoOF } from "./planFormat";
import { useAcao } from "./planHooks";

/**
 * VPLA0102 — Demanda independente: o que se quer produzir ou comprar sem
 * pedido de venda. A lista fica à esquerda (situação e motivo), a demanda à
 * direita com a posição de hoje (o que a venda consumiu, o que já saiu para a
 * finalidade, o que o MRP vai planejar) e as ordens que a cobrem.
 */
type FiltroSituacao = "ABERTA" | "ENCERRADA" | "CANCELADA" | "";
const FILTROS: { id: FiltroSituacao; rotulo: string }[] = [
  { id: "ABERTA", rotulo: "Abertas" }, { id: "ENCERRADA", rotulo: "Encerradas" }, { id: "CANCELADA", rotulo: "Canceladas" }, { id: "", rotulo: "Todas" },
];
type AbaDemanda = "resumo" | "ordens" | "consumo";

const POSICAO: Record<string, { rotulo: string; tom: Tom; ajuda: string }> = {
  ABERTA: { rotulo: "Aberta", tom: "info", ajuda: "Entra inteira no próximo MRP." },
  PARCIAL: { rotulo: "Parcial", tom: "warn", ajuda: "Parte já foi consumida pela venda ou atendida; o MRP planeja o saldo." },
  ATENDIDA: { rotulo: "Atendida", tom: "ok", ajuda: "Tudo saiu do estoque para a finalidade." },
  CONSUMIDA: { rotulo: "Consumida", tom: "ok", ajuda: "Os pedidos de venda cobriram toda a demanda." },
  VENCIDA: { rotulo: "Vencida", tom: "muted", ajuda: "Passou da janela de consumo sem venda: saiu do cálculo." },
  SOB_ENCOMENDA: { rotulo: "Sob encomenda", tom: "muted", ajuda: "O item é planejado sob encomenda (VPLA0310): só o pedido de venda gera necessidade, e esta demanda não entra no MRP." },
  ENCERRADA: { rotulo: "Encerrada", tom: "muted", ajuda: "Saldo encerrado à mão." },
  CANCELADA: { rotulo: "Cancelada", tom: "muted", ajuda: "Fora do planejamento." },
};
const posicao = (p?: string) => POSICAO[p ?? ""] ?? { rotulo: p ?? "—", tom: "muted" as Tom, ajuda: "" };
const PRIORIDADES = [{ v: 1, r: "1 — Urgente" }, { v: 2, r: "2 — Alta" }, { v: 3, r: "3 — Normal" }, { v: 4, r: "4 — Baixa" }, { v: 5, r: "5 — Quando der" }];

type Form = {
  code?: number; item: string; mask: string; motivo: Motivo; quantidade: string; data: string; almox?: number; centro?: number;
  cliente?: number; projeto: string; prioridade: number; observacao: string; entregas: string; intervalo: string;
};
const FORM_VAZIO = (): Form => ({ item: "", mask: "", motivo: "ESTOQUE", quantidade: "", data: hojeLocal(), projeto: "", prioridade: 3, observacao: "", entregas: "1", intervalo: "7" });

const q = (t?: string) => Number(t ?? 0);

export function Vpla0102Page(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lista, setLista] = useState<Demanda[]>([]);
  const [situacao, setSituacao] = useState<FiltroSituacao>("ABERTA");
  const [motivo, setMotivo] = useState("");
  const [busca, setBusca] = useState("");
  const [dem, setDem] = useState<Demanda | null>(null);
  const [aba, setAba] = useState<AbaDemanda>("resumo");
  const [form, setForm] = useState<Form | null>(null);
  const [atender, setAtender] = useState<{ quantidade: string; almox?: number; tipo: string; observacao: string } | null>(null);
  const [tipos, setTipos] = useState<MovementTypeDTO[]>([]);
  const [of, setOf] = useState<{ quantidade: string; inicio: string; fim: string; prioridade: string } | null>(null);
  const [fechar, setFechar] = useState<{ acao: "cancelar" | "encerrar"; motivo: string } | null>(null);
  const [visao, setVisao] = useState<ConsumoDoItem | null>(null);

  const listar = useCallback(async () => {
    setLista(await listarDemandas({ situacao, motivo }));
  }, [situacao, motivo]);
  useEffect(() => { void run(listar); }, [run, listar]);

  const abrir = (code: number) => void run(async () => { setDem(await obterDemanda(code)); setAba("resumo"); setVisao(null); });
  const verConsumoDoItem = () => { if (dem) void run(async () => { setVisao(await consumoDoItem(dem.item_business_code)); }); };
  const recarregar = async (code?: number) => {
    await listar();
    if (code) setDem(await obterDemanda(code));
  };

  const visiveis = useMemo(() => {
    const t = normalizar(busca.trim());
    if (!t) return lista;
    return lista.filter((d) => normalizar(`${d.code_demand} ${d.item_business_code} ${d.item_name} ${d.projeto ?? ""}`).includes(t));
  }, [lista, busca]);

  const kpis = useMemo(() => {
    const abertas = lista.filter((d) => d.situacao === "ABERTA");
    return {
      abertas: abertas.length,
      aPlanejar: abertas.filter((d) => q(d.a_planejar) > 0).length,
      vencidas: abertas.filter((d) => d.posicao === "VENCIDA").length,
      finalidade: abertas.filter((d) => d.familia === "FINALIDADE" && q(d.a_planejar) > 0).length,
    };
  }, [lista]);

  // ── Ações ──────────────────────────────────────────────────────────────────
  const novo = () => { setFeedback(null); setForm(FORM_VAZIO()); };
  const editar = (d: Demanda) => {
    setFeedback(null);
    setForm({
      code: d.code_demand, item: d.item_business_code, mask: d.mask ?? "", motivo: d.motivo, quantidade: d.quantity.replace(".", ","),
      data: d.demand_date, almox: d.warehouse_id, centro: d.cost_center_code, cliente: d.customer_code, projeto: d.projeto ?? "",
      prioridade: d.prioridade || 3, observacao: d.observacao ?? "", entregas: "1", intervalo: "7",
    });
  };
  const salvar = () => {
    if (!form) return;
    // O que falta se diz aqui: quantidade vazia chegava ao servidor como texto
    // vazio e voltava "não foi possível ler os dados enviados".
    if (!form.item) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    if (!(q(decimalParaApi(form.quantidade)) > 0)) { setFeedback({ type: "error", message: "Informe a quantidade (maior que zero)." }); return; }
    if (!form.data) { setFeedback({ type: "error", message: "Informe a data da necessidade." }); return; }
    void run(async () => {
      const dto: DemandaDTO = {
        item_code: form.item, mask: form.mask.trim() || undefined, quantity: decimalParaApi(form.quantidade), demand_date: form.data,
        // Vazio vai como 0 / "": na alteração, campo omitido fica como estava.
        motivo: form.motivo, warehouse_id: form.almox ?? 0, cost_center_code: form.centro, customer_code: form.cliente ?? 0,
        projeto: form.projeto.trim(), prioridade: form.prioridade, observacao: form.observacao.trim(),
      };
      if (form.code) {
        const d = await alterarDemanda(form.code, dto);
        setForm(null); await recarregar(d.code_demand);
        setFeedback({ type: "success", message: `Demanda ${d.code_demand} alterada.` });
        return;
      }
      const n = Number(form.entregas) || 1;
      const criadas = await criarDemanda({ ...dto, entregas: n > 1 ? n : undefined, intervalo_dias: n > 1 ? Number(form.intervalo) || 0 : undefined });
      setForm(null);
      await recarregar(criadas[0]?.code_demand);
      setFeedback({ type: "success", message: criadas.length > 1
        ? `Programação cadastrada: demandas ${criadas[0].code_demand} a ${criadas[criadas.length - 1].code_demand} (${criadas.length} entregas).`
        : `Demanda ${criadas[0]?.code_demand} cadastrada. Ela entra no próximo MRP.` });
    });
  };
  const abrirAtender = (d: Demanda) => void run(async () => {
    if (!tipos.length) setTipos((await listMovementTypes()).filter((t) => t.is_active !== false && t.allows_manual && (t.entry_exit === "SAIDA" || t.entry_exit === "AMBOS")));
    setAtender({ quantidade: d.a_planejar.replace(".", ","), almox: d.warehouse_id, tipo: "", observacao: "" });
  });
  const confirmarAtender = () => {
    if (!dem || !atender) return;
    if (!(q(decimalParaApi(atender.quantidade)) > 0)) { setFeedback({ type: "error", message: "Informe a quantidade que sai." }); return; }
    const almox = atender.almox;
    if (!almox) { setFeedback({ type: "error", message: "Informe o almoxarifado de onde o material sai." }); return; }
    if (!atender.tipo) { setFeedback({ type: "error", message: "Escolha o tipo de movimento da saída." }); return; }
    void run(async () => {
      const d = await atenderDemanda(dem.code_demand, { quantidade: decimalParaApi(atender.quantidade), warehouse_id: almox, movement_type_code: atender.tipo, observacao: atender.observacao.trim() || undefined });
      setAtender(null); setDem(d); await listar();
      setFeedback({ type: "success", message: `Saída lançada. Atendido: ${num(q(d.atendida))} de ${num(q(d.quantity))}.` });
    });
  };
  const confirmarOF = () => {
    if (!dem || !of) return;
    if (of.quantidade.trim() && !(q(decimalParaApi(of.quantidade)) > 0)) { setFeedback({ type: "error", message: "A quantidade da OF precisa ser maior que zero." }); return; }
    void run(async () => {
      const d = await gerarOFDaDemanda(dem.code_demand, { quantidade: decimalParaApi(of.quantidade) || undefined, start_date: of.inicio || undefined, end_date: of.fim || undefined, priority: of.prioridade });
      setOf(null); setDem(d); setAba("ordens"); await listar();
      const ultima = d.ordens?.[d.ordens.length - 1];
      setFeedback({ type: "success", message: `OF ${ultima?.order_number ?? ""} aberta e ligada à demanda ${d.code_demand}.` });
    });
  };
  const confirmarFechar = () => {
    if (!dem || !fechar) return;
    void run(async () => {
      const d = fechar.acao === "cancelar" ? await cancelarDemanda(dem.code_demand, fechar.motivo) : await encerrarDemanda(dem.code_demand, fechar.motivo);
      setFechar(null); setDem(d); await listar();
      setFeedback({ type: "success", message: `Demanda ${d.code_demand} ${fechar.acao === "cancelar" ? "cancelada" : "encerrada"}: sai do planejamento.` });
    });
  };

  const aberta = dem?.situacao === "ABERTA";
  const pos = posicao(dem?.posicao);
  const temSaida = q(dem?.atendida) > 0;
  const motivoForm = form ? motivoDe(form.motivo) : undefined;
  const nEntregas = Number(form?.entregas) || 1;
  const parte = form && nEntregas > 1 && q(decimalParaApi(form.quantidade)) > 0 ? q(decimalParaApi(form.quantidade)) / nEntregas : 0;
  const ABAS: Aba<AbaDemanda>[] = [
    { id: "resumo", label: "Resumo" },
    { id: "ordens", label: "Ordens", contador: dem?.ordens?.length ?? 0, hint: "Ordens que cobrem a demanda (firmadas do MRP ou abertas por aqui)" },
    { id: "consumo", label: "Consumo", contador: dem?.consumo?.length ?? 0, hint: "Pedidos de venda que consumiram a demanda e a visão de consumo do item" },
  ];

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Planejamento" titulo="Demanda Independente" codigo="VPLA0102" />

      <div className="erp-toolbar vpl-toolbar">
        <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Nova demanda</button>
        <div className="erp-tgroup"><button className="erp-btn" onClick={() => void run(() => recarregar(dem?.code_demand))} disabled={busy}>Atualizar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Motivo</span>
          <select className="erp-tselect" aria-label="Filtrar por motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            <option value="">Todos</option>
            {MOTIVOS.map((m) => <option key={m.id} value={m.id}>{m.rotulo}</option>)}
          </select></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPLA0102 — Demanda Independente" filename="vpla0102" build={() => ({
          columns: ["Demanda", "Item", "Motivo", "Quantidade", "Data", "Consumida", "Atendida", "A planejar", "Posição"],
          rows: visiveis.map((d) => [String(d.code_demand), `${d.item_business_code} ${d.item_name}`, d.motivo_descricao, num(q(d.quantity)), data(d.demand_date),
            num(q(d.consumida)), num(q(d.atendida)), num(q(d.a_planejar)), posicao(d.posicao).rotulo]),
        })} /></div>
      </div>

      <div className="erp-content">
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Demandas</span><span className="erp-count">{visiveis.length}</span>
              <div className="erp-panel-head-spacer" />
              <input className="erp-search" placeholder="Nº, item ou projeto…" aria-label="Buscar demanda" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <div className="vpl-list-filters">
              {FILTROS.map((f) => <button key={f.id || "todas"} type="button" className={`erp-chip${situacao === f.id ? " active" : ""}`} onClick={() => setSituacao(f.id)}>{f.rotulo}</button>)}
            </div>
            <div className="erp-list">
              {visiveis.length === 0 && <div className="erp-list-empty">{lista.length ? "Nenhuma demanda com essa busca." : "Nenhuma demanda nesse filtro."}</div>}
              {visiveis.map((d) => {
                const p = posicao(d.posicao);
                return (
                  <div key={d.code_demand} className={`erp-list-row${dem?.code_demand === d.code_demand ? " sel" : ""}`} onClick={() => abrir(d.code_demand)}
                    role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") abrir(d.code_demand); }}>
                    <span className="erp-list-code">Nº {d.code_demand}</span>
                    <span className="erp-list-sub">{d.item_business_code} · {d.item_name}</span>
                    <span className="vpl-list-row-right"><Selo tom={p.tom} title={p.ajuda}>{p.rotulo}</Selo></span>
                    <div className="erp-list-meta" style={{ width: "100%" }}>
                      <span className="erp-text-muted" style={{ fontSize: 11.5 }}>{data(d.demand_date)} · {d.motivo_descricao}</span>
                      <div style={{ flex: 1 }} />
                      <span className="erp-list-money" title="A planejar / quantidade">{num(q(d.a_planejar))}/{num(q(d.quantity))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="erp-detail-panel">
            {!dem ? (
              <div className="erp-detail-body"><Aviso feedback={feedback} busy={busy} />
                <Kpis itens={[
                  { label: "Abertas", value: num(kpis.abertas, 0), hint: "no filtro atual", tom: "info" },
                  { label: "Entram no MRP", value: num(kpis.aPlanejar, 0), hint: "com saldo a planejar" },
                  { label: "Finalidade a atender", value: num(kpis.finalidade, 0), hint: "amostra, feira, consumo, assistência, projeto", tom: kpis.finalidade ? "warn" : "ok" },
                  { label: "Vencidas", value: num(kpis.vencidas, 0), hint: "sem venda na janela: encerre ou ajuste a data", tom: kpis.vencidas ? "warn" : "ok" },
                ]} />
                <Vazio titulo="Escolha uma demanda na lista" texto={<>Demanda independente é o que se quer produzir ou comprar <strong>sem pedido de venda</strong>: para estoque, amostra, feira, consumo interno, assistência ou projeto. Ela entra no próximo MRP, que gera a OF ou a compra.</>}
                  acao={<button className="erp-btn erp-btn-primary" onClick={novo}>+ Nova demanda</button>} />
              </div>
            ) : (<>
              <div style={{ padding: "14px 16px 0" }}>
                <div className="vpl-record">
                  <div className="vpl-record-main">
                    <div className="vpl-record-title">Demanda {dem.code_demand} <Selo tom={pos.tom} title={pos.ajuda}>{pos.rotulo}</Selo> <Selo tom="muted">{dem.motivo_descricao}</Selo></div>
                    <div className="vpl-record-sub">{dem.item_business_code} · {dem.item_name}{dem.mask ? ` · ${dem.mask}` : ""} · {num(q(dem.quantity))} para {data(dem.demand_date)}</div>
                  </div>
                  <div className="vpl-record-actions">
                    {aberta && <button className="erp-btn" onClick={() => editar(dem)} disabled={busy}>Alterar</button>}
                    {aberta && q(dem.sem_ordem) > 0 && <button className="erp-btn erp-btn-primary" onClick={() => setOf({ quantidade: dem.sem_ordem.replace(".", ","), inicio: hojeLocal(), fim: dem.demand_date, prioridade: dem.prioridade <= 1 ? "URGENTE" : dem.prioridade === 2 ? "HIGH" : "NORMAL" })} disabled={busy}
                      title="Abre a OF agora, sem esperar o MRP">Gerar OF agora</button>}
                    {aberta && dem.familia === "FINALIDADE" && q(dem.a_planejar) > 0 && <button className="erp-btn" onClick={() => abrirAtender(dem)} disabled={busy}
                      title="Lança a saída do estoque para a finalidade">Atender</button>}
                    {aberta && (temSaida || (dem.ordens?.length ?? 0) > 0
                      ? <button className="erp-btn erp-btn-danger" onClick={() => setFechar({ acao: "encerrar", motivo: "" })} disabled={busy}>Encerrar saldo</button>
                      : <button className="erp-btn erp-btn-danger" onClick={() => setFechar({ acao: "cancelar", motivo: "" })} disabled={busy}>Cancelar</button>)}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10 }}><Abas abas={ABAS} ativa={aba} onChange={setAba} /></div>
              <div className="erp-detail-body">
                <Aviso feedback={feedback} busy={busy} />
                {aba === "resumo" && (<>
                  <Kpis itens={[
                    { label: "Quantidade", value: num(q(dem.quantity)) },
                    dem.familia === "VENDA"
                      ? { label: "Consumida pela venda", value: num(q(dem.consumida)), hint: dem.vence_em ? `pedidos até ${data(dem.vence_em)} consomem` : undefined }
                      : { label: "Atendida (saída)", value: num(q(dem.atendida)), hint: "saídas do estoque para a finalidade" },
                    { label: "MRP vai planejar", value: num(q(dem.a_planejar)), tom: q(dem.a_planejar) > 0 ? "info" : "ok", hint: pos.ajuda },
                    { label: "Coberto por ordens", value: num(q(dem.coberta)), hint: q(dem.sem_ordem) > 0 ? `${num(q(dem.sem_ordem))} ainda sem ordem` : "nada sem ordem", onClick: () => setAba("ordens"), title: "Ver as ordens" },
                  ]} />
                  <div className="vpl-cols wide-left">
                    <Painel titulo="Dados da demanda">
                      <Detalhe itens={[
                        { label: "Item", value: `${dem.item_business_code} — ${dem.item_name}`, forte: true },
                        { label: "Máscara", value: dem.mask || "—" },
                        { label: "Motivo", value: dem.motivo_descricao },
                        { label: "Necessidade", value: data(dem.demand_date) },
                        { label: "Prioridade", value: PRIORIDADES.find((p) => p.v === dem.prioridade)?.r ?? dem.prioridade },
                        { label: "Almoxarifado de destino", value: dem.warehouse_nome || "—" },
                        { label: "Centro de custo", value: dem.cost_center_code ?? "—" },
                        { label: "Cliente", value: dem.customer_code ? `${dem.customer_code}${dem.customer_nome ? ` — ${dem.customer_nome}` : ""}` : "—" },
                        { label: "Projeto / obra", value: dem.projeto || "—" },
                        { label: "Programação", value: dem.programacao ? "faz parte de uma programação de entregas" : "—" },
                        { label: "Observação", value: dem.observacao || "—" },
                        ...(dem.situacao !== "ABERTA" ? [{ label: dem.situacao === "CANCELADA" ? "Cancelada" : "Encerrada", value: `${data(dem.encerrada_em)} — ${dem.motivo_encerramento ?? ""}` }] : []),
                      ]} />
                    </Painel>
                    <Painel titulo="Como ela se encerra">
                      {dem.familia === "VENDA" ? (
                        <p className="erp-note">É <strong>expectativa de venda</strong>. Quando o pedido de venda do item chega, ele <strong>consome</strong> esta demanda em vez de somar: o MRP planeja o maior dos dois, nunca a soma.
                          {dem.vence_em && <> Pedidos com entrega até <strong>{data(dem.vence_em)}</strong> ainda consomem; depois disso, sem venda, ela vence e sai do cálculo.</>}</p>
                      ) : (
                        <p className="erp-note">Tem <strong>finalidade própria</strong>: a venda não a consome. Ela segura o estoque até a saída para a finalidade — use <strong>Atender</strong>, que lança a saída no estoque. Se sobrar saldo que não vai mais sair, <strong>encerre o saldo</strong>.</p>
                      )}
                    </Painel>
                  </div>
                </>)}
                {aba === "ordens" && (
                  <Painel titulo="Ordens que cobrem a demanda" flush>
                    {!(dem.ordens?.length) ? <Vazio titulo="Nenhuma ordem ainda" texto="A ordem aparece aqui quando a sugestão do MRP é firmada ou quando você usa Gerar OF agora." /> : (
                      <table className="erp-grid">
                        <thead><tr><th>Ordem</th><th>Situação</th><th className="num">Da demanda</th><th className="num">Planejada</th><th className="num">Produzida</th></tr></thead>
                        <tbody>{dem.ordens.map((o, i) => {
                          const s = situacaoOF(o.status);
                          return (
                            <tr key={i}>
                              <td>{o.production_order_id ? `OF ${o.order_number ?? ""}` : `Planejada ${o.order_number ?? o.planned_order_code}`}</td>
                              <td><Selo tom={s.tom}>{s.rotulo}</Selo></td>
                              <td className="num">{num(q(o.quantidade))}</td><td className="num">{num(q(o.planejada))}</td><td className="num">{num(q(o.produzida))}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    )}
                  </Painel>
                )}
                {aba === "consumo" && (<>
                  <Painel titulo="Pedidos que consumiram esta demanda" flush
                    acoes={<button className="erp-btn erp-btn-sm" onClick={verConsumoDoItem} disabled={busy} title="Previsão, demandas e vendas do item, com quem consumiu o quê">Ver o consumo do item</button>}>
                    {dem.familia !== "VENDA" ? <Vazio titulo="Esta demanda não é consumida pela venda" texto="Demanda de finalidade própria (amostra, feira, consumo interno, assistência, projeto) é atendida pela saída de estoque, não pelo pedido." />
                      : !(dem.consumo?.length) ? <Vazio titulo="Nenhum pedido consumiu esta demanda" texto={dem.posicao === "SOB_ENCOMENDA" ? "O item é planejado sob encomenda: o pedido não consome a demanda de estoque." : "Pedido confirmado do item com entrega dentro da janela de consumo aparece aqui."} /> : (
                        <table className="erp-grid">
                          <thead><tr><th>Pedido</th><th>Linha</th><th>Cliente</th><th>Entrega</th><th className="num">Consumiu</th></tr></thead>
                          <tbody>{dem.consumo.map((c, i) => (
                            <tr key={i}><td>{c.pedido}</td><td>{c.sequencia}</td><td>{c.cliente || "—"}</td><td>{data(c.data)}</td><td className="num">{num(q(c.quantidade))}</td></tr>
                          ))}</tbody>
                        </table>
                      )}
                  </Painel>
                  {visao && (
                    <Painel titulo={`Consumo do item ${visao.item_business_code}`} sub={visao.sob_encomenda
                      ? "Sob encomenda: só o pedido gera necessidade; previsão e demanda de estoque não entram no MRP."
                      : `Janela de consumo: ${visao.consumo_dias_antes} dias antes e ${visao.consumo_dias_depois} depois da entrega do pedido.`}>
                      <Kpis itens={[
                        { label: "Expectativa", value: num(q(visao.total_expectativa)), hint: "previsão + demanda de estoque" },
                        { label: "Consumida pela venda", value: num(q(visao.total_consumido)) },
                        { label: "MRP planeja da expectativa", value: num(q(visao.total_a_planejar)), tom: "info" },
                        { label: "Venda acima da expectativa", value: num(q(visao.total_acima)), hint: `de ${num(q(visao.total_vendido))} vendidos`, tom: q(visao.total_acima) > 0 ? "warn" : "ok" },
                      ]} />
                      {visao.previsoes.length > 0 && (
                        <table className="erp-grid" style={{ marginTop: 10 }}>
                          <thead><tr><th>Previsão — semana</th><th className="num">Prevista</th><th className="num">Consumida</th><th className="num">Sobra para o MRP</th><th>Consumida por</th></tr></thead>
                          <tbody>{visao.previsoes.map((p, i) => (
                            <tr key={i}><td>{data(p.semana)}{p.mask ? ` · ${p.mask}` : ""}</td><td className="num">{num(q(p.quantidade))}</td><td className="num">{num(q(p.consumida))}</td>
                              <td className="num">{num(q(p.resto))}</td><td>{(p.consumo ?? []).map((c) => `Pedido ${c.pedido}/${c.sequencia} (${num(q(c.quantidade))})`).join(", ") || "—"}</td></tr>
                          ))}</tbody>
                        </table>
                      )}
                      <table className="erp-grid" style={{ marginTop: 10 }}>
                        <thead><tr><th>Demanda</th><th>Data</th><th className="num">Quantidade</th><th className="num">Consumida</th><th className="num">MRP planeja</th><th>Posição</th></tr></thead>
                        <tbody>{visao.demandas.length === 0 ? <tr><td colSpan={6} className="erp-text-muted">Nenhuma demanda de expectativa de venda aberta.</td></tr>
                          : visao.demandas.map((d) => (
                            <tr key={d.code_demand}><td>Nº {d.code_demand}{d.mask ? ` · ${d.mask}` : ""}</td><td>{data(d.data)}</td><td className="num">{num(q(d.quantidade))}</td>
                              <td className="num">{num(q(d.consumida))}</td><td className="num">{num(q(d.a_planejar))}</td><td><Selo tom={posicao(d.posicao).tom}>{posicao(d.posicao).rotulo}</Selo></td></tr>
                          ))}</tbody>
                      </table>
                      <table className="erp-grid" style={{ marginTop: 10 }}>
                        <thead><tr><th>Pedido</th><th>Cliente</th><th>Entrega</th><th className="num">Vendido</th><th className="num">Consumiu</th><th className="num">Acima da expectativa</th></tr></thead>
                        <tbody>{visao.vendas.length === 0 ? <tr><td colSpan={6} className="erp-text-muted">Nenhum pedido confirmado do item.</td></tr>
                          : visao.vendas.map((v, i) => (
                            <tr key={i}><td>{v.pedido}/{v.sequencia}{v.mask ? ` · ${v.mask}` : ""}</td><td>{v.cliente || "—"}</td><td>{data(v.data)}</td><td className="num">{num(q(v.quantidade))}</td>
                              <td className="num">{num(q(v.consumiu))}</td><td className="num">{num(q(v.acima))}</td></tr>
                          ))}</tbody>
                      </table>
                    </Painel>
                  )}
                </>)}
              </div>
            </>)}
          </section>
        </div>
      </div>

      <Rodape>
        <div className="erp-status-item">Abertas: <strong>{kpis.abertas}</strong></div>
        {dem && <div className="erp-status-item">Demanda: <strong>{dem.code_demand}</strong></div>}
      </Rodape>

      {form && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="dem-titulo" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setForm(null); }}>
          <div className="erp-modal" style={{ width: "min(760px, 96vw)" }}>
            <div className="erp-modal-head"><div><strong id="dem-titulo">{form.code ? `Alterar demanda ${form.code}` : "Nova demanda independente"}</strong>
              <div className="erp-field-hint">Entra no próximo MRP, que gera a OF (item fabricado) ou a compra (item comprado).</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setForm(null)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              <Aviso feedback={feedback} busy={busy} />
              <div className="erp-fieldset-body" style={{ padding: 0 }}>
                <div className="erp-field erp-c8"><label className="erp-label erp-req">Item</label>
                  <LookupField<string> value={form.item || undefined} loader={loadItems} entityLabel="item" disabled={!!form.code && temSaida}
                    onChange={(c) => setForm((f) => f && ({ ...f, item: String(c ?? "") }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label" htmlFor="dem-mask">Máscara</label>
                  <input id="dem-mask" className="erp-input" placeholder="só item configurado" value={form.mask} onChange={(e) => setForm((f) => f && ({ ...f, mask: e.target.value }))} /></div>
                <div className="erp-field erp-c6"><label className="erp-label erp-req" htmlFor="dem-motivo">Motivo</label>
                  <select id="dem-motivo" className="erp-input" value={form.motivo} onChange={(e) => setForm((f) => f && ({ ...f, motivo: e.target.value as Motivo }))}>
                    <optgroup label="Expectativa de venda (a venda consome)">
                      {MOTIVOS.filter((m) => m.familia === "VENDA").map((m) => <option key={m.id} value={m.id}>{m.rotulo}</option>)}
                    </optgroup>
                    <optgroup label="Finalidade própria (atendida pela saída)">
                      {MOTIVOS.filter((m) => m.familia === "FINALIDADE").map((m) => <option key={m.id} value={m.id}>{m.rotulo}</option>)}
                    </optgroup>
                  </select>
                  {motivoForm && <span className="erp-field-hint">{motivoForm.ajuda}</span>}</div>
                <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="dem-qtd">Quantidade</label>
                  <input id="dem-qtd" className="erp-input num" inputMode="decimal" placeholder="0,000" value={form.quantidade} onChange={(e) => setForm((f) => f && ({ ...f, quantidade: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="dem-data">{nEntregas > 1 ? "Primeira entrega" : "Necessidade"}</label>
                  <input id="dem-data" className="erp-input" type="date" value={form.data} onChange={(e) => setForm((f) => f && ({ ...f, data: e.target.value }))} /></div>
                <div className="erp-field erp-c6"><label className="erp-label">Almoxarifado de destino</label>
                  <LookupField value={form.almox} loader={loadWarehouses} entityLabel="almoxarifado" clearable onChange={(c) => setForm((f) => f && ({ ...f, almox: c ? Number(c) : undefined }))} /></div>
                <div className="erp-field erp-c6"><label className="erp-label">Centro de custo</label>
                  <LookupField value={form.centro} loader={loadCostCenters} entityLabel="centro de custo" clearable onChange={(c) => setForm((f) => f && ({ ...f, centro: c ? Number(c) : undefined }))} /></div>
                <div className="erp-field erp-c6"><label className="erp-label">Cliente (opcional)</label>
                  <LookupField value={form.cliente} loader={loadCustomers} entityLabel="cliente" clearable onChange={(c) => setForm((f) => f && ({ ...f, cliente: c ? Number(c) : undefined }))} /></div>
                <div className="erp-field erp-c6"><label className={`erp-label${form.motivo === "PROJETO" ? " erp-req" : ""}`} htmlFor="dem-proj">Projeto / obra</label>
                  <input id="dem-proj" className="erp-input" maxLength={60} value={form.projeto} onChange={(e) => setForm((f) => f && ({ ...f, projeto: e.target.value }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label" htmlFor="dem-prio">Prioridade</label>
                  <select id="dem-prio" className="erp-input" value={form.prioridade} onChange={(e) => setForm((f) => f && ({ ...f, prioridade: Number(e.target.value) }))}>
                    {PRIORIDADES.map((p) => <option key={p.v} value={p.v}>{p.r}</option>)}
                  </select></div>
                <div className="erp-field erp-c8"><label className="erp-label" htmlFor="dem-obs">Observação</label>
                  <input id="dem-obs" className="erp-input" value={form.observacao} onChange={(e) => setForm((f) => f && ({ ...f, observacao: e.target.value }))} /></div>
              </div>
              {!form.code && (
                <div className="erp-fieldset" style={{ marginTop: 12 }}>
                  <div className="erp-fieldset-head">Programação de entregas <span style={{ fontWeight: 400, opacity: 0.65 }}>— opcional: divide a quantidade em entregas</span></div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label" htmlFor="dem-ent">Entregas</label>
                      <input id="dem-ent" className="erp-input num" type="number" min={1} max={104} value={form.entregas} onChange={(e) => setForm((f) => f && ({ ...f, entregas: e.target.value }))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label" htmlFor="dem-int">A cada (dias)</label>
                      <input id="dem-int" className="erp-input num" type="number" min={1} value={form.intervalo} disabled={nEntregas <= 1} onChange={(e) => setForm((f) => f && ({ ...f, intervalo: e.target.value }))} /></div>
                    <div className="erp-field erp-c6"><span className="erp-field-hint" style={{ marginTop: 22 }}>
                      {nEntregas > 1 ? (parte > 0 ? `${nEntregas} demandas de ${num(parte, 4)} a cada ${Number(form.intervalo) || 0} dias, a partir de ${data(form.data)}.` : "Informe a quantidade total.") : "Uma demanda só, na data informada."}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setForm(null)} disabled={busy}>Cancelar</button>
              <button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>{busy && <span className="erp-spin" />}{form.code ? "Salvar alteração" : "Cadastrar demanda"}</button>
            </div>
          </div>
        </div>
      )}

      {atender && dem && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="dem-atender" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setAtender(null); }}>
          <div className="erp-modal" style={{ width: "min(560px, 94vw)" }}>
            <div className="erp-modal-head"><div><strong id="dem-atender">Atender a demanda {dem.code_demand}</strong>
              <div className="erp-field-hint">Lança a saída do estoque para {dem.motivo_descricao.toLowerCase()}. Estornar a saída na Central de Estoque devolve o saldo à demanda.</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setAtender(null)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              <Aviso feedback={feedback} busy={busy} />
              <div className="erp-fieldset-body" style={{ padding: 0 }}>
                <div className="erp-field erp-c4"><label className="erp-label erp-req" htmlFor="at-qtd">Quantidade</label>
                  <input id="at-qtd" className="erp-input num" inputMode="decimal" value={atender.quantidade} onChange={(e) => setAtender((a) => a && ({ ...a, quantidade: e.target.value }))} />
                  <span className="erp-field-hint">saldo: {num(q(dem.a_planejar))}</span></div>
                <div className="erp-field erp-c8"><label className="erp-label erp-req">Almoxarifado de saída</label>
                  <LookupField value={atender.almox} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(c) => setAtender((a) => a && ({ ...a, almox: c ? Number(c) : undefined }))} /></div>
                <div className="erp-field erp-c12"><label className="erp-label erp-req" htmlFor="at-tipo">Tipo de movimento</label>
                  <select id="at-tipo" className="erp-input" value={atender.tipo} onChange={(e) => setAtender((a) => a && ({ ...a, tipo: e.target.value }))}>
                    <option value="">{tipos.length ? "Escolha…" : "Nenhum tipo de saída manual cadastrado (VEST0200)"}</option>
                    {tipos.map((t) => <option key={t.sigla} value={t.sigla}>{t.sigla} — {t.description}{t.requires_cost_center ? " (exige centro)" : ""}</option>)}
                  </select></div>
                <div className="erp-field erp-c12"><label className="erp-label" htmlFor="at-obs">Observação</label>
                  <input id="at-obs" className="erp-input" value={atender.observacao} onChange={(e) => setAtender((a) => a && ({ ...a, observacao: e.target.value }))} /></div>
              </div>
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setAtender(null)} disabled={busy}>Cancelar</button>
              <button className="erp-btn erp-btn-primary" onClick={confirmarAtender} disabled={busy}>{busy && <span className="erp-spin" />}Lançar saída</button>
            </div>
          </div>
        </div>
      )}

      {of && dem && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="dem-of" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setOf(null); }}>
          <div className="erp-modal" style={{ width: "min(560px, 94vw)" }}>
            <div className="erp-modal-head"><div><strong id="dem-of">Gerar OF da demanda {dem.code_demand}</strong>
              <div className="erp-field-hint">Abre a OF agora, ligada à demanda. No próximo MRP ela entra como suprimento firme e o cálculo só complementa os componentes.
                Sem ordem: <strong>{num(q(dem.sem_ordem))}</strong>{q(dem.coberta) > 0 ? <> (já há {num(q(dem.coberta))} em ordens)</> : null}. Uma quantidade maior (lote) vale, mas a demanda conta só o que estava sem ordem.</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setOf(null)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              <Aviso feedback={feedback} busy={busy} />
              <div className="erp-fieldset-body" style={{ padding: 0 }}>
                <div className="erp-field erp-c4"><label className="erp-label erp-req" htmlFor="of-qtd">Quantidade</label>
                  <input id="of-qtd" className="erp-input num" inputMode="decimal" value={of.quantidade} onChange={(e) => setOf((o) => o && ({ ...o, quantidade: e.target.value }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label" htmlFor="of-ini">Início</label>
                  <input id="of-ini" className="erp-input" type="date" value={of.inicio} onChange={(e) => setOf((o) => o && ({ ...o, inicio: e.target.value }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label" htmlFor="of-fim">Término</label>
                  <input id="of-fim" className="erp-input" type="date" value={of.fim} onChange={(e) => setOf((o) => o && ({ ...o, fim: e.target.value }))} /></div>
                <div className="erp-field erp-c6"><label className="erp-label" htmlFor="of-prio">Prioridade</label>
                  <select id="of-prio" className="erp-input" value={of.prioridade} onChange={(e) => setOf((o) => o && ({ ...o, prioridade: e.target.value }))}>
                    <option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENTE">Urgente</option>
                  </select></div>
              </div>
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setOf(null)} disabled={busy}>Cancelar</button>
              <button className="erp-btn erp-btn-primary" onClick={confirmarOF} disabled={busy}>{busy && <span className="erp-spin" />}Abrir OF</button>
            </div>
          </div>
        </div>
      )}

      {fechar && dem && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="dem-fechar" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setFechar(null); }}>
          <div className="erp-modal" style={{ width: "min(520px, 94vw)" }}>
            <div className="erp-modal-head"><div><strong id="dem-fechar">{fechar.acao === "cancelar" ? `Cancelar a demanda ${dem.code_demand}` : `Encerrar o saldo da demanda ${dem.code_demand}`}</strong>
              <div className="erp-field-hint">{fechar.acao === "cancelar" ? "A demanda sai do planejamento. O registro fica, com o motivo." : "O que já saiu ou já tem ordem fica no histórico; o saldo sai do planejamento."}</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setFechar(null)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              <Aviso feedback={feedback} busy={busy} />
              <div className="erp-field erp-c12"><label className="erp-label erp-req" htmlFor="fe-mot">Motivo</label>
                <input id="fe-mot" className="erp-input" value={fechar.motivo} onChange={(e) => setFechar((x) => x && ({ ...x, motivo: e.target.value }))} /></div>
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setFechar(null)} disabled={busy}>Voltar</button>
              <button className="erp-btn erp-btn-danger" onClick={confirmarFechar} disabled={busy || !fechar.motivo.trim()}>{busy && <span className="erp-spin" />}{fechar.acao === "cancelar" ? "Cancelar demanda" : "Encerrar saldo"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
