import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { type PeggingNode, type PeggingRoot, getPeggingDown, getPeggingRoots, getPeggingUp } from "@/services/mrpService";
import { errMessage } from "@/services/fiscalShared";
import { Kpis, Painel, Selo, Vazio } from "../planUi";
import { type Tom, data, normalizar, num } from "../planFormat";

/** Ordem cuja origem o planejador pediu para ver (de Sugestões ou Exceções). */
export type AlvoRastreamento = { kind: "SUGESTAO" | "ORDEM_FIRME"; code: number; rotulo: string };

const TOM_SUPRIMENTO: Record<string, Tom> = { ESTOQUE: "ok", ORDEM_FIRME: "info", SUGESTAO: "warn", FALTA: "danger" };
const ROTULO_SUPRIMENTO: Record<string, string> = { ESTOQUE: "Estoque", ORDEM_FIRME: "Ordem firme", SUGESTAO: "Sugestão", FALTA: "Falta" };

/**
 * Linhas da árvore do pegging com recuo por nível. Para baixo, os filhos são
 * os componentes que a ordem do nó pediu; para cima, quem depende dela.
 */
export function Arvore({ nos, modo }: { nos: PeggingNode[]; modo: "baixo" | "cima" }): JSX.Element {
  const [fechados, setFechados] = useState<Set<string>>(new Set());
  const linhas: JSX.Element[] = [];
  const percorre = (lista: PeggingNode[], nivel: number, prefixo: string) => {
    lista.forEach((n, i) => {
      const chave = `${prefixo}.${i}`;
      const fechado = fechados.has(chave);
      const temFilhos = n.children.length > 0;
      const ponta = modo === "baixo" ? n.supply : n.demand;
      linhas.push(
        <tr key={chave} className={n.supply.kind === "FALTA" ? "vpl-late" : n.late ? "vpl-atraso" : undefined} title={n.late ? n.late_reason : undefined}>
          <td style={{ paddingLeft: 12 + nivel * 22 }}>
            {temFilhos
              ? <button type="button" className="vpl-tree-toggle" aria-label={fechado ? "Abrir" : "Fechar"} onClick={() => setFechados((s) => { const x = new Set(s); if (x.has(chave)) x.delete(chave); else x.add(chave); return x; })}>{fechado ? "▸" : "▾"}</button>
              : <span className="vpl-tree-toggle" />}
            <span className="vpl-strong">{n.item_code}</span>
            <span className="vpl-sub" style={{ display: "inline", marginLeft: 6 }}>{n.item_description}</span>
          </td>
          <td className="num">{num(n.quantity)} {n.uom ?? ""}</td>
          <td>{data(n.need_date)}</td>
          <td>{modo === "baixo"
            ? <><Selo tom={TOM_SUPRIMENTO[ponta.kind] ?? "muted"}>{ponta.kind === "SUGESTAO" || ponta.kind === "ORDEM_FIRME" ? ponta.label : ROTULO_SUPRIMENTO[ponta.kind] ?? ponta.kind}</Selo>{ponta.date && <span className="vpl-sub" style={{ display: "inline", marginLeft: 6 }}>{data(ponta.date)}</span>}{n.late && <span style={{ marginLeft: 6 }}><Selo tom="warn" title={n.late_reason}>Atrasada</Selo></span>}</>
            : <span>{ponta.label}{n.late && <> <Selo tom="warn" title={n.late_reason}>Atrasada</Selo></>}</span>}</td>
        </tr>,
      );
      if (temFilhos && !fechado) percorre(n.children, nivel + 1, chave);
    });
  };
  percorre(nos, 0, "r");
  return (
    <div className="vpl-grid-scroll">
      <table className="erp-grid">
        <thead><tr><th>Item</th><th className="num">Quantidade</th><th>Necessidade</th><th>{modo === "baixo" ? "Coberto por" : "Para"}</th></tr></thead>
        <tbody>{linhas.length ? linhas : <tr><td colSpan={4} className="erp-grid-empty">Nada vinculado.</td></tr>}</tbody>
      </table>
    </div>
  );
}

/** Situação da cadeia de uma necessidade: falta pesa mais que atraso. */
export function SeloCadeia({ r }: { r: PeggingRoot }): JSX.Element {
  if (r.chain_shortage || r.shortage > 0) return <Selo tom="danger">Falta na cadeia</Selo>;
  if (r.chain_late) return <><Selo tom="warn" title={r.late_reason}>Atrasada</Selo>{r.late_reason && <span className="vpl-sub">{r.late_reason}</span>}</>;
  return <Selo tom="ok">Coberta</Selo>;
}

/**
 * Rastreamento (pegging) do último cálculo: de cada pedido/demanda até as
 * compras dos componentes, e de uma ordem até os pedidos que dependem dela —
 * o "pegged requirements" do SAP. Responde "esta compra serve a quem?" e
 * "o que falta para este pedido sair?".
 */
export function RastreamentoTab({ plano, versao, alvo, onLimparAlvo }: {
  plano?: number;
  versao: number;
  alvo?: AlvoRastreamento;
  onLimparAlvo: () => void;
}): JSX.Element {
  const [raizes, setRaizes] = useState<PeggingRoot[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [soFalta, setSoFalta] = useState(false);
  const [soAtraso, setSoAtraso] = useState(false);
  const [aberta, setAberta] = useState<number | null>(null);
  const [cadeia, setCadeia] = useState<PeggingNode[] | null>(null);
  const [acima, setAcima] = useState<PeggingNode[] | null>(null);

  const carregar = useCallback(async () => {
    if (!plano) { setRaizes([]); return; }
    setCarregando(true); setErro(null);
    try { setRaizes(await getPeggingRoots(plano)); setAberta(null); setCadeia(null); }
    catch (e) { setErro(errMessage(e)); }
    finally { setCarregando(false); }
  }, [plano]);
  useEffect(() => { void carregar(); }, [carregar, versao]);

  useEffect(() => {
    if (!plano || !alvo) { setAcima(null); return; }
    let vivo = true;
    getPeggingUp(plano, alvo.kind, alvo.code).then((r) => { if (vivo) setAcima(r); }).catch((e) => { if (vivo) setErro(errMessage(e)); });
    return () => { vivo = false; };
  }, [plano, alvo, versao]);

  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    return raizes.filter((r) => (!soFalta || r.chain_shortage || r.shortage > 0) && (!soAtraso || r.chain_late) && (!q || normalizar(`${r.demand.label} ${r.item_code} ${r.item_description}`).includes(q)));
  }, [raizes, busca, soFalta, soAtraso]);
  const comFalta = raizes.filter((r) => r.chain_shortage || r.shortage > 0).length;
  const comAtraso = raizes.filter((r) => r.chain_late).length;

  const abrir = async (i: number) => {
    if (!plano) return;
    if (aberta === i) { setAberta(null); setCadeia(null); return; }
    const r = visiveis[i];
    setAberta(i); setCadeia(null);
    try { setCadeia(await getPeggingDown(plano, { kind: r.demand.kind, code: r.demand.code, item_code: r.item_code, need_date: r.need_date })); }
    catch (e) { setErro(errMessage(e)); }
  };

  if (!plano) return <Painel titulo="Rastreamento"><Vazio titulo="Escolha o plano na barra" /></Painel>;
  return (
    <>
      {alvo && (
        <Painel titulo={`Para quem é ${alvo.rotulo}`} sub="do pedido/demanda de origem até esta ordem"
          acoes={<button className="erp-btn erp-btn-sm erp-btn-ghost" onClick={onLimparAlvo}>Fechar</button>} flush>
          {acima === null ? <Vazio titulo="Carregando…" /> : acima.length === 0
            ? <Vazio titulo="Esta ordem não está vinculada a nenhuma necessidade" texto="Ela sobra no último cálculo (estoque, lote mínimo) ou foi criada fora do MRP. Rode o MRP de novo se mudou algo depois." />
            : <Arvore nos={acima} modo="cima" />}
        </Painel>
      )}

      {erro && <Painel titulo="Rastreamento"><Vazio titulo="Não foi possível carregar o rastreamento" texto={erro} acao={<button className="erp-btn" onClick={() => void carregar()}>Tentar de novo</button>} /></Painel>}

      {!erro && !carregando && raizes.length === 0 ? (
        <Painel titulo="Necessidades de origem"><Vazio titulo="O plano ainda não tem rastreamento" texto="O rastreamento é gravado a cada cálculo do MRP. Rode o MRP do plano e volte aqui." /></Painel>
      ) : (<>
        <Kpis itens={[
          { label: "Necessidades de origem", value: num(raizes.length, 0), hint: "pedidos, demandas e previsões do plano" },
          { label: "Com falta na cadeia", value: num(comFalta, 0), hint: "algum componente ficou sem cobertura", tom: comFalta ? "danger" : "ok", onClick: () => setSoFalta((v) => !v) },
          { label: "Com atraso na cadeia", value: num(comAtraso, 0), hint: "alguma ordem termina depois da necessidade", tom: comAtraso ? "warn" : "ok", onClick: () => setSoAtraso((v) => !v) },
        ]} />
        <Painel titulo="Filtros">
          <div className="vpl-filters">
            <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="rt-busca">Pedido, demanda ou item</label>
              <input id="rt-busca" className="erp-input" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
            <label className="erp-field" style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-end" }}>
              <input type="checkbox" checked={soFalta} onChange={(e) => setSoFalta(e.target.checked)} aria-label="Só com falta" /><span>Só com falta na cadeia</span>
            </label>
            <label className="erp-field" style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-end" }}>
              <input type="checkbox" checked={soAtraso} onChange={(e) => setSoAtraso(e.target.checked)} aria-label="Só com atraso" /><span>Só com atraso na cadeia</span>
            </label>
            <button className="erp-btn" style={{ alignSelf: "flex-end" }} onClick={() => void carregar()} disabled={carregando}>{carregando && <span className="erp-spin" />}Atualizar</button>
          </div>
        </Painel>
        <Painel titulo="Necessidades de origem" sub={`${visiveis.length} de ${raizes.length} · clique para ver a cadeia até as compras`} flush>
          <div className="vpl-grid-scroll">
            <table className="erp-grid">
              <thead><tr><th>Origem</th><th>Item</th><th>Necessidade</th><th className="num">Quantidade</th><th className="num">Estoque</th><th className="num">Firmes</th><th className="num">Sugestões</th><th>Cadeia</th><th>Pronto em</th></tr></thead>
              <tbody>
                {visiveis.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhuma necessidade com esses filtros.</td></tr>}
                {visiveis.map((r, i) => (
                  <Fragment key={`${r.demand.kind}-${r.demand.code ?? ""}-${r.item_code}-${r.need_date}`}>
                    <tr className={`vpl-click${aberta === i ? " erp-row-sel" : ""}`} onClick={() => void abrir(i)}>
                      <td className="vpl-strong">{r.demand.label}</td>
                      <td>{r.item_code}<span className="vpl-sub">{r.item_description}</span></td>
                      <td>{data(r.need_date)}</td>
                      <td className="num">{num(r.quantity)} {r.uom ?? ""}</td>
                      <td className="num">{r.from_stock ? num(r.from_stock) : "—"}</td>
                      <td className="num">{r.from_firm ? num(r.from_firm) : "—"}</td>
                      <td className="num">{r.from_suggestions ? num(r.from_suggestions) : "—"}</td>
                      <td><SeloCadeia r={r} /></td>
                      <td>{r.latest_supply ? data(r.latest_supply) : "—"}</td>
                    </tr>
                    {aberta === i && (
                      <tr className="vpl-inline-edit"><td colSpan={9} style={{ padding: 0 }}>
                        {cadeia === null ? <div style={{ padding: 12 }}>Carregando a cadeia…</div> : <Arvore nos={cadeia} modo="baixo" />}
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>
        <p className="erp-note">O rastreamento é o do último cálculo do MRP: firmar ou reprogramar uma ordem aparece aqui no próximo cálculo. "Pronto em" é quando a cadeia inteira fica pronta (o fim programado na máquina, quando a fabricação termina depois da necessidade); "Atrasada" quer dizer que alguma ordem da cadeia termina depois da necessidade (pela capacidade das máquinas) ou já devia ter começado.</p>
      </>)}
    </>
  );
}
