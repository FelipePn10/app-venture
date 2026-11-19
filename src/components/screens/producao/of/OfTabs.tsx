import {
  type AppointmentDTO, type ConsumptionDTO, type CostDTO, type OperationDTO, type ProductionOrderDTO,
  type ProductionChain, type ProductionScanAction, filhaPendente,
} from "@/services/productionOrderService";
import { OPERACAO } from "./operacao";
import { EntityName } from "@/components/ui/EntityName";
import { loadMachinesById } from "@/services/lookups";
import { Detalhe, Painel, Progresso, Selo, Vazio } from "../../planejamento/planUi";
import { data, dataHora, num, situacaoOF, type Tom } from "../../planejamento/planFormat";
import { CuidadosDosItens } from "@/components/system/CuidadosDosItens";

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Resumo ────────────────────────────────────────────────────────────────────

export function ResumoTab({ of, operacoes, apontamentos, consumos, cadeia = null, onAbrirOF }: {
  of: ProductionOrderDTO; operacoes: OperationDTO[]; apontamentos: AppointmentDTO[]; consumos: ConsumptionDTO[];
  cadeia?: ProductionChain | null; onAbrirOF?: (id: number) => void;
}): JSX.Element {
  const feitas = operacoes.filter((o) => o.status === "DONE" || o.status === "SKIPPED").length;
  // "Produzida" da ordem é o que ENTROU no estoque (entrega/conclusão); o
  // apontamento registra o que saiu da máquina. Mostrar só um dos dois fazia a
  // ordem parecer parada com peças já apontadas.
  const apontadoBom = apontamentos.reduce((t, a) => t + (a.produced_qty || 0), 0);
  const apontadoRefugo = apontamentos.reduce((t, a) => t + (a.scrapped_qty || 0), 0);
  // Fechada (concluída, encerrada, cancelada) não tem saldo a produzir: o que faltou é refugo.
  const fechada = of.status === "COMPLETED" || of.status === "CLOSED" || of.status === "CANCELLED";
  const saldo = fechada ? 0 : Math.max(0, (of.planned_qty || 0) - Math.max(of.produced_qty || 0, apontadoBom));
  return (<>
    <CuidadosDosItens codigos={[of.item_code]} contexto="do item desta ordem" />
    <div className="vpl-cols wide-left">
      <Painel titulo="Ordem">
        <Detalhe itens={[
          { label: "Item", value: of.item_code + (of.mask ? ` · ${of.mask}` : ""), forte: true },
          { label: "Quantidade planejada", value: num(of.planned_qty), forte: true },
          { label: "Revisão do item", value: of.item_revision || "—" },
          { label: "Apontado (bom)", value: num(apontadoBom) },
          { label: "Refugo apontado", value: num(Math.max(apontadoRefugo, of.scrapped_qty ?? 0)) },
          { label: "Entregue ao estoque", value: num(of.produced_qty ?? 0) },
          { label: "Saldo a produzir", value: num(saldo) },
          { label: "Início", value: data(of.start_date) },
          { label: "Término", value: data(of.end_date) },
          { label: "Máquina", value: of.machine_id ? <EntityName code={of.machine_id} loader={loadMachinesById} prefix="Máquina" showCode={false} /> : "—" },
          { label: "Prioridade", value: of.priority || "—" },
          { label: "Origem", value: of.planned_order_id ? `Ordem planejada ${of.planned_order_id} (MRP)` : "Criada manualmente" },
          { label: "Cliente", value: of.origin?.customer_name || "—" },
          { label: "Projeto", value: of.origin?.project_code ? `${of.origin.project_code}${of.origin.project_name && of.origin.project_name !== of.origin.project_code ? ` — ${of.origin.project_name}` : ""}` : "—" },
        ]} />
        <div style={{ marginTop: 14 }}><div className="vpl-kv-label" style={{ marginBottom: 6 }}>Apontado</div>
          <Progresso valor={apontadoBom} total={of.planned_qty || 0} /></div>
        <div style={{ marginTop: 10 }}><div className="vpl-kv-label" style={{ marginBottom: 6 }}>Entregue ao estoque</div>
          <Progresso valor={of.produced_qty ?? 0} total={of.planned_qty || 0} /></div>
        {notasLegiveis(of.notes) && <p className="erp-note" style={{ marginTop: 12 }}>{notasLegiveis(of.notes)}</p>}
      </Painel>
      <Painel titulo="Andamento">
        <Detalhe itens={[
          { label: "Etapas concluídas", value: operacoes.length ? `${feitas} de ${operacoes.length}` : "Sem etapas (o roteiro é aplicado ao iniciar)" },
          { label: "Apontamentos", value: apontamentos.length },
          { label: "Lançado à mão", value: consumos.length },
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
    {onAbrirOF && <div style={{ marginTop: 14 }}><CadeiaPainel cadeia={cadeia} onAbrir={onAbrirOF} /></div>}
  </>);
}

/**
 * O MRP grava na observação da OF do componente uma marca técnica com o código
 * interno do item pai ("parent_item=91000566910"), que a tela mostrava crua. A
 * ordem pai, com o código que o usuário conhece, está na Cadeia de fabricação.
 */
function notasLegiveis(notas?: string | null): string {
  return (notas ?? "")
    .replace(/parent_item=\d+/g, "Componente gerado pelo MRP para a ordem pai, mostrada abaixo")
    .replace(/\s*;\s*/g, "; ")
    .trim();
}

// ── Cadeia de fabricação ──────────────────────────────────────────────────────

/**
 * De onde vem e para onde vai esta ordem: os pedidos de venda que ela atende, a
 * ordem que usa a peça dela (o RN que leva a bucha) e as ordens dos componentes
 * fabricados para ela. A peça pronta da ordem do componente fica guardada para
 * esta ordem — é o "Reservado".
 */
export function CadeiaPainel({ cadeia, onAbrir }: { cadeia: ProductionChain | null; onAbrir: (id: number) => void }): JSX.Element | null {
  if (!cadeia || (cadeia.sales_orders.length + cadeia.independent_demands.length + cadeia.parents.length + cadeia.children.length) === 0) return null;
  const pendentes = cadeia.children.filter(filhaPendente).length;
  const linha = (o: ProductionChain["children"][number], mostrarReserva: boolean) => {
    const sit = o.production_order_id ? situacaoOF(o.status) : { rotulo: "Sem OF (ainda não liberada)", tom: "warn" as Tom };
    return (
      <tr key={`${o.planned_order_code ?? ""}-${o.production_order_id ?? ""}`}>
        <td>{o.production_order_id
          ? <button type="button" className="erp-btn erp-btn-sm" onClick={() => onAbrir(o.production_order_id!)} title="Abrir esta ordem">OF {o.production_order_id}</button>
          : <span className="erp-text-muted">Planejada {o.planned_order_code}</span>}</td>
        <td className="vpl-strong">{o.business_code || o.item_code}<span className="vpl-sub">{o.description}</span></td>
        <td className="num">{num(o.produced)} / {num(o.quantity)}</td>
        {mostrarReserva && <td className="num">{o.reserved ? num(o.reserved) : "—"}</td>}
        <td><Selo tom={sit.tom}>{sit.rotulo}</Selo></td>
      </tr>
    );
  };
  return (
    <Painel titulo="Cadeia de fabricação" sub={pendentes ? `${pendentes} componente(s) fabricado(s) ainda não pronto(s)` : undefined}
      acoes={cadeia.children.length ? <Selo tom={pendentes ? "warn" : "ok"}>{pendentes ? "Componentes em produção" : "Componentes prontos"}</Selo> : undefined}>
      {cadeia.sales_orders.length > 0 && (
        <div style={{ marginBottom: 10 }}><div className="vpl-kv-label" style={{ marginBottom: 6 }}>Pedido(s) de venda atendido(s)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cadeia.sales_orders.map((p) => <Selo key={`${p.sales_order_code}-${p.sequence ?? 0}`} tom="info">
              Pedido {p.sales_order_number || p.sales_order_code}{p.sequence ? ` · item ${p.sequence}` : ""}{p.customer ? ` · ${p.customer}` : ""}</Selo>)}
          </div></div>
      )}
      {cadeia.independent_demands.length > 0 && (
        <div style={{ marginBottom: 10 }}><div className="vpl-kv-label" style={{ marginBottom: 6 }}>Demanda(s) independente(s) atendida(s)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cadeia.independent_demands.map((d) => <Selo key={d.demand_code} tom="info">
              Demanda {d.demand_code} · {d.reason_label || d.reason} · {d.business_code || d.item_code} × {num(d.quantity)} para {data(d.demand_date)}</Selo>)}
          </div></div>
      )}
      {cadeia.parents.length > 0 && (
        <div style={{ marginBottom: 10 }}><div className="vpl-kv-label" style={{ marginBottom: 6 }}>Esta ordem fabrica componente para</div>
          <table className="erp-grid"><thead><tr><th>Ordem</th><th>Item</th><th className="num">Entregue / planejado</th><th>Situação</th></tr></thead>
            <tbody>{cadeia.parents.map((o) => linha(o, false))}</tbody></table></div>
      )}
      {cadeia.children.length > 0 && (
        <div><div className="vpl-kv-label" style={{ marginBottom: 6 }}>Componentes fabricados para esta ordem</div>
          <table className="erp-grid"><thead><tr><th>Ordem</th><th>Componente</th><th className="num">Entregue / planejado</th>
            <th className="num" title="Peça pronta guardada para esta ordem">Reservado para esta OF</th><th>Situação</th></tr></thead>
            <tbody>{cadeia.children.map((o) => linha(o, true))}</tbody></table></div>
      )}
    </Painel>
  );
}

// ── Formulários compartilhados com a Execução e os Materiais ──────────────────

export type ApontamentoForm = AppointmentDTO;
/** Entrega ao estoque. `final` conclui a ordem; sem ele a entrega é parcial. */
export type EntregaForm = { deposito?: number; lote: string; quantidade: string; final: boolean; series: string };
/** Perfil de pós-venda do item da OF: série obrigatória na entrega. */
export type SerieDaOF = { controla: boolean; mascara: boolean };
export type ConsumoForm = ConsumptionDTO;

// ── Etapas do roteiro e leitura por código de barras ─────────────────────────

export type LeituraForm = { token: string; action: ProductionScanAction; device_id: string; employee_id: string; good_quantity: string; scrap_quantity: string; hours: string; scrap_reason: string; complete_operation: boolean };

// ── Materiais ─────────────────────────────────────────────────────────────────

export type MaterialForm = { item_code: string; quantity: string; warehouse_id?: number; automatic_issue: boolean; substituted_item_code: string };


// ── Custo ─────────────────────────────────────────────────────────────────────

function corDoDesvio(desvio: number): string {
  if (Math.abs(desvio) < 0.005) return "inherit";
  return desvio > 0 ? "var(--v-err)" : "var(--v-ok)";
}
/** Um número sozinho não diz se é bom ou ruim; a faixa de 2% evita alarme por arredondamento. */
function leituraDoDesvio(desvio: number, padrao: number, rotulo = ""): string {
  if (padrao === 0) return desvio === 0 ? "—" : "sem padrão para comparar";
  // Real zero com padrão não é economia: é o que não foi lançado na ordem.
  if (desvio === -padrao) {
    if (rotulo === "Material") return "nada baixado — registre o consumo";
    if (rotulo === "Máquina e preparação" || rotulo === "Mão de obra") return "sem horas apontadas ou sem taxa do centro (VCUS0100)";
    if (rotulo === "Serviços de terceiros") return "nada recebido do terceiro";
    if (rotulo === "Total") return "nada lançado na ordem";
  }
  const pct = (desvio / padrao) * 100;
  if (Math.abs(pct) < 2) return "dentro do padrão";
  const p = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return pct > 0 ? `estourou ${p(pct)}%` : `economizou ${p(Math.abs(pct))}%`;
}

export function CustoTab({ custo, busy, onReapurarTodas }: { custo: CostDTO | null; busy: boolean; onReapurarTodas?: () => void }): JSX.Element {
  if (!custo) {
    return <Painel titulo="Custo da ordem"><Vazio titulo="Ainda sem custo"
      texto="O custo real é calculado sozinho a cada apontamento, consumo, entrega e devolução de sucata: soma o material que saiu para a ordem, as horas apontadas nas etapas (× taxas de máquina e de mão de obra do centro, VCUS0100), o serviço de terceiros recebido e os indiretos, e compara com o custo padrão do item. Esta ordem ainda não teve movimento." /></Painel>;
  }
  const linhas = [
    { rotulo: "Material", real: custo.material_cost_real ?? 0, padrao: custo.material_cost_std ?? 0 },
    { rotulo: "Máquina e preparação", real: custo.machine_cost_real ?? 0, padrao: custo.machine_cost_std ?? 0 },
    { rotulo: "Mão de obra", real: custo.labor_cost_real ?? 0, padrao: custo.labor_cost_std ?? 0 },
    { rotulo: "Serviços de terceiros", real: custo.subcontract_cost_real ?? 0, padrao: custo.subcontract_cost_std ?? 0 },
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
    <Painel titulo="Real × padrão" sub={custo.settled_at ? `atualizado em ${dataHora(custo.settled_at)} — sozinho, a cada movimento da ordem` : undefined}
      acoes={onReapurarTodas && <button className="erp-btn erp-btn-sm erp-btn-ghost" onClick={onReapurarTodas} disabled={busy} title="Refaz pela regra atual (máquina, mão de obra, terceiros e indiretos) o custo de todas as OFs já apuradas da empresa — para depois de mudar taxa de centro ou custo padrão">Reapurar todas as OFs</button>} flush>
      <table className="erp-grid">
        <thead><tr><th>Componente</th><th className="num">Real</th><th className="num">Padrão</th><th className="num">Desvio</th><th>Leitura</th></tr></thead>
        <tbody>{[...linhas, total].map((l) => {
          const desvio = l.real - l.padrao;
          return (
            <tr key={l.rotulo} className={l.rotulo === "Total" ? "erp-row-sel" : undefined}>
              <td style={{ fontWeight: l.rotulo === "Total" ? 700 : 400 }}>{l.rotulo}</td>
              <td className="num">{money(l.real)}</td><td className="num">{money(l.padrao)}</td>
              <td className="num" style={{ color: corDoDesvio(desvio), fontWeight: 600 }}>{desvio > 0 ? "+" : ""}{money(desvio)}</td>
              <td>{leituraDoDesvio(desvio, l.padrao, l.rotulo)}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </Painel>
    <p className="erp-note">O desvio por componente diz onde procurar: material aponta para consumo acima da estrutura ou preço de compra; máquina e mão de obra, para tempo além do roteiro ou taxa do centro (VCUS0100); terceiros, para preço ou quantidade do serviço; indiretos, para o rateio do centro. É o custo unitário real que alimenta o custo médio do estoque na entrada do acabado.</p>
  </>);
}
