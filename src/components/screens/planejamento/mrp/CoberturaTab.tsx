import { useCallback, useEffect, useMemo, useState } from "react";
import { type CoverageRow, type CoverageStatus, getCoverage } from "@/services/mrpReportsService";
import type { MrpSuggestion } from "@/services/mrpService";
import { errMessage } from "@/services/fiscalShared";
import { Kpis, Painel, Selo, Vazio } from "../planUi";
import { type Tom, data, normalizar, num } from "../planFormat";

const FAROL: Record<CoverageStatus, { rotulo: string; tom: Tom }> = {
  CRITICO: { rotulo: "Crítico", tom: "danger" },
  ATENCAO: { rotulo: "Atenção", tom: "warn" },
  OK: { rotulo: "Coberto", tom: "ok" },
};
const TIPO_ITEM: Record<string, string> = { FABRICADO: "Fabricado", COMPRADO: "Comprado", TERCEIRIZADO: "Terceirizado" };

/** Dias de cobertura em texto: vazio cobre o plano todo; negativo já venceu. */
function dias(n?: number, quando?: string): { texto: string; sub?: string; tom?: Tom } {
  if (n === undefined) return { texto: "Todo o horizonte" };
  if (n < 0) return { texto: `Vencida há ${-n} d`, sub: data(quando), tom: "danger" };
  if (n === 0) return { texto: "Acaba hoje", sub: data(quando), tom: "danger" };
  return { texto: `${n} dia${n === 1 ? "" : "s"}`, sub: `até ${data(quando)}`, tom: n <= 7 ? "warn" : undefined };
}

/**
 * Monitor de cobertura de materiais: para cada item do plano, até quando o
 * estoque cobre e até quando estoque + ordens firmes cobrem, com o farol do
 * item. É o Monitor Material Coverage do SAP (e o MD07): o planejador vê
 * primeiro o que vai faltar, filtra pelos itens dele e firma a planejada que
 * cobre a falta sem sair da tela.
 */
export function CoberturaTab({ plano, versao, sugestoes, busy, onFirmar, onVerPerfil }: {
  plano?: number;
  /** Muda quando o MRP roda ou uma sugestão é firmada — a cobertura relê. */
  versao: number;
  sugestoes: MrpSuggestion[];
  busy: boolean;
  onFirmar: (codes: number[]) => Promise<void>;
  onVerPerfil: (item: string) => void;
}): JSX.Element {
  const [linhas, setLinhas] = useState<CoverageRow[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [farol, setFarol] = useState<CoverageStatus | "">("");
  const [planejador, setPlanejador] = useState("");
  const [tipo, setTipo] = useState("");
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    if (!plano) { setLinhas([]); return; }
    setCarregando(true); setErro(null);
    try { setLinhas(await getCoverage(plano)); }
    catch (e) { setErro(errMessage(e)); }
    finally { setCarregando(false); }
  }, [plano]);
  useEffect(() => { void carregar(); }, [carregar, versao]);

  const planejadores = useMemo(() => {
    const m = new Map<string, string>();
    linhas.forEach((l) => m.set(l.planner_code === undefined ? "" : String(l.planner_code), l.planner_name || (l.planner_code === undefined ? "Sem planejador" : `Planejador ${l.planner_code}`)));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [linhas]);
  const filtradas = useMemo(() => {
    const q = normalizar(busca.trim());
    return linhas.filter((l) =>
      (!planejador || (planejador === "-" ? l.planner_code === undefined : String(l.planner_code) === planejador))
      && (!tipo || l.item_type === tipo)
      && (!q || normalizar(`${l.item_code} ${l.description}`).includes(q)));
  }, [linhas, planejador, tipo, busca]);
  const visiveis = farol ? filtradas.filter((l) => l.status === farol) : filtradas;
  const conta = (s: CoverageStatus) => filtradas.filter((l) => l.status === s).length;

  /** Sugestões ainda não firmadas do item — o que "Firmar" transforma em ordem. */
  const pendentesDo = useCallback((item: string) => sugestoes.filter((s) => s.item_code === item && !s.planned_order_code).map((s) => s.code), [sugestoes]);

  if (!plano) return <Painel titulo="Cobertura de materiais"><Vazio titulo="Escolha o plano na barra" /></Painel>;
  if (erro) return <Painel titulo="Cobertura de materiais"><Vazio titulo="Não foi possível carregar a cobertura" texto={erro} acao={<button className="erp-btn" onClick={() => void carregar()}>Tentar de novo</button>} /></Painel>;
  if (!carregando && linhas.length === 0) {
    return <Painel titulo="Cobertura de materiais"><Vazio titulo="O plano ainda não foi calculado" texto="A cobertura usa o resultado do último cálculo do MRP. Rode o MRP do plano e volte aqui." /></Painel>;
  }

  return (
    <>
      <Kpis itens={[
        { label: "Críticos", value: num(conta("CRITICO"), 0), hint: "falta vencida ou planejada atrasada", tom: conta("CRITICO") ? "danger" : undefined, onClick: () => setFarol(farol === "CRITICO" ? "" : "CRITICO") },
        { label: "Atenção", value: num(conta("ATENCAO"), 0), hint: "falta coberta só por planejada", tom: conta("ATENCAO") ? "warn" : undefined, onClick: () => setFarol(farol === "ATENCAO" ? "" : "ATENCAO") },
        { label: "Cobertos", value: num(conta("OK"), 0), hint: "estoque e ordens firmes bastam", tom: "ok", onClick: () => setFarol(farol === "OK" ? "" : "OK") },
      ]} />

      <Painel titulo="Filtros">
        <div className="vpl-filters">
          <div className="erp-field"><label className="erp-label" htmlFor="cob-planejador">Planejador</label>
            <select id="cob-planejador" className="erp-input" style={{ minWidth: 200 }} value={planejador} onChange={(e) => setPlanejador(e.target.value)}>
              <option value="">Todos</option>
              {planejadores.map(([c, n]) => <option key={c || "-"} value={c || "-"}>{n}</option>)}
            </select></div>
          <div className="erp-field"><label className="erp-label" htmlFor="cob-tipo">Tipo do item</label>
            <select id="cob-tipo" className="erp-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option><option value="FABRICADO">Fabricado</option><option value="COMPRADO">Comprado</option><option value="TERCEIRIZADO">Terceirizado</option>
            </select></div>
          <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="cob-busca">Item</label>
            <input id="cob-busca" className="erp-input" placeholder="Código ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
          <button className="erp-btn" style={{ alignSelf: "flex-end" }} onClick={() => void carregar()} disabled={carregando}>{carregando && <span className="erp-spin" />}Atualizar</button>
        </div>
        <div className="erp-chips" style={{ marginTop: 10 }}>
          <button type="button" className={`erp-chip${farol === "" ? " active" : ""}`} onClick={() => setFarol("")}>Todos · {filtradas.length}</button>
          {(["CRITICO", "ATENCAO", "OK"] as CoverageStatus[]).map((s) => (
            <button key={s} type="button" className={`erp-chip${farol === s ? " active" : ""}`} onClick={() => setFarol(s)}>{FAROL[s].rotulo} · {conta(s)}</button>
          ))}
        </div>
      </Painel>

      <Painel titulo="Cobertura por item" sub={`${visiveis.length} de ${linhas.length} · do mais urgente para o mais tranquilo`} flush>
        <div className="vpl-grid-scroll">
          <table className="erp-grid">
            <thead><tr>
              <th>Situação</th><th>Item</th><th>Planejador</th>
              <th className="num">Estoque</th><th className="num">Necessidade</th><th className="num">Firmes</th><th className="num">Planejadas</th>
              <th>Cobertura do estoque</th><th>Com ordens firmes</th><th className="num">Falta sem planejada</th><th />
            </tr></thead>
            <tbody>
              {visiveis.length === 0 && <tr><td colSpan={11} className="erp-grid-empty">Nenhum item com esses filtros.</td></tr>}
              {visiveis.map((l) => {
                const f = FAROL[l.status] ?? FAROL.OK;
                const e = dias(l.days_of_supply, l.stock_shortage_date);
                const r = dias(l.receipt_days_of_supply, l.firm_shortage_date);
                const pend = pendentesDo(l.item_code);
                return (
                  <tr key={l.item_code}>
                    <td><Selo tom={f.tom} title={l.reason}>{f.rotulo}</Selo></td>
                    <td className="vpl-strong">{l.item_code}<span className="vpl-sub">{l.description} · {TIPO_ITEM[l.item_type] ?? l.item_type}</span></td>
                    <td>{l.planner_name || (l.planner_code === undefined ? "—" : l.planner_code)}</td>
                    <td className="num">{num(l.stock)}{l.safety_stock > 0 && <span className="vpl-sub">seg. {num(l.safety_stock)}</span>}</td>
                    <td className="num">{num(l.demand)}</td>
                    <td className="num">{num(l.firm_supply)}</td>
                    <td className="num">{num(l.planned_supply)}{l.planned_orders > 0 && <span className="vpl-sub">{l.planned_orders} a firmar</span>}</td>
                    <td><span className={e.tom ? `vpl-tom-${e.tom}` : undefined}>{e.texto}</span>{e.sub && <span className="vpl-sub">{e.sub}</span>}</td>
                    <td><span className={r.tom ? `vpl-tom-${r.tom}` : undefined}>{r.texto}</span>{r.sub && <span className="vpl-sub">{r.sub}</span>}</td>
                    <td className="num">{l.firm_shortage_qty > 0 ? <strong>{num(l.firm_shortage_qty)} {l.uom ?? ""}</strong> : "—"}</td>
                    <td className="vpl-actions">
                      <button className="erp-btn erp-btn-sm" onClick={() => onVerPerfil(l.item_code)}>Ver perfil</button>
                      {pend.length > 0 && l.status !== "OK" && (
                        <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy}
                          title="Firma as ordens planejadas do item que cobrem a falta"
                          onClick={() => void onFirmar(pend)}>Firmar {pend.length}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Painel>
      <p className="erp-note">A cobertura é a do último cálculo do MRP. Firmar uma planejada a transforma em ordem; ela passa a contar como firme no próximo cálculo.</p>
    </>
  );
}
