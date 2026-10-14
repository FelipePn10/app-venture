import { Fragment, useMemo, useState } from "react";
import type { MrpException, MrpExceptionAction } from "@/services/mrpService";
import { tipoExcecao, tomDaExcecao } from "./excecoes";
import { Painel, Selo, Vazio } from "../planUi";
import { data, dataHora, hojeISO, normalizar } from "../planFormat";

const REPROGRAMAVEIS = new Set(["EXPEDITE", "RESCHEDULE_IN", "RESCHEDULE_OUT"]);
const TRATAMENTO: Record<string, string> = { REPROGRAMADA: "Reprogramada", CANCELADA: "Ordem cancelada", TRATADA: "Tratada" };
type FiltroSituacao = "pendentes" | "tratadas" | "todas";
type Edicao = { code: number; acao: MrpExceptionAction; data: string; nota: string };

/** Data sugerida no passado vira hoje: não se reprograma para ontem. */
/** Até três origens por extenso; o resto vira "+N" (a lista completa fica no title). */
function afetados(lista: string[]): string {
  return lista.length <= 3 ? lista.join(" · ") : `${lista.slice(0, 3).join(" · ")} +${lista.length - 3}`;
}

function destinoPadrao(e: MrpException): string {
  const hoje = hojeISO();
  const sugerida = e.suggested_date?.slice(0, 10) ?? hoje;
  return sugerida < hoje ? hoje : sugerida;
}

/**
 * Exceções do cálculo, com a ação direto na mensagem — como o MD06/MD07 do SAP
 * e o workbench de exceções do Oracle: reprogramar a ordem para a data em que o
 * cálculo precisa dela, cancelar a ordem sem demanda ou registrar que a
 * mensagem foi analisada. A tratada sai da lista de pendentes e mostra quem
 * tratou e como.
 */
export function ExcecoesTab({ excecoes, busy, onVerPerfil, onTratar, onVerOrigem }: {
  excecoes: MrpException[];
  busy: boolean;
  onVerPerfil: (item: string) => void;
  /** Rastreamento: a que pedido/demanda serve a ordem da mensagem. */
  onVerOrigem: (e: MrpException) => void;
  onTratar: (code: number, acao: MrpExceptionAction, opts: { newDate?: string; note?: string }) => Promise<boolean>;
}): JSX.Element {
  const [tipo, setTipo] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<FiltroSituacao>("pendentes");
  const [edicao, setEdicao] = useState<Edicao | null>(null);

  const pendentes = excecoes.filter((e) => !e.handling_action).length;
  const tipos = useMemo(() => {
    const m = new Map<string, number>();
    excecoes.forEach((e) => m.set(e.message_type, (m.get(e.message_type) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [excecoes]);
  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    return excecoes.filter((e) =>
      (situacao === "todas" || (situacao === "tratadas") === Boolean(e.handling_action))
      && (!tipo || e.message_type === tipo)
      && (!q || normalizar(`${e.item_code} ${e.description} ${e.source_order_number ?? ""} ${(e.affected_demands ?? []).join(" ")}`).includes(q)));
  }, [excecoes, tipo, busca, situacao]);

  const confirmar = async () => {
    if (!edicao) return;
    const ok = await onTratar(edicao.code, edicao.acao, {
      newDate: edicao.acao === "REPROGRAMAR" ? edicao.data : undefined,
      note: edicao.nota,
    });
    if (ok) setEdicao(null);
  };

  if (excecoes.length === 0) {
    return <Painel titulo="Exceções do cálculo"><Vazio titulo="Nenhuma exceção neste plano" texto="O último cálculo não apontou atraso, excesso nem reprogramação. Rode o MRP de novo depois de mudar demanda, estoque ou estrutura." /></Painel>;
  }
  return (
    <>
      <Painel titulo="Filtros">
        <div className="vpl-filters">
          <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="ex-busca">Item, ordem ou texto da mensagem</label>
            <input id="ex-busca" className="erp-input" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
          <div className="erp-field"><label className="erp-label" htmlFor="ex-situacao">Situação</label>
            <select id="ex-situacao" className="erp-input" value={situacao} onChange={(e) => setSituacao(e.target.value as FiltroSituacao)}>
              <option value="pendentes">Pendentes · {pendentes}</option>
              <option value="tratadas">Tratadas · {excecoes.length - pendentes}</option>
              <option value="todas">Todas · {excecoes.length}</option>
            </select></div>
        </div>
        <div className="erp-chips" style={{ marginTop: 10 }}>
          <button type="button" className={`erp-chip${tipo === "" ? " active" : ""}`} onClick={() => setTipo("")}>Todos os tipos · {excecoes.length}</button>
          {tipos.map(([t, n]) => (
            <button key={t} type="button" className={`erp-chip${tipo === t ? " active" : ""}`} onClick={() => setTipo(t)}>{tipoExcecao(t)} · {n}</button>
          ))}
        </div>
      </Painel>
      <Painel titulo="Exceções" sub={`${visiveis.length} de ${excecoes.length} · ${pendentes} pendente(s)`} flush>
        <div className="vpl-grid-scroll">
          <table className="erp-grid">
            <thead><tr><th>Item</th><th>Tipo</th><th>Mensagem</th><th>Situação</th><th /></tr></thead>
            <tbody>
              {visiveis.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">{situacao === "pendentes" ? "Nenhuma exceção pendente com esses filtros." : "Nenhuma exceção com esses filtros."}</td></tr>}
              {visiveis.map((e, i) => {
                const aberta = edicao && edicao.code === e.code ? edicao : null;
                const daOrdem = e.source_type === "PLANNED_ORDER" && e.source_order_number;
                const podeReprogramar = !e.handling_action && e.code && daOrdem && REPROGRAMAVEIS.has(e.message_type);
                const podeCancelar = !e.handling_action && e.code && daOrdem && e.message_type === "CANCEL";
                return (
                  <Fragment key={e.code ?? `${e.item_code}-${e.message_type}-${i}`}>
                    <tr className={aberta ? "selected" : undefined}>
                      <td className="vpl-strong">{e.item_code}</td>
                      <td><Selo tom={tomDaExcecao(e.message_type)}>{tipoExcecao(e.message_type)}</Selo></td>
                      <td>{e.description}
                        {daOrdem && <span className="vpl-sub">Ordem planejada {e.source_order_number}{e.source_need_date && ` · necessidade ${data(e.source_need_date)}`}{e.suggested_date && REPROGRAMAVEIS.has(e.message_type) && ` → sugerida ${data(e.suggested_date)}`}</span>}
                        {e.affected_demands && e.affected_demands.length > 0 && <span className="vpl-sub" title={e.affected_demands.join(" · ")}>Afeta: {afetados(e.affected_demands)}</span>}</td>
                      <td>{e.handling_action
                        ? <><Selo tom="ok">{TRATAMENTO[e.handling_action] ?? e.handling_action}</Selo>
                            <span className="vpl-sub">{e.handled_by_name}{e.handled_at && ` · ${dataHora(e.handled_at)}`}</span>
                            {e.handling_note && <span className="vpl-sub">{e.handling_note}</span>}</>
                        : <Selo>Pendente</Selo>}</td>
                      <td className="vpl-actions">
                        <button className="erp-btn erp-btn-sm" onClick={() => onVerPerfil(e.item_code)}>Ver perfil</button>
                        {daOrdem && e.source_code && <button className="erp-btn erp-btn-sm" onClick={() => onVerOrigem(e)}>Para quem é</button>}
                        {podeReprogramar && <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy}
                          onClick={() => setEdicao({ code: e.code!, acao: "REPROGRAMAR", data: destinoPadrao(e), nota: "" })}>Reprogramar</button>}
                        {podeCancelar && <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy}
                          onClick={() => setEdicao({ code: e.code!, acao: "CANCELAR", data: "", nota: "" })}>Cancelar ordem</button>}
                        {!e.handling_action && e.code && <button className="erp-btn erp-btn-sm" disabled={busy}
                          onClick={() => setEdicao({ code: e.code!, acao: "TRATAR", data: "", nota: "" })}>Marcar tratada</button>}
                      </td>
                    </tr>
                    {aberta && (
                      <tr className="vpl-inline-edit">
                        <td colSpan={5}>
                          <div className="vpl-filters">
                            {aberta.acao === "REPROGRAMAR" && (
                              <div className="erp-field"><label className="erp-label" htmlFor="ex-data">Nova necessidade</label>
                                <input id="ex-data" className="erp-input" type="date" min={hojeISO()} value={aberta.data} onChange={(ev) => setEdicao({ ...aberta, data: ev.target.value })} /></div>
                            )}
                            <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="ex-nota">{aberta.acao === "TRATAR" ? "O que foi feito (obrigatório)" : "Observação"}</label>
                              <input id="ex-nota" className="erp-input" value={aberta.nota} onChange={(ev) => setEdicao({ ...aberta, nota: ev.target.value })}
                                placeholder={aberta.acao === "TRATAR" ? "Ex.: fornecedor confirmou entrega antecipada" : "Opcional"} /></div>
                            <div style={{ display: "flex", gap: 8, alignSelf: "flex-end" }}>
                              <button className="erp-btn" onClick={() => setEdicao(null)} disabled={busy}>Voltar</button>
                              <button className={`erp-btn ${aberta.acao === "CANCELAR" ? "erp-btn-danger" : "erp-btn-primary"}`} disabled={busy || (aberta.acao === "TRATAR" && !aberta.nota.trim()) || (aberta.acao === "REPROGRAMAR" && !aberta.data)}
                                onClick={() => void confirmar()}>
                                {aberta.acao === "REPROGRAMAR" ? "Confirmar reprogramação" : aberta.acao === "CANCELAR" ? "Confirmar cancelamento" : "Marcar como tratada"}</button>
                            </div>
                          </div>
                          {aberta.acao === "CANCELAR" && <p className="erp-note" style={{ margin: "8px 0 0" }}>A ordem planejada {e.source_order_number} será cancelada e deixa de contar como suprimento no próximo cálculo.</p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Painel>
      <p className="erp-note">Reprogramar ou cancelar altera a ordem planejada na hora; a mensagem some no próximo cálculo do MRP. Ordem que já virou OF é ajustada pela própria OF.</p>
    </>
  );
}
