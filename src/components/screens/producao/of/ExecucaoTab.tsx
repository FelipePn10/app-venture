import { Fragment, useEffect, useState } from "react";
import {
  type AppointmentDTO, type OperationDTO, type ProductionOrderDTO, type ProductionScanAction, type ProductionScanToken,
} from "@/services/productionOrderService";
import { Code128Barcode } from "@/components/ui/Code128Barcode";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadEmployees, loadEmployeesById, loadMachinesById, loadWarehouses } from "@/services/lookups";
import { Painel, Selo, Vazio } from "../../planejamento/planUi";
import { data, dataHora, duracao, num, type Tom } from "../../planejamento/planFormat";
import { OPERACAO } from "./operacao";
import { type MaterialDaOF, etapaAtual, materiaisDaEtapa } from "./materiais";
import { type EntregaForm, type LeituraForm, type SerieDaOF } from "./OfTabs";
import { itemDaOF } from "./identificacao";

export type EtapaForm = { horas: string; pecas: string; motivo: string };

/**
 * Execução da OF — o que o chão de fábrica faz, na ordem do roteiro. Cada
 * etapa abre o material que entra nela (da estrutura), as horas e as peças;
 * o apontamento da produção é o da última etapa (as peças que terminaram o
 * roteiro), como na confirmação final do SAP; a entrega ao estoque fecha.
 */
export function ExecucaoTab(p: {
  of: ProductionOrderDTO; busy: boolean; gestor: boolean;
  operacoes: OperationDTO[]; materiais: MaterialDaOF[];
  etapa: EtapaForm; setEtapa: (f: (p: EtapaForm) => EtapaForm) => void;
  onAlterar: (id: number, status: string) => void; onGerarCodigo: (id?: number) => void; onExplodir: () => void;
  app: AppointmentDTO; setApp: (f: (p: AppointmentDTO) => AppointmentDTO) => void; onApontar: () => void; apontamentos: AppointmentDTO[];
  conclusao: EntregaForm; setConclusao: (f: (p: EntregaForm) => EntregaForm) => void; onConcluir: () => void; serie?: SerieDaOF;
  token: ProductionScanToken | null; leitura: LeituraForm; setLeitura: (f: (p: LeituraForm) => LeituraForm) => void; onLer: () => void;
  onVerMateriais: () => void;
  tokensEtapa: Record<number, ProductionScanToken>; onEtiquetas: () => void; onImprimirEtiqueta: (opId: number) => void; etiquetasImpressas: number[];
}): JSX.Element {
  const { of, busy, operacoes } = p;
  const emProducao = of.status === "IN_PROGRESS";
  const ordenadas = [...operacoes].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const atual = etapaAtual(ordenadas);
  const [aberta, setAberta] = useState<number | undefined>(atual?.id);
  const feitas = ordenadas.filter((o) => o.status === "DONE" || o.status === "SKIPPED").length;
  const ultima = ordenadas[ordenadas.length - 1];
  const pendentes = ordenadas.length - feitas;
  // Cronômetro: a etapa em andamento conta sozinha (a tela atualiza a cada 30 s).
  const [agora, setAgora] = useState(() => Date.now());
  const correndo = ordenadas.some((o) => o.status === "IN_PROGRESS" && o.running_since);
  useEffect(() => {
    if (!correndo) return;
    const id = window.setInterval(() => setAgora(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [correndo]);
  const emAndamentoHoras = (op: OperationDTO) => {
    if (op.status !== "IN_PROGRESS" || !op.running_since) return 0;
    const inicio = new Date(op.running_since).getTime();
    return Number.isFinite(inicio) && agora > inicio ? (agora - inicio) / 3_600_000 : 0;
  };

  return (<>
    {!emProducao && (
      <p className="erp-note">
        {of.status === "OPEN" ? <>A ordem está <strong>aberta</strong>: clique em <strong>Iniciar produção</strong> no cabeçalho para liberar as etapas e o apontamento.</>
          : <>A ordem não está em produção — etapas e apontamento ficam bloqueados.</>}
      </p>
    )}

    {ordenadas.length === 0 ? (
      <Painel titulo="Roteiro desta ordem">
        <Vazio titulo="Esta ordem não tem etapas"
          texto="As ordens nascem com as etapas do roteiro aprovado do item. Esta foi criada antes de o item ter roteiro: ao iniciar a produção o roteiro é aplicado sozinho, ou aplique agora. Sem roteiro, aponte a produção abaixo."
          acao={p.gestor ? <button className="erp-btn erp-btn-primary" onClick={p.onExplodir} disabled={busy}>Aplicar roteiro agora</button> : undefined} />
        {p.materiais.length > 0 && <TabelaMaterialDaEtapa linhas={p.materiais} titulo="Material da ordem" />}
      </Painel>
    ) : (
      <Painel titulo="Roteiro desta ordem" sub={`${feitas} de ${ordenadas.length} etapa(s) concluída(s)${atual && pendentes ? ` · agora: ${atual.sequence} ${atual.description ?? ""}` : ""}`} flush
        acoes={<>
          <button className="erp-btn erp-btn-sm" onClick={p.onEtiquetas} disabled={busy || !pendentes} title="Uma etiqueta com código de barras por etapa a fazer, para o posto ler e apontar">Etiquetas das etapas</button>
          <button className="erp-btn erp-btn-sm erp-btn-ghost" onClick={p.onVerMateriais}>Lista completa de materiais</button>
        </>}>
        <table className="erp-grid vpro-roteiro">
          <thead><tr><th style={{ width: 28 }} /><th className="num">Seq.</th><th>Etapa</th><th>Situação</th><th className="num">Material</th><th>Início → fim</th><th className="num" title="Horas trabalhadas / tempo padrão do roteiro (preparação + operação)">Horas real / padrão</th><th /></tr></thead>
          <tbody>{ordenadas.map((op, i) => {
            const s = OPERACAO[op.status ?? ""] ?? { rotulo: op.status ?? "—", tom: "muted" as Tom };
            const mat = materiaisDaEtapa(p.materiais, op, i === 0);
            const faltaSair = mat.filter((m) => m.falta > 0).length;
            const expandida = aberta === op.id;
            return (
              <Fragment key={op.id}>
                <tr className={op.id === atual?.id && pendentes ? "vpro-etapa-atual" : undefined}>
                  <td><button type="button" className="erp-btn erp-btn-sm erp-btn-ghost" aria-expanded={expandida} aria-label={expandida ? "Recolher a etapa" : "Abrir a etapa"}
                    onClick={() => setAberta(expandida ? undefined : op.id)}>{expandida ? "▾" : "▸"}</button></td>
                  <td className="num">{op.sequence}</td>
                  <td className="vpl-strong">{op.description || op.operation_code || "—"}
                    {op.warnings?.map((aviso) => <div key={aviso} style={{ marginTop: 4 }}><Selo tom="warn">{aviso}</Selo></div>)}</td>
                  <td><Selo tom={s.tom}>{s.rotulo}</Selo>
                    {op.status === "IN_PROGRESS" && op.running_since && <div className="erp-hint" style={{ marginTop: 3 }} title={`Em andamento desde ${dataHora(op.running_since)}`}>⏱ {duracao(emAndamentoHoras(op) * 60) === "—" ? "agora" : duracao(emAndamentoHoras(op) * 60)}</div>}</td>
                  <td className="num" title="Itens da estrutura que entram nesta etapa">{mat.length ? `${mat.length} item(ns)${faltaSair ? ` · ${faltaSair} a sair` : ""}` : "—"}</td>
                  <td>{op.started_at ? dataHora(op.started_at) : "—"}{op.completed_at ? ` → ${dataHora(op.completed_at)}` : ""}</td>
                  <td className="num">{(() => {
                    const real = (op.actual_hours ?? 0) + emAndamentoHoras(op), padrao = (op.planned_hours ?? 0) + (op.setup_hours ?? 0);
                    if (!real && !padrao) return "—";
                    const estourou = padrao > 0 && real > padrao;
                    return <span className={estourou ? "vpl-tom-danger" : undefined} title={estourou ? "Passou do tempo padrão do roteiro" : undefined}>{real ? num(real) : "—"} / {padrao ? num(padrao) : "—"}</span>;
                  })()}</td>
                  <td className="vpl-actions">
                    {op.service_order_code && <span className="erp-hint" title="A remessa ao terceiro põe a etapa em andamento e o recebimento de todas as peças a conclui — tudo no VTPS0100.">Com o terceiro — OS {op.service_order_code}</span>}
                    {op.can_start && <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy || !emProducao} onClick={() => { setAberta(op.id); if (op.id) p.onAlterar(op.id, "IN_PROGRESS"); }}>{op.status === "PENDING" ? "Iniciar" : "Retomar"}</button>}
                    {op.status === "IN_PROGRESS" && !op.service_order_code && <>
                      <button className="erp-btn erp-btn-sm" disabled={busy || !emProducao} onClick={() => op.id && p.onAlterar(op.id, "PAUSED")}>Pausar</button>
                      <button className="erp-btn erp-btn-sm" disabled={busy || !emProducao} onClick={() => op.id && p.onAlterar(op.id, "INTERRUPTED")}>Interromper</button>
                      <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy || !emProducao} onClick={() => op.id && p.onAlterar(op.id, "DONE")}>Concluir</button>
                    </>}
                  </td>
                </tr>
                {expandida && (
                  <tr className="vpro-etapa-detalhe"><td colSpan={8} style={{ background: "var(--v-surface-2, #f7f8f7)", padding: "10px 14px 14px 42px" }}>
                    {op.notes && <p className="erp-hint" style={{ whiteSpace: "pre-line", marginTop: 0 }}>{op.notes}</p>}
                    {mat.length > 0
                      ? <TabelaMaterialDaEtapa linhas={mat} titulo={i === 0 && mat.some((m) => !m.etapa) ? "Material desta etapa (inclui o material sem etapa definida no roteiro)" : "Material desta etapa"} />
                      : <p className="erp-hint" style={{ marginTop: 0 }}>Nenhum material da estrutura entra nesta etapa.</p>}
                    {(op.status === "IN_PROGRESS" || op.can_start) && !op.service_order_code && (
                      <div className="vpl-filters" style={{ marginTop: 10 }}>
                        <div className="erp-field"><label className="erp-label" htmlFor="et-horas">Horas trabalhadas</label>
                          <input id="et-horas" className="erp-input num" type="number" min={0} step="0.01" placeholder="cronômetro" value={p.etapa.horas} onChange={(e) => p.setEtapa((s) => ({ ...s, horas: e.target.value }))} /></div>
                        <div className="erp-field"><label className="erp-label" htmlFor="et-pecas">Peças feitas na etapa</label>
                          <input id="et-pecas" className="erp-input num" type="number" min={0} step="1" placeholder={num(of.planned_qty)} value={p.etapa.pecas} onChange={(e) => p.setEtapa((s) => ({ ...s, pecas: e.target.value }))} /></div>
                        <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="et-motivo">Motivo (pausa ou interrupção)</label>
                          <input id="et-motivo" className="erp-input" value={p.etapa.motivo} onChange={(e) => p.setEtapa((s) => ({ ...s, motivo: e.target.value }))} /></div>
                        <span className="erp-hint" style={{ alignSelf: "flex-end", maxWidth: 420 }}>Não precisa digitar: as <strong>horas</strong> vêm do cronômetro (de Iniciar até Pausar ou Concluir, sem as pausas) e as <strong>peças</strong> são as da ordem. Digite só para corrigir.</span>
                      </div>
                    )}
                    {op.id && p.tokensEtapa[op.id] && (
                      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginTop: 10, padding: 10, background: "#fff", border: "1px solid var(--v-border-soft, #e3e6e3)", borderRadius: 6 }}>
                        <Code128Barcode value={p.tokensEtapa[op.id].barcode_value} />
                        <div style={{ display: "grid", gap: 6 }}>
                          <span className="erp-hint">O posto lê este código para iniciar, apontar e concluir a etapa {op.sequence}.{p.tokensEtapa[op.id].valid_until ? ` Vale até ${dataHora(p.tokensEtapa[op.id].valid_until)}.` : ""}</span>
                          <button className="erp-btn erp-btn-sm erp-btn-primary" style={{ justifySelf: "start" }} onClick={() => op.id && p.onImprimirEtiqueta(op.id)}>Imprimir etiqueta</button>
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <button className="erp-btn erp-btn-sm erp-btn-ghost" onClick={() => p.onGerarCodigo(op.id)} disabled={busy || !op.id} title="Etiqueta para o chão de fábrica apontar esta etapa">{op.id && p.tokensEtapa[op.id] ? "Gerar outro código" : "Código de barras da etapa"}</button>
                      {!!op.execution_history?.length && <details><summary className="erp-hint">Histórico da etapa</summary>
                        <ul style={{ margin: "4px 0 0 16px" }}>{op.execution_history.map((ev) => <li key={ev.id} className="erp-hint">{dataHora(ev.occurred_at)} · {OPERACAO[ev.status]?.rotulo ?? ev.status} · {ev.actor}</li>)}</ul>
                      </details>}
                    </div>
                  </td></tr>
                )}
              </Fragment>
            );
          })}</tbody>
        </table>
      </Painel>
    )}

    <Painel titulo={ultima ? `Apontar produção — última etapa: ${ultima.sequence} ${ultima.description ?? ""}` : "Apontar produção"}
      sub="as peças que terminaram o roteiro">
      <div className="erp-fieldset-body" style={{ padding: 0 }}>
        <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="ap-prod">Peças boas</label>
          <input id="ap-prod" className="erp-input num" type="number" min={0} value={p.app.produced_qty || ""} onChange={(e) => p.setApp((x) => ({ ...x, produced_qty: Number(e.target.value) }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label" htmlFor="ap-ref">Refugo</label>
          <input id="ap-ref" className="erp-input num" type="number" min={0} value={p.app.scrapped_qty || ""} onChange={(e) => p.setApp((x) => ({ ...x, scrapped_qty: Number(e.target.value) }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label erp-req">Operador</label>
          <LookupField value={p.app.employee_id || undefined} loader={loadEmployees} entityLabel="funcionário" clearable onChange={(c) => p.setApp((x) => ({ ...x, employee_id: c ? Number(c) : undefined }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Máquina</label>
          <LookupField value={p.app.machine_id || undefined} loader={loadMachinesById} entityLabel="máquina" clearable onChange={(c) => p.setApp((x) => ({ ...x, machine_id: c ? Number(c) : undefined }))} /></div>
        {(p.app.scrapped_qty ?? 0) > 0 && <div className="erp-field erp-c6"><label className="erp-label" htmlFor="ap-motivo">Motivo do refugo</label>
          <input id="ap-motivo" className="erp-input" value={p.app.scrap_reason ?? ""} onChange={(e) => p.setApp((x) => ({ ...x, scrap_reason: e.target.value }))} /></div>}
        <div className="erp-field erp-c3"><label className="erp-label" htmlFor="ap-data">Data</label>
          <input id="ap-data" className="erp-input" type="date" value={p.app.appointment_date ?? ""} onChange={(e) => p.setApp((x) => ({ ...x, appointment_date: e.target.value }))} />
          <span className="erp-hint">Vazio = hoje.</span></div>
        <div className="erp-field erp-c12" style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <button className="erp-btn erp-btn-primary" onClick={p.onApontar} disabled={busy || !emProducao}>Registrar apontamento</button>
          <span className="erp-hint">O material de <strong>baixa automática</strong> sai do estoque na proporção das peças boas e o custo da ordem é atualizado. Pode apontar em partes (por turno).</span>
        </div>
      </div>
    </Painel>

    {!p.gestor ? <p className="erp-note">A entrada do acabado no estoque e a conclusão da ordem são feitas pelo PCP ou almoxarifado. Já entregue: {num(of.produced_qty ?? 0)} de {num(of.planned_qty)}.</p>
      : <EntregaPainel of={of} busy={busy} conclusao={p.conclusao} setConclusao={p.setConclusao} onConcluir={p.onConcluir} serie={p.serie} pendentes={pendentes} />}

    <Painel titulo="Apontamentos" sub={`${p.apontamentos.length} lançamento(s)`} flush>
      {p.apontamentos.length === 0 ? <Vazio titulo="Nenhum apontamento ainda" /> : (
        <table className="erp-grid">
          <thead><tr><th>#</th><th>Data</th><th className="num">Boas</th><th className="num">Refugo</th><th>Motivo</th><th>Máquina</th><th>Operador</th></tr></thead>
          <tbody>{p.apontamentos.map((a) => (
            <tr key={a.id}>
              <td>{a.id}</td><td>{data(a.appointment_date)}</td><td className="num">{num(a.produced_qty)}</td><td className="num">{num(a.scrapped_qty ?? 0)}</td>
              <td>{a.scrap_reason || "—"}</td>
              <td>{a.machine_id ? <EntityName code={a.machine_id} loader={loadMachinesById} prefix="Máquina" showCode={false} /> : "—"}</td>
              <td>{a.employee_id ? <EntityName code={a.employee_id} loader={loadEmployeesById} prefix="Funcionário" showCode={false} /> : "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </Painel>

    <style>{`.etiquetas-etapas{display:none} @media print { body * { visibility: hidden; } .etiquetas-etapas { display: grid !important; position: absolute; left: 0; top: 0; width: 100%; grid-template-columns: repeat(2, 1fr); gap: 16px; } .etiquetas-etapas, .etiquetas-etapas * { visibility: visible; } .etiquetas-etapas > div { break-inside: avoid; border: 1px dashed #000; padding: 10px; text-align: center; } }`}</style>
    <div className="etiquetas-etapas" aria-hidden="true">
      {ordenadas.filter((o) => o.id && p.etiquetasImpressas.includes(o.id) && p.tokensEtapa[o.id]).map((o) => (
        <div key={o.id}>
          <div style={{ fontWeight: 700 }}>OF {of.id} · {itemDaOF(of).codigo}{of.planned_qty ? ` · ${num(of.planned_qty)} peça(s)` : ""}</div>
          <div>Etapa {o.sequence} — {o.description}</div>
          <Code128Barcode value={p.tokensEtapa[o.id as number].barcode_value} />
        </div>
      ))}
    </div>

    <details className="vpro-leitura">
      <summary className="erp-hint" style={{ cursor: "pointer", padding: "6px 0" }}>Leitura por código de barras (terminal do chão de fábrica)</summary>
      <LeituraPainel busy={busy} token={p.token} leitura={p.leitura} setLeitura={p.setLeitura} onLer={p.onLer} />
    </details>
  </>);
}

/** Tabela compacta do material de uma etapa: por peça, previsto, já saiu, falta sair. */
function TabelaMaterialDaEtapa({ linhas, titulo }: { linhas: MaterialDaOF[]; titulo: string }): JSX.Element {
  return (
    <div>
      <div className="erp-label" style={{ marginBottom: 4 }}>{titulo}</div>
      <table className="erp-grid">
        <thead><tr><th>Item</th><th className="num">Por peça</th><th className="num">Previsto</th><th className="num">Já saiu</th><th className="num">Falta sair</th><th>Baixa</th></tr></thead>
        <tbody>{linhas.map((m) => (
          <tr key={m.id}>
            <td className="vpl-strong">{m.codigo}{m.nome && <span className="vpl-sub">{m.nome}</span>}{m.substitui && <span className="vpl-sub">substitui {m.substitui}</span>}</td>
            <td className="num">{num(m.porPeca)} {m.unidade}</td>
            <td className="num">{num(m.previsto)} {m.unidade}</td>
            <td className="num">{m.saiu ? num(m.saiu) : "—"}</td>
            <td className="num">{m.falta > 0 ? <strong className={m.faltaSaldo > 0 ? "vpl-tom-danger" : undefined} title={m.faltaSaldo > 0 ? `Sem saldo para ${num(m.faltaSaldo)}` : undefined}>{num(m.falta)}</strong> : <Selo tom="ok">Saiu</Selo>}</td>
            <td title={m.automatica ? "Sai sozinho no apontamento e na entrega final" : "Sai pela requisição ou pelo consumo manual (aba Materiais)"}>{m.automatica ? "Automática" : "Manual"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function EntregaPainel({ of, busy, conclusao, setConclusao, onConcluir, serie, pendentes }: {
  of: ProductionOrderDTO; busy: boolean; conclusao: EntregaForm; setConclusao: (f: (p: EntregaForm) => EntregaForm) => void; onConcluir: () => void; serie?: SerieDaOF; pendentes: number;
}): JSX.Element {
  const emProducao = of.status === "IN_PROGRESS";
  const saldo = Math.max(0, (of.planned_qty || 0) - (of.produced_qty || 0));
  return (
    <Painel titulo="Entregar ao estoque" sub={`entrada do produto acabado · já entregue ${num(of.produced_qty ?? 0)} de ${num(of.planned_qty)}`}>
      <div className="vpl-filters">
        <div className="erp-field"><label className="erp-label erp-req" htmlFor="cl-qtd">Quantidade</label>
          <input id="cl-qtd" className="erp-input num" type="number" min={0} placeholder={num(saldo)} value={conclusao.quantidade}
            onChange={(e) => setConclusao((x) => ({ ...x, quantidade: e.target.value }))} /></div>
        <div className="erp-field vpl-grow"><label className="erp-label erp-req">Depósito do acabado</label>
          <LookupField value={conclusao.deposito} loader={loadWarehouses} entityLabel="depósito" onChange={(c) => setConclusao((x) => ({ ...x, deposito: c ? Number(c) : undefined }))} /></div>
        <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="cl-lote">Lote (rastreabilidade)</label>
          <input id="cl-lote" className="erp-input" value={conclusao.lote} onChange={(e) => setConclusao((x) => ({ ...x, lote: e.target.value }))} /></div>
        {serie?.controla && (
          <div className="erp-field vpl-grow"><label className={`erp-label${serie.mascara ? "" : " erp-req"}`} htmlFor="cl-series">Números de série — uma por linha</label>
            <textarea id="cl-series" className="erp-input" rows={2} value={conclusao.series} placeholder={serie.mascara ? "vazio: gerados pela máscara" : "uma série por unidade"}
              onChange={(e) => setConclusao((x) => ({ ...x, series: e.target.value }))} /></div>
        )}
        <label className="erp-check"><input type="checkbox" checked={conclusao.final} onChange={(e) => setConclusao((x) => ({ ...x, final: e.target.checked }))} />Última entrega — concluir a ordem</label>
        <button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-end" }} onClick={onConcluir}
          disabled={busy || !emProducao || (conclusao.final && pendentes > 0)}>{conclusao.final ? "Entregar e concluir" : "Registrar entrega"}</button>
      </div>
      <p className="erp-hint" style={{ marginTop: 8 }}>
        {conclusao.final && emProducao && pendentes > 0
          ? `Faltam ${pendentes} etapa(s) do roteiro: conclua ou dispense antes de concluir a ordem. Entregas parciais continuam liberadas.`
          : "Vazio, a quantidade é o saldo da ordem. Na entrega final sai o material automático que ainda faltava."}
      </p>
    </Painel>
  );
}

function LeituraPainel({ busy, token, leitura, setLeitura, onLer }: {
  busy: boolean; token: ProductionScanToken | null; leitura: LeituraForm; setLeitura: (f: (p: LeituraForm) => LeituraForm) => void; onLer: () => void;
}): JSX.Element {
  return (
    <Painel titulo="Leitura por código de barras" sub="o que o terminal do chão de fábrica faz">
      {token && <div style={{ marginBottom: 12 }}><Code128Barcode value={token.barcode_value} /><p className="erp-hint">Use exatamente este código; os números da ordem e da operação não substituem o token.</p></div>}
      <div className="erp-fieldset-body" style={{ padding: 0 }}>
        <div className="erp-field erp-c6"><label className="erp-label erp-req" htmlFor="lt-token">Código lido</label>
          <input id="lt-token" className="erp-input" autoComplete="off" value={leitura.token} onChange={(e) => setLeitura((s) => ({ ...s, token: e.target.value }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label" htmlFor="lt-acao">Ação</label>
          <select id="lt-acao" className="erp-input" value={leitura.action} onChange={(e) => setLeitura((s) => ({ ...s, action: e.target.value as ProductionScanAction }))}>
            <option value="RESOLVER">Consultar</option><option value="INICIAR">Iniciar</option><option value="APONTAR">Apontar</option><option value="CONCLUIR">Concluir</option>
          </select></div>
        <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="lt-disp">Dispositivo</label>
          <input id="lt-disp" className="erp-input" value={leitura.device_id} onChange={(e) => setLeitura((s) => ({ ...s, device_id: e.target.value }))} /></div>
        {leitura.action !== "RESOLVER" && (<>
          <div className="erp-field erp-c3"><label className="erp-label">Funcionário</label>
            {/* A leitura grava o funcionário pela chave interna (o apontamento comum recebe o código e converte; a leitura, não). */}
            <LookupField value={leitura.employee_id ? Number(leitura.employee_id) : undefined} loader={loadEmployeesById} entityLabel="funcionário" clearable onChange={(c) => setLeitura((s) => ({ ...s, employee_id: c ? String(c) : "" }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label" htmlFor="lt-boa">Qtd. boa</label>
            <input id="lt-boa" className="erp-input num" inputMode="decimal" value={leitura.good_quantity} onChange={(e) => setLeitura((s) => ({ ...s, good_quantity: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label" htmlFor="lt-ref">Qtd. refugo</label>
            <input id="lt-ref" className="erp-input num" inputMode="decimal" value={leitura.scrap_quantity} onChange={(e) => setLeitura((s) => ({ ...s, scrap_quantity: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label" htmlFor="lt-horas">Horas</label>
            <input id="lt-horas" className="erp-input num" inputMode="decimal" value={leitura.hours} onChange={(e) => setLeitura((s) => ({ ...s, hours: e.target.value }))} /></div>
          <div className="erp-field erp-c3"><label className="erp-label" htmlFor="lt-motivo">Motivo do refugo</label>
            <input id="lt-motivo" className="erp-input" value={leitura.scrap_reason} onChange={(e) => setLeitura((s) => ({ ...s, scrap_reason: e.target.value }))} /></div>
          <div className="erp-field erp-c12"><label className="erp-check"><input type="checkbox" checked={leitura.complete_operation} onChange={(e) => setLeitura((s) => ({ ...s, complete_operation: e.target.checked }))} />Concluir a operação com esta leitura</label></div>
        </>)}
        <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-start" }} onClick={onLer} disabled={busy}>Processar leitura</button></div>
      </div>
    </Painel>
  );
}
