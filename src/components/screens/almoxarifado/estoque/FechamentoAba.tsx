import { useCallback, useEffect, useMemo, useState } from "react";
import { fecharMesEstoque, listFechamentos, reabrirMesEstoque, simularFechamento, type FechamentoDTO, type ResultadoFechamentoDTO } from "@/services/stockService";
import { confirmar, pedirTexto } from "@/components/ui";
import { reais, useAcao } from "./comum";
import { FeedbackBox, Resumo } from "./ui";

const mesBR = (iso: string) => { const [a, m] = iso.split("-"); return `${m}/${a}`; };
/** Mês seguinte ao AAAA-MM-DD informado, em AAAA-MM. */
const mesSeguinte = (iso: string) => {
  const [a, m] = iso.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
};
const mesAnterior = () => {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * Fechamento mensal do estoque: recalcula quem teve lançamento retroativo, grava
 * a foto de saldo e custo, leva as diferenças ao resultado e fecha o período. A
 * simulação faz tudo isso e desfaz, para a pessoa ver o resultado antes.
 */
export function FechamentoAba() {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lista, setLista] = useState<FechamentoDTO[]>([]);
  const [mes, setMes] = useState("");
  const [simulado, setSimulado] = useState<ResultadoFechamentoDTO | null>(null);

  const carregar = useCallback(() => run(async () => { setLista(await listFechamentos()); }), [run]);
  useEffect(() => { void carregar(); }, [carregar]);

  const fechados = useMemo(() => lista.filter((f) => f.status === "FECHADO"), [lista]);
  const proximo = fechados.length ? mesSeguinte(fechados[0].competence) : mesAnterior();
  const competencia = mes || proximo;

  const simular = () => run(async () => { setSimulado(await simularFechamento(competencia)); });
  const fechar = async () => {
    if (!(await confirmar({ titulo: "Fechar o mês de estoque", assunto: mesBR(competencia), mensagem: "Depois de fechar, nenhum movimento poderá ter data neste mês." }))) return;
    await run(async () => {
      const r = await fecharMesEstoque(competencia);
      setSimulado(null); setMes(""); setLista(await listFechamentos());
      setFeedback({ type: r.warnings.length ? "info" : "success", message: `Mês ${mesBR(competencia)} fechado. Estoque em ${reais(r.total_value)}.${r.warnings.length ? ` ${r.warnings.join(" ")}` : ""}` });
    });
  };
  const reabrir = async (f: FechamentoDTO) => {
    const motivo = await pedirTexto({ titulo: "Reabrir o mês", assunto: mesBR(f.competence), mensagem: "Reabrir é exceção: o lançamento contábil do fechamento é estornado.", rotulo: "Motivo da reabertura", minimo: 5 });
    if (!motivo) return;
    await run(async () => {
      await reabrirMesEstoque(f.id, motivo);
      setLista(await listFechamentos()); setSimulado(null);
      setFeedback({ type: "success", message: `Mês ${mesBR(f.competence)} reaberto.` });
    });
  };

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Fechar mês</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Mês</label><input className="erp-input" type="month" value={competencia} onChange={(e) => { setMes(e.target.value); setSimulado(null); }} /></div>
      <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={simular} disabled={busy}>Simular</button></div>
      <div className="erp-field erp-c6" style={{ alignSelf: "end" }}><span className="erp-hint">A simulação mostra o resultado sem gravar nada.</span></div>
      {simulado && (<>
        {simulado.blocking.length > 0 && <div className="erp-field erp-c12"><div className="erp-feedback error" style={{ margin: 0 }}>Não dá para fechar ainda: {simulado.blocking.join("; ")}.</div></div>}
        {simulado.warnings.length > 0 && <div className="erp-field erp-c12"><div className="erp-note">{simulado.warnings.join(" ")}</div></div>}
        <div className="erp-field erp-c12"><Resumo>
          Estoque no fim do mês: <strong>{reais(simulado.total_value)}</strong> em {simulado.items_in_snapshot} saldo(s) ·
          {" "}{simulado.recalculated_items} item(ns) recalculado(s), {simulado.changed_movements} movimento(s) alterado(s) ·
          {" "}diferença do recálculo {reais(simulado.recalc_variance)} · entrada sobre saldo negativo {reais(simulado.negative_stock_variance)}
        </Resumo></div>
        <div className="erp-field erp-c12"><Resumo>
          Produção no mês: consumo {reais(simulado.production_consumption)} · entrada {reais(simulado.production_delivery)} · absorvido {reais(simulado.production_absorbed)} · variação {reais(simulado.production_variance)} ·
          {" "}provisão de obsoletos {reais(simulado.obsolete_provision)} (variação {reais(simulado.obsolete_provision_change)})
        </Resumo></div>
        <div className="erp-field erp-c12" style={{ alignItems: "flex-start" }}><button className="erp-btn erp-btn-danger" onClick={() => void fechar()} disabled={busy || simulado.blocking.length > 0}>Fechar o mês</button></div>
      </>)}
    </div></div>
    <div className="erp-fieldset"><div className="erp-fieldset-head">Meses fechados ({fechados.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
      <table className="erp-grid">
        <thead><tr><th>Mês</th><th>Situação</th><th className="num">Estoque</th><th className="num">Recalculados</th><th className="num">Diferença</th><th>Contabilizado</th><th></th></tr></thead>
        <tbody>
          {lista.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum mês fechado.</td></tr>}
          {lista.map((f) => <tr key={f.id}>
            <td><strong>{mesBR(f.competence)}</strong></td>
            <td>{f.status === "FECHADO" ? <span className="erp-badge erp-badge-gray">Fechado</span> : <span className="erp-badge erp-badge-amber" title={f.reopen_reason}>Reaberto</span>}</td>
            <td className="num">{reais(f.total_value)}</td><td className="num">{f.recalculated_items}</td><td className="num">{reais(f.variance_value)}</td>
            <td>{f.journal_posted ? "Sim" : "Não"}</td>
            <td>{f.status === "FECHADO" && f.id === fechados[0]?.id && <button className="erp-btn erp-btn-sm" onClick={() => void reabrir(f)} disabled={busy}>Reabrir</button>}</td>
          </tr>)}
        </tbody>
      </table>
    </div></div></div>
  </>);
}
