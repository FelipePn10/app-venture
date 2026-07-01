import { useState, useCallback, useEffect } from "react";
import {
  type FiscalConfig,
  type RegimeTributario,
  type FocusAmbiente,
  getFiscalConfig,
  updateFiscalConfig,
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

  const load = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const cfg = await getFiscalConfig();
      setForm({ ...EMPTY, ...cfg });
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar a configuração fiscal.") });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

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

  return (
    <div className="fsc-root">
      <header className="fsc-topbar">
        <div className="fsc-topbar-left">
          <div className="fsc-logo">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
              <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>
          <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
          <span className="fsc-screen-title">VFIS0100 — Configuração Fiscal</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Dados</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void load()} disabled={isLoading || isSaving}>
            {isLoading ? <><div className="fsc-spinner-dark" />Carregando...</> : "Recarregar"}
          </button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving || isLoading}>
            {isSaving ? <><div className="fsc-spinner" />Salvando...</> : "Salvar Configuração"}
          </button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0100 — Configuração Fiscal" filename="vfis0100" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-section-banner">
          <span className="fsc-section-banner-pill">Emitente</span>
          <div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">Identificação da empresa</span>
        </div>
        <div className="fsc-card">
          <div className="fsc-card-body">
            <div className="fsc-grid">
              <div className="fsc-field fsc-col-3">
                <label className="fsc-label fsc-label-req">CNPJ</label>
                <input className="fsc-input" value={form.cnpj_empresa} placeholder="00000000000000"
                  onChange={(e) => setField("cnpj_empresa", e.target.value)} />
                {form.cnpj_empresa.trim() && (
                  <span className="fsc-field-hint" style={{ color: validateCNPJOrCPF(form.cnpj_empresa) ? "#1e6030" : "#b91c1c" }}>
                    {validateCNPJOrCPF(form.cnpj_empresa) ? "✓ CNPJ/CPF válido" : "✗ CNPJ/CPF inválido"}
                  </span>
                )}
              </div>
              <div className="fsc-field fsc-col-6">
                <label className="fsc-label fsc-label-req">Razão Social</label>
                <input className="fsc-input" value={form.razao_social}
                  onChange={(e) => setField("razao_social", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-3">
                <label className="fsc-label">Inscrição Estadual</label>
                <input className="fsc-input" value={form.ie_empresa ?? ""}
                  onChange={(e) => setField("ie_empresa", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-4">
                <label className="fsc-label fsc-label-req">Regime Tributário</label>
                <select className="fsc-select" value={form.regime_tributario}
                  onChange={(e) => setField("regime_tributario", e.target.value as RegimeTributario)}>
                  {REGIMES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="fsc-field fsc-col-2">
                <label className="fsc-label fsc-label-req">UF</label>
                <input className="fsc-input" maxLength={2} value={form.uf_empresa}
                  onChange={(e) => setField("uf_empresa", e.target.value.toUpperCase())} />
              </div>
              <div className="fsc-field fsc-col-3">
                <label className="fsc-label">Telefone</label>
                <input className="fsc-input" value={form.telefone ?? ""} placeholder="41999990000"
                  onChange={(e) => setField("telefone", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="fsc-section-banner">
          <span className="fsc-section-banner-pill">Endereço</span>
          <div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">Obrigatório para autorização da NF-e na SEFAZ</span>
        </div>
        <div className="fsc-card">
          <div className="fsc-card-body">
            <div className="fsc-grid">
              <div className="fsc-field fsc-col-6">
                <label className="fsc-label">Logradouro</label>
                <input className="fsc-input" value={form.logradouro ?? ""}
                  onChange={(e) => setField("logradouro", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-2">
                <label className="fsc-label">Número</label>
                <input className="fsc-input" value={form.numero ?? ""}
                  onChange={(e) => setField("numero", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-4">
                <label className="fsc-label">Complemento</label>
                <input className="fsc-input" value={form.complemento ?? ""}
                  onChange={(e) => setField("complemento", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-4">
                <label className="fsc-label">Bairro</label>
                <input className="fsc-input" value={form.bairro ?? ""}
                  onChange={(e) => setField("bairro", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-4">
                <label className="fsc-label">Município</label>
                <input className="fsc-input" value={form.municipio ?? ""}
                  onChange={(e) => setField("municipio", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-2">
                <label className="fsc-label">Cód. IBGE</label>
                <input className="fsc-input" value={form.codigo_municipio ?? ""} placeholder="4106902"
                  onChange={(e) => setField("codigo_municipio", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-2">
                <label className="fsc-label">CEP</label>
                <input className="fsc-input" value={form.cep ?? ""} placeholder="80000000"
                  onChange={(e) => setField("cep", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="fsc-section-banner">
          <span className="fsc-section-banner-pill">Focus NF-e</span>
          <div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">Integração com a SEFAZ</span>
        </div>
        <div className="fsc-card">
          <div className="fsc-card-body">
            <div className="fsc-grid">
              <div className="fsc-field fsc-col-8">
                <label className="fsc-label fsc-label-req">Token Focus NF-e</label>
                <input className="fsc-input" value={form.focus_nfe_token ?? ""}
                  onChange={(e) => setField("focus_nfe_token", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-4">
                <label className="fsc-label fsc-label-req">Ambiente</label>
                <select className="fsc-select" value={form.focus_nfe_ambiente}
                  onChange={(e) => setField("focus_nfe_ambiente", e.target.value as FocusAmbiente)}>
                  <option value="homologacao">Homologação</option>
                  <option value="producao">Produção</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="fsc-section-banner">
          <span className="fsc-section-banner-pill">Tributação &amp; Vencimentos</span>
          <div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">Alíquotas em decimal (ex: 0.12 = 12%)</span>
        </div>
        <div className="fsc-card">
          <div className="fsc-card-body">
            <div className="fsc-grid">
              <div className="fsc-field fsc-col-3">
                <label className="fsc-label">ICMS interno (ratio)</label>
                <input className="fsc-input fsc-input-right" type="number" step="0.0001" value={form.icms_interno_aliquota}
                  onChange={(e) => setNum("icms_interno_aliquota", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-3">
                <label className="fsc-label">Diferimento ICMS (ratio)</label>
                <input className="fsc-input fsc-input-right" type="number" step="0.0001" value={form.icms_diferimento_percentual}
                  onChange={(e) => setNum("icms_diferimento_percentual", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-3">
                <label className="fsc-label">Juros ao mês (ratio)</label>
                <input className="fsc-input fsc-input-right" type="number" step="0.0001" value={form.juros_mes}
                  onChange={(e) => setNum("juros_mes", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-3">
                <label className="fsc-label">Multa atraso (ratio)</label>
                <input className="fsc-input fsc-input-right" type="number" step="0.0001" value={form.multa_atraso}
                  onChange={(e) => setNum("multa_atraso", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-4">
                <label className="fsc-label">Venc. ICMS (dia)</label>
                <input className="fsc-input fsc-input-right" type="number" value={form.vencimento_icms_dia}
                  onChange={(e) => setNum("vencimento_icms_dia", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-4">
                <label className="fsc-label">Venc. IPI (dia)</label>
                <input className="fsc-input fsc-input-right" type="number" value={form.vencimento_ipi_dia}
                  onChange={(e) => setNum("vencimento_ipi_dia", e.target.value)} />
              </div>
              <div className="fsc-field fsc-col-4">
                <label className="fsc-label">Venc. PIS/COFINS (dia)</label>
                <input className="fsc-input fsc-input-right" type="number" value={form.vencimento_pis_cofins_dia}
                  onChange={(e) => setNum("vencimento_pis_cofins_dia", e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left">
          <div className="fsc-footer-stat">Regime: <strong>{REGIMES.find((r) => r.value === form.regime_tributario)?.label ?? "—"}</strong></div>
          <div className="fsc-footer-stat">Ambiente: <strong>{form.focus_nfe_ambiente}</strong></div>
        </div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}
