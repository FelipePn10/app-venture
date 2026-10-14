import {
  type AppointmentDTO, type ConsumptionDTO, type CostDTO, type MaterialDTO, type OperationDTO, type ProductionOrderDTO,
  type MaterialAvailability, type ProductionScanAction, type ProductionScanToken,
} from "@/services/productionOrderService";
import { Code128Barcode } from "@/components/ui/Code128Barcode";
import { LookupField } from "@/components/ui/LookupField";
import { OPERACAO, SITUACAO_FALTA } from "./operacao";
import { EntityName } from "@/components/ui/EntityName";
import { loadEmployees, loadEmployeesById, loadItems, loadMachinesById, loadWarehouses } from "@/services/lookups";
import { Detalhe, Painel, Progresso, Selo, Vazio } from "../../planejamento/planUi";
import { data, dataHora, num, type Tom } from "../../planejamento/planFormat";

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Resumo ────────────────────────────────────────────────────────────────────

export function ResumoTab({ of, operacoes, apontamentos, consumos }: {
  of: ProductionOrderDTO; operacoes: OperationDTO[]; apontamentos: AppointmentDTO[]; consumos: ConsumptionDTO[];
}): JSX.Element {
  const feitas = operacoes.filter((o) => o.status === "DONE" || o.status === "SKIPPED").length;
  // "Produzida" da ordem é o que ENTROU no estoque (entrega/conclusão); o
  // apontamento registra o que saiu da máquina. Mostrar só um dos dois fazia a
  // ordem parecer parada com peças já apontadas.
  const apontadoBom = apontamentos.reduce((t, a) => t + (a.produced_qty || 0), 0);
  const apontadoRefugo = apontamentos.reduce((t, a) => t + (a.scrapped_qty || 0), 0);
  const saldo = Math.max(0, (of.planned_qty || 0) - Math.max(of.produced_qty || 0, apontadoBom));
  return (
    <div className="vpl-cols wide-left">
      <Painel titulo="Ordem">
        <Detalhe itens={[
          { label: "Item", value: of.item_code + (of.mask ? ` · ${of.mask}` : ""), forte: true },
          { label: "Quantidade planejada", value: num(of.planned_qty), forte: true },
          { label: "Apontado (bom)", value: num(apontadoBom) },
          { label: "Refugo apontado", value: num(Math.max(apontadoRefugo, of.scrapped_qty ?? 0)) },
          { label: "Entregue ao estoque", value: num(of.produced_qty ?? 0) },
          { label: "Saldo a produzir", value: num(saldo) },
          { label: "Início", value: data(of.start_date) },
          { label: "Término", value: data(of.end_date) },
          { label: "Máquina", value: of.machine_id ? <EntityName code={of.machine_id} loader={loadMachinesById} prefix="Máquina" showCode={false} /> : "—" },
          { label: "Prioridade", value: of.priority || "—" },
          { label: "Origem", value: of.planned_order_id ? `Ordem planejada ${of.planned_order_id} (MRP)` : "Criada manualmente" },
        ]} />
        <div style={{ marginTop: 14 }}><div className="vpl-kv-label" style={{ marginBottom: 6 }}>Apontado</div>
          <Progresso valor={apontadoBom} total={of.planned_qty || 0} /></div>
        <div style={{ marginTop: 10 }}><div className="vpl-kv-label" style={{ marginBottom: 6 }}>Entregue ao estoque</div>
          <Progresso valor={of.produced_qty ?? 0} total={of.planned_qty || 0} /></div>
        {of.notes && <p className="erp-note" style={{ marginTop: 12 }}>{of.notes}</p>}
      </Painel>
      <Painel titulo="Andamento">
        <Detalhe itens={[
          { label: "Etapas concluídas", value: operacoes.length ? `${feitas} de ${operacoes.length}` : "Roteiro não explodido" },
          { label: "Apontamentos", value: apontamentos.length },
          { label: "Consumos lançados", value: consumos.length },
        ]} />
        {operacoes.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {[...operacoes].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)).map((op) => {
              const s = OPERACAO[op.status ?? ""] ?? { rotulo: op.status ?? "—", tom: "muted" as Tom };
              return <div key={op.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{op.sequence} · {op.description || op.operation_code || "Operação"}</span><Selo tom={s.tom}>{s.rotulo}</Selo>
              </div>;
            })}
          </div>
        )}
      </Painel>
    </div>
  );
}

// ── Apontamento: produção, consumo e conclusão ───────────────────────────────

export type ApontamentoForm = AppointmentDTO;
/** Entrega ao estoque. `final` conclui a ordem; sem ele a entrega é parcial. */
export type EntregaForm = { deposito?: number; lote: string; quantidade: string; final: boolean };
export type ConsumoForm = ConsumptionDTO;

export function ApontamentoTab({ of, busy, app, setApp, cons, setCons, apontamentos, operacoesPendentes, conclusao, setConclusao, onApontar, onConsumir, onRetornarSucata, onConcluir }: {
  of: ProductionOrderDTO; busy: boolean;
  app: AppointmentDTO; setApp: (f: (p: AppointmentDTO) => AppointmentDTO) => void;
  cons: ConsumptionDTO; setCons: (f: (p: ConsumptionDTO) => ConsumptionDTO) => void;
  apontamentos: AppointmentDTO[]; operacoesPendentes: number;
  conclusao: EntregaForm; setConclusao: (f: (p: EntregaForm) => EntregaForm) => void;
  onApontar: () => void; onConsumir: () => void; onRetornarSucata: () => void; onConcluir: () => void;
}): JSX.Element {
  const emProducao = of.status === "IN_PROGRESS";
  const saldo = Math.max(0, (of.planned_qty || 0) - (of.produced_qty || 0));
  return (<>
    {!emProducao && (
      <p className="erp-note">
        {of.status === "OPEN" ? <>A ordem está <strong>aberta</strong>: clique em <strong>Iniciar produção</strong> no cabeçalho para liberar apontamento e consumo.</>
          : <>A ordem não está em produção — apontamento e consumo ficam bloqueados.</>}
      </p>
    )}
    <div className="vpl-cols">
      <Painel titulo="Apontar produção">
        <div className="erp-fieldset-body" style={{ padding: 0 }}>
          <div className="erp-field erp-c6"><label className="erp-label erp-req" htmlFor="ap-prod">Quantidade boa</label>
            <input id="ap-prod" className="erp-input num" type="number" min={0} value={app.produced_qty || ""} onChange={(e) => setApp((p) => ({ ...p, produced_qty: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c6"><label className="erp-label" htmlFor="ap-ref">Refugo</label>
            <input id="ap-ref" className="erp-input num" type="number" min={0} value={app.scrapped_qty || ""} onChange={(e) => setApp((p) => ({ ...p, scrapped_qty: Number(e.target.value) }))} /></div>
          {(app.scrapped_qty ?? 0) > 0 && <div className="erp-field erp-c12"><label className="erp-label" htmlFor="ap-motivo">Motivo do refugo</label>
            <input id="ap-motivo" className="erp-input" value={app.scrap_reason ?? ""} onChange={(e) => setApp((p) => ({ ...p, scrap_reason: e.target.value }))} /></div>}
          <div className="erp-field erp-c6"><label className="erp-label" htmlFor="ap-data">Data</label>
            <input id="ap-data" className="erp-input" type="date" value={app.appointment_date ?? ""} onChange={(e) => setApp((p) => ({ ...p, appointment_date: e.target.value }))} />
            <span className="erp-hint">Vazio = hoje. Use para lançar o turno da noite na manhã seguinte.</span></div>
          <div className="erp-field erp-c6"><label className="erp-label">Baixa automática da estrutura no depósito</label>
            <LookupField value={app.backflush_warehouse_id || undefined} loader={loadWarehouses} entityLabel="depósito" clearable placeholder="Sem baixa automática"
              onChange={(c) => setApp((p) => ({ ...p, backflush_warehouse_id: c ? Number(c) : undefined }))} /></div>
          <div className="erp-field erp-c6"><label className="erp-label">Máquina</label>
            <LookupField value={app.machine_id || undefined} loader={loadMachinesById} entityLabel="máquina" clearable onChange={(c) => setApp((p) => ({ ...p, machine_id: c ? Number(c) : undefined }))} /></div>
          <div className="erp-field erp-c6"><label className="erp-label erp-req">Operador</label>
            <LookupField value={app.employee_id || undefined} loader={loadEmployees} entityLabel="funcionário" clearable onChange={(c) => setApp((p) => ({ ...p, employee_id: c ? Number(c) : undefined }))} /></div>
          <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-start" }} onClick={onApontar} disabled={busy || !emProducao}>Registrar apontamento</button></div>
        </div>
      </Painel>

      <Painel titulo="Consumir insumo" sub="saída do estoque para a ordem">
        <div className="erp-fieldset-body" style={{ padding: 0 }}>
          <div className="erp-field erp-c6"><label className="erp-label erp-req">Insumo</label>
            <LookupField value={cons.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setCons((p) => ({ ...p, item_code: String(c ?? "") }))} /></div>
          <div className="erp-field erp-c6"><label className="erp-label erp-req" htmlFor="co-qtd">Quantidade</label>
            <input id="co-qtd" className="erp-input num" type="number" min={0} value={cons.consumed_qty || ""} onChange={(e) => setCons((p) => ({ ...p, consumed_qty: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c6"><label className="erp-label erp-req">Depósito</label>
            <LookupField value={cons.warehouse_id || undefined} loader={loadWarehouses} entityLabel="depósito" onChange={(c) => setCons((p) => ({ ...p, warehouse_id: c ? Number(c) : undefined }))} /></div>
          <div className="erp-field erp-c6"><label className="erp-label" htmlFor="co-data">Data</label>
            <input id="co-data" className="erp-input" type="date" value={cons.consumption_date ?? ""} onChange={(e) => setCons((p) => ({ ...p, consumption_date: e.target.value }))} /></div>
          <div className="erp-field erp-c12"><label className="erp-label" htmlFor="co-ap">Apontamento</label>
            <select id="co-ap" className="erp-input" value={cons.appointment_id ?? ""} onChange={(e) => setCons((p) => ({ ...p, appointment_id: e.target.value ? Number(e.target.value) : undefined }))}>
              <option value="">Para a ordem inteira</option>
              {apontamentos.filter((a) => a.id).map((a) => <option key={a.id} value={a.id}>{`#${a.id} · ${num(a.produced_qty ?? 0)} peça(s)${a.appointment_date ? ` · ${data(a.appointment_date)}` : ""}`}</option>)}
            </select>
            <span className="erp-hint">Amarrar o consumo ao apontamento diz quanto material foi para cada lote produzido.</span></div>
          <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
            <button className="erp-btn erp-btn-primary" onClick={onConsumir} disabled={busy || !emProducao}>Registrar consumo</button>
            <button className="erp-btn" onClick={onRetornarSucata} disabled={busy} title="Devolve o item informado ao estoque como sucata (entrada valorizada)">Retornar como sucata</button>
          </div>
        </div>
      </Painel>
    </div>

    <Painel titulo="Entregar ao estoque" sub={`entrada do produto acabado · já entregue ${num(of.produced_qty ?? 0)} de ${num(of.planned_qty)}`}>
      <div className="vpl-filters">
        <div className="erp-field"><label className="erp-label erp-req" htmlFor="cl-qtd">Quantidade</label>
          <input id="cl-qtd" className="erp-input num" type="number" min={0} placeholder={num(saldo)} value={conclusao.quantidade}
            onChange={(e) => setConclusao((p) => ({ ...p, quantidade: e.target.value }))} /></div>
        <div className="erp-field vpl-grow"><label className="erp-label erp-req">Depósito do acabado</label>
          <LookupField value={conclusao.deposito} loader={loadWarehouses} entityLabel="depósito" onChange={(c) => setConclusao((p) => ({ ...p, deposito: c ? Number(c) : undefined }))} /></div>
        <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="cl-lote">Lote (rastreabilidade)</label>
          <input id="cl-lote" className="erp-input" value={conclusao.lote} onChange={(e) => setConclusao((p) => ({ ...p, lote: e.target.value }))} /></div>
        <label className="erp-check"><input type="checkbox" checked={conclusao.final} onChange={(e) => setConclusao((p) => ({ ...p, final: e.target.checked }))} />Última entrega — concluir a ordem</label>
        <button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-end" }} onClick={onConcluir}
          disabled={busy || !emProducao || (conclusao.final && operacoesPendentes > 0)}>{conclusao.final ? "Entregar e concluir" : "Registrar entrega"}</button>
      </div>
      <p className="erp-hint" style={{ marginTop: 8 }}>
        {conclusao.final && emProducao && operacoesPendentes > 0
          ? `Faltam ${operacoesPendentes} etapa(s) do roteiro: conclua ou dispense na aba Etapas antes de concluir a ordem. Entregas parciais continuam liberadas.`
          : "Vazio, a quantidade é o saldo da ordem. Desmarque a última entrega para lançar uma entrega parcial e continuar produzindo."}
      </p>
    </Painel>

    <Painel titulo="Apontamentos" sub={`${apontamentos.length} lançamento(s)`} flush>
      {apontamentos.length === 0 ? <Vazio titulo="Nenhum apontamento ainda" /> : (
        <table className="erp-grid">
          <thead><tr><th>#</th><th>Data</th><th className="num">Boa</th><th className="num">Refugo</th><th>Motivo</th><th>Máquina</th><th>Operador</th></tr></thead>
          <tbody>{apontamentos.map((a) => (
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
  </>);
}

// ── Etapas do roteiro e leitura por código de barras ─────────────────────────

export type LeituraForm = { token: string; action: ProductionScanAction; device_id: string; employee_id: string; good_quantity: string; scrap_quantity: string; hours: string; scrap_reason: string; complete_operation: boolean };

export function EtapasTab({ of, busy, operacoes, etapa, setEtapa, onAlterar, onGerarCodigo, token, leitura, setLeitura, onLer, onExplodir }: {
  of: ProductionOrderDTO; busy: boolean; operacoes: OperationDTO[];
  etapa: { horas: string; pecas: string; motivo: string }; setEtapa: (f: (p: { horas: string; pecas: string; motivo: string }) => { horas: string; pecas: string; motivo: string }) => void;
  onAlterar: (id: number, status: string) => void; onGerarCodigo: (id?: number) => void;
  token: ProductionScanToken | null; leitura: LeituraForm; setLeitura: (f: (p: LeituraForm) => LeituraForm) => void; onLer: () => void; onExplodir: () => void;
}): JSX.Element {
  const emProducao = of.status === "IN_PROGRESS";
  const ordenadas = [...operacoes].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const terminado = operacoes.length > 0 && operacoes.every((op) => op.status === "DONE" || op.status === "SKIPPED");
  if (operacoes.length === 0) {
    return <Painel titulo="Etapas do roteiro"><Vazio titulo="O roteiro desta ordem ainda não foi explodido" texto="Explodir cria uma etapa por operação do roteiro padrão do item, com centro e tempos."
      acao={<button className="erp-btn erp-btn-primary" onClick={onExplodir} disabled={busy}>Explodir roteiro</button>} /></Painel>;
  }
  return (<>
    <Painel titulo="Dados para a etapa" sub="valem para o próximo botão que você clicar na etapa">
      <div className="vpl-filters">
        <div className="erp-field"><label className="erp-label" htmlFor="et-horas">Horas trabalhadas</label>
          <input id="et-horas" className="erp-input num" type="number" min={0} step="0.01" value={etapa.horas} onChange={(e) => setEtapa((s) => ({ ...s, horas: e.target.value }))} /></div>
        <div className="erp-field"><label className="erp-label" htmlFor="et-pecas">Peças produzidas</label>
          <input id="et-pecas" className="erp-input num" type="number" min={0} step="1" value={etapa.pecas} onChange={(e) => setEtapa((s) => ({ ...s, pecas: e.target.value }))} /></div>
        <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="et-motivo">Motivo (pausa ou interrupção)</label>
          <input id="et-motivo" className="erp-input" value={etapa.motivo} onChange={(e) => setEtapa((s) => ({ ...s, motivo: e.target.value }))} /></div>
      </div>
      <p className="erp-hint" style={{ marginTop: 8 }}>Preencha horas e peças <strong>antes</strong> de concluir a etapa: é esse apontamento que gasta a vida útil da ferramenta e avisa quando ela precisa ser trocada.</p>
    </Painel>

    {terminado && <p className="erp-note">Roteiro concluído. Próximo passo: <strong>Concluir ordem</strong> na aba Apontamento.</p>}

    <Painel titulo="Etapas do roteiro" sub={`${operacoes.filter((o) => o.status === "DONE" || o.status === "SKIPPED").length} de ${operacoes.length} concluída(s)`} flush>
      <table className="erp-grid">
        <thead><tr><th className="num">Seq.</th><th>Operação</th><th>Situação</th><th>Início</th><th>Fim</th><th className="num">Horas</th><th /></tr></thead>
        <tbody>{ordenadas.map((op) => {
          const s = OPERACAO[op.status ?? ""] ?? { rotulo: op.status ?? "—", tom: "muted" as Tom };
          return (
            <tr key={op.id}>
              <td className="num">{op.sequence}</td>
              <td className="vpl-strong">{op.description || op.operation_code || "—"}
                {op.notes && <span className="vpl-sub" style={{ whiteSpace: "pre-line" }}>{op.notes}</span>}
                {op.warnings?.map((aviso) => <div key={aviso} style={{ marginTop: 4 }}><Selo tom="warn">{aviso}</Selo></div>)}
                {!!op.execution_history?.length && <details style={{ marginTop: 4, fontWeight: 400 }}><summary className="erp-hint">Histórico</summary>
                  <ul style={{ margin: "4px 0 0 16px" }}>{op.execution_history.map((ev) => <li key={ev.id} className="erp-hint">{dataHora(ev.occurred_at)} · {OPERACAO[ev.status]?.rotulo ?? ev.status} · {ev.actor}</li>)}</ul>
                </details>}
              </td>
              <td><Selo tom={s.tom}>{s.rotulo}</Selo></td>
              <td>{op.started_at ? dataHora(op.started_at) : "—"}</td>
              <td>{op.completed_at ? dataHora(op.completed_at) : "—"}</td>
              <td className="num">{op.actual_hours ? num(op.actual_hours) : "—"}</td>
              <td className="vpl-actions">
                {op.can_start && <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy || !emProducao} onClick={() => op.id && onAlterar(op.id, "IN_PROGRESS")}>{op.status === "PENDING" ? "Iniciar" : "Retomar"}</button>}
                {op.status === "IN_PROGRESS" && <>
                  <button className="erp-btn erp-btn-sm" disabled={busy || !emProducao} onClick={() => op.id && onAlterar(op.id, "PAUSED")}>Pausar</button>
                  <button className="erp-btn erp-btn-sm" disabled={busy || !emProducao} onClick={() => op.id && onAlterar(op.id, "INTERRUPTED")}>Interromper</button>
                  <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy || !emProducao} onClick={() => op.id && onAlterar(op.id, "DONE")}>Concluir</button>
                </>}
                <button className="erp-btn erp-btn-sm erp-btn-ghost" onClick={() => onGerarCodigo(op.id)} disabled={busy || !op.id} title="Gera a etiqueta para o chão de fábrica apontar esta etapa">Código de barras</button>
              </td>
            </tr>
          );
        })}</tbody>
      </table>
    </Painel>

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
            {/* A leitura grava o funcionário pela chave interna (o apontamento
                comum recebe o código e converte; a leitura, não). */}
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
  </>);
}

// ── Materiais ─────────────────────────────────────────────────────────────────

export type MaterialForm = { item_code: string; quantity: string; warehouse_id?: number; automatic_issue: boolean; substituted_item_code: string };

/**
 * Faltas de material antes de liberar — o "missing parts" do SAP: para cada
 * material, o que falta baixar, o saldo livre do depósito, o que as OFs da
 * frente já vão consumir e quanto falta para esta.
 */
export function FaltasPainel({ disponibilidade }: { disponibilidade: MaterialAvailability | null }): JSX.Element | null {
  if (!disponibilidade || disponibilidade.status === "SEM_LISTA") return null;
  const sit = SITUACAO_FALTA[disponibilidade.status];
  return (
    <Painel titulo="Disponibilidade para produzir" sub={disponibilidade.missing_items ? `${disponibilidade.missing_items} de ${disponibilidade.items} item(ns) com falta` : `${disponibilidade.items} item(ns) a baixar, todos disponíveis`}
      acoes={<Selo tom={sit.tom}>{sit.rotulo}</Selo>} flush>
      {disponibilidade.lines.length === 0 ? <Vazio titulo="Todos os materiais já foram baixados" /> : (
        <table className="erp-grid">
          <thead><tr><th>Item</th><th className="num">A baixar</th><th className="num">Livre no depósito</th><th className="num">OFs na frente</th><th className="num">Disponível</th><th className="num">Falta</th><th>Situação</th></tr></thead>
          <tbody>{disponibilidade.lines.map((l) => {
            const s = SITUACAO_FALTA[l.status] ?? SITUACAO_FALTA.COMPLETA;
            return (
              <tr key={l.material_id}>
                <td className="vpl-strong">{l.item_code}<span className="vpl-sub">{l.description}</span></td>
                <td className="num">{num(l.remaining)} {l.uom ?? ""}</td>
                <td className="num">{num(l.free_stock)}</td>
                <td className="num" title="O que as ordens abertas que começam antes desta vão consumir do mesmo saldo">{l.committed_earlier ? num(l.committed_earlier) : "—"}</td>
                <td className="num">{num(l.available)}</td>
                <td className="num">{l.shortage > 0 ? <strong className="vpl-tom-danger">{num(l.shortage)}</strong> : "—"}</td>
                <td><Selo tom={s.tom}>{l.status === "COMPLETA" ? "Disponível" : s.rotulo}</Selo></td>
              </tr>
            );
          })}</tbody>
        </table>
      )}
    </Painel>
  );
}

export function MateriaisTab({ busy, materiais, disponibilidade, form, setForm, onIncluir, onAlocar, onSucata }: {
  busy: boolean; materiais: MaterialDTO[]; disponibilidade: MaterialAvailability | null; form: MaterialForm; setForm: (f: (p: MaterialForm) => MaterialForm) => void;
  onIncluir: () => void; onAlocar: (m: MaterialDTO) => void; onSucata: (m: MaterialDTO) => void;
}): JSX.Element {
  return (<>
    <FaltasPainel disponibilidade={disponibilidade} />
    <Painel titulo="Materiais da ordem" sub={`${materiais.length} item(ns)`} flush>
      {materiais.length === 0 ? <Vazio titulo="Nenhum material lançado" texto="Inclua abaixo os itens que a ordem consome além da estrutura, ou as substituições." /> : (
        <table className="erp-grid">
          <thead><tr><th>Item</th><th className="num">Quantidade</th><th style={{ width: 200 }}>Atendido</th><th>Depósito</th><th>Baixa</th><th /></tr></thead>
          <tbody>{materiais.map((m) => {
            const qtd = Number(m.quantity) || 0;
            return (
              <tr key={m.id}>
                <td className="vpl-strong">{m.item_code}{m.substituted_item_code && <span className="vpl-sub">substitui {m.substituted_item_code}</span>}</td>
                <td className="num">{num(qtd)}</td>
                <td><Progresso valor={m.allocated_qty ?? 0} total={qtd} /></td>
                <td>{m.warehouse_id ? <EntityName code={m.warehouse_id} loader={loadWarehouses} prefix="Depósito" showCode={false} /> : "—"}</td>
                <td>{m.automatic_issue ? "Automática" : "Manual"}</td>
                <td className="vpl-actions">
                  <button className="erp-btn erp-btn-sm" onClick={() => onAlocar(m)} disabled={busy} title="Escolhe os lotes pela data e pelo código do lote">Alocar lotes</button>
                  <button className="erp-btn erp-btn-sm" onClick={() => onSucata(m)} disabled={busy}>Destinar sucata</button>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      )}
    </Painel>
    <Painel titulo="Incluir material">
      <div className="erp-fieldset-body" style={{ padding: 0 }}>
        <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label>
          <LookupField value={form.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setForm((m) => ({ ...m, item_code: String(c ?? "") }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="mt-qtd">Quantidade</label>
          <input id="mt-qtd" className="erp-input num" type="number" min={0} value={form.quantity} onChange={(e) => setForm((m) => ({ ...m, quantity: e.target.value }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Depósito</label>
          <LookupField value={form.warehouse_id} loader={loadWarehouses} entityLabel="depósito" clearable onChange={(c) => setForm((m) => ({ ...m, warehouse_id: c ? Number(c) : undefined }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Substitui o item</label>
          <LookupField value={form.substituted_item_code || undefined} loader={loadItems} entityLabel="item" placeholder="Nenhum — está na estrutura" clearable
            onChange={(c) => setForm((m) => ({ ...m, substituted_item_code: c ? String(c) : "" }))} /></div>
        <div className="erp-field erp-c12" style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <label className="erp-check"><input type="checkbox" checked={form.automatic_issue} onChange={(e) => setForm((m) => ({ ...m, automatic_issue: e.target.checked }))} />Baixa automática no apontamento</label>
          <button className="erp-btn erp-btn-primary" onClick={onIncluir} disabled={busy}>Incluir material</button>
        </div>
      </div>
    </Painel>
  </>);
}

// ── Consumos ──────────────────────────────────────────────────────────────────

export function ConsumosTab({ consumos }: { consumos: ConsumptionDTO[] }): JSX.Element {
  return (
    <Painel titulo="Consumos lançados" sub={`${consumos.length} lançamento(s)`} flush>
      {consumos.length === 0 ? <Vazio titulo="Nenhum consumo lançado" texto="Os consumos registrados na aba Apontamento aparecem aqui." /> : (
        <table className="erp-grid">
          <thead><tr><th>#</th><th>Data</th><th>Insumo</th><th className="num">Quantidade</th><th>Depósito</th><th>Lote</th><th>Apontamento</th></tr></thead>
          <tbody>{consumos.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td><td>{data(c.consumption_date)}</td><td className="vpl-strong">{c.item_code}</td><td className="num">{num(c.consumed_qty)}</td>
              <td>{c.warehouse_id ? <EntityName code={c.warehouse_id} loader={loadWarehouses} prefix="Depósito" showCode={false} /> : "—"}</td>
              <td>{c.lot || "—"}</td><td>{c.appointment_id ? `#${c.appointment_id}` : "Ordem inteira"}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </Painel>
  );
}

// ── Custo ─────────────────────────────────────────────────────────────────────

function corDoDesvio(desvio: number): string {
  if (Math.abs(desvio) < 0.005) return "inherit";
  return desvio > 0 ? "var(--v-err)" : "var(--v-ok)";
}
/** Um número sozinho não diz se é bom ou ruim; a faixa de 2% evita alarme por arredondamento. */
function leituraDoDesvio(desvio: number, padrao: number): string {
  if (padrao === 0) return desvio === 0 ? "—" : "sem padrão para comparar";
  const pct = (desvio / padrao) * 100;
  if (Math.abs(pct) < 2) return "dentro do padrão";
  const p = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return pct > 0 ? `estourou ${p(pct)}%` : `economizou ${p(Math.abs(pct))}%`;
}

export function CustoTab({ custo, busy, onApurar }: { custo: CostDTO | null; busy: boolean; onApurar: () => void }): JSX.Element {
  if (!custo) {
    return <Painel titulo="Custo da ordem"><Vazio titulo="Custo ainda não apurado" texto="A apuração soma o material consumido, as horas apontadas e os indiretos do centro, e compara com o custo padrão."
      acao={<button className="erp-btn erp-btn-primary" onClick={onApurar} disabled={busy}>Apurar custo</button>} /></Painel>;
  }
  const linhas = [
    { rotulo: "Material", real: custo.material_cost_real ?? 0, padrao: custo.material_cost_std ?? 0 },
    { rotulo: "Mão de obra", real: custo.labor_cost_real ?? 0, padrao: custo.labor_cost_std ?? 0 },
    { rotulo: "Indiretos", real: custo.overhead_cost_real ?? 0, padrao: custo.overhead_cost_std ?? 0 },
  ];
  const total = { rotulo: "Total", real: custo.total_cost_real ?? 0, padrao: custo.total_cost_std ?? 0 };
  const variacao = custo.variance_pct ?? 0;
  return (<>
    <div className="vpl-kpis">
      <div className="vpl-kpi"><div className="vpl-kpi-label">Custo real</div><div className="vpl-kpi-value">{money(total.real)}</div><div className="vpl-kpi-hint">padrão {money(total.padrao)}</div></div>
      <div className="vpl-kpi"><div className="vpl-kpi-label">Custo unitário real</div><div className="vpl-kpi-value">{money(custo.unit_cost_real)}</div><div className="vpl-kpi-hint">{num(custo.produced_qty ?? 0)} peça(s) produzida(s)</div></div>
      {/* Sem custo padrão não há desvio a medir: "0,0%" em verde dizia que estava
          tudo certo quando a ordem simplesmente não tinha com o que comparar. */}
      {total.padrao === 0 ? (
        <div className="vpl-kpi muted"><div className="vpl-kpi-label">Desvio sobre o padrão</div>
          <div className="vpl-kpi-value">—</div><div className="vpl-kpi-hint">o item não tem custo padrão</div></div>
      ) : (
        <div className={`vpl-kpi${variacao > 2 ? " danger" : ""}`}><div className="vpl-kpi-label">Desvio sobre o padrão</div>
          <div className="vpl-kpi-value" style={{ color: corDoDesvio(variacao) }}>{variacao > 0 ? "+" : ""}{variacao.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</div>
          <div className="vpl-kpi-hint">{(custo.total_variance ?? 0) > 0 ? "+" : ""}{money(custo.total_variance)}</div></div>
      )}
    </div>
    <Painel titulo="Real × padrão" sub={custo.settled_at ? `apurado em ${data(custo.settled_at)}` : undefined}
      acoes={<button className="erp-btn erp-btn-sm" onClick={onApurar} disabled={busy}>Apurar de novo</button>} flush>
      <table className="erp-grid">
        <thead><tr><th>Componente</th><th className="num">Real</th><th className="num">Padrão</th><th className="num">Desvio</th><th>Leitura</th></tr></thead>
        <tbody>{[...linhas, total].map((l) => {
          const desvio = l.real - l.padrao;
          return (
            <tr key={l.rotulo} className={l.rotulo === "Total" ? "erp-row-sel" : undefined}>
              <td style={{ fontWeight: l.rotulo === "Total" ? 700 : 400 }}>{l.rotulo}</td>
              <td className="num">{money(l.real)}</td><td className="num">{money(l.padrao)}</td>
              <td className="num" style={{ color: corDoDesvio(desvio), fontWeight: 600 }}>{desvio > 0 ? "+" : ""}{money(desvio)}</td>
              <td>{leituraDoDesvio(desvio, l.padrao)}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </Painel>
    <p className="erp-note">O desvio por componente diz onde procurar: material aponta para consumo acima da estrutura ou preço de compra; mão de obra, para tempo além do roteiro; indiretos, para o rateio do centro. É o custo unitário real que alimenta o custo médio do estoque na entrada do acabado.</p>
  </>);
}
