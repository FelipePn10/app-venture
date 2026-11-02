import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type HorasDTO, linkHoursSalesOrder, listBeneficiamentoHours } from "@/services/customerMaterialService";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers, loadSalesOrders } from "@/services/lookups";
import { hojeLocal } from "@/utils/dataLocal";
import { Aviso, Cabecalho, Kpis, Painel, Rodape, Selo, Vazio } from "../planejamento/planUi";
import { data, num, situacaoOF } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";
import { n, pedidosDoCliente } from "./benefFormat";

/**
 * VBEN0300 — Horas de beneficiamento.
 *
 * No beneficiamento a produção não consome estoque próprio: o material é do
 * cliente e o que a empresa vende é o TRABALHO. Por isso o relatório da produção
 * é de horas, por OF de beneficiamento (a OF do item que tem, na estrutura,
 * componente fornecido pelo cliente), com o cliente e o pedido que a originaram.
 *
 * Duas fontes lado a lado: os apontamentos (início e fim — a base do custo real
 * da OF) e o lançado nas operações do roteiro. Quando as duas divergem, alguém
 * apontou num lugar e não no outro.
 */

function inicioDoMes(): string {
  return `${hojeLocal().slice(0, 7)}-01`;
}

export function Vben0300Page(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [vincular, setVincular] = useState<{ of: HorasDTO; pedido?: number } | null>(null);
  const [cliente, setCliente] = useState<number | undefined>();
  const [pedido, setPedido] = useState<number | undefined>();
  const [periodo, setPeriodo] = useState({ de: inicioDoMes(), ate: hojeLocal() });
  const [linhas, setLinhas] = useState<HorasDTO[] | null>(null);

  // Com cliente escolhido, a busca de pedido mostra só os dele.
  const pedidosLoader = useMemo(() => (cliente ? pedidosDoCliente(cliente) : loadSalesOrders), [cliente]);

  // A resposta atrasada de uma consulta anterior não pode trocar a tela pelo
  // resultado de outro cliente.
  const ultimaConsulta = useRef(0);
  const consultar = useCallback(async () => {
    const estaConsulta = ++ultimaConsulta.current;
    const resposta = await listBeneficiamentoHours({
      customer_code: cliente, sales_order_code: pedido, from: periodo.de || undefined, to: periodo.ate || undefined,
    });
    if (estaConsulta === ultimaConsulta.current) setLinhas(resposta);
  }, [cliente, pedido, periodo]);

  // A troca de cliente ou pedido refaz a consulta; a data, não — ela espera o
  // Consultar, para não consultar a cada dígito digitado.
  useEffect(() => {
    void run(consultar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente, pedido]);

  const confirmarVinculo = () => {
    if (!vincular?.pedido) return;
    const { of, pedido } = vincular;
    void run(async () => {
      await linkHoursSalesOrder(of.production_order_id, pedido);
      setVincular(null);
      await consultar();
      setFeedback({ type: "success", message: `Pedido ligado à OF ${of.order_number}.` });
    });
  };

  const totais = useMemo(() => {
    const l = linhas ?? [];
    return {
      ofs: l.length,
      apontadas: l.reduce((s, h) => s + n(h.appointed_hours), 0),
      operacao: l.reduce((s, h) => s + n(h.operation_hours), 0),
      apontamentos: l.reduce((s, h) => s + h.appointments, 0),
      clientes: new Set(l.flatMap((h) => (h.customer_code ? [h.customer_code] : []))).size,
      semCliente: l.filter((h) => !h.customer_code).length,
    };
  }, [linhas]);

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Almoxarifado" titulo="Horas de Beneficiamento" codigo="VBEN0300" />

      <div className="erp-toolbar vpl-toolbar">
        <div className="erp-tgroup"><button className="erp-btn erp-btn-primary" onClick={() => void run(consultar)} disabled={busy}>Consultar</button></div>
        <div className="erp-tgroup" style={{ minWidth: 260 }}><span className="erp-tgroup-label">Cliente</span>
          <div style={{ flex: 1 }}><LookupField value={cliente} loader={loadCustomers} entityLabel="cliente" placeholder="Todos" clearable
            onChange={(c) => { setCliente(c ? Number(c) : undefined); setPedido(undefined); }} /></div></div>
        <div className="erp-tgroup" style={{ minWidth: 220 }}><span className="erp-tgroup-label">Pedido</span>
          <div style={{ flex: 1 }}><LookupField key={cliente ?? 0} value={pedido} loader={pedidosLoader} entityLabel="pedido" placeholder="Todos" clearable
            onChange={(c) => setPedido(c ? Number(c) : undefined)} /></div></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">De</span>
          <input className="erp-input" type="date" aria-label="De" value={periodo.de} onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))} /></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Até</span>
          <input className="erp-input" type="date" aria-label="Até" value={periodo.ate} onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))} /></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VBEN0300 — Horas de Beneficiamento" filename="vben0300" build={() => ({
          columns: ["OF", "Situação", "Item", "Cliente", "Pedido", "Planejada", "Produzida", "Horas apontadas", "Apontamentos", "Horas nas operações", "Primeiro registro", "Último registro"],
          rows: (linhas ?? []).map((h) => [String(h.order_number), situacaoOF(h.status).rotulo, `${h.item_business_code} ${h.item_description}`,
            h.customer_name || (h.customer_code ? String(h.customer_code) : "—"), h.sales_order_number ? String(h.sales_order_number) : "—",
            num(n(h.planned_qty), 4), num(n(h.produced_qty), 4), num(n(h.appointed_hours), 2), String(h.appointments), num(n(h.operation_hours), 2),
            data(h.first_record), data(h.last_record)]),
        })} /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            <Aviso feedback={feedback} busy={busy} />
            <Kpis itens={[
              { label: "OFs de beneficiamento", value: num(totais.ofs, 0), hint: `${totais.clientes} cliente(s)`, tom: "info" },
              { label: "Horas apontadas", value: `${num(totais.apontadas, 2)} h`, hint: `${totais.apontamentos} apontamento(s)` },
              { label: "Horas nas operações", value: `${num(totais.operacao, 2)} h`, hint: "lançadas no roteiro" },
              { label: "Sem cliente", value: num(totais.semCliente, 0), hint: "vincule o pedido na linha", tom: totais.semCliente ? "warn" : "ok" },
            ]} />
            <p className="erp-note">Entra a OF do item que tem, na estrutura, componente <strong>fornecido pelo cliente</strong>, com hora registrada no período. O cliente e o pedido vêm do pedido de venda que originou a OF; na OF aberta à mão, use <strong>Vincular pedido</strong> na linha.</p>
            {linhas === null ? <Vazio titulo="Carregando…" />
              : linhas.length === 0 ? <Vazio titulo="Nenhuma hora de beneficiamento no período" texto="Ajuste o período ou o cliente. Confira se o componente do cliente está marcado como fornecido pelo cliente na estrutura do produto." />
                : (
                  <Painel titulo="Horas por ordem de fabricação" flush>
                    <table className="erp-grid">
                      <thead><tr><th>OF</th><th>Situação</th><th>Item</th><th>Cliente</th><th>Pedido</th><th className="num">Planejada</th><th className="num">Produzida</th>
                        <th className="num">Horas apontadas</th><th className="num">Apont.</th><th className="num">Horas nas operações</th><th>Período</th></tr></thead>
                      <tbody>{linhas.map((h) => {
                        const s = situacaoOF(h.status);
                        const diverge = n(h.operation_hours) > 0 && n(h.appointed_hours) > 0 && Math.abs(n(h.operation_hours) - n(h.appointed_hours)) > 0.01;
                        return (
                          <tr key={h.production_order_id}>
                            <td>OF {h.order_number}</td><td><Selo tom={s.tom}>{s.rotulo}</Selo></td>
                            <td>{h.item_business_code} — {h.item_description}</td>
                            <td>{h.customer_name || (h.customer_code ? `Cliente ${h.customer_code}` : <span className="erp-text-muted">sem pedido</span>)}</td>
                            <td>{h.sales_order_number ?? <button className="erp-btn erp-btn-sm" onClick={() => { setFeedback(null); setVincular({ of: h }); }} disabled={busy}>Vincular pedido</button>}</td>
                            <td className="num">{num(n(h.planned_qty), 4)}</td><td className="num">{num(n(h.produced_qty), 4)}</td>
                            <td className="num"><strong>{num(n(h.appointed_hours), 2)}</strong></td><td className="num">{h.appointments}</td>
                            <td className={`num${diverge ? " erp-cell-warn" : ""}`} title={diverge ? "Diferente das horas apontadas" : undefined}>{num(n(h.operation_hours), 2)}</td>
                            <td>{data(h.first_record)}{h.last_record && data(h.last_record) !== data(h.first_record) ? ` a ${data(h.last_record)}` : ""}</td>
                          </tr>
                        );
                      })}</tbody>
                      <tfoot><tr>
                        <td colSpan={7}>Total</td>
                        <td className="num">{num(totais.apontadas, 2)}</td><td className="num">{totais.apontamentos}</td><td className="num">{num(totais.operacao, 2)}</td><td></td>
                      </tr></tfoot>
                    </table>
                  </Painel>
                )}
          </div>
        </section>
      </div>

      {vincular && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ben-of-pedido" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setVincular(null); }}>
          <div className="erp-modal" style={{ width: "min(560px, 94vw)" }}>
            <div className="erp-modal-head"><div><strong id="ben-of-pedido">Pedido da OF {vincular.of.order_number}</strong>
              <div className="erp-field-hint">Liga a ordem aberta à mão ao pedido de venda, para as horas aparecerem no cliente certo.</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setVincular(null)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              <Aviso feedback={feedback} busy={busy} />
              <div className="erp-field erp-c12"><label className="erp-label erp-req">Pedido de venda</label>
                <LookupField value={vincular.pedido} loader={loadSalesOrders} entityLabel="pedido" clearable
                  onChange={(c) => setVincular((v) => (v ? { ...v, pedido: c ? Number(c) : undefined } : v))} /></div>
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setVincular(null)} disabled={busy}>Cancelar</button>
              <button className="erp-btn erp-btn-primary" onClick={confirmarVinculo} disabled={busy || !vincular.pedido}>{busy && <span className="erp-spin" />}Vincular</button>
            </div>
          </div>
        </div>
      )}

      <Rodape>
        <div className="erp-status-item">OFs: <strong>{totais.ofs}</strong></div>
        <div className="erp-status-item">Horas apontadas: <strong>{num(totais.apontadas, 2)}</strong></div>
      </Rodape>
    </div>
  );
}
