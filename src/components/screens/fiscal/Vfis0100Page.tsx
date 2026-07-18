import { useState, useCallback, useEffect } from "react";
import {
  type FiscalConfig,
  type RegimeTributario,
  type FocusAmbiente,
  getFiscalConfig,
  updateFiscalConfig,
  updateFiscalBranding,
  getFiscalBrandingLogo,
  validateBrandingLogo,
  BRAND_COLOR_PATTERN,
  MAX_BRANDING_LOGO_BYTES,
} from "@/services/fiscalConfigService";
import { errMessage } from "@/services/fiscalShared";
import { validateCNPJOrCPF } from "@/utils/validation";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const EMPTY: FiscalConfig = {
  cnpj_empresa: "",
  razao_social: "",
  ie_empresa: "",
  regime_tributario: "3",
  uf_empresa: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  municipio: "",
  codigo_municipio: "",
  cep: "",
  telefone: "",
  icms_interno_aliquota: 0,
  icms_diferimento_percentual: 0,
  focus_nfe_token: "",
  focus_nfe_ambiente: "homologacao",
  juros_mes: 0,
  multa_atraso: 0,
  vencimento_icms_dia: 10,
  vencimento_ipi_dia: 15,
  vencimento_pis_cofins_dia: 25,
};

const REGIMES: { value: RegimeTributario; label: string }[] = [
  { value: "1", label: "1 — Simples Nacional" },
  { value: "2", label: "2 — Lucro Presumido" },
  { value: "3", label: "3 — Lucro Real" },
];

export function Vfis0100Page(): JSX.Element {
  const [form, setForm] = useState<FiscalConfig>(EMPTY);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [brandColor, setBrandColor] = useState("#1B5E36");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  const loadLogo = useCallback(async () => {
    try {
      const blob = await getFiscalBrandingLogo();
      setLogoUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return blob ? URL.createObjectURL(blob) : null;
      });
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar o logo persistido.") });
    }
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const cfg = await getFiscalConfig();
      setForm({ ...EMPTY, ...cfg });
      if (cfg.brand_color && BRAND_COLOR_PATTERN.test(cfg.brand_color)) setBrandColor(cfg.brand_color.toUpperCase());
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar a configuração fiscal.") });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); void loadLogo(); }, [load, loadLogo]);
  useEffect(() => () => { if (logoUrl) URL.revokeObjectURL(logoUrl); }, [logoUrl]);

  const setField = useCallback(<K extends keyof FiscalConfig>(key: K, value: FiscalConfig[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setFeedback(null);
  }, []);

  const setNum = useCallback((key: keyof FiscalConfig, raw: string) => {
    setField(key, (raw === "" ? 0 : Number(raw)) as FiscalConfig[typeof key]);
  }, [setField]);

  async function handleSalvar() {
    if (!form.cnpj_empresa.trim() || !form.razao_social.trim() || !form.uf_empresa.trim()) {
      setFeedback({ type: "error", message: "CNPJ, Razão Social e UF da empresa são obrigatórios." });
      return;
    }
    if (!validateCNPJOrCPF(form.cnpj_empresa)) {
      setFeedback({ type: "error", message: "CNPJ/CPF da empresa inválido (dígito verificador não confere)." });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const saved = await updateFiscalConfig(form);
      setForm({ ...EMPTY, ...saved });
      setFeedback({ type: "success", message: "Configuração fiscal salva com sucesso." });
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao salvar a configuração fiscal.") });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoChange(file: File | null) {
    setFeedback(null);
    if (!file) { setLogoFile(null); return; }
    try {
      await validateBrandingLogo(file);
      setLogoFile(file);
    } catch (e) {
      setLogoFile(null);
      setFeedback({ type: "error", message: errMessage(e, "Logo inválido.") });
    }
  }

  async function handleSalvarBranding() {
    if (!BRAND_COLOR_PATTERN.test(brandColor)) {
      setFeedback({ type: "error", message: "A cor da marca deve usar o formato #RRGGBB." });
      return;
    }
    setIsSavingBranding(true); setFeedback(null);
    try {
      await updateFiscalBranding({ logo: logoFile ?? undefined, brandColor });
      await loadLogo();
      setLogoFile(null);
      setFeedback({ type: "success", message: "Identidade visual salva e preview recarregado do backend." });
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao salvar a identidade visual.") });
    } finally { setIsSavingBranding(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Configuração Fiscal</span><span className="erp-crumb-code">VFIS0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Dados</span>
          <button className="erp-btn" onClick={() => void load()} disabled={isLoading || isSaving}>
            {isLoading ? <><div className="erp-spin" />Carregando...</> : "Recarregar"}
          </button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving || isLoading}>
            {isSaving ? <><div className="erp-spin" />Salvando...</> : "Salvar Configuração"}
          </button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0100 — Configuração Fiscal" filename="vfis0100" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Configuração Fiscal</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="erp-fieldset"><div className="erp-fieldset-head">Emitente   — <span style={{fontWeight:400,opacity:0.65}}>Identificação da empresa</span></div><div className="erp-fieldset-body">
            
              <div className="erp-field erp-c3">
                <label className="erp-label erp-req">CNPJ</label>
                <input className="erp-input" value={form.cnpj_empresa} placeholder="00000000000000"
                  onChange={(e) => setField("cnpj_empresa", e.target.value)} />
                {form.cnpj_empresa.trim() && (
                  <span className="erp-field-hint" style={{ color: validateCNPJOrCPF(form.cnpj_empresa) ? "#1e6030" : "#b91c1c" }}>
                    {validateCNPJOrCPF(form.cnpj_empresa) ? "✓ CNPJ/CPF válido" : "✗ CNPJ/CPF inválido"}
                  </span>
                )}
              </div>
              <div className="erp-field erp-c6">
                <label className="erp-label erp-req">Razão Social</label>
                <input className="erp-input" value={form.razao_social}
                  onChange={(e) => setField("razao_social", e.target.value)} />
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Inscrição Estadual</label>
                <input className="erp-input" value={form.ie_empresa ?? ""}
                  onChange={(e) => setField("ie_empresa", e.target.value)} />
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-label erp-req">Regime Tributário</label>
                <select className="erp-input" value={form.regime_tributario}
                  onChange={(e) => setField("regime_tributario", e.target.value as RegimeTributario)}>
                  {REGIMES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="erp-field erp-c2">
                <label className="erp-label erp-req">UF</label>
                <input className="erp-input" maxLength={2} value={form.uf_empresa}
                  onChange={(e) => setField("uf_empresa", e.target.value.toUpperCase())} />
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Telefone</label>
                <input className="erp-input" value={form.telefone ?? ""} placeholder="41999990000"
                  onChange={(e) => setField("telefone", e.target.value)} />
              </div>
            
          </div>
        </div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Identidade visual   — <span style={{fontWeight:400,opacity:0.65}}>Logo persistido usado em relatórios e romaneios</span></div><div className="erp-fieldset-body">
          <div className="erp-field erp-c4">
            <label className="erp-label">Logo PNG ou JPEG</label>
            <input className="erp-input" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg"
              onChange={(e) => void handleLogoChange(e.target.files?.[0] ?? null)} />
            <span className="erp-field-hint">Máximo {MAX_BRANDING_LOGO_BYTES / 1024 / 1024} MB. O conteúdo do arquivo é validado.</span>
            {logoFile && <span className="erp-field-hint">Selecionado: {logoFile.name} ({Math.ceil(logoFile.size / 1024)} KB)</span>}
          </div>
          <div className="erp-field erp-c3">
            <label className="erp-label">Cor da marca</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="color" value={BRAND_COLOR_PATTERN.test(brandColor) ? brandColor : "#1B5E36"}
                onChange={(e) => setBrandColor(e.target.value.toUpperCase())} style={{ width: 48, height: 36 }} />
              <input className="erp-input" value={brandColor} maxLength={7} placeholder="#1B5E36"
                onChange={(e) => setBrandColor(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="erp-field erp-c3">
            <label className="erp-label">Preview persistido</label>
            <div style={{ height: 88, border: "1px solid #d7e2d9", borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
              {logoUrl ? <img src={logoUrl} alt="Logo fiscal persistido" style={{ maxWidth: "100%", maxHeight: 72, objectFit: "contain" }} /> : <span className="erp-field-hint">Nenhum logo configurado</span>}
            </div>
          </div>
          <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
            <button className="erp-btn erp-btn-primary" onClick={() => void handleSalvarBranding()} disabled={isSavingBranding}>
              {isSavingBranding ? "Enviando..." : "Salvar identidade"}
            </button>
          </div>
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Endereço   — <span style={{fontWeight:400,opacity:0.65}}>Obrigatório para autorização da NF-e na SEFAZ</span></div><div className="erp-fieldset-body">
            
              <div className="erp-field erp-c6">
                <label className="erp-label">Logradouro</label>
                <input className="erp-input" value={form.logradouro ?? ""}
                  onChange={(e) => setField("logradouro", e.target.value)} />
              </div>
              <div className="erp-field erp-c2">
                <label className="erp-label">Número</label>
                <input className="erp-input" value={form.numero ?? ""}
                  onChange={(e) => setField("numero", e.target.value)} />
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-label">Complemento</label>
                <input className="erp-input" value={form.complemento ?? ""}
                  onChange={(e) => setField("complemento", e.target.value)} />
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-label">Bairro</label>
                <input className="erp-input" value={form.bairro ?? ""}
                  onChange={(e) => setField("bairro", e.target.value)} />
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-label">Município</label>
                <input className="erp-input" value={form.municipio ?? ""}
                  onChange={(e) => setField("municipio", e.target.value)} />
              </div>
              <div className="erp-field erp-c2">
                <label className="erp-label">Cód. IBGE</label>
                <input className="erp-input" value={form.codigo_municipio ?? ""} placeholder="4106902"
                  onChange={(e) => setField("codigo_municipio", e.target.value)} />
              </div>
              <div className="erp-field erp-c2">
                <label className="erp-label">CEP</label>
                <input className="erp-input" value={form.cep ?? ""} placeholder="80000000"
                  onChange={(e) => setField("cep", e.target.value)} />
              </div>
            
          </div>
        </div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Focus NF-e   — <span style={{fontWeight:400,opacity:0.65}}>Integração com a SEFAZ</span></div><div className="erp-fieldset-body">
            
              <div className="erp-field erp-c8">
                <label className="erp-label erp-req">Token Focus NF-e</label>
                <input className="erp-input" value={form.focus_nfe_token ?? ""}
                  onChange={(e) => setField("focus_nfe_token", e.target.value)} />
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-label erp-req">Ambiente</label>
                <select className="erp-input" value={form.focus_nfe_ambiente}
                  onChange={(e) => setField("focus_nfe_ambiente", e.target.value as FocusAmbiente)}>
                  <option value="homologacao">Homologação</option>
                  <option value="producao">Produção</option>
                </select>
              </div>
            
          </div>
        </div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Tributação &amp; Vencimentos   — <span style={{fontWeight:400,opacity:0.65}}>Alíquotas em decimal (ex: 0.12 = 12%)</span></div><div className="erp-fieldset-body">
            
              <div className="erp-field erp-c3">
                <label className="erp-label">ICMS interno (ratio)</label>
                <input className="erp-input num" type="number" step="0.0001" value={form.icms_interno_aliquota}
                  onChange={(e) => setNum("icms_interno_aliquota", e.target.value)} />
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Diferimento ICMS (ratio)</label>
                <input className="erp-input num" type="number" step="0.0001" value={form.icms_diferimento_percentual}
                  onChange={(e) => setNum("icms_diferimento_percentual", e.target.value)} />
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Juros ao mês (ratio)</label>
                <input className="erp-input num" type="number" step="0.0001" value={form.juros_mes}
                  onChange={(e) => setNum("juros_mes", e.target.value)} />
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Multa atraso (ratio)</label>
                <input className="erp-input num" type="number" step="0.0001" value={form.multa_atraso}
                  onChange={(e) => setNum("multa_atraso", e.target.value)} />
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-label">Venc. ICMS (dia)</label>
                <input className="erp-input num" type="number" value={form.vencimento_icms_dia}
                  onChange={(e) => setNum("vencimento_icms_dia", e.target.value)} />
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-label">Venc. IPI (dia)</label>
                <input className="erp-input num" type="number" value={form.vencimento_ipi_dia}
                  onChange={(e) => setNum("vencimento_ipi_dia", e.target.value)} />
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-label">Venc. PIS/COFINS (dia)</label>
                <input className="erp-input num" type="number" value={form.vencimento_pis_cofins_dia}
                  onChange={(e) => setNum("vencimento_pis_cofins_dia", e.target.value)} />
              </div>
            
          </div>
        </div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}>
          <div className="erp-status-item">Regime: <strong>{REGIMES.find((r) => r.value === form.regime_tributario)?.label ?? "—"}</strong></div>
          <div className="erp-status-item">Ambiente: <strong>{form.focus_nfe_ambiente}</strong></div>
        </div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}
