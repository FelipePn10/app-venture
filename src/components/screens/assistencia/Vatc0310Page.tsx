import { useCallback, useEffect, useState } from "react";
import {
  type ChamadoSLA, type HorarioSLA, type PainelSLA, type RegraSLA, type SituacaoPrazo, ROTULO_PRAZO, ROTULO_PRIORIDADE,
  excluirRegraSLA, expedienteSLA, painelSLA, regrasSLA, salvarExpedienteSLA, salvarRegraSLA,
} from "@/services/posVendaService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const dataHora = (s?: string) => (s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
const horas = (v: string | number) => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const COR: Record<SituacaoPrazo, string> = {
  SEM_PRAZO: "erp-badge-gray", NO_PRAZO: "erp-badge-blue", EM_RISCO: "erp-badge-amber", VENCIDO: "erp-badge-red", CUMPRIDO: "erp-badge-green", ESTOURADO: "erp-badge-amber",
  PAUSADO: "erp-badge-gray",
};
const REGRA_VAZIA = { id: undefined as number | undefined, prioridade: "NORMAL", cliente: undefined as number | undefined, resposta: "", solucao: "", alerta: "80", uteis: false, ativo: true };
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const HORA = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

function Prazo({ situacao, ate, em, desde }: { situacao: SituacaoPrazo; ate?: string; em?: string; desde?: string }): JSX.Element {
  return (
    <span>
      <span className={`erp-badge ${COR[situacao]}`}>{ROTULO_PRAZO[situacao]}</span>{" "}
      <small>{em ? `em ${dataHora(em)}` : situacao === "PAUSADO" ? `desde ${dataHora(desde)}` : `até ${dataHora(ate)}`}</small>
    </span>
  );
}

/**
 * VATC0310 — SLA da Assistência. Prazo de primeira resposta e de solução do
 * chamado por prioridade, geral ou por cliente (acordo de nível de serviço).
 * O prazo é calculado na abertura do chamado e não muda se a regra mudar
 * depois. A regra conta em horas corridas ou úteis (expediente da aba
 * Expediente, menos os feriados do calendário industrial); aguardando o
 * cliente, o relógio para e os prazos andam o tempo parado na retomada. O painel mostra o que está em risco e vencido; a Central de Alertas
 * (VNOT0100) avisa pelos eventos "SLA do chamado em risco" e "vencido".
 */
export function Vatc0310Page(): JSX.Element {
  const [aba, setAba] = useState<"painel" | "regras" | "expediente">("painel");
  const [expediente, setExpediente] = useState<{ padrao: boolean; intervalos: HorarioSLA[] }>({ padrao: true, intervalos: [] });
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [filtro, setFiltro] = useState({ situacao: "", cliente: undefined as number | undefined });
  const [painel, setPainel] = useState<PainelSLA | null>(null);
  const [regras, setRegras] = useState<RegraSLA[]>([]);
  const [regra, setRegra] = useState({ ...REGRA_VAZIA });

  const recarregar = useCallback(async () => {
    setBusy(true);
    try {
      if (aba === "painel") setPainel(await painelSLA({ situacao: filtro.situacao, cliente: filtro.cliente }));
      else if (aba === "regras") setRegras(await regrasSLA());
      else setExpediente(await expedienteSLA());
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao consultar o SLA.") }); }
    finally { setBusy(false); }
  }, [aba, filtro]);
  useEffect(() => { void recarregar(); }, [aba]); // eslint-disable-line react-hooks/exhaustive-deps

  async function salvar() {
    setBusy(true); setFeedback(null);
    try {
      await salvarRegraSLA(regra.id, { prioridade: regra.prioridade, customer_code: regra.cliente, horas_resposta: regra.resposta.replace(",", "."),
        horas_solucao: regra.solucao.replace(",", "."), alerta_pct: Number(regra.alerta) || 80, horas_uteis: regra.uteis, ativo: regra.ativo });
      setRegra({ ...REGRA_VAZIA });
      setRegras(await regrasSLA());
      setFeedback({ type: "success", message: "Regra de SLA salva. Vale para os chamados abertos a partir de agora." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function gravarExpediente() {
    const ruim = expediente.intervalos.find((x) => !HORA.test(x.inicio) || !HORA.test(x.fim));
    if (ruim) { setFeedback({ type: "error", message: `Horário inválido em ${DIAS[ruim.dia_semana]}: use HH:MM.` }); return; }
    setBusy(true); setFeedback(null);
    try {
      setExpediente(await salvarExpedienteSLA(expediente.intervalos));
      setFeedback({ type: "success", message: "Expediente salvo. Vale para os prazos calculados a partir de agora (aberturas e retomadas)." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const mudarHorario = (i: number, campo: keyof HorarioSLA, v: string) =>
    setExpediente((e) => ({ ...e, intervalos: e.intervalos.map((x, k) => (k === i ? { ...x, [campo]: campo === "dia_semana" ? Number(v) : v } : x)) }));

  async function excluir(id: number) {
    setBusy(true); setFeedback(null);
    try { await excluirRegraSLA(id); setRegras(await regrasSLA()); setFeedback({ type: "success", message: "Regra excluída." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const editar = (r: RegraSLA) => setRegra({ id: r.id, prioridade: r.prioridade, cliente: r.customer_code, resposta: String(r.horas_resposta),
    solucao: String(r.horas_solucao), alerta: String(r.alerta_pct), uteis: r.horas_uteis, ativo: r.ativo });
  const linha = (c: ChamadoSLA) => (
    <tr key={c.call_code}>
      <td style={{ fontWeight: 600 }}>{c.call_number}</td><td>{c.cliente_nome || c.customer_code}</td><td>{c.assunto}</td>
      <td>{ROTULO_PRIORIDADE[c.prioridade] ?? c.prioridade}</td><td>{dataHora(c.aberto_em)}</td>
      <td><Prazo situacao={c.situacao_resposta} ate={c.resposta_ate} em={c.respondido_em} desde={c.pausado_desde} /></td>
      <td><Prazo situacao={c.situacao_solucao} ate={c.solucao_ate} em={c.solucionado_em} desde={c.pausado_desde} /></td>
      <td>{c.horas_uteis ? "Úteis" : "Corridas"}{Number(c.horas_pausadas) > 0 && <><br /><small>{horas(c.horas_pausadas)} h parado</small></>}</td>
    </tr>
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Assistência</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">SLA da Assistência</span><span className="erp-crumb-code">VATC0310</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Visão</span>
          <button className={`erp-btn ${aba === "painel" ? "erp-btn-primary" : ""}`} onClick={() => setAba("painel")}>Painel</button>
          <button className={`erp-btn ${aba === "regras" ? "erp-btn-primary" : ""}`} onClick={() => setAba("regras")}>Regras</button>
          <button className={`erp-btn ${aba === "expediente" ? "erp-btn-primary" : ""}`} onClick={() => setAba("expediente")}>Expediente</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Consulta</span><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VATC0310 — SLA da Assistência" filename="vatc0310" /></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {aba === "painel" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Chamados com SLA</div><div className="erp-fieldset-body">
                {painel && (
                  <div className="erp-field erp-c12" id="sla-resumo" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span>Abertos: <strong>{painel.resumo.abertos}</strong></span>
                    <span><span className="erp-badge erp-badge-amber">Em risco</span> <strong>{painel.resumo.em_risco}</strong></span>
                    <span><span className="erp-badge erp-badge-red">Vencidos</span> <strong>{painel.resumo.vencidos}</strong></span>
                    <span><span className="erp-badge erp-badge-gray">Pausados</span> <strong>{painel.resumo.pausados ?? 0}</strong></span>
                    {filtro.situacao === "TODOS" && <span>Cumpridos: <strong>{painel.resumo.cumpridos}</strong> · com atraso: <strong>{painel.resumo.estourados}</strong></span>}
                  </div>
                )}
                <div className="erp-field erp-c3"><label className="erp-label">Mostrar</label>
                  <select className="erp-input" id="sla-filtro" value={filtro.situacao} onChange={(e) => setFiltro((f) => ({ ...f, situacao: e.target.value }))}>
                    <option value="">Abertos</option><option value="EM_RISCO">Em risco</option><option value="VENCIDO">Vencidos</option><option value="PAUSADO">Pausados (aguardando cliente)</option><option value="TODOS">Todos (últimos 90 dias)</option>
                  </select></div>
                <div className="erp-field erp-c4"><label className="erp-label">Cliente</label>
                  <LookupField value={filtro.cliente} loader={loadCustomers} entityLabel="cliente" placeholder="Todos" onChange={(c) => setFiltro((f) => ({ ...f, cliente: c ?? undefined }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Consultar</button></div>
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid" id="sla-chamados">
                    <thead><tr><th>Chamado</th><th>Cliente</th><th>Assunto</th><th>Prioridade</th><th>Aberto em</th><th>Resposta</th><th>Solução</th><th>Relógio</th></tr></thead>
                    <tbody>
                      {(painel?.chamados.length ?? 0) === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum chamado com SLA nesse filtro.</td></tr>}
                      {painel?.chamados.map(linha)}
                    </tbody>
                  </table>
                </div>
                <div className="erp-field erp-c12"><small>A resposta conta quando o chamado sai de "pendente" ou ganha uma ordem de serviço (VATC0300). A solução, quando o chamado é atendido ou encerrado. Em "aguardando retorno" ou "aguardando pedido" o relógio para; na retomada, os prazos em aberto andam o tempo parado.</small></div>
              </div></div>
            )}

            {aba === "regras" && (<>
              <div className="erp-fieldset"><div className="erp-fieldset-head">{regra.id ? "Alterar regra" : "Nova regra"}</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Prioridade</label>
                  <select className="erp-input" id="sla-prioridade" value={regra.prioridade} onChange={(e) => setRegra((r) => ({ ...r, prioridade: e.target.value }))}>
                    {Object.entries(ROTULO_PRIORIDADE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="erp-field erp-c4"><label className="erp-label">Cliente (acordo específico)</label>
                  <LookupField value={regra.cliente} loader={loadCustomers} entityLabel="cliente" placeholder="Todos os clientes" onChange={(c) => setRegra((r) => ({ ...r, cliente: c ?? undefined }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Resposta (horas)</label><input className="erp-input" id="sla-resposta" inputMode="decimal" value={regra.resposta} onChange={(e) => setRegra((r) => ({ ...r, resposta: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Solução (horas)</label><input className="erp-input" id="sla-solucao" inputMode="decimal" value={regra.solucao} onChange={(e) => setRegra((r) => ({ ...r, solucao: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Em risco a partir de (%)</label><input className="erp-input" inputMode="numeric" value={regra.alerta} onChange={(e) => setRegra((r) => ({ ...r, alerta: e.target.value }))} /></div>
                <div className="erp-field erp-c12" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <label><input type="checkbox" checked={regra.ativo} onChange={(e) => setRegra((r) => ({ ...r, ativo: e.target.checked }))} /> Ativa</label>
                  <label><input type="checkbox" id="sla-uteis" checked={regra.uteis} onChange={(e) => setRegra((r) => ({ ...r, uteis: e.target.checked }))} /> Horas úteis (expediente, sem feriados)</label>
                  <button className="erp-btn erp-btn-primary" id="sla-salvar" disabled={busy || !regra.resposta || !regra.solucao} onClick={() => void salvar()}>Salvar regra</button>
                  {regra.id && <button className="erp-btn" onClick={() => setRegra({ ...REGRA_VAZIA })}>Nova</button>}
                  <small>A regra do cliente vence a geral da mesma prioridade. Sem regra, o chamado fica sem SLA.</small>
                </div>
              </div></div>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Regras — <span style={{ fontWeight: 400, opacity: 0.65 }}>{regras.length}</span></div><div className="erp-fieldset-body">
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid">
                    <thead><tr><th>Prioridade</th><th>Cliente</th><th>Resposta</th><th>Solução</th><th>Em risco</th><th>Contagem</th><th>Situação</th><th style={{ width: 160 }} /></tr></thead>
                    <tbody>
                      {regras.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhuma regra: os chamados ficam sem SLA.</td></tr>}
                      {regras.map((r) => (
                        <tr key={r.id}><td>{ROTULO_PRIORIDADE[r.prioridade] ?? r.prioridade}</td><td>{r.cliente_nome || (r.customer_code ? r.customer_code : "Todos")}</td>
                          <td>{horas(r.horas_resposta)} h</td><td>{horas(r.horas_solucao)} h</td><td>{r.alerta_pct}%</td><td>{r.horas_uteis ? "Horas úteis" : "Horas corridas"}</td><td>{r.ativo ? "Ativa" : "Inativa"}</td>
                          <td style={{ display: "flex", gap: 6 }}><button className="erp-btn erp-btn-sm" onClick={() => editar(r)}>Alterar</button>
                            <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={() => void excluir(r.id)}>Excluir</button></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div></div>
            </>)}

            {aba === "expediente" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Expediente das horas úteis{expediente.padrao && <span style={{ fontWeight: 400, opacity: 0.65 }}> — padrão (não cadastrado)</span>}</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid" id="sla-expediente">
                    <thead><tr><th>Dia</th><th>Início</th><th>Fim</th><th style={{ width: 100 }} /></tr></thead>
                    <tbody>
                      {expediente.intervalos.map((x, i) => (
                        <tr key={i}>
                          <td><select className="erp-input" value={x.dia_semana} onChange={(e) => mudarHorario(i, "dia_semana", e.target.value)}>
                            {DIAS.map((d, k) => <option key={k} value={k}>{d}</option>)}</select></td>
                          <td><input className="erp-input" placeholder="08:00" value={x.inicio} onChange={(e) => mudarHorario(i, "inicio", e.target.value)} /></td>
                          <td><input className="erp-input" placeholder="12:00" value={x.fim} onChange={(e) => mudarHorario(i, "fim", e.target.value)} /></td>
                          <td><button className="erp-btn erp-btn-sm" onClick={() => setExpediente((e) => ({ ...e, intervalos: e.intervalos.filter((_, k) => k !== i) }))}>Remover</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="erp-field erp-c12" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button className="erp-btn" onClick={() => setExpediente((e) => ({ ...e, intervalos: [...e.intervalos, { dia_semana: 1, inicio: "08:00", fim: "12:00" }] }))}>+ Intervalo</button>
                  <button className="erp-btn erp-btn-primary" id="sla-expediente-salvar" disabled={busy || expediente.intervalos.length === 0} onClick={() => void gravarExpediente()}>Salvar expediente</button>
                  <small>Usado pelas regras em horas úteis, no fuso da empresa. Os feriados vêm do calendário industrial (dias marcados como não úteis). Sem cadastro, vale segunda a sexta, 08:00–12:00 e 13:00–18:00.</small>
                </div>
              </div></div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
