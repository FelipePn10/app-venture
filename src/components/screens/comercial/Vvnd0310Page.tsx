import { useState, useEffect, useCallback } from "react";
import {
  type SalesQuotationParametersDTO,
  type CommissionPatternDTO,
  type CancellationReasonDTO,
  getSalesQuotationParameters,
  saveSalesQuotationParameters,
  resetSalesQuotationParameters,
  listCommissionPatterns,
  saveCommissionPattern,
  setCommissionPatternStatus,
  listCancellationReasons,
  saveCancellationReason,
  setCancellationReasonStatus,
} from "@/services/salesQuotationService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers } from "@/services/lookups";
import { useAuthStore } from "@/store/authStore";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "parametros" | "comissao" | "motivos";

const EMPTY_PARAMS: SalesQuotationParametersDTO = {
  purchase_order_prompt: "Ordem de Compra",
  delivery_authorization_prompt: "Autorização de Entr.",
  allow_service_items_nfce: false,
  default_nfce: false,
  minimum_cif_freight: 0,
  add_redelivery_to_freight: false,
};
const EMPTY_PATTERN: CommissionPatternDTO = { code: 0, description: "", commission_pct: 0, invoice_pct: 0, payment_pct: 0 };
const EMPTY_REASON: CancellationReasonDTO = { code: 0, description: "", allow_uncancel: false, require_complement: false };

const pct = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * VVND0310 — Parâmetros de Orçamento.
 *
 * Cadastros de apoio do orçamento de venda (VVND0300), por empresa:
 * rótulos dos campos comerciais, cliente consumidor final, padrão NFC-e, regras
 * de frete CIF/redespacho, padrões de comissão e motivos de cancelamento.
 * Consulta é liberada a ADMIN/USER; gravação é restrita a ADMIN no backend.
 */
export function Vvnd0310Page(): JSX.Element {
  const isAdmin = useAuthStore((state) => state.user?.role?.toUpperCase() === "ADMIN");

  const [tab, setTab] = useState<Tab>("parametros");
  const [params, setParams] = useState<SalesQuotationParametersDTO>(EMPTY_PARAMS);
  const [patterns, setPatterns] = useState<CommissionPatternDTO[]>([]);
  const [reasons, setReasons] = useState<CancellationReasonDTO[]>([]);
  const [pattern, setPattern] = useState<CommissionPatternDTO>(EMPTY_PATTERN);
  const [reason, setReason] = useState<CancellationReasonDTO>(EMPTY_REASON);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const reload = useCallback(() => run(async () => {
    const [p, cp, cr] = await Promise.allSettled([getSalesQuotationParameters(), listCommissionPatterns(), listCancellationReasons()]);
    if (p.status === "fulfilled") setParams({ ...EMPTY_PARAMS, ...p.value });
    if (cp.status === "fulfilled") setPatterns(cp.value);
    if (cr.status === "fulfilled") setReasons(cr.value);
    const failed = [p, cp, cr].filter((result) => result.status === "rejected").length;
    if (failed) setFeedback({ type: "error", message: `${failed} consulta(s) não puderam ser carregadas. Os dados disponíveis continuam visíveis.` });
  }), [run]);
  useEffect(() => { void reload(); }, [reload]);

  const setP = <K extends keyof SalesQuotationParametersDTO>(k: K, v: SalesQuotationParametersDTO[K]) => setParams((prev) => ({ ...prev, [k]: v }));
  const setPat = <K extends keyof CommissionPatternDTO>(k: K, v: CommissionPatternDTO[K]) => setPattern((prev) => ({ ...prev, [k]: v }));
  const setR = <K extends keyof CancellationReasonDTO>(k: K, v: CancellationReasonDTO[K]) => setReason((prev) => ({ ...prev, [k]: v }));

  const salvarParametros = () => run(async () => {
    if (!params.purchase_order_prompt.trim() || !params.delivery_authorization_prompt.trim()) {
      setFeedback({ type: "error", message: "Os dois rótulos de campo são obrigatórios." }); return;
    }
    if ((params.minimum_cif_freight ?? 0) < 0) { setFeedback({ type: "error", message: "O frete CIF mínimo não pode ser negativo." }); return; }
    setParams(await saveSalesQuotationParameters(params));
    setFeedback({ type: "success", message: "Parâmetros do orçamento gravados." });
  });

  const salvarPadrao = () => run(async () => {
    if ((pattern.code ?? 0) < 0) { setFeedback({ type: "error", message: "O código do padrão não pode ser negativo." }); return; }
    if (!pattern.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    // Mesma regra do backend: a divisão faturamento/pagamento precisa fechar o total.
    if (Math.abs((pattern.invoice_pct + pattern.payment_pct) - pattern.commission_pct) > 1e-9) {
      setFeedback({ type: "error", message: "Faturamento % + pagamento % precisa ser igual à comissão %." }); return;
    }
    // Código zerado faz o backend gerar o próximo da empresa.
    const saved = await saveCommissionPattern(pattern);
    setPatterns(await listCommissionPatterns());
    setPattern(EMPTY_PATTERN);
    setFeedback({ type: "success", message: `Padrão de comissão ${saved.code} gravado.` });
  });

  const restaurarParametros = () => run(async () => {
    if (!window.confirm("Restaurar os parâmetros padrão do sistema para esta empresa? As personalizações atuais serão removidas.")) return;
    setParams(await resetSalesQuotationParameters());
    setFeedback({ type: "success", message: "Parâmetros restaurados para os padrões do sistema." });
  });

  const alternarPadrao = (item: CommissionPatternDTO) => run(async () => {
    await setCommissionPatternStatus(item.code, !item.is_active);
    setPatterns(await listCommissionPatterns());
    setFeedback({ type: "success", message: `Padrão ${item.code} ${item.is_active ? "desativado" : "reativado"}.` });
  });

  const alternarMotivo = (item: CancellationReasonDTO) => run(async () => {
    await setCancellationReasonStatus(item.code, !item.is_active);
    setReasons(await listCancellationReasons());
    setFeedback({ type: "success", message: `Motivo ${item.code} ${item.is_active ? "desativado" : "reativado"}.` });
  });

  const salvarMotivo = () => run(async () => {
    if ((reason.code ?? 0) <= 0 || !reason.description.trim()) { setFeedback({ type: "error", message: "Informe um código maior que zero e a descrição." }); return; }
    await saveCancellationReason(reason);
    setReasons(await listCancellationReasons());
    setReason(EMPTY_REASON);
    setFeedback({ type: "success", message: `Motivo ${reason.code} gravado.` });
  });

  const adminHint = isAdmin ? undefined : "Somente administradores podem gravar os parâmetros do orçamento";

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Parâmetros de Orçamento</span>
          <span className="erp-crumb-code">VVND0310</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Cadastros de apoio do VVND0300</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className="erp-btn" onClick={reload} disabled={busy}>{busy && <span className="erp-spin" />}Recarregar</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Gravar</span>
          {tab === "parametros" && <><button className="erp-btn erp-btn-primary" onClick={salvarParametros} disabled={busy || !isAdmin} title={adminHint}>Salvar parâmetros</button><button className="erp-btn" onClick={restaurarParametros} disabled={busy || !isAdmin} title={adminHint}>Restaurar padrões</button></>}
          {tab === "comissao" && <button className="erp-btn erp-btn-primary" onClick={salvarPadrao} disabled={busy || !isAdmin} title={adminHint}>Gravar padrão</button>}
          {tab === "motivos" && <button className="erp-btn erp-btn-primary" onClick={salvarMotivo} disabled={busy || !isAdmin} title={adminHint}>Gravar motivo</button>}
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VVND0310 — Parâmetros de Orçamento" filename="vvnd0310" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        {!isAdmin && <div className="erp-feedback info">Perfil sem permissão de gravação — os cadastros aparecem somente para consulta.</div>}

        <div className="erp-main">
          <section className="erp-detail-panel" style={{ width: "100%", gridColumn: "1 / -1" }}>
            <div className="erp-tabs">
              <button className={`erp-tab${tab === "parametros" ? " active" : ""}`} onClick={() => setTab("parametros")}>Parâmetros</button>
              <button className={`erp-tab${tab === "comissao" ? " active" : ""}`} onClick={() => setTab("comissao")}>Padrões de comissão ({patterns.length})</button>
              <button className={`erp-tab${tab === "motivos" ? " active" : ""}`} onClick={() => setTab("motivos")}>Motivos de cancelamento ({reasons.length})</button>
            </div>
            <div className="erp-detail-body">

              {tab === "parametros" && (
                <>
                  <div className="erp-feedback info">Configuração carregada para a empresa <strong>{params.enterprise_code ?? "atual"}</strong>: consumidor final {params.final_consumer_customer_code ?? "não definido"}, NFC-e padrão {params.default_nfce ? "ativada" : "desativada"} e frete CIF mínimo de R$ {pct(params.minimum_cif_freight)}.</div>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Rótulos dos campos comerciais</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c6">
                        <label className="erp-label erp-req">Campo "ordem de compra"</label>
                        <input className="erp-input" value={params.purchase_order_prompt} disabled={!isAdmin} onChange={(e) => setP("purchase_order_prompt", e.target.value)} />
                        <span className="erp-field-hint">Rótulo exibido no orçamento (padrão: "Ordem de Compra").</span>
                      </div>
                      <div className="erp-field erp-c6">
                        <label className="erp-label erp-req">Campo "autorização de entrega"</label>
                        <input className="erp-input" value={params.delivery_authorization_prompt} disabled={!isAdmin} onChange={(e) => setP("delivery_authorization_prompt", e.target.value)} />
                        <span className="erp-field-hint">Rótulo exibido no orçamento (padrão: "Autorização de Entr.").</span>
                      </div>
                    </div>
                  </div>

                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">NFC-e e consumidor final</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4">
                        <label className="erp-label">Cliente consumidor final</label>
                        <LookupField value={params.final_consumer_customer_code} loader={loadCustomers} entityLabel="cliente" placeholder="Selecionar cliente" disabled={!isAdmin}
                          onChange={(code) => setP("final_consumer_customer_code", code ?? undefined)} />
                        <span className="erp-field-hint">Só nesse cliente o orçamento aceita documento estrangeiro e monta o endereço do consumidor.</span>
                      </div>
                      <div className="erp-field erp-c4">
                        <label className="erp-label">Padrão NFC-e</label>
                        <label className="erp-check"><input type="checkbox" checked={!!params.default_nfce} disabled={!isAdmin} onChange={(e) => setP("default_nfce", e.target.checked)} /><span>Novos orçamentos já nascem NFC-e</span></label>
                      </div>
                      <div className="erp-field erp-c4">
                        <label className="erp-label">Itens de serviço na NFC-e</label>
                        <label className="erp-check"><input type="checkbox" checked={!!params.allow_service_items_nfce} disabled={!isAdmin} onChange={(e) => setP("allow_service_items_nfce", e.target.checked)} /><span>Permitir (parâmetro 27)</span></label>
                        <span className="erp-field-hint">Mesmo permitido, o item de serviço em NFC-e ainda exige "entrega com recibo" no orçamento.</span>
                      </div>
                    </div>
                  </div>

                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Frete</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4">
                        <label className="erp-label">Frete CIF mínimo</label>
                        <input className="erp-input num" type="number" step="0.01" min={0} value={params.minimum_cif_freight ?? 0} disabled={!isAdmin} onChange={(e) => setP("minimum_cif_freight", Number(e.target.value))} />
                        <span className="erp-field-hint">Aplicado nos tipos CIF/DAF quando o orçamento marca "conferir frete".</span>
                      </div>
                      <div className="erp-field erp-c4">
                        <label className="erp-label">Redespacho</label>
                        <label className="erp-check"><input type="checkbox" checked={!!params.add_redelivery_to_freight} disabled={!isAdmin} onChange={(e) => setP("add_redelivery_to_freight", e.target.checked)} /><span>Somar redespacho ao frete</span></label>
                        <span className="erp-field-hint">Quando ligado, o valor de redespacho é somado ao frete e zerado na gravação.</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {tab === "comissao" && (
                <>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">{pattern.code ? `Padrão ${pattern.code}` : "Novo padrão de comissão"}</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c2"><label className="erp-label">Código</label><input className="erp-input num" type="number" min={0} placeholder="automático" value={pattern.code || ""} disabled={!isAdmin} onChange={(e) => setPat("code", Math.max(0, Number(e.target.value)))} /></div>
                      <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={pattern.description} disabled={!isAdmin} onChange={(e) => setPat("description", e.target.value)} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Comissão %</label><input className="erp-input num" type="number" step="0.01" min={0} value={pattern.commission_pct} disabled={!isAdmin} onChange={(e) => setPat("commission_pct", Number(e.target.value))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">No faturamento %</label><input className="erp-input num" type="number" step="0.01" min={0} value={pattern.invoice_pct} disabled={!isAdmin} onChange={(e) => setPat("invoice_pct", Number(e.target.value))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">No pagamento %</label><input className="erp-input num" type="number" step="0.01" min={0} value={pattern.payment_pct} disabled={!isAdmin} onChange={(e) => setPat("payment_pct", Number(e.target.value))} /></div>
                      <div className="erp-field erp-c10">
                        <span className="erp-field-hint">Faturamento % + pagamento % precisa somar exatamente a comissão %. Código em branco é gerado pelo sistema; gravar com um código existente atualiza o padrão.</span>
                      </div>
                      {pattern.code !== 0 && (
                        <div className="erp-field erp-c12" style={{ flexDirection: "row" }}>
                          <button className="erp-btn" onClick={() => setPattern(EMPTY_PATTERN)} disabled={busy}>Limpar formulário</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="erp-grid-wrap">
                    <table className="erp-grid">
                      <thead><tr><th className="num">Código</th><th>Descrição</th><th className="num">Comissão %</th><th className="num">Faturamento %</th><th className="num">Pagamento %</th><th>Situação</th><th style={{ width: 190 }}>Ações</th></tr></thead>
                      <tbody>
                        {patterns.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum padrão de comissão cadastrado.</td></tr>}
                        {patterns.map((p) => (
                          <tr key={p.code}>
                            <td className="num">{p.code}</td>
                            <td>{p.description}</td>
                            <td className="num">{pct(p.commission_pct)}</td>
                            <td className="num">{pct(p.invoice_pct)}</td>
                            <td className="num">{pct(p.payment_pct)}</td>
                            <td><span className={`erp-badge ${p.is_active ? "ok" : "err"}`}>{p.is_active ? "Ativo" : "Inativo"}</span></td>
                            <td><div style={{ display: "flex", gap: 6 }}><button className="erp-btn erp-btn-sm" onClick={() => setPattern({ ...p })} disabled={busy || !isAdmin}>Editar</button><button className="erp-btn erp-btn-sm" onClick={() => void alternarPadrao(p)} disabled={busy || !isAdmin}>{p.is_active ? "Desativar" : "Reativar"}</button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {tab === "motivos" && (
                <>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">{reason.code ? `Motivo ${reason.code}` : "Novo motivo de cancelamento"}</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input num" type="number" min={1} value={reason.code || ""} disabled={!isAdmin} onChange={(e) => setR("code", Math.max(0, Number(e.target.value)))} /></div>
                      <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={reason.description} disabled={!isAdmin} onChange={(e) => setR("description", e.target.value)} /></div>
                      <div className="erp-field erp-c2">
                        <label className="erp-label">Indicador D</label>
                        <label className="erp-check"><input type="checkbox" checked={!!reason.allow_uncancel} disabled={!isAdmin} onChange={(e) => setR("allow_uncancel", e.target.checked)} /><span>Permite descancelar</span></label>
                      </div>
                      <div className="erp-field erp-c2">
                        <label className="erp-label">Indicador C</label>
                        <label className="erp-check"><input type="checkbox" checked={!!reason.require_complement} disabled={!isAdmin} onChange={(e) => setR("require_complement", e.target.checked)} /><span>Exige complemento</span></label>
                      </div>
                      <div className="erp-field erp-c12">
                        <span className="erp-field-hint">
                          O cancelamento de orçamento e de item exige um motivo desta lista. Motivos "C" recusam complemento vazio;
                          o descancelamento só aceita motivos "D". Gravar com um código existente atualiza o motivo.
                        </span>
                      </div>
                      {reason.code !== 0 && (
                        <div className="erp-field erp-c12" style={{ flexDirection: "row" }}>
                          <button className="erp-btn" onClick={() => setReason(EMPTY_REASON)} disabled={busy}>Limpar formulário</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="erp-grid-wrap">
                    <table className="erp-grid">
                      <thead><tr><th className="num">Código</th><th>Descrição</th><th>Descancelar (D)</th><th>Complemento (C)</th><th>Situação</th><th style={{ width: 190 }}>Ações</th></tr></thead>
                      <tbody>
                        {reasons.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum motivo cadastrado — o cancelamento de orçamentos fica indisponível até cadastrar ao menos um.</td></tr>}
                        {reasons.map((r) => (
                          <tr key={r.code}>
                            <td className="num">{r.code}</td>
                            <td>{r.description}</td>
                            <td>{r.allow_uncancel ? "Sim" : "Não"}</td>
                            <td>{r.require_complement ? "Sim" : "Não"}</td>
                            <td><span className={`erp-badge ${r.is_active ? "ok" : "err"}`}>{r.is_active ? "Ativo" : "Inativo"}</span></td>
                            <td><div style={{ display: "flex", gap: 6 }}><button className="erp-btn erp-btn-sm" onClick={() => setReason({ ...r })} disabled={busy || !isAdmin}>Editar</button><button className="erp-btn erp-btn-sm" onClick={() => void alternarMotivo(r)} disabled={busy || !isAdmin}>{r.is_active ? "Desativar" : "Reativar"}</button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Padrões de comissão: <strong>{patterns.length}</strong></div>
        <div className="erp-status-item">Motivos de cancelamento: <strong>{reasons.length}</strong></div>
        {params.enterprise_code ? <div className="erp-status-item">Empresa: <strong>{params.enterprise_code}</strong></div> : null}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
