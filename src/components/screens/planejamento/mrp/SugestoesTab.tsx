import { useMemo, useState } from "react";
import type { MrpSuggestion } from "@/services/mrpService";
import { Detalhe, Painel, Selo, Vazio } from "../planUi";
import { data, dataHoraRelogio, duracao, ehCompra, ehFabricacao, normalizar, num, tipoDemanda, tipoOrdem } from "../planFormat";
import { useSelecao } from "../planHooks";

type FiltroTipo = "todos" | "fabricacao" | "compra";
type FiltroSituacao = "pendentes" | "firmadas" | "todas";
const firmada = (s: MrpSuggestion) => Boolean(s.planned_order_code);

/**
 * Sugestões do cálculo. O planejador revisa e firma — a grade antiga tinha um
 * botão por linha e nenhum filtro: com 200 sugestões, achar as atrasadas era
 * rolar e ler coluna por coluna. Aqui filtra por item, tipo e atraso, firma em
 * lote e o detalhe da linha abre ao lado.
 */
export function SugestoesTab({ sugestoes, busy, onFirmar, onVerPerfil, onVerOrigem }: {
  sugestoes: MrpSuggestion[];
  busy: boolean;
  onFirmar: (codes: number[]) => Promise<void>;
  onVerPerfil: (item: string) => void;
  /** Rastreamento: de que pedido/demanda vem esta sugestão. */
  onVerOrigem: (s: MrpSuggestion) => void;
}): JSX.Element {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<FiltroTipo>("todos");
  const [soAtrasadas, setSoAtrasadas] = useState(false);
  const [situacao, setSituacao] = useState<FiltroSituacao>("pendentes");
  const [aberta, setAberta] = useState<number | null>(null);
  const { sel, alternar, definir, limpar } = useSelecao<number>();

  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    return sugestoes.filter((s) =>
      (situacao === "todas" || (situacao === "firmadas") === firmada(s))
      && (tipo === "todos" || (tipo === "fabricacao" ? ehFabricacao(s.order_type) : ehCompra(s.order_type)))
      && (!soAtrasadas || s.capacity_late)
      && (!q || normalizar(`${s.item_code} ${s.parent_item_code ?? ""} ${s.code} ${s.order_number ?? ""}`).includes(q)));
  }, [sugestoes, busca, tipo, soAtrasadas, situacao]);
  const nFirmadas = sugestoes.filter(firmada).length;

  const marcaveis = visiveis.filter((s) => !firmada(s));
  const todasMarcadas = marcaveis.length > 0 && marcaveis.every((s) => sel.has(s.code));
  const detalhe = sugestoes.find((s) => s.code === aberta) ?? null;

  const firmar = async (codes: number[]) => { await onFirmar(codes); limpar(); if (aberta && codes.includes(aberta)) setAberta(null); };

  if (sugestoes.length === 0) {
    return <Painel titulo="Sugestões de ordens"><Vazio titulo="Nenhuma sugestão para este plano" texto={<>Rode o MRP na barra acima. As sugestões firmadas viram ordens planejadas e somem desta lista.</>} /></Painel>;
  }

  return (
    <>
      <Painel titulo="Filtros">
        <div className="vpl-filters">
          <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="sug-busca">Item, ordem ou item pai</label>
            <input id="sug-busca" className="erp-input" placeholder="Ex.: CHASSI" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
          <div className="erp-field"><label className="erp-label" htmlFor="sug-tipo">Tipo</label>
            <select id="sug-tipo" className="erp-input" value={tipo} onChange={(e) => setTipo(e.target.value as FiltroTipo)}>
              <option value="todos">Fabricação e compra</option><option value="fabricacao">Só fabricação</option><option value="compra">Só compra</option>
            </select></div>
          <label className="erp-check"><input type="checkbox" checked={soAtrasadas} onChange={(e) => setSoAtrasadas(e.target.checked)} />Só as que terminam depois da necessidade</label>
        </div>
        <div className="erp-chips" style={{ marginTop: 10 }}>
          {([["pendentes", "A firmar", sugestoes.length - nFirmadas], ["firmadas", "Já firmadas", nFirmadas], ["todas", "Todas", sugestoes.length]] as const).map(([id, rotulo, n]) => (
            <button key={id} type="button" className={`erp-chip${situacao === id ? " active" : ""}`} onClick={() => { setSituacao(id); limpar(); }}>{rotulo} · {n}</button>
          ))}
        </div>
      </Painel>

      {sel.size > 0 && (
        <div className="vpl-bulk">
          <span><strong>{sel.size}</strong> sugestão(ões) selecionada(s)</span>
          <span className="vpl-bulk-spacer" />
          <button className="erp-btn erp-btn-sm" onClick={limpar} disabled={busy}>Limpar seleção</button>
          <button className="erp-btn erp-btn-primary erp-btn-sm" onClick={() => void firmar([...sel])} disabled={busy}>Firmar selecionadas</button>
        </div>
      )}

      <div className={detalhe ? "vpl-cols wide-left" : ""}>
        <Painel titulo="Sugestões" sub={`${visiveis.length} de ${sugestoes.length}`} flush>
          <div className="vpl-grid-scroll">
            <table className="erp-grid">
              <thead><tr>
                <th className="vpl-check"><input type="checkbox" aria-label="Marcar todas" checked={todasMarcadas}
                  onChange={() => (todasMarcadas ? limpar() : definir(visiveis.filter((s) => !firmada(s)).map((s) => s.code)))} /></th>
                <th>Item</th><th>Tipo</th><th className="num">Qtd</th><th>Necessidade</th><th>Início</th><th>Situação</th><th />
              </tr></thead>
              <tbody>
                {visiveis.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhuma sugestão com esses filtros.</td></tr>}
                {visiveis.map((s) => (
                  <tr key={s.code} className={`vpl-click${aberta === s.code ? " erp-row-sel" : ""}${s.capacity_late ? " vpl-late" : ""}`} onClick={() => setAberta(s.code)}>
                    <td className="vpl-check" onClick={(e) => e.stopPropagation()}>{!firmada(s) && <input type="checkbox" aria-label={`Marcar sugestão ${s.code}`} checked={sel.has(s.code)} onChange={() => alternar(s.code)} />}</td>
                    <td className="vpl-strong">{s.item_code}{s.parent_item_code && <span className="vpl-sub">para {s.parent_item_code}</span>}</td>
                    <td>{tipoOrdem(s.order_type)}</td>
                    <td className="num">{num(s.quantity, 4)}</td>
                    <td>{data(s.need_date)}</td>
                    <td>{data(s.start_date)}</td>
                    <td>{situacaoDa(s)}</td>
                    <td className="vpl-actions" onClick={(e) => e.stopPropagation()}>
                      {firmada(s) ? <Selo tom="ok">Firmada</Selo> : <button className="erp-btn erp-btn-sm" onClick={() => void firmar([s.code])} disabled={busy}>Firmar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>

        {detalhe && (
          <Painel titulo={`Sugestão ${detalhe.code}`} sub={detalhe.order_number ? `vira a ordem ${detalhe.order_number}` : undefined}
            acoes={<button className="erp-btn erp-btn-sm erp-btn-ghost" onClick={() => setAberta(null)} aria-label="Fechar detalhe">Fechar</button>}>
            <Detalhe itens={[
              { label: "Item", value: detalhe.item_code, forte: true },
              { label: "Tipo", value: tipoOrdem(detalhe.order_type) },
              { label: "Quantidade", value: num(detalhe.quantity, 4), forte: true },
              { label: "Origem", value: tipoDemanda(detalhe.demand_type) },
              { label: "Item pai", value: detalhe.parent_item_code ?? "—" },
              { label: "Nível (LLC)", value: detalhe.llc ?? "—" },
              { label: "Necessidade", value: data(detalhe.need_date) },
              { label: "Início sugerido", value: data(detalhe.start_date) },
              { label: "Término previsto", value: detalhe.estimated_end_at ? dataHoraRelogio(detalhe.estimated_end_at) : "—" },
              { label: "Máquina", value: detalhe.machine_code ?? "—" },
              { label: "Tempo de máquina", value: duracao(detalhe.production_time) },
              { label: "Situação", value: situacaoDa(detalhe) },
              { label: "Ordem planejada", value: detalhe.planned_order_code ? `firmada (${detalhe.order_number ?? detalhe.planned_order_code})` : "ainda não firmada" },
            ]} />
            {detalhe.capacity_late && (
              <p className="erp-note" style={{ marginTop: 12 }}>
                A máquina só termina esta ordem <strong>depois da data de necessidade</strong>. Antecipe o início,
                use uma máquina equivalente ou negocie a data — firmar assim já nasce atrasada.
              </p>
            )}
            {detalhe.notes && <p className="erp-note" style={{ marginTop: 8 }}>{detalhe.notes}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {!firmada(detalhe) && <button className="erp-btn erp-btn-primary" onClick={() => void firmar([detalhe.code])} disabled={busy}>Firmar sugestão</button>}
              <button className="erp-btn" onClick={() => onVerPerfil(detalhe.item_code)} disabled={busy}>Ver perfil do item</button>
              <button className="erp-btn" onClick={() => onVerOrigem(detalhe)} disabled={busy}>Para quem é</button>
            </div>
          </Painel>
        )}
      </div>
    </>
  );
}

function situacaoDa(s: MrpSuggestion): JSX.Element {
  if (!ehFabricacao(s.order_type)) return <Selo tom="muted">Compra</Selo>;
  if (!s.estimated_end_at) return <Selo tom="muted" title="O item não tem máquina ou roteiro com tempo">Sem programação</Selo>;
  return s.capacity_late
    ? <Selo tom="danger" title={`Termina em ${dataHoraRelogio(s.estimated_end_at)}`}>Termina atrasada</Selo>
    : <Selo tom="ok" title={`Termina em ${dataHoraRelogio(s.estimated_end_at)}`}>No prazo</Selo>;
}
