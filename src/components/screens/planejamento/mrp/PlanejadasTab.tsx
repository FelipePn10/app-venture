import { useMemo, useState } from "react";
import type { PlannedOrder, PlannedTarget } from "@/services/mrpService";
import { Detalhe, Painel, Selo, Vazio } from "../planUi";
import { data, duracao, ehCompra, ehFabricacao, normalizar, num, situacaoPlanejada, tipoDemanda, tipoOrdem } from "../planFormat";
import { useSelecao } from "../planHooks";

type FiltroSituacao = "todas" | "planejadas" | "liberadas" | "firmes";
const SITUACOES: { id: FiltroSituacao; rotulo: string }[] = [
  { id: "todas", rotulo: "Todas" }, { id: "planejadas", rotulo: "Planejadas" },
  { id: "liberadas", rotulo: "Liberadas" }, { id: "firmes", rotulo: "Firmes" },
];

const codigoDa = (o: PlannedOrder) => o.code ?? o.planned_code ?? 0;

/**
 * Ordens planejadas: o que o MRP firmou ou o planejador criou. Antes era uma
 * grade no fim da aba de resultado, com um botão "Firmar" por linha e sem dizer
 * a que plano a ordem pertencia. Aqui a ordem tem situação legível (planejada,
 * liberada, firme), filtros e as três transições do backend — firmar, liberar e
 * voltar para planejada — em lote, validado antes da primeira alteração.
 */
export function PlanejadasTab({ ordens, plano, busy, onTransicionar, onVerOrigem }: {
  ordens: PlannedOrder[];
  plano?: number;
  busy: boolean;
  onTransicionar: (codes: number[], alvo: PlannedTarget) => Promise<void>;
  /** Abre o rastreamento: de quais pedidos/demandas esta ordem depende. */
  onVerOrigem: (o: PlannedOrder) => void;
}): JSX.Element {
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<FiltroSituacao>("todas");
  const [tipo, setTipo] = useState<"todos" | "fabricacao" | "compra">("todos");
  const [soDoPlano, setSoDoPlano] = useState(true);
  const [aberta, setAberta] = useState<number | null>(null);
  const { sel, alternar, definir, limpar } = useSelecao<number>();

  const doPlano = useMemo(() => ordens.filter((o) => !soDoPlano || !plano || o.plan_code === plano), [ordens, plano, soDoPlano]);
  const contagem = useMemo(() => ({
    todas: doPlano.length,
    planejadas: doPlano.filter((o) => o.status === "PLANNED").length,
    liberadas: doPlano.filter((o) => o.status === "RELEASED" && !o.is_firm).length,
    firmes: doPlano.filter((o) => o.is_firm).length,
  }), [doPlano]);
  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    return doPlano.filter((o) =>
      (situacao === "todas" || (situacao === "planejadas" ? o.status === "PLANNED" : situacao === "firmes" ? o.is_firm : o.status === "RELEASED" && !o.is_firm))
      && (tipo === "todos" || (tipo === "fabricacao" ? ehFabricacao(o.order_type) : ehCompra(o.order_type)))
      && (!q || normalizar(`${o.item_code} ${o.order_number ?? ""} ${codigoDa(o)}`).includes(q)));
  }, [doPlano, busca, situacao, tipo]);

  const marcadas = ordens.filter((o) => sel.has(codigoDa(o)));
  const todasMarcadas = visiveis.length > 0 && visiveis.every((o) => sel.has(codigoDa(o)));
  // Cada transição só aparece quando faz sentido para TODAS as marcadas: o
  // backend valida o lote inteiro e recusaria o grupo por uma ordem só.
  const podeFirmar = marcadas.length > 0 && marcadas.every((o) => !o.is_firm);
  const podeLiberar = marcadas.length > 0 && marcadas.every((o) => o.status === "PLANNED");
  const podeVoltar = marcadas.length > 0 && marcadas.every((o) => o.status === "RELEASED" && !o.is_firm);
  const detalhe = ordens.find((o) => codigoDa(o) === aberta) ?? null;

  const transicionar = async (codes: number[], alvo: PlannedTarget) => { await onTransicionar(codes, alvo); limpar(); };

  if (ordens.length === 0) {
    return <Painel titulo="Ordens planejadas"><Vazio titulo="Nenhuma ordem planejada" texto="Firme sugestões na aba Sugestões: cada uma vira uma ordem planejada — e, se for de fabricação, já gera a ordem de produção." /></Painel>;
  }

  return (
    <>
      <Painel titulo="Filtros">
        <div className="vpl-filters">
          <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="po-busca">Item ou número da ordem</label>
            <input id="po-busca" className="erp-input" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
          <div className="erp-field"><label className="erp-label" htmlFor="po-tipo">Tipo</label>
            <select id="po-tipo" className="erp-input" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
              <option value="todos">Fabricação e compra</option><option value="fabricacao">Só fabricação</option><option value="compra">Só compra</option>
            </select></div>
          {plano ? <label className="erp-check"><input type="checkbox" checked={soDoPlano} onChange={(e) => setSoDoPlano(e.target.checked)} />Só do plano {plano}</label> : null}
        </div>
        <div className="erp-chips" style={{ marginTop: 10 }}>
          {SITUACOES.map((s) => (
            <button key={s.id} type="button" className={`erp-chip${situacao === s.id ? " active" : ""}`} onClick={() => setSituacao(s.id)}>
              {s.rotulo} · {contagem[s.id]}
            </button>
          ))}
        </div>
      </Painel>

      {sel.size > 0 && (
        <div className="vpl-bulk">
          <span><strong>{sel.size}</strong> ordem(ns) selecionada(s)</span>
          <span className="vpl-bulk-spacer" />
          <button className="erp-btn erp-btn-sm" onClick={limpar} disabled={busy}>Limpar seleção</button>
          <button className="erp-btn erp-btn-sm" disabled={busy || !podeVoltar} title="Só ordem liberada, não firme e sem apontamento volta para planejada"
            onClick={() => void transicionar([...sel], "PLANNED")}>Voltar para planejada</button>
          <button className="erp-btn erp-btn-sm" disabled={busy || !podeLiberar} title="Libera a ordem mantendo as datas ajustáveis"
            onClick={() => void transicionar([...sel], "RELEASED")}>Liberar</button>
          <button className="erp-btn erp-btn-primary erp-btn-sm" disabled={busy || !podeFirmar} title="Firme: liberada com as datas travadas"
            onClick={() => void transicionar([...sel], "FIRM")}>Firmar</button>
        </div>
      )}

      <div className={detalhe ? "vpl-cols wide-left" : ""}>
        <Painel titulo="Ordens planejadas" sub={`${visiveis.length} de ${doPlano.length}`} flush>
          <div className="vpl-grid-scroll">
            <table className="erp-grid">
              <thead><tr>
                <th className="vpl-check"><input type="checkbox" aria-label="Marcar todas" checked={todasMarcadas}
                  onChange={() => (todasMarcadas ? limpar() : definir(visiveis.map(codigoDa)))} /></th>
                <th>Ordem</th><th>Item</th><th>Tipo</th><th className="num">Qtd</th><th>Necessidade</th><th>Início</th><th>Fim</th><th>Situação</th>
              </tr></thead>
              <tbody>
                {visiveis.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhuma ordem com esses filtros.</td></tr>}
                {visiveis.map((o) => {
                  const c = codigoDa(o);
                  const s = situacaoPlanejada(o.status, o.is_firm);
                  return (
                    <tr key={c} className={`vpl-click${aberta === c ? " erp-row-sel" : ""}`} onClick={() => setAberta(c)}>
                      <td className="vpl-check" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Marcar ordem ${o.order_number ?? c}`} checked={sel.has(c)} onChange={() => alternar(c)} /></td>
                      <td className="vpl-strong">{o.order_number ?? c}{o.plan_code && (!soDoPlano || !plano) ? <span className="vpl-sub">plano {o.plan_code}</span> : null}</td>
                      <td>{o.item_code}</td>
                      <td>{tipoOrdem(o.order_type)}</td>
                      <td className="num">{num(o.quantity, 4)}</td>
                      <td>{data(o.need_date)}</td>
                      <td>{data(o.start_date)}</td>
                      <td>{data(o.end_date)}</td>
                      <td><Selo tom={s.tom}>{s.rotulo}</Selo></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Painel>

        {detalhe && (() => {
          const s = situacaoPlanejada(detalhe.status, detalhe.is_firm);
          const c = codigoDa(detalhe);
          return (
            <Painel titulo={`Ordem ${detalhe.order_number ?? c}`} sub={<Selo tom={s.tom}>{s.rotulo}</Selo>}
              acoes={<button className="erp-btn erp-btn-sm erp-btn-ghost" onClick={() => setAberta(null)}>Fechar</button>}>
              <Detalhe itens={[
                { label: "Item", value: detalhe.item_code, forte: true },
                { label: "Tipo", value: tipoOrdem(detalhe.order_type) },
                { label: "Quantidade", value: num(detalhe.quantity, 4), forte: true },
                { label: "Origem", value: tipoDemanda(detalhe.demand_type) },
                { label: "Plano", value: detalhe.plan_code ?? "—" },
                { label: "Necessidade", value: data(detalhe.need_date) },
                { label: "Início", value: data(detalhe.start_date) },
                { label: "Fim", value: data(detalhe.end_date) },
                { label: "Máquina", value: detalhe.machine_code ?? "—" },
                { label: "Tempo de máquina", value: duracao(detalhe.production_time) },
              ]} />
              <p className="erp-note" style={{ marginTop: 12 }}>
                {detalhe.is_firm
                  ? <>Ordem <strong>firme</strong>: liberada e com as datas travadas — não muda mais de situação. Ajustes de quantidade e data são feitos na ordem de produção ou de compra que ela gerou.</>
                  : detalhe.status === "RELEASED"
                    ? <>Ordem <strong>liberada</strong>. Ainda volta a planejada enquanto não tiver gerado ordem de produção nem recebido apontamento ou consumo.</>
                    : <>Ordem <strong>planejada</strong>: o MRP ainda pode mexer nela no próximo cálculo. Libere ou firme para garanti-la.</>}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {!detalhe.is_firm && <button className="erp-btn erp-btn-primary" disabled={busy} onClick={() => void transicionar([c], "FIRM")}>Firmar</button>}
                {detalhe.status === "PLANNED" && <button className="erp-btn" disabled={busy} onClick={() => void transicionar([c], "RELEASED")}>Liberar</button>}
                {detalhe.status === "RELEASED" && !detalhe.is_firm && <button className="erp-btn" disabled={busy} onClick={() => void transicionar([c], "PLANNED")}>Voltar para planejada</button>}
                {plano && <button className="erp-btn" disabled={busy} onClick={() => onVerOrigem(detalhe)} title="Pedidos e demandas que o último cálculo do MRP atendeu com esta ordem">Para quem é</button>}
              </div>
            </Painel>
          );
        })()}
      </div>
    </>
  );
}
