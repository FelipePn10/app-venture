import { useState, useCallback, useEffect } from "react";
import {
  type FiscalConfig,
  type RegimeTributario,
  getFiscalConfig,
  updateFiscalConfig,
  updateFiscalBranding,
  getFiscalBrandingLogo,
  validateBrandingLogo,
  BRAND_COLOR_PATTERN,
  MAX_BRANDING_LOGO_BYTES,
} from "@/services/fiscalConfigService";
import { errMessage } from "@/services/fiscalShared";
import { openErpScreenWindow } from "@/utils/windowManager";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAuthStore } from "@/store/authStore";

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
  exigir_regra_icms_ipi: false,
  aliquota_credito_simples: 0,
  cbenef_diferimento: "",
  focus_nfe_configured: false,
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
  const isAdmin = useAuthStore((state) => state.user?.role?.toUpperCase() === "ADMIN");
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
  // ICMS, diferimento, juros e multa são gravados em FRAÇÃO (0,195) — é o que o
  // motor fiscal lê. Na tela entram em % (19,5), como em toda nota e tabela.
  const setPct = useCallback((key: keyof FiscalConfig, raw: string) => {
    setField(key, (raw === "" ? 0 : Number((Number(raw) / 100).toFixed(6))) as FiscalConfig[typeof key]);
  }, [setField]);
  const emPct = (v: unknown) => Number((Number(v || 0) * 100).toFixed(4));

  const semIdentificacao = !form.cnpj_empresa.trim() || !form.razao_social.trim();
  const travado = !!form.focus_producao_travado;

  async function handleSalvar() {
    if (semIdentificacao) {
      setFeedback({ type: "error", message: "A empresa ainda não tem identificação (CNPJ, razão social, endereço): cadastre na VEMP0100 antes dos parâmetros fiscais." });
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
          <button className="erp-btn erp-btn-primary" onClick={() => void handleSalvar()} disabled={!isAdmin || isSaving || isLoading}
            title={isAdmin ? undefined : "Somente administradores podem alterar a configuração fiscal"}>
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

        <div className="erp-fieldset"><div className="erp-fieldset-head">Empresa — <span style={{fontWeight:400,opacity:0.65}}>identificação mantida na VEMP0100</span></div><div className="erp-fieldset-body">
          <div className="erp-field erp-c9">
            {semIdentificacao ? <p style={{ margin: 0 }}>A empresa ainda não tem identificação. Cadastre CNPJ, razão social e endereço na VEMP0100.</p> : (
              <p style={{ margin: 0 }}>
                <b>{form.razao_social}</b>{form.nome_fantasia ? <> ({form.nome_fantasia})</> : null} · CNPJ {form.cnpj_empresa}{form.ie_empresa ? <> · IE {form.ie_empresa}</> : null}
                {" "}· {REGIMES.find((r) => r.value === form.regime_tributario)?.label ?? "—"}<br />
                {[form.logradouro, form.numero, form.complemento, form.bairro].filter(Boolean).join(", ") || "Endereço não informado"}
                {" "}— {form.municipio || "—"}/{form.uf_empresa}{form.codigo_municipio ? <> (IBGE {form.codigo_municipio})</> : null}{form.cep ? <> · CEP {form.cep}</> : null}
              </p>
            )}
          </div>
          <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}>
            <button className="erp-btn" onClick={() => void openErpScreenWindow("VEMP0100")}>Alterar na VEMP0100</button>
          </div>
        </div></div>

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

        <div className="erp-fieldset"><div className="erp-fieldset-head">Focus NF-e   — <span style={{fontWeight:400,opacity:0.65}}>Integração com a SEFAZ</span></div><div className="erp-fieldset-body">
          {travado ? (
            <div className="erp-field erp-c12">
              <p style={{ margin: 0 }}>
                <span className="erp-badge erp-badge-green">Produção</span>{" "}
                {form.focus_nfe_configured ? "Token de produção configurado e protegido." : "Sem token de produção."}
              </p>
              <span className="erp-field-hint">Em produção, o token e o ambiente só mudam pela Venture ERP. Para trocar o token (novo certificado, nova conta na Focus), fale com a Venture.</span>
            </div>
          ) : (
            <>
              <div className="erp-field erp-c8">
                <label className="erp-label">Token Focus NF-e de homologação</label>
                <input className="erp-input" type="password" autoComplete="new-password"
                  value={form.focus_nfe_token ?? ""} disabled={!isAdmin}
                  placeholder={form.focus_nfe_configured ? "Token configurado — deixe vazio para manter" : "Informe o token de homologação"}
                  onChange={(e) => setField("focus_nfe_token", e.target.value)} />
                <span className="erp-field-hint">
                  {form.focus_nfe_configured ? "Token de homologação configurado e protegido." : "Nenhum token configurado."} A passagem para produção, com o token de produção, é feita pela Venture ERP.
                </span>
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-label">Ambiente</label>
                <input className="erp-input" value="Homologação (testes)" disabled />
              </div>
            </>
          )}
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Tributação por regra — <span style={{fontWeight:400,opacity:0.65}}>como a nota de venda decide ICMS e IPI</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c8">
                <label className="erp-check">
                  <input type="checkbox" checked={form.exigir_regra_icms_ipi}
                    onChange={(e) => setField("exigir_regra_icms_ipi", e.target.checked)} />
                  {" "}Exigir regra de ICMS/IPI em toda nota de venda
                </label>
                <span className="erp-field-hint">
                  Ligado: a nota com item sem regra em Parâmetros ICMS/IPI (VFIS0320) fica impedida na prévia e não é transmitida.
                  Desligado: o item sem regra usa o ICMS interno abaixo e a prévia avisa. Confira os cenários no Simulador de Tributação (VFIS0325) antes de ligar.
                </span>
              </div>
              {form.regime_tributario === "1" && (
                <div className="erp-field erp-c4">
                  <label className="erp-label">Crédito do Simples (%)</label>
                  <input className="erp-input num" type="number" step="0.01" min="0" max="100" value={form.aliquota_credito_simples}
                    onChange={(e) => setNum("aliquota_credito_simples", e.target.value)} />
                  <span className="erp-field-hint">Crédito de ICMS que o comprador contribuinte pode aproveitar, conforme a faixa do Simples (ex.: 2,56).</span>
                </div>
              )}
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Tributação &amp; Vencimentos   — <span style={{fontWeight:400,opacity:0.65}}>Alíquotas e taxas em % (ex.: 19,5)</span></div><div className="erp-fieldset-body">
            
              <div className="erp-field erp-c4">
                <label className="erp-label">ICMS interno (%)</label>
                <input className="erp-input num" type="number" step="0.01" value={emPct(form.icms_interno_aliquota)}
                  onChange={(e) => setPct("icms_interno_aliquota", e.target.value)} />
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-label">Diferimento ICMS (%)</label>
                <input className="erp-input num" type="number" step="0.01" value={emPct(form.icms_diferimento_percentual)}
                  onChange={(e) => setPct("icms_diferimento_percentual", e.target.value)} />
              </div>
              <div className="erp-field erp-c4">
                <label className="erp-label">cBenef do diferimento</label>
                <input className="erp-input" maxLength={10} value={form.cbenef_diferimento} placeholder="ex.: PR830001"
                  onChange={(e) => setField("cbenef_diferimento", e.target.value.toUpperCase())} />
                <span className="erp-field-hint">Código de benefício que a SEFAZ exige na venda com diferimento (CST 51). No Paraná: PR830001.</span>
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Juros ao mês (%)</label>
                <input className="erp-input num" type="number" step="0.01" value={emPct(form.juros_mes)}
                  onChange={(e) => setPct("juros_mes", e.target.value)} />
              </div>
              <div className="erp-field erp-c3">
                <label className="erp-label">Multa atraso (%)</label>
                <input className="erp-input num" type="number" step="0.01" value={emPct(form.multa_atraso)}
                  onChange={(e) => setPct("multa_atraso", e.target.value)} />
              </div>
              <div className="erp-field erp-c2">
                <label className="erp-label">Venc. ICMS (dia)</label>
                <input className="erp-input num" type="number" value={form.vencimento_icms_dia}
                  onChange={(e) => setNum("vencimento_icms_dia", e.target.value)} />
              </div>
              <div className="erp-field erp-c2">
                <label className="erp-label">Venc. IPI (dia)</label>
                <input className="erp-input num" type="number" value={form.vencimento_ipi_dia}
                  onChange={(e) => setNum("vencimento_ipi_dia", e.target.value)} />
              </div>
              <div className="erp-field erp-c2">
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
