import { useState, useCallback, useEffect } from "react";
import {
  type ParametroIcmsIpi, type ParametroIcmsIpiDTO, type OperationType,
  RED_TARGETS, ACRES_TYPES, DIFAL_TYPES,
  listParametrosIcmsIpi, createParametroIcmsIpi, updateParametroIcmsIpi,
} from "@/services/fiscalSupportService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { enumLabel } from "@/utils/enumLabels";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers, loadInvoiceTypesById, loadItems, loadLegalDevicesById, loadNcmTables, loadTaxTypesById } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
// Só a saída usa a regra: a nota de entrada e o custo não a consultam. Valor antigo
// (Entrada/Custos) continua aparecendo para não sumir da tela.
const OPS: OperationType[] = ["SAIDA", "AMBAS"];

/**
 * O cadastro fiscal é grande e cada bloco responde a uma pergunta diferente.
 * Separar em abas é o que permite preencher só a parte que a operação exige —
 * a maioria dos parâmetros usa Identificação + ICMS e nada mais.
 */
type Bloco = "chave" | "icms" | "st" | "ipi" | "especiais";
const BLOCOS: { id: Bloco; label: string }[] = [
  { id: "chave", label: "Identificação" },
  { id: "icms", label: "ICMS" },
  { id: "st", label: "Substituição e DIFAL" },
  { id: "ipi", label: "IPI" },
  { id: "especiais", label: "Regimes especiais" },
];
const EMPTY: ParametroIcmsIpiDTO = {
  uf: "", ncm_code: "", item_code: undefined, operation_type: "SAIDA",
  icms_pct_contrib: 0, icms_pct_non_contrib: 0, cst_icms_contrib: "00", cst_icms_non_contrib: "00",
};

export function Vfis0320Page(): JSX.Element {
  const [form, setForm] = useState<ParametroIcmsIpiDTO>(EMPTY);
  const [bloco, setBloco] = useState<Bloco>("chave");
  const [editId, setEditId] = useState<number | null>(null);
  const [list, setList] = useState<ParametroIcmsIpi[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listParametrosIcmsIpi(false)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar parâmetros.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof ParametroIcmsIpiDTO>(k: K, v: ParametroIcmsIpiDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() { setForm(EMPTY); setEditId(null); setBloco("chave"); setFeedback(null); }
  function edit(p: ParametroIcmsIpi) {
    // O registro inteiro volta para o formulário: recortar campos aqui era o
    // que apagava a parametrização avançada a cada gravação.
    setForm({ ...p, ncm_code: p.ncm_code ?? "" });
    setEditId(p.id); setBloco("chave"); setFeedback(null);
  }

  async function salvar() {
    if (!form.uf.trim()) { setFeedback({ type: "error", message: "UF é obrigatória." }); return; }
    if (!!form.ncm_code?.trim() === !!form.item_code) { setFeedback({ type: "error", message: "Forneça NCM OU código de item (nunca ambos)." }); return; }
    setBusy(true); setFeedback(null);
    const payload: ParametroIcmsIpiDTO = {
      ...form, ncm_code: form.ncm_code?.trim() || undefined,
      item_code: form.item_code || undefined,
    };
    try {
      if (editId !== null) { await updateParametroIcmsIpi({ ...payload, id: editId }); setFeedback({ type: "success", message: `Parâmetro #${editId} atualizado.` }); }
      else { await createParametroIcmsIpi(payload); setFeedback({ type: "success", message: "Parâmetro cadastrado." }); }
      novo(); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <style>{`
        .fis-sec { font-size: 10.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #2f7d47; border-bottom: 1px solid #dbe8d5; padding-bottom: 4px; margin-top: 4px; }
        .fis-hint { display: block; font-size: 10.5px; color: #7a9a84; line-height: 1.4; margin-top: 3px; }
      `}</style>
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Regras de ICMS/IPI</span><span className="erp-crumb-code">VFIS0320</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo Parâmetro</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0320 — Regras de ICMS/IPI" filename="vfis0320" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          {/* UMA barra de abas. Havia duas empilhadas: uma com uma aba única e
              decorativa ("Parâmetros ICMS") acima das abas de verdade — dois
              controles parecidos em sequência, sendo que só o de baixo faz algo. */}
          <div className="erp-tabs" role="tablist" aria-label="Blocos do parâmetro fiscal">
            {BLOCOS.map((b) => (
              <button key={b.id} role="tab" aria-selected={bloco === b.id}
                className={`erp-tab${bloco === b.id ? " active" : ""}`}
                onClick={() => setBloco(b.id)}>{b.label}</button>
            ))}
          </div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {bloco === "chave" && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">Identificação — <span style={{fontWeight:400,opacity:0.65}}>{editId !== null ? `Editando #${editId}` : "Forneça NCM ou Item, nunca ambos"}</span></div><div className="erp-fieldset-body">
            <div className="erp-field erp-c2"><label className="erp-label erp-req">UF</label>
              <input className="erp-input" maxLength={2} value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase())} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">NCM</label>
              <LookupField<string> value={form.ncm_code || undefined} loader={loadNcmTables} entityLabel="NCM" placeholder="Todos" clearable onChange={(c) => setF("ncm_code", c ? String(c).replace(/\D/g, "") : "")} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Item</label>
              <LookupField<string> value={form.item_code ? String(form.item_code) : undefined} loader={loadItems} entityLabel="item" placeholder="Todos" allowManualCode={false} clearable onChange={(c) => setF("item_code", c ? String(c) : undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Tipo Operação</label>
              <select className="erp-input" value={form.operation_type} onChange={(e) => setF("operation_type", e.target.value as OperationType)}>
                {(OPS.includes(form.operation_type) ? OPS : [...OPS, form.operation_type]).map((o) => <option key={o} value={o}>{enumLabel(o)}</option>)}</select></div>

            <div className="erp-field erp-c12"><div className="fis-sec">Restringir a</div></div>
            <div className="erp-field erp-c3"><label className="erp-label">Cliente</label>
              <LookupField value={form.customer_code} loader={loadCustomers} entityLabel="cliente" placeholder="Todos" clearable onChange={(c) => setF("customer_code", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Tipo de imposto do cliente</label>
              <LookupField value={form.tax_type_id} loader={loadTaxTypesById} entityLabel="tipo de imposto" placeholder="Todos" clearable onChange={(c) => setF("tax_type_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Tipo de NF — saída</label>
              <LookupField value={form.invoice_type_exit_id} loader={loadInvoiceTypesById} entityLabel="tipo de nota" placeholder="Todos" clearable onChange={(c) => setF("invoice_type_exit_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Finalidade da compra</label>
              <select className="erp-input" value={form.finalidade_compra ?? ""} onChange={(e) => setF("finalidade_compra", e.target.value || undefined)}>
                <option value="">Qualquer</option>
                <option value="REVENDA">Revenda</option>
                <option value="INDUSTRIALIZACAO">Industrialização</option>
                <option value="USO_CONSUMO">Uso, consumo ou ativo</option>
              </select>
              <span className="fis-hint">Vale só para vendas com esta finalidade (do pedido ou do cliente).</span></div>
            <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }}>
              <label className="erp-check"><input type="checkbox" checked={!!form.is_preferred} onChange={(e) => setF("is_preferred", e.target.checked)} /> Preferencial</label>
              <span className="fis-hint">Vence os demais quando mais de um parâmetro serve.</span></div>
        </div></div>
        )}

        {bloco === "icms" && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">ICMS — alíquota, redução, diferimento e acréscimos</div><div className="erp-fieldset-body">
            <div className="erp-field erp-c12"><div className="fis-sec">Alíquota</div></div>
            <div className="erp-field erp-c3"><label className="erp-label">% ICMS Contrib.</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.icms_pct_contrib} onChange={(e) => setF("icms_pct_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">% ICMS Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.icms_pct_non_contrib} onChange={(e) => setF("icms_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">CST Contrib.</label>
              <input className="erp-input" value={form.cst_icms_contrib} onChange={(e) => setF("cst_icms_contrib", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">CST Não-Contrib.</label>
              <input className="erp-input" value={form.cst_icms_non_contrib} onChange={(e) => setF("cst_icms_non_contrib", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">CSOSN</label>
              <input className="erp-input" value={form.csosn_icms ?? ""} onChange={(e) => setF("csosn_icms", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Dispositivo legal Contrib.</label>
              <LookupField value={form.legal_device_icms_contrib_id} loader={loadLegalDevicesById} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_icms_contrib_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Disp. legal Não-Contrib.</label>
              <LookupField value={form.legal_device_icms_non_contrib_id} loader={loadLegalDevicesById} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_icms_non_contrib_id", c ? Number(c) : undefined)} /></div>

            <div className="erp-field erp-c12"><div className="fis-sec">Redução</div></div>
            <div className="erp-field erp-c2"><label className="erp-label">% redução Contrib.</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.icms_red_pct_contrib ?? ""} onChange={(e) => setF("icms_red_pct_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Incide sobre</label>
              <select className="erp-input" value={form.icms_red_target_contrib ?? ""} onChange={(e) => setF("icms_red_target_contrib", e.target.value || undefined)}>
                <option value="">—</option>{RED_TARGETS.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label">% redução Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.icms_red_pct_non_contrib ?? ""} onChange={(e) => setF("icms_red_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Incide sobre</label>
              <select className="erp-input" value={form.icms_red_target_non_contrib ?? ""} onChange={(e) => setF("icms_red_target_non_contrib", e.target.value || undefined)}>
                <option value="">—</option>{RED_TARGETS.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label">Disp. legal redução Contrib.</label>
              <LookupField value={form.legal_device_icms_red_contrib_id} loader={loadLegalDevicesById} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_icms_red_contrib_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Disp. legal redução Não-Contrib.</label>
              <LookupField value={form.legal_device_icms_red_non_contrib_id} loader={loadLegalDevicesById} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_icms_red_non_contrib_id", c ? Number(c) : undefined)} /></div>

            <div className="erp-field erp-c12"><div className="fis-sec">Diferimento</div></div>
            <div className="erp-field erp-c2"><label className="erp-label">% diferimento</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.icms_deferral_pct ?? ""} onChange={(e) => setF("icms_deferral_pct", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Dispositivo legal</label>
              <LookupField value={form.legal_device_icms_deferral_id} loader={loadLegalDevicesById} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_icms_deferral_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Código do benefício (RBC)</label>
              <input className="erp-input" value={form.cod_benef_rbc ?? ""} onChange={(e) => setF("cod_benef_rbc", e.target.value || undefined)} /></div>

            <div className="erp-field erp-c12"><div className="fis-sec">FCP do produto (venda a não contribuinte de outro estado)</div></div>
            <div className="erp-field erp-c2"><label className="erp-label">% acréscimo Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.icms_acres_pct_non_contrib ?? ""} onChange={(e) => setF("icms_acres_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Natureza</label>
              <select className="erp-input" value={form.icms_acres_type_non_contrib ?? ""} onChange={(e) => setF("icms_acres_type_non_contrib", e.target.value || undefined)}>
                <option value="">—</option>{ACRES_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c12"><span className="fis-hint">
              FCP do produto: na venda para não contribuinte de outro estado, o acréscimo Não-Contrib. com natureza Fundo de Combate à Pobreza é o FCP
              que a nota recolhe junto com o DIFAL. Informe-o quando o estado de destino cobra FCP sobre este produto; sem ele vale o FCP geral da tabela de ICMS por UF (só RJ e SE).
            </span></div>
        </div></div>
        )}

        {bloco === "st" && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">Substituição tributária e DIFAL</div><div className="erp-fieldset-body">
            <div className="erp-field erp-c12"><div className="fis-sec">Substituição</div></div>
            <div className="erp-field erp-c2"><label className="erp-label">MVA original (%)</label>
              <input className="erp-input num" type="number" step="0.0001" min="0" value={form.mva_pct ?? ""} onChange={(e) => setF("mva_pct", e.target.value ? Number(e.target.value) : undefined)} />
              <span className="fis-hint">Com MVA, a venda para contribuinte que revende ou industrializa calcula a ST automaticamente.</span></div>
            <div className="erp-field erp-c4" style={{ alignSelf: "flex-end" }}>
              <label className="erp-check"><input type="checkbox" checked={form.mva_ajustar_interestadual ?? true} onChange={(e) => setF("mva_ajustar_interestadual", e.target.checked)} /> Ajustar a MVA na venda para outro estado</label>
              <span className="fis-hint">Fórmula do Convênio ICMS 142/18. Desmarque quando o protocolo do produto já traz a MVA ajustada.</span></div>
            <div className="erp-field erp-c2"><label className="erp-label">% redução da ST</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.icms_subst_red_pct ?? ""} onChange={(e) => setF("icms_subst_red_pct", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label" title="Alíquota interna do estado de destino usada no cálculo da ST; vazio = a da tabela de ICMS por UF">% alíq. destino na ST — Contrib.</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.icms_pct_for_st_contrib ?? ""} onChange={(e) => setF("icms_pct_for_st_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label" title="Alíquota interna do estado de destino usada no cálculo da ST; vazio = a da tabela de ICMS por UF">% alíq. destino na ST — Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.icms_pct_for_st_non_contrib ?? ""} onChange={(e) => setF("icms_pct_for_st_non_contrib", Number(e.target.value))} /></div>


            <div className="erp-field erp-c12"><div className="fis-sec">DIFAL</div></div>
            <div className="erp-field erp-c3"><label className="erp-label">Tratamento</label>
              <select className="erp-input" value={form.icms_difal_type ?? ""} onChange={(e) => setF("icms_difal_type", e.target.value || undefined)}>
                <option value="">—</option>{DIFAL_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label">% redução</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.icms_difal_red_pct ?? ""} onChange={(e) => setF("icms_difal_red_pct", Number(e.target.value))} /></div>
        </div></div>
        )}

        {bloco === "ipi" && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">IPI</div><div className="erp-fieldset-body">
            <div className="erp-field erp-c2"><label className="erp-label">CST saída</label>
              <input className="erp-input" value={form.cst_ipi_exit ?? ""} onChange={(e) => setF("cst_ipi_exit", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c3" title="Código de enquadramento legal do IPI (cEnq, tabela da Receita). Em branco sai 999 (tributação normal). Na isenção, informe o código da isenção — por exemplo, o da venda para a Zona Franca."><label className="erp-label erp-label-tip">Enquadramento (cEnq)</label>
              <input className="erp-input num" maxLength={3} value={form.ipi_codigo_enquadramento ?? ""} placeholder="999" onChange={(e) => setF("ipi_codigo_enquadramento", e.target.value.replace(/\D/g, "") || undefined)} /></div>
            <div className="erp-field erp-c12"><div className="fis-sec">Redução</div></div>
            <div className="erp-field erp-c2"><label className="erp-label">% redução Contrib.</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.ipi_red_pct_contrib ?? ""} onChange={(e) => setF("ipi_red_pct_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Incide sobre</label>
              <select className="erp-input" value={form.ipi_red_target_contrib ?? ""} onChange={(e) => setF("ipi_red_target_contrib", e.target.value || undefined)}>
                <option value="">—</option>{RED_TARGETS.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c3"><label className="erp-label">Dispositivo legal Contrib.</label>
              <LookupField value={form.legal_device_ipi_contrib_id} loader={loadLegalDevicesById} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_ipi_contrib_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">% redução Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.ipi_red_pct_non_contrib ?? ""} onChange={(e) => setF("ipi_red_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Incide sobre</label>
              <select className="erp-input" value={form.ipi_red_target_non_contrib ?? ""} onChange={(e) => setF("ipi_red_target_non_contrib", e.target.value || undefined)}>
                <option value="">—</option>{RED_TARGETS.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c3"><label className="erp-label">Dispositivo legal Não-Contrib.</label>
              <LookupField value={form.legal_device_ipi_non_contrib_id} loader={loadLegalDevicesById} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_ipi_non_contrib_id", c ? Number(c) : undefined)} /></div>
        </div></div>
        )}

        {bloco === "especiais" && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">Regimes especiais, importados e benefícios</div><div className="erp-fieldset-body">
            <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }}>
              <label className="erp-check"><input type="checkbox" checked={!!form.is_simples_optante} onChange={(e) => setF("is_simples_optante", e.target.checked)} /> Optante do Simples</label></div>
            <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }} title="Venda com o benefício da Zona Franca de Manaus / áreas de livre comércio (Convênio ICM 65/88). Quando o destinatário é contribuinte comprando para revenda ou industrialização e tem SUFRAMA válida: ICMS isento com o valor desonerado abatido do total (CST 40, motivo 7; no PR, cBenef PR810175), PIS/COFINS a alíquota zero (CST 06) e CFOP 6109/6110. O IPI segue o CST e o enquadramento do bloco IPI. Fora dessas condições a venda é tributada normalmente.">
              <label className="erp-check erp-label-tip"><input type="checkbox" checked={!!form.uses_icms_zona_franca} onChange={(e) => setF("uses_icms_zona_franca", e.target.checked)} /> Venda para a Zona Franca (SUFRAMA)</label></div>

            <div className="erp-field erp-c12"><div className="fis-sec">Mercadoria importada</div></div>
            <div className="erp-field erp-c2"><label className="erp-label" title="Alíquota interestadual da mercadoria importada (origens 1, 2, 3 e 8). Vazio = 4% (Resolução do Senado 13/2012).">% ICMS interestadual — origens 1, 2, 3 e 8</label>
              <input className="erp-input num" type="number" step="0.0001" value={form.icms_pct_origins_1238 ?? ""} onChange={(e) => setF("icms_pct_origins_1238", Number(e.target.value))} /></div>

            <div className="erp-field erp-c12"><div className="fis-sec">Códigos de benefício fiscal (cBenef)</div></div>
            <div className="erp-field erp-c3"><label className="erp-label">Geral</label>
              <input className="erp-input" value={form.cod_beneficio_fiscal ?? ""} onChange={(e) => setF("cod_beneficio_fiscal", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Contribuinte</label>
              <input className="erp-input" value={form.cod_benef_contrib ?? ""} onChange={(e) => setF("cod_benef_contrib", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Não contribuinte</label>
              <input className="erp-input" value={form.cod_benef_non_contrib ?? ""} onChange={(e) => setF("cod_benef_non_contrib", e.target.value || undefined)} /></div>
        </div></div>
        )}

        <div className="erp-fieldset"><div className="erp-fieldset-head">Parâmetros — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body">
          <div className="erp-field erp-c12"><p className="erp-note" style={{ margin: 0 }}>
            Redução, substituição e diferimento de ICMS ficam aqui, na regra — é a única que a nota usa.
            Ordem de precedência: a regra desta tela vence; sem regra, valem as <strong>Tabelas Tributárias (VFIS0110)</strong> — ICMS
            interno da UF, interestadual e IPI/PIS/COFINS do NCM —; e, por último, a alíquota da Configuração Fiscal (VFIS0100).
            Para conferir qual regra vale numa venda, use o <strong>Simulador de Tributação (VFIS0325)</strong>.
          </p></div>
          <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>#</th><th>UF</th><th>NCM / Item</th><th>Operação</th><th>% Contrib.</th><th>% Não-Contrib.</th><th>CST</th><th>Finalidade</th><th>MVA (ST)</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhum parâmetro cadastrado.</td></tr>}
              {list.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}{p.origem_reducao_id ? <span className="erp-badge erp-badge-gray" title={`Copiada da regra ${p.origem_reducao_id} do cadastro antigo de redução e substituição`} style={{ marginLeft: 4 }}>migrada</span> : null}</td><td style={{ fontWeight: 600 }}>{p.uf}</td>
                  <td>{p.ncm_code || (p.item_code ? `Item ${p.item_code}` : "—")}</td>
                  <td>{p.operation_type}</td>
                  <td>{p.icms_pct_contrib}</td><td>{p.icms_pct_non_contrib}</td>
                  <td>{p.cst_icms_contrib || p.cst_icms_non_contrib ? `${p.cst_icms_contrib || "—"} / ${p.cst_icms_non_contrib || "—"}` : "—"}</td>
                  <td>{p.finalidade_compra ? ({ REVENDA: "Revenda", INDUSTRIALIZACAO: "Industrialização", USO_CONSUMO: "Uso e consumo" } as Record<string, string>)[p.finalidade_compra] ?? p.finalidade_compra : "Qualquer"}</td>
                  <td>{p.mva_pct ? `${p.mva_pct}%${p.mva_ajustar_interestadual === false ? "" : " (ajusta)"}` : "—"}</td>
                  <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(p)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Parâmetros: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
