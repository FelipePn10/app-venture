import { useCallback, useEffect, useState } from "react";
import {
  getRecurringParameters, upsertRecurringParameters,
  listAdjustmentDates, createAdjustmentDate, calculateAdjustment,
} from "@/services/recurringSalesService";
import { errMessage, parseBool, parseNum, parseStr, unwrapObject, type Obj } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers, loadEstablishments, loadItems, loadRepresentatives, loadSalesPlans } from "@/services/lookups";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";

/**
 * Parâmetros e reajustes da venda recorrente.
 *
 * O contrato recorrente vive de três decisões que ninguém toma pedido a pedido:
 * até que dia do mês o faturamento ainda cai na competência corrente, em que dia
 * a entrega é programada, e quando o preço é reajustado. Tudo isso já existia no
 * backend — parâmetros por empresa, datas de reajuste por cliente e o cálculo do
 * reajuste com base legal — mas não tinha tela: o contrato ficava preso ao que
 * fosse gravado no banco na mão.
 *
 * É o equivalente do FPDV0400/FPDV0402 do FoccoERP e do contrato de faturamento
 * periódico do SAP (billing plan), trazido para uma tela só.
 */
type Props = { enterpriseCode: number; onClose: () => void; aviso: (tipo: "success" | "error", msg: string) => void };
type Aba = "parametros" | "datas" | "reajuste";

const hoje = () => new Date().toISOString().slice(0, 10);
const dinheiro = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Índices de reajuste que o mercado brasileiro usa em contrato. */
const INDICES = ["IPCA", "IGPM", "INPC", "IGP-DI", "SELIC", "LIVRE"] as const;

const PARAMETROS_INICIAIS = {
  current_month_billing_limit_day: "20",
  indefinite_delivery_day: "1",
  fixed_term_delivery_day: "1",
  group_order_item_total: false,
  consider_discounts_additions: true,
  generic_representative_code: "",
  generic_sales_plan_code: "",
};

export function RecorrenciaParametrosPanel({ enterpriseCode, onClose, aviso }: Props): JSX.Element {
  const [aba, setAba] = useState<Aba>("parametros");
  const [param, setParam] = useState({ ...PARAMETROS_INICIAIS });
  const [datas, setDatas] = useState<Obj[]>([]);
  const [filtroCliente, setFiltroCliente] = useState<number | undefined>(undefined);
  const [novaData, setNovaData] = useState({ customer_code: "", establishment_code: "", adjustment_date: hoje(), notes: "" });
  const [reajuste, setReajuste] = useState({
    customer_code: "", establishment_code: "", item_code: "",
    adjustment_date: hoje(), adjustment_percent: "0", adjustment_index: "IPCA",
    legal_basis: "", reason: "", confirm: false,
  });
  const [previa, setPrevia] = useState<Obj | null>(null);
  const [busy, setBusy] = useState(false);

  useEscapeToClose(onClose);

  const executar = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }, [aviso]);

  const carregarParametros = useCallback(() => executar(async () => {
    const o = await getRecurringParameters(enterpriseCode);
    if (!o || Object.keys(o).length === 0) return;
    setParam({
      current_month_billing_limit_day: String(parseNum(o, "current_month_billing_limit_day", "CurrentMonthBillingLimitDay") || 20),
      indefinite_delivery_day: String(parseNum(o, "indefinite_delivery_day", "IndefiniteDeliveryDay") || 1),
      fixed_term_delivery_day: String(parseNum(o, "fixed_term_delivery_day", "FixedTermDeliveryDay") || 1),
      group_order_item_total: parseBool(o, "group_order_item_total", "GroupOrderItemTotal") ?? false,
      consider_discounts_additions: parseBool(o, "consider_discounts_additions", "ConsiderDiscountsAdditions") ?? true,
      generic_representative_code: String(parseNum(o, "generic_representative_code", "GenericRepresentativeCode") || ""),
      generic_sales_plan_code: String(parseNum(o, "generic_sales_plan_code", "GenericSalesPlanCode") || ""),
    });
  }), [executar, enterpriseCode]);

  const carregarDatas = useCallback(() => executar(async () => {
    setDatas(await listAdjustmentDates(filtroCliente ? { customer_code: filtroCliente } : {}));
  }), [executar, filtroCliente]);

  useEffect(() => { void carregarParametros(); }, [carregarParametros]);
  useEffect(() => { if (aba === "datas") void carregarDatas(); }, [aba, carregarDatas]);

  function gravarParametros() {
    const dia = Number(param.current_month_billing_limit_day);
    if (!(dia >= 1 && dia <= 31)) { aviso("error", "O dia limite de faturamento deve estar entre 1 e 31."); return; }
    void executar(async () => {
      await upsertRecurringParameters({
        enterprise_code: enterpriseCode,
        current_month_billing_limit_day: dia,
        indefinite_delivery_day: Number(param.indefinite_delivery_day) || 1,
        fixed_term_delivery_day: Number(param.fixed_term_delivery_day) || 1,
        group_order_item_total: param.group_order_item_total,
        consider_discounts_additions: param.consider_discounts_additions,
        generic_representative_code: param.generic_representative_code ? Number(param.generic_representative_code) : null,
        generic_sales_plan_code: param.generic_sales_plan_code ? Number(param.generic_sales_plan_code) : null,
      });
      aviso("success", "Parâmetros da recorrência gravados.");
    });
  }

  function gravarData() {
    if (!novaData.customer_code) { aviso("error", "Escolha o cliente."); return; }
    if (!novaData.adjustment_date) { aviso("error", "Informe a data de reajuste."); return; }
    void executar(async () => {
      await createAdjustmentDate({
        enterprise_code: enterpriseCode,
        customer_code: Number(novaData.customer_code),
        establishment_code: novaData.establishment_code ? Number(novaData.establishment_code) : null,
        adjustment_date: novaData.adjustment_date,
        notes: novaData.notes.trim() || null,
      });
      setNovaData({ customer_code: "", establishment_code: "", adjustment_date: hoje(), notes: "" });
      aviso("success", "Data de reajuste cadastrada.");
      await carregarDatas();
    });
  }

  /**
   * Simular não grava: o backend devolve o que aconteceria com cada contrato.
   * Confirmar aplica. É a mesma separação que o financeiro espera antes de mexer
   * no preço de um contrato assinado.
   */
  function rodarReajuste(confirmar: boolean) {
    if (!reajuste.reason.trim()) { aviso("error", "Informe o motivo do reajuste — ele fica registrado no contrato."); return; }
    void executar(async () => {
      const resultado = await calculateAdjustment({
        enterprise_code: enterpriseCode,
        customer_code: reajuste.customer_code ? Number(reajuste.customer_code) : null,
        establishment_code: reajuste.establishment_code ? Number(reajuste.establishment_code) : null,
        item_code: reajuste.item_code ? Number(reajuste.item_code) : null,
        adjustment_date: reajuste.adjustment_date,
        adjustment_percent: Number(reajuste.adjustment_percent) || 0,
        adjustment_index: reajuste.adjustment_index === "LIVRE" ? "" : reajuste.adjustment_index,
        legal_basis: reajuste.legal_basis.trim(),
        reason: reajuste.reason.trim(),
        confirm: confirmar,
      });
      setPrevia(unwrapObject(resultado));
      aviso("success", confirmar ? "Reajuste aplicado aos contratos." : "Simulação concluída — nada foi gravado.");
    });
  }

  const afetados = previa ? parseNum(previa, "affected", "Affected", "total", "Total") : 0;
  const valorAntes = previa ? parseNum(previa, "previous_total", "PreviousTotal") : 0;
  const valorDepois = previa ? parseNum(previa, "new_total", "NewTotal") : 0;

  return (
    <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-label="Parâmetros e reajustes da recorrência">
      <div className="erp-modal erp-modal-lg">
        <div className="erp-modal-head">
          <span>Parâmetros e reajustes da venda recorrente</span>
          <button className="erp-btn erp-btn-sm" onClick={onClose}>Fechar</button>
        </div>

        <div className="erp-tabs">
          <button className={`erp-tab ${aba === "parametros" ? "active" : ""}`} onClick={() => setAba("parametros")}>Parâmetros</button>
          <button className={`erp-tab ${aba === "datas" ? "active" : ""}`} onClick={() => setAba("datas")}>Datas de reajuste</button>
          <button className={`erp-tab ${aba === "reajuste" ? "active" : ""}`} onClick={() => setAba("reajuste")}>Aplicar reajuste</button>
        </div>

        <div className="erp-modal-body">
          {aba === "parametros" && (
            <div className="erp-fieldset"><div className="erp-fieldset-body">
              <div className="erp-field erp-c12">
                <p className="erp-note">
                  Estes parâmetros valem para toda a empresa e decidem o que o robô da recorrência
                  faz sozinho todo mês: até que dia o faturamento ainda cai na competência corrente
                  e em que dia a entrega é programada.
                </p>
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label erp-req">Dia limite de faturamento</label>
                <input className="erp-input num" type="number" min="1" max="31" value={param.current_month_billing_limit_day}
                  onChange={(e) => setParam((p) => ({ ...p, current_month_billing_limit_day: e.target.value }))} />
                <span className="erp-hint">Depois desse dia, o pedido gerado passa para a competência seguinte.</span>
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Dia de entrega — prazo indeterminado</label>
                <input className="erp-input num" type="number" min="1" max="31" value={param.indefinite_delivery_day}
                  onChange={(e) => setParam((p) => ({ ...p, indefinite_delivery_day: e.target.value }))} />
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Dia de entrega — prazo determinado</label>
                <input className="erp-input num" type="number" min="1" max="31" value={param.fixed_term_delivery_day}
                  onChange={(e) => setParam((p) => ({ ...p, fixed_term_delivery_day: e.target.value }))} />
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Representante genérico</label>
                <LookupField value={Number(param.generic_representative_code) || undefined}
                  onChange={(c) => setParam((p) => ({ ...p, generic_representative_code: c ? String(c) : "" }))}
                  loader={loadRepresentatives} entityLabel="representante" placeholder="Quando o contrato não tem um" clearable />
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Plano de venda genérico</label>
                <LookupField value={Number(param.generic_sales_plan_code) || undefined}
                  onChange={(c) => setParam((p) => ({ ...p, generic_sales_plan_code: c ? String(c) : "" }))}
                  loader={loadSalesPlans} entityLabel="plano de venda" placeholder="Quando o contrato não tem um" clearable />
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-check">
                  <input type="checkbox" checked={param.group_order_item_total}
                    onChange={(e) => setParam((p) => ({ ...p, group_order_item_total: e.target.checked }))} />
                  Agrupar o total por item no pedido
                </label>
                <span className="erp-hint">Junta as linhas do mesmo item num total só, em vez de uma linha por contrato.</span>
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-check">
                  <input type="checkbox" checked={param.consider_discounts_additions}
                    onChange={(e) => setParam((p) => ({ ...p, consider_discounts_additions: e.target.checked }))} />
                  Considerar descontos e acréscimos
                </label>
              </div>
              <div className="erp-field erp-c12">
                <button className="erp-btn erp-btn-primary" onClick={gravarParametros} disabled={busy}>Gravar parâmetros</button>
              </div>
            </div></div>
          )}

          {aba === "datas" && (
            <>
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Nova data de reajuste</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12">
                    <p className="erp-note">
                      A data de reajuste é o aniversário do contrato daquele cliente. É por ela que o
                      sistema sabe quais contratos entram na próxima rodada de reajuste.
                    </p>
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label erp-req">Cliente</label>
                    <LookupField value={Number(novaData.customer_code) || undefined}
                      onChange={(c) => setNovaData((p) => ({ ...p, customer_code: c ? String(c) : "" }))}
                      loader={loadCustomers} entityLabel="cliente" placeholder="Escolher cliente" clearable />
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label">Estabelecimento</label>
                    <LookupField value={Number(novaData.establishment_code) || undefined}
                      onChange={(c) => setNovaData((p) => ({ ...p, establishment_code: c ? String(c) : "" }))}
                      loader={loadEstablishments} entityLabel="estabelecimento" placeholder="Todos" clearable />
                  </div>
                  <div className="erp-field erp-c2">
                    <label className="erp-label erp-req">Data</label>
                    <input className="erp-input" type="date" value={novaData.adjustment_date}
                      onChange={(e) => setNovaData((p) => ({ ...p, adjustment_date: e.target.value }))} />
                  </div>
                  <div className="erp-field erp-c2">
                    <label className="erp-label">Observação</label>
                    <input className="erp-input" value={novaData.notes}
                      onChange={(e) => setNovaData((p) => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                    <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={gravarData} disabled={busy}>+ Data</button>
                  </div>
                </div>
              </div>

              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Datas cadastradas ({datas.length})</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c4">
                    <label className="erp-label">Filtrar por cliente</label>
                    <LookupField value={filtroCliente}
                      onChange={(c) => setFiltroCliente(c ? Number(c) : undefined)}
                      loader={loadCustomers} entityLabel="cliente" placeholder="Todos" clearable />
                  </div>
                  <div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th>Cliente</th><th>Estabelecimento</th><th>Data</th><th>Observação</th></tr></thead>
                      <tbody>
                        {datas.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma data de reajuste cadastrada.</td></tr>}
                        {datas.map((d, i) => (
                          <tr key={i}>
                            <td>{parseNum(d, "customer_code", "CustomerCode") || "—"}</td>
                            <td>{parseNum(d, "establishment_code", "EstablishmentCode") || "Todos"}</td>
                            <td>{(parseStr(d, "adjustment_date", "AdjustmentDate") || "").slice(0, 10) || "—"}</td>
                            <td>{parseStr(d, "notes", "Notes") || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {aba === "reajuste" && (
            <div className="erp-fieldset"><div className="erp-fieldset-body">
              <div className="erp-field erp-c12">
                <p className="erp-note">
                  O reajuste alcança todos os contratos que casam com o filtro. <strong>Simular</strong> não
                  grava nada — mostra quantos contratos entram e quanto o faturamento passa a ser.
                  Só <strong>Aplicar</strong> mexe no preço.
                </p>
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Cliente</label>
                <LookupField value={Number(reajuste.customer_code) || undefined}
                  onChange={(c) => setReajuste((p) => ({ ...p, customer_code: c ? String(c) : "" }))}
                  loader={loadCustomers} entityLabel="cliente" placeholder="Todos" clearable />
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Estabelecimento</label>
                <LookupField value={Number(reajuste.establishment_code) || undefined}
                  onChange={(c) => setReajuste((p) => ({ ...p, establishment_code: c ? String(c) : "" }))}
                  loader={loadEstablishments} entityLabel="estabelecimento" placeholder="Todos" clearable />
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Item</label>
                <LookupField value={Number(reajuste.item_code) || undefined}
                  onChange={(c) => setReajuste((p) => ({ ...p, item_code: c ? String(c) : "" }))}
                  loader={loadItems} entityLabel="item" placeholder="Todos" clearable />
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label erp-req">Data do reajuste</label>
                <input className="erp-input" type="date" value={reajuste.adjustment_date}
                  onChange={(e) => setReajuste((p) => ({ ...p, adjustment_date: e.target.value }))} />
              </div>
              <div className="erp-field erp-c2">
                <label className="erp-label erp-req">Percentual</label>
                <input className="erp-input num" type="number" step="0.01" value={reajuste.adjustment_percent}
                  onChange={(e) => setReajuste((p) => ({ ...p, adjustment_percent: e.target.value }))} />
              </div>
              <div className="erp-field erp-c2">
                <label className="erp-label">Índice</label>
                <select className="erp-input" value={reajuste.adjustment_index}
                  onChange={(e) => setReajuste((p) => ({ ...p, adjustment_index: e.target.value }))}>
                  {INDICES.map((i) => <option key={i} value={i}>{i === "LIVRE" ? "Livre (sem índice)" : i}</option>)}
                </select>
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-label">Base legal</label>
                <input className="erp-input" value={reajuste.legal_basis}
                  placeholder="Cláusula do contrato que autoriza o reajuste"
                  onChange={(e) => setReajuste((p) => ({ ...p, legal_basis: e.target.value }))} />
                <span className="erp-hint">Fica registrada no histórico do contrato — é o que o cliente pede quando questiona o aumento.</span>
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-label erp-req">Motivo</label>
                <input className="erp-input" value={reajuste.reason}
                  onChange={(e) => setReajuste((p) => ({ ...p, reason: e.target.value }))} />
              </div>
              <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                <button className="erp-btn" onClick={() => rodarReajuste(false)} disabled={busy}>Simular</button>
                <button className="erp-btn erp-btn-primary" onClick={() => rodarReajuste(true)} disabled={busy}>Aplicar reajuste</button>
              </div>

              {previa && (
                <div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead><tr><th>Contratos alcançados</th><th className="num">Faturamento hoje</th><th className="num">Depois do reajuste</th><th className="num">Diferença</th></tr></thead>
                    <tbody>
                      <tr>
                        <td>{afetados}</td>
                        <td className="num">R$ {dinheiro(valorAntes)}</td>
                        <td className="num">R$ {dinheiro(valorDepois)}</td>
                        <td className="num">R$ {dinheiro(valorDepois - valorAntes)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div></div>
          )}
        </div>
      </div>
    </div>
  );
}
