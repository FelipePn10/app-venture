import { useState, useCallback, useEffect } from "react";
import {
  type ParametroIcmsIpi, type ParametroIcmsIpiDTO, type OperationType,
  RED_TARGETS, ACRES_TYPES, DIFAL_TYPES, BC_ST_MODALITIES,
  listParametrosIcmsIpi, createParametroIcmsIpi, updateParametroIcmsIpi,
} from "@/services/fiscalSupportService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { enumLabel } from "@/utils/enumLabels";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers, loadInvoiceTypes, loadLegalDevices } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const OPS: OperationType[] = ["AMBAS", "ENTRADA", "SAIDA", "CUSTOS"];

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
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Parâmetros ICMS/IPI</span><span className="erp-crumb-code">VFIS0320</span></nav>
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
          <ExportButton title="VFIS0320 — Parâmetros ICMS/IPI" filename="vfis0320" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Parâmetros ICMS</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-tabs">
          {BLOCOS.map((b) => (
            <button key={b.id} className={`erp-tab${bloco === b.id ? " active" : ""}`} onClick={() => setBloco(b.id)}>{b.label}</button>
          ))}
        </div>

        {bloco === "chave" && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">Identificação — <span style={{fontWeight:400,opacity:0.65}}>{editId !== null ? `Editando #${editId}` : "Forneça NCM ou Item, nunca ambos"}</span></div><div className="erp-fieldset-body">
            <div className="erp-field erp-c2"><label className="erp-label erp-req">UF</label>
              <input className="erp-input" maxLength={2} value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase())} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">NCM</label>
              <input className="erp-input" value={form.ncm_code ?? ""} onChange={(e) => setF("ncm_code", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Código Item</label>
              <input className="erp-input num"  value={form.item_code ?? ""} onChange={(e) => setF("item_code", e.target.value ? e.target.value : undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Máscara do item</label>
              <input className="erp-input" value={form.item_config_mask ?? ""} placeholder="item configurado" onChange={(e) => setF("item_config_mask", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Tipo Operação</label>
              <select className="erp-input" value={form.operation_type} onChange={(e) => setF("operation_type", e.target.value as OperationType)}>
                {OPS.map((o) => <option key={o} value={o}>{enumLabel(o)}</option>)}</select></div>

            <div className="erp-field erp-c12"><div className="fis-sec">Restringir a</div></div>
            <div className="erp-field erp-c3"><label className="erp-label">Cliente</label>
              <LookupField value={form.customer_code} loader={loadCustomers} entityLabel="cliente" placeholder="Todos" clearable onChange={(c) => setF("customer_code", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Estabelecimento do cliente</label>
              <input className="erp-input num" type="number" value={form.customer_establishment_code ?? ""} onChange={(e) => setF("customer_establishment_code", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Tipo de NF — saída</label>
              <LookupField value={form.invoice_type_exit_id} loader={loadInvoiceTypes} entityLabel="tipo de nota" placeholder="Todos" clearable onChange={(c) => setF("invoice_type_exit_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Tipo de NF — entrada</label>
              <LookupField value={form.invoice_type_entry_id} loader={loadInvoiceTypes} entityLabel="tipo de nota" placeholder="Todos" clearable onChange={(c) => setF("invoice_type_entry_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c6"><label className="erp-label">Descrição</label>
              <input className="erp-input" value={form.description_full ?? ""} placeholder="Para que serve este parâmetro" onChange={(e) => setF("description_full", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }}>
              <label className="erp-check"><input type="checkbox" checked={!!form.is_preferred} onChange={(e) => setF("is_preferred", e.target.checked)} /> Preferencial</label>
              <span className="fis-hint">Vence os demais quando mais de um parâmetro serve.</span></div>
        </div></div>
        )}

        {bloco === "icms" && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">ICMS — alíquota, redução, diferimento e acréscimos</div><div className="erp-fieldset-body">
            <div className="erp-field erp-c12"><div className="fis-sec">Alíquota</div></div>
            <div className="erp-field erp-c3"><label className="erp-label">% ICMS Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_pct_contrib} onChange={(e) => setF("icms_pct_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">% ICMS Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_pct_non_contrib} onChange={(e) => setF("icms_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">CST Contrib.</label>
              <input className="erp-input" value={form.cst_icms_contrib} onChange={(e) => setF("cst_icms_contrib", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">CST Não-Contrib.</label>
              <input className="erp-input" value={form.cst_icms_non_contrib} onChange={(e) => setF("cst_icms_non_contrib", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">CSOSN</label>
              <input className="erp-input" value={form.csosn_icms ?? ""} onChange={(e) => setF("csosn_icms", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Situação B</label>
              <input className="erp-input" value={form.cst_situation_b ?? ""} onChange={(e) => setF("cst_situation_b", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">CST devolução Contrib.</label>
              <input className="erp-input" value={form.cst_icms_contrib_dev ?? ""} onChange={(e) => setF("cst_icms_contrib_dev", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">CST devolução Não-Contrib.</label>
              <input className="erp-input" value={form.cst_icms_non_contrib_dev ?? ""} onChange={(e) => setF("cst_icms_non_contrib_dev", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Dispositivo legal Contrib.</label>
              <LookupField value={form.legal_device_icms_contrib_id} loader={loadLegalDevices} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_icms_contrib_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Disp. legal Não-Contrib.</label>
              <LookupField value={form.legal_device_icms_non_contrib_id} loader={loadLegalDevices} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_icms_non_contrib_id", c ? Number(c) : undefined)} /></div>

            <div className="erp-field erp-c12"><div className="fis-sec">Redução</div></div>
            <div className="erp-field erp-c2"><label className="erp-label">% redução Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_red_pct_contrib ?? ""} onChange={(e) => setF("icms_red_pct_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Incide sobre</label>
              <select className="erp-input" value={form.icms_red_target_contrib ?? ""} onChange={(e) => setF("icms_red_target_contrib", e.target.value || undefined)}>
                <option value="">—</option>{RED_TARGETS.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label">% redução Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_red_pct_non_contrib ?? ""} onChange={(e) => setF("icms_red_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Incide sobre</label>
              <select className="erp-input" value={form.icms_red_target_non_contrib ?? ""} onChange={(e) => setF("icms_red_target_non_contrib", e.target.value || undefined)}>
                <option value="">—</option>{RED_TARGETS.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label">Disp. legal redução Contrib.</label>
              <LookupField value={form.legal_device_icms_red_contrib_id} loader={loadLegalDevices} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_icms_red_contrib_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Disp. legal redução Não-Contrib.</label>
              <LookupField value={form.legal_device_icms_red_non_contrib_id} loader={loadLegalDevices} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_icms_red_non_contrib_id", c ? Number(c) : undefined)} /></div>

            <div className="erp-field erp-c12"><div className="fis-sec">Diferimento</div></div>
            <div className="erp-field erp-c2"><label className="erp-label">% diferimento</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_deferral_pct ?? ""} onChange={(e) => setF("icms_deferral_pct", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Incide sobre</label>
              <select className="erp-input" value={form.icms_deferral_target ?? ""} onChange={(e) => setF("icms_deferral_target", e.target.value || undefined)}>
                <option value="">—</option>{RED_TARGETS.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c3"><label className="erp-label">Dispositivo legal</label>
              <LookupField value={form.legal_device_icms_deferral_id} loader={loadLegalDevices} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_icms_deferral_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Código do benefício (RBC)</label>
              <input className="erp-input" value={form.cod_benef_rbc ?? ""} onChange={(e) => setF("cod_benef_rbc", e.target.value || undefined)} /></div>

            <div className="erp-field erp-c12"><div className="fis-sec">Acréscimos (Fundo de Combate à Pobreza e outros)</div></div>
            <div className="erp-field erp-c2"><label className="erp-label">% acréscimo Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_acres_pct_contrib ?? ""} onChange={(e) => setF("icms_acres_pct_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Natureza</label>
              <select className="erp-input" value={form.icms_acres_type_contrib ?? ""} onChange={(e) => setF("icms_acres_type_contrib", e.target.value || undefined)}>
                <option value="">—</option>{ACRES_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c2" style={{ alignSelf: "flex-end" }}>
              <label className="erp-check"><input type="checkbox" checked={!!form.icms_acres_sum_contrib} onChange={(e) => setF("icms_acres_sum_contrib", e.target.checked)} /> Soma ao ICMS</label></div>
            <div className="erp-field erp-c2"><label className="erp-label">% acréscimo Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_acres_pct_non_contrib ?? ""} onChange={(e) => setF("icms_acres_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Natureza</label>
              <select className="erp-input" value={form.icms_acres_type_non_contrib ?? ""} onChange={(e) => setF("icms_acres_type_non_contrib", e.target.value || undefined)}>
                <option value="">—</option>{ACRES_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c2" style={{ alignSelf: "flex-end" }}>
              <label className="erp-check"><input type="checkbox" checked={!!form.icms_acres_sum_non_contrib} onChange={(e) => setF("icms_acres_sum_non_contrib", e.target.checked)} /> Soma ao ICMS</label></div>
        </div></div>
        )}

        {bloco === "st" && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">Substituição tributária e DIFAL</div><div className="erp-fieldset-body">
            <div className="erp-field erp-c12"><div className="fis-sec">Substituição</div></div>
            <div className="erp-field erp-c2"><label className="erp-label">% ST Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_subst_pct_contrib ?? ""} onChange={(e) => setF("icms_subst_pct_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">% ST Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_subst_pct_non_contrib ?? ""} onChange={(e) => setF("icms_subst_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">% ST uso e consumo</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_subst_pct_contrib_uc ?? ""} onChange={(e) => setF("icms_subst_pct_contrib_uc", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">% redução da ST</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_subst_red_pct ?? ""} onChange={(e) => setF("icms_subst_red_pct", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">% ICMS interno</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_internal_pct ?? ""} onChange={(e) => setF("icms_internal_pct", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Modalidade da base (modBCST)</label>
              <select className="erp-input" value={form.bc_icms_st_modality ?? ""} onChange={(e) => setF("bc_icms_st_modality", e.target.value || undefined)}>
                <option value="">—</option>{BC_ST_MODALITIES.map((m) => <option key={m} value={m}>{enumLabel(m)}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label">% p/ ST Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_pct_for_st_contrib ?? ""} onChange={(e) => setF("icms_pct_for_st_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">% p/ ST Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_pct_for_st_non_contrib ?? ""} onChange={(e) => setF("icms_pct_for_st_non_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">% FCP-ST partilha</label>
              <input className="erp-input num" type="number" step="0.01" value={form.fcp_st_partilha_pct ?? ""} onChange={(e) => setF("fcp_st_partilha_pct", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Disp. legal ST Contrib.</label>
              <LookupField value={form.legal_device_icms_subst_contrib_id} loader={loadLegalDevices} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_icms_subst_contrib_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Disp. legal ST Não-Contrib.</label>
              <LookupField value={form.legal_device_icms_subst_non_contrib_id} loader={loadLegalDevices} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_icms_subst_non_contrib_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Disp. legal redução da ST</label>
              <LookupField value={form.legal_device_icms_subst_red_id} loader={loadLegalDevices} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_icms_subst_red_id", c ? Number(c) : undefined)} /></div>

            <div className="erp-field erp-c12"><div className="fis-sec">Acréscimos da ST</div></div>
            <div className="erp-field erp-c2"><label className="erp-label">% acréscimo Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_st_acres_pct_contrib ?? ""} onChange={(e) => setF("icms_st_acres_pct_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Natureza</label>
              <select className="erp-input" value={form.icms_st_acres_type_contrib ?? ""} onChange={(e) => setF("icms_st_acres_type_contrib", e.target.value || undefined)}>
                <option value="">—</option>{ACRES_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c2" style={{ alignSelf: "flex-end" }}>
              <label className="erp-check"><input type="checkbox" checked={!!form.icms_st_acres_sum_contrib} onChange={(e) => setF("icms_st_acres_sum_contrib", e.target.checked)} /> Soma à ST</label></div>
            <div className="erp-field erp-c2"><label className="erp-label">% acréscimo Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_st_acres_pct_non_contrib ?? ""} onChange={(e) => setF("icms_st_acres_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Natureza</label>
              <select className="erp-input" value={form.icms_st_acres_type_non_contrib ?? ""} onChange={(e) => setF("icms_st_acres_type_non_contrib", e.target.value || undefined)}>
                <option value="">—</option>{ACRES_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c2" style={{ alignSelf: "flex-end" }}>
              <label className="erp-check"><input type="checkbox" checked={!!form.icms_st_acres_sum_non_contrib} onChange={(e) => setF("icms_st_acres_sum_non_contrib", e.target.checked)} /> Soma à ST</label></div>

            <div className="erp-field erp-c12"><div className="fis-sec">DIFAL</div></div>
            <div className="erp-field erp-c3"><label className="erp-label">Tratamento</label>
              <select className="erp-input" value={form.icms_difal_type ?? ""} onChange={(e) => setF("icms_difal_type", e.target.value || undefined)}>
                <option value="">—</option>{DIFAL_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label">% redução</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_difal_red_pct ?? ""} onChange={(e) => setF("icms_difal_red_pct", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">% redução na compra</label>
              <input className="erp-input num" type="number" step="0.01" value={form.difal_purchase_red_pct ?? ""} onChange={(e) => setF("difal_purchase_red_pct", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Incide sobre (compra)</label>
              <select className="erp-input" value={form.difal_purchase_red_target ?? ""} onChange={(e) => setF("difal_purchase_red_target", e.target.value || undefined)}>
                <option value="">—</option>{RED_TARGETS.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label">Dif. alíquota ST uso/consumo</label>
              <input className="erp-input num" type="number" step="0.01" value={form.dif_aliq_st_contrib_uc ?? ""} onChange={(e) => setF("dif_aliq_st_contrib_uc", Number(e.target.value))} /></div>
        </div></div>
        )}

        {bloco === "ipi" && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">IPI</div><div className="erp-fieldset-body">
            <div className="erp-field erp-c2"><label className="erp-label">CST saída</label>
              <input className="erp-input" value={form.cst_ipi_exit ?? ""} onChange={(e) => setF("cst_ipi_exit", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">CST entrada</label>
              <input className="erp-input" value={form.cst_ipi_entry ?? ""} onChange={(e) => setF("cst_ipi_entry", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Origem da classificação</label>
              <input className="erp-input" value={form.origem_clas_ipi ?? ""} onChange={(e) => setF("origem_clas_ipi", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c12"><div className="fis-sec">Redução</div></div>
            <div className="erp-field erp-c2"><label className="erp-label">% redução Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.ipi_red_pct_contrib ?? ""} onChange={(e) => setF("ipi_red_pct_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Incide sobre</label>
              <select className="erp-input" value={form.ipi_red_target_contrib ?? ""} onChange={(e) => setF("ipi_red_target_contrib", e.target.value || undefined)}>
                <option value="">—</option>{RED_TARGETS.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c3"><label className="erp-label">Dispositivo legal Contrib.</label>
              <LookupField value={form.legal_device_ipi_contrib_id} loader={loadLegalDevices} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_ipi_contrib_id", c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">% redução Não-Contrib.</label>
              <input className="erp-input num" type="number" step="0.01" value={form.ipi_red_pct_non_contrib ?? ""} onChange={(e) => setF("ipi_red_pct_non_contrib", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Incide sobre</label>
              <select className="erp-input" value={form.ipi_red_target_non_contrib ?? ""} onChange={(e) => setF("ipi_red_target_non_contrib", e.target.value || undefined)}>
                <option value="">—</option>{RED_TARGETS.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c3"><label className="erp-label">Dispositivo legal Não-Contrib.</label>
              <LookupField value={form.legal_device_ipi_non_contrib_id} loader={loadLegalDevices} entityLabel="dispositivo legal" placeholder="Opcional" clearable onChange={(c) => setF("legal_device_ipi_non_contrib_id", c ? Number(c) : undefined)} /></div>
        </div></div>
        )}

        {bloco === "especiais" && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">Regimes especiais, FCI e benefícios</div><div className="erp-fieldset-body">
            <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }}>
              <label className="erp-check"><input type="checkbox" checked={!!form.is_simples_optante} onChange={(e) => setF("is_simples_optante", e.target.checked)} /> Optante do Simples</label></div>
            <div className="erp-field erp-c2"><label className="erp-label">Anexo do Simples</label>
              <input className="erp-input" value={form.codigo_anexo_sn ?? ""} placeholder="I a V" onChange={(e) => setF("codigo_anexo_sn", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }}>
              <label className="erp-check"><input type="checkbox" checked={!!form.uses_icms_zona_franca} onChange={(e) => setF("uses_icms_zona_franca", e.target.checked)} /> Usa ICMS da Zona Franca</label></div>

            <div className="erp-field erp-c12"><div className="fis-sec">FCI — conteúdo de importação</div></div>
            <div className="erp-field erp-c2"><label className="erp-label">% ICMS origens 1, 2, 3 e 8</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_pct_origins_1238 ?? ""} onChange={(e) => setF("icms_pct_origins_1238", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">% ST origens 1, 2, 3 e 8</label>
              <input className="erp-input num" type="number" step="0.01" value={form.icms_subst_pct_origins_1238 ?? ""} onChange={(e) => setF("icms_subst_pct_origins_1238", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">CST do FCI</label>
              <input className="erp-input" value={form.cst_icms_fci ?? ""} onChange={(e) => setF("cst_icms_fci", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }}>
              <label className="erp-check"><input type="checkbox" checked={!!form.calc_base_red_fci} onChange={(e) => setF("calc_base_red_fci", e.target.checked)} /> Calcula redução de base no FCI</label></div>

            <div className="erp-field erp-c12"><div className="fis-sec">Códigos de benefício fiscal (cBenef)</div></div>
            <div className="erp-field erp-c3"><label className="erp-label">Geral</label>
              <input className="erp-input" value={form.cod_beneficio_fiscal ?? ""} onChange={(e) => setF("cod_beneficio_fiscal", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Contribuinte</label>
              <input className="erp-input" value={form.cod_benef_contrib ?? ""} onChange={(e) => setF("cod_benef_contrib", e.target.value || undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Não contribuinte</label>
              <input className="erp-input" value={form.cod_benef_non_contrib ?? ""} onChange={(e) => setF("cod_benef_non_contrib", e.target.value || undefined)} /></div>
        </div></div>
        )}

        <div className="erp-fieldset"><div className="erp-fieldset-head">Parâmetros — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>#</th><th>UF</th><th>NCM / Item</th><th>Operação</th><th>% Contrib.</th><th>% Não-Contrib.</th><th>CST</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum parâmetro cadastrado.</td></tr>}
              {list.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td><td style={{ fontWeight: 600 }}>{p.uf}</td>
                  <td>{p.ncm_code || (p.item_code ? `Item ${p.item_code}` : "—")}</td>
                  <td>{p.operation_type}</td>
                  <td>{p.icms_pct_contrib}</td><td>{p.icms_pct_non_contrib}</td>
                  <td>{p.cst_icms_contrib}/{p.cst_icms_non_contrib}</td>
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
