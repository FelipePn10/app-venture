import { useState, useCallback } from "react";
import axios from "axios";
import {
  createCostCenter,
  listCostCenters,
  getCostCenter,
  type TypeCC,
  type CostCenterResponse,
} from "@/services/costCenterService";
import { useAuthStore } from "@/store/authStore";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_CC: TypeCC[] = [
  "AUXILIARY",
  "PRODUCTIVE",
  "ADMINISTRATIVE",
  "COMMERCIAL",
];

const TIPO_CC_LABEL: Record<TypeCC, string> = {
  AUXILIARY:      "Auxiliar/Apoio",
  PRODUCTIVE:     "Produtivo",
  ADMINISTRATIVE: "Administrativo",
  COMMERCIAL:     "Comercial/Vendas",
};

const TIPO_CC_INFO: Record<TypeCC, string> = {
  AUXILIARY:
    "Centros que auxiliam processos produtivos (PCP, Qualidade, Almoxarifado, Manutenção). Não recebem rateios de absorção.",
  PRODUCTIVE:
    "Centros que produzem diretamente o produto (Corte, Usinagem, Montagem, Embalagem). Podem receber rateios de absorção quando Rateio estiver marcado.",
  ADMINISTRATIVE:
    "Área administrativa (Financeiro, RH, TI). Não recebem rateios de absorção, somente rateios primários.",
  COMMERCIAL:
    "Gestão comercial (Depto de Vendas, Marketing, Supervisores). Não recebem rateios de absorção, somente rateios primários.",
};

// Maps both backend enum values and legacy PT-BR strings
const BACKEND_TO_TYPE_CC: Record<string, TypeCC> = {
  AUXILIARY:        "AUXILIARY",
  PRODUCTIVE:       "PRODUCTIVE",
  ADMINISTRATIVE:   "ADMINISTRATIVE",
  COMMERCIAL:       "COMMERCIAL",
  "Auxiliar/Apoio": "AUXILIARY",
  "Auxiliar":       "AUXILIARY",
  "Produtivo":      "PRODUCTIVE",
  "Administrativo": "ADMINISTRATIVE",
  "Comercial/Vendas": "COMMERCIAL",
  "Comercial":      "COMMERCIAL",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type AbaAtiva  = "dados" | "empresas";
type ModoForm  = "novo"  | "edicao";

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

interface FormCC {
  code: string;
  description: string;
  parentCode: string;
  type: TypeCC;
  isRatio: boolean;
  startDate: string;
  endDate: string;
}

interface EmpresaVinculo {
  empresa: string;
  unidade: string;
}

const FORM_INICIAL: FormCC = {
  code: "",
  description: "",
  parentCode: "",
  type: "ADMINISTRATIVE",
  isRatio: false,
  startDate: "",
  endDate: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeTypeCC(raw: string | undefined | null): TypeCC {
  if (!raw) return "ADMINISTRATIVE";
  return BACKEND_TO_TYPE_CC[raw] ?? "ADMINISTRATIVE";
}

function decodeJwtSub(token: string | null): string | undefined {
  if (!token) return undefined;
  try {
    const payload = token.split(".")[1];
    if (!payload) return undefined;
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    ) as Record<string, unknown>;
    const sub = decoded["sub"] ?? decoded["id"] ?? decoded["user_id"];
    return typeof sub === "string" && sub.length > 0 ? sub : undefined;
  } catch {
    return undefined;
  }
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    const msg = data?.message ?? data?.error;
    if (msg) return msg;
  }
  return error instanceof Error ? error.message : fallback;
}

function applyResponseToForm(r: CostCenterResponse): FormCC {
  return {
    code:        r.code != null ? String(r.code) : "",
    description: r.description ?? "",
    parentCode:  r.parent_code != null ? String(r.parent_code) : "",
    type:        normalizeTypeCC(r.type),
    isRatio:     r.is_ratio ?? false,
    startDate:   r.start_date ?? "",
    endDate:     r.end_date ?? "",
  };
}

function formatDateBR(iso: string): string {
  if (!iso || iso.length < 10) return "—";
  const [y, m, d] = iso.substring(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vctb0102Page(): JSX.Element {
  // ── Form state
  const [form, setForm]               = useState<FormCC>(FORM_INICIAL);
  const [modoForm, setModoForm]       = useState<ModoForm>("novo");
  const [codigoEdit, setCodigoEdit]   = useState<number | null>(null);
  const [abaAtiva, setAbaAtiva]       = useState<AbaAtiva>("dados");
  const [empresas, setEmpresas]       = useState<EmpresaVinculo[]>([]);
  const [novaEmpresa, setNovaEmpresa] = useState("");
  const [novaUnidade, setNovaUnidade] = useState("");
  const [errors, setErrors]           = useState<Partial<Record<keyof FormCC, string>>>({});

  // ── Search state
  const [filtroDataRef, setFiltroDataRef]   = useState("");
  const [filtroEmpresa, setFiltroEmpresa]   = useState("");
  const [resultados, setResultados]         = useState<CostCenterResponse[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  // ── Loading / feedback
  const [isSaving,    setIsSaving]    = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback,    setFeedback]    = useState<FeedbackState>(null);

  const user  = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  // ── Field setter
  const setField = useCallback(
    <K extends keyof FormCC>(key: K, value: FormCC[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "type" && value !== "PRODUCTIVE") {
          (next as FormCC).isRatio = false;
        }
        return next;
      });
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      setFeedback(null);
    },
    [],
  );

  // ── Validation
  function validate(): boolean {
    const e: Partial<Record<keyof FormCC, string>> = {};
    if (!form.code.trim()) {
      e.code = "Código obrigatório.";
    } else if (isNaN(Number(form.code)) || Number(form.code) <= 0) {
      e.code = "Código deve ser um número inteiro positivo.";
    }
    if (!form.description.trim()) e.description = "Descrição obrigatória.";
    if (!form.startDate) {
      e.startDate = "Data inicial obrigatória.";
    } else {
      const day = new Date(form.startDate + "T00:00:00").getDate();
      if (day !== 1) e.startDate = "Data inicial deve ser o 1º dia do mês (dia 01).";
    }
    if (form.endDate && form.startDate && form.endDate < form.startDate) {
      e.endDate = "Data final deve ser igual ou posterior à data inicial.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Load by code (form field lookup)
  async function handleLoadByCode() {
    const codeNum = Number(form.code.trim());
    if (!form.code.trim() || isNaN(codeNum) || codeNum <= 0) {
      setErrors((prev) => ({ ...prev, code: "Informe um código para consultar." }));
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      const cc = await getCostCenter(codeNum);
      if (!cc) {
        setFeedback({ type: "info", message: `CC ${codeNum} não encontrado.` });
        return;
      }
      setForm(applyResponseToForm(cc));
      setErrors({});
      setModoForm("edicao");
      setCodigoEdit(cc.code);
      setFeedback({ type: "info", message: `CC ${cc.code} — ${cc.description} carregado para edição.` });
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(error, "Erro ao consultar centro de custo."),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ── List search
  async function handlePesquisar() {
    setIsSearching(true);
    setFeedback(null);
    try {
      const results = await listCostCenters({
        reference_date: filtroDataRef || undefined,
        company:        filtroEmpresa || undefined,
      });
      setResultados(results);
      setMostrarResultados(true);
      if (results.length === 0) {
        setFeedback({ type: "info", message: "Nenhum CC encontrado para o filtro informado." });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(error, "Erro ao pesquisar centros de custo."),
      });
    } finally {
      setIsSearching(false);
    }
  }

  // ── Select from list → loads into form as edicao
  function handleSelectFromList(cc: CostCenterResponse) {
    setForm(applyResponseToForm(cc));
    setFeedback(null);
    setErrors({});
    setAbaAtiva("dados");
    setModoForm("edicao");
    setCodigoEdit(cc.code);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  // ── Save (always creates — update endpoint can be added later)
  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const createdBy = user?.id ?? decodeJwtSub(token) ?? "anonymous";
      await createCostCenter({
        code:        Number(form.code),
        description: form.description.trim(),
        parent_code: form.parentCode ? Number(form.parentCode) : undefined,
        type:        form.type,
        is_ratio:    form.isRatio,
        start_date:  form.startDate,
        end_date:    form.endDate || undefined,
        created_by:  createdBy,
      });
      setFeedback({
        type: "success",
        message: `Centro de custo ${form.code} — ${form.description} salvo com sucesso.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(error, "Erro ao salvar. Verifique os campos e a conexão."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  // ── Novo CC → reset form to creation mode
  function handleNovo() {
    setForm(FORM_INICIAL);
    setErrors({});
    setFeedback(null);
    setEmpresas([]);
    setNovaEmpresa("");
    setNovaUnidade("");
    setAbaAtiva("dados");
    setModoForm("novo");
    setCodigoEdit(null);
  }

  // ── Limpar → same as Novo
  function handleLimpar() {
    handleNovo();
    setMostrarResultados(false);
  }

  const ehProdutivo = form.type === "PRODUCTIVE";

  const ABAS: { id: AbaAtiva; label: string }[] = [
    { id: "dados",    label: "Dados Gerais" },
    { id: "empresas", label: `Empresas${empresas.length > 0 ? ` (${empresas.length})` : ""}` },
  ];

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ctb-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        /* ── TOPBAR ── */
        .ctb-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .ctb-topbar-left { display: flex; align-items: center; gap: 10px; }
        .ctb-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .ctb-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .ctb-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .ctb-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        /* ── ACTION BAR ── */
        .ctb-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .ctb-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .ctb-action-group:last-child { border-right: none; }
        .ctb-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .ctb-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .ctb-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .ctb-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .ctb-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .ctb-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .ctb-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .ctb-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .ctb-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .ctb-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .ctb-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .ctb-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .ctb-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }

        /* ── BODY ── */
        .ctb-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .ctb-body::-webkit-scrollbar { width: 5px; }
        .ctb-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* ── SECTION BANNER ── */
        .ctb-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .ctb-section-banner:first-child { padding-top: 0; }
        .ctb-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .ctb-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .ctb-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        /* ── CARD ── */
        .ctb-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .ctb-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .ctb-card-header-left { display: flex; align-items: center; gap: 8px; }
        .ctb-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .ctb-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .ctb-card-body { padding: 18px 18px; }

        /* ── MODO BADGES ── */
        .ctb-modo-novo {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #e8f5e0; color: #1e5818;
          border: 1px solid #a8d898;
        }
        .ctb-modo-edicao {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #fff8e0; color: #7a5200;
          border: 1px solid #e0c860;
        }
        .ctb-modo-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
        }
        .ctb-modo-novo  .ctb-modo-dot { background: #3e9654; }
        .ctb-modo-edicao .ctb-modo-dot { background: #c8a020; }

        /* ── FILTER ROW ── */
        .ctb-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        /* ── GRID ── */
        .ctb-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .ctb-col-2  { grid-column: span 2; }
        .ctb-col-3  { grid-column: span 3; }
        .ctb-col-4  { grid-column: span 4; }
        .ctb-col-5  { grid-column: span 5; }
        .ctb-col-6  { grid-column: span 6; }
        .ctb-col-7  { grid-column: span 7; }
        .ctb-col-8  { grid-column: span 8; }
        .ctb-col-10 { grid-column: span 10; }
        .ctb-col-12 { grid-column: span 12; }

        /* ── FIELDS ── */
        .ctb-field { display: flex; flex-direction: column; gap: 5px; }
        .ctb-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .ctb-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .ctb-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .ctb-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .ctb-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .ctb-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .ctb-input.has-error { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }
        .ctb-input[type="date"] { cursor: pointer; }

        .ctb-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .ctb-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .ctb-input-wrap { position: relative; display: flex; }
        .ctb-input-btn {
          height: 36px; padding: 0 10px; flex-shrink: 0;
          background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none;
          border-radius: 0 7px 7px 0; display: flex; align-items: center;
          justify-content: center; gap: 5px;
          cursor: pointer; color: #3a6048;
          font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 500;
          transition: background 0.12s; white-space: nowrap;
        }
        .ctb-input-btn:hover { background: #ddf0e0; }
        .ctb-input-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .ctb-field-error { font-size: 11px; color: #c84040; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
        .ctb-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        /* ── INFO BOX ── */
        .ctb-info-box {
          margin-top: 6px; padding: 8px 12px;
          background: #f4f9f2; border: 1px solid #d4e8cc;
          border-radius: 7px; font-size: 12px; color: #3a5a45; line-height: 1.55;
        }
        .ctb-info-box.produtivo { background: #f0f8ea; border-color: #b4d8a8; color: #2a4820; }

        /* ── TOGGLE ── */
        .ctb-toggle-row { display: flex; align-items: center; gap: 10px; padding-top: 2px; }
        .ctb-toggle { position: relative; width: 38px; height: 20px; flex-shrink: 0; cursor: pointer; }
        .ctb-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .ctb-toggle-track { position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px; transition: background 0.2s; }
        .ctb-toggle input:checked ~ .ctb-toggle-track { background: #3e9654; }
        .ctb-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
          background: #fff; border-radius: 50%; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .ctb-toggle input:checked ~ .ctb-toggle-thumb { transform: translateX(18px); }
        .ctb-toggle.disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
        .ctb-toggle-label { font-size: 13px; color: #3a5a45; font-weight: 500; }
        .ctb-toggle-sub   { font-size: 11.5px; color: #7a9c84; }

        /* ── SECTION DIVIDER ── */
        .ctb-section-sep   { height: 1px; background: #edf5e8; margin: 20px 0; }
        .ctb-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .ctb-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        /* ── TABS ── */
        .ctb-tabs {
          display: flex; align-items: flex-end; gap: 0;
          border-bottom: 2px solid #dbe8d5; background: #fafcf9;
        }
        .ctb-tab {
          padding: 10px 20px; font-size: 12.5px; font-weight: 500;
          color: #6a8a74; cursor: pointer; border: none; background: transparent;
          border-bottom: 2px solid transparent; margin-bottom: -2px;
          transition: color 0.13s, border-color 0.13s; white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }
        .ctb-tab:hover { color: #2a4a35; }
        .ctb-tab.active { color: #162e20; border-bottom-color: #3e9654; font-weight: 600; }
        .ctb-tab-body { padding: 20px 18px; }

        /* ── RESULTS TABLE ── */
        .ctb-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .ctb-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .ctb-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .ctb-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .ctb-results-hint { font-size: 11px; color: #96b8a0; }
        .ctb-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .ctb-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .ctb-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .ctb-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .ctb-results-table tbody tr:hover { background: #eef9f0; }
        .ctb-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .ctb-tipo-badge {
          display: inline-flex; align-items: center;
          font-size: 11px; font-weight: 600; border-radius: 12px; padding: 2px 8px;
        }
        .ctb-tipo-badge.produtivo   { background: #e8f5e0; color: #2a6018; border: 1px solid #b4d898; }
        .ctb-tipo-badge.auxiliar    { background: #e8f0fc; color: #1a4080; border: 1px solid #a8c0e8; }
        .ctb-tipo-badge.admin       { background: #fdf8e8; color: #604800; border: 1px solid #e0d090; }
        .ctb-tipo-badge.comercial   { background: #fdf0e8; color: #603000; border: 1px solid #e0b890; }

        /* ── VINCULOS TABLE ── */
        .ctb-vinculos-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .ctb-vinculos-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.5px; }
        .ctb-vinculos-add { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .ctb-vinculos-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .ctb-vinculos-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5;
        }
        .ctb-vinculos-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; }
        .ctb-vinculos-table tbody tr:hover { background: #f4fbf2; }
        .ctb-vinculos-empty { text-align: center; padding: 32px 12px; color: #96b8a0; font-size: 12.5px; }
        .ctb-remove-btn {
          background: transparent; border: none; cursor: pointer; color: #c89090;
          padding: 3px 6px; border-radius: 5px; font-size: 12px; font-family: 'Inter', sans-serif;
          transition: background 0.12s, color 0.12s;
        }
        .ctb-remove-btn:hover { background: #fdecea; color: #b94040; }

        /* ── FEEDBACK ── */
        .ctb-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: ctbFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .ctb-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .ctb-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .ctb-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        /* ── RATEIO WARN ── */
        .ctb-rateio-warn {
          display: flex; align-items: flex-start; gap: 8px; margin-top: 8px;
          background: #fffbf0; border: 1px solid #f0dca0; border-left: 3px solid #e8b800;
          border-radius: 7px; padding: 8px 12px;
          font-size: 11.5px; color: #5a4000; line-height: 1.5;
        }

        /* ── FOOTER ── */
        .ctb-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .ctb-footer-left { display: flex; align-items: center; gap: 20px; }
        .ctb-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .ctb-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .ctb-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        .ctb-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes ctbFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="ctb-root">

        {/* ── TOPBAR ── */}
        <header className="ctb-topbar">
          <div className="ctb-topbar-left">
            <div className="ctb-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="ctb-app-name">
              Venture<span className="ctb-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="ctb-screen-title">VCTB0102 — Cadastro de Centro de Custo</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="ctb-actionbar">
          <div className="ctb-action-group">
            <span className="ctb-action-label">Cadastro</span>
            <button
              className="ctb-btn ctb-btn-new"
              onClick={handleNovo}
              disabled={isSaving || isLoading}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Novo CC
            </button>
          </div>

          <div className="ctb-action-group">
            <span className="ctb-action-label">Ações</span>
            <button
              className="ctb-btn ctb-btn-primary"
              onClick={() => void handleSalvar()}
              disabled={isSaving || isLoading}
            >
              {isSaving
                ? <><div className="ctb-spinner" />Salvando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Salvar
                  </>
              }
            </button>
            <button
              className="ctb-btn ctb-btn-danger"
              onClick={handleLimpar}
              disabled={isSaving || isLoading}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>

          <div className="ctb-action-group">
            <button className="ctb-btn ctb-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="ctb-body">

          {/* Feedback */}
          {feedback && (
            <div className={`ctb-feedback ${feedback.type}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : feedback.type === "error"
                    ? <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                    : <><circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SEÇÃO 1 — PESQUISA                                         */}
          {/* ═══════════════════════════════════════════════════════════ */}

          <div className="ctb-section-banner">
            <span className="ctb-section-banner-pill">1 — Pesquisar</span>
            <div className="ctb-section-banner-line" />
            <span className="ctb-section-banner-hint">Filtre a lista e clique em um registro para carregá-lo no formulário abaixo</span>
          </div>

          <div className="ctb-card">
            <div className="ctb-card-header">
              <div className="ctb-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="ctb-card-title">Pesquisa de Centros de Custo</span>
              </div>
            </div>

            <div className="ctb-card-body" style={{ paddingBottom: 14 }}>
              <div className="ctb-filter-row">
                <div className="ctb-field" style={{ flex: "0 0 180px" }}>
                  <label className="ctb-label">Data de Referência</label>
                  <input
                    type="date"
                    className="ctb-input"
                    value={filtroDataRef}
                    onChange={(e) => setFiltroDataRef(e.target.value)}
                  />
                  <span className="ctb-field-hint">Filtra por vigência ativa na data.</span>
                </div>
                <div className="ctb-field" style={{ flex: "0 0 220px" }}>
                  <label className="ctb-label">Empresa</label>
                  <input
                    className="ctb-input"
                    placeholder="Código ou nome"
                    value={filtroEmpresa}
                    onChange={(e) => setFiltroEmpresa(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handlePesquisar()}
                  />
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button
                    className="ctb-btn ctb-btn-ghost"
                    onClick={() => void handlePesquisar()}
                    disabled={isSearching}
                  >
                    {isSearching
                      ? <><div className="ctb-spinner-dark" />Buscando...</>
                      : <>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                            <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                          Pesquisar
                        </>
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* Results — inside the search card */}
            {mostrarResultados && (
              <div className="ctb-results-wrap">
                <div className="ctb-results-bar">
                  <div className="ctb-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="ctb-results-bar-label">Resultados</span>
                    <span className="ctb-card-badge">{resultados.length} registro(s)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="ctb-results-hint">↓ Clique em um registro para carregar no formulário</span>
                    <button
                      className="ctb-btn ctb-btn-ghost ctb-btn-sm"
                      onClick={() => setMostrarResultados(false)}
                    >
                      Fechar
                    </button>
                  </div>
                </div>

                {resultados.length === 0 ? (
                  <div className="ctb-results-empty">Nenhum centro de custo encontrado para os filtros informados.</div>
                ) : (
                  <table className="ctb-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 80 }}>CC</th>
                        <th style={{ width: 80 }}>CC Pai</th>
                        <th>Descrição</th>
                        <th style={{ width: 170 }}>Tipo</th>
                        <th style={{ width: 70 }}>Rateio</th>
                        <th style={{ width: 110 }}>Início</th>
                        <th style={{ width: 110 }}>Fim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((cc) => {
                        const tipo = normalizeTypeCC(cc.type);
                        const badgeClass =
                          tipo === "PRODUCTIVE"     ? "produtivo"
                          : tipo === "AUXILIARY"    ? "auxiliar"
                          : tipo === "ADMINISTRATIVE" ? "admin"
                          : "comercial";
                        return (
                          <tr key={cc.code} onClick={() => handleSelectFromList(cc)}>
                            <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{cc.code}</td>
                            <td style={{ color: cc.parent_code ? "#243830" : "#96b8a0" }}>
                              {cc.parent_code ?? "—"}
                            </td>
                            <td>{cc.description}</td>
                            <td>
                              <span className={`ctb-tipo-badge ${badgeClass}`}>
                                {TIPO_CC_LABEL[tipo]}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {cc.is_ratio
                                ? <span style={{ color: "#2a8040", fontWeight: 600, fontSize: 12 }}>Sim</span>
                                : <span style={{ color: "#96b8a0", fontSize: 12 }}>Não</span>
                              }
                            </td>
                            <td style={{ fontSize: 12 }}>{formatDateBR(cc.start_date)}</td>
                            <td style={{ fontSize: 12, color: cc.end_date ? "#243830" : "#96b8a0" }}>
                              {cc.end_date ? formatDateBR(cc.end_date) : "Em aberto"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SEÇÃO 2 — CRIAR / EDITAR                                   */}
          {/* ═══════════════════════════════════════════════════════════ */}

          <div className="ctb-section-banner">
            <span className="ctb-section-banner-pill">2 — Criar / Editar</span>
            <div className="ctb-section-banner-line" />
            <span className="ctb-section-banner-hint">
              {modoForm === "novo"
                ? "Preencha os campos e clique em Salvar para criar um novo CC"
                : `Editando CC #${codigoEdit ?? "?"} — clique em Novo CC para cancelar`}
            </span>
          </div>

          {/* ── MAIN FORM CARD ── */}
          <div className="ctb-card">
            <div className="ctb-card-header">
              <div className="ctb-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="ctb-card-title">Centro de Custo</span>
              </div>
              {modoForm === "novo"
                ? <span className="ctb-modo-novo"><span className="ctb-modo-dot" />Novo Cadastro</span>
                : <span className="ctb-modo-edicao"><span className="ctb-modo-dot" />Editando CC #{codigoEdit}</span>
              }
            </div>

            {/* TABS */}
            <div className="ctb-tabs">
              {ABAS.map((aba) => (
                <button
                  key={aba.id}
                  className={`ctb-tab${abaAtiva === aba.id ? " active" : ""}`}
                  onClick={() => setAbaAtiva(aba.id)}
                >
                  {aba.label}
                </button>
              ))}
            </div>

            {/* ── ABA: DADOS GERAIS ── */}
            {abaAtiva === "dados" && (
              <div className="ctb-tab-body">

                <div className="ctb-section-label">Identificação</div>
                <div className="ctb-grid">

                  {/* CC Code */}
                  <div className="ctb-field ctb-col-2">
                    <label className="ctb-label">Cód. CC <span className="ctb-label-req">*</span></label>
                    <div className="ctb-input-wrap">
                      <input
                        className={`ctb-input${errors.code ? " has-error" : ""}`}
                        style={{ borderRadius: "7px 0 0 7px" }}
                        placeholder="Ex: 100"
                        value={form.code}
                        onChange={(e) => setField("code", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && void handleLoadByCode()}
                      />
                      <button
                        className="ctb-input-btn"
                        title="Carregar CC por código"
                        type="button"
                        disabled={isLoading}
                        onClick={() => void handleLoadByCode()}
                      >
                        {isLoading
                          ? <div className="ctb-spinner-dark" style={{ width: 12, height: 12 }} />
                          : <>
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                                <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                              </svg>
                              Carregar
                            </>
                        }
                      </button>
                    </div>
                    {errors.code
                      ? <span className="ctb-field-error">
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" />
                            <path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                          {errors.code}
                        </span>
                      : <span className="ctb-field-hint">Enter ou "Carregar" para buscar código existente.</span>
                    }
                  </div>

                  {/* CC Pai */}
                  <div className="ctb-field ctb-col-2">
                    <label className="ctb-label">CC Pai</label>
                    <div className="ctb-input-wrap">
                      <input
                        className="ctb-input"
                        style={{ borderRadius: "7px 0 0 7px" }}
                        placeholder="Cód. pai"
                        value={form.parentCode}
                        onChange={(e) => setField("parentCode", e.target.value)}
                      />
                      <button
                        className="ctb-input-btn"
                        title="Verificar CC Pai"
                        type="button"
                        disabled={!form.parentCode.trim() || isLoading}
                        onClick={async () => {
                          const code = Number(form.parentCode.trim());
                          if (!code) return;
                          try {
                            const cc = await getCostCenter(code);
                            if (cc) setFeedback({ type: "info", message: `CC Pai ${cc.code} — ${cc.description}` });
                            else setFeedback({ type: "info", message: `CC ${code} não encontrado.` });
                          } catch {
                            setFeedback({ type: "error", message: "Erro ao consultar CC Pai." });
                          }
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                    <span className="ctb-field-hint">Opcional — CC principal ao qual este é subordinado.</span>
                  </div>

                  {/* Descrição */}
                  <div className="ctb-field ctb-col-8">
                    <label className="ctb-label">Descrição <span className="ctb-label-req">*</span></label>
                    <input
                      className={`ctb-input${errors.description ? " has-error" : ""}`}
                      placeholder="Ex: Departamento de Produção"
                      value={form.description}
                      onChange={(e) => setField("description", e.target.value)}
                      maxLength={100}
                    />
                    {errors.description && (
                      <span className="ctb-field-error">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" />
                          <path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        {errors.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ctb-section-sep" />

                <div className="ctb-section-label">Classificação MLC</div>
                <div className="ctb-grid">

                  {/* Tipo CC */}
                  <div className="ctb-field ctb-col-5">
                    <label className="ctb-label">Tipo CC <span className="ctb-label-req">*</span></label>
                    <select
                      className="ctb-select"
                      value={form.type}
                      onChange={(e) => setField("type", e.target.value as TypeCC)}
                    >
                      {TIPOS_CC.map((t) => (
                        <option key={t} value={t}>{TIPO_CC_LABEL[t]}</option>
                      ))}
                    </select>
                    <div className={`ctb-info-box${ehProdutivo ? " produtivo" : ""}`}>
                      {TIPO_CC_INFO[form.type]}
                    </div>
                  </div>

                  {/* Rateio */}
                  <div className="ctb-field ctb-col-4">
                    <label className="ctb-label">Rateio de Absorção</label>
                    <div style={{ paddingTop: 6 }}>
                      <div className="ctb-toggle-row">
                        <label className={`ctb-toggle${!ehProdutivo ? " disabled" : ""}`}>
                          <input
                            type="checkbox"
                            checked={form.isRatio}
                            disabled={!ehProdutivo}
                            onChange={(e) => setField("isRatio", e.target.checked)}
                          />
                          <div className="ctb-toggle-track" />
                          <div className="ctb-toggle-thumb" />
                        </label>
                        <div>
                          <span className="ctb-toggle-label">
                            {form.isRatio ? "Habilitado" : "Desabilitado"}
                          </span>
                          <div className="ctb-toggle-sub">
                            {ehProdutivo
                              ? "CC receberá rateios de absorção (FMLC0202)"
                              : "Disponível apenas para o tipo Produtivo"}
                          </div>
                        </div>
                      </div>
                      {!ehProdutivo && (
                        <div className="ctb-rateio-warn">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                            <path d="M8 2L1.5 13.5h13L8 2z" stroke="#e8b800" strokeWidth="1.4" strokeLinejoin="round" />
                            <path d="M8 6v4M8 11.5h.01" stroke="#e8b800" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                          <span>Rateio de absorção é exclusivo do tipo <strong>Produtivo</strong>. CCs <strong>{TIPO_CC_LABEL[form.type]}</strong> recebem somente rateios primários.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ctb-section-sep" />

                <div className="ctb-section-label">Vigência</div>
                <div className="ctb-grid">

                  <div className="ctb-field ctb-col-3">
                    <label className="ctb-label">Data Inicial <span className="ctb-label-req">*</span></label>
                    <input
                      type="date"
                      className={`ctb-input${errors.startDate ? " has-error" : ""}`}
                      value={form.startDate}
                      onChange={(e) => setField("startDate", e.target.value)}
                    />
                    {errors.startDate
                      ? <span className="ctb-field-error">
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" />
                            <path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                          {errors.startDate}
                        </span>
                      : <span className="ctb-field-hint">Deve ser o 1º dia do mês (dia 01).</span>
                    }
                  </div>

                  <div className="ctb-field ctb-col-3">
                    <label className="ctb-label">Data Final</label>
                    <input
                      type="date"
                      className={`ctb-input${errors.endDate ? " has-error" : ""}`}
                      value={form.endDate}
                      onChange={(e) => setField("endDate", e.target.value)}
                    />
                    {errors.endDate
                      ? <span className="ctb-field-error">
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" />
                            <path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                          {errors.endDate}
                        </span>
                      : <span className="ctb-field-hint">Opcional. Deixe em aberto para vigência indeterminada.</span>
                    }
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA: EMPRESAS ── */}
            {abaAtiva === "empresas" && (
              <div className="ctb-tab-body">
                <div className="ctb-vinculos-head">
                  <span className="ctb-vinculos-title">Empresas vinculadas</span>
                  <div className="ctb-vinculos-add">
                    <input
                      className="ctb-input"
                      style={{ width: 180 }}
                      placeholder="Código da empresa"
                      value={novaEmpresa}
                      onChange={(e) => setNovaEmpresa(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (() => {
                        if (novaEmpresa.trim()) {
                          setEmpresas((p) => [...p, { empresa: novaEmpresa.trim(), unidade: novaUnidade.trim() }]);
                          setNovaEmpresa("");
                          setNovaUnidade("");
                        }
                      })()}
                    />
                    <input
                      className="ctb-input"
                      style={{ width: 120 }}
                      placeholder="Unidade (ex: Hora)"
                      value={novaUnidade}
                      onChange={(e) => setNovaUnidade(e.target.value)}
                    />
                    <button
                      className="ctb-btn ctb-btn-ghost ctb-btn-sm"
                      onClick={() => {
                        if (!novaEmpresa.trim()) return;
                        setEmpresas((p) => [...p, { empresa: novaEmpresa.trim(), unidade: novaUnidade.trim() }]);
                        setNovaEmpresa("");
                        setNovaUnidade("");
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Adicionar
                    </button>
                  </div>
                </div>

                {empresas.length === 0 ? (
                  <div className="ctb-vinculos-empty">
                    Nenhuma empresa vinculada. Adicione acima.
                  </div>
                ) : (
                  <table className="ctb-vinculos-table">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>#</th>
                        <th>Empresa</th>
                        <th style={{ width: 160 }}>Unidade</th>
                        <th style={{ width: 80 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {empresas.map((e, i) => (
                        <tr key={i}>
                          <td style={{ color: "#96b8a0", fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{e.empresa}</td>
                          <td style={{ color: e.unidade ? "#243830" : "#96b8a0" }}>
                            {e.unidade || "—"}
                          </td>
                          <td>
                            <button
                              className="ctb-remove-btn"
                              onClick={() => setEmpresas((p) => p.filter((_, j) => j !== i))}
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div style={{ marginTop: 16, padding: "10px 14px", background: "#f0f8ff", border: "1px solid #c7def8", borderLeft: "3px solid #4a90d9", borderRadius: 8, fontSize: 12, color: "#1a4070", lineHeight: 1.55 }}>
                  <strong>Unidade:</strong> Informar a unidade de medida para o Custo Operacional (FCST0113) e Cálculo do Tempo Trabalhado (FCST0252). Exemplos: Hora, Minuto.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="ctb-footer">
          <div className="ctb-footer-left">
            <div className="ctb-footer-stat">
              CC: <strong>{form.code || "—"}</strong>
            </div>
            <div className="ctb-footer-stat">
              Tipo: <strong>{TIPO_CC_LABEL[form.type]}</strong>
            </div>
            <div className="ctb-footer-stat">
              Rateio: <strong>{form.isRatio ? "Sim" : "Não"}</strong>
            </div>
            <div className="ctb-footer-stat">
              Vigência: <strong>{form.startDate ? formatDateBR(form.startDate) : "—"}</strong>
              {form.endDate && <> a <strong>{formatDateBR(form.endDate)}</strong></>}
            </div>
          </div>
          <div className="ctb-footer-stat" style={{ gap: 8 }}>
            {modoForm === "novo"
              ? <span className="ctb-modo-novo" style={{ fontSize: 11 }}><span className="ctb-modo-dot" />Novo Cadastro</span>
              : <span className="ctb-modo-edicao" style={{ fontSize: 11 }}><span className="ctb-modo-dot" />Editando #{codigoEdit}</span>
            }
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>

      </div>
    </>
  );
}
